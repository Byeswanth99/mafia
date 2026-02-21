"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
const GameRoom_1 = require("./GameRoom");
const logger_1 = require("../utils/logger");
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.roomCreationTimes = new Map();
    }
    generateRoomCode() {
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
    createRoom(hostSocketId, hostName) {
        const roomCode = this.generateRoomCode();
        const room = new GameRoom_1.GameRoom(roomCode, hostSocketId, hostName);
        this.rooms.set(roomCode, room);
        this.roomCreationTimes.set(roomCode, Date.now());
        const host = room.getPlayerBySocketId(hostSocketId);
        logger_1.logger.gameEvent('Room created', roomCode, `Total rooms: ${this.rooms.size}`);
        return { roomCode, hostId: host.id, token: host.playerToken };
    }
    getRoom(roomCode) {
        return this.rooms.get(roomCode.toUpperCase());
    }
    deleteRoom(roomCode) {
        this.rooms.delete(roomCode);
        this.roomCreationTimes.delete(roomCode);
        logger_1.logger.gameEvent('Room deleted', roomCode, `Remaining rooms: ${this.rooms.size}`);
    }
    getRoomCount() {
        return this.rooms.size;
    }
    cleanupStaleRooms() {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [roomCode, room] of this.rooms.entries()) {
            const creationTime = this.roomCreationTimes.get(roomCode) || now;
            const age = now - creationTime;
            const phase = room.getPhase();
            const shouldCleanup = (phase === 'game_over' && age > 180000) ||
                (phase === 'lobby' && age > 900000) ||
                (room.isAllPlayersDisconnected() && age > 120000) ||
                (age > 3600000);
            if (shouldCleanup) {
                logger_1.logger.cleanup(`Stale room ${roomCode}`, {
                    age: `${Math.round(age / 60000)} min`,
                    phase
                });
                this.deleteRoom(roomCode);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            logger_1.logger.cleanup(`Removed ${cleanedCount} stale room(s)`, `Remaining: ${this.rooms.size}`);
        }
        return cleanedCount;
    }
    getRoomCodes() {
        return Array.from(this.rooms.keys());
    }
}
exports.RoomManager = RoomManager;
