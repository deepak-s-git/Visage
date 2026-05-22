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
      end: '+=80%',
      scrub: 0.5,
      pin: true,
      pinSpacing: true,
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
        start: 'top 110%', // Trigger slightly before it enters the viewport
        end: 'top 10%',   // Finish animating much earlier
        scrub: 1
      }
    });

    // Fade in the whole block
    sb1Tl.to(sb1, { opacity: 1, y: 0, duration: 1 }, 0);

    // Orbital scattering: Main card center, 4 cipher cards orbit around it sequentially
    sb1Tl.fromTo('.o-card-0', 
      { opacity: 0, z: -1000, rotationY: 0, x: 0, y: 0 },
      { opacity: 1, z: 150, rotationY: 0, x: '0vw', y: '0vh', duration: 1.2, ease: 'power2.out' }, 
    0);
    sb1Tl.fromTo('.o-card-1', 
      { opacity: 0, z: -1000, rotationY: -10, x: 0, y: 0 },
      { opacity: 1, z: -50, rotationY: 15, x: '-29vw', y: '-26vh', duration: 1.2, ease: 'power2.out' }, 
    0.1);
    sb1Tl.fromTo('.o-card-2', 
      { opacity: 0, z: -1000, rotationY: 10, x: 0, y: 0 },
      { opacity: 1, z: 0, rotationY: -15, x: '29vw', y: '-26vh', duration: 1.2, ease: 'power2.out' }, 
    0.2);
    sb1Tl.fromTo('.o-card-3', 
      { opacity: 0, z: -1000, rotationY: -10, x: 0, y: 0 },
      { opacity: 1, z: 100, rotationY: 10, x: '-29vw', y: '26vh', duration: 1.2, ease: 'power2.out' }, 
    0.3);
    sb1Tl.fromTo('.o-card-4', 
      { opacity: 0, z: -1000, rotationY: 10, x: 0, y: 0 },
      { opacity: 1, z: 50, rotationY: -10, x: '29vw', y: '26vh', duration: 1.2, ease: 'power2.out' }, 
    0.4);
  }

  // 3. Custom reveal & Core Hack for Story Block 2
  const sb2 = document.getElementById('story-block-2');
  if (sb2) {
    // Ensure hack progress starts at 0
    window._visageHackProgress = 0;

    const sb2Tl = gsap.timeline({
      scrollTrigger: {
        trigger: sb2,
        start: 'top top',
        end: '+=400%',
        scrub: 1,
        pin: true,
        pinSpacing: true
      }
    });

    // Fade in the whole block initially
    sb2Tl.set(sb2, { opacity: 1 }, 0);

    // Phase 1: Disintegrate the matrix wrapper (0.0 to 1.0 on timeline)
    sb2Tl.to('.explodable-matrix', {
      scale: 3.0,
      filter: 'blur(30px)',
      opacity: 0,
      duration: 1,
      ease: 'power3.in'
    }, 0);
    
    sb2Tl.to('.matrix-column, .ambient-hud, .info-container', {
      x: () => (Math.random() - 0.5) * 1500,
      y: () => (Math.random() - 0.5) * 1500,
      rotationZ: () => (Math.random() - 0.5) * 180,
      opacity: 0,
      stagger: 0.05,
      duration: 1,
      ease: 'power3.in'
    }, 0);

    // Phase 2: The Plunge / Hack Override (0.5 to 2.5 on timeline)
    // Feeds directly into scene.js uHackProgress
    sb2Tl.to(window, {
      _visageHackProgress: 1.0,
      duration: 2,
      ease: 'power2.inOut'
    }, 0.5);

    // Phase 3: The Interior Reveal (2.5 to 3.5 on timeline)
    sb2Tl.to('.hacked-core-interior', {
      opacity: 1,
      pointerEvents: 'auto',
      duration: 1,
      ease: 'power2.out'
    }, 2.5);
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
