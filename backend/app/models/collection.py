from app import db
from datetime import datetime

class Collection(db.Model):
    __tablename__ = 'collections'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    emoji = db.Column(db.String(10), default='📌')
    description = db.Column(db.String(300), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('collections', lazy=True))
    items = db.relationship('CollectionItem', backref='collection', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'emoji': self.emoji,
            'description': self.description,
            'item_count': len(self.items),
            'place_ids': [item.place_id for item in self.items],
            'created_at': self.created_at.isoformat(),
        }


class CollectionItem(db.Model):
    __tablename__ = 'collection_items'

    id = db.Column(db.Integer, primary_key=True)
    collection_id = db.Column(db.Integer, db.ForeignKey('collections.id'), nullable=False)
    place_id = db.Column(db.Integer, nullable=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('collection_id', 'place_id', name='uq_collection_place'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'collection_id': self.collection_id,
            'place_id': self.place_id,
            'added_at': self.added_at.isoformat(),
        }
