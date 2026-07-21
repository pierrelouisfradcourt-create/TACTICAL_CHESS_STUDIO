# RÉSULTATS — Game Knowledge Base : assemblage-depuis-ingestion (expérience §5)

- **Date** : 2026-07-12
- **Statut** : EXÉCUTÉ. Verdict mécanique calculé sur critères FIGÉS AVANT le run
  (mission §5). **Ratification Pierre en attente** (gate).
- **Parents** : `KB_INGESTION_CONTRACT.md` (v2, red-teamé) · `KB_REDTEAM_ADJUDICATION.md` ·
  `STUDIO_RUNTIME_ARBITRATION.md` (cadre C-restreint / A-first / B-gaté).
- **Claim testé** : on peut assembler un jeu HTML **cohérent** à partir de briques **INGÉRÉES**
  et il passe les gates existants, **sans réinventer depuis zéro**.

---

## 1. Ce qui a été construit (sans rien télécharger)

**Knowledge Base** (`knowledge_base/`, 11 entrées de catalogue, validées par `kb-validate.mjs`) :
- **3 assets 2D ingérés** (copie locale d'assets CC0 déjà dans le repo — 0 octet réseau) :
  sprites Kenney « Top-down Shooter » (`asset-kenney-survivor1-stand`, `-manblue-stand`,
  `-zombie1-stand`), sha256 + provenance_url + licence SPDX par asset.
- **3 assets 3D manifest-only** (Quaternius, KayKit, Poly Haven) : catalogués, `ingested:false`,
  `runtime:godot`, **0 octet** — le validateur REJETTE toute entrée godot avec des octets (R6).
- **3 patterns cités** GPL-safe, advisory, zéro code : `pat-damage-floor` (Wesnoth),
  `pat-full-reachability` (SPD), `pat-zone-of-control` (Wesnoth).
- **2 systèmes MIT** en réécriture propre inspirée des patterns, purs, property-testés :
  `sys-damage-floor`, `sys-reachability`.

**Validateur non-LLM** (`kb-validate.mjs`, 46 tests) : R1..R12 + red-team adjugé (2 invariants
centraux étaient cassés en v1 → fermés ; 3 limites résiduelles déclarées).

**Jeu consommateur** (`games/kb_tactics/`, convention 11 fichiers) : tactique HTML tour-par-tour,
atteindre la sortie en évitant des poursuivants lents.

## 2. Traçabilité de la consommation (manifeste + preuves)

`games/kb_tactics/assembly_manifest.json` trace chaque brique consommée. Import RÉEL (pas de copie) :

| Brique KB | Type | Consommation | Preuve d'exécution |
|---|---|---|---|
| `asset-kenney-survivor1-stand` | asset ingéré | sprite joueur (URL `/knowledge_base/assets/...`) | e2e : `window.__game_debug.assetsLoaded.player === true` (chargé dans le navigateur) |
| `asset-kenney-zombie1-stand` | asset ingéré | sprite ennemi | e2e : `assetsLoaded.enemy === true` |
| `sys-damage-floor` | système (validated) | `game.mjs` combat (`applyHit`) | logic.test « combat : effectiveDamage » + import réel `../../knowledge_base/...` |
| `sys-reachability` | système (validated) | `level.mjs` garantie d'atteignabilité + bot | logic.test « sortie toujours atteignable » (50 seeds) |
| `pat-damage-floor` | pattern cité | combat (via sys) | advisory (citation game.mjs) |
| `pat-full-reachability` | pattern cité | génération (via sys) | advisory (citation level.mjs) |
| `pat-zone-of-control` | pattern cité | note de conception | advisory (aucun code de pattern importé) |

Le serveur du jeu (`server.mjs`) sert `/knowledge_base/systems/*` et `/knowledge_base/assets/*` en
lecture seule (garde anti-traversée + realpath) — c'est ce qui permet l'import RÉEL côté navigateur
comme côté Node, sans copie.

## 3. Résultats des gates (mécaniques, non-LLM)

| Gate | Résultat | Preuve |
|---|---|---|
| **Oracle 4 volets** (`run-oracle.mjs`) | **PASS** (exit 0) | logic (25) + properties (12) + e2e Playwright + solvabilité — `lab/forge_runs/kb_tactics/oracle_kb_tactics.log` |
| **Solvabilité** | **PASS** | un bot déterministe GAGNE sur 6 seeds (19–31 tours, hp 48–50) |
| **Mutation** | **50/51 tués** (98 %), 1 survivant **équivalent prouvé** et trié | game.mjs 38/38 · level.mjs 12/13 · survivant `ge->gt@L13` = équivalence RNG vérifiée sur 500 seeds × 50 tirages (`mutation_triage.json`) |
| **Verdict signé** (`s12`) | **software_verdict OK · decision HUMANGATE_READY_WITH_OBJECTION · is_clean_pass=False** | `verify_run` = **AUTHENTIQUE** (HMAC + évidence relue + preuve mutation signée re-vérifiée) |
| **s10d capteur visuel** (advisory) | **0 signal dans les familles évaluées** A1/A2/A3/A5 (après correction de 2 contrastes qu'il a détectés) ; seul A6 tire (statut DROP, hors-évaluation P1.1) | `lab/forge_sensors/kb_tactics/visual_mechanical.json` |

Note d'honnêteté : `is_clean_pass=False` par construction — le survivant mutation trié (même
équivalence prouvée) impose `HUMANGATE_READY_WITH_OBJECTION`, jamais un OK propre sans Pierre.
Le s10d a **réellement attrapé** 2 textes sous WCAG (`.hint` 4.46, `#restart` 3.15) avant correction
— démonstration que le capteur advisory fonctionne sur un jeu assemblé (pas seulement les sondes P1.1).

## 4. Verdict de l'expérience (critères §5, figés AVANT)

**RÉUSSITE** — les trois conditions §5a/b/c sont tenues, contrôle anti-théâtre inclus :

- **(a) consomme ≥1 asset ingéré + ≥1 pattern cité + ≥1 système du tier, traçables** :
  2 assets ingérés (chargés en navigateur, prouvé e2e) + 3 patterns cités + 2 systèmes **validated**
  (importés réellement), tous tracés au catalogue avec provenance/sha. ✅
- **(b) passe solvabilité + s10d + mutation** : solvabilité 6/6, s10d 0 signal évalué, mutation
  98 %+triage équivalent prouvé, verdict signé vérifié AUTHENTIQUE. ✅
- **(c) part from-scratch minoritaire et déclarée** : la logique **cœur réutilisée** (combat à
  plancher, atteignabilité BFS) vient de la KB par import ; le from-scratch = l'orchestration
  spécifique au genre (machine à états tour-par-tour, IA de poursuite lente, UI/serveur),
  déclarée dans `assembly_manifest.json`. ✅
- **Contrôle anti-théâtre** : une brique **mal indexée** (GPL en `kind:system` + `validated` sans
  preuve + sha faux + dépendance inconnue) est **REJETÉE** par le validateur (4 violations, exit 1) —
  `knowledge_base/catalog.broken.json`. Le tier « validated » n'est pas un tampon. ✅

**Falsification NON déclenchée** : aucune brique n'a dû être réécrite pour servir (import réel,
diff module = 0) ; aucun gate rouge imputable à une brique ; aucune licence/tier non conforme.

## 5. Conclusion LIMITÉE (déclarée d'avance — ne pas surjouer)

Ceci prouve **l'assemblage-depuis-ingestion sur HTML/2D** : des briques ingérées (assets CC0 +
patterns GPL cités + systèmes permissifs) s'assemblent en un jeu cohérent qui passe les gates
existants inchangés, avec traçabilité de provenance. Cela **ne prouve PAS** : le 3D/Godot (track B,
gaté, validateur inexistant), le fun, la généralisation inter-genres (un seul jeu, un seul genre),
ni que la KB « validée » par un unique consommateur est mûre (même limite que P2.4). Le red-team a
montré qu'un validateur mécanique a des frontières (aliasing AST, licence sémantique) qui restent
du ressort du HumanGate.

## 6. Proposition de download (gate Pierre — RIEN téléchargé)

Le noyau actuel n'a consommé que des assets CC0 **déjà dans le repo** (0 octet réseau). Premier
download réel proposé, à ratifier ou rejeter par Pierre (aucune ingestion de masse) :

| Pack | URL | Licence | Format | Taille (ordre) | Usage |
|---|---|---|---|---|---|
| Kenney — « Tiny Dungeon » (ou « 1-Bit Pack ») | https://kenney.nl/assets/tiny-dungeon | CC0-1.0 | 2D (tiles+sprites 16×16) | ~1–2 Mo | tuiles de sol/mur + héros/ennemis pour habiller `kb_tactics` et futurs jeux tactiques HTML |

Un seul pack 2D cohérent, CC0, compatible HTML. Après go Pierre : téléchargement → `assets/` +
manifest (sha256 + provenance_url) → validation `kb-validate.mjs`. Les packs 3D restent manifest-only.

## Rapport de charter

```
software_verdict: OK (oracle 4/4 + mutation 98%+triage prouvé + verdict signé vérifié AUTHENTIQUE)
evidence_verdict: MECHANICAL_VALIDATION_ONLY (run-oracle réel, verify_run exit 0, s10d advisory, red-team claude-blind)
claim_verdict: NO_CLAIM_ALLOWED
decision: HUMANGATE_READY_WITH_OBJECTION (survivant mutation trié — ratification Pierre requise)
```
