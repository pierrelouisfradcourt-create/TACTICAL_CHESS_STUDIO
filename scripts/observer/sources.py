"""Acces aux sources de Forge Observer V0 — lecture seule, cecite structurelle.

Deux garanties sont implementees ici, pas promises ailleurs :

1. LECTURE SEULE. Ce module n'expose aucune fonction d'ecriture. Tout passage
   par `ObserverContext` est un `open(..., "r")`. Observer ne modifie jamais la
   Forge, ni un run, ni un jeu.

2. CECITE. La reconstruction du golden run doit se faire SANS le rapport humain.
   Ce n'est pas une consigne, c'est une contrainte de code : `ALLOWED_ROOTS`
   liste les seules racines lisibles. Le rapport humain vit sous `docs/` —
   structurellement hors d'atteinte. Toute tentative de lecture ailleurs leve
   `BlindnessViolation`, qui n'est pas rattrapee par les adaptateurs.

La comparaison au rapport humain se fait dans un second temps, par un module
distinct (`compare.py`) qui, lui, a le droit de le lire — apres que la
reconstruction a ete figee sur disque.
"""

from __future__ import annotations

import json
import logging
import os
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator, Optional

LOG = logging.getLogger("observer.sources")

# Encodage unique pour tout le projet. `utf-8-sig` decode aussi bien l'UTF-8 nu
# que l'UTF-8 avec BOM (cas reel : playtest_capture_report.json).
ENCODING = "utf-8-sig"

# ---------------------------------------------------------------------- #
# Resolution de chemins — SOURCE UNIQUE pour tout Observer.
#
# Avant : 13 modules redeclaraient chacun `C:\TACTICAL_CHESS_STUDIO` et
# `C:\Users\Studio-Dev\.claude\projects\C--TACTICAL-CHESS-STUDIO` en dur.
# Resultat : l'outil ne tournait que sur un seul poste. Ici, TOUT module qui a
# besoin d'une racine par defaut doit appeler `default_repo_root()` /
# `default_transcripts_root()` — jamais recopier un chemin litteral.
#
# Ordre de resolution (le premier qui répond gagne) :
#   1. argument explicite (flag CLI --repo/--transcripts, deja gere par les
#      appelants — ces fonctions ne fournissent QUE le defaut)
#   2. variable d'environnement (TCS_OBSERVER_REPO_ROOT / _TRANSCRIPTS_ROOT)
#   3. deduction : repo = dossier parent de scripts/observer/ ; transcripts =
#      <home>/.claude/projects/<slug(repo_root)>, ou <slug> reproduit la
#      convention Claude Code (tout caractere non alphanumerique -> "-").
# ---------------------------------------------------------------------- #

ENV_REPO_ROOT = "TCS_OBSERVER_REPO_ROOT"
ENV_TRANSCRIPTS_ROOT = "TCS_OBSERVER_TRANSCRIPTS_ROOT"


def _claude_project_slug(path: Path) -> str:
    """Reproduit la convention de nommage de `~/.claude/projects/<slug>`.

    Claude Code remplace chaque caractere non alphanumerique du chemin absolu
    par un tiret. Verifie empiriquement : `C:\\TACTICAL_CHESS_STUDIO` ->
    `C--TACTICAL-CHESS-STUDIO` (dossier reellement present sur ce poste).
    """
    return re.sub(r"[^A-Za-z0-9]", "-", str(path))


def default_repo_root() -> Path:
    """Racine du depot : deduite de l'emplacement de ce fichier, sauf surcharge."""
    override = os.environ.get(ENV_REPO_ROOT)
    if override:
        return Path(override).resolve()
    # sources.py vit dans <repo>/scripts/observer/sources.py
    return Path(__file__).resolve().parents[2]


def default_transcripts_root(repo_root: Optional[Path] = None) -> Path:
    """Dossier des transcripts Claude Code pour ce depot, sauf surcharge."""
    override = os.environ.get(ENV_TRANSCRIPTS_ROOT)
    if override:
        return Path(override)
    root = (repo_root or default_repo_root()).resolve()
    slug = _claude_project_slug(root)
    return Path.home() / ".claude" / "projects" / slug


class BlindnessViolation(RuntimeError):
    """Levee quand un adaptateur tente de lire hors des racines autorisees.

    Ne JAMAIS rattraper cette exception dans un adaptateur : elle protege la
    validite de l'experience. Un Observer qui lit le rapport humain pendant la
    reconstruction ne prouve plus rien.
    """


@dataclass
class ObserverContext:
    """Racines et helpers de lecture pour une reconstruction de projet."""

    repo_root: Path
    project: str
    transcripts_root: Path
    allowed_roots: list[Path] = field(default_factory=list)
    read_paths: list[str] = field(default_factory=list)
    denied_attempts: list[str] = field(default_factory=list)

    # ------------------------------------------------------------------ #
    # Construction
    # ------------------------------------------------------------------ #

    @classmethod
    def build(
        cls,
        repo_root: Path,
        project: str,
        transcripts_root: Path,
    ) -> "ObserverContext":
        repo_root = repo_root.resolve()
        ctx = cls(
            repo_root=repo_root,
            project=project,
            transcripts_root=transcripts_root.resolve()
            if transcripts_root.exists()
            else transcripts_root,
        )
        ctx.allowed_roots = [
            repo_root / "lab" / "forge_runs" / project,
            repo_root / "games" / project,
            repo_root / "lab" / "forge_evidence",
            repo_root / "lab" / "reports" / "error_journal",
            ctx.transcripts_root,
            # --- Elargissement de lecture DECLARE (ratifie Pierre, build cockpit
            # 2026-08-01, etapes 4-5 de l'ordre §08) — exactement deux racines,
            # rien de plus :
            #   * studio_brain/decisions : vue HUMAN GATE (ecart decisions
            #     prises <-> enregistrees). Lecture seule, prose comprise.
            #   * lab/reports/lessons.jsonl : vue DOCUMENTATION LOOP (fichier
            #     exact, pas le dossier lab/reports entier).
            # Le rapport humain de campagne (docs/) reste structurellement
            # illisible : la cecite de reconstruction n'est pas affaiblie.
            repo_root / "studio_brain" / "decisions",
            repo_root / "lab" / "reports" / "lessons.jsonl",
            # --- Elargissement DECLARE nº2 (directive Pierre 2026-08-01,
            # « le cockpit doit devenir le Master Schema vivant ») — vues
            # objets-metier : fiches d'agent, workflow, artefacts, roadmap.
            #   * scripts/forge/contracts : les fiches completes (17 champs),
            #     SCHEMA.md, roles.yaml. Lecture seule.
            #   * knowledge_base : catalogue et schemas — bloc KB du workflow
            #     et consommateurs d'artefacts.
            #   * les DEUX fichiers exacts du Master Schema (doctrine affichee
            #     comme doctrine, datee) — PAS le dossier docs/forge : les
            #     rapports humains de campagne restent illisibles, la cecite
            #     de reconstruction n'est pas affaiblie.
            repo_root / "scripts" / "forge" / "contracts",
            repo_root / "knowledge_base",
            repo_root / "docs" / "forge" / "STUDIO_MASTER_SCHEMA.html",
            repo_root / "docs" / "forge" / "FORGE_V2_PILOTAGE.html",
            # --- Elargissement DECLARE nº3 (arbitrage Pierre 2026-08-02, vue
            # Planning) : le registre de planning ratifie §06, s'il existe.
            # Observer ne l'ecrit JAMAIS — il lit ; la proposition generee vit
            # dans lab/reports/observer/ (sortie propre d'Observer), et c'est
            # Pierre qui promeut vers studio_brain/planning/.
            repo_root / "studio_brain" / "planning",
            # --- Elargissement DECLARE nº4 (2026-08-03, doctrine FORGE_AUTONOMY_V2) —
            # DEUX FICHIERS EXACTS, pas le dossier lab/reports : meme patron que
            # lessons.jsonl ci-dessus.
            # POURQUOI : Pierre exige que la chaine prevu -> construit -> cable ->
            # actif -> consomme reste capable de nommer « appele mais jamais
            # consomme ». Les connecteurs-ecrivains (propose_brick,
            # propose_bible_entry) vivent dans scripts/forge/*.py, structurellement
            # ILLISIBLE et qui doit le rester — la verite systeme vient de
            # l'execution, pas du code. On les juge donc par l'ARTEFACT qu'ils
            # produisent. Sans ces deux chemins, la vue cablage cherchait ces
            # fichiers dans des racines qui ne les contiennent pas : reponse juste
            # aujourd'hui par coincidence (ils n'existent nulle part), mais FAUX
            # NON garanti des qu'un run reel en ecrit un.
            # CE QUE CELA N'AFFAIBLIT PAS : ce sont des artefacts d'EXECUTION
            # (files de propositions ecrites par un run), jamais du code source.
            # La cecite de reconstruction porte sur le code et sur les rapports
            # humains de campagne (docs/) — inchangee.
            repo_root / "lab" / "reports" / "forge_brick_proposals.jsonl",
            repo_root / "lab" / "reports" / "forge_bible_proposals.jsonl",
        ]
        return ctx

    # ------------------------------------------------------------------ #
    # Chemins usuels
    # ------------------------------------------------------------------ #

    @property
    def run_dir(self) -> Path:
        return self.repo_root / "lab" / "forge_runs" / self.project

    @property
    def game_dir(self) -> Path:
        return self.repo_root / "games" / self.project

    @property
    def evidence_dir(self) -> Path:
        return self.repo_root / "lab" / "forge_evidence"

    @property
    def error_journal_dir(self) -> Path:
        return self.repo_root / "lab" / "reports" / "error_journal"

    def rel(self, path: Path) -> str:
        """Chemin relatif au repo quand c'est possible, absolu sinon.

        Les transcripts vivent hors du depot : leur chemin reste absolu, ce qui
        est voulu — il faut pouvoir les relire a la main.
        """
        try:
            return str(Path(path).resolve().relative_to(self.repo_root)).replace("\\", "/")
        except ValueError:
            return str(path)

    # ------------------------------------------------------------------ #
    # Garde de cecite
    # ------------------------------------------------------------------ #

    def _check(self, path: Path) -> Path:
        resolved = Path(path).resolve()
        for root in self.allowed_roots:
            try:
                resolved.relative_to(root)
                return resolved
            except ValueError:
                continue
        self.denied_attempts.append(str(resolved))
        raise BlindnessViolation(
            f"lecture refusee hors des racines autorisees: {resolved}\n"
            f"racines: {[str(r) for r in self.allowed_roots]}"
        )

    # ------------------------------------------------------------------ #
    # Lecteurs
    # ------------------------------------------------------------------ #

    def exists(self, path: Path) -> bool:
        try:
            return self._check(path).exists()
        except BlindnessViolation:
            raise

    def read_text(self, path: Path) -> Optional[str]:
        """Lit un fichier texte. Retourne None s'il est absent (cas normal :
        toutes les tentatives de run n'ont pas les memes fichiers)."""
        resolved = self._check(path)
        if not resolved.is_file():
            return None
        self.read_paths.append(self.rel(resolved))
        return resolved.read_text(encoding=ENCODING, errors="replace")

    def read_json(self, path: Path) -> Optional[Any]:
        raw = self.read_text(path)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            LOG.warning("JSON illisible %s: %s", self.rel(path), exc)
            return None

    def read_jsonl(self, path: Path) -> Iterator[tuple[int, dict[str, Any]]]:
        """Itere (numero_de_ligne_1_indexe, objet) sur un .jsonl.

        Une ligne illisible est journalisee et sautee : une trace corrompue ne
        doit pas faire disparaitre tout le reste du fichier.
        """
        resolved = self._check(path)
        if not resolved.is_file():
            return
        self.read_paths.append(self.rel(resolved))
        with resolved.open("r", encoding=ENCODING, errors="replace") as handle:
            for lineno, line in enumerate(handle, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    LOG.warning("ligne illisible %s:%d", self.rel(resolved), lineno)
                    continue
                if isinstance(obj, dict):
                    yield lineno, obj

    def iter_files(self, root: Path, pattern: str = "*") -> list[Path]:
        """Liste recursive triee (ordre stable = reconstruction rejouable)."""
        resolved = self._check(root)
        if not resolved.is_dir():
            return []
        return sorted(resolved.rglob(pattern))

    def stat_size(self, path: Path) -> Optional[int]:
        resolved = self._check(path)
        return resolved.stat().st_size if resolved.is_file() else None

    # ------------------------------------------------------------------ #
    # Depot git — trace, pas fichier
    # ------------------------------------------------------------------ #

    def git(self, *args: str, timeout_s: int = 30) -> Optional[str]:
        """Execute une commande git de LECTURE dans le depot.

        Seules les sous-commandes de consultation sont autorisees : Observer ne
        doit jamais pouvoir muter le depot, meme par accident.
        """
        readonly = {"log", "show", "status", "rev-parse", "diff", "cat-file", "name-rev"}
        if not args or args[0] not in readonly:
            raise BlindnessViolation(f"sous-commande git non autorisee: {args!r}")
        try:
            proc = subprocess.run(
                ["git", *args],
                cwd=str(self.repo_root),
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=timeout_s,
            )
        except (OSError, subprocess.SubprocessError) as exc:
            LOG.warning("git %s a echoue: %s", " ".join(args), exc)
            return None
        if proc.returncode != 0:
            LOG.warning("git %s code=%d: %s", " ".join(args), proc.returncode, proc.stderr[:200])
            return None
        return proc.stdout
