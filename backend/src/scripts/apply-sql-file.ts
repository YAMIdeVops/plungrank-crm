import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { DatabaseService } from "../services/database";

async function main() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    throw new Error("Uso: npm run apply:sql -- <arquivo.sql>");
  }

  const sqlPath = resolve(sqlFile);
  const sql = await readFile(sqlPath, "utf8");
  const db = new DatabaseService();
  await db.execute(sql);
  console.log(`SQL aplicado com sucesso: ${sqlPath}`);
}

void main();
