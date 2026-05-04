from flask import Blueprint, jsonify

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return jsonify({
        'message': 'AI Destekli Seyahat Oneri Sistemi API',
        'version': '1.0.0',
        'status': 'active'
    })

@main_bp.route('/health')
def health_check():
    return jsonify({'status': 'healthy'})
