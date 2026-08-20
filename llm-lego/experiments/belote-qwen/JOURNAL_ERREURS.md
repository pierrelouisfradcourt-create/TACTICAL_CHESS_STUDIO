# JOURNAL DES ERREURS — Belote (QWEN, piloté par Claude Code)

> Code écrit par **Qwen** (qwen/qwen2.5-coder-14b via LM Studio), **piloté et supervisé par
> Claude Code**. Chaque module : prompt Qwen → Claude lit → teste RÉELLEMENT → si erreur,
> RE-PROMPTE Qwen (jamais corrigé silencieusement par Claude) → documente.
> Comparaison directe avec `../belote-claude/JOURNAL_ERREURS.md`.
> Source : session 2026-07-04. Modèle Qwen coder-14b, température 0.2.

---

## Module `cards` — barèmes & ordres de force (3 itérations Qwen)

### Q-E1 — Qwen ignore le barème ATOUT de la belote (Valet=20, 9=14)
- **Quoi** : 1re version : UN seul barème de points (Valet=2, 9=0, …) appliqué à toutes les
  couleurs. À l'atout, le Valet vaut 20 et le 9 vaut 14 — Qwen l'ignore. Total des points
  cartes = 93 au lieu de 152 (invariant belote cassé).
- **Test réel** : `test/cards.test.mjs` (invariant 152, V atout=20, 9 atout=14) → 3/4 ÉCHECS.
- **Re-prompt Claude** (pas corrigé par Claude) : signalé l'échec + rappel du barème atout.
  → Qwen corrige le barème (152 ✓) mais introduit/garde 2 bugs (voir Q-E2).
- **Comparaison Claude** : Claude n'a JAMAIS fait cette erreur — il connaissait le barème
  atout dès la 1re version (son E1 portait sur la distribution, pas les points cartes).
- **Meilleur prompt** : fournir la fiche de barème (atout: V=20,9=14,A=11,10=10,R=4,D=3 ;
  hors-atout: A=11,10=10,R=4,D=3,V=2,reste=0). Qwen ne connaît pas le barème atout « de tête ».

### Q-E2 — Ordre de force atout : bon tableau, mais CONVENTION de comparaison inversée
- **Quoi** : après re-prompt, `ATOUT_ORDER=['V','9','A',…]` est correct, mais
  `compareCards = indexOf(a)-indexOf(b)` → le plus fort (index 0) sort NÉGATIF. `V > 9` renvoie
  −1 au lieu de positif. Bug de signe/convention, pas de données.
- **Test réel** : « ordre de force atout : V > 9 > A » → ÉCHEC (actual false).
- **Re-prompt #2** : expliqué l'inversion de signe. → Qwen corrige. 4/4 verts.
- **Comparaison Claude** : non rencontré côté Claude.

### Q-E3 — Rangs français/anglais mélangés (R,D,V vs K,Q,J), 9/8/7 absents de l'ordre hors-atout
- **Quoi** : `NON_ATOUT_ORDER=['A','10','R','D','V','K','Q','J']` — mélange R,D,V (français,
  utilisés dans RANKS) et K,Q,J (anglais, jamais reconnus) ; 9,8,7 absents.
- **Note** : Qwen a IGNORÉ ce point au 1er re-prompt (ne l'a corrigé qu'au 2ᵉ, explicitement).
- **Comparaison Claude** : non rencontré (Claude cohérent sur les rangs dès le départ).

**Bilan `cards`** : 3 itérations Qwen pour un module que Claude a réussi du 1er coup.
Erreurs SPÉCIFIQUES à Qwen (méconnaissance du barème belote + convention de tri), pas
d'ambiguïté du prompt partagée avec Claude.

<!-- suite : deal, rules, scoring, bidding, game, vrai test de jeu -->

---

## Module `deal` — distribution (3 itérations Qwen)

### Q-E4 — Import cassé : `createDeck` alors que cards.mjs exporte `buildDeck`
- Qwen invente un nom de fonction absent du module qu'il importe. Bug d'INTÉGRATION.
- **Comparaison Claude** : Claude cohérent sur ses propres noms (jamais ce type de mismatch).

### Q-E5 — Même erreur que Claude (E1) : distribution en UN temps, 8 cartes → talon vide
- **Quoi** : `distributeCards` donne 8 cartes à chacun (32) PUIS `deck.shift()` pour la carte
  retournée → paquet déjà vide, `turnUp = undefined`. IDENTIQUE à l'E1 de Claude.
- **ERREUR COMMUNE Claude+Qwen** → indique que le prompt « distribue les cartes » est ambigu
  (ne dit pas « distribution en deux temps »), indépendamment du modèle.
- **Différence de RÉCUPÉRATION** : re-prompté OUVERTEMENT (« vérifie la mécanique belote/enchère »),
  Qwen N'A PAS trouvé le deux-temps — il a juste renommé/scindé la fonction cassée
  (distributeInitialCards + distributeTrumpCard, même bug). Claude, LUI, a dérivé le deux-temps
  seul (test-first : « attendait 5 cartes + turnUp + talon 11 »). Il a fallu SPELL OUT la
  mécanique complète à Qwen (5+retourne+enchère+complément à 8) pour qu'il corrige.
- **Résultat après spec explicite** : deal()/completeDeal() corrects (5/joueur, turnUp, talon 11 ;
  puis 8/joueur, preneur a turnUp, 32 conservées). 2/2 tests verts. (Interface : Qwen renvoie
  {hands,talon} au lieu d'un tableau — adapté côté test, choix acceptable.)

## Module `rules` — obligations de jeu (1 itération, INCOMPLET)

### Q-E6 — Noms ANGLAIS au lieu du modèle français de cards.mjs (récurrent)
- `atouts=['hearts','diamonds']` hardcodé, `['king','queen']` pour la belote — alors que
  cards.mjs expose 'COEUR'/'CARREAU'… et 'R'/'D'. Mismatch d'intégration SYSTÉMATIQUE chez Qwen
  (déjà vu en deal : createDeck). Claude n'a jamais ce problème (cohérence interne).

### Q-E7 — Coupe obligatoire : PRÉSENTE en forme basique, mais nuances manquantes
- `legalMoves` : fournir la couleur sinon jouer atout (= coupe obligatoire de base ✅). MAIS
  manquent : monter à l'atout / SURCOUPER, liberté si le PARTENAIRE est maître, cas meneur.
- **Comparaison Claude** : Claude avait TOUTES les obligations (fournir, monter, couper,
  partenaire-libre) + un audit indépendant les exerçant (coupe 62×, surcoupe 15×…).
  Qwen a la coupe de base mais pas les nuances — module non finalisé dans cette passe.

---

## COMPARAISON PARTIELLE Claude vs Qwen (modules cards, deal, rules)

| Critère | Claude | Qwen (coder-14b) |
|---|---|---|
| Barème atout (V=20,9=14) | Correct d'emblée | Ignoré ; 3 itérations pour cards |
| Ordre force atout | Correct d'emblée | Faux, puis convention de signe inversée |
| Cohérence noms (rangs/couleurs) | Cohérent | Mélange FR/EN récurrent (createDeck, hearts, king) |
| Distribution 2 temps (E1) | Erreur initiale MAIS auto-corrigée | Même erreur, NON auto-corrigée (spec explicite requise) |
| Coupe obligatoire | Complète (+ surcoupe, partenaire) | Base seule, nuances manquantes |
| Itérations pour un module vert | ~1 (test-first) | 3 (cards), 3 (deal) |

**Erreurs COMMUNES (→ ambiguïté du prompt, pas du modèle)** : distribution en deux temps (E1/Q-E5).
**Erreurs SPÉCIFIQUES Qwen** : méconnaissance du barème belote, convention de tri, mismatch de
noms FR/EN à chaque frontière de module, non-dérivation de la mécanique quand re-prompté ouvertement.
