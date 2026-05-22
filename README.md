# Roguelite Base

Phaser 3 で動く、拠点観察型の小さなローグライト試作です。
現在はビルド工程なしで、`index.html` と `main.js` をブラウザで読み込む構成です。

## 起動

CDN から Phaser を読むため、ローカルサーバー経由で開くのが安定です。

```powershell
python -m http.server 8000
```

その後、ブラウザで `http://localhost:8000/` を開きます。

## ファイル構成

- `index.html`: 画面枠、Phaser CDN、`main.js` の読み込み。
- `main.js`: ゲーム本体。定数、拠点、スクラップ、生存者AI、HUD、Phaser scene が入っています。
- `assets/background-post-apoc-01.png`: 背景画像。
- `assets/character_female/`, `assets/character_male/`: 生存者ポートレート候補。
- `survival-observer-*-check.png`: 見た目確認用のスクリーンショット。

## 現状の主要仕様

- 画面サイズは `960 x 720` 固定で、Phaser の `Scale.FIT` で表示領域に合わせています。
- 1日は `DAY_LENGTH_MS` で管理され、朝、昼、夕方、夜、深夜の時間帯があります。
- 生存者は探索、回収、帰還、休憩、拠点建築を自律的に選びます。
- スクラップを集めると拠点強化が進み、一定数集めると `MILO` が参加します。

## 次に触る時の注意

詳しい編集メモは [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) を見てください。

## ドキュメント更新ルール

今後のコーディングで重要な更新があった場合は、実装変更と同じタイミングで関連する Markdown も更新してください。

- 起動方法、ファイル構成、依存関係が変わったら `README.md` を更新する。
- ゲーム仕様、主要クラス、状態遷移、時間帯処理、調整値の意味が変わったら `docs/DEVELOPMENT.md` を更新する。
- 毎回の軽微な数値調整までは不要。ただし、次回の実装判断に影響する変更は残す。
