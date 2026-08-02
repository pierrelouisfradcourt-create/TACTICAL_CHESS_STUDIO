"""Adaptateur `forge_evidence` de Forge Observer V0.

Reconstruit les evenements de dispatch, telemetrie, tentatives de builder,
echecs journalises et commits git pour UN SEUL projet, a partir de fichiers
qui sont **partages entre tous les projets du studio** :

    lab/forge_evidence/dispatch_audit.jsonl
    lab/forge_evidence/dispatch_dryrun*.jsonl
    lab/forge_evidence/forge_telemetry.jsonl
    lab/forge_evidence/forge_builder_runs.jsonl
    lab/reports/error_journal/*.jsonl
    (+ historique git de games/<projet> et lab/forge_runs/<projet>)

Comme ces fichiers melangent tous les projets, chaque ligne est filtree sur
`ctx.project` avant d'etre transformee en `Event`. Le filtre principal est le
prefixe du `run_id` (`<project>-...`) ; `lab/reports/error_journal/*.jsonl`
porte en plus un champ `project` explicite, utilise en complement — une
divergence entre les deux est signalee via `note`, jamais avaladee en
silence.

Deux pieges de vocabulaire traverses ici, gardes visibles a dessein :
  * `forge_builder_runs.jsonl` n'a pas de `run_id` : c'est `task_id` qui porte
    la meme chaine. Idem `builder_id` pour ce que les autres sources
    appellent `model`. Normalise ici, jamais fusionne en silence.
  * `error_journal/*.jsonl` porte a la fois `date` (ISO8601 naif) et `ts`
    (epoch). Le `ts` normalise sert de reference ; `date` est conserve tel
    quel sous `date_raw` ; un ecart de plus de 60s entre les deux est note.

Ce module ne lit que via `ObserverContext` (`read_jsonl`, `read_json`, `git`)
et ne rattrape jamais `BlindnessViolation`.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Optional

from observer.events import (
    LINK_DIRECT,
    LINK_NONE,
    PROOF_MECHANICAL,
    PROOF_SIGNED,
    Actor,
    Event,
    Source,
    extract_attempt,
    normalize_ts,
)
from observer.sources import ObserverContext

NAME = "forge_evidence"

LOG = logging.getLogger("observer.adapters.forge_evidence")

_MAX_COMMIT_FILES = 200
_TOOL_AUTHOR_MARKERS = ("bot", "[bot]", "actions", "noreply", "ci-", " ci ")


def collect(ctx: ObserverContext) -> list[Event]:
    """Point d'entree impose par le contrat des adaptateurs."""
    events: list[Event] = []

    events.extend(_collect_dispatch(ctx, ctx.evidence_dir / "dispatch_audit.jsonl"))
    for path in ctx.iter_files(ctx.evidence_dir, "dispatch_dryrun*.jsonl"):
        events.extend(_collect_dispatch(ctx, path))

    events.extend(_collect_telemetry(ctx))
    events.extend(_collect_builder_runs(ctx))
    events.extend(_collect_error_journal(ctx))
    events.extend(_collect_git_commits(ctx))

    return events


# --------------------------------------------------------------------------- #
# Filtrage projet — les sources sont partagees entre tous les projets
# --------------------------------------------------------------------------- #


def _belongs_to_project(ctx: ObserverContext, run_id: Optional[str]) -> bool:
    if not run_id:
        return False
    return run_id == ctx.project or run_id.startswith(f"{ctx.project}-")


def _is_dryrun(run_id: Optional[str]) -> bool:
    return bool(run_id) and "dryrun" in run_id


def _actor_kind_for_model(model: Optional[str]) -> str:
    if not model:
        return "unknown"
    if model == "non-llm":
        return "non_llm"
    if "claude" in model.lower():
        return "llm_agent"
    return "unknown"


def _drop_none(payload: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in payload.items() if v is not None}


# --------------------------------------------------------------------------- #
# dispatch_audit.jsonl + dispatch_dryrun*.jsonl
# --------------------------------------------------------------------------- #


def _collect_dispatch(ctx: ObserverContext, path: Path) -> list[Event]:
    events: list[Event] = []
    for lineno, obj in ctx.read_jsonl(path):
        run_id = obj.get("run_id")
        if not _belongs_to_project(ctx, run_id):
            continue

        event_name = obj.get("event")
        if event_name == "spawn_prepared":
            kind = "dispatch.prepared"
        elif event_name == "spawn_executed":
            kind = "dispatch.executed"
        else:
            LOG.debug(
                "dispatch %s:%d — champ 'event' absent ou inconnu (%r), ligne ignoree",
                ctx.rel(path),
                lineno,
                event_name,
            )
            continue

        ts, ts_raw, ts_format = normalize_ts(obj.get("ts"))
        attempt, attempt_field = extract_attempt(obj)
        model = obj.get("model") or None

        payload = _drop_none(
            {
                "event": event_name,
                "allowed_tools": obj.get("allowed_tools"),
                "capability_role": obj.get("capability_role") or None,
                "provider": obj.get("provider") or None,
                "unprofiled": obj.get("unprofiled"),
                "hmac": obj.get("hmac"),
                "is_dryrun": _is_dryrun(run_id),
            }
        )

        events.append(
            Event(
                kind=kind,
                source=Source(path=ctx.rel(path), fmt="jsonl", line=lineno),
                proof=PROOF_SIGNED,
                link=LINK_DIRECT,
                ts=ts,
                ts_raw=ts_raw,
                ts_format=ts_format,
                run_id=run_id,
                project=ctx.project,
                etape=obj.get("etape"),
                attempt=attempt,
                attempt_field=attempt_field,
                actor=Actor(
                    kind=_actor_kind_for_model(model),
                    model=model,
                    provider=obj.get("provider") or None,
                    capability_role=obj.get("capability_role") or None,
                ),
                payload=payload,
            )
        )
    return events


# --------------------------------------------------------------------------- #
# forge_telemetry.jsonl
# --------------------------------------------------------------------------- #


def _collect_telemetry(ctx: ObserverContext) -> list[Event]:
    events: list[Event] = []
    path = ctx.evidence_dir / "forge_telemetry.jsonl"
    for lineno, obj in ctx.read_jsonl(path):
        run_id = obj.get("run_id")
        if not _belongs_to_project(ctx, run_id):
            continue

        ts, ts_raw, ts_format = normalize_ts(obj.get("ts"))
        attempt, attempt_field = extract_attempt(obj)
        model = obj.get("model") or None

        payload = _drop_none(
            {
                "cost_usd": obj.get("cost_usd"),
                "duration_s": obj.get("duration_s"),
                "tokens": obj.get("tokens"),
                "outcome": obj.get("outcome"),
                "model": model,
                "is_dryrun": _is_dryrun(run_id),
            }
        )

        events.append(
            Event(
                kind="telemetry.step",
                source=Source(path=ctx.rel(path), fmt="jsonl", line=lineno),
                proof=PROOF_MECHANICAL,
                link=LINK_DIRECT,
                ts=ts,
                ts_raw=ts_raw,
                ts_format=ts_format,
                run_id=run_id,
                project=ctx.project,
                etape=obj.get("etape"),
                attempt=attempt,
                attempt_field=attempt_field,
                actor=Actor(kind=_actor_kind_for_model(model), model=model),
                payload=payload,
            )
        )
    return events


# --------------------------------------------------------------------------- #
# forge_builder_runs.jsonl — vocabulaire propre (task_id / builder_id)
# --------------------------------------------------------------------------- #


def _collect_builder_runs(ctx: ObserverContext) -> list[Event]:
    events: list[Event] = []
    path = ctx.evidence_dir / "forge_builder_runs.jsonl"
    for lineno, obj in ctx.read_jsonl(path):
        run_id = obj.get("task_id")  # ce fichier n'a pas de champ run_id
        if not _belongs_to_project(ctx, run_id):
            continue

        ts, ts_raw, ts_format = normalize_ts(obj.get("ts"))
        attempt, attempt_field = extract_attempt(obj)
        model = obj.get("builder_id") or None

        payload = _drop_none(
            {
                "task_id": obj.get("task_id"),
                "builder_id": obj.get("builder_id"),
                "tier": obj.get("tier"),
                "strategy": obj.get("strategy"),
                "retry_number": obj.get("retry_number"),
                "oracle_result": obj.get("oracle_result"),
                "cost_estimated": obj.get("cost_estimated"),
                "duration_s": obj.get("duration_s"),
                "tokens_estimated": obj.get("tokens_estimated"),
                "is_dryrun": _is_dryrun(run_id),
            }
        )

        events.append(
            Event(
                kind="builder.attempt",
                source=Source(path=ctx.rel(path), fmt="jsonl", line=lineno),
                proof=PROOF_MECHANICAL,
                link=LINK_DIRECT,
                ts=ts,
                ts_raw=ts_raw,
                ts_format=ts_format,
                run_id=run_id,
                project=ctx.project,
                etape=obj.get("etape"),
                attempt=attempt,
                attempt_field=attempt_field,
                actor=Actor(kind=_actor_kind_for_model(model), model=model),
                payload=payload,
                note=(
                    "run_id normalise depuis 'task_id' (ce fichier n'a pas de champ "
                    "run_id) ; actor.model normalise depuis 'builder_id' — vocabulaire "
                    "propre a forge_builder_runs.jsonl, distinct des champs run_id/model "
                    "utilises par les autres sources."
                ),
            )
        )
    return events


# --------------------------------------------------------------------------- #
# lab/reports/error_journal/*.jsonl — double filtre project + run_id,
# double horodatage date/ts
# --------------------------------------------------------------------------- #


def _collect_error_journal(ctx: ObserverContext) -> list[Event]:
    events: list[Event] = []
    for path in ctx.iter_files(ctx.error_journal_dir, "*.jsonl"):
        domain = path.stem
        for lineno, obj in ctx.read_jsonl(path):
            run_id = obj.get("run_id")
            project_field = obj.get("project")

            matched_by_project = project_field == ctx.project
            matched_by_runid = _belongs_to_project(ctx, run_id)
            if not (matched_by_project or matched_by_runid):
                continue

            note: Optional[str] = None
            if matched_by_project and run_id and not matched_by_runid:
                note = (
                    f"project='{project_field}' correspond mais run_id='{run_id}' ne "
                    f"commence pas par '{ctx.project}-' (vocabulaire project vs run_id "
                    "divergent)"
                )
            elif matched_by_runid and project_field and project_field != ctx.project:
                note = (
                    f"run_id='{run_id}' correspond au prefixe attendu mais "
                    f"project='{project_field}' differe de '{ctx.project}' (vocabulaire "
                    "project vs run_id divergent)"
                )

            ts_val, ts_raw, ts_format = normalize_ts(obj.get("ts"))
            date_epoch, _date_raw, _date_format = normalize_ts(obj.get("date"))
            if ts_val is not None and date_epoch is not None:
                gap = abs(ts_val - date_epoch)
                if gap > 60:
                    contradiction = (
                        f"'ts' ({obj.get('ts')!r}) et 'date' ({obj.get('date')!r}) "
                        f"divergent de {gap:.1f}s"
                    )
                    note = f"{note}; {contradiction}" if note else contradiction

            payload = _drop_none(
                {
                    "domain": domain,
                    "error": obj.get("error"),
                    "status": obj.get("status"),
                    "resolution": obj.get("resolution"),
                    "date_raw": obj.get("date"),
                }
            )

            events.append(
                Event(
                    kind="failure.event",
                    source=Source(path=ctx.rel(path), fmt="jsonl", line=lineno),
                    proof=PROOF_MECHANICAL,
                    link=LINK_DIRECT,
                    ts=ts_val,
                    ts_raw=ts_raw,
                    ts_format=ts_format,
                    run_id=run_id,
                    project=ctx.project,
                    etape=obj.get("etape"),
                    payload=payload,
                    note=note,
                )
            )
    return events


# --------------------------------------------------------------------------- #
# Historique git — proof MECHANICAL, link NONE (jamais de lien fabrique)
# --------------------------------------------------------------------------- #


def _looks_like_tool_author(author: str) -> bool:
    lowered = author.lower()
    return any(marker in lowered for marker in _TOOL_AUTHOR_MARKERS)


def _collect_git_commits(ctx: ObserverContext) -> list[Event]:
    events: list[Event] = []

    output = ctx.git(
        "log",
        "--all",
        "--date=iso-strict",
        "--format=%H\x1f%an\x1f%aI\x1f%s",
        "--",
        f"games/{ctx.project}",
        f"lab/forge_runs/{ctx.project}",
    )
    if output is None:
        LOG.info("git log indisponible pour le projet %s", ctx.project)
    else:
        for line in output.splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split("\x1f")
            if len(parts) != 4:
                LOG.warning("ligne git log inattendue (%d champs): %r", len(parts), line)
                continue
            sha, author, date_iso, subject = parts

            ts, ts_raw, ts_format = normalize_ts(date_iso)

            files_changed: list[str] = []
            files_truncated = False
            show_output = ctx.git("show", "--name-only", "--format=", sha)
            if show_output:
                all_files = [f for f in show_output.splitlines() if f.strip()]
                if len(all_files) > _MAX_COMMIT_FILES:
                    files_truncated = True
                files_changed = all_files[:_MAX_COMMIT_FILES]

            actor_kind = "unknown" if _looks_like_tool_author(author) else "human"

            payload = _drop_none(
                {
                    "sha": sha,
                    "author": author,
                    "subject": subject,
                    "files_changed": files_changed,
                    "files_truncated": True if files_truncated else None,
                }
            )

            events.append(
                Event(
                    kind="git.commit",
                    source=Source(path=f"git:log:{sha[:12]}", fmt="git"),
                    proof=PROOF_MECHANICAL,
                    link=LINK_NONE,
                    ts=ts,
                    ts_raw=ts_raw,
                    ts_format=ts_format,
                    run_id=None,
                    project=ctx.project,
                    actor=Actor(kind=actor_kind),
                    payload=payload,
                )
            )

    head_sha = ctx.git("rev-parse", "HEAD")
    if head_sha:
        head_sha = head_sha.strip()
        events.append(
            Event(
                kind="git.commit",
                source=Source(path="git:rev-parse:HEAD", fmt="git"),
                proof=PROOF_MECHANICAL,
                link=LINK_NONE,
                run_id=None,
                project=ctx.project,
                payload={"role": "head_at_observation", "sha": head_sha},
            )
        )
    else:
        LOG.info("git rev-parse HEAD indisponible")

    return events
