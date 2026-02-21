"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = void 0;
const uuid_1 = require("uuid");
const RoleAssigner_1 = require("./RoleAssigner");
const logger_1 = require("../utils/logger");
class GameRoom {
    constructor(roomCode, hostSocketId, hostName) {
        this.players = new Map();
        this.phase = 'lobby';
        this.round = 0;
        this.nightResult = null;
        this.lastEliminatedPlayer = null;
        this.winners = null;
        this.phaseStartTime = Date.now();
        this.roomCode = roomCode;
        this.nightActions = this.createEmptyNightActions();
        this.dayVotes = { votes: new Map() };
        const playerId = (0, uuid_1.v4)();
        const token = (0, uuid_1.v4)();
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
    createEmptyNightActions() {
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
    getRoomCode() { return this.roomCode; }
    getPhase() { return this.phase; }
    getHostId() { return this.hostId; }
    addPlayer(socketId, name) {
        if (this.phase !== 'lobby')
            return null;
        if (this.players.size >= 30)
            return null;
        const existingByName = Array.from(this.players.values()).find(p => p.name.toLowerCase() === name.toLowerCase());
        if (existingByName)
            return null;
        const playerId = (0, uuid_1.v4)();
        const token = (0, uuid_1.v4)();
        const player = {
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
        logger_1.logger.gameEvent('Player joined', this.roomCode, { name, playerId });
        return { player, token };
    }
    rejoinPlayer(token, newSocketId) {
        for (const player of this.players.values()) {
            if (player.playerToken === token) {
                player.socketId = newSocketId;
                player.isConnected = true;
                logger_1.logger.gameEvent('Player rejoined', this.roomCode, { name: player.name });
                return player;
            }
        }
        return null;
    }
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player)
            return false;
        if (this.phase === 'lobby') {
            this.players.delete(playerId);
            if (player.isHost && this.players.size > 0) {
                const nextHost = this.players.values().next().value;
                nextHost.isHost = true;
                this.hostId = nextHost.id;
            }
            logger_1.logger.gameEvent('Player left lobby', this.roomCode, { name: player.name });
            return true;
        }
        player.isConnected = false;
        if (player.isHost) {
            const nextHost = Array.from(this.players.values()).find(p => p.isConnected && p.id !== playerId);
            if (nextHost) {
                player.isHost = false;
                nextHost.isHost = true;
                this.hostId = nextHost.id;
                logger_1.logger.gameEvent('Host transferred (disconnect)', this.roomCode, { newHost: nextHost.name });
            }
        }
        logger_1.logger.gameEvent('Player disconnected', this.roomCode, { name: player.name });
        return true;
    }
    getPlayer(playerId) {
        return this.players.get(playerId);
    }
    getPlayerBySocketId(socketId) {
        return Array.from(this.players.values()).find(p => p.socketId === socketId);
    }
    getPlayerCount() { return this.players.size; }
    getAlivePlayers() {
        return Array.from(this.players.values()).filter(p => p.isAlive);
    }
    getAlivePlayersByRole(role) {
        return this.getAlivePlayers().filter(p => p.role === role);
    }
    canStart() {
        return this.phase === 'lobby' && this.players.size >= 5;
    }
    startGame() {
        if (!this.canStart())
            return null;
        const playerIds = Array.from(this.players.keys());
        const roleAssignments = RoleAssigner_1.RoleAssigner.assignRoles(playerIds);
        roleAssignments.forEach((role, playerId) => {
            const player = this.players.get(playerId);
            if (player)
                player.role = role;
        });
        this.phase = 'role_reveal';
        this.round = 0;
        this.phaseStartTime = Date.now();
        logger_1.logger.gameEvent('Game started', this.roomCode, {
            players: this.players.size,
            distribution: RoleAssigner_1.RoleAssigner.getDistribution(this.players.size)
        });
        return [{ text: 'Roles have been assigned. Check your role carefully...', phase: 'role_reveal' }];
    }
    startNight() {
        this.round++;
        this.nightActions = this.createEmptyNightActions();
        this.nightResult = null;
        this.lastEliminatedPlayer = null;
        this.phase = 'night_mafia';
        this.phaseStartTime = Date.now();
        const narrations = [
            { text: `Night ${this.round} falls over the city. Everyone, close your eyes.`, phase: 'night_mafia', delay: 3000 },
            { text: 'Mafia, wake up. Choose your victim.', phase: 'night_mafia', delay: 1500 }
        ];
        logger_1.logger.gameEvent(`Night ${this.round} started`, this.roomCode);
        return narrations;
    }
    // --- MAFIA NIGHT ACTIONS ---
    mafiaSelect(playerId, targetId) {
        if (this.phase !== 'night_mafia')
            return false;
        const player = this.players.get(playerId);
        if (!player || player.role !== 'mafia' || !player.isAlive)
            return false;
        const target = this.players.get(targetId);
        if (!target || !target.isAlive || target.role === 'mafia')
            return false;
        this.nightActions.mafiaVotes.set(playerId, targetId);
        this.nightActions.mafiaConfirmed.delete(playerId);
        return true;
    }
    mafiaConfirm(playerId) {
        if (this.phase !== 'night_mafia')
            return false;
        const player = this.players.get(playerId);
        if (!player || player.role !== 'mafia' || !player.isAlive)
            return false;
        if (!this.nightActions.mafiaVotes.has(playerId))
            return false;
        this.nightActions.mafiaConfirmed.add(playerId);
        return true;
    }
    mafiaUnconfirm(playerId) {
        if (this.phase !== 'night_mafia')
            return false;
        this.nightActions.mafiaConfirmed.delete(playerId);
        return true;
    }
    isMafiaPhaseComplete() {
        const aliveMafia = this.getAlivePlayersByRole('mafia');
        if (aliveMafia.length === 0)
            return true;
        const connectedMafia = aliveMafia.filter(p => p.isConnected);
        if (connectedMafia.length === 0)
            return true;
        const connectedConfirmed = connectedMafia.filter(p => this.nightActions.mafiaConfirmed.has(p.id));
        if (connectedConfirmed.length < connectedMafia.length)
            return false;
        const connectedTargets = connectedMafia
            .map(p => this.nightActions.mafiaVotes.get(p.id))
            .filter((t) => t !== undefined);
        if (connectedTargets.length === 0)
            return false;
        const allSame = connectedTargets.every(t => t === connectedTargets[0]);
        return allSame;
    }
    getMafiaTarget() {
        const connectedMafia = this.getAlivePlayersByRole('mafia').filter(p => p.isConnected);
        const targets = connectedMafia
            .map(p => this.nightActions.mafiaVotes.get(p.id))
            .filter((t) => t !== undefined);
        if (targets.length === 0)
            return null;
        return targets[0];
    }
    advanceFromMafia() {
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
    doctorSelect(playerId, targetId) {
        if (this.phase !== 'night_doctor')
            return false;
        const player = this.players.get(playerId);
        if (!player || player.role !== 'doctor' || !player.isAlive)
            return false;
        const target = this.players.get(targetId);
        if (!target || !target.isAlive)
            return false;
        this.nightActions.doctorSave.set(playerId, targetId);
        this.nightActions.doctorConfirmed.delete(playerId);
        return true;
    }
    doctorConfirm(playerId) {
        if (this.phase !== 'night_doctor')
            return false;
        const player = this.players.get(playerId);
        if (!player || player.role !== 'doctor' || !player.isAlive)
            return false;
        if (!this.nightActions.doctorSave.has(playerId))
            return false;
        this.nightActions.doctorConfirmed.add(playerId);
        return true;
    }
    doctorUnconfirm(playerId) {
        if (this.phase !== 'night_doctor')
            return false;
        this.nightActions.doctorConfirmed.delete(playerId);
        return true;
    }
    isDoctorPhaseComplete() {
        const aliveDoctors = this.getAlivePlayersByRole('doctor');
        if (aliveDoctors.length === 0)
            return true;
        const connectedDoctors = aliveDoctors.filter(p => p.isConnected);
        if (connectedDoctors.length === 0)
            return true;
        return this.nightActions.doctorConfirmed.size >= connectedDoctors.length;
    }
    getDoctorSaves() {
        return Array.from(this.nightActions.doctorSave.values());
    }
    advanceFromDoctor() {
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
    detectiveSelect(playerId, targetId) {
        if (this.phase !== 'night_detective')
            return false;
        const player = this.players.get(playerId);
        if (!player || player.role !== 'detective' || !player.isAlive)
            return false;
        const target = this.players.get(targetId);
        if (!target || !target.isAlive)
            return false;
        this.nightActions.detectiveInvestigate.set(playerId, targetId);
        this.nightActions.detectiveConfirmed.delete(playerId);
        return true;
    }
    detectiveConfirm(playerId) {
        if (this.phase !== 'night_detective')
            return false;
        const player = this.players.get(playerId);
        if (!player || player.role !== 'detective' || !player.isAlive)
            return false;
        if (!this.nightActions.detectiveInvestigate.has(playerId))
            return false;
        this.nightActions.detectiveConfirmed.add(playerId);
        const targetId = this.nightActions.detectiveInvestigate.get(playerId);
        const target = this.players.get(targetId);
        this.nightActions.detectiveResults.set(playerId, target.role === 'mafia');
        return true;
    }
    detectiveUnconfirm(playerId) {
        if (this.phase !== 'night_detective')
            return false;
        this.nightActions.detectiveConfirmed.delete(playerId);
        this.nightActions.detectiveResults.delete(playerId);
        return true;
    }
    isDetectivePhaseComplete() {
        const aliveDetectives = this.getAlivePlayersByRole('detective');
        if (aliveDetectives.length === 0)
            return true;
        const connectedDetectives = aliveDetectives.filter(p => p.isConnected);
        if (connectedDetectives.length === 0)
            return true;
        return this.nightActions.detectiveConfirmed.size >= connectedDetectives.length;
    }
    getDetectiveResult(playerId) {
        return this.nightActions.detectiveResults.get(playerId);
    }
    advanceFromDetective() {
        const mafiaTarget = this.getMafiaTarget();
        const doctorSaves = this.getDoctorSaves();
        const savedByDoctor = mafiaTarget !== null && doctorSaves.includes(mafiaTarget);
        let killedPlayer = null;
        if (mafiaTarget && !savedByDoctor) {
            const victim = this.players.get(mafiaTarget);
            if (victim) {
                victim.isAlive = false;
                killedPlayer = victim;
            }
        }
        this.nightResult = { killedPlayer, savedByDoctor };
        this.phase = 'day_discussion';
        this.phaseStartTime = Date.now();
        const narrations = [
            { text: 'Detective, close your eyes.', phase: 'day_discussion', delay: 2000 },
            { text: 'Dawn breaks. The city wakes up.', phase: 'day_discussion', delay: 2500 }
        ];
        if (killedPlayer) {
            narrations.push({
                text: `Last night, ${killedPlayer.name} was killed by the mafia. They were a ${killedPlayer.role}.`,
                phase: 'day_discussion',
                delay: 3000
            });
        }
        else if (savedByDoctor) {
            narrations.push({
                text: 'The doctor saved someone last night! Nobody died.',
                phase: 'day_discussion',
                delay: 2500
            });
        }
        else {
            narrations.push({
                text: 'It was a peaceful night. Nobody died.',
                phase: 'day_discussion',
                delay: 2500
            });
        }
        logger_1.logger.gameEvent('Night resolved', this.roomCode, {
            killed: killedPlayer?.name || 'nobody',
            saved: savedByDoctor
        });
        const winCheck = this.checkWinCondition();
        if (winCheck) {
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
    startVoting() {
        this.phase = 'day_voting';
        this.dayVotes = { votes: new Map() };
        this.phaseStartTime = Date.now();
        return [
            { text: 'Time to vote. Who do you think is the Mafia?', phase: 'day_voting', delay: 1500 }
        ];
    }
    castVote(voterId, targetId) {
        if (this.phase !== 'day_voting')
            return false;
        const voter = this.players.get(voterId);
        if (!voter || !voter.isAlive)
            return false;
        const target = this.players.get(targetId);
        if (!target || !target.isAlive)
            return false;
        if (voterId === targetId)
            return false;
        this.dayVotes.votes.set(voterId, targetId);
        return true;
    }
    removeVote(voterId) {
        if (this.phase !== 'day_voting')
            return false;
        this.dayVotes.votes.delete(voterId);
        return true;
    }
    getVotingStatus() {
        const aliveConnected = this.getAlivePlayers().filter(p => p.isConnected);
        const allVoted = this.dayVotes.votes.size >= aliveConnected.length;
        if (!allVoted) {
            return { allVoted: false, hasMajority: false, eliminatedId: null };
        }
        const voteCounts = new Map();
        for (const targetId of this.dayVotes.votes.values()) {
            voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
        }
        let maxVotes = 0;
        let maxTargets = [];
        for (const [targetId, count] of voteCounts) {
            if (count > maxVotes) {
                maxVotes = count;
                maxTargets = [targetId];
            }
            else if (count === maxVotes) {
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
    resolveVoting() {
        const { allVoted, hasMajority, eliminatedId } = this.getVotingStatus();
        if (!allVoted || !hasMajority || !eliminatedId)
            return null;
        const eliminated = this.players.get(eliminatedId);
        if (!eliminated)
            return null;
        eliminated.isAlive = false;
        this.lastEliminatedPlayer = { name: eliminated.name, role: eliminated.role };
        this.phase = 'day_discussion';
        this.phaseStartTime = Date.now();
        const narrations = [
            {
                text: `The town has spoken. ${eliminated.name} has been eliminated. They were a ${eliminated.role}.`,
                phase: 'day_discussion',
                delay: 3000
            }
        ];
        logger_1.logger.gameEvent('Player eliminated by vote', this.roomCode, {
            name: eliminated.name,
            role: eliminated.role
        });
        const winCheck = this.checkWinCondition();
        if (winCheck) {
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
    checkWinCondition() {
        const aliveMafia = this.getAlivePlayersByRole('mafia').length;
        const aliveTown = this.getAlivePlayers().length - aliveMafia;
        if (aliveMafia === 0)
            return 'town';
        if (aliveMafia >= aliveTown)
            return 'mafia';
        return null;
    }
    // --- STATE SERIALIZATION ---
    getClientState(forPlayerId) {
        const player = this.players.get(forPlayerId);
        let sanitizedNightResult = null;
        if (this.nightResult) {
            sanitizedNightResult = {
                killedPlayer: this.nightResult.killedPlayer
                    ? { name: this.nightResult.killedPlayer.name, role: this.nightResult.killedPlayer.role }
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
    getClientPlayers(forPlayerId) {
        return Array.from(this.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            isAlive: p.isAlive,
            isConnected: p.isConnected,
            isHost: p.isHost,
            role: this.shouldRevealRole(p, forPlayerId) ? p.role : null
        }));
    }
    shouldRevealRole(player, forPlayerId) {
        if (this.phase === 'game_over')
            return true;
        if (!player.isAlive)
            return true;
        if (player.id === forPlayerId)
            return true;
        // Mafia can see other mafia members
        const viewer = this.players.get(forPlayerId);
        if (viewer?.role === 'mafia' && player.role === 'mafia' && viewer.isAlive)
            return true;
        return false;
    }
    getNightPhaseData(forPlayerId) {
        const player = this.players.get(forPlayerId);
        if (!player || !player.isAlive || !player.role)
            return null;
        const alivePlayers = this.getAlivePlayers().map(p => ({
            id: p.id,
            name: p.name,
            isAlive: p.isAlive,
            isConnected: p.isConnected,
            isHost: p.isHost,
            role: this.shouldRevealRole(p, forPlayerId) ? p.role : null
        }));
        const sameRoleCount = this.getAlivePlayersByRole(player.role).length;
        const data = {
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
        }
        else if (this.phase === 'night_doctor' && player.role === 'doctor') {
            for (const [docId, targetId] of this.nightActions.doctorSave) {
                data.selections[docId] = targetId;
            }
            data.confirmed = Array.from(this.nightActions.doctorConfirmed);
        }
        else if (this.phase === 'night_detective' && player.role === 'detective') {
            for (const [detId, targetId] of this.nightActions.detectiveInvestigate) {
                data.selections[detId] = targetId;
            }
            data.confirmed = Array.from(this.nightActions.detectiveConfirmed);
            const result = this.nightActions.detectiveResults.get(forPlayerId);
            if (result !== undefined) {
                data.detectiveResult = result;
            }
        }
        return data;
    }
    getVotingData() {
        const votes = {};
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
    getAllPlayerIds() {
        return Array.from(this.players.keys());
    }
    getConnectedPlayerIds() {
        return Array.from(this.players.values())
            .filter(p => p.isConnected)
            .map(p => p.id);
    }
    getSocketIdForPlayer(playerId) {
        const player = this.players.get(playerId);
        return player?.socketId || null;
    }
    isAllPlayersDisconnected() {
        return Array.from(this.players.values()).every(p => !p.isConnected);
    }
}
exports.GameRoom = GameRoom;
