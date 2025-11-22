import os

basedir = os.path.abspath(os.path.dirname(__file__))
use_local_database = True

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    if use_local_database:
        SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(basedir, "database.db")
    else:
        DB_USER = os.environ.get("DB_USER")
        DB_PW = os.environ.get("DB_PW")
        DB_URL = os.environ.get("DB_URL")
        DB_DB = os.environ.get("DB_DB")
        DB_PROJECT_ID = os.environ.get("DB_PROJECT_ID")
        DB_INSTANCE_NAME = os.environ.get("DB_INSTANCE_NAME")

        CONN_DB = (
            "mysql+pymysql://" + DB_USER + ":" + DB_PW + "@" + DB_URL + "/" + DB_DB
        )

        SQLALCHEMY_DATABASE_URI = CONN_DB