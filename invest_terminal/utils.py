from invest_terminal.api.errors import error_response


def check_params(params, request_):
    for i in params:
        if request_.args.get(i, type=str) is None:
            return error_response(400, message=f"'{i}' is not found in params request.")
    return None

