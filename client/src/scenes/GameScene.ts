import Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Projectile } from '../entities/Projectile.js';
import { Orb } from '../entities/Orb.js';
import { HUD } from '../ui/HUD.js';
import { MiniMap } from '../ui/MiniMap.js';
import { Effects } from '../fx/Effects.js';
import { Sfx } from '../fx/Sfx.js';
import { createTextures } from '../fx/Textures.js';
import { INTERP_DELAY } from '../network/InterpBuffer.js';
import type { PlayerState, EnemyState, ProjectileState, OrbState } from '../../../shared/schema/GameState';

const WORLD_WIDTH = 2048;
const WORLD_HEIGHT = 2048;
const ATTACK_COOLDOWN = 230;
const DASH_COOLDOWN = 2200;
const DASH_DURATION = 180;
const INPUT_THROTTLE = 50;
const SNAP_DISTANCE = 160;

export class GameScene extends Phaser.Scene {
  private network = new NetworkManager();
  private players = new Map<string, Player>();
  private enemies = new Map<string, Enemy>();
  private projectiles = new Map<string, Projectile>();
  private orbs = new Map<string, Orb>();
  private localSessionId = '';
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private hud!: HUD;
  private miniMap!: MiniMap;
  private effects!: Effects;
  private sfx = new Sfx();
  private vignette!: Phaser.GameObjects.Image;
  private damageFlash!: Phaser.GameObjects.Rectangle;
  private lastAttackTime = 0;
  private lastInputDx = 0;
  private lastInputDy = 0;
  private lastInputTime = 0;
  private lastDashAt = -DASH_COOLDOWN;
  private leaderboardTimer = 0;
  private miniMapTimer = 0;
  private fpsTimer = 0;
  private localDead = false;

  constructor() {
    super('GameScene');
  }

  create() {
    createTextures(this);

    this.cameras.main.setBackgroundColor('#0a0a10');
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.add.tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 'tex-ground').setDepth(-10);

    // Bordure du monde
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT)
      .setStrokeStyle(4, 0x334466, 0.8)
      .setDepth(-5);

    this.effects = new Effects(this);
    this.hud = new HUD(this);
    this.miniMap = new MiniMap(this, WORLD_WIDTH, WORLD_HEIGHT);

    this.vignette = this.add.image(0, 0, 'tex-vignette').setScrollFactor(0).setDepth(900);
    this.damageFlash = this.add.rectangle(0, 0, 10, 10, 0xff2222, 0.28)
      .setOrigin(0).setScrollFactor(0).setDepth(950).setAlpha(0);
    this.applyScreenSize(this.scale.width, this.scale.height);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.applyScreenSize(gameSize.width, gameSize.height);
    });

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      z: Phaser.Input.Keyboard.KeyCodes.Z,
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      m: Phaser.Input.Keyboard.KeyCodes.M
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.keys.space.on('down', () => this.tryDash());
    this.keys.m.on('down', () => {
      const muted = this.sfx.toggleMute();
      this.effects.showText(
        this.cameras.main.midPoint.x, this.cameras.main.midPoint.y - 60,
        muted ? 'Son coupe' : 'Son active', '#88ddff', 16
      );
    });

    this.input.on('pointerdown', () => {
      this.sfx.unlock();
    });

    this.joinRoom();
  }

  private applyScreenSize(width: number, height: number) {
    this.vignette.setPosition(width / 2, height / 2).setDisplaySize(width * 1.05, height * 1.05);
    this.damageFlash.setSize(width, height);
    this.hud.layout(width, height);
    this.miniMap.layout(width);
  }

  private tryDash() {
    const now = this.time.now;
    if (this.localDead || now - this.lastDashAt < DASH_COOLDOWN) return;
    this.lastDashAt = now;
    this.network.sendDash();
    this.sfx.dash();

    const player = this.players.get(this.localSessionId);
    if (player) {
      player.dashUntil = now + DASH_DURATION;
    }
  }

  private tryAttack(pointer: Phaser.Input.Pointer) {
    const now = this.time.now;
    if (this.localDead || now - this.lastAttackTime < ATTACK_COOLDOWN) return;
    this.lastAttackTime = now;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.network.sendAttack(worldPoint.x, worldPoint.y);
  }

  private async joinRoom() {
    try {
      const room = await this.network.join();
      this.localSessionId = room.sessionId;
      this.hud.setStatus('');

      room.state.listen('wave', (wave: number) => {
        this.hud.setWave(wave);
        if (wave > 1) {
          this.hud.announceWave(wave);
        }
      });

      room.state.players.onAdd((playerState: PlayerState, sessionId: string) => {
        this.onPlayerAdd(playerState, sessionId);
      });

      room.state.players.onRemove((_playerState: PlayerState, sessionId: string) => {
        this.players.get(sessionId)?.destroy();
        this.players.delete(sessionId);
      });

      room.state.enemies.onAdd((enemyState: EnemyState, enemyId: string) => {
        this.onEnemyAdd(enemyState, enemyId);
      });

      room.state.enemies.onRemove((enemyState: EnemyState, enemyId: string) => {
        const enemy = this.enemies.get(enemyId);
        if (enemy) {
          this.effects.enemyDeath(enemy.x, enemy.y, enemyState.kind === 2);
          this.sfx.kill();
          enemy.destroy();
          this.enemies.delete(enemyId);
        }
      });

      room.state.projectiles.onAdd((projectileState: ProjectileState, projectileId: string) => {
        const projectile = new Projectile(
          this,
          projectileState.x,
          projectileState.y,
          projectileState.vx,
          projectileState.vy,
          projectileState.hostile
        );
        this.projectiles.set(projectileId, projectile);

        if (!projectileState.hostile && projectileState.ownerId === this.localSessionId) {
          this.sfx.shoot();
        }
      });

      room.state.projectiles.onRemove((_projectileState: ProjectileState, projectileId: string) => {
        this.projectiles.get(projectileId)?.destroy();
        this.projectiles.delete(projectileId);
      });

      room.state.orbs.onAdd((orbState: OrbState, orbId: string) => {
        const orb = new Orb(this, orbState.x, orbState.y);
        this.orbs.set(orbId, orb);
        orbState.onChange(() => {
          orb.interp.push(orbState.x, orbState.y, this.time.now);
        });
      });

      room.state.orbs.onRemove((_orbState: OrbState, orbId: string) => {
        const orb = this.orbs.get(orbId);
        if (orb) {
          this.effects.pickup(orb.x, orb.y);
          const localPlayer = this.players.get(this.localSessionId);
          if (localPlayer && Phaser.Math.Distance.Between(orb.x, orb.y, localPlayer.x, localPlayer.y) < 90) {
            this.sfx.pickup();
          }
          orb.destroy();
          this.orbs.delete(orbId);
        }
      });

      room.onLeave(() => {
        this.hud.setStatus('Deconnecte du serveur');
      });
    } catch (err) {
      console.error('Failed to join room:', err);
      this.hud.setStatus('Impossible de joindre le serveur.\nVerifiez qu\'il est lance (port 2567).');
    }
  }

  private onPlayerAdd(playerState: PlayerState, sessionId: string) {
    const isLocal = sessionId === this.localSessionId;
    const player = new Player(this, playerState.x, playerState.y, playerState.color, sessionId.slice(0, 6), isLocal);
    player.lastHp = playerState.hp;
    player.lastLevel = playerState.level;
    player.lastDead = playerState.dead;
    this.players.set(sessionId, player);

    if (isLocal) {
      this.cameras.main.startFollow(player, true, 0.1, 0.1);
      this.hud.setHp(playerState.hp, playerState.maxHp);
      this.hud.setXp(playerState.xp, playerState.xpToNext, playerState.level);
    }

    playerState.onChange(() => {
      this.onPlayerChange(player, playerState, isLocal);
    });
  }

  private onPlayerChange(player: Player, state: PlayerState, isLocal: boolean) {
    player.setHpDisplay(state.hp, state.maxHp);

    if (!isLocal) {
      player.velocityX = state.vx;
      player.velocityY = state.vy;
      player.interp.push(state.x, state.y, this.time.now);
    }

    // Montée de niveau
    if (state.level > player.lastLevel) {
      player.lastLevel = state.level;
      this.effects.levelUp(player.x, player.y);
      this.effects.showText(player.x, player.y - 30, 'NIVEAU +', '#66ccff', 16);
      if (isLocal) {
        this.sfx.levelUp();
      }
    }

    // Dégâts subis
    if (state.hp < player.lastHp - 0.01 && isLocal && !state.dead) {
      this.cameras.main.shake(120, 0.006);
      this.sfx.hurt();
      this.damageFlash.setAlpha(1);
      this.tweens.add({ targets: this.damageFlash, alpha: 0, duration: 260 });
    }
    player.lastHp = state.hp;

    // Mort / réapparition
    if (state.dead !== player.lastDead) {
      player.lastDead = state.dead;
      player.setDeadDisplay(state.dead);
      if (state.dead) {
        this.effects.enemyDeath(player.x, player.y, true);
        if (isLocal) {
          this.localDead = true;
          this.hud.setDead(true);
          this.sfx.death();
        }
      } else {
        player.snapTo(state.x, state.y);
        this.effects.levelUp(state.x, state.y);
        if (isLocal) {
          this.localDead = false;
          this.hud.setDead(false);
        }
      }
    }

    if (isLocal) {
      this.hud.setHp(state.hp, state.maxHp);
      this.hud.setXp(state.xp, state.xpToNext, state.level);
      this.hud.setScore(state.kills, state.score);

      // Réconciliation douce : recale si trop éloigné du serveur
      if (!state.dead) {
        const dist = Phaser.Math.Distance.Between(player.x, player.y, state.x, state.y);
        if (dist > SNAP_DISTANCE) {
          player.snapTo(state.x, state.y);
        }
      }
    }
  }

  private onEnemyAdd(enemyState: EnemyState, enemyId: string) {
    const enemy = new Enemy(this, enemyState.x, enemyState.y, enemyState.kind, enemyState.hp, enemyState.maxHp);
    this.enemies.set(enemyId, enemy);

    enemyState.onChange(() => {
      enemy.velocityX = enemyState.vx;
      enemy.velocityY = enemyState.vy;
      enemy.interp.push(enemyState.x, enemyState.y, this.time.now);
      if (enemyState.hp < enemy.lastHp - 0.01) {
        const damage = enemy.lastHp - enemyState.hp;
        enemy.flash();
        this.effects.hit(enemy.x, enemy.y);
        this.effects.damageNumber(enemy.x, enemy.y - 12, damage);
        this.sfx.hit();
      }
      enemy.lastHp = enemyState.hp;
      enemy.setHp(enemyState.hp, enemyState.maxHp);
    });
  }

  private updateLeaderboard() {
    const room = this.network.room;
    if (!room) return;

    const entries: { id: string; score: number; level: number }[] = [];
    room.state.players.forEach((p: PlayerState, id: string) => {
      entries.push({ id: id.slice(0, 6), score: p.score, level: p.level });
    });
    entries.sort((a, b) => b.score - a.score);

    this.hud.setLeaderboard(
      entries.slice(0, 5).map((e, i) => `${i + 1}. ${e.id} N${e.level} ${e.score}`)
    );
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    const now = this.time.now;
    const renderTime = now - INTERP_DELAY;

    let dx = 0;
    let dy = 0;
    if (this.cursors.left?.isDown || this.keys.a.isDown || this.keys.q.isDown) dx -= 1;
    if (this.cursors.right?.isDown || this.keys.d.isDown) dx += 1;
    if (this.cursors.up?.isDown || this.keys.w.isDown || this.keys.z.isDown) dy -= 1;
    if (this.cursors.down?.isDown || this.keys.s.isDown) dy += 1;

    if (this.localDead) {
      dx = 0;
      dy = 0;
    }

    const inputChanged = dx !== this.lastInputDx || dy !== this.lastInputDy;
    if (inputChanged || now - this.lastInputTime > INPUT_THROTTLE) {
      this.network.sendInput(dx, dy);
      this.lastInputDx = dx;
      this.lastInputDy = dy;
      this.lastInputTime = now;
    }

    // Tir maintenu
    const pointer = this.input.activePointer;
    if (pointer.isDown) {
      this.tryAttack(pointer);
    }

    const localPlayer = this.players.get(this.localSessionId);
    if (localPlayer && !this.localDead) {
      localPlayer.updateLocal(dt, dx, dy, now);
      localPlayer.x = Phaser.Math.Clamp(localPlayer.x, 16, WORLD_WIDTH - 16);
      localPlayer.y = Phaser.Math.Clamp(localPlayer.y, 16, WORLD_HEIGHT - 16);

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      localPlayer.setAim(Math.atan2(worldPoint.y - localPlayer.y, worldPoint.x - localPlayer.x));

      if (localPlayer.isDashing(now)) {
        this.effects.dashTrail(localPlayer.x, localPlayer.y);
      }
    }

    this.players.forEach((player) => {
      if (player !== localPlayer) {
        player.updateRemote(renderTime);
      }
    });

    this.enemies.forEach((enemy) => enemy.update(renderTime, dt));
    this.orbs.forEach((orb) => orb.update(renderTime));
    this.projectiles.forEach((projectile) => projectile.update(dt, this.effects));

    this.miniMapTimer += delta;
    if (this.miniMapTimer > 66) {
      this.miniMapTimer = 0;
      this.miniMap.update(this.players, this.enemies, this.localSessionId);
    }

    this.hud.setInfo(this.players.size, this.enemies.size);
    this.hud.setDashCooldown((now - this.lastDashAt) / DASH_COOLDOWN);

    this.fpsTimer += delta;
    if (this.fpsTimer > 500) {
      this.fpsTimer = 0;
      this.hud.setFps(this.game.loop.actualFps);
    }

    this.leaderboardTimer += delta;
    if (this.leaderboardTimer > 500) {
      this.leaderboardTimer = 0;
      this.updateLeaderboard();
    }
  }
}
