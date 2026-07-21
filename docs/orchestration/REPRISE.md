# REPRISE — TCS Orchestration gouvernee (etat + reste a faire)
_MAJ 2026-06-29 — handoff Cowork → HumanGate / Claude Code_

## 0. Bati cette session (verifie)
- **Cockpit UX** (autopilot 7331, inline) : home (ELO+sparkline, Director, Gates, Factory, Timeline, graphe memoire, jeu iframe), **panel Council** (3 colonnes Claude/Qwen/Gemini + desaccords rouges + etat vide), auto-refresh, Cockpit = vue par defaut, menu dedoublonne. 3 bugs corriges (idea max_id, gate governor circulaire, parseur HumanGate yaml).
- **Kernel + chapitre** : 192 HMAC, 193 lock TTL, 194 single-writer (partiel), 195 ECG, 196 event log, 203 ECG-enforcing, 197 Agent Factory, 199 SOA, 198 Council, 200 WRA, 202 error_journal, 201 semantic_oracle. Tests verts en natif (.venv312).

## 1. EN ATTENTE DE TA GATE (zero code)
- Ratifier + close + push : **IMP-195, 196, 198, 201, 203** (AUDIT, oracle vert, implementes).
- Committer + push le **cockpit final** (panel Council + defaut + graphe poli) — non committe dans le working tree.
- **Branch protection GitHub** (manuel) + decision **IMP-204 Graphify**.

## 2. RESTE A IMPLEMENTER (code)
### Haute priorite — integrite du kernel (foundation avant le reste)
1. **Single-writer COMPLET** (suivi 194) : router `lab/chains/golden_collector.py` + `lab/chains/ledger_patch_*.py` via `governance/ledger_writer.py` + **grep-guard CI**. Sinon le ledger reste corruptible.
2. **CI reelle** : `canonical-ci.yml` retire le filtre `paths: docs/**`, ajoute jobs **cargo test + pytest obligatoires**. Aujourd'hui la CI ne teste rien sur le vrai code.
3. **.github/ dans le hook FORBIDDEN** (gate Pierre).

### Moyenne priorite — le payoff du chapitre
4. **Brancher le Council en reel** dans le pipeline idee->IMP (remplace redteam/fusion ; injecte le brief **WRA** avant PLAN). `scripts/council.py` existe mais n'est pas cable en automation.
5. **Gemini live** : valider la politique `genericize()` (privacy, jamais d'interne vers Gemini) PUIS **smoke-test live** (claude_proxy 8765 + LM Studio 1234 + Gemini). Tout est en mock aujourd'hui.
6. **Fiabiliser claude_proxy 8765** (FAIL au boot) ou confirmer le fallback Qwen en reel.
7. **error_journal -> boucle** : auto-proposer un IMP sur vraie erreur (cablage live).

### Basse priorite
8. semantic_oracle residus : champ `category` au ledger (fiabilise requires_humangate) ; binding preuve HMAC.
9. **Graphify/Graphiti** (204) : decision Pierre (memoire-graphe). NB : `graphifyy` PyPI = provenance non verifiee.
10. Confirmer le panel Council live quand un vrai council tourne (etat vide verifie).

## 3. RECOMMANDATIONS (ordre)
1. **Nettoyer d'abord** : ratifier/pousser la pile AUDIT + committer le cockpit -> git propre.
2. **Single-writer complet + CI reelle** -> le kernel devient vraiment fiable (notre regle : foundation avant intelligence).
3. **Payoff** : Council live + genericize + smoke.
4. error_journal loop + semantic category.
5. Plus tard : Graphiti. **Rappel strategique : le revenu = le jeu (snake_genesis), l'orchestration est de l'infra.**

## 4. CONTRAINTES (ne jamais oublier)
- Jamais git add -A ; commit scope strict ; close via kaizen_loop.py ; AUDIT = gate Pierre ; push = gate Pierre.
- ECG = seule autorite de mutation ; oracle non-LLM seul juge ; NO_CLAIM_ALLOWED.
- Edition autopilot.py : ecriture atomique + fsync + readback-verify (le montage tronque sinon).
- Une seule main sur autopilot.py a la fois (pas Cowork + Claude Code en parallele).
