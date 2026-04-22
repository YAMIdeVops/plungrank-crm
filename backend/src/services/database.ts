import { AsyncLocalStorage } from "node:async_hooks";

import { Pool, PoolClient, QueryResult, QueryResultRow, types } from "pg";

import { getSettings } from "../config";
import { AppError } from "../core/errors";

types.setTypeParser(1082, (value: string) => value);
types.setTypeParser(1114, (value: string) => value);
types.setTypeParser(1184, (value: string) => value);

function toPgPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/%s/g, () => {
    index += 1;
    return `$${index}`;
  });
}

export class DatabaseService {
  private static pool: Pool | null = null;
  private static storage = new AsyncLocalStorage<PoolClient>();

  static getPool() {
    if (!DatabaseService.pool) {
      const settings = getSettings();
      if (!settings.databaseUrl) {
        throw new AppError("DATABASE_URL nao configurado.", 500);
      }

      try {
        DatabaseService.pool = new Pool({
          connectionString: settings.databaseUrl,
          min: settings.databasePoolMinSize,
          max: settings.databasePoolMaxSize,
          idleTimeoutMillis: settings.databasePoolMaxIdle * 1000,
          connectionTimeoutMillis: settings.databasePoolTimeout * 1000,
          maxLifetimeSeconds: settings.databasePoolMaxLifetime,
        });
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        throw new AppError(`Falha na conexao com o banco: ${details}`, 500);
      }
    }

    return DatabaseService.pool;
  }

  private async runQuery<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const client = DatabaseService.storage.getStore();
    const executor = client ?? DatabaseService.getPool();
    try {
      return await executor.query<T>(toPgPlaceholders(sql), params);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new AppError(`Falha na conexao com o banco: ${details}`, 500);
    }
  }

  async transaction<T>(handler: () => Promise<T>): Promise<T> {
    const activeClient = DatabaseService.storage.getStore();
    if (activeClient) {
      return handler();
    }

    const client = await DatabaseService.getPool().connect();
    try {
      await client.query("begin");
      const result = await DatabaseService.storage.run(client, handler);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async fetchAll<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.runQuery<T>(sql, params);
    return result.rows;
  }

  async fetchOne<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: unknown[] = [],
    notFoundMessage = "Registro nao encontrado.",
  ): Promise<T> {
    const result = await this.runQuery<T>(sql, params);
    if (!result.rows[0]) {
      throw new AppError(notFoundMessage, 404);
    }
    return result.rows[0];
  }

  async fetchOptional<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
    const result = await this.runQuery<T>(sql, params);
    return result.rows[0] ?? null;
  }

  async execute(sql: string, params: unknown[] = []) {
    await this.runQuery(sql, params);
  }

  async scalar<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
    const row = await this.fetchOptional<Record<string, T>>(sql, params);
    if (!row) {
      return null;
    }
    return row[Object.keys(row)[0]];
  }

  async exists(sql: string, params: unknown[] = []): Promise<boolean> {
    return Boolean(await this.fetchOptional(sql, params));
  }
}
