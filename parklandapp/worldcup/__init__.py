from flask import Blueprint

worldcup = Blueprint('worldcup', __name__)

from . import routes
