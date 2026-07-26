# 🧠 Studio Brain — Map of Content
#moc #reference

> **Tactical Chess Studio** — micro-usine de jeux Steam, solo + IA, opérée par Pierre.
> Obsidian = mémoire persistante entre sessions. Règle: tout ce qui est décidé ici est *actable*, pas simplement archivé.

---

## Doctrine & Règles absolues
→ [[doctrine/studio-doctrine|Studio Doctrine]] — HumanGate, oracles non-LLM, IA-invisible, distribution-first, NO_CLAIM

---

## Projets actifs
→ [[projects/snake-survivor-genesis|Snake: Survivor RPG — Genesis]] — **SUPERSEDED.** Kill-gate P0 jamais résolu (0 playtest enregistré). Remplacé par le pivot produit du 2026-07-05/06 (voir Décisions). Fiche conservée pour historique/apprentissages, pas de reprise sans HumanGate explicite.
→ **Pivot produit (2026-07-05/06)** : Rocky gelé → gamme cartes FR, **Belote = produit 1**. Bloc 1 (règles/table/matériel) livré 2026-07-06 (`8e011fe`), non poussé, 2 gates Pierre en attente. ⚠️ **0 activité git depuis 2026-07-06** (13 jours) — le travail réel de la période s'est porté sur `games/auto_battler/` (ci-dessous), sans arbitrage HumanGate écrit sur le statut de Belote. À clarifier avec Pierre.
→ **`games/auto_battler/`** — chantier réellement actif depuis 2026-07-18 (Battlegrounds×TFT, Game Bible V1 de Pierre). Architecture 16 bibles RATIFIÉE via 7 HumanGates (Foundation, Gate #2, Gate #3, Gate #4-incrément1, QB-6, DP-9, Values-v0). Forgé via profil `increment` : `auto_battler_i1` engine-core mergé (`44592b3`), `auto_battler_i2` preparation+economy mergé (`e72a0e4` + fix `bccbef9`, HIGH-1 déterminisme détecté par red-team puis corrigé). **Rien poussé** (push = gate séparé, non demandé). C'est le chemin critique réel des 13 derniers jours de git.
→ **Forge 2.0** (`scripts/forge/`) — usine contractuelle QA/oracle du studio. P0 intégrité **GELÉ** (décision Pierre 2026-07-11, 277 tests verts). P1 mécanique-only falsifiée puis **P1 OUVERTE** (2026-07-12) : sondes A1/A2/A3/A5 promues fixtures permanentes `fixtures/p1/`. P1.1 SUCCESS (4/4 défauts détectés, 0 FP). s10d (oracle visuel advisory) incrément P1-1 COMPLET, poussé (`f6bfab8`). Profil `increment` ajouté 2026-07-19 pour servir `auto_battler`. **MàJ 2026-07-26** : Godot devient le 1ᵉʳ backend certifié (contrat `s9-build-godot`, ratifié Pierre 2026-07-21) — mutation GDScript, garde fail-closed, brique `M01` (grid-navigator) mesurée ; la tautologie R9 trouvée en revue (le générateur consultait la brique testée) a été corrigée (`bb6ea2fa`, ré-mesurée). `DISPATCH_SPAWN_AUTHORITY_V1` (dispatch ≠ autorisation de spawn) livré en 2 phases. **Grosse session de consolidation git le 07-26** : 7 branches + 5 worktrees fusionnés en une seule branche master (0 fichier sale), 5 conflits résolus par union/addition, rien poussé — détail : [[00_CURRENT_CONTEXT|Contexte courant]]. 2 décisions rédigées attendent la ratification explicite de Pierre : `studio_brain/decisions/PROPOSED_2026-07-26_ratifications.md` (ne pas les traiter comme actées).
→ **Lane STUDIO : GEL** (ratifié Pierre 2026-07-19) — `autopilot.py`, `scripts/studioV2/`, lanceurs. Voir Décisions.
→ `games/menagerie_tactics/` — jeu Forge (Pokémon × Fire Emblem), forgé 2026-07-11, verdict signé OK vérifié. N'existait que dans un worktree non commité ; récupéré et commité lors de la consolidation du 07-26 (`b9ec14e5`). Rien poussé.
→ `games/kb_tactics/` — jeu tactique HTML assemblé par ingestion depuis une knowledge base (`knowledge_base/`, mission Pierre 2026-07-12). Réussite mécanique, **NON commité**, gates Pierre en attente (ratifier contrat, conclusion §5, go Kenney download, commit).
→ `games/leviathan/` (Capacitor/Vite, idle+combat) et `games/chess_tcg/` (Godot, pivot mobile) — prototypes expérimentaux actifs, hors chemin critique produit principal.
→ `llm-lego/` — outil interne (builder visuel de chaînes LLM). Activité continue (belote-claude/belote-qwen experiments, wireframes).

---

## Design & Apprentissage
→ [[gamedesign/lessons|Leçons Gamedev]] — règles extraites de la recherche marché + post-mortems
→ CERFA Template — manifeste d'instanciation par jeu : `docs/studio_v2/08_GAME_MANIFEST_CERFA.md` (fichier vault jamais créé — lien direct vers la source, pas de wikilink mort)

---

## Décisions
→ [[decisions/decision-log|Decision Log]] — registre chronologique des décisions irréversibles

---

## Références
→ [[reference/sources-of-truth|Sources de Vérité]] — où lire les données réelles dans le repo
→ [[reference/market-reality|Réalité du Marché Steam]] — chiffres de sobriété (médiane, wishlists, conversion)

---

## Workflow
→ [[workflow/skills-catalog|Skills Catalog]] — les 33 skills du projet groupés par finalité, mécanique de délégation
→ [[workflow/studio-operating-flow|Studio Operating Flow]] — boucle Pierre→Cowork→Exécution→Oracles→HumanGate, règle no-plan-no-patch

---

## Architecture
→ [[architecture/system-vision|System Vision]] — cockpit comme point de connexion unique : autopilot, openclaw, qwen-local, vault, jeux

---

## Meta
→ [[meta/vault-usage-guide|Vault Usage Guide]] — conventions du vault : dossiers, tags, wikilinks, cadence de mise à jour, DON'Ts

---

## State
→ [[state/current-state-2026-06-28|État Studio — 2026-06-28]] — snapshot daté : modules Godot existants, bugs résolus, vault créé

---

## Dashboard rapide

| Titre 1 (historique) | Snake: Survivor RPG — Genesis — **SUPERSEDED 2026-07-05/06** |
|---|---|
| Statut final | Kill-gate P0 jamais tranché (0 playtest enregistré, 2 builds jamais réconciliés). Le studio a pivoté avant résolution — pas d'échec constaté, juste un changement de pari produit. |
| Page Steam | Jamais ouverte. Pas de wishlists. |
| Chemin critique actuel | **Statut à clarifier avec Pierre.** `auto_battler` = chantier réellement actif (13 j de git consécutifs, incréments 1-2 Forge mergés non poussés) ; Belote (produit 1 nominal du pivot 07-05/06) = 0 activité depuis 2026-07-06. |
| En parallèle | Forge 2.0 (QA/oracle interne, P0 gelé, P1 ouverte, Godot certifié backend 07-21, profil `increment` ajouté) · `menagerie_tactics` (jeu Forge récupéré 07-26, verdict OK) · `kb_tactics` (KB ingestion, gates Pierre en attente) · leviathan / chess_tcg (prototypes expérimentaux) |
| Budget | < 2 000 € total (contrainte studio globale, inchangée) |
| Lane STUDIO | **GEL** (ratifié Pierre 2026-07-19) — `autopilot.py`/`scripts/studioV2/`/lanceurs, lire OK modifier = HumanGate |
| Repo | consolidé 2026-07-26 : 1 seule branche `master`, 0 fichier sale, **poussé le même jour sur go Pierre** (`87e9ec4..1481d6d`, master = origin/master) ; le travail post-consolidation (primitives Codex, learning, THIRD_BRAIN) reste non commité |
| Dernière revue vault | 2026-07-26 (revue hebdomadaire mémoire) |

---

## Cadence de mise à jour
Voir [[reference/sources-of-truth#Cadence]] — revue hebdomadaire en fin de session.
