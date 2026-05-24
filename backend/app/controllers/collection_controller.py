from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.collection import Collection, CollectionItem

collection_bp = Blueprint('collection', __name__, url_prefix='/api/collections')


@collection_bp.route('/', methods=['GET'])
@jwt_required()
def list_collections():
    user_id = int(get_jwt_identity())
    cols = Collection.query.filter_by(user_id=user_id).order_by(Collection.created_at.desc()).all()
    return jsonify({'collections': [c.to_dict() for c in cols]}), 200


@collection_bp.route('/', methods=['POST'])
@jwt_required()
def create_collection():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Koleksiyon adı zorunludur'}), 400
    if len(name) > 100:
        return jsonify({'error': 'Ad en fazla 100 karakter olabilir'}), 400

    col = Collection(
        user_id=user_id,
        name=name,
        emoji=data.get('emoji', '📌'),
        description=(data.get('description') or '').strip() or None,
    )
    db.session.add(col)
    db.session.commit()
    return jsonify({'message': 'Koleksiyon oluşturuldu', 'collection': col.to_dict()}), 201


@collection_bp.route('/<int:col_id>', methods=['PUT'])
@jwt_required()
def update_collection(col_id):
    user_id = int(get_jwt_identity())
    col = Collection.query.get(col_id)
    if not col or col.user_id != user_id:
        return jsonify({'error': 'Koleksiyon bulunamadı'}), 404
    data = request.get_json()
    name = (data.get('name') or '').strip()
    if name:
        col.name = name
    if 'emoji' in data:
        col.emoji = data['emoji'] or '📌'
    if 'description' in data:
        col.description = (data['description'] or '').strip() or None
    db.session.commit()
    return jsonify({'message': 'Güncellendi', 'collection': col.to_dict()}), 200


@collection_bp.route('/<int:col_id>', methods=['DELETE'])
@jwt_required()
def delete_collection(col_id):
    user_id = int(get_jwt_identity())
    col = Collection.query.get(col_id)
    if not col or col.user_id != user_id:
        return jsonify({'error': 'Koleksiyon bulunamadı'}), 404
    db.session.delete(col)
    db.session.commit()
    return jsonify({'message': 'Koleksiyon silindi'}), 200


@collection_bp.route('/<int:col_id>/items', methods=['POST'])
@jwt_required()
def add_item(col_id):
    user_id = int(get_jwt_identity())
    col = Collection.query.get(col_id)
    if not col or col.user_id != user_id:
        return jsonify({'error': 'Koleksiyon bulunamadı'}), 404
    place_id = request.get_json().get('place_id')
    if place_id is None:
        return jsonify({'error': 'place_id zorunludur'}), 400

    existing = CollectionItem.query.filter_by(collection_id=col_id, place_id=place_id).first()
    if existing:
        return jsonify({'message': 'Zaten eklenmiş', 'collection': col.to_dict()}), 200

    item = CollectionItem(collection_id=col_id, place_id=int(place_id))
    db.session.add(item)
    db.session.commit()
    return jsonify({'message': 'Mekan koleksiyona eklendi', 'collection': col.to_dict()}), 201


@collection_bp.route('/<int:col_id>/items/<int:place_id>', methods=['DELETE'])
@jwt_required()
def remove_item(col_id, place_id):
    user_id = int(get_jwt_identity())
    col = Collection.query.get(col_id)
    if not col or col.user_id != user_id:
        return jsonify({'error': 'Koleksiyon bulunamadı'}), 404
    item = CollectionItem.query.filter_by(collection_id=col_id, place_id=place_id).first()
    if not item:
        return jsonify({'error': 'Mekan bu koleksiyonda değil'}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Mekan koleksiyondan çıkarıldı', 'collection': col.to_dict()}), 200
