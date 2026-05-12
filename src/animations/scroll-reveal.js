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
  // Landing exit: fade out content + fade in interface OVER it
  const landingTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.landing',
      start: 'top top',
      end: '+=100%',
      scrub: 0.5,
      pin: true,
      pinSpacing: true // Adds scroll distance
    }
  });

  landingTl.to('.landing-content', {
    opacity: 0, y: -60, duration: 0.5, ease: 'none'
  }, 0)
  .to('.scroll-cue', {
    opacity: 0, y: -20, duration: 0.3, ease: 'none'
  }, 0)
  .to('.landing-corner', {
    opacity: 0, duration: 0.5, ease: 'none'
  }, 0);

  // Materialize the fixed interface as we scroll
  landingTl.fromTo('.main-interface', {
    opacity: 0,
    background: 'rgba(1, 1, 2, 0)',
    backdropFilter: 'blur(0px)',
    webkitBackdropFilter: 'blur(0px)',
    pointerEvents: 'none'
  }, {
    opacity: 1,
    background: 'rgba(1, 1, 2, 0.5)',
    backdropFilter: 'blur(20px)',
    webkitBackdropFilter: 'blur(20px)',
    pointerEvents: 'auto', // Enable interaction when visible
    duration: 1,
    ease: 'none'
  }, 0.2);

  landingTl.to('.shell main > *', {
    y: 0,
    scale: 1,
    duration: 0.8,
    ease: 'power2.out'
  }, 0.5);

  landingTl.to('.shell header', {
    y: 0,
    duration: 0.5
  }, 0.5);

  // Feed scroll progress to Three.js scene + audio
  ScrollTrigger.create({
    trigger: '.landing',
    start: 'top top',
    end: '+=100%',
    scrub: true,
    onUpdate: (self) => {
      if (landingScene) landingScene.setScrollProgress(self.progress);
    },
    onEnter: () => setLandingActive(true),
    onEnterBack: () => setLandingActive(true),
    onLeave: () => setLandingActive(false),
    onLeaveBack: () => setLandingActive(true)
  });
}
