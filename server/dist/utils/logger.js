"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    none: 999
};
const currentLevel = (process.env.LOG_LEVEL || 'info');
const currentLevelNum = LOG_LEVELS[currentLevel] || LOG_LEVELS.info;
class Logger {
    shouldLog(level) {
        return LOG_LEVELS[level] >= currentLevelNum;
    }
    debug(...args) {
        if (this.shouldLog('debug'))
            console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
    info(...args) {
        if (this.shouldLog('info'))
            console.log('[INFO]', new Date().toISOString(), ...args);
    }
    warn(...args) {
        if (this.shouldLog('warn'))
            console.warn('[WARN]', new Date().toISOString(), ...args);
    }
    error(...args) {
        if (this.shouldLog('error'))
            console.error('[ERROR]', new Date().toISOString(), ...args);
    }
    gameEvent(event, roomCode, data) {
        this.info(`[GAME] ${event}`, `Room: ${roomCode}`, data || '');
    }
    cleanup(message, data) {
        this.info(`[CLEANUP] ${message}`, data || '');
    }
    memory(message) {
        this.debug(`[MEM] ${message}`);
    }
}
exports.logger = new Logger();
