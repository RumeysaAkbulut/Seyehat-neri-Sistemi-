from app.repositories.collection_repository import CollectionRepository


class CollectionService:
    def __init__(self):
        self.repo = CollectionRepository()

    def get_user_collections(self, user_id):
        return self.repo.find_by_user(user_id)

    def create_collection(self, user_id, name, emoji='📌', description=None):
        name = (name or '').strip()
        if not name:
            raise ValueError('Koleksiyon adı zorunludur')
        if len(name) > 100:
            raise ValueError('Ad en fazla 100 karakter olabilir')
        return self.repo.create(user_id, name, emoji, description)

    def update_collection(self, user_id, col_id, name=None, emoji=None, description=None):
        col = self.repo.find_by_id(col_id)
        if not col or col.user_id != user_id:
            raise LookupError('Koleksiyon bulunamadı')
        return self.repo.update(col, name=name, emoji=emoji, description=description)

    def delete_collection(self, user_id, col_id):
        col = self.repo.find_by_id(col_id)
        if not col or col.user_id != user_id:
            raise LookupError('Koleksiyon bulunamadı')
        self.repo.delete(col)

    def add_item(self, user_id, col_id, place_id):
        col = self.repo.find_by_id(col_id)
        if not col or col.user_id != user_id:
            raise LookupError('Koleksiyon bulunamadı')
        if place_id is None:
            raise ValueError('place_id zorunludur')
        existing = self.repo.find_item(col_id, place_id)
        if existing:
            return col, False  # already added
        self.repo.add_item(col_id, place_id)
        return col, True

    def remove_item(self, user_id, col_id, place_id):
        col = self.repo.find_by_id(col_id)
        if not col or col.user_id != user_id:
            raise LookupError('Koleksiyon bulunamadı')
        item = self.repo.find_item(col_id, place_id)
        if not item:
            raise LookupError('Mekan bu koleksiyonda değil')
        self.repo.remove_item(item)
        return col
