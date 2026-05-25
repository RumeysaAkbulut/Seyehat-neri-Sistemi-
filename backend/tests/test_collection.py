import pytest
from app import create_app, db
from app.models.user import User
from app.repositories.collection_repository import CollectionRepository
from app.services.collection_service import CollectionService


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
def user_id(app):
    with app.app_context():
        user = User(name='Test', email='t@t.com')
        user.set_password('123456')
        db.session.add(user)
        db.session.commit()
        yield user.id


@pytest.fixture
def col_repo(app):
    return CollectionRepository()


@pytest.fixture
def col_service(app):
    return CollectionService()


class TestCollectionRepository:
    def test_create_and_find(self, app, user_id, col_repo):
        with app.app_context():
            col = col_repo.create(user_id, 'Favorilerim', '❤️')
            assert col.id is not None
            assert col.name == 'Favorilerim'

            cols = col_repo.find_by_user(user_id)
            assert len(cols) == 1

    def test_add_and_remove_item(self, app, user_id, col_repo):
        with app.app_context():
            col = col_repo.create(user_id, 'Liste', '📌')
            col_repo.add_item(col.id, 42)
            item = col_repo.find_item(col.id, 42)
            assert item is not None
            col_repo.remove_item(item)
            assert col_repo.find_item(col.id, 42) is None

    def test_delete_collection(self, app, user_id, col_repo):
        with app.app_context():
            col = col_repo.create(user_id, 'Silinecek', '🗑️')
            col_repo.delete(col)
            assert col_repo.find_by_id(col.id) is None


class TestCollectionService:
    def test_create_valid(self, app, user_id, col_service):
        with app.app_context():
            col = col_service.create_collection(user_id, 'İstanbul Turu')
            assert col.name == 'İstanbul Turu'

    def test_create_empty_name(self, app, user_id, col_service):
        with app.app_context():
            with pytest.raises(ValueError, match='zorunludur'):
                col_service.create_collection(user_id, '')

    def test_create_name_too_long(self, app, user_id, col_service):
        with app.app_context():
            with pytest.raises(ValueError, match='100 karakter'):
                col_service.create_collection(user_id, 'A' * 101)

    def test_add_item_duplicate(self, app, user_id, col_service):
        with app.app_context():
            col = col_service.create_collection(user_id, 'Test')
            _, added1 = col_service.add_item(user_id, col.id, 7)
            _, added2 = col_service.add_item(user_id, col.id, 7)
            assert added1 is True
            assert added2 is False

    def test_delete_wrong_user(self, app, user_id, col_service):
        with app.app_context():
            col = col_service.create_collection(user_id, 'Test')
            with pytest.raises(LookupError):
                col_service.delete_collection(999, col.id)
