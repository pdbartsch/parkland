from flask import Flask

application = app = Flask(__name__)

app.config["SECRET_KEY"] = "REDACTED-SECRET-KEY"


from parklandapp import routes
