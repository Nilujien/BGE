import Phaser from 'phaser';
import { InterpBuffer } from '../network/InterpBuffer.js';

const SPEED = 250;
const DASH_MULTIPLIER = 3.1;
const BAR_WIDTH = 30;

const samplePos = { x: 0, y: 0 };

export class Player extends Phaser.GameObjects.Container {
  private glow: Phaser.GameObjects.Image;
  private bodySprite: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Image;
  private pointer: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private hpBg: Phaser.GameObjects.Image;
  private hpBar: Phaser.GameObjects.Image;
  readonly isLocal: boolean;
  readonly interp = new InterpBuffer();
  velocityX = 0;
  velocityY = 0;
  lastHp = 100;
  lastLevel = 1;
  lastDead = false;
  dashUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, colorHex: string, name: string, isLocal: boolean) {
    super(scene, x, y);
    this.isLocal = isLocal;

    const color = Phaser.Display.Color.HexStringToColor(colorHex).color;

    this.glow = scene.add.image(0, 0, 'tex-glow')
      .setTint(color)
      .setAlpha(isLocal ? 0.5 : 0.32)
      .setScale(1.5)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.bodySprite = scene.add.image(0, 0, 'tex-player').setTint(color);
    this.ring = scene.add.image(0, 0, 'tex-ring').setAlpha(isLocal ? 0.95 : 0.35);
    this.pointer = scene.add.image(18, 0, 'tex-pointer').setTint(0xffffff).setAlpha(0.9).setScale(0.8);

    this.label = scene.add.text(0, -26, name, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.hpBg = scene.add.image(0, -18, 'tex-white')
      .setTint(0x000000).setAlpha(0.6).setOrigin(0.5, 0.5);
    this.hpBg.setDisplaySize(BAR_WIDTH + 2, 4);
    this.hpBar = scene.add.image(-BAR_WIDTH / 2, -18, 'tex-white')
      .setTint(0x44ff66).setOrigin(0, 0.5);
    this.hpBar.setDisplaySize(BAR_WIDTH, 4);

    this.add([this.glow, this.bodySprite, this.ring, this.pointer, this.label, this.hpBg, this.hpBar]);

    this.setDepth(20);
    scene.add.existing(this);
  }

  setAim(angle: number) {
    this.pointer.setPosition(Math.cos(angle) * 18, Math.sin(angle) * 18);
    this.pointer.setRotation(angle);
  }

  setHpDisplay(hp: number, maxHp: number) {
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.hpBar.displayWidth = Math.max(0.01, BAR_WIDTH * ratio);
    this.hpBar.setTint(ratio > 0.5 ? 0x44ff66 : ratio > 0.25 ? 0xffcc44 : 0xff4444);
  }

  setDeadDisplay(dead: boolean) {
    this.setAlpha(dead ? 0.18 : 1);
  }

  isDashing(now: number): boolean {
    return now < this.dashUntil;
  }

  snapTo(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.interp.clear();
  }

  updateLocal(dt: number, dx: number, dy: number, now: number) {
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
      const speed = this.isDashing(now) ? SPEED * DASH_MULTIPLIER : SPEED;
      this.x += dx * speed * dt;
      this.y += dy * speed * dt;
    }
  }

  updateRemote(renderTime: number) {
    if (this.interp.sample(renderTime, samplePos)) {
      this.x = samplePos.x;
      this.y = samplePos.y;
    }

    if (this.velocityX !== 0 || this.velocityY !== 0) {
      this.setAim(Math.atan2(this.velocityY, this.velocityX));
    }
  }
}
