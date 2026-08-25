# MemoTool v2.4.3 — UI Architecture Cleanup

## 2026/08/25

- 見た目・保存・Outliner・Navigationの挙動は変えず、CSSの最終ownerを整理
- Editor viewport / line-number padding / Text Mode focusを `sidepanel-editor.css` へ集約
- FooterのCool Precision presentationを `sidepanel-components.css` へ集約
- persistent tab presentationは `sidepanel-shell.css` に一本化し、components / maintenanceの重複ruleを削除
- `sidepanel-maintenance.css` から `#editor` / footer / Text focus / generic tab chromeの上書きを除去
- `tests/ui-architecture-contract.test.js` を追加し、ownershipの逆戻りをGitHub Actionsで防止

# MemoTool v2.4.2 — Cool Precision

## 2026/08/25

- legacyな大きいEditor下余白を18pxのbreathing roomへ縮小し、利用可能な高さを編集面へ返却
- ShellとFooterを薄いCool Neutralで統一し、Text Canvas本文面は白のまま維持
- active tabを低彩度blue-gray indicatorへ変更し、装飾量ではなく線と面差で精密感を付与
- `tests/cool-precision-contract.test.js` を追加し、高さ・色温度・Text Canvas非回帰を固定

# MemoTool v2.4.1 — Quiet Text Canvas

## 2026/08/25

- テキストモードをフォーム風textareaではなく、文章そのものを直接編集するText Canvasとして再調整
- `box-sizing: border-box` と `pre-wrap` + `overflow-wrap:anywhere` を明示し、通常文章・長いURL・連続英数字がSide Panel幅内で自然に折り返すよう変更
- Text Modeではtextarea自身を単一の縦スクロール面にし、外側editorとの二重スクロールを回避
- 横スクロールは通常のText Mode操作から外し、縦スクロールバーだけを細く・透明track・低彩度thumbで維持
- クリック／focus時に出ていた濃い2px枠を、非常に薄いneutral focus cueへ変更
- selection・caret・placeholderもQuiet UIの色階層へ統一
- `.text-editor-area` にscopeし、Outlinerの `.item-input` / `.item-note` のfocus・overflow挙動には変更を加えない
- `tests/text-canvas-contract.test.js` を追加し、wrap・overflow・scrollbar・focusの契約をGitHub Actionsで固定

# MemoTool v2.4.0 — Navigation Confidence

## 2026/08/25

- タブ右端に小さな検索ボタンを追加し、`Alt+Q` でもQuick Switchを開けるように変更
- タブ名をNFKC正規化＋部分一致で検索。AI検索・曖昧ランキング・最近使った順は導入しない
- 空検索では既存タブ順を維持し、現在タブを初期選択
- ↑↓で候補移動、Enterで切替、Escで閉じるキーボード操作を追加
- 実際のタブ切替は既存 `switchTab()` を再利用し、保存・activeTabId契約を二重実装しない
- Quick Switchは新しいstorage keyや履歴stateを作らず、一時的な検索query/selectionだけを保持
- `tab-navigation-core.js` にpure検索ロジックを分離し、8件のcore testを追加
- `sidepanel-navigation.js/css` と10件の静的Navigation contract testを追加

# MemoTool v2.3.0 — Save Confidence

## 2026/08/25

- タブ切替だけでも `activeTabId` をdirty扱いにし、再起動後の復帰先が古いままになる経路を修正
- 保存snapshotを `tabs + activeTabId` の組として `save-state.js` で契約化
- 保存中の追加入力／タブ切替で新しい状態がdirtyのまま再保存されることをpure testで固定
- `sidepanel-runtime.js` の保存を180ms debounce＋直列化のまま整理し、dirtyでない空状態の無駄な定期保存を停止
- footerに保存状態DOMを復活。通常の「保存済み」は非表示、`未保存 / 保存中 / 保存エラー` のときだけ表示
- `visibilitychange` / `pagehide` のbest-effort flushを維持
- Save Confidence用のpure testと静的contract testをGitHub Actionsへ追加

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
