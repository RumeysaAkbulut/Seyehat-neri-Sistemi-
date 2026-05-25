from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    # Render, DATABASE_URL'i "postgres://" formatında verir; SQLAlchemy "postgresql://" ister.
    database_url = os.getenv('DATABASE_URL', 'sqlite:///travel.db')
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)

    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400 * 7  # 7 gün

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Production'da yalnızca frontend domain'inden gelen isteklere izin ver
    frontend_url = os.getenv('FRONTEND_URL', '*')
    CORS(app, origins=frontend_url)

    from app.models.user import User  # noqa: F401
    from app.models.favorite import Favorite  # noqa: F401
    from app.models.route import Route  # noqa: F401
    from app.models.review import Review  # noqa: F401
    from app.models.collection import Collection, CollectionItem  # noqa: F401

    from app.controllers.main_controller import main_bp
    from app.controllers.user_controller import user_bp
    from app.controllers.place_controller import place_bp
    from app.controllers.favorite_controller import favorite_bp
    from app.controllers.ai_controller import ai_bp
    from app.controllers.route_controller import route_bp, share_bp
    from app.controllers.review_controller import review_bp
    from app.controllers.collection_controller import collection_bp
    from app.controllers.activity_controller import activity_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(place_bp)
    app.register_blueprint(favorite_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(route_bp)
    app.register_blueprint(share_bp)
    app.register_blueprint(review_bp)
    app.register_blueprint(collection_bp)
    app.register_blueprint(activity_bp)

    return app
