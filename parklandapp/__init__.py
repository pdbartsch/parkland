from flask import Flask

application = app = Flask(__name__, instance_relative_config=True)

app.config["SECRET_KEY"] = "REDACTED-SECRET-KEY"
app.config.from_pyfile("config.py")

from parklandapp import routes
