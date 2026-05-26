from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.repositories.friendship_repository import FriendshipRepository

friendship_bp = Blueprint('friendship', __name__, url_prefix='/api/social')
friendship_repo = FriendshipRepository()


# ── Kullanıcı Arama ───────────────────────────────────────────────────────────

@friendship_bp.route('/search', methods=['GET'])
@jwt_required()
def search_users():
    """Ada göre kullanıcı ara, mevcut takip durumunu da döndür."""
    q = request.args.get('q', '').strip()
    current_user_id = int(get_jwt_identity())
    if len(q) < 2:
        return jsonify({'users': []}), 200

    users = friendship_repo.search_users(current_user_id, q)
    following_ids = friendship_repo.get_following_ids(current_user_id)

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

    target = friendship_repo.find_user_by_id(user_id)
    if not target:
        return jsonify({'error': 'Kullanıcı bulunamadı'}), 404

    if friendship_repo.find(current_user_id, user_id):
        return jsonify({'message': 'Zaten takip ediyorsunuz'}), 200

    friendship_repo.follow(current_user_id, user_id)
    return jsonify({'message': f'{target.name} takip ediliyor'}), 201


@friendship_bp.route('/unfollow/<int:user_id>', methods=['DELETE'])
@jwt_required()
def unfollow_user(user_id):
    current_user_id = int(get_jwt_identity())
    f = friendship_repo.find(current_user_id, user_id)
    if not f:
        return jsonify({'error': 'Takip kaydı bulunamadı'}), 404
    friendship_repo.unfollow(f)
    return jsonify({'message': 'Takip bırakıldı'}), 200


# ── Takip Listesi ─────────────────────────────────────────────────────────────

@friendship_bp.route('/following', methods=['GET'])
@jwt_required()
def get_following():
    """Oturum açan kullanıcının takip ettikleri."""
    current_user_id = int(get_jwt_identity())
    rels = friendship_repo.get_following(current_user_id)
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

    rels = friendship_repo.get_following(current_user_id)
    if not rels:
        return jsonify({'activities': []}), 200

    following_ids = [r.following_id for r in rels]
    user_map = {r.following_id: r.following for r in rels}

    activities = friendship_repo.get_feed(following_ids)

    for a in activities:
        u = user_map.get(a['user_id'])
        a['user_name'] = u.name if u else '?'

    activities.sort(key=lambda x: x['created_at'], reverse=True)
    return jsonify({'activities': activities[:40]}), 200
