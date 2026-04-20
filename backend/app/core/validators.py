from datetime import date, datetime
import re

from .constants import BRAZILIAN_STATES
from .errors import AppError
from .formatters import normalize_text


def require_fields(data: dict, fields: list[str]) -> None:
    for field in fields:
        value = data.get(field)
        if value is None:
            raise AppError(f"Campo obrigatorio ausente: {field}.")
        if isinstance(value, str) and normalize_text(value) == "":
            raise AppError(f"Campo obrigatorio vazio: {field}.")


def validate_enum(value: str, allowed: set[str], field_name: str) -> None:
    if value not in allowed:
        raise AppError(f"Valor invalido para {field_name}.")


def parse_date(value, field_name: str) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError) as exc:
        raise AppError(f"Data invalida para {field_name}. Use YYYY-MM-DD.") from exc


def parse_datetime(value, field_name: str) -> datetime:
    if isinstance(value, datetime):
        return value
    try:
        normalized = value.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized)
    except (AttributeError, TypeError, ValueError) as exc:
        raise AppError(f"Data/hora invalida para {field_name}. Use ISO 8601.") from exc


def ensure_not_future(value: date, field_name: str) -> None:
    if value > date.today():
        raise AppError(f"{field_name} nao pode estar no futuro.")


def ensure_positive_number(value, field_name: str) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise AppError(f"{field_name} deve ser numerico.") from exc
    if number <= 0:
        raise AppError(f"{field_name} deve ser maior que zero.")
    return round(number, 2)


def validate_state(value: str) -> str:
    state = normalize_text(value).upper()
    if state not in BRAZILIAN_STATES:
        raise AppError("UF invalida.")
    return state


def validate_email(value: str) -> None:
    pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    if not re.match(pattern, value):
        raise AppError("E-mail invalido.")


def validate_password(value: str) -> None:
    if not normalize_text(value):
        raise AppError("Senha nao pode ser vazia.")
    if len(value) < 8:
        raise AppError("Senha deve ter pelo menos 8 caracteres.")
