from app import db
from app.models.user import User

class UserRepository:
    
    def create(self, name, email, password):
        user = User(name=name, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user
    
    def find_by_id(self, user_id):
        return User.query.get(user_id)
    
    def find_by_email(self, email):
        return User.query.filter_by(email=email).first()
    
    def find_all(self):
        return User.query.all()
    
    def update(self, user, **kwargs):
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)
        db.session.commit()
        return user
    
    def delete(self, user):
        db.session.delete(user)
        db.session.commit()
