export function showToast(message, duration = 2000) {
  const toast = Object.assign(document.createElement('div'), {
    textContent: message,
    className: 'gswv-toast',
    role: 'status',
    'aria-live': 'polite',
  });

  document.body.appendChild(toast);

  // Kick‑off slide‑in on next paint
  requestAnimationFrame(() => toast.classList.add('open'));

  // Schedule fade‑out after requested duration
  setTimeout(() => {
    toast.classList.remove('open');
    toast.addEventListener(
      'transitionend',
      () => toast.remove(),
      { once: true }
    );
  }, duration);
}

