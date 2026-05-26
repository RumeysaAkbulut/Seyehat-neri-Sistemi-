from app.repositories.user_repository import UserRepository

class UserService:
    
    def __init__(self):
        self.user_repo = UserRepository()
    
    def register(self, name, email, password):
        existing_user = self.user_repo.find_by_email(email)
        if existing_user:
            raise ValueError("Bu email adresi zaten kayitli")
        
        if len(password) < 6:
            raise ValueError("Sifre en az 6 karakter olmali")
        
        if not name or not email:
            raise ValueError("Ad ve email zorunludur")
        
        user = self.user_repo.create(name, email, password)
        return user
    
    def login(self, email, password):
        user = self.user_repo.find_by_email(email)
        if not user or not user.check_password(password):
            raise ValueError("Email veya sifre hatali")
        return user
    
    def get_user(self, user_id):
        user = self.user_repo.find_by_id(user_id)
        if not user:
            raise ValueError("Kullanici bulunamadi")
        return user

    def get_user_by_id(self, user_id):
        return self.user_repo.find_by_id(user_id)
    
    def get_all_users(self):
        return self.user_repo.find_all()
