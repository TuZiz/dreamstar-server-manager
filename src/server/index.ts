import express, { type Request, type Response } from 'express';
import { constants, promises as fs } from 'fs';
import { join } from 'path';
import type {
  AppConfig,
  AppSettings,
  CustomProcessCreateInput,
  DatabaseConnectionConfig,
  MinecraftServerCreateInput,
  ServerEngine,
  ServerInstanceConfig,
  ServerType,
  VelocityServerCreateInput
} from '../shared/types';
import { ConfigService } from '../main/config/ConfigService';
import { DatabaseManager } from '../main/database/DatabaseManager';
import { LogService } from '../main/logs/LogService';
import { ProcessManager } from '../main/process/ProcessManager';
import { FileService } from '../main/system/FileService';
import { PortService } from '../main/system/PortService';
import { SystemMetricsService } from '../main/system/SystemMetricsService';
import { toSafeErrorMessage } from '../main/utils/safeError';
import { splitCommandLine } from '../main/utils/validation';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

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

const WEB_PORT = Number(process.env.DREAMSTAR_WEB_PORT ?? 25888);
const WEB_HOST = process.env.DREAMSTAR_WEB_HOST ?? '127.0.0.1';
const WEB_DIST_DIR = join(process.cwd(), 'out-web', 'renderer');
const WEB_INDEX_HTML = join(WEB_DIST_DIR, 'index.html');
const configService = new ConfigService(join(process.cwd(), 'config', 'config.json'));
const logService = new LogService();
const processManager = new ProcessManager(configService, logService);
const databaseManager = new DatabaseManager(configService);
const fileService = new FileService();
const portService = new PortService();
const metricsService = new SystemMetricsService();

function success<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

function failure(error: unknown): ApiResult<never> {
  return { ok: false, error: toSafeErrorMessage(error) };
}

function asyncRoute<T>(handler: (req: Request) => Promise<T> | T) {
  return async (req: Request, res: Response<ApiResult<T>>) => {
    try {
      res.json(success(await handler(req)));
    } catch (error) {
      res.status(400).json(failure(error));
    }
  };
}

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] ?? '' : value;
}

function enableLocalCors(req: Request, res: Response, next: () => void) {
  const origin = req.headers.origin;
  if (origin === 'http://127.0.0.1:5173' || origin === 'http://localhost:5173') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
}

async function main() {
  await configService.load();

  const app = express();
  app.use(enableLocalCors);
  app.use(express.json({ limit: '8mb' }));

  app.get('/api/health', asyncRoute(() => ({ ok: true })));

  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    const onLog = (entry: unknown) => send('log', entry);
    const onState = (state: unknown) => send('state', state);
    const onCleared = (id: string) => send('logs-cleared', id);
    const ping = setInterval(() => send('ping', Date.now()), 15000);

    logService.on('log', onLog);
    processManager.on('state', onState);
    logService.on('cleared', onCleared);
    req.on('close', () => {
      clearInterval(ping);
      logService.off('log', onLog);
      processManager.off('state', onState);
      logService.off('cleared', onCleared);
    });
  });

  app.get('/api/config', asyncRoute(() => configService.getConfig()));
  app.post('/api/config/save', asyncRoute((req) => configService.replaceConfig(req.body as AppConfig)));
  app.post('/api/config/settings', asyncRoute((req) => configService.updateSettings(req.body as Partial<AppSettings>)));

  app.get('/api/servers', asyncRoute(() => configService.listServers()));
  app.get('/api/servers/runtime', asyncRoute(() => processManager.listRuntimeStates()));
  app.get('/api/servers/:id', asyncRoute((req) => configService.getServer(routeParam(req, 'id'))));
  app.get('/api/servers/:id/runtime', asyncRoute((req) => processManager.getRuntimeState(routeParam(req, 'id'))));
  app.get('/api/servers/:id/logs', asyncRoute((req) => logService.getLogs(routeParam(req, 'id'))));
  app.post('/api/servers/:id/logs/clear', asyncRoute((req) => logService.clear(routeParam(req, 'id'))));
  app.post('/api/servers/create/minecraft', asyncRoute((req) =>
    createMinecraftServer(req.body as MinecraftServerCreateInput)
  ));
  app.post('/api/servers/create/velocity', asyncRoute((req) =>
    createVelocityServer(req.body as VelocityServerCreateInput)
  ));
  app.post('/api/servers/create/custom', asyncRoute((req) =>
    createCustomProcess(req.body as CustomProcessCreateInput)
  ));
  app.post('/api/servers/:id/update', asyncRoute((req) =>
    configService.updateServer(routeParam(req, 'id'), req.body as Partial<ServerInstanceConfig>)
  ));
  app.post('/api/servers/:id/delete', asyncRoute(async (req) => {
    const id = routeParam(req, 'id');
    const state = processManager.getRuntimeState(id);
    if (state.status === 'running' || state.status === 'starting' || state.status === 'stopping') {
      throw new Error('请先停止实例，再删除配置');
    }
    await configService.deleteServer(id);
    processManager.remove(id);
  }));
  app.post('/api/servers/:id/start', asyncRoute((req) => processManager.start(routeParam(req, 'id'))));
  app.post('/api/servers/:id/stop', asyncRoute((req) => processManager.stop(routeParam(req, 'id'))));
  app.post('/api/servers/:id/restart', asyncRoute((req) => processManager.restart(routeParam(req, 'id'))));
  app.post('/api/servers/:id/kill', asyncRoute((req) => processManager.kill(routeParam(req, 'id'))));
  app.post('/api/servers/start-all', asyncRoute(() => processManager.startAll()));
  app.post('/api/servers/stop-all', asyncRoute(() => processManager.stopAll()));
  app.post('/api/servers/restart-all', asyncRoute(() => processManager.restartAll()));
  app.post('/api/servers/:id/command', asyncRoute((req) => {
    processManager.sendCommand(routeParam(req, 'id'), String(req.body.command ?? ''));
  }));
  app.get('/api/servers/:id/files', asyncRoute((req) => {
    const server = configService.getServer(routeParam(req, 'id'));
    return fileService.listDirectory(server.workdir, String(req.query.path ?? ''));
  }));
  app.get('/api/servers/:id/file', asyncRoute((req) => {
    const server = configService.getServer(routeParam(req, 'id'));
    return fileService.readTextFile(server.workdir, String(req.query.path ?? ''));
  }));
  app.post('/api/servers/:id/file', asyncRoute((req) => {
    const server = configService.getServer(routeParam(req, 'id'));
    return fileService.writeTextFile(server.workdir, String(req.body.path ?? ''), String(req.body.content ?? ''));
  }));

  app.get('/api/databases', asyncRoute(() => databaseManager.list()));
  app.post('/api/databases/create', asyncRoute((req) =>
    databaseManager.create(req.body as Omit<DatabaseConnectionConfig, 'createdAt' | 'updatedAt'>)
  ));
  app.post('/api/databases/:id/update', asyncRoute((req) =>
    databaseManager.update(routeParam(req, 'id'), req.body as Partial<DatabaseConnectionConfig>)
  ));
  app.post('/api/databases/:id/delete', asyncRoute((req) => databaseManager.delete(routeParam(req, 'id'))));
  app.post('/api/databases/:id/test', asyncRoute((req) => databaseManager.testConnection(routeParam(req, 'id'))));
  app.get('/api/databases/:id/databases', asyncRoute((req) => databaseManager.listDatabases(routeParam(req, 'id'))));
  app.get('/api/databases/:id/tables', asyncRoute((req) => databaseManager.listTables(routeParam(req, 'id'))));
  app.get('/api/databases/:id/tables/:table', asyncRoute((req) =>
    databaseManager.describeTable(routeParam(req, 'id'), routeParam(req, 'table'))
  ));
  app.post('/api/databases/:id/sql', asyncRoute((req) =>
    databaseManager.executeSql(routeParam(req, 'id'), String(req.body.sql ?? ''), Boolean(req.body.confirmDanger))
  ));
  app.get('/api/databases/:id/redis/keys', asyncRoute((req) =>
    databaseManager.redisSearchKeys(routeParam(req, 'id'), String(req.query.pattern ?? '*'))
  ));
  app.get('/api/databases/:id/redis/key', asyncRoute((req) =>
    databaseManager.redisGetKey(routeParam(req, 'id'), String(req.query.key ?? ''))
  ));
  app.post('/api/databases/:id/redis/key/delete', asyncRoute((req) =>
    databaseManager.redisDeleteKey(routeParam(req, 'id'), String(req.body.key ?? ''), Boolean(req.body.confirmDanger))
  ));
  app.post('/api/databases/:id/redis/command', asyncRoute((req) =>
    databaseManager.redisExecuteCommand(routeParam(req, 'id'), String(req.body.command ?? ''), Boolean(req.body.confirmDanger))
  ));

  app.get('/api/system/path-exists', asyncRoute((req) => fileService.checkPathExists(String(req.query.path ?? ''))));
  app.post('/api/system/create-directory', asyncRoute((req) => fileService.createDirectory(String(req.body.path ?? ''))));
  app.post('/api/system/copy-file', asyncRoute((req) =>
    fileService.copyFileToDirectory(String(req.body.source ?? ''), String(req.body.targetDir ?? ''), req.body.targetName)
  ));
  app.get('/api/system/port', asyncRoute((req) =>
    portService.checkPortAvailable(Number(req.query.port), req.query.host ? String(req.query.host) : undefined)
  ));
  app.get('/api/system/metrics', asyncRoute(() => metricsService.getSystemMetrics()));

  const hasWebBuild = await fileService.checkPathExists(WEB_INDEX_HTML);
  if (hasWebBuild) {
    app.use(express.static(WEB_DIST_DIR));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(WEB_INDEX_HTML);
    });
  }

  app.listen(WEB_PORT, WEB_HOST, () => {
    console.log(`DreamStar web API running at http://${WEB_HOST}:${WEB_PORT}`);
    if (hasWebBuild) {
      console.log(`DreamStar web UI available at http://${WEB_HOST}:${WEB_PORT}`);
    } else {
      console.log('Run npm run dev:renderer in another terminal for the web UI.');
    }
  });
}

async function createMinecraftServer(input: MinecraftServerCreateInput): Promise<ServerInstanceConfig> {
  return createManagedInstance({
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

async function createVelocityServer(input: VelocityServerCreateInput): Promise<ServerInstanceConfig> {
  return createManagedInstance({
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

async function createCustomProcess(input: CustomProcessCreateInput): Promise<ServerInstanceConfig> {
  return createManagedInstance({
    id: input.id,
    name: input.name,
    type: 'custom',
    engine: 'custom',
    workdir: input.workdir,
    createDirectory: input.createDirectory,
    commandLine: [input.command, input.argsText].filter(Boolean).join(' '),
    stopCommand: input.stopCommand?.trim() ?? '',
    autoRestart: input.autoRestart,
    startupDelaySeconds: input.startupDelaySeconds,
    shutdownTimeoutSeconds: input.shutdownTimeoutSeconds,
    group: input.group,
    logFile: input.logFile
  });
}

async function createManagedInstance(input: ManagedCreateInput): Promise<ServerInstanceConfig> {
  const workdir = input.workdir.trim();
  await prepareWorkdir(workdir, input.createDirectory);

  const commandParts = splitCommandLine(input.commandLine);
  if (commandParts.length === 0) {
    throw new Error('启动命令不能为空');
  }

  const logFile = input.logFile?.trim();
  if (logFile?.startsWith('logs/')) {
    await fs.mkdir(join(workdir, 'logs'), { recursive: true });
  }

  const now = new Date().toISOString();
  return configService.createServer({
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
  });
}

async function prepareWorkdir(workdir: string, createDirectory: boolean): Promise<void> {
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

void main().catch((error) => {
  console.error(toSafeErrorMessage(error));
  process.exitCode = 1;
});
