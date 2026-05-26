from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.place_service import PlaceService
from app.models.review import Review
from app import db

place_bp = Blueprint('place', __name__, url_prefix='/api/places')
place_service = PlaceService()


def _with_review_stats(place_dict, place_id):
    """place dict'ine review_avg ve review_count ekler."""
    reviews = Review.query.filter_by(place_id=place_id).all()
    count = len(reviews)
    avg = round(sum(r.rating for r in reviews) / count, 1) if count else None
    place_dict['review_avg'] = avg
    place_dict['review_count'] = count
    return place_dict


@place_bp.route('/', methods=['POST'])
@jwt_required()
def add_place():
    try:
        data = request.get_json()
        if not data.get('name') or not data.get('city'):
            return jsonify({'error': 'Mekan adı ve şehir zorunludur'}), 400
        place = place_service.add_place(
            data.get('name'), data.get('description'), data.get('category'),
            data.get('city'), data.get('latitude'), data.get('longitude'),
            data.get('rating', 0.0), data.get('image_url')
        )
        return jsonify({'message': 'Mekan eklendi', 'place': _with_review_stats(place.to_dict(), place.id)}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@place_bp.route('/<int:place_id>', methods=['GET'])
@jwt_required()
def get_place(place_id):
    place = place_service.get_place_by_id(place_id)
    if not place:
        return jsonify({'error': 'Mekan bulunamadı'}), 404
    return jsonify({'place': _with_review_stats(place.to_dict(), place_id)}), 200


@place_bp.route('/<int:place_id>', methods=['PUT'])
@jwt_required()
def update_place(place_id):
    place = place_service.get_place_by_id(place_id)
    if not place:
        return jsonify({'error': 'Mekan bulunamadı'}), 404
    data = request.get_json()
    if not data.get('name') or not data.get('city'):
        return jsonify({'error': 'Mekan adı ve şehir zorunludur'}), 400
    place.name = data.get('name', place.name)
    place.city = data.get('city', place.city)
    place.category = data.get('category', place.category)
    place.description = data.get('description', place.description)
    place.latitude = data.get('latitude', place.latitude)
    place.longitude = data.get('longitude', place.longitude)
    place.rating = data.get('rating', place.rating)
    db.session.commit()
    return jsonify({'message': 'Mekan güncellendi', 'place': _with_review_stats(place.to_dict(), place_id)}), 200


@place_bp.route('/<int:place_id>', methods=['DELETE'])
@jwt_required()
def delete_place(place_id):
    place = place_service.get_place_by_id(place_id)
    if not place:
        return jsonify({'error': 'Mekan bulunamadı'}), 404
    db.session.delete(place)
    db.session.commit()
    return jsonify({'message': 'Mekan silindi'}), 200


@place_bp.route('/', methods=['GET'])
@jwt_required()
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
    return jsonify({'places': [_with_review_stats(p.to_dict(), p.id) for p in places]}), 200
