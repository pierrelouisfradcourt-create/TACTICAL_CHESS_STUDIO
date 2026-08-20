# PLAN — IMP-200 : Web Reality Agent (WRA) — veille GitHub+HackerNews+arXiv, READ ONLY, inject avant PLAN

**Lane:** SAFE_AUTO · **oracle_type:** code · **Impact:** MEDIUM
**blocked_by (matérialisé):** IMP-199 — **CLOSED** (close 2026-06-29, event `imp_closed` émis). Débloqué.
**Acceptance:** `pytest: source non vérifiée → rejet`

> SAFE_AUTO → implémente + teste + commit (scope-strict) + **close via kaizen_loop**. Aucun push.
> Ne touche pas `autopilot.py`.

## Objectif

Un agent de **veille externe** (GitHub + HackerNews + arXiv) qui ramène des sources, les **vérifie**,
les **filtre/score** de façon déterministe, et produit un brief **injecté AVANT le PLAN** pour
alimenter le council. Strictement **READ ONLY** : il *lit* des sources distantes ; il n'**écrit** ni
n'**exécute** rien à partir du contenu web. Borné (timeout + nb de sources max), pas d'explosion
d'appels. `governor.check()` obligatoire avant toute écriture de cache.

## Architecture — séparation I/O / cœur pur (clé du READ ONLY prouvable)

- **Cœur pur** (`verify`, `score`, `rank`, `gather`) : aucune I/O, aucune exécution. Le contenu web
  est traité comme **donnée opaque** (jamais `eval`/`exec`/`import`/`subprocess`, jamais de chemin
  dérivé du contenu). C'est ce cœur que l'oracle pytest exerce — donc déterministe et offline.
- **Frontière I/O** = les `fetchers` (callables) **injectés** dans `gather`. En test : fetchers
  factices déterministes (offline). En live (`__main__`) : `github_fetcher`/`hackernews_fetcher`/
  `arxiv_fetcher` = HTTP **GET only** via `urllib`, timeout du `cfg`. Aucun réseau à l'import.
- **Seul écrivain** = `write_cache`, **gardé par `governor.check()`** (BLOCK → aucune écriture).

## Design — `governance/web_reality_agent.py` (pur, déterministe)

```python
SOURCES = ("github","hackernews","arxiv")
TRUSTED_HOSTS = {source: frozenset(hosts...)}   # allowlist stricte par source

class WraError(Exception): ...
class SourceVerificationError(WraError): ...     # source/host non vérifiés → rejet DUR
class BudgetExceededError(WraError): ...
class CacheWriteBlocked(WraError): ...           # governor BLOCK → pas d'écriture

@dataclass(frozen=True) Record:  source,id,title,url,ts:int,popularity:int,summary
@dataclass(frozen=True) ScoredRecord: record, score:float, components:dict
@dataclass(frozen=True) WraConfig: max_calls, max_sources, timeout_s, half_life_days, w_*

coerce_and_verify(raw) -> Record          # champs valides + host ∈ allowlist, sinon raise (hard)
verify_batch(raws) -> list[Record]        # raise sur 1er non vérifié (fail-closed)
score_record(rec, query_terms, now_ts, cfg) -> ScoredRecord   # pur, [0,1], now_ts explicite
rank(records, query, now_ts, cfg) -> list[ScoredRecord]       # tri stable (-score, source, id)
gather(fetchers, query, now_ts, cfg, clock) -> list[ScoredRecord]  # borné calls+timeout+sources
to_council_brief(ranked, top_n) -> str    # texte READ ONLY injecté avant le PLAN
write_cache(ranked, path) -> Path         # governor.check() AVANT ; BLOCK → CacheWriteBlocked
```

**Scoring déterministe** (poids fixes, normalisés → score ∈ [0,1]) :
- `relevance` = fraction des termes de la query présents dans `title+summary` (casse-insensible).
- `popularity` = `log1p(pop)/log1p(POP_SCALE)`, borné [0,1] (stars / points HN / citations).
- `recency` = `0.5 ** (age_days / half_life)`, `age_days = max(0,(now_ts-ts)/86400)`, `now_ts` **explicite** (pas d'horloge cachée → déterministe).
- `score = (Σ w_i · comp_i) / Σ w_i`. Tri : `(-score, source, id)` (tie-break explicite).

**Bornage** (`gather`) : `calls >= max_calls` → stop ; `clock()-start >= timeout_s` → stop ;
chaque batch tronqué à `max_sources` ; résultat final tronqué à `max_sources`. `clock` injectable
(`time.monotonic` par défaut) → timeout testable hors-ligne.

## Ce qui NE change PAS

- `autopilot.py`, `governor.py`, `soa_router.py`, `ledger_writer.py` non touchés.
- `IMPROVEMENT_LEDGER.yaml` : muté **uniquement** via `kaizen_loop close`.
- Aucune source distante n'est écrite/exécutée ; le cache est le seul write, et il est gardé.

## Risques (RED TEAM — intégrés)

- **RT-200-1 CRITICAL — contenu web exécuté/écrit (RCE/injection)** : le cœur ne fait jamais
  `eval`/`exec`/`import`/`subprocess`, ne dérive aucun chemin du contenu. Le titre malveillant est
  une *string* scorée, jamais exécutée. **Tests** : (a) record au titre `__import__('os').system(...)`
  → scoré, aucun effet ; (b) `gather()` lancé dans un cwd temp → **0 fichier créé** ; (c) le source
  du module ne contient ni `eval(` ni `exec(` ni `os.system` ni `subprocess` (assert statique).
- **RT-200-2 CRITICAL — source non vérifiée acceptée** : `coerce_and_verify` exige `source ∈ SOURCES`
  **et** host(url) ∈ allowlist de cette source ; sinon `SourceVerificationError` (**rejet dur**, pas
  de drop silencieux). `verify_batch` lève au 1er non vérifié (fail-closed). **Tests** : host pirate,
  source inconnue, champ manquant, mismatch source/host → tous rejetés.
- **RT-200-3 HIGH — explosion d'appels** : `max_calls` borne le nombre de fetchers appelés ;
  au-delà → stop. **Test** : 5 fetchers, `max_calls=2` → exactement 2 appels (compteur).
- **RT-200-4 HIGH — timeout ignoré** : deadline via `clock` injectable ; dépassé → plus aucun appel.
  **Test** : clock factice franchissant `timeout_s` → seul le 1er fetcher appelé.
- **RT-200-5 HIGH — cache non gardé** : `write_cache` appelle `governor.check()` d'abord ; BLOCK →
  `CacheWriteBlocked`, **aucune écriture**. **Tests** : governor monkeypatché BLOCK → fichier absent ;
  ALLOW → fichier écrit (utf-8). Mission `web_reality_cache` ∉ FORBIDDEN.
- **RT-200-6 MEDIUM — scoring/rang non déterministe** : `now_ts` explicite, poids fixes, tri stable
  `(-score, source, id)`. **Test** : entrée mélangée → même classement.
- **RT-200-7 MEDIUM — réseau à l'import / dans le cœur** : aucun appel réseau à l'import ; fetchers
  injectés. **Test** : `import` + `gather` avec fetchers factices → aucun réel.
- **RT-200-8 LOW — record malformé** : champs manquants / types faux → `coerce_and_verify` rejette.

## Oracle pytest exact

```powershell
.venv312/Scripts/python.exe -m pytest scripts/phase2_tests/test_imp200_wra.py -v
```
Cas couverts : vérification (host pirate / source inconnue / champ manquant / mismatch → rejet dur) ;
scoring déterministe + bornes [0,1] ; rang déterministe (entrée mélangée) ; bornage calls
(`max_calls`) ; bornage timeout (clock factice) ; troncature `max_sources` ; READ ONLY prouvé
(0 write, pas d'exécution, assert statique anti-`eval/exec/system`) ; `write_cache` gardé par
governor (BLOCK→pas d'écriture / ALLOW→écriture) ; `to_council_brief` déterministe.
