# PLAN — IMP-202 : error_journal — pattern matcher + IMP auto-propose

**Lane:** SAFE_AUTO · **oracle_type:** code · **Impact:** MEDIUM
**blocked_by (matérialisé):** IMP-195, IMP-196 — **tous deux encore OPEN** (gate Pierre pendante).
Module **autonome** (aucun import dur de 195/196) → close possible malgré deps OPEN (précédent IMP-199).
**Acceptance:** `pytest: erreur inconnue → IMP créé ; pattern connu → fix rappelé`

> SAFE_AUTO → implémente + teste + commit (scope-strict) + **close via kaizen_loop** (flag 195/196 OPEN).
> Aucun push. `autopilot.py` non touché.

## Objectif

Un journal d'erreurs append-only + un pattern matcher déterministe :
- **erreur dont le pattern est connu** → on **rappelle le fix** (pas de proposition) ;
- **erreur inconnue** → on **auto-propose un IMP** en statut **PROPOSED** (jamais auto-close) ;
- toute écriture (journal, proposition) passe par **`governor.check()`** (BLOCK → aucune écriture).

## Architecture — cœur PUR / frontière I/O gardée (style IMP-199/200)

- **Cœur pur, déterministe** : `signature()`, `classify()`, `build_proposal()` — aucune I/O,
  aucune horloge cachée (`now_ts`/`seq` injectés). Le texte d'erreur est une **donnée opaque**.
- **Frontière I/O** : `_append_jsonl()` (append-only utf-8) — appelée seulement par `record_error`,
  **après** `governor.check()`.
- **Jamais d'auto-close** : `build_proposal` force `status="PROPOSED"`, `closed=False` ; le module
  n'expose **aucune** fonction de close. Il ne mute **jamais** `IMPROVEMENT_LEDGER.yaml`
  (création/clôture réelle = `kaizen_loop`, décision humaine).

## Design — `governance/error_journal.py`

```python
@dataclass(frozen=True) KnownPattern: id:str; regex:str; fix:str; imp_ref:str|None
KNOWN_PATTERNS: tuple[KnownPattern,...]            # seed réel (Qwen3.6/JSON, unwrap, utf-8, paths…)

@dataclass(frozen=True) Match: pattern_id:str; fix:str; imp_ref:str|None
@dataclass(frozen=True) Outcome: kind:str; match:Match|None; proposal:dict|None
                                  # kind ∈ {"known","proposed","duplicate"}

JOURNAL_MISSION  = "error_journal_write"
PROPOSE_MISSION  = "error_imp_propose"             # ∉ governor.FORBIDDEN_MISSIONS

class ErrorJournalError(Exception): ...
class JournalWriteBlocked(ErrorJournalError): ...  # governor BLOCK → pas d'écriture

def signature(error_text:str) -> str               # hash normalisé (casse/espaces/nums génériques)
def classify(error_text:str, patterns=KNOWN_PATTERNS) -> Match|None   # 1er match, déterministe
def build_proposal(error_text:str, now_ts:int) -> dict   # status=PROPOSED, closed=False
def record_error(error_text, *, journal_path, proposals_path, now_ts,
                 patterns=KNOWN_PATTERNS, governor_mod=governor) -> Outcome
```

`record_error` :
1. `governor.check({"lane":"SAFE_AUTO","mission":JOURNAL_MISSION})` ; BLOCK → `JournalWriteBlocked`
   (aucune écriture).
2. append l'erreur au journal (jsonl utf-8).
3. `m = classify(...)` :
   - `m` non-None → `Outcome("known", m, None)` (fix rappelé, **aucune** proposition).
   - `m` None → `sig = signature(...)` ; si `sig` déjà dans `proposals_path` → `Outcome("duplicate",…)`
     (idempotent, pas de doublon) ; sinon `governor.check(PROPOSE_MISSION)` → append proposition
     PROPOSED → `Outcome("proposed", None, proposal)`.

Déterminisme : `signature` normalise (lower, espaces compactés, entiers→`<n>`, hex→`<hex>`) → même
classe d'erreur ⇒ même signature ⇒ dédup stable. `classify` parcourt `patterns` dans l'ordre.

## Risques (RED TEAM — à intégrer après revue sous-agent RedTeam)

- **RT-202-1 CRITICAL — auto-close accidentel** : une proposition NE doit jamais naître CLOSED ni
  être fermée par ce module. `build_proposal` force `status=PROPOSED/closed=False` ; pas de close exposé.
  Test : statut == PROPOSED, closed False ; ledger réel inchangé.
- **RT-202-2 CRITICAL — écriture non gardée** : journal ET proposition derrière `governor.check()`.
  BLOCK → 0 écriture (side-effect nul). Test monkeypatch BLOCK → fichiers absents.
- **RT-202-3 HIGH — doublons de proposition** : même erreur inconnue ×N → 1 seule proposition
  (dédup par signature). Test : 2 appels → 1 ligne.
- **RT-202-4 HIGH — faux négatif/positif du matcher** : pattern connu DOIT matcher (fix rappelé) ;
  inconnu DOIT proposer. Tests sur seed réel + erreur inconnue.
- **RT-202-5 MEDIUM — non-déterminisme** : `now_ts`/`seq` injectés, signature normalisée, ordre de
  patterns stable. Test détermine signature reproductible.
- **RT-202-6 MEDIUM — journal corrompt l'historique** : append-only (mode 'a'), encoding utf-8
  explicite ; jamais de réécriture. Test : 2 appels → 2 lignes, la 1re préservée.
- **RT-202-7 LOW — input vide / non-str** : `record_error("")`/non-str → `ErrorJournalError` propre.

## Oracle pytest exact

```powershell
.venv312/Scripts/python.exe -m pytest scripts/phase2_tests/test_imp202_error_journal.py -v
```
Cas : pattern connu → fix rappelé (kind=known, pas de proposition) ; erreur inconnue → proposition
PROPOSED créée (kind=proposed, closed False) ; dédup (2× inconnue → 1) ; governor BLOCK → 0 écriture ;
signature déterministe ; journal append-only utf-8 ; input invalide → erreur propre ; mission ∉ FORBIDDEN.

---

## RÉVISION RED TEAM (sous-agent Factory, role RedTeam — intégrée)

10 findings (1 CRITICAL, 3 HIGH, 4 MEDIUM, 2 LOW). Corrigés (oracle 22/22) :
- **F1 CRITICAL — regex trop larges suppriment des propositions** : « empty content » / « unwrap() »
  incidents NOUVEAUX étaient classés « connus » → proposition silencieusement supprimée. **Fix** :
  patterns **ANCRÉS** avec discriminants co-occurrents (qwen exige qwen/thinking ; unwrap exige
  `Result/Option::`/`Err/None/panicked`). Tests faux-positif (`test_incidental_substring_*`).
- **F3 HIGH — écriture partielle / ordering** : le journal était écrit AVANT la gate propose →
  propose-BLOCK laissait un journal muté. **Fix** : classification pure + **toutes** les gates
  governor AVANT toute écriture ; exception distincte `ProposeBlocked`. Tests `test_propose_block_leaves_no_journal`,
  `test_journal_only_block`.
- **F4 HIGH — dédup TOCTOU** : read-then-append non atomique → doublons en concurrence. **Fix** :
  verrou fichier portable (`_FileLock`, O_EXCL, spin borné, fail-open loggé) autour de la section
  dédup. (Hypothèse studio = écrivain quasi-unique ; verrou couvre les chevauchements rares.)
- **F6 HIGH→MEDIUM — proposition auto-pickable** : `lane=SAFE_AUTO` risquait l'auto-pick par
  l'autoloop si quelqu'un branchait `error_proposals.jsonl`. **Fix** : `lane=AUDIT_REQUIRED`
  (non auto-sélectionnable → ratification humaine requise). Test `test_proposal_lane_not_auto_pickable`.
- **F7 MEDIUM — corruption silencieuse** : `JSONDecodeError` avalé. **Fix** : `logging.warning`
  (n° de ligne) ; dédup robuste prouvée (`test_corrupted_proposal_line_handled`).
- **F8 LOW — newline Windows** : `newline=""` → `\n` verbatim cross-OS. Test byte-level.
- **F9 LOW — chemins absolus** : classe username élargie + `/Users/` + `$HOME`. Tests rappel.
- **F10 MEDIUM — test gap gating** : tests **par-mission** (BLOCK propose seul / journal seul).
- **F2 HIGH (by-design, documenté)** : governor est SAFE_AUTO/non-forbidden → ALLOW par défaut ;
  c'est le **point de politique central**. Pour rendre une écriture refusable en prod : ajouter la
  mission à `governor.FORBIDDEN_MISSIONS` (source unique). Le gate reste le chokepoint réel. Cohérent
  avec `web_reality_agent.write_cache` (IMP-200).
- **F5 MEDIUM (tradeoff assumé)** : `signature` fusionne les erreurs ne différant que par nombres/hex
  (dédup voulue) ; les erreurs différant par des MOTS restent distinctes (documenté).
