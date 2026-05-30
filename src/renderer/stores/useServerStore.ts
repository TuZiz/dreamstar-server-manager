import { create } from 'zustand';
import type {
  CustomProcessCreateInput,
  InstanceRuntimeState,
  LogEntry,
  MinecraftServerCreateInput,
  ServerInstanceConfig,
  VelocityServerCreateInput
} from '../../shared/types';

interface ServerStore {
  servers: ServerInstanceConfig[];
  states: Record<string, InstanceRuntimeState>;
  logs: Record<string, LogEntry[]>;
  loading: boolean;
  error?: string;
  load(): Promise<void>;
  refreshStates(): Promise<void>;
  subscribeRealtime(): () => void;
  createMinecraft(input: MinecraftServerCreateInput): Promise<void>;
  createVelocity(input: VelocityServerCreateInput): Promise<void>;
  createCustom(input: CustomProcessCreateInput): Promise<void>;
  update(id: string, patch: Partial<ServerInstanceConfig>): Promise<void>;
  start(id: string): Promise<void>;
  stop(id: string): Promise<void>;
  restart(id: string): Promise<void>;
  kill(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  startAll(): Promise<void>;
  stopAll(): Promise<void>;
  restartAll(): Promise<void>;
  sendCommand(id: string, command: string): Promise<void>;
  loadLogs(id: string): Promise<void>;
  clearLogs(id: string): Promise<void>;
}

function stateMap(states: InstanceRuntimeState[]): Record<string, InstanceRuntimeState> {
  return Object.fromEntries(states.map((state) => [state.id, state]));
}

function stoppedState(server: ServerInstanceConfig): InstanceRuntimeState {
  return {
    id: server.id,
    status: 'stopped',
    manualStop: false,
    lastExitCode: null,
    maxPlayers: server.maxPlayers
  };
}

export const useServerStore = create<ServerStore>((set, get) => ({
  servers: [],
  states: {},
  logs: {},
  loading: false,

  async load() {
    set({ loading: true, error: undefined });
    try {
      const [servers, states] = await Promise.all([
        window.dreamstar.servers.list(),
        window.dreamstar.servers.listRuntimeStates()
      ]);
      const runtime = stateMap(states);
      for (const server of servers) {
        runtime[server.id] ??= stoppedState(server);
      }
      set({ servers, states: runtime, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), loading: false });
    }
  },

  async refreshStates() {
    const states = await window.dreamstar.servers.listRuntimeStates();
    set({ states: stateMap(states) });
  },

  subscribeRealtime() {
    const unsubscribeLog = window.dreamstar.servers.subscribeLogs('*', (entry) => {
      set((state) => {
        const nextLogs = [...(state.logs[entry.id] ?? []), entry].slice(-5000);
        return { logs: { ...state.logs, [entry.id]: nextLogs } };
      });
    });
    const unsubscribeState = window.dreamstar.servers.subscribeState((runtime) => {
      set((state) => ({ states: { ...state.states, [runtime.id]: runtime } }));
    });
    const unsubscribeCleared = window.dreamstar.servers.subscribeLogsCleared((id) => {
      set((state) => ({ logs: { ...state.logs, [id]: [] } }));
    });
    return () => {
      unsubscribeLog();
      unsubscribeState();
      unsubscribeCleared();
    };
  },

  async createMinecraft(input) {
    await window.dreamstar.servers.createMinecraftServer(input);
    await get().load();
  },

  async createVelocity(input) {
    await window.dreamstar.servers.createVelocityServer(input);
    await get().load();
  },

  async createCustom(input) {
    await window.dreamstar.servers.createCustomProcess(input);
    await get().load();
  },

  async update(id, patch) {
    await window.dreamstar.servers.update(id, patch);
    await get().load();
  },

  async start(id) {
    const runtime = await window.dreamstar.servers.start(id);
    set((state) => ({ states: { ...state.states, [id]: runtime } }));
  },

  async stop(id) {
    const runtime = await window.dreamstar.servers.stop(id);
    set((state) => ({ states: { ...state.states, [id]: runtime } }));
  },

  async restart(id) {
    const runtime = await window.dreamstar.servers.restart(id);
    set((state) => ({ states: { ...state.states, [id]: runtime } }));
  },

  async kill(id) {
    const runtime = await window.dreamstar.servers.kill(id);
    set((state) => ({ states: { ...state.states, [id]: runtime } }));
  },

  async delete(id) {
    await window.dreamstar.servers.delete(id);
    await get().load();
  },

  async startAll() {
    const states = await window.dreamstar.servers.startAll();
    set({ states: stateMap(states) });
  },

  async stopAll() {
    const states = await window.dreamstar.servers.stopAll();
    set({ states: stateMap(states) });
  },

  async restartAll() {
    const states = await window.dreamstar.servers.restartAll();
    set({ states: stateMap(states) });
  },

  async sendCommand(id, command) {
    await window.dreamstar.servers.sendCommand(id, command);
  },

  async loadLogs(id) {
    const logs = await window.dreamstar.servers.getLogs(id);
    set((state) => ({ logs: { ...state.logs, [id]: logs } }));
  },

  async clearLogs(id) {
    await window.dreamstar.servers.clearLogs(id);
    set((state) => ({ logs: { ...state.logs, [id]: [] } }));
  }
}));
