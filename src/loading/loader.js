/* VISAGE · Cinematic Loading Sequence
   14-second immersive boot experience synchronized to audio intro.
   Phases: System Boot → Wordmark Assembly → Calibration → Awakening */

import { gsap } from 'gsap';

const STATUS_PHASES = [
  { text: 'Initialising',              at: 0 },
  { text: 'Loading Neural Mesh',       at: 2 },
  { text: 'Calibrating Sensors',       at: 4.5 },
  { text: 'Mapping Affect Vectors',    at: 7 },
  { text: 'Resonance Scan Active',     at: 9 },
  { text: 'Emotional Core Online',     at: 11.5 },
  { text: 'System Ready',              at: 13 }
];

let particles = [];
let ctx = null;
let animId = null;
let canvasW = 0, canvasH = 0;

/* ── Particle System ── */
function initParticleCanvas() {
  const canvas = document.getElementById('loader-particles');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvasW,
      y: Math.random() * canvasH,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.3 + 0.05
    });
  }
  drawParticles();
}

function resize() {
  const canvas = document.getElementById('loader-particles');
  if (!canvas) return;
  canvasW = canvas.width = window.innerWidth;
  canvasH = canvas.height = window.innerHeight;
}

function drawParticles() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasW, canvasH);

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = canvasW;
    if (p.x > canvasW) p.x = 0;
    if (p.y < 0) p.y = canvasH;
    if (p.y > canvasH) p.y = 0;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 200, 210, ${p.alpha})`;
    ctx.fill();
  }
  animId = requestAnimationFrame(drawParticles);
}

function stopParticles() {
  if (animId) cancelAnimationFrame(animId);
  window.removeEventListener('resize', resize);
}

/* ── Status Text Updater ── */
function scheduleStatusUpdates(tl) {
  const statusEl = document.getElementById('loader-status');
  if (!statusEl) return;

  STATUS_PHASES.forEach(({ text, at }) => {
    tl.call(() => {
      gsap.to(statusEl, {
        opacity: 0, duration: 0.15,
        onComplete: () => {
          statusEl.textContent = text;
          gsap.to(statusEl, { opacity: 1, duration: 0.25 });
        }
      });
    }, [], at);
  });
}

/* ── Progress Counter ── */
function animateCounter(tl) {
  const el = document.getElementById('loader-progress-num');
  if (!el) return;
  const obj = { val: 0 };
  tl.to(obj, {
    val: 100, duration: 13.5, ease: 'power1.in',
    onUpdate: () => { el.textContent = Math.round(obj.val); }
  }, 0);
}

/* ── Main Loading Timeline (14 seconds) ── */
export function runCinematicLoader() {
  return new Promise((resolve) => {
    const loader = document.getElementById('loading-screen');
    if (!loader) { resolve(); return; }

    initParticleCanvas();

    const tl = gsap.timeline({
      onComplete: () => {
        // Resolve exactly at the 14-second mark to trigger landing choreography
        resolve();

        // Cinematic dissolve of the loader's dark background
        gsap.to(loader, {
          opacity: 0,
          duration: 1.5,
          ease: 'power2.inOut',
          onComplete: () => {
            stopParticles();
            loader.remove();
          }
        });
      }
    });

    // ─── PHASE 1: SYSTEM BOOT (0-3s) ───
    // Boot text lines appear one by one
    tl.to('.boot-line', {
      opacity: 1, y: 0,
      duration: 0.4, stagger: 0.6,
      ease: 'power2.out'
    }, 0.3);

    // Boot text fades out
    tl.to('#phase-boot', {
      opacity: 0, duration: 0.5, ease: 'power2.in'
    }, 3.0);

    // ─── PHASE 2: WORDMARK ASSEMBLY (3-7s) ───
    // Eyebrow slides in
    tl.to('#loader-eyebrow', {
      opacity: 1, y: 0, duration: 0.6, ease: 'power3.out'
    }, 3.2);

    // Letters assemble one by one
    tl.to('#loader-wordmark span', {
      opacity: 1, y: 0, scale: 1,
      duration: 0.5, stagger: 0.08,
      ease: 'power3.out'
    }, 3.5);

    // Dot pulses
    tl.fromTo('.loader-dot', { scale: 1 }, {
      scale: 1.4, duration: 0.3, ease: 'power2.out', yoyo: true, repeat: 1
    }, 4.8);

    // Tagline
    tl.to('#loader-tagline', {
      opacity: 1, y: 0, duration: 0.6, ease: 'power3.out'
    }, 5.2);

    // ─── PHASE 3: CALIBRATION (7-10s) ───
    // Status and progress appear
    tl.to('#loader-status-wrap', {
      opacity: 1, duration: 0.4, ease: 'power2.out'
    }, 6.5);

    // Progress bar appears
    tl.to('#loader-bar', {
      opacity: 1, duration: 0.3, ease: 'power2.out'
    }, 7.0);

    // Progress bar fills
    tl.to('#loader-bar-fill', {
      width: '100%', duration: 6.5,
      ease: 'power1.inOut'
    }, 7.0);

    // ─── PHASE 4: AWAKENING (10-13s) ───
    // Particle acceleration
    tl.call(() => {
      particles.forEach(p => {
        p.vx *= 2.5;
        p.vy *= 2.5;
        p.alpha = Math.min(p.alpha * 2, 0.5);
      });
    }, [], 10);

    // Wordmark glow pulse
    tl.to('#loader-wordmark', {
      textShadow: '0 0 40px rgba(255,255,255,0.15)',
      duration: 1.5, ease: 'power2.inOut'
    }, 11);

    // Scan line sweeps
    tl.to('.loader-scanline', {
      opacity: 0.3, duration: 0.3
    }, 8);
    tl.to('.loader-scanline', {
      top: '100%', duration: 4, ease: 'none'
    }, 8);
    tl.to('.loader-scanline', {
      opacity: 0, duration: 0.3
    }, 12);

    // ─── PHASE 5: TRANSITION OUT (13-14s) ───
    // Everything fades, system hands off to landing
    tl.to('#loader-hero', {
      y: -30, opacity: 0, duration: 0.8, ease: 'power3.in'
    }, 13);
    tl.to('#loader-status-wrap', {
      opacity: 0, duration: 0.4
    }, 13);
    tl.to('#loader-bar', {
      opacity: 0, duration: 0.4
    }, 13.2);

    // Schedule status text changes and counter
    scheduleStatusUpdates(tl);
    animateCounter(tl);
  });
}
