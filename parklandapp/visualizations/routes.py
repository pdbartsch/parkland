from flask import render_template
from . import visualizations

@visualizations.route("/visualizations")
def index():
    return render_template("visualizations_hub.html")

@visualizations.route("/election_map")
def election_map():
    return render_template("election_map.html")
