const Peer = window.Peer;
const stats_period = 100; // ms
let received_frames_list = new Array(1000 / stats_period).fill(0);
let received_bytes_list = new Array(1000 / stats_period).fill(0);
let previous_received_frames = 0;
let previous_received_bytes = 0;

(async function main() {
  const localVideo = document.getElementById('js-local-stream');
  const localId = document.getElementById('js-local-id');
  const callTrigger = document.getElementById('js-call-trigger');
  const closeTrigger = document.getElementById('js-close-trigger');
  const statsTrigger = document.getElementById('js-stats-trigger');
  const remoteVideo = document.getElementById('js-remote-stream');
  const remoteId = document.getElementById('js-remote-id');

  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: {
        width: { min: 640, ideal: 1280 },
        height: { min: 360, ideal: 720 },
        //width: { min: 640, ideal: 1920 },
        //height: { min: 480, ideal: 1080 },
        frameRate: { min: 10, max: 30 },
        facingMode: { ideal: "environment" }
      },
    })
    .catch(console.error);

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);

  const peer = (window.peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  }));

  // Register caller handler
  callTrigger.addEventListener('click', () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      return;
    }

    //    const mediaConnection = peer.call(remoteId.value, localStream, {
    const mediaConnection = peer.call(remoteId.value, null, {
      videoReceiveEnabled: true,
      audioReceiveEnabled: true,
      videoCodec: 'H264',
    });
    // Register caller handler
    statsTrigger.addEventListener('click', () => startStatsTimer(mediaConnection));

    mediaConnection.on('stream', async stream => {
      // Render remote stream for caller
      remoteVideo.srcObject = stream;
      remoteVideo.playsInline = true;
      await remoteVideo.play().catch(console.error);
    });

    mediaConnection.once('close', () => {
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
    });

    closeTrigger.addEventListener('click', () => mediaConnection.close(true));
  });

  peer.once('open', id => (localId.textContent = id));

  // Register callee handler
  peer.on('call', mediaConnection => {
    mediaConnection.answer(localStream);

    // Register caller handler
    statsTrigger.addEventListener('click', () => startStatsTimer(mediaConnection));

    mediaConnection.on('stream', async stream => {
      // Render remote stream for callee
      remoteVideo.srcObject = stream;
      remoteVideo.playsInline = true;
      await remoteVideo.play().catch(console.error);
    });

    mediaConnection.once('close', () => {
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
    });

    closeTrigger.addEventListener('click', () => mediaConnection.close(true));
  });

  peer.on('error', console.error);

  function startStatsTimer(existingMediaConnection) {
    // getPeerConnection()を実行するとRTCPeerConnectionが取得できる
    const _PC = existingMediaConnection.getPeerConnection();
    timer = setInterval(() => {
      getRTCStats(_PC.getStats());
    }, stats_period);
  }

  async function getRTCStats(statsObject) {
    let stats = await statsObject;
    let trasportArray = [];
    let candidateArray = [];
    let candidatePairArray = [];
    let inboundRTPAudioStreamArray = [];
    let inboundRTPVideoStreamArray = [];
    let outboundRTPAudioStreamArray = [];
    let outboundRTPVideoStreamArray = [];
    let codecArray = [];
    let mediaStreamTrack_senderArray = [];
    let mediaStreamTrack_receiverArray = [];
    let mediaStreamTrack_local_audioArray = []
    let mediaStreamTrack_remote_audioArray = []
    let mediaStreamTrack_local_videoArray = []
    let mediaStreamTrack_remote_videoArray = []
    let candidatePairId = '';
    let localCandidateId = '';
    let remoteCandidateId = '';
    let localCandidate = {};
    let remoteCandidate = {};
    let inboundAudioCodec = {};
    let inboundVideoCodec = {};
    let outboundAudioCode = {};
    let outboundVideoCode = {};
    stats.forEach(stat => {
      if (stat.id.indexOf('RTCTransport') !== -1) {
        trasportArray.push(stat);
      }
      if (stat.id.indexOf('RTCIceCandidatePair') !== -1) {
        candidatePairArray.push(stat);
      }
      if (stat.id.indexOf('RTCIceCandidate_') !== -1) {
        candidateArray.push(stat);
      }
      if (stat.id.indexOf('RTCInboundRTPAudioStream') !== -1) {
        inboundRTPAudioStreamArray.push(stat);
      }
      if (stat.id.indexOf('RTCInboundRTPVideoStream') !== -1) {
        inboundRTPVideoStreamArray.push(stat);
      }
      if (stat.id.indexOf('RTCOutboundRTPAudioStream') !== -1) {
        outboundRTPAudioStreamArray.push(stat);
      }
      if (stat.id.indexOf('RTCOutboundRTPVideoStream') !== -1) {
        outboundRTPVideoStreamArray.push(stat);
      }
      if (stat.id.indexOf('RTCMediaStreamTrack_sender') !== -1) {
        mediaStreamTrack_senderArray.push(stat);
      }
      if (stat.id.indexOf('RTCMediaStreamTrack_receiver') !== -1) {
        mediaStreamTrack_receiverArray.push(stat);
      }
      if (stat.id.indexOf('RTCCodec') !== -1) {
        codecArray.push(stat);
      }
    });

    trasportArray.forEach(transport => {
      if (transport.dtlsState === 'connected') {
        candidatePairId = transport.selectedCandidatePairId;
      }
    });
    candidatePairArray.forEach(candidatePair => {
      if (candidatePair.state === 'succeeded' && candidatePair.id === candidatePairId) {
        localCandidateId = candidatePair.localCandidateId;
        remoteCandidateId = candidatePair.remoteCandidateId;
      }
    });
    candidateArray.forEach(candidate => {
      if (candidate.id === localCandidateId) {
        localCandidate = candidate;
      }
      if (candidate.id === remoteCandidateId) {
        remoteCandidate = candidate;
      }
    });

    inboundRTPAudioStreamArray.forEach(inboundRTPAudioStream => {
      codecArray.forEach(codec => {
        if (inboundRTPAudioStream.codecId === codec.id) {
          inboundAudioCodec = codec;
        }
      });
    });
    inboundRTPVideoStreamArray.forEach(inboundRTPVideoStream => {
      codecArray.forEach(codec => {
        if (inboundRTPVideoStream.codecId === codec.id) {
          inboundVideoCodec = codec;
        }
      });
    });
    outboundRTPAudioStreamArray.forEach(outboundRTPAudioStream => {
      codecArray.forEach(codec => {
        if (outboundRTPAudioStream.codecId === codec.id) {
          outboundAudioCodec = codec;
        }
      });
    });
    outboundRTPVideoStreamArray.forEach(outboundRTPVideo => {
      codecArray.forEach(codec => {
        if (outboundRTPVideo.codecId === codec.id) {
          outboundVideoCodec = codec;
        }
      });
    });
    mediaStreamTrack_senderArray.forEach(mediaStreamTrack => {
      if (mediaStreamTrack.kind === 'audio') {
        mediaStreamTrack_local_audioArray.push(mediaStreamTrack)
      } else if (mediaStreamTrack.kind === 'video') {
        mediaStreamTrack_local_videoArray.push(mediaStreamTrack)
      }
    });
    mediaStreamTrack_receiverArray.forEach(mediaStreamTrack => {
      if (mediaStreamTrack.kind === 'audio') {
        mediaStreamTrack_remote_audioArray.push(mediaStreamTrack)
      } else if (mediaStreamTrack.kind === 'video') {
        mediaStreamTrack_remote_videoArray.push(mediaStreamTrack)
      }
    });

    let currently_received_frames = inboundRTPVideoStreamArray[0].framesDecoded;
    received_frames_list.shift();
    received_frames_list.push(currently_received_frames - previous_received_frames);
    previous_received_frames = currently_received_frames;
    let frames_per_second = received_frames_list.reduce((total, data) => { return total + data }); // in latest 1 sec

    let currently_received_bytes = inboundRTPVideoStreamArray[0].bytesReceived;
    received_bytes_list.shift();
    received_bytes_list.push(currently_received_bytes - previous_received_bytes);
    previous_received_bytes = currently_received_bytes;
    let bit_per_second = received_bytes_list.reduce((total, data) => { return total + data }) * 8; // in latest 1 sec

    document.getElementById('local-candidate').innerHTML = localCandidate.ip + ':' + localCandidate.port + '(' + localCandidate.protocol + ')' + '<BR>type:' + localCandidate.candidateType;
    document.getElementById('remote-candidate').innerHTML = remoteCandidate.ip + ':' + remoteCandidate.port + '(' + remoteCandidate.protocol + ')' + '<BR>type:' + remoteCandidate.candidateType;

    document.getElementById('inbound-codec').innerHTML = inboundVideoCodec.mimeType;
    // document.getElementById('outbound-codec').innerHTML = outboundVideoCodec.mimeType;

    //    document.getElementById('inbound-audio').innerHTML = 'bytesReceived:' + inboundRTPAudioStreamArray[0].bytesReceived + '<BR>jitter:' + inboundRTPAudioStreamArray[0].jitter + '<BR>fractionLost:' + inboundRTPAudioStreamArray[0].fractionLost;
    document.getElementById('inbound-video').innerHTML = 'bytesReceived:' + inboundRTPVideoStreamArray[0].bytesReceived + '<BR>fractionLost:' + inboundRTPVideoStreamArray[0].fractionLost
      + '<BR>bitrate (kbps): ' + Math.round(bit_per_second / 1000.0)
      + '<BR>framesDecoded: ' + inboundRTPVideoStreamArray[0].framesDecoded
      + '<BR>frameRate: ' + frames_per_second;
    //    document.getElementById('outbound-audio').innerHTML = 'bytesSent:' + outboundRTPAudioStreamArray[0].bytesSent;
    // document.getElementById('outbound-video').innerHTML = 'bytesSent:' + outboundRTPVideoStreamArray[0].bytesSent;

    // document.getElementById('local-audio-video').innerHTML = 'frameHeight:' + mediaStreamTrack_local_videoArray[0].frameHeight + ' x ' + mediaStreamTrack_local_videoArray[0].frameWidth + '<BR>framesSent:' + mediaStreamTrack_local_videoArray[0].framesSent;
    document.getElementById('remote-audio-video').innerHTML = 'Resolution: ' + mediaStreamTrack_remote_videoArray[0].frameWidth + ' x ' + mediaStreamTrack_remote_videoArray[0].frameHeight
      + '<BR>framesDecoded: ' + mediaStreamTrack_remote_videoArray[0].framesDecoded + ' / framesDropped: ' + mediaStreamTrack_remote_videoArray[0].framesDropped + ' / framesReceived:' + mediaStreamTrack_remote_videoArray[0].framesReceived;
  }

})();