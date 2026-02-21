import { GameRoom } from './GameRoom';
import { logger } from '../utils/logger';

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private roomCreationTimes: Map<string, number> = new Map();
  private roomLastActivity: Map<string, number> = new Map();

  generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostSocketId: string, hostName: string): { roomCode: string; hostId: string; token: string } {
    const roomCode = this.generateRoomCode();
    const room = new GameRoom(roomCode, hostSocketId, hostName);
    const now = Date.now();
    this.rooms.set(roomCode, room);
    this.roomCreationTimes.set(roomCode, now);
    this.roomLastActivity.set(roomCode, now);

    const host = room.getPlayerBySocketId(hostSocketId)!;
    logger.gameEvent('Room created', roomCode, `Total rooms: ${this.rooms.size}`);
    return { roomCode, hostId: host.id, token: host.playerToken };
  }

  getRoom(roomCode: string): GameRoom | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  touchRoom(roomCode: string): void {
    this.roomLastActivity.set(roomCode, Date.now());
  }

  deleteRoom(roomCode: string): void {
    this.rooms.delete(roomCode);
    this.roomCreationTimes.delete(roomCode);
    this.roomLastActivity.delete(roomCode);
    logger.gameEvent('Room deleted', roomCode, `Remaining rooms: ${this.rooms.size}`);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getStaleRoomCodes(): string[] {
    const now = Date.now();
    const ONE_MIN = 60 * 1000;
    const ONE_HOUR = 60 * 60 * 1000;
    const THIRTY_MIN = 30 * 60 * 1000;
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
    const stale: string[] = [];

    for (const [roomCode, room] of this.rooms.entries()) {
      const lastActivity = this.roomLastActivity.get(roomCode) || now;
      const idle = now - lastActivity;
      const phase = room.getPhase();

      const shouldCleanup =
        (phase === 'game_over' && idle > ONE_MIN) ||
        (phase === 'lobby' && idle > ONE_HOUR) ||
        (room.isAllPlayersDisconnected() && idle > THIRTY_MIN) ||
        (idle > THREE_DAYS);

      if (shouldCleanup) {
        logger.cleanup(`Stale room ${roomCode}`, {
          idle: `${Math.round(idle / 60000)} min`,
          phase
        });
        stale.push(roomCode);
      }
    }

    return stale;
  }

  cleanupStaleRooms(): number {
    const stale = this.getStaleRoomCodes();
    for (const roomCode of stale) {
      this.deleteRoom(roomCode);
    }
    if (stale.length > 0) {
      logger.cleanup(`Removed ${stale.length} stale room(s)`, `Remaining: ${this.rooms.size}`);
    }
    return stale.length;
  }

  getRoomCodes(): string[] {
    return Array.from(this.rooms.keys());
  }
}
