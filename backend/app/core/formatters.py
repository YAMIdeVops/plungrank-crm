import re
import unicodedata

from .errors import AppError


def normalize_text(value: str | None, fallback: str = "") -> str:
    base_value = fallback if value is None else str(value)
    clean = re.sub(r"\s+", " ", base_value).strip()
    return clean


def canonical_text_key(value: str | None, fallback: str = "") -> str:
    text = normalize_text(value, fallback)

    # Legacy data may arrive with one or more rounds of mojibake.
    # We keep decoding while the common markers are still present.
    while any(marker in text for marker in ("Ã", "Â")):
        try:
            decoded = text.encode("latin1").decode("utf-8")
        except UnicodeError:
            break
        if decoded == text:
            break
        text = decoded

    normalized = unicodedata.normalize("NFKD", text)
    without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
    return without_accents.casefold()


def normalize_email(value: str) -> str:
    return normalize_text(value).lower()


def only_digits(value: str) -> str:
    return re.sub(r"\D", "", value)


def normalize_phone(value: str) -> str:
    digits = only_digits(value)

    # Some imported sources prepend one or more zeros to the front of the phone.
    # We strip only the excess leading zeros until the number reaches the expected size.
    while len(digits) > 11 and digits.startswith("0"):
        digits = digits[1:]

    if len(digits) != 11:
        raise AppError("Telefone deve conter 11 digitos com DDD.")

    return f"({digits[:2]}) {digits[2:7]}-{digits[7:]}"
