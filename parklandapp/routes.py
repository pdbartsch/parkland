from flask import render_template
from parklandapp import app, application
from parklandapp.forms import MultQuizForm

import pbwords

import random


@app.route("/")
def home():
    return render_template("home.html", heading_text="Welcome to ParkLand!")


@app.route("/current_words")
def current_words():
    word = random.choice(pbwords.swsc)
    return render_template("words.html", heading_text="Current Words", word=word)


@app.route("/all_words")
def all_words():
    word = random.choice(pbwords.sws)
    return render_template("words.html", heading_text="All Words", word=word)


@app.route("/math_quiz")
def math_quiz():

    number_one = 6
    # number_two = random.randrange(1, 11)
    number_two = random.randrange(1, 11) * number_one

    # problem = str(number_one) + " x " + str(number_two)

    return render_template(
        "quiz.html",
        heading_text="Division by 6:",
        instruct_text="",
        number_one=number_one,
        number_two=number_two,
    )
