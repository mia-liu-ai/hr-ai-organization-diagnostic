from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from typing import Any

from .database import get_connection


AI_NOT_CONFIGURED_MESSAGE = "当前未配置 AI 模型，无法生成内容，请管理员在系统设置中配置模型。"
DEFAULT_BASE_URL = "https://api.openai.com/v1"
DEFAULT_MODEL = "gpt-4o-mini"
DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEFAULT_DEEPSEEK_MODEL = "deepseek-chat"


def get_settings() -> dict[str, str]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM ai_settings WHERE id = 1").fetchone()

    provider = os.getenv("AI_PROVIDER", os.getenv("AI_MODE", "local")).strip().lower()
    if provider == "deepseek":
        api_key = os.getenv("DEEPSEEK_API_KEY") or os.getenv("AI_API_KEY") or ""
        base_url = os.getenv("DEEPSEEK_BASE_URL") or os.getenv("AI_BASE_URL") or DEFAULT_DEEPSEEK_BASE_URL
        model = os.getenv("DEEPSEEK_MODEL") or os.getenv("AI_MODEL") or DEFAULT_DEEPSEEK_MODEL
    elif provider in {"openai-compatible", "openai", "compatible"}:
        provider = "openai-compatible"
        api_key = os.getenv("AI_API_KEY") or os.getenv("OPENAI_API_KEY", "")
        base_url = os.getenv("AI_BASE_URL") or os.getenv("OPENAI_BASE_URL", DEFAULT_BASE_URL)
        model = os.getenv("AI_MODEL") or os.getenv("OPENAI_MODEL", DEFAULT_MODEL)
    elif provider in {"local", "mock"}:
        provider = "local"
        api_key = os.getenv("AI_API_KEY") or ""
        base_url = os.getenv("AI_BASE_URL") or DEFAULT_BASE_URL
        model = os.getenv("AI_MODEL") or "local-mock"
    else:
        api_key = os.getenv("AI_API_KEY") or os.getenv("OPENAI_API_KEY", "")
        base_url = os.getenv("AI_BASE_URL") or os.getenv("OPENAI_BASE_URL", DEFAULT_BASE_URL)
        model = os.getenv("AI_MODEL") or os.getenv("OPENAI_MODEL", DEFAULT_MODEL)
    temperature = os.getenv("AI_TEMPERATURE", "0.35")
    timeout_seconds = os.getenv("AI_TIMEOUT_SECONDS", "45")

    if row:
        api_key = row["api_key"] or api_key
        base_url = row["base_url"] or base_url
        model = row["model"] or model

    return {
        "provider": provider,
        "api_key": api_key,
        "base_url": base_url.rstrip("/"),
        "model": model,
        "temperature": temperature,
        "timeout_seconds": timeout_seconds,
    }


def chat_completion(system: str, user: str) -> tuple[str, bool, str]:
    settings = get_settings()
    if settings["provider"] in {"local", "mock"}:
        return "", True, AI_NOT_CONFIGURED_MESSAGE
    if not settings["api_key"]:
        return "", True, AI_NOT_CONFIGURED_MESSAGE

    payload = {
        "model": settings["model"],
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": float(settings.get("temperature") or 0.35),
    }
    request = urllib.request.Request(
        f"{settings['base_url']}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings['api_key']}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=float(settings.get("timeout_seconds") or 45)) as response:
            body = json.loads(response.read().decode("utf-8"))
            return body["choices"][0]["message"]["content"], False, ""
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, IndexError, json.JSONDecodeError) as exc:
        return "", True, str(exc)


def extract_json(text: str) -> Any | None:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            return None

    start = min([idx for idx in [text.find("{"), text.find("[")] if idx >= 0], default=-1)
    end = max(text.rfind("}"), text.rfind("]"))
    if start >= 0 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None

    return None
