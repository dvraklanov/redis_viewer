import json

from flask import render_template

from . import bp
from .. import redis_

@bp.route('/')
@bp.route('/index')
def index():
    return render_template("index.html", username="Dosia")
