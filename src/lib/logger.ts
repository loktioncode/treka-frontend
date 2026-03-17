/**
 * Enterprise-grade logging utility for frontend
 * Provides structured logging with different levels and error tracking
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
  userId?: string;
  sessionId?: string;
}

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  bufferSize: number;
}

class Logger {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private sessionId: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
      enableConsole: true,
      enableRemote: process.env.NODE_ENV === 'production',
      bufferSize: 100,
      ...config,
    };

    this.sessionId = this.generateSessionId();
    
    // Send buffered logs periodically in production
    if (this.config.enableRemote) {
      setInterval(() => this.flushBuffer(), 30000); // Every 30 seconds
    }

    // Send logs before page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flushBuffer());
      
      // Track unhandled errors
      window.addEventListener('error', (event) => {
        this.error('Unhandled error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        });
      });

      // Track unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled promise rejection', {
          reason: event.reason,
          stack: event.reason?.stack,
        });
      });
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    return `[${timestamp}] ${levelStr}: ${message}`;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      sessionId: this.sessionId,
      userId: this.getCurrentUserId(),
    };
  }

  private getCurrentUserId(): string | undefined {
    try {
      // Try to get user ID from auth context or localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id;
      }
    } catch {
      // Ignore errors getting user ID
    }
    return undefined;
  }

  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry);
    
    // Keep buffer size under limit
    if (this.buffer.length > this.config.bufferSize) {
      this.buffer = this.buffer.slice(-this.config.bufferSize);
    }
  }

  private async flushBuffer(): Promise<void> {
    if (!this.config.enableRemote || this.buffer.length === 0 || !this.config.remoteEndpoint) {
      return;
    }

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs }),
      });
    } catch (error) {
      // If remote logging fails, restore logs to buffer
      this.buffer = logs.concat(this.buffer);
      console.warn('Failed to send logs to remote endpoint:', error);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    
    if (this.config.enableConsole) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message), context);
    }
    
    this.addToBuffer(entry);
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    
    if (this.config.enableConsole) {
      console.info(this.formatMessage(LogLevel.INFO, message), context);
    }
    
    this.addToBuffer(entry);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    
    if (this.config.enableConsole) {
      console.warn(this.formatMessage(LogLevel.WARN, message), context);
    }
    
    this.addToBuffer(entry);
  }

  error(message: string, context?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry = this.createLogEntry(LogLevel.ERROR, message, {
      ...context,
      stack: error?.stack,
      errorMessage: error?.message,
    }, error);
    
    if (this.config.enableConsole) {
      console.error(this.formatMessage(LogLevel.ERROR, message), context, error);
    }
    
    this.addToBuffer(entry);
  }

  // Convenience methods for common scenarios
  apiCall(method: string, url: string, status?: number, duration?: number): void {
    this.info('API call', {
      method,
      url,
      status,
      duration,
      category: 'api',
    });
  }

  apiError(method: string, url: string, error: unknown): void {
    this.error('API error', {
      method,
      url,
      status: (error as { response?: { status?: number; data?: { error?: { code?: string } } } })?.response?.status,
      errorCode: (error as { response?: { status?: number; data?: { error?: { code?: string } } } })?.response?.data?.error?.code,
      category: 'api',
    }, error instanceof Error ? error : undefined);
  }

  userAction(action: string, context?: Record<string, unknown>): void {
    this.info('User action', {
      action,
      ...context,
      category: 'user',
    });
  }

  performanceMetric(metric: string, value: number, unit = 'ms'): void {
    this.info('Performance metric', {
      metric,
      value,
      unit,
      category: 'performance',
    });
  }

  // Method to manually flush logs (useful for critical errors)
  async flush(): Promise<void> {
    await this.flushBuffer();
  }
}

// Only enable remote logging when a real endpoint is configured (no placeholder)
const logEndpoint = process.env.NEXT_PUBLIC_LOG_ENDPOINT;
const validLogEndpoint =
  typeof logEndpoint === 'string' &&
  logEndpoint.length > 0 &&
  !logEndpoint.includes('your_log_endpoint');

// Create singleton instance
const logger = new Logger({
  remoteEndpoint: validLogEndpoint ? logEndpoint : undefined,
  enableRemote: validLogEndpoint && process.env.NODE_ENV === 'production',
});

export default logger;

// Export specific logging functions for convenience
export const { debug, info, warn, error, apiCall, apiError, userAction, performanceMetric } = logger;
