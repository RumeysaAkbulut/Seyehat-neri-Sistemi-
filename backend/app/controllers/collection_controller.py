from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.collection_service import CollectionService

collection_bp = Blueprint('collection', __name__, url_prefix='/api/collections')
_service = CollectionService()


@collection_bp.route('/', methods=['GET'])
@jwt_required()
def list_collections():
    user_id = int(get_jwt_identity())
    cols = _service.get_user_collections(user_id)
    return jsonify({'collections': [c.to_dict() for c in cols]}), 200


@collection_bp.route('/', methods=['POST'])
@jwt_required()
def create_collection():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    try:
        col = _service.create_collection(
            user_id,
            name=data.get('name', ''),
            emoji=data.get('emoji', '📌'),
            description=(data.get('description') or '').strip() or None,
        )
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    return jsonify({'message': 'Koleksiyon oluşturuldu', 'collection': col.to_dict()}), 201


@collection_bp.route('/<int:col_id>', methods=['PUT'])
@jwt_required()
def update_collection(col_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    try:
        col = _service.update_collection(
            user_id, col_id,
            name=(data.get('name') or '').strip() or None,
            emoji=data.get('emoji'),
            description=(data.get('description') or '').strip() or None,
        )
    except LookupError as e:
        return jsonify({'error': str(e)}), 404
    return jsonify({'message': 'Güncellendi', 'collection': col.to_dict()}), 200


@collection_bp.route('/<int:col_id>', methods=['DELETE'])
@jwt_required()
def delete_collection(col_id):
    user_id = int(get_jwt_identity())
    try:
        _service.delete_collection(user_id, col_id)
    except LookupError as e:
        return jsonify({'error': str(e)}), 404
    return jsonify({'message': 'Koleksiyon silindi'}), 200


@collection_bp.route('/<int:col_id>/items', methods=['POST'])
@jwt_required()
def add_item(col_id):
    user_id = int(get_jwt_identity())
    place_id = request.get_json().get('place_id')
    try:
        col, added = _service.add_item(user_id, col_id, place_id)
    except LookupError as e:
        return jsonify({'error': str(e)}), 404
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    if not added:
        return jsonify({'message': 'Zaten eklenmiş', 'collection': col.to_dict()}), 200
    return jsonify({'message': 'Mekan koleksiyona eklendi', 'collection': col.to_dict()}), 201


@collection_bp.route('/<int:col_id>/items/<int:place_id>', methods=['DELETE'])
@jwt_required()
def remove_item(col_id, place_id):
    user_id = int(get_jwt_identity())
    try:
        col = _service.remove_item(user_id, col_id, place_id)
    except LookupError as e:
        return jsonify({'error': str(e)}), 404
    return jsonify({'message': 'Mekan koleksiyondan çıkarıldı', 'collection': col.to_dict()}), 200
