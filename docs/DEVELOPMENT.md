# Development Notes

このメモは、次回以降に `main.js` を毎回ゼロから読み解かなくて済むようにするための地図です。

## 全体構造

`main.js` は単一ファイル構成です。おおまかな並びは次の通りです。

- 定数: 画面サイズ、拠点位置、建築レベル、1日の長さ、時間帯、状態ラベル。
- `SURVIVOR_PRESETS`: `ASH` / `MILO` の性格、速度、画像、行動傾向。
- `SCRAP_TYPES`: マップ上に出る素材種別。
- `BaseCamp`: 拠点の描画、レベルアップ演出、拠点吹き出し。
- `ScrapManager`: スクラップの生成、予約、削除、探索対象選択、描画。
- `SpeechBubble`: キャラや拠点の吹き出し表示。
- `Survivor`: 生存者AI、移動、回収、建築、休憩、ポートレート表示。
- `ObserverScene`: Phaser scene。ワールド生成、時間進行、光、HUD、操作ボタン、ゲーム進行。
- `config`: Phaser 起動設定。

## よく触る場所

- キャラ性能や初期位置: `SURVIVOR_PRESETS`
- 素材の種類や価値: `SCRAP_TYPES`
- 昼夜の長さ: `DAY_LENGTH_MS`
- 時間帯の切り替わり、色味、暗さ: `TIME_PERIODS`
- 時間帯ごとの行動補正: `ObserverScene.applyTimeBehaviorModifier`
- 吹き出し文言: `Survivor.log`, `Survivor.scrapLine`, `ObserverScene.getTimeBasedBubbleText`
- 拠点レベル条件: `BUILD_LEVELS`
- HUD 表示: `ObserverScene.createHud`, `ObserverScene.updateHud`
- 操作ボタン: `ObserverScene.createControls`

## 行動ループ

生存者は `Survivor.beginLoop()` から `chooseNextTask()` に入り、以下のように状態遷移します。

1. エネルギーが低ければ `goRest()`
2. 建築可能なら確率で `goBuild()`
3. スクラップがあれば `search()`
4. 何もしない場合は `idleAroundBase()`

探索時は `ScrapManager.chooseFor()` が候補を選び、`reserve()` で他キャラとの取り合いを避けています。回収後は `returning` になり、拠点へ戻ると `deliver()` で所持スクラップを加算します。

## 時間帯の影響

時間帯は `ObserverScene.updateTime()` で進み、`getTimePeriod()` が現在の `TIME_PERIODS` を返します。

時間帯が変わると次に影響します。

- `updateLighting()`: 画面の暗さ、拠点ライト、夜間ライト。
- `applyTimeBehaviorModifier()`: 探索しやすさ、建築しやすさ、帰還判断、探索対象距離のリスク。
- `getScrapTargetCount()`: 夜と深夜はマップ上の最低スクラップ数が少し減ります。
- `getTimeBasedBubbleText()`: 時間帯別のセリフ。

## 既知の注意点

- 日本語テキストが文字化けした状態で入っている箇所があります。表示文言を整理する時は、まとめて UTF-8 の日本語に直すのがよさそうです。
- `main.js` が大きくなっているため、機能追加が続くなら将来的に `BaseCamp`、`Survivor`、`ScrapManager`、`ObserverScene` を分割すると追いやすくなります。
- 現在はビルドツールやテストがないため、変更後はブラウザで見た目とコンソールエラーを確認するのが主な検証です。
- `main.js` には未コミット変更があります。既存変更を前提に作業し、不要な巻き戻しはしないでください。

## 確認コマンド

```powershell
python -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開き、次を確認します。

- 起動時にコンソールエラーがない。
- ASH が表示され、自律行動する。
- スクラップ追加、リセット、速度切り替えボタンが反応する。
- 昼夜で画面の明るさと行動傾向が変わる。

## ドキュメント更新ルール

重要な実装変更を行った場合は、このメモも同じ作業内で更新してください。次回の調査コストを下げるため、コードだけでなく「どこを見ればよいか」「何が変わったか」を短く残します。

更新対象の目安:

- 新しいクラス、責務、主要関数を追加または分割した。
- 生存者AI、状態遷移、資源、建築、時間帯、HUD、操作系の仕様を変えた。
- 起動方法、外部ライブラリ、アセット配置、検証方法が変わった。
- 既知の注意点が解消された、または新しい注意点が増えた。

軽微な見た目や一時的な数値調整は必須ではありません。ただし、次回以降の実装判断に影響する変更は必ず反映してください。
