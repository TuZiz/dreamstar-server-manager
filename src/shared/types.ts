export type ServerType = 'minecraft' | 'velocity' | 'database-process' | 'custom';

export type ServerEngine =
  | 'paper'
  | 'purpur'
  | 'spigot'
  | 'folia'
  | 'velocity'
  | 'custom';

export type InstanceStatus =
  | 'running'
  | 'stopped'
  | 'starting'
  | 'stopping'
  | 'restarting'
  | 'crashed'
  | 'error';

export interface ServerPropertiesConfig {
  serverPort: number;
  onlineMode: boolean;
  motd: string;
  maxPlayers: number;
  viewDistance: number;
  simulationDistance: number;
  enableCommandBlock: boolean;
  allowFlight: boolean;
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard';
  gamemode: 'survival' | 'creative' | 'adventure' | 'spectator';
  pvp: boolean;
  spawnProtection: number;
}

export interface ServerInstanceConfig {
  id: string;
  name: string;
  type: ServerType;
  engine?: ServerEngine;
  workdir: string;
  command: string;
  args: string[];
  javaPath?: string;
  jarPath?: string;
  minMemory?: string;
  maxMemory?: string;
  jvmArgs?: string[];
  appArgs?: string[];
  stopCommand: string;
  autoRestart: boolean;
  startupDelaySeconds: number;
  shutdownTimeoutSeconds: number;
  enabled: boolean;
  group?: string;
  logFile?: string;
  port?: number;
  maxPlayers?: number;
  motd?: string;
  onlineMode?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InstanceRuntimeState {
  id: string;
  status: InstanceStatus;
  pid?: number;
  startedAt?: string;
  uptimeSeconds?: number;
  lastExitCode?: number | null;
  lastError?: string;
  manualStop: boolean;
  onlinePlayers?: number;
  maxPlayers?: number;
}

export type LogStream = 'stdout' | 'stderr' | 'system' | 'command';

export interface LogEntry {
  id: string;
  time: string;
  stream: LogStream;
  message: string;
}

export interface MinecraftServerCreateInput {
  id: string;
  name: string;
  workdir: string;
  createDirectory: boolean;
  group?: string;
  engine: Exclude<ServerEngine, 'velocity'>;
  jarSourcePath?: string;
  copyJar: boolean;
  jarFileName: string;
  javaPath: string;
  minMemory: string;
  maxMemory: string;
  jvmArgsText?: string;
  appArgsText?: string;
  nogui: boolean;
  autoRestart: boolean;
  startupDelaySeconds: number;
  shutdownTimeoutSeconds: number;
  logFile?: string;
  eulaAccepted: boolean;
  serverProperties: ServerPropertiesConfig;
  serverPropertiesMode: 'merge' | 'overwrite';
}

export interface VelocityServerCreateInput {
  id: string;
  name: string;
  workdir: string;
  createDirectory: boolean;
  group?: string;
  jarSourcePath?: string;
  copyJar: boolean;
  jarFileName: string;
  javaPath: string;
  minMemory: string;
  maxMemory: string;
  bindAddress: string;
  port: number;
  onlineMode: boolean;
  forwardingMode: 'none' | 'legacy' | 'bungeeguard' | 'modern';
  forwardingSecret?: string;
  generateForwardingSecret: boolean;
  autoRestart: boolean;
  startupDelaySeconds: number;
  shutdownTimeoutSeconds: number;
}

export interface CustomProcessCreateInput {
  id: string;
  name: string;
  workdir: string;
  createDirectory: boolean;
  command: string;
  argsText?: string;
  stopCommand?: string;
  autoRestart: boolean;
  startupDelaySeconds: number;
  shutdownTimeoutSeconds: number;
  logFile?: string;
  group?: string;
}

export type DatabaseType = 'mysql' | 'postgres' | 'redis';

export interface DatabaseConnectionConfig {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  username?: string;
  password?: string;
  database?: string;
  redisDb?: number;
  ssl?: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  elapsedMs: number;
  warning?: string;
}

export interface RedisKeyDetails {
  key: string;
  type: string;
  ttl: number;
  value: unknown;
}

export interface AppSettings {
  startupOrder: string[];
  shutdownOrder: string[];
  theme: 'light' | 'dark';
  defaultServerRoot?: string;
  backupDirectory?: string;
  mysqlDumpPath?: string;
  pgDumpPath?: string;
}

export interface AppConfig {
  servers: ServerInstanceConfig[];
  databases: DatabaseConnectionConfig[];
  settings: AppSettings;
}

export interface SystemMetrics {
  platform: string;
  arch: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
}

export interface SelectFileOptions {
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}
