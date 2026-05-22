import { MAX_BASE_LEVEL } from './constants.js';
import { SpeechBubble } from './speechBubble.js';

const BASE_DISPLAY_SIZE = 260;

export class BaseCamp {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.level = 1;
    this.image = scene.add.image(x, y, this.textureKeyForLevel(this.level))
      .setDisplaySize(BASE_DISPLAY_SIZE, BASE_DISPLAY_SIZE)
      .setDepth(2);
    this.pulse = scene.add.graphics().setDepth(19);
    this.speech = new SpeechBubble(scene, () => ({ x: this.x, y: this.y - 154 }), 0xe4d19a);
    this.label = scene.add.text(x, y + 138, "拠点 Lv 1", {
      fontFamily: "Consolas, Courier New, monospace",
      fontSize: "13px",
      color: "#d8d0bd",
      backgroundColor: "rgba(20,18,14,0.55)",
      padding: { x: 5, y: 2 }
    }).setOrigin(0.5).setDepth(25);
  }

  say(message, duration = 2400) {
    this.speech.say(message, duration);
  }

  setLevel(level) {
    const clampedLevel = Phaser.Math.Clamp(level, 1, MAX_BASE_LEVEL);
    if (clampedLevel === this.level) return;
    this.level = clampedLevel;
    this.label.setText(`拠点 Lv ${clampedLevel}`);
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
    this.image.setTexture(this.textureKeyForLevel(this.level));
    this.image.setDisplaySize(BASE_DISPLAY_SIZE, BASE_DISPLAY_SIZE);
  }

  textureKeyForLevel(level) {
    const clampedLevel = Phaser.Math.Clamp(level, 1, MAX_BASE_LEVEL);
    return `baseLevel${clampedLevel}`;
  }
}
