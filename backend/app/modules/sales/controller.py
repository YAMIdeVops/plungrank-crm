from flask import Blueprint, jsonify, request

from app.modules.sales.service import SaleService
from app.routes.auth import login_required

sales_bp = Blueprint("sales", __name__, url_prefix="/api/sales")
service = SaleService()


@sales_bp.get("")
@login_required()
def list_sales(current_user):
    return jsonify({"items": service.list_sales(request.args.to_dict())}), 200


@sales_bp.post("")
@login_required()
def create_sale(current_user):
    return jsonify(service.create_sale(request.get_json(force=True), current_user["id"])), 201


@sales_bp.patch("/<int:sale_id>")
@login_required(required_profiles={"ADMIN"})
def update_sale(current_user, sale_id: int):
    return jsonify(service.update_sale(sale_id, request.get_json(force=True))), 200


@sales_bp.delete("/<int:sale_id>")
@login_required(required_profiles={"ADMIN"})
def delete_sale(current_user, sale_id: int):
    service.delete_sale(sale_id)
    return jsonify({"message": "Venda excluida com sucesso."}), 200
