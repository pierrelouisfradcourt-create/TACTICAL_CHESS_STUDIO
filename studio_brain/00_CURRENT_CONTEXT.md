# Contexte courant TCS
*(Handoff. Dernière session : 2026-09-16 → 09-23 — **Qui va où** : la sonde Kitten devient un jeu
de sauvetage + portage Godot. Précédentes : 09-06 revue mémoire · 09-03 refresh CLAUDE.md ·
09-01 Shadow Audit CLOS. Archive intégrale : `journal/context-archive-2026-09-23-avant-qui-va-ou.md`.
Rédigé le 2026-09-23, source : session cloud `session_01UEWbKYDSv8tRi67YN1cEbw`.)*

## Session 2026-09-16 → 23 — Qui va où
- **Branche** `claude/artefact-repositionnement-0uslek`, commit `722c1ac` poussé, **NON mergé**.
- **Sonde artifact V8** : https://claude.ai/artifact/5CLho8Pgf7DAst2NejAi4E. Corrigé par exécution
  (Playwright) : clics volés par un chaton posé sur une zone nichée ; chaton hors cadre
  (`transform-origin` % sans `transform-box:fill-box` en SVG, mesuré +62 px → −38 px).
- **Directions données par Pierre en conversation — NON loguées au decision-log, à passer par /gate** :
  (1) fil rouge = sauver ; UN prisonnier par tableau, visible dès la première image, les autres
  viennent le sortir · (2) « l'obstacle annonce qui le résout » · (3) chats spécialisés par un outil
  visible (grandes griffes, costaud, pompier, longue queue-corde).
- **Portage `games/qui_va_ou/`** : niveaux en JSON (plus de coordonnées en code), 7 chats/7 verbes,
  5 niveaux (3 portés + grange, cave), oracle `outils/valider_niveaux.py` (soluble, zones sans
  recouvrement, aucun blocage muet) **mutation-testé** ; `core/moteur.gd` pur ; tests headless ;
  UI placeholder. **GDScript JAMAIS EXÉCUTÉ** (Godot absent du conteneur) = AUTO_ATTESTED.
- **Kitten Clicker** : la « référence produit = sonde V5 » est supplantée de fait par V8 — à ratifier.
  `games/kitten_clicker/` absent reste une question distincte (suppression ou perte), non résolue.
- Bilan « jeu vendable Play Store » rendu en conversation : blocage n°1 = volume de contenu
  (d'où le format de niveau) ; preuve manquante n°1 = aucun test avec des enfants ; tout
  l'enseignement est en texte français écrit, illisible pour un pré-lecteur.

## Constats de gates (NOUVEAUX, graves, non traités — périmètre HumanGate)
1. **Clone cloud : `core.hooksPath` non défini** → le pre-commit ne tourne pas. `722c1ac` est
   passé non gaté (sans `--no-verify`). Rejoué après coup : chemins interdits OK, scope OK,
   `node --test` **ROUGE** → il aurait été refusé.
2. **`node --test scripts/forge` : 1 rouge pré-existant sur `master` en clone propre** —
   `search_usage.test.mjs:218` « kb_tactics est MEASURED… », `consumed_refs=[]`. Prouvé identique
   sur `master` 2828197 sans mon commit. Dépend probablement d'un état local non suivi (passait
   chez Pierre le 08-28). Activer les hooks dans le cloud bloquerait TOUT commit tant qu'il reste rouge.
3. **`.claude/hooks/validate-commit-msg`** : nom non standard → git ne l'exécute jamais, même en local.
4. Conteneur cloud : ni Godot, ni Blender, ni ffmpeg, ni GPU, ni `.venv312` (T0 pytest injouable).

## État Forge (au 2026-09-01, inchangé — détail dans l'archive)
- Shadow Audit V1→V6 CLOS, aucun patch ; résidu `TRANSITION_INTEGRITY` NOT_FOUND. Producteur =
  son propre juge (`reference_guard` absent de verdict/verify_run/gate). Goulot = ratification
  humaine (18 validated / 326 leçons). P0 « débrider l'Architecte » RETIRÉ (E1b).
- Évidence non suivie conservée (décision Pierre) : `games/p1_beta_E1/`, `lab/forge_runs/p1_beta_E1/`,
  `lab/forge_briefs/p1_beta_E1/`. Un `git clean` les emporterait.
- Leviers ouverts : pre-mortem par étape · ratification en lot (308) · 5 contrôleurs dormants ·
  champ capacitaire au Brief · recalibrage `reference_guard` · DRIFT non propagé au verdict.

## Expérience Libre vs Dirigé (L/D)
- Aucune paire valide. L2 INVALIDE (finding n°7), D2 seul bras valide ; finding n°8 (tick non gardé).
- Règle Pierre 09-01 : un verdict de chaîne ne promeut jamais seul une expérience en valide.
- Protocole RUN 2 V1 + grammaire D v2 RATIFIÉS. Toute inférence L/D exige ≥ 2 paires valides.

## Régime de tests
- **T0** `pytest scripts/forge/tests/ -m "not gpu_window"` ≈ 5 min 42 (2 332 verts, poste Pierre).
- **T1** `test_observer_integration_real.py` seul à lancer le vrai Observer · **T-GPU** sur GO seul.
- Pre-commit : node --test bloquant · commit_scope_guard · selfaudit — **inopérant en clone cloud**.
- `games/qui_va_ou` : `python games/qui_va_ou/outils/valider_niveaux.py` (vert) ·
  `godot --headless --path games/qui_va_ou --script res://tests/run_tests.gd` (jamais lancé).

## Verrous actifs (Pierre)
- World Scan hors périmètre · R8 BLOQUÉ · profils review/increment PASSIVE.
- Gels decision-log 08-28 : île V2 · panel Prisme · pile Codex/GPT = LEGACY.
- 3 bannières `00_STUDIO_CONTROL` posées, non commitées — décision en attente.
- C.6 V1.1 PROPOSED, 5 décisions HumanGate · séance prête : `lab/reports/ratification_session_20260828.md`.
- `decisions/PROPOSED_2026-09-06_ratifications.md` : 5 gestes 09-01→09-03 sans entrée au log. Rien logué.

## Prochaine étape
1. **Pierre, poste local** : lancer les tests headless Godot, remonter les erreurs de compilation.
2. **Test avec 5 enfants × 20 min** sur le placeholder — c'est la preuve qui manque à tout le reste.
3. HumanGate : texte vs voix off · ratifier les 3 directions design via /gate · merger ou non la branche.
4. HumanGate : trancher les 4 constats de gates ci-dessus (cloud, test kb_tactics, validate-commit-msg).
5. Proposé, non commencé : générateur de niveaux + métrique de difficulté (déterministe, sur l'oracle).
6. Reportés : gestes 2 et 3 du refresh 09-03 · décisions C.6 · pre-mortem par étape.

## Impasses / pièges appris
- SVG + CSS : `transform-origin` en % sans `transform-box:fill-box` s'ancre sur le viewBox entier.
- Capture Playwright : figer les animations AVANT la création des éléments bloque les fondus
  (`.surgit`) à opacité 0 → faux diagnostic « jeu cassé ». Figer juste avant le cliché.
- « artefact » dans une demande de Pierre = artifact claude.ai, pas un fichier du dépôt ; le nom
  de branche `artefact-repositionnement` a induit en erreur.
- Gates historiques : e2e `DirAccess`, solvabilité argv, mutation legacy · `check_wiremap_contract`
  non consommé · `asset_dispatch` non câblé · rouge `p3_alpha` hors périmètre · working tree sale
  pré-existant sur le poste de Pierre, triage non fait.
