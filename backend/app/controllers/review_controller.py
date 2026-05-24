from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.review import Review

review_bp = Blueprint('review', __name__, url_prefix='/api/reviews')

@review_bp.route('/<int:place_id>', methods=['GET'])
@jwt_required()
def get_reviews(place_id):
    reviews = Review.query.filter_by(place_id=place_id).order_by(Review.created_at.desc()).all()
    avg = round(sum(r.rating for r in reviews) / len(reviews), 1) if reviews else None
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
    if rating is None or not (1 <= float(rating) <= 5):
        return jsonify({'error': 'Puan 1 ile 5 arasında olmalıdır'}), 400

    comment = (data.get('comment') or '').strip()

    # Aynı kullanıcı aynı mekanı tekrar puanlayamaz — günceller
    existing = Review.query.filter_by(user_id=user_id, place_id=place_id).first()
    if existing:
        existing.rating = float(rating)
        existing.comment = comment or existing.comment
        db.session.commit()
        return jsonify({'message': 'Yorum güncellendi', 'review': existing.to_dict()}), 200

    review = Review(user_id=user_id, place_id=place_id, rating=float(rating), comment=comment)
    db.session.add(review)
    db.session.commit()
    return jsonify({'message': 'Yorum eklendi', 'review': review.to_dict()}), 201

@review_bp.route('/<int:place_id>/<int:review_id>', methods=['DELETE'])
@jwt_required()
def delete_review(place_id, review_id):
    user_id = int(get_jwt_identity())
    review = Review.query.get(review_id)
    if not review or review.place_id != place_id:
        return jsonify({'error': 'Yorum bulunamadı'}), 404
    if review.user_id != user_id:
        return jsonify({'error': 'Yetkisiz işlem'}), 403
    db.session.delete(review)
    db.session.commit()
    return jsonify({'message': 'Yorum silindi'}), 200
