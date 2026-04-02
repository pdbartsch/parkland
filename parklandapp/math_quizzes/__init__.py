from flask import Blueprint

math_quizzes = Blueprint('math_quizzes', __name__)

from . import routes
