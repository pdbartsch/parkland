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

    from parklandapp.math_quizzes import math_quizzes as math_blueprint
    app.register_blueprint(math_blueprint)

    from parklandapp.games import games as games_blueprint
    app.register_blueprint(games_blueprint)

    from parklandapp.visualizations import visualizations as visualizations_blueprint
    app.register_blueprint(visualizations_blueprint)

    from parklandapp.words import words as words_blueprint
    app.register_blueprint(words_blueprint)

    from parklandapp.box2box import box2box as box2box_blueprint
    app.register_blueprint(box2box_blueprint)

    from parklandapp.auth import auth as auth_blueprint
    app.register_blueprint(auth_blueprint)

    from authlib.integrations.flask_client import OAuth
    oauth = OAuth(app)
    oauth.register(
        name='google',
        client_id=app.config['GOOGLE_CLIENT_ID'],
        client_secret=app.config['GOOGLE_CLIENT_SECRET'],
        access_token_url='https://accounts.google.com/o/oauth2/token',
        access_token_params=None,
        authorize_url='https://accounts.google.com/o/oauth2/auth',
        authorize_params=None,
        api_base_url='https://www.googleapis.com/oauth2/v1/',
        userinfo_endpoint='https://openidconnect.googleapis.com/v1/userinfo',  # This is only needed if using openid to fetch user info
        client_kwargs={'scope': 'openid email profile'},
    )

    return app