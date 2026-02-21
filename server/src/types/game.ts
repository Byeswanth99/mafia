export type Role = 'civilian' | 'mafia' | 'doctor' | 'detective';

export type GamePhase =
  | 'lobby'
  | 'role_reveal'
  | 'night_mafia'
  | 'night_doctor'
  | 'night_detective'
  | 'day_discussion'
  | 'day_voting'
  | 'game_over';

export type Team = 'town' | 'mafia';

export interface Player {
  id: string;
  socketId: string;
  name: string;
  role: Role | null;
  isAlive: boolean;
  isConnected: boolean;
  isHost: boolean;
  playerToken: string;
}

export interface NightActions {
  mafiaVotes: Map<string, string>;       // mafiaPlayerId -> targetPlayerId
  mafiaConfirmed: Set<string>;           // mafiaPlayerIds who pressed "done"
  doctorSave: Map<string, string>;       // doctorPlayerId -> targetPlayerId
  doctorConfirmed: Set<string>;
  detectiveInvestigate: Map<string, string>; // detectivePlayerId -> targetPlayerId
  detectiveConfirmed: Set<string>;
  detectiveResults: Map<string, boolean>;    // detectivePlayerId -> isMafia result
}

export interface DayVotes {
  votes: Map<string, string>;            // voterId -> targetPlayerId
}

export interface NightResult {
  killedPlayer: Player | null;
  savedByDoctor: boolean;
}

export interface ClientNightResult {
  killedPlayer: { name: string; role: Role } | null;
  savedByDoctor: boolean;
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  hostId: string;
  round: number;
  nightResult: NightResult | null;
  lastEliminatedPlayer: { name: string; role: Role } | null;
  winners: Team | null;
  phaseStartTime: number;
}

export interface RoleDistribution {
  mafia: number;
  doctor: number;
  detective: number;
  civilian: number;
}

export interface ClientGameState {
  roomCode: string;
  phase: GamePhase;
  players: ClientPlayer[];
  hostId: string;
  round: number;
  nightResult: ClientNightResult | null;
  lastEliminatedPlayer: { name: string; role: Role } | null;
  winners: Team | null;
  phaseStartTime: number;
  myRole: Role | null;
  myId: string;
}

export interface ClientPlayer {
  id: string;
  name: string;
  isAlive: boolean;
  isConnected: boolean;
  isHost: boolean;
  role: Role | null; // only revealed when dead or game over
}

export interface NightPhaseData {
  phase: GamePhase;
  myRole: Role;
  alivePlayers: ClientPlayer[];
  selections: Record<string, string>;  // other same-role players' selections (playerId -> targetId)
  confirmed: string[];                 // playerIds who confirmed done
  sameRoleCount: number;               // total alive players with the same role (for teammate awareness)
  detectiveResult?: boolean;           // only for detective after confirmation
}

export interface VotingData {
  votes: Record<string, string>;  // voterId -> targetId (visible to all)
  alivePlayers: ClientPlayer[];
}

export interface NarrationEvent {
  text: string;
  phase: GamePhase;
  delay?: number; // ms to wait before moving to next
}
