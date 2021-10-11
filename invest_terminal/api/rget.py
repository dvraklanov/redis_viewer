from pprint import pprint
import json
from flask import jsonify, request
import redis.exceptions as rdE
from . import bp
from .. import redis_ as rd
from ..utils import *


#Получить все ключи
@bp.route('/rget_branch', methods=['GET'])
def rget_branch():

    check = check_params(['branch'], request)
    if check is not None:
        return check

    branch = request.args.get('branch', type=str)
    keys_split_list = {'keys': []}
    branch = '' if branch == '' else branch + ":"
    keys = [key.decode('UTF-8') for key in rd.keys(branch + '*')]
    if branch != '':
        keys = [key.replace(branch, '', 1) for key in keys]

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
                            break

    return jsonify(keys_split_list)


#Редактировать значение
@bp.route('/rset', methods=['POST'])
def rset_data():

    body = request.form #Получение тела запроса
    if body:
        #Проверка на наличие всех параметров
        key = body.get('key', False)
        value = body.get('value', False)
        if not key: return error_response(400, '<<key>> is not found in request body.')
        if not value: return error_response(400, '<<value>> is not found in request body.')

        else:
            value = json.loads(value)
            #Проверка существования ключа
            if int(rd.exists(key)):
                value_type = rd.type(key).decode('UTF-8')

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

                print(f'set {key}: {value}')
                return jsonify("200. The value is set.")

            #Ключ не найден
            else:
                print(f"Key '{key}' is not found.")
                return error_response(400, f"Key '{key}' is not found.")
    else:
        print("Request body should not be empty")
        return error_response(400, "Request body should not be empty")



#Получить значение
@bp.route('/rget', methods=['GET'])
def rget_data():

    check = check_params(['key'], request)
    if check is not None:
        return check

    key = request.args.get('key', type=str)
    # Проверка существования ключа
    if int(rd.exists(key)):

        #Получение типа значения по ключу
        value_type = rd.type(key).decode('UTF-8')

        #Возвращение значения в зависимости от типа
        if value_type == 'string':
            value = rd.get(key).decode('UTF-8')
        elif value_type == 'list':
            value = [val.decode('UTF-8') for val in rd.lrange(key, 0, -1)]
        elif value_type == 'hash':
            value = {key.decode('UTF-8'): val.decode('UTF-8') for key, val in rd.hgetall(key).items()}
        elif value_type == 'set':
            value = [val.decode('UTF-8') for val in rd.smembers(key)]
        elif value_type == 'zset':
            value = {val[1]: val[0].decode('UTF-8') for val in rd.zrange(key, 0, -1, withscores=True)}
        else:
            print(f"Unknown data type: {value_type}")
            return error_response(400, message=f"Unknown data type: {value_type}")

        print(f'get {key}: {value}')
        response = {'value_type': value_type, 'value': value}

    #Ключ не найден
    else:
        print(f"Key '{key}' is not found.")
        return error_response(400, f"Key '{key}' is not found.")

    return jsonify(response)
