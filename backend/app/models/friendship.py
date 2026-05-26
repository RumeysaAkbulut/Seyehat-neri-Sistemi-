from app import db
from datetime import datetime


class Friendship(db.Model):
    __tablename__ = 'friendships'

    id           = db.Column(db.Integer, primary_key=True)
    follower_id  = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    following_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    follower  = db.relationship('User', foreign_keys=[follower_id],  backref='following_rel')
    following = db.relationship('User', foreign_keys=[following_id], backref='followers_rel')

    __table_args__ = (db.UniqueConstraint('follower_id', 'following_id'),)

    def to_dict(self):
        return {
            'id':           self.id,
            'follower_id':  self.follower_id,
            'following_id': self.following_id,
            'created_at':   self.created_at.isoformat(),
        }
