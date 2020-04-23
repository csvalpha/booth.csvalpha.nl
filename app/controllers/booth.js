import Controller from '@ember/controller';
import {action} from '@ember/object';
import { computed } from '@ember/object';

export default class BoothController extends Controller {
  @action
  async joinRoom(roomId) {
    this.setVideoSize();
    if(this.webRTCClient === undefined) {
      this.send("initRTC");
      this.set("autoJoin", roomId);
      return;
    }
    console.log("Join room", roomId);

    this.webRTCClient.joinMCUSession(roomId)
  }

  @action
  leaveRoom(roomId) {
    this.webRTCClient.hangUp();
    this.webRTCClient.leaveMCUSession(roomId)
  }

  @action
  initRTC() {
    console.log("setup RTC");
    apiRTC.init({
      apiKey: "a97093b453261b8e89ebf22dffe7c51e",
      // apiCCId : ccId,
      onReady: this.sessionReady,
      webRTCPluginActivated: true
    });
  }

  @action
  sessionReady(e) {
    console.log('Session readly. CCId=' + apiRTC.session.apiCCId);

    apiRTC.addEventListener("userMediaSuccess", this.userMediaSuccessHandler);
    apiRTC.addEventListener("incomingCall", this.noopHandler);
    apiRTC.addEventListener("userMediaError", this.errorHandler);
    apiRTC.addEventListener("hangup", this.hangupHandler);
    apiRTC.addEventListener("remoteStreamAdded", this.remoteStreamAddedHandler);

    apiRTC.addEventListener("joinMCUSessionAnswer", this.joinMCUSessionAnswerHandler);
    apiRTC.addEventListener("MCUAvailableStream", this.MCUAvailableStreamHandler);

    //webRTC Client creation
    this.webRTCClient = apiRTC.session.createWebRTCClient({
      status: "status" //Optionnal
    });
    this.webRTCClient.setAllowMultipleCalls(true);
    this.webRTCClient.setVideoBandwidth(1500);

    //Adding MCU selection
    this.webRTCClient.setMCUConnector('mcu4.apizee.com');
    apiCC.session.createIMClient();

    // Wonky hack to workaround setup orders
    if(this.autoJoin) {
      this.send("joinRoom", this.autoJoin);
      this.set("autoJoin", null);
    }
  }

  // When we joined the MCU session
  @action
  joinMCUSessionAnswerHandler(e) {
    console.log("Joined MCU, publish it to the room");

    //We are now connected in the room
    //Publishing our own stream in the room
    this.publishCallId = this.webRTCClient.publish(e.detail.roomId, e.detail.sessionId, e.detail.token, { videoOnly: true });
  }

  // When there is a stream in the MCU
  @action
  MCUAvailableStreamHandler(e) {
    if (!e) {
      return;
    }

    if (e.detail.isRemoteStream) {
      //This a remote stream list, subscribing to remote streams
      console.log("Remote streams available", e.detail.streams);
      this.webRTCClient.subscribe(e.detail.streams);
    }
  }

  // When there is a remote stream
  @action
  remoteStreamAddedHandler(e) {
    console.log("Found remote stream");

    this.webRTCClient.addStreamInDiv(e.detail.stream, e.detail.callType, "streams", e.detail.callId,
      {}, true);
    this.setVideoSize();
  }

  // When local media has been started
  @action
  userMediaSuccessHandler(e) {
    console.log("Found local stream");

    if (e.detail.videoIsAvailable === false) {
      alert("You need a camera to use this tool.")
    }

    this.webRTCClient.addStreamInDiv(e.detail.stream, "video", "streams", e.detail.callId,
      {}, true);
    this.setVideoSize();
  }

  // When an user has hangup
  @action
  hangupHandler(e) {
    console.log('User has been disconnected :' + e.detail.callId);

    this.webRTCClient.removeElementFromDiv('streams', e.detail.callId);
    this.setVideoSize();
  }

  // reset image classes when someone joins
  @action
  setVideoSize() {
    let videos = document.getElementsByTagName('video')
    // let videos = document.getElementsByClassName('streamVideo')
    let grid_size = 1;

    // Calculate the minimal grid size to fit all videos
    while(true) {
      if (grid_size * grid_size >= videos.length) {
        break;
      }
      grid_size += 1;
    }

    let video_width = (100 / grid_size) -2;
    for(let video of videos) {
      video.style.width = `${video_width}%`;
      video.classList = ['p-1']
    }
  }

  @action
  errorHandler(e){
    this.set("error", e.detail.error.message)
  }

  @action
  noopHandler(e) {
    console.log("Noop Handler", e)
  }

  @action
  takeImage() {
    var streamsContainer = document.getElementById('streams');
    var streams = document.getElementsByTagName("video");

    // Make the canvas the same size as the live vide
    var snapshot = document.getElementById('lastImage');
    snapshot.width = streamsContainer.offsetWidth;
    snapshot.height = streamsContainer.offsetHeight;

    // Draw a frame of the live video onto the canvas
    var c = snapshot.getContext('2d');
    Array.from(streams).forEach(function(stream) {
      c.drawImage(stream, stream.offsetLeft, stream.offsetTop, stream.offsetWidth, stream.offsetHeight);
    });


    // Create an image element with the canvas image data
    // var img = document.createElement('img');
    // img.src = snapshot.toDataURL('image/png');
    // img.style.padding = 5;
    // img.width = snapshot.width;
    // img.height = snapshot.height;

    // data = snapshot.toDataURL("image/png");
    // $('#timeline').append('<a href="'+data+'" target="_blank"><img src="'+data+'" /></a>');

    this.sendToDrive(snapshot)
  }

  @action
  sendToDrive(fileCanvas) {
    const outerThis = this;
    fileCanvas.toBlob(function(blob) {
      const formData = new FormData();
      formData.append('file', blob, 'filename.png');

      fetch('https://proxy.csvalpha.nl/api/v1/photo_albums/2/dropzone', {
        body: formData,
        method: 'POST',
        contentType: false, // NEEDED, DON'T OMIT THIS (requires jQuery 1.6+)
        processData: false // NEEDED, DON'T OMIT THIS
      }).then(function(response) {
        if(response.ok) {
          outerThis.set("success", "Foto is genomen! Je kan hem bekijken op de Alpha site");
          outerThis.set("error", null)
        } else {
          outerThis.set("error", response.statusText)
        }
      })
    });



  }

}
