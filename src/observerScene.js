import { BASE_POS, BUILD_LEVELS, DAY_LENGTH_MS, GAME_HEIGHT, GAME_WIDTH, MAX_BASE_LEVEL, MIN_SCRAP_ON_MAP, SURVIVOR_PRESETS, TIME_PERIODS } from './constants.js';
import { BaseCamp } from './baseCamp.js';
import { ScrapManager } from './scrapManager.js';
import { Survivor } from './survivor.js';

export class ObserverScene extends Phaser.Scene {
  constructor() {
    super("ObserverScene");
    this.day = 1;
    this.scrap = 0;
    this.totalScrapCollected = 0;
    this.baseBuildProgress = 0;
    this.baseLevel = 1;
    this.speedMultiplier = 1;
    this.dayElapsed = 0;
    this.timePeriod = TIME_PERIODS[0];
    this.survivors = [];
    this.miloJoined = false;
  }

  preload() {
    this.load.image("wastelandBackground", "assets/background-post-apoc-01.png");
    for (let level = 1; level <= MAX_BASE_LEVEL; level += 1) {
      this.load.image(`baseLevel${level}`, `assets/base/${level}.png`);
    }
    Object.values(SURVIVOR_PRESETS).forEach((preset) => {
      this.load.image(preset.portraitKey, preset.portraitPath);
    });
  }

  create() {
    this.createWorld();
    this.base = new BaseCamp(this, BASE_POS.x, BASE_POS.y);
    this.scraps = new ScrapManager(this);
    this.scraps.ensureCount(MIN_SCRAP_ON_MAP);
    this.createHud();
    this.createControls();

    const ash = this.addSurvivor(SURVIVOR_PRESETS.ASH);
    ash.say("拠点で通信開始。", 1400);
  }

  update(time, delta) {
    this.updateTime(delta);
    this.updateLighting(time);
    this.survivors.forEach((survivor) => survivor.update(time, delta));
  }

  addSurvivor(config) {
    const survivor = new Survivor(this, config);
    this.survivors.push(survivor);
    survivor.beginLoop(config.id === "milo" ? 900 : 420);
    this.updateHud();
    return survivor;
  }

  sayBase(message, duration = 2400) {
    this.base.say(message, duration);
  }

  chooseNextTask(survivor) {
    survivor.chooseNextTask();
  }

  showBubble(survivor, text, duration = 2300) {
    survivor.say(text, duration);
  }

  updateBaseVisual() {
    this.base.updateBaseVisual();
  }

  showBuildEffect(survivor) {
    const g = this.add.graphics().setDepth(18);
    const x = survivor.buildPosition.x;
    const y = survivor.buildPosition.y;
    g.lineStyle(2, 0xe4d19a, 0.9);
    g.lineBetween(x - 12, y - 8, x - 2, y - 18);
    g.lineBetween(x - 5, y - 18, x + 2, y - 11);
    g.lineStyle(2, 0x9bd6bf, 0.75);
    g.strokeCircle(x + 14, y + 8, 7);
    this.tweens.add({
      targets: g,
      alpha: 0,
      y: -10,
      duration: 780,
      ease: "Cubic.easeOut",
      onComplete: () => g.destroy()
    });
  }

  isActiveSurvivor(id) {
    return this.survivors.some((survivor) => survivor.id === id);
  }

  updateTime(delta) {
    const previousKey = this.timePeriod.key;
    this.dayElapsed += delta * this.speedMultiplier;
    while (this.dayElapsed >= DAY_LENGTH_MS) {
      this.dayElapsed -= DAY_LENGTH_MS;
      this.day += 1;
    }
    this.timePeriod = this.getTimePeriod();
    if (this.timePeriod.key !== previousKey) {
      this.onTimePeriodChanged(this.timePeriod);
      this.updateHud();
    }
  }

  getTimePeriod() {
    const progress = this.dayElapsed / DAY_LENGTH_MS;
    let period = TIME_PERIODS[0];
    TIME_PERIODS.forEach((candidate) => {
      if (progress >= candidate.start) period = candidate;
    });
    return period;
  }

  isDarkPeriod() {
    return this.timePeriod.key === "night" || this.timePeriod.key === "midnight";
  }

  getScrapTargetCount() {
    const key = this.timePeriod.key;
    if (key === "midnight") return Math.max(4, MIN_SCRAP_ON_MAP - 2);
    if (key === "night") return Math.max(5, MIN_SCRAP_ON_MAP - 1);
    return MIN_SCRAP_ON_MAP;
  }

  onTimePeriodChanged(period) {
    if (period.key === "evening") this.sayBase("そろそろ暗くなる。", 2200);
    if (period.key === "night") this.sayBase("拠点の灯りを強める。", 2400);
    if (period.key === "midnight") this.sayBase("火を絶やすな。", 2400);
    if (period.key === "morning" && this.day > 1) this.sayBase("朝だ。", 1800);
  }

  updateLighting(time = 0) {
    if (!this.lightOverlay || !this.baseLight) return;
    const period = this.timePeriod;
    this.lightOverlay.clear();
    this.lightOverlay.fillStyle(period.tint, period.alpha);
    this.lightOverlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.baseLight.clear();
    const lightRadius = 92 + this.baseLevel * 10;
    const pulse = 1 + Math.sin(time / 480) * 0.05;
    this.baseLight.fillStyle(0xf2c46b, period.baseLight * 0.32);
    this.baseLight.fillCircle(BASE_POS.x, BASE_POS.y, lightRadius * pulse);
    this.baseLight.fillStyle(0xf2c46b, period.baseLight * 0.42);
    this.baseLight.fillCircle(BASE_POS.x, BASE_POS.y, lightRadius * 0.68 * pulse);
    this.baseLight.fillStyle(0xffd783, period.baseLight * 0.5);
    this.baseLight.fillCircle(BASE_POS.x, BASE_POS.y, lightRadius * 0.36 * pulse);
    if (period.key === "night" || period.key === "midnight") {
      if (this.baseLevel >= 4) {
        const blink = Math.sin(time / 240) > 0 ? 0.45 : 0.12;
        this.baseLight.fillStyle(0xbdefff, blink);
        this.baseLight.fillCircle(BASE_POS.x + 78, BASE_POS.y - 84, 28);
      }
      if (this.baseLevel >= 5) {
        const sweepX = BASE_POS.x - 108 + Math.sin(time / 900) * 28;
        this.baseLight.fillStyle(0xffdf8a, 0.2);
        this.baseLight.fillCircle(sweepX, BASE_POS.y - 87, 44);
      }
    }
  }

  applyTimeBehaviorModifier(survivor) {
    const key = this.timePeriod.key;
    const profile = survivor.personalityProfile || {};
    const curiosity = profile.curiosity ?? 0.5;
    const caution = profile.caution ?? 0.5;
    const builder = profile.builder ?? 0.5;
    const base = {
      exploreWeight: 1,
      buildWeight: 1,
      idleWeight: 1,
      distanceRisk: 1,
      explorePoolSize: 1 + Math.round(curiosity * 3),
      buildSpeed: 1,
      shouldReturn: false,
      wanderWeight: 1,
      thinkingWeight: 0,
      cautionExplorePenalty: 0.12
    };
    if (key === "evening") {
      base.exploreWeight = 0.92 - caution * 0.18 + curiosity * 0.08;
      base.buildWeight = 1.02 + builder * 0.28;
      base.distanceRisk = 1.08 + caution * 0.42 - curiosity * 0.16;
      base.explorePoolSize = Math.max(1, Math.round(1 + curiosity * 2));
      base.thinkingWeight = caution * 0.03;
    }
    if (key === "night") {
      base.exploreWeight = 0.66 + curiosity * 0.1 - caution * 0.45;
      base.buildWeight = 1.16 + builder * 0.62;
      base.idleWeight = 1.35;
      base.distanceRisk = 1.38 + caution * 1.15 - curiosity * 0.28;
      base.explorePoolSize = Math.max(1, Math.round(1 + curiosity));
      base.buildSpeed = 1.18;
      base.shouldReturn = Math.random() < Phaser.Math.Clamp(0.16 + caution * 0.58 - curiosity * 0.24, 0.08, 0.82);
      base.wanderWeight = 0.74 - caution * 0.28 + curiosity * 0.18;
      base.thinkingWeight = caution * 0.1;
      base.cautionExplorePenalty = 0.32;
    }
    if (key === "midnight") {
      base.exploreWeight = 0.42 + curiosity * 0.12 - caution * 0.5;
      base.buildWeight = 1.08 + builder * 0.55;
      base.idleWeight = 1.8;
      base.distanceRisk = 1.85 + caution * 1.65 - curiosity * 0.28;
      base.explorePoolSize = 1;
      base.buildSpeed = 1.35;
      base.shouldReturn = Math.random() < Phaser.Math.Clamp(0.3 + caution * 0.62 - curiosity * 0.22, 0.14, 0.94);
      base.wanderWeight = 0.48 - caution * 0.22 + curiosity * 0.12;
      base.thinkingWeight = caution * 0.16;
      base.cautionExplorePenalty = 0.42;
    }
    if (key === "morning") {
      base.exploreWeight = 1.15;
      base.buildWeight = 0.95;
    }
    return base;
  }

  getTimeBasedBubbleText(survivor, action, asList = false) {
    const key = this.timePeriod.key;
    const restless = survivor.name === "ASH";
    const common = {
      move: restless ? ["行く。", "見えた。", "遠くを見てくる。"] : ["近場から見よう。", "これは使えるかも。"],
      returning: restless ? ["戻る。", "急げば戻れる。"] : ["拠点へ戻ろう。", "無理はしない。"],
      idle: restless ? ["……。", "次はどこだ。", "まだ平気。"] : ["風が強いな。", "ここの柵、弱いな。", "何か聞こえた？"],
      rest: restless ? ["少し休む。", "足が重い。", "まだ平気。"] : ["少し休むね。", "火のそばにいる。", "今日は長いな。"],
      build: restless ? ["ここを直す。", "やる。", "使える部品だ。"] : ["先に直したい。", "柵を見ておく。", "少しマシにしよう。"],
      wander: restless ? ["少し見てくる。", "こっちか？", "何か落ちてないか。", "……。"] : ["少しだけ見ておく。", "火の近くを回る。", "足元、見ておこう。", "風が変だな。"],
      thinking: restless ? ["どうするかな。", "遠いな。", "……。"] : ["少し考える。", "先に戻るか。", "今はやめておくか。"],
      cancel: restless ? ["やっぱ戻る。", "今は違うな。", "嫌な感じがする。"] : ["遠すぎる。", "暗いな。", "無理はしない。"]
    };
    const night = {
      evening: {
        move: restless ? ["暗くなる前に戻る。", "少しだけ見てくる。"] : ["そろそろ引き返す。", "遠くは見えにくい。"],
        idle: ["今日は早いな。", "暗くなる前に戻る。"]
      },
      night: {
        move: restless ? ["まだ行ける。", "暗いな。"] : ["近場だけにする。", "夜はやめておこう。"],
        returning: restless ? ["戻る。", "拠点の灯りが見える。"] : ["火のそばにいる。", "無理はしない。"],
        idle: restless ? ["音が遠い。", "暗いな。"] : ["夜はやめておこう。", "柵を見ておく。"],
        rest: restless ? ["まだ行ける。", "少し休む。"] : ["火のそばにいる。", "無理はしない。"],
        wander: restless ? ["少しだけ見てくる。", "風が変だ。", "足跡？"] : ["火の近くだけ。", "柵を見ておく。", "暗いな。"],
        thinking: restless ? ["遠いな。", "暗いな。"] : ["今はやめておくか。", "先に戻るか。"],
        cancel: restless ? ["やっぱ戻る。", "嫌な感じがする。"] : ["暗い。", "遠すぎる。", "無理はしない。"]
      },
      midnight: {
        move: restless ? ["少しだけ見てくる。", "急げば戻れる。"] : ["朝まで待とう。", "近場だけにする。"],
        returning: ["静かすぎる。", "火を絶やすな。"],
        idle: restless ? ["嫌な感じがする。", "誰か起きてる？"] : ["朝まで待とう。", "火のそばにいる。"],
        rest: ["朝まで待とう。", "静かすぎる。"],
        build: restless ? ["火を絶やすな。", "ここを直す。"] : ["柵を見ておく。", "火のそばにいる。"],
        wander: restless ? ["少しだけ見てくる。", "足跡？", "……。"] : ["火のそばにいる。", "近場だけにする。"],
        thinking: restless ? ["どうするかな。", "嫌な感じがする。"] : ["朝まで待とう。", "今はやめておくか。"],
        cancel: restless ? ["やっぱ戻る。", "今は違うな。"] : ["暗い。", "朝まで待とう。"]
      }
    };
    const lines = night[key]?.[action] || common[action] || ["……。"];
    return asList ? lines : Phaser.Utils.Array.GetRandom(lines);
  }

  createWorld() {
    this.cameras.main.setBackgroundColor("#18160f");
    const g = this.add.graphics();

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "wastelandBackground")
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(-20);

    g.setDepth(-10);
    g.fillStyle(0x090806, 0.22);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 110; i += 1) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const alpha = Phaser.Math.FloatBetween(0.03, 0.09);
      g.fillStyle(Phaser.Utils.Array.GetRandom([0x6b5e45, 0x3a382f, 0x827150]), alpha);
      g.fillCircle(x, y, Phaser.Math.FloatBetween(0.6, 1.8));
    }

    g.lineStyle(1, 0xafa06f, 0.05);
    for (let i = 0; i < 13; i += 1) {
      const y = 90 + i * 44 + Phaser.Math.Between(-8, 8);
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= GAME_WIDTH; x += 80) {
        g.lineTo(x, y + Math.sin((x + i * 41) * 0.02) * 10);
      }
      g.strokePath();
    }

    g.lineStyle(1, 0xafa06f, 0.1);
    g.strokeRect(22, 22, GAME_WIDTH - 44, GAME_HEIGHT - 44);
    g.lineStyle(1, 0xafa06f, 0.06);
    g.strokeRect(52, 52, GAME_WIDTH - 104, GAME_HEIGHT - 104);

    this.baseLight = this.add.graphics().setDepth(21).setBlendMode(Phaser.BlendModes.ADD);
    this.lightOverlay = this.add.graphics().setDepth(20);
  }

  createHud() {
    this.hudPanel = this.add.graphics().setDepth(60);
    this.hudPanel.fillStyle(0x11100c, 0.72);
    this.hudPanel.fillRoundedRect(20, 18, 408, 45, 5);
    this.hudPanel.lineStyle(1, 0x655c48, 0.55);
    this.hudPanel.strokeRoundedRect(20, 18, 408, 45, 5);

    this.hudText = this.add.text(34, 32, "", {
      fontFamily: "Consolas, Courier New, monospace",
      fontSize: "14px",
      color: "#d8d0bd"
    }).setDepth(61);
    this.buildBar = this.add.graphics().setDepth(61);
    this.updateHud();

    this.titleText = this.add.text(GAME_WIDTH - 28, 24, "サバイバル観察プロトタイプ 01", {
      fontFamily: "Consolas, Courier New, monospace",
      fontSize: "15px",
      color: "#c7b98e"
    }).setOrigin(1, 0).setDepth(61);
  }

  createControls() {
    this.addButton(664, 664, 88, "資材追加", () => this.addScrap(1, "手動で資材を追加。"));
    this.addButton(762, 664, 64, "リセット", () => this.scene.restart());
    this.speedButton = this.addButton(838, 664, 88, "速度 x1", () => {
      this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1;
      this.speedButton.label.setText(`速度 x${this.speedMultiplier}`);
      this.sayBase(`観察速度 x${this.speedMultiplier}。`);
    });
  }

  addButton(x, y, width, label, onClick) {
    const box = this.add.rectangle(x, y, width, 30, 0x1d1b15, 0.92)
      .setStrokeStyle(1, 0x7b7057, 0.8)
      .setInteractive({ useHandCursor: true })
      .setDepth(60);
    const text = this.add.text(x, y, label, {
      fontFamily: "Consolas, Courier New, monospace",
      fontSize: "12px",
      color: "#d8d0bd"
    }).setOrigin(0.5).setDepth(61);

    box.on("pointerover", () => box.setFillStyle(0x2a271e, 0.95));
    box.on("pointerout", () => box.setFillStyle(0x1d1b15, 0.92));
    box.on("pointerdown", onClick);
    return { box, label: text };
  }

  addScrap(amount, message) {
    this.scrap += amount;
    this.totalScrapCollected += amount;
    if (message) this.sayBase(message);
    this.checkMiloJoin();
    this.updateHud();
  }

  consumeScrapForBuild(amount) {
    if (this.scrap < amount) return false;
    this.scrap -= amount;
    this.baseBuildProgress += amount;
    this.checkBaseLevel();
    this.updateHud();
    return true;
  }

  checkMiloJoin() {
    if (this.miloJoined || this.totalScrapCollected < 5) return;
    this.miloJoined = true;
    this.sayBase("新しい信号を検出。");
    const milo = this.addSurvivor(SURVIVOR_PRESETS.MILO);
    milo.say("...誰か聞こえる？", 2600);
    this.time.delayedCall(900 / this.speedMultiplier, () => {
      this.sayBase("MILO が拠点に加入。");
    });
  }

  checkBaseLevel() {
    let nextLevel = 1;
    BUILD_LEVELS.forEach((threshold, index) => {
      if (this.baseBuildProgress >= threshold) nextLevel = index + 1;
    });

    if (nextLevel > this.baseLevel) {
      this.baseLevel = nextLevel;
      this.base.setLevel(nextLevel);
      this.sayBase(`構造物を Lv ${nextLevel} に強化。`);
      if (nextLevel >= 3) {
        this.time.delayedCall(900 / this.speedMultiplier, () => this.sayBase("外周を拡張。"));
      }
    }
  }

  updateHud() {
    const survivorCount = this.survivors ? this.survivors.length : 0;
    this.hudText.setText(`日数 ${this.day} ${this.timePeriod.label}   資材 ${this.scrap}   拠点Lv ${this.baseLevel}   生存者 ${survivorCount}`);
    this.drawBuildProgress();
  }

  drawBuildProgress() {
    if (!this.buildBar) return;
    const g = this.buildBar;
    const nextThreshold = BUILD_LEVELS[this.baseLevel] || BUILD_LEVELS[BUILD_LEVELS.length - 1];
    const prevThreshold = BUILD_LEVELS[this.baseLevel - 1] || 0;
    const span = Math.max(1, nextThreshold - prevThreshold);
    const progress = this.baseLevel >= MAX_BASE_LEVEL ? 1 : Phaser.Math.Clamp((this.baseBuildProgress - prevThreshold) / span, 0, 1);
    g.clear();
    g.fillStyle(0x1b1a14, 0.86);
    g.fillRoundedRect(34, 52, 190, 5, 2);
    g.fillStyle(0xe4d19a, 0.82);
    g.fillRoundedRect(34, 52, 190 * progress, 5, 2);
  }

  clockLabel() {
    const elapsed = Math.floor(this.time.now / 1000);
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const seconds = String(elapsed % 60).padStart(2, "0");
    return `${this.day}日目 ${minutes}:${seconds}`;
  }
}
