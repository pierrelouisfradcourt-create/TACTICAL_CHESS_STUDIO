# Kitten Clicker — Game Loop Architecture Contract V1.2 (Lot C.3, **RATIFIÉ Pierre 2026-08-24** — réserve méthodologique : le 6/10 architectural est un DIAGNOSTIC de la Forge actuelle, JAMAIS un niveau acceptable pour passer au WireMap ; la WireMap exige 10/10 et un design où elle n'invente rien)
*V1.2 : passe 2 (0 invention, verdicts reproduits) — colonne « Débloque » définie comme BOUCLE(S) AVAL (= NEXT_LOOP ; l'artefact produit reste dans « Produit »), cellules corrigées, casse unifiée, source du verdict mesuré citée.*
*V1.1 : corrections après test à contexte vierge (3 contradictions, 5 questions) — 14ᵉ champ MÉTRIQUE_PROPRE explicité, double verdict de complétude (architecturale / mesurée), colonne World corrigée, statuts « à créer » vs « à renforcer » définis, exception de la boucle 10 assumée.*
*Date : 2026-08-24 · Source : cadrage Pierre après l'audit LOOP COMPLETENESS (« la Forge a appris à produire et prouver une
structure avant d'apprendre à concevoir le jeu comme un ensemble de boucles cohérentes »). Aucun code, aucune valeur numérique
(les valeurs restent à la Calibration), aucune WireMap. C.1/C.2 restent ratifiés comme contrats de progression et de contenu ;
C.3 s'y superpose comme ARCHITECTURE ; après ratification, en cas d'écart, C.3 fait foi. La WireMap ne découvre pas les boucles :
elle traduit un design déjà cohérent.*

## La question à laquelle ce document répond
> **Quel jeu la Forge essaie-t-elle réellement de produire ?**
Un jeu où le joueur **fait vivre un petit monde de chatons** : il produit des chatons et aménage leur lieu ; ces deux gestes se
nourrissent (un lieu aménagé change les comportements des chatons, des chatons nombreux exigent de nouveaux lieux) ; chaque tour
ouvre une possibilité perceptible ; la collection et le prestige transforment le monde au lieu de le réinitialiser à l'identique.
```text
                REFUGE
        ┌─────────┴─────────┐
    produire            aménager
    des chatons         le lieu
        │                   │
   panier (source)    objets (banc, fleurs,
        │              jouet, niche, gamelle)
        └─────────┬─────────┘
             nouveaux comportements
                   │
              nouvelle zone (jardin → grenier)
                   │
              nouveaux chats (robes, rares)
                   │
             nouvelles activités (placer, appeler, brosser, nourrir)
                   │
                collection (album)
                   │
                prestige (saison, cœurs)
                   │
              nouveau monde (portée suivante)
```
**L'économie SERT cette boucle ; elle ne constitue pas le jeu.** (Invariant mesuré à ne plus reproduire : six versions où
l'économie ÉTAIT le jeu.)

## Règle d'architecture (dure, non négociable)
> **Aucune boucle n'est déclarée complète sans PRODUCTEUR et CONSOMMATEUR identifiés** — dans le jeu (quel système la nourrit,
> quel système la lit) ET dans la chaîne Forge (quel agent l'écrit, quel oracle/étape la consomme). Une boucle sans métrique
> propre, sans slot structurel ou sans consommateur réel est MISSING, jamais « valide de forme ».

## Les 10 boucles (14 champs chacune)
Les 13 premiers champs sont étiquetés (PURPOSE … PROOF) ; le **14ᵉ champ est MÉTRIQUE_PROPRE**, signalé en gras à la fin de PROOF —
c'est la mesure qui n'appartient qu'à cette boucle (l'audit a montré que 5 boucles sur 6 n'en avaient aucune). Exception assumée :
la boucle 10 fusionne ART_REQUIRED et GM_REQUIRED en un champ commun (le dialogue est leur champ partagé), soit 13 champs.

### 1. CORE LOOP — « la caresse qui fait réagir le monde »
PURPOSE : l'interaction de base est une relation, pas un bouton · PLAYER_ACTION : caresser la pelote (clic / maintien) ·
INPUT : `pelote` ; les chatons proches · STATE_CHANGE : ronrons +, le chaton le plus proche réagit (lève la tête, se frotte) ·
REWARD : ronron sonore + pop + réaction visible · DECISION : caresser court (rythme) ou long (`caresse_longue`, un chaton vient) ·
OUTPUT : ressource ronrons + attention des chatons · NEXT_LOOP : Gameplay (les ronrons financent les gestes) ·
CONTENT_REQUIRED : pelote animée ; réactions de chatons (≥ 1 par état) · ART_REQUIRED : animation de caresse, réaction du chaton
focal, feedback sonore · GM_REQUIRED : la valeur du geste (Calibration) et la règle « le monde répond toujours » ·
ECONOMY_REQUIRED : source primaire ronrons · PROOF : sonde (clic → `hud.ronrons` + réaction dans la scène) ; HumanGate « c'est
une caresse, pas un bouton » ; **MÉTRIQUE_PROPRE : réactions de chatons par caresse** (jamais partagée avec une autre boucle).

### 2. GAMEPLAY LOOP — « jouer → obtenir → choisir → transformer → rejouer »
PURPOSE : l'activité à l'échelle de la minute a une identité : remplir et animer le refuge · PLAYER_ACTION : accueillir un
chaton, le placer, aménager un objet · INPUT : ronrons + places libres + objets disponibles · STATE_CHANGE : un chaton ou un
objet ENTRE dans la scène et s'y comporte · REWARD : le refuge devient plus vivant (comportements) · DECISION : décision 1 —
adopter (passif, colonie) vs améliorer/aménager (actif, interactions) au coût commun · OUTPUT : un monde plus peuplé + la
prochaine possibilité affichée (`hud.ensuite`) · NEXT_LOOP : Progression · CONTENT_REQUIRED : chatons à robes distinctes,
objets à comportements (C.2 §5) · ART_REQUIRED : entrée en scène (sortie du panier), occupation d'un emplacement ·
GM_REQUIRED : exclusivité au seuil, ordre des possibilités · ECONOMY_REQUIRED : sinks = accueillir/aménager · PROOF : sonde
(état de scène avant/après chaque geste) ; **MÉTRIQUE_PROPRE : possibilités jouables ajoutées par minute** ; HumanGate 5 s.

### 3. PROGRESSION LOOP — « possibilité → découverte → maîtrise → nouveau palier »
PURPOSE : chaque tour ouvre quelque chose que le joueur n'avait pas · PLAYER_ACTION : franchir le prochain jalon affiché ·
INPUT : l'état courant + l'objectif · STATE_CHANGE : un nœud passe LOCKED → AVAILABLE (placer, place, jardin, prestige…) ·
REWARD : la possibilité elle-même (jamais +X %) · DECISION : quel jalon poursuivre quand deux sont finançables ·
OUTPUT : une capacité ou un accès nouveau · NEXT_LOOP : Content + Skill (ce qui apparaît), World (où) ·
CONTENT_REQUIRED : un élément perceptible par jalon (case du tableau C.2 §5) · ART_REQUIRED : l'état AVAILABLE se voit
(volets entrouverts, coût lisible) · GM_REQUIRED : graphe de précédence (C.1/C.2 P01→P08) · ECONOMY_REQUIRED : chaque jalon a
un coût qui a une FONCTION (Calibration §5) · PROOF : `appears` par jalon ; **MÉTRIQUE_PROPRE : possibilités nouvelles par
palier ≥ 1** ; test de reconstruction (§7 C.1).

### 4. CONTENT LOOP — « le contenu s'enchaîne, il ne s'empile pas »
PURPOSE : chaque progression PRODUIT du contenu qui appelle le suivant · PLAYER_ACTION : obtenir/placer le contenu ·
INPUT : la possibilité ouverte par la progression · STATE_CHANGE : chaton / objet / animation / skin / environnement AJOUTÉ
à la scène avec un comportement · REWARD : le monde change visiblement · DECISION : quel contenu d'abord (un chaton et un objet
en concurrence à chaque palier — échelle de prix partagée, Calibration) · OUTPUT : un élément qui DÉBLOQUE le suivant (le banc
appelle les fleurs ; la niche appelle la nuit ; la gamelle appelle les rares) · NEXT_LOOP : World (le contenu peuple l'espace),
Quest (le contenu porte les objectifs d'album) · CONTENT_REQUIRED : la chaîne C.2 §5 complète, JAMAIS une liste plate ·
ART_REQUIRED : un asset + une animation + une interaction par ligne · GM_REQUIRED : la règle « une progression sans case remplie
ne passe pas » · ECONOMY_REQUIRED : chaque contenu a un coût et un effet affichés · PROOF : **MÉTRIQUE_PROPRE : longueur de la
chaîne de contenu débloquée** (pas le nombre d'assets) ; `appears` sur groupes `objet`/`lieu`.

### 5. ECONOMY LOOP — « source → ressource → décision → dépense → transformation »
PURPOSE : financer des transformations du monde, pas ralentir des unlocks · PLAYER_ACTION : dépenser au bon moment ·
INPUT : sources (caresse ; chatons qui ronronnent ; jardin → croquettes en portée 2) · STATE_CHANGE : la dépense TRANSFORME la
scène (jamais un nombre seul) · REWARD : la nouvelle capacité produite · DECISION : décisions 1 et 2 (exclusives au seuil ;
non-dominance par politique puis par objectif) · OUTPUT : nouveau pouvoir d'achat + nouvelle source (chaton→ronrons,
jardin→croquettes) · NEXT_LOOP : Gameplay (finance les gestes), Meta (le seuil de prestige) · CONTENT_REQUIRED : coût ET effet
affichés sous chaque affordance · ART_REQUIRED : lisibilité (jamais deux boutons jumeaux) · GM_REQUIRED : par ressource —
source, sink, raison d'exister, boucle alimentée, choix créé, saturation, ressource suivante · ECONOMY_REQUIRED : registre
unique (`economy.json`), zéro constante en dur · PROOF : gate `economy_bypass` ; DECISION 6/6 ; **MÉTRIQUE_PROPRE :
transformations de scène par dépense = 1** (une dépense sans transformation est un défaut).

### 6. SKILL / TECHNOLOGY LOOP — « compétence → capacité → nouvelle possibilité → compétence suivante »
PURPOSE : le joueur apprend des GESTES, pas des multiplicateurs · PLAYER_ACTION : acquérir puis UTILISER la compétence ·
INPUT : la branche choisie (décision 1) · STATE_CHANGE : un verbe nouveau existe (`caresse_longue` → `appeler` → `brosser` ;
`amenager` → `nourrir`) · REWARD : une interaction inédite avec les chatons · DECISION : quelle branche approfondir d'abord ·
OUTPUT : une capacité qui ouvre une activité (appeler rassemble ; nourrir permet les rares) · NEXT_LOOP : Quest (les activités
deviennent des objectifs), Gameplay · CONTENT_REQUIRED : chaque nœud = une interaction OU un objet (C.2 §7) ·
ART_REQUIRED : le geste se voit (chatons qui se rassemblent, cœur qui flotte) · GM_REQUIRED : l'arbre complet ADRESSABLE
(l'audit a mesuré 1 nœud sur 5 survivant) · ECONOMY_REQUIRED : coût par nœud (fonction, Calibration) · PROOF : chaque nœud
acquis est JOUÉ par la sonde au moins une fois ; **MÉTRIQUE_PROPRE : verbes jouables acquis**.

### 7. WORLD / MAP LOOP — « espace → bâtiment → occupation → extension → nouvel espace »
PURPOSE : la carte est un système de progression, pas un fond · PLAYER_ACTION : ouvrir, placer, développer un lieu ·
INPUT : places, lieux verrouillés visibles (« ? ») · STATE_CHANGE : le lieu change d'ÉTAT (LOCKED → AVAILABLE → ACTIVE → FULL)
et la carte s'étend (refuge → jardin → grenier) · REWARD : un espace qui vit (oiseau, vent, papillons, lumière de lucarne) ·
DECISION : décision 2 — développer le jardin (album) vs ouvrir le grenier (production) · OUTPUT : des emplacements + des
comportements de lieu · NEXT_LOOP : Content (le lieu accueille), Meta (la saison le transforme) · CONTENT_REQUIRED : 4 états
visuels par lieu + promesse visible du suivant (lucarne) · ART_REQUIRED : états et saisons (l'Art les a déjà écrits — le GM
doit les CONSOMMER : défaut mesuré par l'audit) · GM_REQUIRED : capacité, coût, règle de refus lisible par lieu ·
ECONOMY_REQUIRED : ouvrir/développer = sinks majeurs · PROOF : `appears:lieu` ; états observés par la sonde ; **MÉTRIQUE_PROPRE : lieux jouables / lieux affichés = 1** (le sprite `MOUSE_FILTER_IGNORE` des V5/V6 est l'anti-modèle).

### 8. QUEST / ACTIVITY LOOP — « objectif → action → résultat → récompense → objectif suivant »
PURPOSE : le jeu dit toujours quoi faire maintenant, et récompense l'avoir fait · PLAYER_ACTION : accomplir l'objectif affiché ·
INPUT : `hud.objectif` (principal) + panneau album (collection) + activités de compétence (secondaires) · STATE_CHANGE :
l'objectif accompli est MARQUÉ (album coloré, coche) · REWARD : **explicite et attachée à l'objectif** (la possibilité ouverte,
un chaton, un moment de scène — l'audit a mesuré 0 récompense de quête sur 6 versions : interdit désormais) · DECISION : quel
objectif secondaire poursuivre · OUTPUT : le prochain objectif, réellement différent · NEXT_LOOP : Progression (les objectifs
sont le fil du graphe), Meta (l'album) · CONTENT_REQUIRED : objectifs qui NOMMENT une action sur le monde · ART_REQUIRED :
hiérarchie OBJECTIF → ACTION → CONSÉQUENCE → ENSUITE · GM_REQUIRED : WHY → objectif → conditions → état observable → récompense
→ suivant, par objectif · ECONOMY_REQUIRED : aucune (les objectifs ne se paient pas) · PROOF : `new_distinct` SÉMANTIQUE
(pas un compteur collé à une phrase — anti-modèle V5/V6 mesuré) ; **MÉTRIQUE_PROPRE : récompenses d'objectif délivrées**.

### 9. META LOOP — « portée → transformation → collection → nouvel état du monde »
PURPOSE : recommencer dans un monde DIFFÉRENT, pas plus vite seulement · PLAYER_ACTION : prestige au jalon de maîtrise ·
INPUT : niveau 1 maîtrisé (5 placés + jardin) · STATE_CHANGE : RESET observable + CONSERVE (album, cœurs, souvenirs) +
TRANSFORME (saison, grenier, croquettes, rares, ruban) · REWARD : deux questions posées par la carte (« qu'y a-t-il derrière le
grenier ? qui sont les dorés ? ») · DECISION : quand prestiger (maintenant ou pousser l'album) · OUTPUT : une portée nouvelle
avec du contenu nouveau (≥ 1 par portée) · NEXT_LOOP : retour Core, dans un monde changé ; fin = album complet (pas de portées
infinies) · CONTENT_REQUIRED : contenu neuf par portée · ART_REQUIRED : saison, ruban, album qui se colore, départ joyeux ·
GM_REQUIRED : les 4 propriétés du prestige, lisibles machine · ECONOMY_REQUIRED : cœurs = seule accélération, coûts constants ·
PROOF : `resets` + `appears` post-prestige + ADVANTAGE ; HumanGate « envie de continuer ? » ; **MÉTRIQUE_PROPRE : celles qui
existent déjà** (seule boucle mesurée aujourd'hui — l'architecture doit amener les 9 autres à son niveau).

### 10. ART ↔ GAME DESIGN LOOP — le mécanisme normal de CONSTRUCTION des boucles 1-9
PURPOSE : les boucles ÉMERGENT du dialogue ; ni le GM n'invente tout, ni l'Art n'exécute · PLAYER_ACTION : (agents) formuler le
manque, répondre, intégrer · INPUT : World Scan + Story Bible + ce document · STATE_CHANGE : chaque ronde ferme des questions et
COMPLÈTE des champs des boucles 1-9 (pas seulement un Q/R) · REWARD : cohérence (shared %) · DECISION : ready_for_freeze honnête ·
OUTPUT : design freeze → WireMap traduit, ne découvre pas · NEXT_LOOP : production (WireMap → Builder → sondes → leçons) ·
CONTENT_REQUIRED : le protocole modèle — GM : « il me faut une progression qui rende X perceptible » → Art : « trois façons,
celle-ci exige Y » → GM : « j'intègre Y » → Art : « je complète » → freeze · ART/GM_REQUIRED : le droit et le devoir de dire
« il me manque X » · ECONOMY_REQUIRED : — · PROOF : design_questions/design_state/design_freeze (Lot F) ; **MÉTRIQUE_PROPRE :
champs de boucle complétés PAR le dialogue** (une convergence qui ne modifie aucune boucle est un théâtre de questions).

## La matrice (produit / consomme / débloque) — et son test de complétude
Convention : « Produit » = l'artefact/effet ; « Consomme » = ce qui la nourrit ; « **Débloque** » = la ou les BOUCLES AVAL (= NEXT_LOOP des fiches), jamais un artefact.
| Boucle | Produit | Consomme | Débloque | Producteur identifié ? | Consommateur identifié ? |
|---|---|---|---|---|---|
| Core | interaction + ronrons | attention du joueur | Gameplay | pelote/chatons (jeu) ; s9 (chaîne) | Gameplay ; sonde |
| Gameplay | monde peuplé + choix | Core | Progression | gestes (jeu) ; loop.json (chaîne) | Progression ; sonde/DECISION |
| Progression | possibilités | Gameplay | Content + Skill + World | graphe C.1/C.2 ; grey_blocks | Content ; `appears` |
| Content | chatons/objets/animations/skins/zones | Progression | World + Quest | tableau C.2 §5 ; s2.5/s9 | World, Quest (jeu) ; **à créer côté chaîne : le slot qui consomme le tableau §5 et câble la métrique « longueur de chaîne » — PROPOSÉE ici, mesurée nulle part (audit : 0 métrique propre aujourd'hui)** |
| Economy | ressources + décisions | Gameplay | Gameplay + Meta | economy.json ; GM | Gameplay ; gates economy_bypass/DECISION |
| Skill | verbes jouables | Progression | Quest + Gameplay | arbre C.2 §7 ; **à créer : slot GM (audit : 1 nœud/5)** | Quest, Gameplay ; sonde (à exiger : chaque verbe joué) |
| Quest | objectifs + récompenses | World + Gameplay | Progression + Meta | **à créer : slot GM avec récompense (audit : 0 récompense/6 versions)** | joueur ; `new_distinct` sémantique |
| World | espaces + états | Content | Content + Meta | états Art (existent — producteur OK) | Meta ; `appears:lieu` (jeu) ; **à créer côté chaîne : le CONSOMMATEUR GM des états Art (audit : écrits, jamais consommés)** |
| Meta | transformation + collection | Progression | Core (portée suivante) | prestige (jeu) ; metrics GM (existent) | Core (retour) ; sonde + HumanGate |
| Art↔GM | cohérence (design freeze) | besoins mutuels | production (WireMap → Builder) | Lot F (existe) | design_freeze gate (existe) ; **à renforcer : le dialogue doit MODIFIER les boucles** |

**Statuts** : « à créer » = la pièce n'existe pas (MISSING au sens de la règle dure) ; « à renforcer » = producteur et consommateur
EXISTENT (Lot F, gate design_freeze) mais la qualité exigée (le dialogue modifie les boucles) n'est pas encore mesurée.

**Double verdict de complétude, appliqué à ce document lui-même** :
- **Architecturale** (producteur ET consommateur identifiés) : **6/10** — Content, Skill, Quest, World manquent d'une pièce de chaîne.
- **Mesurée** (métrique propre réellement câblée dans un oracle) : **1/10** — la Meta seule (source : `docs/audit/2026-08-24-kitten-clicker-loop-completeness-audit.md`, mesure d'exclusivité — `economy_bypass`/`appears`/`new_distinct` existent mais sont PARTAGÉS entre boucles, pas propres) ; les 9 autres MÉTRIQUE_PROPRE de
  ce document sont des exigences à câbler, pas des mesures existantes.
La WireMap exige la complétude ARCHITECTURALE 10/10 ; la complétude MESURÉE se construit ensuite, boucle par boucle, et le run ne
peut prétendre prouver que ce qui est câblé.
4 exigent une pièce nouvelle côté chaîne (Content : métrique propre · Skill : slot adressable · Quest : slot avec récompense ·
World : consommateur GM) — c'est exactement la liste MISSING de l'audit, retrouvée par construction. Ces pièces sont des
évolutions du SCHÉMA du Game Master (futur lot, après ratification de C.3) : 10 slots de boucle, **≥ 1 métrique exclusive
obligatoire par boucle**, champs producteur/consommateur par boucle — jamais une station nouvelle.

## Ce que C.3 change aux documents existants (après ratification)
C.2 reste le contrat de contenu et de scène (P01→P08, tableau §5, règle maîtresse) ; C.1 reste le graphe de progression ;
la Calibration reste la table des valeurs. C.3 est l'architecture qui les relie : toute exigence future (Prisme, game_master,
WireMap) doit pouvoir dire À QUELLE BOUCLE elle appartient, ce que cette boucle produit, consomme et débloque. La WireMap ne
peut être demandée que lorsque les 10 boucles sont complètes au sens de la règle dure.

## Test de validité (même méthode que C.1/C.2)
Un agent à contexte vierge lisant CE document seul doit pouvoir répondre : (1) quel jeu la Forge essaie de produire, en une
phrase qui n'est pas « un clicker » ; (2) pour chaque boucle : qui la produit, qui la consomme, ce qu'elle débloque ;
(3) pourquoi l'économie n'est pas le jeu ; (4) quelles 4 pièces manquent à la chaîne et pourquoi ; (5) ce que le dialogue
Art ↔ GM doit MODIFIER pour mériter un freeze. Toute réponse exigeant une invention = document incomplet.
