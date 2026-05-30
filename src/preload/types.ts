import type {
  AppConfig,
  AppSettings,
  CustomProcessCreateInput,
  DatabaseConnectionConfig,
  InstanceRuntimeState,
  LogEntry,
  MinecraftServerCreateInput,
  RedisKeyDetails,
  SelectFileOptions,
  ServerInstanceConfig,
  SqlQueryResult,
  SystemMetrics,
  VelocityServerCreateInput
} from '../shared/types';

export interface DreamstarApi {
  config: {
    getConfig(): Promise<AppConfig>;
    saveConfig(config: AppConfig): Promise<AppConfig>;
    updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
  };
  servers: {
    list(): Promise<ServerInstanceConfig[]>;
    get(id: string): Promise<ServerInstanceConfig>;
    createMinecraftServer(input: MinecraftServerCreateInput): Promise<ServerInstanceConfig>;
    createVelocityServer(input: VelocityServerCreateInput): Promise<ServerInstanceConfig>;
    createCustomProcess(input: CustomProcessCreateInput): Promise<ServerInstanceConfig>;
    update(id: string, patch: Partial<ServerInstanceConfig>): Promise<ServerInstanceConfig>;
    delete(id: string): Promise<void>;
    start(id: string): Promise<InstanceRuntimeState>;
    stop(id: string): Promise<InstanceRuntimeState>;
    restart(id: string): Promise<InstanceRuntimeState>;
    kill(id: string): Promise<InstanceRuntimeState>;
    startAll(): Promise<InstanceRuntimeState[]>;
    stopAll(): Promise<InstanceRuntimeState[]>;
    restartAll(): Promise<InstanceRuntimeState[]>;
    sendCommand(id: string, command: string): Promise<void>;
    getRuntimeState(id: string): Promise<InstanceRuntimeState>;
    listRuntimeStates(): Promise<InstanceRuntimeState[]>;
    getLogs(id: string): Promise<LogEntry[]>;
    clearLogs(id: string): Promise<void>;
    subscribeLogs(id: string, listener: (entry: LogEntry) => void): () => void;
    subscribeState(listener: (state: InstanceRuntimeState) => void): () => void;
    subscribeLogsCleared(listener: (id: string) => void): () => void;
  };
  databases: {
    list(): Promise<DatabaseConnectionConfig[]>;
    create(input: Omit<DatabaseConnectionConfig, 'createdAt' | 'updatedAt'>): Promise<DatabaseConnectionConfig>;
    update(id: string, patch: Partial<DatabaseConnectionConfig>): Promise<DatabaseConnectionConfig>;
    delete(id: string): Promise<void>;
    testConnection(id: string): Promise<void>;
    listDatabases(id: string): Promise<string[]>;
    listTables(id: string): Promise<string[]>;
    describeTable(id: string, table: string): Promise<Record<string, unknown>[]>;
    executeSql(id: string, sql: string, confirmDanger?: boolean): Promise<SqlQueryResult>;
    redisSearchKeys(id: string, pattern: string): Promise<string[]>;
    redisGetKey(id: string, key: string): Promise<RedisKeyDetails>;
    redisDeleteKey(id: string, key: string, confirmDanger?: boolean): Promise<number>;
    redisExecuteCommand(id: string, command: string, confirmDanger?: boolean): Promise<unknown>;
  };
  system: {
    selectDirectory(): Promise<string | null>;
    selectFile(options?: SelectFileOptions): Promise<string | null>;
    selectJavaExecutable(): Promise<string | null>;
    checkPathExists(path: string): Promise<boolean>;
    createDirectory(path: string): Promise<void>;
    copyFileToDirectory(source: string, targetDir: string, targetName?: string): Promise<string>;
    checkPortAvailable(port: number, host?: string): Promise<boolean>;
    getSystemMetrics(): Promise<SystemMetrics>;
  };
}

declare global {
  interface Window {
    dreamstar: DreamstarApi;
  }
}
