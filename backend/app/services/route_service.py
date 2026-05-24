from app import db
from app.models.route import Route

class RouteService:
    def create_route(self, user_id, name, description, waypoints):
        route = Route(user_id=user_id, name=name, description=description)
        route.set_waypoints(waypoints or [])
        db.session.add(route)
        db.session.commit()
        return route

    def get_user_routes(self, user_id):
        return Route.query.filter_by(user_id=user_id).order_by(Route.created_at.desc()).all()

    def get_route_by_id(self, route_id):
        return Route.query.get(route_id)

    def update_route(self, route, name, description, waypoints):
        route.name = name
        route.description = description
        route.set_waypoints(waypoints or [])
        db.session.commit()
        return route

    def delete_route(self, route):
        db.session.delete(route)
        db.session.commit()
