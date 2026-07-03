import Phaser from 'phaser';
import { InterpBuffer } from '../network/InterpBuffer.js';

const samplePos = { x: 0, y: 0 };

export class Orb extends Phaser.GameObjects.Container {
  private glow: Phaser.GameObjects.Image;
  private gem: Phaser.GameObjects.Image;
  readonly interp = new InterpBuffer();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.glow = scene.add.image(0, 0, 'tex-glow')
      .setTint(0x66ffcc)
      .setAlpha(0.35)
      .setScale(0.7)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.gem = scene.add.image(0, 0, 'tex-orb').setTint(0x66ffcc).setScale(0.85);

    this.add([this.glow, this.gem]);
    this.setDepth(5);
    scene.add.existing(this);

    scene.tweens.add({
      targets: this.gem,
      angle: 360,
      duration: 2400,
      repeat: -1
    });
    scene.tweens.add({
      targets: this.glow,
      alpha: 0.15,
      scale: 0.55,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  update(renderTime: number) {
    if (this.interp.sample(renderTime, samplePos)) {
      this.x = samplePos.x;
      this.y = samplePos.y;
    }
  }
}
