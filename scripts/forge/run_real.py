"""scripts/forge/run_real.py — premier point d'entrée RÉEL de `forge.driver.ForgeDriver`.

Jusqu'ici `ForgeDriver` n'était exercé qu'avec un `StubExecutor` (tests unitaires,
scripts/forge/tests/test_driver.py). Ce module fournit l'exécuteur RÉEL des étapes
LLM (`claude` en mode headless, `claude -p --output-format json`) : c'est la seule
façon d'obtenir un vrai tour Claude depuis une boucle Python synchrone — l'outil
Agent lui-même n'est joignable que par l'orchestrateur, pas par un sous-processus.
La dégradation Qwen -> claude-blind est déjà gérée en amont par `forge.runtime` ;
ce module n'a qu'à honorer `decision.runner in {claude, claude-blind}`.

P1 (greenfield) : l'exécuteur matérialise LUI-MÊME les artefacts déterministes
attendus par les oracles s10b/s10c (blueprint.json à s4, wiremap.json à s5) en
extrayant un bloc JSON fenced de la sortie texte de l'étape — jamais l'agent LLM,
jamais un fichier corrompu (échec de parse => {ok: False} honnête, fail-fast).

claim_verdict: NO_CLAIM_ALLOWED — ce module ne produit aucun claim, il exécute.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import re
import shutil
import signal
import subprocess
import time
from pathlib import Path

from forge.dispatch import DEDICATED_PROFILE_STEPS, DETERMINISTIC, ORDER, PROFILES
from forge.driver import ForgeDriver
from forge.panel import panel_prisme_executor
from forge.pool import DEFAULT_POOL_SIZE
# F3 (red-team) : réutilisation du durcissement console de verify_run (cp1252 :
# un print(json.dumps(report)) portant du texte LLM — humangate_flags Prisme,
# stderr claude — crashait en UnicodeEncodeError APRÈS un run pourtant terminé).
from forge.verify_run import _harden_streams

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]

# Timeout par défaut d'UN appel `claude -p` (d). Un build greenfield s9 dépasse
# largement les 600s historiques — paramétrable via --step-timeout.
DEFAULT_STEP_TIMEOUT_S = 1800.0

# subprocess sans shell=True ne resout pas les wrappers .cmd npm sur Windows
# (CreateProcess ne fait pas la resolution PATHEXT que fait cmd.exe) : il faut
# le chemin resolu par PATH (shutil.which suit PATHEXT, contrairement a Popen seul).
_CLAUDE_CMD = shutil.which("claude") or "claude"

# FIR-01 (P0) — timeout `claude -p` non appliqué : `subprocess.run(timeout=)` tue le
# wrapper npm mais PAS le petit-fils `claude.exe`, qui garde les pipes ouverts →
# communicate() deadlocke, le budget est ignoré (2h15 observées) puis l'appel est
# faussement compté "timeout". Correctif : Popen (on connaît le PID du wrapper)
# + création d'un nouveau groupe de process + au timeout, tuer l'ARBRE ENTIER
# tant que le wrapper est encore vivant, PUIS drainer les pipes (sinon fuite de FD).
_IS_WINDOWS = os.name == "nt"
# Défini par subprocess sur Windows uniquement ; 0 (inoffensif) sur POSIX où l'on
# isole via start_new_session (nouvelle session/groupe de process).
_CREATE_NEW_PROCESS_GROUP = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
# Capturé à l'import : sert de sonde pour honorer un double de test (les oracles
# de construction de commande montent un faux `subprocess.run` — cf. seam compat
# dans _run_subprocess_tree).
_REAL_SUBPROCESS_RUN = subprocess.run


def _kill_process_tree(proc: subprocess.Popen) -> None:
    """FIR-01 : tue `proc` ET toute sa descendance (le petit-fils `claude.exe`
    survit à un kill du seul wrapper → pipes ouverts → deadlock).

    - Windows : `taskkill /T /F /PID <pid>` (/T = arbre entier, /F = force).
      Compromis DÉCLARÉ vs Job Object : plus simple, sans dépendance, éprouvé —
      valable tant que le wrapper (`proc`) est ENCORE vivant à l'appel, ce que
      garantit _run_subprocess_tree (kill AVANT de drainer/attendre).
    - POSIX : `os.killpg` sur le groupe de session (start_new_session=True) —
      atteint tous les descendants du même groupe.
    Best-effort et idempotent : un process déjà mort ne lève pas. Filet final :
    kill direct du wrapper si l'arbre a survécu (ou hors Windows)."""
    if proc.poll() is not None:
        return  # déjà terminé : rien à tuer
    if _IS_WINDOWS:
        try:
            # subprocess.run (attribut vivant) : un test peut le doubler pour
            # vérifier qu'on cible bien /T /F /PID <pid> sans spawn réel.
            subprocess.run(
                ["taskkill", "/T", "/F", "/PID", str(proc.pid)],
                capture_output=True, timeout=30,
            )
        except (OSError, subprocess.SubprocessError):
            pass
    else:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except (OSError, ProcessLookupError):
            pass
    try:
        proc.kill()  # filet : direct child, jamais bloquant
    except OSError:
        pass


def _run_subprocess_tree(cmd, *, cwd, input_text, timeout_s):
    """Exécute `cmd` en BORNANT réellement le coût : au timeout, tout l'arbre de
    process est tué (pas seulement le wrapper) PUIS les pipes sont drainés — sans
    quoi communicate() deadlocke sur le petit-fils `claude.exe` (FIR-01, P0).

    Retourne `(returncode|None, stdout, stderr, timed_out)`.

    Seam compat tests : si `subprocess.run` a été monkeypatché (double de test
    qui trace la commande sans spawn réel — cf. `capture_cmd`), on l'honore et
    aucun chemin timeout/Popen n'est exercé. En production, `subprocess.run` est
    l'originale → chemin Popen + tree-kill."""
    if subprocess.run is not _REAL_SUBPROCESS_RUN:
        completed = subprocess.run(
            cmd, cwd=cwd, input=input_text, capture_output=True,
            text=True, encoding="utf-8",
        )
        return (completed.returncode, completed.stdout or "",
                completed.stderr or "", False)

    popen_kwargs = dict(
        cwd=cwd, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, text=True, encoding="utf-8",
    )
    if _IS_WINDOWS:
        popen_kwargs["creationflags"] = _CREATE_NEW_PROCESS_GROUP
    else:
        popen_kwargs["start_new_session"] = True

    proc = subprocess.Popen(cmd, **popen_kwargs)
    try:
        stdout, stderr = proc.communicate(input=input_text, timeout=timeout_s)
        return proc.returncode, stdout or "", stderr or "", False
    except subprocess.TimeoutExpired:
        # Le wrapper est ENCORE vivant ici : /T atteint le petit-fils claude.exe.
        _kill_process_tree(proc)
        # Drainer APRÈS le kill : l'arbre mort ferme les pipes, communicate rend
        # la main (borne dure 30s en filet). Sans ce drain, les FD fuiraient.
        try:
            stdout, stderr = proc.communicate(timeout=30)
        except (subprocess.TimeoutExpired, ValueError):
            _kill_process_tree(proc)
            stdout, stderr = "", ""
        return proc.returncode, stdout or "", stderr or "", True

# Outils claude CLI autorisés par étape (le contrat borne l'ownership ; l'exécuteur
# borne concrètement les tools quand skill/plugin ne le font pas — cf. s9-build.yaml
# skill: aucun / plugin: aucun, donc payload.allowed_tools est vide par construction).
_STEP_TOOLS: dict[str, tuple[str, ...]] = {
    # Fondement : contrat ratifié s9-build.yaml §5 (permissions, l.55-58) —
    # « create: fichiers de son ownership » (Write : greenfield, rien à éditer au
    # départ) et « run: l'oracle code » — l'oracle code des jeux forgés est node
    # (run-oracle.mjs), donc Bash(node:*) STRICT, jamais Bash nu (F1a red-team :
    # le subprocess hérite de .claude/settings.local.json qui ALLOW-liste
    # Bash(git add/commit/push...) — un Bash nu ouvrait le commit de l'arbre sale).
    "s9-build": ("Write", "Edit", "Read", "Bash(node:*)"),
    "s11-redteam-code": ("Read",),
    # s2.5-artbible (profil dédié `artbible`, Tier 3 #7) : crée 2 fichiers neufs
    # (art_bible.md, asset_requests.json) — Edit seul ne suffit pas (rien à éditer au
    # départ) — et s'auto-valide via check_artbible.mjs (node, même borne stricte).
    "s2.5-artbible": ("Write", "Read", "Bash(node:*)"),
    # s9-build-standard (profil dédié `standard`, curriculum de jeux) : SANS cette
    # entrée, `_STEP_TOOLS.get(etape, ())` rendait un tuple VIDE — donc `--permission-mode
    # manual` et AUCUN outil : l'agent partait sans Read, sans Write, sans Bash.
    # Périmètre dérivé du contrat s9-build-standard.yaml §5 (permissions) :
    #   - Write/Edit/Read : le builder remplit des adresses déclarées par le squelette
    #     gelé (greenfield => Write) ET les champs de constat de 09_WIREMAP/wiremap.json
    #     (fichier préexistant => Edit). Les chemins interdits sont fermés par
    #     _STEP_DISALLOWED (tests/**, contracts/**, .claude/**, lab/chains/**), pas ici.
    #   - Bash(node:*) : `node --test` (tests unitaires), `node knowledge_base/search.mjs`
    #     (SEARCH obligatoire du §2bis) et LA CAPTURE GODOT. Le binaire Godot n'est
    #     JAMAIS invoqué en direct : godot_oracle.mjs / solvability_godot.mjs le
    #     résolvent via godot_bin.mjs (chemin absolu hors repo, non versionné, donc
    #     inconnu à l'heure de l'allow-list) et le spawn eux-mêmes. C'est ce qui rend
    #     un motif `Bash(<godot>:*)` inutile — et évite d'allow-lister un chemin machine.
    # AUCUN Python accordé, alors que le contrat §5 l'autorise (« les six oracles du
    # standard, le gate mutation Python ») : mesuré sur ce poste, le SEUL interpréteur
    # capable d'importer la chaîne (yaml) est C:\...\TACTICAL_CHESS_STUDIO\.venv312 —
    # il vit dans le repo PRINCIPAL, or ce subprocess tourne cwd=REPO_ROOT=worktree, qui
    # n'a pas de .venv312 ; le `python` du PATH échoue dès `import yaml`. Un motif
    # `Bash(python:*)` ne donnerait donc PAS la capacité qu'il promet, seulement une
    # impasse où l'agent brûle des tours. Et l'y amener par chemin absolu violerait la
    # règle « chemins relatifs au repo root, jamais absolus ni utilisateur ».
    # Ce retrait ne coûte rien de réel : les six oracles (s10s) et le gate mutation sont
    # exécutés par le DRIVER, pas par le builder. Le §5 du contrat est un PLAFOND de ce
    # qui est permis, pas un plancher de ce qui doit être accordé. Seul le self-check
    # avant s10s est perdu — le driver le fournit par sa boucle.
    # LIMITE DÉCLARÉE (ne pas la lire comme fermée) : le matcher borne la commande de
    # PREMIER NIVEAU, pas ce qu'elle engendre — `node -e` peut spawn n'importe quoi, git
    # compris. Ce trou n'est PAS introduit ici : il existe déjà à l'identique pour
    # s9-build et s2.5-artbible via Bash(node:*). La vraie borne est le prompt + le
    # contrat ; _STEP_DISALLOWED ne ferme que l'appel direct.
    "s9-build-standard": ("Write", "Edit", "Read", "Bash(node:*)"),
    # s9-build-godot-standard (profil dédié `standard_godot`, jumeau Godot de
    # s9-build-standard, Pierre 2026-07-28) : même raisonnement à l'identique — sans
    # cette entrée, `_STEP_TOOLS.get(etape, ())` rendrait un tuple VIDE (défaut
    # silencieux déjà rencontré une fois pour s9-build-standard le 2026-07-22).
    # Write/Edit/Read : remplit les adresses du squelette gelé (project.godot, .tscn,
    # GDScript sous games/<jeu>/) et les champs de constat de wiremap.json (Edit,
    # fichier préexistant). Bash(node:*) : le contrat §5 autorise « le binaire Godot en
    # headless, résolu par godot_bin.mjs » — godot_bin.mjs et l'oracle headless sont des
    # scripts node, le binaire Godot lui-même n'est JAMAIS invoqué en direct (même
    # raisonnement que s9-build-standard ci-dessus : chemin absolu hors repo, non
    # versionné, donc inconnu à l'heure de l'allow-list ; un motif dédié serait inutile).
    # AUCUN Python accordé, même motif que s9-build-standard : le gate mutation et les
    # six oracles du standard (s10s) sont exécutés par le DRIVER, pas par le builder.
    "s9-build-godot-standard": ("Write", "Edit", "Read", "Bash(node:*)"),
}

# F1b (red-team, BLOQUANT) : deny-list appliquée à TOUT appel `claude -p` (toutes
# étapes, panel Prisme compris). Le subprocess tourne cwd=REPO_ROOT et hérite donc
# de .claude/settings.local.json (allow-list Bash/PowerShell git add/commit/push…) ;
# le deny PRIME sur l'allow dans Claude Code, cette liste ferme donc le vecteur
# même si la config locale évolue. Syntaxe vérifiée via `claude --help` local :
# liste séparée par espaces, spécificateurs `Tool(prefix:*)` / `Tool(glob/**)`.
#
# R1 (red-team de clôture) : déni git par CLASSE, plus par commande — la liste
# une-par-une (git add/commit/push/rm/stash/reset/clean) laissait passer tout le
# reste du verbe git (checkout, branch, restore, apply, worktree…) hérité de
# l'allow-list locale. Un builder n'a AUCUN besoin de git (ownership fichiers +
# WireMap) : préfixe 'git' entier refusé. Sémantique du matcher (preuve red-team
# précédent) : `Bash(git:*)` ≡ `Bash(git *)` — prefix-match sur 'git'.
# NotebookEdit : outil ENTIER refusé — un builder n'édite aucun notebook, et
# --permission-mode acceptEdits l'auto-approuverait sur des chemins protégés.
#
# Incohérence contrat/exécuteur DÉCLARÉE : le contrat s9-build.yaml ordonne des
# « micro-commits » (§3/§6) mais cet exécuteur les SUSPEND (aucun commit builder :
# le verdict signé + HumanGate décident du commit). Le contrat est intouchable
# sans gate Pierre explicite — la suspension vit ici, pas dans le YAML.
#
# BRANCHE DE CONTRÔLE (Pierre, 2026-07-22) : `lab/workflow_lab/**/control/` contient
# une implémentation de référence produite à la main, gardée pour COMPARER après coup.
# Un forgeur qui la lirait invaliderait la mesure — le run ne prouverait plus rien sur
# l'usine. L'interdiction est posée ici en DENY MÉCANIQUE plutôt qu'en consigne de
# prompt : une consigne se contourne par inattention, un deny non. Aucune étape n'a de
# besoin légitime de ce dossier, la borne globale ne coûte donc rien.
_STEP_DISALLOWED: tuple[str, ...] = (
    "Read(lab/workflow_lab/**/control/**)",
    "Bash(git:*)",
    "PowerShell(git:*)",
    "NotebookEdit",
    # Zone protégée = le `tests/` DU STUDIO, à la racine du dépôt (règle .claude/rules/
    # tests.md : « aucun agent ne modifie ces fichiers »). Le motif nu `tests/**` matchait
    # AUSSI le `tests/` interne d'un projet de jeu : mesuré le 2026-07-28 sur le run
    # snake-s9r — le forgeron n'a pas pu déposer `games/snake/tests/run_tests.gd`, chemin
    # pourtant EXIGÉ par godot_oracle.mjs (`res://tests/run_tests.gd`) et déclaré légal par
    # la catégorie `godot.project_tests` de repo_map. Il a remonté la ligne BLOCKED au lieu
    # de contourner (comportement voulu). Ancrage à la racine (préfixe `./`) : la protection
    # du studio est INCHANGÉE, le `tests/` interne d'un jeu redevient déposable.
    # Correction ratifiée Pierre 2026-07-28 : « le garde-fou visait le tests/ du studio, pas
    # les tests/ internes d'un projet ».
    # FORME EXACTE — mesurée, pas devinée (doc officielle permissions.md) : une DENY rule
    # à segment unique (`tests/**`) matche un dossier de ce nom à N'IMPORTE QUELLE
    # PROFONDEUR — c'est le comportement documenté des deny rules, pas un bug. Seul le
    # SLASH INITIAL ancre à la racine. `./tests/**` ne convient PAS : il est relatif au
    # cwd, pas à la racine du projet (première correction, invalidée par l'exécution du
    # run snake-s9p — le builder est resté dénié).
    "Write(/tests/**)", "Edit(/tests/**)",
    # Les jeux sont bornés par leur wiremap (chaque écriture doit être à une `address`
    # déclarée), pas par ce filtre — d'où l'ancrage plutôt qu'une exception par jeu.
    "Write(scripts/forge/contracts/**)", "Edit(scripts/forge/contracts/**)",
    "Write(lab/chains/**)", "Edit(lab/chains/**)",
    "Write(.claude/**)", "Edit(.claude/**)",
)
# Limite déclarée (F1d, non corrigée ici) : l'audit HMAC du dispatch
# (forge.dispatch) signe allowed_tools=() — le payload contrat, vide par
# construction — alors que l'exécuteur borne réellement via _STEP_TOOLS :
# sous-déclaration connue de l'audit. La corriger passe par un plan contrat
# (gate Pierre) — dispatch.py N'EST PAS modifié par ce chantier.

# Artefacts déterministes matérialisés PAR L'EXÉCUTEUR (jamais par l'agent LLM) :
# les oracles s10b/s10c les lisent dans run_dir (forge.driver._read_json), et le
# driver fige le jeu de règles (wiremap_frozen.json) immédiatement après s5 — le
# fichier doit donc exister AVANT le retour de l'executor.
_ARTIFACT_BY_STEP: dict[str, str] = {
    "s4-archi": "blueprint.json",
    "s5-wiremap": "wiremap.json",
}

# Bloc JSON fenced (```json ... ```) — extraction déterministe, aucun LLM.
_FENCED_JSON = re.compile(r"```json\s*(.*?)```", re.S)


def extract_json_payload(text: str) -> tuple[dict | None, str]:
    """Extraction déterministe d'un objet JSON d'une sortie texte d'étape LLM.

    Règle (P1, item b) : DERNIER bloc ```json``` valide (objet) ; sinon json.loads
    de la sortie entière. Retourne (dict, "") ou (None, raison) — jamais d'exception,
    jamais un objet partiel : l'appelant fail-fast sur None.
    """
    blocks = _FENCED_JSON.findall(text)
    for raw in reversed(blocks):
        try:
            data = json.loads(raw)
        except ValueError:
            continue
        if isinstance(data, dict):
            return data, ""
    try:
        data = json.loads(text.strip())
    except ValueError:
        return None, (
            f"aucun bloc ```json``` valide ({len(blocks)} bloc(s) fenced inspectés) "
            "et la sortie entière n'est pas du JSON"
        )
    if not isinstance(data, dict):
        return None, "JSON valide mais pas un objet (dict attendu par les oracles)"
    return data, ""


def _claude_call_raw(prompt: str, model: str, *, add_dir: Path,
                     tools: tuple[str, ...] = (),
                     timeout_s: float = DEFAULT_STEP_TIMEOUT_S):
    """Un seul appel `claude -p` réel. Retourne le dict brut `{ok, output|reason, ...}` —
    canal unique réutilisé par l'exécuteur simple (claude_executor) ET le panel Prisme
    (forge.panel.panel_prisme_executor), pour ne jamais dupliquer la logique subprocess.

    Le prompt passe par STDIN, jamais par argv : `claude` est un wrapper .cmd npm sous
    Windows, et CreateProcess relance implicitement cmd.exe pour l'exécuter — son propre
    parseur de ligne de commande (% ^ retours-ligne) mutile un prompt long/multi-lignes
    même passé en liste argv non-shell.
    """
    cmd = [
        _CLAUDE_CMD, "-p",
        "--model", model,
        "--output-format", "json",
        "--add-dir", str(add_dir),
        # R2 (red-team de clôture) : isolation MCP — flag vérifié dans
        # `claude --help` local (« Only use MCP servers from --mcp-config,
        # ignoring all other MCP configurations »). Sans aucun --mcp-config
        # fourni, ce flag = ZÉRO serveur MCP : les builders n'héritent pas des
        # serveurs MCP projet/utilisateur (studio-brain, computer-use, etc.).
        "--strict-mcp-config",
    ]
    if tools:
        cmd += ["--allowedTools", " ".join(tools), "--permission-mode", "acceptEdits"]
    else:
        cmd += ["--permission-mode", "manual"]
    # F1b : deny-list TOUJOURS posée (même sans tools : le panel Prisme passe ici
    # aussi) — le deny prime sur l'allow hérité de .claude/settings.local.json.
    cmd += ["--disallowedTools", " ".join(_STEP_DISALLOWED)]

    started = time.time()
    returncode, stdout, stderr, timed_out = _run_subprocess_tree(
        cmd, cwd=str(REPO_ROOT), input_text=prompt, timeout_s=timeout_s,
    )
    duration = time.time() - started

    if timed_out:
        # FIR-01 : l'arbre de process a été tué (coût borné) — le flag `timeout`
        # laisse l'aval (executor) inspecter le disque avant de conclure (FIR-02).
        return {
            "ok": False,
            "timeout": True,
            "duration_s": duration,
            "reason": f"claude -p timeout ({timeout_s:.0f}s) — arbre de process tué "
                      "(FIR-01), coût borné",
        }
    if returncode != 0:
        return {
            "ok": False,
            "reason": f"claude -p returncode={returncode}: {stderr[-2000:]}",
        }
    try:
        data = json.loads(stdout)
    except ValueError:
        return {"ok": False, "reason": f"sortie claude -p non-JSON: {stdout[-2000:]}"}
    if data.get("is_error"):
        return {"ok": False, "reason": f"claude -p is_error: {data.get('result', '')[:2000]}"}

    usage = data.get("usage") or {}
    tokens = int(usage.get("input_tokens", 0)) + int(usage.get("output_tokens", 0))
    # Tier 2.5 étape 2 : coût RÉEL (pas estimé) — `claude -p --output-format json`
    # rend déjà `total_cost_usd` calculé par l'API, aucune table de prix à maintenir.
    cost_usd = float(data.get("total_cost_usd", 0.0))
    return {
        "ok": True, "output": str(data.get("result", "")),
        "tokens": tokens, "duration_s": duration, "cost_usd": cost_usd,
    }


# --- validation de schéma AVANT écriture (F2a red-team) ---------------------------
# Reproduit : un blueprint {"note": ...} rendait check_architecture trivialement
# VERT (modules=set() vide) ; un deps_interdites ["ui->engine"] (str au lieu de
# paire) levait ValueError qui traversait le driver → crash-loop (s10b RUNNING
# rejoué). Ici : schéma vérifié AVANT tout write — échec => {ok: False, reason}
# précis, AUCUN fichier posé (jamais un artefact faux-vert ni crashogène).

def _validate_blueprint(data: dict) -> str:
    """'' si le blueprint a le format EXACT que check_architecture consomme
    (static_oracles.py : modules -> set, deps_interdites -> paires dépaquetées),
    sinon la raison précise du rejet."""
    modules = data.get("modules")
    if not isinstance(modules, list) or not modules or not all(
            isinstance(m, str) and m.strip() for m in modules):
        return ("'modules' doit être une liste NON VIDE de str (un modules "
                "absent/vide rend check_architecture trivialement vert)")
    # R3 (red-team de clôture) : deps_interdites OBLIGATOIRE et NON VIDE — un
    # blueprint sans aucune dépendance interdite rend check_architecture
    # vacuement vert (prouvé par sonde : zéro paire => zéro violation possible).
    deps = data.get("deps_interdites")
    if not isinstance(deps, list) or not deps:
        return ("'deps_interdites' est OBLIGATOIRE et NON VIDE (liste de paires "
                "[source, cible]) : déclare au minimum la séparation "
                "logique→rendu/input ; un projet réellement sans dépendance "
                "interdite = fog HumanGate, pas un oracle vide — sans paire, "
                "check_architecture est vacuement vert")
    if not all(isinstance(p, (list, tuple)) and len(p) == 2
               and all(isinstance(x, str) for x in p) for p in deps):
        return ("'deps_interdites' doit être une liste de paires [source, cible] "
                "(str) — format exact dépaqueté par check_architecture")
    ownership = data.get("ownership")
    if ownership is not None and not isinstance(ownership, dict):
        return "'ownership' doit être un dict (fichier -> propriétaire)"
    return ""


def _validate_wiremap(data: dict) -> str:
    """'' si la WireMap a le format que check_wiremap/frozen_features consomment,
    sinon la raison précise du rejet."""
    features = data.get("features")
    if not isinstance(features, list) or not features:
        return "'features' doit être une liste NON VIDE"
    for i, feat in enumerate(features):
        if not isinstance(feat, dict):
            return f"features[{i}] n'est pas un objet (dict attendu)"
        if not isinstance(feat.get("feature"), str) or not feat["feature"].strip():
            return f"features[{i}].feature doit être une str non vide (identité de la règle)"
        # R4 (red-team de clôture) : fichiers NON VIDE de str NON VIDES et
        # fonction NON VIDE — fonction:'' fait sauter la vérification d'existence
        # de check_wiremap (static_oracles.py `if fonction:`) : une wiremap
        # creuse était prouvée verte par sonde.
        if not isinstance(feat.get("fichiers"), list) or not feat["fichiers"] or not all(
                isinstance(f, str) and f.strip() for f in feat["fichiers"]):
            return (f"features[{i}].fichiers doit être une liste NON VIDE de "
                    "chemins (str non vides) — une feature qui ne pointe aucun "
                    "fichier réel est invérifiable")
        if not isinstance(feat.get("fonction"), str) or not feat["fonction"].strip():
            return (f"features[{i}].fonction doit être une str NON VIDE (nom de "
                    "fonction) — une fonction vide fait sauter la vérification "
                    "d'existence de check_wiremap (wiremap creuse faussement verte)")
    return ""


_ARTIFACT_VALIDATORS = {
    "blueprint.json": _validate_blueprint,
    "wiremap.json": _validate_wiremap,
}


def _materialize_artifact(etape: str, output: str, run_dir: Path) -> dict | None:
    """Écrit l'artefact déterministe de l'étape (blueprint.json / wiremap.json)
    depuis la sortie texte, APRÈS validation de schéma (F2a). Retourne None si
    tout va bien, sinon le dict d'échec honnête {ok: False, reason} à remonter au
    driver (fail-fast, jamais un fichier corrompu, invalide ni absent en silence)."""
    artefact = _ARTIFACT_BY_STEP.get(etape)
    if artefact is None:
        return None
    data, why = extract_json_payload(output)
    if data is None:
        return {"ok": False,
                "reason": f"{etape}: artefact {artefact} non matérialisable — {why}"}
    schema_why = _ARTIFACT_VALIDATORS[artefact](data)
    if schema_why:
        return {"ok": False,
                "reason": f"{etape}: artefact {artefact} invalide — {schema_why} "
                          "(aucun fichier écrit)"}
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / artefact).write_text(
        json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    return None


# --- s11 red-team CODE : findings AUDIBLES dans le verdict signé -------------------
# (n1-findings-redteam-audibles) Diagnostic : la plomberie AVAL existe et est correcte
# (driver.py lit res["findings"]/res["blocked"] -> entry["detail"]["redteam_findings"]
# -> _redteam_facts -> verdict.build_aggregate_verdict(redteam_findings=...) ->
# AggregateVerdict.redteam_advisory) mais AUCUN exécuteur ne renseignait jamais ces
# clés : `_claude_call_raw` ne rend que {ok, output, tokens, duration_s, cost_usd} —
# `findings` valait donc toujours [] et `blocked` toujours False, quel que soit le
# contenu réel du rapport red-team (preuve : pong_r2, rapport_redteam_code.md 14 Ko
# sur disque avec 6 failles, verdict signé `redteam_advisory: []`).
#
# Correctif : même patron que `_materialize_artifact`/`extract_json_payload`
# (dernier bloc ```json``` fenced, EXTRACTION DÉTERMINISTE, jamais un LLM ne relit
# le rapport) — le contrat s11-redteam-code.yaml exige désormais que le rapport se
# termine par {"findings": [{"angle","faille","severite","reproduction"}, ...]}.
#
# GARDE-FOU (piège promotion) : ceci alimente UNIQUEMENT `res["findings"]`, qui ne
# nourrit QUE `redteam_advisory` par la plomberie existante — JAMAIS `extra_advisory`
# ni `humangate_flags` directement (verdict.py intouché ici). `res["blocked"]`
# N'EST PAS renseigné par cette fonction : le canal `redteam_blocked` reste
# exactement ce qu'il était avant ce chantier (jamais posé par l'exécuteur claude
# réel), donc `decision`/`is_clean_pass` restent inchangés par un run qui ne fait
# que rendre ses findings audibles (cf. test de non-régression de promotion,
# forge.tests.test_aggregate_verdict).
_REDTEAM_FINDING_KEYS = ("angle", "faille", "severite", "reproduction")


def extract_redteam_findings(output: str) -> tuple[list[str], str]:
    """Extraction déterministe des findings du rapport s11-redteam-code.

    Cherche le DERNIER bloc ```json``` fenced (même règle que extract_json_payload
    : dernier bloc VALIDE, sinon la sortie entière comme JSON) contenant
    {"findings": [{"angle", "faille", "severite", "reproduction"}, ...]}. Chaque
    entrée est validée INDIVIDUELLEMENT (4 champs str non vides) — une entrée
    malformée est rejetée SEULE, les autres restent (jamais tout-ou-rien).

    Retourne (findings_formatés, note) : `findings_formatés` est TOUJOURS une
    liste (vide si le bloc est absent/malformé/vide — le cas de TOUS les rapports
    historiques, dont pong_r2), jamais une exception, jamais une entrée inventée.
    `note` est '' si au moins un finding valide a été extrait, sinon explique
    POURQUOI la liste est vide (bloc absent, 'findings' absent/vide, ou aucune
    entrée conforme au schéma) — utile pour SKIPPED_VALIDATION / diagnostic, mais
    n'entre dans AUCUN calcul de verdict."""
    data, why = extract_json_payload(output)
    if data is None:
        return [], f"aucune section de findings structurée : {why}"
    raw = data.get("findings")
    if not isinstance(raw, list):
        return [], "bloc JSON présent mais 'findings' absent ou n'est pas une liste"
    if not raw:
        return [], "'findings' est une liste vide (red-team sans faille à signaler)"
    findings: list[str] = []
    rejected = 0
    for item in raw:
        if not isinstance(item, dict) or not all(
                isinstance(item.get(k), str) and item[k].strip()
                for k in _REDTEAM_FINDING_KEYS):
            rejected += 1
            continue
        sev = item["severite"].strip().upper()
        findings.append(
            f"[{sev}] {item['angle'].strip()} — {item['faille'].strip()} "
            f"(repro: {item['reproduction'].strip()})"
        )
    if not findings:
        return [], (f"'findings' contient {len(raw)} entrée(s) mais AUCUNE ne "
                    f"respecte le schéma {_REDTEAM_FINDING_KEYS}")
    note = f"{rejected} entrée(s) rejetée(s) (schéma invalide)" if rejected else ""
    return findings, note


# --- chaînage des artefacts amont (F4 red-team) ------------------------------------
# Avant : chaque prompt = contrat + tâche + pré-mortem, AUCUNE sortie amont — s5
# inventait sans voir s3, s9 ne recevait ni blueprint.json ni wiremap.json. Le
# driver persiste chaque sortie LLM dans <run_dir>/artifacts/<etape>.txt
# (forge.driver._run_llm) et l'exécuteur matérialise blueprint.json/wiremap.json
# à la racine du run_dir : cette table (etape -> artefacts amont, chemins relatifs
# au run_dir) injecte ces contenus dans le prompt de l'étape aval.
_UPSTREAM_BY_STEP: dict[str, tuple[str, ...]] = {
    "s3-decompo": ("artifacts/s1-prisme.txt",),
    "s4-archi": ("artifacts/s3-decompo.txt",),
    "s5-wiremap": ("artifacts/s3-decompo.txt", "blueprint.json"),
    "s6-redteam-plan": ("artifacts/s3-decompo.txt", "artifacts/s4-archi.txt",
                        "artifacts/s5-wiremap.txt"),
    "s9-build": ("blueprint.json", "wiremap.json"),
    "s11-redteam-code": ("wiremap.json",),
}

# Borne de troncature déclarée : chaque artefact injecté est coupé à cette taille
# (mention explicite '[tronqué]') — jamais un prompt non borné.
UPSTREAM_MAX_CHARS = 15000


def upstream_artifacts_section(etape: str, run_dir: Path) -> str:
    """Section '## ARTEFACTS AMONT (run_dir)' pour le prompt de l'étape, construite
    depuis les artefacts amont réellement présents dans run_dir. Étape sans amont
    disponible => '' (section omise, pas d'erreur : 1re exécution/reprise possible)."""
    blocks: list[str] = []
    for rel in _UPSTREAM_BY_STEP.get(etape, ()):
        path = run_dir / rel
        try:
            content = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue  # absent/illisible : omis (jamais bloquant à ce niveau)
        if len(content) > UPSTREAM_MAX_CHARS:
            content = content[:UPSTREAM_MAX_CHARS] + "\n[tronqué]"
        blocks.append(f"### {rel} (chemin réel : {path})\n{content}")
    if not blocks:
        return ""
    header = "## ARTEFACTS AMONT (run_dir)"
    if etape == "s9-build":
        header += ("\nRappel ownership : tu n'écris QUE dans les fichiers que le "
                   "blueprint.json ci-dessous t'attribue (contrat s9-build §5).")
    return header + "\n\n" + "\n\n".join(blocks)


# --- FIR-02 : salvage d'un build interrompu par timeout ----------------------------
# Un timeout d'étape NE DOIT PAS jeter aveuglément un build potentiellement vert
# (le run n°1 shmup a produit un jeu 4/4 puis l'a compté BLOCKED). Le driver halte
# quand même (le run n'est PAS fini), mais les artefacts produits sur disque sont
# INSPECTÉS et CONSIGNÉS (salvage_<etape>.json + flag `salvageable`) au lieu d'être
# détruits en silence — le motif d'arrêt porte alors « à RE-JUGER, pas BLOCKED sec ».
# Compromis DÉCLARÉ : on consigne (le « au minimum » exigé) ; on NE relance PAS
# l'oracle node ici — node peut être absent, l'étape est déjà hors budget, et un
# re-jugement propre est une reprise pilotée (le driver sait reprendre) / HumanGate.
_GAME_HARNESS_MARKERS = ("run-oracle.mjs", "e2e.mjs", "solvability.mjs")


def _salvage_on_timeout(etape: str, add_dir: Path, run_dir: Path,
                        timeout_reason: str) -> dict:
    """Inspecte le disque après un timeout : si un harnais de jeu est présent sous
    `add_dir` (run-oracle.mjs/e2e.mjs/solvability.mjs), le build est SALVAGEABLE —
    consigné dans `run_dir/salvage_<etape>.json`, jamais jeté sec. Retourne le dict
    de salvage écrit (best-effort : une écriture qui lève n'échoue pas le run)."""
    present = [m for m in _GAME_HARNESS_MARKERS if (add_dir / m).exists()]
    try:
        produced = sorted(
            str(p.relative_to(add_dir))
            for p in add_dir.rglob("*.mjs") if p.is_file())[:200]
    except OSError:
        produced = []
    salvage = {
        "etape": etape,
        "src_root": str(add_dir),
        "timeout_reason": timeout_reason,
        "harness_present": present,
        "produced_mjs": produced,
        "salvageable": bool(present),
        "ts": time.time(),
        "note": ("build interrompu par timeout MAIS artefacts sur disque — "
                 "NE PAS conclure BLOCKED sec : ré-évaluer l'oracle sur la sortie "
                 "produite (reprise) avant de jeter (FIR-02)." if present else
                 "aucun harnais de jeu sur disque — rien à sauver"),
    }
    try:
        run_dir.mkdir(parents=True, exist_ok=True)
        (run_dir / f"salvage_{etape}.json").write_text(
            json.dumps(salvage, ensure_ascii=False, indent=1), encoding="utf-8")
    except OSError:
        logger.warning("salvage non écrit pour %s (non bloquant)", etape)
    return salvage


def claude_executor(add_dir: Path, task_by_step: dict[str, str], *,
                    step_timeout: float = DEFAULT_STEP_TIMEOUT_S):
    """Fabrique un executor(payload, decision, context) -> dict pour ForgeDriver.

    Un seul canal réel (`claude -p`) pour claude et claude-blind : les deux sont
    déjà des spawns Claude en contexte vierge de session (pas de -c/--continue).
    """

    def executor(payload, decision, context) -> dict:
        etape = payload.etape
        task = task_by_step.get(etape, "")
        parts = [payload.prompt,
                 f"## TÂCHE CONCRÈTE ({context['run_id']} / {etape})\n{task}"]
        # (F4) artefacts amont : la sortie des étapes précédentes (persistée par le
        # driver dans run_dir) est injectée — s5 voit s3, s9 voit blueprint/wiremap.
        upstream = upstream_artifacts_section(etape, Path(context["run_dir"]))
        if upstream:
            parts.append(upstream)
        # (g) pré-mortem : erreurs des runs passés injectées dans le prompt réel —
        # le driver la fournit déjà dans le context (forge.studio_link.premortem).
        pm = context.get("premortem") or []
        premortem_section = None
        if pm:
            premortem_section = ("## PRÉ-MORTEM (erreurs des runs passés)\n"
                                 + "\n".join(f"- {p}" for p in pm))
            parts.append(premortem_section)
        # s0-contrat mandatory_read (contracts/s0-contrat.yaml l.26) : la Project
        # Bible du projet, si elle existe (studio_link.project_bible, fournie par
        # le driver dans le context UNIQUEMENT pour s0-contrat — cf.
        # forge.driver.ForgeDriver._run_llm). Bible absente => "" => AUCUNE section
        # injectée (une bible absente est normale, pas une anomalie ; le prompt
        # reste identique à avant ce câblage, même patron que le pré-mortem ci-dessus).
        bible = context.get("project_bible") or ""
        if bible:
            parts.append("## PROJECT BIBLE (mémoire de décision du projet)\n" + bible)
        parts.append(context["dispatch_marker"])
        prompt = "\n\n".join(parts)

        # Context Manifest (kind "execution") : mesure advisory du prompt final
        # au moment où il existe réellement — jamais bloquant (best-effort strict,
        # docs/forge/CONTEXT_LOOP_V1_1_FRESHNESS.md §7).
        try:
            from forge import context_manifest
            context_manifest.append_execution_manifest(
                context["run_id"], etape, Path(context["run_dir"]), prompt,
                model=payload.model, premortem_section=premortem_section,
            )
        except Exception:
            logger.warning(
                "context manifest (execution) non écrit pour étape=%s (advisory, non bloquant)",
                etape, exc_info=True,
            )

        # (c) escalade honorée : le driver écrit model_override dans le context à
        # chaque escalade (forge.driver._maybe_escalate) — l'ignorer rendrait
        # l'escalade no-op (même modèle rejoué à chaque tier).
        model = context.get("model_override") or payload.model
        res = _claude_call_raw(
            prompt, model, add_dir=add_dir,
            tools=_STEP_TOOLS.get(etape, ()), timeout_s=step_timeout,
        )
        if res.get("ok"):
            # (b) matérialisation déterministe par l'EXÉCUTEUR (jamais l'agent).
            failure = _materialize_artifact(etape, str(res.get("output", "")),
                                            Path(context["run_dir"]))
            if failure is not None:
                return failure
            if etape == "s11-redteam-code":
                # (n1) findings AUDIBLES : extraction déterministe, jamais un LLM
                # ne relit le rapport. `res["blocked"]` volontairement NON posé
                # ici (garde-fou promotion, cf. commentaire au-dessus de
                # extract_redteam_findings) : seul `findings` est alimenté.
                findings, note = extract_redteam_findings(str(res.get("output", "")))
                res["findings"] = findings
                if note:
                    res["findings_note"] = note
        elif res.get("timeout"):
            # (FIR-02) timeout : inspecter le disque AVANT que le driver ne halte —
            # un build vert sur disque n'est pas jeté sec, il est consigné et flaggé.
            run_dir = Path(context["run_dir"])
            salvage = _salvage_on_timeout(
                etape, add_dir, run_dir, res.get("reason", ""))
            res = dict(res)
            res["salvageable"] = salvage["salvageable"]
            if salvage["salvageable"]:
                res["salvage_path"] = str(run_dir / f"salvage_{etape}.json")
                res["reason"] = (
                    res.get("reason", "") + " — ARTEFACTS SALVAGEABLES sur disque ("
                    + ", ".join(salvage["harness_present"])
                    + f"), consignés dans salvage_{etape}.json : à RE-JUGER "
                    "(reprise/oracle sur la sortie produite), PAS BLOCKED sec (FIR-02)")
        return res

    return executor


def make_panel_claude_call(add_dir: Path, *, step_timeout: float = DEFAULT_STEP_TIMEOUT_S):
    """Adapte `_claude_call_raw` à la signature `claude_call(prompt, model) -> str|None`
    attendue par `forge.panel.panel_prisme_executor` (aucun outil : s1-prisme est un
    artefact narratif, aucune écriture de fichier par les lenses)."""

    def claude_call(prompt: str, model: str) -> str | None:
        res = _claude_call_raw(prompt, model, add_dir=add_dir, timeout_s=step_timeout)
        return res["output"] if res.get("ok") else None

    return claude_call


# --- tâches par défaut (f) ---------------------------------------------------------

def default_task_by_step(project: str, src_root_rel: str,
                         profile: str = "full") -> dict[str, str]:
    """Tâches par défaut NON VIDES pour chaque étape LLM du profil `full`
    (+ s2.5-artbible, profil dédié). Les défauts de s4/s5 exigent le bloc JSON
    fenced au format exact lu par forge.static_oracles.check_architecture /
    check_wiremap — c'est l'exécuteur qui l'écrira dans run_dir (item b), l'agent
    n'écrit AUCUN fichier à ces étapes.

    F5b (red-team) : les défauts sont PROFILE-AWARE — le défaut greenfield de s9
    (« Implémente le projet... ») ne s'applique qu'au profil `full` ; `patch` et
    `micro` opèrent sur un projet EXISTANT, leur défaut s9 est une tâche corrective
    neutre (ne jamais réécrire ce qui marche sur un simple fix)."""
    src = src_root_rel or "."
    # F1c : AUCUN commit par le builder — le verdict signé + HumanGate s'en
    # chargent. Les « micro-commits » du contrat s9-build.yaml sont SUSPENDUS par
    # l'exécuteur (incohérence contrat/exécuteur déclarée près de _STEP_DISALLOWED ;
    # le contrat est intouchable sans gate Pierre).
    no_commit = ("AUCUN commit (git/PowerShell) : le verdict signé et HumanGate "
                 "s'en chargent — les « micro-commits » du contrat sont suspendus "
                 "par l'exécuteur.")
    if profile in ("patch", "micro"):
        s9_task = (
            f"Corrige le projet existant '{project}' sous {src}, borné à ton "
            "ownership : répare ce que l'oracle/la tâche signale, ne réécris pas "
            f"ce qui marche. Tiens la WireMap à jour si elle existe. {no_commit}"
        )
    else:
        s9_task = (
            f"Implémente le projet '{project}' sous {src}, borné à ton ownership "
            "(blueprint) : code + run-oracle.mjs + solvability + e2e conformément "
            f"au contrat. Tiens la WireMap à jour. {no_commit}"
        )
    # Profil `standard` : le builder ne reçoit PAS une intention (« fais un Pong »)
    # mais un SQUELETTE GELÉ. La tâche concrète ne redit donc pas le jeu — elle
    # désigne la carte à honorer et rappelle les deux gestes interdits (inventer une
    # ligne, réécrire une promesse). Sans ce défaut, task_by_step.get() rendait ""
    # et l'agent recevait une section « TÂCHE CONCRÈTE » vide.
    s9_standard_task = (
        f"Le squelette gelé du jeu '{project}' est games/{project}/09_WIREMAP/wiremap.json "
        f"et son budget games/{project}/00_CHARTER/game_contract.yaml. Honore CHAQUE ligne "
        "à l'`address` qu'elle déclare, jusqu'à ce que sa `expected_proof` soit satisfaite "
        "par un oracle réellement exécuté, puis passe son `state` à IMPLEMENTED (ou BLOCKED "
        "motivé). Tu remplis les champs de CONSTAT (`fichiers`, `fonction`, `preuve`, "
        "`statut`, `state`) et JAMAIS les champs de promesse (`expected_proof`, `address`, "
        "`provides`/`requires`, budget) : les modifier pour les faire coïncider avec ton "
        "résultat est une falsification. N'ajoute ni ne retire aucune ligne — ce qui manque "
        f"se remonte en `fog`, il ne se comble pas. {no_commit}"
    )
    tasks = {
        "s9-build-standard": s9_standard_task,
        "s0-contrat": (
            f"Formalise le contrat produit du projet '{project}' (jeu à créer de zéro "
            f"sous {src}) : intention, joueur cible, condition de victoire, périmètre "
            "V1 minimal jouable. Texte seul, aucun fichier écrit."
        ),
        "s1-prisme": (
            f"Analyse le concept du projet '{project}' sous les angles ressenti joueur, "
            "risques de design et originalité. Artefact narratif, aucun fichier écrit."
        ),
        "s2-worldscan": (
            f"Recense les patterns externes comparables au projet '{project}' (mécaniques "
            "éprouvées du genre, pièges connus). Advisory uniquement, aucun fichier écrit."
        ),
        "s3-decompo": (
            f"Décompose le projet '{project}' en features numérotées R1..Rn (une ligne "
            "par règle de jeu : nom, comportement observable, condition de preuve). "
            "Texte seul, aucun fichier écrit."
        ),
        "s4-archi": (
            f"Conçois l'architecture du projet '{project}' (code à créer sous {src}). "
            "Termine ta réponse par UN bloc ```json ... ``` contenant EXACTEMENT un objet "
            'de la forme {"modules": ["<dossier ou fichier de premier niveau sous la '
            'racine du code>", ...], "deps_interdites": [["<module_source>", '
            '"<module_cible>"], ...]} — format lu par '
            "forge.static_oracles.check_architecture. deps_interdites est "
            "OBLIGATOIRE et NON VIDE : déclare au minimum la séparation "
            "logique→rendu et logique→input (un blueprint sans dépendance "
            "interdite est rejeté par l'exécuteur — un tel projet relève du fog "
            "HumanGate, pas d'un oracle vide). Tu n'écris AUCUN fichier : "
            "l'exécuteur matérialise lui-même blueprint.json depuis ce bloc."
        ),
        "s5-wiremap": (
            f"Produis la WireMap du projet '{project}' (code sous {src}). Termine ta "
            "réponse par UN bloc ```json ... ``` contenant EXACTEMENT un objet de la "
            'forme {"features": [{"feature": "R1 <nom>", "fonction": "<nom de fonction '
            'implémentant la règle>", "fichiers": ["<chemin relatif à la racine du '
            'code>"], "preuve": "<test ou preuve>"}, ...]} — format lu par '
            "forge.static_oracles.check_wiremap. Pour CHAQUE feature : fonction "
            "NON VIDE et fichiers NON VIDE (str non vides) — une fonction ou des "
            "fichiers vides rendent la feature invérifiable et sont rejetés par "
            "l'exécuteur. Tu n'écris AUCUN fichier : l'exécuteur "
            "matérialise lui-même wiremap.json depuis ce bloc."
        ),
        "s6-redteam-plan": (
            f"Red-team du plan du projet '{project}' : attaque la décomposition, "
            "l'architecture et la WireMap (trous de preuve, features infalsifiables, "
            "objectifs inatteignables). Findings uniquement, aucun fichier écrit."
        ),
        "s9-build": s9_task,
        "s11-redteam-code": (
            f"Red-team du code du projet '{project}' sous {src} : lecture seule, "
            "cherche les écarts contrat/code, les preuves factices et les zones mortes."
        ),
        "s2.5-artbible": (
            f"Lis lab/forge_runs/{project}/product_snapshot.md et livre art_bible.md + "
            f"asset_requests.json dans lab/forge_runs/{project}/ (procédure v0.1)."
        ),
    }
    # Garde-fou : toute étape LLM du profil full DOIT avoir une tâche non vide —
    # une étape ajoutée à ORDER sans défaut ici casserait ce test (fail-fast).
    for etape in PROFILES["full"]:
        if etape not in DETERMINISTIC and not tasks.get(etape, "").strip():
            raise ValueError(f"tâche par défaut manquante pour l'étape LLM {etape!r}")
    return tasks


# F5a : clés valides d'un tasks-file = étapes contractualisées (chaîne canonique
# ORDER + étapes à profil dédié) — une faute de frappe ('s9_build') était fusionnée
# en silence et le défaut s'appliquait sans que l'opérateur le voie.
_VALID_TASK_STEPS = frozenset(ORDER) | frozenset(DEDICATED_PROFILE_STEPS)


def load_tasks_file(path: Path) -> dict[str, str]:
    """Lit un fichier JSON {etape: tâche}. Fail-fast (ValueError) sur toute forme
    invalide OU toute clé hors chaîne (F5a) — jamais un merge silencieux d'un
    fichier corrompu. Les valeurs VIDES sont ignorées (symétrie avec les flags
    --task-* : un '' ne doit jamais effacer le défaut)."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise ValueError(f"tasks-file illisible: {exc}")
    except ValueError:
        raise ValueError(f"tasks-file n'est pas du JSON valide: {path}")
    if not isinstance(data, dict) or not all(
            isinstance(k, str) and isinstance(v, str) for k, v in data.items()):
        raise ValueError(f"tasks-file doit être un objet JSON {{etape: tâche}} (str->str): {path}")
    unknown = sorted(set(data) - _VALID_TASK_STEPS)
    if unknown:
        raise ValueError(
            f"tasks-file: étape(s) inconnue(s) {unknown} dans {path} — "
            f"clés valides: {sorted(_VALID_TASK_STEPS)}")
    return {k: v for k, v in data.items() if v.strip()}


def merge_task_overrides(defaults: dict[str, str], cli_tasks: dict[str, str],
                         file_tasks: dict[str, str]) -> dict[str, str]:
    """Fusion des tâches : défauts <- CLI (valeurs non vides seulement — un --task-s9
    laissé vide ne doit pas effacer le défaut) <- tasks-file (PAR-DESSUS tout, item f)."""
    merged = dict(defaults)
    merged.update({k: v for k, v in cli_tasks.items() if v.strip()})
    merged.update(file_tasks)
    return merged


def _split_csv(value: str) -> list[str]:
    """'a, b,c' -> ['a', 'b', 'c'] ; '' -> [] (déterministe, sans shlex — les chemins
    Windows contiennent des backslashes que shlex posix mutilerait)."""
    return [item.strip() for item in value.split(",") if item.strip()]


def build_parser() -> argparse.ArgumentParser:
    """Parseur CLI — factory séparée de main() pour être testable sans exécuter."""
    parser = argparse.ArgumentParser(description="Premier run RÉEL du driver Forge (P0.1/P1).")
    parser.add_argument("--project", required=True)
    parser.add_argument("--run-id", required=True)
    # `standard` (curriculum de jeux) : le profil existait dans PROFILES mais restait
    # INJOIGNABLE depuis la CLI — même famille de défaut silencieux que l'entrée
    # _STEP_TOOLS manquante (déclaré ≠ exécuté). Les choix sont dérivés de PROFILES
    # plutôt que réécrits à la main, pour qu'un futur profil ne puisse plus être
    # ajouté au dispatch sans être atteignable ici.
    parser.add_argument("--profile", default="patch",
                        choices=tuple(sorted(PROFILES)))
    parser.add_argument("--src-root", required=True, help="racine du code réel (relatif au repo) — "
                        "pour le profil artbible, un dossier existant quelconque (ex. '.') convient, "
                        "aucun code n'y est écrit")
    parser.add_argument("--task-s9", default="", help="tâche concrète pour le builder (s9-build)")
    parser.add_argument("--task-s11", default="", help="tâche concrète pour le red-team (s11)")
    parser.add_argument("--task-artbible", default="",
                        help="tâche concrète pour l'Art Director (s2.5-artbible) — DOIT référencer "
                        "le chemin réel du product_snapshot.md à lire (ex. 'lit lab/forge_runs/"
                        "<projet>/product_snapshot.md et livre dans lab/forge_runs/<projet>/')")
    parser.add_argument("--tasks-file", default="", help="fichier JSON {etape: tâche} fusionné "
                        "PAR-DESSUS les tâches par défaut (item f) ; clés = étapes de la "
                        "chaîne uniquement (fail-fast sinon), valeur vide IGNORÉE — elle "
                        "n'efface jamais le défaut (même symétrie que les flags --task-*)")
    parser.add_argument("--charter", default="", help="charter.yaml (requis si profil=full : "
                        "active le panel Prisme réel à s1-prisme, Tier 2 #6)")
    # (d) timeout par appel `claude -p`, paramétrable (600s en dur trop court pour s9 greenfield).
    parser.add_argument("--step-timeout", type=float, default=DEFAULT_STEP_TIMEOUT_S,
                        help="timeout en secondes d'UN appel claude -p (défaut 1800)")
    # (e) flags câblés 1:1 vers la signature ForgeDriver.
    parser.add_argument("--is-game", action="store_true",
                        help="le projet est un JEU : arme les gates e2e/mutation/solvabilité")
    parser.add_argument("--logic-files", default="",
                        help="fichiers logiques du jeu (liste séparée par virgules, relatifs à src-root)")
    parser.add_argument("--mutation-test-argv", default="",
                        help="argv de la suite mutation (liste séparée par virgules, ex. 'node,run-oracle.mjs')")
    parser.add_argument("--oracle-config", default="",
                        help="chemin d'un oracles.json spécifique (relatif au repo)")
    parser.add_argument("--pool-size", type=int, default=DEFAULT_POOL_SIZE,
                        help="essais au même tier avant escalade de modèle (Tier 2 #5)")
    return parser


def stale_run_dir_reason(run_dir: Path) -> str | None:
    """F5d : garde run_dir périmé. Si state.json est ABSENT mais qu'un gel
    wiremap_frozen.json PRÉSENT traîne dans run_dir, un nouveau run hériterait en
    silence d'un jeu de règles gelé par un run ANTÉRIEUR (le driver ne ré-écrase
    jamais un gel existant). Retourne la raison du refus, ou None si le run_dir
    est sain (reprise normale — state.json présent — incluse)."""
    if (run_dir / "state.json").exists():
        return None  # reprise légitime : le state porte le run
    if (run_dir / "wiremap_frozen.json").exists():
        return (
            f"run_dir périmé: {run_dir} contient wiremap_frozen.json SANS state.json "
            "— un nouveau run hériterait d'un gel de règles d'un run antérieur. "
            "Purger les artefacts du run_dir ou changer --run-id/run_dir."
        )
    return None


def main(argv: list[str] | None = None) -> None:
    # F3 : durcissement console AVANT tout print — le rapport final porte du texte
    # LLM (humangate_flags Prisme, stderr claude) qui crashait en cp1252.
    _harden_streams()
    args = build_parser().parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    run_dir = REPO_ROOT / "lab" / "forge_runs" / args.project
    src_root = REPO_ROOT / args.src_root

    # F5d : jamais un gel périmé silencieux — fail-fast AVANT de lancer le driver.
    stale = stale_run_dir_reason(run_dir)
    if stale:
        build_parser().error(stale)

    # (f) tâches : défauts non vides (toutes les étapes LLM du profil full) <- CLI
    # (non vide seulement) <- tasks-file (par-dessus tout).
    file_tasks: dict[str, str] = {}
    if args.tasks_file:
        try:
            file_tasks = load_tasks_file(REPO_ROOT / args.tasks_file)
        except ValueError as exc:
            build_parser().error(str(exc))
    task_by_step = merge_task_overrides(
        default_task_by_step(args.project, args.src_root, profile=args.profile),
        {
            "s9-build": args.task_s9,
            "s11-redteam-code": args.task_s11,
            "s2.5-artbible": args.task_artbible,
        },
        file_tasks,
    )

    simple_executor = claude_executor(
        add_dir=src_root, task_by_step=task_by_step, step_timeout=args.step_timeout,
    )

    if args.charter:
        panel_executor = panel_prisme_executor(
            make_panel_claude_call(add_dir=src_root, step_timeout=args.step_timeout),
            charter_path=REPO_ROOT / args.charter,
            run_dir=run_dir / "prisme",
        )

        def executor(payload, decision, context):
            if payload.etape == "s1-prisme":
                return panel_executor(payload, decision, context)
            return simple_executor(payload, decision, context)
    else:
        executor = simple_executor

    driver = ForgeDriver(
        project=args.project,
        run_id=args.run_id,
        run_dir=run_dir,
        profile=args.profile,
        executor=executor,
        src_root=src_root,
        # (e) câblage 1:1 des flags CLI vers ForgeDriver (noms exacts de la signature).
        is_game=args.is_game,
        logic_files=_split_csv(args.logic_files) or None,
        mutation_test_argv=_split_csv(args.mutation_test_argv) or None,
        oracle_config=(REPO_ROOT / args.oracle_config) if args.oracle_config else None,
        pool_size=args.pool_size,
    )
    report = driver.run()
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
