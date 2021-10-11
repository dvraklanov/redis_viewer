import redis

from . import terminal

from flask_bootstrap import Bootstrap
from flask_moment import Moment

bootstrap = Bootstrap()
moment = Moment()

# Подключение к Redis
redis_ = redis.StrictRedis(
    host='localhost',
    port=6379,
    db=0,
    password=None
)

app = terminal.create_app(bootstrap=bootstrap, moment=moment)

