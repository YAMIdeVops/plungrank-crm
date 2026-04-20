from flask import Blueprint, jsonify, request

from app.modules.auth.service import AuthService
from app.routes.auth import login_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
service = AuthService()


@auth_bp.post("/login")
def login():
    return jsonify(service.login(request.get_json(force=True))), 200


@auth_bp.get("/me")
@login_required()
def me(current_user):
    return jsonify({"user": current_user}), 200

