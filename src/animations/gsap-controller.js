/* ═══════════════════════════════════════════════════════════════
   VISAGE · GSAP Interface Controller
   Page element reveals + mood word animation + status transitions.
   ═══════════════════════════════════════════════════════════════ */
import { gsap } from 'gsap';

/** Animate mood word character by character */
export function animateMoodWord(text) {
  const el = document.getElementById('mood-word');
  if (!el) return;

  el.innerHTML = text
    .split('')
    .map((ch) => `<span class="char">${ch}</span>`)
    .join('');
  el.classList.add('revealed');

  gsap.fromTo(
    el.querySelectorAll('.char'),
    { y: '100%', opacity: 0 },
    { y: '0%', opacity: 1, duration: 0.5, stagger: 0.04, ease: 'power3.out' }
  );
}

/** Set up MutationObserver on mood word for auto-animation */
export function initMoodWordObserver() {
  const el = document.getElementById('mood-word');
  if (!el) return;

  const observer = new MutationObserver(() => {
    const text = el.textContent.trim();
    if (text && text !== '—') {
      animateMoodWord(text);
    }
  });

  observer.observe(el, { childList: true, characterData: true, subtree: true });
}

/** Animate metric bars on reveal */
export function initMetricAnimations() {
  document.querySelectorAll('.metric').forEach((metric) => {
    const observer = new MutationObserver(() => {
      if (metric.classList.contains('revealed')) {
        gsap.fromTo(metric,
          { y: 6, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
        );
        observer.disconnect();
      }
    });
    observer.observe(metric, { attributes: true, attributeFilter: ['class'] });
  });
}

/** Detect button click feedback */
export function initButtonFeedback() {
  const btn = document.getElementById('detect-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    gsap.fromTo(btn,
      { scale: 0.98 },
      { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' }
    );
  });
}

/** Status pill state classes */
export function initStatusPillObserver() {
  const shell = document.querySelector('.shell');
  const pill = document.querySelector('.status-pill');
  if (!shell || !pill) return;

  const observer = new MutationObserver(() => {
    const state = shell.dataset.analysisState || 'awaiting';
    pill.classList.remove('state-processing', 'state-searching');
    if (state === 'analyzing') pill.classList.add('state-processing');
    else if (state === 'searching') pill.classList.add('state-searching');
  });

  observer.observe(shell, { attributes: true, attributeFilter: ['data-analysis-state'] });
}

/** Initialize all interface animations */
export function initInterfaceAnimations() {
  initMoodWordObserver();
  initMetricAnimations();
  initButtonFeedback();
  initStatusPillObserver();
}
