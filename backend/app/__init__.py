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

    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL',
        'sqlite:///travel.db'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400 * 7  # 7 gün

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app)

    from app.models.user import User
    from app.models.favorite import Favorite
    from app.models.route import Route
    from app.models.review import Review
    from app.models.collection import Collection, CollectionItem

    from app.controllers.main_controller import main_bp
    from app.controllers.user_controller import user_bp
    from app.controllers.place_controller import place_bp
    from app.controllers.favorite_controller import favorite_bp
    from app.controllers.ai_controller import ai_bp
    from app.controllers.route_controller import route_bp, share_bp
    from app.controllers.review_controller import review_bp
    from app.controllers.collection_controller import collection_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(place_bp)
    app.register_blueprint(favorite_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(route_bp)
    app.register_blueprint(share_bp)
    app.register_blueprint(review_bp)
    app.register_blueprint(collection_bp)


    return app

