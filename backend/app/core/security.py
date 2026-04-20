from datetime import datetime, timedelta, timezone
import hashlib
import hmac

import jwt
from werkzeug.security import check_password_hash, generate_password_hash

from app.config import get_settings


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return check_password_hash(password_hash, password)


def create_access_token(user: dict) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "perfil": user["perfil"],
        "status": user["status"],
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=settings.jwt_expires_in_hours)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])


def constant_time_equal(left: str, right: str) -> bool:
    return hmac.compare_digest(hashlib.sha256(left.encode()).hexdigest(), hashlib.sha256(right.encode()).hexdigest())

