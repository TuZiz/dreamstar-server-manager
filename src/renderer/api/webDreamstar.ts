import type { DreamstarApi } from '../types/api';
import type { InstanceRuntimeState, LogEntry, SelectFileOptions } from '../../shared/types';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

const DEFAULT_API_BASE = 'http://127.0.0.1:25888/api';
const API_BASE = ((import.meta.env.VITE_DREAMSTAR_API_BASE as string | undefined) ?? DEFAULT_API_BASE).replace(
  /\/+$/,
  ''
);

type LogSubscription = {
  id: string;
  listener: (entry: LogEntry) => void;
};

const logListeners = new Set<LogSubscription>();
const stateListeners = new Set<(state: InstanceRuntimeState) => void>();
const logsClearedListeners = new Set<(id: string) => void>();
let eventSource: EventSource | undefined;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers
      }
    });
  } catch (error) {
    throw new Error(
      `无法连接 DreamStar Web API (${API_BASE})，请先运行 npm run dev:web。${
        error instanceof Error ? ` ${error.message}` : ''
      }`
    );
  }

  const result = (await response.json()) as ApiResult<T>;
  if (!response.ok || !result.ok) {
    throw new Error(result.ok ? `HTTP ${response.status}` : result.error);
  }
  return result.data;
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

function encodePath(value: string): string {
  return encodeURIComponent(value);
}

function promptPath(message: string, options?: SelectFileOptions): Promise<string | null> {
  const filterText = options?.filters?.length
    ? `\n筛选: ${options.filters.map((item) => `${item.name} (${item.extensions.join(', ')})`).join('; ')}`
    : '';
  const value = window.prompt(`${message}${filterText}`, '');
  return Promise.resolve(value?.trim() || null);
}

function ensureEvents(): void {
  if (eventSource) {
    return;
  }

  eventSource = new EventSource(`${API_BASE}/events`);
  eventSource.addEventListener('log', (event) => {
    const entry = JSON.parse(event.data) as LogEntry;
    for (const subscription of logListeners) {
      if (subscription.id === '*' || subscription.id === entry.id) {
        subscription.listener(entry);
      }
    }
  });
  eventSource.addEventListener('state', (event) => {
    const state = JSON.parse(event.data) as InstanceRuntimeState;
    for (const listener of stateListeners) {
      listener(state);
    }
  });
  eventSource.addEventListener('logs-cleared', (event) => {
    const id = JSON.parse(event.data) as string;
    for (const listener of logsClearedListeners) {
      listener(id);
    }
  });
}

function closeEventsIfIdle(): void {
  if (logListeners.size || stateListeners.size || logsClearedListeners.size) {
    return;
  }
  eventSource?.close();
  eventSource = undefined;
}

function createWebDreamstarApi(): DreamstarApi {
  return {
    config: {
      getConfig: () => request('/config'),
      saveConfig: (config) => post('/config/save', config),
      updateSettings: (settings) => post('/config/settings', settings)
    },
    servers: {
      list: () => request('/servers'),
      get: (id) => request(`/servers/${encodePath(id)}`),
      createMinecraftServer: (input) => post('/servers/create/minecraft', input),
      createVelocityServer: (input) => post('/servers/create/velocity', input),
      createCustomProcess: (input) => post('/servers/create/custom', input),
      update: (id, patch) => post(`/servers/${encodePath(id)}/update`, patch),
      delete: (id) => post(`/servers/${encodePath(id)}/delete`),
      start: (id) => post(`/servers/${encodePath(id)}/start`),
      stop: (id) => post(`/servers/${encodePath(id)}/stop`),
      restart: (id) => post(`/servers/${encodePath(id)}/restart`),
      kill: (id) => post(`/servers/${encodePath(id)}/kill`),
      startAll: () => post('/servers/start-all'),
      stopAll: () => post('/servers/stop-all'),
      restartAll: () => post('/servers/restart-all'),
      sendCommand: (id, command) => post(`/servers/${encodePath(id)}/command`, { command }),
      getRuntimeState: (id) => request(`/servers/${encodePath(id)}/runtime`),
      listRuntimeStates: () => request('/servers/runtime'),
      getLogs: (id) => request(`/servers/${encodePath(id)}/logs`),
      clearLogs: (id) => post(`/servers/${encodePath(id)}/logs/clear`),
      listFiles: (id, relativePath = '') =>
        request(`/servers/${encodePath(id)}/files${query({ path: relativePath })}`),
      readTextFile: (id, relativePath) =>
        request(`/servers/${encodePath(id)}/file${query({ path: relativePath })}`),
      writeTextFile: (id, relativePath, content) =>
        post(`/servers/${encodePath(id)}/file`, { path: relativePath, content }),
      createTextFile: (id, relativePath, content = '') =>
        post(`/servers/${encodePath(id)}/file/create`, { path: relativePath, content }),
      createDirectory: (id, relativePath) =>
        post(`/servers/${encodePath(id)}/directory/create`, { path: relativePath }),
      renamePath: (id, fromRelativePath, toRelativePath) =>
        post(`/servers/${encodePath(id)}/path/rename`, { from: fromRelativePath, to: toRelativePath }),
      deletePath: (id, relativePath) => post(`/servers/${encodePath(id)}/path/delete`, { path: relativePath }),
      subscribeLogs: (id, listener) => {
        const subscription = { id, listener };
        logListeners.add(subscription);
        ensureEvents();
        return () => {
          logListeners.delete(subscription);
          closeEventsIfIdle();
        };
      },
      subscribeState: (listener) => {
        stateListeners.add(listener);
        ensureEvents();
        return () => {
          stateListeners.delete(listener);
          closeEventsIfIdle();
        };
      },
      subscribeLogsCleared: (listener) => {
        logsClearedListeners.add(listener);
        ensureEvents();
        return () => {
          logsClearedListeners.delete(listener);
          closeEventsIfIdle();
        };
      }
    },
    databases: {
      list: () => request('/databases'),
      create: (input) => post('/databases/create', input),
      update: (id, patch) => post(`/databases/${encodePath(id)}/update`, patch),
      delete: (id) => post(`/databases/${encodePath(id)}/delete`),
      testConnection: (id) => post(`/databases/${encodePath(id)}/test`),
      listDatabases: (id) => request(`/databases/${encodePath(id)}/databases`),
      listTables: (id) => request(`/databases/${encodePath(id)}/tables`),
      describeTable: (id, table) => request(`/databases/${encodePath(id)}/tables/${encodePath(table)}`),
      executeSql: (id, sql, confirmDanger) => post(`/databases/${encodePath(id)}/sql`, { sql, confirmDanger }),
      redisSearchKeys: (id, pattern) =>
        request(`/databases/${encodePath(id)}/redis/keys${query({ pattern })}`),
      redisGetKey: (id, key) => request(`/databases/${encodePath(id)}/redis/key${query({ key })}`),
      redisDeleteKey: (id, key, confirmDanger) =>
        post(`/databases/${encodePath(id)}/redis/key/delete`, { key, confirmDanger }),
      redisExecuteCommand: (id, command, confirmDanger) =>
        post(`/databases/${encodePath(id)}/redis/command`, { command, confirmDanger })
    },
    system: {
      selectDirectory: () => promptPath('请输入本机文件夹路径'),
      selectFile: (options) => promptPath(options?.title ?? '请输入本机文件路径', options),
      selectJavaExecutable: () => promptPath('请输入 java.exe 路径'),
      checkPathExists: (path) => request(`/system/path-exists${query({ path })}`),
      createDirectory: (path) => post('/system/create-directory', { path }),
      copyFileToDirectory: (source, targetDir, targetName) =>
        post('/system/copy-file', { source, targetDir, targetName }),
      checkPortAvailable: (port, host) => request(`/system/port${query({ port, host })}`),
      getSystemMetrics: () => request('/system/metrics')
    }
  };
}

export function installWebDreamstarApi(): void {
  if (window.dreamstar) {
    return;
  }
  window.dreamstar = createWebDreamstarApi();
}
