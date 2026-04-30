import recordThumbnail from './thumbnail.jpg';

// Local Player Variables
const player = document.getElementById('player');
const START_TIME = 0; // Using extracted local video which is already from 0:32
// Note: Real cue points are offset if the video starts from 0:32. 
// E.g., original 0:32 is now 0s. 0:38 is 6s. 0:45 is 13s. 0:50 is 18s.
const CUE_OFFSET = 32.532;

// DOM Elements
const recordImage = document.getElementById('record');
const tempoSlider = document.getElementById('tempo');
const tempoDisplay = document.getElementById('tempo-display');
const cueButtons = document.querySelectorAll('.cue-btn[data-time]');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnStop = document.getElementById('btn-stop');

// Set Turntable Image to local thumbnail
recordImage.src = recordThumbnail;

// Handle Turntable spinning state and button text based on video events
player.addEventListener('play', () => {
  recordImage.classList.add('playing');
  if (btnPlayPause) btnPlayPause.classList.add('is-playing');
});

player.addEventListener('pause', () => {
  recordImage.classList.remove('playing');
  if (btnPlayPause) btnPlayPause.classList.remove('is-playing');
});

player.addEventListener('ended', () => {
  recordImage.classList.remove('playing');
});

// Tempo Control
tempoSlider.addEventListener('input', (e) => {
  const rate = parseFloat(e.target.value);
  tempoDisplay.textContent = rate.toFixed(2) + 'x';
  player.playbackRate = rate;
});

// Hot Cues
cueButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    // The data-time is absolute (e.g. 32, 38, 45, 50).
    // The local video is cut from 0:32, so we need to subtract the offset.
    const originalTime = parseFloat(btn.getAttribute('data-time'));
    const localTime = Math.max(0, originalTime - CUE_OFFSET);
    
    player.currentTime = localTime;
    if (player.paused) {
      player.play();
    }
    
    // Visual feedback
    btn.classList.add('active');
    setTimeout(() => {
      btn.classList.remove('active');
    }, 200);
  });
});

// Transport Controls (Play/Pause, Stop)

if (btnPlayPause) {
  btnPlayPause.addEventListener('click', () => {
    if (player.paused) {
      player.play();
    } else {
      player.pause();
    }
  });
}

if (btnStop) {
  btnStop.addEventListener('click', () => {
    player.pause();
    player.currentTime = 0; // Return to the start of the local video
  });
}

// Cue Randomization
const btnCueReset = document.getElementById('btn-cue-reset');

function randomizeCues() {
  const maxLocalTime = 23.0; // slightly before the end of the 23.4s video
  let randomTimes = [];
  for (let i = 0; i < 3; i++) {
    randomTimes.push(Math.random() * maxLocalTime);
  }
  randomTimes.sort((a, b) => a - b);
  
  cueButtons.forEach((btn, index) => {
    const newOriginalTime = CUE_OFFSET + randomTimes[index];
    btn.setAttribute('data-time', newOriginalTime.toString());
    
    // Add brief visual feedback to show they were reset
    btn.style.boxShadow = '0 0 20px #00f3ff';
    setTimeout(() => {
      btn.style.boxShadow = '';
    }, 300);
  });
}

if (btnCueReset) {
  btnCueReset.addEventListener('click', randomizeCues);
}

// Randomize cues on initial load
randomizeCues();

// Help Modal Logic
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeBtn = document.querySelector('.close-btn');

if (helpBtn && helpModal && closeBtn) {
  helpBtn.addEventListener('click', () => {
    helpModal.style.display = 'block';
  });

  closeBtn.addEventListener('click', () => {
    helpModal.style.display = 'none';
  });

  // Close when clicking outside the modal content
  window.addEventListener('click', (event) => {
    if (event.target === helpModal) {
      helpModal.style.display = 'none';
    }
  });
}

// Recording Logic
const btnRecord = document.getElementById('btn-record');
let audioContext;
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let audioSource;
let audioDest;

if (btnRecord) {
  btnRecord.addEventListener('click', async () => {
    if (!isRecording) {
      await startRecording();
    } else {
      stopRecording();
    }
  });
}

async function startRecording() {
  // Initialize AudioContext on first click
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioSource = audioContext.createMediaElementSource(player);
    audioDest = audioContext.createMediaStreamDestination();
    
    // Connect player -> destination (for recording) AND player -> speakers (for hearing)
    audioSource.connect(audioDest);
    audioSource.connect(audioContext.destination);
    
    mediaRecorder = new MediaRecorder(audioDest.stream);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.onstop = exportRecording;
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  recordedChunks = [];
  mediaRecorder.start();
  isRecording = true;
  btnRecord.classList.add('recording');
}

function stopRecording() {
  mediaRecorder.stop();
  isRecording = false;
  btnRecord.classList.remove('recording');
}

function exportRecording() {
  const blob = new Blob(recordedChunks, { type: 'audio/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';
  a.href = url;
  // Use a nice filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.download = `HENKAKU-Session-${timestamp}.webm`;
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

