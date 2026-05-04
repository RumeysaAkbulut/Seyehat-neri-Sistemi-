from flask import Blueprint, request, jsonify
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
        return jsonify({
            'message': 'Kayit basarili',
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
        return jsonify({
            'message': 'Giris basarili',
            'user': user.to_dict()
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 401

@user_bp.route('/', methods=['GET'])
def get_users():
    users = user_service.get_all_users()
    return jsonify({
        'users': [user.to_dict() for user in users]
    }), 200
