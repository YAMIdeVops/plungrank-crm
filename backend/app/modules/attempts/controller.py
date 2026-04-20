from flask import Blueprint, jsonify, request

from app.modules.attempts.service import AttemptService
from app.routes.auth import login_required

attempts_bp = Blueprint("attempts", __name__, url_prefix="/api/attempts")
service = AttemptService()


@attempts_bp.get("")
@login_required()
def list_attempts(current_user):
    return jsonify({"items": service.list_attempts(request.args.to_dict())}), 200


@attempts_bp.post("")
@login_required()
def create_attempt(current_user):
    return jsonify(service.create_attempt(request.get_json(force=True), current_user["id"])), 201


@attempts_bp.patch("/<int:attempt_id>")
@login_required(required_profiles={"ADMIN"})
def update_attempt(current_user, attempt_id: int):
    return jsonify(service.update_attempt(attempt_id, request.get_json(force=True))), 200


@attempts_bp.delete("/<int:attempt_id>")
@login_required(required_profiles={"ADMIN"})
def delete_attempt(current_user, attempt_id: int):
    service.delete_attempt(attempt_id)
    return jsonify({"message": "Tentativa excluida com sucesso."}), 200
