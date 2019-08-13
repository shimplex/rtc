const Peer = window.Peer;

(async function main() {
  const localVideo = document.getElementById('js-local-stream');
  const localId = document.getElementById('js-local-id');
  const callTrigger = document.getElementById('js-call-trigger');
  const closeTrigger = document.getElementById('js-close-trigger');
  const statsTrigger = document.getElementById('js-stats-trigger');
  const remoteVideo = document.getElementById('js-remote-stream');
  const remoteId = document.getElementById('js-remote-id');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');

  meta.innerText = `
    UA: ${navigator.userAgent}
    SDK: ${sdkSrc ? sdkSrc.src : 'unknown'}
  `.trim();

  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: {
        width: { min: 640, ideal: 1280 },
        height: { min: 480, ideal: 720 },
        frameRate: { min: 20, max: 60 },
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

    const mediaConnection = peer.call(remoteId.value, localStream, {
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
    }, 1000);
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

    document.getElementById('local-candidate').innerHTML = localCandidate.ip + ':' + localCandidate.port + '(' + localCandidate.protocol + ')' + '<BR>type:' + localCandidate.candidateType;
    document.getElementById('remote-candidate').innerHTML = remoteCandidate.ip + ':' + remoteCandidate.port + '(' + remoteCandidate.protocol + ')' + '<BR>type:' + remoteCandidate.candidateType;

    document.getElementById('inbound-codec').innerHTML = inboundVideoCodec.mimeType;
    document.getElementById('outbound-codec').innerHTML = outboundVideoCodec.mimeType;

//    document.getElementById('inbound-audio').innerHTML = 'bytesReceived:' + inboundRTPAudioStreamArray[0].bytesReceived + '<BR>jitter:' + inboundRTPAudioStreamArray[0].jitter + '<BR>fractionLost:' + inboundRTPAudioStreamArray[0].fractionLost;
    document.getElementById('inbound-video').innerHTML = 'bytesReceived:' + inboundRTPVideoStreamArray[0].bytesReceived + '<BR>fractionLost:' + inboundRTPVideoStreamArray[0].fractionLost

//    document.getElementById('outbound-audio').innerHTML = 'bytesSent:' + outboundRTPAudioStreamArray[0].bytesSent;
    document.getElementById('outbound-video').innerHTML = 'bytesSent:' + outboundRTPVideoStreamArray[0].bytesSent;

    document.getElementById('local-audio-video').innerHTML =  'frameHeight:' + mediaStreamTrack_local_videoArray[0].frameHeight + '<BR>frameWidth:' + mediaStreamTrack_local_videoArray[0].frameWidth + '<BR>framesSent:' + mediaStreamTrack_local_videoArray[0].framesSent;
    document.getElementById('remote-audio-video').innerHTML = 'frameHeight:' + mediaStreamTrack_local_videoArray[0].frameHeight + '<BR>frameWidth:' + mediaStreamTrack_remote_videoArray[0].frameWidth;
  }

})();