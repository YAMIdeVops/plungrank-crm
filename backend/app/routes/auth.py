from functools import wraps

from flask import request

from app.core.errors import AppError
from app.core.security import decode_access_token
from app.modules.users.service import UserService


def login_required(required_profiles: set[str] | None = None):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                raise AppError("Token de acesso não informado.", 401)
            token = auth_header.removeprefix("Bearer ").strip()
            try:
                payload = decode_access_token(token)
            except Exception as exc:
                raise AppError("Token inválido ou expirado.", 401) from exc

            user_service = UserService()
            user = user_service.get_by_id(payload["sub"])
            serialized = user_service.serialize_user(user)
            if serialized["status"] != "ACTIVE":
                raise AppError("Usuário inativo.", 403)
            if required_profiles and serialized["perfil"] not in required_profiles:
                raise AppError("Acesso negado para este perfil.", 403)
            return view(serialized, *args, **kwargs)

        return wrapped

    return decorator

