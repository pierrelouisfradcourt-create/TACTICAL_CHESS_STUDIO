"""Driver Forge (P0.1) — la machine à états déterministe du pipeline.

Remplace la prose d'orchestration de `.claude/skills/forge/skill.md` par un
artefact EXÉCUTABLE. Le driver :

  - enchaîne les étapes du profil (`forge.dispatch.order_for_profile`) ;
  - fait passer CHAQUE étape (LLM et déterministe) par la porte
    `prepare_dispatch` (contrat validé + audit HMAC) ;
  - exécute lui-même les étapes déterministes en appelant les fonctions
    existantes (`forge_gate`, `static_oracles`, `verdict`) — jamais de
    réimplémentation ;
  - délègue les étapes LLM à un EXÉCUTEUR injecté par l'orchestrateur
    (`executor(payload, decision, context) -> {ok, output, ...}`) : le driver
    ne pense pas, n'infère pas, ne spawn aucun process ;
  - persiste l'état après chaque transition (`<run_dir>/state.json`, écriture
    atomique) et REPREND après interruption sans rejouer une étape terminée ;
  - ferme la boucle d'escalade EN CODE (`forge.escalate`, cap inchangé) ;
  - termine par le verdict agrégé signé (`verdict.json`).

Doctrine : hypothèse inconnue => BLOCKED (jamais un faux vert). Pour un JEU
(P0.2, trous I1/I2) : un vert s10a est IMPOSSIBLE sans (a) oracle code vert,
(b) garde e2e structurelle verte, (c) reçu mutation signé vert lié au code
testé (sha256 code + tests + triage) — et la preuve est RE-vérifiée contre le
code présent au moment du verdict (s12), y compris après une reprise.
Offline-capable : aucun appel LM dans ce module (même doctrine que
ceo-lane-assignment). claim_verdict: NO_CLAIM_ALLOWED.
"""
from __future__ import annotations

import json
import logging
import os
import sys
import time
from dataclasses import asdict
from pathlib import Path

import yaml

from forge.contract import ContractIncomplete
from forge.dispatch import (
    EVENT_AUTHORIZED,
    EVENT_EXECUTED,
    append_spawn_event,
    is_deterministic_step,
    order_for_profile,
    prepare_dispatch,
    spawn_proof,
)
from forge.escalate import escalation_decision, parse_agent_escalation, tier_of
from forge.gate import forge_gate
from forge.learning_memory import (
    load_current_generation,
    premortem_lessons,
    promote_manifest_lessons,
)
from forge.oracle import OracleNotFound, OracleSpec, resolve_oracle, run_oracle
from forge.mutation_proof import (
    emit_descriptor_mutation_receipt,
    emit_mutation_receipt,
    evaluate_proof_descriptor,
    mutation_scope_from_wiremap,
    run_mutation_for_game,
    run_mutation_from_descriptor,
    verify_descriptor_mutation_receipt,
    verify_mutation_receipt,
)
from forge.pool import DEFAULT_POOL_SIZE, pool_decision
from forge.product_oracle import run_product_oracle
from forge.product_oracle_godot import has_godot_capacity, run_godot_product_oracle
from forge.runtime import RUNNER_CLAUDE_BLIND, RUNNER_QWEN, route_step, run_qwen_step
from forge.standard_oracles import (
    check_budget,
    check_collisions,
    check_contract_completeness,
    check_genre_coverage,
    check_index,
    check_line_states,
    check_observable_coverage,
    check_placement,
)
from forge.static_oracles import (
    check_architecture,
    check_e2e_harness,
    check_feature_set_frozen,
    check_harness_no_hardcoded_flags,
    check_reuse_ratio_wired,
    check_search_consulted,
    check_solvability_wired,
    check_wiremap,
    frozen_features_from_wiremap,
    load_frozen_features,
    utc_iso_now,
)
from forge.studio_link import (
    DEFAULT_BUILDER_RUNS,
    DEFAULT_TELEMETRY,
    pool_stats,
    premortem,
    project_bible,
    propose_bible_entry,
    propose_brick,
    propose_capability_gap,
    record_builder_run,
    record_error,
    record_fix,
    record_telemetry,
    run_cost,
    write_journal_index,
)
from forge.verify_run import verify_run
from forge.verdict import (
    CLAIM_VERDICT,
    EVIDENCE_VERDICT,
    _verify_mapping,
    build_aggregate_verdict,
    current_git_head,
    make_signed_receipt,
    new_nonce,
    sha256_file,
    signed_aggregate_record,
)

logger = logging.getLogger(__name__)

# scripts/forge/driver.py -> parents[2] == racine du repo. Sert à décider où va le
# journal d'erreurs quand aucun chemin n'est injecté (voir _journal_target).
_REPO_ROOT = Path(__file__).resolve().parents[2]

# scripts/forge/standard/ : les trois fichiers de référence du STANDARD (jamais
# spécifiques à un jeu) consommés par s10s-oracle-standard (_run_standard_oracle).
_STANDARD_DIR = _REPO_ROOT / "scripts" / "forge" / "standard"

# Statuts d'étape. RUNNING = en cours (une étape retrouvée RUNNING à la reprise
# a été interrompue : elle est rejouée, attempts conservé — jamais silencieux).
TERMINAL_STATUSES = frozenset({"OK", "FAIL", "BLOCKED", "SKIPPED"})

# Étapes situées APRÈS le bloc d'oracles : la décision d'escalade est évaluée
# quand la boucle atteint la première d'entre elles (tous les oracles du profil
# sont alors terminaux — même point de décision que skill.md, mais en code).
_POST_ORACLE = ("s11-redteam-code", "s12-verdict")

# Profils qui suivent la topologie STANDARD (squelette figé scripts/forge/standard/ :
# tests en 07_TESTS/, wiremap en 09_WIREMAP/) — ENSEMBLE NOMMÉ, jamais une égalité de
# chaîne unique. `standard_godot` (jumeau Godot de `standard`, ratifié Pierre
# 2026-07-28, scripts/forge/dispatch.py:175) partage exactement la même topologie de
# dépôt ; l'oublier ici a fait tomber le run snake-s9p dans la branche LEGACY (voir
# ForgeDriver._standard_topology).
_STANDARD_TOPOLOGY_PROFILES = frozenset({"standard", "standard_godot"})

class ForgeDriver:
    """Machine à états d'un run Forge. Une instance = un run (run_id figé)."""

    def __init__(
        self,
        project: str,
        run_id: str,
        *,
        run_dir: Path | str,
        profile: str = "full",
        executor=None,
        src_root: Path | str | None = None,
        is_game: bool = False,
        game_dir: Path | str | None = None,
        catalog_path: Path | str | None = None,
        oracle_config: Path | str | None = None,
        key_file: Path | str | None = None,
        audit_path: Path | str | None = None,
        telemetry_path: Path | str | None = None,
        builder_runs_path: Path | str | None = None,
        journal_path: Path | str | None = None,
        journal_index_dir: Path | str | None = None,
        brick_proposals_path: Path | str | None = None,
        caps_path: Path | str | None = None,
        logic_files: list[str] | None = None,
        mutation_runner=None,
        mutation_test_argv: list[str] | None = None,
        mutation_baseline_runner=None,
        pool_size: int = DEFAULT_POOL_SIZE,
        product_oracle_runner=None,
        product_oracle_godot_runner=None,
        reference_guard_config_path: Path | str | None = None,
        reference_guard_baseline_path: Path | str | None = None,
        reference_guard_derogation_path: Path | str | None = None,
        lessons_path: Path | str | None = None,
        failure_events_path: Path | str | None = None,
        observer_runner=None,
        run_index_path: Path | str | None = None,
    ) -> None:
        self.project = project
        self.run_id = run_id
        self.profile = profile
        self.order = order_for_profile(profile)  # profil inconnu => ValueError (fail-fast)
        self.run_dir = Path(run_dir)
        self.executor = executor
        self.src_root = Path(src_root) if src_root else None
        # s10s-oracle-standard (STANDARD, curriculum de jeux) : dossier du jeu courant
        # (00_CHARTER/09_WIREMAP/...). Injectable pour les tests (même patron que
        # src_root) ; par défaut games/<project> sous la racine du repo.
        self.game_dir = Path(game_dir) if game_dir else (_REPO_ROOT / "games" / project)
        # Budget (s10s, volet check_budget) : catalogue RÉEL de briques (knowledge_base/
        # catalog.json, entry_type == "brick" — distinct des `asset`). Injectable (même
        # patron que game_dir) pour les tests ; par défaut le catalogue réel du dépôt.
        self.catalog_path = (
            Path(catalog_path) if catalog_path else (_REPO_ROOT / "knowledge_base" / "catalog.json")
        )
        self.is_game = bool(is_game)
        self.oracle_config = Path(oracle_config) if oracle_config else None
        self.key_file = Path(key_file) if key_file else None
        self.audit_path = Path(audit_path) if audit_path else None
        self.telemetry_path = Path(telemetry_path) if telemetry_path else None
        self.builder_runs_path = Path(builder_runs_path) if builder_runs_path else None
        # Connecteur 6 (journal d'erreurs) : chemin injectable comme la télémétrie
        # (best-effort, jamais bloquant). None = cible déduite par _journal_target
        # (routage par domaine studio pour un run DANS le repo ; journal local sinon).
        self.journal_path = Path(journal_path) if journal_path else None
        # Connecteur 6 (suite) : dossier d'index des journaux (studio_link.write_journal_index,
        # `reports_dir`). Injectable (tests) ; None => défaut PRODUCTION (lab/reports réel) MAIS
        # seulement pour un run RÉEL — voir _regenerate_journal_index (même discriminant que
        # _journal_target : run_dir hors dépôt = run de test = jamais d'écriture repo réelle).
        self.journal_index_dir = Path(journal_index_dir) if journal_index_dir else None
        # Le dépositaire (studio_link.propose_brick, ADR-002 §3) : chemin de la file
        # de propositions de brique. Injectable (tests) comme telemetry_path/
        # journal_path ; None => défaut PRODUCTION résolu PAR propose_brick lui-même
        # (lab/reports/forge_brick_proposals.jsonl, DEFAULT_BRICK_PROPOSALS) — même
        # patron d'injection que les autres connecteurs studio_link ci-dessus.
        self.brick_proposals_path = (
            Path(brick_proposals_path) if brick_proposals_path else None
        )
        self.caps_path = Path(caps_path) if caps_path else None
        # P0.2 — preuve mutation d'un JEU : fichiers logiques explicites (sinon
        # dérivés de la WireMap), runner injectable (défaut = forge.mutation réel).
        self.logic_files = list(logic_files) if logic_files else None
        self.mutation_runner = mutation_runner
        self.mutation_test_argv = list(mutation_test_argv) if mutation_test_argv else None
        self.mutation_baseline_runner = mutation_baseline_runner
        # n3-oracle-produit-minimal : injectable (même patron que mutation_runner)
        # pour les tests — par défaut le VRAI forge.product_oracle.run_product_oracle,
        # jamais une réimplémentation.
        self.product_oracle_runner = product_oracle_runner or run_product_oracle
        # Fournisseur GODOT (correction Pierre ①, 2026-07-29) : injectable comme
        # product_oracle_runner ci-dessus — par défaut le VRAI
        # forge.product_oracle_godot.run_godot_product_oracle, jamais une
        # réimplémentation. N'est APPELÉ qu'en présence des DEUX conditions
        # (contrat de preuve + capacité constatée) — voir _run_code_oracle.
        self.product_oracle_godot_runner = product_oracle_godot_runner or run_godot_product_oracle
        # Tier 2 #5 (Concept A) : best-of-N réactif au même tier avant d'escalader de
        # modèle. pool_size<=1 désactive le pool (chaque FAIL escalade directement).
        self.pool_size = int(pool_size)
        # Phase 1b (bibliothèque de code, 2026-07-19) : horodatage de démarrage du
        # driver — sert de référence à check_search_consulted (« une recherche a-t-elle
        # eu lieu depuis que ce run a commencé ? »). Fixé une fois, pas par tentative :
        # signal coarse mais honnête, jamais gating.
        self._driver_start_ts = utc_iso_now()
        # P0.3 : un dossier qui porte un harnais de jeu EST un jeu — l'omission du
        # flag is_game ne désarme jamais les gates (aucun chemin vers OK sans preuve).
        if not self.is_game and self.src_root is not None and any(
                (self.src_root / f).exists() for f in ("run-oracle.mjs", "e2e.mjs")):
            self.is_game = True
            logger.info("is_game auto-détecté (harnais de jeu présent dans %s)",
                        self.src_root)
        # FVL Phase 0.5, chantier reference_protected (docs/fvl/FVL_PHASE_0_5_CHARTER.md
        # §7 point 1) : chemins injectables comme telemetry_path/journal_path ci-dessus ;
        # None => défauts PRODUCTION résolus par `forge.reference_guard` lui-même (source
        # unique de ces chemins, jamais dupliqués ici). Voir `_reference_guard_check`.
        self.reference_guard_config_path = (
            Path(reference_guard_config_path) if reference_guard_config_path else None
        )
        self.reference_guard_baseline_path = (
            Path(reference_guard_baseline_path) if reference_guard_baseline_path else None
        )
        self.reference_guard_derogation_path = (
            Path(reference_guard_derogation_path) if reference_guard_derogation_path else None
        )
        # FVL Phase 0.5, étape 3 (mémoire d'apprentissage, forge.learning_memory) :
        # même patron injectable que journal_path juste au-dessus. None => cible
        # déduite par `_lessons_target` (défauts PRODUCTION réels de learning_memory
        # pour un run DANS le repo ; fichier local isolé sinon, jamais le corpus
        # partagé — voir sa docstring).
        self.lessons_path = Path(lessons_path) if lessons_path else None
        # CV-14 (lot de dégel 1, 2026-07-30) : producteur automatique de
        # FailureEvent (couche 1->2 de la doctrine Run->FailureEvent->Lesson->
        # Doctrine). Même patron injectable que `lessons_path` juste au-dessus —
        # None => cible déduite par `_failure_events_target` (défauts PRODUCTION
        # réels de `forge.learning_memory` pour un run DANS le repo ; fichier
        # local isolé sinon, jamais le corpus partagé).
        self.failure_events_path = Path(failure_events_path) if failure_events_path else None
        # P1 (Observer auto-déclenché en fin de run, post-mortem pacman 2026-08-07) :
        # injectable comme lessons_path/failure_events_path ci-dessus — un test
        # fournit un runner factice (aucun vrai sous-processus) pour couvrir
        # succès/échec/timeout sans jamais appeler le CLI Observer réel. None =>
        # comportement de PRODUCTION (`_default_observer_runner`, sous-processus
        # réel `scripts/observer/cli.py --project <projet>`).
        self.observer_runner = observer_runner or self._default_observer_runner
        # P4 (ranimer RUN_INDEX en fin de run, 2026-08-08) : chemin injectable
        # comme lessons_path/failure_events_path ci-dessus. À LA DIFFÉRENCE de
        # ces derniers, RUN_INDEX.md est un fichier CANONIQUE UNIQUE du dépôt
        # (pas de routage par domaine, pas d'isolation implicite pour un
        # run_dir hors dépôt) — voir `_run_index_target` : sans injection
        # explicite, le défaut PRODUCTION est toujours le même fichier réel.
        self.run_index_path = Path(run_index_path) if run_index_path else None
        self.state_path = self.run_dir / "state.json"
        self._premortem_cache: list[str] | None = None
        # s0-contrat mandatory_read (contracts/s0-contrat.yaml l.26) : "la Project
        # Bible du projet si elle existe, via studio_link.project_bible". Même
        # patron de cache que le pré-mortem (calculée une fois, pas par tentative :
        # une bible ne change pas au cours d'un run).
        self._bible_cache: str | None = None

    # --- boucle principale -------------------------------------------------

    def run(self) -> dict:
        """Exécute (ou REPREND) le run jusqu'au verdict signé, ou HALTED honnête."""
        self.run_dir.mkdir(parents=True, exist_ok=True)
        self._reference_guard_check("open")
        # P3 (lot dégel 2) : persiste les logs de CE run sur disque (<run_dir>/
        # run.log) — best-effort strict, jamais bloquant (voir la docstring de
        # `_attach_run_log_handler`). `try/finally` couvre TOUS les points de
        # retour ci-dessous (idempotent DONE, HALTED précoce, HALTED en boucle,
        # DONE final) : le handler est toujours détaché, jamais laissé ouvert.
        log_handler, log_previous_level = self._attach_run_log_handler()
        try:
            state, refus = self._load_state()
            if state is None:
                return self._halted_report(refus, state_known=False)
            if state.get("run_status") == "DONE":
                self._regenerate_journal_index()
                return self._final_report(state)  # idempotent : rien à rejouer
            if state.get("run_status") == "FROZEN_HUMAN":
                # Gel explicite (décision Pierre 2026-08-03) : un run FROZEN_HUMAN
                # n'est ni DONE ni HALTED — arrêté par décision humaine, pas par le
                # code. Le driver REFUSE de le reprendre automatiquement (pas de
                # replay, pas de compte comme échec) tant qu'un dégel explicite
                # (retrait de run_status=FROZEN_HUMAN du state.json) n'a pas eu lieu.
                return self._frozen_report(state)

            state["run_status"] = "RUNNING"
            state.pop("reason", None)
            first_post = next((e for e in self.order if e in _POST_ORACLE), None)
            while True:
                etape = next(
                    (e for e in self.order
                     if state["steps"][e]["status"] not in TERMINAL_STATUSES),
                    None,
                )
                if etape is None:
                    break
                if etape == first_post and self._maybe_escalate(state):
                    continue  # s9 + oracles remis à PENDING — la boucle les rejoue
                if is_deterministic_step(etape):
                    self._run_deterministic(state, etape)
                elif not self._run_llm(state, etape):
                    # R1'' (GO Pierre 2026-08-13) : la promotion des lessons tourne
                    # AUSSI sur le chemin HALTED — prouvé nécessaire en vivo (run
                    # p2a-return-snapshot : premier `return.reason.DISCOVERED` réel
                    # du dépôt, signé au manifeste et jamais promu parce que la
                    # promotion ne vivait que sur le chemin DONE, l.~407). Les
                    # leçons des échecs sont précisément les plus précieuses.
                    # Même appel best-effort strict que le chemin DONE, aucune
                    # modification de `promote_manifest_lessons` ni de ses critères.
                    self._promote_manifest_lessons_best_effort()
                    # R1''' (GO Pierre 2026-08-14) : RUN_INDEX reçoit AUSSI les runs
                    # HALTED. Même motif que R1'' et même patron : `_append_run_index_
                    # best_effort` n'avait qu'UN appelant, sur le chemin DONE (l.~419)
                    # — le registre des runs ne connaissait donc que les succès.
                    # Mesuré : `p1_3_exclusivity` (le run qui a RÉVÉLÉ la panne
                    # s2-worldscan) a un state.json sur disque et AUCUNE entrée à
                    # l'index. Portée volontairement limitée à CE point de sortie :
                    # les trois autres (state absent, reprise idempotente d'un DONE,
                    # FROZEN_HUMAN) ne sont pas des runs neufs et restent inchangés.
                    # Idempotence déjà portée par le writer (recherche de l'en-tête
                    # `## <run_id> —` avant écriture) : reprendre un run HALTED puis
                    # le mener à DONE n'ajoute jamais de seconde entrée.
                    report = self._halted_report(state.get("reason", ""))
                    self._append_run_index_best_effort(report)
                    return report
            state["run_status"] = "DONE"
            self._save(state)
            self._regenerate_journal_index()
            self._promote_manifest_lessons_best_effort()
            self._trigger_observer_best_effort(state)
            report = self._final_report(state)
            self._append_run_index_best_effort(report)
            return report
        finally:
            self._detach_run_log_handler(log_handler, log_previous_level)

    def _attach_run_log_handler(self):
        """P3 (lot dégel 2) : le WHY d'une escalade (et tout le reste loggé par la
        chaîne `forge.*`) ne portait QUE sur `logger.info`/`logger.warning` —
        AUCUN `FileHandler` n'existait, donc rien ne survivait à la disparition
        du process (console non capturée, ou perdue). Attache un `FileHandler`
        best-effort vers `<run_dir>/run.log` (encodage utf-8 explicite) au
        logger racine du paquet `forge` (parent de `forge.driver`/
        `forge.dispatch`/... — chaque module fait `logging.getLogger(__name__)`,
        donc `forge.<module>` propage vers `forge`) : capture donc AUSSI ce qui
        est déjà loggé ailleurs (ex. `dispatch.prepare_dispatch`), sans dupliquer
        de code de log. Mode append par défaut de `FileHandler` : un run REPRIS
        (même run_dir) continue le même fichier, jamais un écrasement.

        JAMAIS bloquant : une exception à l'ouverture (disque plein, permission,
        chemin invalide) est tracée puis avalée — le run démarre quand même,
        seule la persistance fichier des logs est perdue (comportement identique
        à avant ce lot). Retourne ``(handler, niveau_precedent)`` — ``(None, None)``
        si l'ouverture a échoué, à repasser tel quel à `_detach_run_log_handler`.
        """
        try:
            handler = logging.FileHandler(self.run_dir / "run.log", encoding="utf-8")
            handler.setLevel(logging.INFO)
            handler.setFormatter(logging.Formatter(
                "%(asctime)s %(levelname)s %(name)s: %(message)s"))
            forge_logger = logging.getLogger("forge")
            previous_level = forge_logger.level
            if previous_level == logging.NOTSET or previous_level > logging.INFO:
                forge_logger.setLevel(logging.INFO)
            forge_logger.addHandler(handler)
            logger.info("run.log ouvert pour run=%s -> %s", self.run_id, handler.baseFilename)
            return handler, previous_level
        except OSError:
            logger.warning("run.log non attaché pour run=%s (non bloquant)",
                           self.run_id, exc_info=True)
            return None, None

    def _detach_run_log_handler(self, handler, previous_level) -> None:
        """Symétrique de `_attach_run_log_handler` : retire le handler et restaure
        le niveau précédent du logger `forge` — jamais bloquant, même à la
        fermeture (un disque qui devient indisponible entre l'ouverture et la
        fermeture ne doit pas faire échouer un run déjà terminé)."""
        if handler is None:
            return
        try:
            forge_logger = logging.getLogger("forge")
            forge_logger.removeHandler(handler)
            if previous_level is not None:
                forge_logger.setLevel(previous_level)
            handler.close()
        except Exception:  # noqa: BLE001 — jamais bloquant, même à la fermeture
            logger.warning("run.log non détaché proprement pour run=%s (non bloquant)",
                           self.run_id, exc_info=True)

    def _regenerate_journal_index(self) -> None:
        """Connecteur 6 (suite) : régénère lab/reports/error_journal/INDEX.generated.md
        (studio_link.write_journal_index) à la fin d'un run, pour que le journal
        d'erreurs devienne lisible par un HUMAIN — pas seulement relu par le
        pré-mortem à l'intérieur d'un prompt LLM.

        JAMAIS bloquant (même garantie que la télémétrie/journal) : une écriture
        qui échoue (disque, permission, dossier absent) est tracée en log, jamais
        propagée — un run déjà terminé ne doit jamais échouer sur cette écriture
        secondaire.

        Ne s'exécute, par défaut, QUE pour un run RÉEL — même discriminant que
        `_journal_target()` (run_dir SOUS le dépôt). Un run de test (run_dir hors
        dépôt, ex. `tmp_path` pytest) n'écrit donc jamais dans le dépôt réel — sans
        cette garde, chacun des centaines de runs de la suite de tests écrirait
        dans lab/reports/error_journal/ du worktree à chaque exécution de pytest.
        `journal_index_dir` injecté PRIME toujours sur ce discriminant (tests qui
        veulent exercer explicitement l'écriture, vers un dossier tmp)."""
        if self.journal_index_dir is None:
            try:
                self.run_dir.resolve().relative_to(_REPO_ROOT)
            except ValueError:
                return  # run hors dépôt (test) : rien à régénérer
        try:
            write_journal_index(reports_dir=self.journal_index_dir)
        except OSError:
            logger.warning("index des journaux non régénéré pour %s (non bloquant)",
                           self.run_id)

    def _promote_manifest_lessons_best_effort(self) -> None:
        """Pont manifest -> lesson (post-mortem pacman 2026-08-07, lot A réparation 2,
        `forge.learning_memory.promote_manifest_lessons`) : lit `self.run_dir/context/
        *.manifest.jsonl` et promeut chaque `reason.problem`/`reason.root_cause`
        distinct en leçon CANDIDATE — fermeture du maillon mesuré CASSÉ (0 promotion
        pour les 15 causes racines P1-P6 des lots V3-V6 pacman, alors que le Context
        Manifest les portait déjà, signées HMAC).

        Cible : `self._lessons_target()`, MÊME discriminant que `_premortem_lessons`/
        `_journal_error` (None => défaut PRODUCTION résolu par `learning_memory` pour
        un run réel sous le dépôt ; fichier local isolé pour un run de test hors
        dépôt) — jamais un chemin inventé ici.

        Appelée UNE SEULE fois, en fin de run réussi (jamais en boucle, jamais sur la
        relecture idempotente d'un run déjà DONE) : `promote_manifest_lessons` est
        elle-même idempotente (lesson_id dérivé du contenu), un second appel
        n'ajoute donc jamais de doublon même si cette méthode était rappelée.

        BEST-EFFORT **NON SILENCIEUX** (exigence explicite du lot, distincte du
        best-effort silencieux du reste de cette classe) : un échec est journalisé en
        `logger.warning` avec la trace complète (`exc_info=True`), jamais avalé sans
        trace — une promotion manquée est un défaut de la boucle d'apprentissage,
        elle doit rester VISIBLE dans les logs même si elle ne bloque jamais le run.
        """
        try:
            written = promote_manifest_lessons(self.run_dir, lessons_path=self._lessons_target())
            if written:
                logger.info(
                    "run=%s : %d leçon(s) promue(s) depuis les manifests -> %s",
                    self.run_id, len(written), [w["lesson_id"] for w in written],
                )
        except Exception:  # noqa: BLE001 — best-effort NON SILENCIEUX : journalisé, jamais bloquant
            logger.warning(
                "run=%s : promotion manifest->lesson en échec (non bloquant, "
                "boucle d'apprentissage dégradée pour ce run)",
                self.run_id, exc_info=True,
            )

    def _default_observer_runner(self, project: str):
        """Comportement de PRODUCTION de `observer_runner` : `scripts/observer/
        cli.py --project <projet>`, exécuté depuis la racine du dépôt (chemins
        relatifs de l'Observer), avec `sys.executable` (jamais un chemin de
        python en dur — le venv actif peut différer d'une machine à l'autre).
        `timeout=300` s : l'Observer sur un gros projet tourne ~2 min, 300s
        laisse de la marge sans bloquer indéfiniment un run déjà terminé.

        Délègue le lancement à `forge.oracle.run_oracle` — même mécanisme déjà
        utilisé par l'étape déterministe s10a — plutôt que de lancer un process
        ici : `test_driver_ne_spawn_pas_directement` (test EXISTANT, zone
        protégée, jamais touché par ce lot) impose que `driver.py` reste une
        machine à états pure, offline-capable ; le spawn de process appartient
        à `oracle.py`, jamais au driver lui-même. `run_oracle` ne lève déjà
        jamais sur timeout (retourne `returncode=-2`), donc le comportement
        best-effort de `_trigger_observer_best_effort` ci-dessous reste valable
        tel quel avec cette délégation."""
        spec = OracleSpec(
            project=f"observer-{project}",
            cwd=_REPO_ROOT,
            command=[sys.executable, "scripts/observer/cli.py", "--project", project],
        )
        return run_oracle(spec, evidence_dir=self.run_dir / "evidence", timeout=300)

    def _trigger_observer_best_effort(self, state: dict) -> None:
        """P1 (post-mortem pacman 2026-08-07) : déclenche l'Observer automatiquement
        en fin de run réussi, juste après `_promote_manifest_lessons_best_effort`
        (même point de fin de run). Le verdict signé (`s12-verdict`) est déjà écrit
        quand cette méthode tourne : elle ne doit JAMAIS invalider un run — best
        effort STRICT vis-à-vis de `run_status`/`software_verdict`, jamais de
        `raise` qui remonte à `run()`.

        MAIS l'échec n'est jamais silencieux (exigence distincte du best-effort
        habituel de cette classe, même patron que `_promote_manifest_lessons_best_effort`) :
        - `logger.warning(..., exc_info=True)` dans `run.log` (visible, tracé) ;
        - `state["transition"]` persisté dans state.json via `self._save` : "OK" en
          succès, "INCOMPLETE: <raison courte>" en échec (returncode non nul,
          timeout, ou toute autre exception) — un opérateur qui relit state.json
          voit l'incomplétude sans avoir à parser run.log.

        `self.observer_runner` est injectable (constructeur, même patron que
        `lessons_path`/`failure_events_path`) : les tests fournissent un runner
        factice, aucun vrai sous-processus Observer n'est jamais lancé par la
        suite de tests."""
        logger.info(
            "Observer: déclenchement project=%s run=%s", self.project, self.run_id,
        )
        start = time.monotonic()
        try:
            result = self.observer_runner(self.project)
            if result.returncode != 0:
                raise RuntimeError(
                    f"observer cli.py returncode={result.returncode}"
                )
            duration = time.monotonic() - start
            logger.info(
                "Observer: terminé project=%s run=%s en %.2fs (returncode=0)",
                self.project, self.run_id, duration,
            )
            state["transition"] = "OK"
        except Exception as exc:  # noqa: BLE001 — best-effort NON SILENCIEUX : jamais bloquant, toujours journalisé
            # Capture TOUTE exception (returncode non nul levé juste au-dessus en
            # RuntimeError, timeout d'un runner injecté par un test, ou toute
            # autre panne d'un `observer_runner` custom) — un seul chemin de
            # sortie, jamais de raise qui remonte à `run()`.
            duration = time.monotonic() - start
            logger.warning(
                "Observer: échec pour project=%s run=%s en %.2fs (non bloquant, "
                "verdict déjà signé — jamais invalidé) : %s",
                self.project, self.run_id, duration, exc, exc_info=True,
            )
            state["transition"] = f"INCOMPLETE: {exc}"
        self._save(state)

    def _run_index_target(self) -> Path:
        """P4 (ranimer RUN_INDEX en fin de run, 2026-08-08) : cible de
        `lab/forge_runs/RUN_INDEX.md` pour CET appel — MÊME patron d'injection
        que `_lessons_target`/`_journal_target` (chemin explicite injecté au
        constructeur => ce fichier exact, jamais le vrai).

        À LA DIFFÉRENCE de ces deux-là : RUN_INDEX.md est un fichier CANONIQUE
        UNIQUE du dépôt (déclaré append-only dans son propre en-tête depuis le
        2026-07-26), pas un journal routé par domaine — il n'existe donc AUCUNE
        isolation implicite pour un `run_dir` hors dépôt (contrairement à
        `_journal_target`/`_lessons_target`, qui retombent sur un fichier LOCAL
        au run_dir dans ce cas). Sans `run_index_path` injecté, le défaut est
        TOUJOURS le fichier réel du dépôt — c'est pourquoi les tests de ce lot
        DOIVENT injecter une copie, jamais compter sur une isolation
        automatique par run_dir hors dépôt.

        GARDE PYTEST (incident P4 précédent, revert Pierre) : si aucun
        `run_index_path` n'est injecté ET que `PYTEST_CURRENT_TEST` est
        présent (positionné par pytest lui-même pendant l'exécution d'un
        test), refuse EXPLICITEMENT plutôt que de retomber silencieusement
        sur le vrai fichier — c'est exactement le défaut mesuré (3 lignes
        polluantes écrites dans le registre de production par les fixtures
        du lot précédent, dont un run_id RÉEL de snake réétiqueté). La levée
        est capturée par l'appelant best-effort (`_append_run_index_best_effort`)
        qui la journalise en `logger.warning(..., exc_info=True)` — jamais une
        redirection silencieuse, jamais une exception qui remonte au run. Un
        run RÉEL (hors pytest, `PYTEST_CURRENT_TEST` absent) n'est jamais
        concerné par cette garde."""
        if self.run_index_path is not None:
            return self.run_index_path
        if os.environ.get("PYTEST_CURRENT_TEST"):
            raise RuntimeError(
                "run_index_path non injecté sous pytest "
                f"(PYTEST_CURRENT_TEST={os.environ['PYTEST_CURRENT_TEST']!r}) — "
                "refus d'écrire dans le registre réel lab/forge_runs/RUN_INDEX.md "
                "(garde P4, incident du lot précédent : jamais de redirection "
                "silencieuse)"
            )
        return _REPO_ROOT / "lab" / "forge_runs" / "RUN_INDEX.md"

    def _append_run_index_best_effort(self, report: dict) -> None:
        """P4 (ranimer RUN_INDEX en fin de run, post-mortem pacman 2026-08-07) :
        `lab/forge_runs/RUN_INDEX.md` s'est déclaré append-only le 2026-07-26
        (« une entrée par run, jamais réécrite ») puis s'est arrêté le
        2026-07-28 (dernière entrée `snake-20260728-091302`, ~41 runs
        postérieurs absents). Appelée juste après `_trigger_observer_best_effort`
        (même point de fin de run — même patron), sur le REPORT déjà calculé par
        `_final_report` (verdict déjà signé, jamais recalculé ici).

        Réutilise EXACTEMENT le format d'en-tête existant du fichier (§« Format
        d'une entrée », lignes 10-23 : `## <run_id> — <date>`) — n'invente
        aucune mise en page nouvelle. Périmètre verrouillé par Pierre, RIEN
        D'AUTRE que : run_id (dans l'en-tête), timestamp RÉEL, projet, statut,
        verdict — pas les champs narratifs (mission/objectif/décisions
        liées/instruments/critères AVANT/erreurs/apprentissages/actions
        suivantes) du gabarit humain : ces champs restent l'écriture d'un
        agent/humain sur un run analysé, pas un ajout mécanique en fin de run.

        Best-effort **NON SILENCIEUX** (même exigence que
        `_promote_manifest_lessons_best_effort`/`_trigger_observer_best_effort`
        juste au-dessus) : une exception (fichier verrouillé, chemin invalide,
        permission, disque plein) est journalisée en
        `logger.warning(..., exc_info=True)`, JAMAIS levée — le verdict est
        déjà signé quand cette méthode tourne, elle ne doit jamais l'invalider.
        Décision explicite (contrairement à `_trigger_observer_best_effort`) :
        AUCUN état n'est persisté dans `state.json` en cas d'échec — cet index
        est un confort de lecture humaine, pas une transition inter-run ; son
        échec est tracé en log, pas dans l'état du run.

        Idempotent sur `run_id` — jamais sur un numéro de ligne (le studio a
        déjà mesuré deux fois, cf. mémoire studio, qu'une identité fondée sur
        la position est invalidée par tout décalage) : recherche l'en-tête
        exact `## {run_id} —` dans le fichier AVANT d'écrire ; s'il est déjà
        présent, ne rajoute rien (rejouer le même run n'ajoute jamais de
        doublon)."""
        try:
            path = self._run_index_target()
            header_prefix = f"## {self.run_id} —"
            existing = path.read_text(encoding="utf-8") if path.exists() else ""
            if any(line.startswith(header_prefix) for line in existing.splitlines()):
                return  # déjà présent — idempotent sur run_id, jamais un doublon
            now = time.time()
            date = time.strftime("%Y-%m-%d", time.gmtime(now))
            ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))
            statut = report.get("status", "")
            verdict = report.get("software_verdict", "")
            entry = (
                f"\n## {self.run_id} — {date}\n"
                f"résultat         : projet={self.project} · statut={statut} · "
                f"verdict={verdict} · ts={ts}\n"
            )
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, "a", encoding="utf-8") as fh:
                fh.write(entry)
        except Exception:  # noqa: BLE001 — best-effort NON SILENCIEUX : journalisé, jamais bloquant
            logger.warning(
                "run=%s : entrée RUN_INDEX non écrite (non bloquant, index de "
                "confort humain dégradé pour ce run)",
                self.run_id, exc_info=True,
            )

    def _reference_guard_check(self, phase: str) -> None:
        """Câblage ADVISORY (FVL Phase 0.5, chantier `reference_protected` —
        docs/fvl/FVL_PHASE_0_5_CHARTER.md §7 point 1, docs/forge/FORGE_EVOLUTION_DOCTRINE_V0.md
        §1.1/§1.2) : vérifie l'empreinte des arbres protégés (games/pong/**, tests/**)
        à l'OUVERTURE (`run()`, avant `_load_state`) et à la CLÔTURE (`_final_report`,
        les deux chemins DONE — idempotent et fraîchement terminé) d'un run.

        `phase` ∈ {"open", "close"} — consigné tel quel, jamais interprété ici.

        AUCUN gate, AUCUN verdict modifié : le résultat est seulement APPENDÉ à
        `<run_dir>/reference_guard.jsonl` (même patron JSONL append-only que la
        télémétrie). Best-effort STRICT : `reference_guard.advisory_check` ne lève
        déjà jamais (même garantie que `learning_hook.record_learning_for_subject`),
        et cet appel est ENVELOPPÉ ICI EN PLUS par défense en profondeur (même patron
        que `_record_learning_advisory`) — une exception dans l'écriture du fichier
        consigné (disque plein, permission...) ne doit JAMAIS faire échouer un run,
        y compris un run déjà terminé côté oracle/verdict.

        Un run de TEST (`run_dir` hors dépôt, ex. `tmp_path` pytest) écrit son propre
        `reference_guard.jsonl` sous `run_dir` — jamais dans le dépôt réel, puisque
        `run_dir` lui-même est déjà l'isolation (aucun discriminant supplémentaire requis
        ici, à la différence de `_regenerate_journal_index`)."""
        try:
            from forge import reference_guard
            report = reference_guard.advisory_check(
                phase,
                config_path=self.reference_guard_config_path,
                baseline_path=self.reference_guard_baseline_path,
                derogation_path=self.reference_guard_derogation_path,
            )
            report["run_id"] = self.run_id
            path = self.run_dir / "reference_guard.jsonl"
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, "a", encoding="utf-8") as fh:
                fh.write(json.dumps(report, ensure_ascii=False, sort_keys=True) + "\n")
        except Exception:
            logger.warning(
                "reference_guard (%s) non consigné pour run=%s (advisory, non bloquant)",
                phase, self.run_id, exc_info=True,
            )

    # --- état persistant ----------------------------------------------------

    def _load_state(self) -> tuple[dict | None, str]:
        """Charge ou initialise state.json. Discordance => refus SANS écraser."""
        if self.state_path.exists():
            try:
                state = json.loads(self.state_path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                return None, "state.json illisible — refus d'écraser (hypothèse inconnue = BLOCKED)"
            if state.get("run_id") != self.run_id:
                return None, (
                    f"state.json appartient au run {state.get('run_id')!r} != "
                    f"{self.run_id!r} — refus d'écraser (hypothèse inconnue = BLOCKED)"
                )
            if state.get("profile") != self.profile:
                return None, (
                    f"state.json porte le profil {state.get('profile')!r} != "
                    f"{self.profile!r} — refus (hypothèse inconnue = BLOCKED)"
                )
            # P0.2/P0.3 (bypass CONFIRMÉS en revue adversariale, reproduits) :
            # is_game est une propriété du RUN, pas de l'appelant, et le state.json
            # n'est PAS signé (éditable). La game-ness est donc re-dérivée de TOUS
            # les signaux objectifs on-disk (flag param, flag state, marqueurs du
            # reçu code, harnais src_root, fichier d'évidence mutation) — et
            # NON-DOWNGRADABLE : flipper is_game=false dans le state ne suffit pas
            # à désarmer les gates tant qu'un autre signal subsiste.
            self.is_game = self._effective_is_game(state)
            state["is_game"] = self.is_game
            steps = state.setdefault("steps", {})
            for e in self.order:
                steps.setdefault(e, {"status": "PENDING", "attempts": 0})
            if state.get("run_status") != "DONE":
                # Reprise : une étape interrompue (RUNNING) ou bloquée (BLOCKED,
                # ex. exécuteur absent) redevient rejouable. attempts est conservé :
                # le retry est TRACÉ, jamais silencieux. OK/FAIL/SKIPPED restent
                # acquis (jamais de re-exécution d'une étape signée).
                for st in steps.values():
                    if st.get("status") in ("RUNNING", "BLOCKED"):
                        st["status"] = "PENDING"
            return state, ""
        return (
            {
                "run_id": self.run_id,
                "project": self.project,
                "profile": self.profile,
                "is_game": self.is_game,
                "escalations": 0,
                "model_override": None,
                "run_status": "RUNNING",
                "created_ts": time.time(),
                "steps": {e: {"status": "PENDING", "attempts": 0} for e in self.order},
                # Budget (s10s, check_budget) : instantané des brick_id du catalogue AU
                # DÉMARRAGE du run — pas recalculable après coup, donc capturé une seule
                # fois ici (jamais réécrit à la reprise, cf. `if self.state_path.exists()`
                # ci-dessus qui retourne AVANT ce bloc). None = catalogue illisible au
                # démarrage : l'oracle budget se déclare alors NON MESURÉ, jamais vert
                # par défaut (cf. `_run_standard_oracle`).
                "catalog_brick_ids_snapshot": self._catalog_brick_ids_snapshot(),
            },
            "",
        )

    def _save(self, state: dict) -> None:
        """Écriture atomique (tmp + replace) : un kill en plein write ne corrompt pas."""
        state["updated_ts"] = time.time()
        self.run_dir.mkdir(parents=True, exist_ok=True)
        tmp = self.state_path.with_name("state.json.tmp")
        tmp.write_text(
            json.dumps(state, ensure_ascii=False, sort_keys=True, indent=1),
            encoding="utf-8",
        )
        os.replace(tmp, self.state_path)

    # --- preuve d'exécution (DISPATCH_SPAWN_AUTHORITY_V1) ---------------------

    def _record_spawn_executed(self, etape: str, attempt: int, payload=None) -> None:
        """Écrit `spawn_authorized` PUIS `spawn_executed` — CHEMIN B (headless / driver).

        Le hook PostToolUse ne voit que les spawns passés par l'outil `Task` (chemin A,
        orchestrateur interactif). Un run headless (`run_real.py` -> `claude -p`, ou
        tout exécuteur injecté) n'est PAS un appel d'outil Task : aucun hook PreToolUse/
        PostToolUse ne se déclenche. Sans cet appel en code, la preuve d'AUTORISATION
        n'existerait que sur le chemin A — exactement le trou mesuré (post-mortem pacman
        2026-08-07, lot A réparation 3) : `spawn_authorized` 0/1418 tous chemins confondus.

        RÉPARATION : ce chemin (B) EST sa propre autorité d'autorisation — il n'existe
        aucun garde PreToolUse distinct à côté de lui qui pourrait l'écrire séparément
        (contrairement au chemin A, où `.claude/hooks/pretool_forge_guard.py` autorise
        puis un hook PostToolUse distinct exécute). `append_spawn_event(EVENT_AUTHORIZED)`
        est donc écrit ICI, juste avant `EVENT_EXECUTED`, dans le MÊME appel — l'invariant
        `executed ⇒ authorized` (forge.audit.check_spawn_invariant) reste vrai par
        construction : aucune ligne `spawn_executed` de ce chemin n'est jamais écrite sans
        que la ligne `spawn_authorized` correspondante précède dans le fichier.

        Appelée UNIQUEMENT après le RETOUR RÉEL de l'exécution (jamais avant) : c'est
        ce qui la distingue de `spawn_prepared`. Best-effort (`append_spawn_event` ne
        lève jamais) — une preuve non écrite n'a jamais le droit de casser un run.

        Clé de signature : la clé d'audit PAR DÉFAUT, comme `prepare_dispatch`. Surtout
        PAS `self.key_file` (clé de VERDICT, distincte) — signer l'audit avec une autre
        clé rendrait la ligne invérifiable par le garde et par `spawn_proof`.
        """
        common = dict(
            model=getattr(payload, "model", "") or "",
            provider=getattr(payload, "provider", "") or "",
            allowed_tools=tuple(getattr(payload, "allowed_tools", ()) or ()),
            audit_path=self.audit_path,
        )
        append_spawn_event(EVENT_AUTHORIZED, etape, self.run_id, attempt, **common)
        append_spawn_event(EVENT_EXECUTED, etape, self.run_id, attempt, **common)


    # --- Activation Lineage (P2, doctrine FORGE_CAUSAL_LINEAGE_V2 §2) ---------
    def _activation_reason(self, state: dict, entry: dict, etape: str) -> dict:
        """Cause d'activation de CETTE etape, au format cause de la doctrine.

        Regle absolue : ne JAMAIS inventer. Quand aucune cause n'est mesuree —
        cas de la premiere activation, ou le driver enchaine simplement l'ordre
        du profil — on emet `status: NOT_TRANSMITTED` plutot qu'une cause
        fabriquee. Une cause inventee est une violation de causalite, meme
        famille qu'un `validated_by` fabrique (incident du 2026-08-03).

        Point de perte que ceci repare (mesure 2026-08-06) : l'escalade CONNAIT
        sa cause (oracle rouge, ESCALATE_REQUEST de l'agent) puis re-dispatche
        par ce meme chemin, qui ecrasait tout avec le litteral "ordre de profil".
        41 dispatches mesures, 31 portaient ce litteral, 1 seule cause reelle.
        """
        attempts = int(entry.get("attempts", 1) or 1)
        override = state.get("model_override")
        if attempts <= 1 and not override:
            # Enchainement mecanique du profil : aucun probleme mesure ne l'a
            # declenche. On le DIT, on ne le maquille pas en cause.
            return {"status": "NOT_TRANSMITTED", "action": etape}
        return {
            "problem": f"echec de la tentative {attempts - 1} a {etape}",
            "oracle": entry.get("last_oracle"),
            "root_cause": entry.get("last_root_cause"),
            "action": etape,
            "expected_proof": entry.get("expected_proof"),
        }

    # --- étapes LLM (déléguées à l'exécuteur) --------------------------------

    def _run_llm(self, state: dict, etape: str) -> bool:
        """Retourne False si le run doit HALTER (exécuteur absent/en échec)."""
        entry = state["steps"][etape]
        entry["attempts"] = entry.get("attempts", 0) + 1
        entry["status"] = "RUNNING"
        entry["ts"] = time.time()
        self._save(state)  # persisté AVANT l'appel : un crash laisse RUNNING (reprise)

        try:
            # run_dir=self.run_dir (0.5.a, routage explicite ratifié) : le driver
            # CONNAÎT son run_dir, il n'a plus à laisser prepare_dispatch retomber
            # sur context_manifest.default_run_dir(run_id) — dérivation qui échoue
            # (None -> _orphan_context/) dès qu'un run_id dépasse <projet>-<date>.
            # model_executed=state.get("model_override") (0.5.d) : None hors
            # escalade (la ligne 'dispatch' du Context Manifest reste alors
            # model_executed == model, aucune ambiguïté) ; le modèle d'escalade
            # sinon — même résolution que le journal/la télémétrie plus bas
            # (`state.get("model_override") or payload.model`), appliquée ici au
            # niveau de la porte puisque c'est elle qui écrit la ligne signée.
            payload = prepare_dispatch(
                etape, self.run_id, caps_path=self.caps_path, audit_path=self.audit_path,
                run_dir=self.run_dir, profile=self.profile, attempt=entry["attempts"],
                model_executed=state.get("model_override"),
                # P5 (lot dégel 2) : le driver enchaîne STRICTEMENT le profil
                # (`order_for_profile`, aucun agent ne choisit l'étape suivante) —
                # aucune autre source de WHY dynamique dans ce lot, donc le même
                # motif littéral aux deux points d'appel (voir _run_deterministic).
                reason=self._activation_reason(state, entry, etape),
            )
        except ContractIncomplete as exc:
            # `payload` n'existe pas encore (prepare_dispatch a levé avant de le
            # rendre) : aucun payload.model connu, la résolution retombe sur le
            # seul model_override (souvent absent ici aussi) — jamais un crash.
            return self._halt_step(state, entry, f"contrat non activable à {etape}: {exc}",
                                   etape=etape)

        decision = route_step(payload)
        runner, reviewer, qwen_ok = decision.runner, decision.reviewer, False
        output: str | None = None
        blocked, findings = False, []
        tokens, duration, cost_usd = 0, 0.0, 0.0
        # CV-8 : zéro par défaut (Qwen n'expose pas de cache Claude — un ZÉRO
        # MESURÉ, pas une case vide), écrasé plus bas seulement sur le chemin
        # exécuteur réel (`res` porte les champs quand `_claude_call_raw` a tourné).
        cache_creation_tokens, cache_read_tokens = 0, 0

        if decision.runner == RUNNER_QWEN:
            res = run_qwen_step(payload)
            if res["ok"]:
                output, reviewer, qwen_ok = res["output"], res["reviewer"], True
                # L'exécution a réellement eu lieu ET rendu un résultat : preuve d'action.
                self._record_spawn_executed(etape, entry["attempts"], payload)
            else:
                runner, reviewer = RUNNER_CLAUDE_BLIND, res["reviewer"]

        if output is None:
            if self.executor is None:
                # Halt AVANT tout appel LLM (cas limite du protocole M1) :
                # tokens=0 est un ZÉRO MESURÉ (aucun appel n'a eu lieu), pas une
                # case vide — `payload` est déjà connu ici (prepare_dispatch a
                # réussi), donc `payload.model` résout correctement le champ.
                return self._halt_step(
                    state, entry,
                    f"aucun exécuteur LLM fourni au driver — étape {etape} "
                    "inexécutable (hypothèse inconnue = BLOCKED)",
                    etape=etape, payload=payload,
                )
            context = {
                "run_id": self.run_id,
                "project": self.project,
                "run_dir": str(self.run_dir),
                "model_override": state.get("model_override"),
                "dispatch_marker": f"FORGE_DISPATCH:{etape}:{self.run_id}:{entry['attempts']}",
                "attempt": entry["attempts"],
                "premortem": self._premortem(),
                # s0-contrat SEULEMENT (contrat s0 §2 mandatory_read) : "" pour
                # toute autre étape — un contexte non-s0 ne doit RIEN changer
                # (project_bible falsy => run_real n'injecte aucune section).
                "project_bible": self._project_bible() if etape == "s0-contrat" else "",
            }
            res = self.executor(payload, decision, context)
            # Preuve d'action AVANT de juger le retour : un exécuteur qui rend `ok:False`
            # (timeout `claude -p`, sortie invalide) A TOUT DE MÊME ÉTÉ EXÉCUTÉ. La ligne
            # atteste le SPAWN, pas sa réussite — le verdict, lui, reste ailleurs.
            self._record_spawn_executed(etape, entry["attempts"], payload)
            if not isinstance(res, dict) or not res.get("ok"):
                why = res.get("reason", "sans raison") if isinstance(res, dict) else "retour invalide"
                # `res` peut porter des tokens/coût/durée RÉELS même en échec
                # (ex. timeout claude -p, FIR-01 : `duration_s` connu, `tokens`
                # jamais parsé) — transmis pour que la ligne HALT porte ce qui a
                # été MESURÉ, jamais un silence total sur un échec coûteux.
                return self._halt_step(state, entry, f"exécuteur LLM en échec à {etape}: {why}",
                                       etape=etape, payload=payload,
                                       res=res if isinstance(res, dict) else None)
            output = str(res.get("output", ""))
            blocked = bool(res.get("blocked", False))
            findings = list(res.get("findings", []))
            tokens = int(res.get("tokens", 0))
            duration = float(res.get("duration_s", 0.0))
            cost_usd = float(res.get("cost_usd", 0.0))
            # CV-8 (lot de dégel 1, 2026-07-30) : champs frères de `tokens`/`cost_usd`,
            # même seam — `run_real._claude_call_raw` les porte désormais dans `res`
            # (0 par défaut sur un exécuteur injecté qui ne les rend pas, jamais None).
            cache_creation_tokens = int(res.get("cache_creation_tokens", 0) or 0)
            cache_read_tokens = int(res.get("cache_read_tokens", 0) or 0)


        artifact = self.run_dir / "artifacts" / f"{etape}.txt"
        artifact.parent.mkdir(parents=True, exist_ok=True)
        artifact.write_text(output, encoding="utf-8")

        entry["status"] = "OK"
        entry["ts"] = time.time()
        entry["detail"] = {
            "model": payload.model,
            "model_override": state.get("model_override"),
            "runner": runner,
            "reviewer": reviewer,
            "qwen_ok": qwen_ok,
            "artifact_path": str(artifact),
            "artifact_sha256": sha256_file(artifact),
            "output_excerpt": output[-2000:],
            "redteam_blocked": blocked,
            "redteam_findings": findings,
            "tokens": tokens,
            "duration_s": duration,
            "cost_usd": cost_usd,
            "cache_creation_tokens": cache_creation_tokens,
            "cache_read_tokens": cache_read_tokens,
        }
        # M3'a (GO Pierre 2026-08-14) : le reçu du matérialiseur TEXTE
        # (`run_real._materialize_markdown` -> res["markdown_check"]) atteint enfin
        # `state.json`. `entry["detail"]` est un littéral de clés FIXES : il ne
        # recopie aucune clé arbitraire du retour d'exécuteur — le reçu était donc
        # produit puis PERDU (mesuré sur le run p2a-return-snapshot : product_snapshot.md
        # écrit, 8516 octets, et aucune trace de sa validation dans l'état).
        # Un producteur sans consommateur de plus, du même motif que ceux que cette
        # session a fermés. Ajout CONDITIONNEL : une étape sans artefact texte ne
        # gagne aucune clé, l'enregistrement des autres étapes est inchangé.
        markdown_check = res.get("markdown_check") if isinstance(res, dict) else None
        if markdown_check is not None:
            entry["detail"]["markdown_check"] = markdown_check
        # M4' (GO Pierre 2026-08-14) — JUMEAU STRICT du report ci-dessus, pour le reçu
        # du matérialiseur YAML (`run_real._materialize_yaml` -> res["yaml_check"]).
        # Défaut mesuré sur le run charte-20260814 : charter.yaml PRODUIT (4660 octets,
        # check_charter PASS) et son reçu ABSENT de state.json — j'avais corrigé ce
        # même défaut pour markdown_check en M3'a quelques heures plus tôt, puis
        # introduit son jumeau dans le lot suivant en oubliant le report. Troisième
        # occurrence du motif « producteur sans consommateur », la seule entièrement
        # de mon fait, et postérieure à la leçon qui la nommait.
        # Même forme conditionnelle : une étape sans artefact YAML ne gagne aucune clé.
        yaml_check = res.get("yaml_check") if isinstance(res, dict) else None
        if yaml_check is not None:
            entry["detail"]["yaml_check"] = yaml_check
        self._save(state)
        try:
            # M1 (design imposé pt.3) : le champ `model` porte le modèle
            # RÉELLEMENT exécuté — même résolution que le journal (l.480
            # `tier_of(state.get("model_override") or payload.model)`), PAS le
            # seul `reviewer` (identité de revue, pas d'exécution — cf.
            # forge/runtime.py route_step, `reviewer` == `payload.model` pour
            # RUNNER_CLAUDE mais reste le modèle du CONTRAT, jamais l'override).
            record_telemetry(
                self.run_id, etape, state.get("model_override") or payload.model,
                tokens, duration, telemetry_path=self.telemetry_path,
                outcome="OK", cost_usd=cost_usd,
            )
        except OSError:
            logger.warning("télémétrie non écrite pour %s (non bloquant)", etape)
        # Une étape qui PASSE alors qu'une tentative précédente avait échoué (retry
        # après escalade/pool, ou reprise d'une étape interrompue) : le journal
        # apprend la RÉPARATION (2e colonne), pas seulement l'échec. Best-effort.
        if entry["attempts"] > 1:
            tier = tier_of(state.get("model_override") or payload.model) or "inconnu"
            self._journal_fix(
                etape,
                f"échec d'une tentative précédente à {etape}",
                f"réparé à la tentative {entry['attempts']} (tier {tier})",
            )
        if etape == "s5-wiremap":
            self._freeze_rules(state)
        return True

    def _domain(self) -> str:
        """Domaine du journal d'erreurs de CE run (route l'écriture et la lecture du
        pré-mortem quand la cible est déduite par domaine). Un JEU écrit/lit ses leçons
        dans le domaine de son RUNTIME DE PRODUCTION ; tout le reste relève de la
        plomberie `forge`.

        RÉPARATION (post-mortem pacman 2026-08-07) : avant ce correctif, TOUT jeu
        routait vers "html" — y compris un jeu Godot (pacman, profils `full_godot`/
        `standard_godot`), qui n'écrit ni ne lit jamais dans `godot.jsonl` (domaine
        déclaré dans `KNOWN_DOMAINS`, cf. studio_link.py, mais resté vide en pratique).

        Critère retenu — LE PLUS FACTUEL DISPONIBLE : `self.order` (la séquence
        d'étapes RÉELLEMENT résolue par `order_for_profile(self.profile)` pour CE
        run) contient une étape de build Godot (`s9-build-godot-standard`, seul
        builder Godot dispatchable — cf. `dispatch.DEDICATED_PROFILE_STEPS`). C'est
        plus factuel qu'un test sur le NOM du profil (qui pourrait changer) : ça lit
        directement l'étape que ce run va réellement exécuter pour produire le jeu.
        Un jeu qui ne passe par aucune étape Godot reste routé "html" (web/JS,
        comportement historique inchangé pour pong/snake/breakout/...).
        """
        if not self.is_game:
            return "forge"
        if any("godot" in etape for etape in self.order):
            return "godot"
        return "html"

    def _journal_target(self) -> Path | None:
        """Cible du journal d'erreurs, ou None pour un routage par domaine (studio_link
        écrit alors dans lab/reports/error_journal/<domaine>.jsonl).

        - journal_path injecté (tests, orchestrateur) => ce fichier exact.
        - sinon run_dir DANS le repo (run studio réel) => None : le journal studio
          accumule les leçons cross-run/cross-projet, et le pré-mortem les relit.
        - sinon (run_dir hors repo — tmp de test non injecté) => journal LOCAL au
          run_dir : la boucle reste fermée dans le run SANS jamais écrire dans le repo.
        """
        if self.journal_path is not None:
            return self.journal_path
        try:
            self.run_dir.resolve().relative_to(_REPO_ROOT)
            return None  # sous le repo -> journaux studio par domaine
        except ValueError:
            return self.run_dir / "error_journal.jsonl"

    def _journal_error(self, etape: str, reason: str) -> None:
        """Best-effort : consigne un échec d'étape au journal (JAMAIS bloquant —
        même patron que la télémétrie). Une écriture qui lève n'échoue pas le run."""
        try:
            record_error(self.run_id, etape, reason, self.project,
                         journal_path=self._journal_target(), domain=self._domain())
        except Exception:  # noqa: BLE001 — best-effort, jamais bloquant
            logger.warning("journal d'erreurs non écrit pour %s (non bloquant)", etape)

    def _journal_fix(self, etape: str, error: str, resolution: str) -> None:
        """Best-effort : consigne la RÉPARATION d'un échec précédent (2e colonne du
        journal). Jamais bloquant."""
        try:
            record_fix(self.run_id, etape, error, resolution, self.project,
                       journal_path=self._journal_target(), domain=self._domain())
        except Exception:  # noqa: BLE001 — best-effort, jamais bloquant
            logger.warning("réparation non écrite au journal pour %s (non bloquant)", etape)

    def _lessons_target(self) -> Path | None:
        """Cible de `forge.learning_memory` pour CE run — MÊME patron que
        `_journal_target` (connecteur 6) : chemin explicite injecté (tests,
        orchestrateur) => ce fichier exact ; sinon run_dir DANS le repo (run
        studio réel) => None (learning_memory retombe sur ses propres défauts
        PRODUCTION réels — `lab/reports/lessons.jsonl` + corpus legacy réel) ;
        sinon (run_dir HORS repo — tmp de test non injecté) => fichier LOCAL au
        run_dir, jamais le corpus réel ni le corpus partagé d'un autre test."""
        if self.lessons_path is not None:
            return self.lessons_path
        try:
            self.run_dir.resolve().relative_to(_REPO_ROOT)
            return None
        except ValueError:
            return self.run_dir / "lessons.jsonl"

    def _failure_events_target(self) -> Path | None:
        """CV-14 : cible de `forge.learning_memory.record_failure_event` pour CE
        run — MÊME patron que `_lessons_target`/`_journal_target` : chemin explicite
        injecté (tests) => ce fichier exact ; sinon run_dir DANS le repo (run studio
        réel) => None (retombe sur le défaut PRODUCTION réel,
        `lab/reports/failure_events.jsonl`) ; sinon (run_dir HORS repo, tmp de test
        non injecté) => fichier LOCAL au run_dir, jamais le corpus réel."""
        if self.failure_events_path is not None:
            return self.failure_events_path
        try:
            self.run_dir.resolve().relative_to(_REPO_ROOT)
            return None
        except ValueError:
            return self.run_dir / "failure_events.jsonl"

    def _record_failure_event(self, etape: str, reason: str) -> None:
        """CV-14 : producteur AUTOMATIQUE de FailureEvent (couche 1->2 de la
        doctrine Run->FailureEvent->Lesson->Doctrine, écriture JAMAIS ascendante —
        aucune Lesson n'est créée ici, la curation 2->3 reste humaine/CLI, un choix
        de conception, pas un oubli). Best-effort STRICT (même patron que
        `_journal_error`/`_journal_fix` juste au-dessus) : une exception du
        recorder ne casse JAMAIS le run. `etape_detection` SEULEMENT — jamais de
        `causes_suspectees` auto (le lieu de détection n'est jamais la cause,
        règle ratifiée §2.1 de la doctrine)."""
        try:
            from forge.learning_memory import make_failure_id, record_failure_event
            erreur = str(reason)[:2000]
            failure_id = make_failure_id(self.project, etape, erreur)
            record_failure_event(
                failure_id, self.run_id, self.project,
                erreur_observee=erreur, etape_detection=etape,
                path=self._failure_events_target(),
            )
        except Exception:  # noqa: BLE001 — best-effort, jamais bloquant
            logger.warning(
                "failure_event non écrit pour %s (non bloquant)", etape, exc_info=True,
            )

    def _legacy_lessons_targets(self) -> tuple[Path | None, Path | None]:
        """(legacy_domain_path, legacy_monolith_path) pour `premortem_lessons` —
        MÊME logique que `_lessons_target` : un run isolé (hors repo, ou chemin de
        leçons explicite) ne doit JAMAIS lire le corpus legacy RÉEL (les 3 leçons
        de méthode du dépôt), sous peine de polluer un test isolé qui n'a rien
        écrit lui-même (précédent : `test_le_retry_relit_le_journal_a_jour`
        attend `== []` au premier essai)."""
        if self.lessons_path is not None:
            base = self.lessons_path.parent
            return base / "legacy_domain.jsonl", base / "legacy_monolith.jsonl"
        try:
            self.run_dir.resolve().relative_to(_REPO_ROOT)
            return None, None
        except ValueError:
            return (self.run_dir / "legacy_domain.jsonl",
                    self.run_dir / "legacy_monolith.jsonl")

    def _premortem_lessons(self) -> list[str]:
        """FVL Phase 0.5 étape 3 (forge.learning_memory) : leçons à statut +
        génération, filtrées DÉTERMINISTE (rejected omise, génération différente/
        deprecated marquées) — le SEUL changement de lecture exigé par le minimum
        de la doctrine (§2.3). Best-effort strict, même garantie que le reste de
        cette classe : une lecture qui lève ne casse jamais le run."""
        try:
            legacy_domain, legacy_monolith = self._legacy_lessons_targets()
            return premortem_lessons(
                current_generation=load_current_generation(),
                lessons_path=self._lessons_target(),
                legacy_domain_path=legacy_domain,
                legacy_monolith_path=legacy_monolith,
            )
        except Exception:  # noqa: BLE001 — lecture best-effort
            return []

    def _open_humangate_flags(self) -> list[str]:
        """P3-B (élargissement PROJET, lot dégel) : les `humangate_flags` du
        DERNIER verdict SIGNÉ et VÉRIFIABLE du MÊME projet, cherché dans TOUS
        les run_dir frères sous `self.run_dir.parent` — pas seulement
        `self.run_dir` (cas réel qui a motivé ce lot : les lots pacman V3→V6
        avaient chacun leur propre run_dir, tous vides ; les verdicts vivaient
        dans `lab/forge_runs/pacman/`). `self.run_dir.parent` == la racine des
        runs (`lab/forge_runs`, cf. `context_manifest.default_run_dir` :
        `lab/forge_runs/<projet>` — même racine, aucun chemin codé en dur ici).

        Règle ratifiée Pierre, à ne pas élargir : SEULS les flags du verdict
        le plus récent comptent — aucun cumul de verdicts antérieurs, aucun
        registre de résolution, aucune résolution manuelle ; un flag absent du
        dernier verdict est réputé résolu.

        GARDE-FOUS (chacun testé, `test_premortem_open_flags.py`) :
          1. Le run COURANT n'est jamais lu, même si un `verdict*.json` existe
             déjà dans son propre `run_dir` — identifié par `run_id`
             (l'identifiant unique d'un run), PAS par répertoire : un
             `run_dir` peut être partagé par plusieurs runs successifs (cas
             réel `lab/forge_runs/pacman/` : `verdict.json` et
             `verdict_v2.json` portent deux `run_id` différents dans le même
             dossier). `_run_verdict` est le pas tardif s12 ; au moment du
             pré-mortem le run courant n'a normalement pas encore écrit le
             sien, mais on se protège explicitement de tout cas où il
             existerait déjà (re-tentative, dossier réutilisé).
          2. SCOPE PROJET par le champ SIGNÉ `project` du verdict lui-même —
             jamais par une correspondance de NOM de dossier. Un nom de
             dossier voisin (ex. `pacman_v2_autre` à côté de `pacman`) ne
             peut donc jamais contaminer un autre projet : c'est le contenu
             *authentifié* qui décide de l'appartenance, pas une heuristique
             de préfixe/séparateur qu'un nom de dossier ambigu pourrait
             tromper dans les deux sens.
          3. SIGNATURE : seul un verdict portant un `hmac` valide (même
             patron que `verify_run`/`audit.py`/`context_manifest.py` —
             `_verify_mapping` sur le corps moins `hmac`) est éligible. Un
             verdict sans `hmac`, illisible, corrompu ou dont la signature ne
             correspond pas est ignoré avec un `logger.warning`, jamais une
             exception.
          4. ORDRE : tri par `ts` (epoch réel depuis 284df4c). Les verdicts
             HISTORIQUES portent `ts: 0.0` au sommet (jamais retouchés, cf.
             `test_verdict_timestamp_repair.py`) — dans ce cas on départage
             par mtime du fichier (best-effort), puis par le chemin complet
             (déterministe même à mtime égal entre deux dossiers différents).
          5. Zéro verdict valide (aucun candidat, ou tous rejetés par 1-3) =>
             liste vide — un `[]` ici documente « aucun point ouvert trouvé
             pour CE run », jamais « je n'ai pas pu chercher » : une
             recherche qui échoue à la RACINE (dossier illisible) rend aussi
             `[]` mais journalise le pourquoi (cf. `except OSError` ci-
             dessous) — la distinction vit dans les logs, pas dans la valeur
             de retour (même discipline que le reste de cette classe : best-
             effort, jamais d'état "inconnu" typé séparément).

        Aucun plafond n'est appliqué à la liste rendue ici (contrairement à
        `format_premortem_lessons`, `limit=5`) : la règle métier ne prévoit ni
        éviction ni troncature des flags d'un même verdict.

        Best-effort strict, même garantie que le reste de cette classe : une
        recherche qui échoue ne casse jamais le run (retourne `[]`, jamais une
        exception propagée) — additif pur, `_premortem` continue de
        fonctionner exactement comme avant si tout échoue ici."""
        try:
            forge_runs_root = self.run_dir.parent
            paths = sorted(forge_runs_root.glob("*/verdict*.json"))
        except OSError:
            return []
        if not paths:
            return []
        scored: list[tuple[float, str, dict]] = []
        for path in paths:
            data = self._read_json(path)
            if data is None:
                logger.warning(
                    "_open_humangate_flags: verdict illisible ignoré (%s)", path,
                )
                continue
            # Garde 1 : jamais le verdict du run COURANT, identifié par run_id
            # (pas par répertoire, cf. docstring).
            if data.get("run_id") == self.run_id:
                continue
            # Garde 2 : scope PROJET strict sur le champ signé, pas le nom du
            # dossier — un projet voisin au nom proche n'est jamais aspiré.
            if data.get("project") != self.project:
                continue
            # Garde 3 : seul un verdict SIGNÉ et VÉRIFIABLE compte.
            signature = data.get("hmac")
            if not isinstance(signature, str) or not signature:
                logger.warning(
                    "_open_humangate_flags: verdict non signé ignoré (%s)", path,
                )
                continue
            body = {k: v for k, v in data.items() if k != "hmac"}
            try:
                signature_ok = _verify_mapping(body, signature, self.key_file)
            except Exception:  # noqa: BLE001 — vérification best-effort
                signature_ok = False
            if not signature_ok:
                logger.warning(
                    "_open_humangate_flags: signature HMAC invalide, verdict "
                    "ignoré (%s)", path,
                )
                continue
            ts = data.get("ts")
            if not isinstance(ts, (int, float)) or ts <= 0:
                try:
                    ts = path.stat().st_mtime
                except OSError:
                    ts = 0.0
            scored.append((float(ts), path.as_posix(), data))
        if not scored:
            return []
        # Tri déterministe : `ts` (ou mtime de repli) croissant, puis chemin
        # complet en départage final (deux `ts`/mtime identiques, y compris
        # entre deux run_dir différents) — le DERNIER élément est le verdict
        # retenu comme "le plus récent".
        scored.sort(key=lambda item: (item[0], item[1]))
        _, latest_path_str, latest_data = scored[-1]
        flags = latest_data.get("humangate_flags")
        if not isinstance(flags, list):
            return []
        lines = [
            f"[OUVERT run précédent] {f}"
            for f in flags if isinstance(f, str) and f.strip()
        ]
        if lines:
            logger.info(
                "_open_humangate_flags: %d flag(s) transmis depuis %s (run "
                "précédent %s)", len(lines), latest_path_str, latest_data.get("run_id"),
            )
        return lines

    def _premortem(self) -> list[str]:
        # Lit le MÊME journal que celui où l'on écrit (même cible, même domaine) : une
        # nouvelle tentative voit ainsi l'échec qu'on vient de consigner. Best-effort.
        if self._premortem_cache is None:
            try:
                base = premortem(
                    self.project, domain=self._domain(),
                    journal_path=self._journal_target())
            except Exception:  # noqa: BLE001 — lecture best-effort
                base = []
            # P2 (lot dégel 2) : un run JEU lit AUSSI le journal `playtest`
            # (studio_link.PLAYTEST_DOMAIN) — ADDITIF pur, ne touche pas
            # `_domain()` (l'écriture reste routée exactement comme avant) ni
            # `studio_link.py`. `_domain()` d'un jeu rend "html" ou "godot" selon
            # l'étape de build réellement résolue pour ce run (lot A, réparation 1,
            # 2026-08-07) : quand `journal_path` est explicite (mode RETROCOMPAT de
            # `studio_link.premortem`, qui ignore `domain`), les leçons playtest
            # résolues (ex. « bande de vitesse jouable ») restent invisibles sans cet
            # ajout. Best-effort strict, même garantie que la lecture juste
            # au-dessus : une exception rend une liste vide, jamais une propagation.
            playtest_lines: list[str] = []
            if self.is_game:
                try:
                    playtest_lines = premortem(self.project, domain="playtest")
                except Exception:  # noqa: BLE001 — lecture best-effort
                    playtest_lines = []
            # Concaténation ADDITIVE : le journal d'erreurs existant (connecteur 6)
            # reste inchangé en tête, les leçons playtest puis les leçons à statut/
            # génération (learning_memory) s'ajoutent à la suite — aucun texte
            # existant n'est retiré ni réordonné. P3 (lot dégel) : les flags
            # `humangate_flags` OUVERTS du dernier verdict signé du même projet
            # s'ajoutent en dernier, même discipline additive.
            self._premortem_cache = (
                base + playtest_lines + self._premortem_lessons()
                + self._open_humangate_flags()
            )
        return self._premortem_cache

    def _project_bible(self) -> str:
        """Texte de la Project Bible du PROJET (studio_link.project_bible), lu une
        seule fois par run — même patron que `_premortem` (calcul paresseux, mis en
        cache, jamais bloquant). "" si aucune bible (projet neuf) : ce n'est pas
        une anomalie, l'appelant n'injecte alors rien dans le prompt."""
        if self._bible_cache is None:
            try:
                self._bible_cache = project_bible(self.project)
            except Exception:  # noqa: BLE001 — lecture best-effort
                self._bible_cache = ""
        return self._bible_cache

    def _freeze_rules(self, state: dict) -> None:
        """Post-s5 : fige le jeu de règles (wiremap_frozen.json) — jamais d'écrasement."""
        frozen_path = self.run_dir / "wiremap_frozen.json"
        if frozen_path.exists():
            return
        wiremap = self._read_json(self.run_dir / "wiremap.json")
        if wiremap is None:
            state.setdefault("humangate_notes", []).append(
                "s5: wiremap.json absent du run_dir — gel du jeu de règles non posé"
            )
            self._save(state)
            return
        frozen_path.write_text(
            json.dumps({"features": frozen_features_from_wiremap(wiremap)},
                       ensure_ascii=False),
            encoding="utf-8",
        )

    def _halt_step(self, state: dict, entry: dict, reason: str,
                   etape: str | None = None, payload=None, res: dict | None = None) -> bool:
        entry["status"] = "BLOCKED"
        entry["detail"] = {"reason": reason}
        entry["ts"] = time.time()
        state["run_status"] = "HALTED"
        state["reason"] = reason
        self._save(state)  # état persisté AVANT le journal : une écriture ratée n'y touche pas
        logger.warning("driver HALTED: %s", reason)
        resolved_etape = etape or self._etape_of(state, entry)
        self._journal_error(resolved_etape, reason)
        # CV-14 (lot de dégel 1, 2026-07-30) : « le premier arrêt d'étape réel »
        # est le déclencheur nommé de la boucle Lessons — `_halt_step` est LE point
        # de convergence de tous les chemins d'échec d'étape LLM (contrat non
        # activable, exécuteur absent, exécuteur en échec), donc le SEUL endroit à
        # câbler pour couvrir « le driver arrête une étape » sans dupliquer l'appel.
        # Best-effort strict (même garde que `_journal_error` juste au-dessus).
        self._record_failure_event(resolved_etape, reason)
        # MISSION_M1_TELEMETRIE_ECHEC.md (design imposé pt.1) : un échec produit
        # AUSSI une ligne de télémétrie (outcome="HALT"), best-effort comme le
        # chemin OK (garde-fou #2 : jamais bloquant, y compris sur ce nouveau
        # chemin). `res` peut porter des tokens/coût/durée RÉELS si l'exécuteur
        # a tourné avant d'échouer — sinon 0, un ZÉRO MESURÉ (aucun appel n'a
        # eu lieu), jamais une case vide (cas limite explicite du protocole).
        # Résolution du modèle IDENTIQUE au chemin succès (pt.3) :
        # `state.model_override or payload.model` — "" si `payload` est
        # inconnu (contrat non activable AVANT que prepare_dispatch ne le
        # rende : rien à résoudre, jamais un crash sur un attribut absent).
        r = res if isinstance(res, dict) else {}
        model = state.get("model_override") or getattr(payload, "model", "") or ""
        try:
            record_telemetry(
                self.run_id, resolved_etape, model,
                int(r.get("tokens", 0)), float(r.get("duration_s", 0.0)),
                telemetry_path=self.telemetry_path,
                outcome="HALT", cost_usd=float(r.get("cost_usd", 0.0)),
            )
        except OSError:
            logger.warning("télémétrie non écrite pour halt à %s (non bloquant)",
                           resolved_etape)
        return False

    # --- étapes déterministes (exécutées par le driver, jamais un LLM) --------

    def _run_deterministic(self, state: dict, etape: str) -> None:
        """Encode le résultat en reçu (OK/FAIL/BLOCKED) et CONTINUE : c'est le
        verdict signé de s12 qui prononce l'état final, pas un arrêt sec."""
        entry = state["steps"][etape]
        entry["attempts"] = entry.get("attempts", 0) + 1
        entry["status"] = "RUNNING"
        entry["ts"] = time.time()
        self._save(state)

        try:
            # run_dir=self.run_dir (0.5.a, cf. _run_llm ci-dessus, même correction,
            # même raison — les DEUX points d'appel de la porte doivent le passer).
            # Pas de model_executed ici : une étape déterministe n'a pas
            # d'exécutant LLM (oracle in-process) — state["model_override"] ne
            # décrit qu'une escalade de BUILDER, la propager ici suggérerait
            # à tort qu'un modèle a exécuté cette étape.
            prepare_dispatch(
                etape, self.run_id, caps_path=self.caps_path, audit_path=self.audit_path,
                run_dir=self.run_dir, profile=self.profile, attempt=entry["attempts"],
                # P5 (lot dégel 2) : même motif littéral que le point d'appel LLM
                # ci-dessus (_run_llm) — le driver n'a qu'une seule source de WHY
                # dans ce lot (l'ordre FIFO du profil), jamais une escalade ici
                # (une étape déterministe n'a pas d'exécutant LLM à escalader).
                reason=self._activation_reason(state, entry, etape),
            )
        except ContractIncomplete as exc:
            self._finish_step(state, entry, "BLOCKED",
                              {"reason": f"contrat non activable: {exc}"})
            return  # rien préparé d'exécutable -> AUCUN spawn_executed (honnête)

        # Une étape déterministe passe par la MÊME porte (prepare_dispatch écrit son
        # `spawn_prepared`) : sans `spawn_executed` symétrique, tout oracle apparaîtrait
        # à jamais « préparé mais non exécuté » et noierait `unproven` sous du faux
        # positif. Ici le « spawn » est l'exécution IN-PROCESS de l'oracle, pas un
        # agent — la ligne prouve que le dispatch a bien donné lieu à une exécution.
        # Écrite APRÈS le branchement, jamais avant (sinon : preuve d'intention à nouveau).
        if etape == "s10a-oracle-code":
            self._run_code_oracle(state, entry)
            self._record_learning_advisory(entry)
        elif etape == "s10b-oracle-archi":
            blueprint = self._read_json(self.run_dir / "blueprint.json")
            if blueprint is None:
                self._finish_step(state, entry, "BLOCKED", {
                    "reason": "blueprint.json absent du run_dir — hypothèse inconnue = BLOCKED"})
            elif self.src_root is None:
                self._finish_step(state, entry, "BLOCKED", {
                    "reason": "src_root non fourni — oracle archi inexécutable"})
            else:
                r = check_architecture(blueprint, self.src_root)
                self._finish_step(state, entry, "OK" if r["passed"] else "FAIL", r)
        elif etape == "s10c-oracle-wiremap":
            self._run_wiremap_oracle(state, entry)
        elif etape == "s10s-oracle-standard":
            self._run_standard_oracle(state, entry)
        elif etape == "s12-verdict":
            self._run_verdict(state, entry)
        else:  # étape déterministe inconnue : jamais un vert par défaut
            self._finish_step(state, entry, "BLOCKED", {
                "reason": f"étape déterministe {etape!r} non câblée dans le driver"})
        self._record_spawn_executed(etape, entry["attempts"])

    def _record_learning_advisory(self, entry: dict) -> None:
        """Instrumentation d'apprentissage (`scripts/forge/learning_metrics.mjs` via
        `forge.learning_hook`) — plan 4 étapes ratifié Pierre 2026-07-26, étape 1. MESURE
        advisory, jamais bloquante : appelée après s10a-oracle-code, écrit
        `subject: {type:'game', id:self.project}` (LEARNING_SUBJECT_MODEL_V1 — un jeu
        n'est pas une brique, aucune correspondance catalogue n'est exigée). Même patron
        que le Context Manifest (`dispatch.py::prepare_dispatch`) : import local +
        try/except large, une exception ici ne doit JAMAIS transformer un run déjà vert
        en échec."""
        if entry.get("status") != "OK" or not self.is_game:
            return
        try:
            from forge import learning_hook
            learning_hook.record_learning_for_subject(
                project=self.project,
                game_dir=self.game_dir,
                is_game=self.is_game,
                oracle_iterations=entry.get("attempts", 0),
            )
        except Exception:
            logger.warning(
                "learning_metrics (apprentissage) non enregistré pour run=%s "
                "étape=s10a-oracle-code (advisory, non bloquant)",
                self.run_id, exc_info=True,
            )

    def _check_wiremap_frozen_presence(self, state: dict) -> None:
        """Garde d'absence ADVISORY (CV-3, jamais un gate) : au moment où le driver
        exécute les oracles, une wiremap présente sans son gel (`wiremap_frozen.json`)
        est une trace manquante — remontée au HumanGate, elle ne touche JAMAIS
        `software_verdict`. Distincte du STOP dur déjà posé dans `_run_wiremap_oracle`
        (`check_feature_set_frozen` non `checked` => BLOCKED) : cette garde-ci ne
        BLOQUE rien, elle avertit tôt, y compris pour des étapes qui n'appellent
        jamais `_run_wiremap_oracle` (ex. profils sans s10b). Même patron de
        dédoublonnage que les autres notes advisory de cette classe (`escalade
        refusée`, ligne ~2046)."""
        wiremap_path = self.run_dir / "wiremap.json"
        frozen_path = self.run_dir / "wiremap_frozen.json"
        if not wiremap_path.exists() or frozen_path.exists():
            return
        note = "gel des règles absent (wiremap présent non gelé)"
        notes = state.setdefault("humangate_notes", [])
        if note not in notes:
            notes.append(note)
            self._save(state)

    def _run_code_oracle(self, state: dict, entry: dict) -> None:
        """s10a. Non-jeu : forge_gate seul (inchangé). JEU (P0.2/P2) : le vert exige
        oracle code vert ET garde e2e verte ET garde solvabilité verte ET reçu
        mutation signé vert — FAIL alimente l'escalade ; preuve impossible =
        BLOCKED (hypothèse inconnue)."""
        self._check_wiremap_frozen_presence(state)
        res = forge_gate(
            self.project,
            config_path=self.oracle_config,
            key_file=self.key_file,
            evidence_dir=self.run_dir / "evidence",
        )
        detail: dict = {
            "returncode": res.verdict.returncode,
            "evidence_path": res.verdict.evidence_path,
        }
        status = res.verdict.software_verdict
        if not self.is_game:
            self._finish_step(state, entry, status, detail)
            return

        if self.src_root is None:
            detail["reason"] = ("src_root requis pour un jeu (gates e2e/mutation) "
                                "— hypothèse inconnue = BLOCKED")
            self._finish_step(state, entry, "BLOCKED", detail)
            return
        std_topo = self._standard_topology()
        # C2 — DÉCISION PIERRE 2026-07-23, profil `standard` UNIQUEMENT : le volet e2e
        # est SAUTÉ, explicitement et dans le reçu SIGNÉ. Motif mécanique :
        # scripts/forge/standard/core_requirements.yaml ne déclare QUE quatre formes de
        # preuve (artifact/test/bot_action/pixel) — aucune n'est `e2e` — et
        # check_e2e_harness exige un run-oracle.mjs + e2e.mjs à la RACINE, topologie que
        # le STANDARD n'utilise pas. Exiger un harnais Playwright par jeu du curriculum
        # élargirait le système. Forme copiée de ce que `patch` fait déjà d'archi/wiremap
        # (_receipt) : SKIPPED motivé, JAMAIS un faux OK, JAMAIS un silence. Les profils
        # full/increment gardent la garde e2e telle quelle.
        if std_topo:
            e2e = {
                "status": "SKIPPED",
                "checked": False,
                "reason": "profil standard : preuve par bot_action/pixel "
                          "(core_requirements.yaml ne déclare aucune preuve e2e), "
                          "décision Pierre 2026-07-23",
            }
            e2e_ok = True   # sauté != vert : le SKIPPED motivé voyage dans le reçu signé
        else:
            e2e = check_e2e_harness(self.src_root)
            e2e_ok = bool(e2e["passed"])
        detail["e2e"] = e2e
        # P2 (leçon survival_arena/collect_runner : deux jeux injouables tous gates
        # verts) : la solvabilité contribue au gate AU MÊME TITRE que la garde e2e —
        # un jeu sans solvability.mjs câblé dans run-oracle.mjs ne peut pas verdir
        # s10a (échec => FAIL avec raisons, alimente la boucle d'escalade).
        # C3 : en topologie STANDARD la preuve vit en 07_TESTS/oracle/ et le « runner »
        # est la commande d'oracle du projet — la garde reçoit les deux en champs
        # structurés, elle ne devine pas la topologie.
        # Correction Pierre 2026-07-29 (dernier rouge de Snake) : quand le contrat
        # de jeu porte un descripteur `proof.solvability` bien formé (contrat V1),
        # il a priorité sur l'hypothèse web-only `07_TESTS/oracle/solvability.mjs`
        # — la garde ne devine plus, elle LIT le descripteur. `_solvability_proof_
        # descriptor()` ne fait que RELIRE `_mutation_regime_for_game()` (déjà
        # appelé plus loin dans cette méthode pour le routage mutation) : lecture
        # pure, sans effet de bord, comme les deux autres appels de cette méthode.
        # Aucun descripteur lisible (contrat absent, régime historique, ou
        # descripteur illisible/mal formé) => None, comportement STRICTEMENT
        # inchangé dans les deux topologies (LEGACY et STANDARD via `.mjs`).
        solvability = check_solvability_wired(
            self.src_root, standard_topology=std_topo,
            runner_argv=self._oracle_argv() if std_topo else (),
            proof=self._solvability_proof_descriptor(),
        )
        detail["solvability"] = solvability
        # R1 (FORGE_V2_CONSOLIDATION.md §4-A) : anti-théâtre des harnais — contribue
        # au gate AU MÊME TITRE que e2e/solvabilité (pas advisory) : un flag de
        # succès écrit en dur (`passed: true`) rougit ICI, pas dix étapes plus tard
        # via un red-team tardif (pattern déjà constaté 2 fois, bi-projet).
        harness_flags = check_harness_no_hardcoded_flags(self.src_root)
        detail["harness_no_hardcoded_flags"] = harness_flags
        # Advisory (Tier 1 #2) : ne gate jamais oracle_ok — reuse_ratio mesure,
        # il ne prouve rien. L'absence de câblage reste visible dans le reçu signé
        # (verdict.json), au lieu de dépendre de la seule citation du builder.
        detail["reuse_ratio_wired"] = check_reuse_ratio_wired(self.src_root)
        # Phase 1b (bibliothèque de code) : le contrat s9-build DIT au builder de
        # chercher avant d'écrire (§2bis) — c'était une consigne espérée, jamais
        # prouvée. search.mjs s'auto-journalise depuis Phase 1a ; on lit cette trace
        # ici. Advisory, comme reuse_ratio_wired : ne gate JAMAIS oracle_ok (chercher
        # et ne rien trouver de pertinent est un résultat légitime, pas un échec).
        detail["search_consulted"] = check_search_consulted(self._driver_start_ts)
        # n3-oracle-produit-minimal (2026-07-27) : les 3 volets déterministes qui
        # couvrent les fichiers `system.adapter` sortis du gate mutation (décision
        # U-2 : « à couvrir par l'oracle produit ; le juge change, la couche n'est
        # pas abandonnée »). ADVISORY (comme reuse_ratio_wired/search_consulted
        # ci-dessus) : ne gate JAMAIS `final` dans cette mission — le passage en
        # gate dur est une décision Pierre distincte, prise au vu des chiffres
        # portés ici. std_topo seulement : les 3 volets assument la topologie
        # STANDARD (06_RUNTIME/adapters/presentation/, 05_SYSTEMS/...) — un jeu
        # LEGACY n'a pas cette structure et n'a rien à y mesurer. Best-effort
        # (try/except large) : une exception dans ce module ne doit JAMAIS faire
        # échouer s10a (même garde que _record_learning_advisory).
        if std_topo:
            try:
                detail["product_oracle"] = self.product_oracle_runner(self.game_dir)
            except Exception:  # noqa: BLE001 — advisory, jamais bloquant
                logger.warning(
                    "product_oracle (n3) non mesuré pour run=%s (advisory, non bloquant)",
                    self.run_id, exc_info=True,
                )
                detail["product_oracle"] = {
                    "measured": False,
                    "reason": "exception levée pendant la mesure — advisory, non bloquant",
                }

        # Fournisseur GODOT (correction Pierre ①, mission 2026-07-29) : la
        # SÉLECTION du fournisseur est pilotée par le CONTRAT DE PREUVE ET la
        # CAPACITÉ disponible — jamais `runtime == godot`, jamais une heuristique
        # sur le nom du jeu ou une extension. Les DEUX conditions, chacune nommée
        # et tracée dans le reçu :
        #   (a) le contrat de preuve le PRÉVOIT — le jeu porte un descripteur
        #       `proof:` bien formé, lu via le régime déjà en place
        #       (`_mutation_regime_for_game`, régime == "descripteur" ET aucune
        #       raison de blocage — un descripteur illisible/mal formé ne compte
        #       PAS comme "prévu", ambiguïté déjà tranchée BLOCKED plus bas) ;
        #   (b) la CAPACITÉ est constatée — des oracles `FORGE_ORACLE` sont
        #       réellement présents sur disque pour ce jeu
        #       (`has_godot_capacity`, lecture statique seule, aucun effet de
        #       bord).
        # (a) sans (b) : AUCUN volet Godot posé, raison tracée (jamais un
        # silence) dans `detail["product_oracle_godot_activation"]`. Le calcul de
        # `_mutation_regime_for_game()` ici est purement une LECTURE (même
        # fichier relu sans effet de bord au routage mutation plus bas) — aucun
        # comportement du régime mutation historique n'est modifié par cet appel
        # anticipé.
        _godot_contract, _godot_regime, _godot_blocked_reason = self._mutation_regime_for_game()
        proof_descriptor_ok = _godot_regime == "descripteur" and _godot_blocked_reason is None
        godot_capacity_ok = has_godot_capacity(self.game_dir)
        if proof_descriptor_ok and godot_capacity_ok:
            try:
                detail["product_oracle_godot"] = self.product_oracle_godot_runner(self.game_dir)
            except Exception:  # noqa: BLE001 — advisory, jamais bloquant
                logger.warning(
                    "product_oracle_godot non mesuré pour run=%s (advisory, non bloquant)",
                    self.run_id, exc_info=True,
                )
                detail["product_oracle_godot"] = {
                    "measured": False,
                    "reason": "exception levée pendant la mesure — advisory, non bloquant",
                }
            detail["product_oracle_godot_activation"] = {
                "active": True,
                "proof_descriptor_present": True,
                "godot_capacity_present": True,
                "reason": "contrat de preuve `proof:` présent ET oracles FORGE_ORACLE "
                          "trouvés sur disque — fournisseur Godot activé",
            }
        else:
            reasons = []
            if not proof_descriptor_ok:
                reasons.append(
                    "aucun descripteur `proof:` bien formé dans game_contract.yaml"
                    if _godot_blocked_reason is None
                    else f"descripteur `proof:` illisible/mal formé : {_godot_blocked_reason}"
                )
            if not godot_capacity_ok:
                reasons.append(
                    f"aucun oracle FORGE_ORACLE trouvé sous {self.game_dir}/07_TESTS/oracle/")
            detail["product_oracle_godot_activation"] = {
                "active": False,
                "proof_descriptor_present": proof_descriptor_ok,
                "godot_capacity_present": godot_capacity_ok,
                "reason": " ; ".join(reasons),
            }

        # === CONTRAT_PREUVE_MUTATION_V1.md — routage entre les deux régimes de
        # preuve mutation (§6, §8 : « brancher le driver ← seulement après ② vert »).
        # CRITÈRE UNIQUE, nommé, lisible en une ligne (driver.py, ci-dessous) :
        # présence de la clé `proof` dans <game_dir>/00_CHARTER/game_contract.yaml.
        # Jamais le nom du jeu, une extension de fichier ou une heuristique de
        # chemin (consigne Pierre, mission 2026-07-28) — Pong (aucune clé `proof`,
        # §6 décision 6 ferme) reste donc TOUJOURS sur le chemin historique
        # ci-dessous, INCHANGÉ ligne à ligne.
        game_contract, regime, regime_blocked_reason = self._mutation_regime_for_game()
        detail["regime_preuve"] = regime
        if regime_blocked_reason is not None:
            # Descripteur potentiellement présent mais illisible/mal formé : le
            # contrat V1 ne dit pas quoi faire de ce cas (silence, pas une
            # convention à inventer ici) — BLOCKED nommé, décision Pierre requise
            # (voir rapport de mission).
            detail["reason"] = regime_blocked_reason
            self._finish_step(state, entry, "BLOCKED", detail)
            return
        if regime == "descripteur":
            self._run_mutation_descriptor_regime(
                state, entry, detail, game_contract, status, e2e_ok, solvability,
                harness_flags,
            )
            return
        # --- régime historique — INCHANGÉ à partir d'ici (contrat V1 §6, §7 cas 2) ---

        # C4 — les fichiers à MUTER viennent de la VRAIE wiremap. Le driver ne regardait
        # que `run_dir/wiremap.json` ; en topologie STANDARD la wiremap vit en
        # `games/<projet>/09_WIREMAP/wiremap.json` (self.game_dir) — d'où un BLOCKED
        # « fichiers logiques inconnus » et un gate mutation qui NE TOURNAIT JAMAIS
        # (un jeu à 20% de mutation serait passé en silence). Les deux emplacements sont
        # consultés, celui du STANDARD d'abord quand le profil est `standard`.
        files = list(self.logic_files or [])
        # Périmètre par catégorie (décision U-2) : quand `files` vient d'un override
        # explicite (`self.logic_files`), aucune catégorie n'est connue — le scope
        # par défaut inclut tout, n'exclut rien (comportement historique inchangé,
        # rien à déclarer sans wiremap). Dès qu'une wiremap est consultée, le scope
        # RÉEL (inclus/exclus/catégories) la remplace.
        scope = {"included": files, "excluded": [], "categories": {}}
        sources = [self.run_dir / "wiremap.json"]
        if std_topo:
            sources.insert(0, self.game_dir / "09_WIREMAP" / "wiremap.json")
        wiremap_used = ""
        for candidate in sources:
            if files:
                break
            wiremap = self._read_json(candidate)
            if wiremap is not None:
                scope = self._mutation_scope_from_wiremap_any(wiremap)
                files = scope["included"]
                if files:
                    wiremap_used = str(candidate)
        if wiremap_used:
            detail["logic_files_source"] = wiremap_used
        if not files:
            detail["reason"] = (
                "fichiers logiques inconnus (ni logic_files ni wiremap.json) — "
                "preuve mutation impossible ; hypothèse inconnue = BLOCKED")
            self._finish_step(state, entry, "BLOCKED", detail)
            return

        # C4 (suite) : la commande de test qui juge les mutants. Défaut historique
        # (DEFAULT_TEST_ARGV = `node --test logic.test.mjs properties.test.mjs`) = la
        # topologie LEGACY ; en STANDARD les tests sont en 07_TESTS/unit/ et cette
        # commande n'existe pas -> baseline rouge -> mutation jamais lancée. On réutilise
        # alors la commande d'oracle DÉJÀ résolue du projet (oracles.json), c'est-à-dire
        # exactement ce que forge_gate exécute : muter le code puis rejouer la commande
        # qui SERT DE PREUVE est la sémantique même du gate mutation. Un
        # `mutation_test_argv` explicite de l'appelant reste prioritaire.
        test_argv = self.mutation_test_argv
        if test_argv is None and std_topo:
            test_argv = list(self._oracle_argv()) or None
        result = run_mutation_for_game(
            self.src_root, files,
            test_argv=test_argv, runner=self.mutation_runner,
            baseline_runner=self.mutation_baseline_runner,
        )
        receipt = emit_mutation_receipt(
            self.run_id, self.src_root, files, result,
            key_file=self.key_file, evidence_dir=self.run_dir / "evidence",
            mutation_scope=scope,
        )
        detail["mutation"] = {"receipt": asdict(receipt.receipt),
                              "signature": receipt.signature}

        if status == "BLOCKED":
            final = "BLOCKED"
        elif (status == "FAIL" or not e2e_ok or not solvability["passed"]
              or not harness_flags["passed"] or receipt.receipt.status != "OK"):
            final = "FAIL"  # rouge mécanique => alimente la boucle d'escalade
        else:
            # Auto-contrôle structurel AVANT de poser un OK : une preuve qui ne se
            # vérifie pas (suite non scellée, empreinte vide...) bloque ICI, pas à
            # s12 — un défaut de preuve n'est pas un échec de build (pas d'escalade).
            check = verify_mutation_receipt(
                asdict(receipt.receipt), receipt.signature,
                self.run_id, self.src_root, key_file=self.key_file,
            )
            if check["passed"]:
                final = "OK"
            else:
                detail["mutation_verification"] = check
                final = "BLOCKED"
        self._finish_step(state, entry, final, detail)

    # --- CONTRAT_PREUVE_MUTATION_V1.md — routage + nouveau régime (mission
    # 2026-07-28, ÉTAPE 2) -----------------------------------------------

    @staticmethod
    def _merge_observable_volets(
        product_web: dict | None, product_godot: dict | None,
    ) -> tuple[dict, dict]:
        """Construit `observable_volets_effectifs` (correction Pierre ②, mission
        2026-07-29) : PAS de fusion silencieuse — chaque volet de la vue effective
        porte un champ `source` (`"web"` | `"godot"`), inerte pour `_volet_status`
        (qui ne lit que `status`/`checked`/`passed`, jamais `source`).

        Règle de résolution, EXPLICITE et tracée (jamais devinée) : un nom de volet
        présent des DEUX côtés est résolu vers le fournisseur WEB (comportement
        historique inchangé — Pong garde EXACTEMENT son chemin actuel tant qu'aucun
        volet Godot homonyme n'existe, ce qui est le cas aujourd'hui). Les noms en
        conflit sont listés dans la trace de résolution retournée, jamais absorbés
        en silence.

        Retourne `(vue_effective, resolution)` : `vue_effective` est le mapping PLAT
        exact passé à `check_observable_coverage` ; `resolution` est une trace
        JAMAIS injectée dans `vue_effective` elle-même (pour ne pas polluer
        l'espace de noms des volets)."""
        web = product_web if isinstance(product_web, dict) else {}
        godot = product_godot if isinstance(product_godot, dict) else {}

        view: dict = {}
        for name, volet in web.items():
            entry = dict(volet) if isinstance(volet, dict) else {"_valeur_brute": volet}
            entry["source"] = "web"
            view[name] = entry

        conflits: list[str] = []
        for name, volet in godot.items():
            if name in view:
                conflits.append(name)
                continue  # web prioritaire — voir `resolution["regle"]`, jamais un silence
            entry = dict(volet) if isinstance(volet, dict) else {"_valeur_brute": volet}
            entry["source"] = "godot"
            view[name] = entry

        resolution = {
            "regle": (
                "un nom de volet présent des DEUX côtés (web ET godot) est résolu "
                "vers le fournisseur WEB — choix explicite, jamais une fusion "
                "silencieuse (correction Pierre ②, mission 2026-07-29)."
            ),
            "conflits_resolus_vers_web": sorted(conflits),
        }
        return view, resolution

    def _mutation_regime_for_game(self) -> tuple[dict | None, str, str | None]:
        """Lit `<game_dir>/00_CHARTER/game_contract.yaml` et détermine le régime
        de preuve mutation. Retourne `(game_contract, regime, blocked_reason)` :

          - fichier absent                         -> (None, "historique", None)
          - fichier présent, illisible/mal formé    -> (None, "descripteur", raison)
            (on ne peut pas savoir s'il portait une clé `proof` -- le contrat V1
            est SILENCIEUX sur ce cas -- ambiguïté = BLOCKED, jamais historique
            par convention).
          - clé `proof` absente du contrat lisible  -> (contract, "historique", None)
          - clé `proof` présente mais pas un objet  -> (contract, "descripteur", raison)
            (descripteur illisible -- même traitement : BLOCKED nommé).
          - clé `proof` présente et objet           -> (contract, "descripteur", None)

        CRITÈRE UNIQUE : la présence de la clé `proof` dans le contrat lu.
        Jamais le nom du projet, une extension de fichier, ni une heuristique de
        chemin (contrainte explicite de la mission)."""
        path = self.game_dir / "00_CHARTER" / "game_contract.yaml"
        if not path.exists():
            return None, "historique", None
        contract = self._read_yaml(path)
        if contract is None:
            return None, "descripteur", (
                f"{path} existe mais illisible/mal formé -- impossible de savoir "
                "s'il déclare un descripteur proof: (contrat V1 silencieux sur ce "
                "cas ; ambiguïté jamais tranchée par convention) -- décision "
                "Pierre requise")
        if "proof" not in contract:
            return contract, "historique", None
        proof = contract.get("proof")
        if not isinstance(proof, dict):
            return contract, "descripteur", (
                f"{path} porte une clé 'proof' dont la valeur n'est pas un objet "
                "(descripteur illisible) -- contrat V1 silencieux sur ce cas ; "
                "ambiguïté jamais tranchée par convention -- décision Pierre "
                "requise")
        return contract, "descripteur", None

    def _run_mutation_descriptor_regime(
        self, state: dict, entry: dict, detail: dict, game_contract: dict,
        status: str, e2e_ok: bool, solvability: dict, harness_flags: dict,
    ) -> None:
        """Nouveau régime (contrat V1 §2-§5) : consulte le moteur PUR EXISTANT
        `forge.mutation_proof.evaluate_proof_descriptor` -- jamais réimplémenté,
        jamais modifié (périmètre fermé de cette mission).

        Portée RÉELLE de ce qui est branché ici : l'ÉVALUATION DE FORME
        (`mutation_result=None`) seulement. Aucun module du dépôt n'exécute
        aujourd'hui la commande `proof.mutation.command` d'un descripteur
        (résolution `<bin:name>`, génération/exécution réelle des mutants pour
        un runtime arbitraire type Godot) -- ce n'est ni cette méthode ni
        `evaluate_proof_descriptor` (moteur PUR, sans effet de bord, §"COEXISTENCE"
        de mutation_proof.py) qui l'exécutent, et bâtir cet exécuteur est HORS
        PÉRIMÈTRE de cette mission (« périmètre fermé et étroit », uniquement
        `_run_code_oracle` et son routage). Donc : si la forme est rejetée
        (BLOCKED) ou que la catégorie mutable déclarée est absente de la wiremap
        (NON_APPLICABLE), le contrat tranche déjà et le driver applique sa
        décision. Si la forme est correcte ET qu'au moins une mesure réelle
        resterait à faire (`status == "OK"` provisoire), le contrat ne dit PAS
        qui exécute cette mesure : AMBIGUÏTÉ NON TRANCHÉE PAR LE CONTRAT =>
        BLOCKED nommé, jamais une convention -- remonté dans le rapport de
        mission comme décision à prendre par Pierre (aucun jeu de production
        n'emprunte ce chemin aujourd'hui : Snake n'est pas migré, §6 hors
        périmètre)."""
        proof = game_contract.get("proof") or {}
        wiremap_path = self.game_dir / "09_WIREMAP" / "wiremap.json"
        wiremap = self._read_json(wiremap_path)
        if wiremap is None:
            detail["reason"] = (
                f"{wiremap_path} absente/illisible -- une wiremap est requise "
                "pour évaluer un descripteur proof (contrat V1 §5, catégories) ; "
                "cas explicitement cité comme ambigu par la mission -- BLOCKED, "
                "jamais une convention -- décision Pierre requise")
            self._finish_step(state, entry, "BLOCKED", detail)
            return

        forme = evaluate_proof_descriptor(
            proof=proof, game_contract=game_contract, wiremap=wiremap,
            mutation_result=None,
        )
        detail["mutation"] = {"regime": "descripteur", "evaluation_forme": forme}

        if forme["status"] == "BLOCKED":
            detail["reason"] = (
                "descripteur proof.mutation rejeté par evaluate_proof_descriptor "
                "(voir detail.mutation.evaluation_forme.raisons)")
            self._finish_step(state, entry, "BLOCKED", detail)
            return

        if forme["status"] == "NON_APPLICABLE":
            # §5 cas 1 : aucune catégorie mutable déclarée n'est portée par la
            # wiremap -- rien à exécuter, déclaré ET prouvé par la carte. Le
            # verdict de mutation lui-même est acquis (passed=True) ; le statut
            # final combine les autres volets du gate s10a comme dans le régime
            # historique (e2e/solvabilité/harnais).
            if status == "BLOCKED":
                final = "BLOCKED"
            elif (status == "FAIL" or not e2e_ok or not solvability["passed"]
                  or not harness_flags["passed"]):
                final = "FAIL"
            else:
                final = "OK"
            self._finish_step(state, entry, final, detail)
            return

        # forme["status"] == "OK" (forme correcte ; docstring d'evaluate_proof_
        # descriptor : « aucune mesure encore disponible ») : au moins une
        # catégorie mutable déclarée EST présente dans la wiremap -- EXÉCUTER
        # réellement le descripteur (PHASE ③ ÉTAPE 4, go Pierre 2026-07-28) :
        # `run_mutation_from_descriptor` (résolveur/runner injectables, même
        # patron `mutation_runner`/`mutation_baseline_runner` que le régime
        # historique juste au-dessus) puis `emit_descriptor_mutation_receipt`
        # (reçu signé compatible s12, `proof_chain` scellée §3). self.src_root --
        # jamais self.game_dir -- pour rester cohérent avec le point de
        # vérification déjà branché en s12 (`_receipt`, qui re-vérifie contre
        # `self.src_root` pour ce même régime).
        mutation_execution = run_mutation_from_descriptor(
            self.src_root, proof, wiremap,
            mutant_runner=self.mutation_runner,
            baseline_runner=self.mutation_baseline_runner,
        )
        receipt = emit_descriptor_mutation_receipt(
            self.run_id, self.src_root, proof, game_contract, wiremap,
            mutation_execution,
            key_file=self.key_file, evidence_dir=self.run_dir / "evidence",
        )
        detail["mutation"]["receipt"] = asdict(receipt.receipt)
        detail["mutation"]["signature"] = receipt.signature

        if status == "BLOCKED":
            final = "BLOCKED"
        elif (status == "FAIL" or not e2e_ok or not solvability["passed"]
              or not harness_flags["passed"] or receipt.receipt.status != "OK"):
            final = "FAIL"  # rouge mécanique => alimente la boucle d'escalade
        else:
            # Auto-contrôle structurel AVANT de poser un OK -- même garde que le
            # régime historique juste au-dessus : une preuve qui ne se
            # re-vérifie pas contre l'état PRÉSENT du jeu bloque ICI, pas à s12.
            check = verify_descriptor_mutation_receipt(
                asdict(receipt.receipt), receipt.signature,
                self.run_id, self.src_root, game_contract, wiremap,
                key_file=self.key_file,
            )
            if check["passed"]:
                final = "OK"
            else:
                detail["mutation_verification"] = check
                final = "BLOCKED"
        self._finish_step(state, entry, final, detail)

    # --- topologie de dépôt (C2/C3/C4) -------------------------------------
    # Deux topologies coexistent et AUCUNE ne remplace l'autre : LEGACY (harnais
    # run-oracle.mjs/e2e.mjs à la racine du jeu — games/collect_runner, shmup_slice…)
    # et STANDARD (squelette figé scripts/forge/standard/, curriculum de jeux). Le
    # discriminant est le PROFIL de chaîne, un champ structuré déjà porté par le run
    # (state.json/`profile`), jamais un sniff de dossier.

    def _standard_topology(self) -> bool:
        """Le run suit-il une topologie STANDARD (squelette figé, tests en
        `07_TESTS/`, wiremap en `09_WIREMAP/`) ? Vrai pour tout profil de
        `_STANDARD_TOPOLOGY_PROFILES` — ensemble NOMMÉ, pas une égalité de
        chaîne unique ni un `startswith` fragile (correction 2026-07-28 :
        `standard_godot`, jumeau Godot de `standard`, ratifié Pierre
        2026-07-28, tombait dans la branche LEGACY faute de correspondance
        exacte, avec pour conséquence mesurée sur le run snake-s9p : garde e2e
        rouge « run-oracle.mjs absent », gate mutation BLOCKED « fichiers
        logiques inconnus », `reuse_ratio_wired` rouge — les trois causés par
        cette seule égalité stricte)."""
        return self.profile in _STANDARD_TOPOLOGY_PROFILES

    def _oracle_argv(self) -> tuple[str, ...]:
        """Commande d'oracle RÉSOLUE du projet (oracles.json), telle que forge_gate
        l'exécute. () si non résoluble — le gate a déjà rendu BLOCKED dans ce cas, et
        une commande inconnue ne doit jamais valoir câblage prouvé."""
        try:
            return tuple(resolve_oracle(self.project, config_path=self.oracle_config).command)
        except (OracleNotFound, OSError, ValueError, KeyError) as exc:
            logger.warning("oracle non résolu pour %s (%s) — argv inconnu", self.project, exc)
            return ()

    def _solvability_proof_descriptor(self) -> dict | None:
        """`proof.solvability` du contrat de jeu, si le contrat est lisible ET
        déclare un descripteur bien formé (régime == "descripteur", aucune
        raison de blocage) ET que `solvability` y est un objet exploitable.

        None dans tous les autres cas (contrat absent, régime historique,
        descripteur illisible/mal formé, ou `solvability` absent/mal typé) —
        `check_solvability_wired` retombe alors sur son comportement historique
        STRICTEMENT inchangé (contrat V1 silencieux sur ces cas ici : ce n'est
        PAS cette méthode qui tranche l'ambiguïté de régime — `_run_mutation_
        descriptor_regime` s'en charge séparément et peut BLOCKED le run pour
        la même raison ; ici, l'absence se traduit juste par « rien à lire
        pour la solvabilité », jamais par un crash ni un vert par défaut).
        Relit `_mutation_regime_for_game()` (déjà appelé ailleurs dans s10a
        pour le routage mutation/Godot) : lecture pure du même fichier, sans
        effet de bord, comme les appels existants."""
        game_contract, regime, blocked_reason = self._mutation_regime_for_game()
        if regime != "descripteur" or blocked_reason is not None or game_contract is None:
            return None
        proof = game_contract.get("proof") or {}
        if not isinstance(proof, dict):
            return None
        solvability = proof.get("solvability")
        return solvability if isinstance(solvability, dict) else None

    @staticmethod
    def _mutation_scope_from_wiremap_any(wiremap: dict) -> dict:
        """Périmètre mutation (`included`/`excluded`/`categories`) d'une wiremap
        LEGACY (`features[]`, `fichiers[]` de chaînes) OU STANDARD
        (`schema_version: 2` : `lines[]`, `fichiers[]` d'objets {path, category}).

        Le driver ne fait QUE normaliser la FORME (fusion features/lines, objets
        vs chaînes nues) ; la RÈGLE (quelle catégorie est jugée par la mutation,
        décision U-2) vit dans `mutation_proof.mutation_scope_from_wiremap` —
        une seule implémentation, jamais dupliquée (comme l'exige
        FORGE_SYSTEM_CONTRACT ET le garde-fou 5 du contrat
        n2-perimetre-mutation-categorie). Contrairement à l'ancienne version de
        cette méthode, la CATÉGORIE de chaque fichier est PRÉSERVÉE jusqu'à la
        formule — elle ne peut plus juger sans elle (`system.adapter` serait
        indiscernable d'un `system` une fois réduit à un chemin nu)."""
        if not isinstance(wiremap, dict):
            return {"included": [], "excluded": [], "categories": {}}
        entries = []
        for key in ("features", "lines"):
            for item in (wiremap.get(key) or []):
                if not isinstance(item, dict):
                    continue
                fichiers = [f for f in (item.get("fichiers") or [])
                           if isinstance(f, (dict, str))]
                entries.append({"fichiers": fichiers})
        return mutation_scope_from_wiremap({"features": entries})

    @classmethod
    def _logic_files_from_wiremap_any(cls, wiremap: dict) -> list[str]:
        """Rétro-compat (liste des fichiers INCLUS/jugés seulement) — voir
        `_mutation_scope_from_wiremap_any` pour le périmètre complet
        (inclus + exclusions déclarées par catégorie)."""
        return cls._mutation_scope_from_wiremap_any(wiremap)["included"]

    def _run_wiremap_oracle(self, state: dict, entry: dict) -> None:
        wiremap = self._read_json(self.run_dir / "wiremap.json")
        if wiremap is None:
            self._finish_step(state, entry, "BLOCKED", {
                "reason": "wiremap.json absent du run_dir — hypothèse inconnue = BLOCKED"})
            return
        if self.src_root is None:
            self._finish_step(state, entry, "BLOCKED", {
                "reason": "src_root non fourni — oracle wiremap inexécutable"})
            return
        frozen = check_feature_set_frozen(wiremap, load_frozen_features(self.run_dir))
        if not frozen["passed"]:
            # STOP dur doctrinal (skill.md) : gel violé/absent n'est PAS escaladable.
            # BLOCKED (≠ FAIL) n'alimente pas la boucle d'escalade.
            if not frozen["checked"]:
                reason = "snapshot de gel absent (s5 n'a pas figé le jeu de règles)"
            else:
                reason = (f"jeu de règles modifié (ajoutées={frozen['ajoutees']}, "
                          f"supprimées={frozen['supprimees']})")
            self._finish_step(state, entry, "BLOCKED",
                              {"reason": reason, "frozen": frozen})
            return
        wire = check_wiremap(wiremap, self.src_root)
        self._finish_step(state, entry, "OK" if wire["passed"] else "FAIL", wire)

    def _run_standard_oracle(self, state: dict, entry: dict) -> None:
        """s10s. Six oracles du STANDARD (scripts/forge/standard_oracles.py), mode
        APRÈS BUILD, sur le jeu courant (self.game_dir : games/<project>/). Jamais
        d'exception sur une entrée absente/malformée — reçu BLOCKED motivé, même
        discipline que check_architecture (crash-loop réel évité, cf. son commentaire).
        FAIL si UN SEUL des six oracles échoue ; le détail de chacun est conservé.

        Garde d'invariant (mission s10s-branchement-driver, 2026-07-26) : cette
        méthode ne doit JAMAIS être atteinte hors de `_run_deterministic`, qui
        incrémente `entry["attempts"]` avant tout branchement (driver.py l.637).
        `lab/forge_runs/pong/state.json` (archive) porte la preuve qu'un chemin
        hors-boucle a pu, par le passé, poser `status=FAIL` avec `attempts=0` —
        ce chemin n'a plus d'appelant dans le code actuel (seul `_run_deterministic`
        appelle cette méthode), mais rien ne l'empêchait STRUCTURELLEMENT de
        réapparaître. Lever ici, AVANT toute lecture/écriture, transforme
        l'invariant en fait du code plutôt qu'en observation sur l'appelant unique
        d'aujourd'hui — volontairement pas un `assert` (désactivable par -O)."""
        if entry.get("attempts", 0) < 1:
            raise RuntimeError(
                "s10s-oracle-standard: statut refusé hors de la boucle driver "
                "(attempts=0) — _run_standard_oracle ne doit être appelé qu'après "
                "l'incrément d'attempts de _run_deterministic (driver.py l.637)."
            )
        game_contract = self._read_yaml(self.game_dir / "00_CHARTER" / "game_contract.yaml")
        wiremap = self._read_json(self.game_dir / "09_WIREMAP" / "wiremap.json")
        core_requirements = self._read_yaml(_STANDARD_DIR / "core_requirements.yaml")
        repo_map = self._read_yaml(_STANDARD_DIR / "repo_map.yaml")
        capabilities = self._read_yaml(_STANDARD_DIR / "capabilities.yaml")
        # Registre USINE (ratifié Pierre 2026-08-10) — jumeau de capabilities.yaml pour
        # les préoccupations d'usine (sondes, harnais de preuve, solvabilité). Absent =
        # None, et `check_collisions` retrouve alors son comportement d'avant : ce
        # fichier ne peut pas rendre un run BLOCKED en disparaissant, contrairement aux
        # cinq entrées requises ci-dessous. Volontaire — c'est une extension de
        # vocabulaire, pas une dépendance de l'oracle.
        factory_capabilities = self._read_yaml(_STANDARD_DIR / "factory_capabilities.yaml")

        missing: list[str] = []
        if game_contract is None:
            missing.append(f"{self.game_dir}/00_CHARTER/game_contract.yaml absent ou illisible")
        if wiremap is None:
            missing.append(f"{self.game_dir}/09_WIREMAP/wiremap.json absent ou illisible")
        if core_requirements is None:
            missing.append("scripts/forge/standard/core_requirements.yaml absent ou illisible")
        if repo_map is None:
            missing.append("scripts/forge/standard/repo_map.yaml absent ou illisible")
        if capabilities is None:
            missing.append("scripts/forge/standard/capabilities.yaml absent ou illisible")
        if missing:
            self._finish_step(state, entry, "BLOCKED", {
                "reason": "entrée(s) requise(s) absente(s)/illisible(s) pour l'oracle "
                          "standard — hypothèse inconnue = BLOCKED",
                "missing": missing,
            })
            return

        contract_r = check_contract_completeness(game_contract, "game")

        # Budget (check_budget) : `deposited_bricks` DOIT venir du RÉEL (le différentiel
        # du catalogue de briques, knowledge_base/catalog.json), jamais du budget déclaré
        # lui-même — sinon la vérification « toute brique déposée appartient à reuses∪adds »
        # est vraie PAR CONSTRUCTION (tautologie corrigée une fois déjà, commit bb6ea2f).
        # `library_index` = le catalogue réel filtré sur entry_type == "brick" (BRICK_SPEC,
        # knowledge_base/kb-validate.mjs) — distinct des entrées `asset`.
        catalog_now = self._load_brick_catalog(self.catalog_path)
        snapshot = state.get("catalog_brick_ids_snapshot")
        if catalog_now is None:
            budget_r = {
                "passed": False, "measured": False,
                "reason": f"{self.catalog_path} absent ou illisible au moment de l'oracle "
                          "— budget non mesurable",
            }
        elif snapshot is None:
            # Run démarré avant ce mécanisme (state.json ancien), ou catalogue illisible
            # AU DÉMARRAGE du run (snapshot jamais pris) : le différentiel est incalculable.
            # NON MESURÉ, jamais vert par défaut (hypothèse inconnue = BLOCKED, cf. plus bas).
            budget_r = {
                "passed": False, "measured": False,
                "reason": "instantané de catalogue absent du state (run démarré avant ce "
                          "mécanisme, ou catalogue illisible au démarrage) — budget non "
                          "mesurable",
            }
        else:
            library_index = {bid: {"tier": e.get("tier")} for bid, e in catalog_now.items()}
            deposited = sorted(set(catalog_now.keys()) - set(snapshot))
            budget_r = dict(check_budget(game_contract, deposited, library_index))
            budget_r["measured"] = True

        line_r = check_line_states(wiremap, core_requirements, frozen="built")
        placement_r = check_placement(wiremap, repo_map)
        # C5 — `repo_map` PASSÉ : sans lui, check_index n'exécute PAS son volet
        # `dossiers_hors_structure` (« la fermeture côté disque » du standard,
        # SCHEMA.md §3) — il était testé mais n'avait jamais tourné sur un jeu réel.
        index_r = check_index(wiremap, self.game_dir, built=True, repo_map=repo_map)
        collisions_r = check_collisions(wiremap, capabilities, factory_capabilities)

        detail = {
            "contract_completeness": contract_r,
            "budget": budget_r,
            "line_states": line_r,
            "placement": placement_r,
            "index": index_r,
            "collisions": collisions_r,
        }
        # Connecteur 7 (mission repair-boucle-cassee 2026-08-03) : `identifiants_
        # inconnus` était un cul-de-sac (check_collisions le CALCULE, aucun
        # appelant ne le rendait consommable — grep vide avant ce correctif, cf.
        # docstring de propose_capability_gap/DEFAULT_CAPABILITY_GAP_PROPOSALS).
        # Dépose ICI, au moment où le manque est DÉTECTÉ (pas seulement quand le
        # pas complet réussit) — best-effort strict, comme `_propose_bricks` :
        # ne doit JAMAIS changer le statut de ce pas ni du run.
        self._propose_capability_gaps(collisions_r, factory_capabilities)
        # Connecteur repair-boucle-cassee (mission 2026-08-03, propose_bible_entry) :
        # même discipline — dépôt best-effort au moment où le wiremap (déjà lu
        # ci-dessus) est disponible, ne dépend PAS du statut de ce pas.
        self._propose_bible_entries(wiremap)
        # R1 (contrat r1-preuves-boucle-mecaniques.yaml, 2026-07-27) : les 2 volets de
        # preuve de boucle — observable_by_player consommé par un oracle réel, Genre
        # Bible lisible et citée. ADVISORY (garde-fou 6 du contrat) : portés au reçu,
        # JAMAIS dans `_CORE_FACETS` ci-dessous — ne gate jamais le statut du pas s10s,
        # même patron que `product_oracle` dans `_run_code_oracle` (s10a). Le volet
        # d'oracle produit (browser_import_safety/auto_session/visual_capture) vit dans
        # le reçu de s10a (déjà terminé — `_run_standard_oracle` s'exécute après dans
        # l'ORDER du profil `standard`), lu ici depuis l'état persisté, jamais recalculé.
        s10a_detail = (state.get("steps") or {}).get("s10a-oracle-code", {}).get("detail", {})
        product_receipt = s10a_detail.get("product_oracle") if isinstance(s10a_detail, dict) else None
        godot_receipt = s10a_detail.get("product_oracle_godot") if isinstance(s10a_detail, dict) else None
        # Correction Pierre ② (mission 2026-07-29) : PAS de fusion silencieuse. Trois
        # entrées DISTINCTES et lisibles, provenance conservée :
        #   - `product_oracle` : la sortie du fournisseur WEB, TELLE QUELLE (inchangée,
        #     c'est ce que Pong a déjà aujourd'hui — même valeur qu'avant cette mission).
        #   - `product_oracle_godot` : la sortie du fournisseur GODOT, absente de ce
        #     détail si le fournisseur n'a pas été activé pour ce jeu (s10a ne l'a pas
        #     posé — cf. `product_oracle_godot_activation`).
        #   - `observable_volets_effectifs` : LA VUE réellement passée à
        #     `check_observable_coverage` ci-dessous, où chaque volet porte son champ
        #     `source` (`"web"` | `"godot"`) — inerte pour `_volet_status`
        #     (`standard_oracles.py`, NON modifié : il ne lit que `status`/`checked`/
        #     `passed`). `observable_volets_resolution` (à côté, jamais injecté DANS la
        #     vue) trace la règle de résolution des conflits : nom présent des DEUX
        #     côtés => WEB PRIORITAIRE, documenté ici plutôt qu'arbitré en silence.
        detail["product_oracle"] = product_receipt if isinstance(product_receipt, dict) else {}
        if isinstance(godot_receipt, dict):
            detail["product_oracle_godot"] = godot_receipt
        effective_view, resolution = self._merge_observable_volets(product_receipt, godot_receipt)
        detail["observable_volets_effectifs"] = effective_view
        detail["observable_volets_resolution"] = resolution
        detail["observable_coverage"] = check_observable_coverage(wiremap, effective_view)
        genre_bible = self._read_json(self.game_dir / "01_DESIGN" / "genre_bible.json")
        detail["genre_coverage"] = check_genre_coverage(
            wiremap, genre_bible if isinstance(genre_bible, dict) else {}
        )
        # Priorité (arbitrage coordinateur) : UNE PREUVE D'ÉCHEC L'EMPORTE SUR UNE
        # ABSENCE DE PREUVE. FAIL = « c'est faux, prouvé » (répare le JEU) ; BLOCKED =
        # « je ne peux pas savoir » (répare l'INSTRUMENT) — les confondre envoie le
        # builder réparer la mauvaise chose ET rend une violation réelle invisible
        # derrière un problème d'instrumentation. Donc : un volet démontré en violation
        # (budget mesuré et FAIL inclus) rend le pas FAIL, MÊME si le budget n'a par
        # ailleurs pas pu être mesuré. BLOCKED seulement si budget non mesurable ET
        # qu'aucun autre volet n'a échoué — le seul cas où on ne sait vraiment rien.
        # Dans tous les cas, `measured`/`reason` du budget restent visibles dans le détail.
        _CORE_FACETS = ("contract_completeness", "line_states", "placement", "index", "collisions")
        other_violation = any(not bool(detail[k].get("passed")) for k in _CORE_FACETS)
        budget_measured = bool(budget_r.get("measured"))
        budget_violation = budget_measured and not bool(budget_r.get("passed"))
        if other_violation or budget_violation:
            status = "FAIL"
        elif not budget_measured:
            status = "BLOCKED"
        else:
            status = "OK"
        self._finish_step(state, entry, status, detail)

    def _propose_capability_gaps(
        self, collisions_r: dict, factory_capabilities: dict | None = None
    ) -> None:
        """Dépose une proposition d'extension de registre (studio_link.
        propose_capability_gap, PROPOSE-ONLY) pour chaque `identifiants_inconnus`
        de `collisions_r` (check_collisions).

        Ferme le maillon mesuré par la mission repair-boucle-cassee 2026-08-03
        (audit des 15 boucles du Master Schéma, run tetris-fullgodot-20260803-084719 :
        14 identifiants_inconnus, zéro conséquence). `capabilities.yaml` documente
        lui-même qu'il grandit « d'un jeu à l'autre » — un identifiant inconnu est
        une capacité CANDIDATE à ajouter au registre, jamais une donnée à fabriquer
        ici (le `statement` humain reste à la charge de Pierre à la promotion,
        même limite honnête que `kb_proposal._lesson_to_pattern_entry` pose sur
        `provenance_url`).

        Format de `identifiants_inconnus[i]` (check_collisions) : "<line_id>:<capability_id>"
        — split sur le PREMIER ':' seulement (un capability_id ne contient jamais
        ':', un line_id non plus dans les wiremaps existantes, mais l'inverse
        n'est pas garanti par construction : ne pas supposer, juste être robuste
        à une absence de ':' — entrée alors ignorée, jamais une exception).

        Best-effort STRICT (même garantie que _propose_bricks/record_telemetry) :
        toute exception ici est journalisée et AVALÉE — ne doit jamais changer le
        statut de ce pas ni du run.
        """
        try:
            unknowns = collisions_r.get("identifiants_inconnus")
            if not isinstance(unknowns, list) or not unknowns:
                return
            # Préfixes d'usine : champ STRUCTURÉ du registre, jamais une liste en dur
            # ici (décision Pierre 2026-08-10 — routage produit/usine). Registre absent
            # ou malformé => aucun routage, tout part en produit : le comportement
            # d'avant, jamais une perte silencieuse.
            ns_raw = (factory_capabilities or {}).get("namespaces")
            factory_ns = tuple(
                p for p in ns_raw if isinstance(p, str) and p.strip()
            ) if isinstance(ns_raw, list) else ()
            for entry_id in unknowns:
                if not isinstance(entry_id, str) or ":" not in entry_id:
                    continue
                source_line_id, capability_id = entry_id.split(":", 1)
                if not capability_id:
                    continue
                propose_capability_gap(
                    self.run_id, self.project, capability_id, source_line_id,
                    factory_namespaces=factory_ns,
                )
        except Exception:  # noqa: BLE001 — advisory, jamais bloquant
            logger.warning(
                "_propose_capability_gaps: dépôt impossible pour run=%s (advisory, "
                "non bloquant)", self.run_id, exc_info=True,
            )

    def _propose_bible_entries(self, wiremap: dict) -> None:
        """Dépose une PROPOSITION de Project Bible (studio_link.propose_bible_entry,
        PROPOSE-ONLY) pour chaque décision d'abandon RÉELLE déjà portée par le
        wiremap du jeu — son tableau `discarded` (voir p.ex. games/breakout_v2/
        09_WIREMAP/wiremap.json ou games/snake/09_WIREMAP/wiremap.json :
        {id, source_role, proposal, discard_reason, ended_up_in_game}).

        Ferme le maillon mesuré par l'audit du 2026-08-03 : `propose_bible_entry`
        existait (studio_link.py:574 — signature/champs inchangés ici), et
        `pending_review.mjs` lui réservait déjà sa 4e file
        (`forge_bible_proposals`, l.17/58/88), mais AUCUN appelant ne
        l'invoquait dans driver.py (grep exhaustif : 0 occurrence avant ce
        correctif) — un lecteur sans écrivain.

        PRÉDICAT DU DÉPÔT : `kind="abandoned"` UNIQUEMENT, une entrée par item
        de `wiremap["discarded"]` dont `discard_reason` est un texte non vide.
        C'est LA seule information de bible que ce point du run possède
        réellement : une voie écartée + sa raison — « la mémoire la plus
        précieuse » selon la docstring de `propose_bible_entry`. Rien n'est
        proposé en `kind="validated"` : le wiremap ne porte, à cet endroit,
        aucune décision de ce type distincte de l'implémentation mécanique déjà
        couverte par line_states/placement/index/collisions ci-dessus — en
        fabriquer une ici serait déposer une entrée vide, contraire à la règle
        anti-invention.

        `decision`/`rationale` embarquent la provenance réelle (run_id, id de
        l'entrée `discarded`, chemin du wiremap) en texte : le record écrit par
        `propose_bible_entry` n'a pas de champ `run_id` structuré (contrairement
        à `propose_capability_gap`) — sa signature n'est pas modifiée par cette
        réparation, hors périmètre de la mission.

        Best-effort STRICT (même garantie que _propose_bricks/
        _propose_capability_gaps) : toute exception ici est journalisée et
        AVALÉE — ne doit jamais changer le statut de ce pas ni du run.
        """
        try:
            discarded = wiremap.get("discarded") if isinstance(wiremap, dict) else None
            if not isinstance(discarded, list) or not discarded:
                return
            game_dir_rel = self._repo_relative_str(self.game_dir)
            wiremap_rel = f"{game_dir_rel}/09_WIREMAP/wiremap.json"
            for item in discarded:
                if not isinstance(item, dict):
                    continue
                reason = item.get("discard_reason")
                if not isinstance(reason, str) or not reason.strip():
                    continue
                entry_id = item.get("id") if isinstance(item.get("id"), str) and item.get("id") else "?"
                proposal = item.get("proposal") if isinstance(item.get("proposal"), str) else ""
                decision = f"[abandoned] {entry_id}: {proposal}".strip()
                rationale = (
                    f"{reason} (source_role={item.get('source_role')!r}, "
                    f"run_id={self.run_id}, wiremap={wiremap_rel})"
                )
                propose_bible_entry(self.project, "abandoned", decision, rationale)
        except Exception:  # noqa: BLE001 — advisory, jamais bloquant
            logger.warning(
                "_propose_bible_entries: dépôt impossible pour run=%s (advisory, "
                "non bloquant)", self.run_id, exc_info=True,
            )

    def _run_verdict(self, state: dict, entry: dict) -> None:
        code_r = self._receipt(state, "code", "s10a-oracle-code")
        archi_r = self._receipt(state, "archi", "s10b-oracle-archi")
        wire_r = self._receipt(state, "wiremap", "s10c-oracle-wiremap")
        # C1 — les six oracles du STANDARD entrent dans le verdict SIGNÉ, verts comme
        # rouges. Hors profil `standard`, `_receipt` rend un SKIPPED SIGNÉ (même patron
        # qu'archi/wiremap en profil `patch`) : sauter est assumé et auditable, jamais
        # un trou silencieux. Un profil qui mesure sans agréger ne prouve rien.
        std_r = self._receipt(state, "standard", "s10s-oracle-standard")
        reviewer, ran, blocked, findings = self._redteam_facts(state)
        agg = build_aggregate_verdict(
            self.project, self.run_id, code_r, archi_r, wire_r, reviewer,
            redteam_ran=ran, redteam_findings=findings, redteam_blocked=blocked,
            extra_advisory=self._prisme_facts(state), standard=std_r,
            git_head=current_git_head(), nonce=new_nonce(), ts=time.time(),
            key_file=self.key_file,
        )
        record = signed_aggregate_record(agg, key_file=self.key_file)
        verdict_path = self.run_dir / "verdict.json"
        verdict_path.write_text(
            json.dumps(record, ensure_ascii=False, sort_keys=True, indent=1),
            encoding="utf-8",
        )
        # R1 (audit branchements 2026-07-24) : re-vérification MÉCANIQUE du
        # verdict qui vient d'être écrit — HMAC + évidence + preuve mutation +
        # knowledge_trace (forge.verify_run, le même maillon que `/gate`).
        # AVANT ce correctif, verify_run n'était JAMAIS appelé par le driver
        # (grep vide dans driver.py) : la re-vérification restait une étape
        # manuelle. Appelée ICI, une seule fois par appel de _run_verdict
        # (jamais en boucle) : un verdict falsifié/altéré (évidence truquée
        # après coup, HMAC incohérent, lineage théâtral) ne peut plus se
        # présenter à HumanGate comme un OK silencieux — l'étape devient
        # BLOCKED avec une raison explicite, jamais un vert masqué.
        verification = verify_run(verdict_path, key_file=self.key_file)
        blocking: list[str] = list(verification.get("evidence_problems", ()))
        blocking += list(verification.get("knowledge_trace_problems", ()))
        if not verification.get("hmac_ok", False):
            blocking.insert(0, "HMAC du verdict invalide")
        # V1 (2026-07-26, séparation intégrité/verdict — mémoire pong_r2) : la
        # doctrine « un gate mutation rouge ne bloque QUE si l'agrégat prétend
        # software_verdict=OK » ne vit plus ICI — elle vit à UN seul endroit,
        # `forge.verify_run.verify_run` (`coherence_problems`), qui la calcule
        # exactement de la même façon (comparée par test,
        # test_verify_run_integrity_separation.py). Un reçu mutation
        # LÉGITIMEMENT non-OK (baseline rouge, survivant non trié...) ne bloque
        # donc TOUJOURS pas ce pas quand le verdict affiché est déjà honnêtement
        # FAIL/BLOCKED (`coherence_problems` reste vide dans ce cas) ; mais un
        # OK affiché sur un gate mutation rouge (vert fabriqué) reste un GATE
        # DUR. HMAC/évidence/knowledge_trace restent des gates DURS quel que
        # soit le statut affiché (falsifier un log reste une falsification, OK
        # ou FAIL) — inchangés ci-dessus.
        blocking += list(verification.get("coherence_problems", ()))
        if blocking:
            self._finish_step(state, entry, "BLOCKED", {
                "verdict_path": str(verdict_path),
                "reason": f"verify_run: {'; '.join(blocking)}",
                "verify_run": verification,
            })
            return
        # Dépositaire (ADR-002 §3, mission v4-brancher-propose-brick 2026-07-27) :
        # ferme le maillon mesuré par docs/audit/ANALYSE_DEPOT_GAME_LOOP_2026-07-26.md
        # (propose_brick existait, testé, exposé CLI, mais AUCUN appelant dans
        # driver.py — grep vide). Appelé ICI, APRÈS la re-vérification verify_run
        # (le `record` lu est donc authentifié), best-effort strict : ne peut jamais
        # changer le statut de cette étape ni du run (cf. _propose_bricks).
        self._propose_bricks(record)
        # OK = l'agrégation a tourné ET verify_run confirme l'authenticité du
        # reçu signé ; le verdict LOGICIEL (OK/FAIL/BLOCKED) est porté par son
        # contenu, pas par ce statut d'étape.
        self._finish_step(state, entry, "OK", {
            "verdict_path": str(verdict_path),
            "software_verdict": record["software_verdict"],
            "decision": record["decision"],
            "verify_run": "AUTHENTIQUE",
        })

    def _propose_bricks(self, record: dict) -> None:
        """Dépose une PROPOSITION de brique (studio_link.propose_brick,
        PROPOSE-ONLY) pour chaque `brick_id` de `budget.adds` du contrat de jeu
        — cf. games/pong/00_CHARTER/game_contract.yaml:12 (`adds: [game_loop]`).

        PRÉDICAT DU DÉPÔT (docs/audit/ANALYSE_DEPOT_GAME_LOOP_2026-07-26.md §4a) :
        UNIQUEMENT si `record["oracles"]["code"]["status"] == "OK"` — jamais sur
        FAIL/BLOCKED. `record` est le verdict signé APRÈS re-vérification
        `verify_run` (appelant : `_run_verdict`, sur le chemin où `blocking` est
        déjà vide) : le statut lu ici est donc authentifié, pas seulement écrit.

        `brick_id` vient EXCLUSIVEMENT de `budget.adds` (jamais dérivé d'un nom
        de fichier — règle anti-invention, LEARNING_SUBJECT_MODEL_V1). `kind` est
        fixé à `"system"` : c'est ce que `budget.adds` promet par construction du
        curriculum (game_contract.yaml commente `adds` comme « UN seul systeme
        neuf depose en bibliotheque »). `path` vient de la WireMap réelle du jeu
        (09_WIREMAP/wiremap.json, `lines[].system_parent == brick_id`) quand elle
        cite une adresse ; sinon replie sur le dossier du jeu — jamais un chemin
        fabriqué qui n'existe pas sur disque.

        PROPOSE-ONLY strict : écrit UNIQUEMENT sous lab/reports/ (ou
        `self.brick_proposals_path` en test) — JAMAIS knowledge_base/catalog.json
        (studio_link.propose_brick ne l'écrit jamais, promotion 100% humaine).

        Best-effort STRICT (même garantie que record_telemetry / _journal_error) :
        toute exception ici est journalisée et AVALÉE — ne doit jamais changer le
        statut de cette étape ni celui du run.
        """
        try:
            code_status = ((record.get("oracles") or {}).get("code") or {}).get("status")
            if code_status != "OK":
                return
            game_contract = self._read_yaml(self.game_dir / "00_CHARTER" / "game_contract.yaml")
            if not isinstance(game_contract, dict):
                return
            adds = (game_contract.get("budget") or {}).get("adds")
            if not isinstance(adds, list):
                return
            wiremap = self._read_json(self.game_dir / "09_WIREMAP" / "wiremap.json") or {}
            lines = wiremap.get("lines") if isinstance(wiremap.get("lines"), list) else []
            game_dir_rel = self._repo_relative_str(self.game_dir)
            for brick_id in adds:
                if not isinstance(brick_id, str) or not brick_id:
                    continue
                addresses = sorted({
                    ln.get("address") for ln in lines
                    if isinstance(ln, dict) and ln.get("system_parent") == brick_id
                    and isinstance(ln.get("address"), str) and ln.get("address")
                })
                path = f"{game_dir_rel}/{addresses[0]}" if addresses else game_dir_rel
                propose_brick(
                    self.run_id, self.project, brick_id, "system",
                    f"Brique '{brick_id}' promise par budget.adds du contrat de "
                    f"jeu {self.project} (run {self.run_id}, reçu code OK) — "
                    "proposition brute déposée automatiquement ; kind/function/path "
                    "à confirmer par Pierre au moment de la promotion.",
                    path,
                    proposals_path=self.brick_proposals_path,
                )
        except Exception:
            logger.warning(
                "proposition de brique non déposée pour %s (best-effort, non bloquant)",
                self.run_id, exc_info=True,
            )

    @staticmethod
    def _repo_relative_str(path: Path) -> str:
        """Chemin lisible pour une proposition : relatif au dépôt si `path` y
        vit (cas réel, `games/<projet>`), sinon la chaîne brute (un `game_dir`
        de test sous `tmp_path`, hors dépôt) — jamais une exception."""
        try:
            return path.resolve().relative_to(_REPO_ROOT).as_posix()
        except ValueError:
            return path.as_posix()

    def _finish_step(self, state: dict, entry: dict, status: str, detail: dict,
                     etape: str | None = None) -> None:
        entry["status"] = status
        entry["detail"] = detail
        entry["ts"] = time.time()
        self._save(state)  # état persisté AVANT le journal (best-effort, non bloquant)
        # Étape déterministe rouge (oracle FAIL, artefact d'entrée absent...) : consigne
        # le motif au journal. L'étape est dérivée du state si non passée (les helpers
        # d'oracle appellent _finish_step sans la répéter).
        if status in ("FAIL", "BLOCKED"):
            self._journal_error(etape or self._etape_of(state, entry),
                                self._failure_reason(detail, status))

    @staticmethod
    def _etape_of(state: dict, entry: dict) -> str:
        """Nom de l'étape correspondant à un `entry` de state (identité d'objet)."""
        for e, st in (state.get("steps") or {}).items():
            if st is entry:
                return e
        return "?"

    @staticmethod
    def _failure_reason(detail: dict, status: str) -> str:
        """Motif lisible d'un échec pour le journal : `reason` explicite si présent,
        sinon un résumé des gardes rouges (returncode, e2e/solvabilité/mutation)."""
        if detail.get("reason"):
            return str(detail["reason"])
        bits: list[str] = []
        if "returncode" in detail:
            bits.append(f"returncode={detail['returncode']}")
        for k in ("e2e", "solvability", "wiremap"):
            v = detail.get(k)
            if isinstance(v, dict) and v.get("passed") is False:
                bits.append(f"{k} non passé")
        mut = detail.get("mutation")
        if isinstance(mut, dict):
            rc = mut.get("receipt") or {}
            if rc.get("status") and rc.get("status") != "OK":
                bits.append(f"mutation={rc.get('status')}")
        return "; ".join(bits) or status

    def _receipt(self, state: dict, oracle_id: str, etape: str):
        """Reçu signé depuis l'état persisté — reconstructible après reprise."""
        if etape not in self.order:
            return make_signed_receipt(
                oracle_id, self.run_id, "SKIPPED",
                {"reason": f"non applicable au profil {self.profile}"},
                ts=time.time(), key_file=self.key_file,
            )
        st = state["steps"][etape]
        status = st.get("status", "")
        if status not in ("OK", "FAIL", "BLOCKED", "SKIPPED"):
            status = "BLOCKED"  # étape jamais terminée : rien de prouvé
        detail = dict(st.get("detail", {}))
        if oracle_id == "code" and self._effective_is_game(state) and status == "OK":
            # P0.2/P0.3 — un OK code de JEU n'est signable qu'avec une preuve
            # mutation RE-vérifiée contre le code PRÉSENT (ferme reprise/falsification
            # de state.json : hash divergent, triage modifié, preuve retirée, ET flip
            # is_game=false — la game-ness est re-dérivée, pas crue depuis le state).
            #
            # CONTRAT_PREUVE_MUTATION_V1.md §7/§8, PHASE ③ ÉTAPE 3 — routage sur
            # `detail["regime_preuve"]`, QUATRE cas distincts et nommés, jamais
            # confondus (consigne Pierre) :
            #   1. historique   -> verify_mutation_receipt (INCHANGÉ, même appel
            #      qu'avant cette mission — bit-identique, cf. tests de coexistence) ;
            #   2. descripteur, reçu présent -> verify_descriptor_mutation_receipt ;
            #   3. descripteur, reçu ABSENT  -> BLOCKED nommé (jamais confondu
            #      avec une preuve invalide, cas 4) ;
            #   4. descripteur, reçu INVALIDE -> BLOCKED avec les raisons du
            #      vérificateur dédié.
            # `regime_preuve` absent (reprise d'un run antérieur à cette mission,
            # ou appelant qui ne l'a jamais renseigné) => "historique", le seul
            # régime qui existait avant que ce champ ne soit tracé.
            regime = detail.get("regime_preuve", "historique")
            if self.src_root is None:
                check = {"passed": False,
                         "raisons": ["src_root absent à la vérification de la preuve"]}
            elif regime == "historique":
                mut = detail.get("mutation") or {}
                check = verify_mutation_receipt(
                    mut.get("receipt"), mut.get("signature", ""),
                    self.run_id, self.src_root, key_file=self.key_file,
                )
            elif regime == "descripteur":
                mut = detail.get("mutation") or {}
                if not (isinstance(mut, dict) and mut.get("receipt") is not None):
                    # cas 3 — ABSENCE de preuve : aucun reçu signé n'a été produit
                    # pour ce run (ex. forme correcte mais aucune exécution
                    # branchée en amont, ou NON_APPLICABLE sans mesure requise).
                    check = {
                        "passed": False,
                        "raisons": [
                            "absence de preuve mutation (régime descripteur) — "
                            "aucun reçu signé produit pour ce run (contrat V1 "
                            "§7 cas 3, distinct d'une preuve invalide)"],
                        "status": "",
                    }
                else:
                    game_contract = self._read_yaml(
                        self.game_dir / "00_CHARTER" / "game_contract.yaml") or {}
                    wiremap = self._read_json(
                        self.game_dir / "09_WIREMAP" / "wiremap.json") or {}
                    # cas 4 (implicite si check["passed"] est False ci-dessous) —
                    # preuve INVALIDE : le vérificateur dédié porte les raisons.
                    check = verify_descriptor_mutation_receipt(
                        mut.get("receipt"), mut.get("signature", ""),
                        self.run_id, self.src_root, game_contract, wiremap,
                        key_file=self.key_file,
                    )
            else:
                check = {"passed": False,
                         "raisons": [f"regime_preuve inconnu ({regime!r}) — "
                                     "hypothèse inconnue = refus"]}
            if not check["passed"]:
                status = "BLOCKED"
                detail["mutation_verification"] = check
                logger.warning("reçu code dégradé en BLOCKED (preuve mutation): %s",
                               "; ".join(check["raisons"]))
        evidence_path = detail.pop("evidence_path", "")
        # RÉPARATION (post-mortem pacman 2026-08-07, lot A réparation 4) : un pas
        # sans "ts" enregistré (étape jamais terminée -> statut dégradé BLOCKED
        # ci-dessus, `st.get("detail", {})` reste vide) obtenait 0.0 (epoch 1970) au
        # lieu de l'heure RÉELLE de construction du reçu. `or time.time()` ne change
        # rien quand "ts" est présent et non-nul (cas normal, écrit par
        # `_finish_step`/etc.) — seul le cas manquant/0.0 est couvert.
        return make_signed_receipt(
            oracle_id, self.run_id, status, detail,
            evidence_path=evidence_path, ts=float(st.get("ts") or time.time()),
            key_file=self.key_file,
        )

    def _redteam_facts(self, state: dict) -> tuple[str, bool, bool, tuple]:
        """Identité RÉELLE du reviewer + redteam_ran structuré (jamais un sniff)."""
        for etape in ("s11-redteam-code", "s6-redteam-plan"):
            if etape in self.order:
                st = state["steps"].get(etape, {})
                d = st.get("detail", {})
                if st.get("status") == "OK":
                    return (
                        d.get("reviewer", "inconnu"),
                        bool(d.get("qwen_ok")),
                        bool(d.get("redteam_blocked")),
                        tuple(d.get("redteam_findings", [])),
                    )
                return ("red-team non exécuté", False, False, ())
        return ("aucun (profil sans red-team)", False, False, ())

    def _prisme_facts(self, state: dict) -> tuple[str, ...]:
        """Tier 2.5 étape 3 : formalise le panel Prisme (s1) comme un CONTRÔLE
        QUALITÉ — il détecte des violations de forme (`forge.panel`, garde
        `check_prisme.mjs`), il ne décide JAMAIS. Ses `findings` (s'il y en a)
        sont pré-formatés ici et remontés dans `humangate_flags` du verdict signé
        (via `extra_advisory`) — visibles, jamais tus, mais n'entrent JAMAIS dans
        le calcul de `software_verdict` (même architecture que le red-team) :

            Builder -> Artifact -> Prisme (détecte) -> Oracle réel -> Decision Gate
        """
        if "s1-prisme" not in self.order:
            return ()
        d = state["steps"].get("s1-prisme", {}).get("detail", {})
        if not d.get("redteam_blocked"):
            return ()
        return tuple(
            f"Prisme (s1, contrôle qualité — jamais un juge): {f}"
            for f in d.get("redteam_findings", ())
        )

    # --- escalade (boucle fermée EN CODE, mêmes bornes que forge.escalate) ----

    def _builder_step(self) -> str | None:
        """L'étape BUILDER de ce profil, quel que soit son nom de variante.

        Historiquement `_maybe_escalate` testait `"s9-build" not in self.order` en dur.
        Le profil `standard` (curriculum de jeux) a pour builder `s9-build-standard` :
        la garde sortait donc immédiatement et TOUTE la boucle (pool + escalade de
        modèle) était INERTE pour ce profil — pas un crash, un silence. Le run partait
        en un seul coup, sans jamais pouvoir se corriger, ce qui est précisément la
        capacité que le driver est censé apporter. Dériver le nom au lieu de le figer
        évite que la prochaine variante de builder retombe dans le même trou."""
        for etape in self.order:
            if etape.startswith("s9-build"):
                return etape
        return None

    def _steps_to_replay(self) -> tuple[str, ...]:
        """Étapes remises à PENDING quand on retente (pool) ou qu'on escalade : le
        builder du profil et ses oracles. Dérivé de `self.order` au lieu d'une liste
        figée — la liste en dur ne citait que `s9-build`/s10a/s10b/s10c, si bien que
        le profil `standard` rejouait son oracle SANS jamais rejouer son builder :
        une boucle qui re-juge un code inchangé ne peut rien corriger.

        Pour les profils existants le résultat est IDENTIQUE à l'ancienne liste
        (mêmes noms, même filtrage par appartenance à l'ordre) : ajout pur."""
        return tuple(
            e for e in self.order
            if e.startswith("s9-build") or e.startswith("s10")
        )

    def _maybe_escalate(self, state: dict) -> bool:
        """Évaluée quand la boucle atteint la 1re étape post-oracles. True =
        s9 + oracles remis à PENDING (re-build au tier supérieur)."""
        builder = self._builder_step()
        if builder is None:
            return False
        code_st = state["steps"].get("s10a-oracle-code", {}).get("status")
        wire_st = state["steps"].get("s10c-oracle-wiremap", {}).get("status")
        # s10s : oracle des SIX volets du standard — son FAIL doit déclencher le
        # re-build au même titre que le code ou la wiremap, sinon le profil `standard`
        # constate l'échec sans jamais le corriger. Ajout STRICTEMENT additif :
        # s10b-archi reste volontairement HORS du prédicat, exactement comme avant,
        # et pour `full` (où s10s n'est pas dans l'ordre) le prédicat est inchangé.
        std_st = state["steps"].get("s10s-oracle-standard", {}).get("status")
        # FAIL uniquement : BLOCKED = infra/hypothèse inconnue, ré-escalader le
        # builder n'y changerait rien (et le gel violé est un STOP dur).
        oracle_fail = code_st == "FAIL" or wire_st == "FAIL" or std_st == "FAIL"
        s9_detail = state["steps"][builder].get("detail", {})
        requested, why = parse_agent_escalation(s9_detail.get("output_excerpt", ""))

        # Tier 2.5 étape 2 : un builder_run par TENTATIVE s9, succès inclus (sinon
        # "quels builders réussissent toujours" resterait invisible). Best-effort.
        model_for_metrics = state.get("model_override") or s9_detail.get("model", "")
        try:
            record_builder_run(
                self.run_id,
                tier=tier_of(model_for_metrics),
                builder_id=model_for_metrics or "inconnu",
                strategy=("pool_retry" if int(state.get("pool_attempts", 0)) > 0
                          else "tier_attempt"),
                duration_s=float(s9_detail.get("duration_s", 0.0)),
                oracle_result=code_st or "",
                retry_number=int(state.get("pool_attempts", 0)),
                tokens=int(s9_detail.get("tokens", 0)),
                cost_usd=float(s9_detail.get("cost_usd", 0.0)),
                telemetry_path=self.builder_runs_path,
            )
        except OSError:
            logger.warning("builder_run non écrit pour %s (non bloquant)", self.run_id)

        if not (oracle_fail or requested):
            return False

        # Tier 2 #5 (Concept A) : sur un FAIL d'oracle SEULEMENT (jamais sur une
        # demande explicite de l'agent — lui sait que ce tier est trop faible,
        # retenter n'y changerait rien), retente d'abord le MÊME tier avant
        # d'escalader de modèle. Un FAIL peut être un aléa du tirage, pas une
        # preuve que le tier est trop faible. Zéro surcoût si l'oracle est vert
        # dès le 1er essai (cette branche n'est jamais atteinte dans ce cas).
        if oracle_fail and not requested:
            pool = pool_decision(
                oracle_ok=False,
                attempts_at_current_tier=int(state.get("pool_attempts", 0)) + 1,
                pool_size=self.pool_size,
            )
            if pool.retry_same_tier:
                state["pool_attempts"] = int(state.get("pool_attempts", 0)) + 1
                for e in self._steps_to_replay():
                    state["steps"][e]["status"] = "PENDING"
                self._premortem_cache = None  # la re-tentative relit le journal À JOUR
                logger.info("pool: %s", pool.reason)
                self._save(state)
                return True
            # pool épuisé à ce tier -> retombe dans l'escalade de modèle ci-dessous.

        current = state.get("model_override") or s9_detail.get("model", "")
        d = escalation_decision(
            current,
            oracle_ok=not oracle_fail,
            agent_requested=requested,
            agent_reason=why,
            escalations_so_far=int(state.get("escalations", 0)),
        )
        if not d.escalate:
            note = f"escalade refusée: {d.reason}"
            notes = state.setdefault("humangate_notes", [])
            if note not in notes:
                notes.append(note)
                self._save(state)
            return False
        state["model_override"] = d.next_model
        state["escalations"] = int(state.get("escalations", 0)) + 1
        state["pool_attempts"] = 0  # nouveau tier -> budget de pool reinitialise
        for e in self._steps_to_replay():
            state["steps"][e]["status"] = "PENDING"
        self._premortem_cache = None  # le re-build au tier +fort relit le journal À JOUR
        # P3 (lot dégel 2) : le WHY d'une escalade RÉUSSIE ne survivait qu'au
        # `logger.info` ci-dessous (aucun FileHandler n'existait avant ce lot,
        # cf. `_attach_run_log_handler`) — perdu dès que le process disparaît.
        # Même patron que l'escalade REFUSÉE juste au-dessus (`humangate_notes`,
        # dédupliquée) : le motif d'une escalade honorée devient, lui aussi,
        # durable dans `state.json`.
        note = f"escalade #{state['escalations']}: {d.reason}"
        notes = state.setdefault("humangate_notes", [])
        if note not in notes:
            notes.append(note)
        logger.info("escalade #%s: %s", state["escalations"], d.reason)
        self._save(state)
        return True

    # --- rapports -------------------------------------------------------------

    def _cost_and_effort(self, state: dict) -> dict:
        """Coût réel (connecteur 3, `studio_link.run_cost`) + pool réel (Tier 2.5
        étape 2, `studio_link.pool_stats`) + effort réel (déjà présent dans
        `state.json` : escalades, tentatives de pool, tentatives par étape).
        Best-effort sur le coût ET sur le pool (une télémétrie illisible ne casse
        jamais le rapport) — RÈGLE DURE, identique pour les deux : distingue
        explicitement NON MESURÉ (fichier de télémétrie absent ou vide) d'un ZÉRO
        réellement mesuré. Afficher « 0 token » ou « pool_saves: 0 » pour un run
        dont le fichier source n'existe pas (ex. worktree neuf : `lab/forge_evidence`
        est gitignoré) serait une affirmation fausse (cf. commande de fabrication) ;
        un `pool_attempts` à 0 tiré de `state.json`, lui, est un vrai zéro (aucune
        re-tentative), jamais maquillé. Coût et pool sont ACCESSOIRES au verdict :
        ils dégradent, ils n'emportent JAMAIS le rapport d'un run réussi."""
        tpath = self.telemetry_path or DEFAULT_TELEMETRY
        try:
            telemetry_measured = tpath.exists() and tpath.stat().st_size > 0
        except OSError:
            telemetry_measured = False
        try:
            cost = run_cost(self.run_id, telemetry_path=self.telemetry_path)
        except (OSError, ValueError):
            # ValueError couvre JSONDecodeError : `studio_link._read` fait un
            # `json.loads` NU par ligne, et `forge_telemetry.jsonl` est écrit en
            # APPEND par des sous-processus concurrents qu'on tue par arbre au
            # timeout (FIR-01) — une ligne tronquée est un cas réel, pas théorique.
            # Cette fragilité était inoffensive tant que rien n'appelait `run_cost` ;
            # depuis qu'elle est branchée ici, une seule ligne corrompue ferait
            # planter le rapport final d'un run PAR AILLEURS RÉUSSI. Le coût est
            # accessoire au verdict : il dégrade, il n'emporte jamais le rapport.
            cost = {"run_id": self.run_id, "calls": 0, "total_tokens": 0,
                    "total_duration_s": 0.0}
            telemetry_measured = False
        cost["measured"] = telemetry_measured
        if not telemetry_measured:
            cost["reason"] = (
                f"{tpath} absent ou vide — coût NON MESURÉ (pas un zéro réel)")

        bpath = self.builder_runs_path or DEFAULT_BUILDER_RUNS
        try:
            builder_runs_measured = bpath.exists() and bpath.stat().st_size > 0
        except OSError:
            builder_runs_measured = False
        try:
            pool = pool_stats(self.run_id, telemetry_path=self.builder_runs_path)
        except (OSError, ValueError):
            # Même garantie que pour `cost` ci-dessus : `forge_builder_runs.jsonl`
            # est écrit en APPEND par les mêmes sous-processus concurrents (une
            # tentative s9-build par ligne) et peut être tronqué au même timeout.
            pool = {"run_id": self.run_id, "attempts": 0, "pool_saves": 0,
                    "escalations_avoided_cost_usd": 0.0, "by_builder": {}}
            builder_runs_measured = False
        pool["measured"] = builder_runs_measured
        if not builder_runs_measured:
            pool["reason"] = (
                f"{bpath} absent ou vide — pool NON MESURÉ (pas un zéro réel)")

        # LECTEUR de `spawn_executed` (DISPATCH_SPAWN_AUTHORITY_V1) — la preuve d'action
        # entre dans le rapport humain de fin de run, à côté du coût et du pool. Rend
        # visible ce que personne ne pouvait voir : l'écart entre les dispatches PRÉPARÉS
        # et les spawns réellement EXÉCUTÉS (`unproven`), et la duplication de préparation
        # (`prepared` >> `prepared_distinct`, cas réel pong-01 : 8 lignes / 2 triplets).
        # Même règle dure que cost/pool : audit absent ou vide => measured=False + raison,
        # jamais un « 0 exécuté » silencieux. Clé d'audit par défaut (pas self.key_file,
        # qui est la clé de verdict) : c'est celle avec laquelle prepare_dispatch signe.
        # Accessoire au verdict comme cost/pool : il dégrade, il n'emporte jamais un run.
        try:
            spawn = spawn_proof(self.run_id, audit_path=self.audit_path)
        except Exception:  # noqa: BLE001 — une preuve illisible ne casse pas le rapport
            spawn = {"run_id": self.run_id, "measured": False, "prepared": 0,
                     "prepared_distinct": 0, "authorized": 0, "executed": 0,
                     "unproven": [], "reason": "audit de dispatch illisible — NON MESURÉ"}

        steps = state.get("steps") or {}
        return {
            "cost": cost,
            "pool": pool,
            "spawn": spawn,
            "effort": {
                "escalations": int(state.get("escalations", 0)),
                "pool_attempts": int(state.get("pool_attempts", 0)),
                "attempts_total": sum(int(st.get("attempts", 0)) for st in steps.values()),
                "steps_with_retries": {
                    e: int(st.get("attempts", 0)) for e, st in steps.items()
                    if int(st.get("attempts", 0)) > 1
                },
            },
        }

    def _final_report(self, state: dict) -> dict:
        self._reference_guard_check("close")
        base = {
            "run_id": self.run_id,
            "project": self.project,
            "profile": self.profile,
            "status": "DONE",
            "evidence_verdict": EVIDENCE_VERDICT,
            "claim_verdict": CLAIM_VERDICT,
            "state_path": str(self.state_path),
            **self._cost_and_effort(state),
        }
        s12 = state["steps"].get("s12-verdict", {})
        detail = s12.get("detail", {})
        verdict_path = detail.get("verdict_path", "")
        if s12.get("status") == "OK" and verdict_path and Path(verdict_path).exists():
            record = json.loads(Path(verdict_path).read_text(encoding="utf-8"))
            return {
                **base,
                "software_verdict": record["software_verdict"],
                "decision": record["decision"],
                "humangate_flags": list(record.get("humangate_flags", ())),
                "verdict_path": verdict_path,
                "reason": "",
            }
        return {
            **base,
            "software_verdict": "BLOCKED",
            "decision": "BLOCKED",
            "humangate_flags": list(state.get("humangate_notes", [])),
            "verdict_path": "",
            "reason": "chaîne terminée sans verdict signé exploitable "
                      "(profil sans s12, ou agrégation non aboutie)",
        }

    def _frozen_report(self, state: dict) -> dict:
        """FROZEN_HUMAN : gel explicite par décision humaine (ni DONE ni HALTED,
        ni un échec). N'exécute rien, ne mute pas le state — se contente de
        rapporter la trace qui/quand/pourquoi posée dans state['frozen']."""
        frozen = state.get("frozen") or {}
        reason = frozen.get("reason") or "run gelé par décision humaine (run_status=FROZEN_HUMAN, détail absent de state['frozen'])"
        return {
            "run_id": self.run_id,
            "project": self.project,
            "profile": self.profile,
            "status": "FROZEN_HUMAN",
            "software_verdict": "BLOCKED",
            "evidence_verdict": EVIDENCE_VERDICT,
            "claim_verdict": CLAIM_VERDICT,
            "decision": "BLOCKED",
            "humangate_flags": [reason],
            "verdict_path": "",
            "state_path": str(self.state_path),
            "reason": reason,
            "frozen": frozen,
        }

    def _halted_report(self, reason: str, state_known: bool = True) -> dict:
        return {
            "run_id": self.run_id,
            "project": self.project,
            "profile": self.profile,
            "status": "HALTED",
            "software_verdict": "BLOCKED",
            "evidence_verdict": EVIDENCE_VERDICT,
            "claim_verdict": CLAIM_VERDICT,
            "decision": "BLOCKED",
            "humangate_flags": [reason] if reason else [],
            "verdict_path": "",
            "state_path": str(self.state_path) if state_known else "",
            "reason": reason,
        }

    # --- game-ness re-dérivée (P0.3) ------------------------------------------

    def _effective_is_game(self, state: dict) -> bool:
        """La game-ness du RUN, dérivée de l'UNION des signaux objectifs, jamais
        crue depuis le seul state.json (non signé, éditable). Un run reste un jeu
        tant qu'UN signal subsiste : flag param, flag state, marqueurs du reçu code
        (e2e/mutation), harnais présent dans src_root, fichier d'évidence mutation.

        Limite honnête (résiduelle) : un producteur qui EFFACE tous ces signaux
        on-disk (state + detail + src_root + fichier d'évidence) peut présenter le
        run comme un non-jeu — c'est le même périmètre de contrôle-fichier que
        l'isolation du signataire (I7, hors périmètre), et il ne fabrique alors
        aucune affirmation fausse sur des mécaniques de jeu (rien ne le marque
        comme jeu)."""
        if self.is_game or bool(state.get("is_game")):
            return True
        code = (state.get("steps") or {}).get("s10a-oracle-code", {})
        detail = code.get("detail") or {}
        if "mutation" in detail or "e2e" in detail or "solvability" in detail:
            return True
        if self.src_root is not None and any(
                (self.src_root / f).exists() for f in ("run-oracle.mjs", "e2e.mjs")):
            return True
        return (self.run_dir / "evidence" / f"mutation_{self.run_id}.json").exists()

    # --- utilitaires -----------------------------------------------------------

    @staticmethod
    def _read_json(path: Path) -> dict | None:
        """Lit un JSON d'entrée ; absent/illisible => None (l'appelant BLOQUE)."""
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None
        return data if isinstance(data, dict) else None

    @staticmethod
    def _read_yaml(path: Path) -> dict | None:
        """Lit un YAML d'entrée ; absent/illisible/mal formé => None (l'appelant BLOQUE).
        Jamais d'exception — même discipline que _read_json (F2b, crash-loop évité)."""
        if not path.exists():
            return None
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except (OSError, yaml.YAMLError):
            return None
        return data if isinstance(data, dict) else None

    @staticmethod
    def _load_brick_catalog(path: Path) -> dict[str, dict] | None:
        """Charge knowledge_base/catalog.json et n'en retient QUE les entrées `brick`
        (BRICK_SPEC, knowledge_base/kb-validate.mjs — champ `brick_id`, distinct des
        entrées `asset`), indexées par `brick_id`. Jamais d'exception : catalogue
        absent/illisible/mal formé => None (l'appelant déclare le volet budget NON
        MESURÉ, jamais un faux vert par catalogue fantôme)."""
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            # ValueError couvre JSONDecodeError. Sans lui, la docstring ci-dessus
            # (« mal formé => None ») était une promesse non tenue : un catalogue
            # au JSON cassé faisait LEVER l'oracle de budget au lieu de le déclarer
            # NON MESURÉ. Même famille que `_read_json`/`_load_state`.
            return None
        if not isinstance(data, dict):
            return None
        entries = data.get("entries")
        if not isinstance(entries, list):
            return None
        out: dict[str, dict] = {}
        for e in entries:
            if (isinstance(e, dict) and e.get("entry_type") == "brick"
                    and isinstance(e.get("brick_id"), str) and e["brick_id"]):
                out[e["brick_id"]] = e
        return out

    def _catalog_brick_ids_snapshot(self) -> list[str] | None:
        """Instantané des `brick_id` du catalogue AU DÉMARRAGE du run — capturé une
        seule fois par `_load_state` (jamais recalculé à la reprise). None si le
        catalogue est illisible à cet instant (le volet budget sera NON MESURÉ)."""
        catalog = self._load_brick_catalog(self.catalog_path)
        return sorted(catalog.keys()) if catalog is not None else None
