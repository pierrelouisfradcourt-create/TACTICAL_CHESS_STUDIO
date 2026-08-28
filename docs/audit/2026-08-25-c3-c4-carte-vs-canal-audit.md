# AUDIT — C.3/C.4 : la carte manquante (Game Loop Architecture → Content Requirements)

*Date : 2026-08-25 · Lecture seule, aucun code modifié · Sources : C.3 V1.2, C.4 V1.1, run réel
`kitten_clicker-20260824f` (halté à la gate design_freeze), `scripts/forge/`, `lab/forge_runs/kitten_clicker/`.
Méthode : 2 audits indépendants (contrats · artefact réel) + confrontation directe au dépôt par l'orchestrateur.*

**Question posée par Pierre (2026-08-25)** — « L'échange Art ↔ GM ne doit pas être le mécanisme qui compense un
manque d'architecture. Quelles sont les boucles que la Forge doit être capable de produire AVANT même que l'Art et
le GM commencent à se compléter ? » Verdicts par surface uniquement · `claim_verdict: NO_CLAIM_ALLOWED` ·
`no_global_ready_verdict: true`.

---

## 1. Conclusion de l'audit (une phrase)

**La Forge possède un canal de complétion durci (C.4, mécanisé) et une architecture énoncée (C.3, non câblée) —
mais aucune CARTE : rien, dans la chaîne, ne dit à un agent ce que chaque boucle doit CONTENIR. Le dialogue
Art ↔ GM remplit donc un gabarit vide, ce que C.4 lui-même nomme « slot rempli ».**

Le diagnostic de Pierre est confirmé par trois mesures indépendantes et convergentes (§2, §3, §4).

---

## 2. Mesure A — le contrat d'architecture n'atteint jamais les agents

| Fait mesuré | Chemin | Statut |
|---|---|---|
| C.3 (`kitten_clicker_game_loop_architecture_v1.md`) n'est ouvert par aucun code | aucun `open()`/`readFileSync` dans `scripts/` | **NOT_WIRED** |
| C.3 n'est dans aucun `mandatory_read` | `contracts/s2.7-gm-worldscan.yaml`, `s2.5-artbible.yaml` | **NOT_WIRED** |
| C.3 n'est cité par aucune tâche | `lab/forge_runs/kitten_clicker/tasks.json` | **NOT_WIRED** |
| C.3 n'existe pas dans `design/` (le seul répertoire injecté) | `design/` = README, deferred_loops.json, gameplay_loop_content_contract.md, progression_contract.md | **ABSENT** |
| Seuls documents de design injectés en amont | `context_manifest.py:61` → `design/progression_contract.md` (C.1), `design/gameplay_loop_content_contract.md` (C.2), `design/calibration.md` | MEASURED |
| C.4 est cité — en PARAPHRASE, pas en texte | `tasks.json`, tâches `-r2` | PARTIEL |

**Conséquence** : le GM et l'Artiste reçoivent une graine de gameplay (C.2) et des nombres de progression (C.1).
Ils ne reçoivent **jamais** la carte des 10 boucles, ni ce que chaque boucle exige. Nous avons demandé au dialogue
de produire une architecture que personne ne leur a donnée.

### Le défaut le plus net : la chaîne PRESCRIT un objet qu'elle ne LIVRE pas
Le texte réellement envoyé au Game Master (`contracts/s2.7-gm-worldscan.yaml:183-195`, retrouvé verbatim dans les
snapshots Observer `lab/reports/observer/*/observer_run.json` — donc bien reçu par l'agent) dit successivement :

> « TU (GM) PROPOSES la boucle — les champs **{steps, produces, consumes, unlocks, transformation_perceptible,
> metric_propre}** avec ce que tu SAIS » (l.186-188)

puis, huit lignes plus loin :

> « ta reponse doit **REECRIRE les champs C.3** de la boucle concernee — une reponse qui ne modifie AUCUN champ de
> la boucle est une reponse a cote, refusee par R3-lite » (l.194-195)

**L'agent reçoit l'ordre de réécrire « les champs C.3 » alors que les seuls champs qui lui sont énumérés sont les 6
du schéma de code.** C.3 est nommé « RÉFÉRENCE NORMATIVE » (1 occurrence, s2.7 ; **0 dans s2.5-artbible**) sans
qu'aucun canal ne transmette son contenu. C'est un **validateur sans producteur appliqué à la carte elle-même** :
la règle exige les 14 champs, aucun mécanisme ne les livre. Le manque n'est donc pas seulement « CONTENT_REQUIREMENTS
n'existe nulle part » — c'est que la chaîne **prescrit un objet qu'elle ne fournit pas**.

Inventaire complet des références aux deux `.md` dans le dépôt : **10 fichiers, aucun lecteur** (commentaires,
docstrings, paraphrase de `tasks.json`, snapshots Observer, notes de session, auto-référence). `open()`/`readFileSync`
sur ces deux fichiers : **zéro occurrence**.

### La preuve par l'exception (mesure décisive)
C.2 contient la SEULE carte réellement injectée : le tableau **P01 → P08** (objectif · action · feedback ·
nouveauté · preuve — 5 des 14 champs, par étape). Le GM réel **le cite 8 fois** (`« source design, graine P03 »`)
et s'y rattache. **Là où une carte existe, l'agent la consomme et s'y adosse ; là où elle n'existe pas (les 9
boucles), il invente des slots structurellement valides.** Ce n'est pas un défaut d'agent : c'est un défaut d'entrée.

---

## 3. Mesure B — C.3 : architecture énoncée, validation opérationnalisée

C.3 s'énonce comme une architecture : « La WireMap ne découvre pas les boucles : elle traduit un design déjà
cohérent » (C.3:7-8) ; « toute exigence future doit pouvoir dire À QUELLE BOUCLE elle appartient » (C.3:186-188).

Mais son dispositif est un dispositif de **jugement**, pas de fabrication :
- double verdict appliqué **au document lui-même** (C.3:173-176 : architecturale 6/10, mesurée 1/10) ;
- règles de REFUS (C.4:8-14, R1/R2), aucune règle de fourniture ;
- et surtout **C.4:26** : « GM PROPOSE la boucle (les 14 champs C.3, avec ce qu'il SAIT ; les trous marqués
  QUESTION) » — **c'est l'agent qui remplit les 14 champs, le contrat ne les remplit pas.**

### Couverture de la grille de 14 champs dans C.3 (10 boucles × 14)
DÉFINI ≈ 78 · PARTIEL ≈ 45 · ABSENT ≈ 17 cases. Les trois champs à **0/10 défini** sont exactement ceux que la
grille de Pierre ajoute : **QUESTION OUVERTE · ÉTAT · NOUVEAUTÉ**. C.4 en donne le vocabulaire
(`PROPOSED → REPRESENTED → COMPLETE | OPEN`) sans jamais l'assigner à une boucle.

Quatre pièces sont déclarées « à créer » par C.3 lui-même et **n'ont pas été créées** :
producteur Quest (C.3:165) · producteur Skill partiel (C.3:164) · consommateur Content (C.3:162) ·
consommateur des états Art côté GM (C.3:166).

### CONTENU REQUIS dans C.3 : prose et renvois, jamais un inventaire
| Boucle | ce qui est écrit | forme |
|---|---|---|
| Core | « pelote animée ; réactions de chatons (≥1 par état) » | prose, 0 état nommé |
| Gameplay / Progression / Content / Skill | « … (C.2 §5) », « … (C.2 §7) » | **renvoi externe**, 0 nom |
| World | « 4 états visuels par lieu + promesse visible du suivant » | **le seul proche de l'exemple Pierre** — donne les états, jamais l'inventaire des lieux |
| Economy / Quest / Meta | « coût et effet affichés », « objectifs qui NOMMENT une action », « contenu neuf par portée » | quantité ou UI seule |

Le mot **bâtiment** n'apparaît qu'une fois dans C.3 — dans le TITRE de la boucle World (C.3:113) — et n'est exigé
par aucun `CONTENT_REQUIRED`.

---

## 4. Mesure C — ce que le GM réel a produit (run `-20260824f`)

### 4.1 Le schéma de boucle ne porte que 6 clés
`{steps, produces, consumes, unlocks, transformation_perceptible, metric_propre}` — identiques sur les 9 boucles
(vérifié). **Six des quatorze champs n'ont AUCUN porteur** : OBJECTIF · ENTRÉE (ressource) · **CONTENU REQUIS** ·
PRODUCTEUR · QUESTION OUVERTE · ÉTAT. Écart contrat → code : **10 boucles × 14 champs → 9 boucles × 6 champs**.
`CONTENT_REQUIRED`, `ART_REQUIRED`, `GM_REQUIRED` — c'est-à-dire **exactement ce que l'Art doit RECEVOIR** — sont
hors schéma : aucun validateur ne peut refuser un GM qui les laisse vides.

### 4.2 Le contenu existe, mais en vrac non joignable
- `asset_requests.json` : **28 fiches, aucun champ `loop`** (vérifié) → liste globale.
- `grey_blocks` : **18 blocs, aucun champ `loop`** (vérifié) ; le rattachement à une boucle n'est reconstituable
  qu'indirectement (`proof_ref → proof_model.measures → metric_propre`).
- **18 des 28 assets ne sont cités nulle part dans le GM** (vérifié) : `env_refuge, env_jardin, env_grenier,
  item_pelote, item_panier, item_coussin, item_banc, item_fleurs, item_jouet, item_niche, item_gamelle,
  item_arbre, ui_hud, ui_album, ui_affordances, ui_ecran_fin, fx_prestige, fx_coeur`.
- **Aucune clé de jointure** entre le nommage design (`banc`) et le nommage art (`item_banc`).
- `progression_loop` : **0 contenu rattaché**, alors qu'elle déclare produire les déblocages P01→P08.

C'est très exactement « fais un jardin » : l'Art produit 28 fiches que le design ne référence pas, le design
nomme 18 blocs que l'Art ne connaît pas sous ces noms.

### 4.3 La chaîne visée par Pierre existe à moitié
`lieu → placement de chaton → production (×1,5 au jardin) → unlock d'objets → prestige → nouveau lieu (différé)`
est présente. **Le maillon « les chatons y TRAVAILLENT » est MISSING** : 0 occurrence de travail/affectation/rôle ;
la seule variable est *où* le chaton est posé, la seule conséquence un multiplicateur de lieu. Il n'y a pas de
métier, pas d'affectation, donc pas de bâtiment au sens où Pierre l'entend.

### 4.4 Deux mesures qui invalident des signaux existants
- **La ratification humaine n'a laissé aucune trace mesurable** : les 7 boucles DEFERRED sont remplies au même
  niveau que les 2 requises (taille JSON 1657→2069, ratio 1,25 ; `meta_loop` différée est plus fournie que
  `core_loop` requise). Le statut différé n'existe dans aucun champ de boucle.
- **`design_state.json` affiche `shared_design_pct: 100`, `ART/GM: READY`, `ready_for_freeze: true` des DEUX côtés**
  (vérifié) — pour un design que la gate a REFUSÉ le même jour. Un pourcentage de complétude calculé sans les
  boucles, lisible et faux au sens du contrat courant.
- **Prompt périmé** : `tasks.json` demande « les **6** boucles TESTABLES » alors que le validateur en exige **9**
  (vérifié). L'agent reçoit une consigne que son propre oracle refusera.

### 4.5 Ce que la ronde 2 a réellement produit
Diff r1 → r2 : **seul changement de tout le fichier** = les 7 boucles différées passent de 3 à 5 steps (+`reward`,
+`decision`). `core_loop` et `gameplay_loop` : identiques bit-à-bit. Les 3 réponses aux questions de l'Artiste
étaient **déjà présentes en r1** dans les `builder_contract` — la ronde 2 ne les a pas produites. La gate a donc eu
raison de nommer « réponse sans modification = théâtre de questions » sur `gameplay_loop`.

---

## 5. Le niveau manquant, nommé

Ce qui manque n'est ni une station, ni une boucle de dialogue supplémentaire : c'est **l'étage qui traduit
l'architecture en exigences de contenu**, entre C.3 (quelles boucles) et C.4 (qui complète quoi).

```text
C.3  GAME LOOP ARCHITECTURE      (quelles boucles existent, ce qu'elles s'échangent)
              │
              ▼
[MANQUANT]  CONTENT REQUIREMENTS  (ce que CHAQUE boucle exige pour être jouable)
              │            lieux · bâtiments · personnages · objets · animations · skins · UI
              │            chacun : nombre · états · transformation perceptible · usage GM
              ▼
C.4  MUTUAL COMPLETION           (Art et GM vérifient qu'ils peuvent REMPLIR — pas inventer)
              │
              ▼
     WIREMAP                     (n'invente rien)
```

**Conséquence de rôle** (formulation de Pierre, adoptée) : un agent peut dire « pour la boucle World, il me manque
les états visuels du bâtiment » ; il ne peut plus dire « je ne sais pas ce qu'est la boucle World ».

### Ce que cet étage doit porter, par boucle (dérivé des manques mesurés)
1. **Les 6 champs orphelins** : OBJECTIF · ENTRÉE (ressource, pas nom de boucle) · CONTENU REQUIS · PRODUCTEUR ·
   QUESTION OUVERTE · ÉTAT.
2. **Un inventaire nommé, pas un renvoi** : par boucle, la liste des lieux/bâtiments/personnages/objets/
   animations/skins/UI, chacun avec son **nombre d'états**, la **transformation perceptible** de chaque état, et
   **l'usage GM** (quelle boucle aval le consomme).
3. **Une clé de jointure** design ↔ art : un `id` unique partagé par grey_block et asset_request, et un champ
   `loop` sur les deux — sans quoi 18 assets sur 28 restent orphelins.
4. **Le statut différé comme champ de boucle**, pour que la ratification humaine soit visible dans l'artefact.
5. **Le maillon manquant de la chaîne** : rôle/affectation d'un chaton à un bâtiment (aujourd'hui : simple
   placement + multiplicateur).

*Aucune de ces cinq lignes n'est un lot de code ratifié — ce sont les manques nommés par l'audit. La décision de
périmètre, d'ordre et de forme appartient à Pierre (HumanGate).*

---

## 6. Passifs relevés, non traités (décision Pierre requise)
- `tasks.json` « 6 boucles testables » vs validateur 9 boucles (contradiction consigne ↔ oracle).
- `design_state.json` : `shared_design_pct` calculé sans les boucles → 100 % affiché sur un design refusé.
- 4 pièces « à créer » de C.3 (producteurs Quest/Skill, consommateurs Content/World) toujours absentes.
- La boucle 10 (Art↔GM) n'est pas une boucle dans le code (`LOOP_NAMES` = 9) : sa métrique propre — « champs de
  boucle complétés PAR le dialogue » — n'est câblée dans aucun oracle, donc l'anti-modèle « théâtre de questions »
  n'est mesuré que par R3-lite (diff de sérialisation), jamais par un gain de complétude.
- 2 correctifs d'oracle du 2026-08-24 (regex de fence ancrée, R2a par nom de boucle) : **non commités**, 2270
  pytest verts.

---

`software_verdict: OK` (audit exécuté, lecture seule, mesures reproductibles et confrontées au dépôt) ·
`evidence_verdict: MECHANICAL_VALIDATION_ONLY` · `claim_verdict: NO_CLAIM_ALLOWED` ·
`no_global_ready_verdict: true`
