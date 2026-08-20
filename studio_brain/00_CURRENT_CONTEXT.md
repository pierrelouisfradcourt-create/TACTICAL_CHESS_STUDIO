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
master local     0650b21   142 commits, non pousses, archive intacte
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
- **`evidence_sha256` — DEUX états distincts, à ne jamais confondre :**
  - **naissance des sceaux : CORRIGÉE** (`4bbd052`). Cause : le producteur écrivait du CRLF,
    `.gitattributes` (`*.json text eol=lf`) renormalisait au commit, et le sceau porte les
    **octets**. 4 sites corrigés, falsifiés des deux côtés, 403 tests verts. Une évidence
    naît désormais avec un sceau qui survit à son commit.
  - **90 sceaux historiques : IRRÉPARABLES, et NON MASQUÉS.** Les octets scellés n'existent
    plus. Les recalculer et re-signer **fabriquerait** une preuve. Statut définitif.
  - `4bbd052` ne veut donc PAS dire « `evidence_sha256` est réparé ».
- **`evidence_path` — CORRIGÉ** (`883b016` lecture, `0650b21` écriture). `verdict.py` est
  l'**autorité unique** pour la forme d'un chemin d'évidence, dans les deux sens ; chaque
  branchement est **falsifié** (le retirer fait rougir) ; régressions **2003** puis **2008**
  tests verts. Le défaut réel n'était pas « des chemins absolus » mais : *la validité d'une
  preuve dépendait du répertoire d'où on la vérifiait*. Les 63 reçus absolus ne sont **pas
  réécrits** — ils restent lisibles.
  Périmètre réel **inférieur** au cadrage : 2 producteurs et non 4 (2 sites de
  `mutation_proof` étaient **morts**, révélés par falsification), et **0 test** à modifier.
- **Deux lots ADJACENTS, séparés, NON entamés** (le 3ᵉ — les 90 sceaux — est énoncé
  ci-dessus : le répéter ici ferait deux endroits à tenir à jour pour un même fait) :
  - **37 reçus scellent un `oracle_<jeu>.log` NON VERSIONNÉ** → **BLOCKED, décision de
    CONTRAT requise. Pas de correction automatique** : déterminer d'abord si le contrat
    exige que ces logs deviennent des artefacts versionnés, ou si leur statut de preuve
    interne non versionnée est **intentionnel**. Un reçu ne peut pas être vérifiable si
    l'artefact qu'il scelle est volontairement hors dépôt. **Prochain lot autorisé.**
  - **30 évidences `.json` absentes** du dépôt et du disque → **PERTE À INSTRUIRE.**
    Ne **pas** régénérer ni re-signer.
- Clé HMAC par défaut → vrai sujet **sécurité**, hors hygiène de publication.
- Backlog `§18` du Master Schéma V2 : P0 détectabilité, P1 étage ② + un run `full` pour
  observer enfin la lignée causale, P2 `reuse_ratio` ×12 et `agent_factory` sans appelant.
