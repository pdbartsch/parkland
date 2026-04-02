from flask import render_template, session, request, redirect, url_for
from . import math_quizzes
from parklandapp.forms import MathQuizForm
import random

current_math_quiz = 9

@math_quizzes.route("/math")
def index():
    return render_template("math_hub.html")

# ///////////////// multiplication quiz

@math_quizzes.route("/multiply")
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
        url="math_quizzes.multiply",
    )

@math_quizzes.route("/multiply", methods=["GET", "POST"])
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
            url="math_quizzes.multiply",
        )
    else:
        return redirect(url_for("math_quizzes.multiply"))

# ///////////////// NEXT multiplication quiz

@math_quizzes.route("/multiply_next")
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
        url="math_quizzes.multiply_next",
    )

@math_quizzes.route("/multiply_next", methods=["GET", "POST"])
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
            url="math_quizzes.multiply_next",
        )
    else:
        return redirect(url_for("math_quizzes.multiply"))

# ///////////////// division quiz

@math_quizzes.route("/divide")
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
        url="math_quizzes.divide",
    )

@math_quizzes.route("/divide", methods=["GET", "POST"])
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
            url="math_quizzes.divide",
        )
    else:
        return redirect(url_for("math_quizzes.divide"))

# ///////////////// all math_flash
@math_quizzes.route("/math_flash")
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
@math_quizzes.route("/multiply_flash")
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
@math_quizzes.route("/divide_flash")
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
