# DECISION_FORMAT_V2_RATIFIE — format `observer.decision.v2`

> Genere le 2026-08-03 par `scripts/observer/evidence.py` (Evidence Engine).
> Statut : **RATIFIÉ Pierre 2026-08-02** — adoption MANUELLE : le gabarit
> ci-dessous est pret a coller dans le decision-log ; aucun skill ni store
> canonique n'est modifie par ce module.

## Invariant ratifie (verbatim)

> toute nouvelle décision porte `decision / expected_result / evidence /
> observed_result / status / lesson_candidate`. « Le passé reste une mesure
> historique du manque. Le futur doit produire la boucle. » Aucune
> reconstruction des 39/49.

## Constat (moisson au jour de generation)

65 decision(s) moissonnee(s) et normalisee(s), dont 44 SANS trace de resultat. Le format v1 legacy du decision-log (date · decision · contexte · alternatives · criteres de revision) ne porte aucun champ resultat : une decision sans resultat est invisible par construction. Le passe reste cette mesure historique du manque — le futur doit produire la boucle.

## Le format ratifie

```
DECISION { decision / expected_result / evidence /
           observed_result / status / lesson_candidate }
```

| Champ | Rempli quand | Role |
|---|---|---|
| `decision` | a la decision | ce qui est decide, verbatim |
| `expected_result` | **a la decision — OBLIGATOIRE** | effet observable, falsifiable |
| `evidence` | avec le resultat observe | chemin / verdict signe / mesure |
| `observed_result` | **plus tard** | ce qui s'est reellement passe |
| `status` | vit avec la decision | EN_ATTENTE_RESULTAT \| RESULTAT_CONFORME \| RESULTAT_CONTRAIRE \| ABANDONNEE |
| `lesson_candidate` | si RESULTAT_CONTRAIRE | enonce de lecon propose — creation humaine |

## Les regles

* `expected_result` est obligatoire **À la decision** — une decision qui
  ne dit pas ce qu'elle attend n'est pas falsifiable.
* `status` est un vocabulaire FERME (4 valeurs). Tant que la decision est
  EN_ATTENTE_RESULTAT, elle apparait dans « sans resultat » de la vue
  s10_evidence, et passe 7 jours dans le compteur
  « v2 EN_ATTENTE_RESULTAT » : une decision sans resultat doit devenir
  VISIBLE, pas disparaitre.
* `status: RESULTAT_CONTRAIRE` fait sortir la decision dans
  `lesson_candidates_suggerees` de la vue — SIGNALEMENT seul, la creation
  de la lecon reste humaine.
* Les decisions historiques restent v1 legacy telles quelles — aucune
  reconstruction ; le format s'applique aux NOUVELLES decisions uniquement.
* Les anciens marqueurs prose du brouillon v2 (« Résultat attendu »,
  « Résultat observé », « Preuve », « Leçon ») restent des alias de
  LECTURE pour la detection — les noms canoniques sont les 6 ci-dessus.

## Gabarit (retourne par `evidence.decision_template()`) — pret a coller

```markdown
## AAAA-MM-JJ — <titre court de la decision>

**Décision** :          <!-- decision -- ce qui est decide, verbatim -->
**Résultat attendu** :  <!-- expected_result -- OBLIGATOIRE A LA DECISION : effet observable, falsifiable -->
**Preuve** :            <!-- evidence -- chemin / verdict signe / mesure qui attestera le resultat -->
**Résultat observé** :  <!-- observed_result -- rempli PLUS TARD, quand le reel a parle -->
**Statut** :            <!-- status -- EN_ATTENTE_RESULTAT | RESULTAT_CONFORME | RESULTAT_CONTRAIRE | ABANDONNEE -->
**Leçon candidate** :   <!-- lesson_candidate -- enonce propose si RESULTAT_CONTRAIRE ; 'aucune' si assume -->
```

## Adoption

Adoption MANUELLE : coller le gabarit dans
`studio_brain/decisions/decision-log.md` a chaque nouvelle decision.
La moisson d'Evidence detecte automatiquement toute entree portant les
marqueurs (« Résultat attendu : », « Résultat observé : », « Preuve : »,
« Statut : », « Leçon candidate : ») et la normalise en
`observer.decision.v2` — l'adoption est mesurable sans autre changement
de code.
