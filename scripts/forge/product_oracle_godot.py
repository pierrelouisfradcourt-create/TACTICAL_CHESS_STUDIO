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
import time
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


# =====================================================================================
# ORACLE DE DIVERGENCE PRODUIT (P6, invariant INV-4 : tout paramètre déclaré doit
# produire un effet runtime mesurable).
#
# ┌───────────────────────────────────────────────────────────────────────────────────┐
# │ STATUT : PASSIVE / NOT_WIRED — ce sous-système n'est PAS une capacité active.      │
# └───────────────────────────────────────────────────────────────────────────────────┘
# Audit de réalité du 2026-08-10 (déclaration → producteur → consommateur → runtime →
# preuve). Ce qui est VRAI : le code existe, il est testé (17 tests verts dans
# `tests/test_product_oracle_godot_divergence.py`), et la convention d'emplacement est
# réelle — `07_TESTS/oracle/` existe déjà dans 5 jeux (breakout_v2, pacman, pong, snake,
# tetris). Ce qui MANQUE, mesuré :
#
#   · CONSOMMATEUR : aucun. `driver.py:70` n'importe que `has_godot_capacity` et
#     `run_godot_product_oracle`. `run_divergence_oracle`, `has_divergence_capacity` et
#     `discover_divergence_manifest` ne sont importés par personne hors leurs tests.
#   · DONNÉE D'ENTRÉE : aucune. AUCUN jeu du dépôt ne porte de `divergence_manifest.json`.
#     Même branché, ce mécanisme n'aurait rien à mesurer aujourd'hui.
#   · PRODUCTEUR DE MANIFESTE : aucun, et aucun n'est déclaré — ni contrat d'étape, ni
#     `standard/`, ni documentation. La prochaine étape n'est pas inscrite dans le dépôt.
#
# Pourquoi c'est écrit ici plutôt que corrigé : `IMPLEMENTED + TESTED + 0 consommateur
# + 0 donnée d'entrée = PASSIVE`, jamais une capacité opérationnelle. Des tests verts ne
# sont pas un critère de fin — c'est précisément le défaut architectural que la
# réparation de la boucle de revue (commit 314fe19) vient d'éliminer ailleurs, et le
# studio compte déjà plusieurs capteurs dans cette situation. Marquer le statut est la
# règle « déclaré ≠ exécuté » : un sous-système inerte doit se déclarer inerte, sinon la
# carte ment en silence.
#
# POUR L'ACTIVER, dans cet ordre : (1) décider qui produit `divergence_manifest.json` et
# l'inscrire dans un contrat d'étape ; (2) brancher `run_divergence_oracle` au point
# `s10a` de `driver.py`, où `run_godot_product_oracle` est déjà câblé ; (3) prouver sur
# un jeu réel. Tant que (1) n'est pas tranché par HumanGate, (2) et (3) sont prématurés.
#
# GÉNÉRALISATION du test différentiel écrit À LA MAIN une seule fois pour Pac-Man
# (`games/pacman/07_TESTS/oracle/v6_p1_mode_governs_lives.gd`, lot V6, 2026-08-06) : le
# défaut mesuré alors — un mode de jeu déclaré, `godot_oracle` VERT à 2612 assertions,
# 0 divergence d'état sur 200 tics entre les deux modes — n'avait été trouvé par AUCUN
# oracle de la chaîne, seulement par une mesure différentielle ad hoc. Ce module la rend
# RÉUTILISABLE : un paramètre par entrée de manifeste, une sonde Godot générique
# (`godot_probes/divergence_probe.gd`, hors games/**), deux campagnes par paramètre
# (CONTRÔLE + RÉEL), jamais réécrites à la main pour le prochain jeu.
#
# CONVENTION DE DÉCOUVERTE (nouvelle, lecture seule, même discipline que
# `discover_oracle_files` ci-dessus) : `<game_dir>/07_TESTS/oracle/divergence_manifest.json`
#   {"params": [{"id": "mode", "adapter": "res://.../adapter.gd" | "chemin/disque",
#                "values": [v_a, v_b], "seed": 7, "ticks": 200,
#                "ignore_keys": ["mode_jeu"]}, ...]}
# Absence de manifeste (jeu non retrofit, ex. games/pacman — produit gelé, jamais
# modifié par ce module) => mapping VIDE, jamais une erreur : exactement le même
# comportement que `run_godot_product_oracle` sur un jeu sans oracle `.gd`.
#
# L'ADAPTATEUR (contrat documenté en tête de `divergence_probe.gd`) porte la
# connaissance PROPRE AU JEU (comment construire un état, l'avancer, le projeter) ; ce
# module et la sonde ne connaissent RIEN d'un jeu particulier — c'est ce qui rend la
# capacité réutilisable d'un jeu à l'autre sans dupliquer l'instrument de mesure.
#
# `adapter` peut être un chemin `res://` (adaptateur livré DANS le projet du jeu, comme
# les autres oracles `.gd`) ou un chemin DISQUE (relatif au repo racine, ou absolu) —
# utile pour les preuves reconstituées hors du jeu (`lab/forge_evidence/...`), sans
# jamais écrire sous `games/**`. Vérifié 2026-08-07 : `load()` résout un chemin disque
# même sous un `--path` de projet différent.
#
# Discipline NOT_MEASURED != OK identique au reste du module : binaire absent, sortie
# illisible, timeout, déclaration incomplète => `NOT_MEASURED` motivé, jamais un vert ni
# un rouge fabriqué.

DIVERGENCE_PROBE_PATH = Path(__file__).resolve().parent / "godot_probes" / "divergence_probe.gd"
_DIVERGENCE_MANIFEST_REL = Path("07_TESTS") / "oracle" / "divergence_manifest.json"
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent

# Budget par défaut si l'entrée du manifeste ne le déclare pas.
DEFAULT_DIVERGENCE_SEED = 7
DEFAULT_DIVERGENCE_TICKS = 200


def discover_divergence_manifest(game_dir: Path) -> dict | None:
    """Lit `<game_dir>/07_TESTS/oracle/divergence_manifest.json` (lecture seule).
    `None` si le fichier est absent, illisible, JSON invalide, de forme non-dict, ou
    sans clé `params` de type liste — JAMAIS une exception. L'absence de manifeste
    signifie « ce jeu n'a pas encore été retrofit sur cette capacité », pas une erreur :
    c'est la mesure de CAPACITÉ, symétrique de `discover_oracle_files`."""
    path = Path(game_dir) / _DIVERGENCE_MANIFEST_REL
    if not path.is_file():
        return None
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        logger.warning("product_oracle_godot: manifeste de divergence illisible (%s)", exc)
        return None
    if not isinstance(parsed, dict):
        return None
    params = parsed.get("params")
    if not isinstance(params, list):
        return None
    return parsed


def has_divergence_capacity(game_dir: Path) -> bool:
    """CAPACITÉ constatée : au moins un paramètre déclaré dans le manifeste de
    divergence de ce jeu."""
    manifest = discover_divergence_manifest(game_dir)
    return bool(manifest and manifest.get("params"))


def _resolve_adapter_path(adapter: str) -> str:
    """`res://...` est laissé tel quel (résolu par Godot via `--path <game_dir>`).
    Toute autre valeur est traitée comme un chemin DISQUE : absolu tel quel, sinon
    résolu relativement à la racine du dépôt (convention des chemins de preuve sous
    `lab/forge_evidence/...`)."""
    if adapter.startswith("res://"):
        return adapter
    candidate = Path(adapter)
    if not candidate.is_absolute():
        candidate = (_REPO_ROOT / candidate)
    return str(candidate).replace("\\", "/")


def _default_divergence_runner(
    binary: str, game_dir: Path, probe_script: Path, user_args: list[str], *, timeout_s: int
) -> dict:
    """Exécute réellement `godot --headless --path <game_dir> --script
    <divergence_probe.gd absolu> -- <user_args>`. Jamais utilisé par les tests de ce
    module (`runner` injecté à la place)."""
    try:
        proc = subprocess.run(
            [binary, "--headless", "--path", str(game_dir), "--script", str(probe_script),
             "--", *user_args],
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


def run_divergence_oracle(
    game_dir: Path,
    *,
    binary_resolver=None,
    runner=None,
    timeout_s: int = 60,
    probe_script: Path | None = None,
) -> dict:
    """Découvre le manifeste de divergence du jeu, exécute la sonde générique
    `divergence_probe.gd` une fois PAR PARAMÈTRE déclaré (un process par paramètre), et
    rend un mapping PLAT `{"divergence_<id>": {...}}` — même contrat que
    `run_godot_product_oracle`, consommable par `check_observable_coverage`.

    Chaque volet résultat porte :
      - `status` : OK (contrôle à 0 ET réel > 0) | FAIL (contrôle bruité OU paramètre
        inerte) | NOT_MEASURED (binaire absent, déclaration incomplète, exécution
        illisible/timeout) ;
      - `fails` : raisons NOMMÉES (le paramètre, les clés d'état comparées) — jamais un
        simple booléen ;
      - `controle`/`reel` : `{ticks, ticks_divergents, cles}` des deux campagnes ;
      - `cout_ms` : durée mesurée côté sonde (Godot) ; `host_duration_ms` : durée
        mesurée côté appelant (inclut le lancement du process) — le COÛT PAR PARAMÈTRE
        que ce capteur devra payer à chaque lot, tel que demandé par la mission.
    """
    game_dir = Path(game_dir)
    binary_resolver = binary_resolver or _default_binary_resolver
    runner = runner or _default_divergence_runner
    probe_script = probe_script or DIVERGENCE_PROBE_PATH

    manifest = discover_divergence_manifest(game_dir)
    params = (manifest or {}).get("params") or []
    if not params:
        return {}

    try:
        binary = binary_resolver()
    except Exception as exc:  # noqa: BLE001 — absence de mesure, jamais une exception
        reason = f"binaire Godot introuvable/non configuré : {exc}"
        logger.warning("product_oracle_godot: %s", reason)
        return {
            f"divergence_{p.get('id') if isinstance(p, dict) else i}": _not_measured(reason)
            for i, p in enumerate(params)
        }

    result: dict = {}
    for i, raw in enumerate(params):
        if not isinstance(raw, dict):
            result[f"divergence_{i}"] = _not_measured(
                f"entrée #{i} du manifeste de divergence n'est pas un objet")
            continue

        param_id = str(raw.get("id") or f"param_{i}")
        volet_name = f"divergence_{param_id}"

        adapter = raw.get("adapter")
        values = raw.get("values")
        if not isinstance(adapter, str) or not adapter:
            result[volet_name] = _not_measured(
                f"paramètre '{param_id}' : champ 'adapter' manquant/invalide dans le manifeste")
            continue
        if not isinstance(values, list) or len(values) < 2:
            result[volet_name] = _not_measured(
                f"paramètre '{param_id}' : 'values' doit lister au moins 2 valeurs "
                f"(reçu {values!r}) — il faut au moins une valeur A et une valeur B à comparer")
            continue

        seed = raw.get("seed", DEFAULT_DIVERGENCE_SEED)
        ticks = raw.get("ticks", DEFAULT_DIVERGENCE_TICKS)
        ignore_keys = raw.get("ignore_keys") or []
        value_a, value_b = values[0], values[1]

        user_args = [
            f"--adapter={_resolve_adapter_path(adapter)}",
            f"--param={param_id}",
            f"--seed={int(seed)}",
            f"--ticks={int(ticks)}",
            f"--value_a={value_a}",
            f"--value_b={value_b}",
        ]
        if ignore_keys:
            user_args.append(f"--ignore={','.join(str(k) for k in ignore_keys)}")

        t0 = time.monotonic()
        try:
            run_out = runner(binary, game_dir, probe_script, user_args, timeout_s=timeout_s)
        except Exception as exc:  # noqa: BLE001 — best-effort, jamais bloquant
            logger.warning(
                "product_oracle_godot: exécution de la sonde de divergence échouée pour "
                "'%s' (%s)", param_id, exc)
            result[volet_name] = _not_measured(
                f"exception levée en exécutant la sonde de divergence pour '{param_id}' : {exc}")
            continue
        host_duration_ms = int((time.monotonic() - t0) * 1000)

        if not isinstance(run_out, dict):
            result[volet_name] = _not_measured(
                f"runner a renvoyé une valeur non exploitable pour '{param_id}'")
            continue
        if run_out.get("timeout"):
            result[volet_name] = _not_measured(
                f"timeout ({timeout_s}s) sur la sonde de divergence pour '{param_id}'")
            continue
        if run_out.get("error"):
            result[volet_name] = _not_measured(
                f"exécuteur Godot introuvable/inexécutable pour '{param_id}' : {run_out['error']}")
            continue

        stdout = run_out.get("stdout") or ""
        parsed = _parse_forge_oracle_line(stdout)
        if parsed is None:
            result[volet_name] = _not_measured(
                f"sortie FORGE_ORACLE illisible/absente pour la sonde de divergence de "
                f"'{param_id}'", returncode=run_out.get("returncode"),
                stdout_tail=stdout[-500:], stderr_tail=(run_out.get("stderr") or "")[-500:])
            continue

        payload = parsed["payload"]
        ok = payload.get("ok")
        if not isinstance(ok, bool):
            result[volet_name] = _not_measured(
                f"champ 'ok' absent/non booléen dans la sortie de la sonde de divergence "
                f"pour '{param_id}'", payload=payload)
            continue

        result[volet_name] = {
            "status": "OK" if ok else "FAIL",
            "passed": ok,
            "checked": True,
            "fails": payload.get("fails", []),
            "param": param_id,
            "controle": payload.get("controle"),
            "reel": payload.get("reel"),
            "cout_ms": payload.get("cout_ms"),
            "host_duration_ms": host_duration_ms,
            "payload": payload,
        }

    return result
