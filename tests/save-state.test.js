'use strict';

const assert = require('node:assert/strict');
const SaveState = require('../save-state.js');

const tabs = [{ id: 'a', title: 'A', items: [{ id: '1', text: 'hello' }] }];

const snapshot = SaveState.createSnapshot(tabs, 'a');
assert.equal(snapshot.activeTabId, 'a');
assert.equal(snapshot.tabsJSON, JSON.stringify(tabs));
assert.equal(SaveState.matchesSnapshot(snapshot, tabs, 'a'), true);
assert.equal(SaveState.stateAfterPersist(snapshot, tabs, 'a'), 'saved');

assert.equal(SaveState.matchesSnapshot(snapshot, tabs, 'b'), false, 'active tab changes during a write must keep state dirty');
assert.equal(SaveState.stateAfterPersist(snapshot, tabs, 'b'), 'dirty');

const editedTabs = JSON.parse(JSON.stringify(tabs));
editedTabs[0].items[0].text = 'newer input';
assert.equal(SaveState.matchesSnapshot(snapshot, editedTabs, 'a'), false, 'input changes during a write must keep state dirty');

const empty = SaveState.createSnapshot([], null);
assert.equal(SaveState.matchesSnapshot(empty, [], null), true);

console.log('4/4 save-state tests passed');
