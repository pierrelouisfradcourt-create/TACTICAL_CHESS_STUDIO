# FORGE OBSERVER V1.5 — console d'observation

*Date : 2026-07-31 · Lecture seule stricte · Démonstration : campagne Breakout V2*

```
software_verdict : OK        (serveur, console et 10 vues exécutés et vérifiés en direct)
evidence_verdict : MECHANICAL_VALIDATION_ONLY
claim_verdict    : NO_CLAIM_ALLOWED
```

```bash
python scripts/observer/live.py --project breakout_v2 --port 8771
```
→ `http://127.0.0.1:8771/`

---

## 1. Ce qui change par rapport à V0

V0 reconstruisait *après coup*. V1.5 **sert la reconstruction en continu** : un thread de
veille empreinte 338 sources, relance l'analyse quand quelque chose bouge (2,1 s), et
publie un nouvel état de façon atomique. La console interroge `/api/health` toutes les
3 s et ne recharge que si la `version` a changé.

Aucune dépendance : `http.server` de la bibliothèque standard côté serveur, HTML/CSS/JS
inline côté page. Pas de CDN, pas de Grafana, pas d'OpenTelemetry, pas de SQL.

---

## 2. Le résultat le plus important : le prompt est vérifiable

Le prompt **réellement reçu** par chaque agent d'étape est intégralement présent dans son
transcript, et son empreinte se vérifie contre celle que la Forge a signée.

```
10 activations LLM · 9 MATCH · 0 MISMATCH · 1 NO_DECLARATION
```

La vérification : SHA-256 du texte intégral (marqueur de dispatch compris), fins de ligne
normalisées en `\n`, comparé à `final_prompt_sha256` du manifeste. Exemple mesuré sur
run3/`s9` : 13 717 caractères, `be5e274b…`, correspondance exacte.

**Portée** : c'est un chaînon déclaré ↔ exécuté réellement fermé. On peut désormais prouver
qu'un agent a reçu exactement le texte que la Forge déclare lui avoir envoyé. Un
`MISMATCH` serait l'écart le plus grave que ce système puisse produire ; la règle de drift
existe et n'a rien trouvé sur cette campagne.

Les 11 autres dispatches du run sont `model: non-llm` — étapes oracle déterministes,
structurellement sans transcript à retrouver. Ce n'est pas une lacune.

### Correction d'une conclusion V0

V0 classait le « contexte injecté » en `NOT_OBSERVABLE` au motif que la Forge n'en garde
qu'une empreinte. C'était vrai en ne regardant que les traces Forge, et faux en regardant
les transcripts. La classification est maintenant scindée :

| | Statut |
|---|---|
| Prompt final reçu par l'agent | **RECONSTRUIT**, et vérifié cryptographiquement |
| Contexte **ambiant** (hooks, CLAUDE.md, règles de projet) | `NOT_OBSERVABLE` — la Forge le déclare elle-même non mesuré (`ambient_context_note`) |

---

## 3. Les dix vues

| # | Vue | Contenu réel sur Breakout V2 |
|---|---|---|
| 1 | Pipeline vivant | 6 runs × 10 étages (Human → … → Human), horodatés ; un étage sans trace est marqué `NOT_OBSERVABLE` avec sa raison, jamais laissé vide |
| 2 | Carte des agents | 10 agents : session, type, parent, enfants, run, étape, modèles, durée, tokens, coût, statut, raison d'activation |
| 3 | Prompt réel | 10 activations, sections détectées, texte intégral, badge MATCH/MISMATCH/NO_DECLARATION |
| 4 | Outils réels | 18 lignes Contrat / Runtime / Exécution côte à côte, `hors_contrat` en évidence |
| 5 | Flux des fichiers | 10 agents, lectures / écritures / éditions |
| 6 | Graphe d'artefacts | 126 nœuds, 258 arêtes, SVG généré sans bibliothèque |
| 7 | État Forge | 6 runs, états Running / Waiting / Retry / Blocked / HumanGate / Failed / Success, glyphe **et** texte (jamais la couleur seule) |
| 8 | Temps réel | flux d'événements, compteur de version, indicateur d'activité |
| 9 | Drift | 43 écarts triés par sévérité |
| 10 | Santé globale | compteurs ; `cout_reel_usd` et `human_gates_ratifies` s'affichent `NOT_OBSERVABLE`, **jamais 0** |

---

## 4. Provenance cliquable

Toute donnée portant une citation affiche un lien `chemin:ligne`. Au clic,
`/api/source?path=…&line=…&context=8` renvoie l'extrait, la ligne visée surlignée.

**La garde de cécité vaut aussi sur HTTP** — c'est le vrai risque d'une console qui expose
des fichiers. Vérifié en direct :

```
GET /api/source?path=lab/forge_evidence/dispatch_audit.jsonl&line=1   → 200 + extrait réel
GET /api/source?path=docs/forge/BREAKOUT_V2_CAMPAIGN_REPORT…md        → 403 blindness_violation
POST /api/state                                                        → 405
```

Aucune route d'écriture n'existe. Le serveur écoute sur `127.0.0.1` uniquement.

---

## 5. Parité CLI ↔ serveur

Les deux chemins doivent produire le même Observer, sinon l'outil ne prouve rien. Défaut
trouvé à l'intégration (le serveur ne collectait pas les prompts) puis corrigé. Vérifié :

| mesure | CLI | serveur |
|---|---:|---:|
| runs | 6 | 6 |
| drift | 43 | 43 |
| prompts | 10 | 10 |
| faits | 100 | 100 |
| faits RECONSTRUIT | 62 | 62 |
| faits NOT_OBSERVABLE | 10 | 10 |

---

## 6. Limites de V1.5 — dites avant qu'on les découvre

1. **Le rafraîchissement reconstruit tout le DOM.** Toutes les 3 s, les éléments sont
   remplacés : un lien visé peut devenir obsolète entre le regard et le clic. Constaté en
   test réel. Corriger demande un rendu incrémental, pas un re-rendu global.
2. **La veille sur les transcripts est peu profonde** (racine seulement). Les agents
   d'étape Forge écrivent à la racine, donc le cas principal est couvert ; un sous-agent
   dispatché par outil `Task` — comme l'étape wiremap — peut être vu avec retard.
3. **Le rattachement d'un transcript à un run reste une inférence** de portée de session
   (`BY_FILE_SCOPE`), étiquetée sur chaque événement. Le `run_id` n'est porté que par la
   ligne du marqueur.
4. **`/api/source` compte les lignes par une passe complète** sur le fichier, même pour une
   fenêtre étroite. Acceptable ici, lent sur un transcript pathologique.
5. **La veille se déclenche aussi sur l'activité de la session qui observe** : le
   transcript de la session Observer grossit et compte comme un changement. Sans
   conséquence sur les données, mais les recalculs sont plus fréquents qu'utile.

---

## 7. Ce que V1.5 permet de voir et qui n'était pas visible

- Le prompt exact reçu par chaque agent, **prouvé conforme** à ce que la Forge a signé.
- Les outils réellement appelés face à ceux déclarés — le red-team, déclaré en lecture
  seule, a écrit des fichiers aux trois runs.
- Le modèle réellement exécuté face au modèle signé — divergence confirmée sur `wm1`
  (`claude-opus-4-8` déclaré, `claude-opus-5` exécuté).
- La comptabilité de tokens face aux transcripts — facteur 6,7 à 12,3 d'écart.
- Les fichiers réellement écrits par chaque agent, avec l'horodatage.

---

## 8. Deux types d'événement ajoutés le 2026-08-04 (Forge V2)

La taxonomie de `observer/events.py` passe de 32 à **34 types**. Aucun nouveau système
d'événements : deux sources de plus, lues par l'adaptateur `forge_evidence` existant.

### `repair.result` — le runtime de réparation devient visible

Produit par `forge.repair_dispatch.record()` dans
`lab/forge_evidence/repair_results.jsonl`, `proof: MECHANICAL`, `link: DIRECT`.

Avant : `repair_step.mjs` réparait des artefacts sur 5 étapes du driver **hors de tout
registre de rôles**, sans reçu signé — donc invisible ici. Mesuré alors :
**0 événement citant « repair » sur 7 645**. Le rôle `repair_runtime` a été déclaré, la
réparation passe désormais par la même porte de dispatch (reçus `spawn_prepared` /
`spawn_executed` signés HMAC), et l'événement porte : `runtime_id`, `capability_id`,
`root_problem_id`, `mutation_id`, `input_hash`/`output_hash`, `allowed_fields`,
`written_fields`, `oracle_before`/`oracle_after`, et `embedded_capabilities` (les deux
détecteurs de qualité, qui tournaient sans laisser d'empreinte).

`quality_not_proven: true` y est **constant** : aucune exécution ne peut le faire tomber.

### `drift.detected` — un type déclaré depuis l'origine, jamais émis

`events.py` le déclarait ; occurrences réelles avant le 2026-08-04 : **0 sur 7 645**.
Il est maintenant alimenté par `forge.runtime_inventory_oracle` via
`lab/forge_evidence/runtime_drift.jsonl`, avec trois cas **séparés, jamais agrégés** :

| `drift_kind` | `severity` |
|---|---|
| `declared_not_observed` | `INFORMATION` — un rôle rare n'est pas un rôle mort |
| `observed_not_declared_event` | `ALERTE` |
| `observed_code_not_declared` | `ALERTE_CODE` |

Portée **repo-wide** : `run_id` est `null`, aucun filtre projet — une dérive de
déclaration n'appartient à aucun run.

### Limite à connaître

`_actor_kind_for_model` (`adapters/forge_evidence.py:93`) ne rend `llm_agent` que si le
nom du modèle contient « claude ». **Tout modèle local (Qwen) est classé `unknown`**, y
compris dans les reçus signés. Non corrigé : le changer reclasserait rétroactivement des
événements historiques de tous les projets. Conséquence pratique — ne jamais s'appuyer
sur `actor.kind` pour repérer un runtime LLM ; utiliser `actor.model` et
`actor.capability_role`.

```
claim_verdict: NO_CLAIM_ALLOWED
```
