/* ═══════════════════════════════════════════════════════════════
   VISAGE · Scroll Reveal + Landing Intro Animations
   Uses GSAP + ScrollTrigger for cinematic transitions.
   ═══════════════════════════════════════════════════════════════ */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { setLandingActive, setAudioScrollProgress } from '../audio/ambient.js';

gsap.registerPlugin(ScrollTrigger);

// Initialize Lenis for heavy, dense, cinematic scroll inertia
const lenis = new Lenis({
  lerp: 0.1,            // Lighter, more responsive smoothing (feels natural but cinematic)
  wheelMultiplier: 0.8, // Fast enough to be comfortable, but slightly throttled to prevent massive jumps
  smoothWheel: true,
  syncTouch: true,
  touchMultiplier: 1.5, 
});

// Synchronize Lenis with GSAP ScrollTrigger perfectly
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

let landingScene = null;

/** Store a reference to the Three.js scene for scroll-driven updates */
export function setLandingScene(scene) {
  landingScene = scene;
}

/** Run the cinematic landing intro (typography stagger) */
export function playLandingIntro() {
  const tl = gsap.timeline({ delay: 0.6 });

  // Emerge from the blur of the loader (Core and grid solidify from atmosphere)
  tl.fromTo('.fixed-bg-layer', {
    opacity: 0, scale: 0.95
  }, {
    opacity: 1, scale: 1, duration: 2.5, ease: 'power2.out'
  }, 0);

  // Emerge the entire landing environment from atmosphere
  tl.fromTo('.landing', {
    opacity: 0
  }, {
    opacity: 1, duration: 2.0, ease: 'power2.out'
  }, 0);

  // Title (emerges first alongside the core)
  tl.fromTo('.landing-title', 
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 1.5, ease: 'cubic-bezier(0.19, 1, 0.22, 1)' },
  0.2);

  // Eyebrow
  tl.fromTo('.landing-eyebrow', 
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' },
  0.4);

  // Subtitle
  tl.fromTo('.landing-subtitle', 
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' },
  0.5);

  // Version tag
  tl.fromTo('.landing-version', 
    { opacity: 0, y: 5 },
    { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  0.6);

  // System Data Overlays
  tl.to('.system-data', {
    opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out'
  }, 0.5);

  // Corner markers fade in
  tl.to('.landing-corner', {
    opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power2.out'
  }, 0.8);

  // Scroll cue (delayed slightly)
  tl.to('.scroll-cue', {
    opacity: 1, duration: 0.8, ease: 'power2.out'
  }, 1.5);

  return tl;
}

/** Set up scroll-driven transitions from landing → story journey */
export function initScrollReveal() {
  // 1. Landing content fades out on scroll
  const landingTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.landing',
      start: 'top top',
      end: '+=80%', // Restored smooth, slow fade distance
      scrub: 0.5,
      pin: true,
      pinSpacing: false, // CRITICAL: Removes the gap entirely by letting the next section slide up over it immediately
      onUpdate: (self) => {
        window._landingSectionProgress = self.progress;
      }
    }
  });

  landingTl.fromTo('.landing-eyebrow, .landing-subtitle, .landing-version, .system-data', 
    { opacity: 1, y: 0 },
    { opacity: 0, y: -60, duration: 0.3, ease: 'none', immediateRender: false }, 
  0)
  .fromTo('.scroll-cue', 
    { opacity: 1, y: 0 },
    { opacity: 0, y: -20, duration: 0.2, ease: 'none', immediateRender: false }, 
  0)
  .fromTo('.landing-corner', 
    { opacity: 1 },
    { opacity: 0, duration: 0.3, ease: 'none', immediateRender: false }, 
  0)
  .set({}, {}, 1.0); // Pad timeline to 1.0 so fade-outs finish in the first 30% of the scroll

  // 2. Custom reveal for Story Block 1 (Dimensional Empathy 3D Gallery)
  const sb1 = document.getElementById('story-block-1');
  if (sb1) {
    const sb1Tl = gsap.timeline({
      scrollTrigger: {
        trigger: sb1,
        start: 'top top', // Pin the section when it reaches the top
        end: '+=400%',   // Massively increased scroll duration for ultra-smooth transition
        scrub: 1.5,
        pin: true,
        pinSpacing: true
      }
    });

    // Make the main center card slowly fade in and drift significantly towards the camera
    sb1Tl.fromTo('.o-card-0', 
      { opacity: 0, scale: 0.4 }, // Starts far away
      { opacity: 1, scale: 1.8, duration: 2.0, ease: 'power1.inOut' }, // Comes very close smoothly
    0);

    // Animate the 4 side cards symmetrically flying outwards from the core
    // Top Left
    sb1Tl.fromTo('.o-card-1', 
      { opacity: 0, z: -500, rotationY: -10, x: '-10vw', y: '-10vh' },
      { opacity: 1, z: 0, rotationY: 15, x: '-32vw', y: '-30vh', duration: 1.5, ease: 'power2.out' }, 
    0.2);
    // Top Right
    sb1Tl.fromTo('.o-card-2', 
      { opacity: 0, z: -500, rotationY: 10, x: '10vw', y: '-10vh' },
      { opacity: 1, z: 0, rotationY: -15, x: '32vw', y: '-30vh', duration: 1.5, ease: 'power2.out' }, 
    0.2);
    // Bottom Left
    sb1Tl.fromTo('.o-card-3', 
      { opacity: 0, z: -500, rotationY: -10, x: '-10vw', y: '10vh' },
      { opacity: 1, z: 0, rotationY: 15, x: '-32vw', y: '30vh', duration: 1.5, ease: 'power2.out' }, 
    0.4);
    // Bottom Right
    sb1Tl.fromTo('.o-card-4', 
      { opacity: 0, z: -500, rotationY: 10, x: '10vw', y: '10vh' },
      { opacity: 1, z: 0, rotationY: -15, x: '32vw', y: '30vh', duration: 1.5, ease: 'power2.out' }, 
    0.4);

    // --- Cinematic Exit Animation (Triggered as user transitions to next section) ---
    // Smoothly fly aggressively past the camera to clear the screen
    sb1Tl.to('.o-card-1', { z: 1500, x: '-80vw', y: '-80vh', rotationY: 45, opacity: 0, duration: 1.5, ease: 'power2.in' }, 2.0);
    sb1Tl.to('.o-card-2', { z: 1500, x: '80vw', y: '-80vh', rotationY: -45, opacity: 0, duration: 1.5, ease: 'power2.in' }, 2.0);
    sb1Tl.to('.o-card-3', { z: 1500, x: '-80vw', y: '80vh', rotationY: 45, opacity: 0, duration: 1.5, ease: 'power2.in' }, 2.0);
    sb1Tl.to('.o-card-4', { z: 1500, x: '80vw', y: '80vh', rotationY: -45, opacity: 0, duration: 1.5, ease: 'power2.in' }, 2.0);
    
    // Center card zooms completely past the viewer into oblivion
    sb1Tl.to('.o-card-0', { scale: 10.0, opacity: 0, duration: 1.5, ease: 'power2.in' }, 2.0);
  }

  // 3. Custom reveal & Core Hack for Story Block 2
  const sb2 = document.getElementById('story-block-2');
  if (sb2) {
    // Ensure hack progress starts at 0
    window._visageHackProgress = 0;

    // --- Cinematic Entry Animation for Story Block 2 ---
    const sb2EntryTl = gsap.timeline({
      scrollTrigger: {
        trigger: sb2,
        start: 'top 100%', // Start as soon as it enters the bottom
        end: 'top top',    // Finish entry EXACTLY when it pins
        scrub: 1.5         // Super smooth cinematic scrub
      }
    });

    // CRITICAL: Set initial states for the cinematic construction sequence
    gsap.set('.draw-mask-circle', { 
      strokeDasharray: '2828', 
      strokeDashoffset: '2828',
      transformOrigin: '50% 50%',
      rotation: -90 // Start drawing from the top where the meteor lands!
    });
    gsap.set('.meteor-wrapper', { opacity: 0, scale: 0, transformOrigin: '500px 500px' });
    gsap.set('.c-part', { opacity: 0 });

    // CRITICAL: Make the parent block visible! It defaults to opacity: 0 in CSS.
    sb2EntryTl.set(sb2, { opacity: 1 }, 0);

    // Slide up over the entire scroll duration (0.0 to 4.0)
    sb2EntryTl.fromTo('.explodable-matrix', 
      { opacity: 0, y: 300, scale: 0.7, rotationX: 30 },
      { opacity: 1, y: 0, scale: 1, rotationX: 0, duration: 4.0, ease: 'power2.out' }, 
    0);

    // Extreme deep dive scaling (0.0 to 4.0)
    sb2EntryTl.fromTo('.neural-environment',
      { scale: 0.05, rotationZ: -180 },
      { scale: 1, rotationZ: 0, duration: 4.0, ease: 'power2.out' }, 
    0);

    // --- NEW: Cinematic Construction Sequence ---
    // Delay construction until the section is actually visible in the viewport (Starts at 2.0)
    
    // 1. The ring draws itself circularly (2.0 to 3.5)
    sb2EntryTl.to('.draw-mask-circle', {
      strokeDashoffset: 0,
      duration: 1.5,
      ease: 'none' // Linear draw looks more mechanical and precise
    }, 2.0);

    // 2. Data particles fly in (2.5 to 3.2)
    sb2EntryTl.fromTo('.cp-1', { opacity: 0, x: -300, y: -200, scale: 0 }, { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' }, 2.5);
    sb2EntryTl.fromTo('.cp-2', { opacity: 0, x: 300, y: -300, scale: 0 }, { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' }, 2.6);
    sb2EntryTl.fromTo('.cp-3', { opacity: 0, x: -100, y: -400, scale: 0 }, { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' }, 2.7);
    sb2EntryTl.fromTo('.cp-4', { opacity: 0, x: 200, y: -250, scale: 0 }, { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' }, 2.8);

    // 3. Particles merge (3.4)
    sb2EntryTl.to('.c-part', { scale: 0, opacity: 0, duration: 0.2, ease: 'power3.in' }, 3.4);
    
    // 4. Meteor explodes into existence and lands (3.5 to 4.0)
    sb2EntryTl.to('.meteor-wrapper', {
      opacity: 1,
      scale: 1,
      duration: 0.5,
      ease: 'elastic.out(1, 0.4)'
    }, 3.5);

    // 5. Trigger SVG orbit exactly as it finishes centering (4.0)
    sb2EntryTl.call(() => {
      const orbiter = document.getElementById('meteorOrbit');
      if (orbiter && typeof orbiter.beginElement === 'function') {
        orbiter.beginElement();
      }
    }, null, 4.0);

    // Info cards fly in aggressively from the abyss (2.5 to 4.0)
    sb2EntryTl.fromTo('.matrix-info-cards .info-container:first-child',
      { x: -800, z: -1000, rotationY: -90, rotationX: 45, opacity: 0 },
      { x: 0, z: 0, rotationY: 0, rotationX: 0, opacity: 1, duration: 1.5, ease: 'expo.out' }, 
    2.5);

    sb2EntryTl.fromTo('.matrix-info-cards .info-container:last-child',
      { x: 800, z: -1000, rotationY: 90, rotationX: 45, opacity: 0 },
      { x: 0, z: 0, rotationY: 0, rotationX: 0, opacity: 1, duration: 1.5, ease: 'expo.out' }, 
    2.5);


    // --- Cinematic 8-Phase Orbital Corruption Sequence (Pinned) ---
    // Make sure we initialize the corruption phase
    window._corruptionPhase = 0;
    window._visageHackProgress = 0;

    const corruptionTl = gsap.timeline({
      scrollTrigger: {
        trigger: sb2,
        start: 'top top',
        end: '+=300%', // Reduced from 500% now that Lenis manages scroll speed
        scrub: 1.5,
        pin: true,
        pinSpacing: true
      }
    });

    // Phase 1: Hold the cards so the user can read them! Then fade them out.
    corruptionTl.to('.matrix-info-cards, .orbital-rings', {
      opacity: 0,
      filter: 'blur(20px)',
      duration: 1.5,
      ease: 'power2.inOut'
    }, 2.0); // Starts fading at 2.0 instead of 0

    // Phase 2: The entire corruption sequence
    corruptionTl.to(window, {
      _corruptionPhase: 1.0,
      duration: 8.5, 
      ease: 'power1.inOut'
    }, 2.0); // Starts at 2.0, precisely as the cards start fading!

    // Phase 3: The Plunge (Hack Progress Zoom)
    corruptionTl.to(window, {
      _visageHackProgress: 1.0,
      duration: 1.5,
      ease: 'expo.inOut' // Aggressive magnetic pull at the very end
    }, 11.5);

    // The Interior Reveal
    corruptionTl.to('.hacked-core-interior', {
      opacity: 1,
      pointerEvents: 'auto',
      duration: 1.0,
      ease: 'power2.out'
    }, 14.0);
  }

  // 4. Generic reveal for remaining story blocks
  gsap.utils.toArray('.story-block').forEach((block) => {
    if (block.id === 'story-block-1' || block.id === 'story-block-2') return; // Handled custom above
    
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

  // 4. Feed scroll progress to Three.js scene + audio + particle engine over the entire experience
  ScrollTrigger.create({
    trigger: '.experience-scroll-container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      // Feed global scroll progress for the 3D particle engine
      window._visageTitleScrollProgress = self.progress;

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
