from app import db
from datetime import datetime

class Place(db.Model):
    __tablename__ = 'places'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    rating = db.Column(db.Float, default=0.0)
    image_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'city': self.city,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'rating': self.rating,
            'image_url': self.image_url,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<Place {self.name}>'
