from flask import Flask

application = app = Flask(__name__, instance_relative_config=True)

app.config["SECRET_KEY"] = "5791628bb0b13ce0c676dfde280ba245"
app.config.from_pyfile("config.py")
# app.config["SESSION_TYPE"] = "filesystem"

from parklandapp import routes
