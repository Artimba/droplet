from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from config import Config
import os

DEBUG = True

# Initalize SQL db
db = SQLAlchemy()

# Create app factory for Flask.
def create_app(config_class=Config):
    app = Flask(__name__) # Static defaults to 'static' folder in root directory. Should autodiscover.
    CORS(app)
    app.config.from_object(config_class)

    db.init_app(app)

    with app.app_context():
        from .routes import bp as routes_bp
        app.register_blueprint(routes_bp)

        db.create_all()
        
        # Route for serving angular frontend.
        @app.route('/', defaults={'path': ''})
        @app.route('/<path:path>')
        def serve_frontend(path):
            if path and os.path.exists(os.path.join(app.static_folder, 'angular', 'browser', path)):
                return send_from_directory(os.path.join(app.static_folder, 'angular', 'browser'), path)
            else:
                app.logger.info('Serving index.html from: %s', os.path.join(app.static_folder, 'angular', 'browser'))
                return send_from_directory(os.path.join(app.static_folder, 'angular', 'browser'), 'index.html')

        return app
