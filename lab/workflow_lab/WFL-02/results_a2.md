# WFL-02 — Coup A2 v0 : recombinaison mécanique du panel ×5 (2026-07-13)

- **Demande** : Pierre, « réconcilie » (les 5 regards du panel WFL-02/coup A1).
- **Décision de conception prise ici** : PAS de fusion par LLM-arbitre (risque identifié
  dans `docs/forge/PRISM_SCOPING.md` §2 : « un LLM-arbitre non outillé recrée le risque
  que la Forge s'interdit ailleurs — un jugement non mécanique déguisé en fait »).
  Mécanisme choisi : **union mécanique par critère charter cité**, zéro sélection, zéro
  résumé, zéro arbitrage de contenu. C'est un choix de conception, pas une découverte —
  documenté ici pour que Pierre puisse le contester.
- **claim_verdict** : NO_CLAIM_ALLOWED

## 1. Ce qui a été construit : `shared/merge_prisme.mjs`

Principe : le charter (`criteres_succes[]`) est la seule vérité déjà validée. Chaque lens
cite, dans sa propre section « Traçabilité », les critères charter qu'il couvre (texte
verbatim, en guillemets). L'outil :
1. Extrait les 9 tags de critère du charter (`CHARTER COMPLET`, `CONDITIONS DE FIN…`, etc.)
   par correspondance de texte — pas de parseur YAML, pas d'interprétation.
2. Détermine le **périmètre produit** = les critères que le CONTRÔLE (l'artefact s1 réel
   déjà produit) cite (6/9 — les 3 restants sont des critères de PROCESSUS : preuve
   mécanique, tests à mutation, schéma complet — hors du niveau produit par construction,
   pas une lacune du panel).
3. Pour chaque critère du périmètre, liste quels lenses le couvrent (union, pas fusion).
4. Concatène VERBATIM la section « Règles observables » de chaque lens, groupée par
   source — aucune ligne réécrite, aucune version choisie comme « meilleure ».
5. Tout critère du périmètre couvert par ZÉRO lens serait remonté tel quel depuis le
   charter, marqué GAP explicite (mécanisme prêt, pas déclenché cette fois — voir §3).

Sortie complète : `product_snapshot_merged.md`.

## 2. Un bug réel trouvé et corrigé EN CONSTRUISANT (pas après lecture de résultat)

Premier passage : l'outil rapportait les 5 sections « Règles observables » comme
« vides ou introuvables » — silencieusement faux (rien n'aurait été mal AFFICHÉ, juste
absent). Cause : l'expression régulière utilisait `$` en mode multilignes pour marquer la
fin de section, or en mode `/m` un `$` correspond à la fin de CHAQUE ligne, pas seulement
à la fin du texte — la capture paresseuse s'arrêtait donc à la toute première ligne.
Corrigé (`(?![\s\S])` = fin de chaîne réelle). Vérifié après coup : 152 lignes de contenu
réel dans la sortie fusionnée, contre 59 (quasi vide) avant correction.

## 3. Limite RÉELLE et honnête trouvée en exécutant l'outil — pas cachée

Le récapitulatif mécanique annonce `RESULT: FULL_COVERAGE` (6/6 critères du périmètre
couverts par au moins 1 lens). **Ce résultat ne contredit pas, mais ne reproduit pas non
plus**, le gap trouvé À LA MAIN dans `WFL-02/results.md` §5 (« aucun lens ne couvre le
bornage de la raquette dans l'aire de jeu »). Raison mécanique claire : le bornage de la
raquette n'est rattaché, dans le charter, à AUCUN des 9 tags `criteres_succes` — c'est une
clause de la prose libre `objectif:` (« raquette contrôlée au clavier »), pas d'un
critère structuré. L'outil ne scanne QUE les 9 tags structurés ; il est donc **plus
grossier que la lecture manuelle** et sous-détecte les lacunes qui vivent dans la prose
libre du charter plutôt que dans sa liste de critères. **Déclaré comme limite de la v0**,
pas corrigé silencieusement en élargissant le scan à la prose (parser du texte libre pour
en extraire des « critères » mécaniquement introduirait exactement le risque
d'interprétation que ce mécanisme est censé éviter — une v1 éventuelle demanderait sa
propre conception, pas une extension improvisée).

## 4. Conclusion — LIMITÉE

- **Ce que ceci établit** : un mécanisme de recombinaison PUREMENT mécanique (zéro LLM
  arbitre, zéro fusion de texte, zéro résumé) est possible et produit un artefact
  utilisable — regroupement par critère charter + union verbatim des règles. Sur cette
  instance, 6/6 critères du périmètre produit sont couverts par au moins un lens.
- **Ce que ceci NE prouve PAS** : que ce mécanisme détecte TOUTES les lacunes de
  couverture — il est prouvé plus grossier que la lecture humaine sur cette même instance
  (rate le gap « bornage raquette » que `results.md` §5 avait trouvé à la main, parce que
  ce gap vit dans la prose libre du charter, pas dans ses critères structurés). Il ne
  tranche AUCUNE contradiction de valeur entre lenses (aucune observée sur cette instance,
  donc le mécanisme n'a pas été mis à l'épreuve sur ce point). N=1.
- **Implication pour la suite** : ce mécanisme mécanique peut servir de PREMIER filtre
  (rapide, gratuit, sans risque de jugement caché) avant toute étape humaine ou LLM — mais
  ne remplace ni une relecture humaine du gap « prose libre », ni une décision explicite
  sur ce qu'il faut faire des règles qui se chevauchent entre lenses sans être identiques
  mot pour mot (cas non rencontré ici, donc non résolu ici).

```
software_verdict: OK (mécanisme construit et exécuté, bug trouvé et corrigé, limite déclarée)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
