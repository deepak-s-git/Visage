export function initTextParticles(canvasId, textStr) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return { dispose() {} };

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let width, height;
  let particles = [];
  let mouse = { x: -1000, y: -1000, radius: 80 };
  let running = true;
  let dpr = window.devicePixelRatio || 1;

  function initText() {
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    // Draw text to sample
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    // Match the CSS styles roughly
    const fontSize = Math.min(width * 0.15, 120); 
    ctx.font = `300 ${fontSize}px "Playfair Display", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(textStr, width / 2, height / 2);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    particles = [];
    
    // Sample pixels
    const step = Math.round(dpr * 3); // Sample density
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const i = (y * canvas.width + x) * 4;
        if (imgData[i + 3] > 128) {
          particles.push({
            x: x / dpr,
            y: y / dpr,
            baseX: x / dpr,
            baseY: y / dpr,
            vx: 0,
            vy: 0,
            size: 1.5
          });
        }
      }
    }
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }

  function onMouseLeave() {
    mouse.x = -1000;
    mouse.y = -1000;
  }

  window.addEventListener('resize', initText);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);

  initText();

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    
    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];

      // Mouse repulsion
      let dx = mouse.x - p.x;
      let dy = mouse.y - p.y;
      let distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < mouse.radius) {
        const force = (mouse.radius - distance) / mouse.radius;
        const angle = Math.atan2(dy, dx);
        p.vx -= Math.cos(angle) * force * 5;
        p.vy -= Math.sin(angle) * force * 5;
      }

      // Return to base
      p.vx += (p.baseX - p.x) * 0.1;
      p.vy += (p.baseY - p.y) * 0.1;

      // Friction
      p.vx *= 0.8;
      p.vy *= 0.8;

      p.x += p.vx;
      p.y += p.vy;

      // Draw particle
      ctx.globalAlpha = 0.8 + Math.abs(p.vx) * 0.1;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
  }

  animate();

  return {
    dispose() {
      running = false;
      window.removeEventListener('resize', initText);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    }
  };
}
