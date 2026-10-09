// Pure typography preferences. Independent of tabs, storage and DOM.
(function (root) {
  'use strict';
  const MIN = 12, MAX = 28, STEP = 2;
  const DEFAULT = Object.freeze({ fontSize: 14, outlinerLayout: 'compact' });
  function normalize(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT };
    const raw = value.fontSize;
    const fontSize = typeof raw === 'number' && Number.isFinite(raw)
      ? MIN + STEP * Math.round((Math.min(MAX, Math.max(MIN, raw)) - MIN) / STEP)
      : DEFAULT.fontSize;
    return { fontSize, outlinerLayout: value.outlinerLayout === 'wrap' ? 'wrap' : 'compact' };
  }
  function adjust(value, delta) {
    const current = normalize(value);
    return { ...current, fontSize: normalize({ fontSize: current.fontSize + delta }).fontSize };
  }
  const api = { MIN, MAX, STEP, DEFAULT, normalize, adjust };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MemoTypographyCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
