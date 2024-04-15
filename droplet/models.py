from . import db
from datetime import datetime
from flask import current_app
from os import path, remove


class Experiment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    data_entries = db.relationship('DataEntry', backref='experiment', lazy=True,
                                   cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'data_entries': [data_entry.to_dict() for data_entry in self.data_entries]
        }
    
    def delete(self, commit=True):
        for data_entry in self.data_entries:
            data_entry.delete(commit=False)
        
        db.session.delete(self)
        if commit:
            db.session.commit()

class DataEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    temperature = db.Column(db.Float)
    humidity = db.Column(db.Float)
    image_filename = db.Column(db.String(20), unique=True, nullable=False)
    experiment_id = db.Column(db.Integer, db.ForeignKey('experiment.id', ondelete="CASCADE"), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp,
            'temperature': self.temperature,
            'humidity': self.humidity,
            'image_filename': self.image_filename,
            'experiment_id': self.experiment_id
        }

    def delete(self, commit=True):
        image_path = path.join(current_app.config['IMAGE_DIRECTORY'], self.image_filename)
        if path.exists(image_path):
            remove(image_path)
            
        db.session.delete(self)
        if commit:
            db.session.commit()