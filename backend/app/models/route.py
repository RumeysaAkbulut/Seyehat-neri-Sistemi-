from app import db
from datetime import datetime
import json

class Route(db.Model):
    __tablename__ = 'routes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    waypoints = db.Column(db.Text, default='[]')  # JSON string: [{lat, lng, name, place_id?}]
    share_token = db.Column(db.String(36), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def get_waypoints(self):
        try:
            return json.loads(self.waypoints or '[]')
        except Exception:
            return []

    def set_waypoints(self, waypoints_list):
        self.waypoints = json.dumps(waypoints_list, ensure_ascii=False)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'waypoints': self.get_waypoints(),
            'share_token': self.share_token,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<Route {self.name}>'
