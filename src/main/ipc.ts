import { constants, promises as fs } from 'fs';
import { join } from 'path';
import { BrowserWindow, ipcMain } from 'electron';
import type {
  AppConfig,
  AppSettings,
  CustomProcessCreateInput,
  DatabaseConnectionConfig,
  MinecraftServerCreateInput,
  ServerEngine,
  ServerInstanceConfig,
  ServerType,
  SelectFileOptions,
  VelocityServerCreateInput
} from '../shared/types';
import { ConfigService } from './config/ConfigService';
import { DatabaseManager } from './database/DatabaseManager';
import { LogService } from './logs/LogService';
import { ProcessManager } from './process/ProcessManager';
import { FileService } from './system/FileService';
import { PortService } from './system/PortService';
import { SystemDialogService } from './system/SystemDialogService';
import { SystemMetricsService } from './system/SystemMetricsService';
import { toSafeErrorMessage } from './utils/safeError';
import { splitCommandLine } from './utils/validation';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

interface IpcContext {
  configService: ConfigService;
  processManager: ProcessManager;
  databaseManager: DatabaseManager;
  logService: LogService;
  dialogService: SystemDialogService;
  fileService: FileService;
  portService: PortService;
  metricsService: SystemMetricsService;
}

interface ManagedCreateInput {
  id: string;
  name: string;
  type: ServerType;
  engine?: ServerEngine;
  workdir: string;
  createDirectory: boolean;
  commandLine: string;
  stopCommand: string;
  autoRestart: boolean;
  startupDelaySeconds: number;
  shutdownTimeoutSeconds: number;
  group?: string;
  logFile?: string;
  port?: number;
  maxPlayers?: number;
}

function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

function fail(error: unknown): ApiResult<never> {
  return { ok: false, error: toSafeErrorMessage(error) };
}

function handle<TArgs extends unknown[], TResult>(
  channel: string,
  handler: (...args: TArgs) => Promise<TResult> | TResult
): void {
  ipcMain.handle(channel, async (_event, ...args: TArgs): Promise<ApiResult<TResult>> => {
    try {
      return ok(await handler(...args));
    } catch (error) {
      return fail(error);
    }
  });
}

function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, payload);
    }
  }
}

export function registerIpc(context: IpcContext): void {
  const {
    configService,
    processManager,
    databaseManager,
    logService,
    dialogService,
    fileService,
    portService,
    metricsService
  } = context;

  logService.on('log', (entry) => broadcast('servers:log', entry));
  logService.on('cleared', (id) => broadcast('servers:logs-cleared', id));
  processManager.on('state', (state) => broadcast('servers:state', state));

  handle('config:get', () => configService.getConfig());
  handle('config:save', (config: AppConfig) => configService.replaceConfig(config));
  handle('config:update-settings', (settings: Partial<AppSettings>) => configService.updateSettings(settings));

  handle('servers:list', () => configService.listServers());
  handle('servers:get', (id: string) => configService.getServer(id));
  handle('servers:create-minecraft', (input: MinecraftServerCreateInput) =>
    createMinecraftServer(configService, fileService, input)
  );
  handle('servers:create-velocity', (input: VelocityServerCreateInput) =>
    createVelocityServer(configService, fileService, input)
  );
  handle('servers:create-custom', (input: CustomProcessCreateInput) =>
    createCustomProcess(configService, fileService, input)
  );
  handle('servers:update', (id: string, patch: Partial<ServerInstanceConfig>) =>
    configService.updateServer(id, patch)
  );
  handle('servers:delete', async (id: string) => {
    const state = processManager.getRuntimeState(id);
    if (state.status === 'running' || state.status === 'starting' || state.status === 'stopping') {
      throw new Error('请先停止实例，再删除配置');
    }
    await configService.deleteServer(id);
    processManager.remove(id);
  });
  handle('servers:start', (id: string) => processManager.start(id));
  handle('servers:stop', (id: string) => processManager.stop(id));
  handle('servers:restart', (id: string) => processManager.restart(id));
  handle('servers:kill', (id: string) => processManager.kill(id));
  handle('servers:start-all', () => processManager.startAll());
  handle('servers:stop-all', () => processManager.stopAll());
  handle('servers:restart-all', () => processManager.restartAll());
  handle('servers:send-command', (id: string, command: string) => {
    processManager.sendCommand(id, command);
  });
  handle('servers:get-runtime-state', (id: string) => processManager.getRuntimeState(id));
  handle('servers:list-runtime-states', () => processManager.listRuntimeStates());
  handle('servers:get-logs', (id: string) => logService.getLogs(id));
  handle('servers:clear-logs', (id: string) => logService.clear(id));

  handle('databases:list', () => databaseManager.list());
  handle('databases:create', (input: Omit<DatabaseConnectionConfig, 'createdAt' | 'updatedAt'>) =>
    databaseManager.create(input)
  );
  handle('databases:update', (id: string, patch: Partial<DatabaseConnectionConfig>) =>
    databaseManager.update(id, patch)
  );
  handle('databases:delete', (id: string) => databaseManager.delete(id));
  handle('databases:test-connection', (id: string) => databaseManager.testConnection(id));
  handle('databases:list-databases', (id: string) => databaseManager.listDatabases(id));
  handle('databases:list-tables', (id: string) => databaseManager.listTables(id));
  handle('databases:describe-table', (id: string, table: string) => databaseManager.describeTable(id, table));
  handle('databases:execute-sql', (id: string, sql: string, confirmDanger?: boolean) =>
    databaseManager.executeSql(id, sql, Boolean(confirmDanger))
  );
  handle('databases:redis-search-keys', (id: string, pattern: string) =>
    databaseManager.redisSearchKeys(id, pattern)
  );
  handle('databases:redis-get-key', (id: string, key: string) => databaseManager.redisGetKey(id, key));
  handle('databases:redis-delete-key', (id: string, key: string, confirmDanger?: boolean) =>
    databaseManager.redisDeleteKey(id, key, Boolean(confirmDanger))
  );
  handle('databases:redis-execute-command', (id: string, command: string, confirmDanger?: boolean) =>
    databaseManager.redisExecuteCommand(id, command, Boolean(confirmDanger))
  );

  handle('system:select-directory', () => dialogService.selectDirectory());
  handle('system:select-file', (options: SelectFileOptions) => dialogService.selectFile(options));
  handle('system:select-java-executable', () => dialogService.selectJavaExecutable());
  handle('system:check-path-exists', (path: string) => fileService.checkPathExists(path));
  handle('system:create-directory', (path: string) => fileService.createDirectory(path));
  handle('system:copy-file-to-directory', (source: string, targetDir: string, targetName?: string) =>
    fileService.copyFileToDirectory(source, targetDir, targetName)
  );
  handle('system:check-port-available', (port: number, host?: string) =>
    portService.checkPortAvailable(port, host)
  );
  handle('system:get-system-metrics', () => metricsService.getSystemMetrics());
}

async function createMinecraftServer(
  configService: ConfigService,
  fileService: FileService,
  input: MinecraftServerCreateInput
): Promise<ServerInstanceConfig> {
  return createManagedInstance(configService, fileService, {
    id: input.id,
    name: input.name,
    type: 'minecraft',
    engine: input.engine ?? 'paper',
    workdir: input.workdir,
    createDirectory: input.createDirectory,
    commandLine: input.commandLine,
    stopCommand: input.stopCommand?.trim() || 'stop',
    autoRestart: input.autoRestart,
    startupDelaySeconds: input.startupDelaySeconds,
    shutdownTimeoutSeconds: input.shutdownTimeoutSeconds,
    group: input.group,
    logFile: input.logFile,
    port: input.port,
    maxPlayers: input.maxPlayers
  });
}

async function createVelocityServer(
  configService: ConfigService,
  fileService: FileService,
  input: VelocityServerCreateInput
): Promise<ServerInstanceConfig> {
  return createManagedInstance(configService, fileService, {
    id: input.id,
    name: input.name,
    type: 'velocity',
    engine: 'velocity',
    workdir: input.workdir,
    createDirectory: input.createDirectory,
    commandLine: input.commandLine,
    stopCommand: input.stopCommand?.trim() || 'end',
    autoRestart: input.autoRestart,
    startupDelaySeconds: input.startupDelaySeconds,
    shutdownTimeoutSeconds: input.shutdownTimeoutSeconds,
    group: input.group,
    logFile: input.logFile,
    port: input.port
  });
}

async function createCustomProcess(
  configService: ConfigService,
  fileService: FileService,
  input: CustomProcessCreateInput
): Promise<ServerInstanceConfig> {
  const commandLine = [input.command, input.argsText].filter(Boolean).join(' ');
  return createManagedInstance(configService, fileService, {
    id: input.id,
    name: input.name,
    type: 'custom',
    engine: 'custom',
    workdir: input.workdir,
    createDirectory: input.createDirectory,
    commandLine,
    stopCommand: input.stopCommand?.trim() ?? '',
    autoRestart: input.autoRestart,
    startupDelaySeconds: input.startupDelaySeconds,
    shutdownTimeoutSeconds: input.shutdownTimeoutSeconds,
    group: input.group,
    logFile: input.logFile
  });
}

async function createManagedInstance(
  configService: ConfigService,
  fileService: FileService,
  input: ManagedCreateInput
): Promise<ServerInstanceConfig> {
  const workdir = input.workdir.trim();
  await prepareWorkdir(fileService, workdir, input.createDirectory);

  const commandParts = splitCommandLine(input.commandLine);
  if (commandParts.length === 0) {
    throw new Error('启动命令不能为空');
  }

  const logFile = input.logFile?.trim();
  if (logFile?.startsWith('logs/')) {
    await fs.mkdir(join(workdir, 'logs'), { recursive: true });
  }

  const now = new Date().toISOString();
  const server: ServerInstanceConfig = {
    id: input.id.trim(),
    name: input.name.trim(),
    type: input.type,
    engine: input.engine,
    workdir,
    command: commandParts[0],
    args: commandParts.slice(1),
    stopCommand: input.stopCommand,
    autoRestart: input.autoRestart,
    startupDelaySeconds: Number(input.startupDelaySeconds) || 0,
    shutdownTimeoutSeconds: Number(input.shutdownTimeoutSeconds) || 30,
    enabled: true,
    group: input.group?.trim(),
    logFile: logFile || undefined,
    port: input.port ? Number(input.port) : undefined,
    maxPlayers: input.maxPlayers ? Number(input.maxPlayers) : undefined,
    createdAt: now,
    updatedAt: now
  };
  return configService.createServer(server);
}

async function prepareWorkdir(fileService: FileService, workdir: string, createDirectory: boolean): Promise<void> {
  if (!workdir) {
    throw new Error('工作目录不能为空');
  }
  const exists = await fileService.checkPathExists(workdir);
  if (!exists && !createDirectory) {
    throw new Error('工作目录不存在，请勾选自动创建目录或重新选择');
  }
  if (!exists) {
    await fileService.createDirectory(workdir);
  }
  await fs.access(workdir, constants.W_OK);
}
