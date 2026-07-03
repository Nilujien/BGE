import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';

const SIZE = 160;

export class MiniMap {
  private bg: Phaser.GameObjects.Rectangle;
  private border: Phaser.GameObjects.Rectangle;
  private dots: Phaser.GameObjects.Graphics;
  private worldWidth: number;
  private worldHeight: number;
  private originX = 0;
  private originY = 0;

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    this.bg = scene.add.rectangle(0, 0, SIZE, SIZE, 0x000000, 0.45).setOrigin(0).setScrollFactor(0).setDepth(1000);
    this.border = scene.add.rectangle(0, 0, SIZE, SIZE).setOrigin(0).setScrollFactor(0).setDepth(1001);
    this.border.setStrokeStyle(1, 0x556677, 0.9);
    this.border.isFilled = false;
    this.dots = scene.add.graphics().setScrollFactor(0).setDepth(1001);

    this.layout(scene.scale.width);
  }

  layout(screenWidth: number) {
    this.originX = screenWidth - SIZE - 16;
    this.originY = 20;
    this.bg.setPosition(this.originX, this.originY);
    this.border.setPosition(this.originX, this.originY);
  }

  update(players: Map<string, Player>, enemies: Map<string, Enemy>, localId: string) {
    const g = this.dots;
    g.clear();

    const sx = SIZE / this.worldWidth;
    const sy = SIZE / this.worldHeight;

    g.fillStyle(0xff4444, 1);
    enemies.forEach((enemy) => {
      g.fillRect(this.originX + enemy.x * sx - 1, this.originY + enemy.y * sy - 1, 2.5, 2.5);
    });

    players.forEach((player, id) => {
      if (id === localId) {
        g.fillStyle(0x66ff88, 1);
        g.fillRect(this.originX + player.x * sx - 2, this.originY + player.y * sy - 2, 4.5, 4.5);
      } else {
        g.fillStyle(0xffffff, 1);
        g.fillRect(this.originX + player.x * sx - 1.5, this.originY + player.y * sy - 1.5, 3, 3);
      }
    });
  }
}
