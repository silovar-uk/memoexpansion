const assert = require('assert');
const metadata = require('../note-metadata-core.js');

assert.deepStrictEqual(metadata.extractUrls(''), []);
assert.deepStrictEqual(
  metadata.extractUrls('https://example.com\nhttps://github.com/test/repo'),
  ['https://example.com', 'https://github.com/test/repo']
);
assert.deepStrictEqual(metadata.extractUrls('C:\\Users\\M23WX0\\memo.docx'), []);
assert.deepStrictEqual(metadata.extractUrls('\\\\server\\folder\\memo.pdf'), []);
assert.deepStrictEqual(metadata.extractUrls('www.example.com'), []);
assert.deepStrictEqual(metadata.extractUrls('user@example.com'), []);
assert.deepStrictEqual(metadata.extractUrls('file:///C:/Users/example/memo.txt'), []);

assert.strictEqual(metadata.extractNonUrlText('https://example.com'), '');
assert.strictEqual(metadata.extractNonUrlText('参考\nhttps://example.com'), '参考');
assert.strictEqual(
  metadata.extractNonUrlText('参考\nhttps://example.com\n補足メモ'),
  '参考\n\n補足メモ'
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
