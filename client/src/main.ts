import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0a0a0a',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [GameScene],
  pixelArt: false,
  roundPixels: false,
  antialias: true,
  powerPreference: 'high-performance',
  fps: {
    smoothStep: true
  }
};

new Phaser.Game(config);
