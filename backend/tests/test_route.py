import pytest
from app import create_app, db
from app.repositories.route_repository import RouteRepository
from app.services.route_service import RouteService

TEST_CONFIG = {'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:'}


@pytest.fixture
def app():
    app = create_app(test_config=TEST_CONFIG)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def route_repo(app):
    return RouteRepository()


@pytest.fixture
def route_service(app):
    return RouteService()


@pytest.fixture
def auth_header(client):
    """Kayit ve giris yaparak JWT token iceren Authorization header doner."""
    client.post('/api/users/register', json={
        'name': 'Test User', 'email': 'route_test@test.com', 'password': '123456'
    })
    resp = client.post('/api/users/login', json={
        'email': 'route_test@test.com', 'password': '123456'
    })
    token = resp.get_json()['token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def sample_user(app):
    """Test icin ornek kullanici olusturur."""
    from app.repositories.user_repository import UserRepository
    with app.app_context():
        user_repo = UserRepository()
        return user_repo.create('Test User', 'route_user@test.com', '123456')


class TestRouteRepository:
    def test_create_route(self, app, route_repo, sample_user):
        with app.app_context():
            user = app.extensions['sqlalchemy'].session.merge(sample_user)
            waypoints = [{'lat': 41.0, 'lng': 28.9, 'name': 'Nokta 1'}]
            route = route_repo.create(user.id, 'Istanbul Turu', 'Aciklama', waypoints)
            assert route.id is not None
            assert route.name == 'Istanbul Turu'

    def test_find_by_user(self, app, route_repo, sample_user):
        with app.app_context():
            user = app.extensions['sqlalchemy'].session.merge(sample_user)
            route_repo.create(user.id, 'Rota 1', '', [])
            route_repo.create(user.id, 'Rota 2', '', [])
            routes = route_repo.find_by_user(user.id)
            assert len(routes) == 2

    def test_find_by_id(self, app, route_repo, sample_user):
        with app.app_context():
            user = app.extensions['sqlalchemy'].session.merge(sample_user)
            route = route_repo.create(user.id, 'Rota 1', '', [])
            found = route_repo.find_by_id(route.id)
            assert found is not None
            assert found.name == 'Rota 1'

    def test_update_route(self, app, route_repo, sample_user):
        with app.app_context():
            user = app.extensions['sqlalchemy'].session.merge(sample_user)
            route = route_repo.create(user.id, 'Eski Ad', '', [])
            updated = route_repo.update(route, 'Yeni Ad', 'Yeni Aciklama', [])
            assert updated.name == 'Yeni Ad'

    def test_delete_route(self, app, route_repo, sample_user):
        with app.app_context():
            user = app.extensions['sqlalchemy'].session.merge(sample_user)
            route = route_repo.create(user.id, 'Silinecek Rota', '', [])
            route_id = route.id
            route_repo.delete(route)
            assert route_repo.find_by_id(route_id) is None

    def test_waypoints_serialization(self, app, route_repo, sample_user):
        with app.app_context():
            user = app.extensions['sqlalchemy'].session.merge(sample_user)
            waypoints = [
                {'lat': 41.01, 'lng': 28.97, 'name': 'Galata'},
                {'lat': 41.00, 'lng': 28.98, 'name': 'Eminonu'},
            ]
            route = route_repo.create(user.id, 'Rota', '', waypoints)
            assert len(route.get_waypoints()) == 2
            assert route.get_waypoints()[0]['name'] == 'Galata'


class TestRouteService:
    def test_create_route_success(self, app, route_service, sample_user):
        with app.app_context():
            user = app.extensions['sqlalchemy'].session.merge(sample_user)
            route = route_service.create_route(
                user.id, 'Test Rota', 'Aciklama',
                [{'lat': 41.0, 'lng': 28.9, 'name': 'Nokta'}]
            )
            assert route.name == 'Test Rota'

    def test_get_user_routes(self, app, route_service, sample_user):
        with app.app_context():
            user = app.extensions['sqlalchemy'].session.merge(sample_user)
            route_service.create_route(user.id, 'Rota A', '', [])
            route_service.create_route(user.id, 'Rota B', '', [])
            routes = route_service.get_user_routes(user.id)
            assert len(routes) == 2

    def test_get_route_by_id(self, app, route_service, sample_user):
        with app.app_context():
            user = app.extensions['sqlalchemy'].session.merge(sample_user)
            route = route_service.create_route(user.id, 'Rota', '', [])
            found = route_service.get_route_by_id(route.id)
            assert found.name == 'Rota'

    def test_delete_route(self, app, route_service, sample_user):
        with app.app_context():
            user = app.extensions['sqlalchemy'].session.merge(sample_user)
            route = route_service.create_route(user.id, 'Silinecek', '', [])
            route_id = route.id
            route_service.delete_route(route)
            assert route_service.get_route_by_id(route_id) is None


class TestRouteAPI:
    def test_create_route_endpoint(self, client, auth_header):
        response = client.post('/api/routes/', json={
            'name': 'Test Rota',
            'description': 'Aciklama',
            'waypoints': [{'lat': 41.0, 'lng': 28.9, 'name': 'Nokta'}]
        }, headers=auth_header)
        assert response.status_code == 201
        assert response.get_json()['route']['name'] == 'Test Rota'

    def test_get_routes_endpoint(self, client, auth_header):
        client.post('/api/routes/', json={
            'name': 'Rota 1', 'description': '', 'waypoints': []
        }, headers=auth_header)
        response = client.get('/api/routes/', headers=auth_header)
        assert response.status_code == 200
        assert len(response.get_json()['routes']) == 1

    def test_delete_route_endpoint(self, client, auth_header):
        create_resp = client.post('/api/routes/', json={
            'name': 'Silinecek', 'description': '', 'waypoints': []
        }, headers=auth_header)
        route_id = create_resp.get_json()['route']['id']
        response = client.delete(f'/api/routes/{route_id}', headers=auth_header)
        assert response.status_code == 200

    def test_get_routes_unauthenticated(self, client):
        response = client.get('/api/routes/')
        assert response.status_code == 401
