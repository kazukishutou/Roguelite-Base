const GAME_WIDTH = 960;
const GAME_HEIGHT = 720;
const BASE_POS = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
const BUILD_LEVELS = [0, 3, 7, 12, 18];
const MIN_SCRAP_ON_MAP = 6;
const DAY_LENGTH_MS = 150000;
const TIME_PERIODS = [
  { key: "morning", label: "朝", start: 0, tint: 0xfff0c8, alpha: 0.06, baseLight: 0.08 },
  { key: "day", label: "昼", start: 0.2, tint: 0xffffff, alpha: 0.0, baseLight: 0.04 },
  { key: "evening", label: "夕方", start: 0.42, tint: 0x8f4f32, alpha: 0.18, baseLight: 0.16 },
  { key: "night", label: "夜", start: 0.62, tint: 0x020814, alpha: 0.48, baseLight: 0.42 },
  { key: "midnight", label: "深夜", start: 0.82, tint: 0x01030a, alpha: 0.64, baseLight: 0.58 }
];

const STATE_LABELS = {
  idle: "待機中",
  searching: "探索中",
  movingToScrap: "移動中",
  movingToBuild: "整備へ",
  scavenging: "回収中",
  returning: "帰還中",
  resting: "休憩中",
  building: "整備中"
};

const SURVIVOR_PRESETS = {
  ASH: {
    id: "ash",
    name: "ASH",
    portraitKey: "portraitAsh",
    portraitPath: "assets/character_female/chara_f_64.png",
    personality: "restless",
    speed: 92,
    homeOffsetX: -62,
    homeOffsetY: -36,
    color: 0x9bd6bf,
    portraitColor: 0x455a56,
    routeColor: 0x91aaa0,
    restMs: 760,
    searchMs: 470,
    energyDrain: 1.25,
    buildChance: 0.16,
    idleChance: 0.18
  },
  MILO: {
    id: "milo",
    name: "MILO",
    portraitKey: "portraitMilo",
    portraitPath: "assets/character_male/chara_m_23.png",
    personality: "careful",
    speed: 72,
    homeOffsetX: 72,
    homeOffsetY: 46,
    color: 0xe2c26c,
    portraitColor: 0x5b5244,
    routeColor: 0xd2bc75,
    restMs: 1250,
    searchMs: 700,
    energyDrain: 0.85,
    buildChance: 0.42,
    idleChance: 0.28
  }
};

const SCRAP_TYPES = [
  { name: "木材", color: 0x9a7b4f, value: 1 },
  { name: "金属片", color: 0x8f9690, value: 1 },
  { name: "布", color: 0x6f7f78, value: 1 },
  { name: "電子部品", color: 0x7f9ca0, value: 1 },
  { name: "謎の箱", color: 0x9a8b68, value: 2 }
];

class BaseCamp {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.level = 1;
    this.graphics = scene.add.graphics();
    this.pulse = scene.add.graphics();
    this.speech = new SpeechBubble(scene, () => ({ x: this.x, y: this.y - 114 }), 0xe4d19a);
    this.label = scene.add.text(x, y + 82, "拠点 Lv 1", {
      fontFamily: "Consolas, Courier New, monospace",
      fontSize: "13px",
      color: "#d8d0bd",
      backgroundColor: "rgba(20,18,14,0.55)",
      padding: { x: 5, y: 2 }
    }).setOrigin(0.5);
    this.draw();
  }

  say(message, duration = 2400) {
    this.speech.say(message, duration);
  }

  setLevel(level) {
    if (level === this.level) return;
    this.level = level;
    this.label.setText(`拠点 Lv ${level}`);
    this.updateBaseVisual();
    this.playUpgradePulse();
  }

  playUpgradePulse() {
    const ring = this.pulse;
    ring.clear();
    ring.setAlpha(1);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 780,
      ease: "Cubic.easeOut",
      onUpdate: (tween) => {
        const value = tween.getValue();
        ring.clear();
        ring.lineStyle(3, 0xf3d66b, 0.72 * (1 - value));
        ring.strokeCircle(this.x, this.y, 92 + value * 92);
        ring.lineStyle(1, 0xf3d66b, 0.35 * (1 - value));
        ring.strokeCircle(this.x, this.y, 54 + value * 78);
      },
      onComplete: () => ring.clear()
    });
  }

  updateBaseVisual() {
    this.draw();
  }

  draw() {
    const g = this.graphics;
    g.clear();

    g.lineStyle(2, 0x5f5848, 0.52);
    g.strokeCircle(this.x, this.y, 80 + this.level * 4);
    g.lineStyle(1, 0x948568, 0.2);
    g.strokeCircle(this.x, this.y, 106 + this.level * 5);

    this.drawFire(g);
    this.drawCrates(g);

    if (this.level >= 2) this.drawTent(g);
    if (this.level >= 3) this.drawFence(g);
    if (this.level >= 4) this.drawAntenna(g);
    if (this.level >= 5) this.drawWatchLight(g);
  }

  drawFire(g) {
    g.fillStyle(0x2a2119, 1);
    g.fillCircle(this.x - 12, this.y + 10, 19);
    g.fillStyle(0xffa13a, 0.9);
    g.fillTriangle(this.x - 23, this.y + 16, this.x - 12, this.y - 19, this.x - 2, this.y + 16);
    g.fillStyle(0xffd27a, 0.85);
    g.fillTriangle(this.x - 18, this.y + 14, this.x - 11, this.y - 8, this.x - 6, this.y + 14);
    g.lineStyle(2, 0x5a3c24, 1);
    g.lineBetween(this.x - 32, this.y + 23, this.x + 2, this.y + 13);
    g.lineBetween(this.x - 29, this.y + 10, this.x + 5, this.y + 24);
  }

  drawCrates(g) {
    g.fillStyle(0x6d5a3f, 1);
    g.fillRect(this.x + 15, this.y + 12, 36, 25);
    g.fillStyle(0x927b57, 1);
    g.fillRect(this.x + 20, this.y + 6, 25, 18);
    g.lineStyle(1, 0x332b21, 0.85);
    g.strokeRect(this.x + 15, this.y + 12, 36, 25);
    g.strokeRect(this.x + 20, this.y + 6, 25, 18);
  }

  drawTent(g) {
    g.fillStyle(0x3f574d, 1);
    g.fillTriangle(this.x - 78, this.y + 35, this.x - 36, this.y - 42, this.x + 5, this.y + 35);
    g.fillStyle(0x2f4039, 1);
    g.fillTriangle(this.x - 36, this.y - 42, this.x + 5, this.y + 35, this.x + 38, this.y + 35);
    g.lineStyle(2, 0xb0a077, 0.75);
    g.lineBetween(this.x - 36, this.y - 42, this.x - 78, this.y + 35);
    g.lineBetween(this.x - 36, this.y - 42, this.x + 38, this.y + 35);
    g.fillStyle(0x1d2522, 1);
    g.fillTriangle(this.x - 39, this.y + 35, this.x - 21, this.y + 0, this.x - 4, this.y + 35);
  }

  drawFence(g) {
    g.lineStyle(4, 0x6a5338, 0.95);
    const posts = [
      [-106, -62], [-106, 62], [106, -62], [106, 62],
      [-58, -94], [58, -94], [-58, 94], [58, 94]
    ];
    posts.forEach(([px, py]) => {
      g.lineBetween(this.x + px, this.y + py - 12, this.x + px, this.y + py + 12);
    });
    g.lineStyle(2, 0x8f714b, 0.78);
    g.lineBetween(this.x - 108, this.y - 60, this.x - 60, this.y - 92);
    g.lineBetween(this.x + 60, this.y - 92, this.x + 108, this.y - 60);
    g.lineBetween(this.x - 108, this.y + 60, this.x - 60, this.y + 92);
    g.lineBetween(this.x + 60, this.y + 92, this.x + 108, this.y + 60);
  }

  drawAntenna(g) {
    g.lineStyle(3, 0x9b9b8d, 1);
    g.lineBetween(this.x + 78, this.y + 44, this.x + 78, this.y - 84);
    g.lineStyle(2, 0x9b9b8d, 0.85);
    g.lineBetween(this.x + 78, this.y - 46, this.x + 49, this.y - 16);
    g.lineBetween(this.x + 78, this.y - 46, this.x + 107, this.y - 16);
    g.lineBetween(this.x + 78, this.y - 84, this.x + 52, this.y - 105);
    g.lineBetween(this.x + 78, this.y - 84, this.x + 104, this.y - 105);
    g.fillStyle(0xbdd7cf, 0.95);
    g.fillCircle(this.x + 78, this.y - 84, 4);
  }

  drawWatchLight(g) {
    g.fillStyle(0x4c4639, 1);
    g.fillRect(this.x - 122, this.y - 92, 28, 46);
    g.lineStyle(2, 0x9b8a63, 0.9);
    g.strokeRect(this.x - 124, this.y - 94, 32, 13);
    g.lineBetween(this.x - 122, this.y - 46, this.x - 132, this.y - 24);
    g.lineBetween(this.x - 94, this.y - 46, this.x - 84, this.y - 24);
    g.fillStyle(0xf3d66b, 0.95);
    g.fillCircle(this.x - 108, this.y - 87, 6);
    g.fillCircle(this.x + 105, this.y + 68, 7);
    g.fillStyle(0xf3d66b, 0.1);
    g.fillCircle(this.x - 108, this.y - 87, 42);
    g.fillCircle(this.x + 105, this.y + 68, 44);
  }
}

class ScrapManager {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.graphics = scene.add.graphics();
  }

  ensureCount(count) {
    while (this.items.length < count) {
      this.items.push(this.createItem());
    }
    this.draw();
  }

  createItem() {
    let x;
    let y;
    do {
      x = Phaser.Math.Between(88, GAME_WIDTH - 88);
      y = Phaser.Math.Between(100, GAME_HEIGHT - 108);
    } while (Phaser.Math.Distance.Between(x, y, BASE_POS.x, BASE_POS.y) < 155);

    const type = Phaser.Utils.Array.GetRandom(SCRAP_TYPES);
    return {
      id: Phaser.Math.RND.uuid(),
      x,
      y,
      rot: Phaser.Math.FloatBetween(-0.6, 0.6),
      type: type.name,
      value: type.name === "謎の箱" && Math.random() < 0.45 ? 2 : type.value,
      color: type.color,
      reservedBy: null
    };
  }

  getById(id) {
    return this.items.find((item) => item.id === id) || null;
  }

  reserve(item, survivorId) {
    if (!item || item.reservedBy) return false;
    item.reservedBy = survivorId;
    this.draw();
    return true;
  }

  releaseBySurvivor(survivorId) {
    this.items.forEach((item) => {
      if (item.reservedBy === survivorId) item.reservedBy = null;
    });
    this.draw();
  }

  removeById(id) {
    this.items = this.items.filter((item) => item.id !== id);
    this.ensureCount(MIN_SCRAP_ON_MAP);
  }

  chooseFor(survivor) {
    const candidates = this.items.filter((item) => !item.reservedBy);
    if (candidates.length === 0) return null;
    const timeMod = this.scene.applyTimeBehaviorModifier(survivor);

    const scored = candidates
      .map((item) => {
        const distance = Phaser.Math.Distance.Between(survivor.x, survivor.y, item.x, item.y);
        const randomWeight = survivor.personality === "restless" ? 210 : 44;
        const score = distance * timeMod.distanceRisk + Phaser.Math.FloatBetween(-randomWeight, randomWeight);
        return { item, score };
      })
      .sort((a, b) => a.score - b.score);

    const poolSizeBase = survivor.personality === "restless" ? 3 : 2;
    const poolSize = Math.min(timeMod.explorePoolSize || poolSizeBase, scored.length);
    return Phaser.Utils.Array.GetRandom(scored.slice(0, poolSize)).item;
  }

  draw() {
    const g = this.graphics;
    g.clear();
    this.items.forEach((item) => {
      g.save();
      g.translateCanvas(item.x, item.y);
      g.rotateCanvas(item.rot);
      g.fillStyle(0x0c0b09, 0.42);
      g.fillRect(-7, 7, 20, 9);
      g.fillStyle(item.color, item.reservedBy ? 0.58 : 1);
      g.fillRect(-9, -7, 18, 14);
      g.fillStyle(0x342e25, 0.9);
      g.fillRect(-4, -4, 12, 4);
      g.lineStyle(1, item.reservedBy ? 0xe2c26c : 0xc2b48d, item.reservedBy ? 0.72 : 0.35);
      g.strokeRect(-9, -7, 18, 14);
      g.restore();
    });
  }
}

class SpeechBubble {
  constructor(scene, getAnchor, color = 0xd8d0bd) {
    this.scene = scene;
    this.getAnchor = getAnchor;
    this.color = color;
    this.visible = false;
    this.hideTimer = null;
    this.tween = null;

    this.graphics = scene.add.graphics().setDepth(50).setVisible(false);
    this.text = scene.add.text(0, 0, "", {
      fontFamily: "Consolas, Courier New, monospace",
      fontSize: "12px",
      color: "#f1ead8",
      wordWrap: { width: 210 },
      lineSpacing: 2
    }).setDepth(51).setVisible(false);

    scene.events.on("update", this.update, this);
  }

  say(message, duration = 2300) {
    if (this.hideTimer) this.hideTimer.remove(false);
    if (this.tween) this.tween.stop();

    this.text.setText(message);
    this.visible = true;
    this.graphics.setVisible(true).setAlpha(1);
    this.text.setVisible(true).setAlpha(1);
    this.update();

    this.hideTimer = this.scene.time.delayedCall(duration / this.scene.speedMultiplier, () => {
      this.tween = this.scene.tweens.add({
        targets: [this.graphics, this.text],
        alpha: 0,
        duration: 280,
        onComplete: () => {
          this.visible = false;
          this.graphics.setVisible(false);
          this.text.setVisible(false);
        }
      });
    });
  }

  update() {
    if (!this.visible) return;

    const anchor = this.getAnchor();
    const padding = 8;
    const width = Math.min(232, Math.max(72, this.text.width + padding * 2));
    const height = this.text.height + padding * 2;
    const x = Phaser.Math.Clamp(anchor.x - width / 2, 24, GAME_WIDTH - width - 24);
    const y = Phaser.Math.Clamp(anchor.y - height - 22, 74, GAME_HEIGHT - height - 24);
    const tailX = Phaser.Math.Clamp(anchor.x, x + 14, x + width - 14);
    const tailY = y + height;

    this.graphics.clear();
    this.graphics.fillStyle(0x10100d, 0.86);
    this.graphics.fillRoundedRect(x, y, width, height, 5);
    this.graphics.fillTriangle(tailX - 7, tailY - 1, tailX + 7, tailY - 1, anchor.x, anchor.y - 8);
    this.graphics.lineStyle(1, this.color, 0.82);
    this.graphics.strokeRoundedRect(x, y, width, height, 5);

    this.text.setPosition(x + padding, y + padding);
  }
}

class Survivor {
  constructor(scene, config) {
    this.scene = scene;
    this.id = config.id;
    this.name = config.name;
    this.x = BASE_POS.x + config.homeOffsetX;
    this.y = BASE_POS.y + config.homeOffsetY;
    this.state = "idle";
    this.energy = 100;
    this.mood = "calm";
    this.currentTask = "idle";
    this.taskTimer = 0;
    this.targetScrapId = null;
    this.target = null;
    this.carrying = false;
    this.carryingValue = 0;
    this.carryingType = null;
    this.speed = config.speed;
    this.homeOffsetX = config.homeOffsetX;
    this.homeOffsetY = config.homeOffsetY;
    this.personality = config.personality;
    this.color = config.color;
    this.portraitKey = config.portraitKey;
    this.portraitColor = config.portraitColor;
    this.routeColor = config.routeColor;
    this.restMs = config.restMs;
    this.searchMs = config.searchMs;
    this.energyDrain = config.energyDrain;
    this.buildChance = config.buildChance;
    this.idleChance = config.idleChance;
    this.homePosition = {
      x: BASE_POS.x + config.homeOffsetX,
      y: BASE_POS.y + config.homeOffsetY
    };
    this.buildPosition = {
      x: BASE_POS.x - config.homeOffsetX * 0.45,
      y: BASE_POS.y + config.homeOffsetY * 0.35
    };
    this.lastBubbleAt = 0;

    this.light = scene.add.graphics().setDepth(22);
    this.route = scene.add.graphics().setDepth(10);
    this.marker = scene.add.graphics().setDepth(23);
    this.speech = new SpeechBubble(scene, () => ({ x: this.x, y: this.y - 94 }), this.color);
    this.portraitImage = scene.add.image(this.x - 34, this.y - 47, this.portraitKey)
      .setDisplaySize(64, 64)
      .setDepth(24);
    this.nameText = scene.add.text(this.x, this.y - 44, this.name, {
      fontFamily: "Consolas, Courier New, monospace",
      fontSize: "12px",
      color: "#f0dfaa",
      backgroundColor: "rgba(10,9,7,0.68)",
      padding: { x: 4, y: 1 }
    }).setOrigin(0.5);
    this.nameText.setDepth(25);
    this.stateText = scene.add.text(this.x, this.y + 20, STATE_LABELS.idle, {
      fontFamily: "Consolas, Courier New, monospace",
      fontSize: "11px",
      color: "#d5e6dc",
      backgroundColor: "rgba(10,9,7,0.62)",
      padding: { x: 4, y: 1 }
    }).setOrigin(0.5);
    this.stateText.setDepth(25);
    this.updateVisuals(0);
  }

  beginLoop(delay = 420) {
    window.setTimeout(() => {
      if (this.scene.isActiveSurvivor(this.id)) this.chooseNextTask();
    }, delay / this.scene.speedMultiplier);
  }

  setState(state) {
    this.state = state;
    this.currentTask = state;
    this.stateText.setText(STATE_LABELS[state] || state);
  }

  log(event) {
    const lines = {
      ASH: {
        move: "行く。",
        secured: "取った。",
        returning: "帰還する。",
        delivered: "資材を納品 +1。"
      },
      MILO: {
        move: "近場から見よう。",
        scavenge: "ちょっと調べてみる。",
        secured: "まだ使えるかもしれない。",
        returning: "拠点に持ち帰るよ。",
        delivered: "資材を置いておいた +1。"
      }
    };
    this.say(lines[this.name]?.[event] || event);
  }

  say(message, duration = 2300) {
    if (this.scene.time.now - this.lastBubbleAt < 1100) return;
    this.lastBubbleAt = this.scene.time.now;
    this.speech.say(message, duration);
  }

  update(time, delta) {
    if (this.state === "movingToScrap" || this.state === "movingToBuild" || this.state === "returning") {
      this.moveToward(delta);
    }
    if (this.state === "scavenging" || this.state === "building" || this.state === "resting") {
      this.taskTimer += delta * this.scene.speedMultiplier;
    }
    this.updateVisuals(time);
  }

  chooseNextTask() {
    if (!this.scene.isActiveSurvivor(this.id)) return;

    this.scene.scraps.releaseBySurvivor(this.id);
    this.targetScrapId = null;
    this.target = null;

    if (this.energy < 26) {
      this.goRest();
      return;
    }

    const canBuild = this.scene.scrap >= 2 && this.scene.baseLevel < 5;
    const stockBonus = this.scene.scrap >= 5 ? 0.18 : 0;
    const buildChance = canBuild ? this.buildChance + stockBonus + (this.energy < 55 ? 0.12 : 0) : 0;
    if (canBuild && Math.random() < buildChance) {
      this.goBuild();
      return;
    }

    const hasScrap = this.scene.scraps.items.some((item) => !item.reservedBy);
    if (hasScrap && Math.random() > this.idleChance) {
      this.search();
      return;
    }

    this.idleAroundBase();
  }

  search() {
    this.setState("searching");
    this.scene.scraps.releaseBySurvivor(this.id);
    this.targetScrapId = null;

    this.scene.time.delayedCall(this.searchMs / this.scene.speedMultiplier, () => {
      if (!this.scene.isActiveSurvivor(this.id)) return;
      const target = this.scene.scraps.chooseFor(this);
      if (!target || !this.scene.scraps.reserve(target, this.id)) {
        this.goRest();
        return;
      }
      this.targetScrapId = target.id;
      this.target = target;
      this.setState("movingToScrap");
      this.log("move");
    });
  }

  idleAroundBase() {
    this.setState("idle");
    const lines = this.name === "ASH"
      ? ["……。", "次はどこだ。", "遠くを見てくる。", "まだ平気。"]
      : ["風が強いな。", "ここの柵、弱いな。", "無理はしない。", "何か聞こえた？"];
    if (Math.random() < 0.72) this.say(Phaser.Utils.Array.GetRandom(lines), 1800);
    this.scene.time.delayedCall(Phaser.Math.Between(700, 1400) / this.scene.speedMultiplier, () => this.chooseNextTask());
  }

  moveToward(delta) {
    const destination = this.getDestination();
    if (!destination) {
      this.search();
      return;
    }

    const distance = Phaser.Math.Distance.Between(this.x, this.y, destination.x, destination.y);
    const step = this.speed * this.scene.speedMultiplier * (delta / 1000);

    if (distance <= step) {
      this.x = destination.x;
      this.y = destination.y;
      if (this.state === "movingToScrap") this.scavenge();
      if (this.state === "movingToBuild") this.build();
      if (this.state === "returning") this.deliver();
      return;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, destination.x, destination.y);
    this.x += Math.cos(angle) * step;
    this.y += Math.sin(angle) * step;
    this.energy = Phaser.Math.Clamp(this.energy - this.energyDrain * (delta / 1000), 0, 100);
  }

  getDestination() {
    if (this.state === "returning") {
      return this.homePosition;
    }
    if (this.state === "movingToBuild") return this.buildPosition;
    return this.scene.scraps.getById(this.targetScrapId);
  }

  scavenge() {
    const target = this.scene.scraps.getById(this.targetScrapId);
    if (!target) {
      this.search();
      return;
    }

    this.setState("scavenging");
    if (this.name === "MILO") this.log("scavenge");
    this.scene.time.delayedCall(1000 / this.scene.speedMultiplier, () => {
      if (!this.scene.isActiveSurvivor(this.id)) return;
      const currentTarget = this.scene.scraps.getById(this.targetScrapId);
      if (!currentTarget) {
        this.search();
        return;
      }
      this.carryingValue = currentTarget.value;
      this.carryingType = currentTarget.type;
      this.scene.scraps.removeById(this.targetScrapId);
      this.targetScrapId = null;
      this.carrying = true;
      this.energy = Phaser.Math.Clamp(this.energy - 7 * this.energyDrain, 0, 100);
      if (Math.random() < 0.7) this.say(this.scrapLine(this.carryingType));
      this.log("secured");
      this.setState("returning");
      this.log("returning");
    });
  }

  deliver() {
    if (this.carrying) {
      this.carrying = false;
      const amount = this.carryingValue || 1;
      this.log("delivered");
      this.scene.addScrap(amount);
      this.carryingValue = 0;
      this.carryingType = null;
    }
    if (this.energy < 42 || Math.random() < 0.3) this.goRest();
    else this.scene.time.delayedCall(320 / this.scene.speedMultiplier, () => this.chooseNextTask());
  }

  scrapLine(type) {
    const ashLines = {
      木材: "木材だ。",
      金属片: "金属片。",
      布: "布か。",
      電子部品: "見えた。",
      謎の箱: "変な箱だ。"
    };
    const miloLines = {
      木材: "木材が使えそう。",
      金属片: "これは使えるかも。",
      布: "布が残ってる。",
      電子部品: "電子部品だ。",
      謎の箱: "変な箱だな。"
    };
    return (this.name === "ASH" ? ashLines : miloLines)[type] || "使えそう。";
  }

  goRest() {
    this.scene.scraps.releaseBySurvivor(this.id);
    this.targetScrapId = null;
    this.target = this.homePosition;
    this.setState("resting");
    const lines = this.name === "ASH"
      ? ["少し休む。", "足が重い。", "まだ平気。"]
      : ["少し休むね。", "火のそばにいる。", "今日は長いな。", "ここは静かだ。"];
    this.say(Phaser.Utils.Array.GetRandom(lines), 2200);
    this.scene.time.delayedCall(this.restMs / this.scene.speedMultiplier, () => {
      if (!this.scene.isActiveSurvivor(this.id)) return;
      this.energy = Phaser.Math.Clamp(this.energy + (this.name === "ASH" ? 44 : 58), 0, 100);
      this.setState("idle");
      this.scene.time.delayedCall(360 / this.scene.speedMultiplier, () => this.chooseNextTask());
    });
  }

  goBuild() {
    this.target = this.buildPosition;
    this.setState("movingToBuild");
    const lines = this.name === "ASH"
      ? ["ここを直す。", "やる。", "使える部品だ。"]
      : ["先に直したい。", "ここの柵、弱いな。", "少しマシにしよう。"];
    this.say(Phaser.Utils.Array.GetRandom(lines), 2100);
  }

  build() {
    if (this.scene.scrap < 1) {
      this.chooseNextTask();
      return;
    }
    this.setState("building");
    this.taskTimer = 0;
    this.scene.showBuildEffect(this);
    this.scene.time.delayedCall((this.name === "MILO" ? 2300 : 2700) / this.scene.speedMultiplier, () => {
      if (!this.scene.isActiveSurvivor(this.id)) return;
      if (this.scene.consumeScrapForBuild(1)) {
        this.energy = Phaser.Math.Clamp(this.energy - (this.name === "ASH" ? 16 : 10), 0, 100);
        const lines = this.name === "ASH"
          ? ["少しマシになった。", "次。"]
          : ["少しマシになった。", "アンテナを立てたい。", "使える部品だ。"];
        this.say(Phaser.Utils.Array.GetRandom(lines), 2200);
      }
      if (this.energy < 30) this.goRest();
      else this.scene.time.delayedCall(420 / this.scene.speedMultiplier, () => this.chooseNextTask());
    });
  }

  updateVisuals(time = 0) {
    this.nameText.setPosition(this.x - 4, this.y - 92);
    this.stateText.setPosition(this.x + 8, this.y + 28);
    this.portraitImage.setPosition(this.x - 34, this.y - 47);
    this.drawRoute();
    this.drawMarker(time);
  }

  drawRoute() {
    const g = this.route;
    g.clear();
    const destination = this.getDestination();
    if (!destination || (this.state !== "movingToScrap" && this.state !== "movingToBuild" && this.state !== "returning")) return;

    g.lineStyle(1, this.state === "returning" ? 0xe2c26c : this.routeColor, 0.38);
    const segments = 22;
    for (let i = 0; i < segments; i += 2) {
      const start = i / segments;
      const end = (i + 1) / segments;
      g.lineBetween(
        Phaser.Math.Linear(this.x, destination.x, start),
        Phaser.Math.Linear(this.y, destination.y, start),
        Phaser.Math.Linear(this.x, destination.x, end),
        Phaser.Math.Linear(this.y, destination.y, end)
      );
    }
  }

  drawMarker(time) {
    const g = this.marker;
    const pulse = 1 + Math.sin(time / 180 + this.homeOffsetX) * 0.12;
    g.clear();

    g.fillStyle(0x090908, 0.68);
    g.fillRoundedRect(this.x - 72, this.y - 83, 88, 88, 7);
    g.lineStyle(1, this.color, 0.82);
    g.strokeRoundedRect(this.x - 72, this.y - 83, 88, 88, 7);
    g.fillStyle(this.portraitColor, 0.65);
    g.fillRect(this.x - 66, this.y - 77, 64, 64);

    g.fillStyle(0x0b0d0c, 0.72);
    g.fillCircle(this.x, this.y, 13 * pulse);
    const blink = this.state === "scavenging" ? 0.45 + Math.sin(time / 70) * 0.35 : 0.9;
    const restGlow = this.state === "resting" ? 1 + Math.sin(time / 260) * 0.08 : 1;
    g.lineStyle(2, this.color, blink);
    g.strokeCircle(this.x, this.y, 11 * pulse * restGlow);
    g.fillStyle(this.state === "returning" ? 0xe6c15f : this.color, 1);
    g.fillCircle(this.x, this.y, 5);
    if (this.state === "building") {
      g.lineStyle(2, 0xe4d19a, 0.85);
      g.lineBetween(this.x + 14, this.y - 12, this.x + 24, this.y - 22);
      g.lineBetween(this.x + 21, this.y - 22, this.x + 27, this.y - 16);
      g.fillStyle(0xe4d19a, 0.8);
      g.fillCircle(this.x + 13, this.y - 10, 3);
    }
    g.lineStyle(1, this.color, 0.38);
    g.lineBetween(this.x - 18, this.y, this.x - 8, this.y);
    g.lineBetween(this.x + 8, this.y, this.x + 18, this.y);
    g.lineBetween(this.x, this.y - 18, this.x, this.y - 8);
    g.lineBetween(this.x, this.y + 8, this.x, this.y + 18);
  }
}

class ObserverScene extends Phaser.Scene {
  constructor() {
    super("ObserverScene");
    this.day = 1;
    this.scrap = 0;
    this.totalScrapCollected = 0;
    this.baseBuildProgress = 0;
    this.baseLevel = 1;
    this.speedMultiplier = 1;
    this.survivors = [];
    this.miloJoined = false;
  }

  preload() {
    this.load.image("wastelandBackground", "assets/background-post-apoc-01.png");
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
  }

  createHud() {
    this.hudPanel = this.add.graphics();
    this.hudPanel.fillStyle(0x11100c, 0.72);
    this.hudPanel.fillRoundedRect(20, 18, 328, 45, 5);
    this.hudPanel.lineStyle(1, 0x655c48, 0.55);
    this.hudPanel.strokeRoundedRect(20, 18, 328, 45, 5);

    this.hudText = this.add.text(34, 32, "", {
      fontFamily: "Consolas, Courier New, monospace",
      fontSize: "14px",
      color: "#d8d0bd"
    });
    this.buildBar = this.add.graphics();
    this.updateHud();

    this.titleText = this.add.text(GAME_WIDTH - 28, 24, "サバイバル観察プロトタイプ 01", {
      fontFamily: "Consolas, Courier New, monospace",
      fontSize: "15px",
      color: "#c7b98e"
    }).setOrigin(1, 0);
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
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: "Consolas, Courier New, monospace",
      fontSize: "12px",
      color: "#d8d0bd"
    }).setOrigin(0.5);

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
    this.hudText.setText(`日数 ${this.day}   資材 ${this.scrap}   拠点Lv ${this.baseLevel}   生存者 ${survivorCount}`);
    this.drawBuildProgress();
  }

  drawBuildProgress() {
    if (!this.buildBar) return;
    const g = this.buildBar;
    const nextThreshold = BUILD_LEVELS[this.baseLevel] || BUILD_LEVELS[BUILD_LEVELS.length - 1];
    const prevThreshold = BUILD_LEVELS[this.baseLevel - 1] || 0;
    const span = Math.max(1, nextThreshold - prevThreshold);
    const progress = this.baseLevel >= 5 ? 1 : Phaser.Math.Clamp((this.baseBuildProgress - prevThreshold) / span, 0, 1);
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

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#18160f",
  pixelArt: false,
  audio: {
    noAudio: true
  },
  scene: ObserverScene,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
