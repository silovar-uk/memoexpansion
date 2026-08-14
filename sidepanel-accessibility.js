(() => {
  'use strict';

  const SELECTOR = '.mode-menu-item, .popup-menu-item';

  function enhanceButtonLike(element) {
    if (!element || element.dataset.keyboardEnhanced === 'true') return;
    if (element instanceof HTMLButtonElement) return;
    if (element.hasAttribute('role') && element.hasAttribute('tabindex')) return;

    element.dataset.keyboardEnhanced = 'true';
    if (!element.hasAttribute('role')) element.setAttribute('role', 'button');
    if (!element.hasAttribute('tabindex')) element.tabIndex = 0;

    element.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (typeof element.onclick !== 'function') return;
      event.preventDefault();
      element.click();
    });
  }

  function enhanceInteractiveElements(root = document) {
    if (root instanceof Element && root.matches(SELECTOR)) enhanceButtonLike(root);
    root.querySelectorAll?.(SELECTOR).forEach(enhanceButtonLike);
  }

  document.addEventListener('DOMContentLoaded', () => enhanceInteractiveElements(), { once: true });

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) enhanceInteractiveElements(node);
      });
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
