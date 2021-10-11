from flask import Flask

def create_app(bootstrap, moment):

    # Приложение Flask
    app = Flask(__name__)

    # Подключение bootstrap, moment  к приложению
    bootstrap.init_app(app)
    moment.init_app(app)

    # Blueprint для api
    from .api import bp as api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    # Blueprint для главной страницы
    from .main import bp as main_bp
    app.register_blueprint(main_bp)

    return app
