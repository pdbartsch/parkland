from flask import render_template
from . import main
import pbwords
import random

@main.route("/")
def home():
    return render_template(
        "home.html",
        heading_text="Welcome to ParkLand!",
        instruct_text="Some flash cards and quizzes for my kids.",
    )


@main.route("/other")
def other():
    return render_template(
        "other.html", heading_text="Other", instruct_text="Some other stuff "
    )

