import json
from flask import jsonify, request
from . import bp
from .errors import *
from .. import redis_ as rd
from ..utils import *


# Получить ветку
@bp.get('/redis/get_branch')
def rget_branch():
    logging.debug(request)
    default_count = 10
    cursor = request.args.get('cursor', default=0, type=int)
    branch = request.args.get('branch', default="", type=str)
    count = request.args.get('count', type=int)
    logging.info(request.args)
    resp = rd.scan(cursor, f"{branch + ':' if branch != '' else branch}*", count)
    branch_dict = {"parent": branch, 'cursor': resp[0], 'branches': [], 'keys': []}
    logging.info(resp[1])
    for key in resp[1]:
        # Ключ разбивается по разделителю и исключается родительская ветка
        split_key = key.split(":")[len(branch.split(":")) if branch != "" else 0:]
        new_item = branch + (':' if branch != "" else "") + split_key[0]

        if len(split_key) == 1 and new_item not in branch_dict['keys']:
            branch_dict['keys'].append(new_item)

        else:
            if new_item not in branch_dict['branches']:
                branch_dict['branches'].append(new_item)

    return jsonify(branch_dict)


# Редактировать значение
@bp.post('/redis/set')
def rset_data():
    body = request.form  # Получение тела запроса
    logging.debug(body)

    if body:
        # Проверка на наличие всех параметров
        check = check_params(['key', 'value'], body)
        if check is not None:
            return check

        key = body['key']
        value = body['value']
        logging.debug(f'{key=};{value=}')
        value = json.loads(value)
        # Проверка существования ключа
        if int(rd.exists(key)):
            value_type = rd.type(key)

            # Изменение значение в соотвествии с типом
            if value_type == "string":
                rd.set(key, value=value)

            else:
                rd.delete(key)
                if value_type == "list":
                    rd.rpush(key, *value)

                elif value_type == "set":
                    rd.sadd(key, *value)

                elif value_type == "hash":
                    value = {key.strip(): val for key, val in value.items()}
                    rd.hmset(key, value)

                elif value_type == 'zset':
                    value = {val: key.strip() for key, val in value.items()}
                    rd.zadd(key, value)

            logging.debug(f'set {key}: {value}')
            logging.info('The value is set.')
            return jsonify("200. The value is set.")

        # Ключ не найден
        else:
            logging.error(f"Key '{key}' is not found.")
            return error_response(400, f"Key '{key}' is not found.")
    else:
        logging.error("Request body should not be empty")
        return error_response(400, "Request body should not be empty")


# Получить значение
@bp.get('/redis/get')
def rget_data():
    logging.debug(request)
    check = check_params(['key'], request.args)
    if check is not None:
        return check

    key = request.args.get('key', type=str)

    # Проверка существования ключа
    if int(rd.exists(key)):

        # Получение типа значения по ключу
        value_type = rd.type(key)

        # Возвращение значения в зависимости от типа
        if value_type == 'string':
            value = rd.get(key)
        elif value_type == 'list':
            value = [val for val in rd.lrange(key, 0, -1)]
        elif value_type == 'hash':
            value = {key: val for key, val in rd.hgetall(key).items()}
        elif value_type == 'set':
            value = [val for val in rd.smembers(key)]
        elif value_type == 'zset':
            value = {val[1]: val[0] for val in rd.zrange(key, 0, -1, withscores=True)}
        else:
            logging.error(f"Unknown data type: {value_type}")
            return error_response(400, message=f"Unknown data type: {value_type}")

        logging.debug(f'get {key}: {value}')
        logging.info('The value is get')
        response = {'value_type': value_type, 'value': value}

    # Ключ не найден
    else:
        logging.error(f"Key '{key}' is not found.")
        return error_response(400, f"Key '{key}' is not found.")

    return jsonify(response)


# Сменить базу данных (db 0-15)
@bp.post('/redis/select')
def rselect_db():
    body = request.form
    logging.debug(body)
    if body:
        # Проверка на наличие всех параметров
        db = int(body.get('db', 0))

        if db in range(0, 16):
            rd.select(db)
            logging.info(f"Db is selected.")
            logging.debug(f"Current db is {db}")
            return jsonify(f"OK. Db is selected. Current db is {db}")
        else:
            logging.error(f'<<db>> must be in range 0-15, current value is {db}')
            return error_response(400, f'<<db>> must be in range 0-15, current value is {db}')

    else:
        logging.error("Request body is empty")
        return error_response(400, "Request body is empty")
