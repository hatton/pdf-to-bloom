export type LogLevel = "info" | "error" | "verbose";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
}

/**
 * Logger singleton class that captures log messages and notifies subscribers
 */
class Logger {
  private static instance: Logger;
  private subscribers: Set<(log: LogEntry) => void> = new Set();

  private constructor() {}

  /**
   * Get the singleton logger instance
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Subscribe to log messages
   */
  public subscribe(callback: (log: LogEntry) => void): void {
    this.subscribers.add(callback);
  }

  /**
   * Unsubscribe from log messages
   */
  public unsubscribe(callback: (log: LogEntry) => void): void {
    this.subscribers.delete(callback);
  }

  /**
   * Log an info message
   */
  public info(message: string): LogEntry {
    return this.addLog("info", message);
  }

  /**
   * Log an error message
   */
  public error(message: string): LogEntry {
    return this.addLog("error", message);
  }

  /**
   * Log a verbose message
   */
  public verbose(message: string): LogEntry {
    return this.addLog("verbose", message);
  }
  /**
   * Add a log entry to the internal collection
   */ private addLog(level: LogLevel, message: string): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
    };

    // Notify all subscribers
    this.subscribers.forEach((callback) => callback(entry));

    // Also output to console for development
    switch (level) {
      case "error":
        console.error(`[ERROR] ${message}`);
        break;
      case "info":
        console.log(`[INFO] ${message}`);
        break;
      case "verbose":
        console.log(`[VERBOSE] ${message}`);
        break;
    }

    return entry;
  }
}

// Export the singleton instance
export const logger = Logger.getInstance();
