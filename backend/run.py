from app import create_app, db, _seed_sample_places

app = create_app()

with app.app_context():
    db.create_all()          # Tablolar yoksa oluştur
    _seed_sample_places()    # Eksik örnek mekanları ekle (varsa atla)

if __name__ == '__main__':
    app.run(debug=True, port=5001)