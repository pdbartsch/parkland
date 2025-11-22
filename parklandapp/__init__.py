from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from parklandapp.config import Config

db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)

    from parklandapp.main import main as main_blueprint
    app.register_blueprint(main_blueprint)

    from parklandapp.math_quizzes import math_quizzes as math_blueprint
    app.register_blueprint(math_blueprint)

    from parklandapp.games import games as games_blueprint
    app.register_blueprint(games_blueprint)

    from parklandapp.visualizations import visualizations as visualizations_blueprint
    app.register_blueprint(visualizations_blueprint)

    from parklandapp.words import words as words_blueprint
    app.register_blueprint(words_blueprint)

    return app