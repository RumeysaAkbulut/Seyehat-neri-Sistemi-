from app import db
from datetime import datetime

class Favorite(db.Model):
    __tablename__ = 'favorites'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    place_id = db.Column(db.Integer, db.ForeignKey('places.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='favorites')
    place = db.relationship('Place', backref='favorited_by')

    __table_args__ = (db.UniqueConstraint('user_id', 'place_id'),)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'place_id': self.place_id,
            'place': self.place.to_dict() if self.place else None,
            'created_at': self.created_at.isoformat()
        }
