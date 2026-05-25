import pytest
from app import create_app, db
from app.models.user import User
from app.models.place import Place
from app.repositories.review_repository import ReviewRepository
from app.services.review_service import ReviewService


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
def seeded(app):
    """Veritabanına test kullanıcısı ve mekanı ekler."""
    with app.app_context():
        user = User(name='Test', email='t@t.com')
        user.set_password('123456')
        db.session.add(user)
        place = Place(name='Ayasofya', description='Muze', category='muze', city='Istanbul')
        db.session.add(place)
        db.session.commit()
        yield user.id, place.id


@pytest.fixture
def review_repo(app):
    return ReviewRepository()


@pytest.fixture
def review_service(app):
    return ReviewService()


class TestReviewRepository:
    def test_create_and_find(self, app, seeded, review_repo):
        with app.app_context():
            user_id, place_id = seeded
            review = review_repo.create(user_id, place_id, 4.5, 'Harika')
            assert review.id is not None
            assert review.rating == 4.5

            reviews = review_repo.find_by_place(place_id)
            assert len(reviews) == 1

    def test_average_rating(self, app, seeded, review_repo):
        with app.app_context():
            user_id, place_id = seeded
            review_repo.create(user_id, place_id, 4.0, 'İyi')
            avg, count = review_repo.average_rating(place_id)
            assert avg == 4.0
            assert count == 1

    def test_update_review(self, app, seeded, review_repo):
        with app.app_context():
            user_id, place_id = seeded
            review = review_repo.create(user_id, place_id, 3.0, 'Orta')
            updated = review_repo.update(review, rating=5.0)
            assert updated.rating == 5.0

    def test_delete_review(self, app, seeded, review_repo):
        with app.app_context():
            user_id, place_id = seeded
            review = review_repo.create(user_id, place_id, 4.0, 'İyi')
            review_repo.delete(review)
            reviews = review_repo.find_by_place(place_id)
            assert len(reviews) == 0


class TestReviewService:
    def test_add_review(self, app, seeded, review_service):
        with app.app_context():
            user_id, place_id = seeded
            review, updated = review_service.add_or_update_review(user_id, place_id, 5.0, 'Mükemmel')
            assert review.rating == 5.0
            assert updated is False

    def test_update_existing_review(self, app, seeded, review_service):
        with app.app_context():
            user_id, place_id = seeded
            review_service.add_or_update_review(user_id, place_id, 3.0, 'Orta')
            review, updated = review_service.add_or_update_review(user_id, place_id, 5.0, 'Düzeldi')
            assert updated is True
            assert review.rating == 5.0

    def test_invalid_rating(self, app, seeded, review_service):
        with app.app_context():
            user_id, place_id = seeded
            with pytest.raises(ValueError, match='1 ile 5'):
                review_service.add_or_update_review(user_id, place_id, 6.0, '')

    def test_delete_own_review(self, app, seeded, review_service):
        with app.app_context():
            user_id, place_id = seeded
            review, _ = review_service.add_or_update_review(user_id, place_id, 4.0, 'İyi')
            review_service.delete_review(user_id, place_id, review.id)
            reviews, _ = review_service.get_reviews(place_id)
            assert len(reviews) == 0

    def test_delete_others_review_forbidden(self, app, seeded, review_service):
        with app.app_context():
            user_id, place_id = seeded
            review, _ = review_service.add_or_update_review(user_id, place_id, 4.0, 'İyi')
            with pytest.raises(PermissionError):
                review_service.delete_review(999, place_id, review.id)
