import { Role, RoleDistribution } from '../types/game';

export class RoleAssigner {
  static getDistribution(playerCount: number): RoleDistribution {
    let mafia: number, doctor: number, detective: number;

    if (playerCount <= 6) {
      mafia = 1; doctor = 1; detective = 1;
    } else if (playerCount <= 9) {
      mafia = 2; doctor = 1; detective = 1;
    } else if (playerCount <= 12) {
      mafia = 2; doctor = 1; detective = 1;
    } else if (playerCount <= 16) {
      mafia = 3; doctor = 1; detective = 2;
    } else if (playerCount <= 20) {
      mafia = 4; doctor = 2; detective = 2;
    } else if (playerCount <= 25) {
      mafia = 5; doctor = 2; detective = 2;
    } else {
      mafia = 6; doctor = 2; detective = 3;
    }

    return {
      mafia,
      doctor,
      detective,
      civilian: playerCount - mafia - doctor - detective
    };
  }

  static assignRoles(playerIds: string[]): Map<string, Role> {
    const distribution = this.getDistribution(playerIds.length);
    const roles: Role[] = [];

    for (let i = 0; i < distribution.mafia; i++) roles.push('mafia');
    for (let i = 0; i < distribution.doctor; i++) roles.push('doctor');
    for (let i = 0; i < distribution.detective; i++) roles.push('detective');
    for (let i = 0; i < distribution.civilian; i++) roles.push('civilian');

    const shuffled = this.shuffle(roles);
    const assignments = new Map<string, Role>();
    playerIds.forEach((id, index) => {
      assignments.set(id, shuffled[index]);
    });

    return assignments;
  }

  private static shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
