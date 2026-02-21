"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleAssigner = void 0;
class RoleAssigner {
    static getDistribution(playerCount) {
        let mafia, doctor, detective;
        if (playerCount <= 6) {
            mafia = 1;
            doctor = 1;
            detective = 1;
        }
        else if (playerCount <= 9) {
            mafia = 2;
            doctor = 1;
            detective = 1;
        }
        else if (playerCount <= 12) {
            mafia = 2;
            doctor = 1;
            detective = 1;
        }
        else if (playerCount <= 16) {
            mafia = 3;
            doctor = 1;
            detective = 2;
        }
        else if (playerCount <= 20) {
            mafia = 4;
            doctor = 2;
            detective = 2;
        }
        else if (playerCount <= 25) {
            mafia = 5;
            doctor = 2;
            detective = 2;
        }
        else {
            mafia = 6;
            doctor = 2;
            detective = 3;
        }
        return {
            mafia,
            doctor,
            detective,
            civilian: playerCount - mafia - doctor - detective
        };
    }
    static assignRoles(playerIds) {
        const distribution = this.getDistribution(playerIds.length);
        const roles = [];
        for (let i = 0; i < distribution.mafia; i++)
            roles.push('mafia');
        for (let i = 0; i < distribution.doctor; i++)
            roles.push('doctor');
        for (let i = 0; i < distribution.detective; i++)
            roles.push('detective');
        for (let i = 0; i < distribution.civilian; i++)
            roles.push('civilian');
        const shuffled = this.shuffle(roles);
        const assignments = new Map();
        playerIds.forEach((id, index) => {
            assignments.set(id, shuffled[index]);
        });
        return assignments;
    }
    static shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}
exports.RoleAssigner = RoleAssigner;
