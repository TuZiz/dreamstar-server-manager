import { promises as fs } from 'fs';
import { dirname } from 'path';
import type {
  AppConfig,
  AppSettings,
  DatabaseConnectionConfig,
  ServerInstanceConfig
} from '../../shared/types';
import { assertUniqueDatabase, assertUniqueServer } from '../utils/validation';

const DEFAULT_SETTINGS: AppSettings = {
  startupOrder: [],
  shutdownOrder: [],
  theme: 'light',
  defaultServerRoot: '',
  backupDirectory: '',
  mysqlDumpPath: '',
  pgDumpPath: ''
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class ConfigService {
  private config: AppConfig = {
    servers: [],
    databases: [],
    settings: DEFAULT_SETTINGS
  };

  constructor(private readonly configPath: string) {}

  async load(): Promise<AppConfig> {
    await fs.mkdir(dirname(this.configPath), { recursive: true });
    try {
      const raw = await fs.readFile(this.configPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AppConfig>;
      this.config = {
        servers: Array.isArray(parsed.servers) ? parsed.servers : [],
        databases: Array.isArray(parsed.databases) ? parsed.databases : [],
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) }
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        throw error;
      }
      await this.save();
    }
    return this.getConfig();
  }

  getConfig(): AppConfig {
    return clone(this.config);
  }

  async replaceConfig(config: AppConfig): Promise<AppConfig> {
    this.config = {
      servers: config.servers ?? [],
      databases: config.databases ?? [],
      settings: { ...DEFAULT_SETTINGS, ...(config.settings ?? {}) }
    };
    await this.save();
    return this.getConfig();
  }

  async save(): Promise<void> {
    await fs.mkdir(dirname(this.configPath), { recursive: true });
    const tempPath = `${this.configPath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(this.config, null, 2), 'utf8');
    await fs.rename(tempPath, this.configPath);
  }

  listServers(): ServerInstanceConfig[] {
    return clone(this.config.servers);
  }

  getServer(id: string): ServerInstanceConfig {
    const server = this.config.servers.find((item) => item.id === id);
    if (!server) {
      throw new Error('实例不存在');
    }
    return clone(server);
  }

  async createServer(server: ServerInstanceConfig): Promise<ServerInstanceConfig> {
    assertUniqueServer(this.config, server);
    this.config.servers.push(server);
    await this.save();
    return clone(server);
  }

  async updateServer(id: string, patch: Partial<ServerInstanceConfig>): Promise<ServerInstanceConfig> {
    const index = this.config.servers.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error('实例不存在');
    }
    const updated = {
      ...this.config.servers[index],
      ...patch,
      id,
      updatedAt: new Date().toISOString()
    };
    this.config.servers[index] = updated;
    await this.save();
    return clone(updated);
  }

  async deleteServer(id: string): Promise<void> {
    this.config.servers = this.config.servers.filter((item) => item.id !== id);
    await this.save();
  }

  listDatabases(): DatabaseConnectionConfig[] {
    return clone(this.config.databases);
  }

  getDatabase(id: string): DatabaseConnectionConfig {
    const database = this.config.databases.find((item) => item.id === id);
    if (!database) {
      throw new Error('数据库连接不存在');
    }
    return clone(database);
  }

  async createDatabase(database: DatabaseConnectionConfig): Promise<DatabaseConnectionConfig> {
    assertUniqueDatabase(this.config, database);
    this.config.databases.push(database);
    await this.save();
    return clone(database);
  }

  async updateDatabase(id: string, patch: Partial<DatabaseConnectionConfig>): Promise<DatabaseConnectionConfig> {
    const index = this.config.databases.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error('数据库连接不存在');
    }
    const updated = {
      ...this.config.databases[index],
      ...patch,
      id,
      updatedAt: new Date().toISOString()
    };
    this.config.databases[index] = updated;
    await this.save();
    return clone(updated);
  }

  async deleteDatabase(id: string): Promise<void> {
    this.config.databases = this.config.databases.filter((item) => item.id !== id);
    await this.save();
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    this.config.settings = { ...this.config.settings, ...settings };
    await this.save();
    return clone(this.config.settings);
  }
}
