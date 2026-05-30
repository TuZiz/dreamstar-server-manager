import { create } from 'zustand';
import type { DatabaseConnectionConfig, RedisKeyDetails, SqlQueryResult } from '../../shared/types';

interface DatabaseStore {
  databases: DatabaseConnectionConfig[];
  loading: boolean;
  error?: string;
  load(): Promise<void>;
  create(input: Omit<DatabaseConnectionConfig, 'createdAt' | 'updatedAt'>): Promise<void>;
  update(id: string, patch: Partial<DatabaseConnectionConfig>): Promise<void>;
  delete(id: string): Promise<void>;
  testConnection(id: string): Promise<void>;
  executeSql(id: string, sql: string, confirmDanger?: boolean): Promise<SqlQueryResult>;
  redisSearchKeys(id: string, pattern: string): Promise<string[]>;
  redisGetKey(id: string, key: string): Promise<RedisKeyDetails>;
  redisDeleteKey(id: string, key: string, confirmDanger?: boolean): Promise<number>;
  redisExecuteCommand(id: string, command: string, confirmDanger?: boolean): Promise<unknown>;
}

export const useDatabaseStore = create<DatabaseStore>((set, get) => ({
  databases: [],
  loading: false,

  async load() {
    set({ loading: true, error: undefined });
    try {
      const databases = await window.dreamstar.databases.list();
      set({ databases, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), loading: false });
    }
  },

  async create(input) {
    await window.dreamstar.databases.create(input);
    await get().load();
  },

  async update(id, patch) {
    await window.dreamstar.databases.update(id, patch);
    await get().load();
  },

  async delete(id) {
    await window.dreamstar.databases.delete(id);
    await get().load();
  },

  async testConnection(id) {
    await window.dreamstar.databases.testConnection(id);
  },

  executeSql: (id, sql, confirmDanger) => window.dreamstar.databases.executeSql(id, sql, confirmDanger),
  redisSearchKeys: (id, pattern) => window.dreamstar.databases.redisSearchKeys(id, pattern),
  redisGetKey: (id, key) => window.dreamstar.databases.redisGetKey(id, key),
  redisDeleteKey: (id, key, confirmDanger) => window.dreamstar.databases.redisDeleteKey(id, key, confirmDanger),
  redisExecuteCommand: (id, command, confirmDanger) =>
    window.dreamstar.databases.redisExecuteCommand(id, command, confirmDanger)
}));
