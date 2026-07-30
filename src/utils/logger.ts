// Módulo de Logging Centralizado do Sessão Certa
// Monitora envios de e-mail, autenticação e falhas no provedor Resend

export type LogLevel = 'info' | 'warn' | 'error' | 'audit';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: 'EMAIL_DISPATCH' | 'AUTH' | 'RESEND_INTEGRATION' | 'SYSTEM';
  message: string;
  meta?: Record<string, any>;
}

const safeStringify = (obj: any, space?: number): string => {
  const cache = new WeakSet();
  try {
    return JSON.stringify(
      obj,
      (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) {
            return '[Circular]';
          }
          cache.add(value);
        }
        if (typeof value === 'function') {
          return '[Function]';
        }
        return value;
      },
      space
    );
  } catch (err) {
    return '[Unserializable Object]';
  }
};

class AppLogger {
  private logs: LogEntry[] = [];
  private maxLogsInMemory = 1000;

  private formatEntry(level: LogLevel, category: LogEntry['category'], message: string, meta?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      meta
    };
  }

  private printToConsole(entry: LogEntry) {
    const prefix = `[${entry.timestamp}] [${entry.category}] [${entry.level.toUpperCase()}]:`;
    const metaStr = entry.meta ? safeStringify(entry.meta, 2) : '';
    switch (entry.level) {
      case 'error':
        console.error(`🚨 ${prefix} ${entry.message}`, metaStr);
        break;
      case 'warn':
        console.warn(`⚠️ ${prefix} ${entry.message}`, metaStr);
        break;
      case 'audit':
        console.log(`🔐 ${prefix} ${entry.message}`, metaStr);
        break;
      default:
        console.log(`ℹ️ ${prefix} ${entry.message}`, metaStr);
    }
  }

  private record(entry: LogEntry) {
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs.pop();
    }
    this.printToConsole(entry);
  }

  public info(category: LogEntry['category'], message: string, meta?: Record<string, any>) {
    this.record(this.formatEntry('info', category, message, meta));
  }

  public warn(category: LogEntry['category'], message: string, meta?: Record<string, any>) {
    this.record(this.formatEntry('warn', category, message, meta));
  }

  public error(category: LogEntry['category'], message: string, meta?: Record<string, any>) {
    this.record(this.formatEntry('error', category, message, meta));
  }

  public audit(category: LogEntry['category'], message: string, meta?: Record<string, any>) {
    this.record(this.formatEntry('audit', category, message, meta));
  }

  /**
   * Obtém histórico recente de logs (pode ser consultado para auditoria ou painel admin)
   */
  public getLogs(limit = 100, category?: LogEntry['category']): LogEntry[] {
    if (category) {
      return this.logs.filter(l => l.category === category).slice(0, limit);
    }
    return this.logs.slice(0, limit);
  }
}

export const logger = new AppLogger();
