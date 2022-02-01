import logging
import logging.config
import json

from . import terminal

import redis
from flask_bootstrap import Bootstrap
from flask_moment import Moment


with open("logs/log_config.json") as f:
    conf = json.load(f)

bootstrap = Bootstrap()
moment = Moment()

logging.config.dictConfig(conf['logging'])

# Подключение к Redis
redis_ = redis.StrictRedis(
    host='localhost',
    port=6379,
    db=0,
    password=None
)


app = terminal.create_app(bootstrap=bootstrap, moment=moment)

