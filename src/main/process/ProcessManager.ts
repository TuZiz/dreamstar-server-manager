import { EventEmitter } from 'events';
import type { InstanceRuntimeState } from '../../shared/types';
import { ConfigService } from '../config/ConfigService';
import { LogService } from '../logs/LogService';
import { ManagedProcess } from './ManagedProcess';

interface ProcessManagerEvents {
  state: [InstanceRuntimeState];
}

export class ProcessManager extends EventEmitter {
  private readonly processes = new Map<string, ManagedProcess>();

  constructor(
    private readonly configService: ConfigService,
    private readonly logService: LogService
  ) {
    super();
  }

  listRuntimeStates(): InstanceRuntimeState[] {
    return this.configService.listServers().map((server) => this.getProcess(server.id).getState());
  }

  getRuntimeState(id: string): InstanceRuntimeState {
    return this.getProcess(id).getState();
  }

  async start(id: string): Promise<InstanceRuntimeState> {
    const process = this.getProcess(id);
    await process.start();
    return process.getState();
  }

  async stop(id: string): Promise<InstanceRuntimeState> {
    const process = this.getProcess(id);
    await process.stop();
    return process.getState();
  }

  async restart(id: string): Promise<InstanceRuntimeState> {
    const process = this.getProcess(id);
    await process.restart();
    return process.getState();
  }

  async kill(id: string): Promise<InstanceRuntimeState> {
    const process = this.getProcess(id);
    await process.forceKill();
    return process.getState();
  }

  sendCommand(id: string, command: string): void {
    this.getProcess(id).sendCommand(command);
  }

  async startAll(): Promise<InstanceRuntimeState[]> {
    const config = this.configService.getConfig();
    const orderedIds = this.orderIds(
      config.servers.filter((server) => server.enabled).map((server) => server.id),
      config.settings.startupOrder
    );
    for (const id of orderedIds) {
      await this.start(id);
    }
    return this.listRuntimeStates();
  }

  async stopAll(): Promise<InstanceRuntimeState[]> {
    const config = this.configService.getConfig();
    const orderedIds = this.orderIds(
      config.servers.filter((server) => server.enabled).map((server) => server.id),
      config.settings.shutdownOrder
    );
    for (const id of orderedIds) {
      await this.stop(id);
    }
    return this.listRuntimeStates();
  }

  async restartAll(): Promise<InstanceRuntimeState[]> {
    await this.stopAll();
    return this.startAll();
  }

  remove(id: string): void {
    this.processes.delete(id);
  }

  private getProcess(id: string): ManagedProcess {
    const server = this.configService.getServer(id);
    const existing = this.processes.get(id);
    if (existing) {
      existing.updateConfig(server);
      return existing;
    }
    const created = new ManagedProcess(server, this.logService, (state) => this.emit('state', state));
    this.processes.set(id, created);
    return created;
  }

  private orderIds(ids: string[], preferredOrder: string[]): string[] {
    const seen = new Set<string>();
    const ordered = preferredOrder.filter((id) => {
      const keep = ids.includes(id) && !seen.has(id);
      seen.add(id);
      return keep;
    });
    return [...ordered, ...ids.filter((id) => !seen.has(id))];
  }

  override on<K extends keyof ProcessManagerEvents>(
    event: K,
    listener: (...args: ProcessManagerEvents[K]) => void
  ): this {
    return super.on(event, listener);
  }

  override emit<K extends keyof ProcessManagerEvents>(event: K, ...args: ProcessManagerEvents[K]): boolean {
    return super.emit(event, ...args);
  }
}
