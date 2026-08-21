# Contexte courant TCS
*(Handoff. Historique : `journal/context-archive-2026-08-17-chaine-preuve-gpu.md` →
`journal/context-archive-2026-08-15-revue-forge-lignees.md`.)*

## ⚠️ LE DÉPÔT EST SUR LA BRANCHE `publish` — À LIRE EN PREMIER
La session s'est terminée **hors de `master`**. Pour reprendre le travail normal :

```bash
git checkout master     # bloqué par le garde git : sentinelle humaine requise
```

Sur `publish`, **86 artefacts de run apparaissent comme non suivis** (ils sont exclus de
cette branche, présents sur disque). Ils redeviennent suivis au retour sur `master`.
C'est normal, ce n'est pas une perte.

## Session 2026-08-19/20 — publication, puis reparation du snapshot
```
publish local    9a2c485   3 commits orphelins — POUSSE (origin/publish : 9a2c485)
origin/master    bcde5cb   INCHANGE — `master` ne sera PAS pousse (voir plus bas)
master local     c299c76   144 commits, non pousses, archive intacte
```

### Décision du 2026-08-20 — les artefacts porteurs restent internes
**Ratifiée Pierre** (`d9b8a5b`, decision-log). Les 28 fichiers de `lab/forge_runs/` porteurs
d'un chemin de poste sont **exclus du corpus public**, intacts en local.

> `nécessaire pour la preuve` ≠ `autorisé à être publié`

Ce qui l'a tranché : les rédiger est **impossible** (invalide le reçu signé, `verify_receipt`
`True`→`False`), et les publier n'apporterait **rien** — les signatures sont **HMAC, donc
symétriques** : **0 vérifiable par un tiers**, sur `publish` comme sur `master`. Un artefact
public vérifiable exigerait une primitive **asymétrique**, pas une rédaction.
**`master` ne sera pas publié** : son historique porte encore les occurrences, et nettoyer le
sommet ne nettoie pas 135 commits. La publication vit autour de `publish`.

### Anonymisation Observer — capacité branchée puis appliquée
`anonymize_session_paths.py` existait depuis le 2026-08-18 avec **zéro appelant**.
- `d163d73` étendue (du champ `session_file` au préfixe) et **branchée** sur les 3 écritures
  du producteur ; câblage prouvé par **espions à sentinelle**, falsifié (câblage retiré → rouge).
- `3df13ef` couvre aussi le répertoire temporaire et la colonne propriétaire d'un `ls -l`.
- `9e085bf` appliquée aux 21 artefacts : **24 307 → 108** occurrences, diff **symétrique**
  (23 871 +/−), **0 ligne signée modifiée** sur 464.
- `172e622` + `ae09bb4` : plus aucun test ne nomme le compte du poste.
Exposition nouvelle du sommet : **50 → 34** fichiers (28 `forge_runs` + 5 plancher probant +
1 faux positif).

### Le chantier de publication — archivé
Récit complet (ce qui a été publié et pourquoi, corrections de fond, éléments conservés,
le piège central rencontré **quatre fois**, rapatriement `publish` → `master`) :
`journal/context-archive-2026-08-20-publication-orpheline.md`.

### Ouvert, non décidé
- `publish` comme branche **par défaut** GitHub → décision manuelle, non faite.
- Publication de `master` → **BLOCKED, et la mesure est faite** : 66 fichiers ont porté un
  chemin de poste dans son historique, dont **3 qui ne vivent plus QUE là**. Aucun `rm` ne
  les atteint ; seule une réécriture, exclue par Pierre. Au sommet, **52 `Studio-Dev`
  subsistent — 49 dans des artefacts que la publication a EXCLUS au lieu de rédiger.**
  Le rapatriement rend le **code** du canon correct, **pas son arbre publiable**.
- **Chemin Blender : 2 autorités unifiées sur 5.** Les 3 autres sont **rédigées**
  (aucune fuite) mais portent toujours le fait en double. Non traité, pas oublié.
- ~~2 rouges Node périmés~~ → **FERMÉS** (`1ce25f9`) : un test de **pont** ancré sur l'état
  du **parc**. **Suite node : 821 / 821. Suite forge python : 1910 / 1911, 0 rouge.**
- **LOT EVIDENCE — FERMÉ** (Pierre, 2026-08-20). Ce qui est corrigé l'est ; ce qui reste
  est **mesuré, documenté, et accepté tel quel**.

  | | |
  |---|---|
  | naissance du sceau | **CORRIGÉ** `4bbd052` |
  | résolution du chemin | **CORRIGÉ** `883b016` |
  | chemin stocké | **CORRIGÉ** `0650b21` |
  | logs non versionnés | **TRAITÉ PAR CONTRAT** `7206a68` |
  | 15 archives | **NE PAS CORRIGER** — preuve retrouvée, sceau concordant sur disque |
  | 1 orpheline | **DOCUMENTÉE** — `.claude/worktrees/…`, arbre étranger |
  | 90 sceaux historiques | **IRRÉPARABLES / ACCEPTÉS** |
  | 30 absences | **AUDIT TERMINÉ** |

  L'audit a montré que « 30 absences » n'était ni 30 ni des pertes : **18 fichiers**
  distincts (le reste était du double comptage), dont **15 archivés** par des renommages
  purs. **Zéro perte réelle.** Un résolveur d'adresse a été écrit puis **retiré du dépôt** :
  il améliore la récupération sur *ce* poste, il ne restaure pas la vérifiabilité git — donc
  il n'est pas nécessaire pour que le système dise vrai. Code conservé hors dépôt.

- **DOCTRINE DE SORTIE — ratifiée Pierre 2026-08-20, vaut pour TOUS les lots :**

  > Un défaut adjacent découvert pendant une correction **ne devient pas automatiquement le
  > prochain lot.**

  Il faut au moins une de ces conditions : **casse le runtime · casse un invariant · produit
  une fausse preuve · empêche une capacité contractuellement requise · priorisé
  explicitement.** Sinon : `MESURÉ → DOCUMENTÉ → PASSIF → FIN DU LOT`.

  Ce qui manquait n'était pas la rigueur — c'était le **critère de sortie**. Sans lui, une
  Forge parfaitement fonctionnelle passe son existence à améliorer ses propres audits au lieu
  de produire.
- Clé HMAC par défaut → vrai sujet **sécurité**, hors hygiène de publication.
- Backlog `§18` du Master Schéma V2 : P0 détectabilité, P1 étage ② + un run `full` pour
  observer enfin la lignée causale, P2 `reuse_ratio` ×12 et `agent_factory` sans appelant.
