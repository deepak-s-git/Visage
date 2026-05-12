/* VISAGE · Custom Cinematic Cursor
   A neural/magnetic cursor system that interpolates position 
   and adds atmospheric flares tracking the user's movement. */

export function initCustomCursor() {
  const core = document.getElementById('cursor-core');
  const ring = document.getElementById('cursor-ring');
  const flare = document.getElementById('cursor-flare');
  const trails = document.querySelectorAll('.cursor-trail');

  if (!core || !ring || !flare) return;

  // Start hidden until first mouse move
  let initialized = false;
  document.body.classList.add('cursor-hidden');

  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const pos = {
    core: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    ring: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    flare: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    trails: [
      { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    ]
  };

  window.addEventListener('mousemove', (e) => {
    if (!initialized) {
      initialized = true;
      document.body.classList.remove('cursor-hidden');
      // Snap positions to first mouse move to avoid flying across screen
      pos.core = { x: e.clientX, y: e.clientY };
      pos.ring = { x: e.clientX, y: e.clientY };
      pos.flare = { x: e.clientX, y: e.clientY };
      pos.trails.forEach(t => { t.x = e.clientX; t.y = e.clientY; });
    }
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  // Dynamic interactive binding via event delegation
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('button, a, .interactive')) {
      core.style.width = '12px';
      core.style.height = '12px';
      ring.style.width = '60px';
      ring.style.height = '60px';
      ring.style.borderColor = 'rgba(100, 200, 255, 0.8)';
      ring.style.background = 'rgba(100, 200, 255, 0.05)';
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('button, a, .interactive')) {
      core.style.width = '6px';
      core.style.height = '6px';
      ring.style.width = '40px';
      ring.style.height = '40px';
      ring.style.borderColor = 'rgba(100, 200, 255, 0.4)';
      ring.style.background = 'transparent';
    }
  });

  function render() {
    if (initialized) {
      // Lerp positions (different speeds for depth effect)
      pos.core.x += (mouse.x - pos.core.x) * 0.3;
      pos.core.y += (mouse.y - pos.core.y) * 0.3;

      pos.ring.x += (mouse.x - pos.ring.x) * 0.15;
      pos.ring.y += (mouse.y - pos.ring.y) * 0.15;

      pos.flare.x += (mouse.x - pos.flare.x) * 0.05;
      pos.flare.y += (mouse.y - pos.flare.y) * 0.05;

      // Trail physics (chain reaction)
      pos.trails[0].x += (pos.core.x - pos.trails[0].x) * 0.35;
      pos.trails[0].y += (pos.core.y - pos.trails[0].y) * 0.35;
      pos.trails[1].x += (pos.trails[0].x - pos.trails[1].x) * 0.35;
      pos.trails[1].y += (pos.trails[0].y - pos.trails[1].y) * 0.35;
      pos.trails[2].x += (pos.trails[1].x - pos.trails[2].x) * 0.35;
      pos.trails[2].y += (pos.trails[1].y - pos.trails[2].y) * 0.35;

      // Apply transforms
      core.style.transform = `translate(calc(-50% + ${pos.core.x}px), calc(-50% + ${pos.core.y}px))`;
      ring.style.transform = `translate(calc(-50% + ${pos.ring.x}px), calc(-50% + ${pos.ring.y}px))`;
      flare.style.transform = `translate(calc(-50% + ${pos.flare.x}px), calc(-50% + ${pos.flare.y}px))`;

      trails.forEach((trail, i) => {
        trail.style.transform = `translate(calc(-50% + ${pos.trails[i].x}px), calc(-50% + ${pos.trails[i].y}px)) scale(${1 - i*0.2})`;
      });
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}
