from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.services.user_service import UserService

user_bp = Blueprint('user', __name__, url_prefix='/api/users')
user_service = UserService()

@user_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        user = user_service.register(
            name=data.get('name'),
            email=data.get('email'),
            password=data.get('password')
        )
        token = create_access_token(identity=str(user.id))
        return jsonify({
            'message': 'Kayit basarili',
            'token': token,
            'user': user.to_dict()
        }), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@user_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user = user_service.login(
            email=data.get('email'),
            password=data.get('password')
        )
        token = create_access_token(identity=str(user.id))
        return jsonify({
            'message': 'Giris basarili',
            'token': token,
            'user': user.to_dict()
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 401

@user_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = user_service.get_user_by_id(user_id)
    if not user:
        return jsonify({'error': 'Kullanici bulunamadi'}), 404
    return jsonify({'user': user.to_dict()}), 200

@user_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = user_service.get_user_by_id(user_id)
    if not user:
        return jsonify({'error': 'Kullanici bulunamadi'}), 404

    data = request.get_json()
    name = data.get('name', '').strip()
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')

    if not name:
        return jsonify({'error': 'Ad boş olamaz'}), 400

    user.name = name

    if current_password or new_password:
        if not user.check_password(current_password):
            return jsonify({'error': 'Mevcut şifre yanlış'}), 400
        if len(new_password) < 6:
            return jsonify({'error': 'Yeni şifre en az 6 karakter olmalı'}), 400
        user.set_password(new_password)

    from app import db
    db.session.commit()
    return jsonify({'message': 'Profil güncellendi', 'user': user.to_dict()}), 200

@user_bp.route('/', methods=['GET'])
@jwt_required()
def get_users():
    users = user_service.get_all_users()
    return jsonify({
        'users': [user.to_dict() for user in users]
    }), 200
