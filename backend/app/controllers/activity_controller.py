from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.repositories.activity_repository import ActivityRepository

activity_bp = Blueprint('activity', __name__, url_prefix='/api/activity')
activity_repo = ActivityRepository()


@activity_bp.route('/', methods=['GET'])
@jwt_required()
def get_activity():
    """Kullanıcının son işlemlerini birleştirip kronolojik sıraya koyar."""
    user_id = int(get_jwt_identity())
    activities = activity_repo.get_user_activities(user_id)
    return jsonify({'activities': activities}), 200
