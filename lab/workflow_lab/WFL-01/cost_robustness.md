# WFL-01 — Coût et robustesse du processus (2026-07-13)

- **Pourquoi ce fichier** : `results.md` et `results2.md` couvrent Qualité code et
  Jouabilité (panel §3). Coût et Robustesse restent non mesurés — demande explicite
  Pierre : « mesure le coût et la robustesse du processus ».
- **claim_verdict** : NO_CLAIM_ALLOWED

## 0. Limitation déclarée AVANT toute mesure — à lire en premier

Le panel §3 du protocole spécifie **Coût = tokens/étape, durée, source `forge_telemetry.jsonl`**
et **Robustesse = renvois/escalades/attempts, source `state.json`**. WFL-01 a été fabriqué
**à la main dans cette conversation**, PAS via `scripts/forge/driver.py` (le driver réel qui
émet `state.json`/télémétrie). Aucun des deux fichiers sources attendus par le protocole
n'existe pour cette expérience — cohérent avec le constat déjà connu (`00_CURRENT_CONTEXT.md`,
`forge_reforge_experiment` en mémoire) : le driver n'a encore jamais piloté un run réel.

**Conséquence** : je ne peux pas fournir de nombre de tokens ni de durée réelle mesurée par
la télémétrie Forge — je n'en ai pas. Toute mesure ci-dessous est une **PROXY déclarée**,
calculée sur les artefacts effectivement produits (le texte du code, mon propre déroulé de
travail observable dans cette session), pas la source de vérité prévue par le protocole.
Un chiffre de proxy présenté comme le vrai axe « coût » serait un claim non fondé — interdit.

## 1. Proxy de coût : volume de code produit par branche

```
                    game.mjs  level.mjs  render.mjs  input.mjs  server.mjs   TOTAL
run1/control (*)         221        107          82         53          82     545
run1/variant              301        212         120         58          71     762
run2/control              197        103          75         49          66     490
run2/variant               219        111         100         56          66     552
```
(*) `run1/control` préexistait à cette session (livré lors d'une session antérieure, non
observée directement par moi) — inclus pour le volume, mais EXCLU de la mesure de
robustesse au §2 (je n'ai pas observé son processus de fabrication).

**Lecture** : la branche variante produit systématiquement plus de lignes que la branche
contrôle sur les deux runs (+40 % en run1, +13 % en run2). Proxy de volume seulement — pas
une mesure de tokens consommés (aucune corrélation directe établie ici entre lignes écrites
et tokens de raisonnement/outillage dépensés pour les produire).

## 2. Proxy de robustesse (A) : corrections nécessaires sur le CODE DE JEU lui-même

Distinct de l'oracle (qui, lui, a eu besoin de 2 corrections en run1 — déjà documenté dans
`results.md` §3, ce n'est PAS une correction du code de jeu testé). Mesure : sur les
fichiers `game.mjs`/`level.mjs`/`render.mjs`/`input.mjs` que j'ai personnellement écrits et
observés dans cette session (run1/variant, run2/control, run2/variant — 3 constructions
sur 4 ; run1/control exclu, non observé), combien ont nécessité une réécriture après un
premier test en échec ?

```
run1/variant (render.mjs + input.mjs, isolation) : 0 correction — 25/25 dès la 1re exécution
run2/control (5 fichiers, agent unique)           : 0 correction — 25/25 dès la 1re exécution
run2/variant (5 fichiers, isolation)              : 0 correction — 25/25 dès la 1re exécution
```

**Sur les 3 constructions observées, aucun renvoi n'a été nécessaire côté code de jeu, ni
pour l'architecture agent-unique ni pour l'architecture agents-bornés-isolés.** C'est un
signal réel mais à faible portée : sur CETTE tâche (breakout, contrat R1-R20 très détaillé
dans `product_snapshot.md`, frontières de module déjà figées dans `blueprint.yaml`), la
contrainte d'isolation n'a coûté aucune friction de correction mesurable. Rien ne dit que ça
tiendrait sur une tâche moins spécifiée ou plus grande.

## 3. Proxy de robustesse (B) : overhead de « re-fondation du contrat » aux frontières d'isolation

Un agent unique (control) lit le contrat UNE fois et le garde en contexte pour les 5
fichiers. Un agent isolé (variant) doit, par construction du protocole, re-établir le
sous-ensemble du contrat qui le concerne à CHAQUE frontière (`level.mjs` seul, puis
`game.mjs` sans avoir vu le corps de `level.mjs`, puis `render.mjs`/`input.mjs` sans avoir vu
le corps de `game.mjs`). Proxy mesuré : nombre de lignes de commentaire consacrées à
documenter ce qui a/n'a pas été consulté et pourquoi (une charge que l'architecture
agent-unique n'a pas besoin de porter, car le contexte est implicite et partagé) :

```
run1/control : 14 lignes de commentaire (game+level+render+input.mjs)
run1/variant : 97 lignes de commentaire — ×6,9
run2/control : 21 lignes de commentaire
run2/variant : 30 lignes de commentaire — ×1,4
```

**Lecture** : l'écart se réduit fortement entre run1 (×6,9) et run2 (×1,4) — la sur-charge
documentaire de l'isolation n'est PAS un multiplicateur stable démontré ici ; elle dépend
fortement du style de rédaction du run précédent (run1 documentait très explicitement
chaque divergence trouvée, run2 moins). N=2 est encore trop peu pour trancher si cet écart
converge vers ~1 (surcoût négligeable) ou reflète un vrai coût structurel constant.

## 4. Conclusion — LIMITÉE

- **Ce que ceci établit** : sur les 3 constructions de code de jeu observées dans cette
  session, ZÉRO renvoi n'a été nécessaire, quelle que soit l'architecture. Le volume de
  code (+13 à +40 %) et l'overhead documentaire (×1,4 à ×6,9, décroissant) sont plus élevés
  côté isolation — cohérent avec l'intuition (payer la re-fondation du contrat à chaque
  frontière) mais mesuré seulement en proxy, pas en tokens/durée réels.
- **Ce que ceci NE établit PAS** : aucun chiffre de coût réel (tokens, minutes) au sens du
  protocole §3 — la source attendue (`forge_telemetry.jsonl`/`state.json`) n'existe pas
  pour cette expérience, parce que WFL-01 n'est jamais passé par le driver réel. Pour une
  vraie mesure de coût/robustesse au sens du protocole, il faudrait faire tourner une
  expérience équivalente À TRAVERS `scripts/forge/driver.py` — ce qui touche une zone
  gelée par décision Pierre antérieure (le driver n'a jamais piloté de run réel) et
  demanderait donc un nouveau feu vert explicite, pas une extension silencieuse.

```
software_verdict: OK (mesure proxy produite, limitation de méthode déclarée explicitement)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
