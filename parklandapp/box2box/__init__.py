from flask import Blueprint

box2box = Blueprint('box2box', __name__)

from parklandapp.box2box import routes
