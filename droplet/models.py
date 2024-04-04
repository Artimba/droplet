from . import db
from datetime import datetime

class DataEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    temperature = db.Column(db.Float)
    humidity = db.Column(db.Float)
    image_filename = db.Column(db.String(20), unique=True, nullable=False)
