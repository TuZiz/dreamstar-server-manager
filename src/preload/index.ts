import { contextBridge, ipcRenderer } from 'electron';
import type { DreamstarApi } from './types';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as ApiResult<T>;
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.data;
}

const api: DreamstarApi = {
  config: {
    getConfig: () => invoke('config:get'),
    saveConfig: (config) => invoke('config:save', config),
    updateSettings: (settings) => invoke('config:update-settings', settings)
  },
  servers: {
    list: () => invoke('servers:list'),
    get: (id) => invoke('servers:get', id),
    createMinecraftServer: (input) => invoke('servers:create-minecraft', input),
    createVelocityServer: (input) => invoke('servers:create-velocity', input),
    createCustomProcess: (input) => invoke('servers:create-custom', input),
    update: (id, patch) => invoke('servers:update', id, patch),
    delete: (id) => invoke('servers:delete', id),
    start: (id) => invoke('servers:start', id),
    stop: (id) => invoke('servers:stop', id),
    restart: (id) => invoke('servers:restart', id),
    kill: (id) => invoke('servers:kill', id),
    startAll: () => invoke('servers:start-all'),
    stopAll: () => invoke('servers:stop-all'),
    restartAll: () => invoke('servers:restart-all'),
    sendCommand: (id, command) => invoke('servers:send-command', id, command),
    getRuntimeState: (id) => invoke('servers:get-runtime-state', id),
    listRuntimeStates: () => invoke('servers:list-runtime-states'),
    getLogs: (id) => invoke('servers:get-logs', id),
    clearLogs: (id) => invoke('servers:clear-logs', id),
    listFiles: (id, relativePath) => invoke('servers:list-files', id, relativePath),
    readTextFile: (id, relativePath) => invoke('servers:read-text-file', id, relativePath),
    writeTextFile: (id, relativePath, content) =>
      invoke('servers:write-text-file', id, relativePath, content),
    subscribeLogs: (id, listener) => {
      const handler = (_event: Electron.IpcRendererEvent, entry: unknown) => {
        const logEntry = entry as Parameters<typeof listener>[0];
        if (id === '*' || logEntry.id === id) {
          listener(logEntry);
        }
      };
      ipcRenderer.on('servers:log', handler);
      return () => ipcRenderer.removeListener('servers:log', handler);
    },
    subscribeState: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, state: unknown) => {
        listener(state as Parameters<typeof listener>[0]);
      };
      ipcRenderer.on('servers:state', handler);
      return () => ipcRenderer.removeListener('servers:state', handler);
    },
    subscribeLogsCleared: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, id: unknown) => {
        listener(String(id));
      };
      ipcRenderer.on('servers:logs-cleared', handler);
      return () => ipcRenderer.removeListener('servers:logs-cleared', handler);
    }
  },
  databases: {
    list: () => invoke('databases:list'),
    create: (input) => invoke('databases:create', input),
    update: (id, patch) => invoke('databases:update', id, patch),
    delete: (id) => invoke('databases:delete', id),
    testConnection: (id) => invoke('databases:test-connection', id),
    listDatabases: (id) => invoke('databases:list-databases', id),
    listTables: (id) => invoke('databases:list-tables', id),
    describeTable: (id, table) => invoke('databases:describe-table', id, table),
    executeSql: (id, sql, confirmDanger) => invoke('databases:execute-sql', id, sql, confirmDanger),
    redisSearchKeys: (id, pattern) => invoke('databases:redis-search-keys', id, pattern),
    redisGetKey: (id, key) => invoke('databases:redis-get-key', id, key),
    redisDeleteKey: (id, key, confirmDanger) => invoke('databases:redis-delete-key', id, key, confirmDanger),
    redisExecuteCommand: (id, command, confirmDanger) =>
      invoke('databases:redis-execute-command', id, command, confirmDanger)
  },
  system: {
    selectDirectory: () => invoke('system:select-directory'),
    selectFile: (options) => invoke('system:select-file', options),
    selectJavaExecutable: () => invoke('system:select-java-executable'),
    checkPathExists: (path) => invoke('system:check-path-exists', path),
    createDirectory: (path) => invoke('system:create-directory', path),
    copyFileToDirectory: (source, targetDir, targetName) =>
      invoke('system:copy-file-to-directory', source, targetDir, targetName),
    checkPortAvailable: (port, host) => invoke('system:check-port-available', port, host),
    getSystemMetrics: () => invoke('system:get-system-metrics')
  }
};

contextBridge.exposeInMainWorld('dreamstar', api);
