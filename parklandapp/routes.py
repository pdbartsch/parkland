from flask import render_template, session
from parklandapp import app, application
from parklandapp.forms import MultQuizForm

# import pbmath
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


@app.route("/mult_quiz")
def mult_quiz():

    # set up a new game by setting guess count to 0, and
    # setting a random number
    rand_num = random.randint(0, 100)
    session["rand_num"] = rand_num
    print("The answer is: ", rand_num)
    session["count"] = 0

    return render_template(
        "quiz.html", heading_text="Math Quiz!", instruct_text="What's the answer?:"
    )


@app.route("/result")
def check_guess():
    guess = int(request.args.get("guess"))
    rand_num = session["rand_num"]

    if session["count"] < 10:
        if guess == rand_num:
            return render_template(
                "result.html", response="Hooray! You win.", count=session["count"]
            )
        else:
            print(guess, "!=", rand_num)
            session["count"] += 1
            if guess > rand_num:
                return render_template(
                    "result.html",
                    response="Too high. Try again!",
                    count=session["count"],
                )
            elif guess < rand_num:
                return render_template(
                    "result.html",
                    response="Too low. Try again!",
                    count=session["count"],
                )
    else:
        return render_template("result.html", response="You lose.")
