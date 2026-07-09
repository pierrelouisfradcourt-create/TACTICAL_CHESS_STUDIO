"""Signed forge verdict — the anti-over-claim epistemology brick.

Separates software / evidence / claim. ``claim_verdict`` is ALWAYS
``NO_CLAIM_ALLOWED``: the agent may never assert success. Only the deterministic
oracle speaks (``software_verdict``), and the verdict is HMAC-signed so it cannot
be forged after the fact.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
from dataclasses import asdict, dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_KEY_FILE = REPO_ROOT / "scripts" / "forge" / ".forge_key"

CLAIM_VERDICT = "NO_CLAIM_ALLOWED"
EVIDENCE_VERDICT = "MECHANICAL_VALIDATION_ONLY"


@dataclass(frozen=True)
class Verdict:
    project: str
    software_verdict: str
    evidence_verdict: str
    claim_verdict: str
    returncode: int
    evidence_path: str


def build_verdict(project: str, passed: bool, returncode: int, evidence_path: Path) -> Verdict:
    return Verdict(
        project=project,
        software_verdict="OK" if passed else "FAIL",
        evidence_verdict=EVIDENCE_VERDICT,
        claim_verdict=CLAIM_VERDICT,
        returncode=returncode,
        evidence_path=str(evidence_path),
    )


def _load_key(key_file: Path) -> bytes:
    if key_file.exists():
        return key_file.read_bytes()
    key = os.urandom(32)
    key_file.parent.mkdir(parents=True, exist_ok=True)
    key_file.write_bytes(key)
    logger.info("generated new forge signing key at %s", key_file)
    return key


def sign_verdict(verdict: Verdict, key_file: Path | None = None) -> str:
    key = _load_key(key_file or DEFAULT_KEY_FILE)
    payload = json.dumps(asdict(verdict), sort_keys=True).encode("utf-8")
    return hmac.new(key, payload, hashlib.sha256).hexdigest()


def verify_verdict(verdict: Verdict, signature: str, key_file: Path | None = None) -> bool:
    expected = sign_verdict(verdict, key_file)
    return hmac.compare_digest(expected, signature)
