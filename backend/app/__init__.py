from flask import Flask
from flask_cors import CORS

from .config import get_settings
from .core.errors import register_error_handlers
from .routes import register_routes


def create_app() -> Flask:
    app = Flask(__name__)
    settings = get_settings()

    app.config["JSON_SORT_KEYS"] = False
    app.config["SECRET_KEY"] = settings.jwt_secret_key
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    register_routes(app)
    register_error_handlers(app)
    return app

