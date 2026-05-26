from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.favorite_service import FavoriteService

favorite_bp = Blueprint('favorite', __name__, url_prefix='/api/favorites')
_service = FavoriteService()


@favorite_bp.route('/<int:place_id>', methods=['POST'])
@jwt_required()
def add_favorite(place_id):
    user_id = int(get_jwt_identity())
    try:
        fav = _service.add_favorite(user_id, place_id)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    return jsonify({'message': 'Favorilere eklendi', 'favorite': fav.to_dict()}), 201


@favorite_bp.route('/<int:place_id>', methods=['DELETE'])
@jwt_required()
def remove_favorite(place_id):
    user_id = int(get_jwt_identity())
    try:
        _service.remove_favorite(user_id, place_id)
    except LookupError as e:
        return jsonify({'error': str(e)}), 404
    return jsonify({'message': 'Favorilerden cikarildi'}), 200


@favorite_bp.route('/', methods=['GET'])
@jwt_required()
def get_favorites():
    user_id = int(get_jwt_identity())
    favs = _service.get_user_favorites(user_id)
    return jsonify({'favorites': [f.to_dict() for f in favs]}), 200
