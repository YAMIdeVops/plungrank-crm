import { AppError } from "../core/errors";
import { DatabaseService } from "./database";

export class BaseService {
  protected db: DatabaseService;
  protected tableName = "";

  constructor() {
    this.db = new DatabaseService();
  }

  protected async getOne(field: string, value: unknown) {
    return this.db.fetchOne(
      `select * from ${this.tableName} where ${field} = %s limit 1`,
      [value],
      `Registro não encontrado em ${this.tableName}.`,
    );
  }

  protected async updateById(idField: string, idValue: unknown, payload: Record<string, unknown>) {
    if (!Object.keys(payload).length) {
      throw new AppError("Nenhuma alteração informada.");
    }

    const columns = Object.keys(payload);
    const assignments = columns.map((column) => `${column} = %s`).join(", ");
    const params = [...columns.map((column) => payload[column]), idValue];
    return this.db.fetchOne(
      `update ${this.tableName} set ${assignments} where ${idField} = %s returning *`,
      params,
      `Registro não encontrado em ${this.tableName}.`,
    );
  }
}
