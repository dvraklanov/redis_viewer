# -*- coding: utf-8 -*-

import datetime as dt
from flask import jsonify
from . import bp


# Получение системного времени
@bp.route('/system')
def get_systemdatetime():
    data = {'time': dt.datetime.utcnow().strftime("%Y-%m-%d-%H.%M.%S")}
    return jsonify(data)