from flask import Blueprint, request, jsonify
from app.services.place_service import PlaceService

place_bp = Blueprint('place', __name__, url_prefix='/api/places')
place_service = PlaceService()

@place_bp.route('/', methods=['POST'])
def add_place():
    try:
        data = request.get_json()
        place = place_service.add_place(data.get('name'), data.get('description'), data.get('category'), data.get('city'), data.get('latitude'), data.get('longitude'), data.get('rating', 0.0))
        return jsonify({'message': 'Mekan eklendi', 'place': place.to_dict()}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@place_bp.route('/', methods=['GET'])
def get_places():
    city = request.args.get('city')
    category = request.args.get('category')
    search = request.args.get('search')
    if city:
        places = place_service.filter_by_city(city)
    elif category:
        places = place_service.filter_by_category(category)
    elif search:
        places = place_service.search_places(search)
    else:
        places = place_service.get_all_places()
    return jsonify({'places': [p.to_dict() for p in places]}), 200
