#!/usr/bin/env python3
"""test_kernel_loops.py — couverture des 4 boucles noyau (SUBAGENT 2).

Boucles couvertes :
  1. Brief        -> scripts/council.py            (run_council / CouncilResult)
  2. Implementation -> lab/chains/kaizen_autoloop.py (run_loop / acquire_lock / journal_error)
  3. Improvement  -> governance/error_journal.py    (record_error -> error_proposals.jsonl)
  4. Memory       -> scripts/ingest_event.py         (append_event_log / verify_event_log + HMAC)

Contraintes (CLAUDE.md) :
  - aucune modification de code de production (tests only) ;
  - hermetique : tmp_path + monkeypatch UNIQUEMENT, aucun reseau, aucun LM reel,
    aucun subprocess reel (tous monkeypatches), aucune ecriture hors tmp_path ;
  - encoding='utf-8' explicite sur tout open().

Les assertions sont liees a l'API REELLE lue dans le code. Quand le comportement
decrit dans le brief differe du code, un commentaire "GAP:" documente l'ecart
(on NE modifie PAS la source pour coller au test).
"""
from __future__ import annotations

import asyncio
import json
import sys
import types
from pathlib import Path

import pytest

# ── sys.path : governance/ et lab/chains/ ne sont pas des packages ────────────
_REPO = Path(__file__).resolve().parents[2]
for _p in (_REPO / "governance", _REPO / "scripts", _REPO / "lab" / "chains"):
    sp = str(_p)
    if sp not in sys.path:
        sys.path.insert(0, sp)

import council  # noqa: E402  (scripts/council.py)
import error_journal as ej  # noqa: E402  (governance/error_journal.py)
import ingest_event as ie  # noqa: E402  (scripts/ingest_event.py)
import kaizen_autoloop as ka  # noqa: E402  (lab/chains/kaizen_autoloop.py)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║ Stubs partages                                                            ║
# ╚══════════════════════════════════════════════════════════════════════════╝

_VALID_OPINION_JSON = json.dumps({
    "stance": "APPROUVE",
    "rationale": "rationale stub",
    "plan": "step 1; step 2",
    "risks": [],
    "hypotheses": ["alt-hypothese"],
    "evidence_files": [],
})


class FakeAdapter:
    """Adapter LLM factice conforme au Protocol council.LLMAdapter.

    `response` : str renvoye par complete(), OU callable(prompt)->str, OU None.
    `raise_exc` : exception levee par complete() (ex: council.CouncilCallError).
    `sleep_s` : duree de blocage (pour simuler un timeout SANS dormir 120s).
    """

    def __init__(self, model, *, response=_VALID_OPINION_JSON, available=True,
                 raise_exc=None, sleep_s=0.0):
        self.model = model
        self._response = response
        self._available = available
        self._raise = raise_exc
        self._sleep_s = sleep_s
        self.calls: list[str] = []

    def is_available(self) -> bool:
        return self._available

    def complete(self, prompt: str, *, read_timeout: float = council._READ_TIMEOUT_S) -> str:
        self.calls.append(prompt)
        if self._sleep_s:
            import time as _t
            _t.sleep(self._sleep_s)
        if self._raise is not None:
            raise self._raise
        if callable(self._response):
            return self._response(prompt)
        return self._response


def _run(coro):
    """Execute une coroutine (pas de dependance pytest-asyncio)."""
    return asyncio.run(coro)


def _task():
    return council.CouncilTask(brief="Refactor a pure helper.", task_id="TEST-001")


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║ BOUCLE 1 — Brief (council.run_council / CouncilResult)                    ║
# ╚══════════════════════════════════════════════════════════════════════════╝
#
# API reelle liee :
#   - entrypoint async run_council(task: CouncilTask, adapters: dict[ModelId, LLMAdapter],
#       *, write=True, timeout=ROLE_TIMEOUT_S(=120), ...) -> CouncilResult
#   - CouncilResult a .requires_humangate / .disagreements / .opinions / .collapsed
#     / .distinct_models  (PAS de .confidence — GAP: le champ confidence n'existe pas).
#   - fallback Qwen est encode dans ROLE_ROUTING (PLAN_REVIEW: CLAUDE->QWEN,
#     DIVERGENCE: GEMINI->QWEN, RED_TEAM: QWEN->None).
#   - write=False pour rester hermetique (pas de governor write / pas d'I/O fichier).


def test_council_minimal_returns_result():
    """Tache minimale + 3 adapters sains -> CouncilResult complet, 3 opinions."""
    adapters = {
        council.ModelId.CLAUDE: FakeAdapter(council.ModelId.CLAUDE),
        council.ModelId.QWEN14B: FakeAdapter(council.ModelId.QWEN14B),
        council.ModelId.GEMINI_FLASH: FakeAdapter(council.ModelId.GEMINI_FLASH),
    }
    res = _run(council.run_council(_task(), adapters, write=False))

    assert isinstance(res, council.CouncilResult)
    assert res.task_id == "TEST-001"
    assert len(res.opinions) == 3
    assert res.distinct_models == 3
    assert res.collapsed is False
    # tous sains, aucune objection BLOQUE -> pas d'escalade HumanGate.
    assert res.requires_humangate is False
    assert res.claim_posture == "NO_CLAIM_ALLOWED"
    # le role DIVERGENCE est force a la stance DIVERGENCE (RT-198).
    div = next(o for o in res.opinions if o.role is council.CouncilRole.DIVERGENCE)
    assert div.stance is council.Stance.DIVERGENCE


def test_council_fallback_to_qwen_when_claude_down():
    """Claude proxy indisponible -> PLAN_REVIEW degrade vers Qwen (fallback)."""
    adapters = {
        council.ModelId.CLAUDE: FakeAdapter(council.ModelId.CLAUDE, available=False),
        council.ModelId.QWEN14B: FakeAdapter(council.ModelId.QWEN14B),
        council.ModelId.GEMINI_FLASH: FakeAdapter(council.ModelId.GEMINI_FLASH),
    }
    res = _run(council.run_council(_task(), adapters, write=False))

    plan = next(o for o in res.opinions if o.role is council.CouncilRole.PLAN_REVIEW)
    # PLAN_REVIEW a bascule sur le fallback Qwen et reste disponible.
    assert plan.model is council.ModelId.QWEN14B
    assert plan.fallback_used is True
    assert plan.available is True


def test_council_fallback_when_claude_adapter_raises():
    """Variante : l'adapter Claude EXISTE mais leve a complete() -> fallback Qwen.

    is_available() True puis complete() leve CouncilCallError : _call_role attrape
    et passe au fallback Qwen. Couvre la degradation 'proxy up mais appel KO'."""
    adapters = {
        council.ModelId.CLAUDE: FakeAdapter(
            council.ModelId.CLAUDE, raise_exc=council.CouncilCallError("call_failed")),
        council.ModelId.QWEN14B: FakeAdapter(council.ModelId.QWEN14B),
        council.ModelId.GEMINI_FLASH: FakeAdapter(council.ModelId.GEMINI_FLASH),
    }
    res = _run(council.run_council(_task(), adapters, write=False))
    plan = next(o for o in res.opinions if o.role is council.CouncilRole.PLAN_REVIEW)
    assert plan.model is council.ModelId.QWEN14B
    assert plan.fallback_used is True


def test_council_timeout_escalates_to_humangate():
    """Timeout par role -> roles indisponibles/degrades -> requires_humangate True.

    On simule le timeout avec un adapter qui bloque (sleep court) et un budget
    `timeout` minuscule : asyncio.wait_for leve TimeoutError. JAMAIS de sleep 120s.
    GAP: le code n'a pas de constante '120s' cablee dans run_council autre que le
    defaut ROLE_TIMEOUT_S=120 ; on l'override pour rester rapide et hermetique."""
    assert council.ROLE_TIMEOUT_S == 120  # contrat documente (defaut)
    adapters = {
        council.ModelId.CLAUDE: FakeAdapter(council.ModelId.CLAUDE, sleep_s=0.4),
        council.ModelId.QWEN14B: FakeAdapter(council.ModelId.QWEN14B, sleep_s=0.4),
        council.ModelId.GEMINI_FLASH: FakeAdapter(council.ModelId.GEMINI_FLASH, sleep_s=0.4),
    }
    res = _run(council.run_council(_task(), adapters, write=False, timeout=0.05))

    # tous les roles ont expire -> aucun modele disponible -> collapsed + degraded.
    assert res.requires_humangate is True
    assert res.collapsed is True
    assert all((not o.available) for o in res.opinions)
    assert any(o.timed_out for o in res.opinions)


def test_council_disagreement_detected():
    """RED_TEAM stance BLOQUE avec risks -> .disagreements non vide (escalade HumanGate).

    Adapters distincts par modele -> chaque role est servi par un seul adapter :
      PLAN_REVIEW=CLAUDE (APPROUVE), RED_TEAM=QWEN (BLOQUE+risks), DIVERGENCE=GEMINI.
    """
    bloque_json = json.dumps({
        "stance": "BLOQUE",
        "rationale": "faille critique",
        "risks": ["race condition sur le lock", "pas de rollback"],
        "evidence_files": [],
    })
    adapters = {
        council.ModelId.CLAUDE: FakeAdapter(council.ModelId.CLAUDE),
        council.ModelId.QWEN14B: FakeAdapter(council.ModelId.QWEN14B, response=bloque_json),
        council.ModelId.GEMINI_FLASH: FakeAdapter(council.ModelId.GEMINI_FLASH),
    }
    res = _run(council.run_council(_task(), adapters, write=False))

    assert len(res.disagreements) >= 1
    topics = {d.topic for d in res.disagreements}
    assert "race condition sur le lock" in topics
    # un desaccord force l'escalade HumanGate.
    assert res.requires_humangate is True
    # tous les desaccords routent vers HumanGate (pas d'auto-resolution v1).
    assert all(d.route == "HUMANGATE" for d in res.disagreements)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║ BOUCLE 2 — Implementation (kaizen_autoloop)                               ║
# ╚══════════════════════════════════════════════════════════════════════════╝
#
# API reelle liee :
#   - lock : acquire_lock(lock_path) / release_lock(lock_path) — O_EXCL atomique,
#     auto-release si stale (PID mort / TTL). Second appel concurrent -> False.
#   - oracle RED  : run_loop -> validate_report()==False -> journal_error(report) ;
#     journal_error route vers error_journal.record_error (ERROR_JOURNAL_PATH).
#   - oracle GREEN: run_loop -> validate_report()==True -> close_imp(imp)
#     (close_imp = subprocess kaizen_loop.py close — stubbe ici).
#   GAP: la mutation CLOSED reelle est faite par le subprocess kaizen_loop.py
#   (separe) ; on verifie le CONTRAT 'green -> close_imp(imp) appele', pas l'ecriture
#   du ledger (hors scope hermetique, stubbe). On stub aussi log_cost/metrics/
#   log_autoloop_event/_ingest_imp_closed qui ecrivent HORS tmp_path.


def _imp():
    return {"id": "IMP-TEST", "title": "stub imp", "lane": "SAFE_AUTO",
            "acceptance": "ok", "files": []}


def _wire_runloop(monkeypatch, tmp_path, *, report: str):
    """Cable run_loop pour un passage unique hermetique. Retourne un dict de captures."""
    captured: dict = {"closed": [], "events": []}
    imp = _imp()

    # etat : 1 IMP OPEN, propose() renvoie notre IMP.
    monkeypatch.setattr(ka, "recall", lambda: {
        "open_count": 1, "closed_count": 0, "blocked_count": 0, "deferred_count": 0,
        "data": {"improvements": [imp]}, "ledger_path": tmp_path / "ledger.yaml",
    })
    monkeypatch.setattr(ka, "propose", lambda lane_filter=None, data=None: imp)

    # charter : fichier reel sous tmp_path (log_cost/execute le lisent si non stubbe).
    charter = tmp_path / "IMP-TEST_charter.md"
    charter.write_text("# charter stub\n", encoding="utf-8")
    monkeypatch.setattr(ka, "generate_charter", lambda i: str(charter))

    # council gate (IMP-208, ajout SA3) : neutralise via son seam concu pour les tests.
    # (None, False) = pas d'escalade -> execution autorisee. On teste le contrat oracle,
    # pas le council ici (couvert par BOUCLE 1).
    monkeypatch.setattr(ka, "run_council_gate", lambda i, cp: (None, False))

    # execution : pas de subprocess / pas de CLI Claude reelle.
    # signature SA3 : execute_via_claude_code(charter_path, imp, consensus=None).
    monkeypatch.setattr(ka, "execute_via_claude_code",
                        lambda cp, i, consensus=None: report)

    # close + side-effects hors tmp_path -> stubbes (capture pour assertions).
    monkeypatch.setattr(ka, "close_imp", lambda i: captured["closed"].append(i["id"]))
    monkeypatch.setattr(ka, "metrics", lambda: None)
    monkeypatch.setattr(ka, "log_cost", lambda *a, **k: None)
    monkeypatch.setattr(ka, "log_autoloop_event",
                        lambda i, status, rep: captured["events"].append(status))
    monkeypatch.setattr(ka, "_ingest_imp_closed", lambda i: None)
    monkeypatch.setattr(ka, "_archive", None)  # pas d'ecriture golden_examples.jsonl

    # journal d'erreurs -> tmp_path (BOUCLE 2 RED + reutilise par BOUCLE 3).
    monkeypatch.setattr(ka, "ERROR_JOURNAL_PATH", tmp_path / "error_journal.jsonl")
    monkeypatch.setattr(ka, "ERROR_PROPOSALS_PATH", tmp_path / "error_proposals.jsonl")
    return captured, imp


def _args(**kw):
    base = {"once": True, "imp_id": None, "lane": "SAFE_AUTO", "dry_run": False}
    base.update(kw)
    return types.SimpleNamespace(**base)


def test_kaizen_oracle_green_closes_imp(monkeypatch, tmp_path):
    """Rapport oracle VERT -> validate_report True -> close_imp(imp) appele."""
    captured, imp = _wire_runloop(monkeypatch, tmp_path,
                                  report="tests passed\nsoftware_verdict: DOCS_OK\n[ok]")
    ka.run_loop(_args())

    assert captured["closed"] == ["IMP-TEST"]
    assert "SUCCESS" in captured["events"]
    # pas de journal d'erreur ecrit sur un succes.
    assert not (tmp_path / "error_journal.jsonl").exists()


def test_kaizen_oracle_red_journals_error(monkeypatch, tmp_path):
    """Rapport oracle ROUGE -> validate_report False -> entree dans error_journal,
    et close_imp N'EST PAS appele."""
    captured, imp = _wire_runloop(monkeypatch, tmp_path,
                                  report="software_verdict: BLOCKED\nFAILED")
    ka.run_loop(_args())

    assert captured["closed"] == []           # jamais ferme sur oracle rouge
    assert "FAIL" in captured["events"]
    journal = tmp_path / "error_journal.jsonl"
    assert journal.exists()
    lines = [l for l in journal.read_text(encoding="utf-8").splitlines() if l.strip()]
    assert len(lines) >= 1
    entry = json.loads(lines[0])
    assert "signature" in entry and "hmac" in entry  # journal signe HMAC


def test_kaizen_lock_blocks_second_invocation(tmp_path):
    """Double lancement : le 2e acquire_lock echoue tant que le 1er detient le lock.

    Meme PID (vivant) -> le lock n'est PAS considere stale -> False au 2e appel.
    Apres release, l'acquisition redevient possible (idempotence du cycle)."""
    lock = tmp_path / ".autoloop.lock"
    assert ka.acquire_lock(lock) is True       # 1er process : acquiert
    assert lock.exists()
    assert ka.acquire_lock(lock) is False      # 2e process : bloque (vivant + recent)

    ka.release_lock(lock)
    assert not lock.exists()
    assert ka.acquire_lock(lock) is True       # libere -> re-acquerable
    ka.release_lock(lock)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║ BOUCLE 3 — Improvement (error_journal.record_error)                       ║
# ╚══════════════════════════════════════════════════════════════════════════╝
#
# API reelle liee : record_error(error_text, *, journal_path, proposals_path,
#   now_ts, patterns=KNOWN_PATTERNS, governor_mod=governor) -> Outcome(kind=...).
#
# GAP vs brief ("3x -> proposition") : le code emet une proposition PROPOSED des la
# 1ere occurrence d'une erreur INCONNUE (kind='proposed'). Le seuil 3 declenche une
# ESCALADE supplementaire (build_escalation, escalated=True) au 3e passage, emise
# UNE SEULE fois par signature (idempotente). On teste donc le contrat REEL :
#   - 1ere occurrence inconnue -> PROP-<sig> dans error_proposals.jsonl ;
#   - 3e occurrence -> entree escalated supplementaire (occurrences>=3) ;
#   - 4e occurrence -> AUCUNE nouvelle entree (idempotence de l'escalade).


_UNKNOWN_ERR = "WidgetService exploded in frobnicator stage 7 with code banana"


def _proposals_lines(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]


def test_error_journal_unknown_error_creates_proposal(tmp_path):
    """Erreur inconnue -> proposition PROPOSED (PROP-<sig>) dans error_proposals.jsonl."""
    journal = tmp_path / "error_journal.jsonl"
    proposals = tmp_path / "error_proposals.jsonl"
    out = ej.record_error(_UNKNOWN_ERR, journal_path=journal, proposals_path=proposals,
                          now_ts=1_000)
    assert out.kind == "proposed"
    props = _proposals_lines(proposals)
    assert len(props) == 1
    assert props[0]["status"] == "PROPOSED"
    assert props[0]["proposal_id"].startswith("PROP-")
    assert props[0]["lane"] == "AUDIT_REQUIRED"   # jamais auto-pickable (RED TEAM C1)
    assert props[0]["closed"] is False


def test_error_journal_three_occurrences_escalate(tmp_path):
    """Meme erreur 3x : proposition (1x) + escalade (1x, occurrences>=3)."""
    journal = tmp_path / "error_journal.jsonl"
    proposals = tmp_path / "error_proposals.jsonl"
    kinds = [ej.record_error(_UNKNOWN_ERR, journal_path=journal, proposals_path=proposals,
                             now_ts=1_000 + i).kind for i in range(3)]
    # 1: proposed, 2: duplicate (occ=2 < 3), 3: escalated (occ=3 >= seuil).
    assert kinds == ["proposed", "duplicate", "escalated"]
    props = _proposals_lines(proposals)
    assert len(props) == 2                          # proposition + escalade
    escal = props[1]
    assert escal["escalated"] is True
    assert escal["occurrences"] >= ej.ESCALATE_THRESHOLD
    assert escal["lane"] == "AUDIT_REQUIRED"
    # meme signature -> meme proposal_id (dedup stable).
    assert props[0]["proposal_id"] == escal["proposal_id"]


def test_error_journal_idempotent_no_duplicate_proposal(tmp_path):
    """4e occurrence -> AUCUNE nouvelle entree de proposition (escalade idempotente)."""
    journal = tmp_path / "error_journal.jsonl"
    proposals = tmp_path / "error_proposals.jsonl"
    for i in range(3):
        ej.record_error(_UNKNOWN_ERR, journal_path=journal, proposals_path=proposals,
                        now_ts=1_000 + i)
    before = _proposals_lines(proposals)
    out4 = ej.record_error(_UNKNOWN_ERR, journal_path=journal, proposals_path=proposals,
                           now_ts=1_004)
    after = _proposals_lines(proposals)
    assert out4.kind == "duplicate"                 # deja escalade -> rien de neuf
    assert len(after) == len(before)                # idempotent : 0 nouvelle proposition
    # le journal, lui, garde TOUTES les occurrences (4 lignes).
    jlines = [l for l in journal.read_text(encoding="utf-8").splitlines() if l.strip()]
    assert len(jlines) == 4


def test_error_journal_known_pattern_recalls_fix_no_proposal(tmp_path):
    """Erreur CONNUE (pattern ancre) -> rappel du fix, AUCUNE proposition.

    Couvre l'autre branche du contrat : classify() matche -> kind='known'."""
    journal = tmp_path / "error_journal.jsonl"
    proposals = tmp_path / "error_proposals.jsonl"
    known = "Traceback ... UnicodeDecodeError: 'charmap' codec can't decode byte"
    out = ej.record_error(known, journal_path=journal, proposals_path=proposals, now_ts=2_000)
    assert out.kind == "known"
    assert out.match is not None
    assert not proposals.exists()                   # aucune proposition sur erreur connue


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║ BOUCLE 4 — Memory (ingest_event : events.jsonl + HMAC)                    ║
# ╚══════════════════════════════════════════════════════════════════════════╝
#
# API reelle liee :
#   - append_event_log(oracle, task_id) : signe + append une ligne dans EVENT_LOG.
#     task_id DOIT porter un id causal (oracle:X / imp_closed:X / system:X).
#   - _hmac(payload) : le VRAI helper HMAC (sha256(key+payload), STUDIO_HMAC_KEY).
#   - verify_event_log(raise_on_fail=False)->bool : verifie le HMAC ligne par ligne.
#   GAP de nommage : le brief dit "verify_journal()" ; pour la memoire (events.jsonl)
#   la fonction reelle est ingest_event.verify_event_log() (error_journal.verify_journal
#   est le verificateur du journal d'ERREURS, couvert separement ci-dessous).


@pytest.fixture
def _event_log(tmp_path, monkeypatch):
    log = tmp_path / "events.jsonl"
    monkeypatch.setattr(ie, "EVENT_LOG", log)
    return log


def test_memory_append_event_is_hmac_valid(_event_log):
    """append_event_log -> la ligne ecrite a un HMAC valide (verify_event_log True)."""
    ie.append_event_log("imp_closed", "imp_closed:IMP-TEST:2026-06-29T00:00:00Z")
    assert _event_log.exists()
    lines = [l for l in _event_log.read_text(encoding="utf-8").splitlines() if l.strip()]
    assert len(lines) == 1
    entry = json.loads(lines[0])
    assert "hmac" in entry and entry["hmac"]
    # le vrai helper HMAC recalcule la meme signature sur le payload canonique.
    recomputed = dict(entry)
    stored = recomputed.pop("hmac")
    payload = json.dumps(recomputed, separators=(",", ":"), sort_keys=True)
    assert ie._hmac(payload) == stored
    # et la verif de bout en bout passe.
    assert ie.verify_event_log() is True


def test_memory_verify_clean_journal_returns_true(_event_log):
    """verify_event_log() sur un journal bien forme -> True (exit 0 cote CLI)."""
    ie.append_event_log("elo_match", "oracle:elo_match:2026-06-29T00:00:00Z")
    ie.append_event_log("imp_closed", "imp_closed:IMP-XYZ:2026-06-29T00:00:01Z")
    assert ie.verify_event_log() is True
    assert ie.verify_event_log(raise_on_fail=True) is True
    # log absent = clean aussi (rien a verifier).
    _event_log.unlink()
    assert ie.verify_event_log() is True


def test_memory_tampered_journal_rejected(_event_log):
    """Defense-en-profondeur : une ligne falsifiee -> verify_event_log False / exception.

    Confirme que le HMAC est bien la garde d'integrite de la memoire."""
    ie.append_event_log("imp_closed", "imp_closed:IMP-TEST:2026-06-29T00:00:00Z")
    entry = json.loads(_event_log.read_text(encoding="utf-8").splitlines()[0])
    entry["task_id"] = "imp_closed:IMP-FORGED:2026-06-29T00:00:00Z"  # garde l'ancien hmac
    _event_log.write_text(
        json.dumps(entry, separators=(",", ":"), sort_keys=True) + "\n", encoding="utf-8")
    assert ie.verify_event_log() is False
    with pytest.raises(ie.EventLogIntegrityError):
        ie.verify_event_log(raise_on_fail=True)


def test_error_journal_verify_journal_clean(tmp_path):
    """BOUCLE 4 (variante journal d'erreurs) : error_journal.verify_journal() sur un
    journal signe par record_error -> (valides>=1, invalides=0, []).

    record_error signe chaque ligne via sign_entry (HMAC-SHA256). verify_journal
    revalide ligne par ligne."""
    journal = tmp_path / "error_journal.jsonl"
    proposals = tmp_path / "error_proposals.jsonl"
    ej.record_error(_UNKNOWN_ERR, journal_path=journal, proposals_path=proposals, now_ts=3_000)
    valid, invalid, bad = ej.verify_journal(journal)
    assert valid >= 1
    assert invalid == 0
    assert bad == []
