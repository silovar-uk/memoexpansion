(async () => {
  const response = await fetch(chrome.runtime.getURL('sidepanel.html'));
  if (!response.ok) throw new Error(`sidepanel.html load failed: ${response.status}`);

  const html = await response.text();
  const mainScript = '<script src="sidepanel.js"></script>';
  const headClose = '</head>';

  if (!html.includes(mainScript)) throw new Error('sidepanel.js script tag not found');
  if (!html.includes(headClose)) throw new Error('head closing tag not found');

  const withMaintenanceStyle = html.replace(
    headClose,
    '  <link rel="stylesheet" href="sidepanel-maintenance.css">\n</head>'
  );

  const maintenanceScripts = [
    '<script src="sidepanel-model.js"></script>',
    '<script src="sidepanel-runtime.js"></script>',
    '<script src="sidepanel-ui-cleanup.js"></script>'
  ].join('\n');

  const patchedHtml = withMaintenanceStyle.replace(
    mainScript,
    `${mainScript}\n${maintenanceScripts}`
  );

  document.open();
  document.write(patchedHtml);
  document.close();
})().catch((error) => {
  console.error('MemoTool bootstrap failed', error);
  document.body.textContent = 'MemoTool の読み込みに失敗しました。拡張機能を再読み込みしてください。';
});
