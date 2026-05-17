/* ═══════════════════════════════════════════════════════════════
   VISAGE · Scroll Reveal + Landing Intro Animations
   Uses GSAP + ScrollTrigger for cinematic transitions.
   ═══════════════════════════════════════════════════════════════ */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setLandingActive, setAudioScrollProgress } from '../audio/ambient.js';

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

/** Set up scroll-driven transitions from landing → story journey */
export function initScrollReveal() {
  // 1. Landing content fades out on scroll
  const landingTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.landing',
      start: 'top top',
      end: '+=100%',
      scrub: 0.5,
      pin: true,
      pinSpacing: true
    }
  });

  landingTl.to('.landing-content, .system-data', {
    opacity: 0, y: -60, duration: 0.5, ease: 'none'
  }, 0)
  .to('.scroll-cue', {
    opacity: 0, y: -20, duration: 0.3, ease: 'none'
  }, 0)
  .to('.landing-corner', {
    opacity: 0, duration: 0.5, ease: 'none'
  }, 0);

  // 2. Story Blocks reveal
  gsap.utils.toArray('.story-block').forEach((block, i) => {
    gsap.to(block, {
      scrollTrigger: {
        trigger: block,
        start: 'top 85%',
        end: 'top 50%',
        scrub: 1
      },
      opacity: 1,
      y: 0,
      ease: 'power2.out'
    });
  });

  // 3. Orb Gateway reveal
  gsap.to('.gateway-content', {
    scrollTrigger: {
      trigger: '.orb-gateway',
      start: 'top 80%',
      end: 'top 50%',
      scrub: 1
    },
    opacity: 1,
    ease: 'power2.out'
  });

  // 4. Feed scroll progress to Three.js scene + audio over the entire experience
  ScrollTrigger.create({
    trigger: '.experience-scroll-container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      // self.progress goes 0 to 1 over the whole journey
      if (landingScene) landingScene.setScrollProgress(self.progress);
      setAudioScrollProgress(self.progress); // Interpolate audio
    },
    onEnter: () => setLandingActive(true),
    onEnterBack: () => setLandingActive(true)
  });

  // 5. Setup Blackhole Transition Button
  const collapseBtn = document.getElementById('collapse-btn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', triggerBlackholeCollapse);
  }
}

/** The Final Transition: Blackhole Collapse to Interface */
function triggerBlackholeCollapse() {
  // Prevent double clicking
  const btn = document.getElementById('collapse-btn');
  if(btn) btn.style.pointerEvents = 'none';

  // 1. Audio distortion
  setAudioScrollProgress(1.2); // Push filter to max, or add specific logic in ambient.js

  // 2. Scene blackhole (tell Three.js to suck everything in)
  if (landingScene && landingScene.triggerBlackhole) {
    landingScene.triggerBlackhole();
  }

  // 3. DOM transition timeline
  const tl = gsap.timeline();

  // Lock scrolling so the user can't break the cinematic sequence
  document.body.style.overflow = 'hidden';
  
  // Disable all active ScrollTriggers to freeze the scroll progress
  ScrollTrigger.getAll().forEach(st => st.disable());

  // Hide the scroll container immediately (fading out)
  tl.to('.experience-scroll-container', {
    opacity: 0,
    duration: 1.5,
    scale: 0.95,
    ease: 'power4.inOut',
    onComplete: () => {
      document.querySelector('.experience-scroll-container').style.display = 'none';
      window.scrollTo(0, 0); // Reset scroll position safely
    }
  }, 0);

  // Bring in the main interface after the cinematic delay
  tl.fromTo('.main-interface', {
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
    pointerEvents: 'auto',
    duration: 2,
    ease: 'power2.out'
  }, 2.0); // Wait 2 seconds for blackhole effect

  tl.to('.shell main > *', {
    y: 0,
    scale: 1,
    duration: 1.2,
    ease: 'power3.out'
  }, 2.5);

  tl.to('.shell header', {
    y: 0,
    duration: 0.8
  }, 2.5);

  // Turn off landing active state for audio
  setTimeout(() => {
    setLandingActive(false);
  }, 2500);
}
