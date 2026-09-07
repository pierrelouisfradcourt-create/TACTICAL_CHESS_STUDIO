# Revue finale de session — préparation Forge V3 (comité d'architecture)

*Date : 2026-08-07 · Source : session Fable 5, synthèse de : post-mortem Pac-Man, audit Observer,
lots A/B/C exécutés et vérifiés, joute MCTS_WORLDSCAN_QWEN, replay QWEN_AUDIT_REPLAY.*
*claim_verdict: NO_CLAIM_ALLOWED — tout item marqué FAIT/MESURE a été ré-exécuté dans la session.*

## A. Audit Qwen (replay, mesuré)
6 générations temp 0, corpus identique ~6k tokens/prompt, 39 981 tokens totaux, scoring contre F1-F15.
Rappel 4/15 brut, 4/9 sur faits récupérables (6 faits structurellement hors corpus). **0 hallucination**
sous JSON strict. **Cécité à la prose** : F1-F4 en gras ratés 6/6. **Inversion d'annotation** :
`passed=false ATTENDU` relu comme défaut, 2/2. **0 information originale** (aucun NOUVEAU-VÉRIFIÉ sur 44
items). Stabilité thématique 100 %, textuelle non (temp 0 ≠ déterminisme). Meilleur accord : F9 (son
propre échec red-team), cité fichier+run_id, seul cas de stabilité parfaite.

## B. Croisement Claude ↔ Qwen
- ACCORD (confiance forte) : F5 partiel, F6, F7, F9.
- DÉSACCORD tranché par mesure : contrôle positif de l'oracle archi — l'annotation du verdict prouve
  que Claude a raison (false attendu = l'oracle voit) ; défaut Qwen d'interprétation sémantique.
- UNIQUE Claude : F1-F4, F8, F10-F15 (le harnais agentique est la condition d'accès, pas le modèle seul).
- UNIQUE Qwen : néant.
Conclusion : Qwen n'est pas un auditeur ; c'est un extracteur fiable (0 hallucination) sur structuré.

## C. Méta-analyse (condensé)
1. Erreur répétée : produire sans lecteur (root_causes, platform_correction, sorties Observer, chaîne V2).
2. Cause racine récurrente : déclaration jamais confrontée à l'exécution (modèle, spawn, chiffres v3-v6, SIGNED).
3. Valeur max : oracles déterministes + gate mutation + télémétrie + Observer (3 détections uniques).
4. Coût/valeur faible : red-team qwen actuel, chaîne MCTS V2 non branchée, sorties Observer sans lecteur.
5. Boucles non fermées : lesson→mutation (pont livré NON ratifié), drift→lesson, verdict par lot.
6. À ériger en invariants : « toute preuve a un lecteur déclaré » · « executed ⇒ authorized » ·
   « paramètre déclaré ⇒ divergence mesurable » · « reçu signé ⇒ ts réel » · « SIGNED = vérifié, pas prétendu ».
7. Trop dépendant d'un gros modèle : s9-build (38 % du coût), s3-decompo (juge non discriminant).
8. Délégation Qwen : maintenant = triage structuré à juge mécanique ; après oracle durci = s2, s5 ; jamais = audit, annotation sémantique, s4.
9. Humain récurrent : playtest (15/15 défauts) → en partie oracle-isable (runtime_truth, divergence, capture GPU), reste = PROOF_KINDS human.
10. LA faiblesse : **la Forge ne consomme pas ce qu'elle produit** — l'apprentissage reste hors machine.

## D-K. Voir rapport complet livré en session (message final)
Top 10 ROI, MCTS classés, plans de désescalade et d'autonomie, 20 actions, 5 décisions humaines,
5 paris, 5 risques — repris dans le message de session ; décisions en attente listées dans
`00_CURRENT_CONTEXT.md` §HumanGate.
