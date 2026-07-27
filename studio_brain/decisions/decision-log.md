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

## Template pour nouvelles entrées

```
## YYYY-MM-DD — [Titre de la décision]

**Décision** : 

**Contexte** : 

**Alternatives rejetées** :
- 

**Critères de révision** : 
```
