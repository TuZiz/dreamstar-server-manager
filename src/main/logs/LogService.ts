import { EventEmitter } from 'events';
import type { LogEntry, LogStream } from '../../shared/types';

interface LogEvents {
  log: [LogEntry];
  cleared: [string];
}

export class LogService extends EventEmitter {
  private readonly buffers = new Map<string, LogEntry[]>();

  constructor(private readonly maxLines = 5000) {
    super();
  }

  append(id: string, stream: LogStream, message: string): void {
    const lines = message.split(/\r?\n/).filter((line, index, array) => line.length > 0 || index < array.length - 1);
    for (const line of lines) {
      const entry: LogEntry = {
        id,
        time: new Date().toISOString(),
        stream,
        message: line
      };
      const buffer = this.buffers.get(id) ?? [];
      buffer.push(entry);
      if (buffer.length > this.maxLines) {
        buffer.splice(0, buffer.length - this.maxLines);
      }
      this.buffers.set(id, buffer);
      this.emit('log', entry);
    }
  }

  getLogs(id: string): LogEntry[] {
    return [...(this.buffers.get(id) ?? [])];
  }

  clear(id: string): void {
    this.buffers.set(id, []);
    this.emit('cleared', id);
  }

  override on<K extends keyof LogEvents>(event: K, listener: (...args: LogEvents[K]) => void): this {
    return super.on(event, listener);
  }

  override emit<K extends keyof LogEvents>(event: K, ...args: LogEvents[K]): boolean {
    return super.emit(event, ...args);
  }
}
