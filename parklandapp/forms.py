from flask_wtf import FlaskForm
from wtforms import IntegerField
from wtforms.validators import NumberRange, DataRequired


class MathQuizForm(FlaskForm):
    user_answer = IntegerField(
        "user_answer", validators=[NumberRange(min=1, max=200), DataRequired()]
    )
