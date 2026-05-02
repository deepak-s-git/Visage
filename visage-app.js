/* ── CLOCK (IST) ── */
function updateClock() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utcMs + 5.5 * 3600000);
  const h = String(ist.getHours()).padStart(2,'0');
  const m = String(ist.getMinutes()).padStart(2,'0');
  const s = String(ist.getSeconds()).padStart(2,'0');
  document.getElementById('live-clock').textContent = `${h}:${m}:${s}`;
}
updateClock();
setInterval(updateClock, 1000);

/* ── EMOTION PROFILES ── */
const emotionProfiles = {
  happy:     { word: 'Happy',     song: 'Golden Hour',               artist: 'JVKE',        bpm: 97  },
  sad:       { word: 'Sad',       song: 'Motion Picture Soundtrack',  artist: 'Radiohead',   bpm: 68  },
  angry:     { word: 'Angry',     song: 'Running Up That Hill',       artist: 'Kate Bush',   bpm: 138 },
  surprised: { word: 'Surprised', song: 'Sabali',                     artist: 'Amadou & Mariam', bpm: 112 },
  disgusted: { word: 'Disgusted', song: 'Creep',                      artist: 'Radiohead',   bpm: 92  },
  fearful:   { word: 'Fearful',   song: 'Breathe Me',                 artist: 'Sia',         bpm: 62  },
  neutral:   { word: 'Neutral',   song: 'Gymnopédie No.1',            artist: 'Erik Satie',  bpm: 54  }
};

let spotifyConnected = false;
let detecting = false;
let camStream = null;
let lastDetectedProfile = null;
let analysisState = 'awaiting';
let debugEnabled = false;
let emotionEngine = null;

/* ── WEBCAM ── */
function showCameraStatus(message, actionLabel, actionHandler) {
  const noCam = document.getElementById('no-cam');
  const noCamText = document.getElementById('no-cam-text');
  const actionBtn = document.getElementById('cam-enable-btn');
  noCam.style.display = 'flex';
  noCamText.textContent = message;

  if (actionLabel && actionHandler) {
    actionBtn.querySelector('span').textContent = actionLabel;
    actionBtn.onclick = actionHandler;
    actionBtn.style.display = 'inline-flex';
  } else {
    actionBtn.style.display = 'none';
    actionBtn.onclick = null;
  }
}

function hasGetUserMediaSupport() {
  return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
}

async function hasVideoInputDevice() {
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== 'function') return true;
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.some((d) => d.kind === 'videoinput');
}

function stopSimulation() {
  // No simulation fallback: keep camera frame clean black.
}

async function initCamera() {
  const video = document.getElementById('webcam');
  const status = document.getElementById('status-text');

  showCameraStatus('Initialising…');
  video.classList.remove('is-visible');
  video.style.display = 'none';

  try {
    if (detecting) stopRealtimeAnalysis();

    if (camStream) {
      camStream.getTracks().forEach((track) => track.stop());
      camStream = null;
    }

    if (!hasGetUserMediaSupport()) {
      stopSimulation();
      showCameraStatus('Browser does not support webcam capture');
      status.textContent = 'Camera Unavailable';
      setAnalysisState('awaiting');
      return;
    }

    const hasCamera = await hasVideoInputDevice();
    if (!hasCamera) {
      stopSimulation();
      showCameraStatus('No webcam detected on this device', 'Enable Camera', () => initCamera());
      status.textContent = 'Camera Unavailable';
      setAnalysisState('awaiting');
      return;
    }

    const primaryConstraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 960, max: 1280 },
        height: { ideal: 540, max: 720 },
        frameRate: { ideal: 30, max: 30 },
        resizeMode: 'crop-and-scale'
      },
      audio: false
    };

    const fallbackConstraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 640, max: 960 },
        height: { ideal: 360, max: 540 },
        frameRate: { ideal: 24, max: 30 }
      },
      audio: false
    };

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
    } catch (primaryError) {
      const primaryName = primaryError && primaryError.name ? primaryError.name : '';
      if (primaryName !== 'OverconstrainedError' && primaryName !== 'NotReadableError') throw primaryError;
      stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
    }

    camStream = stream;
    video.srcObject = stream;
    video.style.display = 'block';
    stopSimulation();
    document.getElementById('no-cam').style.display = 'none';

    await new Promise((resolve) => {
      if (video.readyState >= 2) {
        resolve();
        return;
      }
      const onLoaded = () => {
        video.removeEventListener('loadeddata', onLoaded);
        resolve();
      };
      video.addEventListener('loadeddata', onLoaded);
    });

    await video.play();
    requestAnimationFrame(() => video.classList.add('is-visible'));

    const [videoTrack] = stream.getVideoTracks();
    if (videoTrack && typeof videoTrack.applyConstraints === 'function') {
      try {
        await videoTrack.applyConstraints({ frameRate: { max: 30, ideal: 30 } });
      } catch (_constraintError) {
        // Non-fatal: some browsers/devices reject post-start constraints.
      }
    }

    document.getElementById('no-cam').style.display = 'none';
    setStep(1);
    status.textContent = 'Ready';
    setAnalysisState('awaiting');
    const labelEl = document.querySelector('.cam-label-text');
    if (labelEl) labelEl.textContent = 'Subject · Live Feed';
  } catch (e) {
    const errorName = e && e.name ? e.name : 'Error';
    stopSimulation();
    if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
      showCameraStatus('Webcam permission denied', 'Enable Camera', () => initCamera());
      status.textContent = 'Awaiting Camera';
    } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError' || errorName === 'OverconstrainedError') {
      showCameraStatus('No available webcam source found', 'Enable Camera', () => initCamera());
      status.textContent = 'Camera Unavailable';
    } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
      showCameraStatus('Webcam is busy in another app', 'Enable Camera', () => initCamera());
      status.textContent = 'Awaiting Camera';
    } else {
      showCameraStatus('Unable to access webcam', 'Enable Camera', () => initCamera());
      status.textContent = 'Awaiting Camera';
    }
    setAnalysisState('awaiting');
  }
}

// Auto-start on load
window.addEventListener('load', () => {
  setTimeout(initCamera, 400);
});

/* ── CATALOGUE STEP ── */
function setStep(n) {
  document.querySelectorAll('.catalogue-item').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.step) === n);
  });
}

function formatDebugNumber(value) {
  if (!Number.isFinite(value)) return '0.000';
  return value.toFixed(3);
}

function updateDebugPanel(payload = {}) {
  const state = payload.state || analysisState;
  document.getElementById('dbg-state').textContent = state;
  document.getElementById('dbg-brightness').textContent = formatDebugNumber(payload.happy ?? 0);
  document.getElementById('dbg-contrast').textContent = formatDebugNumber(payload.neutral ?? 0);
  document.getElementById('dbg-motion').textContent = formatDebugNumber(payload.tension ?? 0);
  document.getElementById('dbg-valence').textContent = formatDebugNumber(payload.valence ?? 0);
  document.getElementById('dbg-arousal').textContent = formatDebugNumber(payload.arousal ?? 0);
  const confidence = Number.isFinite(payload.confidence) ? payload.confidence : 0;
  document.getElementById('dbg-confidence').textContent = Math.round(confidence) + '%';
}

function toggleDebugPanel() {
  debugEnabled = !debugEnabled;
  const panel = document.getElementById('debug-panel');
  const btn = document.getElementById('debug-toggle-btn');
  panel.classList.toggle('visible', debugEnabled);
  btn.textContent = debugEnabled ? 'Hide Debug Signals' : 'Show Debug Signals';
  if (debugEnabled) updateDebugPanel({ state: analysisState });
}

function setAnalysisState(nextState) {
  analysisState = nextState;
  const shell = document.querySelector('.shell');
  if (shell) shell.dataset.analysisState = nextState;

  const label = document.getElementById('detect-label');
  const status = document.getElementById('status-text');
  if (nextState === 'awaiting') {
    label.textContent = 'Detect My Emotion';
    if (camStream) status.textContent = 'Ready';
  } else if (nextState === 'analyzing') {
    label.textContent = detecting ? 'Stop Analysis' : 'Analysing…';
    status.textContent = 'Processing';
  } else if (nextState === 'searching') {
    label.textContent = detecting ? 'Stop Analysis' : 'Analysing…';
    status.textContent = 'No Face Detected';
  } else if (nextState === 'detected') {
    label.textContent = detecting ? 'Stop Analysis' : 'Analyse Again';
    status.textContent = 'Calibrated';
  }
  if (debugEnabled) updateDebugPanel({ state: nextState });
}

function resetDetectionVisuals() {
  const moodEl = document.getElementById('mood-word');
  moodEl.classList.remove('revealed');
  moodEl.textContent = '—';
  ['metric-conf','metric-val','metric-aro'].forEach((id) => {
    document.getElementById(id).classList.remove('revealed');
  });
  document.getElementById('fill-conf').style.width = '0%';
  document.getElementById('fill-valence-pos').style.width = '0%';
  document.getElementById('fill-valence-neg').style.width = '0%';
  document.getElementById('fill-arousal-pos').style.width = '0%';
  document.getElementById('fill-arousal-neg').style.width = '0%';
  document.getElementById('val-conf').textContent = '—';
  document.getElementById('val-valence').textContent = '—';
  document.getElementById('val-arousal').textContent = '—';
}

function ensureEmotionEngine() {
  if (emotionEngine) return emotionEngine;
  emotionEngine = window.createEmotionEngine({
    emotionProfiles,
    onState: (state) => {
      setAnalysisState(state);
      if (state === 'awaiting') {
        const scan = document.getElementById('scan-line');
        const analysing = document.getElementById('analysing-text');
        scan.classList.remove('active');
        analysing.classList.remove('visible');
      }
    },
    onResult: (result) => {
      lastDetectedProfile = result;
      renderDetectionResult(result);
      setStep(3);
      updateSpotifyTrack(result);
    },
    onDebug: (payload) => {
      if (debugEnabled) updateDebugPanel(payload);
    }
  });
  return emotionEngine;
}

function renderDetectionResult(result) {
  const moodEl = document.getElementById('mood-word');
  moodEl.textContent = result.word;
  requestAnimationFrame(() => requestAnimationFrame(() => moodEl.classList.add('revealed')));

  document.getElementById('val-conf').textContent = result.confidence + '%';
  document.getElementById('fill-conf').style.width = result.confidence + '%';
  document.getElementById('metric-conf').classList.add('revealed');

  document.getElementById('val-valence').textContent = (result.valence >= 0 ? '+' : '') + result.valence.toFixed(2);
  if (result.valence >= 0) {
    document.getElementById('fill-valence-pos').style.width = (result.valence * 50) + '%';
    document.getElementById('fill-valence-neg').style.width = '0%';
  } else {
    document.getElementById('fill-valence-neg').style.width = (Math.abs(result.valence) * 50) + '%';
    document.getElementById('fill-valence-pos').style.width = '0%';
  }
  document.getElementById('metric-val').classList.add('revealed');

  document.getElementById('val-arousal').textContent = (result.arousal >= 0 ? '+' : '') + result.arousal.toFixed(2);
  if (result.arousal >= 0) {
    document.getElementById('fill-arousal-pos').style.width = (result.arousal * 50) + '%';
    document.getElementById('fill-arousal-neg').style.width = '0%';
  } else {
    document.getElementById('fill-arousal-neg').style.width = (Math.abs(result.arousal) * 50) + '%';
    document.getElementById('fill-arousal-pos').style.width = '0%';
  }
  document.getElementById('metric-aro').classList.add('revealed');
}

/* ── SPOTIFY ── */
function connectSpotify() {
  if (spotifyConnected) return;
  const btn = document.getElementById('spotify-btn');
  btn.querySelector('span').textContent = 'Connected ✓';
  btn.style.pointerEvents = 'none';
  spotifyConnected = true;
  if (lastDetectedProfile) updateSpotifyTrack(lastDetectedProfile);
}

function updateSpotifyTrack(profile) {
  if (!spotifyConnected || !profile) return;
  document.getElementById('track-title').textContent  = profile.song;
  document.getElementById('track-artist').textContent = profile.artist;
  document.getElementById('track-bpm').textContent    = profile.bpm;
  document.getElementById('spotify-track').classList.add('visible');
}

function stopRealtimeAnalysis() {
  detecting = false;
  if (emotionEngine) emotionEngine.stop();
  setAnalysisState('awaiting');
}

/* ── DETECTION ── */
async function runDetection() {
  const video = document.getElementById('webcam');
  if (detecting) {
    stopRealtimeAnalysis();
    return;
  }

  if (!camStream || video.readyState < 2) {
    showCameraStatus('Enable webcam to start analysis', 'Enable Camera', () => initCamera());
    setAnalysisState('awaiting');
    return;
  }

  const scan = document.getElementById('scan-line');
  const analysing = document.getElementById('analysing-text');
  try {
    const engine = ensureEmotionEngine();
    document.getElementById('status-text').textContent = 'Loading AI Model';
    await engine.ensureEmotionModelLoaded();
    detecting = true;
    resetDetectionVisuals();
    setStep(2);
    setAnalysisState('analyzing');
    scan.classList.remove('active');
    void scan.offsetWidth;
    scan.classList.add('active');
    analysing.classList.add('visible');
    if (debugEnabled) updateDebugPanel({ state: 'analyzing' });
    await engine.start(video);
  } catch (_loadErr) {
    detecting = false;
    setAnalysisState('awaiting');
    document.getElementById('status-text').textContent = 'Model Load Failed';
    showCameraStatus('Could not load emotion model. Use local server and retry.', 'Retry', () => runDetection());
    scan.classList.remove('active');
    analysing.classList.remove('visible');
    return;
  }
}

setStep(1);
setAnalysisState('awaiting');
document.getElementById('debug-toggle-btn').addEventListener('click', toggleDebugPanel);

window.connectSpotify = connectSpotify;
window.runDetection = runDetection;
