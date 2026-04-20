from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.config import get_settings
from app.core.security import hash_password
from app.services.database import DatabaseService


def main() -> None:
    settings = get_settings()
    if not settings.master_admin_email or not settings.master_admin_password:
        raise RuntimeError("MASTER_ADMIN_EMAIL e MASTER_ADMIN_PASSWORD devem estar configurados.")

    db = DatabaseService()
    payload = {
        "nome_usuario": "Administrador Master",
        "email": settings.master_admin_email.strip().lower(),
        "senha_hash": hash_password(settings.master_admin_password),
        "perfil": "ADMIN",
        "status_usuario": "ATIVO",
    }

    existing = db.fetch_optional("select id_usuario from usuarios where email = %s limit 1", [payload["email"]])

    if existing:
        db.execute(
            """
            update usuarios
            set nome_usuario = %s, email = %s, senha_hash = %s, perfil = %s, status_usuario = %s
            where id_usuario = %s
            """,
            [
                payload["nome_usuario"],
                payload["email"],
                payload["senha_hash"],
                payload["perfil"],
                payload["status_usuario"],
                existing["id_usuario"],
            ],
        )
        print("Administrador master atualizado com sucesso.")
        return

    db.execute(
        """
        insert into usuarios (nome_usuario, email, senha_hash, perfil, status_usuario)
        values (%s, %s, %s, %s, %s)
        """,
        [
            payload["nome_usuario"],
            payload["email"],
            payload["senha_hash"],
            payload["perfil"],
            payload["status_usuario"],
        ],
    )
    print("Administrador master criado com sucesso.")


if __name__ == "__main__":
    main()
