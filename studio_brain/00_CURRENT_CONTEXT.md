# Contexte courant TCS
Dernière session : 2026-07-13 — **WFL-02 FABRIQUÉ (coup A1 « prisme → panel ×5 »), 6/6 conforme,
divergence réelle mesurée entre les 5 regards (NON commité).** Go Pierre : « fabrique le prisme à 5
regards ». 5 artefacts `product_snapshot_{ceo,gd,front,back,joueur}.md` écrits en isolation (charter
breakout de WFL-01 réutilisé, sha256 identique) + contrôle = le vrai artefact WFL-01 existant (pas
régénéré). Oracle non-LLM `check_prisme.mjs` (forme seulement, jamais le contenu) : **1 faux positif
trouvé et corrigé AVANT conclusion** (phrase qui AFFIRME l'absence d'un placeholder « à définir » prise
pour un placeholder — même famille de bug que WFL-01) → puis 6/6 PASS. Zéro renvoi côté artefacts.
**Divergence réelle et mesurée (pas supposée)** : aucun des 5 regards ne couvre le bornage de la
raquette (présent chez le contrôle) — un angle du charter disparaît totalement du panel ; à l'inverse 2
préoccupations neuves apparaissent (CEO : dérive de scope ; Front : découplage rendu/logique) absentes
du contrôle. Confirme empiriquement l'hypothèse de `PRISM_SCOPING.md` : le problème de recombinaison
(coup A2, non traité ici — hors scope volontaire) est réel, pas théorique. Détail :
`lab/workflow_lab/WFL-02/{PROTOCOL.md,results.md}`. **Rien commité — N=1, pas de conclusion ferme.**
Avant (même session) : **WFL-01 COMMITÉ (`ccb46a6`,`aea2042`)** — run1+run2 (N=2) VERT stable, oracle
réécrit une fois puis réutilisé sans retouche. **Coût/robustesse mesurés** (`WFL-01/cost_robustness.md`,
NON commité) : proxy seulement (pas de télémétrie driver réelle) — volume variante +13 à +40 %, overhead
commentaires ×1,4 à ×6,9 (décroissant), **zéro renvoi sur le code de jeu**. **Scoping coup A**
(`docs/forge/PRISM_SCOPING.md`, NON commité) : panel ×5 n'existait nulle part avant cette session sauf
2 lignes du schéma ; divergence trouvée entre le récit du schéma (WireMap recombine) et le contrat réel
(c'est s3 Décompo qui lit le Prisme, pas s5). Détail complet archivé si besoin dans les fichiers cités.
Avant : 2026-07-12 — **PLANS D'ARCHITECTURE STUDIO (synthèse tri-IA, NON commité).**
Tri des dernières discussions GPT/Gemini (lues via Chrome) → 3 docs figés : `docs/forge/STUDIO_ARCHITECTURE.md`
(vision+couplage org-chart↔Forge, imports MIT Claude-Code-Game-Studios = 49 rôles→contrats, leur trou = notre
acquis oracle/search) · `STUDIO_AGENT_ATLAS.md` (fiche 16-champs par agent, propriété mémoire, repo départ/cible)
· `STUDIO_MASTER_SCHEMA.html` (plan blueprint A/B/C : Prisme-panel refracté, fouille bibliothèque→retour web→
POOL de builders, flux mémoire lit/écrit/renvoi ; cyan=existant, ambre=cible). **Insight ratifiable : le run dir
EST un chat multi-agent (blackboard)** — projection qui réduit ~20 flèches à 2/agent + 4 zones (bibliothèque,
produit, preuves signées, référence) ; case ★ Table des bilans = `lab/reports/bilans/` (propose-only, cible).
**`docs/forge/forge-live.html` CONSTRUIT et PROUVÉ** (afficheur pur du state.json driver, mode ?demo=1 vérifié
en navigateur : bulles, renvois ↺, verdict signé, HumanGate). **+ Détail E « L'ARBRE » (MCTS à petit budget sur
le workflow : coups=mutations de schéma, rollouts=runs forkés tardifs sur cache s0→s5, récompense=panel
d'oracles, sélection=Pierre) + gabarit `WORKFLOW_LAB_PROTOCOL.md`** (règles dures : 1 coup=1 variable, branche
contrôle, panel figé avant, budget déclaré, fun hors panel). Gates Pierre : commit du lot + ratification archi.
Avant : 2026-07-12 — **GAME KNOWLEDGE BASE par INGESTION** — RÉUSSITE mécanique, NON COMMITÉ.
`knowledge_base/` (catalogue + `kb-validate.mjs` 46 tests, red-teamé 18 findings/2 invariants fermés) +
jeu consommateur `games/kb_tactics/` assemblé par import réel, oracle 4/4 · mutation 50/51 · verdict signé
AUTHENTIQUE. Détail archivé : `journal/context-archive-2026-07-12.md`.
Avant : 2026-07-12 (nuit/soir) — fix disclosure F-T2 (garde Windows morte, CORRIGÉE) · Phase A §4 E2
VIABLE (feasibility) · P2 production proposé (RIEN implémenté) · **s10d E1 EXÉCUTÉE SUCCESS** (hash
canonique ×2 identique, gels 5/5) → incrément P1-1 COMPLET. Détail archivé (même fichier).
Avant : 2026-07-12 gouvernance (revue contradictions) · 2026-07-11 **Forge 2.0 P0 GELÉ + P1 mécanique
CLOSED/FALSIFIÉE puis P1.1 EXÉCUTÉE SUCCESS (4/4 défauts, 0 FP)** — décisions Pierre : P1 OUVERTE, sondes
→ fixtures permanentes, cycle expérimental nommé (hypothèse→contrat→red-team→ratification→expérience→
conclusion limitée) = l'acquis méthode réutilisé pour WORKFLOW_LAB_PROTOCOL.md. Détail complet (P0.1-P0.4,
gates, disclosures) : `journal/context-archive-2026-07-12.md`.
Avant : 2026-07-09→11 — /forge usine contractuelle MERGÉE master (13 contrats s0→s12, ADR-002) + niveau
production (e2e guard, gel traçabilité, gate mutation). Détail : git `a293723`→`87e9ec4` +
[[forge_contract_dispatcher]]. Historique antérieur : `journal/context-archive-2026-07-05/06/08.md`.

## ⚠️ DÉCISION MAJEURE — PIVOT PRODUIT (ratifié Pierre, 2026-07-05/06)
> **Toute session future qui propose du travail Rocky ou de l'outillage builder DOIT renvoyer ici.**
- **Rocky : GEL.** Aucune session d'optimisation moteur sans HumanGate explicite.
- **Factory réorientée** : jeux de cartes FR — **Belote = produit 1**, **Tarot = produit 2** (moteur de plis commun).
- Actions pendantes : re-triage ledger (IMP Rocky → FROZEN, revue HumanGate avant écriture) ; spec produit Belote
  (IA à niveaux, défi-par-seed, PWA mobile-first) ; étage 2 = table WebRTC, multi public gated.

## Impasses / doctrine (portées)
- LEDGER canonique = `lab/chains/IMPROVEMENT_LEDGER.yaml` ; écrire via `kaizen_loop.py`.
  `settings.json` : `Write/Edit(lab/chains/**)` en **ask** (mitigation IMP-247) — attendu, pas un bug.
- **Forge** : `is_clean_pass()` = seul prédicat de passage propre ; `software_verdict` seul ≠ signal de promotion ;
  survivant mutation trié = objection, jamais READY propre. Recette d'audit : `grep -rn 'software_verdict.*==.*OK'`.
- `train.py` gelé (Rocky = GEL). Serveur builder : `node demo-server.ts` :3000.
- Une variable à la fois · fondations avant features · **aucun commit/push sans go explicite Pierre**.
