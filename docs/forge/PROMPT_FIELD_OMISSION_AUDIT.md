# PROMPT_FIELD_OMISSION — audit avant nouvelle branche

*2026-08-04. Genere depuis les artefacts versionnes de M-ws1/M-ws2/M-ws3.*

## Ce que la mesure dit

| mutation | completion | discriminance | oracle |
|---|---|---|---|
| M-ws1 | 1,0 | 1 | OK |
| M-ws2 | 0,5 | 0 | FAIL |
| M-ws3 | 1,0 | 2 | OK |

Les deux mutations completes portent de la discriminance ; la seule sans discriminance
est incomplete. **Aucune ne satisfait les deux conditions a la fois.**

## Champs qui declenchent la copie inter-jeux

- `games[*].loops.endgame`
- `games[*].loops.hour_5`
- `games[*].retention_answer`

Ce sont des champs ou **deux jeux du meme genre se ressemblent legitimement** : la fin de
partie et les conditions d objectif d un idle sont proches d un jeu a l autre. Le modele
ne triche pas : il decrit deux choses semblables avec les memes mots.

## Hypotheses testables (H1+H2+H3, combinees dans M-ws4)

- **H1 — separation stricte des instances** : traiter chaque jeu comme une tache isolee,
  interdire de reutiliser une formulation deja employee pour l autre.
- **H2 — aucun exemple copiable** : aucune phrase reutilisable dans le prompt ; les
  exemples sont des placeholders marques fictifs.
- **H3 — verification interne avant emission** : demander au modele de relire ses deux jeux
  cote a cote et de reformuler tout champ identique. **Instruction, pas oracle.**

## Variables interdites

- la contrainte `discriminance_count <= 0` (ce serait regler le contrat sur la reponse voulue)
- la metrique `field_completion_without_regression`
- les oracles, le schema, la spec gelee (`dataset_sha256` doit rester d1da5019951363e1)
