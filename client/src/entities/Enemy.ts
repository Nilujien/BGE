import Phaser from 'phaser';
import { InterpBuffer } from '../network/InterpBuffer.js';

interface KindVisual {
  texture: string;
  tint: number;
  glowScale: number;
  barWidth: number;
}

const KIND_VISUALS: KindVisual[] = [
  { texture: 'tex-enemy0', tint: 0xff5544, glowScale: 1.1, barWidth: 30 },
  { texture: 'tex-enemy1', tint: 0xffaa33, glowScale: 0.85, barWidth: 24 },
  { texture: 'tex-enemy2', tint: 0xdd3344, glowScale: 1.7, barWidth: 46 },
  { texture: 'tex-enemy3', tint: 0xbb55ff, glowScale: 1.0, barWidth: 28 }
];

const samplePos = { x: 0, y: 0 };

export class Enemy extends Phaser.GameObjects.Container {
  private glow: Phaser.GameObjects.Image;
  private bodySprite: Phaser.GameObjects.Image;
  private hpBg: Phaser.GameObjects.Image;
  private hpBar: Phaser.GameObjects.Image;
  private baseTint: number;
  private barWidth: number;
  private flashTimer = 0;
  readonly interp = new InterpBuffer();
  velocityX = 0;
  velocityY = 0;
  lastHp: number;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: number, hp: number, maxHp: number) {
    super(scene, x, y);

    const visual = KIND_VISUALS[kind] ?? KIND_VISUALS[0];
    this.baseTint = visual.tint;
    this.barWidth = visual.barWidth;
    this.lastHp = hp;

    this.glow = scene.add.image(0, 0, 'tex-glow')
      .setTint(visual.tint)
      .setAlpha(0.25)
      .setScale(visual.glowScale)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.bodySprite = scene.add.image(0, 0, visual.texture).setTint(visual.tint);

    const barY = -(this.bodySprite.height / 2) - 9;
    this.hpBg = scene.add.image(0, barY, 'tex-white')
      .setTint(0x000000).setAlpha(0.6).setOrigin(0.5, 0.5);
    this.hpBg.setDisplaySize(visual.barWidth + 2, 5);
    this.hpBar = scene.add.image(-visual.barWidth / 2, barY, 'tex-white')
      .setTint(0xff4444).setOrigin(0, 0.5);
    this.hpBar.setDisplaySize(visual.barWidth, 5);

    this.add([this.glow, this.bodySprite, this.hpBg, this.hpBar]);
    this.setHp(hp, maxHp);
    this.setDepth(10);
    scene.add.existing(this);
  }

  setHp(hp: number, maxHp: number) {
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.hpBar.displayWidth = Math.max(0.01, this.barWidth * ratio);
    const full = ratio >= 0.999;
    this.hpBar.setVisible(!full);
    this.hpBg.setVisible(!full);
  }

  flash() {
    this.bodySprite.setTintFill(0xffffff);
    this.flashTimer = 0.07;
  }

  update(renderTime: number, dt: number) {
    if (this.interp.sample(renderTime, samplePos)) {
      this.x = samplePos.x;
      this.y = samplePos.y;
    }

    if (this.velocityX !== 0 || this.velocityY !== 0) {
      const angle = Math.atan2(this.velocityY, this.velocityX);
      this.bodySprite.rotation = Phaser.Math.Angle.RotateTo(this.bodySprite.rotation, angle, dt * 8);
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.bodySprite.setTint(this.baseTint);
      }
    }
  }
}
