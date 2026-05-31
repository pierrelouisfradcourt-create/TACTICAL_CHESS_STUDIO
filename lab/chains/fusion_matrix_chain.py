#!/usr/bin/env python3
"""
fusion_matrix_chain.py — Merge signaux des trois chains en une fusion_matrix.

Merge outputs de doc_hygiene + run_chain + scripts_route.
Produit fusion_matrix : markdown table (verdict/evidence/risk/contradiction).

Doctrine:
- Read-only. Aucune mutation.
- claim_verdict = NO_CLAIM_ALLOWED toujours.
"""

import json
from dataclasses import dataclass, asdict
from pathlib import Path

# ── Constants ──────────────────────────────────────────────

SCHEMA_VERSION = "fusion_matrix_chain.v0"
CHAIN_ID       = "fusion_matrix_chain"

TABLE_COLS = ["chain", "verdict", "evidence", "risk", "contradiction"]

PROBLEM_VERDICTS = frozenset({
    "BLOCKED", "HOLD",
    "BLOCKED_INVALID_COMMIT", "BLOCKED_FORBIDDEN_LANE",
    "BLOCKED_UNROUTED_FILES", "AUDIT_REQUIRED_CHANGES",
    "HUMAN_REVIEW_REQUIRED", "REVIEW_REQUIRED",
})

OK_VERDICTS = frozenset({
    "DOCS_OK", "PROCEED", "CHAIN_COMPLETE", "PASS",
})


# ── Data model ─────────────────────────────────────────────

@dataclass
class FusionRow:
    chain:         str
    verdict:       str
    evidence:      str
    risk:          str
    contradiction: str


# ── Ingestion par chain ────────────────────────────────────

def ingest_doc_hygiene(packet: dict) -> FusionRow:
    """Normalise un packet doc_hygiene en FusionRow."""
    verdict  = str(packet.get("software_verdict", "UNKNOWN"))
    evidence = str(packet.get("evidence_verdict", "UNKNOWN"))

    lane = str(packet.get("lane", ""))
    routing = packet.get("routing_audit") or {}
    orphans = routing.get("orphaned", []) if isinstance(routing, dict) else []
    risks = []
    if lane in ("FORBIDDEN", "HUMAN_REQUIRED"):
        risks.append(f"lane:{lane}")
    if orphans:
        risks.append(f"orphans:{len(orphans)}")

    return FusionRow(
        chain="doc_hygiene",
        verdict=verdict,
        evidence=evidence,
        risk=", ".join(risks) if risks else "none",
        contradiction="",
    )


def ingest_run_chain(packet: dict) -> FusionRow:
    """Normalise une enveloppe run_chain en FusionRow."""
    rt = packet.get("redteam_output") or {}
    verdict = str(rt.get("verdict", packet.get("software_verdict", "UNKNOWN")))

    flaws = rt.get("critical_flaws") or []
    evidence = f"{len(flaws)} critical_flaw(s)" if flaws else "no critical flaws"

    scope   = rt.get("scope_violations") or []
    missing = rt.get("missing_validation") or []
    risks = []
    if scope:
        risks.append(f"scope_violations:{len(scope)}")
    if missing:
        risks.append(f"missing_validation:{len(missing)}")

    return FusionRow(
        chain="run_chain",
        verdict=verdict,
        evidence=evidence,
        risk=", ".join(risks) if risks else "none",
        contradiction="",
    )


def ingest_scripts_route(packet: dict) -> FusionRow:
    """Normalise un packet scripts_route en FusionRow."""
    summary     = packet.get("summary") or {}
    drift_count = int(summary.get("path_drift_count", 0))
    stale_count = int(summary.get("stale_refs_count", 0))

    verdict = "PASS" if (drift_count == 0 and stale_count == 0) else "REVIEW_REQUIRED"

    parts = []
    if drift_count:
        parts.append(f"{drift_count} path_drift")
    if stale_count:
        parts.append(f"{stale_count} stale_ref(s)")
    evidence = ", ".join(parts) if parts else "clean"

    blocked = packet.get("blocked_actions") or []
    risk = f"{len(blocked)} blocked_action(s)" if blocked else "none"

    return FusionRow(
        chain="scripts_route",
        verdict=verdict,
        evidence=evidence,
        risk=risk,
        contradiction="",
    )


# ── Détection de contradictions ────────────────────────────

def _category(verdict: str) -> str:
    if verdict in PROBLEM_VERDICTS:
        return "problem"
    if verdict in OK_VERDICTS:
        return "ok"
    return "unknown"


def detect_contradictions(rows: list) -> list:
    """
    Annote chaque row : si son verdict est OK mais qu'une autre row
    a un verdict PROBLEM, marque la contradiction.
    """
    for row in rows:
        if _category(row.verdict) == "ok":
            flags = [
                f"{other.chain}:{other.verdict}"
                for other in rows
                if other.chain != row.chain and _category(other.verdict) == "problem"
            ]
            row.contradiction = "; ".join(flags) if flags else "none"
        else:
            row.contradiction = "none"
    return rows


# ── Rendu markdown ─────────────────────────────────────────

def render_markdown_table(rows: list) -> str:
    """Produit un tableau markdown GitHub-flavored à partir des FusionRow."""
    widths = {col: len(col) for col in TABLE_COLS}
    data = [asdict(r) for r in rows]

    for row in data:
        for col in TABLE_COLS:
            widths[col] = max(widths[col], len(str(row[col])))

    def fmt(vals: dict) -> str:
        return "| " + " | ".join(str(vals[c]).ljust(widths[c]) for c in TABLE_COLS) + " |"

    header = {c: c for c in TABLE_COLS}
    sep    = {c: "-" * widths[c] for c in TABLE_COLS}

    return "\n".join([fmt(header), fmt(sep)] + [fmt(row) for row in data])


# ── Packet builder ─────────────────────────────────────────

def build_fusion_matrix_packet(
    doc_hygiene_packet:   dict | None = None,
    run_chain_packet:     dict | None = None,
    scripts_route_packet: dict | None = None,
) -> dict:
    """Merge les trois packets et produit le fusion_matrix_packet."""
    rows: list = []

    rows.append(
        ingest_doc_hygiene(doc_hygiene_packet)
        if doc_hygiene_packet is not None
        else FusionRow("doc_hygiene", "UNKNOWN", "not_provided", "none", "")
    )
    rows.append(
        ingest_run_chain(run_chain_packet)
        if run_chain_packet is not None
        else FusionRow("run_chain", "UNKNOWN", "not_provided", "none", "")
    )
    rows.append(
        ingest_scripts_route(scripts_route_packet)
        if scripts_route_packet is not None
        else FusionRow("scripts_route", "UNKNOWN", "not_provided", "none", "")
    )

    rows = detect_contradictions(rows)
    matrix_md = render_markdown_table(rows)

    problem_chains = [r.chain for r in rows if r.verdict in PROBLEM_VERDICTS]
    global_verdict = "BLOCKED" if problem_chains else "PASS"

    return {
        "schema_version":  SCHEMA_VERSION,
        "chain_id":        CHAIN_ID,
        "authority":       "read_only",
        "claim_verdict":   "NO_CLAIM_ALLOWED",
        "global_verdict":  global_verdict,
        "problem_chains":  problem_chains,
        "fusion_matrix":   matrix_md,
        "rows":            [asdict(r) for r in rows],
    }


# ── CLI ────────────────────────────────────────────────────

def _load_last_from_history(chain_history: Path, chain_id: str) -> dict | None:
    """Lit la dernière entrée d'un chain_id dans CHAIN_HISTORY.jsonl."""
    result = None
    try:
        with chain_history.open(encoding="utf-8") as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    if entry.get("chain_id") == chain_id:
                        result = entry
                except Exception:
                    continue
    except FileNotFoundError:
        pass
    return result


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent.parent
    history   = repo_root / "lab/chains/CHAIN_HISTORY.jsonl"

    doc_pkt     = _load_last_from_history(history, "doc_hygiene_chain")
    run_pkt     = _load_last_from_history(history, "run_chain")
    scripts_pkt = _load_last_from_history(history, "scripts_route_chain")

    packet = build_fusion_matrix_packet(doc_pkt, run_pkt, scripts_pkt)

    print(packet["fusion_matrix"])
    print(f"\n[OK] fusion_matrix_packet produit.")
    print(f"  global_verdict : {packet['global_verdict']}")
    print(f"  problem_chains : {packet['problem_chains'] or 'none'}")
    print(f"  claim_verdict  : {packet['claim_verdict']}")


if __name__ == "__main__":
    main()
