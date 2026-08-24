(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MemoOutlinerStructure = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function archiveCompletedItems(items) {
    if (!Array.isArray(items) || items.length <= 1) return false;

    const active = [];
    const completed = [];
    let completedSeen = false;
    let needsReorder = false;

    for (const item of items) {
      if (item?.completed) {
        completedSeen = true;
        completed.push(item);
      } else {
        if (completedSeen) needsReorder = true;
        active.push(item);
      }
    }

    if (!needsReorder) return false;
    items.splice(0, items.length, ...active, ...completed);
    return true;
  }

  function getSubtreeCount(items, index) {
    const target = Array.isArray(items) ? items[index] : null;
    if (!target || target.completed) return 0;

    const targetDepth = Number(target.depth) || 0;
    let count = 1;
    for (let i = index + 1; i < items.length; i++) {
      const candidate = items[i];
      if (candidate?.completed) break;
      if ((Number(candidate?.depth) || 0) > targetDepth) count += 1;
      else break;
    }
    return count;
  }

  function hasActiveChildren(items, index) {
    const target = Array.isArray(items) ? items[index] : null;
    if (!target || target.completed) return false;

    const targetDepth = Number(target.depth) || 0;
    for (let i = index + 1; i < items.length; i++) {
      const candidate = items[i];
      if (candidate?.completed) continue;
      const depth = Number(candidate?.depth) || 0;
      if (depth <= targetDepth) return false;
      return true;
    }
    return false;
  }

  function isCompletedArchiveNormalized(items) {
    if (!Array.isArray(items)) return true;
    let completedSeen = false;
    for (const item of items) {
      if (item?.completed) completedSeen = true;
      else if (completedSeen) return false;
    }
    return true;
  }

  return Object.freeze({
    archiveCompletedItems,
    getSubtreeCount,
    hasActiveChildren,
    isCompletedArchiveNormalized
  });
});
