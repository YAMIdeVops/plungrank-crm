from contextlib import contextmanager

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.config import get_settings
from app.core.errors import AppError


class DatabaseService:
    _pool: ConnectionPool | None = None

    @property
    def database_url(self) -> str:
        database_url = get_settings().database_url
        if not database_url:
            raise AppError("DATABASE_URL nao configurado.", 500)
        return database_url

    @classmethod
    def get_pool(cls) -> ConnectionPool:
        if cls._pool is None:
            settings = get_settings()
            if not settings.database_url:
                raise AppError("DATABASE_URL nao configurado.", 500)
            try:
                cls._pool = ConnectionPool(
                    conninfo=settings.database_url,
                    min_size=settings.database_pool_min_size,
                    max_size=settings.database_pool_max_size,
                    timeout=settings.database_pool_timeout,
                    kwargs={"row_factory": dict_row},
                    open=True,
                )
            except AppError:
                raise
            except Exception as exc:
                raise AppError(f"Falha na conexao com o banco: {exc}", 500) from exc
        return cls._pool

    @contextmanager
    def connection(self):
        try:
            pool = self.get_pool()
            with pool.connection() as conn:
                yield conn
        except AppError:
            raise
        except Exception as exc:
            raise AppError(f"Falha na conexao com o banco: {exc}", 500) from exc

    @classmethod
    def close_pool(cls) -> None:
        if cls._pool is not None:
            cls._pool.close()
            cls._pool = None

    def fetch_all(self, sql: str, params: list | tuple | None = None) -> list[dict]:
        with self.connection() as conn, conn.cursor() as cur:
            cur.execute(sql, params or [])
            return list(cur.fetchall())

    def fetch_one(
        self,
        sql: str,
        params: list | tuple | None = None,
        not_found_message: str = "Registro nao encontrado.",
    ) -> dict:
        with self.connection() as conn, conn.cursor() as cur:
            cur.execute(sql, params or [])
            row = cur.fetchone()
            if not row:
                raise AppError(not_found_message, 404)
            return row

    def fetch_optional(self, sql: str, params: list | tuple | None = None) -> dict | None:
        with self.connection() as conn, conn.cursor() as cur:
            cur.execute(sql, params or [])
            return cur.fetchone()

    def execute(self, sql: str, params: list | tuple | None = None) -> None:
        with self.connection() as conn, conn.cursor() as cur:
            cur.execute(sql, params or [])

    def scalar(self, sql: str, params: list | tuple | None = None):
        with self.connection() as conn, conn.cursor() as cur:
            cur.execute(sql, params or [])
            row = cur.fetchone()
            return None if not row else next(iter(row.values()))
