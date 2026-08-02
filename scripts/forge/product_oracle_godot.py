"""Fournisseur de volets de preuve GODOT pour `check_observable_coverage`
(`standard_oracles.py`) — pendant du fournisseur WEB existant (`product_oracle.py`,
NON modifié par ce module).

CONTEXTE MESURÉ (à vérifier, pas à croire) : les oracles Godot EXISTENT DÉJÀ côté
jeu — `games/snake/07_TESTS/oracle/*.gd` (10 fichiers, 2026-07-29) sont des scripts
`SceneTree` autonomes, un par ligne de wiremap, chacun émettant sur stdout UNE ligne
``FORGE_ORACLE <nom> {"ok": bool, "fails": [...], ...}`` puis ``quit(0 si vert sinon
1)``. Rien à écrire côté jeu ici (INTERDIT par la mission, aucune écriture sous
`games/**`) : il manquait seulement un COLLECTEUR côté Forge qui les découvre, les
exécute, et rend un mapping plat `{nom_volet: résultat}` — exactement la forme que
`check_observable_coverage` attend (même contrat que `product_oracle.run_product_oracle`).

Exemption GPU par MARQUEUR (R3, remplace l'exemption par nom en dur) : un volet dont
le payload FORGE_ORACLE déclare `"requires_gpu_window": true` (clé
`_GPU_WINDOW_MARKER_KEY`) est TOUJOURS rendu `NOT_MEASURED`, motivé (raison citant la
leçon `forge.oracle_fail_vs_not_measured_marker`), même si son `ok` vaut `false` —
cette déclaration fait AUTORITÉ. `GPU_WINDOW_REQUIRED_VOLETS` (aujourd'hui
`{"core_render_frame"}`, mesuré 2026-07-22, cf. mémoire
`godot_capture_requires_gpu_window`) reste un FILET de repli, nommé en dur, pour les
volets `.gd` existants qui ne portent pas encore la clé (INTERDIT de les modifier) :
pour ceux-là ce module ne lance JAMAIS le runner en espérant un vert, `NOT_MEASURED`
motivé sans exécution — comportement historique préservé à l'identique.

Discipline `NOT_MEASURED != OK` (invariant global ratifié Pierre, même que
`product_oracle.py`) partout : binaire Godot introuvable, sortie illisible, JSON
invalide, oracle absent, timeout => `NOT_MEASURED` motivé, JAMAIS une exception,
JAMAIS un vert ni un rouge fabriqué.

`binary_resolver` et `runner` sont INJECTABLES (même patron que `mutation_runner`/
`product_oracle_runner` du driver) : aucun test de ce module n'exige un vrai binaire
Godot — il est actuellement ABSENT de ce poste (`godot.config.json` pointe un chemin
qui n'existe plus, vérifié 2026-07-29).
"""
from __future__ import annotations

import json
import logging
import re
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)

# Marqueur de sortie partagé par tous les oracles `.gd` (cf. core_boot.gd,
# core_render_frame.gd...) : "FORGE_ORACLE <nom> {json}" sur une ligne stdout.
_FORGE_ORACLE_LINE = re.compile(r"^FORGE_ORACLE\s+(\S+)\s+(\{.*\})\s*$")

# Ligne observée dans TOUS les oracles `.gd` du studio à ce jour (core_render_frame.gd
# ligne 1, core_boot.gd commentaire d'en-tête...) : sert de discriminant de capacité
# ("ce fichier EST un oracle FORGE_ORACLE") sans jamais exécuter le fichier pour le
# savoir — lecture statique seulement, jamais un effet de bord.
_ORACLE_MARKER = "FORGE_ORACLE"

# Nom du volet qui exige une fenêtre GPU réelle (`--headless` = texture nulle, cf.
# mémoire `godot_capture_requires_gpu_window`, 2026-07-22). Nommé en dur ICI : c'est
# un FILET de repli, pas l'autorité — cf. `_GPU_WINDOW_MARKER_KEY` ci-dessous. Ce
# filet reste nécessaire pour les `.gd` existants qui ne portent pas encore la clé
# (INTERDIT de les modifier) : pour eux, on ne lance JAMAIS le runner (comme avant
# R3), donc leur payload FORGE_ORACLE n'est jamais lu — le nom en dur est le seul
# signal disponible.
GPU_WINDOW_REQUIRED_VOLETS = frozenset({"core_render_frame"})

_GPU_WINDOW_REASON = (
    "fenêtre GPU requise pour ce volet (core_render_frame) ; --headless rend une "
    "texture nulle (driver dummy) — aucune preuve pixel possible en headless "
    "(mesuré 2026-07-22, cf. mémoire godot_capture_requires_gpu_window). Ce "
    "collecteur ne lance jamais ce volet en headless en espérant un vert."
)

# Clé optionnelle que le PAYLOAD JSON d'un volet (la partie `{...}` de la ligne
# `FORGE_ORACLE <nom> {...}`, cf. `_FORGE_ORACLE_LINE`) peut porter pour déclarer
# LUI-MÊME qu'il n'a pas pu être mesuré faute de fenêtre GPU réelle — routage R3
# (remplace l'exemption par nom en dur par une exemption par MARQUEUR). Un volet qui
# déclare `"requires_gpu_window": true` dans son payload fait AUTORITÉ sur
# `GPU_WINDOW_REQUIRED_VOLETS` : même si son `ok` vaut `false`, le résultat est
# `NOT_MEASURED`, jamais `FAIL` — cf. leçon `forge.oracle_fail_vs_not_measured_marker`
# (« un oracle qui rend FAIL sur ce qu'il ne peut pas mesurer envoie réparer la
# mauvaise chose »). `GPU_WINDOW_REQUIRED_VOLETS` reste le FILET pour les volets qui
# ne déclarent rien (repli, comportement historique préservé) — cf. commentaire
# ci-dessus sur pourquoi ces volets-là ne sont jamais exécutés.
_GPU_WINDOW_MARKER_KEY = "requires_gpu_window"


def _marker_gpu_window_reason(fichier: str) -> str:
    """Raison NOT_MEASURED pour un volet qui s'est auto-déclaré `requires_gpu_window`
    dans son payload FORGE_ORACLE (routage par marqueur, pas par nom en dur). Le nom
    de la leçon `oracle_fail_vs_not_measured_marker` DOIT apparaître littéralement
    dans cette raison : c'est le fil de traçabilité qu'Observer peut constater depuis
    la sortie produite par une exécution réelle."""
    return (
        f"{fichier} déclare '{_GPU_WINDOW_MARKER_KEY}: true' dans son payload "
        "FORGE_ORACLE — fenêtre GPU réelle requise, aucune preuve pixel possible en "
        "headless. NOT_MEASURED (pas FAIL), conformément à la leçon "
        "forge.oracle_fail_vs_not_measured_marker : un oracle qui rend FAIL sur ce "
        "qu'il ne peut pas mesurer envoie réparer la mauvaise chose. Ce volet fait "
        "AUTORITÉ sur GPU_WINDOW_REQUIRED_VOLETS (déclaration par marqueur, pas par "
        "nom en dur)."
    )


def _not_measured(reason: str, **extra) -> dict:
    """Forme homogène `NOT_MEASURED` acceptée par `_volet_status`
    (`standard_oracles.py`) : `status` explicite, jamais un `passed` vert par défaut."""
    out = {"status": "NOT_MEASURED", "passed": False, "checked": False, "reason": reason}
    out.update(extra)
    return out


def discover_oracle_files(game_dir: Path) -> list[Path]:
    """Liste, TRIÉE (ordre déterministe, jamais dépendant du système de fichiers),
    les fichiers `.gd` de `<game_dir>/07_TESTS/oracle/` qui portent le marqueur
    `FORGE_ORACLE` (lecture statique seulement — jamais exécutés ici). C'est la
    mesure de CAPACITÉ (condition (b) de la correction Pierre ①) : des oracles
    Godot sont réellement présents sur disque pour ce jeu, indépendamment de toute
    déclaration de contrat."""
    oracle_dir = Path(game_dir) / "07_TESTS" / "oracle"
    if not oracle_dir.is_dir():
        return []
    found: list[Path] = []
    for path in sorted(oracle_dir.glob("*.gd")):
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as exc:
            logger.warning("product_oracle_godot: lecture échouée sur %s (%s)", path, exc)
            continue
        if _ORACLE_MARKER in text:
            found.append(path)
    return found


def has_godot_capacity(game_dir: Path) -> bool:
    """Condition (b), correction Pierre ① : la CAPACITÉ est constatée — au moins un
    oracle `FORGE_ORACLE` réellement présent sur disque pour ce jeu."""
    return bool(discover_oracle_files(game_dir))


def _default_binary_resolver() -> str:
    """Résolution RÉELLE (défaut, jamais utilisée par les tests de ce module) : même
    source que `godot_bin.mjs` (env `GODOT_BIN` puis `scripts/forge/godot.config.json`),
    réimplémentée ici côté Python pour ne pas dépendre de Node depuis ce collecteur.
    Lève `FileNotFoundError` si aucun binaire n'est configuré ou ne se trouve pas sur
    le disque — l'appelant (`run_godot_product_oracle`) traduit ceci en `NOT_MEASURED`
    motivé pour TOUS les volets, jamais une exception qui remonte."""
    import os

    env_bin = os.environ.get("GODOT_BIN")
    if env_bin:
        candidate = Path(env_bin)
        if candidate.is_file():
            return str(candidate)
        raise FileNotFoundError(
            f"GODOT_BIN={env_bin!r} déclaré mais introuvable sur le disque")

    config_path = Path(__file__).resolve().parent / "godot.config.json"
    if not config_path.is_file():
        raise FileNotFoundError(
            f"aucun binaire Godot configuré (ni GODOT_BIN, ni {config_path})")
    try:
        parsed = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise FileNotFoundError(f"{config_path} illisible/invalide : {exc}") from exc
    godot_bin = parsed.get("godot_bin") if isinstance(parsed, dict) else None
    if not isinstance(godot_bin, str) or not godot_bin:
        raise FileNotFoundError(f"{config_path} ne déclare pas de champ 'godot_bin'")
    repo_root = Path(__file__).resolve().parent.parent.parent
    candidate = (repo_root / godot_bin) if not Path(godot_bin).is_absolute() else Path(godot_bin)
    if not candidate.is_file():
        raise FileNotFoundError(
            f"binaire Godot introuvable sur le disque : {candidate} (déclaré par "
            f"{config_path})")
    return str(candidate)


def _default_runner(binary: str, game_dir: Path, script_res_path: str, *, timeout_s: int) -> dict:
    """Exécute réellement `godot --headless --path <game_dir> --script <res://...>` et
    relit la ligne `FORGE_ORACLE <nom> {json}` sur stdout. Jamais utilisé par les
    tests de ce module (`runner` injecté à la place)."""
    try:
        proc = subprocess.run(
            [binary, "--headless", "--path", str(game_dir), "--script", script_res_path],
            capture_output=True, text=True, timeout=timeout_s,
            encoding="utf-8", errors="replace",
        )
    except subprocess.TimeoutExpired:
        return {"ok": None, "timeout": True, "returncode": None, "stdout": "", "stderr": ""}
    except OSError as exc:
        return {"ok": None, "error": str(exc), "returncode": None, "stdout": "", "stderr": ""}
    return {
        "returncode": proc.returncode,
        "stdout": proc.stdout,
        "stderr": proc.stderr,
    }


def _parse_forge_oracle_line(stdout: str) -> dict | None:
    """Retrouve la DERNIÈRE ligne `FORGE_ORACLE <nom> {json}` de stdout (le contrat
    n'exclut pas des logs avant elle) et parse son JSON. `None` si aucune ligne
    conforme ou JSON invalide — jamais une exception."""
    match = None
    for line in stdout.splitlines():
        m = _FORGE_ORACLE_LINE.match(line.strip())
        if m:
            match = m
    if match is None:
        return None
    try:
        payload = json.loads(match.group(2))
    except ValueError:
        return None
    if not isinstance(payload, dict):
        return None
    return {"volet_name": match.group(1), "payload": payload}


def run_godot_product_oracle(
    game_dir: Path,
    *,
    binary_resolver=None,
    runner=None,
    timeout_s: int = 60,
) -> dict:
    """Découvre les oracles `FORGE_ORACLE` du jeu (`07_TESTS/oracle/*.gd`), les
    exécute (un process par fichier, `godot --headless --path <game_dir> --script
    res://07_TESTS/oracle/<fichier>`), et rend un mapping PLAT
    `{nom_volet: {"status": ..., "passed": ..., "fails": [...], ...}}` — même
    contrat que `product_oracle.run_product_oracle`, consommable tel quel par
    `check_observable_coverage`/`_volet_status` (`standard_oracles.py`, NON modifiés).

    - `binary_resolver()` (par défaut `_default_binary_resolver`, jamais appelé par
      les tests) doit renvoyer le chemin du binaire Godot ou lever `FileNotFoundError`.
      Binaire introuvable => TOUS les volets découverts sont `NOT_MEASURED`, raison
      nommée — jamais OK, jamais FAIL (l'absence de mesure n'est pas un échec de
      mesure, garde-fou explicite de la mission).
    - `runner(binary, game_dir, script_res_path, *, timeout_s) -> dict` (par défaut
      `_default_runner`) exécute UN oracle et renvoie `{returncode, stdout, stderr}`
      (ou `{ok: None, timeout: True, ...}` / `{ok: None, error: ..., ...}` sur échec
      de spawn) — jamais appelé sur les volets du FILET `GPU_WINDOW_REQUIRED_VOLETS`
      (repli nom en dur, comportement historique).
    - Exemption GPU par MARQUEUR (autorité) : un volet EXÉCUTÉ dont le payload
      FORGE_ORACLE déclare `"requires_gpu_window": true` est rendu `NOT_MEASURED`,
      raison citant la leçon `forge.oracle_fail_vs_not_measured_marker`, MÊME SI
      `ok` vaut `false` — jamais un FAIL fabriqué sur ce qui n'a pas pu être mesuré.
      Les volets du FILET `GPU_WINDOW_REQUIRED_VOLETS` restent TOUJOURS
      `NOT_MEASURED` sans jamais être exécutés (repli, pour les `.gd` existants qui
      ne portent pas encore la clé).
    - Robustesse : sortie illisible, JSON invalide, oracle absent, timeout du process
      => `NOT_MEASURED` motivé, JAMAIS d'exception qui remonte à l'appelant.
    """
    game_dir = Path(game_dir)
    binary_resolver = binary_resolver or _default_binary_resolver
    runner = runner or _default_runner

    oracle_files = discover_oracle_files(game_dir)
    if not oracle_files:
        return {}

    try:
        binary = binary_resolver()
    except Exception as exc:  # noqa: BLE001 — absence de mesure, jamais une exception
        reason = f"binaire Godot introuvable/non configuré : {exc}"
        logger.warning("product_oracle_godot: %s", reason)
        return {
            path.stem: _not_measured(reason, fichier=str(path))
            for path in oracle_files
        }

    result: dict = {}
    for path in oracle_files:
        volet_name = path.stem
        if volet_name in GPU_WINDOW_REQUIRED_VOLETS:
            result[volet_name] = _not_measured(_GPU_WINDOW_REASON, fichier=str(path))
            continue

        script_res_path = f"res://07_TESTS/oracle/{path.name}"
        try:
            run_out = runner(binary, game_dir, script_res_path, timeout_s=timeout_s)
        except Exception as exc:  # noqa: BLE001 — best-effort, jamais bloquant
            logger.warning(
                "product_oracle_godot: exécution échouée pour %s (%s)", path, exc)
            result[volet_name] = _not_measured(
                f"exception levée en exécutant {path.name} : {exc}", fichier=str(path))
            continue

        if not isinstance(run_out, dict):
            result[volet_name] = _not_measured(
                f"runner a renvoyé une valeur non exploitable pour {path.name}",
                fichier=str(path))
            continue
        if run_out.get("timeout"):
            result[volet_name] = _not_measured(
                f"timeout ({timeout_s}s) sur {path.name}", fichier=str(path))
            continue
        if run_out.get("error"):
            result[volet_name] = _not_measured(
                f"exécuteur Godot introuvable/inexécutable : {run_out['error']}",
                fichier=str(path))
            continue

        stdout = run_out.get("stdout") or ""
        parsed = _parse_forge_oracle_line(stdout)
        if parsed is None:
            result[volet_name] = _not_measured(
                f"sortie FORGE_ORACLE illisible/absente pour {path.name}",
                fichier=str(path), returncode=run_out.get("returncode"),
                stdout_tail=stdout[-500:], stderr_tail=(run_out.get("stderr") or "")[-500:],
            )
            continue

        payload = parsed["payload"]

        if payload.get(_GPU_WINDOW_MARKER_KEY) is True:
            # Autorité par marqueur (R3) : le volet s'est lui-même déclaré
            # dépendant d'une fenêtre GPU réelle dans son payload — prime sur
            # GPU_WINDOW_REQUIRED_VOLETS, jamais un FAIL fabriqué sur ce qui n'a
            # pas pu être mesuré.
            result[volet_name] = _not_measured(
                _marker_gpu_window_reason(path.name), fichier=str(path), payload=payload)
            continue

        ok = payload.get("ok")
        if not isinstance(ok, bool):
            result[volet_name] = _not_measured(
                f"champ 'ok' absent/non booléen dans la sortie FORGE_ORACLE de {path.name}",
                fichier=str(path), payload=payload)
            continue

        result[volet_name] = {
            "status": "OK" if ok else "FAIL",
            "passed": ok,
            "checked": True,
            "fails": payload.get("fails", []),
            "fichier": str(path),
            "payload": payload,
        }

    return result
