from flask_wtf import FlaskForm
from wtforms import Form, widgets
from wtforms_components import IntegerField
from wtforms.validators import NumberRange, DataRequired

# from wtforms.fields.html5 import TelField


# class MathQuizForm(FlaskForm):
#     user_answer = IntegerField(
#         "user_answer", validators=[NumberRange(min=1, max=1000), DataRequired()]
#     )


# class MathQuizForm(FlaskForm):
#     user_answer = TelField("user_answer", validators=[DataRequired()])


class MathQuizForm(FlaskForm):
    user_answer = IntegerField(
        "user_answer",
        validators=[NumberRange(min=1, max=1000), DataRequired()],
        widget=widgets.Input(input_type="tel"),
    )
