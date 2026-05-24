from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.favorite import Favorite
from app.models.review import Review
from app.models.route import Route
from app.models.collection import Collection, CollectionItem

activity_bp = Blueprint('activity', __name__, url_prefix='/api/activity')


@activity_bp.route('/', methods=['GET'])
@jwt_required()
def get_activity():
    """Kullanıcının son işlemlerini birleştirip kronolojik sıraya koyar."""
    user_id = int(get_jwt_identity())
    activities = []

    # ── Favoriler ──────────────────────────────────────────────────────────────
    favorites = (Favorite.query
                 .filter_by(user_id=user_id)
                 .order_by(Favorite.created_at.desc())
                 .limit(20).all())
    for f in favorites:
        activities.append({
            'type': 'favorite',
            'created_at': f.created_at.isoformat(),
            'place_id': f.place_id,
            'place_name': f.place.name if f.place else None,
        })

    # ── Yorumlar ───────────────────────────────────────────────────────────────
    from app.models.place import Place
    reviews = (Review.query
               .filter_by(user_id=user_id)
               .order_by(Review.created_at.desc())
               .limit(20).all())
    for r in reviews:
        place = Place.query.get(r.place_id)
        activities.append({
            'type': 'review',
            'created_at': r.created_at.isoformat(),
            'place_id': r.place_id,
            'place_name': place.name if place else None,
            'rating': r.rating,
            'comment': r.comment,
        })

    # ── Rotalar ────────────────────────────────────────────────────────────────
    routes = (Route.query
              .filter_by(user_id=user_id)
              .order_by(Route.created_at.desc())
              .limit(20).all())
    for route in routes:
        activities.append({
            'type': 'route',
            'created_at': route.created_at.isoformat(),
            'route_id': route.id,
            'route_name': route.name,
            'waypoint_count': len(route.get_waypoints()),
        })

    # ── Koleksiyonlar (oluşturma) ──────────────────────────────────────────────
    collections = (Collection.query
                   .filter_by(user_id=user_id)
                   .order_by(Collection.created_at.desc())
                   .limit(20).all())
    col_id_map = {c.id: c for c in collections}
    for col in collections:
        activities.append({
            'type': 'collection',
            'created_at': col.created_at.isoformat(),
            'collection_id': col.id,
            'collection_name': col.name,
            'emoji': col.emoji or '📌',
        })

    # ── Koleksiyon öğeleri (mekan ekleme) ─────────────────────────────────────
    if col_id_map:
        items = (CollectionItem.query
                 .filter(CollectionItem.collection_id.in_(list(col_id_map.keys())))
                 .order_by(CollectionItem.added_at.desc())
                 .limit(30).all())
        for item in items:
            col = col_id_map.get(item.collection_id)
            place = Place.query.get(item.place_id)
            activities.append({
                'type': 'collection_item',
                'created_at': item.added_at.isoformat(),
                'place_id': item.place_id,
                'place_name': place.name if place else None,
                'collection_name': col.name if col else None,
                'emoji': col.emoji if col else '📌',
            })

    # Sırala ve ilk 30'u döndür
    activities.sort(key=lambda x: x['created_at'], reverse=True)
    return jsonify({'activities': activities[:30]}), 200
