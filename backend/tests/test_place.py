import pytest
from app import create_app, db
from app.repositories.place_repository import PlaceRepository
from app.services.place_service import PlaceService

@pytest.fixture
def app():
    app = create_app()
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['TESTING'] = True
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def place_repo(app):
    return PlaceRepository()

@pytest.fixture
def place_service(app):
    return PlaceService()

@pytest.fixture
def auth_header(client):
    """Kayıt ve giriş yaparak JWT token içeren Authorization header döner."""
    client.post('/api/users/register', json={
        'name': 'Test', 'email': 'place_test@test.com', 'password': '123456'
    })
    resp = client.post('/api/users/login', json={
        'email': 'place_test@test.com', 'password': '123456'
    })
    token = resp.get_json()['token']
    return {'Authorization': f'Bearer {token}'}

class TestPlaceRepository:
    def test_create_place(self, app, place_repo):
        with app.app_context():
            place = place_repo.create("Ayasofya", "Tarihi muze", "muze", "Istanbul", 41.0, 28.9)
            assert place.id is not None
            assert place.name == "Ayasofya"

    def test_find_by_city(self, app, place_repo):
        with app.app_context():
            place_repo.create("Ayasofya", "Muze", "muze", "Istanbul")
            place_repo.create("Anit Kabir", "Anit", "anit", "Ankara")
            results = place_repo.find_by_city("Istanbul")
            assert len(results) == 1

    def test_search_by_name(self, app, place_repo):
        with app.app_context():
            place_repo.create("Ayasofya", "Muze", "muze", "Istanbul")
            place_repo.create("Topkapi", "Saray", "muze", "Istanbul")
            results = place_repo.search_by_name("aya")
            assert len(results) == 1

class TestPlaceService:
    def test_add_place_success(self, app, place_service):
        with app.app_context():
            place = place_service.add_place("Ayasofya", "Muze", "muze", "Istanbul")
            assert place.name == "Ayasofya"

    def test_add_place_missing_fields(self, app, place_service):
        with app.app_context():
            with pytest.raises(ValueError, match="zorunludur"):
                place_service.add_place("", "", "", "")

    def test_filter_by_category(self, app, place_service):
        with app.app_context():
            place_service.add_place("Ayasofya", "Muze", "muze", "Istanbul")
            place_service.add_place("Belgrad Ormani", "Orman", "park", "Istanbul")
            results = place_service.filter_by_category("muze")
            assert len(results) == 1

class TestPlaceAPI:
    def test_add_place_endpoint(self, client, auth_header):
        response = client.post('/api/places/', json={
            'name': 'Ayasofya', 'description': 'Tarihi muze',
            'category': 'muze', 'city': 'Istanbul'
        }, headers=auth_header)
        assert response.status_code == 201

    def test_get_places_endpoint(self, client, auth_header):
        client.post('/api/places/', json={
            'name': 'Ayasofya', 'description': 'Muze',
            'category': 'muze', 'city': 'Istanbul'
        }, headers=auth_header)
        response = client.get('/api/places/', headers=auth_header)
        assert response.status_code == 200

    def test_filter_by_city_endpoint(self, client, auth_header):
        client.post('/api/places/', json={'name': 'Ayasofya', 'description': 'Muze', 'category': 'muze', 'city': 'Istanbul'}, headers=auth_header)
        client.post('/api/places/', json={'name': 'Anit Kabir', 'description': 'Anit', 'category': 'anit', 'city': 'Ankara'}, headers=auth_header)
        response = client.get('/api/places/?city=Istanbul', headers=auth_header)
        data = response.get_json()
        assert len(data['places']) == 1
