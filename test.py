import time
import redis

redis_ = redis.StrictRedis(
    host='localhost',
    port=6379,
    db=0,
    password=None,
    decode_responses=True
)
print(redis_.select(2))
print(redis_.keys('*'))

"""for i in range(1000):

    redis_.set(str(int(time.time())), i)
    time.sleep(0.2)"""

