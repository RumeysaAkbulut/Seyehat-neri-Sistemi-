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

def create_app(test_config=None):
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

    # Test ortamı: production DB'ye dokunmadan izole bir config kullan
    if test_config:
        app.config.update(test_config)

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
    from app.models.friendship import Friendship  # noqa: F401

    from app.controllers.main_controller import main_bp
    from app.controllers.user_controller import user_bp
    from app.controllers.place_controller import place_bp
    from app.controllers.favorite_controller import favorite_bp
    from app.controllers.ai_controller import ai_bp
    from app.controllers.route_controller import route_bp, share_bp
    from app.controllers.review_controller import review_bp
    from app.controllers.collection_controller import collection_bp
    from app.controllers.activity_controller import activity_bp
    from app.controllers.friendship_controller import friendship_bp
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
    app.register_blueprint(friendship_bp)

    # Seed yalnızca test olmayan ortamda çalışır
    if not test_config:
        with app.app_context():
            _seed_sample_places()

    return app


def _seed_sample_places():
    """DB boşsa örnek mekanları ekle. Tablolar henüz yoksa (test ortamı) sessizce çık."""
    from app.models.place import Place
    try:
        if Place.query.count() > 0:
            return
    except Exception:
        return  # Tablolar henüz oluşturulmamış (test/migration öncesi)
    sample = [
        {"name": "Topkapı Sarayı", "city": "İstanbul", "category": "tarihi",
         "description": "Osmanlı İmparatorluğu'nun görkemli sarayı. 15. yüzyıldan 19. yüzyıla kadar Osmanlı sultanlarına ev sahipliği yapmıştır.",
         "latitude": 41.0115, "longitude": 28.9833, "rating": 4.8,
         "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Topkapi_palace_harem_pool.jpg/640px-Topkapi_palace_harem_pool.jpg"},
        {"name": "Ayasofya", "city": "İstanbul", "category": "tarihi",
         "description": "Bizans ve Osmanlı mimarisinin şaheseri. 537 yılında inşa edilen yapı, dünyanın en önemli mimari eserlerinden biridir.",
         "latitude": 41.0086, "longitude": 28.9802, "rating": 4.9,
         "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Hagia_Sophia_Mars_2013.jpg/640px-Hagia_Sophia_Mars_2013.jpg"},
        {"name": "Galata Kulesi", "city": "İstanbul", "category": "tarihi",
         "description": "İstanbul'un simgelerinden ortaçağ kulesi. Şehrin panoramik manzarasını sunar.",
         "latitude": 41.0256, "longitude": 28.9742, "rating": 4.6,
         "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Galata_tower.jpg/640px-Galata_tower.jpg"},
        {"name": "Kapalıçarşı", "city": "İstanbul", "category": "alışveriş",
         "description": "Dünyanın en büyük ve en eski kapalı çarşılarından biri. 4.000'den fazla dükkan barındırır.",
         "latitude": 41.0108, "longitude": 28.9681, "rating": 4.5,
         "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Grand_Bazaar%2C_Istanbul%2C_2013.jpg/640px-Grand_Bazaar%2C_Istanbul%2C_2013.jpg"},
        {"name": "Anıtkabir", "city": "Ankara", "category": "tarihi",
         "description": "Atatürk'ün anıt mezarı ve müzesi. Türkiye Cumhuriyeti'nin kurucusuna adanmıştır.",
         "latitude": 39.9257, "longitude": 32.8375, "rating": 4.9,
         "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/An%C4%B1tkabir_aerial.jpg/640px-An%C4%B1tkabir_aerial.jpg"},
        {"name": "Ephesus", "city": "İzmir", "category": "tarihi",
         "description": "Antik dünyanın en önemli Yunan şehirlerinden biri. UNESCO Dünya Mirası listesinde yer almaktadır.",
         "latitude": 37.9395, "longitude": 27.3417, "rating": 4.9,
         "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Ephesus_Celsus_Library_Fa%C3%A7ade.jpg/640px-Ephesus_Celsus_Library_Fa%C3%A7ade.jpg"},
        {"name": "Pamukkale", "city": "Denizli", "category": "doğa",
         "description": "Beyaz kireçtaşı terasları ve termal havuzlarıyla ünlü. UNESCO listesindedir.",
         "latitude": 37.9137, "longitude": 29.1187, "rating": 4.8,
         "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Pamukkale_2.jpg/640px-Pamukkale_2.jpg"},
        {"name": "Kapadokya", "city": "Nevşehir", "category": "doğa",
         "description": "Peri bacaları ve balonlu turizmiyle ünlü. Göreme Açık Hava Müzesi UNESCO listesindedir.",
         "latitude": 38.6431, "longitude": 34.8289, "rating": 4.9,
         "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Goreme_Cappadocia.jpg/640px-Goreme_Cappadocia.jpg"},
        {"name": "Safranbolu", "city": "Karabük", "category": "tarihi",
         "description": "UNESCO Dünya Mirası listesindeki Osmanlı evleri. Tarihi kent dokusu korunmaktadır.",
         "latitude": 41.2532, "longitude": 32.6817, "rating": 4.7,
         "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Safranbolu_0292.jpg/640px-Safranbolu_0292.jpg"},
        {"name": "Alaçatı", "city": "İzmir", "category": "eğlence",
         "description": "Taş evleri ve rüzgar sörfüyle ünlü tatil beldesi. Dar sokakları ve butik restoranlarıyla popülerdir.",
         "latitude": 38.2800, "longitude": 26.3760, "rating": 4.7,
         "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Alacati_018.jpg/640px-Alacati_018.jpg"},
    ]
    for p in sample:
        db.session.add(Place(**p))
    db.session.commit()
