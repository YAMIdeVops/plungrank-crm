from dataclasses import dataclass
from functools import lru_cache
import os

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    database_url: str
    database_pool_min_size: int
    database_pool_max_size: int
    database_pool_timeout: int
    supabase_url: str
    supabase_key: str
    supabase_service_role_key: str
    jwt_secret_key: str
    jwt_expires_in_hours: int
    master_admin_email: str
    master_admin_password: str


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv("DATABASE_URL", ""),
        database_pool_min_size=int(os.getenv("DATABASE_POOL_MIN_SIZE", "1")),
        database_pool_max_size=int(os.getenv("DATABASE_POOL_MAX_SIZE", "10")),
        database_pool_timeout=int(os.getenv("DATABASE_POOL_TIMEOUT", "30")),
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_key=os.getenv("SUPABASE_KEY", ""),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        jwt_secret_key=os.getenv("JWT_SECRET_KEY", "change-me"),
        jwt_expires_in_hours=int(os.getenv("JWT_EXPIRES_IN_HOURS", "12")),
        master_admin_email=os.getenv("MASTER_ADMIN_EMAIL", ""),
        master_admin_password=os.getenv("MASTER_ADMIN_PASSWORD", ""),
    )
