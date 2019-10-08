from flask import render_template
from parklandapp import app, application

import random


sws = [
    "I",
    "yes",
    "no",
    "name",
    "can",
    "one",
    "two",
    "the",
    "then",
    "there",
    "we",
    "am",
    "see",
    "a",
    "saw",
    "brown",
    "like",
    "at",
    "can't",
    "put",
    "to",
    "from",
    "and",
    "pretty",
    "new",
    "go",
    "now",
    "into",
    "you",
    "your",
    "on",
    "do",
    "did",
    "could",
    "ate",
    "came",
    "under",
    "over",
    "my",
    "our",
    "by",
    "are",
    "her",
    "with",
    "he",
    "find",
    "ran",
    "be",
    "eat",
    "please",
    "is",
    "little",
    "four",
    "well",
    "will",
    "all",
    "she",
    "was",
    "that",
    "black",
    "ride",
    "for",
    "have",
    "must",
    "but",
    "down",
    "of",
    "they",
    "get",
    "went",
    "white",
    "said",
    "want",
    "give",
    "were",
    "here",
    "me",
    "many",
    "this",
    "what",
    "very",
    "every",
    "so",
    "both",
    "help",
    "too",
    "soon",
    "has",
    "play",
    "day",
    "say",
    "where",
    "look",
    "good",
    "who",
    "says",
    "come",
    "does",
    "some",
    "out",
]

swsc = sws[0:18]


@app.route("/")
def home():
    return render_template("home.html", heading_text="Welcome to ParkLand!")


@app.route("/current_words")
def current_words():
    word = random.choice(swsc)
    return render_template("words.html", heading_text="", word=word)


@app.route("/all_words")
def all_words():
    word = random.choice(sws)
    return render_template("words.html", heading_text="", word=word)

