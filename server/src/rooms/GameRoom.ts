import { Room, Client } from 'colyseus';
import { GameState, PlayerState, EnemyState, ProjectileState, OrbState } from '../../../shared/schema/GameState.js';

const TICK_RATE = 1000 / 60;
const WORLD_WIDTH = 2048;
const WORLD_HEIGHT = 2048;

const PLAYER_SPEED = 250;
const PLAYER_RADIUS = 14;
const DASH_MULTIPLIER = 3.1;
const DASH_DURATION = 180;
const DASH_COOLDOWN = 2200;
const ATTACK_COOLDOWN = 230;
const PROJECTILE_SPEED = 680;
const PROJECTILE_LIFETIME = 1400;
const HOSTILE_PROJECTILE_SPEED = 270;
const HOSTILE_PROJECTILE_LIFETIME = 3200;
const REGEN_DELAY = 5000;
const REGEN_PER_SEC = 5;
const RESPAWN_DELAY = 4000;
const WAVE_DURATION = 30000;
const MAX_ORBS = 90;
const ORB_LIFETIME = 25000;
const ORB_PICKUP_DIST_SQ = 46 * 46;
const ORB_MAGNET_DIST_SQ = 140 * 140;
const ORB_MAGNET_SPEED = 320;

interface EnemyKindDef {
  speed: number;
  baseHp: number;
  hpPerWave: number;
  radius: number;
  contactDamage: number;
  xp: number;
  minWave: number;
  weight: number;
  ranged: boolean;
}

// 0 = chasseur, 1 = coureur, 2 = brute, 3 = cracheur
const ENEMY_KINDS: EnemyKindDef[] = [
  { speed: 88, baseHp: 60, hpPerWave: 10, radius: 14, contactDamage: 10, xp: 8, minWave: 1, weight: 10, ranged: false },
  { speed: 155, baseHp: 32, hpPerWave: 6, radius: 10, contactDamage: 6, xp: 6, minWave: 2, weight: 6, ranged: false },
  { speed: 52, baseHp: 170, hpPerWave: 26, radius: 22, contactDamage: 22, xp: 22, minWave: 4, weight: 3, ranged: false },
  { speed: 72, baseHp: 48, hpPerWave: 8, radius: 12, contactDamage: 8, xp: 12, minWave: 3, weight: 4, ranged: true }
];

interface InputMessage {
  dx: number;
  dy: number;
}

interface AttackMessage {
  targetX: number;
  targetY: number;
}

interface EnemyRuntime {
  nextContactAt: number;
  nextShotAt: number;
}

interface PlayerRuntime {
  lastDamageAt: number;
  diedAt: number;
  dashUntil: number;
  nextDashAt: number;
  nextAttackAt: number;
}

export class GameRoom extends Room<GameState> {
  maxClients = 64;
  private inputs = new Map<string, InputMessage>();
  private playerRt = new Map<string, PlayerRuntime>();
  private enemyRt = new Map<string, EnemyRuntime>();
  private projectileSpawnTimes = new Map<string, number>();
  private projectileLifetimes = new Map<string, number>();
  private orbSpawnTimes = new Map<string, number>();
  private lastSpawn = 0;
  private waveTimer = 0;
  private enemyIdCounter = 0;
  private projectileIdCounter = 0;
  private orbIdCounter = 0;
  private tickCounter = 0;

  onCreate() {
    this.setState(new GameState());
    this.setPatchRate(0);
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), TICK_RATE);

    this.onMessage('input', (client, message: InputMessage) => {
      this.inputs.set(client.sessionId, {
        dx: Math.max(-1, Math.min(1, Number(message?.dx) || 0)),
        dy: Math.max(-1, Math.min(1, Number(message?.dy) || 0))
      });
    });

    this.onMessage('attack', (client, message: AttackMessage) => {
      this.handleAttack(client.sessionId, Number(message?.targetX) || 0, Number(message?.targetY) || 0);
    });

    this.onMessage('dash', (client) => {
      const player = this.state.players.get(client.sessionId);
      const rt = this.playerRt.get(client.sessionId);
      if (!player || !rt || player.dead) return;
      const now = Date.now();
      if (now < rt.nextDashAt) return;
      rt.nextDashAt = now + DASH_COOLDOWN;
      rt.dashUntil = now + DASH_DURATION;
    });
  }

  onJoin(client: Client) {
    const player = new PlayerState();
    player.id = client.sessionId;
    player.x = WORLD_WIDTH / 2 + (Math.random() - 0.5) * 200;
    player.y = WORLD_HEIGHT / 2 + (Math.random() - 0.5) * 200;
    player.hp = 100;
    player.maxHp = 100;
    player.color = this.randomPlayerColor();
    this.state.players.set(client.sessionId, player);
    this.inputs.set(client.sessionId, { dx: 0, dy: 0 });
    this.playerRt.set(client.sessionId, {
      lastDamageAt: 0,
      diedAt: 0,
      dashUntil: 0,
      nextDashAt: 0,
      nextAttackAt: 0
    });
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
    this.playerRt.delete(client.sessionId);
  }

  private randomPlayerColor(): string {
    const h = Math.random() * 360;
    return this.hslToHex(h, 72, 60);
  }

  private hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

  private update(deltaTime: number) {
    const dt = Math.min(deltaTime / 1000, 0.05);
    const now = Date.now();

    this.updateWave(deltaTime);
    this.updatePlayers(dt, now);
    this.updateEnemies(dt, now);
    this.updateProjectiles(dt, now);
    this.updateOrbs(dt, now);
    this.spawnEnemies(deltaTime);

    // 30 patchs/s : suffisant avec l'interpolation client, moitié moins de bande passante
    this.tickCounter++;
    if (this.tickCounter % 2 === 0) {
      this.broadcastPatch();
    }
  }

  private updateWave(deltaTime: number) {
    this.waveTimer += deltaTime;
    if (this.waveTimer >= WAVE_DURATION) {
      this.waveTimer = 0;
      this.state.wave = Math.min(999, this.state.wave + 1);
    }
  }

  private playerDamage(level: number): number {
    return 18 + level * 4;
  }

  private playerShots(level: number): number {
    return Math.min(3, 1 + Math.floor(level / 4));
  }

  private updatePlayers(dt: number, now: number) {
    this.state.players.forEach((player: PlayerState) => {
      const rt = this.playerRt.get(player.id);
      const input = this.inputs.get(player.id);
      if (!rt || !input) return;

      if (player.dead) {
        player.vx = 0;
        player.vy = 0;
        if (now - rt.diedAt >= RESPAWN_DELAY) {
          player.dead = false;
          player.hp = player.maxHp;
          player.x = WORLD_WIDTH / 2 + (Math.random() - 0.5) * 200;
          player.y = WORLD_HEIGHT / 2 + (Math.random() - 0.5) * 200;
        }
        return;
      }

      let { dx, dy } = input;
      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          dx /= len;
          dy /= len;
        }
      }

      const speed = now < rt.dashUntil ? PLAYER_SPEED * DASH_MULTIPLIER : PLAYER_SPEED;
      player.vx = dx * speed;
      player.vy = dy * speed;
      player.x = Math.max(16, Math.min(WORLD_WIDTH - 16, player.x + player.vx * dt));
      player.y = Math.max(16, Math.min(WORLD_HEIGHT - 16, player.y + player.vy * dt));

      // Régénération hors combat
      if (player.hp < player.maxHp && now - rt.lastDamageAt > REGEN_DELAY) {
        player.hp = Math.min(player.maxHp, player.hp + REGEN_PER_SEC * dt);
      }
    });
  }

  private damagePlayer(player: PlayerState, amount: number, now: number) {
    if (player.dead) return;
    const rt = this.playerRt.get(player.id);
    if (rt) rt.lastDamageAt = now;
    player.hp -= amount;
    if (player.hp <= 0) {
      player.hp = 0;
      player.dead = true;
      if (rt) rt.diedAt = now;
    }
  }

  private updateEnemies(dt: number, now: number) {
    this.state.enemies.forEach((enemy: EnemyState) => {
      const def = ENEMY_KINDS[enemy.kind] ?? ENEMY_KINDS[0];
      const target = this.findNearestAlivePlayer(enemy.x, enemy.y);
      if (!target) {
        enemy.vx = 0;
        enemy.vy = 0;
        return;
      }

      let dx = target.x - enemy.x;
      let dy = target.y - enemy.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      if (dist > 1) {
        dx /= dist;
        dy /= dist;
      }

      let moveX = dx;
      let moveY = dy;

      if (def.ranged) {
        // Le cracheur garde ses distances et tire
        if (dist < 240) {
          moveX = -dx;
          moveY = -dy;
        } else if (dist < 380) {
          moveX = 0;
          moveY = 0;
        }
        const rt = this.enemyRt.get(enemy.id);
        if (rt && dist < 560 && now >= rt.nextShotAt) {
          rt.nextShotAt = now + 2400;
          this.spawnHostileProjectile(enemy, dx, dy);
        }
      }

      enemy.vx = moveX * def.speed;
      enemy.vy = moveY * def.speed;
      enemy.x = Math.max(16, Math.min(WORLD_WIDTH - 16, enemy.x + enemy.vx * dt));
      enemy.y = Math.max(16, Math.min(WORLD_HEIGHT - 16, enemy.y + enemy.vy * dt));

      // Dégâts de contact
      const contactDist = def.radius + PLAYER_RADIUS;
      if (distSq < contactDist * contactDist) {
        const rt = this.enemyRt.get(enemy.id);
        if (rt && now >= rt.nextContactAt) {
          rt.nextContactAt = now + 900;
          this.damagePlayer(target, def.contactDamage, now);
        }
      }
    });
  }

  private findNearestAlivePlayer(x: number, y: number): PlayerState | null {
    let nearest: PlayerState | null = null;
    let nearestDistSq = Infinity;

    this.state.players.forEach((player: PlayerState) => {
      if (player.dead) return;
      const dx = player.x - x;
      const dy = player.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearest = player;
      }
    });

    return nearest;
  }

  private spawnEnemies(deltaTime: number) {
    this.lastSpawn += deltaTime;
    const wave = this.state.wave;
    const spawnInterval = Math.max(700, 2800 - wave * 140);
    if (this.lastSpawn < spawnInterval) return;
    this.lastSpawn = 0;

    const alivePlayers: PlayerState[] = [];
    this.state.players.forEach((p: PlayerState) => {
      if (!p.dead) alivePlayers.push(p);
    });
    if (alivePlayers.length === 0) return;

    const maxEnemies = Math.min(60, 8 + wave * 3 + alivePlayers.length * 6);
    if (this.state.enemies.size >= maxEnemies) return;

    const kinds = ENEMY_KINDS.filter((k) => k.minWave <= wave);
    const totalWeight = kinds.reduce((sum, k) => sum + k.weight, 0);
    let roll = Math.random() * totalWeight;
    let kindIndex = 0;
    for (const k of kinds) {
      roll -= k.weight;
      if (roll <= 0) {
        kindIndex = ENEMY_KINDS.indexOf(k);
        break;
      }
    }
    const def = ENEMY_KINDS[kindIndex];

    const enemy = new EnemyState();
    enemy.id = `enemy_${++this.enemyIdCounter}`;
    enemy.kind = kindIndex;
    enemy.maxHp = def.baseHp + def.hpPerWave * (wave - 1);
    enemy.hp = enemy.maxHp;

    // Spawn en anneau autour d'un joueur vivant aléatoire
    const anchor = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    const angle = Math.random() * Math.PI * 2;
    const radius = 520 + Math.random() * 320;
    enemy.x = Math.max(24, Math.min(WORLD_WIDTH - 24, anchor.x + Math.cos(angle) * radius));
    enemy.y = Math.max(24, Math.min(WORLD_HEIGHT - 24, anchor.y + Math.sin(angle) * radius));

    this.state.enemies.set(enemy.id, enemy);
    this.enemyRt.set(enemy.id, { nextContactAt: 0, nextShotAt: Date.now() + 1200 });
  }

  private handleAttack(ownerId: string, targetX: number, targetY: number) {
    const player = this.state.players.get(ownerId);
    const rt = this.playerRt.get(ownerId);
    if (!player || !rt || player.dead) return;

    const now = Date.now();
    if (now < rt.nextAttackAt) return;
    rt.nextAttackAt = now + ATTACK_COOLDOWN;

    let dx = targetX - player.x;
    let dy = targetY - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    dx /= dist;
    dy /= dist;

    const shots = this.playerShots(player.level);
    const damage = this.playerDamage(player.level);
    const baseAngle = Math.atan2(dy, dx);
    const spread = 0.13;

    for (let i = 0; i < shots; i++) {
      const offset = shots === 1 ? 0 : (i - (shots - 1) / 2) * spread;
      const angle = baseAngle + offset;
      this.spawnProjectile(player, Math.cos(angle), Math.sin(angle), damage);
    }
  }

  private spawnProjectile(player: PlayerState, dx: number, dy: number, damage: number) {
    const projectile = new ProjectileState();
    projectile.id = `proj_${++this.projectileIdCounter}`;
    projectile.ownerId = player.id;
    projectile.hostile = false;
    projectile.x = player.x;
    projectile.y = player.y;
    projectile.vx = dx * PROJECTILE_SPEED;
    projectile.vy = dy * PROJECTILE_SPEED;
    projectile.damage = damage;

    this.state.projectiles.set(projectile.id, projectile);
    this.projectileSpawnTimes.set(projectile.id, Date.now());
    this.projectileLifetimes.set(projectile.id, PROJECTILE_LIFETIME);
  }

  private spawnHostileProjectile(enemy: EnemyState, dx: number, dy: number) {
    const projectile = new ProjectileState();
    projectile.id = `proj_${++this.projectileIdCounter}`;
    projectile.ownerId = enemy.id;
    projectile.hostile = true;
    projectile.x = enemy.x;
    projectile.y = enemy.y;
    projectile.vx = dx * HOSTILE_PROJECTILE_SPEED;
    projectile.vy = dy * HOSTILE_PROJECTILE_SPEED;
    projectile.damage = 10 + this.state.wave;

    this.state.projectiles.set(projectile.id, projectile);
    this.projectileSpawnTimes.set(projectile.id, Date.now());
    this.projectileLifetimes.set(projectile.id, HOSTILE_PROJECTILE_LIFETIME);
  }

  private updateProjectiles(dt: number, now: number) {
    const projectilesToRemove = new Set<string>();
    const enemiesToRemove: EnemyState[] = [];

    this.state.projectiles.forEach((projectile: ProjectileState) => {
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;

      const spawnTime = this.projectileSpawnTimes.get(projectile.id) ?? now;
      const lifetime = this.projectileLifetimes.get(projectile.id) ?? PROJECTILE_LIFETIME;
      if (
        projectile.x < 0 || projectile.x > WORLD_WIDTH ||
        projectile.y < 0 || projectile.y > WORLD_HEIGHT ||
        now - spawnTime > lifetime
      ) {
        projectilesToRemove.add(projectile.id);
        return;
      }

      if (projectile.hostile) {
        this.state.players.forEach((player: PlayerState) => {
          if (player.dead || projectilesToRemove.has(projectile.id)) return;
          const dx = player.x - projectile.x;
          const dy = player.y - projectile.y;
          const hitDist = PLAYER_RADIUS + 7;
          if (dx * dx + dy * dy < hitDist * hitDist) {
            this.damagePlayer(player, projectile.damage, now);
            projectilesToRemove.add(projectile.id);
          }
        });
        return;
      }

      this.state.enemies.forEach((enemy: EnemyState) => {
        if (projectilesToRemove.has(projectile.id) || enemy.hp <= 0) return;
        const def = ENEMY_KINDS[enemy.kind] ?? ENEMY_KINDS[0];
        const dx = enemy.x - projectile.x;
        const dy = enemy.y - projectile.y;
        const hitDist = def.radius + 7;
        if (dx * dx + dy * dy < hitDist * hitDist) {
          enemy.hp -= projectile.damage;
          projectilesToRemove.add(projectile.id);
          if (enemy.hp <= 0) {
            enemy.hp = 0;
            enemiesToRemove.push(enemy);
            this.onEnemyKilled(enemy, projectile.ownerId);
          }
        }
      });
    });

    projectilesToRemove.forEach((id) => {
      this.state.projectiles.delete(id);
      this.projectileSpawnTimes.delete(id);
      this.projectileLifetimes.delete(id);
    });

    enemiesToRemove.forEach((enemy) => {
      this.state.enemies.delete(enemy.id);
      this.enemyRt.delete(enemy.id);
    });
  }

  private onEnemyKilled(enemy: EnemyState, killerId: string) {
    const def = ENEMY_KINDS[enemy.kind] ?? ENEMY_KINDS[0];
    const killer = this.state.players.get(killerId);
    if (killer) {
      killer.kills += 1;
      killer.score += def.xp;
    }
    this.spawnOrb(enemy.x, enemy.y, def.xp);
  }

  private spawnOrb(x: number, y: number, value: number) {
    if (this.state.orbs.size >= MAX_ORBS) {
      let oldestId: string | null = null;
      let oldestTime = Infinity;
      this.orbSpawnTimes.forEach((time, id) => {
        if (time < oldestTime) {
          oldestTime = time;
          oldestId = id;
        }
      });
      if (oldestId) {
        this.state.orbs.delete(oldestId);
        this.orbSpawnTimes.delete(oldestId);
      }
    }

    const orb = new OrbState();
    orb.id = `orb_${++this.orbIdCounter}`;
    orb.x = x + (Math.random() - 0.5) * 20;
    orb.y = y + (Math.random() - 0.5) * 20;
    orb.value = value;
    this.state.orbs.set(orb.id, orb);
    this.orbSpawnTimes.set(orb.id, Date.now());
  }

  private updateOrbs(dt: number, now: number) {
    const toRemove: string[] = [];

    this.state.orbs.forEach((orb: OrbState) => {
      const spawnTime = this.orbSpawnTimes.get(orb.id) ?? now;
      if (now - spawnTime > ORB_LIFETIME) {
        toRemove.push(orb.id);
        return;
      }

      const player = this.findNearestAlivePlayer(orb.x, orb.y);
      if (!player) return;

      const dx = player.x - orb.x;
      const dy = player.y - orb.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < ORB_PICKUP_DIST_SQ) {
        this.grantXp(player, orb.value);
        toRemove.push(orb.id);
      } else if (distSq < ORB_MAGNET_DIST_SQ) {
        const dist = Math.sqrt(distSq);
        orb.x += (dx / dist) * ORB_MAGNET_SPEED * dt;
        orb.y += (dy / dist) * ORB_MAGNET_SPEED * dt;
      }
    });

    toRemove.forEach((id) => {
      this.state.orbs.delete(id);
      this.orbSpawnTimes.delete(id);
    });
  }

  private grantXp(player: PlayerState, amount: number) {
    player.xp += amount;
    player.score += Math.round(amount / 2);
    while (player.xp >= player.xpToNext) {
      player.xp -= player.xpToNext;
      player.level += 1;
      player.xpToNext = Math.round(player.xpToNext * 1.35);
      player.maxHp += 12;
      player.hp = player.maxHp;
    }
  }
}
