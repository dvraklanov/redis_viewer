import time
import redis

redis_ = redis.StrictRedis(
    host='localhost',
    port=6379,
    db=0,
    password=None,
    decode_responses=True
)


for i in range(1000):

    redis_.set("fold:" + str(int(time.time())), i)
    time.sleep(0.2)

