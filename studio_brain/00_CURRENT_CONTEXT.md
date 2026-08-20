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
origin/publish   7b06eba   POUSSE — 2 commits, orphelin (0 ancetre), ~5251 fichiers
origin/master    bcde5cb   INCHANGE
master local     7d34070   124 commits, TOUJOURS NON POUSSES, archive intacte
```

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
- clé HMAC par défaut `"studio-dev"` — **valeur nécessaire au code**, documentée non
  secrète, surchargeable, déjà consignée **RT-192-3 (MEDIUM)**. L'effacer masquerait une
  faiblesse connue.
- email dans `.github/CODEOWNERS` — référence fonctionnelle au propriétaire.

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

### Deux rattrapages du préflight
- La consigne « exclure les artefacts `lab/` » aurait supprimé **`IMPROVEMENT_LEDGER.yaml`
  (270 IMPs, canonique)** : `lab/` compte 1695 fichiers suivis. → **exclusion par fichier
  nommé, jamais par répertoire.** Ledger rédigé, 270 IMPs vérifiés intacts.
- « 6 fichiers » en étaient **53**, puis 2 de plus au motif élargi — dont un document de
  sécurité qui **nommait le compte** qu'il recommandait de protéger.

### Autres livrables de la session (sur `master`, non poussés)
`RUN_IDENTITY_V1` (`104819c`, `NOT_WIRED` délibéré) · isolation de la preuve
(`2d418b3`, `08d658f`) · T6 fermé (`751d8be`) · détectabilité Godot (`7b10ee7`) ·
**Master Schéma V2 ratifié canonique** (`27cba1a`, `5b7b854`).

### Ouvert, non décidé
- `publish` comme branche **par défaut** GitHub → décision manuelle, non faite.
- Publication de `master` → **BLOCKED, et la mesure est faite** : 66 fichiers ont porté un
  chemin de poste dans les 124 commits, dont **3 qui ne vivent plus que dans l'historique**.
  Aucun `rm` ne les atteint. Seule une réécriture le pourrait — exclue par Pierre.
- **Chemin Blender : 2 autorités unifiées sur 5.** `contracts/roles.yaml`,
  `.claude/skills/asset-generator/SKILL.md` et le doc de design sont **rédigés** (aucune
  fuite) mais portent toujours le fait en double. Non traité, pas oublié.
- **À ratifier** : durcissement de `scripts/forge/tests/test_blender_bin.py` (**zone
  protégée**) — garde ancrée sur un compte nommé → motif générique `/home/[\w.-]+/`,
  plus fort et sans nom de compte. Falsifié sur un **autre** compte (13 → 1 rouge).
- ~~2 rouges Node périmés~~ → **FERMÉS** (`1ce25f9`) : un test de **pont** ancré sur l'état
  du **parc**. **Suite node : 821 / 821. Suite forge python : 1910 / 1911, 0 rouge.**
- Clé HMAC par défaut → vrai sujet **sécurité**, hors hygiène de publication.
- Backlog `§18` du Master Schéma V2 : P0 détectabilité, P1 étage ② + un run `full` pour
  observer enfin la lignée causale, P2 `reuse_ratio` ×12 et `agent_factory` sans appelant.
