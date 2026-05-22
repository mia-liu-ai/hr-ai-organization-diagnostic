from __future__ import annotations

import base64
import hashlib
import hmac
import os


def make_random_hex(byte_count: int = 16) -> str:
    return os.urandom(byte_count).hex()


def make_random_url_value(byte_count: int = 32) -> str:
    return base64.urlsafe_b64encode(os.urandom(byte_count)).decode("utf-8").rstrip("=")


def hash_login_code(login_code: str, login_salt: str | None = None) -> str:
    selected_salt = login_salt or make_random_hex(16)
    digest = hashlib.sha256(f"{selected_salt}:{login_code}".encode("utf-8")).hexdigest()
    return f"{selected_salt}${digest}"


def verify_login_code(login_code: str, stored_digest: str) -> bool:
    try:
        selected_salt, expected = stored_digest.split("$", 1)
    except ValueError:
        return False
    actual = hashlib.sha256(f"{selected_salt}:{login_code}".encode("utf-8")).hexdigest()
    return hmac.compare_digest(actual, expected)


def create_session_value() -> str:
    return make_random_url_value(32)
