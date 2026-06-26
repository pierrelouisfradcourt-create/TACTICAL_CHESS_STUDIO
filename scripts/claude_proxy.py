#!/usr/bin/env python3
"""FastAPI proxy: OpenAI /v1/chat/completions → claude --print CLI.

Usage:
    python scripts/claude_proxy.py
    # or
    uvicorn scripts.claude_proxy:app --port 8765

Environment:
    CLAUDE_PROXY_PORT         Listening port (default: 8765)
    CLAUDE_PROXY_TIMEOUT      subprocess timeout in seconds (default: 300)
    CLAUDE_PROXY_CWD          working directory for claude CLI (default: repo root)
    CLAUDE_PROXY_SYSTEM_FILE  path to a .md file prepended as system context
    CLAUDE_PROXY_WORKERS      max concurrent claude --print calls (default: 3)
"""

import asyncio
import json
import logging
import os
import shutil
import subprocess
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import AsyncIterator, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="claude-proxy", version="1.1.0")

_REPO_ROOT: Path = Path(__file__).resolve().parent.parent

CLAUDE_TIMEOUT: int = int(os.getenv("CLAUDE_PROXY_TIMEOUT", "300"))
PROXY_PORT: int = int(os.getenv("CLAUDE_PROXY_PORT", "8765"))
PROXY_MODEL_ID: str = "claude-code-cli"
PROXY_CWD: str = os.getenv("CLAUDE_PROXY_CWD", str(_REPO_ROOT))
MAX_WORKERS: int = int(os.getenv("CLAUDE_PROXY_WORKERS", "3"))

_executor = ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix="claude-proxy")

def _load_system_file() -> str:
    """Load optional system context file once at startup."""
    path = os.getenv("CLAUDE_PROXY_SYSTEM_FILE", "")
    if not path:
        return ""
    try:
        return Path(path).read_text(encoding="utf-8").strip()
    except OSError as exc:
        logger.warning("CLAUDE_PROXY_SYSTEM_FILE not readable: %s", exc)
        return ""

_SYSTEM_PREFIX: str = _load_system_file()


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class Message(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str = PROXY_MODEL_ID
    messages: list[Message]
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    stream: Optional[bool] = False


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------

def _find_claude_binary() -> str:
    """Return the path to the claude CLI binary, or raise if absent."""
    binary = shutil.which("claude")
    if not binary:
        raise FileNotFoundError("claude CLI not found in PATH")
    return binary


def _messages_to_prompt(messages: list[Message]) -> str:
    """Flatten OpenAI messages array into a structured prompt string."""
    parts: list[str] = []
    for msg in messages:
        role = msg.role.lower()
        if role == "system":
            parts.append(f"[System]\n{msg.content}")
        elif role == "user":
            parts.append(f"[User]\n{msg.content}")
        elif role == "assistant":
            parts.append(f"[Assistant]\n{msg.content}")
        else:
            parts.append(f"[{msg.role}]\n{msg.content}")
    return "\n\n".join(parts)


def _invoke_claude(prompt: str) -> str:
    """Synchronously call `claude --print` via stdin and return stdout."""
    binary = _find_claude_binary()

    full_prompt = f"{_SYSTEM_PREFIX}\n\n{prompt}" if _SYSTEM_PREFIX else prompt
    logger.info(
        "Invoking claude CLI (cwd=%s, timeout=%ds, prompt_len=%d)",
        PROXY_CWD,
        CLAUDE_TIMEOUT,
        len(full_prompt),
    )

    result = subprocess.run(
        [binary, "--print"],
        input=full_prompt,
        capture_output=True,
        text=True,
        timeout=CLAUDE_TIMEOUT,
        cwd=PROXY_CWD,
    )

    if result.returncode != 0:
        stderr = result.stderr.strip()
        logger.error("claude CLI exited %d: %s", result.returncode, stderr)
        raise RuntimeError(f"claude CLI error (exit {result.returncode}): {stderr}")

    output = result.stdout.strip()
    logger.info("claude CLI returned %d chars", len(output))
    return output


# ---------------------------------------------------------------------------
# Response builders
# ---------------------------------------------------------------------------

def _build_completion(content: str, model: str) -> dict:
    """Build an OpenAI-compatible ChatCompletion response object."""
    return {
        "id": f"chatcmpl-{uuid.uuid4().hex[:12]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
    }


async def _sse_chunks(content: str, model: str) -> AsyncIterator[str]:
    """Yield SSE data lines streaming the response word by word."""
    chunk_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    created = int(time.time())

    words = content.split(" ")
    for i, word in enumerate(words):
        token = word if i == 0 else f" {word}"
        delta = {"role": "assistant", "content": token} if i == 0 else {"content": token}
        chunk = {
            "id": chunk_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [{"index": 0, "delta": delta, "finish_reason": None}],
        }
        yield f"data: {json.dumps(chunk)}\n\n"
        await asyncio.sleep(0)

    stop_chunk = {
        "id": chunk_id,
        "object": "chat.completion.chunk",
        "created": created,
        "model": model,
        "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
    }
    yield f"data: {json.dumps(stop_chunk)}\n\n"
    yield "data: [DONE]\n\n"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health() -> dict:
    """Liveness check — also verifies claude CLI is reachable."""
    try:
        binary = _find_claude_binary()
        return {"status": "ok", "claude_binary": binary, "cwd": PROXY_CWD, "timeout": CLAUDE_TIMEOUT}
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="claude CLI not found in PATH")


@app.get("/v1/models")
def list_models() -> dict:
    """Expose available models for OpenClaw provider discovery."""
    return {
        "object": "list",
        "data": [
            {
                "id": PROXY_MODEL_ID,
                "object": "model",
                "created": 0,
                "owned_by": "claude-proxy",
            }
        ],
    }


@app.post("/v1/chat/completions")
async def chat_completions(req: ChatCompletionRequest):
    """Translate an OpenAI chat completion request into a claude --print call."""
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages must not be empty")

    prompt = _messages_to_prompt(req.messages)
    logger.info(
        "Request: model=%s messages=%d stream=%s",
        req.model,
        len(req.messages),
        req.stream,
    )

    loop = asyncio.get_running_loop()
    try:
        content = await loop.run_in_executor(_executor, _invoke_claude, prompt)
    except FileNotFoundError as exc:
        logger.error("claude CLI missing: %s", exc)
        raise HTTPException(status_code=503, detail="claude CLI not found in PATH") from exc
    except subprocess.TimeoutExpired:
        logger.error("claude CLI timed out (%ds)", CLAUDE_TIMEOUT)
        raise HTTPException(
            status_code=504, detail=f"claude CLI timed out after {CLAUDE_TIMEOUT}s"
        )
    except RuntimeError as exc:
        logger.error("claude CLI error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if req.stream:
        return StreamingResponse(_sse_chunks(content, req.model), media_type="text/event-stream")

    return _build_completion(content, req.model)


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    logger.info("Starting claude-proxy on 127.0.0.1:%d", PROXY_PORT)
    uvicorn.run(app, host="127.0.0.1", port=PROXY_PORT)
