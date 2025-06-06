export type LogLevel = "info" | "warn" | "error" | "verbose";

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
  private subscriptionCounts: Map<(log: LogEntry) => void, number> = new Map();

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
    // Increment the subscription count for this callback
    const currentCount = this.subscriptionCounts.get(callback) || 0;
    this.subscriptionCounts.set(callback, currentCount + 1);
  }

  /**
   * Unsubscribe from log messages
   */
  public unsubscribe(callback: (log: LogEntry) => void): void {
    const currentCount = this.subscriptionCounts.get(callback) || 0;
    if (currentCount <= 1) {
      // Only actually unsubscribe when count reaches zero
      this.subscribers.delete(callback);
      this.subscriptionCounts.delete(callback);
    } else {
      // Decrement the count but keep the subscription active
      this.subscriptionCounts.set(callback, currentCount - 1);
    }
  }

  /**
   * Log an info message
   */
  public info(message: string): LogEntry {
    return this.addLog("info", message);
  }

  public warn(message: string): LogEntry {
    return this.addLog("warn", message);
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

    return entry;
  }
}

// Export the singleton instance
export const logger = Logger.getInstance();
