from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.review_service import ReviewService

review_bp = Blueprint('review', __name__, url_prefix='/api/reviews')
_service = ReviewService()


@review_bp.route('/<int:place_id>', methods=['GET'])
@jwt_required()
def get_reviews(place_id):
    reviews, avg = _service.get_reviews(place_id)
    return jsonify({
        'reviews': [r.to_dict() for r in reviews],
        'count': len(reviews),
        'average_rating': avg,
    }), 200


@review_bp.route('/<int:place_id>', methods=['POST'])
@jwt_required()
def add_review(place_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()

    rating = data.get('rating')
    comment = (data.get('comment') or '').strip()

    try:
        review, updated = _service.add_or_update_review(user_id, place_id, rating, comment)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    avg, count = _service.repo.average_rating(place_id)
    msg = 'Yorum güncellendi' if updated else 'Yorum eklendi'
    status = 200 if updated else 201
    return jsonify({
        'message': msg,
        'review': review.to_dict(),
        'new_avg': avg,
        'review_count': count,
    }), status


@review_bp.route('/<int:place_id>/<int:review_id>', methods=['DELETE'])
@jwt_required()
def delete_review(place_id, review_id):
    user_id = int(get_jwt_identity())
    try:
        _service.delete_review(user_id, place_id, review_id)
    except LookupError as e:
        return jsonify({'error': str(e)}), 404
    except PermissionError as e:
        return jsonify({'error': str(e)}), 403

    avg, count = _service.repo.average_rating(place_id)
    return jsonify({
        'message': 'Yorum silindi',
        'new_avg': avg,
        'review_count': count,
    }), 200
