import { v4 as uuidv4 } from 'uuid';
import {
  Player, Role, GamePhase, NightActions,
  DayVotes, NightResult, ClientGameState, ClientPlayer, ClientNightResult,
  NightPhaseData, VotingData, NarrationEvent, Team, NightChatMessage
} from '../types/game';
import { RoleAssigner } from './RoleAssigner';
import { logger } from '../utils/logger';

export class GameRoom {
  private roomCode: string;
  private players: Map<string, Player> = new Map();
  private phase: GamePhase = 'lobby';
  private round: number = 0;
  private hostId: string;
  private nightActions: NightActions;
  private dayVotes: DayVotes;
  private nightResult: NightResult | null = null;
  private lastEliminatedPlayer: { name: string; role: Role } | null = null;
  private winners: Team | null = null;
  private phaseStartTime: number = Date.now();
  private nightChat: Record<'mafia' | 'doctor' | 'detective', NightChatMessage[]> = {
    mafia: [],
    doctor: [],
    detective: []
  };

  constructor(roomCode: string, hostSocketId: string, hostName: string) {
    this.roomCode = roomCode;
    this.nightActions = this.createEmptyNightActions();
    this.dayVotes = { votes: new Map() };

    const playerId = uuidv4();
    const token = uuidv4();
    this.hostId = playerId;
    this.players.set(playerId, {
      id: playerId,
      socketId: hostSocketId,
      name: hostName,
      role: null,
      isAlive: true,
      isConnected: true,
      isHost: true,
      playerToken: token
    });
  }

  private createEmptyNightActions(): NightActions {
    return {
      mafiaVotes: new Map(),
      mafiaConfirmed: new Set(),
      doctorSave: new Map(),
      doctorConfirmed: new Set(),
      detectiveInvestigate: new Map(),
      detectiveConfirmed: new Set(),
      detectiveResults: new Map()
    };
  }

  getRoomCode(): string { return this.roomCode; }
  getPhase(): GamePhase { return this.phase; }
  getHostId(): string { return this.hostId; }

  addPlayer(socketId: string, name: string): { player: Player; token: string } | null {
    if (this.phase !== 'lobby') return null;
    if (this.players.size >= 30) return null;

    const existingByName = Array.from(this.players.values()).find(
      p => p.name.toLowerCase() === name.toLowerCase()
    );
    if (existingByName) return null;

    const playerId = uuidv4();
    const token = uuidv4();
    const player: Player = {
      id: playerId,
      socketId,
      name,
      role: null,
      isAlive: true,
      isConnected: true,
      isHost: false,
      playerToken: token
    };
    this.players.set(playerId, player);
    logger.gameEvent('Player joined', this.roomCode, { name, playerId });
    return { player, token };
  }

  rejoinPlayer(token: string, newSocketId: string): Player | null {
    for (const player of this.players.values()) {
      if (player.playerToken === token) {
        player.socketId = newSocketId;
        player.isConnected = true;
        logger.gameEvent('Player rejoined', this.roomCode, { name: player.name });
        return player;
      }
    }
    return null;
  }

  removePlayer(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    if (this.phase === 'lobby') {
      this.players.delete(playerId);
      if (player.isHost && this.players.size > 0) {
        const nextHost = this.players.values().next().value!;
        nextHost.isHost = true;
        this.hostId = nextHost.id;
      }
      logger.gameEvent('Player left lobby', this.roomCode, { name: player.name });
      return true;
    }

    player.isConnected = false;

    if (player.isHost) {
      const nextHost = Array.from(this.players.values()).find(p => p.isConnected && p.id !== playerId);
      if (nextHost) {
        player.isHost = false;
        nextHost.isHost = true;
        this.hostId = nextHost.id;
        logger.gameEvent('Host transferred (disconnect)', this.roomCode, { newHost: nextHost.name });
      }
    }

    logger.gameEvent('Player disconnected', this.roomCode, { name: player.name });
    return true;
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  getPlayerBySocketId(socketId: string): Player | undefined {
    return Array.from(this.players.values()).find(p => p.socketId === socketId);
  }

  getPlayerCount(): number { return this.players.size; }

  getAlivePlayers(): Player[] {
    return Array.from(this.players.values()).filter(p => p.isAlive);
  }

  getAlivePlayersByRole(role: Role): Player[] {
    return this.getAlivePlayers().filter(p => p.role === role);
  }

  canStart(): boolean {
    return this.phase === 'lobby' && this.players.size >= 5;
  }

  startGame(config?: { mafia: number; doctor: number; detective: number }): NarrationEvent[] | null {
    if (!this.canStart()) return null;

    const n = this.players.size;
    let distribution: { mafia: number; doctor: number; detective: number; civilian: number };

    if (config) {
      const { mafia, doctor, detective } = config;
      const civilian = n - mafia - doctor - detective;
      if (mafia < 0 || doctor < 0 || detective < 0 || civilian < 0 || mafia + doctor + detective > n) {
        return null;
      }
      distribution = { mafia, doctor, detective, civilian };
    } else {
      distribution = RoleAssigner.getDistribution(n);
    }

    const playerIds = Array.from(this.players.keys());
    const roleAssignments = RoleAssigner.assignRoles(playerIds, distribution);

    roleAssignments.forEach((role, playerId) => {
      const player = this.players.get(playerId);
      if (player) player.role = role;
    });

    this.phase = 'role_reveal';
    this.round = 0;
    this.phaseStartTime = Date.now();

    logger.gameEvent('Game started', this.roomCode, {
      players: n,
      distribution: { mafia: distribution.mafia, doctor: distribution.doctor, detective: distribution.detective }
    });

    return [{ text: 'Roles have been assigned. Check your role carefully...', phase: 'role_reveal' }];
  }

  startNight(): NarrationEvent[] {
    this.round++;
    this.nightActions = this.createEmptyNightActions();
    this.nightResult = null;
    this.lastEliminatedPlayer = null;
    this.nightChat = { mafia: [], doctor: [], detective: [] };
    this.phase = 'night_mafia';
    this.phaseStartTime = Date.now();

    const narrations: NarrationEvent[] = [
      { text: `Night ${this.round} falls over the city. Everyone, close your eyes.`, phase: 'night_mafia', delay: 3000 },
      { text: 'Mafia, wake up. Choose your victim.', phase: 'night_mafia', delay: 1500 }
    ];

    logger.gameEvent(`Night ${this.round} started`, this.roomCode);
    return narrations;
  }

  // --- MAFIA NIGHT ACTIONS ---

  mafiaSelect(playerId: string, targetId: string): boolean {
    if (this.phase !== 'night_mafia') return false;
    const player = this.players.get(playerId);
    if (!player || player.role !== 'mafia' || !player.isAlive) return false;
    const target = this.players.get(targetId);
    if (!target || !target.isAlive || target.role === 'mafia') return false;

    this.nightActions.mafiaVotes.set(playerId, targetId);
    this.nightActions.mafiaConfirmed.delete(playerId);
    return true;
  }

  mafiaConfirm(playerId: string): boolean {
    if (this.phase !== 'night_mafia') return false;
    const player = this.players.get(playerId);
    if (!player || player.role !== 'mafia' || !player.isAlive) return false;
    if (!this.nightActions.mafiaVotes.has(playerId)) return false;

    this.nightActions.mafiaConfirmed.add(playerId);
    return true;
  }

  mafiaUnconfirm(playerId: string): boolean {
    if (this.phase !== 'night_mafia') return false;
    this.nightActions.mafiaConfirmed.delete(playerId);
    return true;
  }

  isMafiaPhaseComplete(): boolean {
    const aliveMafia = this.getAlivePlayersByRole('mafia');
    if (aliveMafia.length === 0) return true;

    const connectedMafia = aliveMafia.filter(p => p.isConnected);
    if (connectedMafia.length === 0) return true;

    const connectedConfirmed = connectedMafia.filter(p => this.nightActions.mafiaConfirmed.has(p.id));
    if (connectedConfirmed.length < connectedMafia.length) return false;

    const connectedTargets = connectedMafia
      .map(p => this.nightActions.mafiaVotes.get(p.id))
      .filter((t): t is string => t !== undefined);
    if (connectedTargets.length === 0) return false;
    const allSame = connectedTargets.every(t => t === connectedTargets[0]);
    return allSame;
  }

  getMafiaTarget(): string | null {
    const connectedMafia = this.getAlivePlayersByRole('mafia').filter(p => p.isConnected);
    const targets = connectedMafia
      .map(p => this.nightActions.mafiaVotes.get(p.id))
      .filter((t): t is string => t !== undefined);
    if (targets.length === 0) return null;
    return targets[0];
  }

  advanceFromMafia(): NarrationEvent[] {
    this.nightChat.mafia = [];
    this.phase = 'night_doctor';
    this.phaseStartTime = Date.now();

    const aliveDoctors = this.getAlivePlayersByRole('doctor');
    if (aliveDoctors.length === 0) {
      return this.advanceFromDoctor();
    }

    return [
      { text: 'Mafia, close your eyes.', phase: 'night_doctor', delay: 2000 },
      { text: 'Doctor, wake up. Choose someone to save.', phase: 'night_doctor', delay: 1500 }
    ];
  }

  // --- DOCTOR NIGHT ACTIONS ---

  doctorSelect(playerId: string, targetId: string): boolean {
    if (this.phase !== 'night_doctor') return false;
    const player = this.players.get(playerId);
    if (!player || player.role !== 'doctor' || !player.isAlive) return false;
    const target = this.players.get(targetId);
    if (!target || !target.isAlive) return false;

    this.nightActions.doctorSave.set(playerId, targetId);
    this.nightActions.doctorConfirmed.delete(playerId);
    return true;
  }

  doctorConfirm(playerId: string): boolean {
    if (this.phase !== 'night_doctor') return false;
    const player = this.players.get(playerId);
    if (!player || player.role !== 'doctor' || !player.isAlive) return false;
    if (!this.nightActions.doctorSave.has(playerId)) return false;

    this.nightActions.doctorConfirmed.add(playerId);
    return true;
  }

  doctorUnconfirm(playerId: string): boolean {
    if (this.phase !== 'night_doctor') return false;
    this.nightActions.doctorConfirmed.delete(playerId);
    return true;
  }

  isDoctorPhaseComplete(): boolean {
    const aliveDoctors = this.getAlivePlayersByRole('doctor');
    if (aliveDoctors.length === 0) return true;
    const connectedDoctors = aliveDoctors.filter(p => p.isConnected);
    if (connectedDoctors.length === 0) return true;
    return this.nightActions.doctorConfirmed.size >= connectedDoctors.length;
  }

  getDoctorSaves(): string[] {
    return Array.from(this.nightActions.doctorSave.values());
  }

  advanceFromDoctor(): NarrationEvent[] {
    this.nightChat.doctor = [];
    this.phase = 'night_detective';
    this.phaseStartTime = Date.now();

    const aliveDetectives = this.getAlivePlayersByRole('detective');
    if (aliveDetectives.length === 0) {
      return this.advanceFromDetective();
    }

    return [
      { text: 'Doctor, close your eyes.', phase: 'night_detective', delay: 2000 },
      { text: 'Detective, wake up. Point at someone to investigate.', phase: 'night_detective', delay: 1500 }
    ];
  }

  // --- DETECTIVE NIGHT ACTIONS ---

  detectiveSelect(playerId: string, targetId: string): boolean {
    if (this.phase !== 'night_detective') return false;
    const player = this.players.get(playerId);
    if (!player || player.role !== 'detective' || !player.isAlive) return false;
    const target = this.players.get(targetId);
    if (!target || !target.isAlive) return false;

    this.nightActions.detectiveInvestigate.set(playerId, targetId);
    this.nightActions.detectiveConfirmed.delete(playerId);
    return true;
  }

  detectiveConfirm(playerId: string): boolean {
    if (this.phase !== 'night_detective') return false;
    const player = this.players.get(playerId);
    if (!player || player.role !== 'detective' || !player.isAlive) return false;
    if (!this.nightActions.detectiveInvestigate.has(playerId)) return false;

    this.nightActions.detectiveConfirmed.add(playerId);

    const targetId = this.nightActions.detectiveInvestigate.get(playerId)!;
    const target = this.players.get(targetId)!;
    this.nightActions.detectiveResults.set(playerId, target.role === 'mafia');

    return true;
  }

  detectiveUnconfirm(playerId: string): boolean {
    if (this.phase !== 'night_detective') return false;
    this.nightActions.detectiveConfirmed.delete(playerId);
    this.nightActions.detectiveResults.delete(playerId);
    return true;
  }

  isDetectivePhaseComplete(): boolean {
    const aliveDetectives = this.getAlivePlayersByRole('detective');
    if (aliveDetectives.length === 0) return true;
    const connectedDetectives = aliveDetectives.filter(p => p.isConnected);
    if (connectedDetectives.length === 0) return true;
    return this.nightActions.detectiveConfirmed.size >= connectedDetectives.length;
  }

  getDetectiveResult(playerId: string): boolean | undefined {
    return this.nightActions.detectiveResults.get(playerId);
  }

  advanceFromDetective(): NarrationEvent[] {
    const mafiaTarget = this.getMafiaTarget();
    const doctorSaves = this.getDoctorSaves();

    const savedByDoctor = mafiaTarget !== null && doctorSaves.includes(mafiaTarget);
    let killedPlayer: Player | null = null;

    if (mafiaTarget && !savedByDoctor) {
      const victim = this.players.get(mafiaTarget);
      if (victim) {
        victim.isAlive = false;
        killedPlayer = victim;
        this.transferHostIfEliminated();
      }
    }

    this.nightChat.detective = [];
    this.nightResult = { killedPlayer, savedByDoctor };
    this.phase = 'day_discussion';
    this.phaseStartTime = Date.now();

    const narrations: NarrationEvent[] = [
      { text: 'Detective, close your eyes.', phase: 'day_discussion', delay: 2000 },
      { text: 'Dawn breaks. The city wakes up.', phase: 'day_discussion', delay: 2500 }
    ];

    if (killedPlayer) {
      narrations.push({
        text: `Last night, ${killedPlayer.name} was killed by the mafia. They were a ${killedPlayer.role}.`,
        phase: 'day_discussion',
        delay: 3000
      });
    } else if (savedByDoctor) {
      narrations.push({
        text: 'The doctor saved someone last night! Nobody died.',
        phase: 'day_discussion',
        delay: 2500
      });
    } else {
      narrations.push({
        text: 'It was a peaceful night. Nobody died.',
        phase: 'day_discussion',
        delay: 2500
      });
    }

    logger.gameEvent('Night resolved', this.roomCode, {
      killed: killedPlayer?.name || 'nobody',
      saved: savedByDoctor
    });

    const winCheck = this.checkWinCondition();
    if (winCheck) {
      this.nightChat = { mafia: [], doctor: [], detective: [] };
      this.phase = 'game_over';
      this.winners = winCheck;
      narrations.push({
        text: winCheck === 'town'
          ? 'The town has rid itself of all Mafia. Town wins!'
          : 'The Mafia has taken over the city. Mafia wins!',
        phase: 'game_over',
        delay: 3000
      });
    }

    return narrations;
  }

  // --- DAY VOTING ---

  startVoting(): NarrationEvent[] {
    this.phase = 'day_voting';
    this.dayVotes = { votes: new Map() };
    this.phaseStartTime = Date.now();

    return [
      { text: 'Time to vote. Who do you think is the Mafia?', phase: 'day_voting', delay: 1500 }
    ];
  }

  castVote(voterId: string, targetId: string): boolean {
    if (this.phase !== 'day_voting') return false;
    const voter = this.players.get(voterId);
    if (!voter || !voter.isAlive) return false;
    const target = this.players.get(targetId);
    if (!target || !target.isAlive) return false;
    if (voterId === targetId) return false;

    this.dayVotes.votes.set(voterId, targetId);
    return true;
  }

  removeVote(voterId: string): boolean {
    if (this.phase !== 'day_voting') return false;
    this.dayVotes.votes.delete(voterId);
    return true;
  }

  getVotingStatus(): { allVoted: boolean; hasMajority: boolean; eliminatedId: string | null } {
    const aliveConnected = this.getAlivePlayers().filter(p => p.isConnected);
    const allVoted = this.dayVotes.votes.size >= aliveConnected.length;

    if (!allVoted) {
      return { allVoted: false, hasMajority: false, eliminatedId: null };
    }

    const voteCounts = new Map<string, number>();
    for (const targetId of this.dayVotes.votes.values()) {
      voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
    }

    let maxVotes = 0;
    let maxTargets: string[] = [];
    for (const [targetId, count] of voteCounts) {
      if (count > maxVotes) {
        maxVotes = count;
        maxTargets = [targetId];
      } else if (count === maxVotes) {
        maxTargets.push(targetId);
      }
    }

    const hasMajority = maxTargets.length === 1;
    return {
      allVoted: true,
      hasMajority,
      eliminatedId: hasMajority ? maxTargets[0] : null
    };
  }

  resolveVoting(): NarrationEvent[] | null {
    const { allVoted, hasMajority, eliminatedId } = this.getVotingStatus();
    if (!allVoted || !hasMajority || !eliminatedId) return null;

    const eliminated = this.players.get(eliminatedId);
    if (!eliminated) return null;

    eliminated.isAlive = false;
    this.lastEliminatedPlayer = { name: eliminated.name, role: eliminated.role! };
    this.transferHostIfEliminated();
    this.phase = 'day_discussion';
    this.phaseStartTime = Date.now();

    const narrations: NarrationEvent[] = [
      {
        text: `The town has spoken. ${eliminated.name} has been eliminated. They were a ${eliminated.role}.`,
        phase: 'day_discussion',
        delay: 3000
      }
    ];

    logger.gameEvent('Player eliminated by vote', this.roomCode, {
      name: eliminated.name,
      role: eliminated.role
    });

    const winCheck = this.checkWinCondition();
    if (winCheck) {
      this.nightChat = { mafia: [], doctor: [], detective: [] };
      this.phase = 'game_over';
      this.winners = winCheck;
      narrations.push({
        text: winCheck === 'town'
          ? 'The town has rid itself of all Mafia. Town wins!'
          : 'The Mafia has taken over the city. Mafia wins!',
        phase: 'game_over',
        delay: 3000
      });
    }

    return narrations;
  }

  addNightChatMessage(playerId: string, text: string): boolean {
    const player = this.players.get(playerId);
    if (!player?.isAlive || !player.role) return false;
    const role = player.role;
    if (role === 'civilian') return false;
    const phaseRole = this.phase === 'night_mafia' ? 'mafia' : this.phase === 'night_doctor' ? 'doctor' : this.phase === 'night_detective' ? 'detective' : null;
    if (phaseRole !== role) return false;
    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return false;
    this.nightChat[phaseRole].push({ playerName: player.name, text: trimmed, ts: Date.now() });
    return true;
  }

  getNightChatForRole(role: 'mafia' | 'doctor' | 'detective'): NightChatMessage[] {
    return [...this.nightChat[role]];
  }

  private checkWinCondition(): Team | null {
    const aliveMafia = this.getAlivePlayersByRole('mafia').length;
    const aliveTown = this.getAlivePlayers().length - aliveMafia;

    if (aliveMafia === 0) return 'town';
    if (aliveMafia >= aliveTown) return 'mafia';
    return null;
  }

  // --- STATE SERIALIZATION ---

  getClientState(forPlayerId: string): ClientGameState {
    const player = this.players.get(forPlayerId);
    let sanitizedNightResult: ClientNightResult | null = null;
    if (this.nightResult) {
      sanitizedNightResult = {
        killedPlayer: this.nightResult.killedPlayer
          ? { name: this.nightResult.killedPlayer.name, role: this.nightResult.killedPlayer.role! }
          : null,
        savedByDoctor: this.nightResult.savedByDoctor
      };
    }
    return {
      roomCode: this.roomCode,
      phase: this.phase,
      players: this.getClientPlayers(forPlayerId),
      hostId: this.hostId,
      round: this.round,
      nightResult: sanitizedNightResult,
      lastEliminatedPlayer: this.lastEliminatedPlayer,
      winners: this.winners,
      phaseStartTime: this.phaseStartTime,
      myRole: player?.role || null,
      myId: forPlayerId
    };
  }

  private getClientPlayers(forPlayerId: string): ClientPlayer[] {
    return Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      isAlive: p.isAlive,
      isConnected: p.isConnected,
      isHost: p.isHost,
      role: this.shouldRevealRole(p, forPlayerId) ? p.role : null
    }));
  }

  private shouldRevealRole(player: Player, forPlayerId: string): boolean {
    if (this.phase === 'game_over') return true;
    if (!player.isAlive) return true;
    if (player.id === forPlayerId) return true;
    // Mafia can see other mafia members
    const viewer = this.players.get(forPlayerId);
    if (viewer?.role === 'mafia' && player.role === 'mafia' && viewer.isAlive) return true;
    return false;
  }

  getNightPhaseData(forPlayerId: string): NightPhaseData | null {
    const player = this.players.get(forPlayerId);
    if (!player || !player.isAlive || !player.role) return null;

    const alivePlayers = this.getAlivePlayers().map(p => ({
      id: p.id,
      name: p.name,
      isAlive: p.isAlive,
      isConnected: p.isConnected,
      isHost: p.isHost,
      role: this.shouldRevealRole(p, forPlayerId) ? p.role : null
    }));

    const sameRoleCount = this.getAlivePlayersByRole(player.role).length;

    const data: NightPhaseData = {
      phase: this.phase,
      myRole: player.role,
      alivePlayers,
      selections: {},
      confirmed: [],
      sameRoleCount
    };

    if (this.phase === 'night_mafia' && player.role === 'mafia') {
      for (const [mafiaId, targetId] of this.nightActions.mafiaVotes) {
        data.selections[mafiaId] = targetId;
      }
      data.confirmed = Array.from(this.nightActions.mafiaConfirmed);
      data.chatMessages = this.getNightChatForRole('mafia');
    } else if (this.phase === 'night_doctor' && player.role === 'doctor') {
      for (const [docId, targetId] of this.nightActions.doctorSave) {
        data.selections[docId] = targetId;
      }
      data.confirmed = Array.from(this.nightActions.doctorConfirmed);
      data.chatMessages = this.getNightChatForRole('doctor');
    } else if (this.phase === 'night_detective' && player.role === 'detective') {
      for (const [detId, targetId] of this.nightActions.detectiveInvestigate) {
        data.selections[detId] = targetId;
      }
      data.confirmed = Array.from(this.nightActions.detectiveConfirmed);
      data.chatMessages = this.getNightChatForRole('detective');
      const result = this.nightActions.detectiveResults.get(forPlayerId);
      if (result !== undefined) {
        data.detectiveResult = result;
      }
    }

    return data;
  }

  getVotingData(): VotingData {
    const votes: Record<string, string> = {};
    for (const [voterId, targetId] of this.dayVotes.votes) {
      votes[voterId] = targetId;
    }
    return {
      votes,
      alivePlayers: this.getAlivePlayers().map(p => ({
        id: p.id,
        name: p.name,
        isAlive: p.isAlive,
        isConnected: p.isConnected,
        isHost: p.isHost,
        role: null
      }))
    };
  }

  getAllPlayerIds(): string[] {
    return Array.from(this.players.keys());
  }

  getConnectedPlayerIds(): string[] {
    return Array.from(this.players.values())
      .filter(p => p.isConnected)
      .map(p => p.id);
  }

  getSocketIdForPlayer(playerId: string): string | null {
    const player = this.players.get(playerId);
    return player?.socketId || null;
  }

  private transferHostIfEliminated(): void {
    const currentHost = this.players.get(this.hostId);
    if (!currentHost || currentHost.isAlive) return;

    currentHost.isHost = false;
    const aliveConnected = this.getAlivePlayers().filter(p => p.isConnected);
    const nextHost = aliveConnected[0]
      ?? Array.from(this.players.values()).find(p => p.isConnected && p.id !== this.hostId);
    if (nextHost) {
      nextHost.isHost = true;
      this.hostId = nextHost.id;
      logger.gameEvent('Host transferred (elimination)', this.roomCode, { newHost: nextHost.name });
    }
  }

  isAllPlayersDisconnected(): boolean {
    return Array.from(this.players.values()).every(p => !p.isConnected);
  }
}
