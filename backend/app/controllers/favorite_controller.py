from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.favorite import Favorite

favorite_bp = Blueprint('favorite', __name__, url_prefix='/api/favorites')

@favorite_bp.route('/<int:place_id>', methods=['POST'])
@jwt_required()
def add_favorite(place_id):
    user_id = int(get_jwt_identity())
    existing = Favorite.query.filter_by(user_id=user_id, place_id=place_id).first()
    if existing:
        return jsonify({'error': 'Zaten favorilerde'}), 400
    fav = Favorite(user_id=user_id, place_id=place_id)
    db.session.add(fav)
    db.session.commit()
    return jsonify({'message': 'Favorilere eklendi', 'favorite': fav.to_dict()}), 201

@favorite_bp.route('/<int:place_id>', methods=['DELETE'])
@jwt_required()
def remove_favorite(place_id):
    user_id = int(get_jwt_identity())
    fav = Favorite.query.filter_by(user_id=user_id, place_id=place_id).first()
    if not fav:
        return jsonify({'error': 'Favori bulunamadi'}), 404
    db.session.delete(fav)
    db.session.commit()
    return jsonify({'message': 'Favorilerden cikarildi'}), 200

@favorite_bp.route('/', methods=['GET'])
@jwt_required()
def get_favorites():
    user_id = int(get_jwt_identity())
    favs = Favorite.query.filter_by(user_id=user_id).all()
    return jsonify({'favorites': [f.to_dict() for f in favs]}), 200
