
var handle_talks = function(msg){

    var type = '', user = '',
        text = '', url = '';
    try{
        if(msg.classList.contains("system")){
            if(msg.classList.contains("me")){
                type = event_me;
                user = $(msg).find('.name').text();
                text = $(msg).contents().filter(function() {
                    return this.nodeType == 3;
                }).get().pop().textContent;
            } 
            else if(msg.classList.contains("music")){
                type = event_music;
                names = $(msg).find('.name');
                user = names[0].textContent;
                text = names[1].textContent;
            }
            else{
                [["leave", event_leave], ["join", event_join], ["new-host", event_newhost]]
                    .forEach(([w, e]) => {
                        if(msg.classList.contains(w)){
                            type = e;
                            user = $(msg).find('.name').text();
                        } 
                    });
            }
        }
        else{
            text = $(msg).find($('.bubble p'))
                .clone().children().remove().end().text();
            var ue = $(msg).find($('.bubble p a'));
            if(ue.length) url = ue.attr('href');
            ue = $(msg).find($('img'));
            if(ue.length) url = ue.attr('data-src');

            var $user = $(msg).find('.name span');
            if($user.length > 1){ // send dm to someone
                console.log($user);
                user = $user[2].textContent;
                type = event_dmto;
            }
            else{
                user = $(msg).find('.name span').text();
                type = msg.classList.contains("secret") ? event_dm : event_msg;
            }
            if(type == event_dm || type == event_dmto){
                if(user == roomProfile().name) return;
            }
        }
    }
    catch(err){
        alert('err from talks')
        console.log(err);
        throw new Error("Stop execution");
        return;
    }
    console.log(type, user, text, url);

    chrome.runtime.sendMessage({
        type: type,
        user: user,
        text: text,
        url: url
    });
}

var logout = false;
function handle_exit(){
    $('.do-logout').click(function(){
        logout = true;
    });

    function confirmExit(){

        if(logout){
            if(alarms.length) // for alarms only
                chrome.runtime.sendMessage({
                    type: event_logout,
                });
            else console.log("logout without alarms");
        }
        else{
            if(alarms.length){
                chrome.runtime.sendMessage({
                    type: event_exitalarm,
                });
                // return "are you sure exit?";
            }
            else console.log("exittab without alarms");
            //type: event_exittab
        }
    }
    window.onbeforeunload = confirmExit;
    //window.onunload = confirmExit;
}


var bot_ondm = false;
var ext_click = 0;
var orgmsg, extmsg, orgpst, extpst;
function make_extinputs(){

    orgmsg = $('textarea[name="message"]')
    extmsg = orgmsg.clone().attr("name", "ext_message");
    orgmsg.after(extmsg);
    orgmsg.wrap('<div style="display:none"></div>');

    console.log("whom length:", $('.to-whom'));

    $('.to-whom').on('DOMSubtreeModified',function(e){
        console.log($(this).hasClass('on'));
        if(!bot_ondm){
            if($(this).hasClass('on'))
                extmsg.addClass('state-secret');
            else extmsg.removeClass('state-secret');
        }
    });

    orgpst = $('input[name="post"]');
    extpst = orgpst.clone().attr("name", "ext_post").attr('type', 'button');
    orgpst.after(extpst);
    orgpst.wrap('<div style="display:none"></div>');

    if(orgpst[0]){
        (new MutationObserver(function(mutations){
            mutations.forEach(function(mutation) {
                if(ext_click){
                    extpst.val(mutation.target.value);
                    ext_click--;
                }
            });
        })).observe(orgpst[0], { attributes: true });
    }

    extpst.click(function(){
        ext_click = 2;
        var cmd = '';
        if(!extmsg.hasClass('state-secret') &&
            $('#url-icon').attr('data-status') !== 'filled' && !prevURLs.length &&
            enableMe && !extmsg.val().match(/^\/\w/)) cmd = '/me ';

        if(prevURLs.length){
            [url, type] = prevURLs.pop();
            $('#url-input').val(url);
            $('#url-icon').attr('data-status', "filled").text(type);
        }

        $('textarea[name="message"]').val(cmd + extmsg.val()), extmsg.val('');

        $('input[name="post"]').click();
        setTimeout(function() {  
            chrome.runtime.sendMessage({
                type: event_submit,
            });
            console.log("submmited by click");
        }, 1000);
    });

    extmsg.on('keydown', function(e){
        setTimeout(()=>$(this).next().text($(this).attr('maxlength') - $(this).val().length), 50);
        if(!e.ctrlKey && !e.shiftKey && (e.keyCode || e.which) == 13) {
            var cmd = '';
            if(!$(this).hasClass('state-secret') && 
                $('#url-icon').attr('data-status') !== 'filled' && !prevURLs.length &&
                enableMe && !extmsg.val().match(/^\/\w/)) cmd = '/me ';

            e.preventDefault();
            if(!$(this).val().match(/^\s*$/)){

                if(prevURLs.length){
                    [url, type] = prevURLs.pop();
                    $('#url-input').val(url);
                    $('#url-icon').attr('data-status', "filled").text(type);
                }

                orgmsg.val(cmd + $(this).val());
                $(this).val('');
                setTimeout(function() {  
                    chrome.runtime.sendMessage({
                        type: event_submit,
                    });
                    console.log("submmited by enter");
                }, 1000);
                orgpst.click();
            }
        }
    });

    $(document).on('click', '.dropdown-item-reply', function(){
        extmsg.val(extmsg.val() + $(this).text() + ' ');
        extmsg.focus();
    });
    $(document).on('click', '.avatar', function(){
        if(!$(this).parent().parent().hasClass('secret'))
            extmsg.val(extmsg.val() + `@${$($(this).next(), '.select-text').text()} `);
            extmsg.focus();
    });
}

var rinfo = undefined;
var lounge = undefined;
var jumpToRoom = undefined;

$(document).ready(function(){
    
    console.log($('#user_name').text());

    chrome.storage.sync.get(
        [SWITCH_ME, 'leaveRoom', 'jumpToRoom', 'profile'], 
        (config) => {
            console.log(JSON.stringify(config));
            
            //if(!config['profile'] ||
            //    config['profile'].id !== roomProfile().id)
            //    ajaxProfile(undefined, true, $('.room-title-name').text());
            
            chrome.storage.sync.set({'profile': roomProfile()});
 
            enableMe = config[SWITCH_ME] || false;
            
            if(config['leaveRoom']){
                disableLeave = true;
                planeGo(true, 12000);
                chrome.runtime.sendMessage({
                    notification: {
                        title: chrome.i18n.getMessage("fail_leave_title"),
                        msg: chrome.i18n.getMessage("fail_leave_msg"),
                        clear: true,
                        pattern: ''
                    }
                });
                //return setTimeout(()=>leaveRoom(undefined, undefined, true), 8000);
                return setTimeout(()=>leaveRoom(undefined, undefined, true), 9000);
            }

            jumpToRoom = config['jumpToRoom'];
            if(jumpToRoom == window.location.href){
                chrome.storage.sync.remove('jumpToRoom');
                console.log("remove jumped ROOM");
                planeArrive(true);
            }
            else if(jumpToRoom){
                config("You Are Not @TargetRoom, jump?") && leaveRoom(undefined, undefined, true);
            }

            $('#talks').bind('DOMNodeInserted', function(event) {
                var e = event.target;
                if(e.parentElement.id == 'talks')
                    handle_talks(e);
            });

            make_extinputs(); 
            monit_progressbar();
            /* invoke newtab event */
            chrome.runtime.sendMessage({
                type: event_newtab
            });
            console.log("start background moniter new"); 
            handle_exit();

            chrome.runtime.sendMessage({ clearNotes: true, pattern:'' }); //'https://drrr.com/room/.*'

            

            $.ajax({
                type: "GET",
                url: 'https://drrr.com//room?api=json',
                dataType: 'json',
                success: function(RoomData){
                    rinfo = RoomData; //rinfo.profile
                    console.log('rinfo', rinfo);

                    // v if enter error, escape
                    if(rinfo.redirect){
                        //chrome.storage.sync.remove('jumpToRoom');
                        // ^ retain?
                        console.log("remove jumped ROOM");
                    }

                    var find = ()=>monitRooms(true, rinfo.room.roomId);
                    setTimeout(find, 5000);
                    setInterval(find, 90000);
                    //setInterval(find, 30000);
                    //setInterval(find, 90000);
                    //setInterval(find, 10000);
                },
                error: function(data){
                    alert("error", data);
                }
            });
        }
    );
});

chrome.runtime.onMessage.addListener((req, sender, callback) => {
    console.log(JSON.stringify(req), "comes the method from background");
    methods[req.fn](req.args, callback);
});
