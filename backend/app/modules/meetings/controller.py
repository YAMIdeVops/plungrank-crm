from flask import Blueprint, jsonify, request

from app.modules.meetings.service import MeetingService
from app.routes.auth import login_required

meetings_bp = Blueprint("meetings", __name__, url_prefix="/api/meetings")
service = MeetingService()


@meetings_bp.get("")
@login_required()
def list_meetings(current_user):
    return jsonify({"items": service.list_meetings(request.args.to_dict())}), 200


@meetings_bp.post("")
@login_required()
def create_meeting(current_user):
    return jsonify(service.create_meeting(request.get_json(force=True), current_user["id"])), 201


@meetings_bp.patch("/<int:meeting_id>")
@login_required(required_profiles={"ADMIN"})
def update_meeting(current_user, meeting_id: int):
    return jsonify(service.update_meeting(meeting_id, request.get_json(force=True))), 200


@meetings_bp.delete("/<int:meeting_id>")
@login_required(required_profiles={"ADMIN"})
def delete_meeting(current_user, meeting_id: int):
    service.delete_meeting(meeting_id)
    return jsonify({"message": "Reuniao excluida com sucesso."}), 200
