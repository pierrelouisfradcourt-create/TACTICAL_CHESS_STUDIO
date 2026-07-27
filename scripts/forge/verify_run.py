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
Exit 0 = verdict authentique et évidence intacte ; 2 = falsification/altération ;
3 = verdict absent ou illisible (rien à vérifier — ni authentique ni falsifié, ce
sont deux états distincts qu'un instrument de confiance ne doit jamais confondre).

Limite honnête : sur un poste mono-utilisateur, un producteur qui LIT `.forge_key`
peut re-signer un faux verdict cohérent (fichiers d'évidence fabriqués compris).
Fermer ça exige une isolation du signataire (autre identité/process) — infra, pas
code. `verify_run` élève fortement la barre (il faut désormais falsifier le log ET
le hash ET re-signer) et rend la vérification mécanique au lieu de narrative.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

from forge.context_manifest import verify_manifest_record
from forge.mutation_proof import verify_mutation_receipt
from forge.verdict import _verify_mapping, current_git_head, sha256_file

# R3 (FORGE_V2_CONSOLIDATION.md §4-A, ferme AM1) : script + timeout du recoupement
# knowledge_trace. scripts/forge/verify_run.py -> parent == scripts/forge (même
# dossier que knowledge_trace.mjs).
_KNOWLEDGE_TRACE_SCRIPT = Path(__file__).resolve().parent / "knowledge_trace.mjs"
_KNOWLEDGE_TRACE_TIMEOUT_S = 60


def _check_mutation_proof(data: dict, key_file: Path | None, *,
                          require_green: bool = True) -> dict:
    """P0.3 — redescend dans le reçu mutation embarqué du reçu code.

    Un verdict de JEU (marqueur e2e OU mutation dans le detail du reçu code) doit
    porter une preuve mutation qui se re-vérifie contre l'état PRÉSENT du jeu
    (signature, run_id, hash code/tests/triage, baseline). La game-ness est
    dérivée AVANT le statut : un verdict de jeu non-OK sans preuve embarquée ne
    doit pas non plus passer overall=True (le court-circuit sur status==OK rendait
    cette garde inatteignable — finding 2 de la revue P0.3).

    V1 (séparation intégrité/verdict) — `require_green` (défaut True, comportement
    historique) est transmis tel quel à `verify_mutation_receipt`. Retourne
    {problems, status, checked} : `status` est le statut BRUT du reçu (None si
    aucun reçu n'a pu être lu — absence structurelle de preuve, jamais assimilé à
    "vert"), `checked` indique si `verify_mutation_receipt` a bien été appelée
    (False sur les deux branches structurelles : non-jeu, ou jeu sans preuve
    embarquée du tout — ces deux cas ne dépendent PAS de `require_green`)."""
    code_r = (data.get("oracles") or {}).get("code")
    if not isinstance(code_r, dict):
        return {"problems": [], "status": None, "checked": False}
    detail = code_r.get("detail") or {}
    mut = detail.get("mutation")
    # Marqueurs de game-ness durables : preuve mutation, garde e2e, garde
    # SOLVABILITÉ (F5c, 2026-07-14 : aligné sur driver._effective_is_game — le
    # driver marque 'solvability' dans le detail du reçu code d'un jeu, l'omettre
    # ici laissait un angle mort), OU la trace de dégradation laissée par le
    # driver quand il a invalidé une preuve mutation (mutation_verification) —
    # cette dernière survit au retrait de e2e/mutation dans un state.json falsifié
    # (finding 1 : le verdict BLOCKED reste détecté comme jeu, donc jamais
    # overall=True sans preuve).
    is_game = (isinstance(mut, dict) or detail.get("e2e") is not None
               or detail.get("solvability") is not None
               or "mutation_verification" in detail)
    if not is_game:
        return {"problems": [], "status": None, "checked": False}  # non-jeu
    if not isinstance(mut, dict):
        # Reçu de jeu (marqueur e2e/mutation) sans preuve embarquée : non ratifiable,
        # quel que soit le statut ET quel que soit require_green (absence
        # structurelle de preuve, pas une question de couleur de gate).
        return {"problems": ["reçu code de JEU (marqueur e2e/mutation) sans preuve mutation embarquée"],
                "status": None, "checked": False}
    receipt = mut.get("receipt") or {}
    game_dir = (receipt.get("detail") or {}).get("game_dir", "")
    chk = verify_mutation_receipt(receipt, mut.get("signature", ""),
                                  data.get("run_id", ""), game_dir, key_file=key_file,
                                  require_green=require_green)
    return {"problems": [] if chk["passed"] else list(chk["raisons"]),
            "status": chk.get("status") or None, "checked": True}


def _check_knowledge_trace(run_dir: Path) -> tuple[list[str], list[str]]:
    """R3 — recoupe <run_dir>/knowledge_trace.json via `node knowledge_trace.mjs
    --verify` (ferme AM1) : le lineage de lecture (pré-mortem/knowledge_base/
    mandatory_read/packet servis à un run) était jusqu'ici AUTO-ATTESTÉ, jamais
    recoupé par un tiers mécanique. Retourne (problems, warnings) — jamais ne lève.

    - trace ABSENTE : simple avertissement NON BLOQUANT (tous les runs n'en portent
      pas encore) — pas la même sévérité qu'une trace présente mais falsifiée.
    - trace PRÉSENTE et le sous-processus échoue (exit != 0 : au moins un item
      NOT_FOUND = théâtre, ou trace corrompue/run_dir absent) : échec DUR, listé
      dans `problems` — même sévérité que la preuve mutation (P0.3).
    - node INDISPONIBLE (introuvable, erreur de spawn, timeout) : avertissement
      honnête. L'absence d'outil ne se travestit JAMAIS en vérification réussie.
    """
    problems: list[str] = []
    warnings: list[str] = []
    run_dir = Path(run_dir)
    trace_path = run_dir / "knowledge_trace.json"
    if not trace_path.exists():
        warnings.append(
            "knowledge_trace.json absent — lineage non recoupé (tous les runs "
            "n'en portent pas encore, cf. FORGE_V2_CONSOLIDATION.md R3)")
        return problems, warnings

    node_cmd = shutil.which("node") or "node"
    try:
        proc = subprocess.run(
            [node_cmd, str(_KNOWLEDGE_TRACE_SCRIPT), "--verify", str(run_dir.resolve())],
            capture_output=True, text=True, encoding="utf-8",
            timeout=_KNOWLEDGE_TRACE_TIMEOUT_S,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        warnings.append(
            f"knowledge_trace.mjs --verify non exécutable (node indisponible ?) : {exc}")
        return problems, warnings

    if proc.returncode != 0:
        detail = "\n".join(part for part in (proc.stderr, proc.stdout) if part).strip()
        problems.append(
            f"knowledge_trace --verify a échoué (exit {proc.returncode}) : {detail[-2000:]}"
        )
    return problems, warnings


def _check_context_manifest(run_dir: Path, key_file: Path | None) -> tuple[list[str], list[str]]:
    """Contrôle du Context Manifest (mesure advisory de fraîcheur/traçabilité,
    docs/forge/CONTEXT_LOOP_V1_1_FRESHNESS.md §7) — PAS un gate : cette fonction
    ne fait QUE recouper une mesure déjà écrite, elle ne décide rien et n'entre
    PAS dans les gates existants du driver (hmac_ok/evidence/knowledge_trace).

    - fichier manifest ABSENT (répertoire ``context/`` absent ou vide) : simple
      note informative (les runs antérieurs à cette mesure n'en portent pas) —
      JAMAIS un problème, jamais un échec.
    - ligne présente avec HMAC invalide : problème DUR (la mesure a été altérée
      après coup — la ligne ne prouve plus rien).
    - on ne re-vérifie PAS que les sources listées sont inchangées : elles
      évoluent légitimement après le run (c'est le travail du context_check,
      pas de verify_run).

    Retourne (problems, notes) — n'affecte JAMAIS ``overall``."""
    problems: list[str] = []
    notes: list[str] = []
    ctx_dir = Path(run_dir) / "context"
    if not ctx_dir.is_dir():
        notes.append("context manifest absent (run antérieur à cette mesure, non bloquant)")
        return problems, notes
    manifest_files = sorted(ctx_dir.glob("*.manifest.jsonl"))
    if not manifest_files:
        notes.append("répertoire context/ vide — aucune ligne de manifest à recouper (non bloquant)")
        return problems, notes
    for mf in manifest_files:
        try:
            raw_text = mf.read_text(encoding="utf-8")
        except OSError as exc:
            notes.append(f"{mf.name}: illisible ({exc}) — non bloquant")
            continue
        for i, raw in enumerate(raw_text.splitlines(), start=1):
            raw = raw.strip()
            if not raw:
                continue
            try:
                rec = json.loads(raw)
            except ValueError:
                problems.append(f"{mf.name}:{i}: ligne JSON invalide")
                continue
            if not verify_manifest_record(rec, key_file):
                problems.append(f"{mf.name}:{i}: HMAC invalide (kind={rec.get('kind')!r})")
    return problems, notes


def verify_run(verdict_path: Path | str, key_file: Path | None = None) -> dict:
    """Vérifie un verdict.json. Retourne un dict structuré (jamais ne lève sur contenu)."""
    path = Path(verdict_path)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        # Absent/illisible n'est PAS falsifié : un fichier qui n'existe pas n'a
        # jamais été signé, donc rien à casser. On rend un dict de la MÊME forme
        # que le chemin nominal (toutes les clés que `main()` lit) pour qu'un
        # accès `res["mutation_ok"]` ne lève jamais KeyError sur ce cas — mais
        # marqué `unreadable=True` pour que l'affichage reste honnête (ni "OK",
        # ni "FALSIFIÉ"/"ALTÉRÉE", qui sont des accusations de contenu altéré).
        return {"overall": False, "integrity_ok": False, "unreadable": True,
                "reason": f"verdict absent ou illisible: {exc}",
                "hmac_ok": False, "evidence_ok": False, "evidence_problems": [],
                "mutation_ok": False, "mutation_problems": [],
                "mutation_integrity_problems": [], "mutation_gate_green": None,
                "mutation_status": None, "coherence_problems": [],
                "git_ok": True, "git_stored": "", "git_current": current_git_head(),
                "knowledge_trace_ok": False, "knowledge_trace_problems": [],
                "knowledge_trace_warnings": [],
                "software_verdict": None, "decision": None}

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
    #
    # V1 (2026-07-26, séparation intégrité/verdict — mémoire pong_r2) : DEUX
    # registres, calculés séparément, plus jamais confondus :
    #   - INTÉGRITÉ (`mutation_integrity_*`, require_green=False) : authenticité
    #     du reçu — signature, run_id, empreintes code/tests, triage, évidence.
    #     Un reçu mutation FAIL authentique et à jour ne ment sur RIEN : il reste
    #     `integrity`-clean. C'est ce registre, et lui seul, qui alimente
    #     `overall`/le code de sortie.
    #   - VERDICT (`mutation_ok`/`mutation_problems`, LEGACY, require_green=True,
    #     comportement identique à avant V1) : conservé pour les appelants/tests
    #     existants, n'entre PLUS dans `overall`.
    #   - COHÉRENCE (`coherence_problems`) : le SEUL cas où un gate mutation rouge
    #     doit encore faire échouer l'intégrité — un verdict qui affiche
    #     software_verdict=OK alors que son propre reçu mutation embarqué n'est
    #     pas vert prétend un vert non prouvé (mensonge de provenance, pas
    #     simplement un FAIL honnête). GATE DUR, ne doit jamais régresser.
    _mutation_strict = _check_mutation_proof(data, key_file, require_green=True)
    mutation_problems = _mutation_strict["problems"]  # LEGACY (rétro-compat)
    mutation_ok = not mutation_problems                # LEGACY (rétro-compat)

    _mutation_loose = _check_mutation_proof(data, key_file, require_green=False)
    mutation_integrity_problems = _mutation_loose["problems"]
    mutation_integrity_ok = not mutation_integrity_problems
    mutation_status = _mutation_loose["status"]
    mutation_gate_green = (
        None if not _mutation_loose["checked"] else (mutation_status == "OK")
    )

    software_verdict = data.get("software_verdict")
    coherence_problems: list[str] = []
    if software_verdict == "OK" and _mutation_strict["problems"] and _mutation_loose["checked"]:
        # Le reçu se vérifie (checked=True) mais échoue en mode strict alors que
        # le verdict affiché prétend OK : soit le gate n'est pas vert, soit une
        # autre divergence d'intégrité coexiste — dans les deux cas, un OK
        # affiché ne doit jamais survivre à cette incohérence.
        coherence_problems = [
            f"verdict prétend software_verdict=OK alors que le gate mutation "
            f"embarqué ne le confirme pas: {r}" for r in mutation_problems
        ]

    # (3) dérive git (TOCTOU) : avertissement, pas échec dur.
    git_stored = data.get("git_head", "")
    git_current = current_git_head()
    git_ok = (not git_stored) or (git_current == git_stored)

    # (4) knowledge_trace (R3, ferme AM1) : échec DUR si présente et falsifiée ;
    # absente = avertissement seul (tous les runs n'en portent pas encore).
    knowledge_trace_problems, knowledge_trace_warnings = _check_knowledge_trace(path.parent)
    knowledge_trace_ok = not knowledge_trace_problems

    # (5) Context Manifest (advisory, jamais un gate) : recoupe les lignes déjà
    # écrites, n'entre PAS dans `overall` — c'est une mesure de fraîcheur, pas
    # un oracle de vérité logicielle (cf. _check_context_manifest ci-dessus).
    context_manifest_problems, context_manifest_notes = _check_context_manifest(path.parent, key_file)

    # `integrity_ok` (== `overall`, conservé pour rétro-compat) NE dépend PLUS de
    # la couleur du gate mutation d'un verdict honnête — seulement de son
    # authenticité (mutation_integrity_ok) et de sa cohérence interne
    # (coherence_problems, gate dur décrit ci-dessus).
    integrity_ok = (hmac_ok and evidence_ok and mutation_integrity_ok
                    and knowledge_trace_ok and not coherence_problems)
    overall = integrity_ok
    return {
        "overall": overall,
        "integrity_ok": integrity_ok,
        "hmac_ok": hmac_ok,
        "evidence_ok": evidence_ok,
        "evidence_problems": evidence_problems,
        "mutation_ok": mutation_ok,
        "mutation_problems": mutation_problems,
        "mutation_integrity_problems": mutation_integrity_problems,
        "mutation_gate_green": mutation_gate_green,
        "mutation_status": mutation_status,
        "coherence_problems": coherence_problems,
        "git_ok": git_ok,
        "git_stored": git_stored,
        "git_current": git_current,
        "knowledge_trace_ok": knowledge_trace_ok,
        "knowledge_trace_problems": knowledge_trace_problems,
        "knowledge_trace_warnings": knowledge_trace_warnings,
        "context_manifest_problems": context_manifest_problems,
        "context_manifest_notes": context_manifest_notes,
        "software_verdict": data.get("software_verdict"),
        "decision": data.get("decision"),
    }


def _harden_streams() -> None:
    """Robustesse encodage console (P3) : sous Windows cp1252, les caractères
    non encodables (⚠, ✗) levaient UnicodeEncodeError → exit 1 factice sur un
    verdict pourtant AUTHENTIQUE, faussant toute gate automatisée. On garde
    l'encodage natif du flux mais on remplace les caractères non représentables
    (errors='replace') au lieu de crasher. Aucune logique de vérification ni
    exit code sémantique (0/2) n'est modifié."""
    for stream in (sys.stdout, sys.stderr):
        reconf = getattr(stream, "reconfigure", None)
        if reconf is not None:
            try:
                reconf(errors="replace")
            except (OSError, ValueError):
                pass  # flux exotique (fermé, non-buffer) : on n'aggrave pas


def main(argv: list[str] | None = None) -> int:
    _harden_streams()
    argv = argv if argv is not None else sys.argv[1:]
    if not argv:
        print("usage: python -m forge.verify_run <verdict.json>", file=sys.stderr)
        return 2
    res = verify_run(argv[0])
    if res.get("unreadable"):
        # Constat, pas accusation : rien n'a été signé, donc rien n'a pu être
        # falsifié. Ne PAS réutiliser les mots "FALSIFIÉ"/"ALTÉRÉE" plus bas,
        # qui affirment qu'un contenu signé a été trafiqué.
        print(f"verdict          : absent ou illisible ({res.get('reason')})")
        print("\nVÉRIFICATION : IMPOSSIBLE (aucun verdict.json exploitable à cet emplacement)")
        return 3
    # V1 (séparation intégrité/verdict, design imposé pt.5) : deux lectures
    # distinctes, JAMAIS fusionnées. « VERDICT LOGICIEL » est un FAIT RAPPORTÉ
    # (peut être FAIL/BLOCKED sans que ce soit un rejet) ; « INTÉGRITÉ » (en bas)
    # est LA seule ligne qui décide le code de sortie.
    print(f"VERDICT LOGICIEL : {res.get('software_verdict')} / {res.get('decision')}")
    print(f"HMAC             : {'OK' if res['hmac_ok'] else 'FALSIFIÉ'}")
    print(f"évidence intacte : {'OK' if res['evidence_ok'] else 'ALTÉRÉE'}")
    for p in res.get("evidence_problems", []):
        print(f"   ✗ {p}")
    # `mutation_integrity_problems` est la forme V1 ; retombe sur `mutation_problems`
    # (forme historique) pour des appelants/mocks qui ne rendraient encore que
    # l'ancienne clé — jamais de KeyError sur un résultat façonné à la main.
    mutation_integrity_problems = res.get("mutation_integrity_problems")
    if mutation_integrity_problems is None:
        mutation_integrity_problems = res.get("mutation_problems", [])
    print(f"preuve mutation (intégrité) : {'OK' if not mutation_integrity_problems else 'INVALIDE/PÉRIMÉE'}")
    for p in mutation_integrity_problems:
        print(f"   ✗ {p}")
    mutation_status = res.get("mutation_status")
    if mutation_status is not None:
        vert = "vert" if res.get("mutation_gate_green") else "rouge"
        print(f"gate mutation (verdict logiciel, non bloquant) : {vert} (status={mutation_status})")
    for p in res.get("coherence_problems", []):
        print(f"   ✗ [cohérence] {p}")
    print(f"knowledge_trace  : {'OK' if res.get('knowledge_trace_ok', True) else 'REJET (théâtre/corrompu)'}")
    for p in res.get("knowledge_trace_problems", []):
        print(f"   ✗ {p}")
    for w in res.get("knowledge_trace_warnings", []):
        print(f"   ⚠ {w}")
    if not res["git_ok"]:
        print(f"⚠ dérive git : signé {res['git_stored'][:12]} != courant {res['git_current'][:12]} (TOCTOU)")
    print(f"\nINTÉGRITÉ : {'AUTHENTIQUE' if res['overall'] else 'REJET'}")
    return 0 if res["overall"] else 2


if __name__ == "__main__":
    sys.exit(main())
