# MemoTool v2.2.0 — Quiet Shell

## 2026/08/25

- 専用の `memo tool / 起動中` ヘッダー段を廃止し、タブを最上段へ移動
- 行番号・★ソート・新規メモをタブ右端のContextual Utilityへ統合
- 行番号と★ソートはアウトライナー時だけ表示し、テキストメモでは自動的に退避
- 複数Side Panelの警告は通常時には表示せず、2つ以上起動した時だけ小さな警告として表示
- `sidepanel-shell.css/js` をShellの正式ownerとして追加し、編集・保存・タブCRUD・アウトライナー構造とは責務を分離
- 既存のAlt+A、タブ操作、アウトライナー、Undo/Redo、全体コピー、保存構造は変更しない
- Quiet Shellの静的契約テストを追加

# v2.1.7 Baseline & Contract

- v2.1.6 を canonical baseline として正本化
- 完了アーカイブ・サブツリー境界・子判定を `outliner-structure.js` の pure helper へ集約
- `CURRENT_BEHAVIOR.md` で壊してはいけない挙動を契約化
- `CSS_OWNERSHIP.md` でCSSの正式責務と `sidepanel-maintenance.css` の扱いを明文化
- `tests/outliner-structure.test.js` を追加し、GitHub Actionsで構造契約を検証
- UIの見た目・ALT+A・保存方式はv2.1.6から変更しない

# v2.1.6 UI refinement

- 選択行の青い面表現をやめ、ニュートラル背景＋細い左マーカーへ変更
- キーボードフォーカスを青リングからニュートラルな高コントラスト表示へ変更
- 日時ラベルを行内レイアウトから外し、本文と操作の重なりを解消（日時は行ツールチップで確認）
- タブの高さ変化・シャドウを撤去し、固定高さ＋細い下線でactiveを表現
- ヘッダー／選択バー／メニュー／行ジャンプの青依存を減らし、アクセント用途を限定
- 狭幅Side Panel向けに余白・タブ幅・操作列を微調整
- 非編集中の長文を極端に縮小せず、10pxを可読下限として必要時はツールチップで全文確認
- 選択バー文言を「◯件選択／解除／移動」に統一

# v2.1.5 更新内容

- 完了項目をアクティブなアウトライナー構造から末尾へ退避し、表示上の行と内部構造を一致させました。
- 親子判定は `depth` 基準のまま、完了項目を折りたたみ判定から完全に除外しました。
- 親項目の上下移動は子孫を含むサブツリー単位で動き、完了済み項目を「見えない隣接行」として数えないよう修正しました。
- 旧データに途中挿入された完了項目があっても、読み込み・保存時に自動で末尾アーカイブへ正規化します。

# v2.1.4 update

- ALT+AをSide Panelのトグル操作に変更（閉→開、開→閉）
- 開くときは現在のメモと前回カーソル位置へ復帰
- Chrome 142+ の `sidePanel.onClosed` / `close()` を使用

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

## v2.1.3 (2026-08-17)

- ALT+A を `_execute_action` ではなく専用 `open-memo-panel` コマンドへ変更。
- `chrome.commands.onCommand` のユーザージェスチャー内で `chrome.sidePanel.open()` を最初に直接呼ぶよう修正。
- パネルが開いている場合は現在のメモへフォーカスし、閉じている場合も起動後にフォーカス要求を引き継ぐ。
- ZIPファイル名にバージョンを含める運用へ変更。
