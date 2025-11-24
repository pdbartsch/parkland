from flask import Blueprint

auth = Blueprint('auth', __name__)

from parklandapp.auth import routes
