# Chess TCG — Générateur unifié (candidat)

status: DOCUMENTED_ONLY
claim_verdict: NO_CLAIM_ALLOWED

## Authority Boundary
Candidat de conception. N'implémente rien, ne génère aucune carte, n'autorise aucun claim d'équilibrage.
Fusionne deux sources récupérées :
- **A — Budget de puissance** = `04_RNG_FORMULA_CANON.md` (budgets pièce, tables de coûts, taxes, combos interdits, repair order). Rigoureux, équilibrable, codable.
- **B — Graphe sémantique / name-driven** = `docs/tcg/recovery/incoming/chatgpt_mega_matrice_generation_carte_rng.md` (récupéré du ChatGPT « chess data centralisation »). Le **nom pilote le gameplay** via des **tags → effets** ; ~40-60 matrices ; millions de cartes cohérentes.

## Principe de fusion : **B propose, A dispose**
La matrice B le dit elle-même : « toutes les couches sont **contraintes par un budget de puissance** pour éviter les
cartes absurdes ». La fusion n'invente rien — elle **branche** le générateur d'identité de B sur le **validateur
budgétaire** de A. B est le **moteur de créativité** (identité, tags, effets, lore, IA, VFX) ; A est l'**oracle
d'équilibrage** (coûts, budget, anti-abus, réparation, rejet).

## Pipeline unifié (candidat)
```
1. SEED + CONTEXTE            (A) : pièce → budget (Pion4/Cav6/Fou6/Tour7/Reine8/Roi9) ; rareté (common60/unco30/rare10, rare=+1) ; faction
2. IDENTITÉ (grammaire)       (B) : [Titre]+[Race]+[Couleur]+[Origine]+[Épithète]… → NOM
3. ACCUMULATION DE TAGS       (B) : parcours du graphe sémantique → set de tags (ex. Dragon+Blanc+Bleu → Feu,Vol,Ancien,Sacré,Glace,Arcane,Vision,Mana…)
4. RÉSOLUTION EFFETS BRUTS    (B) : tags → effets/stats candidats + synergies (double/triple/quadruple) + antagonismes (Saint+Démon → « Déchu »)
5. COMPTABILITÉ BUDGÉTAIRE    (A) : coût = Σ(stats + géométrie + portée + interaction + effets) via tables 04 ; comparer au budget
6. FILTRE ANTI-ABUS           (A+B) : combos interdits A (freeze+ligne complète, charme+zone, stun+portée>3, double debuff majeur) ∪ antagonismes B
7. RÉPARATION SI HORS-CIBLE   (A) : downgrade portée → géométrie → effet secondaire → ATK → HP → ARM → restriction → rejet (ordre 04)
8. CONDITIONS DE REJET        (A) : combo interdit persistant / budget dépassé / lisibilité basse / identité faction cassée / répond à trop de problèmes
9. SORTIES DÉRIVÉES (flavor)  (B) : VFX/SFX, lore, personnalité IA, comportement — **dérivés des mêmes tags, hors budget d'équilibrage**
10. CARTE FINALE              : stats + capacités + tags + coût + rareté + nom + texte + hints cosmétiques
```

## Séparation stricte des responsabilités (règle de déterminisme)
| Couche | Rôle | Impacte l'équilibrage ? |
|---|---|---|
| Graphe sémantique + tags (B) | créativité, identité, effets candidats | **oui** — passe par A |
| Budget + coûts + repair (A) | validation, normalisation, équilibrage | **oui** — autorité finale |
| VFX/SFX/lore/IA/personnalité (B §multi-couches) | flavor | **non** — cosmétique, jamais de bonus caché |

> **Invariant** : aucun tag ne produit un bonus mécanique sans passer par la comptabilité budgétaire A.
> Le flavor (couleur, particules, dialogue) est gratuit ; le gameplay est **toujours** payé sur le budget.

## Décisions ouvertes que la fusion NE tranche pas (→ HumanGate, voir 07_OPEN_DECISIONS)
- **Profondeur du graphe pour v1** : full graphe sémantique (millions de cartes) vs sous-ensemble borné (ex. 6 factions × rôles) → périmètre v1.
- **Table de conversion tags→effets** : B liste des exemples (Feu→+2 dégâts feu…) mais pas une table exhaustive chiffrée. À formaliser = la « matrice de légalité de génération » (genesis §39 n°1).
- **Le name-driven est-il produit ou flavor ?** : si le nom impose des tags mécaniques, il entre dans le budget (lourd à équilibrer) ; sinon il reste cosmétique. Décision de design forte.
- **Compatibilité lignée** : ce générateur est **lignée T** (HP/ATK/ARM). La lignée C (Crown, DEF/PM/niveaux, 50 cartes fixes) n'utilise PAS de générateur. Ne pas mélanger les deux échelles.

## Statut d'implémentation
`NOT_FOUND` — aucun code. Ni A ni B n'ont jamais existé en exécutable (confirmé : ChatGPT classe cartes/RNG en
« roadmap / idea dump, pas vérité runtime »). Ce document = spec candidate pour un futur générateur Python, **après**
que le moteur de règles pur (lignée T) soit codé et testé. Le générateur n'est PAS sur le chemin critique du moteur.
