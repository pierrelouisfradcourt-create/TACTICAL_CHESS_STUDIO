#!/usr/bin/env python3
"""council.py — Council multi-LLM async (IMP-198).

3 rôles async en parallèle (timeout par rôle), chacun part du brief :
  - PLAN_REVIEW : Claude via claude_proxy LOCAL :8765 (plan + revue). Fallback Qwen 14B.
  - RED_TEAM    : Qwen 14B (LM Studio :1234) — angles morts / objections.
  - DIVERGENCE  : Gemini Flash (clé via os.getenv, JAMAIS un fichier) — hypothèses alternatives,
                  NE VALIDE RIEN (stance forcée DIVERGENCE). Fallback Qwen si clé/quota KO.

Sorties append-only (figées) : PLAN.md + CONSENSUS.md + désaccords structurés -> HumanGate.
Pas d'auto-résolution v1. governor.check() avant toute écriture. claim_posture NO_CLAIM_ALLOWED.

Sécurité / doctrine (red team IMP-198) :
  - Gemini est `never_internal_studio` (capabilities.yaml) : on lui envoie UNIQUEMENT un brief
    `genericize()` (marqueurs internes strippés) et GeminiAdapter REFUSE fail-closed tout prompt
    contenant encore un marqueur interne.
  - Claude = proxy LOCAL 8765 seulement (jamais l'API Anthropic externe / payante).
  - clé Gemini : os.getenv uniquement, auth header-only (jamais ?key=), jamais dans un artefact.
  - `asyncio.wait_for` ne tue PAS le thread executor -> requests reçoit un timeout (connect, read)
    strictement < budget rôle.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Protocol

_HERE = Path(__file__).resolve().parent
REPO = _HERE.parent
sys.path.insert(0, str(REPO / "governance"))
import governor  # noqa: E402

_log = logging.getLogger("council")

# ── Endpoints (env-overridable) ───────────────────────────────────────────────
CLAUDE_PROXY_URL = os.getenv("CLAUDE_PROXY_URL", "http://127.0.0.1:8765/v1")
LMSTUDIO_URL = os.getenv("LMSTUDIO_BASE_URL", "http://127.0.0.1:1234/v1")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

ROLE_TIMEOUT_S = 120
_CONNECT_TIMEOUT_S = 5
_READ_TIMEOUT_S = 110            # RT-198-2 : strictement < ROLE_TIMEOUT_S
COUNCIL_WRITE_ACTION = {"lane": "SAFE_AUTO", "mission": "council_artifact_write"}
ARTIFACT_DIR = REPO / "lab" / "council"

# Executor borné nommé (les fuites de thread restent observables — RT-198-2).
_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="council")

# Marqueurs internes interdits d'envoi à Gemini (never_internal_studio — RT-198-1).
_INTERNAL_RE = re.compile(
    r"(IMP-\d+|charter|autopilot|kaizen|ledger|governance|studio_state|\.py\b|\.rs\b|\.yaml\b"
    r"|\b(?:lab|src|scripts|ml|governance|openclaw)/)",
    re.IGNORECASE,
)


class CouncilError(Exception):
    """Erreur council générique."""


class CouncilCallError(CouncilError):
    """Échec d'appel d'un adapter (réseau/quota/refus). Message = chaîne FIXE (jamais de secret)."""


class GovernanceError(CouncilError):
    """Écriture refusée par le governor."""


# ── Enums ─────────────────────────────────────────────────────────────────────

class ModelId(str, Enum):
    CLAUDE = "claude"
    QWEN14B = "qwen2.5-14b"
    GEMINI_FLASH = "gemini-flash"


class Stance(str, Enum):
    APPROUVE = "APPROUVE"
    BLOQUE = "BLOQUE"
    ESCALADE = "ESCALADE"
    DIVERGENCE = "DIVERGENCE"     # Gemini : ne valide rien


class CouncilRole(str, Enum):
    PLAN_REVIEW = "PLAN_REVIEW"
    RED_TEAM = "RED_TEAM"
    DIVERGENCE = "DIVERGENCE"


# primary, fallback par rôle. Qwen (local) = filet de secours universel.
ROLE_ROUTING: dict[CouncilRole, tuple[ModelId, ModelId | None]] = {
    CouncilRole.PLAN_REVIEW: (ModelId.CLAUDE, ModelId.QWEN14B),
    CouncilRole.RED_TEAM:    (ModelId.QWEN14B, None),
    CouncilRole.DIVERGENCE:  (ModelId.GEMINI_FLASH, ModelId.QWEN14B),
}


# ── Dataclasses ────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class CouncilTask:
    brief: str
    task_id: str
    context: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ModelOpinion:
    model: ModelId
    role: CouncilRole
    stance: Stance
    rationale: str
    plan: str = ""
    risks: tuple[str, ...] = ()
    hypotheses: tuple[str, ...] = ()
    evidence_files: tuple[str, ...] = ()
    available: bool = True
    fallback_used: bool = False
    timed_out: bool = False
    parsed: bool = True


@dataclass(frozen=True)
class Disagreement:
    topic: str
    side_a: dict[str, str]
    side_b: dict[str, str]
    arbitrating_file: str | None = None
    route: str = "HUMANGATE"


@dataclass(frozen=True)
class CouncilResult:
    task_id: str
    generated_at: str
    plan_md: str
    opinions: tuple[ModelOpinion, ...]
    disagreements: tuple[Disagreement, ...]
    divergences: tuple[str, ...]
    requires_humangate: bool
    collapsed: bool
    distinct_models: int
    claim_posture: str = "NO_CLAIM_ALLOWED"

    def to_dict(self) -> dict[str, Any]:
        return {
            "task_id": self.task_id,
            "generated_at": self.generated_at,
            "claim_posture": self.claim_posture,
            "requires_humangate": self.requires_humangate,
            "collapsed": self.collapsed,
            "distinct_models": self.distinct_models,
            "opinions": [
                {
                    "model": o.model.value, "role": o.role.value, "stance": o.stance.value,
                    "available": o.available, "fallback_used": o.fallback_used,
                    "timed_out": o.timed_out, "parsed": o.parsed, "rationale": o.rationale,
                }
                for o in self.opinions
            ],
            "disagreements": [
                {
                    "topic": d.topic, "side_a": d.side_a, "side_b": d.side_b,
                    "arbitrating_file": d.arbitrating_file, "route": d.route,
                }
                for d in self.disagreements
            ],
            "divergences": list(self.divergences),
        }


# ── Sanitization Gemini (never_internal_studio — RT-198-1) ────────────────────

def genericize(text: str) -> str:
    """Strippe les marqueurs internes avant tout envoi à Gemini (generic_only)."""
    out = _INTERNAL_RE.sub("[REDACTED]", text)
    return out


def _has_internal_markers(text: str) -> bool:
    return bool(_INTERNAL_RE.search(text))


# ── Parsing tolérant (RT-198-11) ──────────────────────────────────────────────

_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)


def _extract_json(text: str) -> dict[str, Any] | None:
    """Extrait un objet JSON d'une sortie LLM sale (fences, prose, virgules traînantes)."""
    if not text:
        return None
    candidates: list[str] = []
    m = _FENCE_RE.search(text)
    if m:
        candidates.append(m.group(1))
    # premier bloc { ... } équilibré
    start = text.find("{")
    if start != -1:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    candidates.append(text[start:i + 1])
                    break
    candidates.append(text)
    for cand in candidates:
        for attempt in (cand, re.sub(r",(\s*[}\]])", r"\1", cand)):  # tolère virgules traînantes
            try:
                obj = json.loads(attempt)
                if isinstance(obj, dict):
                    return obj
            except (json.JSONDecodeError, ValueError):
                continue
    return None


def _parse_opinion(model: ModelId, role: CouncilRole, text: str) -> ModelOpinion:
    obj = _extract_json(text)
    if obj is None:
        return ModelOpinion(model=model, role=role, stance=Stance.ESCALADE,
                            rationale="unparseable", parsed=False)
    try:
        stance = Stance(str(obj.get("stance", "ESCALADE")).upper())
    except ValueError:
        stance = Stance.ESCALADE
    if role is CouncilRole.DIVERGENCE:
        stance = Stance.DIVERGENCE   # RT-198 : Gemini/divergence ne valide jamais
    return ModelOpinion(
        model=model, role=role, stance=stance,
        rationale=str(obj.get("rationale", ""))[:2000],
        plan=str(obj.get("plan", ""))[:8000],
        risks=tuple(str(r) for r in (obj.get("risks") or [])),
        hypotheses=tuple(str(h) for h in (obj.get("hypotheses") or [])),
        evidence_files=tuple(str(f) for f in (obj.get("evidence_files") or [])),
        parsed=True,
    )


# ── Adapters réels (openai-completions) — non exercés par l'oracle mocké ──────

class LLMAdapter(Protocol):
    model: ModelId
    def is_available(self) -> bool: ...
    def complete(self, prompt: str, *, read_timeout: float = _READ_TIMEOUT_S) -> str: ...


class _OpenAICompatAdapter:
    """Base openai-completions. Auth header-only. Aucune fuite de secret dans les exceptions."""

    def __init__(self, model: ModelId, base_url: str, model_name: str, api_key_env: str | None = None):
        self.model = model
        self._base = base_url.rstrip("/")
        self._model_name = model_name
        self._api_key_env = api_key_env

    def _api_key(self) -> str | None:
        return os.getenv(self._api_key_env) if self._api_key_env else None

    def is_available(self) -> bool:
        try:
            import requests
            r = requests.get(self._base.rsplit("/v1", 1)[0] + "/health",
                             timeout=(_CONNECT_TIMEOUT_S, 3))
            return r.status_code < 500
        except Exception:
            return False

    def complete(self, prompt: str, *, read_timeout: float = _READ_TIMEOUT_S) -> str:
        import requests
        headers = {"Content-Type": "application/json"}
        key = self._api_key()
        if key:
            headers["Authorization"] = f"Bearer {key}"   # header-only, jamais ?key=
        payload = {"model": self._model_name,
                   "messages": [{"role": "user", "content": prompt}],
                   "temperature": 0.2}
        try:
            r = requests.post(self._base + "/chat/completions", json=payload, headers=headers,
                              timeout=(_CONNECT_TIMEOUT_S, read_timeout))
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]
        except Exception as exc:  # noqa: BLE001 — mappe en chaîne FIXE (jamais de secret/URL/clé)
            raise CouncilCallError("call_failed") from None


class ClaudeProxyAdapter(_OpenAICompatAdapter):
    def __init__(self, base_url: str = CLAUDE_PROXY_URL):
        # RT-198-13 : proxy LOCAL uniquement, jamais l'API Anthropic externe.
        if "127.0.0.1" not in base_url and "localhost" not in base_url:
            raise CouncilError("ClaudeProxyAdapter: base_url doit etre local (jamais anthropic.com)")
        super().__init__(ModelId.CLAUDE, base_url, "claude-code-cli")


class QwenAdapter(_OpenAICompatAdapter):
    def __init__(self, base_url: str = LMSTUDIO_URL):
        super().__init__(ModelId.QWEN14B, base_url, "qwen2.5-14b-instruct")


class GeminiAdapter:
    """Gemini Flash — clé via os.getenv UNIQUEMENT (jamais un fichier). never_internal_studio."""

    model = ModelId.GEMINI_FLASH

    def is_available(self) -> bool:
        return bool(os.getenv("GEMINI_API_KEY"))

    def complete(self, prompt: str, *, read_timeout: float = _READ_TIMEOUT_S) -> str:
        if _has_internal_markers(prompt):
            # fail-closed : jamais de contenu interne vers l'externe (RT-198-1).
            raise CouncilCallError("refused_internal_content")
        key = os.getenv("GEMINI_API_KEY")
        if not key:
            raise CouncilCallError("no_api_key")
        import requests
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {key}"}
        payload = {"model": "gemini-flash",
                   "messages": [{"role": "user", "content": prompt}], "temperature": 0.4}
        try:
            r = requests.post(GEMINI_URL, json=payload, headers=headers,
                              timeout=(_CONNECT_TIMEOUT_S, read_timeout))
            # RT-198 : 429 = quota épuisé -> chaîne FIXE distincte (déclenche le warning + fallback Qwen).
            if r.status_code == 429:
                raise CouncilCallError("quota_exhausted")
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]
        except CouncilCallError:
            raise
        except Exception:
            raise CouncilCallError("call_failed") from None


# ── Prompts ────────────────────────────────────────────────────────────────────

def _role_prompt(role: CouncilRole, brief: str) -> str:
    base = ('Reponds UNIQUEMENT en JSON : {"stance","rationale","plan","risks":[],'
            '"hypotheses":[],"evidence_files":[]}.\n\nBrief:\n' + brief + "\n\n")
    if role is CouncilRole.PLAN_REVIEW:
        return base + "Role: produis un PLAN borne (champ plan) puis revois-le (stance/rationale)."
    if role is CouncilRole.RED_TEAM:
        return base + "Role: red team. Liste les angles morts/objections (risks) ; stance=BLOQUE si faille critique."
    return base + "Role: divergence. Propose des hypotheses ALTERNATIVES (hypotheses). Ne valide rien."


# ── Orchestration async ─────────────────────────────────────────────────────

async def _call_role(role: CouncilRole, adapters: dict[ModelId, LLMAdapter],
                     brief: str, timeout: float) -> ModelOpinion:
    primary, fallback = ROLE_ROUTING[role]
    timed_out = False
    loop = asyncio.get_event_loop()
    for model in (primary, fallback):
        if model is None:
            continue
        ad = adapters.get(model)
        if ad is None or not ad.is_available():
            # Gemini DOWN (clé absente / endpoint injoignable) -> warning + fallback Qwen.
            if model is ModelId.GEMINI_FLASH and fallback is not None:
                _log.warning("Gemini indisponible -> fallback Qwen %s", role.value)
            continue
        prompt = _role_prompt(role, brief)
        if model is ModelId.GEMINI_FLASH:
            prompt = genericize(prompt)   # never_internal_studio (RT-198-1)
        try:
            text = await asyncio.wait_for(
                loop.run_in_executor(_EXECUTOR, lambda a=ad, p=prompt: a.complete(p, read_timeout=_READ_TIMEOUT_S)),
                timeout,
            )
        except asyncio.TimeoutError:
            timed_out = True
            continue
        except CouncilCallError as exc:
            # Transparence du fallback : warning explicite quand Gemini lâche (quota 429 / appel KO).
            if model is ModelId.GEMINI_FLASH and fallback is not None:
                if str(exc) == "quota_exhausted":
                    _log.warning("Gemini quota épuisé -> fallback Qwen %s", role.value)
                else:
                    _log.warning("Gemini KO (%s) -> fallback Qwen %s", exc, role.value)
            continue
        return replace(_parse_opinion(model, role, text),
                       fallback_used=(model is not primary), available=True, timed_out=False)
    return ModelOpinion(model=primary, role=role, stance=Stance.ESCALADE,
                        rationale="role_unavailable", available=False, timed_out=timed_out, parsed=False)


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def synthesize(task: CouncilTask, opinions: tuple[ModelOpinion, ...],
               repo_root: Path) -> tuple[tuple[Disagreement, ...], tuple[str, ...], bool, bool, int]:
    """Renvoie (disagreements, divergences, requires_humangate, collapsed, distinct_models)."""
    by_role = {o.role: o for o in opinions}
    plan_op = by_role.get(CouncilRole.PLAN_REVIEW)
    red_op = by_role.get(CouncilRole.RED_TEAM)
    div_op = by_role.get(CouncilRole.DIVERGENCE)

    def _arbitrating(files: tuple[str, ...]) -> str | None:
        # RT-198-9 : déterministe (sorted), 1er existant dans le repo.
        for f in sorted(set(files)):
            if f and (Path(repo_root) / f).exists():
                return f
        return None

    disagreements: list[Disagreement] = []
    # RT-198-8 : seules les VRAIES objections (RED_TEAM BLOQUE) sont des désaccords escaladants.
    if red_op is not None and red_op.stance is Stance.BLOQUE:
        for risk in (red_op.risks or ("objection non détaillée",)):
            disagreements.append(Disagreement(
                topic=risk,
                side_a={"role": "PLAN_REVIEW", "model": (plan_op.model.value if plan_op else "?"),
                        "claim": "plan propose"},
                side_b={"role": "RED_TEAM", "model": red_op.model.value, "claim": risk},
                arbitrating_file=_arbitrating(red_op.evidence_files),
            ))
    # RT-198-8 : les hypothèses de divergence sont ADVISORY (exploration), pas des escalades en soi.
    divergences = tuple(div_op.hypotheses) if div_op else ()

    distinct_models = len({o.model for o in opinions if o.available})
    collapsed = distinct_models < 2          # RT-198-3 : échec silencieux mono-modèle
    degraded = any((not o.available) or o.timed_out for o in opinions)
    requires_humangate = bool(disagreements) or collapsed or degraded \
        or any(o.stance is Stance.BLOQUE for o in opinions)
    return tuple(disagreements), divergences, requires_humangate, collapsed, distinct_models


def _governed_append(path: Path, section: str, action: dict[str, Any]) -> None:
    """governor.check PUIS append-only (figé) sous verrou O_EXCL (RT-198-5/6/7)."""
    decision = governor.check(action)
    if not decision.allowed:
        raise GovernanceError(f"council write bloque: {decision.reason}")
    path.parent.mkdir(parents=True, exist_ok=True)
    lock = path.with_name(path.name + ".lock")
    fd = None
    for _ in range(100):
        try:
            fd = os.open(str(lock), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            break
        except FileExistsError:
            time.sleep(0.01)
    if fd is None:
        raise CouncilError(f"verrou artefact non acquis: {lock}")
    try:
        with path.open("a", encoding="utf-8") as fh:
            fh.write(section)
    finally:
        os.close(fd)
        try:
            lock.unlink()
        except FileNotFoundError:
            pass


def render_plan_md(task: CouncilTask, plan_md: str, now: str) -> str:
    return f"\n## {now} — PLAN {task.task_id}\n\n{plan_md}\n"


def render_consensus_md(result: CouncilResult) -> str:
    lines = [f"\n## {result.generated_at} — CONSENSUS {result.task_id}",
             f"- claim_posture : {result.claim_posture}",
             f"- requires_humangate : {result.requires_humangate}",
             f"- collapsed (modeles distincts={result.distinct_models}) : {result.collapsed}",
             "- opinions :"]
    for o in result.opinions:
        fb = " (fallback)" if o.fallback_used else ""
        to = " (timeout)" if o.timed_out else ""
        na = "" if o.available else " (indisponible)"
        lines.append(f"  - {o.role.value}: {o.model.value}{fb}{to}{na} -> {o.stance.value}")
    if result.disagreements:
        lines.append("- DESACCORDS (-> HumanGate, pas d'auto-resolution) :")
        for d in result.disagreements:
            arb = f" | fichier arbitre: {d.arbitrating_file}" if d.arbitrating_file else ""
            lines.append(f"  - {d.topic} [A:{d.side_a['model']} vs B:{d.side_b['model']}]{arb}")
    if result.divergences:
        lines.append("- divergences (exploration, advisory) :")
        for h in result.divergences:
            lines.append(f"  - {h}")
    return "\n".join(lines) + "\n"


async def run_council(task: CouncilTask, adapters: dict[ModelId, LLMAdapter], *,
                      repo_root: Path = REPO, out_dir: Path = ARTIFACT_DIR,
                      timeout: float = ROLE_TIMEOUT_S, now: str | None = None,
                      write: bool = True, write_action: dict[str, Any] | None = None) -> CouncilResult:
    """PLAN -> CONSENSUS. 3 rôles async, fallback, gouverné, append-only. Ne décide pas (NO_CLAIM)."""
    now = now or _now()
    roles = (CouncilRole.PLAN_REVIEW, CouncilRole.RED_TEAM, CouncilRole.DIVERGENCE)
    opinions = tuple(await asyncio.gather(*[_call_role(r, adapters, task.brief, timeout) for r in roles]))

    plan_op = next((o for o in opinions if o.role is CouncilRole.PLAN_REVIEW), None)
    plan_md = (plan_op.plan if plan_op and plan_op.plan else "(plan indisponible)")

    disagreements, divergences, requires_hg, collapsed, distinct = synthesize(task, opinions, repo_root)
    result = CouncilResult(
        task_id=task.task_id, generated_at=now, plan_md=plan_md, opinions=opinions,
        disagreements=disagreements, divergences=divergences, requires_humangate=requires_hg,
        collapsed=collapsed, distinct_models=distinct,
    )
    if write:
        act = write_action or COUNCIL_WRITE_ACTION
        out = Path(out_dir)
        _governed_append(out / "PLAN.md", render_plan_md(task, plan_md, now), act)
        _governed_append(out / "CONSENSUS.md", render_consensus_md(result), act)
    return result


# ── Validation de schéma (acceptance: output schema valide) ───────────────────

def validate_output(result_dict: dict[str, Any], schema_path: Path | None = None) -> None:
    import jsonschema
    schema_path = schema_path or (REPO / "schemas" / "council_output.schema.json")
    schema = json.loads(Path(schema_path).read_text(encoding="utf-8"))
    jsonschema.validate(result_dict, schema)


# ── CLI réel (production) — non exécuté par les tests ─────────────────────────

if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description="Council multi-LLM async (IMP-198)")
    ap.add_argument("--brief", required=True)
    ap.add_argument("--task-id", default="council-adhoc")
    args = ap.parse_args()
    _adapters: dict[ModelId, LLMAdapter] = {
        ModelId.CLAUDE: ClaudeProxyAdapter(),
        ModelId.QWEN14B: QwenAdapter(),
        ModelId.GEMINI_FLASH: GeminiAdapter(),
    }
    _res = asyncio.run(run_council(CouncilTask(brief=args.brief, task_id=args.task_id), _adapters))
    print(json.dumps(_res.to_dict(), ensure_ascii=False, indent=2))
    raise SystemExit(0 if not _res.requires_humangate else 10)
