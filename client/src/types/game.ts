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

export interface ClientPlayer {
  id: string;
  name: string;
  isAlive: boolean;
  isConnected: boolean;
  isHost: boolean;
  role: Role | null;
}

export interface NightResult {
  killedPlayer: { name: string; role: Role } | null;
  savedByDoctor: boolean;
}

export interface ClientGameState {
  roomCode: string;
  phase: GamePhase;
  players: ClientPlayer[];
  hostId: string;
  round: number;
  nightResult: NightResult | null;
  lastEliminatedPlayer: { name: string; role: Role } | null;
  winners: Team | null;
  phaseStartTime: number;
  myRole: Role | null;
  myId: string;
}

export interface NightPhaseData {
  phase: GamePhase;
  myRole: Role;
  alivePlayers: ClientPlayer[];
  selections: Record<string, string>;
  confirmed: string[];
  sameRoleCount: number;
  detectiveResult?: boolean;
}

export interface VotingData {
  votes: Record<string, string>;
  alivePlayers: ClientPlayer[];
}

export interface NarrationEvent {
  text: string;
  phase: GamePhase;
  delay?: number;
}

export const ROLE_INFO: Record<Role, { label: string; emoji: string; color: string; description: string }> = {
  civilian: {
    label: 'Civilian',
    emoji: '👤',
    color: 'text-blue-400',
    description: 'You are an innocent civilian. Survive and help find the Mafia!'
  },
  mafia: {
    label: 'Mafia',
    emoji: '🔪',
    color: 'text-red-500',
    description: 'You are the Mafia. Eliminate the town without getting caught!'
  },
  doctor: {
    label: 'Doctor',
    emoji: '💉',
    color: 'text-green-400',
    description: 'You are the Doctor. Each night, choose someone to save from the Mafia!'
  },
  detective: {
    label: 'Detective',
    emoji: '🔍',
    color: 'text-yellow-400',
    description: 'You are the Detective. Each night, investigate one player to learn if they are Mafia!'
  }
};
