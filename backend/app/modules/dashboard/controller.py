from flask import Blueprint, jsonify, request

from app.modules.dashboard.service import DashboardService
from app.routes.auth import login_required

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")
service = DashboardService()


@dashboard_bp.get("/metrics")
@login_required()
def get_metrics(current_user):
    return jsonify(service.get_metrics(request.args.to_dict())), 200

