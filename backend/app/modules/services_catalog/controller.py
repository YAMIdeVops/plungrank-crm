from flask import Blueprint, jsonify, request

from app.modules.services_catalog.service import ServiceCatalogService
from app.routes.auth import login_required

services_bp = Blueprint("services_catalog", __name__, url_prefix="/api/services")
service = ServiceCatalogService()


@services_bp.get("")
@login_required()
def list_services(current_user):
    return jsonify({"items": service.list_services()}), 200


@services_bp.post("")
@login_required(required_profiles={"ADMIN"})
def create_service(current_user):
    return jsonify(service.create_service(request.get_json(force=True))), 201


@services_bp.patch("/<int:service_id>")
@login_required(required_profiles={"ADMIN"})
def update_service(current_user, service_id: int):
    return jsonify(service.update_service(service_id, request.get_json(force=True))), 200


@services_bp.delete("/<int:service_id>")
@login_required(required_profiles={"ADMIN"})
def delete_service(current_user, service_id: int):
    service.delete_service(service_id)
    return jsonify({"message": "Serviço excluído com sucesso."}), 200
