from flask import jsonify


class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def register_error_handlers(app):
    @app.errorhandler(AppError)
    def handle_app_error(error: AppError):
        return jsonify({"error": error.message}), error.status_code

    @app.errorhandler(404)
    def handle_not_found(_error):
        return jsonify({"error": "Recurso não encontrado."}), 404

    @app.errorhandler(Exception)
    def handle_unexpected(error: Exception):
        return jsonify({"error": "Erro interno do servidor.", "details": str(error)}), 500

