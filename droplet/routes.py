from flask import Blueprint, jsonify, render_template, send_from_directory, abort, current_app, Response
import plotly
import plotly.graph_objs as go
import json
import time
import requests

from droplet.utils import capture_image, read_sensor_data
from .models import DataEntry, Experiment
from . import db

# Blueprint for main routes
bp = Blueprint('main', __name__)

# @bp.route('/')
# def index() -> str:
#     return render_template('index.html')

# @bp.route('/live-graph')
# def live_graph() -> str:
#     return render_template('live_graph.html')
    
@bp.route('/api/capture', methods=['POST'])
def capture() -> Response:
    """Send an instruction to the Canon camera to capture and download an image. 
    Create a new data entry containing the image and save it under the current Experiment.

    Returns:
        Response: JSON response containing the ID of the new data entry
    """
    filename = capture_image("droplet")
    data = read_sensor_data()
    new_entry = DataEntry(temperature = data['temperature'],
                          humidity = data['humidity'],
                          image_filename = filename)
    db.session.add(new_entry)
    db.session.commit()
    return jsonify({'id': new_entry.id})


# @bp.route('/api/entry/<int:entry_id>')
# def get_entry(entry_id):
#     entry = DataEntry.query.get(entry_id)
#     if entry:
#         return jsonify({
#             'id': entry.id,
#             'temperature': entry.temperature,
#             'humidity': entry.humidity,
#             'image_filename': entry.image_filename,
#             'timestamp': entry.timestamp.isoformat()
#         })
#     else:
#         return jsonify({'error': 'Entry not found'}), 404


@bp.route('/images/<filename>')
def serve_image(filename: str) -> Response:
    """Serve an image from the image directory

    Args:
        filename (str): Name of the image file to serve

    Returns:
        Response: Image file to serve
    """
    image_directory = current_app.config['IMAGE_DIRECTORY']
    try:
        # Prevent path traversal attacks by safely joining paths
        return send_from_directory(image_directory, filename)
    except FileNotFoundError:
        abort(404)

@bp.route('/api/data')
def get_sensor_data() -> Response:
    """Get sensor data from the Raspberry Pi

    Returns:
        Response: JSON response containing temperature and humidity data from the current sensor reading
    """
    data = read_sensor_data()
    return jsonify(data)

# Create CRUD operations for Experiment and DataEntry Models
@bp.route('/api/experiments', methods=['POST'])
def create_experiment() -> Response:
    """Create a new experiment

    Returns:
        Response: JSON response containing new experiment
    """
    data = requests.get_json()
    new_experiment = Experiment(name=data['name'], description=data['description'])
    db.session.add(new_experiment)
    db.session.commit()
    return jsonify(new_experiment.to_dict())

@bp.route('/api/experiments', methods=['GET'])
def get_experiments() -> Response:
    """Get all experiments

    Returns:
        Response: JSON response containing all experiments
    """
    experiments = Experiment.query.all()
    return jsonify([experiment.to_dict() for experiment in experiments])

@bp.route('/api/experiments/<int:experiment_id>', methods=['GET'])
def get_experiment(experiment_id: int) -> Response:
    """Get a specific experiment

    Args:
        experiment_id (int): ID of experiment to retrieve

    Returns:
        Response: JSON response containing experiment
    """
    experiment = Experiment.query.get(experiment_id)
    if experiment:
        return jsonify(experiment.to_dict())
    else:
        return jsonify({'error': 'Experiment not found'}), 404

@bp.route('/api/experiments/<int:experiment_id>', methods=['PUT'])
def update_experiment(experiment_id: int) -> Response:
    """Update a specific experiment

    Args:
        experiment_id (int): ID of experiment to update

    Returns:
        Response: JSON response containing updated experiment
    """
    data = requests.get_json()
    experiment = Experiment.query.get(experiment_id)
    if experiment:
        experiment.name = data['name']
        experiment.description = data['description']
        db.session.commit()
        return jsonify(experiment.to_dict())
    else:
        return jsonify({'error': 'Experiment not found'}), 404

# Delete a specific experiment
@bp.route('/api/experiments/<int:experiment_id>', methods=['DELETE'])
def delete_experiment(experiment_id: int) -> Response:
    """Delete a specific experiment

    Args:
        experiment_id (int): ID of experiment to delete

    Returns:
        Response: JSON response indicating success or failure
    """
    experiment = Experiment.query.get(experiment_id)
    if experiment:
        db.session.delete(experiment)
        db.session.commit()
        return jsonify({'message': 'Experiment deleted'})
    else:
        return jsonify({'error': 'Experiment not found'}), 404
    
# Create a data entry for a given experiment id.
@bp.route('/api/experiments/<int:experiment_id>/data', methods=['POST'])
def create_data_entry(experiment_id: int) -> Response:
    """Create a data entry for a given experiment id.

    Args:
        experiment_id (int): ID of experiment to create data entry for

    Returns:
        Response: JSON response containing new data entry
    """
    # Check to make sure this experiment exists
    experiment = Experiment.query.get(experiment_id)
    if not experiment:
        return jsonify({'error': 'Experiment not found'}), 404
    data = requests.get_json()
    new_entry = DataEntry(temperature = data['temperature'],
                          humidity = data['humidity'],
                          image_filename = data['image_filename'],
                          experiment_id = experiment_id)
    db.session.add(new_entry)
    db.session.commit()
    return jsonify(new_entry.to_dict())

# Get all data entries for a given experiment id.
@bp.route('/api/experiments/<int:experiment_id>/data', methods=['GET'])
def get_data_entries(experiment_id: int) -> Response:
    entries = DataEntry.query.filter_by(experiment_id=experiment_id).all()
    return jsonify([entry.to_dict() for entry in entries])

# Get a specific data entry for a specific experiment
@bp.route('/api/experiments/<int:experiment_id>/data/<int:entry_id>', methods=['GET'])
def get_data_entry(experiment_id: int, entry_id: int) -> Response:
    """Get a specific data entry for a specific experiment

    Args:
        experiment_id (int): ID of experiment containing data entry
        entry_id (int): ID of data entry to retrieve

    Returns:
        Response: JSON response containing data entry
    """
    entry = DataEntry.query.get(entry_id)
    if entry and entry.experiment_id == experiment_id:
        return jsonify(entry.to_dict())
    else:
        return jsonify({'error': 'Data entry not found'}), 404
    
# Update a specific data entry for a specific experiment
@bp.route('/api/experiments/<int:experiment_id>/data/<int:entry_id>', methods=['PUT'])
def update_data_entry(experiment_id: int, entry_id: int) -> Response:
    """Update a specific data entry for a specific experiment

    Args:
        experiment_id (int): ID of experiment containing data entry
        entry_id (int): ID of data entry to update

    Returns:
        Response: JSON response containing updated data entry
    """
    data = requests.get_json()
    entry = DataEntry.query.get(entry_id)
    if entry and entry.experiment_id == experiment_id:
        entry.temperature = data['temperature']
        entry.humidity = data['humidity']
        entry.image_filename = data['image_filename']
        db.session.commit()
        return jsonify(entry.to_dict())
    else:
        return jsonify({'error': 'Data entry not found'}), 404
