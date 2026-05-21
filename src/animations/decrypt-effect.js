/**
 * VISAGE · Decryption Effect
 * Scrambles text by default and decrypts it into readable English when hovered.
 */

export function initDecryptEffect() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+<>?/[]{}';
  
  document.querySelectorAll('.gallery-card').forEach(card => {
    const textEls = card.querySelectorAll('.encrypt-text');
    
    // Store original text and scramble initially
    textEls.forEach(el => {
      el.dataset.original = el.textContent;
      el.textContent = scramble(el.textContent);
    });

    // Decrypt on hover
    card.addEventListener('mouseenter', () => {
      textEls.forEach(el => decrypt(el, el.dataset.original));
    });

    // Scramble on mouse leave
    card.addEventListener('mouseleave', () => {
      textEls.forEach(el => {
        if (el.dataset.intervalId) clearInterval(el.dataset.intervalId);
        el.textContent = scramble(el.dataset.original);
      });
    });
  });

  function scramble(text) {
    return text.split('').map(char => {
      if (char === ' ') return ' ';
      if (char === '.' || char === ',') return char; // Preserve punctuation
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
  }

  function decrypt(el, originalText) {
    if (el.dataset.intervalId) clearInterval(el.dataset.intervalId);
    
    let iterations = 0;
    const maxIterations = 15; // Controls the speed of the effect
    const charsPerStep = Math.max(1, originalText.length / maxIterations);
    
    el.dataset.intervalId = setInterval(() => {
      el.textContent = originalText.split('').map((char, index) => {
        // Reveal the original character if we've passed its index
        if (index < iterations) return char;
        // Skip spaces and punctuation
        if (char === ' ' || char === '.' || char === ',') return char;
        // Otherwise, keep it scrambled
        return chars[Math.floor(Math.random() * chars.length)];
      }).join('');
      
      iterations += charsPerStep;
      
      if (iterations >= originalText.length) {
        clearInterval(el.dataset.intervalId);
        el.textContent = originalText;
      }
    }, 30);
  }
}
