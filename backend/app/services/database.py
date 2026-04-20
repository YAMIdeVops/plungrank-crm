from contextlib import contextmanager

from psycopg import connect
from psycopg.rows import dict_row

from app.config import get_settings
from app.core.errors import AppError


class DatabaseService:
    @property
    def database_url(self) -> str:
        database_url = get_settings().database_url
        if not database_url:
            raise AppError("DATABASE_URL não configurado.", 500)
        return database_url

    @contextmanager
    def connection(self):
        try:
            conn = connect(self.database_url, row_factory=dict_row)
        except AppError:
            raise
        except Exception as exc:
            raise AppError(f"Falha na conexão com o banco: {exc}", 500) from exc

        try:
            with conn:
                yield conn
        finally:
            conn.close()

    def fetch_all(self, sql: str, params: list | tuple | None = None) -> list[dict]:
        with self.connection() as conn, conn.cursor() as cur:
            cur.execute(sql, params or [])
            return list(cur.fetchall())

    def fetch_one(
        self,
        sql: str,
        params: list | tuple | None = None,
        not_found_message: str = "Registro não encontrado.",
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
