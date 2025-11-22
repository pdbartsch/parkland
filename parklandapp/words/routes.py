from flask import render_template
from . import words
import pbwords
import random

@words.route("/words")
def index():
    return render_template("words_hub.html", heading_text="Sight Words")

@words.route("/words/current")
def current_words():
    word = random.choice(pbwords.swsc)
    return render_template("words.html", heading_text="Current Words", word=word)

@words.route("/words/all")
def all_words():
    word = random.choice(pbwords.sws)
    return render_template("words.html", heading_text="All Words", word=word)

@words.route("/words/colors")
def color_words():
    word = random.choice(pbwords.colors)
    return render_template("words.html", heading_text="Colors", word=word)

@words.route("/words/practice")
def xtra_practice_words():
    word = random.choice(pbwords.problems)
    return render_template(
        "words.html", heading_text="New or Difficult Words", word=word
    )
