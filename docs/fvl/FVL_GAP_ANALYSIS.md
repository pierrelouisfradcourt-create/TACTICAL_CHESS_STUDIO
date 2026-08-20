# FVL_GAP_ANALYSIS — Phase 0 du plan FVL-V0

> **Statut** : PROPOSED — ratification Pierre requise. Non commité.
> **Date** : 2026-07-29
> **Périmètre** : Phase 0 du plan « FVL-V0 — passage de la spécification au système ».
> **Objet** : répondre à la question centrale — *FVL-V0 décrit-il la Forge actuelle, ou propose-t-il une nouvelle Forge ?*
> **Méthode** : preuve d'exécution, pas preuve d'existence. Chaque ligne `IMPLEMENTED` ci-dessous
> est adossée soit à une commande réellement lancée le 2026-07-29 (sortie citée), soit à une ancre
> `fichier:ligne` lue. Une ligne sans l'un des deux est marquée `DOCUMENTED_ONLY`.
> **Aucune modification de la V1. Aucune migration. Aucun prototype.**
> **Alias** : désigné `FVL_V0_GAP_ANALYSIS.md` en Phase 0 du plan, `FVL_GAP_ANALYSIS.md` dans la
> liste des livrables finaux. Un seul fichier — celui-ci.

## Consommateurs (règle de câblage, FORGE_ARCHITECT_MANUAL_V1 §6)

| Consommateur | Ce qu'il y lit | État |
|---|---|---|
| Phase 1 — `FVL_MINIMAL_GRAMMAR_V0` | quelles pièces ont un référent réel, lesquelles n'en ont pas | à produire |
| Phase 2 — `FVL_RULES_V0` | le champ `status` + `evidence` de chaque règle, déjà instruit ici | à produire |
| Phase 6 — décision A/B/C | la mesure de recouvrement FVL↔V1, qui contraint l'espace de décision | à produire |
| Pierre (HumanGate) | la réponse à la question centrale | humain |

---

## 1. Preuves d'exécution du 2026-07-29

Trois commandes lancées, sorties réelles. Elles fondent la colonne `Preuve` du §2.

**P-1 — Suite de tests Forge**

```
.venv312/Scripts/python.exe -m pytest scripts/forge/tests -q
→ 1090 passed, 1 skipped in 71.59s
```

**P-2 — Porte de dispatch, profil `standard_godot`**

```
PYTHONPATH=scripts .venv312/Scripts/python.exe -m forge.dispatch --dry-run --profile standard_godot
→ Chaîne Forge [standard_godot] — 5 étapes planifiées (aucun spawn) :
    s9-build-godot-standard [LLM         ] -> claude-opus-4-8
    s10a-oracle-code        [déterministe] -> non-llm
    s10s-oracle-standard    [déterministe] -> non-llm
    s11-redteam-code        [LLM         ] -> claude-opus-4-8
    s12-verdict             [déterministe] -> non-llm
```

**P-3 — Hook de garde du spawn**

`.claude/settings.json` → `hooks.PreToolUse[matcher: "Task"]` → `python .claude/hooks/pretool_forge_guard.py`. Présent et actif.

> **Fait nouveau, non anticipé par la spécification (issu de P-2)** : dans le profil
> `standard_godot`, le producteur (`game_forger`) et le red-teamer de code (`redteam_code`)
> résolvent vers **le même exécutant** — `claude-opus-4-8`. L'indépendance du red-team y est
> donc **contextuelle** (contexte vierge), pas **structurelle** (exécutant distinct), et rien
> dans la chaîne ne vérifie mécaniquement la fraîcheur du contexte. Conséquence directe sur la
> règle FVL V12 (voir §3.4) : ce n'est pas seulement un contrôle manquant, c'est un contrôle qui,
> tel qu'énoncé dans la spec (« refus si identité identique »), refuserait la configuration
> nominale actuelle. La règle est mal formulée, pas seulement non implémentée.

---

## 2. Inventaire 0.1 — les composants existants

| Composant | Source V1 | Statut | Preuve |
|---|---|---|---|
| Contrat d'agent (17 champs, 3 états) | `contract.py:42-59, 94-143` · 49 YAML | IMPLEMENTED | P-1 · `field_state` / `validate_contract` lus |
| Porte unique de dispatch | `dispatch.py:203` | IMPLEMENTED | P-2 |
| Hook fail-closed anti-spawn | `.claude/settings.json` · `hook_guard.py` | IMPLEMENTED | P-3 |
| Registry runtime (rôle → exécutant) | `contract.resolve_runtime:207` · `contracts/roles.yaml` | IMPLEMENTED | P-2 (résolution réelle observée) |
| Aiguilleur d'exécution + repli tracé | `runtime.route_step:78` | IMPLEMENTED | P-1 |
| Profils de chaîne | `dispatch.PROFILES:123` (8 profils) | IMPLEMENTED | P-2 |
| Escalade bornée | `escalate.py:19-20` | IMPLEMENTED | P-1 |
| Oracles déterministes non-LLM | `static_oracles` · `standard_oracles` · `product_oracle` · `mutation_proof` | IMPLEMENTED | P-1 |
| Reçus signés + verdict agrégé | `verdict.py:105-158, 273` | IMPLEMENTED | P-1 |
| Re-vérification indépendante | `verify_run.py:225` | IMPLEMENTED | P-1 |
| Journal / télémétrie / pré-mortem | `studio_link.py:77, 269, 373` | IMPLEMENTED | P-1 |
| Écritures durables propose-only | `studio_link.propose_*` | IMPLEMENTED | P-1 |
| Gel du jeu de règles | `static_oracles` (feature set frozen) | IMPLEMENTED | P-1 |
| Builder llm-lego (UI) | `llm-lego/builder.html` (6036 l.) | IMPLEMENTED | `NODE_TYPES:374` · `agentCardStatus:475` lus |
| Blocage carte d'agent incomplète (client **et** serveur) | `builder.html:4079-4088` · `agent-card-validate.mjs:96` | IMPLEMENTED | script de validation dédié, **non intégré à un oracle Forge** |
| Boucle sans condition refusée (UI) | `builder.html:671-674` | IMPLEMENTED | message de refus lu |
| Bibliothèque de briques | `knowledge_base/` · `llm-lego/library/` (75 fiches) | IMPLEMENTED | listé |
| Audit de câblage / dérive doc↔réel | `studio_selfaudit.mjs` · `agent_context_map.mjs` | IMPLEMENTED (outil) / DOCUMENTED_ONLY (déclenchement systématique) | outils présents ; aucune preuve d'exécution périodique ici |
| Contrôle d'indépendance du red-team | — | **ABSENT** | `verdict.py` trace `redteam_reviewer` et `redteam_ran`, ne compare jamais |
| Confinement des outils par le code | — | **ABSENT** côté Forge | `_declared_tools:198` retourne le **texte** des champs `skill`/`plugin` |
| Confinement des outils par le code | `~/.claude/local-agents/qwen-file-worker` | IMPLEMENTED **hors dépôt** | `executeTool` + `default: throw`, testé sans modèle |
| Ports typés / sockets / connexions typées | — | **ABSENT** | aucune notion de port dans la V1 ni dans le builder |
| Visual language (FVL-V0) | document de session | DOCUMENTED_ONLY | — |

---

## 3. Cartographie 0.2 — écarts FVL ↔ V1

### 3.1 Existe déjà (le geste FVL a un référent mécanique)

**Blocs — 16/16 ont un référent réel.** Mission ≈ charter · Rail ≈ profil · Étape ≈ contrat d'étape ·
Agent ≈ contrat + satellites du builder · Oracle · Simulateur ≈ bot de solvabilité · Sonde ≈ s10d ·
Artefact · Reçu · Coffre ≈ evidence signée · Verdict · HumanGate ≈ `/gate` + decision-log ·
Proposition ≈ `propose_*` · Socle ≈ registry + aiguilleur · Plan produit ≈ wiremap/standard · Note.

> C'est le résultat le plus important de la Phase 0 : **la palette de blocs ne propose aucun
> organe nouveau.** Elle nomme et dispose des organes qui tournent déjà.

**Règles — 10 des 18 règles FVL sont déjà mécaniquement en vigueur :**

| Règle FVL | Mécanisme V1 |
|---|---|
| V2 une case, un exécutant | un contrat par étape, structurellement |
| V6 pas de raccourci agent → verdict | le verdict ne lit que des reçus vérifiés |
| V7 l'avis ne franchit pas la frontière de preuve | red-team advisory → `flags`, jamais `software_verdict` |
| V8 boucle bornée | `MAX_ESCALATIONS` + refus UI d'une boucle sans condition |
| V9 encoche vide = refus | `field_state` / `validate_contract`, fail-hard |
| V10 rôle non résolu = refus | `RoleUnresolved` |
| V13 hors profil = refus sauf dérogation inscrite | `allow_unprofiled` → `unprofiled: true` dans le corps signé |
| V15 pas de sceau, pas de chaîne | absence de clé → refus de signer |
| V17 non prouvé ≠ vert | provenance rompue → BLOCKED |
| V18 déclarer ce qui n'a pas été mesuré | `RESTITUTION_RULE` + mesure d'adoption advisory |

**Marqueurs déjà réels** : Barre (sentinelle `aucun`) · Boucle bornée · Gel · Dérogation · Advisory.

### 3.2 Existe partiellement (le mécanisme existe, la portée FVL est plus large)

| Élément FVL | Ce qui existe | Ce qui manque |
|---|---|---|
| V1 « une encoche vit dans un parent » | satellites liés par `parentId` (builder) ; champs dans un YAML (Forge) | aucune notion partagée : deux représentations, aucune n'est la référence de l'autre |
| V4 métrique à variance prouvée | règle ratifiée 2026-07-21, appliquée à la main | aucun check mécanique ne refuse une métrique à variance nulle |
| V14 aucune case vide au lancement | le driver enchaîne des étapes déclarées | pas de notion de « case vide » : une étape absente du profil n'existe simplement pas |
| V16 pièce dormante | `studio_selfaudit` / `agent_context_map` détectent la dérive et les connecteurs dormants | pas de notion de « pièce », et aucune preuve ici d'un déclenchement systématique |
| Politique de verdict comme encoche | les règles de décision existent | elles sont **en dur** dans le module de verdict — non substituables, donc deux politiques ne peuvent pas être comparées sur le même dossier |
| Répartition prefab / attelage | les 17 champs existent tous | leur **découpe** n'existe pas : un contrat porte identité + mission dans le même fichier |

### 3.3 Seulement conceptuel (aucun référent, mais rien ne s'y oppose)

- **V3** un marqueur exige un support.
- **Dégel ratifié** comme geste (le gel existe, sa levée contrôlée n'est pas outillée).
- **États visuels d'un bloc** (incomplet → complet → attelé → exécuté → scellé → dormant).
- **Le canevas lui-même** : surface de composition, absente de la Forge (le builder llm-lego en a une, mais elle ne compose pas des chaînes Forge).

### 3.4 Impossible actuellement (le mécanisme requis n'existe pas — ce sont les vrais écarts)

| # | Règle FVL | Pourquoi impossible aujourd'hui | Nature |
|---|---|---|---|
| **V5** | connexion refusée si les types de ports diffèrent | **aucune notion de port n'existe**, ni dans la Forge ni dans le builder. Les arêtes du builder sont non typées : n'importe quel nœud se relie à n'importe quel nœud | **invention structurelle de FVL** |
| **V11** | outil employé non accordé = refus | `_declared_tools` retourne le **contenu textuel** de `skill`/`plugin`. Il n'existe aucun point où l'outil réellement employé est comparé à l'outil accordé. Trou I4, ouvert depuis 2026-07-11 | **trou V1 connu**, rendu visible par FVL |
| **V12** | producteur ≡ red-team = refus | l'identité du reviewer est tracée (`redteam_reviewer`) et son exécution réelle aussi (`redteam_ran`), mais jamais comparées à celle du producteur. **Et** : P-2 montre que les deux résolvent nominalement vers le même exécutant — la règle telle qu'écrite refuserait la configuration normale | **trou V1 connu + règle FVL mal formulée** |

---

## 4. Réponse à la question centrale

> *FVL-V0 décrit-il la Forge actuelle, ou propose-t-il une nouvelle Forge ?*

**Mesure.** Sur les 18 règles : 10 existent mécaniquement · 4 partiellement · 1 conceptuelle · 3 impossibles.
Sur les 16 blocs : 16 ont un référent réel. Sur les 17 champs d'agent : 17 existent, 0 découpe existe.

**Réponse en trois temps :**

1. **FVL-V0 est à dominante descriptive.** Il ne propose aucun organe nouveau. Il nomme, dispose et rend manipulables des mécanismes qui tournent déjà — dont dix refus qui sont **déjà** opposés aujourd'hui, mais opposés par du code que personne ne voit.

2. **Il contient exactement une invention structurelle : le typage des ports (V5).** C'est la seule pièce du langage qui n'a de référent nulle part. Tout le reste du « nouveau » en découle : sans ports typés, pas d'aimantation, pas de refus avant le geste, pas de grammaire.

3. **Deux de ses trois « impossibilités » ne sont pas des demandes de FVL — ce sont des trous de la V1 que FVL rend visibles.** V11 et V12 sont ouverts depuis le 2026-07-11 et documentés comme tels. Un langage visuel qui les exprime ne crée pas une nouvelle Forge : il rend inconfortable une Forge existante. C'est un service, pas un coût.

**Ce que cela ne dit pas** : que FVL soit utile, lisible, ou implémentable au coût supposé. La Phase 0 mesure un recouvrement, pas une valeur.

---

## 5. Conséquences pour la suite du plan (sans trancher)

- **Phase 1** — la cible de 9 blocs est cohérente avec §3.1 : les 9 retenus ont tous un référent mécanique. Point d'attention : les blocs écartés (Simulateur, Sonde, Proposition, Plan produit) ont eux aussi un référent réel — les écarter est une décision de portée, pas un nettoyage de concepts vides. À inscrire comme tel.
- **Phase 2** — le champ `evidence` de 10 règles sur 18 est déjà instruit par le §3.1 et peut être repris tel quel. Les 3 règles du §3.4 doivent entrer avec `status: DOCUMENTED_ONLY` et un `evidence: aucun` explicite, jamais un silence.
- **V12 est à ré-énoncer avant la Phase 2**, sur la base de P-2 : « identité d'exécutant identique » est le mauvais critère. Le critère candidat est l'indépendance du **contexte**, qui n'est aujourd'hui ni mesurée ni mesurable. Reformuler une règle sur un critère non mesurable produirait un refus décoratif.
- **Phase 6** — la Phase 0 ne tranche pas A/B/C, mais elle en documente une contrainte : l'option B (FVL devient le modèle interne) suppose que le modèle visuel représente la vérité **mieux** que le YAML. Or le seul mécanisme aujourd'hui capable de refuser un agent incomplet des deux côtés (client et serveur) est celui du builder llm-lego, et il n'est relié à aucun oracle Forge. Cette preuve reste entièrement à faire.
- **Risque de volume à porter en Phase 1** : la spécification décrit 49 pièces pour un système qui compte 17 champs et 13 étapes canoniques. La consigne « ne pas réduire artificiellement » a produit une palette plus grande que le système décrit. La réduction de Phase 1 n'est donc pas cosmétique — c'est une correction.

---

## Rapport de charter

- **software_verdict: OK** — livrable Phase 0 produit. Aucune modification de la V1, aucun code, aucune migration. Ce fichier est le seul artefact créé, en statut PROPOSED, non commité.
- **evidence_verdict: MECHANICAL_VALIDATION_ONLY** — trois commandes réellement exécutées (P-1, P-2, P-3), sorties citées ; le reste est ancré par lecture `fichier:ligne`.
- **claim_verdict: NO_CLAIM_ALLOWED** — aucune affirmation que FVL-V0 soit implémentable, utile ou souhaitable. La mesure de recouvrement ne préjuge d'aucune des trois options de Phase 6.

**SKIPPED_VALIDATION**

- *Recouvrement contrats* — statut : partiel. 2 contrats YAML lus intégralement sur 49. La classification des 17 champs en compartiments prefab/attelage est extrapolée de cet échantillon.
- *Déclenchement réel de `studio_selfaudit`* — statut : non fait. L'outil existe ; aucune vérification ici qu'il tourne périodiquement ou qu'il soit branché à un gate. Statut porté à `DOCUMENTED_ONLY` par prudence, pas par mesure.
- *Blocage serveur du builder llm-lego* — statut : non rejoué. Attesté par un script de validation dédié lu, non exécuté dans cette session.
- *Tests llm-lego et oracles Node* — statut : non lancés. Seule la suite Python `scripts/forge/tests` a été exécutée.
- *Ergonomie et charge cognitive* — statut : hors périmètre Phase 0.
