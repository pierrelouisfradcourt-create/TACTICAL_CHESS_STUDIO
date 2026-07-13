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
import time
from dataclasses import asdict
from pathlib import Path

from forge.contract import ContractIncomplete
from forge.dispatch import DETERMINISTIC, order_for_profile, prepare_dispatch
from forge.escalate import escalation_decision, parse_agent_escalation, tier_of
from forge.gate import forge_gate
from forge.mutation_proof import (
    emit_mutation_receipt,
    logic_files_from_wiremap,
    run_mutation_for_game,
    verify_mutation_receipt,
)
from forge.pool import DEFAULT_POOL_SIZE, pool_decision
from forge.runtime import RUNNER_CLAUDE_BLIND, RUNNER_QWEN, route_step, run_qwen_step
from forge.static_oracles import (
    check_architecture,
    check_e2e_harness,
    check_feature_set_frozen,
    check_reuse_ratio_wired,
    check_wiremap,
    frozen_features_from_wiremap,
    load_frozen_features,
)
from forge.studio_link import premortem, record_builder_run, record_telemetry
from forge.verdict import (
    CLAIM_VERDICT,
    EVIDENCE_VERDICT,
    build_aggregate_verdict,
    current_git_head,
    make_signed_receipt,
    new_nonce,
    sha256_file,
    signed_aggregate_record,
)

logger = logging.getLogger(__name__)

# Statuts d'étape. RUNNING = en cours (une étape retrouvée RUNNING à la reprise
# a été interrompue : elle est rejouée, attempts conservé — jamais silencieux).
TERMINAL_STATUSES = frozenset({"OK", "FAIL", "BLOCKED", "SKIPPED"})

# Étapes situées APRÈS le bloc d'oracles : la décision d'escalade est évaluée
# quand la boucle atteint la première d'entre elles (tous les oracles du profil
# sont alors terminaux — même point de décision que skill.md, mais en code).
_POST_ORACLE = ("s11-redteam-code", "s12-verdict")

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
        oracle_config: Path | str | None = None,
        key_file: Path | str | None = None,
        audit_path: Path | str | None = None,
        telemetry_path: Path | str | None = None,
        builder_runs_path: Path | str | None = None,
        caps_path: Path | str | None = None,
        logic_files: list[str] | None = None,
        mutation_runner=None,
        mutation_test_argv: list[str] | None = None,
        mutation_baseline_runner=None,
        pool_size: int = DEFAULT_POOL_SIZE,
    ) -> None:
        self.project = project
        self.run_id = run_id
        self.profile = profile
        self.order = order_for_profile(profile)  # profil inconnu => ValueError (fail-fast)
        self.run_dir = Path(run_dir)
        self.executor = executor
        self.src_root = Path(src_root) if src_root else None
        self.is_game = bool(is_game)
        self.oracle_config = Path(oracle_config) if oracle_config else None
        self.key_file = Path(key_file) if key_file else None
        self.audit_path = Path(audit_path) if audit_path else None
        self.telemetry_path = Path(telemetry_path) if telemetry_path else None
        self.builder_runs_path = Path(builder_runs_path) if builder_runs_path else None
        self.caps_path = Path(caps_path) if caps_path else None
        # P0.2 — preuve mutation d'un JEU : fichiers logiques explicites (sinon
        # dérivés de la WireMap), runner injectable (défaut = forge.mutation réel).
        self.logic_files = list(logic_files) if logic_files else None
        self.mutation_runner = mutation_runner
        self.mutation_test_argv = list(mutation_test_argv) if mutation_test_argv else None
        self.mutation_baseline_runner = mutation_baseline_runner
        # Tier 2 #5 (Concept A) : best-of-N réactif au même tier avant d'escalader de
        # modèle. pool_size<=1 désactive le pool (chaque FAIL escalade directement).
        self.pool_size = int(pool_size)
        # P0.3 : un dossier qui porte un harnais de jeu EST un jeu — l'omission du
        # flag is_game ne désarme jamais les gates (aucun chemin vers OK sans preuve).
        if not self.is_game and self.src_root is not None and any(
                (self.src_root / f).exists() for f in ("run-oracle.mjs", "e2e.mjs")):
            self.is_game = True
            logger.info("is_game auto-détecté (harnais de jeu présent dans %s)",
                        self.src_root)
        self.state_path = self.run_dir / "state.json"
        self._premortem_cache: list[str] | None = None

    # --- boucle principale -------------------------------------------------

    def run(self) -> dict:
        """Exécute (ou REPREND) le run jusqu'au verdict signé, ou HALTED honnête."""
        self.run_dir.mkdir(parents=True, exist_ok=True)
        state, refus = self._load_state()
        if state is None:
            return self._halted_report(refus, state_known=False)
        if state.get("run_status") == "DONE":
            return self._final_report(state)  # idempotent : rien à rejouer

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
            if etape in DETERMINISTIC:
                self._run_deterministic(state, etape)
            elif not self._run_llm(state, etape):
                return self._halted_report(state.get("reason", ""))
        state["run_status"] = "DONE"
        self._save(state)
        return self._final_report(state)

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

    # --- étapes LLM (déléguées à l'exécuteur) --------------------------------

    def _run_llm(self, state: dict, etape: str) -> bool:
        """Retourne False si le run doit HALTER (exécuteur absent/en échec)."""
        entry = state["steps"][etape]
        entry["attempts"] = entry.get("attempts", 0) + 1
        entry["status"] = "RUNNING"
        entry["ts"] = time.time()
        self._save(state)  # persisté AVANT l'appel : un crash laisse RUNNING (reprise)

        try:
            payload = prepare_dispatch(
                etape, self.run_id, caps_path=self.caps_path, audit_path=self.audit_path
            )
        except ContractIncomplete as exc:
            return self._halt_step(state, entry, f"contrat non activable à {etape}: {exc}")

        decision = route_step(payload)
        runner, reviewer, qwen_ok = decision.runner, decision.reviewer, False
        output: str | None = None
        blocked, findings = False, []
        tokens, duration, cost_usd = 0, 0.0, 0.0

        if decision.runner == RUNNER_QWEN:
            res = run_qwen_step(payload)
            if res["ok"]:
                output, reviewer, qwen_ok = res["output"], res["reviewer"], True
            else:
                runner, reviewer = RUNNER_CLAUDE_BLIND, res["reviewer"]

        if output is None:
            if self.executor is None:
                return self._halt_step(
                    state, entry,
                    f"aucun exécuteur LLM fourni au driver — étape {etape} "
                    "inexécutable (hypothèse inconnue = BLOCKED)",
                )
            context = {
                "run_id": self.run_id,
                "project": self.project,
                "run_dir": str(self.run_dir),
                "model_override": state.get("model_override"),
                "dispatch_marker": f"FORGE_DISPATCH:{etape}:{self.run_id}",
                "attempt": entry["attempts"],
                "premortem": self._premortem(),
            }
            res = self.executor(payload, decision, context)
            if not isinstance(res, dict) or not res.get("ok"):
                why = res.get("reason", "sans raison") if isinstance(res, dict) else "retour invalide"
                return self._halt_step(state, entry, f"exécuteur LLM en échec à {etape}: {why}")
            output = str(res.get("output", ""))
            blocked = bool(res.get("blocked", False))
            findings = list(res.get("findings", []))
            tokens = int(res.get("tokens", 0))
            duration = float(res.get("duration_s", 0.0))
            cost_usd = float(res.get("cost_usd", 0.0))

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
        }
        self._save(state)
        try:
            record_telemetry(self.run_id, etape, reviewer, tokens, duration,
                             telemetry_path=self.telemetry_path)
        except OSError:
            logger.warning("télémétrie non écrite pour %s (non bloquant)", etape)
        if etape == "s5-wiremap":
            self._freeze_rules(state)
        return True

    def _premortem(self) -> list[str]:
        if self._premortem_cache is None:
            try:
                self._premortem_cache = premortem(self.project)
            except (OSError, ValueError):
                self._premortem_cache = []
        return self._premortem_cache

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

    def _halt_step(self, state: dict, entry: dict, reason: str) -> bool:
        entry["status"] = "BLOCKED"
        entry["detail"] = {"reason": reason}
        entry["ts"] = time.time()
        state["run_status"] = "HALTED"
        state["reason"] = reason
        self._save(state)
        logger.warning("driver HALTED: %s", reason)
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
            prepare_dispatch(
                etape, self.run_id, caps_path=self.caps_path, audit_path=self.audit_path
            )
        except ContractIncomplete as exc:
            self._finish_step(state, entry, "BLOCKED",
                              {"reason": f"contrat non activable: {exc}"})
            return

        if etape == "s10a-oracle-code":
            self._run_code_oracle(state, entry)
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
        elif etape == "s12-verdict":
            self._run_verdict(state, entry)
        else:  # étape déterministe inconnue : jamais un vert par défaut
            self._finish_step(state, entry, "BLOCKED", {
                "reason": f"étape déterministe {etape!r} non câblée dans le driver"})

    def _run_code_oracle(self, state: dict, entry: dict) -> None:
        """s10a. Non-jeu : forge_gate seul (inchangé). JEU (P0.2) : le vert exige
        oracle code vert ET garde e2e verte ET reçu mutation signé vert — FAIL
        alimente l'escalade ; preuve impossible = BLOCKED (hypothèse inconnue)."""
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
        e2e = check_e2e_harness(self.src_root)
        detail["e2e"] = e2e
        # Advisory (Tier 1 #2) : ne gate jamais oracle_ok — reuse_ratio mesure,
        # il ne prouve rien. L'absence de câblage reste visible dans le reçu signé
        # (verdict.json), au lieu de dépendre de la seule citation du builder.
        detail["reuse_ratio_wired"] = check_reuse_ratio_wired(self.src_root)

        files = list(self.logic_files or [])
        if not files:
            wiremap = self._read_json(self.run_dir / "wiremap.json")
            if wiremap is not None:
                files = logic_files_from_wiremap(wiremap)
        if not files:
            detail["reason"] = (
                "fichiers logiques inconnus (ni logic_files ni wiremap.json) — "
                "preuve mutation impossible ; hypothèse inconnue = BLOCKED")
            self._finish_step(state, entry, "BLOCKED", detail)
            return

        result = run_mutation_for_game(
            self.src_root, files,
            test_argv=self.mutation_test_argv, runner=self.mutation_runner,
            baseline_runner=self.mutation_baseline_runner,
        )
        receipt = emit_mutation_receipt(
            self.run_id, self.src_root, files, result,
            key_file=self.key_file, evidence_dir=self.run_dir / "evidence",
        )
        detail["mutation"] = {"receipt": asdict(receipt.receipt),
                              "signature": receipt.signature}

        if status == "BLOCKED":
            final = "BLOCKED"
        elif status == "FAIL" or not e2e["passed"] or receipt.receipt.status != "OK":
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

    def _run_verdict(self, state: dict, entry: dict) -> None:
        code_r = self._receipt(state, "code", "s10a-oracle-code")
        archi_r = self._receipt(state, "archi", "s10b-oracle-archi")
        wire_r = self._receipt(state, "wiremap", "s10c-oracle-wiremap")
        reviewer, ran, blocked, findings = self._redteam_facts(state)
        agg = build_aggregate_verdict(
            self.project, self.run_id, code_r, archi_r, wire_r, reviewer,
            redteam_ran=ran, redteam_findings=findings, redteam_blocked=blocked,
            git_head=current_git_head(), nonce=new_nonce(), ts=time.time(),
            key_file=self.key_file,
        )
        record = signed_aggregate_record(agg, key_file=self.key_file)
        verdict_path = self.run_dir / "verdict.json"
        verdict_path.write_text(
            json.dumps(record, ensure_ascii=False, sort_keys=True, indent=1),
            encoding="utf-8",
        )
        # OK = l'agrégation a tourné ; le verdict LOGICIEL est porté par son contenu.
        self._finish_step(state, entry, "OK", {
            "verdict_path": str(verdict_path),
            "software_verdict": record["software_verdict"],
            "decision": record["decision"],
        })

    def _finish_step(self, state: dict, entry: dict, status: str, detail: dict) -> None:
        entry["status"] = status
        entry["detail"] = detail
        entry["ts"] = time.time()
        self._save(state)

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
            if self.src_root is None:
                check = {"passed": False,
                         "raisons": ["src_root absent à la vérification de la preuve"]}
            else:
                mut = detail.get("mutation") or {}
                check = verify_mutation_receipt(
                    mut.get("receipt"), mut.get("signature", ""),
                    self.run_id, self.src_root, key_file=self.key_file,
                )
            if not check["passed"]:
                status = "BLOCKED"
                detail["mutation_verification"] = check
                logger.warning("reçu code dégradé en BLOCKED (preuve mutation): %s",
                               "; ".join(check["raisons"]))
        evidence_path = detail.pop("evidence_path", "")
        return make_signed_receipt(
            oracle_id, self.run_id, status, detail,
            evidence_path=evidence_path, ts=float(st.get("ts", 0.0)),
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

    # --- escalade (boucle fermée EN CODE, mêmes bornes que forge.escalate) ----

    def _maybe_escalate(self, state: dict) -> bool:
        """Évaluée quand la boucle atteint la 1re étape post-oracles. True =
        s9 + oracles remis à PENDING (re-build au tier supérieur)."""
        if "s9-build" not in self.order:
            return False
        code_st = state["steps"].get("s10a-oracle-code", {}).get("status")
        wire_st = state["steps"].get("s10c-oracle-wiremap", {}).get("status")
        # FAIL uniquement : BLOCKED = infra/hypothèse inconnue, ré-escalader le
        # builder n'y changerait rien (et le gel violé est un STOP dur).
        oracle_fail = code_st == "FAIL" or wire_st == "FAIL"
        s9_detail = state["steps"]["s9-build"].get("detail", {})
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
                for e in ("s9-build", "s10a-oracle-code", "s10b-oracle-archi",
                          "s10c-oracle-wiremap"):
                    if e in self.order:
                        state["steps"][e]["status"] = "PENDING"
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
        for e in ("s9-build", "s10a-oracle-code", "s10b-oracle-archi",
                  "s10c-oracle-wiremap"):
            if e in self.order:
                state["steps"][e]["status"] = "PENDING"
        logger.info("escalade #%s: %s", state["escalations"], d.reason)
        self._save(state)
        return True

    # --- rapports -------------------------------------------------------------

    def _final_report(self, state: dict) -> dict:
        base = {
            "run_id": self.run_id,
            "project": self.project,
            "profile": self.profile,
            "status": "DONE",
            "evidence_verdict": EVIDENCE_VERDICT,
            "claim_verdict": CLAIM_VERDICT,
            "state_path": str(self.state_path),
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
        if "mutation" in detail or "e2e" in detail:
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
