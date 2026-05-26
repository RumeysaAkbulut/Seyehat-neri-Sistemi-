from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return jsonify({
        'message': 'AI Destekli Seyahat Oneri Sistemi API',
        'version': '1.0.0',
        'status': 'active'
    })

@main_bp.route('/health')
def health_check():
    return jsonify({'status': 'healthy'})

@main_bp.route('/api/stats')
@jwt_required()
def stats():
    from app import db
    from app.models.place import Place
    from app.models.favorite import Favorite
    from app.models.route import Route
    from app.models.review import Review

    user_id = int(get_jwt_identity())
    place_count = db.session.query(Place).count()
    fav_count = db.session.query(Favorite).filter_by(user_id=user_id).count()
    city_count = db.session.query(Place.city).distinct().count()
    route_count = db.session.query(Route).filter_by(user_id=user_id).count()
    review_count = db.session.query(Review).filter_by(user_id=user_id).count()

    return jsonify({
        'places': place_count,
        'cities': city_count,
        'favorites': fav_count,
        'routes': route_count,
        'reviews': review_count,
    }), 200
