from flask import Blueprint

visualizations = Blueprint('visualizations', __name__)

from . import routes
