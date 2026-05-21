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
      if (n.textContent.trim().length > 0 && n.parentElement !== canvas && n.parentElement.closest('.landing-title')) {
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
          // Randomize Z multiplier so some particles fly closer/faster
          const zMultiplier = (Math.random() * 2.5) - 0.5; // -0.5 to 2.0
          
          particles.push({
            x: x / dpr,
            y: y / dpr,
            baseX: x / dpr,
            baseY: y / dpr,
            vx: 0,
            vy: 0,
            r: imgData[i],
            g: imgData[i+1],
            b: imgData[i+2],
            baseAlpha: alpha / 255,
            zMult: zMultiplier,
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
    
    // Sync base opacity with the actual title text (for fading during loader)
    const titleEl = document.querySelector('.landing-title');
    let baseSceneOpacity = 1;
    if (titleEl) {
      baseSceneOpacity = parseFloat(window.getComputedStyle(titleEl).opacity);
      canvas.style.opacity = baseSceneOpacity;
    }

    // Read local landing section progress (0 to 1) for the initial explosion trigger
    let landingProgress = window._landingSectionProgress || 0;
    
    // We want the explosion to start ONLY AFTER the subtexts fade out (which finishes at 0.3)
    // So the explosion starts ramping up from 0.4 to 1.0
    let explosionProgress = Math.max(0, (landingProgress - 0.4) / 0.6);
    
    // Read global scroll progress to drive the deep 3D flying effect later
    let globalScrollP = window._visageTitleScrollProgress || 0;
    
    // Ramp up the effect intensity aggressively as they scroll down.
    let scrollIntensity = Math.min(1, explosionProgress + (globalScrollP * 3.0));
    
    // Smooth easing for a cinematic transition
    scrollIntensity = scrollIntensity * scrollIntensity * (3 - 2 * scrollIntensity);

    const cx = width / 2;
    const cy = height / 2;
    
    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];

      // Calculate the target resting position. If scrolling, push it out in 3D!
      let targetX = p.baseX;
      let targetY = p.baseY;
      let targetSize = p.size;
      let targetAlpha = p.baseAlpha;
      
      if (scrollIntensity > 0) {
        // Z-depth simulation: Particles scale and separate based on their zMult
        const depth = 1 + (scrollIntensity * 12 * Math.max(0.1, p.zMult + 1));
        
        // Push outward radially from the center of the screen
        const dxCenter = p.baseX - cx;
        const dyCenter = p.baseY - cy;
        
        targetX = cx + (dxCenter * depth);
        targetY = cy + (dyCenter * depth);
        
        // Scale size slightly to simulate approaching camera
        targetSize = p.size * (1 + (scrollIntensity * 3 * Math.max(0, p.zMult)));
        
        // Fade out completely as they pass the camera
        targetAlpha = p.baseAlpha * Math.max(0, 1 - (scrollIntensity * 1.2));
      }

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

      // Apply mouse-driven velocity with friction
      p.vx *= 0.82;
      p.vy *= 0.82;
      p.x += p.vx;
      p.y += p.vy;

      // Smoothly interpolate (lerp) toward the target position
      // This prevents violent rubber-band bouncing when scrolling very fast
      p.x += (targetX - p.x) * 0.12;
      p.y += (targetY - p.y) * 0.12;

      // Draw particle
      ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${targetAlpha})`;
      ctx.fillRect(p.x, p.y, targetSize, targetSize);
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
