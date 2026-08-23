# Kitten Clicker — la décision significative (V2, définition ratifiée conceptuellement par Pierre le 2026-08-23)
*Date : 2026-08-23 · Source : Fable (proposition V1) + corrections Pierre (point 5 généralisé, point 6 ajouté, idle/actif = hypothèse).
Branches A/B confirmées par Fable. Aucun code, aucun oracle, aucune demande à la Forge tant que Pierre n'a pas donné le GO « contrat exécutable ».*

## Définition figée
> Une décision significative dans Kitten Clicker est un choix entre au moins deux dépenses disponibles et compréhensibles
> qui produit des états futurs différents, modifie les possibilités futures, et dont la valeur dépend de la situation ou de
> la politique de jeu du joueur.

Forme contre-factuelle (le cœur, ratifié) :
```text
même état initial ─┬─ trajectoire A : ADOPTER
                   └─ trajectoire B : AMÉLIORER
        → états futurs différents → possibilités différentes → trajectoires économiques différentes
```

## Les deux branches (confirmées)
- **A ADOPTER un chaton** → production passive +X/s ; le chaton apparaît ; ouvre l'affordance « placer au jardin » (n'existe que si ≥ 1 chaton).
- **B AMÉLIORER la pelote** → valeur du clic ×2 ; ouvre l'affordance « caresse longue » (n'existe que si la pelote est améliorée).
- Exclusives à l'instant du choix ; le coût de l'option prise monte selon une courbe propre à chaque branche.
- **Hypothèse de balance (à tester, PAS une vérité de design)** : A meilleur en idle, B meilleur en actif. Première situation expérimentale.

## Les six preuves (écran + InputEvent seulement ; deux trajectoires depuis le même état)
1. **INFORMATION** — ≥ 2 achats disponibles, coût visible, effet annoncé : le joueur sait ce qu'il arbitre.
2. **CHOICE / DIFFÉRENCE** — Run A ≠ Run B : même état initial, seule la décision diffère ; comparer l'état observé (vecteur HUD + ensemble d'affordances), pas des textes.
3. **IMMEDIATE CONSEQUENCE** — A → A', B → B' : le HUD change ≤ 30 frames après le choix, et A' ≠ B'.
4. **FUTURE POSSIBILITY** (la plus importante) — Affordances(A') ≠ Affordances(B'), ou coûts / production / objectifs futurs différents. Évite le faux choix « deux boutons, même résultat ».
5. **NON-DOMINANCE** — il existe ≥ 2 politiques/situations plausibles (X, Y) telles que A est préférable en X et B en Y, avec une différence mesurable sur un horizon fixe. (idle/actif = candidat X/Y, pas la définition.)
6. **PLAYER GOAL** — la décision est reliée au but du joueur : deux options mathématiquement différentes mais indistinctes pour le joueur ne sont pas une décision. Mesure sans LLM : `objectif(A') ≠ objectif(B')`, chaque objectif nommant la possibilité que la branche a ouverte (ex. « place ton chaton au jardin » vs « tente une caresse longue »).

## Lecture du run 8b sous cette définition (sans rejouer)
1 partiel (4 boutons visibles, ordre dicté par le contrat) · 2–4 non mesurées (une trajectoire) · 5 non évaluable · 6 faux (objectifs = même phrase à numéro près).
Le HumanGate FAIL tient à la structure linéaire du test autant qu'au jeu.

## État
Définition : RATIFIÉE (conceptuelle, Pierre 2026-08-23). Branches A/B : confirmées. Contrat exécutable / sonde à deux trajectoires : **NON DEMANDÉ** — attend un GO explicite.
Interdits maintenus : oracle LLM, station, profil, narration, architecture, « plusieurs heures », vocabulaire STANDARD/Prisme, reuse, red-team.
