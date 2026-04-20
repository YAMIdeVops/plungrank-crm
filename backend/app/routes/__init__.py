from app.modules.attempts.controller import attempts_bp
from app.modules.auth.controller import auth_bp
from app.modules.dashboard.controller import dashboard_bp
from app.modules.leads.controller import leads_bp
from app.modules.meetings.controller import meetings_bp
from app.modules.sales.controller import sales_bp
from app.modules.services_catalog.controller import services_bp
from app.modules.users.controller import users_bp


def register_routes(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(leads_bp)
    app.register_blueprint(attempts_bp)
    app.register_blueprint(meetings_bp)
    app.register_blueprint(sales_bp)
    app.register_blueprint(services_bp)
    app.register_blueprint(dashboard_bp)

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

