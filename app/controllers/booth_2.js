import Controller from '@ember/controller';
import { action } from '@ember/object';

export default class BoothController extends Controller {

  @action
  startVideo(id) {
    var session = null,
      webRTCClient = null,
      connectedUsersList = [],
      imClient = null,
      publishCallId = 0;

    apiRTC.setLogLevel(10);

    // function selectPhonebookItem(idItem) {
    //   $("#number").val(idItem);
    //   $("#addressBookDropDown").toggle();
    // }
    //Function to add media stream in Div
    function addStreamInDiv(stream, streamType, divId, mediaEltId, style, muted) {
      var mediaElt = null,
        divElement = null;
      if (streamType === 'audio') {
        mediaElt = document.createElement("audio");
      } else {
        mediaElt = document.createElement("video");
      }
      mediaElt.id = mediaEltId;
      mediaElt.autoplay = true;
      mediaElt.muted = muted;
      mediaElt.style.width = style.width;
      mediaElt.style.height = style.height;

      //Patch for ticket on Chrome 61 Android : https://bugs.chromium.org/p/chromium/issues/detail?id=769148
      if (apiRTC.browser === 'Chrome' && apiRTC.browser_major_version === '61' && apiRTC.osName === "Android") {
        mediaElt.style.borderRadius = "1px";
        console.log('Patch for video display on Chrome 61 Android');
      }

      divElement = document.getElementById(divId);
      divElement.appendChild(mediaElt);
      webRTCClient.attachMediaStream(mediaElt, stream);
    }
    //Function to remove media stream element
    function removeElementFromDiv(divId, eltId) {
      var element = null,
        divElement = null;
      element = document.getElementById(eltId);
      if (element !== null) {
        console.log('Removing video element with Id : ' + eltId);
        divElement = document.getElementById(divId);
        divElement.removeChild(element);
      }
    }
    function initMediaElementState(callId) {
      //function that remove media element on hangup
      //You can decide to manage your own stream display function or use the integrated one of ApiRTC
      /*
          removeElementFromDiv('mini', 'miniElt-' + callId)
          removeElementFromDiv('remote', 'remoteElt-' + callId)
      */
      webRTCClient.removeElementFromDiv('mini', 'miniElt-' + callId);
      webRTCClient.removeElementFromDiv('remote', 'remoteElt-' + callId);
    }
    function addHangupButton(callId) {
      var hangupButtons = document.getElementById("hangupButtons"),
        input = document.createElement("input");
      input.setAttribute("id", "hangup-" + callId);
      input.setAttribute("value", "hangup-" + callId);
      input.setAttribute("type", "button");
      input.setAttribute("onclick", "webRTCClient.hangUp(" + callId + " );");
      hangupButtons.appendChild(input);
    }
    function removeHangupButton(callId) {
      var hangupButtonId = 'hangup-' + callId,
        hangupButton = document.getElementById(hangupButtonId),
        hangupButtons = null;
      if (hangupButton !== null) {
        console.log('Removing hangUpButton with Id : ' + hangupButtonId);
        hangupButtons = document.getElementById("hangupButtons");
        hangupButtons.removeChild(hangupButton);
      }
    }
    function userMediaErrorHandler(e) {
      $("#call").attr("disabled", false).val("Call");
      $("#hangup").attr("disabled", false).val("Hangup");
    }
    function hangupHandler(e) {
      console.log('hangupHandler :' + e.detail.callId);
      if (e.detail.lastEstablishedCall === true) {
        $("#call").attr("disabled", false).val("Call");
      }
      console.log(e.detail.reason);
      initMediaElementState(e.detail.callId);
      removeHangupButton(e.detail.callId);
    }
    function incomingCallHandler(e) {
      $("#hangup").attr("disabled", false).val("Hangup");
      addHangupButton(e.detail.callId);
    }
    function userMediaSuccessHandler(e) {
      console.log("userMediaSuccessHandler e.detail.callId :" + e.detail.callId);
      console.log("userMediaSuccessHandler e.detail.callType :" + e.detail.callType);
      console.log("userMediaSuccessHandler e.detail.remoteId :" + e.detail.remoteId);
      //Adding local Stream in Div. Video is muted

      var streamType = 'video';

      if( e.detail.videoIsAvailable === false) {
        //User has no webcam
        streamType = 'audio';
      }
      //You can decide to manage your own stream display function or use the integrated one of ApiRTC
      /*
          addStreamInDiv(e.detail.stream, e.detail.callType, "mini", 'miniElt-' + e.detail.callId,
                         {width : "160px", height : "120px"}, true);
      */
      webRTCClient.addStreamInDiv(e.detail.stream, streamType, "mini", 'miniElt-' + e.detail.callId,
        {width : "128px", height : "96px"}, true);
    }
    function remoteStreamAddedHandler(e) {
      console.log("remoteStreamAddedHandler, e.detail.callId :" + e.detail.callId);
      console.log("remoteStreamAddedHandler, e.detail.callType :" + e.detail.callType);
      console.log("userMediaSuccessHandler e.detail.remoteId :" + e.detail.remoteId);
      //Adding Remote Stream in Div. Video is not muted
      //You can decide to manage your own stream display function or use the integrated one of ApiRTC
      /*
          addStreamInDiv(e.detail.stream, e.detail.callType, "remote", 'remoteElt-' + e.detail.callId,
                         {width : "640px", height : "480px"}, false);
      */
      webRTCClient.addStreamInDiv(e.detail.stream, e.detail.callType, "remote", 'remoteElt-' + e.detail.callId,
        {width : "640px", height : "480px"}, false);
    }
    function updateAddressBook() {
      console.log("updateAddressBook");
      var length = connectedUsersList.length,
        i = 0;
      //Cleaning addressBook list
      $("#addressBookDropDown").empty();
      for (i = 0; i < length; i += 1) {
        //Checking if connectedUser is not current user befire adding in addressBook list
        if (connectedUsersList[i].userId !== apiRTC.session.apiCCId) {
          if(connectedUsersList[i].group !== undefined) {
            $("#addressBookDropDown").append('<li><a href="#" onclick="selectPhonebookItem(' + connectedUsersList[i].userId + ')">' + connectedUsersList[i].userId + ' - ' + connectedUsersList[i].group + '</a></li>');
          } else {
            $("#addressBookDropDown").append('<li><a href="#" onclick="selectPhonebookItem(' + connectedUsersList[i].userId + ')">' + connectedUsersList[i].userId + '</a></li>');
          }
        }
      }
    }
    function connectedUsersListUpdateHandler(e) {
      console.log("connectedUsersListUpdateHandler, e.detail.group :" + e.detail.group);
      //getting complete connectedUsersList
      //connectedUsersList = apiRTC.session.getConnectedUsersList();
      //getting connectedUsersList of updated group
      //connectedUsersList = apiRTC.session.getConnectedUsersList(e.detail.group);
      connectedUsersList = apiRTC.session.getConnectedUserIdsList();
      //console.log("connectedUsersList.length :" + connectedUsersList.length);
      //Updating addressBook
      updateAddressBook();
    }

//MCU
    function joinMCUSessionAnswerHandler(e) {
      console.log("joinMCUSessionAnswerHandler :", e);

      var callConfiguration = {
        //muted : "VIDEOONLY"
      };

      //We are now connected in the room
      //Publishing our own stream in the room
      publishCallId = webRTCClient.publish(e.detail.roomId, e.detail.sessionId, e.detail.token, callConfiguration);
    }

    function MCUAvailableStreamHandler(e) {
      console.log("MCUAvailableStreamHandler :", e);

      var i = 0;

      if (e.detail.isRemoteStream) {
        //This a remote stream list, subscribing to remote streams
        console.log("Remote streams available");
        webRTCClient.subscribe(e.detail.streams);
      } else {
        //This my own stream, not subscribing to it
        console.log("my own stream is available on MCU");
      }
    }
//MCU


    //sessionReadyHandler : apiRTC is now connected
    function sessionReadyHandler(e) {
      console.log('sessionReadyHandler :' + apiRTC.session.apiCCId);
      $("#call").attr("disabled", false).val("Call");   //Modification of Call button when phone is registered on Apizee
      apiRTC.addEventListener("userMediaSuccess", userMediaSuccessHandler);
      apiRTC.addEventListener("incomingCall", incomingCallHandler);
      apiRTC.addEventListener("userMediaError", userMediaErrorHandler);
      apiRTC.addEventListener("hangup", hangupHandler);
      apiRTC.addEventListener("remoteStreamAdded", remoteStreamAddedHandler);

      //screenSharing
      apiRTC.addEventListener("desktopCapture", desktopCaptureHandler);

      //connectedUsersList
      apiRTC.addEventListener("connectedUsersListUpdate", connectedUsersListUpdateHandler);
      //connectedUsersList

//MCU
      apiRTC.addEventListener("joinMCUSessionAnswer", joinMCUSessionAnswerHandler);
      apiRTC.addEventListener("MCUAvailableStream", MCUAvailableStreamHandler);
//MCU

      //webRTC Client creation
      webRTCClient = apiRTC.session.createWebRTCClient({
        status : "status" //Optionnal
      });
      //Multi calls Activation
      webRTCClient.setAllowMultipleCalls(true);
      //Bandwitdh limitation
      webRTCClient.setVideoBandwidth(1500);

      //ScreenSharing Activation
      webRTCClient.activateScreenSharing();

      //Adding MCU selection
      webRTCClient.setMCUConnector('mcu4.apizee.com');

      //webRTCClient.enableMeshRoomMode(true);

      imClient = apiCC.session.createIMClient();

      //Call establishment
      $("#callVideo").click(function () {
        $("#hangup").attr("disabled", false).val("Hangup");
        var callId = webRTCClient.call($("#number").val());
        console.log("callId on call =" + callId);
        if (callId != null) {
          addHangupButton(callId);
        }
      });

      //ScreenSharing establishment
      $("#shareScreen").click(function () {
        $("#hangup").attr("disabled", false).val("Hangup");

        var callId = 0,
          data = {},
          callConfiguration = {};

        if (apiRTC.browser === "Chrome") {
          callId = webRTCClient.publishScreen($("#number").val(), data, callConfiguration);
        } else if (apiRTC.browser === "Firefox") {
          callId = webRTCClient.publishScreen($("#number").val(), data, callConfiguration, 'screen');
        }

        console.log("callId on sharescreen =" + callId);
        if (callId != null) {
          addHangupButton(callId);
        }
      });

      //Global hangup management : all established client calls will be hangup
      $("#hangup").click(function () {
        $("#call").attr("disabled", false).val("Call");
        webRTCClient.hangUp();
      });

      $("#joinMCUSession").click(function () {
        console.log("joinMCUSession");
        webRTCClient.joinMCUSession($("#number").val());
      });

      $("#leaveMCUSession").click(function () {
        console.log("leaveMCUSession");
        webRTCClient.leaveMCUSession($("#number").val());
      });
    }
    $("#addressBook").on('click', function() {
      console.log("click on addressBookDropDown");

      $("#addressBookDropDown").toggle();
    });
    $("#videoMute").click(function () {
      webRTCClient.toggleVideoMute(publishCallId);
    });
    //apiRTC initialization
    apiRTC.init({
      apiKey : "myDemoApiKey",
      //apiCCId : "1",
      onReady : sessionReadyHandler,
      webRTCPluginActivated : true
    });
  }

}
