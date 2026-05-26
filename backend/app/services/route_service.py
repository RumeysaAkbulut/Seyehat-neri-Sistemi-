from app.repositories.route_repository import RouteRepository


class RouteService:
    def __init__(self):
        self.route_repo = RouteRepository()

    def create_route(self, user_id, name, description, waypoints):
        return self.route_repo.create(user_id, name, description, waypoints)

    def get_user_routes(self, user_id):
        return self.route_repo.find_by_user(user_id)

    def get_route_by_id(self, route_id):
        return self.route_repo.find_by_id(route_id)

    def update_route(self, route, name, description, waypoints):
        return self.route_repo.update(route, name, description, waypoints)

    def delete_route(self, route):
        self.route_repo.delete(route)
