from flask import render_template, session, request, redirect, url_for
from parklandapp import app, application
from parklandapp.forms import MathQuizForm
import simplejson as json

import pbwords

import random

current_math_quiz = 7


@app.route("/")
def home():
    return render_template(
        "home.html",
        heading_text="Welcome to ParkLand!",
        instruct_text="Some flash cards and quizzes for my kids.",
    )


@app.route("/about")
def about():
    return render_template(
        "about.html",
        heading_text="About",
        instruct_text="Some flash cards and quizzes for my kids.",
    )


@app.route("/current_words")
def current_words():
    word = random.choice(pbwords.swsc)
    return render_template("words.html", heading_text="Current Words", word=word)


@app.route("/all_words")
def all_words():
    word = random.choice(pbwords.sws)
    return render_template("words.html", heading_text="All Words", word=word)


# ///////////////// multiplication quiz


@app.route("/multiply")
def multiply():
    form = MathQuizForm()
    number_one = current_math_quiz
    number_two = random.randrange(1, 10)
    problem = str(number_one) + " x " + str(number_two)
    solution = number_one * number_two

    session["solution"] = solution
    session["problem"] = problem
    session["number_one"] = number_one
    session["number_two"] = number_two

    return render_template(
        "quiz_math.html",
        problem=problem,
        solution=solution,
        form=form,
        heading_text="Current Multiplication Quiz",
        x=str(number_two),
        y=str(number_one),
        math_type=True,
    )


@app.route("/multiply", methods=["GET", "POST"])
def multiply_post():
    form = MathQuizForm()
    if form.validate_on_submit():
        user_answer = request.form["user_answer"]
        attempt = int(user_answer)
        problem = session["problem"]
        number_one = session["number_one"]
        number_two = session["number_two"]

        if attempt == session["solution"]:
            checked = "Correct"
            moveon = True
        else:
            checked = "Try again"
            moveon = False

        return render_template(
            "quiz_math.html",
            problem=problem,
            attempt=attempt,
            checked=checked,
            moveon=moveon,
            form=form,
            heading_text="Current Multiplication Quiz",
            x=str(number_two),
            y=str(number_one),
            math_type=True,
        )
    else:
        return redirect(url_for("multiply"))


# ///////////////// division quiz


@app.route("/divide")
def divide():
    form = MathQuizForm()
    number_one = current_math_quiz
    number_two = random.randrange(1, 10) * number_one
    problem = str(number_two) + " / " + str(number_one)
    solution = number_two / number_one

    session["solution"] = solution
    session["problem"] = problem
    session["number_one"] = number_one
    session["number_two"] = number_two

    return render_template(
        "quiz_math.html",
        problem=problem,
        solution=solution,
        form=form,
        heading_text="Current Division Quiz",
        x=str(number_two),
        y=str(number_one),
        math_type=False,
    )


@app.route("/divide", methods=["GET", "POST"])
def divide_post():
    form = MathQuizForm()
    if form.validate_on_submit():
        user_answer = request.form["user_answer"]
        attempt = int(user_answer)
        problem = session["problem"]
        number_one = session["number_one"]
        number_two = session["number_two"]

        if attempt == session["solution"]:
            checked = "Correct"
            moveon = True
        else:
            checked = "Try again"
            moveon = False

        return render_template(
            "quiz_math.html",
            problem=problem,
            attempt=attempt,
            checked=checked,
            moveon=moveon,
            form=form,
            heading_text="Current Division Quiz",
            x=str(number_two),
            y=str(number_one),
            math_type=False,
        )
    else:
        return redirect(url_for("divide"))


# /////////////////math_flash
@app.route("/math_flash")
def math_flash():
    base_number = current_math_quiz
    factor_number = random.randrange(1, 10)
    dividend_number = factor_number * base_number

    math_type = random.choice([True, False])

    if math_type:
        y = str(factor_number)
        s = " x "
    else:
        y = str(dividend_number)
        s = " / "

    return render_template(
        "math_flashcards.html",
        x=str(base_number),
        y=y,
        s=s,
        heading_text="Current Math Flashcards",
    )


# /////////////////miles goal
@app.route("/miles", methods=["GET", "POST"])
def add_message(uuid):
    content = request.get_json(silent=True)
    # print(content) # Do your processing
    return uuid
