import { GAME_HEIGHT, GAME_WIDTH } from './src/constants.js';
import { ObserverScene } from './src/observerScene.js';

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

const survivalObserverGame = new Phaser.Game(config);
window.survivalObserverGame = survivalObserverGame;
