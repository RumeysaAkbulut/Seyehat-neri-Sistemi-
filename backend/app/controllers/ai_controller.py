from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from google import genai
from google.genai import errors as genai_errors
import os
import time
import json as json_lib

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

# Öncelik sırası: daha hafif modeller daha yüksek kotaya sahip olabilir
FALLBACK_MODELS = [
    'gemini-2.0-flash-lite',   # En yüksek ücretsiz kota (30 RPM)
    'gemini-2.0-flash',        # Ana model (15 RPM)
    'gemini-2.5-flash-lite',   # Yeni lite
    'gemini-2.5-flash',        # En yeni flash
]

def _is_quota_error(e):
    """429/RESOURCE_EXHAUSTED veya 403/PERMISSION_DENIED (kota aşımı) kontrolü."""
    code = getattr(e, 'code', None)
    status = getattr(e, 'status', None)
    msg = str(e).lower()
    return (
        code in (429, 403)
        or status in ('RESOURCE_EXHAUSTED', 'PERMISSION_DENIED')
        or '429' in msg
        or 'resource_exhausted' in msg
        or 'quota' in msg
        or 'permission_denied' in msg
    )

def _try_generate(client, prompt):
    """Modelleri sırayla dener; kota aşılırsa sonrakine geçer. (text, model_used, error) döner."""
    last_error = None
    for model in FALLBACK_MODELS:
        try:
            response = client.models.generate_content(model=model, contents=prompt)
            return response.text, model, None
        except genai_errors.ClientError as e:
            if _is_quota_error(e):
                last_error = e
                time.sleep(1)
                continue
            raise
        except Exception:
            raise
    return None, None, last_error

@ai_bp.route('/recommend', methods=['POST'])
@jwt_required()
def recommend():
    data = request.get_json()
    city = data.get('city', '')
    interests = data.get('interests', '')
    duration = data.get('duration', '1 gün')
    budget = data.get('budget', 'orta')

    if not city:
        return jsonify({'error': 'Şehir bilgisi gerekli'}), 400

    prompt = f"""Sen bir seyahat uzmanısın. Kullanıcıya {city} şehri için kişiselleştirilmiş bir gezi rotası öner.

Kullanıcı bilgileri:
- Şehir: {city}
- İlgi alanları: {interests if interests else 'genel turistik yerler'}
- Süre: {duration}
- Bütçe: {budget}

Lütfen şunları içeren bir rota planı oluştur:
1. Sabah, öğlen, akşam olarak ayrılmış ziyaret listesi
2. Her mekan için kısa açıklama ve tahmini ziyaret süresi (örn. "1.5 saat")
3. Ulaşım önerileri
4. Yemek önerileri (kahvaltı, öğle, akşam)
5. Toplam tahmini maliyet
6. Rotanın toplam tahmini süresi (ulaşım ve yemek dahil)

Yanıtı Türkçe olarak ver ve madde madde düzenli bir şekilde yaz.

Yanıt metnini bitirdikten sonra, aşağıdaki formatı kullanarak ziyaret edilecek somut mekanların listesini ekle.

KRİTİK KURALLAR (kesinlikle uy):
- "name" alanına mekanın OpenStreetMap/Nominatim'de aranabilecek ORIJINAL YEREL ADINI yaz (Türkçe çeviri değil).
  Örnekler: "Alcázar de Sevilla", "Sagrada Família", "Topkapı Sarayı", "Eiffel Tower", "Colosseum"
- Şehir adını mekan adına dahil ETME.
- Sadece gerçek, haritada var olan coğrafi yerleri ekle (restoranlar, kafeler dahil edilmesin).
- "duration" alanına o mekanda harcanacak tahmini süreyi yaz (örn. "1 saat", "45 dk", "2 saat").

---PLACES_JSON---
{{"places": [{{"name": "Orijinal Mekan Adı 1", "duration": "1.5 saat"}}, {{"name": "Orijinal Mekan Adı 2", "duration": "45 dk"}}]}}
---END_PLACES_JSON---"""

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return jsonify({'error': 'AI servisi yapılandırılmamış. GEMINI_API_KEY eksik.'}), 503

    try:
        client = genai.Client(api_key=api_key)
        text, model_used, quota_err = _try_generate(client, prompt)

        if quota_err is not None:
            return jsonify({
                'error': 'Günlük Gemini API kotası doldu. Lütfen birkaç dakika sonra tekrar deneyin.',
                'quota_exceeded': True,
            }), 429

        # Mekan listesini JSON bloğundan ayır
        recommendation_text = text
        places = []
        if '---PLACES_JSON---' in text and '---END_PLACES_JSON---' in text:
            try:
                rec_part, rest = text.split('---PLACES_JSON---', 1)
                json_str, _ = rest.split('---END_PLACES_JSON---', 1)
                recommendation_text = rec_part.strip()
                places = json_lib.loads(json_str.strip()).get('places', [])
            except Exception:
                recommendation_text = text
                places = []

        return jsonify({
            'recommendation': recommendation_text,
            'places': places,
            'model': model_used,
        }), 200

    except genai_errors.ClientError as e:
        if _is_quota_error(e):
            return jsonify({
                'error': 'Günlük Gemini API kotası doldu. Lütfen birkaç dakika sonra tekrar deneyin.',
                'quota_exceeded': True,
            }), 429
        return jsonify({'error': f'AI istek hatası: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'AI servisi şu an kullanılamıyor: {str(e)}'}), 500
