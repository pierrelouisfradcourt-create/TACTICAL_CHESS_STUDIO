#!/usr/bin/env python3
r"""
Rocky Coach v0 — Explication des coups de Rocky en français via LM Studio.

Slow path UNIQUEMENT. Ne touche jamais la boucle de décision.
Le coup est déjà choisi par la Search avant l'arrivée ici.

Lane : nouveau fichier ml/coach.py — aucune modification de fichier existant.
claim_verdict: NO_CLAIM_ALLOWED

Usage (depuis la racine du repo) :

  # 1. Tester la connexion LM Studio :
  .\.venv312\Scripts\python.exe ml\coach.py --test

  # 2. Analyser depuis un log (recommande pour v0) :
  $env:TCS_DEBUG = "1"
  cargo run --release -- simulate_chess960 518 3 2>&1 > rocky_debug.log
  .\.venv312\Scripts\python.exe ml\coach.py < rocky_debug.log

  # 3. Pipeline direct :
  $env:TCS_DEBUG = "1"
  cargo run --release -- simulate_chess960 518 3 2>&1 | .\.venv312\Scripts\python.exe ml\coach.py

  # 4. Un seul coup (dernier MOVE_DIAG) :
  .\.venv312\Scripts\python.exe ml\coach.py --only-final < rocky_debug.log

  # 5. Mode verbeux (affiche le prompt envoye) :
  .\.venv312\Scripts\python.exe ml\coach.py --verbose < rocky_debug.log
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
import urllib.error
from dataclasses import dataclass
from typing import Optional

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

LM_STUDIO_BASE = "http://127.0.0.1:1234"
LM_STUDIO_CHAT = LM_STUDIO_BASE + "/v1/chat/completions"
LM_STUDIO_MODELS = LM_STUDIO_BASE + "/api/v1/models"
LM_STUDIO_TIMEOUT = 30

COACH_SYSTEM_PROMPT = (
    "Tu es le coach de Rocky, une IA d'echecs. "
    "Tu expliques en francais les decisions de Rocky au joueur humain, "
    "de facon pedagogique et concise (2-3 phrases maximum). "
    "Tu n'utilises pas de jargon technique ni la notation UCI brute. "
    "Tu parles directement au joueur, comme un coach bienveillant. "
    "Ne commence pas par 'Rocky a joue' mais par l'idee derriere le coup."
)


# ---------------------------------------------------------------------------
# Detection automatique du modele charge
# ---------------------------------------------------------------------------

def detect_loaded_model(fallback: str = "mistral-7b-instruct-v0.3") -> str:
    """Detecte le modele LLM charge dans LM Studio via /api/v1/models."""
    req = urllib.request.Request(LM_STUDIO_MODELS, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for model in data.get("models", []):
                if model.get("type") == "llm" and model.get("loaded_instances"):
                    key = model["key"]
                    print(f"[COACH] Modele detecte : {key}", file=sys.stderr)
                    return key
    except Exception as e:
        print(f"[COACH] Detection modele impossible : {e}", file=sys.stderr)
    print(f"[COACH] Modele fallback : {fallback}", file=sys.stderr)
    return fallback


# ---------------------------------------------------------------------------
# Parsing MOVE_DIAG
# ---------------------------------------------------------------------------

@dataclass
class MoveDiag:
    source: str
    phase: str
    band: str
    plan: str
    selected: str
    material: int
    own_moves: int
    enemy_moves: int
    repetition_pressure: int
    passed_pawn_distance: int
    no_progress_pressure: int
    score: int
    enemy_moves_delta: int
    passed_pawn_delta: int
    repeat: int


def _parse_kv(parts: list) -> dict:
    kv = {}
    for part in parts:
        if "=" in part:
            k, _, v = part.partition("=")
            kv[k.strip()] = v.strip()
    return kv


def parse_move_diag(line: str) -> Optional[MoveDiag]:
    if not line.startswith("MOVE_DIAG|"):
        return None
    parts = line.split("|")
    kv = _parse_kv(parts[1:])
    try:
        return MoveDiag(
            source=kv.get("source", "search"),
            phase=kv.get("phase", "unknown"),
            band=kv.get("band", "unknown"),
            plan=kv.get("plan", "none"),
            selected=kv.get("selected", "?"),
            material=int(kv.get("material", "0")),
            own_moves=int(kv.get("own_moves", "0")),
            enemy_moves=int(kv.get("enemy_moves", "0")),
            repetition_pressure=int(kv.get("repetition_pressure", "0")),
            passed_pawn_distance=int(kv.get("passed_pawn_distance", "8")),
            no_progress_pressure=int(kv.get("no_progress_pressure", "0")),
            score=int(kv.get("score", "0")),
            enemy_moves_delta=int(kv.get("enemy_moves_delta", "0")),
            passed_pawn_delta=int(kv.get("passed_pawn_delta", "0")),
            repeat=int(kv.get("repeat", "0")),
        )
    except (ValueError, KeyError) as e:
        print(f"[COACH] Erreur parsing: {e}", file=sys.stderr)
        return None


def uci_to_readable(move: str) -> str:
    if len(move) >= 4:
        from_sq = move[:2].upper()
        to_sq = move[2:4].upper()
        promo = ""
        if len(move) == 5:
            pieces = {"q": "Dame", "r": "Tour", "b": "Fou", "n": "Cavalier"}
            promo = " (promotion en " + pieces.get(move[4].lower(), move[4].upper()) + ")"
        return from_sq + "->" + to_sq + promo
    return move


# ---------------------------------------------------------------------------
# Construction du prompt
# ---------------------------------------------------------------------------

def build_coaching_prompt(diag: MoveDiag, move_number: int) -> str:
    move_readable = uci_to_readable(diag.selected)

    phase_map = {
        "opening": "l'ouverture",
        "midgame": "le milieu de partie",
        "endgame": "la finale",
    }
    phase_fr = phase_map.get(diag.phase, diag.phase)

    score_pawns = diag.score / 100.0
    score_sign = "+" if score_pawns >= 0 else ""
    score_str = score_sign + str(round(score_pawns, 2)) + " pions"

    material_pawns = abs(diag.material / 100.0)
    if diag.material > 100:
        mat_str = "avance materielle de +" + str(round(material_pawns, 1)) + " pion(s)"
    elif diag.material < -100:
        mat_str = "retard materiel de " + str(round(material_pawns, 1)) + " pion(s) (compense positionellement)"
    else:
        mat_str = "equilibre materiel"

    band_map = {
        "ahead": "Rocky est en position favorable",
        "behind": "Rocky est en position difficile",
        "equal": "position equilibree",
    }
    band_str = band_map.get(diag.band, diag.band)

    mob_diff = diag.own_moves - diag.enemy_moves
    if mob_diff >= 4:
        mob_str = "bonne mobilite (" + str(diag.own_moves) + " coups vs " + str(diag.enemy_moves) + " a l'adversaire)"
    elif mob_diff <= -4:
        mob_str = "mobilite reduite (" + str(diag.own_moves) + " coups vs " + str(diag.enemy_moves) + " a l'adversaire)"
    else:
        mob_str = "mobilite equilibree (" + str(diag.own_moves) + " coups vs " + str(diag.enemy_moves) + ")"

    impacts = []
    if diag.enemy_moves_delta > 0:
        impacts.append("ce coup limite l'adversaire (" + str(diag.enemy_moves_delta) + " coup(s) en moins)")
    elif diag.enemy_moves_delta < 0:
        impacts.append("ce coup libere l'adversaire (" + str(-diag.enemy_moves_delta) + " coup(s) supplementaires)")
    if diag.repetition_pressure > 0:
        impacts.append("risque de repetition (" + str(diag.repetition_pressure) + ")")
    if diag.no_progress_pressure > 15:
        impacts.append("regle des 50 coups (" + str(diag.no_progress_pressure) + " coups sans progres)")
    if diag.passed_pawn_delta > 0:
        impacts.append("ameliore la situation des pions passes")

    impact_str = " ; ".join(impacts) if impacts else "aucun impact specifique"

    plan_note = ""
    if diag.plan and diag.plan.lower() not in ("none", "unknown", ""):
        plan_note = "\n- Plan tactique : " + diag.plan

    prompt = (
        "Coup " + str(move_number) + " de Rocky : " + move_readable + "\n"
        "Phase : " + phase_fr + "\n\n"
        "Contexte :\n"
        "- " + band_str + " (evaluation : " + score_str + ")\n"
        "- " + mat_str + "\n"
        "- " + mob_str + "\n"
        "- " + impact_str
        + plan_note + "\n\n"
        "Explique en 2-3 phrases pourquoi Rocky a joue " + move_readable + ". "
        "Parle directement au joueur."
    )
    return prompt


# ---------------------------------------------------------------------------
# Appel LM Studio
# ---------------------------------------------------------------------------

def call_lm_studio(prompt: str, model: str, verbose: bool = False) -> str:
    # Mistral ne supporte pas le role system - on fusionne dans user
    full_prompt = COACH_SYSTEM_PROMPT + "\n\n" + prompt
    payload = {
        "model": model,
        "messages": [

            {"role": "user", "content": full_prompt},
        ],
        "max_tokens": 180,
        "temperature": 0.65,
        "stream": False,
    }

    if verbose:
        print("\n[PROMPT]\n" + prompt + "\n" + "-" * 60, file=sys.stderr)

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        LM_STUDIO_CHAT,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=LM_STUDIO_TIMEOUT) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"].strip()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return "[Coach HTTP " + str(e.code) + " : " + body[:200] + "]"
    except urllib.error.URLError as e:
        return "[Coach indisponible : " + str(e.reason) + "]"
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        return "[Coach reponse invalide : " + str(e) + "]"
    except Exception as e:
        return "[Coach erreur : " + str(e) + "]"


def test_connection(model: str) -> bool:
    print("Test de connexion a " + LM_STUDIO_CHAT + " ...")
    print("Modele : " + model)
    result = call_lm_studio("Reponds uniquement par : 'Coach pret.'", model=model)
    print("Reponse : " + result)
    ok = not result.startswith("[Coach")
    if ok:
        print("OK LM Studio operationnel.")
    else:
        print("ECHEC LM Studio inaccessible ou modele non charge.")
    return ok


# ---------------------------------------------------------------------------
# Lecture robuste (gestion wrap PowerShell)
# ---------------------------------------------------------------------------

KNOWN_PREFIXES = ("MOVE_DIAG|", "ROOT_DECISION_SELECTED|")


def read_full_lines(stream) -> list:
    result = []
    current = ""
    for raw in stream:
        line = raw.rstrip("\r\n")
        if not line:
            continue
        starts_new = any(line.startswith(p) for p in KNOWN_PREFIXES)
        if starts_new:
            if current:
                result.append(current)
            current = line
        elif current:
            current += line
    if current:
        result.append(current)
    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Rocky Coach v0 — Explique les coups de Rocky en francais via LM Studio."
    )
    parser.add_argument("--test", action="store_true", help="Teste la connexion LM Studio.")
    parser.add_argument("--verbose", action="store_true", help="Affiche le prompt envoye.")
    parser.add_argument("--only-final", action="store_true", help="Explique seulement le dernier coup.")
    parser.add_argument("--model", default=None, help="Nom du modele LM Studio (auto-detecte par defaut).")
    args = parser.parse_args()

    model = args.model if args.model else detect_loaded_model()

    if args.test:
        ok = test_connection(model)
        sys.exit(0 if ok else 1)

    lines = read_full_lines(sys.stdin)
    diags = [d for line in lines if (d := parse_move_diag(line)) is not None]

    if not diags:
        print("[COACH] Aucun MOVE_DIAG trouve dans l'entree.")
        print("Exemple :")
        print("  $env:TCS_DEBUG = '1'")
        print("  cargo run --release -- simulate_chess960 518 3 2>&1 > rocky_debug.log")
        print("  .venv312\\Scripts\\python.exe ml\\coach.py < rocky_debug.log")
        sys.exit(1)

    if args.only_final:
        diags = [diags[-1]]

    print("\n" + "=" * 60)
    print("  Rocky Coach v0 — " + str(len(diags)) + " coup(s) a expliquer")
    print("  Modele : " + model)
    print("=" * 60 + "\n")

    for i, diag in enumerate(diags, start=1):
        move_readable = uci_to_readable(diag.selected)
        score_str = ("+" if diag.score >= 0 else "") + str(round(diag.score / 100, 2))
        print(
            "Coup " + str(i).zfill(2) + " : " + move_readable
            + "  [" + diag.phase + " | " + diag.band + " | score=" + score_str + "]"
        )
        print("  -> ", end="", flush=True)
        prompt = build_coaching_prompt(diag, i)
        explanation = call_lm_studio(prompt, model=model, verbose=args.verbose)
        print(explanation)
        print()

    print("=" * 60)
    print("  Fin — " + str(len(diags)) + " coup(s) expliques")
    print("=" * 60)


if __name__ == "__main__":
    main()
