import { BASE_POS, GAME_HEIGHT, GAME_WIDTH, MAX_BASE_LEVEL, STATE_LABELS } from './constants.js';
import { SpeechBubble } from './speechBubble.js';

export class Survivor {
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
    this.personalityProfile = { ...(config.personalityProfile || {}) };
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
    this.lastBubbleTime = 0;
    this.bubbleOffsetX = config.id === "ash" ? -8 : 12;
    this.wanderNoticeAt = 0;

    this.light = scene.add.graphics().setDepth(22);
    this.route = scene.add.graphics().setDepth(10);
    this.marker = scene.add.graphics().setDepth(23);
    this.speech = new SpeechBubble(scene, () => ({ x: this.x + this.bubbleOffsetX, y: this.y - 58 }), this.color);
    this.portraitImage = scene.add.image(this.x - 18, this.y - 25, this.portraitKey)
      .setDisplaySize(32, 32)
      .setDepth(24);
    this.focusZone = scene.add.zone(this.x - 18, this.y - 25, 44, 44)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.focusZone.on("pointerover", () => this.showFocusPortrait());
    this.focusZone.on("pointerout", () => this.hideFocusPortrait());
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
    this.focusPreviewBg = scene.add.graphics().setDepth(80).setVisible(false);
    this.focusPreviewImage = scene.add.image(0, 0, this.portraitKey)
      .setDisplaySize(96, 96)
      .setDepth(81)
      .setVisible(false);
    this.focusPreviewName = scene.add.text(0, 0, this.name, {
      fontFamily: "Consolas, Courier New, monospace",
      fontSize: "13px",
      color: "#f0dfaa",
      backgroundColor: "rgba(10,9,7,0.78)",
      padding: { x: 5, y: 2 }
    }).setOrigin(0.5).setDepth(82).setVisible(false);
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

  say(message, duration = 2300, important = false) {
    const minimumGap = important ? 1450 : 3200;
    if (this.scene.time.now - this.lastBubbleTime < minimumGap) return;
    this.lastBubbleTime = this.scene.time.now;
    this.speech.say(message, duration);
  }

  update(time, delta) {
    if (this.state === "movingToScrap" || this.state === "movingToBuild" || this.state === "returning" || this.state === "wandering") {
      this.moveToward(delta);
    }
    if (this.state === "scavenging" || this.state === "building" || this.state === "resting") {
      this.taskTimer += delta * this.scene.speedMultiplier;
    }
    this.updateVisuals(time);
  }

  chooseNextTask(skipThinking = false) {
    if (!this.scene.isActiveSurvivor(this.id)) return;

    this.scene.scraps.releaseBySurvivor(this.id);
    this.targetScrapId = null;
    this.target = null;
    const profile = this.personalityProfile;
    const timeMod = this.scene.applyTimeBehaviorModifier(this);

    if (this.energy < 26) {
      this.goRest();
      return;
    }

    if (!skipThinking && this.shouldThinkBeforeAct(timeMod)) {
      this.think();
      return;
    }

    const canBuild = this.scene.scrap >= 2 && this.scene.baseLevel < MAX_BASE_LEVEL;
    const stockBonus = this.scene.scrap >= 5 ? 0.12 : 0;
    const buildChance = canBuild ? (0.08 + profile.builder * 0.42) + stockBonus + (this.energy < 55 ? 0.1 : 0) : 0;
    if (timeMod.shouldReturn && Phaser.Math.Distance.Between(this.x, this.y, BASE_POS.x, BASE_POS.y) > 160) {
      this.setState("returning");
      this.target = this.homePosition;
      this.say(this.scene.getTimeBasedBubbleText(this, "returning"), 2200, true);
      return;
    }

    if (canBuild && Math.random() < buildChance * timeMod.buildWeight) {
      this.goBuild();
      return;
    }

    const hasScrap = this.scene.scraps.items.some((item) => !item.reservedBy);
    const wanderChance = Phaser.Math.Clamp(0.08 + profile.wander * 0.25 + (1 - profile.diligence) * 0.18, 0.05, 0.42);
    if (Math.random() < wanderChance * timeMod.wanderWeight) {
      this.goWander();
      return;
    }

    const idleChance = Phaser.Math.Clamp((0.08 + (1 - profile.diligence) * 0.26 + profile.sociability * 0.07) * timeMod.idleWeight, 0.04, 0.62);
    const exploreChance = Phaser.Math.Clamp((0.48 + profile.curiosity * 0.38 - profile.caution * timeMod.cautionExplorePenalty) * timeMod.exploreWeight, 0.06, 0.94);
    if (hasScrap && Math.random() > idleChance && Math.random() < exploreChance) {
      this.search();
      return;
    }

    this.idleAroundBase();
  }

  shouldThinkBeforeAct(timeMod) {
    const profile = this.personalityProfile;
    const nightHesitation = this.scene.isDarkPeriod() ? profile.caution * 0.2 : 0;
    const chance = Phaser.Math.Clamp((1 - profile.diligence) * 0.18 + nightHesitation + timeMod.thinkingWeight - 0.04, 0.04, 0.42);
    return Math.random() < chance;
  }

  think() {
    this.setState("thinking");
    this.target = null;
    this.say(this.scene.getTimeBasedBubbleText(this, "thinking"), 1900, true);
    const profile = this.personalityProfile;
    const pause = Phaser.Math.Between(620, 1250) + profile.caution * (this.scene.isDarkPeriod() ? 720 : 240);
    this.scene.time.delayedCall(pause / this.scene.speedMultiplier, () => {
      if (!this.scene.isActiveSurvivor(this.id) || this.state !== "thinking") return;
      this.chooseNextTask(true);
    });
  }

  search() {
    this.setState("searching");
    this.scene.scraps.releaseBySurvivor(this.id);
    this.targetScrapId = null;

    this.scene.time.delayedCall(this.searchMs / this.scene.speedMultiplier, () => {
      if (!this.scene.isActiveSurvivor(this.id)) return;
      const target = this.scene.scraps.chooseFor(this);
      if (!target || !this.scene.scraps.reserve(target, this.id)) {
        this.idleAroundBase();
        return;
      }
      this.targetScrapId = target.id;
      this.target = target;
      this.setState("movingToScrap");
      this.say(this.scene.getTimeBasedBubbleText(this, "move"), 2200, true);
    });
  }

  idleAroundBase() {
    this.setState("idle");
    const lines = this.scene.getTimeBasedBubbleText(this, "idle", true);
    if (Math.random() < 0.72) this.say(Phaser.Utils.Array.GetRandom(lines), 1800);
    this.scene.time.delayedCall(Phaser.Math.Between(700, 1400) / this.scene.speedMultiplier, () => this.chooseNextTask());
  }

  goWander() {
    this.scene.scraps.releaseBySurvivor(this.id);
    this.targetScrapId = null;
    const profile = this.personalityProfile;
    const nearBase = profile.sociability * 70 + (this.scene.isDarkPeriod() ? profile.caution * 120 : 0);
    const maxRadius = Phaser.Math.Clamp(42 + profile.wander * 110 + profile.curiosity * 70 - profile.caution * 42 - nearBase * 0.25, 34, 190);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(28, Math.round(maxRadius));
    const origin = (profile.sociability > 0.5 || (this.scene.isDarkPeriod() && profile.caution > 0.55)) ? BASE_POS : { x: this.x, y: this.y };
    const jitterX = Math.cos(angle) * distance;
    const jitterY = Math.sin(angle) * distance;
    this.target = {
      x: Phaser.Math.Clamp(origin.x + jitterX, 70, GAME_WIDTH - 70),
      y: Phaser.Math.Clamp(origin.y + jitterY, 84, GAME_HEIGHT - 86)
    };
    this.setState("wandering");
    if (Math.random() < 0.82) this.say(this.scene.getTimeBasedBubbleText(this, "wander"), 1900);
  }

  moveToward(delta) {
    const destination = this.getDestination();
    if (!destination) {
      this.search();
      return;
    }

    if (this.state === "movingToScrap") {
      const timeMod = this.scene.applyTimeBehaviorModifier(this);
      const distanceFromBase = Phaser.Math.Distance.Between(this.x, this.y, BASE_POS.x, BASE_POS.y);
      const profile = this.personalityProfile;
      const target = this.scene.scraps.getById(this.targetScrapId);
      const targetDistance = target ? Phaser.Math.Distance.Between(BASE_POS.x, BASE_POS.y, target.x, target.y) : distanceFromBase;
      const darkBonus = this.scene.isDarkPeriod() ? 0.03 + profile.caution * 0.05 : 0;
      const farBonus = targetDistance > 260 ? (targetDistance - 260) / 9000 : 0;
      const returnChance = Phaser.Math.Clamp((0.006 + profile.caution * 0.032 - profile.curiosity * 0.018 + darkBonus + farBonus) * (delta / 1000), 0.001, 0.14);
      if ((timeMod.shouldReturn || targetDistance > 300) && distanceFromBase > 130 && Math.random() < returnChance) {
        this.scene.scraps.releaseBySurvivor(this.id);
        this.targetScrapId = null;
        this.target = this.homePosition;
        this.setState("returning");
        this.say(this.scene.getTimeBasedBubbleText(this, "cancel"), 2100, true);
        return;
      }
    }

    if (this.state === "wandering") {
      this.noticeScrapWhileWandering();
      if (this.state !== "wandering") return;
    }

    const distance = Phaser.Math.Distance.Between(this.x, this.y, destination.x, destination.y);
    const pace = this.state === "wandering" ? 0.58 : 1;
    const step = this.speed * pace * this.scene.speedMultiplier * (delta / 1000);

    if (distance <= step) {
      this.x = destination.x;
      this.y = destination.y;
      if (this.state === "movingToScrap") this.scavenge();
      if (this.state === "movingToBuild") this.build();
      if (this.state === "returning") this.deliver();
      if (this.state === "wandering") {
        this.setState("idle");
        this.scene.time.delayedCall(Phaser.Math.Between(260, 760) / this.scene.speedMultiplier, () => this.chooseNextTask());
      }
      return;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, destination.x, destination.y);
    this.x += Math.cos(angle) * step;
    this.y += Math.sin(angle) * step;
    this.energy = Phaser.Math.Clamp(this.energy - this.energyDrain * (delta / 1000), 0, 100);
  }

  noticeScrapWhileWandering() {
    if (this.scene.time.now < this.wanderNoticeAt) return;
    this.wanderNoticeAt = this.scene.time.now + 600;
    const profile = this.personalityProfile;
    const noticeRadius = 46 + profile.curiosity * 74;
    const nearby = this.scene.scraps.items
      .filter((item) => !item.reservedBy && Phaser.Math.Distance.Between(this.x, this.y, item.x, item.y) < noticeRadius)
      .sort((a, b) => Phaser.Math.Distance.Between(this.x, this.y, a.x, a.y) - Phaser.Math.Distance.Between(this.x, this.y, b.x, b.y))[0];
    if (!nearby) return;
    const chance = Phaser.Math.Clamp(0.22 + profile.curiosity * 0.42 - profile.caution * (this.scene.isDarkPeriod() ? 0.24 : 0.08), 0.08, 0.72);
    if (Math.random() >= chance || !this.scene.scraps.reserve(nearby, this.id)) return;
    this.targetScrapId = nearby.id;
    this.target = nearby;
    this.setState("movingToScrap");
    this.say(this.scene.getTimeBasedBubbleText(this, "move"), 1900, true);
  }

  getDestination() {
    if (this.state === "returning") {
      return this.homePosition;
    }
    if (this.state === "movingToBuild") return this.buildPosition;
    if (this.state === "wandering") return this.target;
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
      this.say(this.scene.getTimeBasedBubbleText(this, "returning"), 2200);
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
      謎の箱: "変な箱だ。",
      謎の部品: "夜に光ってた。"
    };
    const miloLines = {
      木材: "木材が使えそう。",
      金属片: "これは使えるかも。",
      布: "布が残ってる。",
      電子部品: "電子部品だ。",
      謎の箱: "変な箱だな。",
      謎の部品: "これ、何の部品だ？"
    };
    return (this.name === "ASH" ? ashLines : miloLines)[type] || "使えそう。";
  }

  goRest() {
    this.scene.scraps.releaseBySurvivor(this.id);
    this.targetScrapId = null;
    this.target = this.homePosition;
    this.setState("resting");
    const lines = this.name === "ASH"
      ? this.scene.getTimeBasedBubbleText(this, "rest", true)
      : this.scene.getTimeBasedBubbleText(this, "rest", true);
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
      ? this.scene.getTimeBasedBubbleText(this, "build", true)
      : this.scene.getTimeBasedBubbleText(this, "build", true);
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
    const buildMs = (this.name === "MILO" ? 2300 : 2700) * this.scene.applyTimeBehaviorModifier(this).buildSpeed;
    this.scene.time.delayedCall(buildMs / this.scene.speedMultiplier, () => {
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
    this.nameText.setPosition(this.x - 2, this.y - 56);
    this.stateText.setPosition(this.x + 8, this.y + 28);
    this.portraitImage.setPosition(this.x - 18, this.y - 25);
    this.focusZone.setPosition(this.x - 18, this.y - 25);
    if (this.focusPreviewImage.visible) this.positionFocusPreview();
    this.drawRoute();
    this.drawSignalLight();
    this.drawMarker(time);
  }

  showFocusPortrait() {
    this.focusPreviewBg.setVisible(true);
    this.focusPreviewImage.setVisible(true);
    this.focusPreviewName.setVisible(true);
    this.positionFocusPreview();
  }

  hideFocusPortrait() {
    this.focusPreviewBg.setVisible(false);
    this.focusPreviewImage.setVisible(false);
    this.focusPreviewName.setVisible(false);
  }

  positionFocusPreview() {
    const width = 112;
    const height = 128;
    const x = Phaser.Math.Clamp(this.x + 42, 24, GAME_WIDTH - width - 24);
    const y = Phaser.Math.Clamp(this.y - 124, 76, GAME_HEIGHT - height - 24);
    this.focusPreviewBg.clear();
    this.focusPreviewBg.fillStyle(0x090908, 0.88);
    this.focusPreviewBg.fillRoundedRect(x, y, width, height, 7);
    this.focusPreviewBg.lineStyle(1, this.color, 0.9);
    this.focusPreviewBg.strokeRoundedRect(x, y, width, height, 7);
    this.focusPreviewImage.setPosition(x + width / 2, y + 56);
    this.focusPreviewName.setPosition(x + width / 2, y + height - 16);
  }

  drawSignalLight() {
    const g = this.light;
    g.clear();
    const period = this.scene.getTimePeriod();
    if (period.key !== "night" && period.key !== "midnight") return;
    const radius = period.key === "midnight" ? 34 : 42;
    const alpha = period.key === "midnight" ? 0.12 : 0.18;
    g.fillStyle(this.color, alpha);
    g.fillCircle(this.x, this.y, radius);
    g.fillStyle(this.color, alpha * 0.8);
    g.fillCircle(this.x, this.y, 16);
  }

  drawRoute() {
    const g = this.route;
    g.clear();
    const destination = this.getDestination();
    if (!destination || (this.state !== "movingToScrap" && this.state !== "movingToBuild" && this.state !== "returning" && this.state !== "wandering")) return;

    g.lineStyle(1, this.state === "returning" ? 0xe2c26c : this.routeColor, this.state === "wandering" ? 0.2 : 0.38);
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
    g.fillRoundedRect(this.x - 40, this.y - 47, 44, 44, 5);
    g.lineStyle(1, this.color, 0.82);
    g.strokeRoundedRect(this.x - 40, this.y - 47, 44, 44, 5);
    g.fillStyle(this.portraitColor, 0.65);
    g.fillRect(this.x - 34, this.y - 41, 32, 32);

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
