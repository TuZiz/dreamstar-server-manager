import mysql, { type RowDataPacket } from 'mysql2/promise';
import type { DatabaseConnectionConfig, SqlQueryResult } from '../../shared/types';
import { getSqlWarning } from '../utils/validation';

export class MySqlService {
  async testConnection(config: DatabaseConnectionConfig): Promise<void> {
    const connection = await this.connect(config);
    await connection.ping();
    await connection.end();
  }

  async listDatabases(config: DatabaseConnectionConfig): Promise<string[]> {
    const connection = await this.connect(config);
    const [rows] = await connection.query<RowDataPacket[]>('SHOW DATABASES');
    await connection.end();
    return rows.map((row) => String(row.Database));
  }

  async listTables(config: DatabaseConnectionConfig): Promise<string[]> {
    const connection = await this.connect(config);
    const [rows] = await connection.query<RowDataPacket[]>('SHOW TABLES');
    await connection.end();
    return rows.map((row) => String(Object.values(row)[0]));
  }

  async describeTable(config: DatabaseConnectionConfig, table: string): Promise<Record<string, unknown>[]> {
    const connection = await this.connect(config);
    const [rows] = await connection.query(`DESCRIBE \`${table.replace(/`/g, '``')}\``);
    await connection.end();
    return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
  }

  async executeSql(config: DatabaseConnectionConfig, sql: string): Promise<SqlQueryResult> {
    const connection = await this.connect(config);
    const started = performance.now();
    const [rows, fields] = await connection.query(sql);
    await connection.end();
    const elapsedMs = Math.round(performance.now() - started);

    if (Array.isArray(rows)) {
      const records = rows as Record<string, unknown>[];
      const columns = fields?.map((field) => field.name) ?? Object.keys(records[0] ?? {});
      return {
        columns,
        rows: records,
        rowCount: records.length,
        elapsedMs,
        warning: getSqlWarning(sql)
      };
    }

    const result = rows as { affectedRows?: number };
    return {
      columns: [],
      rows: [],
      rowCount: result.affectedRows ?? 0,
      elapsedMs,
      warning: getSqlWarning(sql)
    };
  }

  private connect(config: DatabaseConnectionConfig): Promise<mysql.Connection> {
    return mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      ssl: config.ssl ? {} : undefined,
      connectTimeout: 8000
    });
  }
}
