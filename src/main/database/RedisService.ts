import Redis from 'ioredis';
import type { DatabaseConnectionConfig, RedisKeyDetails } from '../../shared/types';
import { isDangerousRedisCommand, splitCommandLine } from '../utils/validation';

export class RedisService {
  async testConnection(config: DatabaseConnectionConfig): Promise<void> {
    const redis = this.connect(config);
    await redis.ping();
    redis.disconnect();
  }

  async searchKeys(config: DatabaseConnectionConfig, pattern: string, limit = 100): Promise<string[]> {
    const redis = this.connect(config);
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern || '*', 'COUNT', '100');
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0' && keys.length < limit);
    redis.disconnect();
    return keys.slice(0, limit);
  }

  async getKey(config: DatabaseConnectionConfig, key: string): Promise<RedisKeyDetails> {
    const redis = this.connect(config);
    const [type, ttl] = await Promise.all([redis.type(key), redis.ttl(key)]);
    let value: unknown;
    if (type === 'string') {
      value = await redis.get(key);
    } else if (type === 'hash') {
      value = await redis.hgetall(key);
    } else if (type === 'list') {
      value = await redis.lrange(key, 0, 99);
    } else if (type === 'set') {
      value = await redis.smembers(key);
    } else if (type === 'zset') {
      const values = await redis.zrange(key, 0, 99, 'WITHSCORES');
      value = values.reduce<Array<{ member: string; score: string }>>((items, item, index) => {
        if (index % 2 === 0) {
          items.push({ member: item, score: values[index + 1] ?? '' });
        }
        return items;
      }, []);
    } else {
      value = null;
    }
    redis.disconnect();
    return { key, type, ttl, value };
  }

  async deleteKey(config: DatabaseConnectionConfig, key: string, confirmDanger: boolean): Promise<number> {
    if (!confirmDanger) {
      throw new Error('删除 Redis key 需要二次确认');
    }
    const redis = this.connect(config);
    const count = await redis.del(key);
    redis.disconnect();
    return count;
  }

  async executeCommand(
    config: DatabaseConnectionConfig,
    command: string,
    confirmDanger: boolean
  ): Promise<unknown> {
    if (isDangerousRedisCommand(command) && !confirmDanger) {
      throw new Error('危险 Redis 命令需要二次确认');
    }
    if (/^\s*flushall\b/i.test(command) && !confirmDanger) {
      throw new Error('FLUSHALL 默认禁用，需要明确确认');
    }
    const parts = splitCommandLine(command);
    if (parts.length === 0) {
      throw new Error('Redis 命令不能为空');
    }
    const redis = this.connect(config);
    const result = await redis.call(parts[0], ...parts.slice(1));
    redis.disconnect();
    return result;
  }

  private connect(config: DatabaseConnectionConfig): Redis {
    return new Redis({
      host: config.host,
      port: config.port,
      username: config.username || undefined,
      password: config.password || undefined,
      db: config.redisDb ?? 0,
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 8000
    });
  }
}
