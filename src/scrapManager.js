import { BASE_POS, GAME_HEIGHT, GAME_WIDTH, SCRAP_TYPES } from './constants.js';

export class ScrapManager {
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

    const periodKey = this.scene.getTimePeriod?.().key || "day";
    const nightPart = (periodKey === "night" || periodKey === "midnight") && Math.random() < 0.18;
    const type = nightPart
      ? SCRAP_TYPES.find((entry) => entry.name === "謎の部品")
      : Phaser.Utils.Array.GetRandom(SCRAP_TYPES.filter((entry) => entry.name !== "謎の部品"));
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
    this.ensureCount(this.scene.getScrapTargetCount());
  }

  chooseFor(survivor) {
    const candidates = this.items.filter((item) => !item.reservedBy);
    if (candidates.length === 0) return null;
    const timeMod = this.scene.applyTimeBehaviorModifier(survivor);
    const profile = survivor.personalityProfile || {};
    const curiosity = profile.curiosity ?? 0.5;
    const caution = profile.caution ?? 0.5;
    const wander = profile.wander ?? 0.4;
    const distanceBias = Phaser.Math.Clamp(1.2 + caution * 0.75 - curiosity * 0.95, 0.38, 1.9);

    const scored = candidates
      .map((item) => {
        const distance = Phaser.Math.Distance.Between(survivor.x, survivor.y, item.x, item.y);
        const distanceFromBase = Phaser.Math.Distance.Between(BASE_POS.x, BASE_POS.y, item.x, item.y);
        const farInterest = curiosity * distanceFromBase * 0.28;
        const randomWeight = 42 + curiosity * 165 + wander * 64;
        const score = distance * timeMod.distanceRisk * distanceBias - farInterest + Phaser.Math.FloatBetween(-randomWeight, randomWeight);
        return { item, score };
      })
      .sort((a, b) => a.score - b.score);

    const poolSizeBase = 1 + Math.round(curiosity * 3);
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
