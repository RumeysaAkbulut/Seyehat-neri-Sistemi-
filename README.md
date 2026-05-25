# Seyahat Öneri Sistemi

Kişiselleştirilmiş seyahat rotaları oluşturmaya yarayan full-stack web uygulaması. Kullanıcılar mekanları keşfedebilir, AI destekli rota önerileri alabilir, interaktif harita üzerinde rota planlayabilir ve koleksiyonlar oluşturabilir.

![CI Pipeline](https://github.com/rumeysaakbulut/Seyehat-neri-Sistemi-/actions/workflows/ci.yml/badge.svg)

---

## Özellikler

| Kategori | Özellik |
|---|---|
| **Kullanıcı** | Kayıt / giriş (JWT), profil güncelleme, şifre değiştirme |
| **Mekanlar** | Listeleme, arama, kategori & şehir filtreleme, detay sayfası |
| **Favoriler** | Mekanları favorilere ekleme / çıkarma, filtre ile görüntüleme |
| **Koleksiyonlar** | Özel listeler oluşturma, emoji seçimi, mekan ekleme / çıkarma |
| **Yorumlar** | 1-5 puan verme, metin yorum, ortalama puan hesaplama |
| **Harita** | Leaflet interaktif harita, Overpass API POI çekme, rota oluşturma, GPS konumu |
| **Rotalar** | Harita üzerinde tıklayarak rota oluşturma, en yakın komşu optimizasyonu, kaydetme |
| **AI Rota** | Gemini API ile kişiselleştirilmiş gezi planı, Photon geocoding ile haritada gösterme |
| **Aktiviteler** | Aktivite listeleme ve keşfetme |

---

## Teknoloji Yığını

### Backend
- **Python 3.11** + **Flask 3.x**
- **SQLAlchemy** ORM + **Flask-Migrate** (Alembic)
- **Flask-JWT-Extended** — JWT kimlik doğrulama
- **Google Gemini API** — AI rota önerileri (`gemini-2.0-flash` + fallback modeller)
- **SQLite** (geliştirme)
- **pytest** — birim ve entegrasyon testleri

### Frontend
- **React 18** (Create React App)
- **React Router v6** — SPA yönlendirme
- **Leaflet + React-Leaflet** — interaktif harita
- **Axios** — HTTP istekleri
- **Photon (komoot.io)** + **Nominatim** — coğrafi kodlama

### CI/CD
- **GitHub Actions** — push/PR'da otomatik test ve build

---

## Mimari

Proje temiz katmanlı mimari ilkelerine göre yapılandırılmıştır:

```
backend/
├── app/
│   ├── models/          # SQLAlchemy veri modelleri
│   ├── repositories/    # Veri erişim katmanı (Repository Pattern)
│   ├── services/        # İş mantığı katmanı (Service Layer)
│   └── controllers/     # HTTP istek / yanıt katmanı (Blueprint)
```

Her özellik için:
- **Model** → veri şeması
- **Repository** → ham veritabanı işlemleri (`db.session`)
- **Service** → iş kuralları ve doğrulama
- **Controller** → HTTP endpoint'leri, yalnızca service'i çağırır

---

## Kurulum

### Gereksinimler
- Python 3.11+
- Node.js 18+
- Gemini API anahtarı ([Google AI Studio](https://aistudio.google.com/app/apikey))

### 1. Repoyu klonla
```bash
git clone https://github.com/rumeysaakbulut/Seyehat-neri-Sistemi-.git
cd Seyehat-neri-Sistemi-
```

### 2. Backend kurulumu
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

`.env` dosyası oluştur:
```env
SECRET_KEY=gizli-bir-anahtar
JWT_SECRET_KEY=jwt-gizli-anahtar
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
DATABASE_URL=sqlite:///travel.db   # opsiyonel
```

Veritabanını başlat ve uygulamayı çalıştır:
```bash
flask db upgrade
python run.py
```

Backend `http://localhost:5000` adresinde çalışır.

### 3. Frontend kurulumu
```bash
cd frontend
npm install
npm start
```

Frontend `http://localhost:3000` adresinde çalışır.

---

## Testleri Çalıştırma

```bash
cd backend
python -m pytest tests/ -v
```

Test kapsamı:
- `test_user.py` — kullanıcı modeli, repository, service, API endpoint'leri
- `test_place.py` — mekan repository, service, API endpoint'leri
- `test_review.py` — yorum repository ve service
- `test_collection.py` — koleksiyon repository ve service

---

## API Endpoint'leri

### Kimlik Doğrulama
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/users/register` | Yeni kullanıcı kaydı |
| POST | `/api/users/login` | Giriş, JWT token döner |
| GET | `/api/users/profile` | Profil bilgisi (JWT) |
| PUT | `/api/users/profile` | Profil güncelleme (JWT) |

### Mekanlar
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/places/` | Tüm mekanlar (filtre: city, category, search) |
| POST | `/api/places/` | Mekan ekle |
| GET | `/api/places/<id>` | Mekan detayı |
| DELETE | `/api/places/<id>` | Mekan sil |

### Favoriler (JWT gerekli)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/favorites/` | Kullanıcının favorileri |
| POST | `/api/favorites/<place_id>` | Favoriye ekle |
| DELETE | `/api/favorites/<place_id>` | Favoriden çıkar |

### Koleksiyonlar (JWT gerekli)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/collections/` | Kullanıcının koleksiyonları |
| POST | `/api/collections/` | Yeni koleksiyon oluştur |
| PUT | `/api/collections/<id>` | Koleksiyon güncelle |
| DELETE | `/api/collections/<id>` | Koleksiyon sil |
| POST | `/api/collections/<id>/items` | Koleksiyona mekan ekle |
| DELETE | `/api/collections/<id>/items/<place_id>` | Koleksiyondan mekan çıkar |

### Yorumlar (JWT gerekli)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/reviews/<place_id>` | Mekana ait yorumlar |
| POST | `/api/reviews/<place_id>` | Yorum ekle / güncelle |
| DELETE | `/api/reviews/<place_id>/<review_id>` | Yorum sil |

### Rotalar (JWT gerekli)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/routes/` | Kullanıcının rotaları |
| POST | `/api/routes/` | Rota kaydet |
| DELETE | `/api/routes/<id>` | Rota sil |

### AI (JWT gerekli)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/ai/recommend` | Gemini ile kişiselleştirilmiş rota önerisi |

---

## Proje Yapısı

```
Seyehat-neri-Sistemi-/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
├── backend/
│   ├── app/
│   │   ├── __init__.py         # Flask uygulama fabrikası
│   │   ├── models/             # SQLAlchemy modelleri
│   │   │   ├── user.py
│   │   │   ├── place.py
│   │   │   ├── review.py
│   │   │   ├── favorite.py
│   │   │   ├── collection.py
│   │   │   └── route.py
│   │   ├── repositories/       # Veri erişim katmanı
│   │   │   ├── user_repository.py
│   │   │   ├── place_repository.py
│   │   │   ├── review_repository.py
│   │   │   ├── collection_repository.py
│   │   │   └── favorite_repository.py
│   │   ├── services/           # İş mantığı katmanı
│   │   │   ├── user_service.py
│   │   │   ├── place_service.py
│   │   │   ├── review_service.py
│   │   │   ├── collection_service.py
│   │   │   └── favorite_service.py
│   │   └── controllers/        # Blueprint endpoint'leri
│   │       ├── user_controller.py
│   │       ├── place_controller.py
│   │       ├── review_controller.py
│   │       ├── collection_controller.py
│   │       ├── favorite_controller.py
│   │       ├── route_controller.py
│   │       ├── activity_controller.py
│   │       └── ai_controller.py
│   ├── tests/
│   │   ├── test_user.py
│   │   ├── test_place.py
│   │   ├── test_review.py
│   │   └── test_collection.py
│   ├── requirements.txt
│   └── run.py
└── frontend/
    ├── public/
    └── src/
        ├── components/         # Yeniden kullanılabilir bileşenler
        │   └── Navbar.js
        ├── pages/              # Sayfa bileşenleri
        │   ├── Home.js
        │   ├── Login.js
        │   ├── Register.js
        │   ├── Profile.js      # Profil + Rotalarım + Koleksiyonlar (sekmeler)
        │   ├── Places.js
        │   ├── PlaceDetail.js
        │   ├── MapPage.js
        │   ├── AIRecommend.js
        │   ├── Activities.js
        │   ├── Routes.js
        │   └── Collections.js
        ├── theme.js
        └── App.js
```

---

## Lisans

MIT
