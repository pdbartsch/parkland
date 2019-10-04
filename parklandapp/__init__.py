from flask import Flask

application = app = Flask(__name__)

app.config["SECRET_KEY"] = "5791628bb0b13ce0c676dfde280ba245"


from parklandapp import routes
