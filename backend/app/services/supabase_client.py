from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings
from app.core.errors import AppError


@lru_cache(maxsize=1)
def get_supabase_admin_client() -> Client:
    settings = get_settings()
    supabase_key = settings.supabase_service_role_key or settings.supabase_key
    if not settings.supabase_url or not supabase_key:
        raise AppError("Variáveis do Supabase não configuradas.", 500)
    return create_client(settings.supabase_url, supabase_key)
