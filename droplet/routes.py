from flask import Blueprint, jsonify, render_template, send_from_directory, abort
import plotly
import plotly.graph_objs as go
import json
import time

from droplet.utils import capture_image, read_sensor_data
from .models import DataEntry
from . import db

# Blueprint for main routes
bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/live-graph')
def live_graph():
    return render_template('live_graph.html')
    
@bp.route('/api/capture', methods=['POST'])
def capture():
    filename = capture_image("droplet")
    data = read_sensor_data()
    new_entry = DataEntry(temperature = data['temperature'],
                          humidity = data['humidity'],
                          image_filename = filename)
    db.session.add(new_entry)
    db.session.commit()
    return jsonify({'id': new_entry.id})


@bp.route('/api/entry/<int:entry_id>')
def get_entry(entry_id):
    entry = DataEntry.query.get(entry_id)
    if entry:
        return jsonify({
            'id': entry.id,
            'temperature': entry.temperature,
            'humidity': entry.humidity,
            'image_filename': entry.image_filename,
            'timestamp': entry.timestamp.isoformat()
        })
    else:
        return jsonify({'error': 'Entry not found'}), 404


@bp.route('/images/<filename>')
def serve_image(filename):
    image_directory = "/home/hawhite2/droplet/images"
    try:
        # Prevent path traversal attacks by safely joining paths
        return send_from_directory(image_directory, filename)
    except FileNotFoundError:
        abort(404)

@bp.route('/api/data')
def get_data():
    data = read_sensor_data()
    return jsonify(data)