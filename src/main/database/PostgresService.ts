import { Client } from 'pg';
import type { DatabaseConnectionConfig, SqlQueryResult } from '../../shared/types';
import { getSqlWarning } from '../utils/validation';

export class PostgresService {
  async testConnection(config: DatabaseConnectionConfig): Promise<void> {
    const client = await this.connect(config);
    await client.query('SELECT 1');
    await client.end();
  }

  async listDatabases(config: DatabaseConnectionConfig): Promise<string[]> {
    const client = await this.connect(config);
    const result = await client.query<{ datname: string }>(
      "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname"
    );
    await client.end();
    return result.rows.map((row) => row.datname);
  }

  async listTables(config: DatabaseConnectionConfig): Promise<string[]> {
    const client = await this.connect(config);
    const result = await client.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    await client.end();
    return result.rows.map((row) => row.table_name);
  }

  async describeTable(config: DatabaseConnectionConfig, table: string): Promise<Record<string, unknown>[]> {
    const client = await this.connect(config);
    const result = await client.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table]
    );
    await client.end();
    return result.rows;
  }

  async executeSql(config: DatabaseConnectionConfig, sql: string): Promise<SqlQueryResult> {
    const client = await this.connect(config);
    const started = performance.now();
    const result = await client.query(sql);
    await client.end();
    const elapsedMs = Math.round(performance.now() - started);
    return {
      columns: result.fields.map((field) => field.name),
      rows: result.rows,
      rowCount: result.rowCount ?? result.rows.length,
      elapsedMs,
      warning: getSqlWarning(sql)
    };
  }

  private async connect(config: DatabaseConnectionConfig): Promise<Client> {
    const client = new Client({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 8000
    });
    await client.connect();
    return client;
  }
}
