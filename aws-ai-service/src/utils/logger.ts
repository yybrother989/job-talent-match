// Simple logger utility for the AWS AI service module
export interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

export const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  data?: any;
  error?: Error;
}

class Logger {
  private logLevel: string;

  constructor(logLevel: string = 'info') {
    this.logLevel = logLevel;
  }

  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private formatMessage(level: string, message: string, data?: any, error?: Error): string {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      level,
      message,
      timestamp,
      data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } as any : undefined,
    };

    return JSON.stringify(logEntry);
  }

  error(message: string, data?: any, error?: Error): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data, error));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, data));
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  setLogLevel(level: string): void {
    this.logLevel = level;
  }
}

// Export singleton instance
export const logger = new Logger(process.env.LOG_LEVEL || 'info');
