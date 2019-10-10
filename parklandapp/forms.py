from flask_wtf import FlaskForm
from wtforms import FloatField
from wtforms.validators import NumberRange


class MultQuizForm(FlaskForm):
    product = FloatField("answer", validators=[NumberRange(min=1, max=200)])
