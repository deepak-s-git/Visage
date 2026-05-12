/* VISAGE · Custom Cinematic Cursor
   A neural/magnetic cursor system that interpolates position 
   and adds atmospheric flares tracking the user's movement. */

export function initCustomCursor() {
  const core = document.getElementById('cursor-core');
  const ring = document.getElementById('cursor-ring');
  const flare = document.getElementById('cursor-flare');

  if (!core || !ring || !flare) return;

  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const pos = {
    core: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    ring: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    flare: { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  };

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  // Handle interactive hover states programmatically
  const interactives = document.querySelectorAll('button, a, .interactive');
  interactives.forEach(el => {
    el.addEventListener('mouseenter', () => {
      core.style.width = '12px';
      core.style.height = '12px';
      ring.style.width = '60px';
      ring.style.height = '60px';
      ring.style.borderColor = 'rgba(100, 200, 255, 0.8)';
      ring.style.background = 'rgba(100, 200, 255, 0.05)';
    });
    el.addEventListener('mouseleave', () => {
      core.style.width = '6px';
      core.style.height = '6px';
      ring.style.width = '40px';
      ring.style.height = '40px';
      ring.style.borderColor = 'rgba(100, 200, 255, 0.4)';
      ring.style.background = 'transparent';
    });
  });

  function render() {
    // Lerp positions (different speeds for depth effect)
    pos.core.x += (mouse.x - pos.core.x) * 0.3;
    pos.core.y += (mouse.y - pos.core.y) * 0.3;

    pos.ring.x += (mouse.x - pos.ring.x) * 0.15;
    pos.ring.y += (mouse.y - pos.ring.y) * 0.15;

    pos.flare.x += (mouse.x - pos.flare.x) * 0.05;
    pos.flare.y += (mouse.y - pos.flare.y) * 0.05;

    // Apply transforms
    core.style.transform = `translate(calc(-50% + ${pos.core.x}px), calc(-50% + ${pos.core.y}px))`;
    ring.style.transform = `translate(calc(-50% + ${pos.ring.x}px), calc(-50% + ${pos.ring.y}px))`;
    flare.style.transform = `translate(calc(-50% + ${pos.flare.x}px), calc(-50% + ${pos.flare.y}px))`;

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}
