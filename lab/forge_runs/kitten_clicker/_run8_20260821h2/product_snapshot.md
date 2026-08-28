I now have the complete, exact contract from the three oracles that will judge this artifact:
- **`check_prisme_manifest.mjs`** (hard verdict): per exigence — non-empty `id`; `observation`/`claim`/`enonce` all present *and mutually distinct* after normalization; valid provenance (`EXPECTED`→non-empty reference, `ADDITIONS`→`reference` present and exactly `null`); no duplicate ids; ≥1 actionnable (valid `expected_proof{kind,statement}` + valid `destination`).
- **`check_prisme.mjs`** (markdown): 4 sections with the exact title substrings, ≥40 chars each, ≥1 `- **Rn` rule, no placeholders.
- **`loop_spec.mjs`** (derived downstream): full loop A→J with every step carrying `observe{hud,predicate}`, G≥2 `new_distinct` same hud, F with `observe.appears`, H `replay` of B..F ids, I with `affordance`, J `replay_ref`=a B id + `predicate`=`increases_more_than:<that id>`.

Addresses confirmed resolvable via `canonicalize` (story_bible/gm_worldscan by section/dimension id; worldscan by JSON path). One honest gap surfaced by the s2.6 return: project-specific narrative matter (quests/events) has **no grounded upstream producer** — so my quest requirement is declared `ADDITIONS`, not a fabricated `EXPECTED`.

Below is `product_snapshot.md`, then the terminal `prisme.json` block.

---

# Kitten Clicker — Instantané Produit (product_snapshot.md)

Le produit fini est un clicker de chatons mignons sur Godot 4.6.3 desktop. Ce document décrit ce que le joueur **voit**, **fait** et **ressent** dans le jeu terminé, puis les **règles observables** qui rendent chacune de ces promesses testable. Ancres : `charter.yaml` (objectif, criteres_demo a–h, criteres_succes), `worldscan` (Cookie Clicker / Neko Atsume / AdVenture Capitalist), `story_bible` (context, characters, coherence_rules GROUNDED), `gm_worldscan` (progression, economy, rarity, bonus, metagame MEASURED).

## 1. CE QUE LE JOUEUR VOIT

À l'écran, un **refuge** chaleureux occupe le centre : une grosse **pelote de laine** (avec, selon le lieu, une pâtée et un coussin) qui invite au clic. En haut, un **compteur de RONRONS** affiché en clair, et à côté un **taux de production** (ronrons par seconde). Une **bannière d'objectif** montre en permanence le but courant en une phrase lisible. Sur les côtés : une **boutique** (acheter un chaton, acheter une amélioration) et une **collection** de chatons déjà recueillis. Chaque chaton possède une **identité visuelle distincte selon sa rareté** — commune, rare, légendaire discernables à l'œil (silhouette et palette différentes). Au moins **deux lieux** existent : le refuge de départ et un lieu débloqué par la méta-progression (par exemple un jardin), avec un sélecteur de lieu. Au moins **trois objets** identifiables (pelote, pâtée, coussin) et **trois petites quêtes** dont l'objectif est visible (texte ou jauge). Un **bouton de prestige** apparaît quand la méta-progression est atteignable. Le clic déclenche un **feedback visuel explicite** (la pelote rebondit, une particule ronron s'envole).

## 2. CE QUE LE JOUEUR FAIT

Le joueur **clique la pelote** pour produire des ronrons, puis **achète des chatons** qui produisent des ronrons automatiquement, sans clic. Il **achète des améliorations** qui accélèrent la production et **débloque de nouveaux chatons et un nouveau lieu**. Il suit la **bannière d'objectif**, qui lui donne un but après l'autre. Une fois assez avancé, il **déclenche le prestige** : il remet ses ronrons à zéro en échange d'un **bonus permanent**, puis **recommence la boucle** dans un état plus favorable — les mêmes gestes (cliquer, acheter, améliorer, débloquer) rapportent désormais davantage. Un **bot-joueur déterministe** peut jouer seul et atteindre le 3e palier en un nombre de ticks fini, ce qui prouve la solvabilité. Il n'y a **aucun combat, aucune défaite** : le joueur ne peut pas perdre, seulement progresser.

## 3. CE QUE LE JOUEUR RESSENT

Le jeu procure une **satisfaction immédiate** au clic (retour visuel et sonore instantané), puis le **plaisir de voir la production tourner seule** — la sensation de transition de l'actif vers le passif propre au genre. La **collection de chatons mignons** crée un attachement affectif et une envie de complétion ; la rareté distincte donne le frisson de la trouvaille. La **courbe de paliers** entretient un sentiment de montée en puissance exponentielle, chaque palier plus gros que le précédent. Le **prestige** offre une fantaisie de puissance : tout remettre à zéro pour repartir plus fort. L'ensemble reste **apaisant et sans stress** (registre zen, aucun état d'échec), aligné sur l'identité mignonne non négociable de la coherence_rule GROUNDED de la story_bible.

## 4. RÈGLES OBSERVABLES

- **R1** — Au clic sur la cible `pelote`, le compteur de ronrons affiché monte **strictement** à chaque clic (comportement `== n+1`, jamais un `>=` tautologique). [charter criteres_demo MÉCANIQUE 1 ; worldscan:games[0].loops.minute_1]
- **R2** — Après un achat de chaton via `acheter_chaton`, un **sprite de chaton devient visible** dans la scène du refuge. [charter MÉCANIQUE 2]
- **R3** — Un chaton acquis fait **monter les ronrons à l'écran sans aucun clic** (production automatique visible). [charter MÉCANIQUE 3 ; worldscan:games[0].loops.minute_10]
- **R4** — Après achat d'une amélioration via `acheter_amelioration`, le **taux de production affiché est strictement plus rapide** qu'avant. [charter MÉCANIQUE 4 ; gm_worldscan:bonus]
- **R5** — La collection compte **au moins 6 chatons nommés**, répartis sur 3 raretés **visuellement distinctes** (commune / rare / légendaire). [charter (a) ; story_bible:characters ; gm_worldscan:rarity]
- **R6** — Le jeu offre **au moins 2 lieux jouables**, dont au moins un débloqué par la méta-progression au-delà du refuge initial. [charter (b), criteres_succes]
- **R7** — Au moins **3 objets identifiables** sont présents à l'écran (pelote, pâtée, coussin). [charter (c) ; story_bible:context]
- **R8** — Au moins **3 petites quêtes** affichent leur objectif à l'écran (texte ou jauge d'avancement). [charter (d)]
- **R9** — Chacun des 4 événements (clic, achat, déblocage, prestige) déclenche un **son distinct et reconnaissable**, journalisé par un oracle audio. [charter (e)]
- **R10** — Le clic produit un **feedback visuel explicite** (la pelote rebondit ou une particule ronron s'envole). [charter (f) ; worldscan:games[0].loops.minute_1]
- **R11** — La courbe des paliers affiche **au moins 3 valeurs distinctes non triviales** à l'écran (règle de variance des métriques). [charter (g) ; gm_worldscan:economy]
- **R12** — La bannière d'objectif montre toujours le but courant ; à chaque étape franchie, un **nouvel objectif textuellement distinct** remplace le précédent sur le même affichage. [gm_worldscan:metagame]
- **R13** — Le prestige remet les **ronrons à zéro à l'écran** et accorde un bonus permanent ; après prestige, un clic identique rapporte **strictement plus** de ronrons qu'avant. [worldscan:games[2].loops.hour_5 ; gm_worldscan:bonus]
- **R14** — Un **bot-joueur déterministe atteint le 3e palier** en un nombre de ticks fini (solvabilité), et le jeu n'expose **aucun état de défaite**. [charter (h), MÉCANIQUE 5 ; gm_worldscan:progression]
