from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from werkzeug.middleware.proxy_fix import ProxyFix
from parklandapp.config import Config

db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
    app.config.from_object(config_class)

    db.init_app(app)

    from parklandapp.main import main as main_blueprint
    app.register_blueprint(main_blueprint)

    from parklandapp.games import games as games_blueprint
    app.register_blueprint(games_blueprint)

    from parklandapp.visualizations import visualizations as visualizations_blueprint
    app.register_blueprint(visualizations_blueprint)

    from parklandapp.worldcup import worldcup as worldcup_blueprint
    app.register_blueprint(worldcup_blueprint)

    return app