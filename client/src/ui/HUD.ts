import Phaser from 'phaser';

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private hpBg: Phaser.GameObjects.Rectangle;
  private hpBar: Phaser.GameObjects.Rectangle;
  private hpText: Phaser.GameObjects.Text;
  private xpBg: Phaser.GameObjects.Rectangle;
  private xpBar: Phaser.GameObjects.Rectangle;
  private levelText: Phaser.GameObjects.Text;
  private dashBg: Phaser.GameObjects.Rectangle;
  private dashBar: Phaser.GameObjects.Rectangle;
  private dashLabel: Phaser.GameObjects.Text;
  private waveText: Phaser.GameObjects.Text;
  private infoText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private helpText: Phaser.GameObjects.Text;
  private leaderboardText: Phaser.GameObjects.Text;
  private deathOverlay: Phaser.GameObjects.Rectangle;
  private deathText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;
  private fpsText: Phaser.GameObjects.Text;
  private cache: Record<string, string | number> = {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const mono = 'monospace';

    this.hpBg = scene.add.rectangle(0, 0, 224, 22, 0x000000, 0.55).setOrigin(0, 0.5);
    this.hpBar = scene.add.rectangle(2, 0, 220, 18, 0x44dd66).setOrigin(0, 0.5);
    this.hpText = scene.add.text(112, 0, '', {
      fontSize: '13px', color: '#ffffff', fontFamily: mono, stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5);

    this.xpBg = scene.add.rectangle(0, 16, 224, 10, 0x000000, 0.55).setOrigin(0, 0.5);
    this.xpBar = scene.add.rectangle(2, 16, 220, 6, 0x55bbff).setOrigin(0, 0.5);
    this.levelText = scene.add.text(232, 8, 'Niv 1', {
      fontSize: '16px', color: '#88ddff', fontFamily: mono, fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0, 0.5);

    this.dashBg = scene.add.rectangle(0, 32, 80, 7, 0x000000, 0.55).setOrigin(0, 0.5);
    this.dashBar = scene.add.rectangle(1, 32, 78, 5, 0x88ddff).setOrigin(0, 0.5);
    this.dashLabel = scene.add.text(86, 32, 'DASH', {
      fontSize: '10px', color: '#88ddff', fontFamily: mono
    }).setOrigin(0, 0.5);

    this.waveText = scene.add.text(0, 54, 'Vague 1', {
      fontSize: '16px', color: '#ffcc55', fontFamily: mono, fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
    });
    this.infoText = scene.add.text(0, 76, '', {
      fontSize: '12px', color: '#aabbcc', fontFamily: mono
    });
    this.scoreText = scene.add.text(0, 92, '', {
      fontSize: '12px', color: '#ccddaa', fontFamily: mono
    });

    this.helpText = scene.add.text(0, 0,
      'ZQSD/Fleches: bouger | Clic: tirer (maintenir) | Espace: dash | M: son', {
      fontSize: '11px', color: '#667788', fontFamily: mono
    });

    this.leaderboardText = scene.add.text(0, 0, '', {
      fontSize: '11px', color: '#ccccdd', fontFamily: mono, align: 'right', stroke: '#000000', strokeThickness: 2
    }).setOrigin(1, 0);

    this.deathOverlay = scene.add.rectangle(0, 0, 10, 10, 0x220000, 0.55).setOrigin(0).setVisible(false);
    this.deathText = scene.add.text(0, 0, 'VOUS ETES MORT\nReapparition dans quelques secondes...', {
      fontSize: '26px', color: '#ff5555', fontFamily: mono, fontStyle: 'bold', align: 'center',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setVisible(false);

    this.statusText = scene.add.text(0, 0, 'Connexion au serveur...', {
      fontSize: '16px', color: '#88aaff', fontFamily: mono, stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);

    this.fpsText = scene.add.text(0, 0, '', {
      fontSize: '11px', color: '#556677', fontFamily: mono
    }).setOrigin(1, 1);

    this.container = scene.add.container(20, 26, [
      this.hpBg, this.hpBar, this.hpText,
      this.xpBg, this.xpBar, this.levelText,
      this.dashBg, this.dashBar, this.dashLabel,
      this.waveText, this.infoText, this.scoreText
    ]);
    this.container.setScrollFactor(0).setDepth(1000);

    for (const obj of [this.helpText, this.leaderboardText, this.deathOverlay, this.deathText, this.statusText, this.fpsText]) {
      obj.setScrollFactor(0).setDepth(1000);
    }
    this.deathOverlay.setDepth(999);

    this.layout(scene.scale.width, scene.scale.height);
  }

  layout(width: number, height: number) {
    this.helpText.setPosition(20, height - 24);
    this.leaderboardText.setPosition(width - 16, 196);
    this.deathOverlay.setSize(width, height);
    this.deathText.setPosition(width / 2, height / 2);
    this.statusText.setPosition(width / 2, height / 2 - 60);
    this.fpsText.setPosition(width - 16, height - 12);
  }

  // Évite les setText superflus : chaque setText re-rasterise le texte (coûteux par frame)
  private changed(key: string, value: string | number): boolean {
    if (this.cache[key] === value) return false;
    this.cache[key] = value;
    return true;
  }

  setFps(fps: number) {
    const v = Math.round(fps);
    if (this.changed('fps', v)) {
      this.fpsText.setText(`${v} FPS`);
    }
  }

  setStatus(text: string) {
    this.statusText.setText(text).setVisible(text.length > 0);
  }

  setHp(hp: number, maxHp: number) {
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.hpBar.scaleX = ratio;
    this.hpBar.fillColor = ratio > 0.5 ? 0x44dd66 : ratio > 0.25 ? 0xffcc44 : 0xff4444;
    const label = `${Math.ceil(hp)} / ${Math.ceil(maxHp)}`;
    if (this.changed('hp', label)) {
      this.hpText.setText(label);
    }
  }

  setXp(xp: number, xpToNext: number, level: number) {
    this.xpBar.scaleX = Phaser.Math.Clamp(xp / Math.max(1, xpToNext), 0, 1);
    if (this.changed('level', level)) {
      this.levelText.setText(`Niv ${level}`);
    }
  }

  setDashCooldown(ratio: number) {
    this.dashBar.scaleX = Phaser.Math.Clamp(ratio, 0, 1);
    this.dashBar.fillColor = ratio >= 1 ? 0x88ddff : 0x445566;
  }

  setWave(wave: number) {
    if (this.changed('wave', wave)) {
      this.waveText.setText(`Vague ${wave}`);
    }
  }

  setInfo(players: number, enemies: number) {
    const label = `Joueurs: ${players}  Ennemis: ${enemies}`;
    if (this.changed('info', label)) {
      this.infoText.setText(label);
    }
  }

  setScore(kills: number, score: number) {
    const label = `Kills: ${kills}  Score: ${score}`;
    if (this.changed('score', label)) {
      this.scoreText.setText(label);
    }
  }

  setLeaderboard(lines: string[]) {
    const label = lines.length > 0 ? ['-- Classement --', ...lines].join('\n') : '';
    if (this.changed('leaderboard', label)) {
      this.leaderboardText.setText(label);
    }
  }

  setDead(dead: boolean) {
    this.deathOverlay.setVisible(dead);
    this.deathText.setVisible(dead);
  }

  announceWave(wave: number) {
    const { width } = this.scene.scale;
    const t = this.scene.add.text(width / 2, 120, `VAGUE ${wave}`, {
      fontSize: '34px', color: '#ffcc55', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setAlpha(0);

    this.scene.tweens.add({
      targets: t,
      alpha: 1,
      scale: { from: 0.6, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 900,
      onComplete: () => t.destroy()
    });
  }
}
