type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 999
};

const currentLevel = (process.env.LOG_LEVEL || 'info') as LogLevel;
const currentLevelNum = LOG_LEVELS[currentLevel] || LOG_LEVELS.info;

class Logger {
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= currentLevelNum;
  }

  debug(...args: any[]) {
    if (this.shouldLog('debug')) console.log('[DEBUG]', new Date().toISOString(), ...args);
  }

  info(...args: any[]) {
    if (this.shouldLog('info')) console.log('[INFO]', new Date().toISOString(), ...args);
  }

  warn(...args: any[]) {
    if (this.shouldLog('warn')) console.warn('[WARN]', new Date().toISOString(), ...args);
  }

  error(...args: any[]) {
    if (this.shouldLog('error')) console.error('[ERROR]', new Date().toISOString(), ...args);
  }

  gameEvent(event: string, roomCode: string, data?: any) {
    this.info(`[GAME] ${event}`, `Room: ${roomCode}`, data || '');
  }

  cleanup(message: string, data?: any) {
    this.info(`[CLEANUP] ${message}`, data || '');
  }

  memory(message: string) {
    this.debug(`[MEM] ${message}`);
  }
}

export const logger = new Logger();
