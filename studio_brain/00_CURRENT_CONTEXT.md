# Contexte courant TCS
Dernière session : 2026-07-13 — **WFL-01 (workflow lab breakout) : variante COMPLÉTÉE + oracle figé
RÉÉCRIT (go Pierre explicite) → VERT symétriquement sur les 2 branches (NON commité).**
`variant/render.mjs` + `variant/input.mjs` écrits en isolation d'agent (jamais lu `control/render.mjs`/
`input.mjs` — seulement le contrat + `variant/game.mjs`/`level.mjs` déjà livrés). L'oracle `shared/`
trouvé au départ était inexécutable sur les 2 branches (API halluciné : `applyInput/view/levelIndex/
brick.health/status ACTIVE-WON`, zéro historique git pour dater la divergence). **Go Pierre : « corrige
l'arbitre pour qu'il colle aux deux branches »** → les 3 fichiers (`solvability.mjs`, `logic.test.mjs`,
`properties.test.mjs`) réécrits contre le contrat RÉEL commun (lu dans le code : `step(dtMs,input)`,
`status` normalisé win/won-lose/lost, `brick.score??points`, `level`). 2 bugs réels trouvés et corrigés
EN écrivant (pas après lecture de résultat) : faux positif de scan (commentaire JSDoc citant
`Math.random()` pris pour du code) + tunnel de collision côté variant (échelle dt px/ms vs px/s, pas
la même conversion que control). **Résultat final, sha256 vérifié identique (shared=control=variant) :
25/25 tests + solvabilité bot PASS sur LES DEUX branches**, symétriquement — aucune branche
disqualifiée par le panel. N=1, portée limitée (règle 4 : N≥2 avant conclusion ferme) ; le panel §3
n'a jamais été figé AVANT le 1er rollout (déviation actée pour CETTE expérience, pas un précédent).
Détail complet + tableau des différences control/variant : `lab/workflow_lab/WFL-01/results.md`.
**Rien commité.**
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
