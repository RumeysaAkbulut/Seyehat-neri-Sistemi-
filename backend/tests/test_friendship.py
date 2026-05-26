import pytest
from app import create_app, db
from app.repositories.friendship_repository import FriendshipRepository

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
def friendship_repo(app):
    return FriendshipRepository()


def create_user(client, name, email, password='123456'):
    client.post('/api/users/register', json={
        'name': name, 'email': email, 'password': password
    })
    resp = client.post('/api/users/login', json={
        'email': email, 'password': password
    })
    data = resp.get_json()
    token = data['token']
    user_id = data['user']['id']
    return {'Authorization': f'Bearer {token}'}, user_id


@pytest.fixture
def user_a(client):
    return create_user(client, 'Kullanici A', 'user_a@test.com')


@pytest.fixture
def user_b(client):
    return create_user(client, 'Kullanici B', 'user_b@test.com')


@pytest.fixture
def user_a_header(user_a):
    return user_a[0]


@pytest.fixture
def user_b_header(user_b):
    return user_b[0]


class TestFriendshipRepository:
    def test_follow_user(self, app, friendship_repo):
        with app.app_context():
            from app.repositories.user_repository import UserRepository
            user_repo = UserRepository()
            user_a = user_repo.create('Kullanici A', 'a@test.com', '123456')
            user_b = user_repo.create('Kullanici B', 'b@test.com', '123456')
            friendship = friendship_repo.follow(user_a.id, user_b.id)
            assert friendship.id is not None
            assert friendship.follower_id == user_a.id
            assert friendship.following_id == user_b.id

    def test_find_friendship(self, app, friendship_repo):
        with app.app_context():
            from app.repositories.user_repository import UserRepository
            user_repo = UserRepository()
            user_a = user_repo.create('A', 'aa@test.com', '123456')
            user_b = user_repo.create('B', 'bb@test.com', '123456')
            friendship_repo.follow(user_a.id, user_b.id)
            found = friendship_repo.find(user_a.id, user_b.id)
            assert found is not None

    def test_unfollow_user(self, app, friendship_repo):
        with app.app_context():
            from app.repositories.user_repository import UserRepository
            user_repo = UserRepository()
            user_a = user_repo.create('A', 'aaa@test.com', '123456')
            user_b = user_repo.create('B', 'bbb@test.com', '123456')
            friendship_repo.follow(user_a.id, user_b.id)
            f = friendship_repo.find(user_a.id, user_b.id)
            friendship_repo.unfollow(f)
            assert friendship_repo.find(user_a.id, user_b.id) is None

    def test_get_following_ids(self, app, friendship_repo):
        with app.app_context():
            from app.repositories.user_repository import UserRepository
            user_repo = UserRepository()
            user_a = user_repo.create('A', 'aaaa@test.com', '123456')
            user_b = user_repo.create('B', 'bbbb@test.com', '123456')
            user_c = user_repo.create('C', 'cccc@test.com', '123456')
            friendship_repo.follow(user_a.id, user_b.id)
            friendship_repo.follow(user_a.id, user_c.id)
            ids = friendship_repo.get_following_ids(user_a.id)
            assert user_b.id in ids
            assert user_c.id in ids

    def test_search_users(self, app, friendship_repo):
        with app.app_context():
            from app.repositories.user_repository import UserRepository
            user_repo = UserRepository()
            user_a = user_repo.create('Ahmet Yilmaz', 'ahmet@test.com', '123456')
            user_repo.create('Mehmet Kaya', 'mehmet@test.com', '123456')
            results = friendship_repo.search_users(user_a.id, 'mehmet')
            assert len(results) == 1
            assert results[0].name == 'Mehmet Kaya'

    def test_no_duplicate_follow(self, app, friendship_repo):
        with app.app_context():
            from app.repositories.user_repository import UserRepository
            from sqlalchemy.exc import IntegrityError
            user_repo = UserRepository()
            user_a = user_repo.create('A', 'a1@test.com', '123456')
            user_b = user_repo.create('B', 'b1@test.com', '123456')
            friendship_repo.follow(user_a.id, user_b.id)
            with pytest.raises(IntegrityError):
                friendship_repo.follow(user_a.id, user_b.id)


class TestFriendshipAPI:
    def test_follow_user_endpoint(self, client, user_a, user_b):
        user_a_header, _ = user_a
        _, user_b_id = user_b
        response = client.post(
            f'/api/social/follow/{user_b_id}',
            headers=user_a_header
        )
        assert response.status_code == 201

    def test_follow_self_not_allowed(self, client, user_a):
        user_a_header, user_a_id = user_a
        response = client.post(
            f'/api/social/follow/{user_a_id}',
            headers=user_a_header
        )
        assert response.status_code == 400

    def test_unfollow_user_endpoint(self, client, user_a, user_b):
        user_a_header, _ = user_a
        _, user_b_id = user_b
        client.post(f'/api/social/follow/{user_b_id}', headers=user_a_header)
        response = client.delete(
            f'/api/social/unfollow/{user_b_id}',
            headers=user_a_header
        )
        assert response.status_code == 200

    def test_get_following_endpoint(self, client, user_a, user_b):
        user_a_header, _ = user_a
        _, user_b_id = user_b
        client.post(f'/api/social/follow/{user_b_id}', headers=user_a_header)
        response = client.get('/api/social/following', headers=user_a_header)
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['following']) == 1

    def test_search_users_endpoint(self, client, user_a, user_b):
        user_a_header, _ = user_a
        response = client.get(
            '/api/social/search?q=Kullanici',
            headers=user_a_header
        )
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['users']) >= 1

    def test_search_short_query(self, client, user_a):
        user_a_header, _ = user_a
        response = client.get('/api/social/search?q=a', headers=user_a_header)
        assert response.status_code == 200
        assert response.get_json()['users'] == []

    def test_social_feed_endpoint(self, client, user_a):
        user_a_header, _ = user_a
        response = client.get('/api/social/feed', headers=user_a_header)
        assert response.status_code == 200
        assert 'activities' in response.get_json()

    def test_unauthenticated_access(self, client):
        response = client.get('/api/social/following')
        assert response.status_code == 401
