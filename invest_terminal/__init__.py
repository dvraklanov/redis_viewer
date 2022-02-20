import logging.config
import json

from . import terminal

import redis

with open("logs/log_config.json") as f:
    conf = json.load(f)

logging.config.dictConfig(conf['logging'])

# Подключение к Redis
redis_ = redis.StrictRedis(
    host='localhost',
    port=6379,
    db=0,
    password=None,
    decode_responses=True
)


app = terminal.create_app()

