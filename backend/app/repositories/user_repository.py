from app import db
from app.models.user import User

class UserRepository:
    def create(self, name, email, password):
        user = User(name=name, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user
    def find_by_email(self, email):
        return User.query.filter_by(email=email).first()
    def find_by_id(self, user_id):
        return User.query.get(user_id)
    def find_all(self):
        return User.query.all()
