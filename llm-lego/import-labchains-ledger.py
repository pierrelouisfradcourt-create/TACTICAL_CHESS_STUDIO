#!/usr/bin/env python3
"""import-labchains-ledger.py — Phase 3 : imports restants (fidèles, sourceRef vérifiable).

Crée des briques Bibliothèque llm-lego à partir de sources RÉELLES du repo, sans rien
fabriquer (le contenu vient des docstrings des scripts et du ledger) :

  (2) 4 oracles depuis lab/chains/ : fusion_matrix_chain, scripts_route_chain,
      validate_corpus, validate_packet — représentés comme briques kind:"oracle" (metadata ;
      l'exécution réelle reste le script Python read-only source).
  (3) 1 roadmap = ÉCHANTILLON de 12 IMP récents du IMPROVEMENT_LEDGER.yaml (12/244, PAS un
      import de masse — proof of concept, cf. CEO_ULTRAPLAN "import en masse" mis en pause).

Item (1) des priorités (autres scripts PowerShell 05_AUDIT/chains/) : AUCUN nouveau au-delà
des 5 déjà câblés (chain_hygiene/lab/models/python/rust) — rien à importer, documenté.

Usage : .venv312/Scripts/python.exe llm-lego/import-labchains-ledger.py  [BASE]
        BASE par défaut http://localhost:3202 (serveur real-library).
Re-exécutable : ids stables (upsert). Read-only sur les sources.
"""
import ast
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3202").rstrip("/")
REPO = Path(__file__).resolve().parent.parent  # llm-lego/ -> repo root
NOW = datetime.now(timezone.utc).isoformat()


def module_docstring(rel_path: str) -> str:
    """Docstring de module (source d'autorité, non fabriquée)."""
    src = (REPO / rel_path).read_text(encoding="utf-8")
    doc = ast.get_docstring(ast.parse(src)) or ""
    return doc.strip()


def post_brick(doc: dict) -> bool:
    body = json.dumps(doc, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(f"{BASE}/api/library/{doc['id']}", data=body,
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read()).get("ok") is True


def oracle_brick(bid: str, name: str, rel_path: str) -> dict:
    doc = module_docstring(rel_path)
    return {
        "id": bid, "kind": "oracle", "name": name, "maturity": "saved", "badge": "demo",
        "roadmapRef": None, "sourceRef": rel_path,
        "payload": {
            # rule = purpose FIDÈLE tiré de la docstring source + posture honnête.
            "rule": (doc + "\n\n[Brique metadata : représente un oracle Python DÉTERMINISTE "
                     "read-only ; l'exécution réelle reste le script source. NO_CLAIM_ALLOWED.]"),
            "prompt": ("Applique le contrôle décrit par l'oracle source et réponds en JSON : "
                       '{"verdict":"PASS"|"FAIL","reasoning":"..."}'),
            "verdictField": "verdict", "expectedValues": ["PASS", "FAIL"],
            "category": "audit", "attachableTo": ["llm", "agent", "tool", "router"],
            "model": "qwen2.5-14b-instruct", "temperature": 0.2,
        },
        "created": NOW, "updated": NOW,
    }


def load_ledger_sample(n: int = 12) -> list:
    import yaml
    d = yaml.safe_load((REPO / "lab/chains/IMPROVEMENT_LEDGER.yaml").read_text(encoding="utf-8"))
    return d["improvements"][-n:]


STATUS_MAP = {"CLOSED": "done", "OPEN": "todo"}  # tout autre (FAIL, …) -> doing


def roadmap_from_ledger() -> dict:
    sample = load_ledger_sample(12)
    milestones = []
    for im in sample:
        milestones.append({
            "id": im.get("id"),
            "title": f"{im.get('id')} — {im.get('title')}",
            "description": (f"[{im.get('impact')}/{im.get('effort')} · lane {im.get('lane')}] "
                            + (im.get("acceptance") or "").strip())[:400],
            "status": STATUS_MAP.get(im.get("status"), "doing"),
            "goalRef": None,
        })
    return {
        "id": "roadmap-ledger-sample-12", "kind": "roadmap",
        "name": "IMPROVEMENT_LEDGER — échantillon (12 IMP récents)", "maturity": "saved", "badge": "demo",
        "roadmapRef": None,
        "sourceRef": "lab/chains/IMPROVEMENT_LEDGER.yaml (échantillon 12/244 — proof of concept, PAS un import de masse)",
        "payload": {"category": "studio", "milestones": milestones},
        "created": NOW, "updated": NOW,
    }


def main() -> int:
    bricks = [
        oracle_brick("oracle-labchains-fusion-matrix", "Fusion Matrix (merge 3 chains → verdict/evidence/risk)", "lab/chains/fusion_matrix_chain.py"),
        oracle_brick("oracle-labchains-scripts-route", "Scripts Route Audit (path drift scripts/)", "lab/chains/scripts_route_chain.py"),
        oracle_brick("oracle-labchains-validate-corpus", "Oracle corpus golden charters (≥10 entrées)", "lab/chains/validate_corpus.py"),
        oracle_brick("oracle-labchains-validate-packet", "Validateur truth packet (fail-closed)", "lab/chains/validate_packet.py"),
        roadmap_from_ledger(),
    ]
    ok = 0
    for b in bricks:
        try:
            if post_brick(b):
                ok += 1
                extra = f"{len(b['payload'].get('milestones', []))} jalons" if b["kind"] == "roadmap" else b["sourceRef"]
                print(f"  OK  {b['id']:<38} [{b['kind']}]  {extra}")
            else:
                print(f"  ERR {b['id']} — réponse sans ok")
        except Exception as e:
            print(f"  ERR {b['id']} — {e}")
    print(f"\n{ok}/{len(bricks)} briques importées vers {BASE}")
    return 0 if ok == len(bricks) else 1


if __name__ == "__main__":
    sys.exit(main())
