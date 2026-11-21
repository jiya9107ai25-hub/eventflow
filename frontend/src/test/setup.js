import '@testing-library/jest-dom/vitest';

// jsdom lacks matchMedia; components use it for theme & responsive layout.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
}

if (!document.getElementById('portal-root')) {
  const el = document.createElement('div');
  el.id = 'portal-root';
  document.body.appendChild(el);
}
