# MemoTool 2.1.0 更新内容

## 主な変更

- 赤太字行で Enter を押した際、新しい行にも赤太字状態を継承する処理をコアへ統合
- 行右端の三点リーダーを完全撤去
  - 文字／背景色パレット
  - 先頭へ移動／末尾へ移動
  - 単一項目コピー
  - 別タブへ移動
  - 右クリックからの同メニュー呼び出し
  - 上記専用のDOM生成・イベント・関数も削除
- フッターの三点リーダーを完全撤去
  - 最新データ再読み込み
  - クリップボードへコピー
  - TXT保存して閉じる
  - Markdown保存して閉じる
  - 上記専用のDOM・イベント・関数も削除
- 複数選択バーなど、三点メニュー外から使う既存機能は維持

## 内部改善

- Side Panelを `sidepanel.html` から直接起動する構成に変更し、bootstrapによるHTML書き換えを廃止
- `sidepanel.js` の責務を分割
  - `sidepanel.js` — 状態・データ・Undo/Redo
  - `sidepanel-tabs.js` — タブ・タブメニュー・行ジャンプ
  - `sidepanel-render.js` — アウトライナー描画
  - `sidepanel-selection.js` — 複数選択・ドラッグ移動
  - `sidepanel-input.js` — 入力・キーボード操作
  - `sidepanel-meta.js` — 完了・並び替え・日時・Item factory
  - `sidepanel-ui.js` — イベント初期化・同期・履歴UI
  - `sidepanel-model.js` — ID・データ正規化
  - `sidepanel-runtime.js` — 保存制御
  - `sidepanel-accessibility.js` — 動的UIのキーボード操作補強
- CSSを役割別ファイルに分割し、デザイントークンを一か所へ集約
- ID生成を `crypto.randomUUID()` 優先に統一
- Outliner Item生成を共通factory化し、欠落プロパティを正規化
- 保存を180ms debounce＋直列化＋スナップショット比較に変更し、保存中の追加入力でdirty状態が消える競合を防止
- `background.js` のサイドパネル接続管理を `Set` 化
- ユーザー入力を移動先メニューへ表示する際は `textContent` を使用
- `renderEditor()` の行追加を `DocumentFragment` でまとめ、DOM挿入後にサイズ計算
- `transition: all` を廃止
- `:focus-visible`、キーボード操作、タップ領域、`prefers-reduced-motion` を改善
- タブ／閉じるボタン／折り畳み／完了操作にARIAとキーボード操作を追加

## 更新方法

1. Chromeの `chrome://extensions/` を開く
2. デベロッパーモードをオン
3. 既存拡張機能のフォルダーを、このフォルダーの内容で置き換える
4. 拡張機能カードの「更新」ボタンを押す
5. サイドパネルを閉じて開き直す

## 検証

- `manifest.json` JSON検証
- 全JavaScriptの `node --check`
- 削除済み三点メニューのDOM ID・専用関数・CSS参照が残っていないことを確認
- `transition: all` が残っていないことを確認
- ユーザー由来のタブ名を `innerHTML` へ挿入するコードがないことを確認
- GitHub Actionsで完成版ZIPを自動生成
- Manifestバージョン: `2.1.0`
