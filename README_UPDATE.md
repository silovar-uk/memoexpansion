# MemoTool 2.1.0 更新内容

## 主な変更

- 太字（赤太字）行で Enter を押した際、新しい行にも太字状態を継承
- 行右端の三点リーダーと、その配下にあったカラー・先頭移動・末尾移動・コピー・別タブ移動UIを撤去
- フッターの三点リーダーと、その配下にあった再読み込み・コピー・TXT/Markdown保存UIを撤去
- Itemデータの標準形を共通化し、欠落プロパティを保存前・読込後に正規化
- ID生成を `crypto.randomUUID()` 優先に統一
- 保存処理を短いdebounce＋直列化にし、連続入力時のstorage書き込みを整理
- バックグラウンドのサイドパネル接続管理を `Set` 化
- ユーザー入力を使う移動先メニューを `textContent` ベースに変更
- CSSの最終デザイントークンを外部メンテナンスCSSへ集約
- `transition: all` の影響を上書きし、必要なプロパティだけをアニメーション
- `:focus-visible`、タップ領域、`prefers-reduced-motion` を追加
- 太字修正専用の `sidepanel-enter-fix.js` を廃止し、保守モジュールへ統合

## 内部構成

- `sidepanel.js` — 既存コア（互換性維持のため大規模改変を回避）
- `sidepanel-model.js` — ID・Item正規化
- `sidepanel-runtime.js` — 保存制御・入力挙動
- `sidepanel-ui-cleanup.js` — 三点メニュー撤去・安全なUI生成
- `sidepanel-maintenance.css` — デザイントークン・focus・motion・hit area

## 更新方法

1. Chromeの `chrome://extensions/` を開く
2. デベロッパーモードをオン
3. 既存拡張機能のフォルダーを、このフォルダーの内容で置き換える
4. 拡張機能カードの「更新」ボタンを押す
5. サイドパネルを閉じて開き直す

## 検証

- JavaScript構文チェック
- manifest.json JSON検証
- bootstrap参照チェック
- 削除済み `sidepanel-enter-fix.js` の参照なしを確認
- Manifestバージョン: `2.1.0`
