from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.route_service import RouteService

route_bp = Blueprint('route', __name__, url_prefix='/api/routes')
route_service = RouteService()

@route_bp.route('/', methods=['GET'])
@jwt_required()
def list_routes():
    user_id = int(get_jwt_identity())
    routes = route_service.get_user_routes(user_id)
    return jsonify({'routes': [r.to_dict() for r in routes]}), 200

@route_bp.route('/', methods=['POST'])
@jwt_required()
def create_route():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Rota adı zorunludur'}), 400
    waypoints = data.get('waypoints', [])
    if not isinstance(waypoints, list):
        return jsonify({'error': 'Waypoints bir liste olmalıdır'}), 400
    description = data.get('description', '')
    route = route_service.create_route(user_id, name, description, waypoints)
    return jsonify({'message': 'Rota kaydedildi', 'route': route.to_dict()}), 201

@route_bp.route('/<int:route_id>', methods=['GET'])
@jwt_required()
def get_route(route_id):
    user_id = int(get_jwt_identity())
    route = route_service.get_route_by_id(route_id)
    if not route:
        return jsonify({'error': 'Rota bulunamadı'}), 404
    if route.user_id != user_id:
        return jsonify({'error': 'Yetkisiz erişim'}), 403
    return jsonify({'route': route.to_dict()}), 200

@route_bp.route('/<int:route_id>', methods=['PUT'])
@jwt_required()
def update_route(route_id):
    user_id = int(get_jwt_identity())
    route = route_service.get_route_by_id(route_id)
    if not route:
        return jsonify({'error': 'Rota bulunamadı'}), 404
    if route.user_id != user_id:
        return jsonify({'error': 'Yetkisiz erişim'}), 403
    data = request.get_json()
    name = data.get('name', route.name).strip()
    if not name:
        return jsonify({'error': 'Rota adı zorunludur'}), 400
    description = data.get('description', route.description)
    waypoints = data.get('waypoints', route.get_waypoints())
    route = route_service.update_route(route, name, description, waypoints)
    return jsonify({'message': 'Rota güncellendi', 'route': route.to_dict()}), 200

@route_bp.route('/<int:route_id>', methods=['DELETE'])
@jwt_required()
def delete_route(route_id):
    user_id = int(get_jwt_identity())
    route = route_service.get_route_by_id(route_id)
    if not route:
        return jsonify({'error': 'Rota bulunamadı'}), 404
    if route.user_id != user_id:
        return jsonify({'error': 'Yetkisiz erişim'}), 403
    route_service.delete_route(route)
    return jsonify({'message': 'Rota silindi'}), 200
