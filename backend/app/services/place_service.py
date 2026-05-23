from app.repositories.place_repository import PlaceRepository

class PlaceService:
    def __init__(self):
        self.place_repo = PlaceRepository()
    def add_place(self, name, description, category, city, latitude=None, longitude=None, rating=0.0, image_url=None):
        if not name or not category or not city:
            raise ValueError("Ad, kategori ve sehir zorunludur")
        return self.place_repo.create(name, description, category, city, latitude, longitude, rating, image_url)
    def get_all_places(self):
        return self.place_repo.find_all()
    def filter_by_city(self, city):
        return self.place_repo.find_by_city(city)
    def filter_by_category(self, category):
        return self.place_repo.find_by_category(category)
    def search_places(self, keyword):
        return self.place_repo.search_by_name(keyword)
    def get_place_by_id(self, place_id):
        return self.place_repo.find_by_id(place_id)

    def delete_place(self, place_id):
        place = self.place_repo.find_by_id(place_id)
        if not place:
            raise ValueError("Mekan bulunamadi")
        self.place_repo.delete(place)
