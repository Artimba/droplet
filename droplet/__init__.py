from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

# Initalize SQL db
db = SQLAlchemy()

# Create app factory for Flask.
def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)

    with app.app_context():
        from .routes import bp as routes_bp
        app.register_blueprint(routes_bp)

        db.create_all()

        return app
