from app.core.errors import AppError
from app.services.database import DatabaseService


class BaseService:
    table_name = ""

    def __init__(self):
        self.db = DatabaseService()

    def get_one(self, field: str, value) -> dict:
        return self.db.fetch_one(
            f"select * from {self.table_name} where {field} = %s limit 1",
            [value],
            not_found_message=f"Registro não encontrado em {self.table_name}.",
        )

    def update_by_id(self, id_field: str, id_value, payload: dict) -> dict:
        if not payload:
            raise AppError("Nenhuma alteração informada.")

        columns = list(payload.keys())
        assignments = ", ".join(f"{column} = %s" for column in columns)
        params = [payload[column] for column in columns] + [id_value]
        return self.db.fetch_one(
            f"update {self.table_name} set {assignments} where {id_field} = %s returning *",
            params,
            not_found_message=f"Registro não encontrado em {self.table_name}.",
        )

