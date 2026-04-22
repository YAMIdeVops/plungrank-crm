import { getSettings } from "../../config";
import { USER_PROFILES, USER_STATUS } from "../../core/constants";
import { AppError } from "../../core/errors";
import { normalizeEmail, normalizeText } from "../../core/formatters";
import { hashPassword } from "../../core/security";
import {
  requireFields,
  validateEmail,
  validateEnum,
  validatePassword,
} from "../../core/validators";
import { BaseService } from "../../services/base-service";
import type { SerializedUser, UserRecord } from "../../types";

const PROFILE_TO_DB: Record<string, string> = {
  ADMIN: "ADMIN",
  PADRAO: "PADRAO",
};

const STATUS_TO_DB: Record<string, string> = {
  ACTIVE: "ATIVO",
  INACTIVE: "INATIVO",
  ATIVO: "ATIVO",
  INATIVO: "INATIVO",
};

const PROFILE_FROM_DB: Record<string, string> = {
  ADMIN: "ADMIN",
  PADRAO: "PADRAO",
};

const STATUS_FROM_DB: Record<string, string> = {
  ATIVO: "ACTIVE",
  INATIVO: "INACTIVE",
};

export class UserService extends BaseService {
  protected tableName = "usuarios";

  async listUsers() {
    const result = await this.db.fetchAll<Record<string, unknown>>(
      "select * from usuarios order by criado_em desc",
    );
    return result.map((item) => this.serializeUser(this.normalizeDbUser(item)));
  }

  async getById(userId: string): Promise<UserRecord> {
    const localMaster = this.getLocalMasterUser();
    if (localMaster && userId === localMaster.id) {
      const persisted = await this.db.fetchOptional<Record<string, unknown>>(
        "select * from usuarios where email = %s limit 1",
        [localMaster.email],
      );
      if (persisted) {
        return this.normalizeDbUser(persisted);
      }
      return localMaster;
    }

    const user = await this.db.fetchOne<Record<string, unknown>>(
      "select * from usuarios where id_usuario = %s limit 1",
      [userId],
      "Usuário não encontrado.",
    );
    return this.normalizeDbUser(user);
  }

  async getByEmail(email: string): Promise<UserRecord> {
    const user = await this.db.fetchOptional<Record<string, unknown>>(
      "select * from usuarios where email = %s limit 1",
      [email],
    );
    if (user) {
      return this.normalizeDbUser(user);
    }
    throw new AppError("Usuário não encontrado.", 404);
  }

  async createUser(payload: Record<string, unknown>) {
    return this.db.transaction(async () => {
      requireFields(payload, ["nome", "email", "password", "perfil", "status"]);
      const email = normalizeEmail(String(payload.email));
      validateEmail(email);
      const password = normalizeText(String(payload.password));
      validatePassword(password);
      let perfil = this.normalizeProfile(String(payload.perfil));
      let status = normalizeText(String(payload.status)).toUpperCase();
      perfil = validateEnum(perfil, USER_PROFILES, "perfil");
      status = validateEnum(status, USER_STATUS, "status");
      await this.ensureEmailAvailable(email);

      const inserted = await this.db.fetchOne<Record<string, unknown>>(
        `
        insert into usuarios (nome_usuario, email, senha_hash, perfil, status_usuario)
        values (%s, %s, %s, %s, %s)
        returning *
        `,
        [
          normalizeText(payload.nome),
          email,
          hashPassword(password),
          PROFILE_TO_DB[perfil],
          STATUS_TO_DB[status],
        ],
      );

      return this.serializeUser(this.normalizeDbUser(inserted));
    });
  }

  async updateUser(
    userId: string,
    payload: Record<string, unknown>,
    currentUser: SerializedUser,
  ) {
    return this.db.transaction(async () => {
      const user = await this.getById(userId);
      this.ensureCanManageTarget(currentUser, user);
      const updateData: Record<string, unknown> = {};

      if ("nome" in payload) {
        updateData.nome_usuario = normalizeText(payload.nome);
      }

      if ("email" in payload) {
        const email = normalizeEmail(String(payload.email));
        validateEmail(email);
        if (email !== user.email) {
          await this.ensureEmailAvailable(email);
        }
        updateData.email = email;
      }

      if ("perfil" in payload) {
        let perfil = this.normalizeProfile(String(payload.perfil));
        perfil = validateEnum(perfil, USER_PROFILES, "perfil");
        updateData.perfil = PROFILE_TO_DB[perfil];
      }

      if ("status" in payload) {
        let status = normalizeText(String(payload.status)).toUpperCase();
        status = validateEnum(status, USER_STATUS, "status");
        updateData.status_usuario = STATUS_TO_DB[status];
      }

      if ("password" in payload) {
        const password = normalizeText(String(payload.password));
        validatePassword(password);
        updateData.senha_hash = hashPassword(password);
      }

      const updated = await this.updateById("id_usuario", user.id, updateData);
      return this.serializeUser(this.normalizeDbUser(updated));
    });
  }

  async deleteUser(userId: string, currentUser: SerializedUser) {
    return this.db.transaction(async () => {
      const user = await this.getById(userId);
      this.ensureCanManageTarget(currentUser, user);

      if (user.id === currentUser.id) {
        throw new AppError("Você não pode excluir o próprio usuário.");
      }

      await this.db.execute("delete from usuarios where id_usuario = %s", [user.id]);
      return { message: "Usuário excluído com sucesso." };
    });
  }

  serializeUser(user: UserRecord): SerializedUser {
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
      status: user.status,
      criado_em: user.criado_em ?? null,
      atualizado_em: user.atualizado_em ?? null,
    };
  }

  getLocalMasterUser(): UserRecord | null {
    const settings = getSettings();
    if (!settings.masterAdminEmail || !settings.masterAdminPassword) {
      return null;
    }

    return {
      id: "local-master",
      nome: "Administrador Local",
      email: settings.masterAdminEmail.trim().toLowerCase(),
      senha_hash: "",
      perfil: "ADMIN",
      status: "ACTIVE",
      criado_em: null,
      atualizado_em: null,
    };
  }

  getLocalMasterPassword() {
    return getSettings().masterAdminPassword || "";
  }

  private async ensureEmailAvailable(email: string) {
    if (await this.db.exists("select 1 from usuarios where email = %s limit 1", [email])) {
      throw new AppError("E-mail já está em uso.");
    }
  }

  private ensureCanManageTarget(currentUser: SerializedUser, _targetUser: UserRecord) {
    if (currentUser.perfil !== "ADMIN") {
      throw new AppError("Acesso negado para este perfil.", 403);
    }
  }

  private normalizeDbUser(user: Record<string, unknown>): UserRecord {
    return {
      id: String(user.id_usuario),
      nome: String(user.nome_usuario),
      email: String(user.email),
      senha_hash: String(user.senha_hash),
      perfil: PROFILE_FROM_DB[String(user.perfil)] ?? String(user.perfil),
      status: STATUS_FROM_DB[String(user.status_usuario)] ?? String(user.status_usuario),
      criado_em: (user.criado_em as string | null | undefined) ?? null,
      atualizado_em: (user.atualizado_em as string | null | undefined) ?? null,
    };
  }

  private normalizeProfile(value: string) {
    const normalized = normalizeText(value).toUpperCase();
    if (normalized === "USER") {
      return "PADRAO";
    }
    if (normalized === "MASTER_ADMIN") {
      return "ADMIN";
    }
    return normalized;
  }
}
