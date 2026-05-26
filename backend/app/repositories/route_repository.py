from app import db
from app.models.route import Route


class RouteRepository:
    def create(self, user_id, name, description, waypoints):
        route = Route(user_id=user_id, name=name, description=description)
        route.set_waypoints(waypoints or [])
        db.session.add(route)
        db.session.commit()
        return route

    def find_by_user(self, user_id):
        return Route.query.filter_by(user_id=user_id).order_by(Route.created_at.desc()).all()

    def find_by_id(self, route_id):
        return Route.query.get(route_id)

    def update(self, route, name, description, waypoints):
        route.name = name
        route.description = description
        route.set_waypoints(waypoints or [])
        db.session.commit()
        return route

    def delete(self, route):
        db.session.delete(route)
        db.session.commit()
