from app.config import get_settings
from app.core.constants import USER_PROFILES, USER_STATUS
from app.core.errors import AppError
from app.core.formatters import normalize_email, normalize_text
from app.core.security import hash_password
from app.core.validators import require_fields, validate_email, validate_enum, validate_password
from app.services.base_service import BaseService


PROFILE_TO_DB = {
    "ADMIN": "ADMIN",
    "PADRAO": "PADRAO",
}

STATUS_TO_DB = {
    "ACTIVE": "ATIVO",
    "INACTIVE": "INATIVO",
    "ATIVO": "ATIVO",
    "INATIVO": "INATIVO",
}

PROFILE_FROM_DB = {
    "ADMIN": "ADMIN",
    "PADRAO": "PADRAO",
}

STATUS_FROM_DB = {
    "ATIVO": "ACTIVE",
    "INATIVO": "INACTIVE",
}


class UserService(BaseService):
    table_name = "usuarios"

    def list_users(self) -> list[dict]:
        result = self.db.fetch_all("select * from usuarios order by criado_em desc")
        return [self.serialize_user(self._normalize_db_user(item)) for item in result]

    def get_by_id(self, user_id: str) -> dict:
        local_master = self.get_local_master_user()
        if local_master and user_id == local_master["id"]:
            persisted = self.db.fetch_optional(
                "select * from usuarios where email = %s limit 1",
                [local_master["email"]],
            )
            if persisted:
                return self._normalize_db_user(persisted)
            return local_master

        user = self.db.fetch_one(
            "select * from usuarios where id_usuario = %s limit 1",
            [user_id],
            not_found_message="UsuÃ¡rio nÃ£o encontrado.",
        )
        return self._normalize_db_user(user)

    def get_by_email(self, email: str) -> dict:
        local_master = self.get_local_master_user()
        user = self.db.fetch_optional(
            "select * from usuarios where email = %s limit 1",
            [email],
        )
        if user:
            return self._normalize_db_user(user)
        if local_master and email == local_master["email"]:
            return local_master
        raise AppError("UsuÃ¡rio nÃ£o encontrado.", 404)

    def create_user(self, payload: dict) -> dict:
        require_fields(payload, ["nome", "email", "password", "perfil", "status"])
        email = normalize_email(payload["email"])
        validate_email(email)
        password = normalize_text(payload["password"])
        validate_password(password)
        perfil = self._normalize_profile(payload["perfil"])
        status = normalize_text(payload["status"]).upper()
        validate_enum(perfil, USER_PROFILES, "perfil")
        validate_enum(status, USER_STATUS, "status")
        self._ensure_email_available(email)
        inserted = self.db.fetch_one(
            """
            insert into usuarios (nome_usuario, email, senha_hash, perfil, status_usuario)
            values (%s, %s, %s, %s, %s)
            returning *
            """,
            [
                normalize_text(payload["nome"]),
                email,
                hash_password(password),
                PROFILE_TO_DB[perfil],
                STATUS_TO_DB[status],
            ],
        )
        return self.serialize_user(self._normalize_db_user(inserted))

    def update_user(self, user_id: str, payload: dict, current_user: dict) -> dict:
        user = self.get_by_id(user_id)
        self._ensure_can_manage_target(current_user, user)
        update_data = {}

        if "nome" in payload:
            update_data["nome_usuario"] = normalize_text(payload["nome"])
        if "email" in payload:
            email = normalize_email(payload["email"])
            validate_email(email)
            if email != user["email"]:
                self._ensure_email_available(email)
            update_data["email"] = email
        if "perfil" in payload:
            perfil = self._normalize_profile(payload["perfil"])
            validate_enum(perfil, USER_PROFILES, "perfil")
            update_data["perfil"] = PROFILE_TO_DB[perfil]
        if "status" in payload:
            status = normalize_text(payload["status"]).upper()
            validate_enum(status, USER_STATUS, "status")
            update_data["status_usuario"] = STATUS_TO_DB[status]
        if "password" in payload:
            password = normalize_text(payload["password"])
            validate_password(password)
            update_data["senha_hash"] = hash_password(password)

        updated = self.update_by_id("id_usuario", user["id"], update_data)
        return self.serialize_user(self._normalize_db_user(updated))

    def delete_user(self, user_id: str, current_user: dict) -> dict:
        user = self.get_by_id(user_id)
        self._ensure_can_manage_target(current_user, user)
        if user["id"] == current_user["id"]:
            raise AppError("Voce nao pode excluir o proprio usuario.")
        self.db.execute("delete from usuarios where id_usuario = %s", [user["id"]])
        return {"message": "Usuário excluído com sucesso."}

    def serialize_user(self, user: dict) -> dict:
        return {
            "id": user["id"],
            "nome": user["nome"],
            "email": user["email"],
            "perfil": user["perfil"],
            "status": user["status"],
            "criado_em": user.get("criado_em"),
            "atualizado_em": user.get("atualizado_em"),
        }

    def get_local_master_user(self) -> dict | None:
        settings = get_settings()
        if not settings.master_admin_email or not settings.master_admin_password:
            return None
        return {
            "id": "local-master",
            "nome": "Administrador Local",
            "email": settings.master_admin_email.strip().lower(),
            "senha_hash": hash_password(normalize_text(settings.master_admin_password)),
            "perfil": "ADMIN",
            "status": "ACTIVE",
            "criado_em": None,
            "atualizado_em": None,
        }

    def _ensure_email_available(self, email: str) -> None:
        result = self.db.fetch_optional("select id_usuario from usuarios where email = %s limit 1", [email])
        if result:
            raise AppError("E-mail jÃ¡ estÃ¡ em uso.")

    def _ensure_can_manage_target(self, current_user: dict, target_user: dict) -> None:
        if current_user["perfil"] != "ADMIN":
            raise AppError("Acesso negado para este perfil.", 403)

    def _normalize_db_user(self, user: dict) -> dict:
        return {
            "id": str(user["id_usuario"]),
            "nome": user["nome_usuario"],
            "email": user["email"],
            "senha_hash": user["senha_hash"],
            "perfil": PROFILE_FROM_DB.get(user["perfil"], user["perfil"]),
            "status": STATUS_FROM_DB.get(user["status_usuario"], user["status_usuario"]),
            "criado_em": user.get("criado_em"),
            "atualizado_em": user.get("atualizado_em"),
        }

    def _normalize_profile(self, value: str) -> str:
        normalized = normalize_text(value).upper()
        if normalized == "USER":
            return "PADRAO"
        if normalized == "MASTER_ADMIN":
            return "ADMIN"
        return normalized
