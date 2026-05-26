from app.repositories.review_repository import ReviewRepository
from app.repositories.place_repository import PlaceRepository


class ReviewService:
    def __init__(self):
        self.repo = ReviewRepository()
        self.place_repo = PlaceRepository()

    def get_reviews(self, place_id):
        reviews = self.repo.find_by_place(place_id)
        avg = round(sum(r.rating for r in reviews) / len(reviews), 1) if reviews else None
        return reviews, avg

    def add_or_update_review(self, user_id, place_id, rating, comment=''):
        if not (1 <= float(rating) <= 5):
            raise ValueError('Puan 1 ile 5 arasında olmalıdır')

        existing = self.repo.find_by_user_and_place(user_id, place_id)
        if existing:
            review = self.repo.update(existing, rating=rating, comment=comment or existing.comment)
            updated = True
        else:
            review = self.repo.create(user_id, place_id, rating, comment)
            updated = False

        self._sync_place_rating(place_id)
        return review, updated

    def delete_review(self, user_id, place_id, review_id):
        review = self.repo.find_by_id(review_id)
        if not review or review.place_id != place_id:
            raise LookupError('Yorum bulunamadı')
        if review.user_id != user_id:
            raise PermissionError('Yetkisiz işlem')
        self.repo.delete(review)
        self._sync_place_rating(place_id)

    def _sync_place_rating(self, place_id):
        avg, _ = self.repo.average_rating(place_id)
        place = self.place_repo.find_by_id(place_id)
        if place and avg is not None:
            place.rating = avg
            from app import db
            db.session.commit()
        return avg
