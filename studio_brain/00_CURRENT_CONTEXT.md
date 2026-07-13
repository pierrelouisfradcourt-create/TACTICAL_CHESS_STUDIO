# Contexte courant TCS
Dernière session : 2026-07-13 — **WFL-01 (workflow lab breakout) : COMMITÉ (`ccb46a6`) + rejoué en
run2 (N=2, règle protocole) → VERT stable sur 2 builds indépendants, oracle réutilisé SANS retouche.**
Variante run1 complétée (`variant/render.mjs`+`input.mjs`, isolation d'agent respectée). Oracle `shared/`
trouvé inexécutable au départ (API halluciné : `applyInput/view/levelIndex/brick.health`, zéro
historique git) → **go Pierre explicite (« corrige l'arbitre pour qu'il colle aux deux branches »)** →
réécrit contre le contrat RÉEL commun (`step(dtMs,input)`, status normalisé win/won-lose/lost,
`brick.score??points`) ; 2 bugs trouvés et corrigés EN écrivant (faux positif scan JSDoc, tunnel de
collision variant dû à l'échelle dt px/ms vs px/s). run1 : 25/25 tests + solvabilité PASS sur les 2
branches, sha256 vérifié. **Commité + poussé pas encore — commit local seul.** Puis **run2** (10
fichiers réécrits de zéro dans `run2/`, aucune copie de run1, isolation d'agent maintenue côté
variante) : **même résultat, 25/25 + solvabilité PASS sur les 2 branches, ET l'oracle de run1 a été
réutilisé TEL QUEL sans aucune modification** — signal que la réécriture testait le contrat, pas les
détails d'un build précis. Portée toujours limitée : aucun axe coût/robustesse-processus/visuel mesuré
(hors scope de cet oracle). Détail : `lab/workflow_lab/WFL-01/results.md` (run1) +
`results2.md` (run2). **Prochaine étape non tranchée** (proposé à Pierre, pas de réponse encore) :
instrumenter un axe coût/robustesse avant toute promotion, OU passer à `search.mjs` (prochaine
expérience candidate documentée). **run2 pas encore commité.**
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
