# Product Snapshot — Lens Joueur (WFL-02, panel ×5, coup A1)

> **Étape Forge (simulée)** : 1 — Prisme Produit, regard Joueur
> **run_id** : breakout-20260711 (charter réutilisé de WFL-01, sha256 identique)
> **isolation** : écrit en ne consultant QUE `shared/charter.yaml` — jamais les autres
> lenses de ce panel, jamais le contrôle.
> **point de vue imposé** : quelqu'un qui s'assoit devant le jeu sans rien savoir de sa
> fabrication, ne pense ni en code ni en business — juste « est-ce que c'est agréable et
> juste à jouer, là, maintenant ».
> **claim_verdict** : NO_CLAIM_ALLOWED.

## 1. CE QUE LE JOUEUR VOIT

Je m'assois, la partie est déjà prête — pas de menu à traverser, pas de tutoriel forcé.
Je vois tout de suite ce qui compte : où est ma raquette, où va la balle, combien de
briques il reste, combien de vies j'ai. Rien de superflu qui me distrairait de ces 4
informations. Quand je gagne ou que je perds, ça se voit d'un coup d'œil — pas besoin de
deviner.

## 2. CE QUE LE JOUEUR FAIT

Je pose mes doigts sur les flèches (ou Q/D), et ça répond IMMÉDIATEMENT — le moindre
délai entre ma touche et le mouvement de la raquette casse la confiance. Je découvre par
moi-même que taper la balle du bord de la raquette l'envoie plus sur le côté — personne
ne me l'a expliqué, je l'apprends en jouant, et une fois compris je peux VISER
volontairement. Si je perds, je relance en un geste (`#restart`), sans y réfléchir.

## 3. CE QUE LE JOUEUR RESSENT

Je veux ressentir que c'est MOI qui ai perdu, pas le jeu qui m'a trahi — si la balle
disparaît sous ma raquette sans que j'aie eu ma chance de réagir, ou si elle rebondit
« bizarrement » sans raison visible, je me sens floué, pas juste battu. À l'inverse,
enchaîner plusieurs briques d'affilée avec un bon angle doit me donner un vrai coup de
satisfaction — le jeu doit récompenser le geste précis, pas juste la persévérance.
Terminer une partie (gagnée ou perdue) doit me laisser sur une sensation claire, jamais
sur un doute (« est-ce que c'est fini, ou pas ? »).

## 4. RÈGLES OBSERVABLES (priorisées : équité perçue et réactivité — le vécu, pas le système)

- **R1 — Réponse immédiate au clavier.** Le mouvement de la raquette doit suivre la
  touche sans délai perceptible — pas de temporisation artificielle entre l'appui et le
  déplacement. *Preuve :* e2e — touche pressée, lecture de `paddle.x` au tick suivant,
  déplacement effectif dès le premier `step` après l'appui.
- **R2 — Je ne perds jamais une vie « sans voir venir ».** La balle qui passe sous la
  raquette doit être une trajectoire que j'ai pu suivre à l'écran — aucune téléportation
  ni saut de position d'un frame à l'autre. *Preuve :* le déplacement de la balle entre
  deux frames reste borné par sa vitesse × le pas de temps, jamais un saut disproportionné.
- **R3 — Un bon impact « paye » visiblement.** Taper la balle près du bord de la raquette
  produit un angle de sortie clairement plus latéral qu'un impact au centre — un joueur
  qui expérimente doit pouvoir SENTIR la différence, pas seulement la lire dans un
  changelog. *Preuve :* comparaison stricte des angles de sortie pour 3 points d'impact
  distincts (centre, bord gauche, bord droit).
- **R4 — La fin de partie est SANS AMBIGUÏTÉ.** Victoire et défaite doivent afficher un
  message distinct, immédiatement visible, sans action supplémentaire du joueur pour le
  découvrir. *Preuve :* `#overlay` affiche un libellé différent pour chaque issue
  (critère charter « CONTRAT DE JOUABILITÉ RESPECTÉ »).
- **R5 — Recommencer coûte un geste, pas une réflexion.** `#restart` doit ramener
  instantanément à une partie neuve et jouable, sans état résiduel de la partie
  précédente visible (score/vies/niveau remis à l'état de départ). *Preuve :* après clic
  sur `#restart`, `window.__game_debug` reflète l'état initial exact.

## Traçabilité — ancrage au charter

R1/R2/R3 découlent de « raquette contrôlée au clavier » + « physique de rebond réelle,
angle dépendant du point d'impact » (charter), reformulés en équité perçue plutôt qu'en
formule. R4/R5 découlent du critère « CONTRAT DE JOUABILITÉ RESPECTÉ ». Aucune règle
nouvelle hors charter — seule la priorité (le vécu immédiat, jamais l'implémentation) est
spécifique à ce regard.

```
software_verdict: (aucun — artefact narratif)
evidence_verdict: (aucun — pas d'exécution)
claim_verdict: NO_CLAIM_ALLOWED
```
