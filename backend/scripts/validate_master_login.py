from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.config import get_settings
from app.modules.auth.service import AuthService


def main() -> None:
    settings = get_settings()
    service = AuthService()
    response = service.login(
        {
            "email": settings.master_admin_email,
            "password": settings.master_admin_password,
        }
    )
    user = response["user"]
    print(f"Login validado para {user['email']} com perfil {user['perfil']}.")


if __name__ == "__main__":
    main()
