# PLAN — reconnecter la chaîne et poser le minimum pour un RUN PROPRE

Date : 2026-07-27 · Auteur : session Troisième Cerveau · Statut : **PLAN — attend le go de Pierre**.
Demande : « reconnecter la chaîne et ajouter le minimal pour un run propre ».
Amont : [feuille de route](ROADMAP_USINE_APPRENANTE_V1.md) · [profil design](PROPOSAL_PROFIL_DESIGN_V1.md) ·
[comparatif](COMPARATIF_SCHEMA_VS_REEL_2026-07-27.md). `claim_verdict: NO_CLAIM_ALLOWED`.

---

## 1. Définition retenue de « run propre » (falsifiable, posée AVANT)

> Un run est propre quand **son verdict vert signifie quelque chose sur le produit** :
> le jeu se charge dans son runtime réel · une partie automatique se déroule sans crash ·
> le score évolue · la partie se termine · et le gate mutation ne juge que du code que les
> tests peuvent atteindre.

Un verdict vert sur un jeu injouable **n'est pas** un run propre — ce serait valider le mode de
panne diagnostiqué aujourd'hui.

## 2. Contraintes dures mesurées ce jour (elles ferment des options)

| Contrainte | Preuve | Conséquence sur le plan |
|---|---|---|
| **LM Studio est DOWN** | `curl localhost:1234/v1/models` échoue | tout rôle `redteam_reviewer` (Qwen) est **inexécutable** ⇒ `s6-redteam-plan` ne peut pas tourner aujourd'hui |
| **s6 exige `blueprint.yaml` (étape 4)** | `s6-redteam-plan.yaml` mandatory_read | rebrancher s6 seul est impossible en profil standard (pas de s4) sans requalifier son entrée |
| **Pas d'événement de gel en standard** | `_freeze_rules` appelé après `s5` seulement (driver.py:517) | la conception est une phase hors chaîne, pas une étape |
| **`capture_browser.mjs` ne teste pas le navigateur** | il importe `loop/input/draw/raster`, **jamais** `browser/main.mjs` ni le HTML | l'oracle « capture » existant ne pouvait pas attraper les 2 bugs de chargement d'hier |
| **Pong FAIL sur 2 volets, dont un circulaire** | verdict signé pong_r2 | budget `game_loop` non déposé ⇒ `propose_brick` (V4) ne dépose que si le reçu code est OK ⇒ il faut d'abord un code OK |
| **4 chantiers non commités dans `driver.py`** + session Godot parallèle | `git status` | committer par lots, jamais de `checkout` |

## 3. Ce que je NE fais pas dans ce plan

Pas le profil `design` complet (bloqué par Qwen + blueprint, et 4-4,5 j) · pas la couche bible ·
pas Playwright · pas la réconciliation du Détail G · pas de nouvelle brique d'agent · pas de
commit ni de push (gate Pierre) · **pas de relance de run avant que les 5 étapes ci-dessous
soient vertes** — relancer avant, c'est repayer 15 $ pour le même verdict.

---

## 4. Le plan — 5 étapes, ordre imposé, chacune avec sa preuve

### Étape 1 — Rendre la critique audible (le canal avant les critiques)
**Quoi** : plier les findings du red-team dans le verdict signé — `redteam_advisory` cesse d'être
vide quand un rapport existe ; chaque finding devient un `humangate_flag` advisory.
**Pourquoi en premier** : le red-team avait trouvé F1 (vitesse) et F6 (exit tautologique) **avant**
le playtest ; ils sont morts dans 14 Ko. Toute critique ajoutée ensuite mourrait pareil.
**Périmètre** : `verdict.py` (agrégation) + tests. Pas de changement de sévérité : advisory reste
advisory, les oracles restent seuls juges.
**Preuve exigée** : sur un rejeu de `pong_r2`, F1 et F6 apparaissent dans le verdict signé ;
suite complète verte (référence 869).
**Effort** : ~½ j-session.

### Étape 2 — Périmètre du gate mutation (ton arbitrage ③, à trancher ici)
**Quoi** : la mutation ne juge que les catégories que les tests peuvent atteindre. Mise en œuvre :
dérivation des `logic_files` par catégorie (`repo_map.yaml` distingue déjà `system` de
`system.adapter`), les adaptateurs de présentation sortent du gate mutation **et entrent dans
l'oracle produit** (étape 3) — chaque couche jugée par l'instrument qui peut la juger.
**Chiffres qui motivent** : systèmes 58/61 = 95 % · adaptateurs **0/65 = 0 %**, structurellement
intuables (les tests scellés n'importent que `05_SYSTEMS/`).
**Preuve exigée** : rejeu du gate sur les données pong_r2 ⇒ score des systèmes seuls = 95 %,
et un test qui échoue si un fichier `system` sortait du périmètre (l'inverse ne doit pas arriver).
**Effort** : ~½ j-session. **Décision Pierre requise** (tu l'avais suspendue en attendant l'analyse ; elle est rendue).

### Étape 3 — Oracle produit minimal (3 volets, zéro Playwright)
**Quoi**, exactement — c'est le cœur du « minimal pour un run propre » :

| Volet | Mécanique | Ce qu'il attrape | Ce qu'il ne prouve pas |
|---|---|---|---|
| **3a — sûreté du graphe d'import navigateur** (statique, déterministe) | depuis `browser/main.mjs`, parcourir le graphe d'imports et refuser tout specifier `node:*` ou référence `process` non gardée | **exactement les 2 bugs d'hier**, qui rendaient le jeu impossible à charger | ne prouve pas que ça s'affiche |
| **3b — partie automatique** (Node, `boot`/`step`) | jouer une partie complète avec un bot des deux côtés : le score évolue · la partie se termine · aucune exception · durée bornée (anti-boucle infinie) | jeu bloqué, score mort, non-terminaison, crash | ne prouve pas le rendu réel |
| **3c — captures** (existant, à brancher) | `capture_browser.mjs` / `capture_godot.mjs` : deux images différentes, non monochromes | rendu figé, écran noir | critère faible, assumé comme tel |

**Point clé** : ces trois volets sont **déterministes et non-LLM**, et 3c existe déjà (il suffit
de l'appeler — aujourd'hui aucun gate ne le fait). 3a est ~50 lignes. 3b réutilise le bot de
solvabilité, avec sa limite déclarée : **latence de réaction zéro ⇒ borne supérieure de
performance, jamais une preuve de jouabilité humaine**.
**Preuve exigée** : chaque volet montré ROUGE sur un cas fabriqué (import `node:`, score gelé,
capture identique) puis VERT sur Pong.
**Effort** : ~1-1,5 j-session.

### Étape 4 — Les 5 lignes de jouabilité dans la wiremap (l'acte d'architecte, le tien)
**Quoi** : la wiremap de Pong gagne les lignes que le playtest a montrées manquantes — **adversaire
automatique (mode solo)** · **bande de vitesse jouable** · **quitter fonctionnel, comportement
défini par runtime** · **score lisible** · **condition de fin + rejouer**. Chacune avec son
`address`, sa `category`, son `expected_proof` — et son nouveau champ `observable_by_player`.
**Qui** : c'est une décision de conception. En profil standard, l'architecte **c'est toi** : je
rédige la proposition de lignes, tu ratifies, avant tout build.
**Pourquoi ici et pas dans le profil design** : le profil design est bloqué (Qwen + blueprint) et
coûte 4-4,5 j ; ces 5 lignes sont ce que la conception aurait produit sur ce jeu précis, et elles
sont connues avec certitude puisque le playtest les a révélées.
**Preuve exigée** : `s10s` en mode « au gel » accepte la wiremap modifiée (pas de ligne REQUIRED
orpheline, placement cohérent, budget tenu) **avant** de lancer le build.
**Effort** : ~½ j-session.

### Étape 5 — Commit par lots, puis LE run
**Quoi** : committer en lots séparés (doctrine D6) : ① instruments (M1, s10s, V1, V4) ·
② étapes 1-3 de ce plan · ③ les 2 fixes navigateur + `launch.json` · ④ doctrine/audits/contrats.
**Ne pas mélanger** avec les fichiers de la session Godot parallèle.
Puis lancer `pong_r3` sous `standard`, builders Opus (DR-07), timeout 3600.
**Preuve exigée** : verdict signé, `verify_run` exit 0 (intégrité) — et un vert qui, cette fois,
signifie : se charge · se joue · score · finit.
**Effort** : ~½ j + 1 run (~15 $, 2 tentatives possibles).

---

## 5. Ce que « reconnecter la chaîne » veut dire dans ce plan

Honnêtement : **ce plan ne rebranche pas la moitié conception** — il en installe le **minimum
équivalent** pour un jeu, à la main, plus les **deux canaux** qui manquaient (critique audible,
preuve produit). La vraie reconnexion (profil `design`) reste le chantier suivant, et ce plan la
prépare de trois façons : le canal de critique existera (étape 1), l'oracle produit permettra de
**mesurer** si la conception sert (étape 3), et le champ `observable_by_player` (étape 4) est
précisément l'entrée du futur `proof_review`.

**Déblocages à prévoir pour le chantier suivant, à décider séparément** : remonter LM Studio ou
trancher le reviewer du plan (Qwen indisponible) · requalifier l'entrée de `s6` pour qu'il puisse
attaquer une wiremap sans blueprint.

## 6. Effort total et risques

**≈3-3,5 jours-session + 1 run.** Une seule création réelle (3a) ; tout le reste est du
branchement ou de la décision.

| Risque | Mitigation |
|---|---|
| Les 5 nouvelles lignes cassent le budget/placement de `s10s` | étape 4 vérifie « au gel » AVANT le build |
| Le build échoue sur le mode solo (feature neuve) | c'est un échec légitime, tracé par la télémétrie M1 — pas un faux vert |
| Travail non commité écrasé (session parallèle) | commits par lots, aucun `checkout`, `git status` avant toute opération |
| L'oracle produit devient un théâtre | chaque volet doit être montré ROUGE sur un cas fabriqué avant d'être accepté |
| Un vert prématuré | définition de « run propre » posée au §1, avant le run |

## 7. Décisions attendues (gate irréductible Pierre)

**G-1** go plan complet, ou sous-ensemble · **G-2** arbitrage du périmètre mutation (étape 2) ·
**G-3** ratification des 5 lignes de jouabilité (étape 4) · **G-4** go commit par lots (étape 5) ·
**G-5** confirmer qu'on ne lance pas `pong_r3` avant que 1-4 soient verts.
