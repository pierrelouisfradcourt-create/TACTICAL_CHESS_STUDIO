# NOTE D'ARBITRAGE — runtime de la bibliothèque / studio de création

- **Date** : 2026-07-12
- **Statut** : PROPOSED — décision Pierre (aucune implémentation, aucun téléchargement engagé)
- **Question centrale** : transformer Forge en studio de création **sans casser le socle de validation existant** (HTML/JS/canvas/Playwright : run-oracle, mutation, solvabilité, e2e, capteur visuel s10d).

---

## 0. Le recadrage préalable (sinon on arbitre une fausse trilemme)

A / B / C ne sont pas trois choix de runtime mutuellement exclusifs :

- **A et B sont des runtimes** (des consommateurs de la bibliothèque).
- **C n'est pas un runtime.** C'est une **posture d'architecture** (« la bibliothèque est indépendante du moteur »). Elle est **orthogonale** à A/B : on peut adopter C *et* devoir quand même choisir un premier consommateur. **Une bibliothèque C sans consommateur validé ne nourrit rien de prouvé** — c'est de l'inventaire spéculatif, exactement le piège « collection de dépôts » / asset-flip déjà écarté (doctrine ratifiée : *primitive, jamais un dépôt brut* ; *réutiliser les systèmes, différencier la surface*).

Donc la vraie question n'est pas « A ou B ou C » mais : **quelle part de la bibliothèque est réellement agnostique au moteur, et quel consommateur peut la VALIDER en premier ?**

## 1. La décomposition qui dissout la trilemme

« La bibliothèque » n'est pas un bloc. Elle a 4 couches, de portabilité très différente :

| Couche | Portable entre moteurs ? | Validation | Coût |
|---|---|---|---|
| **Connaissance / patterns** (règles Wesnoth, procgen SPD, systèmes Veloren) | **OUI, totalement** (une idée n'a pas de runtime) | advisory, cité (comme world-scan) | faible |
| **Métadonnées / manifest** (schéma asset & système, provenance, licence) | **OUI par construction** (c'est de la donnée) | gate non-LLM trivial | faible |
| **Fichiers assets** (modèles 3D, textures, sprites, sons CC0) | **Octets portables, MAIS** utiles seulement à un runtime de même dimensionnalité (un 3D KayKit est inutile en canvas 2D) ; leur validation « ça rend bien » est **spécifique au moteur** (screenshot in-engine) | gate visuel du consommateur | moyen |
| **Systèmes en CODE** (combat, inventaire, IA…) | **NON** (scene tree + GDScript ≠ machine à états JS → réimplémentation, pas réutilisation ; l'« adapter » est une illusion) | tests du consommateur | élevé |

**Conséquence directe** : la partie *pérenne et agnostique* de la bibliothèque (connaissance + métadonnées) est **cheap, sans risque, et survit à n'importe quel moteur gagnant**. La partie *chère et non-portable* (assets 3D, systèmes-code) est **liée à son consommateur et à SON validateur**.

## 2. Les trois options, évaluées honnêtement

### OPTION A — track HTML/canvas actuel
- **Réel** : le validateur existe **aujourd'hui** (oracles + s10d prouvés P0/P1). Coût d'infra ≈ 0. Risque faible. Boucle de preuve immédiate.
- **Limite vraie** : plafond artistique 2D ; les assets 3D CC0 (Quaternius/KayKit/PolyHaven) et les addons Godot **n'ont aucun sens ici**. Kenney (UI/tiles/sons 2D) et la couche connaissance, si.
- **Verdict** : c'est le **seul consommateur validable maintenant**. Excellent comme *premier* consommateur, insuffisant comme *ambition finale*.

### OPTION B — nouveau track Godot
- **Réel** : c'est la production « vrai studio » (3D, scènes, assets riches) — l'ambition de surface.
- **Coût caché, décisif** : il faut **reconstruire tout P0 pour Godot** avant de pouvoir valider un seul asset ou système : runner headless, capture visuelle in-engine, oracle logique (GUT), bot de solvabilité, mutation GDScript, équivalent s10d. C'est un chantier de plusieurs incréments, **et rien ne prouve que l'investissement P0/P1 se transfère** — il faut le re-prouver. **Godot-first inverse l'ordre prouvé** (on ne peut pas prouver une bibliothèque Godot avant le validateur Godot).
- **Atout existant à ne pas rater** : chess_tcg a **déjà un moteur de règles Godot headless testé (83/83)** — c'est un point de départ concret pour prototyper le validateur Godot, ce qui réduit (sans annuler) le coût de B.
- **Verdict** : justifié comme **ambition**, mais **jamais en « on suppose que ça marche »** — doit être son propre cycle expérimental gaté.

### OPTION C — couche bibliothèque indépendante du moteur
- **Réel** : correcte comme *posture*, mais (cf. §0) **ne se suffit pas** : sans consommateur validé, elle ne prouve rien.
- **Bien lue** (via la décomposition §1) : C est la bonne architecture **pour les couches connaissance + métadonnées**, pas pour les assets/systèmes qui sont, eux, liés au consommateur.
- **Verdict** : à adopter **restreinte aux couches agnostiques**, pas comme substitut à un consommateur.

## 3. Recommandation

**Hybride « C-restreint / A-first / B-gaté ».** Concrètement :

1. **Adopter C uniquement pour ce qui est réellement agnostique** : la couche **connaissance/patterns** (advisory, cité, jamais de code — GPL) et le **schéma de métadonnées/manifest** (provenance + licence obligatoires). Cheap, pérenne, survit au choix de moteur. C'est l'actif de long terme.
2. **A comme premier — et pour l'instant unique — consommateur validé** : nourrir un prototype HTML/canvas avec la couche connaissance + les assets 2D (Kenney), et **prouver** qu'un prototype consommant la bibliothèque passe les gates existants (solvabilité + s10d). Boucle de preuve fermée dès le premier increment, zéro infra nouvelle.
3. **B comme track futur explicitement gaté** : Godot n'admet RIEN dans la bibliothèque tant que son validateur n'existe pas. Le premier increment B n'est **pas** « télécharger des assets 3D » — c'est **« construire et prouver un validateur Godot minimal »** (en s'appuyant sur le moteur headless chess_tcg), traité comme un cycle expérimental à part entière, ratifié séparément.

**Rejeté** : *B pur maintenant* (inverse l'ordre prouvé, coût massif, transfert non prouvé). *A pour toujours* (plafonne l'ambition, gâche définitivement les sources 3D). *C naïf* (bibliothèque qui nourrit un gate aveugle = inventaire spéculatif).

**Pourquoi ça répond à la question centrale** : le socle de validation n'est jamais cassé (A le réutilise tel quel ; B doit d'abord *construire* le sien, pas contourner) ; et l'ambition Godot reste ouverte sans être payée avant d'être prouvée.

## 4. Risques (ordre de gravité)

1. **Admission sans validation (le vrai risque, pas le runtime).** Si la bibliothèque admet des assets/systèmes qu'aucun consommateur n'a validés en jeu, elle devient l'inventaire asset-flip. **Invariant liant** : rien n'entre dans le tier « validé » sans avoir passé le gate d'un consommateur. Le tier connaissance reste *advisory* (comme world-scan), jamais injecté comme code.
2. **Le piège « on suppose que Godot marche »** : démarrer B en téléchargeant des assets 3D avant d'avoir le validateur → mois de travail sur une base non prouvée. Mitigation : B commence par SON validateur, gaté.
3. **Contamination GPL** : Wesnoth/Veloren/SPD sont GPL → connaissance/patterns **only**, jamais de code (advisory, cité). Assets CC0 : manifest provenance/licence obligatoire.
4. **Prolifération de référents** : un knowledge base = risque de 4e référent mémoire. Le scoper sous une structure existante (`assets/` + `studio_brain/`), jamais un système concurrent.
5. **Report des sources 3D** : Quaternius/KayKit/PolyHaven sont différés au consommateur B — assumé, pas gâché (leur valeur ne s'active qu'avec leur validateur).

## 5. Coût (ordres de grandeur, solo + IA — pas des claims)

| Bloc | Coût | Quand |
|---|---|---|
| Couche connaissance + schéma métadonnées (C-restreint) | **faible** (1 increment) | maintenant |
| Noyau assets 2D + prototype HTML consommateur + preuve gates (A) | **faible-moyen** (1-2 increments) | maintenant |
| Validateur Godot minimal (runner headless + capture + oracle + solvabilité), base chess_tcg (B, prérequis) | **élevé** (plusieurs increments, cycle expérimental) | plus tard, gaté |
| Assets 3D + systèmes Godot dans la bibliothèque (B, suite) | **moyen-élevé** | après validateur B prouvé |

## 6. Ordre des étapes (falsifiable, premier pas ne touche ni Godot ni download)

1. **Ratifier cette note** (ou redresser l'arbitrage).
2. **Increment 1 (agnostique, cheap)** : figer le **schéma de métadonnées** (asset + système) et amorcer la **couche connaissance** (2-3 patterns extraits de Wesnoth/SPD, cités, advisory, zéro code). Aucun téléchargement. Preuve : le schéma valide un manifest, un pattern est cité et lu en advisory.
3. **Increment 2 (A, boucle de preuve)** : noyau minimal d'assets **2D** (Kenney) + un **prototype HTML** qui consomme catalogue→JSON→jeu, et **passe solvabilité + s10d**. Preuve : le prototype forgé depuis la bibliothèque est vert aux gates existants. Download 2D gaté Pierre.
4. **Décision Pierre** : ouvrir ou non le track B. Si oui → **cycle expérimental « validateur Godot minimal »** (contrat + red-team + expérience, gabarit `P1_1_PROTOCOL.md`), en partant du moteur headless chess_tcg. Rien de 3D n'entre avant que ce validateur soit prouvé.
5. Seulement ensuite : assets 3D + systèmes dans le tier validé de la bibliothèque.

---

## Rapport de charter
```
software_verdict: (aucun — note d'arbitrage, aucun code)
evidence_verdict: MECHANICAL_VALIDATION_ONLY (état runtime vérifié par lecture du repo : socle 100% HTML/JS, s10d présent, Godot uniquement archivé/chess_tcg)
claim_verdict: NO_CLAIM_ALLOWED
```
```
