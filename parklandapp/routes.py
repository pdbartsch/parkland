from flask import render_template, session, request, redirect, url_for
from parklandapp import app, application
from parklandapp.forms import MathQuizForm
import json
from instance.config import gkey as gkey

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
        instruct_text="Some flash cards and quizzes ",
    )


@app.route("/other")
def other():
    return render_template(
        "other.html", heading_text="Other", instruct_text="Some other stuff "
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
        url="multiply",
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
            url="multiply",
        )
    else:
        return redirect(url_for("multiply"))


# ///////////////// NEXT multiplication quiz


@app.route("/multiply_next")
def multiply_next():
    form = MathQuizForm()
    number_one = current_math_quiz + 1
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
        heading_text="Next Multiplication Quiz",
        x=str(number_two),
        y=str(number_one),
        math_type=True,
        url="multiply_next",
    )


@app.route("/multiply_next", methods=["GET", "POST"])
def multiply_next_post():
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
            heading_text="Next Multiplication Quiz",
            x=str(number_two),
            y=str(number_one),
            math_type=True,
            url="multiply_next",
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
        url="divide",
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
            url="divide",
        )
    else:
        return redirect(url_for("divide"))


# ///////////////// all math_flash
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


# ///////////////// multiply math_flash
@app.route("/multiply_flash")
def multiply_flash():
    base_number = current_math_quiz
    factor_number = random.randrange(1, 10)
    dividend_number = factor_number * base_number

    math_type = True

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
        heading_text="Current Multiplication Flashcards",
    )


# ///////////////// divide math_flash
@app.route("/divide_flash")
def divide_flash():
    base_number = current_math_quiz
    factor_number = random.randrange(1, 10)
    dividend_number = factor_number * base_number

    math_type = False

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
        heading_text="Current Division Flashcards",
    )


# ///////////////// run goal
@app.route("/run_goal", methods=["GET", "POST"])
def run_goal():
    DATA_SOURCE = (
        "https://sheets.googleapis.com/v4/spreadsheets/1IhHr7QVjVd1DqYwB34fqJUJjVosllODk2Ofds79-xq8/values/Summary!A1:B23?key="
        + gkey
    )

    import urllib.request, json

    with urllib.request.urlopen(DATA_SOURCE) as url:
        data = json.loads(url.read().decode())

    miles_goal = data["values"][0][1]
    miles_total = data["values"][1][1]
    doy = data["values"][3][1]
    verbose = data["values"][7][1]
    year_minutes = data["values"][9][1]
    percent_complete = data["values"][18][1]
    percent_year = data["values"][19][1]
    month_miles = data["values"][20][1]
    month = data["values"][22][1]

    return render_template(
        "rungoal.html",
        goal=miles_goal,
        total=miles_total,
        doy=doy,
        verbose=verbose,
        year_minutes=year_minutes,
        percent_complete=percent_complete,
        month_miles=month_miles,
        percent_year=percent_year,
        month=month,
        heading_text="Running Goal Check In:",
    )

