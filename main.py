# imports app from __init__.py
from parklandapp import app

#  If running this app directly, then start the flask app
if __name__ == "__main__":
    app.run(debug=False)
