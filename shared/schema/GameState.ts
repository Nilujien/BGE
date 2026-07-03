import { Schema, type, MapSchema } from '@colyseus/schema';

export class PlayerState extends Schema {
  @type('string')
  id: string = '';

  @type('float32')
  x: number = 0;

  @type('float32')
  y: number = 0;

  @type('float32')
  vx: number = 0;

  @type('float32')
  vy: number = 0;

  @type('string')
  color: string = '#ffffff';

  @type('float32')
  hp: number = 100;

  @type('float32')
  maxHp: number = 100;

  @type('uint16')
  level: number = 1;

  @type('float32')
  xp: number = 0;

  @type('float32')
  xpToNext: number = 30;

  @type('uint32')
  kills: number = 0;

  @type('uint32')
  score: number = 0;

  @type('boolean')
  dead: boolean = false;
}

export class EnemyState extends Schema {
  @type('string')
  id: string = '';

  @type('uint8')
  kind: number = 0;

  @type('float32')
  x: number = 0;

  @type('float32')
  y: number = 0;

  @type('float32')
  vx: number = 0;

  @type('float32')
  vy: number = 0;

  @type('float32')
  hp: number = 100;

  @type('float32')
  maxHp: number = 100;
}

export class ProjectileState extends Schema {
  @type('string')
  id: string = '';

  @type('string')
  ownerId: string = '';

  @type('boolean')
  hostile: boolean = false;

  @type('float32')
  x: number = 0;

  @type('float32')
  y: number = 0;

  @type('float32')
  vx: number = 0;

  @type('float32')
  vy: number = 0;

  @type('float32')
  damage: number = 25;
}

export class OrbState extends Schema {
  @type('string')
  id: string = '';

  @type('float32')
  x: number = 0;

  @type('float32')
  y: number = 0;

  @type('float32')
  value: number = 5;
}

export class GameState extends Schema {
  @type({ map: PlayerState })
  players = new MapSchema<PlayerState>();

  @type({ map: EnemyState })
  enemies = new MapSchema<EnemyState>();

  @type({ map: ProjectileState })
  projectiles = new MapSchema<ProjectileState>();

  @type({ map: OrbState })
  orbs = new MapSchema<OrbState>();

  @type('uint16')
  wave: number = 1;
}
