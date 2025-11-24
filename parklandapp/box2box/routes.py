from flask import render_template
from parklandapp.box2box import box2box
from parklandapp.auth.utils import login_required

@box2box.route("/box2box")
@login_required
def index():
    return render_template('box2box.html', title='Box2Box')
