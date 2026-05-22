import { GAME_HEIGHT, GAME_WIDTH } from './constants.js';

export class SpeechBubble {
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
