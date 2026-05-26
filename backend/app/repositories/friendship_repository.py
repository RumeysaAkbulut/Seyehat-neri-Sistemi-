from app import db
from app.models.friendship import Friendship
from app.models.user import User
from app.models.favorite import Favorite
from app.models.review import Review
from app.models.route import Route
from app.models.collection import Collection
from app.models.place import Place


class FriendshipRepository:
    def search_users(self, current_user_id, query, limit=15):
        return (User.query
                .filter(User.id != current_user_id, User.name.ilike(f'%{query}%'))
                .limit(limit).all())

    def get_following_ids(self, user_id):
        rels = Friendship.query.filter_by(follower_id=user_id).all()
        return {f.following_id for f in rels}

    def get_following(self, user_id):
        return Friendship.query.filter_by(follower_id=user_id).all()

    def find(self, follower_id, following_id):
        return Friendship.query.filter_by(
            follower_id=follower_id, following_id=following_id
        ).first()

    def find_user_by_id(self, user_id):
        return User.query.get(user_id)

    def follow(self, follower_id, following_id):
        f = Friendship(follower_id=follower_id, following_id=following_id)
        db.session.add(f)
        db.session.commit()
        return f

    def unfollow(self, friendship):
        db.session.delete(friendship)
        db.session.commit()

    def get_user_favorites(self, user_id):
        """Bir kullanıcının favori mekanlarını, mekan bilgileriyle döndür."""
        from app.models.favorite import Favorite
        favs = (Favorite.query
                .filter_by(user_id=user_id)
                .order_by(Favorite.created_at.desc()).all())
        result = []
        for f in favs:
            place = Place.query.get(f.place_id)
            if place:
                result.append({
                    'place_id': place.id,
                    'place_name': place.name,
                    'city': place.city,
                    'category': place.category,
                    'rating': place.rating,
                    'image_url': place.image_url,
                })
        return result

    def get_user_routes(self, user_id):
        """Bir kullanıcının kaydettiği rotaları döndür."""
        routes = (Route.query
                  .filter_by(user_id=user_id)
                  .order_by(Route.created_at.desc()).all())
        return [{
            'id': r.id,
            'name': r.name,
            'description': r.description or '',
            'waypoint_count': len(r.get_waypoints()),
            'created_at': r.created_at.isoformat(),
        } for r in routes]

    def get_feed(self, following_ids, limit=25):
        activities = []

        for f in (Favorite.query
                  .filter(Favorite.user_id.in_(following_ids))
                  .order_by(Favorite.created_at.desc()).limit(limit).all()):
            activities.append({
                'type': 'favorite',
                'user_id': f.user_id,
                'created_at': f.created_at.isoformat(),
                'place_id': f.place_id,
                'place_name': f.place.name if f.place else None,
            })

        for r in (Review.query
                  .filter(Review.user_id.in_(following_ids))
                  .order_by(Review.created_at.desc()).limit(limit).all()):
            place = Place.query.get(r.place_id)
            activities.append({
                'type': 'review',
                'user_id': r.user_id,
                'created_at': r.created_at.isoformat(),
                'place_id': r.place_id,
                'place_name': place.name if place else None,
                'rating': r.rating,
                'comment': r.comment,
            })

        for route in (Route.query
                      .filter(Route.user_id.in_(following_ids))
                      .order_by(Route.created_at.desc()).limit(20).all()):
            activities.append({
                'type': 'route',
                'user_id': route.user_id,
                'created_at': route.created_at.isoformat(),
                'route_id': route.id,
                'route_name': route.name,
                'waypoint_count': len(route.get_waypoints()),
            })

        for col in (Collection.query
                    .filter(Collection.user_id.in_(following_ids))
                    .order_by(Collection.created_at.desc()).limit(15).all()):
            activities.append({
                'type': 'collection',
                'user_id': col.user_id,
                'created_at': col.created_at.isoformat(),
                'collection_id': col.id,
                'collection_name': col.name,
            })

        return activities
