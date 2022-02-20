import json
from flask import jsonify, request
from . import bp
from .errors import *
from .. import redis_ as rd
from ..utils import *


#Получить все ключи
@bp.route('/redis/get_branch', methods=['GET'])
def rget_branch():
    logging.debug(request)
    default_count = 10
    cursor = request.args.get('curs', default=0, type=int)
    match = request.args.get('match', type=str)
    count = request.args.get('count', default=default_count, type=int)
    rd.scan(cursor, match, count)
    """branch = request.args.get('branch', type=str)
    keys_split_list = {'keys': []}
    branch = '' if branch == '' else branch + ":"
    keys = [key for key in rd.keys(branch + '*')]
    if branch != '':
        keys = [key.replace(branch, '', 1) for key in keys]

    #Слишком много циклов for, долго работает
    for key in keys:
        prev_lvl = keys_split_list['keys']
        key_split = key.split(":")

        for lvl in key_split:

            if lvl == key_split[-1]:
                prev_lvl.append(lvl)
            else:
                if not any(lvl in d.keys() for d in prev_lvl if type(d) == dict):
                    prev_lvl += [{lvl: []}, lvl]

                for i in range(len(prev_lvl)-1):
                    if type(prev_lvl[i]) == dict:
                        if lvl in prev_lvl[i]:
                            prev_lvl = prev_lvl[i][lvl]
                            break"""

    logging.info(f'return parsed keys for branch {branch}')
    return jsonify("")


#Редактировать значение
@bp.route('/redis/set', methods=['POST'])
def rset_data():

    body = request.form #Получение тела запроса
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
        #Проверка существования ключа
        if int(rd.exists(key)):
            value_type = rd.type(key)

            #Изменение значение в соотвествии с типом
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

        #Ключ не найден
        else:
            logging.error(f"Key '{key}' is not found.")
            return error_response(400, f"Key '{key}' is not found.")
    else:
        logging.error("Request body should not be empty")
        return error_response(400, "Request body should not be empty")



#Получить значение
@bp.route('/redis/get', methods=['GET'])
def rget_data():

    logging.debug(request)
    check = check_params(['key'], request.args)
    if check is not None:
        return check

    key = request.args.get('key', type=str)

    # Проверка существования ключа
    if int(rd.exists(key)):

        #Получение типа значения по ключу
        value_type = rd.type(key)

        #Возвращение значения в зависимости от типа
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

    #Ключ не найден
    else:
        logging.error(f"Key '{key}' is not found.")
        return error_response(400, f"Key '{key}' is not found.")

    return jsonify(response)

#Сменить базу данных (db 0-15)
@bp.route('/redis/select', methods=['POST'])
def rselect():
    body = request.form
    logging.debug(body)
    if body:
        check = check_params(['db'], body)
        if check is not None:
            return check
        # Проверка на наличие всех параметров
        db = int(body['db'])

        if db in range(0, 16):
            rd.execute_command('SELECT', db)
            logging.info(f"Db is selected.")
            logging.debug(f"Current db is {db}")
            return jsonify(f"OK. Db is selected. Current db is {db}")
        else:
            logging.error(f'<<db>> must be in range 0-15, current value is {db}')
            return error_response(400, f'<<db>> must be in range 0-15, current value is {db}')

    else:
        logging.error("Request body is empty")
        return error_response(400, "Request body is empty")