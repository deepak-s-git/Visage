/* ═══════════════════════════════════════════════════════════════
   VISAGE · Scroll Reveal + Landing Intro Animations
   Uses GSAP + ScrollTrigger for cinematic transitions.
   ═══════════════════════════════════════════════════════════════ */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setLandingActive } from '../audio/ambient.js';

gsap.registerPlugin(ScrollTrigger);

let landingScene = null;

/** Store a reference to the Three.js scene for scroll-driven updates */
export function setLandingScene(scene) {
  landingScene = scene;
}

/** Run the cinematic landing intro (typography stagger) */
export function playLandingIntro() {
  const tl = gsap.timeline({ delay: 0.6 });

  // Corner markers fade in (if still present)
  tl.to('.landing-corner', {
    opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power2.out'
  });

  // System Data Overlays
  tl.to('.system-data', {
    opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out'
  }, '<0.2');

  // Eyebrow
  tl.to('.landing-eyebrow', {
    opacity: 1, y: 0, duration: 0.7, ease: 'power3.out'
  }, '-=0.4');

  // Title
  tl.to('.landing-title', {
    opacity: 1, y: 0, duration: 1.0,
    ease: 'cubic-bezier(0.19, 1, 0.22, 1)'
  }, '-=0.3');

  // Subtitle
  tl.to('.landing-subtitle', {
    opacity: 1, y: 0, duration: 0.7, ease: 'power3.out'
  }, '-=0.5');

  // Version tag
  tl.to('.landing-version', {
    opacity: 1, duration: 0.5, ease: 'power2.out'
  }, '-=0.3');

  // Scroll cue (delayed)
  tl.to('.scroll-cue', {
    opacity: 1, duration: 0.8, ease: 'power2.out'
  }, '-=0.1');

  return tl;
}

/** Set up scroll-driven transitions from landing → main interface */
export function initScrollReveal() {
  // Landing exit: fade out content + drive Three.js zoom
  gsap.timeline({
    scrollTrigger: {
      trigger: '.landing',
      start: 'top top',
      end: 'bottom top',
      scrub: 1.2,
      pin: false
    }
  })
  .to('.landing-content', {
    opacity: 0, y: -60, duration: 1, ease: 'none'
  }, 0)
  .to('.scroll-cue', {
    opacity: 0, y: -20, duration: 0.3, ease: 'none'
  }, 0)
  .to('.landing-corner', {
    opacity: 0, duration: 0.5, ease: 'none'
  }, 0)
  .to('.landing-canvas', {
    opacity: 0, scale: 1.08, duration: 1, ease: 'none'
  }, 0.3);

  // Feed scroll progress to Three.js scene + audio
  ScrollTrigger.create({
    trigger: '.landing',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => {
      if (landingScene) landingScene.setScrollProgress(self.progress);
    },
    onEnter: () => setLandingActive(true),
    onEnterBack: () => setLandingActive(true),
    onLeave: () => setLandingActive(false),
    onLeaveBack: () => setLandingActive(true)
  });

  // Main interface reveal
  gsap.fromTo('.main-interface', {
    opacity: 0, y: 60
  }, {
    scrollTrigger: {
      trigger: '.transition-overlay',
      start: 'top 80%',
      end: 'bottom 40%',
      scrub: 1
    },
    opacity: 1, y: 0, ease: 'none'
  });

  // Stagger shell children on reveal
  gsap.fromTo('.shell > *', {
    opacity: 0, y: 20
  }, {
    scrollTrigger: {
      trigger: '.main-interface',
      start: 'top 70%',
      end: 'top 30%',
      scrub: 1
    },
    opacity: 1, y: 0, stagger: 0.05, ease: 'none'
  });
}
