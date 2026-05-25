from app import db
from app.models.collection import Collection, CollectionItem


class CollectionRepository:
    def find_by_user(self, user_id):
        return Collection.query.filter_by(user_id=user_id).order_by(Collection.created_at.desc()).all()

    def find_by_id(self, col_id):
        return Collection.query.get(col_id)

    def create(self, user_id, name, emoji='📌', description=None):
        col = Collection(user_id=user_id, name=name, emoji=emoji, description=description)
        db.session.add(col)
        db.session.commit()
        return col

    def update(self, col, name=None, emoji=None, description=None):
        if name:
            col.name = name
        if emoji is not None:
            col.emoji = emoji or '📌'
        if description is not None:
            col.description = description or None
        db.session.commit()
        return col

    def delete(self, col):
        db.session.delete(col)
        db.session.commit()

    def find_item(self, col_id, place_id):
        return CollectionItem.query.filter_by(collection_id=col_id, place_id=place_id).first()

    def add_item(self, col_id, place_id):
        item = CollectionItem(collection_id=col_id, place_id=int(place_id))
        db.session.add(item)
        db.session.commit()
        return item

    def remove_item(self, item):
        db.session.delete(item)
        db.session.commit()
