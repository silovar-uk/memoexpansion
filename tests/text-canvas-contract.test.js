const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const editorCss = fs.readFileSync(path.join(root, 'sidepanel-editor.css'), 'utf8');
const maintenanceCss = fs.readFileSync(path.join(root, 'sidepanel-maintenance.css'), 'utf8');

assert(editorCss.includes('#editor:has(> .text-editor-area)'));
assert(editorCss.includes('box-sizing: border-box'));
assert(editorCss.includes('white-space: pre-wrap'));
assert(editorCss.includes('overflow-wrap: anywhere'));
assert(editorCss.includes('overflow-x: hidden'));
assert(editorCss.includes('overflow-y: auto'));
assert(editorCss.includes('scrollbar-width: thin'));
assert(editorCss.includes('.text-editor-area::-webkit-scrollbar-thumb'));
assert(editorCss.includes('#editor > .text-editor-area:focus-visible'));
assert(editorCss.includes('border-color: rgba(85,85,79,.12)'));
assert(editorCss.includes('.text-editor-area::selection'));
assert(!editorCss.includes('.text-editor-area {\n    width: 100%;\n    height: 100%;\n    border: none;'));

// v2.4.3 finishes focus ownership migration: the legacy dark frame is gone.
assert(!maintenanceCss.includes('.text-editor-area:focus-visible'));
assert(editorCss.indexOf('#editor > .text-editor-area:focus-visible') !== -1);

console.log('text-canvas-contract.test.js: 14/14 passed');
