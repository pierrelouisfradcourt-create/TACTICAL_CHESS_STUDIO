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
→ **Forge 2.0** (`scripts/forge/`) — usine contractuelle QA/oracle du studio. P0 intégrité **GELÉ** (décision Pierre 2026-07-11, 277 tests verts). P1 mécanique-only falsifiée puis **P1 OUVERTE** (2026-07-12) : sondes A1/A2/A3/A5 promues fixtures permanentes `fixtures/p1/`. P1.1 SUCCESS (4/4 défauts détectés, 0 FP). s10d (oracle visuel advisory) incrément P1-1 COMPLET, poussé (`f6bfab8`). Profil `increment` ajouté 2026-07-19 pour servir `auto_battler`. **MàJ 2026-07-26** : Godot devient le 1ᵉʳ backend certifié (contrat `s9-build-godot`, ratifié Pierre 2026-07-21) — mutation GDScript, garde fail-closed, brique `M01` (grid-navigator) mesurée ; la tautologie R9 trouvée en revue (le générateur consultait la brique testée) a été corrigée (`bb6ea2fa`, ré-mesurée). `DISPATCH_SPAWN_AUTHORITY_V1` (dispatch ≠ autorisation de spawn) livré en 2 phases. **Grosse session de consolidation git le 07-26** : 7 branches + 5 worktrees fusionnés en une seule branche master (0 fichier sale), 5 conflits résolus par union/addition, poussée le même jour. 2 décisions rédigées ont été **promues au decision-log le 07-26** (JALON 0 décision ①) : `studio_brain/decisions/PROPOSED_2026-07-26_ratifications.md` reste comme trace de rédaction, ne plus le modifier.
→ **MàJ 2026-08-03→09** : semaine entièrement Forge, **seul chemin critique actif** — `auto_battler`/Belote à 0 activité git depuis le 07-26 (14 jours). Breakout V2 **gelé comme baseline** (07-31, campagne 3 runs signée OK/HUMANGATE_READY). **Pac-Man V5 devient le jeu de référence pour tester la Forge** — validé par Pierre le 08-06 (pas gelé), voir [[decisions/decision-log|decision-log]]. Pipeline amont réordonné (World Scan avant Prisme, doctrine `FORGE_PRISME_V2`, 08-03) suite à l'audit Tetris (menu/pause/audio/next-preview absents malgré oracles verts). Post-mortem Pac-Man 08-07 : boucle apprentissage cassée au 2ᵉ maillon (0 leçon dans `lessons.jsonl`), driver bout-en-bout jamais exécuté sur ce cycle, `spawn_authorized` jamais journalisé (0/1418) — corrections en cours (Observer devient charnière de transition inter-run, `RUN_INDEX` ranimé après 41 runs manquants). Asset Library V1 : clôture **annulée par Pierre** (08-06), 75 fichiers volontairement non commités. **43 commits non poussés** depuis le dernier push (`bcde5cb`, 08-01) — à clarifier avec Pierre au prochain point.
→ **MàJ 2026-08-10→16** : semaine **100 % Forge**, 30 commits, 0 activité sur `games/` hors `bfe7ecb` (volet Snake). Aucun playtest joueur. Trois acquis structurants : (1) **cible de pipeline figée** `docs/forge/FORGE_PIPELINE_TARGET_V1.md` (P0, ratifiée Pierre 08-13) — Agent Artistique → GM → matrices → Architecte/WireMap → Build → Oracles → Lessons → Mutation, avec l'écart mesuré flèche par flèche ; (2) **méthode de validation ratifiée** (08-15) : l'unité de validation n'est pas le working tree mais `HEAD + lignée reconstruite` — 10 lots livrés par ce protocole, un GO Pierre par lot ; (3) **motif « mesurer puis jeter » fermé 5 fois** dans le même littéral du driver (`markdown_check`, `yaml_check`, `observable_coverage`, `tools_used`, `findings_note`) + `next_reason` obtient enfin un destinataire (transport et visibilité seulement — **aucune décision automatique**). Découverte de méthode : une allow-list **pré-approuve, elle ne restreint pas** ; et 1672 tests verts n'ont pas vu la panne que le premier run réel a révélée. **77 commits non poussés** (dernier push `bcde5cb`, 08-01 ; HEAD `cc155d7`).
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
| Chemin critique actuel | **Forge (`scripts/forge/`)** — seule lane avec activité git réelle depuis 07-26. `auto_battler`/Belote (produit 1 nominal du pivot 07-05/06) = **0 activité depuis 2026-07-26** (21 jours) — statut toujours non tranché, à clarifier avec Pierre. |
| En parallèle | Pac-Man = jeu de référence Forge (V5 validé Pierre 08-06) · Breakout V2 gelé comme baseline (07-31) · `bomberman_3d` (fixture Forge, tests ratifiés 08-12, arbre non suivi) · `tetris` (volet de preuve prêt qui ferait passer le jeu OK → **BLOCKED** — décision Pierre en attente) · `menagerie_tactics` · `kb_tactics` (gates Pierre en attente) · leviathan / chess_tcg |
| Budget | < 2 000 € total (contrainte studio globale, inchangée) |
| Lane STUDIO | **GEL** (ratifié Pierre 2026-07-19) — `autopilot.py`/`scripts/studioV2/`/lanceurs, lire OK modifier = HumanGate |
| Repo | consolidé 2026-07-26, poussé le même jour sur go Pierre. Dernier push effectif : `bcde5cb` (2026-08-01). **77 commits Forge non poussés depuis** (08-03→16), HEAD `cc155d7` — à clarifier avec Pierre. Arbre de travail : 137 entrées sales (fixtures, artefacts de run, lots non instruits). |
| Dernière revue vault | 2026-08-16 (revue hebdomadaire mémoire) |

---

## Cadence de mise à jour
Voir [[reference/sources-of-truth#Cadence]] — revue hebdomadaire en fin de session.
