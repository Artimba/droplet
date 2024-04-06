import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SQLALCHEMY_DATABASE_URI = 'sqlite:///site.db'
    IMAGE_DIRECTORY = os.path.join(BASE_DIR, 'droplet', 'static', 'images')