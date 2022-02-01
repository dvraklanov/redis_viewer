import logging
from invest_terminal.api.errors import error_response


def check_params(params, request_):
    for i in params:
        if request_.get(i, type=str) is None:
            logging.error(f"'{i}' is not found in params request.")
            return error_response(400, message=f"'{i}' is not found in request params.")
    return None

