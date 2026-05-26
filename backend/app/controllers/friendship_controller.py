from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.friendship import Friendship

friendship_bp = Blueprint('friendship', __name__, url_prefix='/api/social')


# ── Kullanıcı Arama ───────────────────────────────────────────────────────────

@friendship_bp.route('/search', methods=['GET'])
@jwt_required()
def search_users():
    """Ada göre kullanıcı ara, mevcut takip durumunu da döndür."""
    q = request.args.get('q', '').strip()
    current_user_id = int(get_jwt_identity())
    if len(q) < 2:
        return jsonify({'users': []}), 200

    users = (User.query
             .filter(User.id != current_user_id, User.name.ilike(f'%{q}%'))
             .limit(15).all())

    following_ids = {f.following_id for f in
                     Friendship.query.filter_by(follower_id=current_user_id).all()}

    return jsonify({'users': [
        {'id': u.id, 'name': u.name, 'is_following': u.id in following_ids}
        for u in users
    ]}), 200


# ── Takip Et / Bırak ─────────────────────────────────────────────────────────

@friendship_bp.route('/follow/<int:user_id>', methods=['POST'])
@jwt_required()
def follow_user(user_id):
    current_user_id = int(get_jwt_identity())
    if current_user_id == user_id:
        return jsonify({'error': 'Kendinizi takip edemezsiniz'}), 400

    target = User.query.get(user_id)
    if not target:
        return jsonify({'error': 'Kullanıcı bulunamadı'}), 404

    if Friendship.query.filter_by(follower_id=current_user_id, following_id=user_id).first():
        return jsonify({'message': 'Zaten takip ediyorsunuz'}), 200

    db.session.add(Friendship(follower_id=current_user_id, following_id=user_id))
    db.session.commit()
    return jsonify({'message': f'{target.name} takip ediliyor'}), 201


@friendship_bp.route('/unfollow/<int:user_id>', methods=['DELETE'])
@jwt_required()
def unfollow_user(user_id):
    current_user_id = int(get_jwt_identity())
    f = Friendship.query.filter_by(follower_id=current_user_id, following_id=user_id).first()
    if not f:
        return jsonify({'error': 'Takip kaydı bulunamadı'}), 404
    db.session.delete(f)
    db.session.commit()
    return jsonify({'message': 'Takip bırakıldı'}), 200


# ── Takip Listesi ─────────────────────────────────────────────────────────────

@friendship_bp.route('/following', methods=['GET'])
@jwt_required()
def get_following():
    """Oturum açan kullanıcının takip ettikleri."""
    current_user_id = int(get_jwt_identity())
    rels = Friendship.query.filter_by(follower_id=current_user_id).all()
    return jsonify({'following': [
        {'id': r.following.id, 'name': r.following.name, 'is_following': True}
        for r in rels
    ]}), 200


# ── Sosyal Akış ───────────────────────────────────────────────────────────────

@friendship_bp.route('/feed', methods=['GET'])
@jwt_required()
def get_social_feed():
    """Takip edilen kullanıcıların son aktiviteleri, kronolojik sırayla."""
    current_user_id = int(get_jwt_identity())

    rels = Friendship.query.filter_by(follower_id=current_user_id).all()
    if not rels:
        return jsonify({'activities': []}), 200

    following_ids = [r.following_id for r in rels]
    user_map = {r.following_id: r.following for r in rels}

    from app.models.favorite import Favorite
    from app.models.review import Review
    from app.models.route import Route
    from app.models.collection import Collection
    from app.models.place import Place

    activities = []

    # Favoriler
    for f in (Favorite.query
              .filter(Favorite.user_id.in_(following_ids))
              .order_by(Favorite.created_at.desc()).limit(25).all()):
        u = user_map.get(f.user_id)
        activities.append({
            'type': 'favorite',
            'user_id': f.user_id,
            'user_name': u.name if u else '?',
            'created_at': f.created_at.isoformat(),
            'place_id': f.place_id,
            'place_name': f.place.name if f.place else None,
        })

    # Yorumlar
    for r in (Review.query
              .filter(Review.user_id.in_(following_ids))
              .order_by(Review.created_at.desc()).limit(25).all()):
        u = user_map.get(r.user_id)
        place = Place.query.get(r.place_id)
        activities.append({
            'type': 'review',
            'user_id': r.user_id,
            'user_name': u.name if u else '?',
            'created_at': r.created_at.isoformat(),
            'place_id': r.place_id,
            'place_name': place.name if place else None,
            'rating': r.rating,
            'comment': r.comment,
        })

    # Rotalar
    for route in (Route.query
                  .filter(Route.user_id.in_(following_ids))
                  .order_by(Route.created_at.desc()).limit(20).all()):
        u = user_map.get(route.user_id)
        activities.append({
            'type': 'route',
            'user_id': route.user_id,
            'user_name': u.name if u else '?',
            'created_at': route.created_at.isoformat(),
            'route_id': route.id,
            'route_name': route.name,
            'waypoint_count': len(route.get_waypoints()),
        })

    # Koleksiyonlar
    for col in (Collection.query
                .filter(Collection.user_id.in_(following_ids))
                .order_by(Collection.created_at.desc()).limit(15).all()):
        u = user_map.get(col.user_id)
        activities.append({
            'type': 'collection',
            'user_id': col.user_id,
            'user_name': u.name if u else '?',
            'created_at': col.created_at.isoformat(),
            'collection_id': col.id,
            'collection_name': col.name,
        })

    activities.sort(key=lambda x: x['created_at'], reverse=True)
    return jsonify({'activities': activities[:40]}), 200
