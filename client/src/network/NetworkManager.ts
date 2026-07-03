import { Client, Room } from 'colyseus.js';
import type { GameState } from '../../../shared/schema/GameState';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'ws://localhost:2567';

export class NetworkManager {
  private client: Client;
  public room: Room<GameState> | null = null;

  constructor() {
    this.client = new Client(SERVER_URL);
  }

  async join(): Promise<Room<GameState>> {
    this.room = await this.client.joinOrCreate<GameState>('game');
    return this.room;
  }

  sendInput(dx: number, dy: number) {
    this.room?.send('input', { dx, dy });
  }

  sendAttack(targetX: number, targetY: number) {
    this.room?.send('attack', { targetX, targetY });
  }

  sendDash() {
    this.room?.send('dash');
  }

  leave() {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
  }
}
