import type { DatabaseConnectionConfig, DatabaseType, RedisKeyDetails, SqlQueryResult } from '../../shared/types';
import { ConfigService } from '../config/ConfigService';
import { isDangerousSql } from '../utils/validation';
import { MySqlService } from './MySqlService';
import { PostgresService } from './PostgresService';
import { RedisService } from './RedisService';

export class DatabaseManager {
  private readonly mysql = new MySqlService();
  private readonly postgres = new PostgresService();
  private readonly redis = new RedisService();

  constructor(private readonly configService: ConfigService) {}

  list(): DatabaseConnectionConfig[] {
    return this.configService.listDatabases();
  }

  async create(input: Omit<DatabaseConnectionConfig, 'createdAt' | 'updatedAt'>): Promise<DatabaseConnectionConfig> {
    const now = new Date().toISOString();
    return this.configService.createDatabase({
      ...input,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now
    });
  }

  async update(id: string, patch: Partial<DatabaseConnectionConfig>): Promise<DatabaseConnectionConfig> {
    return this.configService.updateDatabase(id, patch);
  }

  async delete(id: string): Promise<void> {
    await this.configService.deleteDatabase(id);
  }

  async testConnection(id: string): Promise<void> {
    const config = this.configService.getDatabase(id);
    await this.byType(config.type).testConnection(config);
  }

  async listDatabases(id: string): Promise<string[]> {
    const config = this.configService.getDatabase(id);
    if (config.type === 'redis') {
      return [];
    }
    return this.byType(config.type).listDatabases(config);
  }

  async listTables(id: string): Promise<string[]> {
    const config = this.configService.getDatabase(id);
    if (config.type === 'redis') {
      return [];
    }
    return this.byType(config.type).listTables(config);
  }

  async describeTable(id: string, table: string): Promise<Record<string, unknown>[]> {
    const config = this.configService.getDatabase(id);
    if (config.type === 'redis') {
      return [];
    }
    return this.byType(config.type).describeTable(config, table);
  }

  async executeSql(id: string, sql: string, confirmDanger = false): Promise<SqlQueryResult> {
    if (!sql.trim()) {
      throw new Error('SQL 不能为空');
    }
    const config = this.configService.getDatabase(id);
    if (config.type === 'redis') {
      throw new Error('Redis 连接不支持 SQL');
    }
    if (isDangerousSql(sql) && !confirmDanger) {
      throw new Error('危险 SQL 需要二次确认');
    }
    return this.byType(config.type).executeSql(config, sql);
  }

  async redisSearchKeys(id: string, pattern: string): Promise<string[]> {
    const config = this.expectRedis(id);
    return this.redis.searchKeys(config, pattern || '*');
  }

  async redisGetKey(id: string, key: string): Promise<RedisKeyDetails> {
    const config = this.expectRedis(id);
    return this.redis.getKey(config, key);
  }

  async redisDeleteKey(id: string, key: string, confirmDanger: boolean): Promise<number> {
    const config = this.expectRedis(id);
    return this.redis.deleteKey(config, key, confirmDanger);
  }

  async redisExecuteCommand(id: string, command: string, confirmDanger: boolean): Promise<unknown> {
    const config = this.expectRedis(id);
    return this.redis.executeCommand(config, command, confirmDanger);
  }

  private byType(type: Exclude<DatabaseType, 'redis'>): MySqlService | PostgresService;
  private byType(type: DatabaseType): MySqlService | PostgresService | RedisService;
  private byType(type: DatabaseType): MySqlService | PostgresService | RedisService {
    if (type === 'mysql') {
      return this.mysql;
    }
    if (type === 'postgres') {
      return this.postgres;
    }
    return this.redis;
  }

  private expectRedis(id: string): DatabaseConnectionConfig {
    const config = this.configService.getDatabase(id);
    if (config.type !== 'redis') {
      throw new Error('该连接不是 Redis');
    }
    return config;
  }
}
