from app.repositories.favorite_repository import FavoriteRepository


class FavoriteService:
    def __init__(self):
        self.repo = FavoriteRepository()

    def get_user_favorites(self, user_id):
        return self.repo.find_by_user(user_id)

    def add_favorite(self, user_id, place_id):
        existing = self.repo.find_by_user_and_place(user_id, place_id)
        if existing:
            raise ValueError('Zaten favorilerde')
        return self.repo.create(user_id, place_id)

    def remove_favorite(self, user_id, place_id):
        fav = self.repo.find_by_user_and_place(user_id, place_id)
        if not fav:
            raise LookupError('Favori bulunamadi')
        self.repo.delete(fav)
