/* VISAGE · Main Entry Point Orchestrates: Loading → Landing → Scroll Reveal → Interface */

// Styles
import './styles/landing.css';

// Modules
import { gsap } from 'gsap';
import { initLandingScene } from './landing/scene.js';
import { playLandingIntro, initScrollReveal, setLandingScene } from './animations/scroll-reveal.js';
import { initInterfaceAnimations } from './animations/gsap-controller.js';

/* ── Loading Screen ── */
function runLoadingSequence() {
  return new Promise((resolve) => {
    const loader = document.getElementById('loading-screen');
    if (!loader) { resolve(); return; }

    const tl = gsap.timeline({
      onComplete: () => {
        // Wipe loader away
        gsap.to(loader, {
          clipPath: 'inset(0 0 100% 0)',
          duration: 0.7,
          ease: 'power4.inOut',
          onComplete: () => {
            loader.remove();
            resolve();
          }
        });
      }
    });

    // 1. Wordmark letters reveal
    tl.to('.loading-wordmark span', {
      y: 0,
      opacity: 1,
      duration: 0.5,
      stagger: 0.04,
      ease: 'power3.out'
    });

    // 2. Status text
    tl.to('.loading-status', {
      opacity: 1,
      duration: 0.3,
      ease: 'none'
    }, '-=0.2');

    // 3. Progress bar fills
    tl.to('.loading-bar-fill', {
      width: '100%',
      duration: 1.2,
      ease: 'power2.inOut'
    }, '-=0.1');

    // 4. Brief hold
    tl.to({}, { duration: 0.3 });
  });
}

/* ── Boot Sequence ── */
async function init() {
  // Phase 1: Loading screen
  await runLoadingSequence();

  // Phase 2: Start Three.js landing scene
  const canvas = document.getElementById('landing-canvas');
  const scene = initLandingScene(canvas);
  setLandingScene(scene);

  // Phase 3: Play the landing intro animation
  playLandingIntro();

  // Phase 4: Set up scroll-driven transitions
  initScrollReveal();

  // Phase 5: Initialize interface animations
  initInterfaceAnimations();
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
