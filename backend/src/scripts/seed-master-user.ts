import { getSettings } from "../config";
import { hashPassword } from "../core/security";
import { DatabaseService } from "../services/database";

async function main() {
  const settings = getSettings();
  if (!settings.masterAdminEmail || !settings.masterAdminPassword) {
    throw new Error("MASTER_ADMIN_EMAIL e MASTER_ADMIN_PASSWORD devem estar configurados.");
  }

  const db = new DatabaseService();
  const payload = {
    nome_usuario: "Administrador Master",
    email: settings.masterAdminEmail.trim().toLowerCase(),
    senha_hash: hashPassword(settings.masterAdminPassword),
    perfil: "ADMIN",
    status_usuario: "ATIVO",
  };

  const existing = await db.fetchOptional<Record<string, unknown>>(
    "select id_usuario from usuarios where email = %s limit 1",
    [payload.email],
  );

  if (existing) {
    await db.execute(
      `
      update usuarios
      set nome_usuario = %s, email = %s, senha_hash = %s, perfil = %s, status_usuario = %s
      where id_usuario = %s
      `,
      [
        payload.nome_usuario,
        payload.email,
        payload.senha_hash,
        payload.perfil,
        payload.status_usuario,
        existing.id_usuario,
      ],
    );
    console.log("Administrador master atualizado com sucesso.");
    return;
  }

  await db.execute(
    `
    insert into usuarios (nome_usuario, email, senha_hash, perfil, status_usuario)
    values (%s, %s, %s, %s, %s)
    `,
    [
      payload.nome_usuario,
      payload.email,
      payload.senha_hash,
      payload.perfil,
      payload.status_usuario,
    ],
  );
  console.log("Administrador master criado com sucesso.");
}

void main();
