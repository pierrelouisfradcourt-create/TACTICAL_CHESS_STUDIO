# Rocky audit checklist — pré-checklist obligatoire avant tout audit moteur (IMP-228)

oracle_type: structure | claim_verdict: NO_CLAIM_ALLOWED

## Règle d'or (anti-hypothèse-fausse)

> **Aucune conclusion sur Rocky sans decision trace + oracle daté.**
> On a brûlé 2 hypothèses fausses successives ce soir (2026-06-30) faute de trace :
> le diagnostic doit PRÉCÉDER la conclusion, jamais l'inverse. Si la trace de
> décision n'est pas disponible, l'audit s'arrête ici — on ne devine pas.

## Checklist (à cocher dans l'ordre, avant toute analyse)

- [ ] **grep `root_player`** → lister TOUS les sites restants `fichier:ligne`.
      Le coup racine peut diverger de la recherche interne (vécu IMP-230 :
      coup racine = `search_root_in_place`, boucle séparée du negamax interne →
      un fix interne ne touche PAS forcément le coup joué). Documenter chaque site.
      Étendre le grep aux alias : `root`, `search_root`, `search_root_in_place`.

- [ ] **git log des fixes déjà appliqués** sur la zone auditée
      (`git log --oneline -- src/chess/search.rs src/chess/move_features.rs`).
      Objectif : ne pas re-débuguer un truc déjà corrigé. Noter le dernier commit
      touchant la zone + sa date.

- [ ] **oracle ELO fiable** : date du dernier run + delta mesuré + seuil.
      Seuil attendu : **hybrid − heuristic ≥ +20**. En dessous = « neural pas
      encore utile », PAS une preuve d'amélioration.
      ⚠ Oracle BRUITÉ vécu ce soir : hybrid=1211.53 vs heuristic=1201.58,
      delta=+10 → verdict FAIL (sous le seuil +20). Un delta dans le bruit ne
      conclut rien. Exiger la date du run, pas juste le chiffre.

- [ ] **benchmark depuis le dernier fix** : régression ? Comparer au bench
      d'avant le dernier commit de la zone. Pas de bench daté → pas de conclusion
      de perf.

- [ ] **draw rate mesuré** : valeur + source + date. (Mémoire : `pool_sf`
      draw_rate ~94 % = signal connu, pas une découverte.)

- [ ] **decision trace DISPONIBLE** avant toute conclusion : la trace de la
      décision du moteur sur la position litigieuse existe et est lisible.
      Si absente → STOP (cf. règle d'or). C'est le verrou anti-hypothèse-fausse.

## Pièges connus (mémoire projet — ne pas re-découvrir)

- **Lichess oracle stale** : les chiffres L2/L3 ~4.5 % sont PÉRIMÉS/faux (bug
  harnais, schéma PuzzleCase), PAS une faiblesse moteur. Fixer Lichess ne
  débloque PAS l'autoloop (verrou ELO indépendant). Ne pas conclure faiblesse
  moteur à partir de Lichess.
- **Fix partiel** : un fix peut ne marcher que partiellement (IMP-230 anti-shuffle
  -15cp negamax interne BLOCKED car le coup racine est dans une boucle séparée).
  Vérifier que le fix touche bien le chemin du coup JOUÉ, pas juste l'éval interne.

## Sortie d'audit

Si une case « oracle ELO daté » ou « decision trace disponible » n'est pas
cochable → l'audit produit `BLOCKED`, pas une conclusion. Reporter ce qui manque.

- software_verdict: {{OK|FAIL|BLOCKED}}
- evidence_verdict: MECHANICAL_VALIDATION_ONLY
- claim_verdict: NO_CLAIM_ALLOWED
