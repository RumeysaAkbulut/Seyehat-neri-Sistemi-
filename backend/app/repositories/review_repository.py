from app import db
from app.models.review import Review


class ReviewRepository:
    def find_by_place(self, place_id):
        return Review.query.filter_by(place_id=place_id).order_by(Review.created_at.desc()).all()

    def find_by_user_and_place(self, user_id, place_id):
        return Review.query.filter_by(user_id=user_id, place_id=place_id).first()

    def find_by_id(self, review_id):
        return Review.query.get(review_id)

    def create(self, user_id, place_id, rating, comment=''):
        review = Review(user_id=user_id, place_id=place_id, rating=float(rating), comment=comment)
        db.session.add(review)
        db.session.commit()
        return review

    def update(self, review, rating=None, comment=None):
        if rating is not None:
            review.rating = float(rating)
        if comment is not None:
            review.comment = comment
        db.session.commit()
        return review

    def delete(self, review):
        db.session.delete(review)
        db.session.commit()

    def average_rating(self, place_id):
        reviews = self.find_by_place(place_id)
        if not reviews:
            return None, 0
        avg = round(sum(r.rating for r in reviews) / len(reviews), 2)
        return avg, len(reviews)
