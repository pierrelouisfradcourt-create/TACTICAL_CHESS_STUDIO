"""Vérification MÉCANIQUE d'un verdict Forge — le maillon que `/gate` doit appeler.

Avant, `verify_*` n'était appelé que par les tests ; `/gate`/`/verdict` demandaient
à un agent de *dire* « HMAC OK ». Ici c'est une commande qui CALCULE :
  1. re-signe le corps du verdict et compare au `hmac` stocké (toute altération de
     contenu casse la signature — inclut les reçus d'oracle embarqués),
  2. RE-LIT chaque fichier d'évidence et confronte son sha256 au champ signé
     (scellé non décoratif),
  3. compare `git_head` signé au HEAD courant (dérive = avertissement TOCTOU).

Usage :
    PYTHONPATH=scripts python -m forge.verify_run lab/forge_runs/<projet>/verdict.json
Exit 0 = verdict authentique et évidence intacte ; 2 = falsification/altération.

Limite honnête : sur un poste mono-utilisateur, un producteur qui LIT `.forge_key`
peut re-signer un faux verdict cohérent (fichiers d'évidence fabriqués compris).
Fermer ça exige une isolation du signataire (autre identité/process) — infra, pas
code. `verify_run` élève fortement la barre (il faut désormais falsifier le log ET
le hash ET re-signer) et rend la vérification mécanique au lieu de narrative.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from forge.mutation_proof import verify_mutation_receipt
from forge.verdict import _verify_mapping, current_git_head, sha256_file


def _check_mutation_proof(data: dict, key_file: Path | None) -> list[str]:
    """P0.3 — redescend dans le reçu mutation embarqué du reçu code.

    Un verdict de JEU (marqueur e2e OU mutation dans le detail du reçu code) doit
    porter une preuve mutation qui se re-vérifie contre l'état PRÉSENT du jeu
    (signature, run_id, hash code/tests/triage, baseline). La game-ness est
    dérivée AVANT le statut : un verdict de jeu non-OK sans preuve embarquée ne
    doit pas non plus passer overall=True (le court-circuit sur status==OK rendait
    cette garde inatteignable — finding 2 de la revue P0.3)."""
    code_r = (data.get("oracles") or {}).get("code")
    if not isinstance(code_r, dict):
        return []
    detail = code_r.get("detail") or {}
    mut = detail.get("mutation")
    # Marqueurs de game-ness durables : preuve mutation, garde e2e, OU la trace de
    # dégradation laissée par le driver quand il a invalidé une preuve mutation
    # (mutation_verification) — cette dernière survit au retrait de e2e/mutation
    # dans un state.json falsifié (finding 1 : le verdict BLOCKED reste détecté
    # comme jeu, donc jamais overall=True sans preuve).
    is_game = (isinstance(mut, dict) or detail.get("e2e") is not None
               or "mutation_verification" in detail)
    if not is_game:
        return []  # non-jeu : la mutation n'est pas exigée
    if not isinstance(mut, dict):
        # Reçu de jeu (marqueur e2e/mutation) sans preuve embarquée : non ratifiable,
        # quel que soit le statut.
        return ["reçu code de JEU (marqueur e2e/mutation) sans preuve mutation embarquée"]
    receipt = mut.get("receipt") or {}
    game_dir = (receipt.get("detail") or {}).get("game_dir", "")
    chk = verify_mutation_receipt(receipt, mut.get("signature", ""),
                                  data.get("run_id", ""), game_dir, key_file=key_file)
    return [] if chk["passed"] else list(chk["raisons"])


def verify_run(verdict_path: Path | str, key_file: Path | None = None) -> dict:
    """Vérifie un verdict.json. Retourne un dict structuré (jamais ne lève sur contenu)."""
    path = Path(verdict_path)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return {"overall": False, "reason": f"verdict illisible: {exc}",
                "hmac_ok": False, "evidence_ok": False, "git_ok": False}

    hmac_stored = data.get("hmac", "")
    body = {k: v for k, v in data.items() if k != "hmac"}
    hmac_ok = bool(hmac_stored) and _verify_mapping(body, hmac_stored, key_file)

    # (2) évidence : re-lire chaque fichier référencé et confronter le hash signé.
    evidence_problems: list[str] = []
    for name, r in (data.get("oracles") or {}).items():
        if not isinstance(r, dict) or r.get("status") == "SKIPPED":
            continue
        ep = r.get("evidence_path") or ""
        exp = r.get("evidence_sha256") or ""
        if ep and exp:
            if sha256_file(ep) != exp:
                evidence_problems.append(f"{name}: évidence altérée/absente ({ep})")
        elif exp and not ep:
            evidence_problems.append(f"{name}: hash signé sans chemin -> non re-vérifiable")
    evidence_ok = not evidence_problems

    # (2ter) preuve mutation embarquée (P0.3) : échec DUR — contrairement à la
    # dérive git (repo-wide), le sceau mutation est spécifique aux fichiers du
    # jeu jugé ; sa divergence signifie que le verdict ne décrit plus la réalité.
    mutation_problems = _check_mutation_proof(data, key_file)
    mutation_ok = not mutation_problems

    # (3) dérive git (TOCTOU) : avertissement, pas échec dur.
    git_stored = data.get("git_head", "")
    git_current = current_git_head()
    git_ok = (not git_stored) or (git_current == git_stored)

    overall = hmac_ok and evidence_ok and mutation_ok
    return {
        "overall": overall,
        "hmac_ok": hmac_ok,
        "evidence_ok": evidence_ok,
        "evidence_problems": evidence_problems,
        "mutation_ok": mutation_ok,
        "mutation_problems": mutation_problems,
        "git_ok": git_ok,
        "git_stored": git_stored,
        "git_current": git_current,
        "software_verdict": data.get("software_verdict"),
        "decision": data.get("decision"),
    }


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    if not argv:
        print("usage: python -m forge.verify_run <verdict.json>", file=sys.stderr)
        return 2
    res = verify_run(argv[0])
    print(f"verdict          : {res.get('software_verdict')} / {res.get('decision')}")
    print(f"HMAC             : {'OK' if res['hmac_ok'] else 'FALSIFIÉ'}")
    print(f"évidence intacte : {'OK' if res['evidence_ok'] else 'ALTÉRÉE'}")
    for p in res.get("evidence_problems", []):
        print(f"   ✗ {p}")
    print(f"preuve mutation  : {'OK' if res['mutation_ok'] else 'INVALIDE/PÉRIMÉE'}")
    for p in res.get("mutation_problems", []):
        print(f"   ✗ {p}")
    if not res["git_ok"]:
        print(f"⚠ dérive git : signé {res['git_stored'][:12]} != courant {res['git_current'][:12]} (TOCTOU)")
    print(f"\nVÉRIFICATION : {'AUTHENTIQUE' if res['overall'] else 'REJET'}")
    return 0 if res["overall"] else 2


if __name__ == "__main__":
    sys.exit(main())
