from app import db
from datetime import datetime

class Review(db.Model):
    __tablename__ = 'reviews'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    place_id = db.Column(db.Integer, nullable=False)  # hem sample hem DB place id'leri desteklenir
    rating = db.Column(db.Float, nullable=False)       # 1.0 – 5.0
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('reviews', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else 'Kullanıcı',
            'place_id': self.place_id,
            'rating': self.rating,
            'comment': self.comment,
            'created_at': self.created_at.isoformat(),
        }

    def __repr__(self):
        return f'<Review place={self.place_id} user={self.user_id} rating={self.rating}>'
