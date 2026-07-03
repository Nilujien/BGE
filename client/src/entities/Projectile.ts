import Phaser from 'phaser';
import { Effects } from '../fx/Effects.js';

export class Projectile extends Phaser.GameObjects.Image {
  velocityX: number;
  velocityY: number;
  readonly hostile: boolean;
  private trailToggle = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number, hostile: boolean) {
    super(scene, x, y, 'tex-bolt');

    this.velocityX = vx;
    this.velocityY = vy;
    this.hostile = hostile;
    this.setRotation(Math.atan2(vy, vx));
    this.setTint(hostile ? 0xbb66ff : 0xffdd55);
    this.setBlendMode(Phaser.BlendModes.ADD);
    this.setScale(hostile ? 1.15 : 1);
    this.setDepth(30);
    scene.add.existing(this);
  }

  update(dt: number, effects: Effects) {
    this.x += this.velocityX * dt;
    this.y += this.velocityY * dt;

    this.trailToggle++;
    if (this.trailToggle % 2 === 0) {
      effects.trail(this.x, this.y, this.hostile);
    }
  }
}
