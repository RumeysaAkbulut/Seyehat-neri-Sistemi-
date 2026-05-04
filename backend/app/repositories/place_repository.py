from app import db
from app.models.place import Place

class PlaceRepository:
    def create(self, name, description, category, city, latitude=None, longitude=None, rating=0.0):
        place = Place(name=name, description=description, category=category, city=city, latitude=latitude, longitude=longitude, rating=rating)
        db.session.add(place)
        db.session.commit()
        return place
    def find_by_id(self, place_id):
        return Place.query.get(place_id)
    def find_all(self):
        return Place.query.all()
    def find_by_city(self, city):
        return Place.query.filter_by(city=city).all()
    def find_by_category(self, category):
        return Place.query.filter_by(category=category).all()
    def search_by_name(self, keyword):
        return Place.query.filter(Place.name.ilike(f'%{keyword}%')).all()
    def delete(self, place):
        db.session.delete(place)
        db.session.commit()
