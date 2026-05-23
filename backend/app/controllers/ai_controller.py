from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from google import genai
import os

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

@ai_bp.route('/recommend', methods=['POST'])
@jwt_required()
def recommend():
    data = request.get_json()
    city = data.get('city', '')
    interests = data.get('interests', '')
    duration = data.get('duration', '1 gun')
    budget = data.get('budget', 'orta')

    if not city:
        return jsonify({'error': 'Sehir bilgisi gerekli'}), 400

    prompt = f"""Sen bir seyahat uzmanısın. Kullanıcıya {city} şehri için kişiselleştirilmiş bir gezi rotası öner.

Kullanıcı bilgileri:
- Şehir: {city}
- İlgi alanları: {interests if interests else 'genel turistik yerler'}
- Süre: {duration}
- Bütçe: {budget}

Lütfen şunları içeren bir rota planı oluştur:
1. Sabah, öğlen, akşam olarak ayrılmış ziyaret listesi
2. Her mekan için kısa açıklama ve tahmini ziyaret süresi
3. Ulaşım önerileri
4. Yemek önerileri (kahvaltı, öğle, akşam)
5. Toplam tahmini maliyet

Yanıtı Türkçe olarak ver ve madde madde düzenli bir şekilde yaz."""

    try:
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            return jsonify({'error': 'AI servisi yapılandırılmamış. GEMINI_API_KEY gerekli.'}), 503

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        recommendation = response.text
        return jsonify({'recommendation': recommendation}), 200

    except Exception as e:
        return jsonify({'error': f'AI servisi hatasi: {str(e)}'}), 500
