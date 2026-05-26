from app.models.favorite import Favorite
from app.models.review import Review
from app.models.route import Route
from app.models.collection import Collection, CollectionItem
from app.models.place import Place


class ActivityRepository:
    def get_user_activities(self, user_id, limit=20):
        activities = []

        for f in (Favorite.query
                  .filter_by(user_id=user_id)
                  .order_by(Favorite.created_at.desc())
                  .limit(limit).all()):
            activities.append({
                'type': 'favorite',
                'created_at': f.created_at.isoformat(),
                'place_id': f.place_id,
                'place_name': f.place.name if f.place else None,
            })

        for r in (Review.query
                  .filter_by(user_id=user_id)
                  .order_by(Review.created_at.desc())
                  .limit(limit).all()):
            place = Place.query.get(r.place_id)
            activities.append({
                'type': 'review',
                'created_at': r.created_at.isoformat(),
                'place_id': r.place_id,
                'place_name': place.name if place else None,
                'rating': r.rating,
                'comment': r.comment,
            })

        for route in (Route.query
                      .filter_by(user_id=user_id)
                      .order_by(Route.created_at.desc())
                      .limit(limit).all()):
            activities.append({
                'type': 'route',
                'created_at': route.created_at.isoformat(),
                'route_id': route.id,
                'route_name': route.name,
                'waypoint_count': len(route.get_waypoints()),
            })

        collections = (Collection.query
                       .filter_by(user_id=user_id)
                       .order_by(Collection.created_at.desc())
                       .limit(limit).all())
        col_id_map = {c.id: c for c in collections}

        for col in collections:
            activities.append({
                'type': 'collection',
                'created_at': col.created_at.isoformat(),
                'collection_id': col.id,
                'collection_name': col.name,
                'emoji': col.emoji or '',
            })

        if col_id_map:
            for item in (CollectionItem.query
                         .filter(CollectionItem.collection_id.in_(list(col_id_map.keys())))
                         .order_by(CollectionItem.added_at.desc())
                         .limit(30).all()):
                col = col_id_map.get(item.collection_id)
                place = Place.query.get(item.place_id)
                activities.append({
                    'type': 'collection_item',
                    'created_at': item.added_at.isoformat(),
                    'place_id': item.place_id,
                    'place_name': place.name if place else None,
                    'collection_name': col.name if col else None,
                    'emoji': col.emoji if col else '',
                })

        activities.sort(key=lambda x: x['created_at'], reverse=True)
        return activities[:30]
