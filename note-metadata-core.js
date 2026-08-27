(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MemoNoteMetadata = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeNote(note) {
    return typeof note === 'string' ? note : '';
  }

  function extractUrls(note) {
    const matches = normalizeNote(note).match(/https?:\/\/[^\s]+/g);
    return matches || [];
  }

  function extractNonUrlText(note) {
    return normalizeNote(note)
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function isUrlOnlyNote(note) {
    const text = normalizeNote(note).trim();
    if (!text) return false;
    const urls = extractUrls(text);
    if (urls.length === 0) return false;
    return extractNonUrlText(text) === '';
  }

  function classifyNote(note) {
    const text = normalizeNote(note).trim();
    if (!text) return 'empty';
    return isUrlOnlyNote(text) ? 'url-only' : 'mixed';
  }

  function compactUrlLabel(url) {
    try {
      const parsed = new URL(url);
      const path = `${parsed.pathname || ''}${parsed.search || ''}${parsed.hash || ''}`;
      const suffix = path === '/' ? '' : path;
      const label = `${parsed.hostname}${suffix}`;
      return label.length > 42 ? `${label.slice(0, 39)}...` : label;
    } catch (_) {
      const label = normalizeNote(url).replace(/^https?:\/\//, '');
      return label.length > 42 ? `${label.slice(0, 39)}...` : label;
    }
  }

  return {
    extractUrls,
    extractNonUrlText,
    isUrlOnlyNote,
    classifyNote,
    compactUrlLabel
  };
});
