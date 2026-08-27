const assert = require('assert');
const metadata = require('../note-metadata-core.js');

assert.deepStrictEqual(metadata.extractUrls(''), []);
assert.deepStrictEqual(
  metadata.extractUrls('https://example.com\nhttps://github.com/test/repo'),
  ['https://example.com', 'https://github.com/test/repo']
);

assert.strictEqual(metadata.classifyNote(''), 'empty');
assert.strictEqual(metadata.classifyNote('   \n  '), 'empty');
assert.strictEqual(metadata.classifyNote('https://example.com'), 'url-only');
assert.strictEqual(
  metadata.classifyNote('https://example.com\nhttps://github.com/test/repo'),
  'url-only'
);
assert.strictEqual(metadata.classifyNote('参考 https://example.com'), 'mixed');
assert.strictEqual(metadata.classifyNote('memo only'), 'mixed');

assert.strictEqual(metadata.isUrlOnlyNote('https://example.com  \n https://example.net'), true);
assert.strictEqual(metadata.isUrlOnlyNote('title\nhttps://example.com'), false);

assert.strictEqual(metadata.compactUrlLabel('https://example.com/'), 'example.com');
assert.ok(metadata.compactUrlLabel('https://example.com/a/b?x=1').startsWith('example.com/a/b'));

console.log('note metadata tests passed');
