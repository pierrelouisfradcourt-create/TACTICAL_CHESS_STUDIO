# Contexte courant TCS
*(Handoff. Archives : `journal/context-archive-2026-08-{20,17,15}-*.md`.)*

## ⚠️ LE DÉPÔT EST SUR LA BRANCHE `publish` — À LIRE EN PREMIER
La session s'est terminée **hors de `master`**. Pour reprendre : `git checkout master`
— **bloqué par le garde git**, sentinelle humaine requise.

Sur `publish`, **86 artefacts de run apparaissent non suivis** — exclus de cette branche,
présents sur disque, resuivis au retour sur `master`. Ce n'est pas une perte.

## Session 2026-08-19/20 — publication, puis reparation du snapshot
**Les deux branches sont POUSSÉES et synchronisées** (2026-08-20). `master` = le canon,
publié — position **remplacée** en séance, voir decision-log. `publish` = snapshot
**orphelin** et **séparé** : un lot `master` ne s'y déverse jamais, il s'y porte.
**Aucun SHA d'état n'est recopié ici** — un handoff qui en cite un est faux dès son propre
commit. La vérité : `git ls-remote origin refs/heads/master refs/heads/publish`.

### Décision du 2026-08-20 — les artefacts porteurs restent internes
**Ratifiée Pierre** (`d9b8a5b`, decision-log). Les 28 fichiers de `lab/forge_runs/` porteurs
d'un chemin de poste sont **exclus du corpus public**, intacts en local.

> `nécessaire pour la preuve` ≠ `autorisé à être publié`

Les rédiger est **impossible** (invalide le reçu signé) et les publier n'apporterait **rien** :
les signatures sont **HMAC, donc symétriques** — **0 vérifiable par un tiers**. Un artefact
public vérifiable exigerait une primitive **asymétrique**. `publish` reste le snapshot
**propre et séparé** — un lot `master` ne s'y déverse jamais automatiquement.

### Anonymisation Observer — FERMÉE
`anonymize_session_paths.py` vivait avec **zéro appelant**. Étendue puis **branchée** sur les
3 écritures du producteur (`d163d73`, `3df13ef`), appliquée aux 21 artefacts (`9e085bf` :
**24 307 → 108**, diff symétrique, **0 ligne signée modifiée** sur 464), tests dénommés
(`172e622`, `ae09bb4`). Exposition du sommet : **50 → 34**.

### Audit de sensibilité — FERMÉ (`00fd1f9`)
30 124 fichiers examinés. **ZÉRO secret dans tout le dépôt** — aucune clé, aucun jeton, aucun
mot de passe, aucune clé privée, ni suivi ni à risque. Sur 5 359 fichiers suivis, **83
portent uniquement le nom de compte et 0 porte autre chose** : le sujet est l'hygiène, pas la
sécurité.
**Une seule règle ajoutée** : `scripts/forge/*.config.json` + `!*.config.example.json` — le
motif « config par poste » était énuméré à la main, un 3ᵉ outil aurait fui par omission.
**66 fichiers à risque délibérément NON ignorés** : 18 portent le chemin **probant** du
binaire Godot (une règle masquerait une preuve), 48 relèvent d'un producteur **déjà corrigé**.
Une règle serait nuisible dans les deux cas — on documente, on n'ignore pas.

### Le chantier de publication — archivé
Récit complet (le piège central rencontré **quatre fois**, rapatriement `publish` → `master`) :
`journal/context-archive-2026-08-20-publication-orpheline.md`.

### Ouvert, non décidé
- `publish` comme branche **par défaut** GitHub → décision manuelle, non faite.
- **`master` EST publié** (2026-08-20, `2de8641`) — position **remplacée** le soir même,
  decision-log. La mesure, elle, n'a pas changé : 85 fichiers ont porté un
  chemin de poste dans son historique, dont **3 qui ne vivent plus QUE là**. Aucun `rm` ne
  les atteint ; seule une réécriture, exclue par Pierre. Au sommet, **52 `Studio-Dev`
  subsistent — 49 dans des artefacts que la publication a EXCLUS au lieu de rédiger.**
  Le rapatriement rend le **code** du canon correct, **pas son arbre publiable**.
- **Chemin Blender : 2 autorités unifiées sur 5** — les 3 autres sont rédigées (aucune
  fuite) mais portent le fait en double. Non traité, pas oublié.
- ~~2 rouges Node périmés~~ → **FERMÉS** (`1ce25f9`) : un test de **pont** ancré sur l'état
  du **parc**. **Suite node : 821 / 821. Suite forge python : 1910 / 1911, 0 rouge.**
- **LOT EVIDENCE — FERMÉ** (Pierre). Corrigé ce qui l'est ; le reste est **mesuré,
  documenté, accepté tel quel**.

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
