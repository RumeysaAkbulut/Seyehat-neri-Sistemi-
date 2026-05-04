from app.repositories.user_repository import UserRepository

class UserService:
    def __init__(self):
        self.user_repo = UserRepository()
    def register(self, name, email, password):
        if self.user_repo.find_by_email(email):
            raise ValueError("Bu email adresi zaten kayitli")
        if len(password) < 6:
            raise ValueError("Sifre en az 6 karakter olmali")
        return self.user_repo.create(name, email, password)
    def login(self, email, password):
        user = self.user_repo.find_by_email(email)
        if not user or not user.check_password(password):
            raise ValueError("Email veya sifre hatali")
        return user
