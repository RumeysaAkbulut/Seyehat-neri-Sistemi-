import pytest
from app import create_app, db
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.user_service import UserService

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
def user_repo(app):
    return UserRepository()

@pytest.fixture
def user_service(app):
    return UserService()

class TestUserModel:
    
    def test_user_set_password(self, app):
        with app.app_context():
            user = User(name="Test", email="test@test.com")
            user.set_password("123456")
            assert user.password_hash is not None
            assert user.password_hash != "123456"
    
    def test_user_check_password(self, app):
        with app.app_context():
            user = User(name="Test", email="test@test.com")
            user.set_password("123456")
            assert user.check_password("123456") == True
            assert user.check_password("yanlis") == False

class TestUserRepository:
    
    def test_create_user(self, app, user_repo):
        with app.app_context():
            user = user_repo.create("Rumeysa", "rumeysa@test.com", "123456")
            assert user.id is not None
            assert user.name == "Rumeysa"
    
    def test_find_by_email(self, app, user_repo):
        with app.app_context():
            user_repo.create("Rumeysa", "rumeysa@test.com", "123456")
            found = user_repo.find_by_email("rumeysa@test.com")
            assert found is not None
            assert found.name == "Rumeysa"

class TestUserService:
    
    def test_register_success(self, app, user_service):
        with app.app_context():
            user = user_service.register("Rumeysa", "rumeysa@test.com", "123456")
            assert user.name == "Rumeysa"
    
    def test_register_duplicate_email(self, app, user_service):
        with app.app_context():
            user_service.register("Rumeysa", "rumeysa@test.com", "123456")
            with pytest.raises(ValueError, match="zaten kayitli"):
                user_service.register("Baska", "rumeysa@test.com", "123456")
    
    def test_register_short_password(self, app, user_service):
        with app.app_context():
            with pytest.raises(ValueError, match="en az 6 karakter"):
                user_service.register("Test", "test@test.com", "123")
    
    def test_login_success(self, app, user_service):
        with app.app_context():
            user_service.register("Rumeysa", "rumeysa@test.com", "123456")
            user = user_service.login("rumeysa@test.com", "123456")
            assert user.name == "Rumeysa"
    
    def test_login_wrong_password(self, app, user_service):
        with app.app_context():
            user_service.register("Rumeysa", "rumeysa@test.com", "123456")
            with pytest.raises(ValueError, match="hatali"):
                user_service.login("rumeysa@test.com", "yanlis")

class TestUserAPI:
    
    def test_register_endpoint(self, client):
        response = client.post('/api/users/register', json={
            'name': 'Rumeysa',
            'email': 'rumeysa@test.com',
            'password': '123456'
        })
        assert response.status_code == 201
    
    def test_login_endpoint(self, client):
        client.post('/api/users/register', json={
            'name': 'Rumeysa',
            'email': 'rumeysa@test.com',
            'password': '123456'
        })
        response = client.post('/api/users/login', json={
            'email': 'rumeysa@test.com',
            'password': '123456'
        })
        assert response.status_code == 200
