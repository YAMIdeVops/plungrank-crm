from datetime import date, datetime

from flask import Flask
from flask_cors import CORS
from flask.json.provider import DefaultJSONProvider

from .config import get_settings
from .core.errors import register_error_handlers
from .routes import register_routes


class AppJsonProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        return super().default(obj)


def create_app() -> Flask:
    app = Flask(__name__)
    app.json = AppJsonProvider(app)
    settings = get_settings()

    app.config["JSON_SORT_KEYS"] = False
    app.config["SECRET_KEY"] = settings.jwt_secret_key
    CORS(app, resources={r"/*": {"origins": "*"}})

    register_routes(app)
    register_error_handlers(app)
    return app
