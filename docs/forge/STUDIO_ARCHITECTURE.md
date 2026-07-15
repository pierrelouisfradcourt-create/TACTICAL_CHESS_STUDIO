# ARCHITECTURE DU STUDIO — vérité, cible, imports (brief d'alignement)

- **Date** : 2026-07-12
- **Rôle de ce document** : recaler les trois IA (Claude Code, GPT, Gemini) sur l'**état réel
  vérifié** du studio, poser l'**architecture cible** (l'org chart ci-dessous), et lister ce qui
  est **réellement importable** de `Donchitos/Claude-Code-Game-Studios` (MIT). But : arrêter de
  reconstruire en l'air ; voir la ligne d'arrivée pour que chaque petite étape s'y raccroche.
- **Statut** : PROPOSED (Pierre décide). NO_CLAIM_ALLOWED sur ce qui n'est pas prouvé par oracle.

> **⚠ MISE À JOUR 2026-07-15 (auto-audit `scripts/forge/studio_selfaudit.mjs`).** Cet instantané
> date du 12-07. **6 éléments** qu'il décrit comme « cible / manquant / à construire » **existent
> désormais** (construits 12→13-07, vérifiés on-disk) : `knowledge_base/search.mjs` ·
> `knowledge_base/role_sim.mjs` · `scripts/forge/reuse_ratio.mjs` · `scripts/forge/pool.py` ·
> `scripts/forge/contracts/s2.5-artbible.yaml` · `knowledge_base/roles/pursuer-mobile.yaml`. Toute
> mention 🔴 / « MANQUANT » / « n'existe pas » / « cible » ci-dessous les concernant est **périmée**.
> La dérive doc↔réalité est désormais surveillée : `node scripts/forge/studio_selfaudit.mjs`
> (exit 0 = cartes à jour). **État factuel toujours frais** (auto-généré, ne pas éditer à la main) :
> [`STUDIO_STATUS.generated.md`](STUDIO_STATUS.generated.md) — régénérer : `node scripts/forge/studio_selfaudit.mjs --write`.

---

## 1. La vérité — ce qui EXISTE et est PROUVÉ (vérifié mécaniquement, pas déclaré)

- **La Forge** (déjà mergée, doctrine ratifiée) : chaîne de **13 contrats s0→s12**, dispatch
  gouverné, **verdict signé** (HMAC + `verify_run` = AUTHENTIQUE), **gate mutation** (100 %-ou-
  triage justifié), **oracle de solvabilité** (un bot doit GAGNER, pas juste « ça compile »),
  **HumanGate** (Pierre décide merge/reject). C'est **déjà** l'ASSEMBLER + le TEST/ORACLE + une
  partie de la hiérarchie (l'orchestrateur Fable = Director/Lead naissant).
- **Le système immunitaire de la bibliothèque** : `knowledge_base/catalog.json` + validateur
  non-LLM (`kb-validate.mjs`, règles R1–R12, 46 tests, **red-teamé** — 2 invariants centraux
  rouverts et fermés), avec provenance + sha256 + licence SPDX + tier `candidate→validated` +
  **preuve d'usage** + **contrôle anti-triche** (une brique mal indexée est REJETÉE). C'est
  l'embryon du KNOWLEDGE ENGINE : **l'admission, pas encore la recherche**.
- **Preuve vivante** : `games/kb_tactics/`, jeu HTML tactique **assemblé depuis des briques
  ingérées** (import réel des systèmes + sprites Kenney CC0 chargés en navigateur), qui passe
  oracle 4/4 + solvabilité 6/6 + mutation 50/51 + capteur visuel advisory. Verdict signé vérifié
  AUTHENTIQUE. → « on peut prendre une pièce enregistrée et la réutiliser proprement » est PROUVÉ.
- **Runtime tranché** (arbitrage ratifié `STUDIO_RUNTIME_ARBITRATION.md`) : **HTML/2D = seul
  validateur prouvé** → on produit dessus MAINTENANT. **3D/Godot = catalogué en fiches, jamais
  consommé** tant qu'un validateur Godot n'est pas construit ET prouvé.

## 2. Ce qui MANQUE — les deux boîtes du bas de l'org chart

- **SEARCH ENGINE** : ~~n'existe pas~~ **construit le 2026-07-13** (`knowledge_base/search.mjs`, filtres
  déterministes + `search.test.mjs`) et `s9-build` a été amendé pour l'interroger avant d'écrire
  (`reuse_ratio.mjs` mesuré). Reste cible : embedding advisory ultérieur.
- **KNOWLEDGE ENGINE riche** : le catalogue admet et trace, mais ne **classe pas encore par
  fonction** (fiches multi-axes) et ne porte ni **ROLE gameplay** ni **relations**. « La douane
  avant les rayons. »

## 3. L'architecture cible (l'org chart, réconcilié avec le réel)

```
                         ┌─────────────────────┐
                         │   STUDIO DIRECTOR   │  Vision / Budget (500k)
                         └──────────┬──────────┘
                                    ▼
                         ┌─────────────────────┐
                         │    LEAD DESIGNER    │  Chef d'orchestre (300k)
                         └──────────┬──────────┘
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
 ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
 │ GAMEPLAY LEAD │          │ ART DIRECTOR  │          │ TECH DIRECTOR │  (150k ch.)
 └───────┬───────┘          └───────┬───────┘          └───────┬───────┘
   Greybox/Level/            Visual/Asset/               Engine/Systems/
   Boss/Balance/AI           Character/Anim/VFX          Tools/Pipeline/Save
   (50-80k chacun)           (50-80k chacun)             (50-80k chacun)
        └──────────────┬──────────┴──────────┬──────────────┘
                       ▼                     ▼
               ┌──────────────┐     ┌──────────────┐
               │ KNOWLEDGE    │     │ SEARCH       │      ← LA BIBLIOTHÈQUE
               │ ENGINE (500k)│     │ ENGINE (200k)│        (le point manquant)
               └──────┬───────┘     └──────┬───────┘
                      └──────────┬──────────┘
                                 ▼
                        ┌────────────────┐
                        │ ASSEMBLER /    │  (100k)   = Forge s9 + driver (FAIT)
                        │ BUILD AGENT    │
                        └───────┬────────┘
                                ▼
                        ┌────────────────┐
                        │ TEST / ORACLE  │  (200k)   = Forge oracles + verdict signé (FAIT)
                        └───────┬────────┘
                                ▼
                          RETOUR HUMAIN  → LEAD DESIGNER    = HumanGate Pierre (FAIT)
```

**Lecture honnête de l'org chart :**
- Le **HAUT** (Director → Lead → Gameplay/Art/Tech Leads → spécialistes) existe **en embryon** :
  la Forge a l'orchestrateur + les étapes contractualisées (Prisme, décompo, archi, wiremap,
  build, red-team). Il manque l'**étoffement des rôles** (Art Director, Tech Director explicites).
- Le **BAS** : **ASSEMBLER + TEST/ORACLE + RETOUR HUMAIN = la Forge (fait)** ; **KNOWLEDGE ENGINE
  = le catalogue (embryon)** ; **SEARCH ENGINE = MANQUANT**.
- Les budgets tokens = la couche d'allocation de ressources (utile, mais pas le cœur ; le cœur
  = les rôles + la colonne vertébrale Knowledge/Search/Assembler/Oracle).

**La bibliothèque = KNOWLEDGE ENGINE + SEARCH ENGINE**, définie ainsi (décision d'architecture) :
un **index unique de pièces typées** —
- **REPRESENTATION** (fichiers : sprites/tuiles/sons ; plus tard meshes), étiquetés multi-axes
  (`theme, size, silhouette, affordances, biome, runtime, licence, provenance, sha`) — aucune logique ;
- **LOGIC** (code exécutable : combat/déplacement/procgen/IA), validé par tests + simulation +
  mutation — aucune image ;
- **ROLE** (contrat gameplay abstrait : « poursuivant mobile, cible de difficulté X ») qui déclare
  `requires{}` = les propriétés qu'une représentation doit fournir —
plus un **pont vérifiable** (un ROLE se lie à une REPRESENTATION **ssi** `affordances ⊇ requires`),
une **recherche déterministe** sur l'index, et des **tiers à preuve** (`candidate→validated`, une
relation/métrique est une hypothèse tant qu'un jeu gaté ne l'a pas prouvée). Les **dossiers = du
rangement ; l'intelligence est dans l'index**. Donnée **runtime-agnostique** (HTML consommé, 3D
catalogué) → ouvrir Godot plus tard = **ajouter un consommateur, pas refondre**.

## 4. Imports possibles de `Donchitos/Claude-Code-Game-Studios` (vérifié, licence MIT)

Contenu réel du dépôt (inspecté) — **MIT, donc réutilisable/adaptable** :
- **49 définitions d'agents en 3 tiers** (Directors=Opus ; Leads=Sonnet ; Specialists=Sonnet/Haiku)
  ≈ **ton org chart**. Orchestration = **délégation hiérarchique** (vertical + consultation
  horizontale + escalade au parent + « user decides »), **pas** un essaim autonome.
- **73 skills (slash commands)** par phase, **41 templates de documents** (GDD/ADR/sprint/HUD/
  accessibilité), **11 règles path-scoped**, **12 hooks bash** de validation, **workflow-catalog.yaml**
  (pipeline 7 phases). Support **Godot 4 / Unity / Unreal 5** via `/setup-engine`.

**À IMPORTER (le HAUT)** : les **rôles/prompts d'agents** + la **hiérarchie de délégation** + les
**templates de docs** + les **règles path-scoped** + le **workflow-catalog**. Ça remplit l'étage
Director/Leads/spécialistes de l'org chart sans le réécrire.

**CE QU'ILS N'ONT PAS (et que TU as déjà)** :
- **aucun SEARCH ENGINE** (ils rangent par dossiers + git) ;
- **aucun ORACLE déterministe non-LLM** (leur validation = hooks bash naming/JSON/TODO + « user
  decides ») — **pas** de verdict signé, pas de mutation, pas de solvabilité ;
- **aucun système immunitaire** à provenance/sha/tier/preuve/anti-triche ;
- ils ciblent **Godot/Unity/Unreal sans validateur headless prouvé** — exactement le trou que
  l'arbitrage runtime a déjà identifié.

**Stratégie d'import, claire** : prendre leur **HAUT** (org d'agents + skills + templates + rules,
MIT) et le brancher sur ton **BAS** (KNOWLEDGE + SEARCH + Forge-oracle), **qui est précisément ce
qu'il leur manque**. Correction utile : Gemini a dit « sac d'agents qui négocient » — **faux**,
c'est une hiérarchie de délégation avec humain-dans-la-boucle, **plus proche de ta Forge**. Donc
c'est **compatible**, pas à combattre : leur org + ta colonne vertébrale = le studio complet.

## 5. Ce qui manque VRAIMENT pour faire la bibliothèque (la demande directe)

Deux briques, **petites**, sur HTML/2D, sous le validateur :
1. **Schéma enrichi + ROLE** : étiqueter les pièces par fonction (multi-axes) + poser les ROLE
   avec `requires` + leur **preuve** (le ROLE « poursuivant » de kb_tactics a déjà sa preuve : la
   solvabilité mesurée).
2. **SEARCH ENGINE déterministe** : filtres sur l'index (intention → pièces compatibles) ;
   l'embedding/sémantique en **advisory plus tard**, jamais comme porte d'admission.

Puis **brancher `s9-build` de la Forge sur la recherche** (elle *cherche et importe* ce qui existe,
n'invente que le delta ; `reuse_ratio` mesuré). C'est ça qui fait passer la Forge d'« écrit tout de
zéro » à « assemble depuis un stock prouvé » — et donc **la Forge s'améliore à chaque jeu produit**.

## 6. Discipline non négociable (pour ne pas re-gonfler)

- **Non-LLM d'abord** : admission + oracle = déterministes. LLM/embedding = advisory.
- **« Rapporté ≠ démontré »** : une relation/métrique n'entre que **prouvée** par un run gaté.
- **Runtime honnête** : HTML prouvé maintenant ; 3D gaté derrière un validateur Godot à construire.
- **Commencer petit** : une **tranche verticale** (1 role → recherche → assemblage → oracle) avant
  tout élargissement. Voir la ligne d'arrivée (ce document), mais avancer segment par segment.

## 7. Couplage implémentation — architecture de DÉPART → CIBLE (wire map)

Chaque boîte de l'org chart mappée sur la **réalité Forge** (fichiers/contrats vérifiés ce jour).
Légende : **✅ existe** · **🔴 à construire** · **🔷 à importer (Claude-Code-Game-Studios, MIT)**.

Chaîne Forge réelle (`dispatch.ORDER`, 13 contrats) :
`s0-contrat · s1-prisme · s2-worldscan · s3-decompo · s4-archi · s5-wiremap · s6-redteam-plan ·
s9-build · s10a-oracle-code · s10b-oracle-archi · s10c-oracle-wiremap · s11-redteam-code ·
s12-verdict` (déterministes : s10a/b/c, s12) — le modèle par rôle est résolu par
`contracts/roles.yaml`. Contrat s10d (`s10d-oracle-visual.yaml`) = capteur visuel advisory.

| Boîte org chart | DÉPART (réel aujourd'hui) | Import 🔷 | CIBLE |
|---|---|---|---|
| **STUDIO DIRECTOR** | ✅ `/forge` + orchestrateur Fable (choix de profil, escalade `escalate.py`, budget = tokens) — pas de contrat dédié | 🔷 prompts `creative-director`/`producer` comme contexte s0 | Fable reste director ; contexte enrichi |
| **LEAD DESIGNER** | ✅ boucle `dispatch.ORDER` (Fable séquence s0→s12) | — | idem + **interroge la bibliothèque** |
| **GAMEPLAY LEAD** | ✅ contrats `s1-prisme` (rubrique fun) · `s3-decompo` · `s5-wiremap` (+ gel `frozen_features_from_wiremap`) | 🔷 `game-designer`/`systems-designer`/`level-designer`/`economy-designer` | idem + s1/s2 **citent** la bibliothèque (advisory) |
| **ART DIRECTOR** | 🔴 **MANQUANT** (aucun contrat art ; `FORGE_2_DESIGN` propose s2.5-artbible + s8-assets, non construits) | 🔷 `art-director`/`technical-artist`/`sound-designer` + 41 templates | 🔴 nouveaux contrats **s2.5-artbible** + **s8-assets** (branchés sur SEARCH) |
| **TECH DIRECTOR** | ✅ contrat `s4-archi` + `static_oracles.check_architecture` | 🔷 `technical-director`/`engine-programmer` + 11 règles path-scoped | idem + standards importés |
| **Spécialistes** (Greybox/Boss/Balance/AI ; Asset/Char/Anim/VFX ; Engine/Tools/Save) | ⚠️ implicites dans `s3-decompo`/`s9-build` (sous-agents spawnés via `runtime.route_step`) | 🔷 **les 49 définitions d'agents** → converties en **contrats `.yaml`** (invariant : aucun agent sans contrat validé) | rôles explicités comme contrats |
| **KNOWLEDGE ENGINE** | ⚠️ `knowledge_base/catalog.json` + `kb-validate.mjs` (**admission seule**, PAS consommé par s9) | — | 🔴 index typé **representation/logic/role** + relations + tiers/preuve ; **produit** par les spécialistes design (propose-only, candidate), **consommé** par s9 |
| **SEARCH ENGINE** | ✅ `knowledge_base/search.mjs` (construit 2026-07-13, filtres déterministes) | — | idem + embedding advisory plus tard |
| **ASSEMBLER / BUILD** | ✅ contrat `s9-build` + `driver.py` (machine à états, reprise après kill) | — | 🔴 **s9 interroge SEARCH d'abord** (importe l'existant, n'écrit que le delta ; `reuse-ratio.mjs`) |
| **TEST / ORACLE** | ✅ `s10a` (`gate.forge_gate`→`oracles.json`→`run-oracle.mjs`) · `s10b` (`check_architecture`) · `s10c` (`check_wiremap`+gel) · mutation (`mutation_proof.py`) · solvabilité (`solvability.mjs`) · `s10d` advisory · `s12` verdict signé (`verdict.py`) · `verify_run.py` | — | idem + 🔴 **oracle de simulation ROLE** (étend solvabilité : mesure la *bande de difficulté*, pas juste la victoire) |
| **RETOUR HUMAIN** | ✅ HumanGate Pierre ; `studio_link` propose-only (`propose_ledger_entry`/`propose_project_record`) ; `decision=HUMANGATE_READY[_WITH_OBJECTION]` | — | idem + **playtest humain = l'oracle de fun** qui remplit les métriques d'expérience |

**Mécanisme d'import CCGS (concret)** : leurs agents sont des `.md` (rôle + prompt). Les importer =
les **convertir en contrats `scripts/forge/contracts/<role>.yaml`** (17 champs, 3 états) — ainsi ils
passent la porte `dispatch.prepare_dispatch` et respectent l'invariant « aucun agent sans contrat
validé ». On prend leur **largeur de rôles** ; on garde **notre colonne déterministe** (dispatch +
oracles + verdict signé). Zéro import de leur validation (hooks bash + « user decides ») : la nôtre
est supérieure.

**Ce que le delta DÉPART→CIBLE révèle pour la bibliothèque (qui/quoi/comment/pourquoi)** :
- **QUI produit** dans la bibliothèque : les spécialistes design/greybox/art (via s3/s5/s8),
  **propose-only**, tier `candidate` — jamais d'écriture directe en `validated`.
- **QUI consomme** : l'ASSEMBLER (`s9-build`) via SEARCH.
- **QUOI** : `representation` (assets) · `logic` (systèmes) · `role` (contrats gameplay) — chacun
  avec sa preuve.
- **COMMENT** : admission = validateur déterministe ; recherche = filtres déterministes ; promotion
  `candidate→validated` = `proof_of_use` d'un jeu gaté vert.
- **POURQUOI** : pour que la Forge cesse d'« écrire tout de zéro » et **assemble depuis un stock
  prouvé** — donc s'améliore à chaque cycle (`reuse_ratio` croissant).

**Ordre de construction (segments, chacun raccordé à la cible)** : (1) enrichir les fiches + poser
`role` + `search.mjs` (tranche verticale, HTML/2D) → (2) brancher `s9` sur SEARCH (`reuse_ratio`) →
(3) importer la largeur de rôles CCGS en contrats (Art/Tech director) + s2.5/s8 → (4) simulation
ROLE + métriques mesurées → (5) *(gaté)* embedding advisory, puis track Godot après validateur 3D.

```
software_verdict: (aucun — document d'architecture)
evidence_verdict: MECHANICAL_VALIDATION_ONLY (§1 = état vérifié par oracles ; §4 = dépôt MIT inspecté ; §7 = contrats/dispatch réels listés)
claim_verdict: NO_CLAIM_ALLOWED
```
