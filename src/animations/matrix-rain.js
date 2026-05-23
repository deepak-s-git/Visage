export function initMatrixRain(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return { start: () => {}, stop: () => {} };

  const ctx = canvas.getContext('2d');
  
  // Set canvas to full window size
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  
  window.addEventListener('resize', resize);
  resize();

  // Matrix characters (Katakana + Latin + Numerics)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ'.split('');
  
  const fontSize = 16;
  let columns = canvas.width / fontSize;
  
  // Array of drops - one per column
  const drops = [];
  for (let x = 0; x < columns; x++) {
    // Start drops at random negative Y positions so they fall in at different times
    drops[x] = (Math.random() * -100);
  }

  let animationFrame;
  let isRunning = false;

  const draw = () => {
    // Black background with slight opacity to create fading tails
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = fontSize + 'px monospace';
    
    // Loop over drops
    for (let i = 0; i < drops.length; i++) {
      // Pick a random character
      const text = chars[Math.floor(Math.random() * chars.length)];
      
      // Determine color
      // Head of the drop is white, tail is deep crimson red
      const isHead = Math.random() > 0.9;
      ctx.fillStyle = isHead ? '#fff' : '#f00'; 
      if (!isHead && Math.random() > 0.8) {
          ctx.fillStyle = '#f33'; // Slightly brighter red randomly
      }
      
      // Draw the character
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);
      
      // Reset drop to top randomly when it hits bottom
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      
      // Move drop down
      drops[i]++;
    }
    
    if (isRunning) {
      animationFrame = requestAnimationFrame(draw);
    }
  };

  return {
    start: () => {
      if (!isRunning) {
        isRunning = true;
        // Recalculate columns in case window resized while stopped
        columns = canvas.width / fontSize;
        while(drops.length < columns) drops.push(Math.random() * -100);
        draw();
      }
    },
    stop: () => {
      isRunning = false;
      if (animationFrame) cancelAnimationFrame(animationFrame);
    }
  };
}
