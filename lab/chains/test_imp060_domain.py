"""
Tests IMP-060 — champ domain dans le ledger
claim_verdict: NO_CLAIM_ALLOWED
"""
import sys
import os
import tempfile
import yaml

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kaizen_loop as kl


# ── helpers ──────────────────────────────────────────────────────────────────

def _make_ledger(imps: list) -> dict:
    return {
        "meta": {"ledger_version": "v0", "claim_verdict": "NO_CLAIM_ALLOWED"},
        "improvements": imps,
        "metrics_history": [],
    }


def _write_ledger(data: dict, path) -> None:
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)


# ── VALID_DOMAIN constant ─────────────────────────────────────────────────────

def test_valid_domain_set_exists():
    assert hasattr(kl, "VALID_DOMAIN")
    for v in ("rocky_moteur", "ia_apprentissage", "studio", "jeux", ""):
        assert v in kl.VALID_DOMAIN, f"{v} absent de VALID_DOMAIN"


# ── cmd_add persiste domain ───────────────────────────────────────────────────

def test_cmd_add_persists_domain(tmp_path):
    ledger_path = tmp_path / "IMPROVEMENT_LEDGER.yaml"
    data = _make_ledger([])
    _write_ledger(data, ledger_path)

    class Args:
        title = "Test domain field"
        impact = "HIGH"
        effort = "SMALL"
        lane = "SAFE_AUTO"
        domain = "rocky_moteur"
        type = "feature"
        source = ""
        files = ""
        acceptance = ""
        notes = ""
        session = "2026-06-04"
        ledger_path = None

    args = Args()
    args.ledger_path = ledger_path
    data = kl.load_ledger(ledger_path)
    kl.cmd_add(data, args)

    loaded = kl.load_ledger(ledger_path)
    added = loaded["improvements"][0]
    assert added["domain"] == "rocky_moteur"


def test_cmd_add_domain_empty_by_default(tmp_path):
    ledger_path = tmp_path / "IMPROVEMENT_LEDGER.yaml"
    _write_ledger(_make_ledger([]), ledger_path)

    class Args:
        title = "No domain"
        impact = "LOW"
        effort = "TRIVIAL"
        lane = "SAFE_AUTO"
        domain = ""
        type = "feature"
        source = ""
        files = ""
        acceptance = ""
        notes = ""
        session = "2026-06-04"
        ledger_path = None

    args = Args()
    args.ledger_path = ledger_path
    data = kl.load_ledger(ledger_path)
    kl.cmd_add(data, args)

    loaded = kl.load_ledger(ledger_path)
    assert loaded["improvements"][0]["domain"] == ""


# ── backfill dans le ledger réel ──────────────────────────────────────────────

def test_open_imps_have_domain():
    """Vérifie que tous les IMPs OPEN du ledger réel ont un champ domain."""
    ledger_path = kl.find_ledger()
    data = kl.load_ledger(ledger_path)
    open_imps = [i for i in data["improvements"] if i.get("status") == "OPEN"]
    missing = [i["id"] for i in open_imps if not i.get("domain")]
    assert not missing, f"IMPs OPEN sans domain : {missing}"


# ── routing CEO Brief (_ceo_domain logic) ────────────────────────────────────

def _ceo_domain(i: dict) -> str:
    """Copie locale de la logique autopilot.py — lane FORBIDDEN/AUDIT_REQUIRED prime, puis domain, puis keyword."""
    if i.get("lane") in ("AUDIT_REQUIRED", "FORBIDDEN"):
        return "decisions_pendantes"
    d = i.get("domain", "")
    if d in ("rocky_moteur", "ia_apprentissage", "studio", "jeux"):
        return d
    title = i.get("title", "").lower()
    if any(k in title for k in ("lora","dataset","training","devstral","ml","neural","model","teacher","sf_dataset","pool")):
        return "ia_apprentissage"
    return "rocky_moteur"


def test_routing_rocky_moteur():
    imp = {"id": "IMP-TEST", "domain": "rocky_moteur", "lane": "SAFE_AUTO", "title": "Foo"}
    assert _ceo_domain(imp) == "rocky_moteur"


def test_routing_ia_apprentissage():
    imp = {"id": "IMP-TEST", "domain": "ia_apprentissage", "lane": "SAFE_AUTO", "title": "Foo"}
    assert _ceo_domain(imp) == "ia_apprentissage"


def test_routing_studio():
    imp = {"id": "IMP-TEST", "domain": "studio", "lane": "SAFE_AUTO", "title": "Kaizen pipeline"}
    assert _ceo_domain(imp) == "studio"


def test_routing_jeux():
    imp = {"id": "IMP-TEST", "domain": "jeux", "lane": "SAFE_AUTO", "title": "Chess Fantasy"}
    assert _ceo_domain(imp) == "jeux"


def test_routing_forbidden_overrides_domain():
    """FORBIDDEN → decisions_pendantes même si domain présent."""
    imp = {"id": "IMP-008", "domain": "ia_apprentissage", "lane": "FORBIDDEN", "title": "Dataset rebuild"}
    assert _ceo_domain(imp) == "decisions_pendantes"


def test_routing_fallback_keyword_lora():
    """Sans domain, fallback keyword 'lora' → ia_apprentissage."""
    imp = {"id": "IMP-X", "domain": "", "lane": "SAFE_AUTO", "title": "LoRA training Devstral"}
    assert _ceo_domain(imp) == "ia_apprentissage"


def test_routing_fallback_no_keyword_goes_engine():
    """Sans domain ni keyword ML → rocky_moteur."""
    imp = {"id": "IMP-X", "domain": "", "lane": "SAFE_AUTO", "title": "Some untagged task"}
    assert _ceo_domain(imp) == "rocky_moteur"


# ── py_compile smoke ──────────────────────────────────────────────────────────

def test_py_compile_kaizen_loop():
    import py_compile
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kaizen_loop.py")
    py_compile.compile(path, doraise=True)


def test_py_compile_kaizen_autoloop():
    import py_compile
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kaizen_autoloop.py")
    py_compile.compile(path, doraise=True)
