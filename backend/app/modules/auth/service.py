from app.core.errors import AppError
from app.core.formatters import normalize_email, normalize_text
from app.core.security import create_access_token, verify_password
from app.core.validators import require_fields
from app.modules.users.service import UserService


class AuthService:
    def __init__(self):
        self.user_service = UserService()

    def login(self, payload: dict) -> dict:
        require_fields(payload, ["email", "password"])
        email = normalize_email(payload["email"])
        password = normalize_text(payload["password"])

        try:
            user = self.user_service.get_by_email(email)
        except AppError as exc:
            if exc.status_code == 404:
                try:
                    user = self._try_local_master_login(email)
                except AppError as local_exc:
                    if local_exc.status_code == 404:
                        raise AppError("Credenciais inválidas.", 401) from local_exc
                    raise
            else:
                raise

        if user["status"] != "ACTIVE":
            raise AppError("Credenciais inválidas.", 401)
        if not verify_password(password, user["senha_hash"]):
            raise AppError("Credenciais inválidas.", 401)
        token = create_access_token(user)
        return {"token": token, "user": self.user_service.serialize_user(user)}

    def _try_local_master_login(self, email: str) -> dict:
        local_master = self.user_service.get_local_master_user()
        if local_master and local_master["email"] == email:
            return local_master
        raise AppError("Usuário não encontrado.", 404)
