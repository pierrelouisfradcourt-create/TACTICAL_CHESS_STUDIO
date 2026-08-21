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
import sys
import time
from pathlib import Path

from forge.contract import FORGE_ROLES
from forge.dispatch import (
    DEDICATED_PROFILE_STEPS, DETERMINISTIC, ORDER, PROFILES, step_timeout_for,
)
from forge.driver import ForgeDriver
from forge.panel import panel_prisme_executor
from forge.pool import DEFAULT_POOL_SIZE
# CHANTIER 2 (consommateur mecanique de la lecon pat-forge-preflight_oracle_registration) :
# le pre-vol doit s'executer AVANT toute construction d'executor/driver, pour que le refus
# d'une campagne non enregistree ne depense JAMAIS une activation LLM (cf. main() ci-dessous,
# l'appel est place avant task_by_step/executor/ForgeDriver).
from forge.preflight import preflight_campagne
# Chantier RAISONNEMENT (5e étape du charter V2, docs/fvl/FVL_PHASE_0_5_CHARTER.md
# §4) : le socle d'observation (forge.reasoning_observability) a déjà PROUVÉ (a) que
# `claude -p` documente `--effort <level>` et (b) que ce module ne le construisait
# PAS encore — cf. son propre docstring, « aucun --effort n'est ajouté... fichier
# non modifié ». Ce chantier-ci rend le mécanisme EFFECTIF, à valeur déclarée
# INCHANGÉE : aucun champ de roles.yaml n'est touché, seule la classification déjà
# établie (EFFORT_CLI_VALUES) décide si un flag part ou non.
from forge.reasoning_observability import DECLARED_KIND_CLI_COMPATIBLE, classify_declared_reasoning
# Chantier CAPTURE (stream-json) : réutilise l'extracteur déjà PROUVÉ sur capture
# réelle (docstring du module — jamais réimplémenté ici).
from forge.tool_observability import extract_final_result
# F3 (red-team) : réutilisation du durcissement console de verify_run (cp1252 :
# un print(json.dumps(report)) portant du texte LLM — humangate_flags Prisme,
# stderr claude — crashait en UnicodeEncodeError APRÈS un run pourtant terminé).
from forge.verify_run import _harden_streams
# G1-G2 (capteurs, ratifié Pierre) : la ligne télémétrie est écrite par le DRIVER
# (studio_link.record_telemetry) — hors périmètre de ce chantier. Le pont additif
# est le dépôt stage_telemetry_extra (même module que le writer) : l'exécuteur
# dépose les champs MESURÉS, la prochaine écriture télémétrie les consomme.
from forge import repair_dispatch
from forge import studio_link

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
    # P1.2 (2026-08-13) — TENTATIVE RETIRÉE, consignée parce qu'elle a été falsifiée par
    # le dépôt lui-même : j'avais ajouté `Glob`/`Grep` ici, au motif que ces étapes en
    # disposaient DE FAIT (mesuré) et que le deny-par-complément les leur retirerait.
    # Sept tests l'ont refusée — `test_s9_build_a_les_outils_du_contrat_ratifie`,
    # `test_s9_build_standard_allowlist_matches_what_was_measured`,
    # `test_s2_5_artbible_outils_bornes`, entre autres. Ces gardes encodent des jeux
    # d'outils RATIFIÉS ; élargir une allow-list ratifiée demande une gate Pierre, pas
    # une hypothèse d'exécutant. La capacité observée historiquement N'EST PAS une
    # preuve d'usage actuel (niveau 3 : NOT_MEASURED). Table laissée INCHANGÉE : le
    # complément borne donc exactement le jeu ratifié, ce qui est le comportement voulu.
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

# --- P1.2 — BORNE POSITIVE DE CAPACITÉ (GO Pierre 2026-08-13) ---------------------
# Mesure fondatrice (3 essais `claude -p` haiku, 2026-08-13, cf.
# docs/forge/FORGE_PIPELINE_TARGET_V1.md §6.3) :
#   1. `_STEP_TOOLS[etape]` VIDE + `--permission-mode manual` => l'agent lit le dépôt
#      (jeton sentinelle rendu à l'identique) et le parcourt (Glob : compte de fichiers
#      EXACT). Une déclaration « aucun outil » ne bornait donc RIEN.
#   2. Refuser `Read`/`Glob`/`Grep` ne ferme pas : `Bash` reste un passe-partout
#      (`ls`/`cat`/`grep`) et n'était refusé que sur `Bash(git:*)`. Loi du déplacement.
#   3. Refuser l'ENSEMBLE {Read, Glob, Grep, Bash, PowerShell, ToolSearch, Task, Agent}
#      ferme réellement (`READ=NO_READ`, `SEARCH=NO_SEARCH`).
# Mesure décisive pour la FORME : `--allowedTools Write` seul (sans Read/Glob/Bash) laisse
# TOUJOURS lire et parcourir. => **une allow-list PRÉ-APPROUVE, elle ne RESTREINT pas.**
# Le seul organe d'application est `--disallowedTools`.
#
# Conséquence de conception : la borne est POSITIVE en DÉCLARATION (chaque étape énumère
# exhaustivement ce qu'elle peut utiliser, via `_STEP_TOOLS`) et son application est
# DÉRIVÉE — le déni est le COMPLÉMENT de la déclaration sur `_TOOL_UNIVERSE`. Ajouter une
# étape sans entrée `_STEP_TOOLS` la rend désormais TOTALEMENT bornée (fail-safe), au lieu
# de totalement ouverte (fail-open) comme avant ce correctif.
#
# LIMITE DÉCLARÉE, non refermable ici : `_TOOL_UNIVERSE` est une énumération. Un outil
# futur du harnais (ou un serveur MCP) absent de cette liste rouvrirait la frontière sans
# qu'aucun test ne le voie. `--strict-mcp-config` (déjà posé) ferme le vecteur MCP ; le
# vecteur « nouvel outil natif » reste ouvert et demande un capteur de dérive du
# vocabulaire d'outil — le même capteur manquant que pour `Task` -> `Agent`.
_TOOL_UNIVERSE: tuple[str, ...] = (
    "Read", "Write", "Edit", "NotebookEdit", "Glob", "Grep",
    "Bash", "PowerShell", "Task", "Agent", "ToolSearch",
    "WebFetch", "WebSearch",
)


def _tool_base(spec: str) -> str:
    """Nom d'outil nu d'un spécificateur : `Bash(node:*)` -> `Bash`."""
    return spec.split("(", 1)[0].strip()


# --- M1 (GO Pierre 2026-08-13) — contract.permissions SOURCE de la déclaration --------
# Audit CAPABILITY_AUDIT_P13_20260813 : le champ `permissions` des contrats déclare les
# capacités requises (grammaire verbale régulière 24/24 : `read:` `write:` `create:`
# `run:` `delete:`) et n'était consommé par AUCUN code — deux tables indépendantes,
# divergentes 7/7 sur les étapes de conception. M1 fait du contrat la source pour toute
# étape SANS entrée ratifiée dans `_STEP_TOOLS`.
#
# Priorité : `_STEP_TOOLS[etape]` (jeux d'outils RATIFIÉS, gardés par 7 tests de la zone
# protégée) PRIME sur la dérivation. La dérivation ne s'applique qu'aux étapes sans
# ratification — celles qui, depuis P1.2, étaient totalement bornées par le complément.
#
# Politique de dérivation — UNIQUEMENT ce qui est mécaniquement non ambigu :
#   - `read:` != aucun  -> Read. (Ni Glob ni Grep : aucun contrat ne déclare la
#     recherche ; leçon du retrait Glob/Grep — capacité observée != capacité due.)
#   - `run:` -> les NOMS D'OUTILS de `_TOOL_UNIVERSE` cités littéralement (ex. s2 :
#     `run: WebSearch, WebFetch`). Une prose (« l'oracle code ») ne dérive RIEN.
#   - `write:`/`create:` -> JAMAIS dérivés. Le patron réel des étapes de conception est
#     « bloc JSON terminal -> l'exécuteur matérialise » (documenté dans s2-worldscan.yaml
#     §permissions) : accorder Write sur la foi d'une prose de portée (« charter.yaml
#     uniquement ») donnerait un Write NON borné à cette portée. Un Write agent réel
#     reste une ratification (`_STEP_TOOLS`).
#   - `Edit` -> jamais dérivé (aucun contrat ne le distingue).
# Fail-safe : contrat absent/illisible/sans champ -> () — l'étape reste totalement
# bornée, jamais un fail-open silencieux.
_PERMISSIONS_VERB = re.compile(
    r"(read|write|create|run|delete)\s*:\s*(.*?)(?=(?:read|write|create|run|delete)\s*:|\Z)",
    re.IGNORECASE | re.DOTALL,
)


def _tools_from_permissions(permissions_text: str) -> tuple[str, ...]:
    """Dérivation déterministe permissions -> outils. Voir politique ci-dessus."""
    tools: list[str] = []
    verbs = {m.group(1).lower(): m.group(2).strip()
             for m in _PERMISSIONS_VERB.finditer(permissions_text or "")}
    read_val = verbs.get("read", "")
    if read_val and not read_val.lower().startswith("aucun"):
        tools.append("Read")
    run_val = verbs.get("run", "")
    if run_val and not run_val.lower().startswith("aucun"):
        for name in _TOOL_UNIVERSE:
            if re.search(rf"\b{re.escape(name)}\b", run_val) and name not in tools:
                tools.append(name)
    return tuple(tools)


def _effective_step_tools(etape: str) -> tuple[str, ...]:
    """Outils effectifs d'une étape : ratification (`_STEP_TOOLS`) d'abord, sinon
    dérivation du contrat (`permissions`), sinon () — fail-safe."""
    if etape in _STEP_TOOLS:
        return _STEP_TOOLS[etape]
    contract_path = REPO_ROOT / "scripts" / "forge" / "contracts" / f"{etape}.yaml"
    try:
        import yaml  # déjà dépendance de forge.contract
        data = yaml.safe_load(contract_path.read_text(encoding="utf-8")) or {}
        return _tools_from_permissions(str(data.get("permissions") or ""))
    except Exception:  # noqa: BLE001 — fail-safe : borne totale, jamais fail-open
        logger.warning("M1: permissions du contrat illisibles pour %s -> ()", etape)
        return ()


def _derive_disallowed(allowed: tuple[str, ...]) -> tuple[str, ...]:
    """Deny effectif = dénis de chemin existants + COMPLÉMENT de la déclaration.

    Une étape qui déclare `Bash(node:*)` garde `Bash` (le déni porte sur le nom nu, et
    le refuser tuerait le spécificateur autorisé) ; tout outil de `_TOOL_UNIVERSE` dont
    le nom nu n'apparaît dans AUCUNE entrée déclarée est refusé.
    """
    granted = {_tool_base(t) for t in allowed}
    complement = tuple(t for t in _TOOL_UNIVERSE if t not in granted)
    # Dédoublonnage en préservant l'ordre : `NotebookEdit` figure déjà nu dans
    # `_STEP_DISALLOWED` et serait ré-émis par le complément.
    seen: set[str] = set()
    out: list[str] = []
    for spec in _STEP_DISALLOWED + complement:
        if spec not in seen:
            seen.add(spec)
            out.append(spec)
    return tuple(out)
# Limite déclarée (F1d, non corrigée ici) : l'audit HMAC du dispatch
# (forge.dispatch) signe allowed_tools=() — le payload contrat, vide par
# construction — alors que l'exécuteur borne réellement via _STEP_TOOLS :
# sous-déclaration connue de l'audit. La corriger passe par un plan contrat
# (gate Pierre) — dispatch.py N'EST PAS modifié par ce chantier.

# Artefacts déterministes matérialisés PAR L'EXÉCUTEUR (jamais par l'agent LLM) :
# les oracles s10b/s10c les lisent dans run_dir (forge.driver._read_json), et le
# driver fige le jeu de règles (wiremap_frozen.json) immédiatement après s5 — le
# fichier doit donc exister AVANT le retour de l'executor.
# Étapes dont l'EXÉCUTEUR (jamais l'agent) matérialise un artefact déterministe.
# C'est le SEUL mécanisme qui rend un worker mesurable : sans entrée ici, l'étape
# ne produit que du texte libre, aucun oracle ne peut la juger et aucune
# substitution de worker ne peut être décidée sur preuve (constat 2026-08-03 :
# 5 workers sur 6 non mesurables, tous absents de cette table).
#
# LIMITE CONNUE, NON FERMÉE ICI : `s1-prisme` n'est matérialisée que sur le chemin
# de l'exécuteur standard (`claude_executor`). Le chemin PANEL
# (`forge.panel.panel_prisme_executor`, 5 lentilles + contrôle) appelle `claude_call`
# directement et ne passe pas par `_materialize_artifact` : lancée par le panel,
# l'étape n'écrit toujours pas de prisme.json. Déboucher le panel est un chantier
# distinct (le merger échoue en silence, cf. handoff 2026-08-03) — pas une rustine
# à poser au passage ici.
_ARTIFACT_BY_STEP: dict[str, str] = {
    "s2-worldscan": "worldscan.json",
    "s4-archi": "blueprint.json",
    "s5-wiremap": "wiremap.json",
    "s1-prisme": "prisme.json",
    "s3-decompo": "featuremap.json",
    # §7.2 · s2.7-gm-worldscan (GO Pierre 2026-08-14) — l'entrée qui rend la station
    # MESURABLE : sans elle, l'exécuteur ne matérialiserait aucun fichier et l'oracle
    # n'aurait rien à juger (cf. mémoire studio « ce qui rend un worker Forge
    # mesurable »).
    "s2.7-gm-worldscan": "gm_worldscan.json",
    # §7.2 · s2.6-story-bible — meme motif : l'entree qui rend la station mesurable.
    "s2.6-story-bible": "story_bible.json",
}

# Bloc JSON fenced (```json ... ```) — extraction déterministe, aucun LLM.
_FENCED_JSON = re.compile(r"```json\s*(.*?)```", re.S)

# R1' — marqueur de lignée Return (RESTITUTION_RULE, contract.py). Ligne unique,
# JSON inline : PAS un bloc fenced, pour ne JAMAIS entrer en collision avec
# l'artefact d'étape (extract_json_payload prend le DERNIER bloc ```json``` — un
# RETURN_REASON fenced en fin de rapport volerait la place de l'artefact).
# TOLERANCE DE MISE EN FORME (2026-08-14) — corrige un FAUX NEGATIF mesuré, pas une
# hypothèse : le run `gmws-probe-20260814` (haiku) a rendu
#   **RETURN_REASON: {"status": "NOT_DISCOVERED"}**
# soit la ligne EN GRAS markdown — décoration que la consigne n'interdit pas. Les ancres
# `^…$` de la version d'origine cassaient sur les astérisques, et l'extracteur rendait
# `NOT_TRANSMITTED`, dont la sémantique est « le contrat de restitution n'a PAS été
# honoré ». Il l'avait été : le capteur accusait le worker d'un défaut qui était le sien.
# Mesure du 2026-08-14 sur 9 variations plausibles : **7 échouaient**, dont l'item de
# liste, l'indentation, le titre, l'espace avant les deux-points. Le cas haiku n'était
# pas une exception, c'était le premier symptôme.
#
# Ce que la tolérance accepte : un préfixe de MISE EN FORME devant le mot-clé
# (`**`, `-`, `*`, `#`, `>`, espaces) et un suffixe de fermeture après l'accolade
# (`**`, `*`, `` ` ``, `.`). Ce qu'elle n'accepte PAS, et qui est vérifié par des
# contre-épreuves : une mention du mot-clé EN PROSE au milieu d'une phrase, ou un exemple
# cité entre backticks — `(?m)^` reste exigé, seule la décoration de début de ligne est
# tolérée. Élargir au-delà rendrait le capteur bavard, ce qui est un défaut symétrique.
_RETURN_REASON = re.compile(
    r"^[\s>#\-*`]*RETURN_REASON\s*:\s*\**\s*(\{.*?\})[\s*`.]*$",
    re.MULTILINE,
)


def _extract_return_reason(output: str) -> dict:
    """Extraction déterministe du marqueur `RETURN_REASON:` (dernière occurrence).

    Retours possibles — jamais d'exception :
      {"status": "DISCOVERED", "problem": ..., "root_cause": ...} — validé : status
        reconnu ET problem non vide (un DISCOVERED sans problem est requalifié
        NOT_TRANSMITTED : le contrat exigeait le champ) ;
      {"status": "NOT_DISCOVERED"} — honnête, ignoré par promote_manifest_lessons ;
      {"status": "NOT_TRANSMITTED"} — marqueur absent, illisible ou non conforme.
    """
    matches = _RETURN_REASON.findall(output or "")
    if not matches:
        return {"status": "NOT_TRANSMITTED"}
    try:
        data = json.loads(matches[-1])
    except ValueError:
        return {"status": "NOT_TRANSMITTED"}
    if not isinstance(data, dict):
        return {"status": "NOT_TRANSMITTED"}
    status = str(data.get("status") or "").strip().upper()
    if status == "NOT_DISCOVERED":
        return {"status": "NOT_DISCOVERED"}
    if status == "DISCOVERED":
        problem = str(data.get("problem") or "").strip()
        if not problem:
            return {"status": "NOT_TRANSMITTED"}
        reason: dict = {"status": "DISCOVERED", "problem": problem}
        root_cause = str(data.get("root_cause") or "").strip()
        if root_cause:
            reason["root_cause"] = root_cause
        return reason
    return {"status": "NOT_TRANSMITTED"}


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


# --- G1-G2 : vérité métrique minimale (ratifié Pierre, verbatim : « Commencer
# uniquement G1-G2. Priorité : 1. session_id 2. task_id 3. modèle utilisé
# 4. tokens réels. ») ---------------------------------------------------------
# Écarts mesurés que ces capteurs comblent : corrélation transcript<->run par
# inférence seulement (session_id absent de la télémétrie) · wm1 opus-4-8
# signé/opus-5 exécuté (le modèle MESURÉ n'était capturé nulle part) · télémétrie
# tokens fausse ×6,7-12,3 et cache ignoré (seul le `usage` de la ligne finale
# `result` était lu — jamais le cumul dédupliqué des tours assistant).
# Capteur, jamais juge : AUCUNE exception ne sort de ce bloc, un échec de capture
# rend des champs à None (+ warning log) et le run continue à l'identique.

_STREAM_METRIC_KEYS = ("session_id", "model_used", "tokens_measured", "tools_used")


def _usage_int(usage: dict, key: str) -> int:
    """int(usage[key]) défensif : absent/None/non-numérique -> 0 (zéro mesuré)."""
    try:
        return int(usage.get(key) or 0)
    except (TypeError, ValueError):
        return 0


# --- Instrumentation du PROCESSUS (GO Pierre 2026-08-14) ---------------------------
# Un `returncode=1` a stderr VIDE etait une boite noire : mesure sur l'experience C,
# 14 appels consecutifs echouent sans un octet d'explication, et rien ne permettait de
# dire si le modele avait ete atteint. Consequence directe : impossible de savoir si un
# echec appartient au dossier causal de s2-worldscan (« le worker n'a pas tente ») ou a
# l'environnement (« le worker n'a jamais existe »). Les deux n'appellent pas le meme
# niveau de mutation.
#
# ETABLI SUR LES SIGNAUX DU FLUX, JAMAIS DEVINE DEPUIS LE RETURNCODE (invariant Pierre) :
#   MODEL_REACHED       `model_used` non vide -> au moins un tour `assistant` a ete
#                       observe dans le flux. Preuve POSITIVE, independante du
#                       returncode : un run peut atteindre le modele PUIS echouer.
#   MODEL_NOT_REACHED   pas de tour assistant MAIS `session_id` present -> le CLI a
#                       demarre et emis son message d'init ; le flux etait donc
#                       lisible, et l'absence de tour assistant est une MESURE, pas
#                       une lacune de capture.
#   PROCESS_EXIT_NONZERO ni tour assistant ni session_id, et returncode non nul -> le
#                       processus a echoue sans qu'on puisse dire ou. C'est un CONSTAT
#                       d'echec, pas un diagnostic de portee.
#   UNKNOWN             aucun des cas ci-dessus n'est etablissable. Jamais devine.
#
# PROCESS_START_FAILED n'est PAS produit ici : `subprocess.Popen` LEVE quand le binaire
# ne demarre pas, et cette exception se propage hors de `_claude_call_raw` — aucun
# appelant ne la voit comme un retour. La capturer changerait le comportement des
# appels existants, ce que le perimetre du GO interdit explicitement. Etat declare
# NON OBSERVABLE en l'etat, remonte en gate plutot que simule.
_PROCESS_STATES = ("MODEL_REACHED", "MODEL_NOT_REACHED", "PROCESS_EXIT_NONZERO", "UNKNOWN")


def classify_process_state(returncode, stream_metrics: dict) -> str:
    """Etat du processus etabli sur les signaux DEJA captures du flux. Fonction PURE.
    Voir le bloc ci-dessus pour la regle de chaque etat et pour la raison de l'absence
    de PROCESS_START_FAILED."""
    sm = stream_metrics if isinstance(stream_metrics, dict) else {}
    if sm.get("model_used"):
        return "MODEL_REACHED"
    if sm.get("session_id"):
        return "MODEL_NOT_REACHED"
    if returncode not in (0, None):
        return "PROCESS_EXIT_NONZERO"
    return "UNKNOWN"


def parse_stream_metrics(stdout_text: str) -> dict:
    """Fonction PURE : extrait du flux `--output-format stream-json --verbose`
    DÉJÀ REÇU (aucun appel, aucune I/O) les métriques MESURÉES.

    Retourne toujours un dict à 3 clés :
      - session_id      : str | None — première valeur `session_id` (message
                          init/system du CLI) ou `sessionId` (forme portée par
                          les transcripts .claude/projects, même donnée) vue
                          dans le flux.
      - model_used      : list[str] | None — ensemble ORDONNÉ des valeurs
                          DISTINCTES de message.model des tours assistant :
                          le modèle réellement EXÉCUTÉ, jamais le déclaré.
      - tokens_measured : dict | None — {input, output, cache_read,
                          cache_creation} : cumul des `usage` des tours
                          assistant DÉDUPLIQUÉS par message.id. Un même message
                          apparaît sur PLUSIEURS lignes du flux (une par content
                          block) avec le MÊME usage — sommer sans dédupliquer
                          recrée l'écart ×6,7-12,3 déjà mesuré. Dernière
                          occurrence par id retenue (usage identique observé,
                          mais « dernière » = la plus complète si jamais le CLI
                          raffinait en cours de message).

    Robustesse (le capteur ne casse JAMAIS l'exécuteur) : lignes vides/non-JSON
    ignorées, objets non-dict ignorés, champs absents ou mal typés ignorés ;
    aucun assistant vu -> model_used/tokens_measured None ; aucune exception.
    """
    session_id: str | None = None
    models: list[str] = []
    usage_by_id: dict[str, dict] = {}
    anon = 0
    tool_uses_by_id: dict[str, str] = {}   # id de bloc tool_use -> nom d'outil
    anon_tool = 0
    for line in (stdout_text or "").splitlines():
        line = line.strip()
        if not line or not line.startswith("{"):
            continue
        try:
            obj = json.loads(line)
        except ValueError:
            continue
        if not isinstance(obj, dict):
            continue
        if session_id is None:
            sid = obj.get("session_id") or obj.get("sessionId")
            if isinstance(sid, str) and sid.strip():
                session_id = sid.strip()
        if obj.get("type") != "assistant":
            continue
        msg = obj.get("message")
        if not isinstance(msg, dict):
            continue
        model = msg.get("model")
        if isinstance(model, str) and model.strip() and model.strip() not in models:
            models.append(model.strip())
        usage = msg.get("usage")
        if isinstance(usage, dict):
            mid = msg.get("id")
            if isinstance(mid, str) and mid.strip():
                usage_by_id[mid] = usage  # dédup : même id = même appel API
            else:
                anon += 1
                usage_by_id[f"_sans_id_{anon}"] = usage
        # Expérience C (GO Pierre 2026-08-14) — INSTRUMENTATION SEULE : compter les
        # INVOCATIONS d'outil. Rend observable le maillon manquant de la chaîne
        # « outil disponible ≠ outil UTILISÉ ≠ données obtenues ≠ sortie conforme »,
        # sans lequel un échec d'acquisition (mesuré : nb_games=0 ET nb_sources=0,
        # binaire, 4 fois sur 16 en expérience B) ne peut pas se départager entre
        # « le worker n'a pas tenté » et « il a tenté sans acquérir ».
        # Dédup par l'ID DU BLOC tool_use, jamais par message.id : un même message
        # apparaît sur PLUSIEURS lignes du flux (une par content block) — compter sans
        # dédupliquer recréerait le même gonflement que celui déjà mesuré sur `usage`.
        # `tool_result` est porté par les messages `user`, jamais `assistant` : il est
        # donc hors de cette branche par construction, et ne peut pas créer une
        # invocation fantôme (vérifié par falsification, pas supposé).
        content = msg.get("content")
        if isinstance(content, list):
            for bloc in content:
                if not isinstance(bloc, dict) or bloc.get("type") != "tool_use":
                    continue
                nom = bloc.get("name")
                if not isinstance(nom, str) or not nom.strip():
                    continue
                bid = bloc.get("id")
                cle = bid.strip() if isinstance(bid, str) and bid.strip() else None
                if cle is None:
                    anon_tool += 1
                    cle = f"_sans_id_{anon_tool}"
                tool_uses_by_id[cle] = nom.strip()
    tokens_measured: dict | None = None
    if usage_by_id:
        tokens_measured = {"input": 0, "output": 0, "cache_read": 0, "cache_creation": 0}
        for usage in usage_by_id.values():
            tokens_measured["input"] += _usage_int(usage, "input_tokens")
            tokens_measured["output"] += _usage_int(usage, "output_tokens")
            tokens_measured["cache_read"] += _usage_int(usage, "cache_read_input_tokens")
            tokens_measured["cache_creation"] += _usage_int(usage, "cache_creation_input_tokens")
    tools_used: dict[str, int] = {}
    for nom in tool_uses_by_id.values():
        tools_used[nom] = tools_used.get(nom, 0) + 1
    return {
        "session_id": session_id,
        "model_used": models or None,
        "tokens_measured": tokens_measured,
        # Expérience C : {} quand aucun outil n'a été invoqué — un dict VIDE est une
        # mesure (« zéro invocation »), distincte de None (« non mesuré »).
        "tools_used": tools_used,
    }


def _capture_stream_metrics(stdout_text: str) -> dict:
    """Ceinture-bretelles autour de parse_stream_metrics : la fonction pure ne
    lève pas par construction, mais le contrat du capteur est ABSOLU (jamais
    faire échouer un run) — échec imprévu => champs à None + warning log."""
    try:
        return parse_stream_metrics(stdout_text)
    except Exception:
        logger.warning(
            "capture des métriques stream-json échouée (capteur advisory, "
            "non bloquant) — champs mesurés à None", exc_info=True)
        return {k: None for k in _STREAM_METRIC_KEYS}


def _effort_flag_for_model(model: str) -> str | None:
    """Résout le réglage `--effort` pour `model` (le nom RÉELLEMENT passé à cet
    appel — `payload.model`, ou `model_override` après une escalade) via le
    `reasoning` déclaré dans `roles.yaml` (`control_plane.registry`,
    résolution PAR MODÈLE plutôt que par rôle : c'est le modèle qui exécute CET
    appel qui doit porter son propre réglage, jamais celui du rôle d'origine
    avant une éventuelle escalade — cf. `forge.escalate`).

    Retourne None (AUCUN flag) pour :
      - une valeur déclarée non CLI-compatible (`False`/absente/inconnue —
        c'est précisément le cas des rôles Qwen et déterministe, qui de toute
        façon n'atteignent jamais `_claude_call_raw`, appelé UNIQUEMENT pour
        `decision.runner in {claude, claude-blind}` — cf. docstring du module) ;
      - un `model` qui ne correspond à AUCUN id de `roles.yaml` — notamment un
        alias de palier NU post-escalade (`forge.escalate.LADDER` n'écrit que
        'haiku'/'sonnet'/'opus', jamais l'id complet) : limite déclarée, voir
        SKIPPED_VALIDATION du rapport de mission — jamais une valeur devinée.

    Ne modifie ni ne lit `roles.yaml` autrement qu'en lecture : aucune valeur
    choisie ici, seule la classification déjà établie par
    `forge.reasoning_observability.classify_declared_reasoning` décide.
    """
    from control_plane.registry import get_reasoning_for_model

    raw = get_reasoning_for_model(model, caps_path=FORGE_ROLES)
    if classify_declared_reasoning(raw) != DECLARED_KIND_CLI_COMPATIBLE:
        return None
    return str(raw).strip().lower()


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
        # Chantier CAPTURE (docs/fvl/FVL_PHASE_0_5_CHARTER.md §4, ligne « 4. SKILLS
        # OBSERVABLES ») : stream-json --verbose au lieu de json seul, SEULEMENT
        # après preuve de neutralité sur les 3 volets exigés (contenu final,
        # chemins durcis, coût/tokens/durée) — 4 appels réels contrôlés (2026-07-30,
        # coût divulgué au rapport de mission), diff mécanique des lignes finales
        # `type: result` : ensembles de clés IDENTIQUES entre les deux formats sur
        # le cas réussi/sans-outil (21/21 clés partagées, texte `result` identique
        # au caractère près), coût/tokens dans la même bande (écart <0.2%,
        # attribuable à la variance normale de génération, pas au format), et le
        # cas outil/échec confirme que l'absence du champ `result` sur `is_error`
        # n'est PAS un artefact du streaming (déjà `.get('result', '')` avant ce
        # chantier). `--output-format json` rendait déjà LA MÊME forme d'objet
        # `type: result` — seule sa position change (dernière ligne d'un flux
        # plutôt qu'unique sortie).
        "--output-format", "stream-json",
        "--verbose",
        "--add-dir", str(add_dir),
        # R2 (red-team de clôture) : isolation MCP — flag vérifié dans
        # `claude --help` local (« Only use MCP servers from --mcp-config,
        # ignoring all other MCP configurations »). Sans aucun --mcp-config
        # fourni, ce flag = ZÉRO serveur MCP : les builders n'héritent pas des
        # serveurs MCP projet/utilisateur (studio-brain, computer-use, etc.).
        "--strict-mcp-config",
    ]
    # Chantier RAISONNEMENT : --effort <level>, transmis UNIQUEMENT quand le
    # modèle réellement exécutant déclare une valeur CLI-compatible (jamais
    # deviné, jamais pour un provider non-CLI — cf. _effort_flag_for_model).
    effort = _effort_flag_for_model(model)
    if effort:
        cmd += ["--effort", effort]
    if tools:
        cmd += ["--allowedTools", " ".join(tools), "--permission-mode", "acceptEdits"]
    else:
        cmd += ["--permission-mode", "manual"]
    # F1b : deny-list TOUJOURS posée (même sans tools : le panel Prisme passe ici
    # aussi) — le deny prime sur l'allow hérité de .claude/settings.local.json.
    # P1.2 (2026-08-13) : le deny n'est plus la liste fixe mais le COMPLÉMENT de la
    # déclaration `tools` sur `_TOOL_UNIVERSE` — c'est ce qui donne à `--allowedTools`
    # une force de BORNE et non de simple pré-approbation (mesuré : une allow-list
    # seule ne restreint rien). `tools=()` devient donc totalement borné, fail-safe.
    cmd += ["--disallowedTools", " ".join(_derive_disallowed(tools))]

    started = time.time()
    returncode, stdout, stderr, timed_out = _run_subprocess_tree(
        cmd, cwd=str(REPO_ROOT), input_text=prompt, timeout_s=timeout_s,
    )
    duration = time.time() - started

    # G1-G2 : métriques MESURÉES du flux déjà reçu — capturées sur TOUS les
    # chemins de retour (timeout/erreur compris : un flux partiel porte déjà
    # l'init session_id et des tours assistant). Additif pur : aucune clé
    # existante du dict de retour n'est modifiée.
    stream_metrics = _capture_stream_metrics(stdout)
    # Diagnostic de PROCESSUS, additif pur : aucune cle existante n'est modifiee, et
    # `stderr_tail` est explicitement DISTINCT de la sortie modele (`output`) — un
    # stderr n'est jamais du contenu produit par le modele. Borne 2000 car., meme
    # convention que les messages `reason` existants.
    diag = {
        "returncode": returncode,
        "stderr_tail": (stderr or "")[-2000:],
        "process_state": classify_process_state(returncode, stream_metrics),
    }

    if timed_out:
        # FIR-01 : l'arbre de process a été tué (coût borné) — le flag `timeout`
        # laisse l'aval (executor) inspecter le disque avant de conclure (FIR-02).
        return {
            "ok": False,
            "timeout": True,
            "duration_s": duration,
            "reason": f"claude -p timeout ({timeout_s:.0f}s) — arbre de process tué "
                      "(FIR-01), coût borné",
            **stream_metrics, **diag,
        }
    if returncode != 0:
        return {
            "ok": False,
            "reason": f"claude -p returncode={returncode}: {stderr[-2000:]}",
            **stream_metrics, **diag,
        }
    # Chantier CAPTURE : extraction déterministe (aucun LLM) de la DERNIÈRE ligne
    # `type: result` du flux JSONL — même fonction, déjà PROUVÉE sur capture réelle
    # (forge.tool_observability.extract_final_result, jamais réimplémentée ici).
    # Ne lève jamais : un flux vide/corrompu/sans ligne 'result' rend None, jamais
    # une exception — traité ci-dessous comme le `except ValueError` d'avant ce
    # chantier (même message générique, même {ok: False}).
    data = extract_final_result(stdout)
    if data is None:
        return {"ok": False, "reason": f"sortie claude -p (stream-json) sans ligne "
                                       f"'result' exploitable: {stdout[-2000:]}",
                **stream_metrics, **diag}
    if data.get("is_error"):
        return {"ok": False, "reason": f"claude -p is_error: {data.get('result', '')[:2000]}",
                **stream_metrics, **diag}

    usage = data.get("usage") or {}
    tokens = int(usage.get("input_tokens", 0)) + int(usage.get("output_tokens", 0))
    # Tier 2.5 étape 2 : coût RÉEL (pas estimé) — `claude -p --output-format json`
    # rend déjà `total_cost_usd` calculé par l'API, aucune table de prix à maintenir.
    cost_usd = float(data.get("total_cost_usd", 0.0))
    # CV-8 (lot de dégel 1, 2026-07-30) : `usage` porte aussi
    # `cache_creation_input_tokens`/`cache_read_input_tokens` (constaté sur capture
    # RÉELLE, fixtures/tool_observability/probe_bash_echo_real_capture.jsonl) —
    # jusqu'ici jetés, rendant impossible de séparer coût contexte (cache) et coût
    # raisonnement. ADDITIF pur : deux champs frères de `tokens`/`cost_usd`, jamais
    # None (0 par défaut, un ZÉRO MESURÉ quand la clé est absente/non numérique).
    cache_creation_tokens = int(usage.get("cache_creation_input_tokens", 0) or 0)
    cache_read_tokens = int(usage.get("cache_read_input_tokens", 0) or 0)
    return {
        "ok": True, "output": str(data.get("result", "")),
        "tokens": tokens, "duration_s": duration, "cost_usd": cost_usd,
        "cache_creation_tokens": cache_creation_tokens,
        "cache_read_tokens": cache_read_tokens,
        # G1-G2 : champs MESURÉS additifs — les champs déclarés ci-dessus
        # (tokens/cost_usd, issus de la seule ligne `result`) restent INTACTS :
        # la comparaison déclaré/mesuré est précisément le but.
        **stream_metrics, **diag,
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


def _validate_worldscan(data: dict) -> str:
    """'' si le manifeste a le format que check_worldscan.mjs consomme (mode
    fichier), sinon la raison précise du rejet. Garde-fou MINIMAL avant écriture
    (même esprit que _validate_blueprint/_validate_wiremap) — check_worldscan.mjs
    reste l'oracle de vérité pour le détail (sources, loops, URLs) ; ceci empêche
    seulement un artefact structurellement inexploitable (games[] absent/vide,
    objectives[] absent/vide) d'atteindre le disque."""
    games = data.get("games")
    if games is None:
        return ("'games' est ABSENTE du manifeste (clé manquante — un manifeste "
                "sans jeu rend check_worldscan.mjs trivialement invalide)")
    if not isinstance(games, list) or not games:
        return ("'games' doit être une liste NON VIDE (une liste vide rend "
                "check_worldscan.mjs trivialement invalide)")
    for i, game in enumerate(games):
        if not isinstance(game, dict):
            return f"games[{i}] n'est pas un objet (dict attendu)"
        objectives = game.get("objectives")
        if not isinstance(objectives, list) or not objectives:
            return (f"games[{i}].objectives doit être une liste NON VIDE (>=1 "
                    "mode avec victoire/défaite/objectif joueur explicites) — "
                    "un manifeste sans objectives[] a déjà coûté un run entier "
                    "(solvabilité tetris remontée en décision humaine faute de "
                    "ce champ, cf. contrat s2-worldscan)")
    if data.get("advisory") is not True:
        return "'advisory' doit valoir exactement true"
    return ""


def _validate_prisme(data: dict) -> str:
    """'' si prisme.json est structurellement exploitable, sinon la raison du rejet.

    Garde-fou MINIMAL avant écriture, même régime que `_validate_worldscan` :
    l'oracle de vérité pour le détail (chaîne Observation → Exigence → Preuve
    attendue → Destination, ancrage des références, actionnabilité) est
    `scripts/forge/check_prisme_manifest.mjs`. Ici on empêche seulement un artefact
    inexploitable d'atteindre le disque.

    La règle de PROVENANCE est vérifiée dès ici, et pas seulement dans l'oracle,
    parce qu'elle est structurelle : une sortie de modèle ne peut pas revendiquer
    `CORE`. L'origine d'une exigence CORE est `core_list` PAR CONSTRUCTION (mesuré
    le 2026-08-03 : la précision de provenance passe de 0,125 à 1,00 selon le seul
    format). Laisser un CORE s'écrire, c'est laisser un modèle se déclarer source
    de vérité — le fichier ne doit pas exister.
    """
    exigences = data.get("exigences")
    if not isinstance(exigences, list) or not exigences:
        return ("'exigences' doit être une liste NON VIDE (un Prisme qui n'exige "
                "rien ne transforme aucune connaissance en contrainte)")
    for i, ex in enumerate(exigences):
        if not isinstance(ex, dict):
            return f"exigences[{i}] n'est pas un objet (dict attendu)"
        if not isinstance(ex.get("id"), str) or not ex["id"].strip():
            return f"exigences[{i}].id doit être une str non vide"
        source = ex.get("source")
        if source not in ("EXPECTED", "ADDITIONS"):
            return (f"exigences[{i}].source doit valoir EXPECTED ou ADDITIONS "
                    f"(reçu {source!r}) — CORE ne transite JAMAIS par un modèle, "
                    "son origine est core_list par construction")
    return ""


def _validate_featuremap(data: dict) -> str:
    """'' si featuremap.json est structurellement exploitable, sinon la raison.

    Garde-fou MINIMAL (l'oracle de vérité est `scripts/forge/check_decompo.mjs`,
    qui seul voit le Prisme et peut donc juger couverture et non-invention). Ce
    qu'on refuse ici : un arbre sans système, sans feature, ou sans AUCUNE feuille —
    c'est-à-dire un artefact dont la seule lecture possible serait « rien à
    couvrir », qui rendrait vacuement verts les deux oracles d'aval (blueprint et
    wiremap mesurent leur couverture PAR RAPPORT à cet arbre).
    """
    systemes = data.get("systemes")
    if not isinstance(systemes, list) or not systemes:
        return "'systemes' doit être une liste NON VIDE"
    feuilles = 0
    for i, sys in enumerate(systemes):
        if not isinstance(sys, dict):
            return f"systemes[{i}] n'est pas un objet (dict attendu)"
        features = sys.get("features")
        if not isinstance(features, list) or not features:
            return (f"systemes[{i}].features doit être une liste NON VIDE — un "
                    "système sans feature ne décompose rien")
        for j, feat in enumerate(features):
            if not isinstance(feat, dict):
                return f"systemes[{i}].features[{j}] n'est pas un objet (dict attendu)"
            capacites = feat.get("capacites")
            if not isinstance(capacites, list) or not capacites:
                return (f"systemes[{i}].features[{j}].capacites doit être une liste "
                        "NON VIDE — une feature sans feuille ne porte aucune preuve")
            feuilles += len(capacites)
    if feuilles == 0:
        return ("aucune feuille dans l'arbre — les oracles d'aval (blueprint, "
                "wiremap) mesurent leur couverture PAR RAPPORT à ces feuilles : "
                "sans elles, ils seraient vacuement verts")
    return ""


def _validate_gm_worldscan(data: dict) -> str:
    """§7.2 · s2.7 — '' si l'artefact est structurellement exploitable, sinon la raison
    du rejet. Garde-fou MINIMAL avant écriture, même esprit que `_validate_worldscan` :
    `forge.static_oracles.check_gm_worldscan` reste l'oracle de vérité (les 8
    dimensions, statuts, sources, placeholders) ; ceci empêche seulement qu'un artefact
    trivialement inexploitable atteigne le disque."""
    dims = data.get("dimensions")
    if not isinstance(dims, list) or not dims:
        return ("'dimensions' doit être une liste NON VIDE (un scan de genre sans "
                "dimension ne porte aucune variable de calibration)")
    games = data.get("games_observed")
    if not isinstance(games, list) or len(games) < 2:
        return ("'games_observed' doit lister >=2 jeux (une comparaison de genre "
                "exige au moins deux points d'observation)")
    return ""


def _validate_story_bible(data: dict) -> str:
    """§7.2 · s2.6 — garde-fou MINIMAL avant écriture ; check_story_bible reste
    l'oracle de vérité (8 sections, ancrage, placeholders)."""
    sections = data.get("sections")
    if not isinstance(sections, list) or not sections:
        return ("'sections' doit être une liste NON VIDE (une bible sans section ne "
                "porte aucune matière narrative)")
    if not isinstance(data.get("inputs_recus"), dict):
        return "'inputs_recus' doit déclarer ce que le contexte portait réellement"
    return ""


_ARTIFACT_VALIDATORS = {
    "worldscan.json": _validate_worldscan,
    "gm_worldscan.json": _validate_gm_worldscan,
    "story_bible.json": _validate_story_bible,
    "blueprint.json": _validate_blueprint,
    "wiremap.json": _validate_wiremap,
    "prisme.json": _validate_prisme,
    "featuremap.json": _validate_featuremap,
}


# --- boucle de réparation (REPAIR_LOOP_V1) -----------------------------------------
# Correspondance étape du driver -> étape de `repair_step.mjs`. Les deux noms diffèrent
# pour s4/s5 À DESSEIN : l'oracle branché ici est celui d'AVANT build (contrat), pas
# `check_architecture`/`check_wiremap` qui jugent le code après build. Un nom identique
# aurait fini par faire confondre les deux, ce qui est exactement l'erreur qu'on a mis
# une session à diagnostiquer.
_REPAIR_STEP_BY_STEP: dict[str, str] = {
    "s2-worldscan": "s2-worldscan",
    "s1-prisme": "s1-prisme",
    "s3-decompo": "s3-decompo",
    "s4-archi": "s4-archi-contract",
    "s5-wiremap": "s5-wiremap-contract",
}

_REPAIR_SCRIPT = Path(__file__).resolve().parent / "repair_step.mjs"
_REPAIR_TIMEOUT_S = 180.0


def run_repair_step(etape: str, run_dir: Path, timeout_s: float = _REPAIR_TIMEOUT_S,
                    run_id: str = "", attempt: int = 0,
                    audit_path: Path | None = None,
                    results_path: Path | None = None) -> dict | None:
    """Lance oracle -> réparation ciblée -> oracle sur l'artefact amont d'une étape.

    Retourne le bloc de mesure (dict) ou None si l'étape n'a pas d'oracle amont / si
    la boucle n'a pas pu tourner.

    CAPTEUR, PAS JUGE (dans cet incrément) : la réparation modifie RÉELLEMENT
    l'artefact sur disque — c'est la self-correction demandée — mais le verdict
    ok/fail de l'étape n'est PAS modifié ici. Changer la sémantique d'un verdict est
    une décision HumanGate, pas un effet de bord d'un branchement.

    Ne lève JAMAIS : réparateur injoignable, node absent, sortie illisible => None, et
    l'étape se comporte exactement comme avant le branchement. Un mécanisme
    d'amélioration qui peut faire tomber la chaîne qu'il améliore est un mauvais marché.

    `audit_path` / `results_path` — ISOLATION DE LA PREUVE (2026-08-19). `repair_dispatch`
    accepte ces destinations depuis toujours ; cette fonction ne les exposait pas, donc
    tout appelant retombait sur `forge.audit.DEFAULT_AUDIT`, c'est-à-dire le VRAI fichier.
    Conséquence MESURÉE : 1048 des 3462 lignes de `dispatch_audit.jsonl` viennent de la
    suite de tests, toutes sans `run_id` (un test n'en fournit pas), toutes en
    `capability_role="repair_runtime"`, réparties s2-worldscan 696 / s4-archi 176 /
    s5-wiremap 176 — soit exactement les appels de `test_run_real_repair_wiring.py`.
    `None` conserve le comportement de production ; seuls les tests redirigent.
    """
    cible = _REPAIR_STEP_BY_STEP.get(etape)
    if cible is None:
        return None
    if os.environ.get("FORGE_REPAIR", "1") == "0":
        logger.info("boucle de réparation désactivée (FORGE_REPAIR=0) — étape=%s", etape)
        return None
    # PASSAGE PAR LA PORTE (2026-08-04). Le réparateur tournait hors de tout reçu
    # signé : déclaré dans roles.yaml, invisible à l'Observer. On émet le MÊME reçu
    # que la porte de dispatch, avant et après — jamais un système d'événements
    # parallèle. Empreinte de l'artefact prise ici, seul endroit où « avant » existe
    # encore. Best-effort strict : aucune de ces lignes ne peut faire tomber la
    # réparation qu'elle observe.
    artefact_path = run_dir / _ARTIFACT_BY_STEP.get(etape, "")
    input_hash = repair_dispatch.file_sha256(artefact_path)
    repair_dispatch.announce(etape, run_id, attempt=attempt, audit_path=audit_path)
    try:
        proc = subprocess.run(
            ["node", str(_REPAIR_SCRIPT), cible, str(run_dir)],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
            timeout=timeout_s,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        logger.warning("boucle de réparation non exécutée (étape=%s) : %s", etape, exc)
        return None
    try:
        mesure = json.loads(proc.stdout)
    except (json.JSONDecodeError, TypeError):
        logger.warning("boucle de réparation : sortie illisible (étape=%s, rc=%s)",
                       etape, proc.returncode)
        return None
    if not isinstance(mesure, dict):
        return None
    logger.info(
        "réparation %s : %s (%s -> %s problème(s), %s token(s), %s champ(s))",
        cible, mesure.get("STATUS"), mesure.get("PROBLEMS_BEFORE"),
        mesure.get("PROBLEMS_AFTER"), mesure.get("TOKENS"),
        len(mesure.get("FIELDS_CHANGED") or []),
    )
    # Reçu d'exécution + trace `repair.result`. L'empreinte de sortie est prise APRÈS
    # l'écriture réelle sur disque : c'est l'artefact jugé par l'oracle, pas un état
    # intermédiaire. `evidence_ref` pointe le run — la preuve versionnée, quand elle
    # existe, est produite par l'adaptateur de contrat, pas ici.
    trace = repair_dispatch.record(
        etape, run_id, mesure, attempt=attempt,
        input_hash=input_hash, output_hash=repair_dispatch.file_sha256(artefact_path),
        evidence_ref=repair_dispatch.repo_relative(run_dir),
        audit_path=audit_path, results_path=results_path,
    )
    if trace is not None:
        mesure["TRACE"] = {"runtime_id": trace["runtime_id"],
                           "input_hash": trace["input_hash"],
                           "output_hash": trace["output_hash"]}
    return mesure


# --- GO-1 / M3 (GO Pierre 2026-08-13) — matérialiseur TEXTE ---------------------------
# `product_snapshot.md` avait un validateur (`check_prisme.mjs`), deux consommateurs
# déclarés (s2.5-artbible, s3-decompo) et AUCUN producteur : le contrat s1-prisme
# attend une écriture agent (« write: product_snapshot.md uniquement ») jamais accordée
# par l'exécuteur, et `_ARTIFACT_BY_STEP` est une chaîne strictement JSON (une entrée
# par étape, déjà prise par prisme.json). Mécanisme JUMEAU décidé avec Pierre :
# artefact TEXTE = la réponse du worker MOINS ses blocs ```json``` (l'artefact
# structuré) et MOINS la ligne RETURN_REASON (lignée Return, déjà captée au manifeste).
# Preuve : check_prisme.mjs exécuté sur le fichier écrit, reçu JOINT au retour
# d'exécuteur (`res["markdown_check"]`) — advisory : le reçu dit la conformité, il ne
# gate pas le statut du pas (gater exigerait une ratification distincte).
_MARKDOWN_BY_STEP: dict[str, str] = {
    "s1-prisme": "product_snapshot.md",
}

# Validateur par artefact markdown — même esprit que _ARTIFACT_VALIDATORS, mais en
# processus externe (node) et advisory.
_MARKDOWN_CHECKERS: dict[str, tuple[str, ...]] = {
    "product_snapshot.md": ("node", "scripts/forge/prisme/check_prisme.mjs"),
}


# --- M4 (GO Pierre 2026-08-14) — matérialiseur YAML : charter.yaml ------------------
# JUMEAU de `_materialize_markdown` (M3), même famille, artefact différent.
#
# Défaut mesuré : `charter.yaml` n'avait AUCUN producteur dans le code. Le contrat
# s0-contrat promet « write: charter.yaml uniquement. create: charter.yaml », mais
# l'exécuteur n'accorde pas Write (M1 dérive ('Read',) — et ne dérive JAMAIS Write,
# décision ratifiée qui reste bonne), aucune entrée n'existait dans _ARTIFACT_BY_STEP
# ni _MARKDOWN_BY_STEP, et `--charter` ne fait que passer un chemin au panel Prisme
# sans rien copier dans le run_dir. Les 9 charter.yaml presents dans lab/forge_runs
# datent TOUS du 26 juillet : artefacts historiques, comme product_snapshot.md avant
# M3. Pendant ce temps CINQ étapes le déclarent en amont — s2.6, s3, s4, s5, s6.
# Consommateurs sans producteur, exactement le motif que M3 a fermé.
#
# CE QUE CE PATCH NE FAIT PAS : donner Write à s0-contrat, ni toucher M1. Le principe
# ratifié est intact — le contrat DÉCLARE la capacité, M1 la DÉRIVE, l'exécuteur
# MATÉRIALISE selon le contrat. Le défaut n'était pas un manque de pouvoir de l'agent,
# c'était le passage manquant entre sa sortie et l'artefact déclaré.
#
# Bloc ```yaml``` fencé, DERNIER valide — même règle déterministe que
# `extract_json_payload`. Un charter est CONSOMMÉ par cinq étapes : un fichier
# illisible les empoisonnerait toutes. La garde de parse BLOQUE donc l'écriture
# (même doctrine que `_materialize_artifact` : « aucun fichier écrit » si le schéma
# échoue), tandis que `check_charter` — l'oracle de vérité sur les 7 champs — est
# joint en REÇU sans gater : un charter parsable mais incomplet est un fait mesuré à
# remonter, pas une raison de ne rien écrire.
_YAML_BY_STEP: dict[str, str] = {
    "s0-contrat": "charter.yaml",
}

_FENCED_YAML = re.compile(r"^```ya?ml[ \t]*\r?\n(.*?)^```[ \t]*$", re.S | re.M)


def _materialize_yaml(etape: str, output: str, run_dir: Path) -> dict | None:
    """Écrit l'artefact YAML de l'étape (charter.yaml pour s0-contrat) et joint le
    reçu de son oracle. Retourne None si l'étape n'a pas d'artefact YAML, sinon un
    reçu {written, ...}. Ne lève jamais — un échec est un reçu honnête, jamais un
    crash de chaîne."""
    artefact = _YAML_BY_STEP.get(etape)
    if artefact is None:
        return None
    try:
        blocs = _FENCED_YAML.findall(output or "")
        if not blocs:
            return {"written": False,
                    "reason": f"{artefact} non matérialisable — aucun bloc ```yaml``` "
                              "dans la réponse (0 bloc inspecté)"}
        import yaml as _yaml
        data = None
        why = ""
        for brut in reversed(blocs):  # DERNIER bloc valide, règle déterministe
            try:
                candidat = _yaml.safe_load(brut)
            except Exception as exc:  # noqa: BLE001 — YAML illisible : on continue
                why = f"YAML illisible ({str(exc)[:120]})"
                continue
            if isinstance(candidat, dict):
                data = candidat
                break
            why = f"le bloc YAML n'est pas un mapping (reçu {type(candidat).__name__})"
        if data is None:
            return {"written": False,
                    "reason": f"{artefact} non matérialisable — {why or 'aucun bloc '
                              'YAML exploitable'} (aucun fichier écrit)"}
        run_dir.mkdir(parents=True, exist_ok=True)
        path = run_dir / artefact
        path.write_text(
            _yaml.safe_dump(data, allow_unicode=True, sort_keys=False),
            encoding="utf-8",
        )
        recu: dict = {"written": True, "path": str(path), "champs": sorted(data)}
        # Oracle de vérité, ADVISORY : lu sur le fichier RÉELLEMENT écrit.
        try:
            from forge.static_oracles import check_charter
            r = check_charter(data)
            recu["check"] = {"oracle": "check_charter",
                             "verdict": "PASS" if r.get("passed") else "FAIL",
                             "raisons": list(r.get("raisons") or [])[:5]}
        except Exception as exc:  # noqa: BLE001
            recu["check"] = {"verdict": "NOT_MEASURED", "reason": str(exc)[:200]}
        return recu
    except Exception:  # noqa: BLE001 — advisory, jamais bloquant
        logger.warning("matérialiseur YAML en échec pour étape=%s (advisory)",
                       etape, exc_info=True)
        return {"written": False, "reason": "exception du matérialiseur (voir run.log)"}


def _materialize_markdown(etape: str, output: str, run_dir: Path) -> dict | None:
    """Écrit l'artefact TEXTE de l'étape (ex. product_snapshot.md pour s1-prisme)
    et exécute son validateur. Retourne le reçu {written, path, check: {...}} ou
    None si l'étape n'a pas d'artefact texte. Best-effort strict : ne lève jamais,
    ne modifie jamais le statut du pas — un échec ici est un reçu honnête, pas un
    crash de chaîne."""
    artefact = _MARKDOWN_BY_STEP.get(etape)
    if artefact is None:
        return None
    try:
        text = _FENCED_JSON.sub("", output or "")
        text = _RETURN_REASON.sub("", text).strip() + "\n"
        if not text.strip():
            return {"written": False, "reason": "sortie vide après retrait du bloc "
                    "JSON et du marqueur RETURN_REASON — aucun fichier écrit"}
        run_dir.mkdir(parents=True, exist_ok=True)
        path = run_dir / artefact
        path.write_text(text, encoding="utf-8")
        receipt: dict = {"written": True, "path": str(path), "chars": len(text)}
        checker = _MARKDOWN_CHECKERS.get(artefact)
        if checker:
            try:
                proc = _REAL_SUBPROCESS_RUN(
                    [*checker, str(path)], capture_output=True, text=True,
                    encoding="utf-8", errors="replace", timeout=60, cwd=str(REPO_ROOT),
                )
                receipt["check"] = {
                    "command": " ".join(checker),
                    "returncode": proc.returncode,
                    "verdict": "PASS" if proc.returncode == 0 else "FAIL",
                    "tail": (proc.stdout or "").strip().splitlines()[-2:],
                }
            except (OSError, subprocess.SubprocessError) as exc:
                receipt["check"] = {"verdict": "NOT_MEASURED", "reason": str(exc)[:200]}
        return receipt
    except Exception:  # noqa: BLE001 — advisory, jamais bloquant
        logger.warning("matérialiseur markdown en échec pour étape=%s (advisory)",
                       etape, exc_info=True)
        return {"written": False, "reason": "exception du matérialiseur (voir run.log)"}


def select_artifact_payload(etape: str, output: str) -> tuple[dict | None, str]:
    """Choisit, parmi TOUS les blocs ```json``` fenced d'une sortie d'étape, celui
    qui doit être matérialisé comme artefact.

    Défaut mesuré (run kitten_clicker-20260821b) : `extract_json_payload` prend
    inconditionnellement le DERNIER bloc dict, quel que soit son contenu. Quand un
    agent termine sa réponse par un second bloc fenced (ex. un RETURN_REASON mis en
    forme en ```json``` plutôt qu'en ligne inline — hors contrat mais observé), ce
    second bloc vole la place de l'artefact réel et le validateur juge le mauvais
    objet, avec un message qui accuse une clé « vide » alors qu'elle est ABSENTE.

    Règle : parcourt les blocs dict (mêmes candidats qu'`extract_json_payload` —
    `_FENCED_JSON`, dict JSON valide) du DERNIER au PREMIER, retient le DERNIER qui
    PASSE le validateur de l'artefact de `etape`. Si `etape` n'a pas de validateur
    connu (pas dans `_ARTIFACT_BY_STEP`/`_ARTIFACT_VALIDATORS`), délègue tel quel à
    `extract_json_payload` — comportement inchangé pour tout appelant hors artefact
    JSON déterministe.

    Si AUCUN bloc dict ne passe le validateur : comportement préservé au pire —
    retourne la raison du validateur appliqué au DERNIER bloc dict trouvé (le même
    message qu'avant ce correctif), ou la raison native d'`extract_json_payload` s'il
    n'existe aucun bloc dict du tout (JSON illisible, pas de fence, etc.).

    Jamais d'exception, jamais un objet partiel — même contrat qu'`extract_json_payload`.
    """
    artefact = _ARTIFACT_BY_STEP.get(etape)
    validator = _ARTIFACT_VALIDATORS.get(artefact) if artefact else None
    if validator is None:
        return extract_json_payload(output)

    blocks = _FENCED_JSON.findall(output or "")
    dict_candidates: list[dict] = []
    for raw in blocks:
        try:
            data = json.loads(raw)
        except ValueError:
            continue
        if isinstance(data, dict):
            dict_candidates.append(data)
    if not dict_candidates:
        # Aucun bloc dict : retombe sur extract_json_payload (JSON non-fenced,
        # message d'échec natif — identique au comportement d'avant ce correctif).
        return extract_json_payload(output)

    last_reason = ""
    for data in reversed(dict_candidates):
        reason = validator(data)
        if not reason:
            return data, ""
        if not last_reason:
            last_reason = reason  # celle du DERNIER bloc dict, comme avant le correctif
    return None, last_reason


def _materialize_artifact(etape: str, output: str, run_dir: Path) -> dict | None:
    """Écrit l'artefact déterministe de l'étape (blueprint.json / wiremap.json)
    depuis la sortie texte, APRÈS validation de schéma (F2a). Retourne None si
    tout va bien, sinon le dict d'échec honnête {ok: False, reason} à remonter au
    driver (fail-fast, jamais un fichier corrompu, invalide ni absent en silence)."""
    artefact = _ARTIFACT_BY_STEP.get(etape)
    if artefact is None:
        return None
    data, why = select_artifact_payload(etape, output)
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
    # FORGE_PRISME_V2 (Pierre, 2026-08-03) — le Prisme REÇOIT le World Scan.
    # Copie STRICTEMENT identique à context_manifest._UPSTREAM_BY_STEP (test
    # d'égalité dans scripts/forge/tests/test_context_manifest.py).
    # Choix (b) Pierre 2026-08-21 : le Prisme reçoit AUSSI la Story Bible (s2.6) et
    # le GM World Scan (s2.7) quand ils existent (profil full_godot_narratif) — c'est
    # par les exigences du Prisme que leur information atteint la décompo sans
    # assouplir la règle `source_ref -> exigence` de check_decompo. Fichier absent
    # (profil `full`) => omis par upstream_artifacts_section, comportement inchangé.
    "s1-prisme": ("artifacts/s2-worldscan.txt", "artifacts/s2.6-story-bible.txt",
                  "artifacts/s2.7-gm-worldscan.txt"),
    # §7.2 · s2.7 REÇOIT le World Scan artistique — c'est ce qui lui permet de ne PAS
    # redire les 3 dimensions déjà structurées (modes, solvabilité, boucles) et de
    # produire uniquement les 8 manquantes. Cette table décrit ce qu'une étape REÇOIT ;
    # l'absence de CONSOMMATEUR de gm_worldscan.json se lit donc ailleurs — aucune
    # étape ne le cite, PASSIVE assumée (cf. PROFILES["gm_worldscan"]).
    "s2.7-gm-worldscan": ("artifacts/s2-worldscan.txt",),
    # §7.2 · s2.6 — la Story Bible reçoit ses DEUX seules sources d'ancrage. Le
    # charter est un fichier de run (comme pour s3) ; absent => section amont réduite,
    # et le worker le déclare dans inputs_recus au lieu de compenser.
    "s2.6-story-bible": ("charter.yaml", "artifacts/s2-worldscan.txt"),
    # Choix (b) Pierre 2026-08-21 : idem pour la décompo (mêmes deux artefacts amont,
    # après les 3 sources déjà existantes). Fichier absent => omis, comportement
    # inchangé pour les profils qui ne produisent pas s2.6/s2.7.
    # full_godot_content (Pierre 2026-08-22, composition) : la décompo reçoit AUSSI
    # art_bible.md et asset_requests.json (produits par s2.5-artbible, injecté entre
    # s1 et s3 dans ce profil). Absents (autres profils) => omis, comportement inchangé.
    "s3-decompo": ("charter.yaml", "artifacts/s1-prisme.txt", "artifacts/s2-worldscan.txt",
                   "artifacts/s2.6-story-bible.txt", "artifacts/s2.7-gm-worldscan.txt",
                   "art_bible.md", "asset_requests.json"),
    "s4-archi": ("charter.yaml", "artifacts/s3-decompo.txt",),
    # full_godot_content : le wiremap reçoit aussi la Story Bible (s2.6) et l'art
    # bible + ses demandes d'assets (s2.5) — même raisonnement que s3-decompo
    # ci-dessus. Absents (autres profils) => omis, comportement inchangé.
    "s5-wiremap": ("charter.yaml", "artifacts/s3-decompo.txt", "blueprint.json",
                   "artifacts/s2.6-story-bible.txt", "art_bible.md", "asset_requests.json"),
    "s6-redteam-plan": ("charter.yaml", "artifacts/s3-decompo.txt", "artifacts/s4-archi.txt",
                        "artifacts/s5-wiremap.txt"),
    "s9-build": ("blueprint.json", "wiremap.json"),
    # full_godot_content : le builder Godot standard reçoit blueprint+wiremap (comme
    # s9-build ci-dessus) PLUS l'art bible et ses demandes d'assets — mesuré (lot
    # full_godot_narratif) : aucune injection n'existait pour s9-build-godot-standard,
    # lecture déclarative seule. Absents (autres profils) => omis par
    # upstream_artifacts_section, comportement inchangé.
    "s9-build-godot-standard": ("blueprint.json", "wiremap.json", "art_bible.md",
                                "asset_requests.json"),
    "s11-redteam-code": ("wiremap.json",),
}

# Borne de troncature déclarée : chaque artefact injecté est coupé à cette taille
# (mention explicite '[tronqué]') — jamais un prompt non borné.
UPSTREAM_MAX_CHARS = 15000


def _truncate_preserve_terminal_json(content: str) -> str:
    """Coupe un artefact amont > UPSTREAM_MAX_CHARS en préservant le DERNIER bloc
    ```json``` VALIDE (même convention que extract_json_payload). La coupe
    tête-seule détruisait exactement ce que les tâches exigent en FIN de réponse
    (« Termine ta réponse par UN bloc ```json``` ») — mesuré 2026-08-15 : 5+
    artefacts réels > 15k (s2-worldscan.txt jusqu'à 27 742 car.), bloc terminal
    perdu à l'injection pour tous les consommateurs de _UPSTREAM_BY_STEP.
    Borne conservée : tête narrative réduite d'autant ; si le bloc dépasse à lui
    seul la borne, il est gardé entier (la sortie reste bornée par sa taille)."""
    matches = list(_FENCED_JSON.finditer(content))
    kept = None
    for m in reversed(matches):
        try:
            json.loads(m.group(1))
        except (json.JSONDecodeError, ValueError):
            continue
        kept = m
        break
    if kept is None and matches:
        kept = matches[-1]  # aucun bloc valide : préserver quand même le dernier
    if kept is None or kept.end() <= UPSTREAM_MAX_CHARS:
        # pas de bloc, ou bloc déjà entier dans la tête : comportement historique
        return content[:UPSTREAM_MAX_CHARS] + "\n[tronqué]"
    block = content[kept.start():kept.end()]
    head = content[:min(max(0, UPSTREAM_MAX_CHARS - len(block)), kept.start())]
    return head + "\n[tronqué]\n" + block


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
            content = _truncate_preserve_terminal_json(content)
        blocks.append(f"### {rel} (chemin réel : {path})\n{content}")
    if not blocks:
        return ""
    header = "## ARTEFACTS AMONT (run_dir)"
    # Comparaison d'égalité stricte (pas de préfixe/contains) : extension explicite
    # à s9-build-godot-standard (full_godot_content, Pierre 2026-08-22) — même
    # raisonnement ownership, jumeau Godot de s9-build.
    if etape in ("s9-build", "s9-build-godot-standard"):
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


def _timeout_effectif(profile: str, etape: str, step_timeout: float) -> float:
    """Timeout réellement appliqué à `etape`, avec la table par profil de dispatch.

    Règle d'arbitrage, volontairement simple : **l'intention de l'opérateur gagne**.
    La table (`dispatch.PROFILE_STEP_TIMEOUTS_S`, leçon
    `forge.timeout_greenfield_by_profile`) n'est consultée que si `--step-timeout`
    est resté au défaut. Un opérateur qui borne délibérément le coût d'un run n'est
    jamais contredit par une table.
    """
    if step_timeout != DEFAULT_STEP_TIMEOUT_S:
        return step_timeout
    return step_timeout_for(profile, etape, DEFAULT_STEP_TIMEOUT_S)


def claude_executor(add_dir: Path, task_by_step: dict[str, str], *,
                    step_timeout: float = DEFAULT_STEP_TIMEOUT_S,
                    profile: str = "full"):
    """Fabrique un executor(payload, decision, context) -> dict pour ForgeDriver.

    Un seul canal réel (`claude -p`) pour claude et claude-blind : les deux sont
    déjà des spawns Claude en contexte vierge de session (pas de -c/--continue).

    `profile` sert UNIQUEMENT à résoudre le timeout par étape (cf.
    `_timeout_effectif`) : il ne change ni le prompt, ni le modèle, ni les outils.
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
            # P4 (lot dégel 2) : plancher RÉEL d'outils accordés à CET exécuteur
            # (_STEP_TOOLS ci-dessus), pas le plafond skill/plugin du contrat
            # (payload.allowed_tools, souvent vide par construction — voir la
            # ligne d'audit signée de dispatch.py, INTOUCHÉE par ce lot).
            context_manifest.append_execution_manifest(
                context["run_id"], etape, Path(context["run_dir"]), prompt,
                model=payload.model, premortem_section=premortem_section,
                tools_effective=_effective_step_tools(etape),
                tools_disallowed_count=len(_STEP_DISALLOWED),
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
        timeout_s = _timeout_effectif(profile, etape, step_timeout)
        if timeout_s != step_timeout:
            # Journalisé dans <run_dir>/run.log (handler attaché par le driver) :
            # l'opérateur doit pouvoir lire POURQUOI cette étape a eu plus de temps,
            # et la leçon qui l'a décidé doit être nommée là où elle agit.
            logger.info(
                "timeout d'étape porté à %.0fs (défaut %.0fs) pour profil=%s étape=%s "
                "— leçon forge.timeout_greenfield_by_profile : le défaut est calibré "
                "pour du correctif, pas pour un greenfield",
                timeout_s, step_timeout, profile, etape,
            )
        res = _claude_call_raw(
            prompt, model, add_dir=add_dir,
            tools=_effective_step_tools(etape), timeout_s=timeout_s,
        )
        # G1-G2 (ratifié) : task_id unifié `run_id:etape:activation` — calculé ICI,
        # le seul point d'appel où les 3 valeurs existent ensemble (context["attempt"]
        # = compteur d'activation du driver, cf. driver.py l.627 : le MÊME entier que
        # porte déjà le dispatch_marker FORGE_DISPATCH:etape:run_id:attempts). Puis
        # dépôt des champs MESURÉS pour la ligne télémétrie que le driver écrira
        # (studio_link.record_telemetry — succès COMME halt, les deux chemins du
        # driver passent après ce retour, dans le même process). Capteur advisory :
        # jamais une exception d'ici ne fait échouer le run.
        try:
            task_id = f"{context['run_id']}:{etape}:{context.get('attempt')}"
            res["task_id"] = task_id  # additif : visible aussi dans le détail d'étape
            studio_link.stage_telemetry_extra(context["run_id"], etape, {
                "session_id": res.get("session_id"),
                "task_id": task_id,
                "model_used": res.get("model_used"),
                "tokens_measured": res.get("tokens_measured"),
                # P3 : {} = « zéro invocation » (mesuré), None = « non mesuré ».
                "tools_used": res.get("tools_used"),
            })
        except Exception:
            logger.warning(
                "capteur G1-G2 non déposé pour étape=%s (advisory, non bloquant)",
                etape, exc_info=True)
        # R1' (GO Pierre 2026-08-13) — lignée RETURN : extraction déterministe du
        # marqueur `RETURN_REASON:` de la réponse, écrite au Context Manifest en
        # kind 'return' (l'enregistrement 'execution' est écrit AVANT l'appel LLM).
        # Marqueur absent => NOT_TRANSMITTED : mesure le non-respect de la règle de
        # restitution, jamais assimilé à « rien à signaler ». Best-effort strict.
        if res.get("ok"):
            try:
                from forge import context_manifest
                context_manifest.append_return_manifest(
                    context["run_id"], etape, Path(context["run_dir"]),
                    _extract_return_reason(str(res.get("output", ""))),
                )
            except Exception:
                logger.warning(
                    "manifest 'return' non écrit pour étape=%s (advisory, non "
                    "bloquant)", etape, exc_info=True)
        if res.get("ok"):
            # (b) matérialisation déterministe par l'EXÉCUTEUR (jamais l'agent).
            failure = _materialize_artifact(etape, str(res.get("output", "")),
                                            Path(context["run_dir"]))
            if failure is not None:
                # Correctif B (2026-08-21) : un refus de matérialisation NE DOIT PAS
                # faire perdre la sortie brute coûteuse du LLM — sans `output`, le
                # driver halte sans jamais écrire `artifacts/<etape>.txt` (forensique
                # impossible). `setdefault` : ne jamais écraser une clé déjà posée
                # par `_materialize_artifact`.
                failure.setdefault("output", str(res.get("output", "")))
                for champ in ("tokens", "duration_s", "cost_usd",
                              "cache_creation_tokens", "cache_read_tokens"):
                    if champ in res:
                        failure.setdefault(champ, res.get(champ))
                return failure
            # GO-1/M3 : artefact TEXTE (product_snapshot.md pour s1-prisme) + reçu
            # check_prisme — advisory, jamais un échec de pas (voir docstring).
            md_receipt = _materialize_markdown(etape, str(res.get("output", "")),
                                               Path(context["run_dir"]))
            if md_receipt is not None:
                res["markdown_check"] = md_receipt
            # M4 : artefact YAML (charter.yaml pour s0-contrat) + reçu check_charter.
            yaml_receipt = _materialize_yaml(etape, str(res.get("output", "")),
                                             Path(context["run_dir"]))
            if yaml_receipt is not None:
                res["yaml_check"] = yaml_receipt
            # (c) oracle amont + réparation ciblée, immédiatement après l'écriture de
            # l'artefact. C'est le seul instant où l'artefact existe, est frais, et où
            # personne n'a encore construit dessus : réparer plus tard reviendrait à
            # corriger une fondation sous un mur déjà monté.
            mesure = run_repair_step(
                etape, Path(context["run_dir"]),
                run_id=str(context.get("run_id") or ""),
                attempt=int(context.get("attempt") or 0),
            )
            if mesure is not None:
                res["repair"] = mesure
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
    (+ s2.5-artbible, profil dédié). Les défauts de s2/s4/s5 exigent le bloc JSON
    fenced au format exact lu par forge.check_worldscan / forge.static_oracles
    .check_architecture / check_wiremap — c'est l'exécuteur qui l'écrira dans
    run_dir (item b), l'agent n'écrit AUCUN fichier à ces étapes.

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
            "éprouvées du genre, boucles minute_1/minute_10/heure_5/endgame, pièges connus, "
            ">=2 jeux comparables, >=3 sources citées par jeu). Advisory uniquement. Termine "
            'ta réponse par UN bloc ```json ... ``` contenant EXACTEMENT un objet de la forme '
            '{"games": [{"game": "<nom>", "sources": [{"url": "<https://...>", "type": '
            '"screenshot|video|article|wiki", "timestamp": "<obligatoire si type=video>"}, '
            '...>=3], "loops": {"minute_1": "...", "minute_10": "...", "hour_5": "...", '
            '"endgame": "..."}, "objectives": [{"mode": "<solo|versus|coop|...>", '
            '"has_win_state": true|false, "victory_condition": "<string ou null ssi '
            'has_win_state=false>", "has_defeat_state": true|false, "defeat_condition": '
            '"<string ou null ssi has_defeat_state=false>", "player_goal": "..."}, ...>=1], '
            '"retention_answer": "..."}, ...>=2], "advisory": true} — format lu par '
            "forge.check_worldscan.mjs. Un genre sans état gagné (marathon, score-attack) "
            "déclare has_win_state:false + victory_condition:null EXPLICITEMENT, jamais par "
            "un champ omis. Tu n'écris AUCUN fichier : l'exécuteur matérialise lui-même "
            "worldscan.json depuis ce bloc."
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
        # §7.2 · s2.6 — ANCRAGE, pas invention.
        "s2.6-story-bible": (
            f"Story Bible du projet '{project}' : établis la matière narrative ANCRÉE "
            "dans les DEUX seules sources injectées en amont (worldscan.json, charter). "
            "Chaque élément cite sa source et son passage ; une section que les entrées "
            "ne permettent pas d'ancrer se déclare NOT_GROUNDED avec sa raison. AUCUN "
            "remplissage narratif : une bible presque vide mais honnête vaut mieux "
            "qu'une bible riche et fabriquée. Déclare sincèrement inputs_recus."
        ),
        # §7.2 · s2.7 — MESURE du genre, pas conception. La tâche par défaut nomme le
        # projet ; le GENRE réel se passe par --tasks-file quand il diffère du nom.
        "s2.7-gm-worldscan": (
            f"World Scan du GAME MASTER pour le projet '{project}' : mesure "
            "comparative du GENRE sur >=2 jeux réels et documentés. Produis les 8 "
            "dimensions de calibration (combat, progression, economy, rng, rarity, "
            "bonus, metagame, construction) CHIFFRÉES et SOURCÉES. Ne redis AUCUNE "
            "des 3 dimensions déjà structurées par le World Scan artistique injecté "
            "en amont (modes/joueurs, conditions de victoire-défaite, boucles). Une "
            "dimension non observable se déclare status NOT_MEASURED AVEC sa raison — "
            "jamais une valeur inventée."
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

    # Chantier « consommateur mécanique » de la leçon KB ratifiée
    # pat-forge-preflight_oracle_registration : le projet doit être résoluble dans
    # la config d'oracle AVANT toute dépense LLM — sinon un builder entier peut
    # tourner pour rien (visible seulement à s10a, après coup). Placé ICI, avant
    # task_by_step/executor/ForgeDriver : un pré-vol raté ne construit RIEN de ce
    # qui mène à un appel `claude -p`, donc n'en dépense aucun.
    oracle_config_arg = (REPO_ROOT / args.oracle_config) if args.oracle_config else None
    preflight = preflight_campagne(
        args.project, oracle_config_path=oracle_config_arg, repo_root=REPO_ROOT,
    )
    if not preflight["ok"]:
        # ASCII pur (pas d'accent) : évite le piège console cp1252 déjà connu
        # (P3, forge.verify_run._harden_streams) sur un message tout neuf.
        print(
            "PRE-VOL ECHOUE -- campagne NON lancee (aucune activation LLM depensee).\n"
            f"projet : {preflight['project']}\n"
            f"raison : {preflight['raison_echec']}\n"
            f"lecon citee ({preflight['justification_source']}) : {preflight['justification']}",
            file=sys.stderr,
        )
        sys.exit(1)

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
        profile=args.profile,
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
