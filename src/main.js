/* VISAGE · Main Entry Point
   Audio + Visuals start simultaneously — always in sync.
   Flow: Audio Init → [Autoplay or Entry Gate] → Cinematic Loader (14s) → Landing → Interface */

// Styles
import './styles/landing.css';

// Modules
import { gsap } from 'gsap';
import { initLandingScene } from './landing/scene.js';
import { playLandingIntro, initScrollReveal, setLandingScene } from './animations/scroll-reveal.js';
import { initInterfaceAnimations } from './animations/gsap-controller.js';
import { initAmbientAudio, attemptAutoplay, startAfterGesture } from './audio/ambient.js';
import { runCinematicLoader } from './loading/loader.js';
import { initCustomCursor } from './animations/cursor.js';

/* ── Entry Gate (shown only if browser blocks autoplay) ── */
function showEntryGate() {
  return new Promise((resolve) => {
    const gate = document.createElement('div');
    gate.className = 'entry-gate';
    gate.innerHTML = `
      <div class="entry-gate-ring"></div>
      <div class="entry-gate-content">
        <div class="entry-gate-text">Enter Installation</div>
        <div class="entry-gate-sub">Click to begin</div>
      </div>
    `;
    document.body.appendChild(gate);

    // Fade in
    gsap.fromTo(gate, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power2.out' });

    gate.addEventListener('click', async () => {
      // Start audio on this user gesture, but schedule it precisely 1.5s in the future
      await startAfterGesture(1.5);

      // Dissolve gate over exactly 1.5s
      gsap.to(gate, {
        opacity: 0, duration: 1.5, ease: 'power2.inOut',
        onComplete: () => {
          gate.remove();
          // Loader starts exactly as the delayed audio begins
          resolve();
        }
      });
    }, { once: true });
  });
}

/* ── Boot Sequence ── */
async function init() {
  // Phase -1: Init custom cursor instantly
  initCustomCursor();
  // Phase 0: Pre-fetch audio buffer immediately
  initAmbientAudio();

  // Phase 1: Attempt true autoplay via Web Audio API
  const result = await attemptAutoplay();

  if (result === 'blocked') {
    // Browser blocked — show premium entry gate
    // Hide the loading screen behind the gate
    await showEntryGate();
  }
  // result === 'autoplay' → audio already playing
  // result === 'muted' → user chose mute, proceed silently

  // Phase 2: Start Three.js landing scene in the background
  // This ensures WebGL is fully compiled and ready before the loader fades out
  const canvas = document.getElementById('landing-canvas');
  const scene = initLandingScene(canvas);
  setLandingScene(scene);

  // Phase 3: Run 14-second cinematic loading (now in sync with audio)
  await runCinematicLoader();

  // Phase 4: Play the landing intro animation exactly at the 14s mark
  playLandingIntro();

  // Phase 5: Set up scroll-driven transitions
  initScrollReveal();

  // Phase 6: Initialize interface animations
  initInterfaceAnimations();
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
