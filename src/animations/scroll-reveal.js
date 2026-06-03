/* ═══════════════════════════════════════════════════════════════
   VISAGE · Scroll Reveal + Landing Intro Animations
   Uses GSAP + ScrollTrigger for cinematic transitions.
   ═══════════════════════════════════════════════════════════════ */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { setLandingActive, setAudioScrollProgress, setTrackVolumesImmediate, setTrackVolumes, restartTronAndFadeIn } from '../audio/ambient.js';
import { initMatrixRain } from './matrix-rain.js';
import { MegaCity } from '../game/MegaCity.js';

gsap.registerPlugin(ScrollTrigger);

// Force scroll restoration to manual and clear GSAP's cached scroll positions
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
ScrollTrigger.clearScrollMemory();

// Initialize Lenis for heavy, dense, cinematic scroll inertia
const lenis = new Lenis({
  lerp: 0.1,            // Lighter, more responsive smoothing (feels natural but cinematic)
  wheelMultiplier: 0.8, // Fast enough to be comfortable, but slightly throttled to prevent massive jumps
  smoothWheel: true,
  syncTouch: true,
  touchMultiplier: 1.5, 
});
lenis.stop(); // Stop immediately on load to prevent scrolling during entry gate/loading

// Synchronize Lenis with GSAP ScrollTrigger perfectly
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

let landingScene = null;
let matrixRainEffect = null;

/** Store a reference to the Three.js scene for scroll-driven updates */
export function setLandingScene(scene) {
  landingScene = scene;
}

/** Run the cinematic landing intro (typography stagger) */
export function playLandingIntro() {
  injectHomeButton();
  const tl = gsap.timeline({ delay: 0.6 });

  // Emerge from the blur of the loader (Core and grid solidify from atmosphere)
  tl.fromTo('.fixed-bg-layer', {
    opacity: 0, scale: 0.95
  }, {
    opacity: 1, scale: 1, duration: 2.5, ease: 'power2.out'
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

  tl.to('#audio-toggle', {
    opacity: 1, pointerEvents: 'auto', duration: 0.8, ease: 'power2.out'
  }, 1.5);

  tl.to('#home-button', {
    opacity: 1, pointerEvents: 'auto', duration: 0.8, ease: 'power2.out'
  }, 1.5);

  return tl;
}

/** Set up scroll-driven transitions from landing → story journey */
export function initScrollReveal() {
  // Inject Home navigation button
  injectHomeButton();

  // Force scroll position to top instantly to prevent browser scroll restoration glitches
  window.scrollTo(0, 0);
  lenis.scrollTo(0, { immediate: true });

  // Double-safeguard: reset scroll again after browser thread layout is complete
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    lenis.scrollTo(0, { immediate: true });
    // Tell ScrollTrigger to align with the reset position
    ScrollTrigger.update();
  });

  // Enable scrolling after loading is complete
  document.documentElement.style.overflow = 'auto';
  document.body.style.overflowY = 'auto';
  document.body.style.overflowX = 'hidden';
  lenis.start();

  // Initialize matrix rain canvas
  matrixRainEffect = initMatrixRain('matrix-rain-canvas');

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

  // Fade out the entire landing section wrapper cleanly
  // Using fromTo with immediateRender: false prevents conflicts if they scroll instantly
  landingTl.fromTo('.landing', 
    { opacity: 1, y: 0 }, 
    { opacity: 0, y: -60, duration: 1.0, ease: 'none', immediateRender: false }, 
  0);

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
        end: '+=500%', // Reduced from 700% for better pacing, but still highly cinematic
        scrub: 1.5,
        pin: true,
        pinSpacing: true
      }
    });

    // Audio proxy for track crossfading
    const audioProxy = { wuwa: 1.0, tron: 0.0 };

    // Phase 1: Hold the cards so the user can read them! Then fade them out.
    // Fade out WuWa music when the orbital array disappears
    corruptionTl.to(audioProxy, {
      wuwa: 0.0,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => setTrackVolumesImmediate(audioProxy.wuwa, audioProxy.tron)
    }, 2.0);

    corruptionTl.to('.matrix-info-cards, .ambient-ui-filler, .orbital-rings', {
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
      ease: 'power2.out',
      onStart: () => {
        if(matrixRainEffect) matrixRainEffect.start();
      },
      onReverseComplete: () => {
        if(matrixRainEffect) matrixRainEffect.stop();
      }
    }, 11.8);
    
    // Matrix Rain Fade In
    corruptionTl.to('.matrix-rain-canvas', {
      opacity: 0.8,
      duration: 1.0
    }, 11.8);

    // Cascading System Crash UI
    corruptionTl.fromTo('.cw-1', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 1.0 }, 12.5);
    corruptionTl.fromTo('.cw-5', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.8 }, 13.5);
    corruptionTl.fromTo('.cw-2', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.8 }, 14.2);
    corruptionTl.fromTo('.cw-6', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.8 }, 15.0);
    corruptionTl.fromTo('.cw-3', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.8 }, 15.8);
    corruptionTl.fromTo('.cw-7', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.8 }, 16.5);
    corruptionTl.fromTo('.cw-4', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.8 }, 17.5);

    // Fade in the Proceed cue
    corruptionTl.to('.crash-scroll-cue', {
      opacity: 1,
      duration: 0.8
    }, 18.5);

    // Hold the final state briefly
    corruptionTl.to({}, { duration: 3.0 }); 
    
    // EXACT .glitch CSS REPLICA (Scrubbed)
    // The user specifically requested the exact same clipping/RGB split as the 999% OVERLOAD text.
    // We break this into rapid, jagged keyframes manually so it scrubs perfectly.
    // CLEAN CINEMATIC EXIT ANIMATION
    // Smoothly defocus, drift upwards, and fade out into the matrix.
    corruptionTl.to('.crash-window', {
      y: -150,
      opacity: 0,
      scale: 0.95,
      filter: 'blur(15px)',
      stagger: 0.1, // Smooth cascade
      duration: 2.0,
      ease: 'power2.inOut'
    }, '+=0');

    // Fade the scroll cue out smoothly alongside the cards
    corruptionTl.to('.crash-scroll-cue', {
      y: 50,
      opacity: 0,
      filter: 'blur(10px)',
      duration: 1.0
    }, '<');

    // End timeline padding
    corruptionTl.to({}, { duration: 1.0 });
  }

  // 4. Generic reveal for remaining story blocks
  gsap.utils.toArray('.story-block').forEach((block) => {
    if (block.id === 'story-block-1' || block.id === 'story-block-2' || block.id === 'story-block-3') return; // Handled custom
    
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

  // 5. Custom pinned reveal for Super Blue Stadium
  const sb3 = document.getElementById('story-block-3');
  let stadium = null;

  if (sb3) {
    // Initialize the massive 3D Stadium
    stadium = new MegaCity('megacity-canvas');

    // Start the WebGL render loop as soon as the section becomes visible at all
    ScrollTrigger.create({
      trigger: sb3,
      start: 'top bottom', // Triggers when the top of the city hits the bottom of your screen
      end: 'bottom top',   // Triggers when the bottom of the city leaves the top of your screen
      onEnter: () => stadium.start(),
      onLeave: () => stadium.stop(),
      onEnterBack: () => stadium.start(),
      onLeaveBack: () => stadium.stop()
    });

    const sb3Tl = gsap.timeline({
      scrollTrigger: {
        trigger: sb3,
        start: 'top top', // Pin perfectly when the top edge hits the top of the screen
        end: '+=120%', // Shorter pin duration for a quick "little hold"
        scrub: 1.5,
        pin: true,
        pinSpacing: true
      }
    });

    // 1. Fade the ENTIRE stadium section in
    gsap.fromTo(sb3, 
      { opacity: 0 },
      { 
        opacity: 1, 
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sb3,
          start: 'top 80%',
          end: 'top top',
          scrub: 1.5
        }
      }
    );

    // 2. Animate the City Construction via Shader!
    const buildProxy = { progress: 0 };
    gsap.fromTo(buildProxy, 
      { progress: 0 },
      {
        progress: 1,
        ease: 'power1.inOut',
        scrollTrigger: {
          trigger: sb3,
          start: 'top 100%', // Start building the moment it enters the screen
          end: 'top top',    // Finish completely when it covers full screen
          scrub: 1.5
        },
        onUpdate: () => {
          if (stadium) stadium.setBuildProgress(buildProxy.progress);
        }
      }
    );

    // 3. Cinematic Fly-Forward Exit and Fade Out to Black
    // Hold static for 0.4s in timeline units.
    // Then fly camera forward, fade out city canvas, glow, UI content, and background grid/stars.
    sb3Tl.to(stadium.baseCameraPos, {
      z: -2000,
      y: 200,
      duration: 1.0,
      ease: 'power2.in' // Accelerates forward
    }, 0.4);

    sb3Tl.to(['#megacity-canvas', '.stadium-content', '.stadium-glow'], {
      opacity: 0,
      duration: 1.0,
      ease: 'power2.inOut'
    }, 0.4);

    sb3Tl.to('.fixed-bg-layer', {
      opacity: 0,
      duration: 1.0,
      ease: 'power2.inOut'
    }, 0.4);

    // Fade out Matrix Rain seamlessly as this section scrolls in, ensuring it scrubs back up!
    gsap.fromTo('.matrix-rain-canvas', 
      { opacity: 0.8 },
      {
        opacity: 0,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sb3,
          start: 'top 100%',
          end: 'top top',
          scrub: 1.5
        }
      }
    );

    // Initial Button Click Handler (ENTER THE GRID Transition)
    const btnEnter = document.getElementById('btn-enter-grid');
    const darkWorld = document.getElementById('dark-grid-world');
    const btnSkip = document.getElementById('btn-skip-grid');

    if (btnEnter && darkWorld) {
      btnEnter.addEventListener('click', () => {
        // Lock scrolling
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        lenis.stop();
        
        // HYPER ZOOM TRANSITION into the Master Image
        const transTl = gsap.timeline();
        
        // Start TRON music fresh from 0:00 on click
        restartTronAndFadeIn(1.5);
        
        // Hide the text content immediately
        transTl.to('.stadium-content', { opacity: 0, duration: 0.3 });
        
        // Trigger the 3D Camera Dive in Three.js
        if (stadium) stadium.hyperDive();

        // Flash the screen pure white/cyan during the dive
        transTl.to('.stadium-glow', {
          scale: 5,
          opacity: 1,
          filter: 'brightness(5)',
          background: 'radial-gradient(circle at center, #ffffff 0%, #00ffff 100%)',
          duration: 0.8,
          ease: 'power3.in'
        }, 0.6); // Start the flash halfway through the 1.5s dive

        // Reveal the Dark World
        transTl.call(() => {
          darkWorld.classList.add('active-world');
        });

        // Fade in the dark world content
        transTl.fromTo('.dark-world-content', 
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1, duration: 1.0, ease: 'power2.out' },
          '+=0.1'
        );
      });
      
      // Skip Button Logic (Return to Stadium)
      if (btnSkip) {
        btnSkip.addEventListener('click', () => {
          const retTl = gsap.timeline();
          
          // Fade TRON music back out
          setTrackVolumes(0, 0, 1.5);
          
          // Fade out dark world
          retTl.to('.dark-world-content', { opacity: 0, scale: 0.9, duration: 0.5, ease: 'power2.in' });
          retTl.call(() => {
            darkWorld.classList.remove('active-world');
          });

          // Un-flash the stadium glow
          retTl.to('.stadium-glow', {
            scale: 1,
            filter: 'brightness(1)',
            background: 'radial-gradient(circle at center, rgba(0, 150, 255, 0.4) 0%, rgba(0, 50, 255, 0.1) 40%, transparent 70%)',
            duration: 0.5,
            ease: 'power2.out'
          }, '<');

          // Reverse the 3D Camera Dive
          if (stadium) stadium.reverseDive();

          // Bring back stadium text after the camera is mostly back up
          retTl.to('.stadium-content', { opacity: 1, duration: 0.5 }, '+=1.0');
          
          retTl.call(() => {
            // Unlock scrolling
            document.documentElement.style.overflow = 'auto';
            document.body.style.overflowY = 'auto';
            document.body.style.overflowX = 'hidden';
            lenis.start();
          });
        });
      }
    }
  }

  // 6. Orb Gateway reveal
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
/**
 * Cinematic text decrypt/scramble reveal effect
 */
function decryptText(element, originalText) {
  if (!element) return;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+<>?/[]{}';
  let iterations = 0;
  const maxIterations = 15;
  const charsPerStep = Math.max(1, originalText.length / maxIterations);
  
  if (element.dataset.intervalId) clearInterval(element.dataset.intervalId);
  
  element.textContent = originalText.split('').map(char => {
    if (char === ' ') return ' ';
    if (char === '.' || char === ',') return char;
    return chars[Math.floor(Math.random() * chars.length)];
  }).join('');
  
  element.dataset.intervalId = setInterval(() => {
    element.textContent = originalText.split('').map((char, index) => {
      if (index < iterations) return char;
      if (char === ' ' || char === '.' || char === ',') return char;
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
    
    iterations += charsPerStep;
    
    if (iterations >= originalText.length) {
      clearInterval(element.dataset.intervalId);
      element.textContent = originalText;
    }
  }, 35);
}

/**
 * Transition back to the landing page smoothly
 */
function goToHome() {
  const homeBtn = document.getElementById('home-button');
  if (homeBtn) homeBtn.style.pointerEvents = 'none';

  // 1. Create temporary black transition overlay (blocking clicks during transition)
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = 0;
  overlay.style.background = '#000000';
  overlay.style.zIndex = 999999;
  overlay.style.opacity = 0;
  overlay.style.pointerEvents = 'auto';
  document.body.appendChild(overlay);

  // 2. Fade in overlay (cross-fade to black)
  gsap.to(overlay, {
    opacity: 1,
    duration: 0.6,
    ease: 'power2.inOut',
    onComplete: () => {
      // Set the skip-loader flag in localStorage so the freshly reloaded page bypasses the 14s boot sequence
      localStorage.setItem('visage-skip-loader', 'true');
      
      // Cleanly reload the page to clear WebGL contexts, game loops, audio nodes, and cameras completely
      window.location.reload();
    }
  });
}

function injectHomeButton() {
  if (document.getElementById('home-button')) return;
  const btn = document.createElement('button');
  btn.id = 'home-button';
  btn.className = 'home-button';
  btn.setAttribute('aria-label', 'Return to landing page');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>`;
  btn.addEventListener('click', goToHome);
  document.body.appendChild(btn);
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
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  lenis.stop();
  
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

  // Set initial states for components of the main interface to enable build animation
  tl.set('.main-interface', { display: 'block', opacity: 0 });
  tl.set('.shell', { opacity: 1 }); // Ensure shell is visible inside wrapper
  
  const audioToggle = document.getElementById('audio-toggle');
  if (audioToggle) {
    tl.set(audioToggle, { opacity: 0, scale: 0.7 });
  }
  const homeBtn = document.getElementById('home-button');
  if (homeBtn) {
    tl.set(homeBtn, { opacity: 0, scale: 0.7 });
  }

  // Dispatch custom collapse veil event when interface starts loading
  tl.call(() => {
    window.dispatchEvent(new CustomEvent('visage-collapse-veil'));
  }, null, 2.0);
  
  // Header initial states
  tl.set('header', { opacity: 0, y: -40 });
  tl.set(['.hd-wordmark', '.hd-subtitle', '.hd-install', '#live-clock'], { opacity: 0 });
  tl.set('.status-pill', { opacity: 0, scale: 0.7 });
  
  // Sidebars and center column initial states
  tl.set('.sidebar-left', { opacity: 0, x: -60 });
  tl.set('.sidebar-left .section-label', { opacity: 0 });
  tl.set('.catalogue', { opacity: 0, scale: 0.96 });
  tl.set('.catalogue-item', { opacity: 0, x: -25 });
  tl.set('.spotify-panel > *', { opacity: 0, y: 20 });
  
  tl.set('.center-col', { opacity: 0, y: 60, scale: 0.97 });
  tl.set('.cam-wrap', { opacity: 0, scale: 0.95, borderColor: 'rgba(255, 255, 255, 0.01)' });
  tl.set('.reticle', { scale: 0, opacity: 0 });
  tl.set(['.cam-label', '.no-cam-icon', '.no-cam-text', '.cam-enable-btn'], { opacity: 0 });
  tl.set(['.detect-btn', '.debug-toggle-btn'], { opacity: 0, y: 25 });
  
  tl.set('.sidebar-right', { opacity: 0, x: 60 });
  tl.set('.sidebar-right > *', { opacity: 0, y: 20 });
  tl.set(['#fill-conf', '#fill-valence-pos', '#fill-valence-neg', '#fill-arousal-pos', '#fill-arousal-neg'], { width: '0%' });
  
  tl.set('footer', { opacity: 0, y: 20 });
  tl.set('footer .foot-text', { opacity: 0 });

  // Phase 1: Main interface container fades in
  tl.to('.main-interface', {
    opacity: 1,
    background: 'rgba(1, 1, 2, 0.5)',
    backdropFilter: 'blur(20px)',
    webkitBackdropFilter: 'blur(20px)',
    pointerEvents: 'auto',
    duration: 2.0,
    ease: 'power2.out'
  }, 2.0); // Starts at 2.0s after the blackhole effect finishes

  // Phase 2: Header boots and slides down
  tl.to('header', {
    opacity: 1,
    y: 0,
    duration: 1.2,
    ease: 'power4.out'
  }, 2.2);

  // Decrypt header titles
  tl.to('.hd-wordmark', { opacity: 1, duration: 0.1 }, 2.5);
  tl.call(() => decryptText(document.querySelector('.hd-wordmark'), 'Visage.obj'), null, 2.5);
  
  tl.to('.hd-subtitle', { opacity: 1, duration: 0.1 }, 2.6);
  tl.call(() => decryptText(document.querySelector('.hd-subtitle'), 'Affective Computing Module'), null, 2.6);

  tl.to('.hd-install', { opacity: 1, duration: 0.1 }, 2.8);
  tl.call(() => decryptText(document.querySelector('.hd-install'), 'Installation 03'), null, 2.8);

  tl.to('.status-pill', { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.5)' }, 3.0);
  tl.to('#live-clock', { opacity: 1, duration: 0.8 }, 3.2);

  // Phase 3: Left Sidebar enters and builds
  tl.to('.sidebar-left', { opacity: 1, x: 0, duration: 1.2, ease: 'power4.out' }, 2.8);
  
  tl.to('.sidebar-left .section-label:first-of-type', { opacity: 1, duration: 0.1 }, 3.0);
  tl.call(() => {
    const labels = document.querySelectorAll('.sidebar-left .section-label');
    if (labels && labels[0]) decryptText(labels[0], 'Process Catalogue');
  }, null, 3.0);
  
  tl.to('.catalogue', { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' }, 3.1);
  tl.to('.catalogue-item', { 
    opacity: 1, 
    x: 0, 
    duration: 0.6, 
    stagger: 0.1, 
    ease: 'power3.out' 
  }, 3.2);
  
  // Spotify panel builds
  tl.to('.spotify-panel > *', { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, 3.5);
  tl.call(() => {
    const labels = document.querySelectorAll('.sidebar-left .section-label');
    if (labels && labels[1]) decryptText(labels[1], 'Signal Source');
  }, null, 3.6);

  // Phase 4: Center Column System Build
  tl.to('.center-col', { opacity: 1, y: 0, scale: 1, duration: 1.4, ease: 'power4.out' }, 3.2);
  tl.to('.cam-wrap', { 
    opacity: 1, 
    scale: 1, 
    borderColor: 'var(--glass-border)', 
    duration: 1.2, 
    ease: 'power3.out' 
  }, 3.3);
  
  // Slide corner reticles outward
  tl.to('.reticle', { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.8)' }, 3.6);
  
  // Flash scan line
  tl.call(() => {
    const scanLine = document.getElementById('scan-line');
    if (scanLine) scanLine.classList.add('active');
  }, null, 3.8);

  tl.to(['.cam-label', '.no-cam-icon', '.no-cam-text', '.cam-enable-btn'], { 
    opacity: 1, 
    duration: 0.8, 
    stagger: 0.1 
  }, 3.8);

  tl.to(['.detect-btn', '.debug-toggle-btn'], { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out' }, 4.0);

  // Phase 5: Right Sidebar and Calibration Diagnostics
  tl.to('.sidebar-right', { opacity: 1, x: 0, duration: 1.2, ease: 'power4.out' }, 3.5);
  
  tl.to('.resonance-label-row .section-label', { opacity: 1, duration: 0.1 }, 3.7);
  tl.call(() => decryptText(document.querySelector('.resonance-label-row .section-label'), 'Detected Emotion'), null, 3.7);
  
  tl.to('.sidebar-right > *', { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' }, 3.8);

  // Sensory calibration sweep: width goes from 0% -> 100% -> 0%
  tl.fromTo(['#fill-conf', '#fill-valence-pos', '#fill-valence-neg', '#fill-arousal-pos', '#fill-arousal-neg'], 
    { width: '0%' }, 
    { width: '100%', duration: 1.0, ease: 'power3.inOut', stagger: 0.1 }, 
    4.1
  );
  tl.to(['#fill-conf', '#fill-valence-pos', '#fill-valence-neg', '#fill-arousal-pos', '#fill-arousal-neg'], 
    { width: '0%', duration: 0.8, ease: 'power3.inOut' }, 
    5.0
  );

  // Phase 6: Footer and Audio Toggle
  tl.to('footer', { opacity: 1, y: 0, duration: 0.8 }, 4.5);
  
  tl.to('footer .foot-text:first-child', { opacity: 1, duration: 0.1 }, 4.7);
  tl.call(() => {
    const footTexts = document.querySelectorAll('footer .foot-text');
    if (footTexts && footTexts[0]) decryptText(footTexts[0], 'Data is transient. No records retained.');
  }, null, 4.7);
  
  tl.to('footer .foot-text:last-child', { opacity: 1, duration: 0.1 }, 4.9);
  tl.call(() => {
    const footTexts = document.querySelectorAll('footer .foot-text');
    if (footTexts && footTexts[1]) decryptText(footTexts[1], 'SYS_MEM 1024MB');
  }, null, 4.9);

  if (audioToggle) {
    tl.to(audioToggle, { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.5)' }, 4.8);
  }
  if (homeBtn) {
    tl.to(homeBtn, { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.5)' }, 4.8);
  }

  // Turn off landing active state for audio
  setTimeout(() => {
    setLandingActive(false);
  }, 2500);
}
