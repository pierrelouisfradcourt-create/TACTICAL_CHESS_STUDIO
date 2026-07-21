# PLAN D'EXÉCUTION DÉTAILLÉ — STUDIO BUILD MACHINE + REBOND MULTI-LLM

*2026-06-28. Niveau IMP : objectif · fichiers · oracle · lane · effort · dépendances. Rien n'est codé sans go Pierre.*
*Lanes : 🟢 SAFE_AUTO · 🟠 AUDIT (revue + /plan) · 🔴 HUMAN (Pierre).*

---

## 0. CORRECTIONS DE PRÉMISSE (vérifiées le 2026-06-28)

**Coûts API — réalité :**
- **Claude API : aucun free tier.** ~5 $ de crédits une fois, puis payant (Sonnet 3/15 $, Haiku 1/5 $ /M tokens). Distinct de l'abo claude.ai. → **Le « Claude gratuit » = Cowork (cet abo)**, pas une clé API dans autopilot.
- **Gemini : free tier réel mais limité** — Flash/Flash-Lite, ~15-30 RPM, ~1500 req/jour ; Pro payant ; limites révisées sans préavis.

**Conséquence architecture : le rebond multi-LLM est gratuit SANS scraper.** Driver les UI web des LLM = violation CGU + risque de ban ; inutile car le stack libre existe déjà. On ne câble **aucune dépendance à une API payante** dans le système (règle dure, cf. CLAUDE.md « jamais d'API externe »).

**Raison d'être d'autopilot (corrigée par Pierre) :** donner des **mains** aux LLM (Claude Code sur le repo, Claude-in-Chrome sur le web) et organiser le **rebond** entre eux et Pierre. On garde cette intention — version gratuite, human-gated, au service du build de jeux.

---

## 1. CARTE DES INTELLIGENCES (qui fait quoi, à quel coût)

| Intelligence | Rôle | Coût | Accès |
|---|---|---|---|
| **Qwen local (LM Studio)** | Bras exécutif : décompose, draft code, /plan v1, red-team passe 1, « creuse la qualité » | **0 € illimité** | localhost:1234 |
| **Cowork-Claude (moi)** | Cerveau stratégique : architecture, red-team passe 2, synthèse, mémoire | **Inclus abo** | cette session |
| **Claude-in-Chrome** | Mains sur le web : devlog, itch, Steam, Reddit, veille | Inclus abo | extension navigateur |
| **Claude Code** | Mains sur le repo : scaffold, patch, refactor | Abo/Max | CLI local |
| **Gemini Flash** | 3ᵉ voix red-team (diversité d'avis) | **Gratuit (plafonné)** | API key, ~1500/j |
| **Oracles (cargo/pytest/godot/télémétrie)** | **Seuls juges du ship** | 0 € | local |
| **Pierre** | Intention + gate irréversibles | — | HumanGate |

Règle : un LLM **propose**, l'oracle non-LLM **tranche le ship**, Pierre **gate l'irréversible**. Aucun LLM ne valide un autre LLM pour décider d'un merge/ship.

---

## 2. LE WORKFLOW « REBOND » — /plan obligatoire avant patch

Le mécanisme central que tu demandes : forcer une conversation `/plan` + red team avant tout patch.

```
1. INTENTION   Pierre pose un brief (jeu, feature, ou patch)
        ↓
2. /PLAN v1    Qwen local décompose → plan (fichiers · étapes · oracle · risques)
        ↓
3. RED TEAM    Cowork-Claude + Gemini Flash critiquent le plan
               (prémisses fausses ? scope ? oracle réel ? effets de bord ?)
        ↓
4. /PLAN v2    plan corrigé après red team
        ↓
5. GATE PIERRE Pierre approuve / ajuste / rejette le plan  ← HARD GATE
        ↓        (aucun patch ne part sans plan approuvé)
6. PATCH       Claude Code (ou Qwen) implémente STRICTEMENT le plan approuvé
        ↓
7. ORACLE      cargo/pytest/godot export/télémétrie — non-LLM
        ↓
8. VERDICT     vert → proposé à Pierre ; rouge → retour étape 2
        ↓
9. GATE PIERRE applique / publie (irréversible = toujours Pierre)
```

**Règle dure « no-plan-no-patch » :** le cockpit refuse mécaniquement tout patch dont l'IMP n'a pas un `plan_approved: true`. C'est l'implémentation de ta demande. S'appuie sur le `governor.py` existant (gate déterministe) + la skill `/plan` existante.

---

## 3. DÉVELOPPER QWEN POUR « CREUSER LA QUALITÉ »

Tu veux que Qwen apprenne à produire de meilleurs plans/patches. Le matériel existe déjà : `golden_examples.jsonl` (corpus LoRA, 57 entrées de IMP réussis).

Pipeline (réutilise la discipline MLOps, version jeu) :
1. **Collecter** : chaque /plan approuvé + patch vert → paire d'exemple « bon plan / bon patch / red-team→correction » ajoutée au corpus.
2. **Entraîner** : LoRA local sur Qwen à partir du corpus (gratuit, offline ; nécessite un GPU correct — à vérifier sur ta machine).
3. **Gate** : `candidate_qwen` ≠ prod. On le compare sur un **set de test de plans** : meilleur seulement si ses plans passent plus d'oracles / moins de red-team rejets — **mesuré, pas jugé par un LLM**.
4. **Déployer** si meilleur, sinon jeter.

Effort : L. Priorité : **après** que la boucle build tourne (sinon on optimise un maillon avant d'avoir la chaîne). C'est M7 ci-dessous.

---

## 4. LES MAILLONS EN IMPs DÉTAILLÉS

### M0 — Hygiène & sécurité coût (prérequis, rapide)
| IMP | Objectif | Fichiers | Oracle | Lane | Effort |
|---|---|---|---|---|---|
| H1 | Geler les 2 worktrees `studio_core` non-canoniques | `worktrees/dur/`, `worktrees/routine/` (+DEPRECATED.md) | `grep` imports hors racine = 0 | 🟢 | S |
| H2 | Couper le routage payant d'OpenClaw (ne garder que Qwen local, ou geler) | `openclaw/providers.yaml`, `studio/openclaw-workspace/openclaw-team.yaml` | aucun provider externe payant actif | 🟠 | S |
| H3 | Archiver la lane chess en R&D (geler, ne pas supprimer) | tag/branch + note | build chess encore vert | 🟠 | S |

### M1 — Template Godot jouable (idle) — **le maillon n°1**
| IMP | Objectif | Fichiers | Oracle | Lane | Effort | Dépend |
|---|---|---|---|---|---|---|
| G1 | Projet Godot 4 + `studio_kit/` (save, options, télémétrie stub, i18n) | nouveau repo public Godot | projet ouvre, export Web OK | 🟠 | M | — |
| G2 | Boucle core idle jouable (1 ressource, courbe progression, 1 prestige) | `game/` | session 10 min, 0 crash | 🟠 | M | G1 |
| G3 | Export headless Win/Web par CLI | script export | artefact produit en ligne de commande | 🟢 | S | G1 |

### M2 — Build local & CI gratuite
| IMP | Objectif | Fichiers | Oracle | Lane | Effort | Dépend |
|---|---|---|---|---|---|---|
| C1 | Git hooks locaux (fmt/lint/tests) | `.git/hooks/` | commit rejeté si rouge | 🟢 | S | G1 |
| C2 | GitHub Actions repo public : export headless | `.github/workflows/` | artefact CI vert | 🟢 | M | G3 |

### M3 — Atelier d'assets (brouillons figurines)
| IMP | Objectif | Fichiers | Oracle | Lane | Effort | Dépend |
|---|---|---|---|---|---|---|
| A1 | Génération d'images **locale** (ComfyUI/SD) + CLI prompt→images | `tools/asset_gen/` | image générée en local depuis un prompt | 🟠 | M | — |
| A2 | Galerie + statut `brouillon→retravaillé→shippable` + historique prompts | cockpit | 1 asset traverse les 3 statuts | 🟠 | M | A1, B1 |
| — | **Garde-fou** : aucun art IA brut shippé (−53% reviews, non protégeable) | doctrine | — | 🔴 | — | — |

### M4 — Cockpit réorienté (Build Board + rebond + /plan gate)
| IMP | Objectif | Fichiers | Oracle | Lane | Effort | Dépend |
|---|---|---|---|---|---|---|
| B1 | Page Build Board (projets jeux, colonnes idée→publié) ; repointer ideas/autoloop/terminals | `autopilot.py` (HTML+endpoints) | 1 projet suivi de bout en bout dans l'UI | 🟠 | M | — |
| B2 | Workflow `/plan`-avant-patch (no-plan-no-patch) via governor | `autopilot.py`, `governance/governor.py` | patch sans plan approuvé = refusé | 🟠 | M | B1 |
| B3 | Mains : Claude-in-Chrome (web) + Claude Code (repo) pilotables depuis le cockpit | `autopilot.py` | une action web + une action repo déclenchées | 🟠 | M | B1 |

### M5 — Boucle test / patch
| IMP | Objectif | Fichiers | Oracle | Lane | Effort | Dépend |
|---|---|---|---|---|---|---|
| T1 | « Lancer » → build → jouer → télémétrie au board | cockpit + `studio_kit` télémétrie | rétention/complétion visibles après une partie | 🟠 | M | G2, B1 |
| T2 | Boucle patch complète (rebond §2 bout-à-bout) | cockpit + Claude Code | 1 patch idée→plan→red team→diff→oracle→appliqué | 🟠 | M | B2, T1 |

### M6 — Publication
| IMP | Objectif | Fichiers | Oracle | Lane | Effort | Dépend |
|---|---|---|---|---|---|---|
| P1 | `butler` push itch.io (branche test, auto) | script publish | build téléchargeable sur itch | 🟢 | S | G3 |
| P2 | `steamcmd`/SteamPipe (beta auto, public = HumanGate) | script publish | build sur branche beta Steam | 🔴 | M | P1 |

### M7 — Développer Qwen (qualité) — plus tard
| IMP | Objectif | Fichiers | Oracle | Lane | Effort | Dépend |
|---|---|---|---|---|---|---|
| Q1 | Étendre `golden_examples` (paires plan→patch, red-team→correction) | `lab/chains/golden_examples.jsonl` | corpus ≥ N exemples qualité | 🟢 | S (continu) | T2 |
| Q2 | LoRA local Qwen : candidate → gate mesuré → deploy si meilleur | `ml/` (réorienté) | plans candidate passent + d'oracles qu'avant | 🟠 | L | Q1 |

---

## 5. CHEMIN CRITIQUE

```
M0 (hygiène) ─► M1 (Godot jouable) ─► M2 (build/CI) ─► M5 (test/patch) ─► M6 (publish itch)
                     │
   en parallèle :    ├─► M3 (atelier assets)
                     └─► M4 (cockpit + rebond + /plan gate)

M7 (Qwen LoRA) = continu, après que M5 tourne.
```

**Verrou n°1 : M1.** Sans un vrai jeu Godot jouable, la machine n'a rien à produire, tester, ou publier. Tout part de là.
**Le rebond (M4-B2) peut se construire en parallèle** car il sert dès le premier patch sur M1.

---

## 6. GATES & RÈGLES D'EXÉCUTION

1. **No-plan-no-patch** : aucun patch sans `/plan` approuvé par Pierre (M4-B2).
2. **Red team systématique** sur tout AUDIT (Cowork-Claude + Gemini Flash).
3. **HumanGate** sur irréversible : publish public, dépense (Steam 100 $), écrasement de prod, marque.
4. **Zéro dépendance API payante** dans le système (Qwen local + Cowork + Chrome + Gemini Flash gratuit).
5. **Oracles non-LLM tranchent le ship.** Le LLM conseille ; il ne valide jamais un merge.
6. **Un projet par carte, builds parallèles autorisés** (le lock protège un même projet, pas entre projets).
7. **Distribution-first** maintenu : la page itch/Steam et les wishlists passent tôt.

---

## 7. PREMIER PAS PROPOSÉ (sur ton go)

Ordre recommandé pour le premier sprint, tout en 🟢/🟠, rien d'irréversible :
1. **M0** (H1-H3) — hygiène + couper le coût OpenClaw. *(quick wins, 1 session)*
2. **M1-G1/G2** — le template Godot idle jouable. *(le cœur)*
3. **M4-B1/B2** en parallèle — Build Board + gate `/plan`-avant-patch.

Dès que G2 + B2 existent, on a la **première boucle rebond réelle** : tu poses un patch sur le jeu, Qwen fait le /plan, red team, tu gates, Claude Code patche, l'oracle valide. C'est la machine que tu veux, en petit, mais vivante.

Question de cadrage avant de lancer : valider l'ordre M0→M1→M4, ou tu veux que je détaille encore un maillon (ex. le schéma exact du Build Board, ou le protocole `/plan`-avant-patch au niveau endpoint) ?
