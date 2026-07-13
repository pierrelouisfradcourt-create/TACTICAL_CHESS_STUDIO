# WFL-02 — Résultats (coup A1 : prisme → panel ×5, sans fusion) — 2026-07-13

- **Protocole** : `PROTOCOL.md` (gabarit rempli AVANT exécution, conforme
  `WORKFLOW_LAB_PROTOCOL.md` §4).
- **Demande** : Pierre, « fabrique le prisme à 5 regards ».
- **claim_verdict** : NO_CLAIM_ALLOWED

## 1. Ce qui a été fabriqué

- **Contrôle** : `control/product_snapshot.md` — RÉUTILISÉ tel quel depuis
  `WFL-01/shared/product_snapshot.md` (sha256 identique), le vrai artefact produit par un
  seul agent (s1 actuel) sur ce même charter. Pas régénéré — c'est le contrôle le plus
  honnête disponible : un artefact RÉEL déjà produit par le s1 actuel, pas une imitation.
- **Variante (panel ×5)** : 5 artefacts `variant/product_snapshot_{ceo,gd,front,back,
  joueur}.md`, chacun écrit en isolation (seul `shared/charter.yaml` consulté — jamais les
  4 autres lenses, jamais le contrôle), avec un point de vue imposé distinct par fichier
  (dirigeant / game designer / front-end / back-end-logique / joueur).
- **Oracle** : `shared/check_prisme.mjs` — déterministe, non-LLM, vérifie UNIQUEMENT la
  forme (4 sections présentes et non triviales, aucun placeholder non résolu, au moins une
  règle numérotée) — ne juge JAMAIS le contenu. Même oracle appliqué au contrôle et aux 5
  lenses, sans distinction.

## 2. Un bug d'oracle trouvé et corrigé AVANT toute conclusion (même discipline que WFL-01)

Premier passage : l'oracle a fait échouer `control/product_snapshot.md` sur un
« placeholder non résolu » — en réalité un faux positif : le document contient la phrase
« Aucun champ « à définir ». », qui AFFIRME l'absence d'un placeholder et se faisait
flaguer comme si elle EN était un. Corrigé en restreignant le scan de placeholder au corps
des 4 sections requises (pas au préambule/méta-commentaire du document). **Ce n'est pas
l'artefact qui était fautif, c'est l'oracle** — même famille de bug que le faux positif de
commentaire JSDoc trouvé dans l'oracle WFL-01 (`results.md` §3). Corrigé AVANT toute
lecture de résultat comparatif, pas après.

## 3. Résultat — conformité structurelle : 6/6 PASS

```
node shared/check_prisme.mjs control/... variant/...*.md
6/6 artefacts conformes structurellement.
RESULT: PASS  (exit 0)
```

Le contrôle et les 5 lenses passent tous l'oracle de conformité — succès structurel
déclaré au protocole (§ Critère de succès/échec) atteint.

## 4. Volume et robustesse (proxy — même limitation que WFL-01, pas de télémétrie réelle)

```
control                    : 2021 mots,  20 règles numérotées
variant/ceo                :  634 mots,   5 règles numérotées
variant/gd                 :  626 mots,   5 règles numérotées
variant/front               :  643 mots,   5 règles numérotées
variant/back                :  610 mots,   6 règles numérotées
variant/joueur              :  693 mots,   5 règles numérotées
--- somme des 5 lenses      : 3206 mots,  26 règles numérotées (brutes, sans dédup)
```

**Renvois/corrections nécessaires sur les artefacts eux-mêmes : ZÉRO**, sur les 6 (contrôle
et 5 lenses). Le seul renvoi de cette expérience a porté sur l'ORACLE (§2), pas sur le
contenu produit — cohérent avec le signal déjà observé sur WFL-01 (`cost_robustness.md`
§2 : zéro friction de justesse sur le code de jeu).

**Lecture du volume** : le panel produit collectivement PLUS de mots (3206 vs 2021, +59 %)
mais chaque lens individuel est BEAUCOUP plus court que le contrôle (~630 mots vs 2021,
environ 3× moins). Chaque lens couvre aussi moins de règles numérotées individuellement
(5-6 vs 20) — attendu, puisque chaque regard ne priorise qu'un sous-ensemble du charter,
par construction du protocole.

## 5. Divergence de contenu entre les 5 lenses — DESCRIPTIF, pas un jugement

Chaque lens cite, dans sa propre section « Traçabilité », à quel(s) critère(s) du charter
il rattache ses règles. En croisant ces rattachements avec les 8 groupes de règles du
contrôle (physique/rebonds R1-5 · contrôle clavier R6-7 · briques/score R8-9 ·
niveau seedé R10/R14 · conditions de fin R11-13/15 · overlay/restart/contrat R16-18 ·
architecture R19 · solvabilité R20) :

| Groupe (contrôle) | CEO | GD | Front | Back | Joueur | Couverture panel |
|---|---|---|---|---|---|---|
| Physique/rebonds | — | ✓✓ | — | — | ✓ (partiel) | 2/5 lenses |
| Contrôle clavier (bornage raquette) | — | — | — | — | — | **0/5 — absent du panel** |
| Briques/score (destruction exacte) | — | — | — | ✓ (partiel) | — | 1/5, partiel |
| Niveau seedé/déterminisme | ✓ (partiel) | ✓ | — | ✓ | — | 3/5 |
| Conditions de fin | ✓ | — | — | ✓✓ | ✓ | 3/5 |
| Overlay/restart/contrat jouabilité | ✓✓ | — | ✓✓ | ✓ | ✓✓ | **4/5 — le plus couvert** |
| Architecture (R19) | — | — | ✓ | ✓ | — | 2/5 |
| Solvabilité (bot gagne réellement) | — | — | — | ✓ (reformulé : terminaison bornée) | — | 1/5, reformulé |

**Deux findings réels, ni bons ni mauvais en soi — juste observés :**

1. **Un angle du charter disparaît totalement du panel** : aucun des 5 lenses n'énonce
   explicitement « la raquette reste dans l'aire de jeu » (R7 du contrôle), alors que le
   contrôle (1 seul agent, vision large) le couvre. Sur ce panel précis, personne n'a
   « la vision d'ensemble complète » du contrôle — chacun optimise sa priorité et laisse
   filer ce qui n'est pas dans son mandat.
2. **Deux préoccupations neuves apparaissent, absentes du contrôle** : CEO soulève
   explicitement « ne pas ajouter de fonctionnalité hors scope en douce » (dérive de
   budget) et Front soulève « le rendu ne doit pas être couplé au pas de temps logique »
   — deux angles qu'un seul agent généraliste (le contrôle) n'a pas formulés. Le panel
   trouve des choses que le contrôle ne trouve pas, ET en perd d'autres.

Ceci confirme (sur CETTE instance, N=1) l'hypothèse posée dans `PRISM_SCOPING.md` §2 :
les 5 regards divergent réellement, pas seulement en style mais en COUVERTURE — ce qui
valide qu'un mécanisme de recombinaison (coup A2) est un vrai problème à résoudre, pas un
risque théorique.

## 6. Conclusion — LIMITÉE

- **Ce que ceci établit** : un panel de 5 agents-visions isolés peut, sur ce charter,
  produire 5 artefacts tous structurellement conformes au contrat s1 actuel (0 renvoi côté
  contenu), avec un volume individuel plus faible mais un volume collectif plus élevé que
  le contrôle. La divergence de couverture entre les 5 regards est RÉELLE et mesurée, pas
  supposée : au moins un groupe de règles du charter (bornage raquette) disparaît
  totalement du panel, tandis que 2 préoccupations absentes du contrôle apparaissent.
- **Ce que ceci NE prouve PAS** : que le panel est « meilleur » ou « pire » que l'agent
  unique — aucune fusion n'a été tentée (hors scope, coup A2), donc rien ne dit ce que le
  studio ferait des 5 sorties en pratique, ni si la couverture manquante (R7) serait
  rattrapée par une étape en aval (s3 Décompo, qui pourrait détecter le trou en comparant
  au charter). N=1 — un seul run, aucune conclusion ferme possible avant N≥2 (règle 4).
  Le vrai coût (tokens/durée réels) reste non mesuré, même limitation que
  `WFL-01/cost_robustness.md` §0 (pas de télémétrie driver pour cette expérience).
- **Prochaine étape logique (pas décidée ici)** : coup A2 (mécanisme de recombinaison) —
  ce résultat lui donne enfin une base empirique (les vrais trous/apports observés ici,
  pas des trous imaginés) plutôt que de partir d'une hypothèse abstraite.

```
software_verdict: OK (panel fabriqué, 6/6 conforme structurellement, divergence mesurée)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
