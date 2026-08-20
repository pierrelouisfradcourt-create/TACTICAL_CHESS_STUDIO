#!/usr/bin/env python3
"""semantic_oracle.py — oracle sémantique HumanGate pour IMP non mécanisables (IMP-201).

Pour les IMP design / balance / doc non couverts par un oracle mécanique (cargo/pytest), fournit :
  - une checklist JSON-schema validée (artefact de ratification) ;
  - la règle « tout IMP a EXACTEMENT un oracle_type ; non-automatable -> humangate » ;
  - le GATE de la transition ECG ORACLE_PENDING -> VERDICT_SIGNED : bloquée sans ratification
    (PAS d'auto-pass).

Compose AU-DESSUS de `ecg` (IMP-195) : réutilise can_transition / current_state / parse_notes_meta
(aucune réécriture de la state machine). Code PUR, déterministe : aucune horloge, aucune I/O.
"""
from __future__ import annotations

import re
from typing import Any

import ecg  # noqa: E402  (state machine ECG — réutilisée, pas réécrite)

VALID_ORACLE_TYPES = ecg.VALID_ORACLE_TYPES   # {code, structure, humangate, none}
AUTOMATABLE = frozenset({"code", "structure"})

# Indices (type/domain/title) qu'un IMP est non-automatable -> doit être humangate.
_HUMANGATE_HINTS = ("design", "balance", "doc", "ux", "narrative", "lore")


# ── JSON Schema (draft-07) de la checklist de ratification ─────────────────────
CHECKLIST_SCHEMA: dict[str, Any] = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "additionalProperties": True,
    "required": ["imp_id", "oracle_type", "items", "ratified_by", "ratified_ts"],
    "properties": {
        "imp_id": {"type": "string", "pattern": r"^IMP-\d+$"},
        "oracle_type": {"type": "string", "enum": sorted(VALID_ORACLE_TYPES)},
        "ratified_by": {"type": "string", "minLength": 1},
        "ratified_ts": {"type": "integer"},
        "items": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": ["id", "question", "checked"],
                "properties": {
                    "id": {"type": "string", "minLength": 1},
                    "question": {"type": "string", "minLength": 1},
                    "checked": {"type": "boolean"},
                    "evidence": {"type": "string"},
                },
                "additionalProperties": True,
            },
        },
    },
}


class SemanticOracleError(Exception):
    """Checklist/contrat invalide."""


class OracleTypeError(SemanticOracleError):
    """oracle_type absent / multiple / invalide."""


_IMP_ID_RE = re.compile(r"^IMP-\d+$")


# ── validation de la checklist (jsonschema si dispo, sinon validateur maison) ──
def validate_checklist(obj: Any, prefer_fallback: bool = False) -> None:
    """Valide la checklist contre CHECKLIST_SCHEMA. Lève SemanticOracleError si invalide.

    RT-201-3 : le validateur maison est tenu à PARITÉ avec le schema (mêmes accept/reject), pour
    que le verdict ne dépende pas de la présence de jsonschema. `prefer_fallback` force la branche
    maison (test de parité)."""
    if not isinstance(obj, dict):
        raise SemanticOracleError(f"checklist non-dict: {type(obj).__name__}")
    if not prefer_fallback:
        try:
            import jsonschema  # type: ignore
        except ImportError:
            _validate_checklist_fallback(obj)
            return
        try:
            jsonschema.validate(obj, CHECKLIST_SCHEMA)
        except jsonschema.ValidationError as exc:  # type: ignore[attr-defined]
            raise SemanticOracleError(f"checklist invalide: {exc.message}") from exc
        return
    _validate_checklist_fallback(obj)


def _validate_checklist_fallback(obj: dict[str, Any]) -> None:
    """Validateur maison à PARITÉ avec CHECKLIST_SCHEMA (RT-201-3)."""
    for req in ("imp_id", "oracle_type", "items", "ratified_by", "ratified_ts"):
        if req not in obj:
            raise SemanticOracleError(f"checklist: champ requis manquant: {req}")
    if not isinstance(obj["imp_id"], str) or not _IMP_ID_RE.match(obj["imp_id"]):
        raise SemanticOracleError("checklist: imp_id invalide (^IMP-\\d+$)")
    if obj["oracle_type"] not in VALID_ORACLE_TYPES:
        raise SemanticOracleError(f"checklist: oracle_type invalide: {obj['oracle_type']!r}")
    if not isinstance(obj["ratified_by"], str) or not obj["ratified_by"]:
        raise SemanticOracleError("checklist: ratified_by vide")
    if not isinstance(obj["ratified_ts"], int) or isinstance(obj["ratified_ts"], bool):
        raise SemanticOracleError("checklist: ratified_ts non-int")
    items = obj["items"]
    if not isinstance(items, list) or not items:
        raise SemanticOracleError("checklist: items vide")
    for it in items:
        if not isinstance(it, dict) or "id" not in it or "question" not in it \
                or "checked" not in it:
            raise SemanticOracleError("checklist: item incomplet (id/question/checked)")
        if not isinstance(it["id"], str) or not it["id"]:
            raise SemanticOracleError("checklist: item.id non-string/vide")
        if not isinstance(it["question"], str) or not it["question"]:
            raise SemanticOracleError("checklist: item.question non-string/vide")
        if not isinstance(it["checked"], bool):
            raise SemanticOracleError("checklist: item.checked non-booléen")


# ── règle : exactement un oracle_type ─────────────────────────────────────────
def exactly_one_oracle_type(imp: dict[str, Any]) -> str:
    """Renvoie l'unique oracle_type de l'IMP (champ + notes cohérents). Lève sinon.

    Sources : `imp['oracle_type']` et `parse_notes_meta(notes)['oracle_type']`. L'ensemble des
    valeurs non-nulles doit être EXACTEMENT un singleton valide. Zéro -> OracleTypeError
    (doit être déclaré) ; divergence -> OracleTypeError (pas de choix silencieux)."""
    if not isinstance(imp, dict):
        raise OracleTypeError(f"imp non-dict: {type(imp).__name__}")
    candidates = set()
    field = imp.get("oracle_type")
    if field is not None:
        if not isinstance(field, str):   # RT-201-9 : type-guard (pas de TypeError sur set.add)
            raise OracleTypeError(f"{imp.get('id', '?')}: oracle_type non-string: {field!r}")
        candidates.add(field)
    notes_meta = ecg.parse_notes_meta(imp.get("notes", "") or "")
    if notes_meta.get("oracle_type"):
        candidates.add(notes_meta["oracle_type"])

    if not candidates:
        raise OracleTypeError(f"{imp.get('id', '?')}: oracle_type manquant (doit être déclaré)")
    if len(candidates) > 1:
        raise OracleTypeError(
            f"{imp.get('id', '?')}: oracle_type divergent {sorted(candidates)} (doit être unique)")
    ot = candidates.pop()
    if ot not in VALID_ORACLE_TYPES:
        raise OracleTypeError(f"{imp.get('id', '?')}: oracle_type invalide: {ot!r}")
    return ot


def requires_humangate(imp: dict[str, Any]) -> bool:
    """True si l'IMP est non-automatable (design/balance/doc/ux/...) -> humangate attendu."""
    blob = " ".join(str(imp.get(k, "")) for k in ("type", "domain", "title")).lower()
    return any(h in blob for h in _HUMANGATE_HINTS)


def oracle_type_violations(data: dict[str, Any]) -> list[dict[str, str]]:
    """Liste des IMPs violant la règle oracle_type (audit ledger). Lecture seule, pur.

    Violation = oracle_type absent/multiple/invalide, OU non-automatable sans humangate."""
    out: list[dict[str, str]] = []
    for imp in data.get("improvements", []):
        iid = imp.get("id", "?")
        try:
            ot = exactly_one_oracle_type(imp)
        except OracleTypeError as exc:
            out.append({"id": iid, "violation": str(exc)})
            continue
        if requires_humangate(imp) and ot != "humangate":
            out.append({"id": iid,
                        "violation": f"non-automatable mais oracle_type={ot} (humangate attendu)"})
    return out


# ── GATE : ORACLE_PENDING -> VERDICT_SIGNED, bloqué sans ratification ──────────
def _state_contradiction(imp: dict[str, Any]) -> str | None:
    """RT-201-7 : détecte un `ecg_state` explicite qui CONTREDIT le `status` legacy sur CLOSED.

    Empêche qu'un IMP CLOSED réétiqueté `ecg_state=ORACLE_PENDING` (ou l'inverse) passe la garde."""
    ecg_state = imp.get("ecg_state")
    status = imp.get("status")
    if ecg_state in ecg.ECG_STATES and status in ecg.DEFAULT_FROM_STATUS:
        legacy_closed = ecg.DEFAULT_FROM_STATUS[status] == "CLOSED"
        if legacy_closed != (ecg_state == "CLOSED"):
            return f"ecg_state={ecg_state!r} contredit status={status!r}"
    return None


def can_sign_verdict(imp: dict[str, Any], ratification: dict[str, Any] | None = None) -> ecg.Decision:
    """Verdict déterministe pour signer (ORACLE_PENDING -> VERDICT_SIGNED). PAS d'auto-pass.

    Fail-closed : toute entrée adverse / exception inattendue -> BLOCK (jamais de raise, jamais ALLOW).
    - cohérence d'état (ecg_state vs status legacy) puis garde ECG (seul ORACLE_PENDING peut signer) ;
    - RT-201-1 : un IMP non-automatable (design/balance/doc) DOIT être humangate -> sinon BLOCK ;
    - oracle_type=none -> BLOCK (reclasser humangate) ;
    - humangate -> checklist ratifiée complète ET liée à CET imp_id (RT-201-2) ;
    - code/structure -> preuve `oracle_passed is True` liée à CET imp_id (RT-201-4, binding ; la
      vérification HMAC complète reste déléguée à verdict/smoke-check — cf. FINDINGS résidu).
    """
    if not isinstance(imp, dict):
        return ecg.Decision(ecg.BLOCK, f"imp non-dict: {type(imp).__name__}")
    try:
        contradiction = _state_contradiction(imp)
        if contradiction:
            return ecg.Decision(ecg.BLOCK, f"état incohérent: {contradiction}")

        state = ecg.current_state(imp)
        base = ecg.can_transition(state, "VERDICT_SIGNED")
        if not base.allowed:
            return ecg.Decision(ecg.BLOCK, f"ECG: {base.reason}")

        ot = exactly_one_oracle_type(imp)

        # RT-201-1 : non-automatable mais pas humangate -> bypass de la HumanGate. Refus dur.
        if requires_humangate(imp) and ot != "humangate":
            return ecg.Decision(
                ecg.BLOCK,
                f"non-automatable (design/balance/doc) avec oracle_type={ot} — doit être humangate")

        if ot == "none":
            return ecg.Decision(
                ecg.BLOCK, "oracle_type=none interdit pour signer — non-automatable -> reclasser humangate")

        imp_id = imp.get("id")

        if ot == "humangate":
            if ratification is None:
                return ecg.Decision(ecg.BLOCK, "humangate: ratification Pierre obligatoire (pas d'auto-pass)")
            try:
                validate_checklist(ratification)
            except SemanticOracleError as exc:
                return ecg.Decision(ecg.BLOCK, f"humangate: checklist invalide — {exc}")
            if ratification.get("oracle_type") != "humangate":
                return ecg.Decision(ecg.BLOCK, "humangate: checklist.oracle_type != humangate")
            if ratification.get("imp_id") != imp_id:   # RT-201-2 : binding anti-replay cross-IMP
                return ecg.Decision(
                    ecg.BLOCK,
                    f"humangate: checklist.imp_id={ratification.get('imp_id')!r} != imp.id={imp_id!r}")
            if not ratification.get("ratified_by"):
                return ecg.Decision(ecg.BLOCK, "humangate: ratified_by manquant")
            items = ratification.get("items") or []
            if not items:   # RT-201-6 : defense-in-depth contre la vérité vacante de all([])
                return ecg.Decision(ecg.BLOCK, "humangate: checklist sans items")
            if not all(it.get("checked") is True for it in items):
                return ecg.Decision(ecg.BLOCK, "humangate: checklist incomplète (item non coché)")
            return ecg.Decision(ecg.ALLOW, "humangate: checklist ratifiée et complète")

        # code / structure : preuve mécanique liée à cet IMP (jamais d'auto-pass).
        if not isinstance(ratification, dict) or ratification.get("oracle_passed") is not True:
            return ecg.Decision(
                ecg.BLOCK, f"oracle {ot}: preuve mécanique requise (ratification.oracle_passed=True)")
        if ratification.get("imp_id") != imp_id:   # RT-201-4 : binding (anti-replay)
            return ecg.Decision(
                ecg.BLOCK,
                f"oracle {ot}: preuve.imp_id={ratification.get('imp_id')!r} != imp.id={imp_id!r}")
        return ecg.Decision(ecg.ALLOW, f"oracle {ot}: preuve mécanique fournie (binding OK)")
    except Exception as exc:   # noqa: BLE001 — fail-closed : jamais de raise/ALLOW sur entrée adverse
        return ecg.Decision(ecg.BLOCK, f"entrée invalide (fail-closed): {type(exc).__name__}: {exc}")


if __name__ == "__main__":
    import json
    import sys

    payload = json.loads(sys.stdin.read() or "{}")
    imp = payload.get("imp", {})
    ratification = payload.get("ratification")
    d = can_sign_verdict(imp, ratification)
    print(json.dumps({"verdict": d.verdict, "reason": d.reason, "allowed": d.allowed}))
    sys.exit(0 if d.allowed else 1)
