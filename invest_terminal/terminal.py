import logging

from flask import Flask


def create_app():

    # Приложение Flask
    app = Flask(__name__)

    # Blueprint для api
    from .api import bp as api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    # Blueprint для главной страницы
    from .main import bp as main_bp
    app.register_blueprint(main_bp)
    [print(key) for key in logging.Logger.manager.loggerDict]
    logging.info('Starting app.')
    return app
