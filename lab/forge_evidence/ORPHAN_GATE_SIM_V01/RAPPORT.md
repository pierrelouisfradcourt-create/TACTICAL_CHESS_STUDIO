# ORPHAN-GATE SIM V0.1 — mesure, aucun blocage, aucune modification de la Forge

Date : 2026-08-07. Repo : C:\TACTICAL_CHESS_STUDIO. Prototype jetable dans
`lab/forge_evidence/ORPHAN_GATE_SIM_V01/orphan_gate_sim.py`. Rien sous `scripts/forge/`,
`scripts/observer/`, `.claude/hooks/`, `games/`, `tests/` n'a été modifié. Aucun git add/commit/push.

## Le détecteur

Script Python autonome, 3 modes (`worktree`, `commit <sha>`, `sweep`) :
1. Symboles ajoutés = scan AST (Python) / regex `export function|const` (mjs), filtrés aux lignes
   effectivement ajoutées dans le diff (ou fichier entier si untracked).
2. Classe dérivée du chemin (règle de la commande) : `scripts/forge/**`, `scripts/observer/**`,
   `.claude/hooks/**` → OPERATIONAL · `lab/forge_evidence/**` → EXPERIMENT · `lab/reports/**`/docs → OBSERVATION.
3. Consommateur = usage (Name/Attribute en position Load pour Python, identifiant hors commentaire
   pour .mjs) trouvé dans du code de production (exclut `tests/`, `test_*`, `*.test.mjs`, docs, et le
   bloc `if __name__ == "__main__"`), EXCLUANT la ligne de définition elle-même mais PAS le reste du
   même fichier (un appel interne au fichier compte — cf. `_domain()` ci-dessous).
4. `would_block = true` seulement si `class == OPERATIONAL` et `consumer_found == false`.

Recherche indexée par nom (pas par symbole qualifié) sur les racines de code de production réelles
(`scripts/, lab/, ml/, studio_core/, tools/, studio/, governance/, memory_core/, ...` — explicitement
PAS `.venv312/`, `.venv/`, `node_modules/`, `worktrees/`).

## MESURE 1 — calibration sur vérité terrain (diff non commité + session)

**Score : 3/3 détectés, 0/8 faux positifs.**

Détectés (`would_block: true`) :
- `check_spawn_invariant` — `scripts/forge/audit.py:259`
- `checkSourceUrlStability` — `scripts/forge/check_worldscan.mjs:401`
- `run_divergence_oracle` — `scripts/forge/product_oracle_godot.py:453`

Non signalés, conformément à l'attendu :
- `promote_manifest_lessons`, `_promote_manifest_lessons_best_effort`, `checkFactConsistency`,
  `verify_envelope`/`rule_available`/`key_available` (signature.py), `_is_plausible_ts` (correlate.py)
  → tous `consumer_found: true`, `would_block: false`.
- `_domain()` (modification), l'écriture de `spawn_authorized` dans `_record_spawn_executed`, et
  l'horodatage dans `make_signed_receipt`/`build_aggregate_verdict` → **n'apparaissent même pas** comme
  symboles candidats, parce que ce sont des *modifications* de fonctions existantes (la ligne `def` n'a
  pas bougé), pas des symboles *ajoutés*. C'est cohérent avec la mécanique de la commande (elle ne juge
  que les symboles nouveaux), mais ça veut dire que ces 3 cas ne testent pas vraiment le discriminant
  consommateur/pas-consommateur — ils ne sont simplement jamais soumis au détecteur. Sur 8 cas
  "attendus non signalés", 5 sont de vrais tests du discriminant, 3 sont des non-candidats structurels.

**Découverte non demandée par la calibration** : `has_divergence_capacity`
(`scripts/forge/product_oracle_godot.py:409`) est aussi détecté `would_block: true` — vrai, confirmé à
la main (`grep` : seul `scripts/forge/tests/test_product_oracle_godot_divergence.py` l'appelle, aucun
appelant de production). Le détecteur trouve un 4e cas réel non prévu dans l'énoncé, ce qui est un bon
signe mécanique, mais aussi un rappel que la liste "3 orphelins connus" de la commande n'était pas
exhaustive sur le diff réel.

## MESURE 2 — faux positifs sur un gros commit réel

**b22a980** (freeze pacman v5, 307 fichiers) : **0 symbole candidat, 0 signalé.** Cause : ce commit ne
touche AUCUN fichier `.py`/`.mjs` (307 fichiers = `.gd`, `.jsonl`, `.json`, `.yaml`, assets). Le
détecteur ne couvre pas GDScript. Résultat trompeur si lu tel quel : "0 orphelin" ne veut PAS dire "rien
à signaler", ça veut dire "langage hors périmètre du prototype".

**04c14d9** (Asset Library V1, 18 .py + 2 .mjs + 1 .gd) : **74 symboles candidats, 0 signalé.**
Échantillon de 5, avec leur "consommateur" trouvé :
| symbole | fichier | consommateur trouvé | verdict manuel |
|---|---|---|---|
| `main` | `asset_geometry/measure.py:256` | `games/auto_battler/e2e_progression.mjs:164` | **FAUX** — collision de nom, aucun rapport avec ce `main`-là |
| `classify` | `asset_geometry/oracle.py:125` | `governance/error_journal.py:392` | **FAUX** — collision de nom |
| `run` | `asset_geometry/oracle.py:456` | `autopilot.py:1237` | **FAUX** — collision de nom (fonction `run` sans rapport) |
| `build` | `asset_producer/build_asset.py:79` | `llm-lego/build-outputformats.mjs:50` | **FAUX** — collision de nom |
| `check` | `commit_scope_guard.py:58` | `games/card_engine/harness/parity.mjs:127` | **FAUX** — collision de nom |

**Conclusion mesure 2 : le "0 signalé" sur 04c14d9 n'est PAS une preuve de bon câblage.** C'est un
artefact de la recherche par nom nu (non qualifié). Un nom commun (`main`, `run`, `build`, `check`,
`classify`, `record`) trouve presque toujours un homonyme sans rapport ailleurs dans un repo de cette
taille, et le détecteur le compte comme consommateur. C'est un **risque de faux négatif majeur** — le
garde masquerait de vrais orphelins dès que leur nom est générique. Sur ce commit, `main` seul apparaît
9 fois avec exactement les mêmes 5 "consommateurs" `games/auto_battler/*` — la même fausse preuve
recyclée pour 9 fonctions différentes.

## MESURE 3 — 10 endroits où la Forge crée des capacités sans consommateur

Balayage de l'état actuel de `scripts/forge/**` + `scripts/observer/**` : 1450 symboles candidats,
63 signalés `would_block: true`. 10 cas sélectionnés (avec date/commit d'introduction via `git log -S`)
et jugement JUSTE/ABUSIF sur ce qu'ORPHAN-GATE aurait fait à la création :

| # | capacité | fichier:ligne | introduit (commit, date) | class | ORPHAN-GATE à la création | jugement |
|---|---|---|---|---|---|---|
| 1 | `auditAgentFile`, `collectDeclaredFields`, `readersNamingField` | `declaration_readers.mjs:205/244/280` | c025424, 2026-07-19 | OPERATIONAL | BLOQUÉ | **JUSTE** — `wiremap_nav.mjs` ne fait qu'une *mention en commentaire* (ligne 6) de ce module, jamais d'appel réel. Confirmé cas piège explicitement cité par la commande : dormant depuis 3 semaines. |
| 2 | `runtime_inventory_oracle.py` (module entier : `main`, `compare`, `declared_runtimes`...) | `runtime_inventory_oracle.py` | d37f51b, 2026-08-04 | OPERATIONAL | **PAS bloqué symbole par symbole** (chaque fonction est appelée par une autre fonction du même fichier) mais **0 importeur de production dans tout le repo** (seul son propre test l'importe) | **LIMITE DE LA RÈGLE, pas un verdict** — la règle "même fichier compte comme consommateur" masque un orphelinat au niveau FICHIER : un module peut être parfaitement câblé en interne et n'être jamais invoqué de l'extérieur. |
| 3 | `_internal_lesson_provenance` | `kb_proposal.py:271` | 78bc320, 2026-08-03 | OPERATIONAL | BLOQUÉ | **JUSTE (probable)** — helper privé (`_`), jamais appelé même dans son propre fichier. Le module `kb_proposal.py` lui-même est bien câblé (importé par `driver.py`), donc c'est vraiment cette fonction précise qui est morte, pas le module. |
| 4 | `findMutation`, `findByLayer`, `findByWorker`, `findByTarget`, `findByClass` | `mutation_registry.mjs:58-152` | d37f51b, 2026-08-04 | OPERATIONAL | BLOQUÉ (5x) | **DISCUTABLE** — API de requête sur le registre que CLAUDE.md décrit comme "source unique" pour `agent_factory.mjs` etc. Commit récent (V2 decision plan), pourrait être une API préparée pour un consommateur pas encore écrit plutôt qu'un mort-né. Voir Mesure 4. |
| 5 | `verify_verdict`, `verify_aggregate`, `status_from_passed` | `verdict.py:94/470/171` | d28190a, 2026-07-10 | OPERATIONAL | BLOQUÉ (3x) | **JUSTE, et instructif** — `scripts/forge/verify_run.py` (le vérificateur canonique cité dans CLAUDE.md : "re-vérifié par forge.verify_run") **réimplémente sa propre vérification HMAC** en réutilisant seulement le privé `_verify_mapping`, sans jamais appeler `verify_verdict`/`verify_aggregate`. Chemin dupliqué, API publique orpheline depuis presque un mois. |
| 6 | `do_GET`, `do_POST`, `do_PUT`, `do_DELETE`, `do_PATCH`, `log_message` | `observer/live.py:452-633` | 78bc320, 2026-08-03 | OPERATIONAL | BLOQUÉ (6x) | **ABUSIF — faux positif du détecteur.** Méthodes de dispatch de `BaseHTTPRequestHandler`, appelées par le framework HTTP standard via résolution dynamique de méthode sur la requête entrante, jamais par un appel nommé explicite dans le code. Le prototype ne voit pas ce mécanisme (limite connue, cf. section Limites). |
| 7 | `__post_init__` | `observer/events.py:288` | 78bc320, 2026-08-03 | OPERATIONAL | BLOQUÉ | **ABUSIF — faux positif du détecteur.** Hook dataclass appelé automatiquement par Python après `__init__`, jamais appelé par nom dans le code source. |
| 8 | `effort_flag_documented`, `effort_flag_present_in_cmd`, `classify_reasoning_evidence` | `reasoning_observability.py:195/203/218` | 24afe7d, 2026-07-30 | OPERATIONAL | BLOQUÉ (3x) | **DISCUTABLE** — module "socle V2 observable" ; ces fonctions sont peut-être en attente de câblage dans `driver.py`, ou déjà mortes depuis 8 jours. Sans marqueur, indécidable mécaniquement. |
| 9 | `propose_ledger_entry`, `propose_project_record`, `tokens_by_successful_step` | `studio_link.py:705/739/184` | (racines plus anciennes, non datées précisément — fichier modifié en continu) | OPERATIONAL | BLOQUÉ (3x) | **DISCUTABLE, penche vers légitime** — CLAUDE.md ratifie explicitement "écritures durables = propose-only, ratifiées par Pierre" : une fonction `propose_*` qui n'a pas encore de consommateur mécanique (le consommateur humain via HumanGate n'est pas du code) est un candidat naturel à un faux positif structurel du garde, pas à un vrai orphelin. |
| 10 | 11 fonctions `prisme*/featuremap*/blueprint*/wiremap*` | `upstream_fixtures.mjs:310-430` | d37f51b, 2026-08-04 | OPERATIONAL (dérivé du chemin) | BLOQUÉ (11x) | **ABUSIF — la classification par chemin est insuffisante.** Le nom du fichier (`upstream_fixtures.mjs`) dit clairement que c'est un générateur de cas de test pour d'autres oracles ; son seul "consommateur" légitime est `scripts/forge/*.test.mjs`, explicitement exclu par la règle "les tests ne comptent pas". Le fichier vit sous `scripts/forge/` donc hérite OPERATIONAL alors que sa fonction réelle est support-de-test. |

## MESURE 4 — le test qui fâche

**Combien des cas détectés sont des amorçages légitimes qui seraient bloqués à tort ?**

Mesuré sur les 63 signalés de la Mesure 3 (raisonnement documenté ci-dessus étendu à l'échantillon,
pas une relecture exhaustive des 63) :

- **~7 sont de purs faux positifs du détecteur**, pas des questions d'amorçage : `do_GET/do_POST/
  do_PUT/do_DELETE/do_PATCH/log_message` (dispatch dynamique du framework HTTP) et `__post_init__`
  (hook dataclass). Le mécanisme d'appel n'apparaît jamais comme un nom d'identifiant dans le code
  source — aucune règle de chemin ni de marqueur ne peut réparer ça, il faut une liste d'exclusion de
  noms magiques (dunders, `do_*` sur un `BaseHTTPRequestHandler`, décorateurs de route, etc.).
- **~11 sont mal classées par construction** : `upstream_fixtures.mjs`, dont la fonction réelle est de
  fournir des cas aux suites `*.test.mjs` du même dossier. La règle "dérivée du chemin" ne peut pas
  distinguir un oracle de production d'un générateur de fixtures qui vit dans le même dossier — les
  deux héritent OPERATIONAL. La classe est **insuffisante** ici sans un second signal (nom de fichier,
  ou déclaration explicite).
- **~10 sont des amorçages plausibles** au sens de la commande (mécanisme neuf, tests-frères prouvant
  l'intention, commit très récent — 2026-08-03/04) : `checkSourceUrlStability` (cas donné dans
  l'énoncé), `has_divergence_capacity`/`run_divergence_oracle` (même feature, même commit), les 5
  fonctions de requête de `mutation_registry.mjs`, et les 3 `propose_*`/`tokens_by_successful_step` de
  `studio_link.py` (doctrine propose-only ratifiée, consommateur humain pas mécanique). **Aucun de ces
  10 cas ne porte de marqueur qui le distingue mécaniquement d'un vrai orphelin** — le jugement
  "amorçage" ci-dessus vient de la lecture de la date de commit et du contexte doctrinal, pas d'un
  signal que le détecteur pourrait lire seul.
- **Le reste (~5-8)** ne montre aucun signal d'amorçage (commit plus ancien, superposé par une
  réimplémentation ailleurs, ou trivial) : `declaration_readers.mjs` (3 semaines, mention commentaire
  seulement), `_internal_lesson_provenance`, `verify_verdict`/`verify_aggregate`/`status_from_passed`
  (dupliqués par `verify_run.py`). Ce sont des candidats crédibles à un vrai blocage.

**La dérivation par chemin est-elle suffisante ?** Non, mesuré deux fois : (a) elle ne distingue pas un
oracle de production d'un fichier de fixtures de test qui vit au même endroit (`upstream_fixtures.mjs`),
et (b) elle ne distingue pas un amorçage volontaire d'un abandon — la seule différence observée entre
les deux dans cet échantillon est la fraîcheur du commit, un signal que Pierre a explicitement rejeté
ailleurs comme preuve ("Aucune décision dans un commentaire" — un fait implicite n'est pas une décision
structurée). **Un marqueur explicite est nécessaire.**

**Un tel marqueur existe-t-il déjà dans le dépôt ?** Oui, un vocabulaire voisin existe déjà et est
ratifié dans CLAUDE.md : `PROOF_STATES` dans `scripts/forge/search_usage.mjs` — `MEASURED | NOT_WIRED |
NOT_MEASURED`. `NOT_WIRED` signifie très exactement "le mécanisme existe, personne ne l'invoque dans le
projet" (commentaire du fichier, ligne 36) — c'est la même question qu'ORPHAN-GATE pose, mais posée côté
consommation de connaissance (recherche web), pas côté symboles de code. Ce vocabulaire n'est **pas**
aujourd'hui attaché aux fonctions/symboles eux-mêmes (pas de décorateur, pas de tag de commentaire
grep-able). Réutiliser ou étendre ce triplet — par exemple exiger qu'un symbole en amorçage porte un tag
explicite lisible par l'oracle (`// ORPHAN_GATE: bootstrap-of <feature-id future>`) — donnerait au garde
un signal mécanique au lieu d'un jugement de date de commit.

## LIMITES DU PROTOTYPE (mesurées, pas supposées)

1. **Collision de nom nu** (Mesure 2) : recherche par identifiant non qualifié. `main`, `run`, `check`,
   `build`, `classify`, `record` déclenchent des faux "consommateurs" homonymes sans rapport. Risque de
   **faux négatif** dominant en usage réel — un vrai orphelin au nom générique ne sera jamais signalé.
2. **Appels dynamiques invisibles à l'AST** (Mesure 3, cas 6) : dispatch de framework
   (`BaseHTTPRequestHandler.do_GET`), résolution par chaîne (`getattr(obj, name)`), décorateurs de
   routage, hooks dataclass (`__post_init__`) — rien de tout ça n'apparaît comme un `ast.Name`/
   `ast.Attribute` explicite. Risque de **faux positif** ciblé sur les patterns objet/framework.
3. **GDScript hors périmètre** (Mesure 2, b22a980) : le prototype ne couvre que `.py`/`.mjs`. Un
   "0 signalé" sur un commit `.gd` ne veut rien dire.
4. **Classe dérivée du chemin insuffisante seule** (Mesure 4) : confond fixtures-de-test-hébergées-
   ailleurs et code de production réel ; confond amorçage volontaire et abandon.
5. **Symbole "ajouté" = ligne `def` dans les lignes diff** : une modification substantielle du corps
   d'une fonction existante (nouvelle branche, nouveau comportement) n'est jamais vue comme un ajout —
   correct pour l'objectif "artefact neuf", mais veut dire que le garde ne verrait jamais une extension
   dangereuse d'une fonction déjà consommée ailleurs.
6. **mjs sans AST réel** : parsing par regex + heuristique de commentaire ligne-à-ligne, pas un vrai
   parseur JS — gabarits de commentaires multi-lignes complexes ou template literals contenant `//`
   peuvent tromper l'extraction (non observé dans l'échantillon testé, mais non exclu).
7. **Pas de résolution d'alias d'import** (`import x as y`) — un appel via un alias ne matcherait
   l'identifiant local que si l'alias porte le même nom simple ; non testé explicitement ici.

## Fichiers produits

- `lab/forge_evidence/ORPHAN_GATE_SIM_V01/orphan_gate_sim.py` — le prototype (3 modes)
- `lab/forge_evidence/ORPHAN_GATE_SIM_V01/resultats.json` — les 4 mesures, tous les `ORPHAN_CHECK`
- `lab/forge_evidence/ORPHAN_GATE_SIM_V01/resultats_measure1.json` / `resultats_measure2_*.json` /
  `resultats_measure3_sweep.json` — sorties brutes individuelles
- `lab/forge_evidence/ORPHAN_GATE_SIM_V01/measure*.err` — stderr des exécutions (warnings uniquement)

## Verdicts

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
