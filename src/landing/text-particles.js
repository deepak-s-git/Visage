export function initTextParticles(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return { dispose() {} };

  const section = container.closest('section') || document.body;

  // Create canvas inside the specific section so it inherits opacity and scrolls naturally
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute'; 
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.pointerEvents = 'auto'; 
  canvas.style.zIndex = '10';
  section.style.position = 'relative'; // ensure absolute child positions correctly
  section.appendChild(canvas);

  const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: true });
  let width, height;
  let particles = [];
  let mouse = { x: -1000, y: -1000, radius: 100, hover: false };
  let running = true;
  let dpr = window.devicePixelRatio || 1;
  const sampleStep = 1; // 1px for high fidelity (no minecraft blocks)

  const originalTexts = [];
  
  function extractAndHideText(root) {
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    let n;
    const nodes = [];
    while(n = walk.nextNode()) {
      if (n.textContent.trim().length > 0 && n.parentElement !== canvas) {
        nodes.push({
          node: n,
          parent: n.parentElement,
          originalColor: window.getComputedStyle(n.parentElement).color,
          originalTextShadow: window.getComputedStyle(n.parentElement).textShadow
        });
      }
    }
    
    // Hide them but keep layout
    nodes.forEach(item => {
      item.parent.style.color = 'transparent';
      item.parent.style.textShadow = 'none';
      originalTexts.push(item);
    });
    
    return nodes;
  }

  function init() {
    width = section.offsetWidth;
    height = section.offsetHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    const offCanvas = document.createElement('canvas');
    offCanvas.width = width * dpr;
    offCanvas.height = height * dpr;
    const offCtx = offCanvas.getContext('2d');
    offCtx.scale(dpr, dpr);
    offCtx.textBaseline = 'top';

    // Temporarily unhide to get accurate computed styles
    originalTexts.forEach(item => {
      item.parent.style.color = item.originalColor;
    });

    const nodes = extractAndHideText(container);
    const sectionRect = section.getBoundingClientRect();

    nodes.forEach(item => {
      const range = document.createRange();
      range.selectNodeContents(item.node);
      const rect = range.getBoundingClientRect();
      const style = window.getComputedStyle(item.parent);
      
      offCtx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      offCtx.fillStyle = item.originalColor;
      
      if (style.letterSpacing && style.letterSpacing !== 'normal') {
        offCtx.letterSpacing = style.letterSpacing;
      } else {
        offCtx.letterSpacing = '0px';
      }
      
      offCtx.textAlign = 'left';
      
      // Calculate absolute position relative to the section!
      const x = rect.left - sectionRect.left;
      const y = rect.top - sectionRect.top;
      
      // Force uppercase for titles
      const textContent = style.textTransform === 'uppercase' 
        ? item.node.textContent.trim().toUpperCase() 
        : item.node.textContent.trim();
        
      offCtx.fillText(textContent, x, y);
    });

    const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height).data;
    particles = [];
    
    // Create particles using 1px step for perfect text quality
    for (let y = 0; y < offCanvas.height; y += sampleStep * dpr) {
      for (let x = 0; x < offCanvas.width; x += sampleStep * dpr) {
        const i = (y * offCanvas.width + x) * 4;
        const alpha = imgData[i + 3];
        if (alpha > 30) {
          particles.push({
            x: x / dpr,
            y: y / dpr,
            baseX: x / dpr,
            baseY: y / dpr,
            vx: 0,
            vy: 0,
            color: `rgba(${imgData[i]}, ${imgData[i+1]}, ${imgData[i+2]}, ${alpha / 255})`,
            size: sampleStep
          });
        }
      }
    }
  }

  function onMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.hover = true;
  }

  function onMouseLeave() {
    mouse.hover = false;
    mouse.x = -1000;
    mouse.y = -1000;
  }

  window.addEventListener('resize', init);
  window.addEventListener('mousemove', onMouseMove);
  document.body.addEventListener('mouseleave', onMouseLeave);

  // Small delay to ensure layout is fully computed
  setTimeout(init, 200);

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);

    ctx.clearRect(0, 0, width, height);
    
    // Sync opacity with the actual title text so it properly hides during the entry gate and loading sequence
    const titleEl = document.querySelector('.landing-title');
    if (titleEl) {
      canvas.style.opacity = window.getComputedStyle(titleEl).opacity;
    }
    
    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];

      if (mouse.hover) {
        let dx = mouse.x - p.x;
        let dy = mouse.y - p.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < mouse.radius) {
          const force = (mouse.radius - distance) / mouse.radius;
          const angle = Math.atan2(dy, dx);
          p.vx -= Math.cos(angle) * force * 3;
          p.vy -= Math.sin(angle) * force * 3;
        }
      }

      p.vx += (p.baseX - p.x) * 0.08;
      p.vy += (p.baseY - p.y) * 0.08;
      p.vx *= 0.85;
      p.vy *= 0.85;
      p.x += p.vx;
      p.y += p.vy;

      ctx.fillStyle = p.color;
      // Drawing exactly 1px size ensures crisp, non-blocky text
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
  }

  animate();

  return {
    dispose() {
      running = false;
      window.removeEventListener('resize', init);
      window.removeEventListener('mousemove', onMouseMove);
      document.body.removeEventListener('mouseleave', onMouseLeave);
      canvas.remove();
      originalTexts.forEach(item => {
        item.parent.style.color = item.originalColor;
        item.parent.style.textShadow = item.originalTextShadow;
      });
    }
  };
}
