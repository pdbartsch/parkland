import os

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(basedir, "database.db")

    # Google OAuth Configuration
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

    # Security: Allowlist
    ALLOWED_USERS = ["pdbartsch@gmail.com", "parker.bartsch@gmail.com", "landon.bartsch@gmail.com", "alison.bartsch@gmail.com"]
