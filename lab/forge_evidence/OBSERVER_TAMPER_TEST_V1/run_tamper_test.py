"""Tamper-test P4 (INV-2, SIGNED = signature verifiee) — Observer.

Construit 1 enregistrement authentique (copie d'un verdict.json REEL du corpus
pacman) + 3 falsifications, dans CE dossier de preuve uniquement (jamais les
fichiers reels de lab/forge_evidence/ ou lab/forge_runs/). Mesure combien de
falsifications `observer.signature.verify_envelope` detecte, et confirme 0 faux
positif sur le corpus authentique pacman complet.

Lecture seule sur le depot (ne fait que LIRE scripts/forge/.forge_key via la
regle Forge existante, jamais de generation de cle). Ecrit uniquement sous ce
dossier de preuve.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from observer import signature  # noqa: E402
from observer.adapters import forge_run  # noqa: E402
from observer.sources import ObserverContext, default_repo_root, default_transcripts_root  # noqa: E402

BENCH_DIR = Path(__file__).resolve().parent / "bench"
BENCH_DIR.mkdir(parents=True, exist_ok=True)

SOURCE_RECORD = REPO_ROOT / "lab" / "forge_runs" / "pacman" / "verdict.json"


def _load_authentic() -> dict:
    return json.loads(SOURCE_RECORD.read_text(encoding="utf-8"))


def build_bench() -> dict[str, Path]:
    authentic = _load_authentic()
    assert "hmac" in authentic, "le record source ne porte pas de hmac — corpus inattendu"

    paths: dict[str, Path] = {}

    # (a) copie authentique telle quelle
    p_auth = BENCH_DIR / "a_authentique.json"
    p_auth.write_text(json.dumps(authentic, indent=2, sort_keys=True), encoding="utf-8")
    paths["a_authentique"] = p_auth

    # (b) hmac invente (chaine hex plausible mais fabriquee)
    tampered_fake_hmac = dict(authentic)
    tampered_fake_hmac["hmac"] = "0" * 64
    p_b = BENCH_DIR / "b_hmac_invente.json"
    p_b.write_text(json.dumps(tampered_fake_hmac, indent=2, sort_keys=True), encoding="utf-8")
    paths["b_hmac_invente"] = p_b

    # (c) payload modifie, hmac d'origine conserve (le cas critique : falsifier
    # le VERDICT en gardant une signature qui a l'air valide au simple regard)
    tampered_payload = dict(authentic)
    tampered_payload["software_verdict"] = "OK"  # falsifie vers OK quoi qu'il arrive
    tampered_payload["decision"] = "HUMANGATE_READY"
    # hmac laisse identique a l'original -> ne correspond plus au nouveau corps
    p_c = BENCH_DIR / "c_payload_modifie_hmac_origine.json"
    p_c.write_text(json.dumps(tampered_payload, indent=2, sort_keys=True), encoding="utf-8")
    paths["c_payload_modifie_hmac_origine"] = p_c

    # (d) hmac recalcule avec une MAUVAISE cle (simule un attaquant qui a sa
    # propre cle et re-signe apres modification)
    import hashlib
    import hmac as hmac_mod
    wrong_key = b"\x00" * 32  # cle deliberement fausse, jamais celle du depot
    tampered_wrong_key = dict(authentic)
    tampered_wrong_key["software_verdict"] = "OK"
    body = {k: v for k, v in tampered_wrong_key.items() if k != "hmac"}
    payload_bytes = json.dumps(body, sort_keys=True).encode("utf-8")
    tampered_wrong_key["hmac"] = hmac_mod.new(wrong_key, payload_bytes, hashlib.sha256).hexdigest()
    p_d = BENCH_DIR / "d_hmac_mauvaise_cle.json"
    p_d.write_text(json.dumps(tampered_wrong_key, indent=2, sort_keys=True), encoding="utf-8")
    paths["d_hmac_mauvaise_cle"] = p_d

    return paths


def run_bench(paths: dict[str, Path]) -> dict:
    results = {}
    for label, path in paths.items():
        record = json.loads(path.read_text(encoding="utf-8"))
        status = signature.verify_envelope(record)
        results[label] = status
    return results


def run_corpus_false_positive_check() -> dict:
    """Recharge le corpus pacman REEL (aucune ecriture) via l'adaptateur forge_run
    et compte les faux positifs : un enregistrement authentique classe
    SIGNED_INVALID serait un faux positif bloquant."""
    repo = default_repo_root()
    transcripts = default_transcripts_root(repo)
    ctx = ObserverContext.build(repo, "pacman", transcripts)
    events = forge_run.collect(ctx)

    invalid_drift = [
        e for e in events
        if e.kind == "drift.detected" and e.payload.get("drift_kind") == "signature_invalid"
    ]
    signed_kinds = (
        "verdict.signed", "oracle.result", "test.result", "solvability.result",
        "dispatch.context_manifest", "dispatch.reasoning", "dispatch.tools",
    )
    from collections import Counter
    proof_by_kind = {
        k: dict(Counter(e.proof for e in events if e.kind == k))
        for k in signed_kinds
        if any(e.kind == k for e in events)
    }
    return {
        "total_events": len(events),
        "false_positive_count": len(invalid_drift),
        "false_positive_examples": [
            {"payload": e.payload, "source": e.source.to_dict()} for e in invalid_drift
        ],
        "proof_by_kind": proof_by_kind,
    }


def main() -> int:
    key_present = signature.key_available()
    paths = build_bench()
    bench_results = run_bench(paths)
    corpus_check = run_corpus_false_positive_check()

    detected = sum(
        1 for label, status in bench_results.items()
        if label != "a_authentique" and status == signature.INVALID
    )
    total_tampered = sum(1 for label in bench_results if label != "a_authentique")

    report = {
        "key_present": key_present,
        "bench": bench_results,
        "tamper_detection": {
            "detected": detected,
            "total_tampered": total_tampered,
            "target": ">=2/3",
            "pass": detected >= 2,
        },
        "authentic_classified_verified": bench_results.get("a_authentique") == signature.VERIFIED,
        "corpus_false_positive_check": {
            "false_positive_count": corpus_check["false_positive_count"],
            "target": 0,
            "pass": corpus_check["false_positive_count"] == 0,
        },
        "corpus_detail": corpus_check,
    }

    out = Path(__file__).resolve().parent / "resultats.json"
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False, default=str), encoding="utf-8")

    print(json.dumps(report, indent=2, ensure_ascii=False, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
