# HumanGate — Run A card_engine : ACCEPTÉ

- decision_id: HUMANGATE-CARD_ENGINE-RUN-A
- run_id: card_engine-20260720a
- date: 2026-07-20
- actor: Pierre (HumanGate)
- decision: **ACCEPT / MERGE** — verbatim : « le deuxième jeu construit par la Forge est-il assez bon pour qu'on l'accepte officiellement ? → Je dis oui, on accepte — les preuves sont vraies, la réserve n'annule rien. »
- verdict_source: lab/forge_runs/card_engine/verdict.json — OK / HUMANGATE_READY_WITH_OBJECTION, verify_run overall TRUE (HMAC + évidence + preuve mutation + git)
- objections_reconnues (n'annulent pas la décision) : red-team plan/code en fallback claude-blind (LM Studio down) · 11 survivants mutation triés justifiés · goldens trickWinner=2 (couverture par tests) · run orchestré manuellement (receipts complets)
- portée : games/card_engine/ (CardEngine V0 + BeloteRules par parité + harnais) entre au patrimoine ; **débloque le Run B TarotRules (profil increment)**
- post_action_verification: inclusion au lot de commit global (gate 8, conditionnée aux dispositions pending_review)
- claim_verdict: NO_CLAIM_ALLOWED
