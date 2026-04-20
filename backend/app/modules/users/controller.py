from flask import Blueprint, jsonify, request

from app.modules.users.service import UserService
from app.routes.auth import login_required

users_bp = Blueprint("users", __name__, url_prefix="/api/users")
service = UserService()


@users_bp.get("")
@login_required(required_profiles={"ADMIN"})
def list_users(current_user):
    return jsonify({"items": service.list_users(), "current_user": current_user}), 200


@users_bp.post("")
@login_required(required_profiles={"ADMIN"})
def create_user(current_user):
    return jsonify(service.create_user(request.get_json(force=True))), 201


@users_bp.patch("/<user_id>")
@login_required(required_profiles={"ADMIN"})
def update_user(current_user, user_id: str):
    return jsonify(service.update_user(user_id, request.get_json(force=True), current_user)), 200


@users_bp.delete("/<user_id>")
@login_required(required_profiles={"ADMIN"})
def delete_user(current_user, user_id: str):
    return jsonify(service.delete_user(user_id, current_user)), 200
