(async () => {
  const response = await fetch(chrome.runtime.getURL('sidepanel.html'));
  if (!response.ok) throw new Error(`sidepanel.html load failed: ${response.status}`);

  const html = await response.text();
  const mainScript = '<script src="sidepanel.js"></script>';
  if (!html.includes(mainScript)) throw new Error('sidepanel.js script tag not found');

  const patchedHtml = html.replace(
    mainScript,
    `${mainScript}\n<script src="sidepanel-enter-fix.js"></script>`
  );

  document.open();
  document.write(patchedHtml);
  document.close();
})().catch((error) => {
  console.error('MemoTool bootstrap failed', error);
  document.body.textContent = 'MemoTool の読み込みに失敗しました。拡張機能を再読み込みしてください。';
});
