/* VISAGE · Ambient Audio Controller
   Web Audio API pipeline for maximum autoplay compatibility.
   Strategy: AudioContext + BufferSource for true immediate playback.
   Fallback: Premium "Enter Installation" gate if browser blocks. */

import { gsap } from 'gsap';

const AUDIO_SRC = '/assets/audio/WuWa OST.mp3';
const MAX_VOLUME = 0.22;
const FADE_DURATION = 1.8;
const STORAGE_KEY = 'visage-audio-muted';

let audioCtx = null;
let gainNode = null;
let sourceNode = null;
let audioBuffer = null;
let isMuted = false;
let isInLanding = true;
let isPlaying = false;
let startTime = 0;       // AudioContext time when playback began
let pauseOffset = 0;     // Seconds into track when paused

let fetchPromise = null;

/* ── Initialise: called at absolute first frame ── */
export function initAmbientAudio() {
  isMuted = localStorage.getItem(STORAGE_KEY) === 'true';
  injectMuteButton();

  // Pre-fetch audio buffer immediately
  fetchPromise = fetch(AUDIO_SRC)
    .then(r => r.arrayBuffer())
    .then(buf => {
      // Store raw buffer, decode later when context exists
      window.__visageAudioRaw = buf;
      return buf;
    })
    .catch(() => null);
}

/* ── Attempt autoplay — returns a promise that resolves when audio is playing ── */
export function attemptAutoplay() {
  return new Promise(async (resolve) => {
    if (isMuted) { resolve('muted'); return; }

    try {
      // Create AudioContext
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;
      gainNode.connect(audioCtx.destination);

      // In browsers where autoplay is blocked, state will be 'suspended'.
      // DO NOT call resume() here, as it may hang the Promise indefinitely.
      if (audioCtx.state === 'running') {
        // Autoplay works! Decode and play
        await decodeAndPlay();
        resolve('autoplay');
      } else {
        // Browser blocked — show premium entry gate
        resolve('blocked');
      }
    } catch (e) {
      resolve('blocked');
    }
  });
}

/* ── Start playback after user gesture (for blocked browsers) ── */
export async function startAfterGesture(delaySeconds = 0) {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(audioCtx.destination);
  }
  await audioCtx.resume();
  await decodeAndPlay(delaySeconds);
}

/* ── Decode buffer and start playback ── */
async function decodeAndPlay(delaySeconds = 0) {
  if (isPlaying || isMuted) return;

  try {
    let raw = window.__visageAudioRaw;
    if (!raw && fetchPromise) {
      raw = await fetchPromise;
    }
    if (!raw) return;

    // Decode audio data
    audioBuffer = await audioCtx.decodeAudioData(raw.slice(0));

    // Create source
    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.loop = true;
    sourceNode.connect(gainNode);

    // Start from offset (0 on first play)
    sourceNode.start(audioCtx.currentTime + delaySeconds, pauseOffset);
    startTime = audioCtx.currentTime + delaySeconds - pauseOffset;
    isPlaying = true;

    // Fade in volume
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delaySeconds);
    gainNode.gain.linearRampToValueAtTime(MAX_VOLUME, audioCtx.currentTime + delaySeconds + 3);
  } catch (e) {
    // Silently fail — experience continues without audio
  }
}

/* ── Scroll-driven volume control ── */
export function setLandingActive(active) {
  isInLanding = active;
  if (!audioCtx || !gainNode || isMuted || !isPlaying) return;

  const now = audioCtx.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);

  if (active) {
    // Scrolled back to landing — fade in
    if (audioCtx.state === 'suspended') audioCtx.resume();
    gainNode.gain.linearRampToValueAtTime(MAX_VOLUME, now + FADE_DURATION);
  } else {
    // Scrolled to interface — fade out
    gainNode.gain.linearRampToValueAtTime(0, now + FADE_DURATION);
  }
}

/* ── Mute toggle ── */
function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem(STORAGE_KEY, isMuted);
  updateMuteButton();

  if (!audioCtx || !gainNode) return;

  const now = audioCtx.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);

  if (isMuted) {
    gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
  } else {
    if (!isPlaying) {
      audioCtx.resume().then(() => decodeAndPlay());
    } else {
      gainNode.gain.linearRampToValueAtTime(
        isInLanding ? MAX_VOLUME : 0,
        now + FADE_DURATION
      );
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
