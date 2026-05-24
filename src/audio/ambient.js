/* VISAGE · Ambient Audio Controller
   Web Audio API pipeline for maximum autoplay compatibility.
   Strategy: AudioContext + BufferSource for true immediate playback.
   Fallback: Premium "Enter Installation" gate if browser blocks. */

import { gsap } from 'gsap';

const WUWA_SRC = '/assets/audio/WuWa OST.mp3';
const TRON_SRC = '/assets/audio/TRON.mp3';
const MAX_VOLUME = 0.65; // Increased significantly for more impact
const STORAGE_KEY = 'visage-audio-muted';

let audioCtx = null;
let isMuted = false;
let isPlaying = false;
let globalMasterGain = null;

// Track 1: WuWa
let wuwaGain = null;
let wuwaFilter = null;
let wuwaSource = null;
let wuwaBuffer = null;
let wuwaTargetVolume = MAX_VOLUME;

// Track 2: TRON
let tronGain = null;
let tronFilter = null;
let tronBassBoost = null; // New bass EQ
let tronSource = null;
let tronBuffer = null;
let tronTargetVolume = 0.0;

let wuwaFetch = null;
let tronFetch = null;

export function initAmbientAudio() {
  isMuted = localStorage.getItem(STORAGE_KEY) === 'true';
  injectMuteButton();

  // Pre-fetch both buffers immediately
  wuwaFetch = fetch(WUWA_SRC).then(r => r.arrayBuffer()).catch(() => null);
  tronFetch = fetch(TRON_SRC).then(r => r.arrayBuffer()).catch(() => null);
}

export function attemptAutoplay() {
  return new Promise(async (resolve) => {
    if (isMuted) { resolve('muted'); return; }

    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      setupAudioGraph();

      if (audioCtx.state === 'running') {
        await decodeAndPlayAll();
        resolve('autoplay');
      } else {
        resolve('blocked');
      }
    } catch (e) {
      resolve('blocked');
    }
  });
}

export async function startAfterGesture(delaySeconds = 0) {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    setupAudioGraph();
  }
  await audioCtx.resume();
  await decodeAndPlayAll(delaySeconds);
}

function setupAudioGraph() {
  globalMasterGain = audioCtx.createGain();
  globalMasterGain.connect(audioCtx.destination);
  globalMasterGain.gain.value = isMuted ? 0 : 1;

  // WuWa Graph
  wuwaGain = audioCtx.createGain();
  wuwaGain.gain.value = 0;
  wuwaFilter = audioCtx.createBiquadFilter();
  wuwaFilter.type = 'lowpass';
  wuwaFilter.frequency.value = 800; // Muffled atmospheric start
  wuwaFilter.connect(wuwaGain);
  wuwaGain.connect(globalMasterGain);

  // TRON Graph
  tronGain = audioCtx.createGain();
  tronGain.gain.value = 0;
  
  // Cinematic Bass Boost
  tronBassBoost = audioCtx.createBiquadFilter();
  tronBassBoost.type = 'lowshelf';
  tronBassBoost.frequency.value = 120; // Target sub/punch frequencies
  tronBassBoost.gain.value = 6;        // +6dB of thick bass
  
  tronFilter = audioCtx.createBiquadFilter();
  tronFilter.type = 'lowpass';
  tronFilter.frequency.value = 20000; // Starts clear
  
  tronFilter.connect(tronBassBoost);
  tronBassBoost.connect(tronGain);
  tronGain.connect(globalMasterGain);
}

async function decodeAndPlayAll(delaySeconds = 0) {
  if (isPlaying || isMuted) return;

  try {
    const [wuwaRaw, tronRaw] = await Promise.all([wuwaFetch, tronFetch]);
    if (!wuwaRaw || !tronRaw) return;

    wuwaBuffer = await audioCtx.decodeAudioData(wuwaRaw.slice(0));
    tronBuffer = await audioCtx.decodeAudioData(tronRaw.slice(0));

    // Start WuWa
    wuwaSource = audioCtx.createBufferSource();
    wuwaSource.buffer = wuwaBuffer;
    wuwaSource.loop = true;
    wuwaSource.connect(wuwaFilter);
    wuwaSource.start(audioCtx.currentTime + delaySeconds);

    // Start TRON
    tronSource = audioCtx.createBufferSource();
    tronSource.buffer = tronBuffer;
    tronSource.loop = true;
    tronSource.connect(tronFilter);
    tronSource.start(audioCtx.currentTime + delaySeconds);

    isPlaying = true;

    // Apply initial volumes
    wuwaGain.gain.setValueAtTime(0, audioCtx.currentTime + delaySeconds);
    wuwaGain.gain.linearRampToValueAtTime(wuwaTargetVolume, audioCtx.currentTime + delaySeconds + 3);
    
    tronGain.gain.setValueAtTime(0, audioCtx.currentTime + delaySeconds);
    tronGain.gain.linearRampToValueAtTime(tronTargetVolume, audioCtx.currentTime + delaySeconds + 3);
  } catch (e) {
    // Silently fail
  }
}

// Controls the fade state for both tracks manually
export function setTrackVolumes(wuwaVol, tronVol, duration = 1.0) {
  wuwaTargetVolume = wuwaVol * MAX_VOLUME;
  tronTargetVolume = tronVol * MAX_VOLUME;

  if (!audioCtx || !wuwaGain || !tronGain || !isPlaying) return;

  const now = audioCtx.currentTime;
  wuwaGain.gain.cancelScheduledValues(now);
  wuwaGain.gain.setValueAtTime(wuwaGain.gain.value, now);
  wuwaGain.gain.linearRampToValueAtTime(wuwaTargetVolume, now + duration);

  tronGain.gain.cancelScheduledValues(now);
  tronGain.gain.setValueAtTime(tronGain.gain.value, now);
  tronGain.gain.linearRampToValueAtTime(tronTargetVolume, now + duration);
}

// Allows GSAP ScrollTrigger to scrub volumes frame-by-frame without scheduling conflicts
export function setTrackVolumesImmediate(wuwaVol, tronVol) {
  wuwaTargetVolume = wuwaVol * MAX_VOLUME;
  tronTargetVolume = tronVol * MAX_VOLUME;

  if (!audioCtx || !wuwaGain || !tronGain || !isPlaying) return;

  const now = audioCtx.currentTime;
  // Use setTargetAtTime with a tiny time constant to prevent audio clicking while scrubbing
  wuwaGain.gain.setTargetAtTime(wuwaTargetVolume, now, 0.05);
  tronGain.gain.setTargetAtTime(tronTargetVolume, now, 0.05);
}

// Specifically for ENTER THE GRID so the track starts fresh from 0:00
export function restartTronAndFadeIn(duration = 1.5) {
  if (!audioCtx || !tronBuffer || !isPlaying) return;

  // Stop existing TRON source
  if (tronSource) {
    try { tronSource.stop(); } catch (e) {}
    tronSource.disconnect();
  }

  // Create fresh source from buffer
  tronSource = audioCtx.createBufferSource();
  tronSource.buffer = tronBuffer;
  tronSource.loop = true;
  tronSource.connect(tronFilter);
  
  // Start playing from offset 0
  tronSource.start(0);

  // Fade in
  setTrackVolumes(0, 1, duration);
}

/* ── Scroll-driven Audio Intensity Modulation ── */
export function setAudioScrollProgress(progress) {
  if (!audioCtx || !wuwaFilter || !isPlaying) return;

  const now = audioCtx.currentTime;

  // Filter only applies to WuWa currently as TRON needs to be crisp
  const minFreq = 800;
  const maxFreq = 20000;
  const safeProgress = Math.max(0, Math.min(1, progress));
  const targetFreq = minFreq * Math.pow(maxFreq / minFreq, safeProgress);

  wuwaFilter.frequency.cancelScheduledValues(now);
  wuwaFilter.frequency.setValueAtTime(wuwaFilter.frequency.value, now);
  wuwaFilter.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.2);
}

export function setLandingActive(active) {
  if (!audioCtx || !isPlaying) return;
  if (active && audioCtx.state === 'suspended' && !isMuted) {
    audioCtx.resume();
  }
}

/* ── Mute toggle ── */
function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem(STORAGE_KEY, isMuted);
  updateMuteButton();

  if (!audioCtx || !globalMasterGain) return;

  const now = audioCtx.currentTime;
  globalMasterGain.gain.cancelScheduledValues(now);
  globalMasterGain.gain.setValueAtTime(globalMasterGain.gain.value, now);

  if (isMuted) {
    globalMasterGain.gain.linearRampToValueAtTime(0, now + 0.5);
  } else {
    if (!isPlaying) {
      audioCtx.resume().then(() => decodeAndPlayAll());
    } else {
      globalMasterGain.gain.linearRampToValueAtTime(1, now + 0.5);
    }
  }
}

/* ── Mute Button UI ── */
function injectMuteButton() {
  const btn = document.createElement('button');
  btn.id = 'audio-toggle';
  btn.className = 'audio-toggle' + (isMuted ? ' is-muted' : '');
  btn.setAttribute('aria-label', 'Toggle ambient audio');
  btn.innerHTML = isMuted ? getMutedSVG() : getSpeakerSVG();
  btn.addEventListener('click', toggleMute);
  document.body.appendChild(btn);
}

function updateMuteButton() {
  const btn = document.getElementById('audio-toggle');
  if (!btn) return;
  btn.innerHTML = isMuted ? getMutedSVG() : getSpeakerSVG();
  btn.classList.toggle('is-muted', isMuted);
}

function getSpeakerSVG() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
  </svg>`;
}

function getMutedSVG() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/>
    <line x1="17" y1="9" x2="23" y2="15"/>
  </svg>`;
}
