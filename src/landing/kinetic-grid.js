export function initKineticGrid(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return { dispose() {} };

  const ctx = canvas.getContext('2d', { alpha: true });
  let width, height;
  
  // Grid settings
  const spacing = 40; // Much denser
  let cols, rows;
  let points = [];
  
  // Physics & Wave settings
  const spring = 0.025; // Smoother but tighter return
  const friction = 0.88; // Reduced gliding so it settles faster
  const mouseRadius = 300; // Normal reaction area
  const baseAlpha = 0.12; // Slightly improved base visibility

  // Mouse tracking
  const mouse = { x: -1000, y: -1000, vx: 0, vy: 0 };
  let lastMouseTime = performance.now();
  let lastMouseX = -1000;
  let lastMouseY = -1000;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    // Retina support for crisp lines
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    cols = Math.ceil(width / spacing) + 2;
    rows = Math.ceil(height / spacing) + 2;

    const newPoints = [];
    const offsetX = (width - (cols - 1) * spacing) / 2;
    const offsetY = (height - (rows - 1) * spacing) / 2;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const originX = x * spacing + offsetX;
        const originY = y * spacing + offsetY;
        
        let existing = points.find(p => p.ox === originX && p.oy === originY);
        if (existing) {
          newPoints.push(existing);
        } else {
          newPoints.push({
            x: originX, y: originY,
            ox: originX, oy: originY,
            vx: 0, vy: 0,
            indexX: x, indexY: y
          });
        }
      }
    }
    points = newPoints;
  }

  function onMouseMove(e) {
    const now = performance.now();
    const dt = Math.max(1, now - lastMouseTime);
    
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    mouse.vx = (mouse.x - lastMouseX) / dt;
    mouse.vy = (mouse.y - lastMouseY) / dt;

    lastMouseX = mouse.x;
    lastMouseY = mouse.y;
    lastMouseTime = now;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onMouseMove);
  resize();

  let running = true;
  let scrollProgress = 0; 
  let time = 0;

  // Hook into Visage's global scroll logic if needed, or just track locally
  window.addEventListener('scroll', () => {
    scrollProgress = window.scrollY / (document.body.scrollHeight - window.innerHeight || 1);
  });

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);

    time += 0.01;
    ctx.clearRect(0, 0, width, height);
    
    mouse.vx *= 0.9;
    mouse.vy *= 0.9;

    // Intensity increases as user scrolls deeper into the experience
    const intensity = 1.0 + (scrollProgress * 2.5);

    // Update Physics
    for (let i = 0; i < points.length; i++) {
      const p = points[i];

      // Distance to mouse
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Mouse repulsion/attraction force
      if (dist < 200) { // Reduced from 300 to prevent massive holes
        const force = (200 - dist) / 200;
        const angle = Math.atan2(dy, dx);
        
        // Push points away, but much softer (-10 instead of -30) so it doesn't form hard geometric shapes
        const pushX = Math.cos(angle) * force * -10 * intensity + mouse.vx * force * 5;
        const pushY = Math.sin(angle) * force * -10 * intensity + mouse.vy * force * 5;
        
        p.vx += pushX * 0.1;
        p.vy += pushY * 0.1;
      }

      // Add ambient wave deformation
      const waveX = Math.sin(time * 2.0 + p.indexY * 0.2) * 5 * intensity;
      const waveY = Math.cos(time * 1.5 + p.indexX * 0.2) * 5 * intensity;

      const targetX = p.ox + waveX;
      const targetY = p.oy + waveY;

      // Spring back
      p.vx += (targetX - p.x) * spring;
      p.vy += (targetY - p.y) * spring;

      // Friction
      p.vx *= friction;
      p.vy *= friction;

      p.x += p.vx;
      p.y += p.vy;
    }

    // Draw lines and dots
    const cx = width / 2;
    const cy = height / 2;
    const maxDist = Math.max(cx, cy) * 1.5; // Spread glow further

    ctx.lineWidth = 1;
    
    // Read Hack Progress for color shift
    const hack = window._visageHackProgress || 0;
    
    // Base colors: Blue (120, 190, 255) -> Red (255, 30, 30)
    const r = Math.round(120 + (135 * hack));
    const g = Math.round(190 - (160 * hack));
    const b = Math.round(255 - (225 * hack));
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const p = points[i];
        
        const distToCenter = Math.sqrt((p.x - cx)**2 + (p.y - cy)**2);
        let alpha = 1.0 - (distToCenter / maxDist);
        alpha = Math.max(0, Math.min(1, alpha));
        
        // Dynamic visibility based on scroll and movement
        const velocity = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const zScale = 1.0 + (velocity * 0.15); // Moving points appear closer to the camera
        const dynamicAlpha = (baseAlpha * intensity) + (velocity * 0.03) + (alpha * 0.08);

        if (dynamicAlpha > 0.01) {
          // Draw dots
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(dynamicAlpha * 1.5, 0.8)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.2 * zScale, 0, Math.PI * 2);
          ctx.fill();

          // Connect horizontal
          if (x < cols - 1) {
            const right = points[i + 1];
            drawLine(p, right, dynamicAlpha, hack);
          }
          // Connect vertical
          if (y < rows - 1) {
            const down = points[i + cols];
            drawLine(p, down, dynamicAlpha, hack);
          }
        }
      }
    }
  }

  function drawLine(p1, p2, alpha, hack) {
    // Line colors: Blue (100, 150, 255) -> Red (255, 30, 30)
    const r = Math.round(100 + (155 * hack));
    const g = Math.round(150 - (120 * hack));
    const b = Math.round(255 - (225 * hack));
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  animate();

  return {
    dispose() {
      running = false;
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    }
  };
}
