#!/usr/bin/env python3
"""council_router.py — routeur etape 5 : contrat v1 -> ledger via kaizen_loop (single-writer).

Chantier Council->Factory (v0). Le Council propose, ne dispose pas. Ce routeur prend un contrat
DEJA VALIDE (council_contract.validate_contract) et decide la lane finale de chaque proposed_item,
puis ecrit les items acceptes UNIQUEMENT via kaizen_loop.cmd_add (-> save_ledger -> guarded_write,
single-writer garde IMP-194/205). Le routeur n'ecrit JAMAIS le ledger en direct.

Regles (decisions HumanGate 2026-07-06) :
  - suggested_lane est CONSULTATIF. Lane finale = plancher D1 :
      SAFE_AUTO    (suggere) -> AUDIT_REQUIRED  (jamais SAFE_AUTO pour un item d'origine council v0)
      AUDIT_REQUIRED         -> AUDIT_REQUIRED
      HUMAN_REQUIRED         -> arret net : AUCUNE action (item mis de cote pour l'humain, pas d'ecriture)
  - D2 : items crees en OPEN + origine council (source="council" ; evidence/suggested_lane en notes).
  - Dedup naif ratifie : un item dont le titre existe deja (ledger ou meme lot) est saute.

claim_verdict: NO_CLAIM_ALLOWED
"""
from __future__ import annotations

import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import SimpleNamespace
from typing import Any

_HERE = Path(__file__).resolve().parent
REPO = _HERE.parent
for _p in (_HERE, REPO / "governance", REPO / "lab" / "chains"):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

FLOOR_LANE = "AUDIT_REQUIRED"        # plancher D1
COUNCIL_SOURCE = "council"           # D2 : origine
# Defaults v0 : un item council atterrit en AUDIT_REQUIRED -> revu par un humain qui ajuste impact/effort.
DEFAULT_IMPACT = "MEDIUM"
DEFAULT_EFFORT = "MEDIUM"
DEFAULT_TYPE = "council-proposed"


@dataclass(frozen=True)
class RoutingDecision:
    title: str
    action: str                      # "accepted" | "skipped_human" | "skipped_duplicate"
    final_lane: str | None
    suggested_lane: str


@dataclass
class RoutingResult:
    accepted: list[dict] = field(default_factory=list)
    skipped_human: list[dict] = field(default_factory=list)
    skipped_duplicate: list[dict] = field(default_factory=list)
    decisions: list[RoutingDecision] = field(default_factory=list)


def _final_lane(suggested: str) -> str | None:
    """D1 : HUMAN_REQUIRED -> None (arret net) ; tout le reste -> plancher AUDIT_REQUIRED."""
    if suggested == "HUMAN_REQUIRED":
        return None
    return FLOOR_LANE


def route_contract(contract: dict, existing_titles: set[str]) -> RoutingResult:
    """PUR : classe chaque proposed_item (accepted / skipped_human / skipped_duplicate) + lane finale.
    N'ecrit RIEN. Dedup naif : titre deja dans `existing_titles` ou deja vu dans ce lot -> saute."""
    res = RoutingResult()
    seen: set[str] = set()
    for item in contract.get("proposed_items", []):
        title = item["title"]
        suggested = item["suggested_lane"]
        lane = _final_lane(suggested)
        if lane is None:
            res.skipped_human.append(item)
            res.decisions.append(RoutingDecision(title, "skipped_human", None, suggested))
            continue
        if title in existing_titles or title in seen:
            res.skipped_duplicate.append(item)
            res.decisions.append(RoutingDecision(title, "skipped_duplicate", lane, suggested))
            continue
        seen.add(title)
        res.accepted.append(item)
        res.decisions.append(RoutingDecision(title, "accepted", lane, suggested))
    return res


def _notes_for(item: dict) -> str:
    refs = ",".join(item.get("evidence_refs", []) or [])
    parts = [f"origin={COUNCIL_SOURCE}", f"suggested_lane={item.get('suggested_lane')}"]
    if refs:
        parts.append(f"evidence_refs={refs}")
    return " | ".join(parts)


def apply_contract(
    contract: dict,
    *,
    ledger_path: Path | str,
    session: str = "",
    impact: str = DEFAULT_IMPACT,
    effort: str = DEFAULT_EFFORT,
    dry_run: bool = False,
) -> tuple[RoutingResult, list[str]]:
    """Route le contrat puis ECRIT les items acceptes via kaizen_loop.cmd_add (single-writer garde).

    `ledger_path` est OBLIGATOIRE et explicite (les tests passent un ledger temporaire ; jamais le
    canonique). dry_run=True : route seulement, aucune ecriture. Renvoie (RoutingResult, [nouveaux_ids]).
    """
    import kaizen_loop  # single-writer : la SEULE voie d'ecriture du ledger
    data = kaizen_loop.load_ledger(Path(ledger_path))
    existing_titles = {i.get("title", "") for i in data.get("improvements", [])}
    result = route_contract(contract, existing_titles)

    new_ids: list[str] = []
    if not dry_run:
        for item in result.accepted:
            args = SimpleNamespace(
                title=item["title"],
                impact=impact, effort=effort, lane=FLOOR_LANE,   # D1 : jamais SAFE_AUTO
                type=DEFAULT_TYPE,
                source=COUNCIL_SOURCE,                            # D2 : origine council
                files="",
                acceptance=(item.get("rationale", "") or "")[:500] or "TBD",
                domain="",
                notes=_notes_for(item),
                session=session,
                ledger_path=Path(ledger_path),
            )
            before = {i["id"] for i in data["improvements"]}
            kaizen_loop.cmd_add(data, args)                       # -> save_ledger -> guarded_write
            new_ids.extend(sorted({i["id"] for i in data["improvements"]} - before))
    return result, new_ids


if __name__ == "__main__":
    import argparse
    import json
    for _stream in (sys.stdout, sys.stderr):
        _reconf = getattr(_stream, "reconfigure", None)
        if _reconf is not None:
            try:
                _reconf(encoding="utf-8")
            except (ValueError, OSError):
                pass
    ap = argparse.ArgumentParser(description="Route un contrat council v1 vers le ledger (kaizen_loop).")
    ap.add_argument("contract", help="Fichier JSON du contrat (deja valide)")
    ap.add_argument("--ledger-path", required=True, help="Chemin ledger cible (explicite)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    _contract = json.loads(Path(args.contract).read_text(encoding="utf-8"))
    _res, _ids = apply_contract(_contract, ledger_path=args.ledger_path, dry_run=args.dry_run)
    print(f"accepted={len(_res.accepted)} human={len(_res.skipped_human)} "
          f"dup={len(_res.skipped_duplicate)} new_ids={_ids}")
    print("claim_verdict: NO_CLAIM_ALLOWED")
