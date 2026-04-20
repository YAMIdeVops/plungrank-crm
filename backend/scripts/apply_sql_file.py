import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.services.database import DatabaseService


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python backend/scripts/apply_sql_file.py <arquivo.sql>")

    sql_path = Path(sys.argv[1]).resolve()
    if not sql_path.exists():
        raise SystemExit(f"Arquivo SQL não encontrado: {sql_path}")

    sql = sql_path.read_text(encoding="utf-8")
    db = DatabaseService()
    db.execute(sql)
    print(f"SQL aplicado com sucesso: {sql_path}")


if __name__ == "__main__":
    main()
