import { Server, Socket } from 'socket.io';
import { RoomManager } from '../game/RoomManager';
import { RoleAssigner } from '../game/RoleAssigner';
import { NarrationEvent } from '../types/game';
import { logger } from '../utils/logger';

export function setupSocketHandlers(io: Server, roomManager: RoomManager): void {

  function emitToRoom(roomCode: string, event: string, data: any) {
    io.to(roomCode).emit(event, data);
  }

  function emitGameStateToAll(roomCode: string) {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;
    roomManager.touchRoom(roomCode);

    for (const playerId of room.getConnectedPlayerIds()) {
      const socketId = room.getSocketIdForPlayer(playerId);
      if (socketId) {
        io.to(socketId).emit('gameState', room.getClientState(playerId));
      }
    }
  }

  function emitNightPhaseToAll(roomCode: string) {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;
    roomManager.touchRoom(roomCode);

    for (const playerId of room.getConnectedPlayerIds()) {
      const socketId = room.getSocketIdForPlayer(playerId);
      if (socketId) {
        const nightData = room.getNightPhaseData(playerId);
        io.to(socketId).emit('nightPhaseUpdate', nightData);
      }
    }
  }

  function emitVotingToAll(roomCode: string) {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;
    roomManager.touchRoom(roomCode);
    emitToRoom(roomCode, 'votingUpdate', room.getVotingData());
  }

  function emitNarration(roomCode: string, narrations: NarrationEvent[]) {
    emitToRoom(roomCode, 'narration', narrations);
  }

  function emitNightChatToRole(roomCode: string, role: 'mafia' | 'doctor' | 'detective') {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;
    const messages = room.getNightChatForRole(role);
    const playersInRole = room.getAlivePlayersByRole(role);
    for (const p of playersInRole) {
      const sid = room.getSocketIdForPlayer(p.id);
      if (sid) io.to(sid).emit('nightChatUpdate', { messages });
    }
  }

  function broadcastAndState(roomCode: string, narrations: NarrationEvent[]) {
    emitNarration(roomCode, narrations);
    const totalDelay = narrations.reduce((sum, n) => sum + (n.delay || 0), 0);
    setTimeout(() => {
      emitGameStateToAll(roomCode);
      const room = roomManager.getRoom(roomCode);
      if (!room) return;
      const phase = room.getPhase();
      if (phase.startsWith('night_')) {
        emitNightPhaseToAll(roomCode);
      } else if (phase === 'day_voting') {
        emitVotingToAll(roomCode);
      }
    }, totalDelay);
  }

  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);
    let currentRoomCode: string | null = null;
    let currentPlayerId: string | null = null;

    // --- LOBBY ---

    socket.on('createRoom', (data: { playerName: string }, callback: Function) => {
      const { playerName } = data;
      if (!playerName || playerName.trim().length === 0) {
        return callback({ success: false, error: 'Name is required' });
      }

      const result = roomManager.createRoom(socket.id, playerName.trim());
      currentRoomCode = result.roomCode;
      currentPlayerId = result.hostId;
      socket.join(result.roomCode);

      const room = roomManager.getRoom(result.roomCode)!;
      callback({
        success: true,
        roomCode: result.roomCode,
        playerId: result.hostId,
        token: result.token,
        gameState: room.getClientState(result.hostId)
      });

      logger.gameEvent('Room created', result.roomCode, { host: playerName });
    });

    socket.on('joinRoom', (data: { roomCode: string; playerName: string }, callback: Function) => {
      const { roomCode, playerName } = data;
      if (!roomCode || !playerName || playerName.trim().length === 0) {
        return callback({ success: false, error: 'Room code and name are required' });
      }

      const room = roomManager.getRoom(roomCode);
      if (!room) {
        return callback({ success: false, error: 'Room not found' });
      }

      const result = room.addPlayer(socket.id, playerName.trim());
      if (!result) {
        return callback({ success: false, error: 'Cannot join. Game may have started, room is full, or name is taken.' });
      }

      currentRoomCode = roomCode.toUpperCase();
      currentPlayerId = result.player.id;
      socket.join(currentRoomCode);

      callback({
        success: true,
        roomCode: currentRoomCode,
        playerId: result.player.id,
        token: result.token,
        gameState: room.getClientState(result.player.id)
      });

      emitGameStateToAll(currentRoomCode);
      logger.gameEvent('Player joined', currentRoomCode, { name: playerName });
    });

    socket.on('rejoinRoom', (data: { token: string }, callback: Function) => {
      const { token } = data;
      if (!token) return callback({ success: false, error: 'Token required' });

      for (const code of roomManager.getRoomCodes()) {
        const room = roomManager.getRoom(code);
        if (!room) continue;

        const player = room.rejoinPlayer(token, socket.id);
        if (player) {
          currentRoomCode = code;
          currentPlayerId = player.id;
          socket.join(code);

          callback({
            success: true,
            roomCode: code,
            playerId: player.id,
            gameState: room.getClientState(player.id)
          });

          emitGameStateToAll(code);
          emitToRoom(code, 'playerReconnected', { playerName: player.name });

          const phase = room.getPhase();
          if (phase.startsWith('night_')) {
            const nightData = room.getNightPhaseData(player.id);
            if (nightData) socket.emit('nightPhaseUpdate', nightData);
          } else if (phase === 'day_voting') {
            socket.emit('votingUpdate', room.getVotingData());
          }

          logger.gameEvent('Player rejoined', code, { name: player.name });
          return;
        }
      }

      callback({ success: false, error: 'Could not find your session' });
    });

    // --- GAME START ---

    socket.on('startGame', (dataOrCb?: { mafia?: number; doctor?: number; detective?: number } | Function, callback?: Function) => {
      const cb = typeof dataOrCb === 'function' ? dataOrCb : callback;
      const data = typeof dataOrCb === 'object' && dataOrCb ? dataOrCb : undefined;
      if (!currentRoomCode || !currentPlayerId) {
        return cb?.({ success: false, error: 'Not in a room' });
      }

      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return cb?.({ success: false, error: 'Room not found' });

      const player = room.getPlayer(currentPlayerId);
      if (!player?.isHost) return cb?.({ success: false, error: 'Only host can start' });

      const def = RoleAssigner.getDistribution(room.getPlayerCount());
      const configClean =
        data && (data.mafia !== undefined || data.doctor !== undefined || data.detective !== undefined)
          ? {
              mafia: data.mafia ?? def.mafia,
              doctor: data.doctor ?? def.doctor,
              detective: data.detective ?? def.detective
            }
          : undefined;

      const narrations = room.startGame(configClean);
      if (!narrations) return cb?.({ success: false, error: 'Cannot start. Need at least 5 players, or invalid role counts.' });

      cb?.({ success: true });
      broadcastAndState(currentRoomCode, narrations);
    });

    // --- HOST QUIT ---

    socket.on('hostQuit', () => {
      if (!currentRoomCode || !currentPlayerId) return;
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return;
      const player = room.getPlayer(currentPlayerId);
      if (!player?.isHost) return;

      emitToRoom(currentRoomCode, 'roomClosed', { reason: 'Host ended the game' });
      io.in(currentRoomCode).socketsLeave(currentRoomCode);
      roomManager.deleteRoom(currentRoomCode);
      logger.gameEvent('Host quit game', currentRoomCode, {});
    });

    // --- PHASE TRANSITIONS ---

    socket.on('readyForNight', () => {
      if (!currentRoomCode) return;
      const room = roomManager.getRoom(currentRoomCode);
      if (!room || room.getPhase() !== 'role_reveal') return;

      const player = room.getPlayer(currentPlayerId!);
      if (!player?.isHost) return;

      const narrations = room.startNight();
      broadcastAndState(currentRoomCode, narrations);
    });

    socket.on('startVoting', () => {
      if (!currentRoomCode || !currentPlayerId) return;
      const room = roomManager.getRoom(currentRoomCode);
      if (!room || room.getPhase() !== 'day_discussion') return;

      const player = room.getPlayer(currentPlayerId);
      if (!player?.isHost) return;

      const narrations = room.startVoting();
      broadcastAndState(currentRoomCode, narrations);
    });

    socket.on('startNextNight', () => {
      if (!currentRoomCode || !currentPlayerId) return;
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return;

      const player = room.getPlayer(currentPlayerId);
      if (!player?.isHost) return;
      if (room.getPhase() !== 'day_discussion') return;

      const narrations = room.startNight();
      broadcastAndState(currentRoomCode, narrations);
    });

    // --- NIGHT ACTIONS ---

    socket.on('nightSelect', (data: { targetId: string }) => {
      if (!currentRoomCode || !currentPlayerId) return;
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return;

      const player = room.getPlayer(currentPlayerId);
      if (!player) return;

      const phase = room.getPhase();
      let success = false;

      if (phase === 'night_mafia' && player.role === 'mafia') {
        success = room.mafiaSelect(currentPlayerId, data.targetId);
      } else if (phase === 'night_doctor' && player.role === 'doctor') {
        success = room.doctorSelect(currentPlayerId, data.targetId);
      } else if (phase === 'night_detective' && player.role === 'detective') {
        success = room.detectiveSelect(currentPlayerId, data.targetId);
      }

      if (success) emitNightPhaseToAll(currentRoomCode);
    });

    socket.on('nightConfirm', () => {
      if (!currentRoomCode || !currentPlayerId) return;
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return;

      const player = room.getPlayer(currentPlayerId);
      if (!player) return;

      const phase = room.getPhase();

      if (phase === 'night_mafia' && player.role === 'mafia') {
        room.mafiaConfirm(currentPlayerId);
        emitNightPhaseToAll(currentRoomCode);
        if (room.isMafiaPhaseComplete()) {
          const narrations = room.advanceFromMafia();
          broadcastAndState(currentRoomCode, narrations);
        }
      } else if (phase === 'night_doctor' && player.role === 'doctor') {
        room.doctorConfirm(currentPlayerId);
        emitNightPhaseToAll(currentRoomCode);
        if (room.isDoctorPhaseComplete()) {
          const narrations = room.advanceFromDoctor();
          broadcastAndState(currentRoomCode, narrations);
        }
      } else if (phase === 'night_detective' && player.role === 'detective') {
        room.detectiveConfirm(currentPlayerId);
        emitNightPhaseToAll(currentRoomCode);
        if (room.isDetectivePhaseComplete()) {
          const narrations = room.advanceFromDetective();
          broadcastAndState(currentRoomCode, narrations);
        }
      }
    });

    socket.on('nightUnconfirm', () => {
      if (!currentRoomCode || !currentPlayerId) return;
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return;

      const player = room.getPlayer(currentPlayerId);
      if (!player) return;
      const phase = room.getPhase();

      if (phase === 'night_mafia' && player.role === 'mafia') {
        room.mafiaUnconfirm(currentPlayerId);
      } else if (phase === 'night_doctor' && player.role === 'doctor') {
        room.doctorUnconfirm(currentPlayerId);
      } else if (phase === 'night_detective' && player.role === 'detective') {
        room.detectiveUnconfirm(currentPlayerId);
      }

      emitNightPhaseToAll(currentRoomCode);
    });

    socket.on('nightChatMessage', (data: { text: string }) => {
      if (!currentRoomCode || !currentPlayerId) return;
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return;
      const player = room.getPlayer(currentPlayerId);
      if (!player?.role || player.role === 'civilian') return;
      const role = player.role as 'mafia' | 'doctor' | 'detective';
      if (room.addNightChatMessage(currentPlayerId, data.text)) {
        emitNightChatToRole(currentRoomCode, role);
      }
    });

    // --- DAY VOTING ---

    socket.on('castVote', (data: { targetId: string }) => {
      if (!currentRoomCode || !currentPlayerId) return;
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return;

      if (room.castVote(currentPlayerId, data.targetId)) {
        emitVotingToAll(currentRoomCode);

        const status = room.getVotingStatus();
        if (status.allVoted && status.hasMajority) {
          const narrations = room.resolveVoting();
          if (narrations) {
            broadcastAndState(currentRoomCode, narrations);
          }
        }
      }
    });

    socket.on('removeVote', () => {
      if (!currentRoomCode || !currentPlayerId) return;
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return;

      if (room.removeVote(currentPlayerId)) {
        emitVotingToAll(currentRoomCode);
      }
    });

    // --- DISCONNECT ---

    socket.on('disconnect', () => {
      if (!currentRoomCode || !currentPlayerId) return;
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return;

      const playerName = room.getPlayer(currentPlayerId)?.name || 'Unknown';
      room.removePlayer(currentPlayerId);
      emitGameStateToAll(currentRoomCode);
      emitToRoom(currentRoomCode, 'playerDisconnected', { playerName });

      logger.info(`Client disconnected: ${socket.id} (${playerName})`);

      // Auto-advance night phases if disconnected player was blocking them
      // Use a loop to chain through phases (e.g., mafia done → doctor already disconnected → detective)
      let advanced = true;
      while (advanced) {
        advanced = false;
        const currentPhase = room.getPhase();
        if (currentPhase === 'night_mafia' && room.isMafiaPhaseComplete()) {
          const narrations = room.advanceFromMafia();
          broadcastAndState(currentRoomCode!, narrations);
          advanced = true;
        } else if (currentPhase === 'night_doctor' && room.isDoctorPhaseComplete()) {
          const narrations = room.advanceFromDoctor();
          broadcastAndState(currentRoomCode!, narrations);
          advanced = true;
        } else if (currentPhase === 'night_detective' && room.isDetectivePhaseComplete()) {
          const narrations = room.advanceFromDetective();
          broadcastAndState(currentRoomCode!, narrations);
          advanced = true;
        }
      }

      // Auto-resolve voting if disconnected player was the last non-voter
      if (room.getPhase() === 'day_voting') {
        const status = room.getVotingStatus();
        if (status.allVoted && status.hasMajority) {
          const narrations = room.resolveVoting();
          if (narrations) broadcastAndState(currentRoomCode!, narrations);
        }
      }
    });
  });
}
