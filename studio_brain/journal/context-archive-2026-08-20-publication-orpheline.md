# Archive de contexte — 2026-08-20 · publication par branche orpheline
*(Deplace depuis `00_CURRENT_CONTEXT.md` a sa cloture. Recit COMPLET du chantier de
publication : ce qui a ete publie et pourquoi ainsi, les corrections de fond, ce qui a
ete conserve deliberement, le piege central rencontre quatre fois, et le rapatriement
`publish` -> `master`. Le handoff n'en garde qu'un pointeur.)*

### Ce qui a été publié, et pourquoi ainsi
Un **snapshot orphelin**, pas un commit au sommet de `master`. Mesure qui l'imposait : une
branche dérivée de `master` aurait publié 122 commits, et parmi leurs ancêtres **119
fichiers portant un chemin de poste** — dont les 85 que le nettoyage retirait.
**`git rm` retire un fichier de l'arbre du sommet, jamais de l'historique.**

Contenu : 5248 fichiers. **86 artefacts de run exclus** (`lab/forge_runs/` 64,
`lab/reports/observer/` 22) — sorties sans consommateur, **conservées sur disque**.

Exposition nouvelle : **aucune**. 0 clé, 0 mot de passe, 0 token, 0 `/home/studio-dev/`.
Les 11 occurrences restantes de `Studio-Dev` sont **toutes déjà sur `origin/master`,
octet pour octet identiques**.

### Corrections de fond (pas seulement des fuites)
- **`ml/lichess_importer.py`** — chemin `Desktop/` en dur → env `LICHESS_ZST` + défaut repo.
- **`scripts/forge/blender_bin.py` (NOUVEAU)** — le binaire Blender était en dur **et
  dupliqué** dans `asset_dispatch.py` et `asset_geometry/oracle.py` : deux autorités pour
  un même fait. Résolution unique, motif `godot_bin.mjs` déjà ratifié
  (env → `blender.config.json` gitignoré → erreur explicite) + `.example.json` versionné.
- 13 fichiers rédigés, dont 5 fixtures — **captures réelles**, rédigées puis **prouvées
  inoffensives par leurs 4 tests** (46 verts).
- 14 caches d'éditeur Godot désuivis ; règle élargie à `**/.godot/editor/`.

### Conservé délibérément, avec justification
- `knowledge_base/proofs/grid_nav_probe_verdict.json` — **preuve signée** (`hmac` +
  `mutation.signature`) : le rédiger détruirait sa vérifiabilité.
- clé HMAC par défaut — **nécessaire au code**, non secrète, surchargeable, déjà consignée
  **RT-192-3 (MEDIUM)** : l'effacer masquerait une faiblesse connue. Idem email CODEOWNERS.

### Le piège central, rencontré trois fois
1. Nettoyer le sommet ne nettoie pas l'historique.
2. Un commit « au sommet » emporte ses 121 ancêtres.
3. **`git checkout --orphan` reconstitue l'index depuis `HEAD`** — les corrections de
   l'arbre de travail n'y étaient pas. Seul un **préflight sur l'INDEX** (`git grep
   --cached`) l'a vu ; un scan de l'arbre de travail aurait été vert à tort.
4. **Le snapshot publié importait un module qu'il ne contenait pas.** `add -u` ne met à
   jour que le **déjà-suivi** : la *correction* est passée, le *module neuf* non
   (`ModuleNotFoundError`, prouvé en **exécutant** le contenu publié, pas en le lisant).
   Corrigé par `7b06eba`. Le préflight mesurait l'**exposition** de l'index, jamais son
   **exécutabilité** — trouvé seulement parce que le préflight de `master` l'a mesurée.

### Deux règles nées du préflight
**Exclure par fichier nommé, jamais par répertoire** — « exclure `lab/` » aurait supprimé
`IMPROVEMENT_LEDGER.yaml` (270 IMPs, canonique) parmi 1695 fichiers suivis. Et **un
périmètre annoncé se mesure** : « 6 fichiers » en étaient 53.

### Rapatriement `publish` → `master` — FAIT (la lignée était inversée)
La correction du chemin Blender ne vivait que dans la branche **publiée** ; `master`, le
canon, portait encore le chemin. **Un futur snapshot depuis `master` l'aurait perdue en
silence** — la garde qui l'aurait détectée étant justement ce qui disparaissait.
- **lot A** `d679218` — 10 fichiers (code + garde). Ferme les 4 `/home/<compte>` réels.
- **lot B** `09210af` — 18 fichiers (rédactions), 39 marqueurs retirés, 5 fixtures en
  **zone protégée** sous GO Pierre. Validé par les **108 tests qui les consomment**,
  exécutés sur l'**état commité** (extraction), pas sur l'arbre de travail.
- **Hors lot, délibérément** : 27 fichiers restants = données régénérées, `wiremap.json`
  (2124 lignes de diff, **zéro** changement sémantique), et 3 où `master` est en avance.

### Autres livrables de la session (sur `master`, non poussés)
`RUN_IDENTITY_V1` (`104819c`, `NOT_WIRED` délibéré) · isolation de la preuve
(`2d418b3`, `08d658f`) · T6 fermé (`751d8be`) · détectabilité Godot (`7b10ee7`) ·
**Master Schéma V2 ratifié canonique** (`27cba1a`, `5b7b854`).
