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

/* ── DETECTION MODES STATE ── */
let detectionMode = 'on-demand'; // 'on-demand' or 'continuous'
let demandScanTimeout = null;
let demandScanResults = [];
let newEmotionCandidate = null;
let newEmotionSince = 0;
let currentPlayingEmotion = null;

function resetModesState() {
  if (demandScanTimeout) {
    clearTimeout(demandScanTimeout);
    demandScanTimeout = null;
  }
  demandScanResults = [];
  newEmotionCandidate = null;
  newEmotionSince = 0;
  currentPlayingEmotion = null;
}

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

// Auto-start on load ONLY if dev/interface mode is active
window.addEventListener('load', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const isDevMode = urlParams.has('dev') || urlParams.has('interface') || localStorage.getItem('visage-dev-interface') === 'true';
  if (isDevMode) {
    setTimeout(initCamera, 400);
  }
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
  if (!label || !status) return;

  if (detectionMode === 'continuous') {
    if (nextState === 'awaiting') {
      label.textContent = 'Start Auto Analysis';
      if (camStream) status.textContent = 'Ready';
    } else if (nextState === 'analyzing' || nextState === 'searching' || nextState === 'detected') {
      label.textContent = 'Stop Auto Analysis';
      status.textContent = nextState === 'searching' ? 'No Face Detected' : (nextState === 'detected' ? 'Calibrated' : 'Processing');
    }
  } else {
    // on-demand mode
    if (nextState === 'awaiting') {
      label.textContent = 'Detect My Emotion';
      if (camStream) status.textContent = 'Ready';
    } else if (nextState === 'analyzing') {
      label.textContent = 'Stop Analysis';
      status.textContent = 'Scanning Face…';
    } else if (nextState === 'searching') {
      label.textContent = 'Stop Analysis';
      status.textContent = 'No Face Detected';
    } else if (nextState === 'detected') {
      label.textContent = 'Analyse Again';
      status.textContent = 'Analysis Locked';
    }
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
      if (state === 'awaiting' || state === 'searching') {
        const scan = document.getElementById('scan-line');
        const analysing = document.getElementById('analysing-text');
        scan?.classList.remove('active');
        analysing?.classList.remove('visible');
        
        // Reset 3D core if no face is found
        if (window._visageScene && window._visageScene.setEmotionState) {
          window._visageScene.setEmotionState({ valence: 0, arousal: 0 });
        }
      }
    },
    onResult: (result) => {
      // If in on-demand mode, we collect frames and update WebGL Neural Core only
      if (detectionMode === 'on-demand') {
        demandScanResults.push(result);
        if (window._visageScene && window._visageScene.setEmotionState) {
          window._visageScene.setEmotionState({ 
            valence: result.valence, 
            arousal: result.arousal 
          });
        }
        return;
      }

      // Continuous mode
      renderDetectionResult(result);
      setStep(3);
      processContinuousResult(result);
      
      // Send real-time emotion telemetry to the WebGL Neural Core
      if (window._visageScene && window._visageScene.setEmotionState) {
        window._visageScene.setEmotionState({ 
          valence: result.valence, 
          arousal: result.arousal 
        });
      }
    },
    onDebug: (payload) => {
      if (debugEnabled) updateDebugPanel(payload);
    }
  });
  return emotionEngine;
}

function processContinuousResult(result) {
  const status = document.getElementById('status-text');

  if (!currentPlayingEmotion) {
    currentPlayingEmotion = result.word;
    updateSpotifyTrack(result);
    if (status) status.textContent = 'Calibrated';
    return;
  }

  if (result.word === currentPlayingEmotion) {
    newEmotionCandidate = null;
    newEmotionSince = 0;
    if (status) status.textContent = 'Calibrated';
    return;
  }

  if (result.word !== newEmotionCandidate) {
    newEmotionCandidate = result.word;
    newEmotionSince = Date.now();
    if (status) status.textContent = `Confirming ${result.word} (3s)…`;
  } else {
    const elapsed = Date.now() - newEmotionSince;
    const remaining = Math.max(0, 3 - Math.floor(elapsed / 1000));
    if (elapsed >= 3000) {
      currentPlayingEmotion = result.word;
      newEmotionCandidate = null;
      newEmotionSince = 0;
      updateSpotifyTrack(result);
      if (status) status.textContent = 'Calibrated';
    } else {
      if (status) status.textContent = `Confirming ${result.word} (${remaining}s)…`;
    }
  }
}

function finalizeOnDemandScan() {
  if (demandScanResults.length > 0) {
    // Tally dominant emotions and compute averages
    const tallies = {};
    let avgValence = 0;
    let avgArousal = 0;
    let avgConfidence = 0;
    
    for (const res of demandScanResults) {
      tallies[res.word] = (tallies[res.word] || 0) + 1;
      avgValence += res.valence;
      avgArousal += res.arousal;
      avgConfidence += res.confidence;
    }
    
    const count = demandScanResults.length;
    avgValence /= count;
    avgArousal /= count;
    avgConfidence = Math.round(avgConfidence / count);
    
    let finalWord = 'Neutral';
    let maxCount = -1;
    for (const [word, c] of Object.entries(tallies)) {
      if (c > maxCount) {
        maxCount = c;
        finalWord = word;
      }
    }
    
    const finalProfile = emotionProfiles[finalWord.toLowerCase()] || emotionProfiles.neutral;
    const finalResult = {
      ...finalProfile,
      valence: avgValence,
      arousal: avgArousal,
      confidence: avgConfidence
    };

    renderDetectionResult(finalResult);
    lastDetectedProfile = finalResult;
    updateSpotifyTrack(finalResult);
  }

  stopRealtimeAnalysis();
  setAnalysisState('detected');
  setStep(3);
}

function renderDetectionResult(result) {
  const moodEl = document.getElementById('mood-word');
  if (moodEl) {
    const currentText = moodEl.textContent.trim();
    if (currentText !== result.word) {
      moodEl.textContent = result.word;
      // Triggers character formatting and GSAP fade-in in gsap-controller.js
    }
  }

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

/* ── SPOTIFY (Real OAuth) ── */

async function connectSpotify() {
  if (spotifyConnected) return;

  // If already authenticated from a previous session, just reconnect
  if (window.spotifyAuth && window.spotifyAuth.isAuthenticated()) {
    await handleSpotifyConnected();
    return;
  }

  // Start the OAuth popup flow
  const btn = document.getElementById('spotify-btn');
  btn.querySelector('span').textContent = 'Connecting…';
  btn.style.pointerEvents = 'none';

  if (window.spotifyAuth) {
    await window.spotifyAuth.startAuth();
  }
}

async function handleSpotifyConnected() {
  const btn = document.getElementById('spotify-btn');

  // Fetch user profile to show their name
  let displayName = null;
  if (window.spotifyAuth) {
    const profile = await window.spotifyAuth.fetchProfile();
    if (profile) displayName = profile.display_name;
  }

  btn.querySelector('span').textContent = displayName
    ? `${displayName} ✓`
    : 'Connected ✓';
  btn.style.pointerEvents = 'none';
  spotifyConnected = true;

  if (lastDetectedProfile) updateSpotifyTrack(lastDetectedProfile);
}

async function updateSpotifyTrack(profile) {
  if (!spotifyConnected || !profile) return;

  document.getElementById('track-title').textContent  = profile.song;
  document.getElementById('track-artist').textContent = profile.artist;
  document.getElementById('track-bpm').textContent    = profile.bpm;
  document.getElementById('spotify-track').classList.add('visible');

  // Search for the actual track on Spotify
  if (window.spotifyAuth) {
    try {
      const track = await window.spotifyAuth.searchTrack(profile.song, profile.artist);
      if (track) {
        // Store the URI so playback can be triggered later
        window._currentSpotifyTrackUri = track.uri;
        window._currentSpotifyTrack = track;
        
        // Actually trigger the playback on Spotify active player
        await window.spotifyAuth.playTrack(track.uri);
      }
    } catch (err) {
      console.warn('[Visage] Track search or play failed:', err);
    }
  }
}

function stopRealtimeAnalysis() {
  detecting = false;
  if (emotionEngine) emotionEngine.stop();
  setAnalysisState('awaiting');
  resetModesState();
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
    resetModesState();
    
    setStep(2);
    setAnalysisState('analyzing');
    scan.classList.remove('active');
    void scan.offsetWidth;
    scan.classList.add('active');
    analysing.classList.add('visible');
    if (debugEnabled) updateDebugPanel({ state: 'analyzing' });
    
    // Configure frame delay based on the active mode
    window._visageFrameDelay = (detectionMode === 'continuous') ? 800 : 150;
    
    await engine.start(video);

    if (detectionMode === 'on-demand') {
      document.getElementById('status-text').textContent = 'Scanning Face…';
      demandScanTimeout = setTimeout(() => {
        finalizeOnDemandScan();
      }, 2500);
    }
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

function initModeSelector() {
  const btnDemand = document.getElementById('mode-btn-demand');
  const btnAuto = document.getElementById('mode-btn-auto');
  
  if (!btnDemand || !btnAuto) return;
  
  btnDemand.addEventListener('click', () => {
    if (detectionMode === 'on-demand') return;
    stopRealtimeAnalysis();
    detectionMode = 'on-demand';
    btnDemand.classList.add('active');
    btnAuto.classList.remove('active');
    setAnalysisState('awaiting');
  });
  
  btnAuto.addEventListener('click', () => {
    if (detectionMode === 'continuous') return;
    stopRealtimeAnalysis();
    detectionMode = 'continuous';
    btnAuto.classList.add('active');
    btnDemand.classList.remove('active');
    setAnalysisState('awaiting');
  });
}

// When OAuth popup completes successfully
window.addEventListener('spotify-authenticated', async () => {
  await handleSpotifyConnected();
});

// If auth fails, reset the button
window.addEventListener('spotify-auth-error', () => {
  const btn = document.getElementById('spotify-btn');
  btn.querySelector('span').textContent = 'Connect Spotify →';
  btn.style.pointerEvents = 'auto';
});

// Auto-reconnect on page load if token exists from a previous session
window.addEventListener('load', () => {
  initModeSelector();
  setTimeout(() => {
    if (window.spotifyAuth && window.spotifyAuth.isAuthenticated()) {
      handleSpotifyConnected();
    }
  }, 600);
});

window.connectSpotify = connectSpotify;
window.runDetection = runDetection;

/* ── Reset and Veil Collapse Listeners ── */
window.addEventListener('visage-collapse-veil', () => {
  if (!camStream) {
    initCamera();
  }
});

window.addEventListener('visage-reset', () => {
  stopRealtimeAnalysis();
  if (camStream) {
    camStream.getTracks().forEach((track) => track.stop());
    camStream = null;
  }
  const video = document.getElementById('webcam');
  if (video) {
    video.srcObject = null;
    video.style.display = 'none';
  }
  resetDetectionVisuals();
  setStep(1);
  const status = document.getElementById('status-text');
  if (status) status.textContent = 'Calibrated';
});
