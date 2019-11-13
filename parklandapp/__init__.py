from flask import Flask

application = app = Flask(__name__, instance_relative_config=True)

app.config["SECRET_KEY"] = "REDACTED-SECRET-KEY"
app.config.from_pyfile("config.py")
# app.config["SESSION_TYPE"] = "filesystem"

from parklandapp import routes
