from app import db
from app.models.favorite import Favorite


class FavoriteRepository:
    def find_by_user(self, user_id):
        return Favorite.query.filter_by(user_id=user_id).all()

    def find_by_user_and_place(self, user_id, place_id):
        return Favorite.query.filter_by(user_id=user_id, place_id=place_id).first()

    def find_by_id(self, fav_id):
        return Favorite.query.get(fav_id)

    def create(self, user_id, place_id):
        fav = Favorite(user_id=user_id, place_id=place_id)
        db.session.add(fav)
        db.session.commit()
        return fav

    def delete(self, fav):
        db.session.delete(fav)
        db.session.commit()
