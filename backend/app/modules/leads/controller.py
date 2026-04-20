from flask import Blueprint, jsonify, request

from app.core.errors import AppError
from app.modules.leads.service import LeadService
from app.routes.auth import login_required

leads_bp = Blueprint("leads", __name__, url_prefix="/api/leads")
service = LeadService()


@leads_bp.get("")
@login_required()
def list_leads(current_user):
    return jsonify({"items": service.list_leads(request.args.to_dict())}), 200


@leads_bp.post("")
@login_required()
def create_lead(current_user):
    return jsonify(service.create_lead(request.get_json(force=True), current_user["id"])), 201


@leads_bp.patch("/<int:lead_id>")
@login_required(required_profiles={"ADMIN"})
def update_lead(current_user, lead_id: int):
    return jsonify(service.update_lead(lead_id, request.get_json(force=True))), 200


@leads_bp.delete("/<int:lead_id>")
@login_required(required_profiles={"ADMIN"})
def delete_lead(current_user, lead_id: int):
    confirmation = request.args.get("confirmar_exclusao", "").strip().lower()
    if confirmation not in {"1", "true", "sim"}:
        raise AppError("Confirme a exclusao em cascata antes de continuar.", 400)
    service.delete_lead(lead_id)
    return jsonify({"message": "Lead excluido com sucesso."}), 200
