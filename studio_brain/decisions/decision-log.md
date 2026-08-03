# Decision Log
#decision #reference

> Registre chronologique des décisions irréversibles ou structurantes.
> Format : date · décision · contexte · alternatives rejetées · critères de révision.
> Seul Pierre peut ajouter/modifier des entrées dans ce log.

---

## 2026-06-27 — Pivot Studio V2 : micro-usine de jeux Steam

**Décision** : Arrêter le développement du moteur d'échecs Rocky comme *produit commercial*. Pivoter vers une micro-usine de jeux Steam avec l'IA invisible comme multiplicateur de production.

**Contexte** : Rocky = ELO ~1200 ; valeur marché ≈ 0 (Stockfish gratuit, marché verrouillé par chess.com/lichess). L'infrastructure 15 agents / IR universel ne génère aucun euro.

**Alternatives rejetées** :
- Continuer l'entraînement neural chess → DELETE commercial (voir `01_AUDIT_DE_LAUDIT.md`)
- Vendre le moteur B2B → marché inexistant pour ELO 1200
- Faire un jeu d'échecs Steam → concurrence avec produits existants

**Sort des actifs existants** :
- Rocky moteur → R&D/vitrine (compétence Rust réutilisable en GDExtension)
- Doctrine oracles/gates/lanes/NO_CLAIM → KEEP, recâblée sur signaux business
- Ledger IMP léger → KEEP
- Qwen local → KEEP (inférence gratuite = critique en bootstrap < 2k€)
- IR universel, 15 agents autonomes, ML chess → DELETE

**Critères de révision** : HumanGate Pierre uniquement.

---

## 2026-06-27 — Genre : idle tête de pont + survivor-like moteur de revenus

**Décision** : Séquence produit = (1) idle (bas risque, systèmes > art, roder le pipeline), puis (2-3) survivor-like (plafond plus élevé, exige hook fort).

**Contexte** : Contrainte < 2k€ + zéro budget art + zéro audience de départ. L'idle nécessite zéro art payant (systèmes > visuels), parfait pour le bootstrap.

**Alternatives rejetées** :
- Roguelike deckbuilder → fatigue post-Balatro, éditeurs fuient en 2026
- Mobile hypercasual → dépend UA payante (budget inexistant)
- Co-op horror → co-op = complexité réseau, variance extrême
- Tout jeu art IA visible → −53 % reviews, non protégeable

---

## 2026-06-27 — Titre 1 : Snake: Survivor RPG — Genesis (et non idle)

**Décision** : Le Titre 1 est un survivor-like (Snake: Survivor RPG) et non un idle, car un hook mécanique fort (Constriction) a été identifié comme différenciateur viable dans un genre saturé.

**Contexte** : Le hook « corps du serpent = arme ET obstacle » + mécanique de Constriction est un créneau non exploité confirmé par la recherche marché 2026.

**Scope MVP** : variante 2 du GDD (premium Steam, no IAP), réduit à 1 biome + 1 boss, ~15 min de run. Vision AAA (5 biomes, F2P mobile, battle pass) = étoile nord uniquement, étagée sur succès MVP.

**Kill-gate P0** : hook fun en 2 min ? Pierre tranche. Si non → itérer ou abandonner avant d'investir dans le contenu.

**Kill-criteria** :
- < 1 500 WL à J-30 de la démo → reporter/repenser le hook
- < 1 000 ventes mois 1 → ne pas étager les biomes 2-5

---

## 2026-06-27 — Abandons explicites (décision d'architecture)

**Décision** : Supprimer / ne plus investir dans :
1. IR universel / game factory DSL (compilateur no-op, P0-C confirmé)
2. Boucle kaizen autonome (sur-ingénierie pré-revenu, risque anti-Skynet)
3. Council gates / red-team agents (LLM qui gatent des LLM = anti-pattern)
4. Dataset neural chess commercial (zéro revenu)
5. `current_state.json` puits mort (remplacé par dashboard métriques business)

**Critères de révision** : aucun de ces éléments ne revient sans décision HumanGate explicite Pierre + justification revenu dans les 12 mois.

---

## 2026-06-28 — Stack finale Snake: Survivor RPG

**Décision** : Godot 4 (2D top-down) comme moteur, Rust/GDExtension **uniquement si profilé** (les milliers d'entités = point chaud connu, mais on ne sur-ingénière pas avant mesure). `headless_sim.py` + `variants/*.json` pour la balance de jeu.

**Décision** : Art = CC0 (Kenney) + brouillon IA **retravaillé** uniquement. Règle absolue, non négociable.

**Décision** : Premium Steam (~5-8 € EA), no IAP, no F2P. Mobile exclu (pas de budget UA).

---

## 2026-07-03 — CT-1 : versionner llm-lego/ + studio_brain/ dans Git

**Décision** : Verser `llm-lego/` (171 fichiers, 1,6 Mo) et le vault `studio_brain/` (15 fichiers) dans Git pour lever le risque bus-factor-1 (perte disque).

**Contexte** : `node_modules` (105 Mo) exclu — pas de valeur à versionner. LFS envisagé puis écarté (l'essentiel du poids était `node_modules`, ignoré ; l'ajout réel de texte ne pèse que 1,6 Mo).

**Alternatives rejetées** : Git LFS (jugé inutile vu le poids réel).

**Décisions dérivées** : `*.png` (53 captures d'écran) gitignorées — repo lean. `state/loops-log.md` (2,4 Mo) et `lego.zip` exclus.

**Critères de révision** : aucun — décision d'hygiène repo, non structurante côté produit.

---

## 2026-07-03 — CT-4 : réconcilier la mémoire — 1 modèle canonique à 3 rôles

**Décision** : Un seul modèle de mémoire persistante, structuré en 3 rôles distincts : `memory/MEMORY.md` (faits durables, machine, auto-chargé), `studio_brain/00_CURRENT_CONTEXT.md` (handoff inter-sessions, < 100 lignes), `studio_brain/` tier-2 (doctrine/décisions/gamedesign/architecture, chargé à la demande).

**Contexte** : Avant CT-4, 3 référents mémoire concurrents et contradictoires existaient (`AI_MEMORY/`, `STUDIO_CONTEXT_LIVE.md`, `COWORK_CONTEXT.md`), source de dérive et de contenu périmé non détecté.

**Alternatives rejetées** : Ajouter Obsidian comme 4ᵉ référent mémoire sans réconciliation préalable (aurait aggravé la fragmentation) — Phases 2/3 (Graphify/Obsidian) restent gelées jusqu'à cette réconciliation.

**Sort des référents retirés** : `AI_MEMORY/`, `STUDIO_CONTEXT_LIVE.md`, `COWORK_CONTEXT.md` archivés dans `studio_brain/journal/archived-memory-referents-2026-07-03/`, ne plus lire ni écrire.

**Critères de révision** : HumanGate Pierre uniquement.

---

## 2026-07-06 — Vocabulaire de verdict unique : OK/FAIL/BLOCKED

**Décision** : Un seul vocabulaire de verdict dans tout le studio : `OK / FAIL / BLOCKED` (enum du contrat council v1, `schemas/council_output_v1.schema.json`). Tout futur contrat ou gate le réutilise tel quel.

**Contexte** : Le design « TCS Factory v2 » proposait un `gate-verdict-contract` en `PASS / CONCERNS / FAIL`, en collision avec l'enum council v1 déjà en prod (contre-audit 2026-07-06, attaque 3 : deux vocabulaires concurrents ⇒ mapping ad-hoc + dérive).

**Alternatives rejetées** :
- `PASS / CONCERNS / FAIL` (gate-verdict-contract proposé) — rejeté : introduit un 3ᵉ vocabulaire de verdict alors qu'un enum ratifié existe déjà.

**Critères de révision** : HumanGate Pierre uniquement.

---

## 2026-07-06 — CI : runner GitHub Actions auto-hébergé sur la machine studio

**Décision** : CI = runner GitHub Actions **auto-hébergé** sur la machine studio (Windows, RTX 5080). Vraie CI bloquante, pas un script post-push consultatif.

**Contexte** : La facturation GitHub Actions est ce qui a vidé la CI initialement (commentaire `Budget control` dans `canonical-ci.yml` → tous les jobs réels passés en `workflow_dispatch` manuel, contre-audit 2026-07-06 C1). Un runner local remet une CI réelle à coût externe zéro, cohérent avec la doctrine locale-first.

**Alternatives rejetées** :
- GitHub Actions facturé (runners hébergés) — rejeté : c'est précisément la contrainte de coût qui a tué la CI.
- Script post-push consultatif — rejeté : non bloquant, ne protège pas master.

**Limite acceptée** : la CI ne tourne que machine allumée.

**Critères de révision** : HumanGate Pierre uniquement.

---

## 2026-07-05/06 — PIVOT PRODUIT : Rocky gelé → gamme cartes FR (Belote produit 1)

**Décision** : Geler Rocky (aucune session d'optimisation moteur sans HumanGate explicite). Réorienter la factory vers une gamme de jeux de cartes FR — **Belote = produit 1**, **Tarot = produit 2** (moteur de plis commun). Snake: Survivor RPG — Genesis devient de fait [[../projects/snake-survivor-genesis|SUPERSEDED]] : son kill-gate P0 n'a jamais été tranché, le studio a changé de pari avant résolution.

**Contexte** : rattrapage tardif — cette décision, ratifiée par Pierre le 2026-07-05/06, n'avait pas été journalisée ici (seul `studio_brain/00_CURRENT_CONTEXT.md` la portait). Ajoutée le 2026-07-12 pour combler l'écart entre le handoff courant et le registre canonique.

**Actions pendantes** (héritées, toujours ouvertes au 2026-07-12) : re-triage ledger (IMP Rocky → FROZEN, revue HumanGate avant écriture) ; spec produit Belote (IA à niveaux, défi-par-seed, PWA mobile-first) ; étage 2 = table WebRTC, multi public gated. Bloc 1 Belote (règles/table/matériel) livré 2026-07-06 (`8e011fe`), non poussé.

**Critères de révision** : HumanGate Pierre uniquement.

---

## 2026-07-11 — Forge 2.0 : P0 intégrité GELÉ

**Décision** : Geler le socle P0 de Forge (driver déterministe, preuve mutation signée, doctrine triage, `is_clean_pass()` comme seul prédicat de promotion propre) après 277 tests verts et 3 audits adversariaux fermés. Pas de P0.5, pas de workflow de conformité étendu, pas d'élargissement vers autopilot/kaizen sans HumanGate explicite.

**Contexte** : séparation ratifiée entre intégrité du système Forge (P0, gelé) et qualité des jeux générés (gate séparé, ex. `menagerie_tactics` — artefact, pas un bloqueur P0).

**Critères de révision** : HumanGate Pierre uniquement.

---

## 2026-07-19 — Lane STUDIO gelée (autopilot.py, scripts/studioV2/, lanceurs)

**Décision** : Geler la lane STUDIO — aucune session de travail sur `autopilot.py` (9029 lignes, inchangé depuis 2026-06-29), `scripts/studioV2/` (45 fichiers, inchangé depuis 2026-06-26), `start_studio.ps1` / `stop_studio.ps1` sans HumanGate explicite de Pierre. Ne pas corriger, ne pas étendre, ne pas « améliorer en passant ». Lire reste autorisé. Hors gel : `tests/studioV2/` (zone protégée, régime propre) et `repos/games/studioV2_MIGRATED_HOLD/` (déjà archivé).

**Contexte** : audit « déclaré ≠ exécuté » du 2026-07-19 (session studio/méta, déclenché par une comparaison ChatGPT du studio avec ECC/Donchitos) — 3 strates mortes trouvées dans la lane STUDIO : (1) `.claude/agents/*.md` (15 fiches) jamais chargées faute de `description:` (champ requis absent) ; (2) `lab/agent_policy/tool_permission_matrix.json` (62 règles) câblée mais `_check_tool_permission` (`autopilot.py` ~l.843) ignore `agent_id` et échoue en mode ouvert (matrice absente → ALLOW), contredisant son propre `deny_by_default: true` ; (3) 3 taxonomies d'agents concurrentes qui ne se parlent pas (`producer/code/qa/review/docs` de la matrice · `producteur-dur/qa-lead/...` de `.claude/agents/` · `builder/architect/...` des contrats Forge).

**Conséquence directe** : `lab/agent_policy/*.json` et sa taxonomie `producer/code/qa/review/docs` deviennent **legacy de fait** — il ne reste que 2 taxonomies vivantes : `.claude/agents/` et les contrats Forge. Le défaut `_check_tool_permission` est un défaut **connu et NON corrigé** tant que le gel tient.

**Réparation en session (NON commitée)** : 13 des 15 fiches d'agents corrigées (`description:` ajoutée, `model:` en alias, champs custom déplacés dans le corps, `disallowedTools: Write, Edit` câblé) et validées empiriquement (chargement à chaud confirmé). `gameplay-programmer` et `godot-shader-specialist` laissés intacts (rôles possiblement sans objet — décision Pierre en attente).

**Décisions Pierre en attente** : (a) correctif `_check_tool_permission` = lane STUDIO, donc sous gel ; (b) sort des 2 agents inertes ; (c) convergence des 3 taxonomies (prérequis à tout compilateur de politique) ; (d) `games/auto_battler/` (chantier actif) n'est le domaine d'aucun agent déclaré.

**Critères de révision** : HumanGate Pierre uniquement.

---

## 2026-07-23 — Séparer l'intention de l'exécution : `orchestrator` vs `run_orchestrator`

**Décision** : Deux rôles distincts là où un seul nom était employé. `orchestrator` désigne la SESSION que Pierre pilote — descriptive, résolue par aucun code, son modèle est choisi par Pierre en ouvrant la session (Fable, inchangé depuis le 2026-07-10). `run_orchestrator` désigne l'AGENT spawné sous contrat (`scripts/forge/contracts/orchestrator.yaml`) qui conduit un run — résolu par le registry, donc son modèle a un coût réel : **Opus**.

**Contexte** : la décision de Pierre du 2026-07-22 (« Fable consomme trop, je ne peux pas l'utiliser sur des trucs comme Pong ») avait été enregistrée **en commentaire** dans `roles.yaml`. Or `control_plane/registry.py:39` résout un rôle par ordre de déclaration : le code rendait Fable, toujours. La décision et la donnée qui la contredisait ont cohabité 24 h.

**Réserve exprimée, NON implémentée** : l'orchestrateur ne doit pas consommer le tier maximal en permanence si la tâche peut être traitée plus bas. Aucun mécanisme ne porte cette règle (`escalate.py` ne couvre que les builders). Inscrite comme intention explicite dans `roles.yaml`, à ne pas lire comme un comportement en vigueur.

**Alternatives rejetées** : arbitrer entre Fable et Opus sous un nom unique (aurait laissé la même ambiguïté) ; corriger le commentaire sans toucher la donnée (aurait effacé la décision au lieu de la réaliser).

**Critères de révision** : HumanGate Pierre. À revoir quand un champ structuré exprimera l'escalade de l'orchestrateur.

---

## 2026-07-23 — Aucune décision ne vit dans un commentaire

**Décision** : Toute donnée qui influence un comportement doit avoir un **champ structuré validé**. Un commentaire peut porter le POURQUOI, jamais la décision elle-même. S'applique aux contrats, aux wiremaps et aux registres, présents et futurs. Corollaire : quand deux usages partagent un nom, séparer les champs plutôt qu'arbitrer entre eux.

**Contexte** : deux incidents le même jour. (1) La décision Fable/Opus en commentaire (ci-dessus). (2) `builder_id` du journal de builders vaut l'identifiant complet du registry à la 1re tentative et le nom court du tier après escalade — `by_builder` éclatait donc un même tier en deux entités : statistique silencieusement fausse, jamais un crash, invisible tant que la fonction était morte. Cadre donné par Pierre : « Une intention non reliée mécaniquement au système finit par diverger. Les contrats, index et validations doivent rester la source de vérité. » — le même problème que la Wiremap.

**Critères de révision** : aucun — principe de méthode, pas une décision de produit.

---

## 2026-07-23 — OpenClaw est legacy : le studio ne travaille plus que Claude + Forge

**Décision** : `openclaw/` et `studio/openclaw-workspace/` sont **legacy**. Les seules surfaces de travail sont Claude (skills et agents sous `.claude/`) et la Forge (`scripts/forge/`, `games/`, `knowledge_base/`, `lab/forge_*`). Verbatim Pierre : « openclaw c'est legacy, on travaille que claude et forge ».

**Contexte** : la Forge est saine — `contract.resolve_runtime` passe toujours `caps_path=FORGE_ROLES` (`scripts/forge/contracts/roles.yaml`), ne lit jamais `openclaw/capabilities.yaml` (ce chemin n'est que le défaut de `control_plane/registry.py:15`, consommé par la lane STUDIO gelée). MAIS deux skills VIVANTS pointent encore dans openclaw : `/gate` écrit ses verdicts HumanGate dans `studio/openclaw-workspace/DREAMS.md`, `/audit-daily` lit `studio/openclaw-workspace/MEMORY.md` (figé au 2026-06-29). Vérifié : `DREAMS.md` propre côté git, dernière entrée 2026-07-09.

**Collision à trancher** (report ouvert) : `/gate` enregistre les décisions ratifiées dans une destination legacy, alors que la décision « mémoire » ci-dessous exige que toute décision ratifiée soit versionnée dans le repo. Les deux ne peuvent pas rester vraies : `/gate` doit écrire dans le dépôt, pas dans openclaw.

**Critères de révision** : HumanGate Pierre.

---

## 2026-07-23 — Mémoire : cache local vs représentation versionnée

**Décision** : (1) La mémoire locale de l'agent peut exister comme **cache opérationnel**. (2) Toute **décision ratifiée du projet** doit avoir une représentation **versionnée dans le dépôt**. (3) Une référence dans les documents doit pointer vers une source **réellement accessible et auditée**.

**Contexte** : `CT-4` (2026-07-03) nomme `memory/MEMORY.md` comme référent canonique. Ce chemin **n'a jamais existé dans le dépôt** (`git log --all -- memory/` vide) : les 68 fichiers réels vivent hors projet, sans historique ni sauvegarde. Symétriquement `STUDIO_MEMORY.md` (racine, figé 2026-06-04) EST versionné et CT-4 ne le mentionne pas. Détecté par `node scripts/forge/master_index.mjs` (exit 1) — capteur lancé par aucun hook. `CT-1` du même jour avait pourtant versé `studio_brain/` dans Git contre le bus-factor-1. Cette entrée-ci est la première application du principe à lui-même.

**Alternatives rejetées** : un patch rapide (corriger le chemin dans les docs) ; la construction immédiate d'une synchronisation mémoire↔dépôt. Pierre : « correction d'architecture à faire proprement, pas un patch rapide » et « pas besoin d'ajouter de machinerie tant que les flux existants ne sont pas parfaitement reliés ».

**Critères de révision** : HumanGate Pierre, dans le cadre de la correction d'architecture.

---

## 2026-07-23 — `check_index` symétrisé : `fichiers[]` prouve aussi le référencement d'un dossier (CHECK_INDEX_SYMMETRY_V1)

**Décision** : `check_index` (`scripts/forge/standard_oracles.py`) accepte aujourd'hui `fichiers[]` comme preuve de référencement pour les FICHIERS mais pas pour les DOSSIERS — deux règles de preuve dans un même oracle. À symétriser : un dossier est référencé s'il matche une `address` **OU** s'il contient un fichier cité dans `fichiers[]`. Aligne l'oracle sur sa propre doctrine « indexer dans les deux sens ». Ne rend aveugle sur rien : un `99_STRAY/` non cité reste attrapé par `dossiers_hors_structure` (réactivé le même jour — le driver appelait `check_index` sans `repo_map`, bug objectif corrigé, correction C5).

**Contexte** : premier run STANDARD (Pong) — volet `index` rouge (`dossiers_orphelins = [04_ASSETS, 04_ASSETS/audio, 07_TESTS, 07_TESTS/oracle, 07_TESTS/unit]`) alors que ces racines sont imposées par `repo_map.yaml` et contiennent des fichiers réels, cités et prouvés. L'audit a démontré qu'un pur ré-étiquetage de labels verdissait le rouge sans déplacer un octet ⇒ l'oracle mesurait une propriété de l'étiquette, pas du disque.

**Note liée (contradiction à traiter, pas dans cette décision)** : `repo_map.yaml` déclare « un dossier vide est un FAIL » mais le code fait `if not has_content: continue` (dossier vide ignoré) — le code contredit le principe écrit. À réconcilier séparément.

**Alternatives rejetées** : exempter les racines `repo_map` du contrôle d'orphelins (rend `04_ASSETS`/`07_TESTS` invisibles à la détection) ; ajouter des lignes dédiées au squelette sans toucher l'oracle (théâtre d'oracle — verdit le compteur sans rien améliorer).

**Critères de révision** : HumanGate Pierre. Implémentation prévue dans le chantier « boucle bibliothèque », volet index.

---

## 2026-07-23 — Identité obligatoire des gabarits d'artefacts nommés (REPO_MAP_TEMPLATE_IDENTITY_V1)

**Décision (verbatim Pierre)** : rendre `{id}` obligatoire pour les gabarits qui pointent vers des artefacts nommés (`test.*`, `asset.*`). Le problème n'est pas seulement un bug de `check_placement` : `repo_map` autorise une ambiguïté structurelle où plusieurs lignes revendiquent le même artefact via un motif générique, et l'oracle voit des motifs, pas des identités — il ne peut donc pas détecter une collision.

```yaml
decision:
  id: REPO_MAP_TEMPLATE_IDENTITY_V1
rule:
  named_artifact_templates:
    require_id: true
    require_unique_binding: true
scope:
  - test.*
  - asset.*
validation:
  duplicate_claims:
    same_target_multiple_ids: FAIL
    same_id_multiple_targets: FAIL
```

**Règle à inscrire (verbatim Pierre)** : « Un gabarit qui revendique un artefact concret doit porter un identifiant stable permettant une correspondance univoque. Les motifs génériques sont réservés aux catégories, pas aux preuves d'existence. »

**Statut posé par Pierre** : `repo_map` = à renforcer ; `check_placement` = bug de validation ; oracle = fonctionne mais manque une contrainte d'identité. **Rustine explicitement interdite** : pas de « prendre la première correspondance » (cacherait le problème).

**Contexte** : mesuré sur Pong — `07_TESTS/oracle/solvability.mjs` est déclaré « déposé » par **6 lignes différentes**, sans que `check_placement` puisse le voir (gabarits `test.*`/`asset.*` de `repo_map.yaml` sans `{id}`).

**Alternative rejetée par Pierre** : documenter comme limite connue sans corriger (proposition de l'orchestrateur, écartée : « ce serait cacher le problème »).

**Critères de révision** : HumanGate Pierre.

---

## 2026-07-23 — Le dispatch n'est pas une autorisation de spawn (DISPATCH_SPAWN_AUTHORITY_V1)

**Décision (verbatim Pierre)** : séparer explicitement « préparation » et « autorisation de spawn » — la porte actuelle mélange les deux. Flux voulu :

```
contrat existe → préparation enregistrée → contrôle profil + budget + unicité
             → autorisation de spawn → spawn enregistré → preuve d'exécution
```

```yaml
decision:
  id: DISPATCH_SPAWN_AUTHORITY_V1
rules:
  dispatch_is_not_spawn_authorization: true
  spawn_requires_profile_ownership: true
  audit_is_created_at_execution: true
  spawn_proof_requires_unique_event: true
```

Les trois corrections posées par Pierre :
1. **Contrôle d'appartenance profil obligatoire** — un agent ne doit pas pouvoir invoquer un contrat *uniquement parce qu'il existe* ; ajouter `checks: [contract_exists, profile_allowed_for_contract]`.
2. **L'audit écrit au moment du spawn** — aujourd'hui `prepare()` écrit la ligne d'audit et `spawn()` n'ajoute aucune preuve : on prouve une intention, pas une exécution. Événements immuables `spawn_prepared` / `spawn_authorized` / `spawn_executed` ; la preuve finale vient de `spawn_executed`.
3. **Le hook vérifie l'unicité** — `count == 1` (0 ligne = pas de preuve ; 2 lignes = ambiguïté / replay potentiel).

**Impact posé par Pierre** : dispatch devient un **routeur**, pas un garde d'accès ; le spawn gate devient l'**autorité** ; l'audit devient une **preuve d'action**, pas une preuve d'intention.

**Priorité (Pierre)** : **plus haute que `CHECK_INDEX_SYMMETRY_V1` et `REPO_MAP_TEMPLATE_IDENTITY_V1`** — ce trou touche directement la gouvernance des agents : le contourner permet de contourner les autres contrats.

**Contexte** : mesuré cette session — `prepare_dispatch`/`load_contract` ne vérifient aucune appartenance à un profil (preuve : `s9-build-godot`, listé « orphelin », réellement dispatché 2× en production) ; une ligne d'audit est écrite à la préparation, pas au spawn (une préparation autorise ensuite des spawns illimités sous le même couple `étape/run_id`) ; le hook ne vérifie que l'existence d'une ligne, pas son unicité.

**Alternative rejetée par Pierre** : documenter honnêtement la portée maintenant et renforcer plus tard (proposition de l'orchestrateur, écartée au profit de la correction structurelle).

**Critères de révision** : HumanGate Pierre.

---

> **Promotion des 3 entrées suivantes** : rédigées dans `PROPOSED_2026-07-26_ratifications.md`,
> promues au log le 2026-07-26 par la session Troisième Cerveau **sur go explicite Pierre**
> (JALON 0 décision ① : « tu peux le faire toi-même j'ai confiance »). Cette promotion vaut
> ratification du protocole Troisième Cerveau V1/V1.1 (destination D4). Contenu copié verbatim.

## 2026-07-26 — Trois primitives méthodologiques reprises au corpus Codex (CODEX_METHOD_SALVAGE_V1)

**Décision** : sur les ~14 primitives du corpus Codex `00_STUDIO_CONTROL/01_SYSTEM/`, trois sont
retenues, dans cet ordre de priorité, et le reste est explicitement abandonné.

1. **`skipped_validation[]` structuré** — *gain élevé, coût faible*. Généralise aux 21 contrats
   une pratique déjà validée pour le seul `orchestrator.yaml` (« puis une section "ce que je n'ai
   PAS prouvé", explicite »). **GO.**
2. **Enrichissement de `pending_review_decisions.jsonl`** — *gain élevé, coût modéré*. Rend les
   décisions exploitables par les étapes suivantes (aujourd'hui on enregistre QUE Pierre a tranché,
   pas ce que la décision autorise ensuite). **GO.**
3. **Registre de claims nommés** — **CONDITIONNEL** : uniquement si chaque claim possède un
   **vérificateur mécanique exécuté par s12**. Sans cela, le coût de maintenance dépasse le
   bénéfice. **Pas de go tant que la condition n'est pas remplie.**

**Contexte** : le corpus Codex (43 YAML, mai 2026) est **déjà présent dans master à l'identique**
mais **DORMANT** — aucun lecteur hors `scripts/studioV2/` (lane gelée), et `studioctl.py` n'en fait
qu'un readback texte en redéclarant le schéma en dur. `LOOP_REGISTRY.yaml` déclare ses 5 étapes en
`DOCUMENTED_ONLY` : par sa propre déclaration, la boucle n'a jamais tourné. Il n'y avait donc rien
à récupérer en fichiers — seulement de la méthode.

**Alternatives rejetées** (et pourquoi) :
- *Queue + matrice de priorité* (`TASK_QUEUE`, `TASK_PRIORITY_MATRIX`) → double la couche kaizen
  gelée ; la liste `tasks:` du gabarit est vide (aucune preuve qu'elle ait jamais ordonné quoi que
  ce soit) ; ses 5 scores sont remplis par un LLM sans preuve de variance (cf. règle de variance).
- *Registres* (`AGENT_REGISTRY`/`LOOP_REGISTRY`/`FILE_REGISTRY`) → `contracts/*.yaml` + `roles.yaml`
  + `dispatch.PROFILES` sont les mêmes objets, en exécutable ; `FILE_REGISTRY` (41 Ko) double git.
- *Verdict par surface* → ontologie de salle de contrôle documentaire, pas de jeu ; Forge a déjà
  le détail par oracle + `is_clean_pass()`.
- *Boucle enseignant/élève* → couverte en mieux par pool + escalade bornée + red-team advisory +
  journal d'erreurs relu au retry. De plus Codex donne à `codex_teacher` une `truth_authority`,
  c'est-à-dire un LLM-juge — contraire à l'invariant ADR-002.
- *Échelle `created/registered/loaded/enforced/evidenced`* → Codex ne la résout pas non plus
  (auto-déclarée `UNKNOWN` par l'agent) ; adopter le vocabulaire sans la preuve reproduirait
  « déclaré ≠ exécuté » sous un nouveau nom.

**Garde-fou de mise en œuvre (dérivé du mode de panne observé)** : le corpus Codex est mort d'avoir
été déclaratif sans lecteur. Toute primitive reprise doit donc arriver avec **son point de mesure**.
Pour la primitive 1 : la règle est injectée dans le prompt ET l'adoption est **mesurée** (le champ
est-il réellement rempli par les agents ?), en **advisory d'abord** — le passage en gate dur est une
décision Pierre distincte, prise au vu des chiffres d'adoption. Même exigence que celle posée par
Pierre pour la primitive 3.

**Critères de révision** : si la mesure d'adoption de `skipped_validation[]` montre que les agents
ne le remplissent pas (ou le remplissent vide systématiquement), la primitive est à requalifier —
pas à durcir en gate.

---

## 2026-07-26 — L'unité d'observation devient `subject(type, id)` (LEARNING_SUBJECT_MODEL_V1)

**Décision** : généraliser la clé de la courbe d'apprentissage. `brick_id` (seule unité aujourd'hui)
devient un **sujet typé** — `subject: {type, id}` avec `type ∈ {brick, game}` — sans casser les
entrées existantes, qui restent lisibles telles quelles.

**Contexte (découvert par un branchement réel, pas par un audit sur pièces)** : `learning_metrics`
était écrit, testé et appelé par personne. Une fois branché, le backfill sur les 7 runs archivés a
produit **0 ligne** : la courbe est indexée par `brick_id`, c'est-à-dire les briques de
`knowledge_base/systems/` issues du pipeline d'ingestion KB, alors que tous les runs Forge
produisent un **jeu**. La mesure n'était pas cassée — elle observait une autre unité que celle
qu'on voulait suivre. Vérifié : les grandeurs sous-jacentes portent bien de l'information
(`reuseRatio` = 3 valeurs distinctes sur 6 jeux : 0 · 0,059 · **0,333 pour `kb_tactics`**, seul jeu
assemblé par import réel de briques ; `oracle_iterations` = {1, 1, 5, 6}).

**Ce qui a été validé au passage** : l'agent a REFUSÉ de forcer le nom du jeu dans `brick_id`
(règle anti-invention). Un système moins mûr aurait produit un joli tableau de bord alimenté par
une donnée inventée, et toutes les décisions suivantes auraient reposé dessus. « Pas de preuve =>
pas de donnée » est une propriété de qualité, pas un échec.

**Alternatives rejetées** :
- *Un fichier séparé par famille* (`game_metrics.jsonl`, `agent_metrics.jsonl`…) → demain il y aura
  jeux, outils, agents, pipelines, briques ; on recréerait N fichiers plus un agrégateur.
- *Promouvoir tous les jeux en briques du catalogue* → séduisant mais destructeur du modèle mental :
  **une brique est une capacité réutilisable, un jeu est un produit assemblé**. Les confondre casse
  la sémantique du catalogue.

**Garde-fou** : `type` est une énumération contrainte, jamais un champ libre — sinon la
prolifération qu'on refuse au niveau des fichiers revient au niveau des valeurs. La
rétro-compatibilité se fait par **normalisation à la lecture**, patron déjà établi dans le dépôt
(`hook_guard.marker_key` pour le marqueur 2-champs vs triplet ; `premortem` pour les entrées de
journal sans `resolution`/`status`). La ligne historique n'est jamais réécrite.

**Critère de succès, falsifiable** : après ce changement, le backfill doit passer de **0 ligne à N
lignes réelles** sur les runs archivés. Si le compte reste à 0, le modèle de sujet n'est pas la
cause du blocage et le diagnostic est à reprendre.

**Ordre ratifié pour la suite** : (1) modèle de sujet · (2) brancher les deux sources (KB reuse +
métriques de production Forge, dont `s10s-oracle-standard` aujourd'hui non couvert) ·
(3) `learning_event` au-dessus · (4) règles candidates. Pas d'anticipation d'étape.

---

## 2026-07-26 — D1→D6 + go M1 : cadre du Troisième Cerveau tranché (THIRD_BRAIN_DECISIONS_V1)

**Décisions prononcées explicitement par Pierre en session (verbatim résumé)** :
- **D4** — les ratifications HumanGate quittent `DREAMS.md` (legacy) ; destination canonique =
  `studio_brain/decisions/decision-log.md` versionné. Appliqué au skill `/gate` le jour même.
- **D1** — échelle mécanique retenue : `Declared → Referenced → Executed → Verified`
  (l'échelle 0-5 est abandonnée, cran « optimisé » invérifiable).
- **D3** — `review_by` par défaut : **30 jours** (sunset : une règle expire sauf reconduction).
- **D6** — go commit en 3 lots séparés (doctrine/protocole · mémoire/handoff · code livré) ;
  **pas de push sans validation séparée**.
- **D2** — principe d'un plafond de tokens par run avec conséquence pré-écrite : **ACCEPTÉ** ;
  la valeur est volontairement différée après M1 (donnée actuelle biaisée : succès seulement).
- **D5** — direction acceptée : `mandatory_read` évolue vers une injection mesurée via le
  Context Manifest ; **exécution différée après M1** (une variable à la fois).
- **M1** — go pour PRÉPARER la mission télémétrie d'échec (préparation ≠ exécution ;
  le lancement du run reste une validation séparée). **Complément 2026-07-26 (JALON 0
  décision ②)** : go EXÉCUTION prononcé par Pierre — « go sous contrat, c'est super important ».

**Contexte** : audit de décision du 2026-07-26 (stratégie confrontée à l'état réel du dépôt,
23 fichiers en pile, distribution tokens 44 k→1,8 M succès-seulement, `/gate` vérifié pointant
encore DREAMS.md). Suppressions éditoriales appliquées le jour même : arbre de triage unique
(§7.5), roadmap canonique unique (V1 §6), cran « optimisé » retiré, item redondant retiré.

**Critères de révision** : HumanGate Pierre.

---

## 2026-08-03 — Clôture et gel de Breakout V2 comme baseline (BREAKOUT_V2_FREEZE_V1)

**Décision (ratifiée explicitement par Pierre en session, verbatim : « Je ratifie les trois points Breakout »)** :

1. **Breakout V2 est clos.** Le verdict signé `lab/forge_runs/breakout_v2/verdict.json`
   (`software_verdict: OK`, `decision: HUMANGATE_READY`, `evidence_verdict:
   MECHANICAL_VALIDATION_ONLY`, `claim_verdict: NO_CLAIM_ALLOWED`) est accepté comme verdict final.
   Re-vérifié le jour même par `python -m forge.verify_run` : HMAC OK, évidence intacte, preuve de
   mutation intacte, **INTÉGRITÉ : AUTHENTIQUE**, exit 0.
2. **Les 3 `humangate_flags` du verdict sont acceptés en l'état**, verbatim du champ :
   `"archi non vérifiée (oracle sauté dans ce profil)"` · `"wiremap non vérifiée (oracle sauté dans
   ce profil)"` · `"red-team dégradé: reviewer indépendant n'a pas tourné (fallback)"`.
   Les deux premiers sont des oracles **jamais lancés par construction du profil**
   `standard_godot` (`scripts/forge/dispatch.py:118,129`), pas des oracles en échec ; le troisième
   est un oracle exécuté en mode dégradé.
3. **L'amendement F-A/F17 (`fixed_step_accumulator`) est ratifié**, levant le marqueur
   `RATIFICATION_GATE_EN_ATTENTE` porté par `studio_brain/00_CURRENT_CONTEXT.md`.

**Actions exécutées le jour même sous cette ratification** :
- Promotion des 5 leçons Breakout validées vers la KB via `python -m forge.kb_proposal --apply
  <lesson_id> --ratifie-par "Pierre"` — 5/5 désormais `APPLIQUEE`, catalogue à **37 entrées**,
  `kb-validate.mjs` PASS, 0 violation. Ferme le drift `lecon_routee_sans_consommateur` (×5).
- Breakout V2 rejoint Pong comme **témoin de régression gelé** : toute modification ultérieure de
  `games/breakout_v2/` (comme de `games/pong/`) exige une gate Pierre distincte.

**Ce qui reste ouvert et pourquoi ce n'est pas bloquant** : le **gel de la wiremap n'existe pas**
pour ce run (`state.json` → `humangate_notes: "gel des règles absent (wiremap présent non gelé)"`).
Cause structurelle et non spécifique à Breakout : `driver.py:889 _freeze_rules` ne s'exécute qu'après
l'étape `s5-wiremap`, absente de la topologie `standard_godot` (`driver.py:140`) — cf.
`docs/forge/COMPARATIF_SCHEMA_VS_REEL_2026-07-27.md:30-32` : « le profil standard n'a même pas
d'événement de gel ». C'est le **même trou** que les flags 1 et 2 déjà acceptés ci-dessus, et il
appartient au profil, pas au jeu. Il est donc reporté sur Tetris, qui possède une wiremap et son
contrat dédié (`scripts/forge/contracts/wm1-wiremap-tetris.yaml`).

**Alternatives rejetées** :
- *Relancer les oracles archi/wiremap sur Breakout avant de clore* → ces oracles sont déclarés non
  applicables au profil `standard_godot` ; les forcer produirait un résultat sans autorité (théâtre
  d'oracle) au lieu de corriger le profil.
- *Créer un tag git de baseline* → **aucune convention outillée n'existe** dans la Forge
  (`grep "git tag" scripts/forge/ docs/forge/` → 0 résultat ; « baseline » n'y désigne que la
  baseline de mutation). Aucun mécanisme n'a donc été inventé pour l'occasion : le gel de Pong
  (précédent du 2026-07-27) est lui aussi une convention décisionnelle, pas un champ machine.
  Le présent enregistrement **est** l'état de référence.

**Critères de révision** : Breakout V2 ne se rouvre que sur **preuve issue d'un projet ultérieur**
(consigne Pierre). Une régression constatée sur Tetris ou au-delà, imputable à une brique venue de
Breakout, est le seul motif de réouverture. HumanGate Pierre.

---

## 2026-08-03 — La Forge répare les boucles, l'humain tranche les choix (FORGE_AUTONOMY_V1)

**Décision (prononcée par Pierre en session, deux volets)** :

**Volet 1 — boucle cassée = réparation, pas observation.** Quand une boucle est cassée, que la
cause racine est identifiée et que la solution est connue, la Forge **répare** : diagnostic → cause
→ correction → test → preuve, exactement comme pour un bug. Un diagnostic n'est pas une fin de
workflow. La sortie attendue est `PROBLEM / CAUSE / ACTION / VALIDATION / ESCALADE-si-choix-restant`,
jamais `PROBLEM / CAUSE / QUESTION`. On répare le **mécanisme générique**, jamais le cas particulier
en exception. Grille obligatoire avant toute escalade : est-ce prévu au Master Schéma ? déjà
contracté ? la cause est-elle identifiée ? la solution déterminée ? le risque acceptable ? Cinq oui
⇒ réparer, tester, documenter. Corollaire posé par Pierre : une escalade a un coût réel
(interruption, contexte, temps, dilution) ; elle doit être justifiée par une **nécessité de
décision**, jamais par une incapacité à appliquer une solution déjà trouvée.

**Volet 2 — la HumanGate KB évolue vers une autonomie contrôlée.** Le blocage humain sur
l'ingestion KB était une **sécurité de phase de construction**, destinée à éviter de polluer la
connaissance avant que les mécanismes de preuve existent. Cette phase est passée : la KB est câblée,
les validations mécaniques existent (`kb-validate.mjs`), les propositions sont structurées, les
preuves sont produites, et les jeux servent de boucle d'apprentissage. Nouveau régime — recherche
automatique : OK · extraction de connaissance : OK · proposition structurée : OK · validation
mécanique : OK · **ingestion automatique : possible sous conditions de preuve et de validation**.
La sécurité anti-dérive reste obligatoire mais passe désormais par des **contrôles mécaniques**, pas
par un blocage humain permanent. Motif : « la Forge ne doit pas rester dépendante d'une intervention
humaine pour chaque apprentissage, sinon elle ne devient jamais autonome ».

Boucle cible ratifiée :
`Erreur détectée → Cause racine → Correction → Nouvelle connaissance → Validation → KB → Projet suivant`

**Contexte** : audit des 15 boucles déclarées par `docs/forge/STUDIO_MASTER_SCHEMA.html` confronté
au code, déclenché par le run `tetris-fullgodot-20260803-084719`. Trois boucles seulement sont
câblées et fonctionnelles (oracle→re-build, oracle→lessons, verify_run→knowledge_trace). La flèche
centrale de la Coupe B, « manque ? → world-scan ciblé », n'existe pas en code ;
`identifiants_inconnus` est un cul-de-sac ; `_UPSTREAM_BY_STEP` ne porte aucune clé `s2-worldscan`
(le Prisme saute le World Scan) ; `check_e2e_harness` n'observe pas le moteur. Déclencheur du volet
1 : quatre symptômes remontés à Pierre comme constats alors que trois avaient une cause et une
solution établies.

**Ce que cette décision NE change PAS** (invariants ADR-002 intacts) : aucun sous-agent sans contrat
validé · oracles déterministes non-LLM · `software_verdict` issu des seuls reçus vérifiés · red-team
advisory · `claim_verdict: NO_CLAIM_ALLOWED` · **HumanGate Pierre décide merge/reject/freeze**.
L'autonomie porte sur la RÉPARATION et l'APPRENTISSAGE, pas sur le jugement de livraison.

**Alternative rejetée** : maintenir la gate humaine sur l'ingestion KB « par prudence » → rejetée
explicitement par Pierre : la prudence doit être portée par des contrôles mécaniques, sinon elle
plafonne définitivement la montée en compétence de la Forge.

**Traçabilité** : 7 leçons `validated` écrites dans `lab/reports/lessons.jsonl` et promues au
catalogue KB (42 entrées, `kb-validate` PASS, 0 violation) —
`forge.broken_loop_repair_not_report` · `forge.kb_humangate_to_controlled_autonomy` ·
`forge.architecture_check_before_human_escalation` · `forge.diagnosis_is_not_workflow_end` ·
`forge.escalation_costs_avoid_default_route` (+ les 2 déjà promues ce jour).

**Critères de révision** : si une ingestion automatique introduit une connaissance fausse en KB, ce
n'est pas la gate humaine qu'on restaure — c'est le contrôle mécanique manquant qu'on identifie et
qu'on ajoute. Retour au blocage humain = HumanGate Pierre explicite.

---

## 2026-08-03 — Le 3e cerveau consomme l'Observer ; la Forge corrige ses propres écarts (FORGE_AUTONOMY_V2)

**Décision (Pierre, six volets — étend `FORGE_AUTONOMY_V1` du même jour)** :

**1. Boucle cassée + cause + solution connue ⇒ réparation directe, sans escalade.** Cycle attendu :
`Erreur → Cause racine → Solution connue → Réparation → Test → Preuve → Lesson/KB`.
L'escalade humaine est réservée à **quatre cas et quatre seulement** : changement d'invariant ·
choix produit · changement d'intention · décision d'architecture non prévue.

**2. Le 3e cerveau (session Claude orchestratrice) EST le consommateur principal de l'Observer.**
Conséquence directe et immédiate : **ne plus fabriquer de consommateur artificiel** pour un artefact
dont l'information est destinée à l'orchestrateur. Ferme deux « décisions nécessaires » ouvertes le
jour même — le lecteur manquant de `learning_curve.jsonl` et celui des 9 artefacts Observer ne sont
plus des trous à combler par du code : le lecteur existe, c'est la session. Chaîne cible :
`Master Schéma (architecture attendue) + Observer (réalité mesurée) → différence → 3e cerveau →
réparation ou délégation`.

**3. L'Observer doit être renforcé pour comparer Master Schéma ↔ réalité** sur six axes :
prévu/construit · câblé/non câblé · actif/passif · consommé/non consommé · preuve disponible/absente
· HumanGate en attente. Produire la liste des écarts, puis **réparer les écarts mécaniques**.

**4. Autonomie KB.** La KB est une **boucle d'apprentissage de la Forge**, plus un dépôt à protéger.
Quand une connaissance manque : `KB insuffisante → recherche ciblée → validation → proposition KB →
intégration selon règles`. Une capacité inconnue n'est **plus une exception à signaler** mais une
entrée dans la boucle d'acquisition.

**5. World Scan — informations gameplay obligatoires** : objectif joueur · condition de victoire ·
condition de défaite · conditions de survie · conditions d'échec. Critère de réussite énoncé par
Pierre : pour Tetris, la Forge doit pouvoir **déduire seule** que le solo consiste à survivre et
maximiser le score, et que le versus se perd au premier top-out.

**6. Réparations autorisées sans demande préalable** : câblage des consommateurs déjà prévus ·
boucles non branchées · composants construits mais non utilisés · mise à jour Master Schéma /
Observer pour refléter la réalité. **Interdiction explicite : ne pas créer de nouvelle couche.**
Format imposé avant chaque réparation : `PROBLEM / CAUSE / ACTION / VALIDATION`.

**Intention générale (verbatim)** : « faire évoluer la Forge vers un système qui détecte ses propres
écarts et les corrige, pas vers un système qui remonte les mêmes anomalies à l'humain ».

**Contexte** : double audit structurel du 2026-08-03. Master Schéma — 21 composants déclarés,
18 construits, 13 câblés, 9 actifs avec preuve datée, **6 seulement consommés** : le goulot n'est pas
la construction, c'est la consommation. Observer — 2 048 événements sur 28 types pour le run tetris,
4 493 sur 32 pour breakout_v2, majoritairement `MECHANICAL`, mais **système clos** : aucun des
9 artefacts n'a de lecteur hors `scripts/observer/`. Deux défauts en miroir mesurés le même jour :
`learning_curve.jsonl` = écrivain sans lecteur ; `propose_bible_entry` = lecteur sans écrivain.

**Vérifications de l'orchestrateur ayant corrigé les rapports d'agents** (traçabilité de la méthode) :
`core_requirements.yaml` déclaré introuvable par un audit **existe bien** (4 410 o, lu par
`driver.py`, `standard_oracles.py` et 8 contrats) ; les chemins codés en dur concernent **13 modules
sur 23**, pas 17 sur 30. Aucune de ces erreurs n'a été relayée comme fait.

**Écart imputable à l'orchestrateur, consigné** : le run `tetris-fullgodot-20260803-084719` a été
lancé sans `--charter` ni `--tasks-file`, d'où **0 `run.task_prompt` et 0 `run.charter`** observables
là où breakout_v2 en porte. Le run de référence est donc moins traçable que celui qu'il remplace —
à corriger avant tout benchmark de modèles, sous peine de comparer des prompts illisibles.

**Ce que cette décision NE change PAS** : invariants ADR-002 intacts — contrat = porte de spawn ·
oracles déterministes non-LLM · `software_verdict` issu des seuls reçus vérifiés · red-team advisory
· `claim_verdict: NO_CLAIM_ALLOWED` · **HumanGate Pierre sur merge/reject/freeze**.

**Critères de révision** : si la Forge répare de travers sous ce régime, la correction n'est pas de
restaurer l'escalade par défaut — c'est d'identifier le contrôle mécanique manquant. Retour à
l'escalade systématique = HumanGate Pierre explicite.

---

## 2026-08-03 — Verdict OK ≠ clôture studio ; capitalisation avant construction (FORGE_CAPITALISATION_V1)

**Diagnostic Pierre, à l'origine de tout ce qui suit (verbatim)** : « La Forge n'a pas un problème de
construction, elle a un problème de **boucles de capitalisation** et de **vérité** entre Master
Schéma, Observer et réalité. »

Établi par double audit du jour. Sur 9 composants : 4 `IMPLEMENTED` (Prisme, World Scan, Art Bible,
Promotion KB) · 1 `MAL_CONNECTED` (étage 2) · 1 `BLOCKED` (propose_brick) · 1 `BUILT_NOT_CONNECTED`
(s10d) · 1 `NOT_FOUND` (réconciliation 4 sources) · 1 `PASSIVE` (Observer). **La chaîne de
conception fonctionne ; c'est la réutilisation qui ne fonctionne pas.**

### Décisions

**1. `verdict OK ≠ clôture studio` — RÈGLE GÉNÉRALE.** Un verdict technique, même vert et signé, ne
clôt pas un projet. La clôture est un acte enregistré au `decision-log.md`. La règle appliquée à
Breakout le matin même devient la règle de tous les projets.

**2. Vocabulaire de statut de run — quatre valeurs**, parce qu'« on ne transforme pas un état
RUNNING en clôture arbitraire » : `RUNNING` · `FROZEN_HUMAN` · `CLOSED` · `FAILED`.
`FROZEN_HUMAN` = arrêté par décision humaine, ni réussi ni échoué ; ne se relance pas
automatiquement et ne se compte pas comme un échec.

**3. Pong devient `FROZEN_HUMAN`**, jusqu'à décision contraire. État mesuré : `run_status: RUNNING`
avec 4 étapes encore `PENDING` (`s10a`, `s10s`, `s11`, `s12`), aucun verdict signé, aucun
`software_verdict: OK`. Le gel de 2026-07-27 (témoin de régression) n'existait que par convention
documentée hors registre. **Les étapes restent `PENDING` : le run n'a jamais fini, cela doit rester
visible.**

**4. Une capacité ne doit jamais disparaître silencieusement.** `propose_brick` est appelé en
production (`driver.py:1984`) mais bloqué par son prédicat (`driver.py:2023` :
`if code_status != "OK": return`). L'Observer le classait « non câblé » — faux négatif dans l'outil
censé détecter les faux négatifs. **Le prédicat n'est PAS desserré** ; c'est l'observabilité qui est
corrigée : `BUILT → CONNECTED → BLOCKED(reason)`, jamais une absence. L'Observer doit distinguer
quatre situations aujourd'hui amalgamées : `ABSENT` · `JAMAIS_APPELE` · `APPELE_SANS_SORTIE` ·
`BLOQUE(raison)`.

**5. Modèle de vérité unique, sept axes**, partagé par le Master Schéma ET l'Observer :
`prévu · construit · câblé · actif · bloqué · consommé · preuve`. L'axe `bloqué` est nouveau.

**6. Récupération rétroactive des leçons de Pong et Snake.** Mesuré : 0 leçon pour ces deux
campagnes, contre 5 pour breakout_v2 et 5 pour tetris. Motif Pierre : « le coût est déjà engagé, il
faut récupérer la connaissance ».

**7. Ordre de priorité imposé** — A) capitalisation jeux (Pong/Snake → lessons → KB → Observer) ·
B) correction de l'Observer (les 4 distinctions) · C) s10d : branché dans un profil réel **ou**
retiré du Master Schéma · D) réconciliation 4 sources, **en dernier car c'est une capacité
nouvelle**. « Avant toute nouvelle construction », le Master Schéma et l'Observer doivent porter le
modèle de vérité à 7 axes. Objectif énoncé : « le but n'est plus d'ajouter des briques, c'est que la
Forge sache exactement quelles briques existent réellement ».

---

## 2026-08-03 — Clôture de Snake enregistrée (remontée au registre canonique)

**Décision** : la campagne **Snake** (jeu Godot, `games/snake/`) est enregistrée comme **close**,
avec objection. Application immédiate de la règle `verdict OK ≠ clôture studio` ci-dessus.

**Pourquoi cette entrée existe** : la clôture avait réellement eu lieu les 2026-07-28/29, mais
n'était consignée que dans `studio_brain/journal/2026-07-30_00_CURRENT_CONTEXT_archive.md`
(section « CLÔTURE 2026-07-28/29 — CYCLE SNAKE TERMINÉ ») — un journal archivé, pas le registre
canonique. Conséquence mesurée : le Master Schéma affiche encore Snake en `◇` (non atteint) alors
que le projet est clos. **Même trou que Breakout, un cran plus loin.** À ne pas confondre avec les
entrées de juin 2026 « Snake: Survivor RPG — Genesis », qui concernent un **projet différent**
(survivor-like), lui-même `SUPERSEDED`.

**Preuve technique** : 10 runs sous `lab/forge_runs/snake/_run_*` — **5 portent
`software_verdict: OK` / `decision: HUMANGATE_READY_WITH_OBJECTION`** (`_run_final2_20260729`,
`_run_runtime_20260729`, `_run_solv_20260729`, `_run_cal1/2/3_20260730`), 4 en `FAIL / BLOCKED`.
Démarrage et rendu prouvés selon le journal (11 ticks, 0 erreur, exit 0, oracle pixel vert en
fenêtre GPU).

**Objection consignée, non résolue** : aucun `wiremap_frozen.json` pour Snake, et
`RATIFICATION_WIREMAP_SNAKE.md` porte toujours `Statut: PROPOSED — attend la ratification de
Pierre`. La clôture est donc enregistrée **WITH_OBJECTION**, comme le disent les verdicts eux-mêmes
— elle ne prétend pas que tout était vert.

**Critères de révision** : réouverture sur preuve issue d'un projet ultérieur, même régime que
Breakout V2. HumanGate Pierre.

---

## 2026-08-03 — Pong gelé par décision humaine, run jamais terminé (PONG_FROZEN_HUMAN_V1)

**Décision (Pierre)** : Pong passe en **`FROZEN_HUMAN`** — arrêté par décision humaine, **ni réussi
ni échoué** — jusqu'à décision contraire. Verbatim : « on ne transforme pas un état RUNNING en
clôture arbitraire ».

**Pourquoi cette entrée existe séparément** : le gel de Pong comme témoin de régression datait du
2026-07-27 mais n'existait que par convention documentée en mémoire. Vérification du 2026-08-03 :
Pong était le seul des quatre projets à n'alimenter **aucun** canal de décision, alors que sa
campagne est arrêtée. Une campagne arrêtée sans décision enregistrée est une boucle cassée.

**État réel mesuré** : `lab/forge_runs/pong/state.json` portait `run_status: RUNNING` alors
qu'aucun processus ne tournait depuis le 2026-07-27. Quatre étapes restent `PENDING` —
`s10a-oracle-code`, `s10s-oracle-standard`, `s11-redteam-code`, `s12-verdict`. **Aucun verdict
signé, aucun `software_verdict: OK` n'existe pour Pong** ; `pong_r2_ref` porte `FAIL / BLOCKED`.
Le run n'a jamais abouti, et ce fait doit rester visible : les étapes `PENDING` ne sont pas
réécrites.

**Ce qui a été posé dans les données** : `run_status: FROZEN_HUMAN` + bloc `frozen{at, by, reason,
source}`. Le driver refuse désormais de reprendre un run gelé, rend `software_verdict: BLOCKED` et
ne le compte **jamais** comme un échec. L'Observer l'affiche `FrozenHuman`, plus « Running ».

**Ce que Pong a quand même produit** (la campagne n'est pas perdue) : 5 leçons récupérées
rétroactivement le 2026-08-03 et promues au catalogue KB, dont `forge.run_status_not_liveness_proof`
— née précisément de ce défaut : un `state.json` peut afficher RUNNING pendant 1 h 45 sans qu'aucun
processus ne vive. Plus 15 entrées au journal d'erreurs.

**Alternative rejetée** : clore Pong en `FAILED` pour « faire propre » → rejetée par Pierre. Un run
arrêté par choix humain n'est pas un échec technique ; les confondre fausserait toute statistique
d'échec ultérieure.

**Critères de révision** : Pong reste témoin de régression gelé. Toute modification de
`games/pong/` exige une gate Pierre distincte. Sortie de `FROZEN_HUMAN` = décision Pierre explicite.

---

## 2026-08-03 — Le Prisme transforme la connaissance externe en exigences internes (FORGE_PRISME_V2)

**Énoncé fondateur (Pierre, verbatim)** : « Le Prisme n'est pas une étape d'avis. Le Prisme est le
mécanisme qui transforme la connaissance externe en exigences internes. »

Et l'objectif produit qui l'encadre : « La Forge ne doit pas empêcher les jeux simples. Elle doit
empêcher les jeux simples de devenir **involontairement** incomplets. Un prototype peut être
minimal, mais il doit savoir qu'il est minimal. »

### Constat à l'origine — et sa preuve mécanique

Revue produit de Tetris : ni menu, ni pause, ni audio, ni réglage de volume, ni aperçu de la pièce
suivante à l'écran, ni high score, ni mode deux joueurs. **Le builder n'a pas échoué : il a
construit ce qui était demandé. La Forge n'a pas demandé assez.**

Mesuré le 2026-08-03, et c'est la cause racine :
- `s2-worldscan` ne contient **0 occurrence** de `next`, `preview`, `aperçu`, `hold`, `pause`,
  `audio` — alors que sa consigne citait explicitement l'aperçu next et le hold comme faits
  documentés du Tetris Guideline.
- `s1-prisme` ne contient **0 occurrence** de menu, pause, audio, onboarding, commandes.
- **Le Prisme s'exécute en position 2/14, AVANT le World Scan (position 3).** Son `mandatory_read`
  ne porte que `charter.yaml`. `_UPSTREAM_BY_STEP` n'a **aucune entrée** pour `s1-prisme` ni pour
  `s2-worldscan`.

Le Prisme est donc **structurellement aveugle** : il raisonne avant toute connaissance externe et
n'en reçoit aucune. Son silence n'est pas une faute d'agent, c'est une conséquence de sa position.

### Décisions

**1. Nouvel ordre du pipeline amont** :
`S0 Charter → S1 World Scan global → S2 Prismes spécialisés → requirements indexés → WireMap
complète → Architecture → Production`. Le World Scan passe AVANT le Prisme.

**2. Le World Scan élargit ses angles** : références gameplay · standards du genre · attentes
joueur · conventions UI/UX · fonctionnalités attendues · risques connus. Ce n'est plus une
recherche web générale.

**3. Le Prisme devient trois directeurs spécialisés**, chacun capable de **chercher et interpréter
ses propres informations** — il ne reçoit plus un World Scan global indifférencié :
- **Creative Director** (simule Game Designer · Art Director · Narrative Director · Audio Director ·
  Level Designer) — pourquoi le jeu est amusant, quelles boucles, quelles références, quelles
  sensations.
- **Experience Director** (simule UX · Player Experience · Onboarding · Accessibilité · Frustration)
  — un nouveau joueur comprend-il, peut-il démarrer sans explication externe, sait-il quoi faire,
  peut-il interrompre et reprendre, quelles frustrations sont évitables.
- **Product Director** (vision produit · marché · complétude · attentes minimales) — prototype
  technique ou produit, quelles fonctions attendues manquent, ce qui distingue un prototype d'un
  jeu fini.

**4. Le Prisme produit des CONTRAINTES INDEXÉES SUR LA WIREMAP**, pas des avis. Chaque rayon
alimente : CORE requirements · genre requirements · player experience requirements · product
requirements.

**5. La WireMap gagne des couches.** Elle couvre aujourd'hui moteur, règles, architecture,
dépendances. Elle doit aussi porter :
- **PLAYER EXPERIENCE** — `core.menu`, `core.pause`, `core.onboarding`, `core.controls_display`,
  `core.feedback`
- **AUDIO** — `core.audio`, `audio.feedback`, `audio.settings`
- **GENRE** — ex. `genre.tetris.next_preview`, `genre.tetris.hold`,
  `genre.tetris.line_clear_feedback`

**6. L'absence doit être une décision explicite.** Sur le patron déjà en production depuis ce jour
(`has_win_state: false` + `victory_condition: null`) : la réponse peut être NON, mais l'omission est
interdite. **Une absence silencieuse est un défaut de conception.**

**7. Découpage des exigences, pour ne pas bloquer les jeux simples** :
- **CORE universel** — ce qui concerne presque tous les jeux : démarrage · sortie · feedback
  minimum · compréhension minimale.
- **FORGE Product Experience** — ce qui dépend du niveau produit : menu complet · pause ·
  onboarding · options audio · progression · sauvegarde.
La Forge **pose la question à chaque projet**. La réponse peut être NON. La question doit exister.
Menu, pause et onboarding ne deviennent donc PAS immédiatement obligatoires pour tous les jeux.

### Arbitrages confirmés sur le rapport Tetris

- **Pas de pattern KB `AUDIO_SYSTEM`** — confirmé par Pierre. L'audio existait déjà en exigence CORE
  (`core.audio` dans `core_requirements.yaml`). Preuve : la wiremap gelée porte **9 CORE sur 10**,
  la seule manquante étant exactement `core.audio`. Le problème n'est pas une connaissance
  manquante, c'est que la chaîne `World Scan → Prisme → WireMap` **n'a pas transporté l'exigence**.
- Même diagnostic pour menu, pause, onboarding, commandes et aperçu next.

**Ce que cette décision NE change PAS** : invariants ADR-002 intacts — contrat = porte de spawn ·
oracles déterministes non-LLM · `software_verdict` issu des seuls reçus vérifiés · red-team
advisory · `claim_verdict: NO_CLAIM_ALLOWED` · HumanGate Pierre sur merge/reject/freeze.

**Critères de révision** : si la Forge se met à bloquer des prototypes légitimes, la correction
n'est pas de retirer les questions — c'est de vérifier que le découpage CORE universel / Product
Experience est au bon endroit. HumanGate Pierre.

---

## Template pour nouvelles entrées

```
## YYYY-MM-DD — [Titre de la décision]

**Décision** : 

**Contexte** : 

**Alternatives rejetées** :
- 

**Critères de révision** : 
```
