import Phaser from 'phaser';

const FX_DEPTH = 40;

export class Effects {
  private scene: Phaser.Scene;
  private hitEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private deathEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private pickupEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private levelEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private dashEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private textPool: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.hitEmitter = scene.add.particles(0, 0, 'tex-particle', {
      speed: { min: 70, max: 200 },
      scale: { start: 0.9, end: 0 },
      lifespan: 260,
      blendMode: 'ADD',
      tint: [0xffe08a, 0xffb050],
      emitting: false
    }).setDepth(FX_DEPTH);

    this.deathEmitter = scene.add.particles(0, 0, 'tex-particle', {
      speed: { min: 60, max: 260 },
      scale: { start: 1.4, end: 0 },
      lifespan: 480,
      blendMode: 'ADD',
      tint: [0xff7744, 0xffcc55, 0xff4433],
      emitting: false
    }).setDepth(FX_DEPTH);

    this.pickupEmitter = scene.add.particles(0, 0, 'tex-particle', {
      speed: { min: 40, max: 120 },
      scale: { start: 0.7, end: 0 },
      lifespan: 300,
      blendMode: 'ADD',
      tint: 0x66ffcc,
      emitting: false
    }).setDepth(FX_DEPTH);

    this.levelEmitter = scene.add.particles(0, 0, 'tex-particle', {
      speed: { min: 100, max: 320 },
      scale: { start: 1.3, end: 0 },
      lifespan: 650,
      blendMode: 'ADD',
      tint: [0x66ccff, 0xffffff, 0xffee66],
      emitting: false
    }).setDepth(FX_DEPTH);

    this.trailEmitter = scene.add.particles(0, 0, 'tex-particle', {
      speed: 0,
      scale: { start: 0.55, end: 0 },
      lifespan: 200,
      blendMode: 'ADD',
      tint: 0xffcc55,
      emitting: false
    }).setDepth(FX_DEPTH - 1);

    this.dashEmitter = scene.add.particles(0, 0, 'tex-particle', {
      speed: { min: 10, max: 40 },
      scale: { start: 0.8, end: 0 },
      lifespan: 320,
      blendMode: 'ADD',
      tint: 0x88ddff,
      emitting: false
    }).setDepth(FX_DEPTH - 1);
  }

  hit(x: number, y: number) {
    this.hitEmitter.explode(6, x, y);
  }

  enemyDeath(x: number, y: number, big: boolean) {
    this.deathEmitter.explode(big ? 26 : 14, x, y);
  }

  pickup(x: number, y: number) {
    this.pickupEmitter.explode(7, x, y);
  }

  levelUp(x: number, y: number) {
    this.levelEmitter.explode(34, x, y);
  }

  trail(x: number, y: number, hostile: boolean) {
    this.trailEmitter.setParticleTint(hostile ? 0xbb66ff : 0xffcc55);
    this.trailEmitter.emitParticleAt(x, y, 1);
  }

  dashTrail(x: number, y: number) {
    this.dashEmitter.emitParticleAt(x, y, 2);
  }

  showText(x: number, y: number, text: string, color: string, fontSize = 14) {
    let t = this.textPool.pop();
    if (!t) {
      t = this.scene.add.text(0, 0, '', {
        fontFamily: 'monospace',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(500);
    }
    t.setText(text);
    t.setFontSize(fontSize);
    t.setColor(color);
    t.setPosition(x + (Math.random() - 0.5) * 14, y - 14);
    t.setAlpha(1);
    t.setVisible(true);
    t.setScale(1);

    this.scene.tweens.add({
      targets: t,
      y: y - 58,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        t.setVisible(false);
        this.textPool.push(t);
      }
    });
  }

  damageNumber(x: number, y: number, amount: number) {
    this.showText(x, y, String(Math.round(amount)), '#ffdd55');
  }
}
