# Kitten Clicker — Gameplay / Progression Contract V1.2 (Lot C.1, **RATIFIÉ Pierre 2026-08-23** — réserves : cœurs ADDITIFS, coûts du niveau 1 IDENTIQUES à chaque portée ; décision 2 par objectif validée)
*V1.2 : test de reconstruction 2ᵉ passe = 0 invention, 0 contradiction ; §8 répond aux 10 questions de builder restantes (celles qui relèvent de l'intention de Pierre sont marquées À RATIFIER).*
*V1.1 : corrections après le test de reconstruction à contexte vierge (6 inventions, 2 contradictions) — §0 état initial, §4 formule des cœurs et grenier, P10 REPEAT complet, §2 mécanisme de non-dominance, §8 fin de partie.*
*Date : 2026-08-23 · Source : Fable, sur la direction produit V1 ratifiée et la correction Pierre du Lot C (« la fonction d'un nombre
dans la progression doit être documentée avant le nombre »). Aucun code. Ce document doit permettre à un autre agent de
reconstruire le jeu attendu SANS inventer la progression — c'est son critère de validité (§7).*

Conventions : R = ronrons · C = croquettes · `hud.<nom>` = Label du groupe `hud` · `aff.<nom>` = Control du groupe `affordance` ·
`state.<nom>` = état runtime lisible dans un registre · « sonde » = `player_loop.gd` (InputEvent + écran seulement).
Les nombres sont notés **[valeur]** : leur FONCTION est contractuelle ici ; leurs valeurs sont celles de la Calibration V2.1 (synchronisées le 2026-08-23 ; en cas d'écart, V2.1 fait foi).

## 0. État initial (avant le premier clic)
Au boot : `hud.objectif` = « Caresse la pelote pour gagner 20 ronrons » (déjà affiché, en haut, plus grande police) ; `hud.ronrons` = 0 ;
`hud.places` = 0/1 ; `hud.coeurs` = 0 ; `hud.ensuite` = « Ensuite : adopte ton premier chaton » ; la pelote au centre, seule affordance
mise en évidence ; `aff.acheter_chaton` visible mais grisée (coût 20 affiché, raison « il te faut 20 ronrons ») ; `aff.acheter_amelioration`,
`aff.acheter_place`, `aff.ouvrir_jardin`, `aff.prestige`, `aff.placer` N'EXISTENT PAS encore ; panneau `album` = 6 silhouettes « ? » + 3
silhouettes dorées « ? », 0 coloré ; AUCUN chaton sur la scène.

## 1. Les quatre boucles imbriquées (échelles de temps)
```text
META LOOP (10-20 min par portée)        prestige → héritage permanent → nouvelle possibilité → niveau suivant
  PROGRESSION LOOP (1-20 min : ≈ 3,5 min actif, ≈ 20 min idle)           objectif → action → récompense → possibilité → choix → déblocage → NEXT GOAL
    PLAYER LOOP (5-30 s)                voir l'objectif → comprendre l'action → agir → voir la conséquence → comprendre la suite
      CORE LOOP (≤ 1 s)                 action joueur → feedback → ressource → nouvelle action
```
- **CORE LOOP** : clic sur la pelote → pop visuel + son → `hud.ronrons` +1 → le clic suivant. Le jeu existe dès qu'elle tourne ;
  il n'est PAS encore un jeu (run 9 : core loop vivante, HumanGate FAIL).
- **PLAYER LOOP** : ce que l'écran doit rendre lisible en 5 s : `hud.objectif` (quoi faire) → l'affordance mise en évidence
  (comment) → `hud.cout_*`/`hud.effet_*` (à quel prix, pour quoi) → la conséquence visible → `hud.ensuite` (et après ?).
- **PROGRESSION LOOP** : le moteur. Chaque tour apporte une POSSIBILITÉ nouvelle (un nœud du graphe §2 passe LOCKED → AVAILABLE),
  jamais seulement +X %. Un tour sans possibilité nouvelle est un défaut de design, pas une variante.
- **META LOOP** : une transformation (§4), pas une accélération.

## 2. Graphe de progression (nœuds adressables — `gm_worldscan:game_master.grey_blocks.<id>`)
Chaque nœud : why · requires · actor · affordance · metric · target · proof · unlock · next_goal.

### NIVEAU 1 — « Le refuge »
| id | why (fonction ludique) | requires | actor / affordance | metric [valeur] | target | proof | unlock | next_goal |
|---|---|---|---|---|---|---|---|---|
| `click` | l'unité de sens : tout se lit en clics | — | PLAYER / `aff.pelote` | +1 R par clic [1] | 1ᵉʳ gain < 1 s | `hud.ronrons` increases (sonde B) | `kitten` (quand R ≥ coût) | « Adopte ton premier chaton » |
| `kitten` | première possession : le jeu cesse d'être un compteur | R ≥ coût ; `places` libre ≥ 1 | PLAYER / `aff.acheter_chaton` | coût [20 · 60 · 140 · 300 · 600] ; +prod [0,5 R/s] | 1ᵉʳ : 2–8 s après le 1ᵉʳ clic | `hud.collection` +1 ; chaton = nœud visible dans le refuge ; `aff.placer` **apparaît** | `placement` | « Place ton chaton » |
| `placement` | l'espace devient une règle : un chaton est quelque part | `kitten` ≥ 1 | PLAYER / `aff.placer` | 0 R ; `places` occupées +1 | ≤ 10 s | `hud.places` 1/1 ; chaton déplacé dans un lieu | `place` (mur lisible : « plus de place ») | « Achète une 2ᵉ place » |
| `place` | l'espace coûte : première décision de dépense hors chaton | `places` pleines | PLAYER / `aff.acheter_place` | coût [80] ; +1 place | 10–30 s actif / 100–250 s idle | `hud.places` 1/2 ; `aff.acheter_chaton` redevient active | `kitten_2` ; `upgrade` visible | « Adopte un 2ᵉ chaton — ou améliore la pelote » |
| `upgrade` | la décision récurrente : actif (clic ×2) contre passif (chaton) | R ≥ coût | PLAYER / `aff.acheter_amelioration` | coût [60·180·540] ; clic ×2 par niveau ; **3 niveaux maximum** (le bouton disparaît ensuite) | — | `hud.effet_acheter_amelioration` ; delta clic ×2 ; `aff.caresse_longue` apparaît au niveau 1 | — | (objectif inchangé : la décision n'a pas d'objectif propre) |
| `decision_1` | la boucle a une DÉCISION : A adopter vs B améliorer, exclusives au seuil. Mécanisme de non-dominance : A ajoute une production PASSIVE (+0,5 R/s, indépendante du joueur) ; B multiplie le clic (×2), qui ne vaut que si le joueur clique — en idle B rapporte 0, en actif B rapporte N clics/s × 1 R ≫ 0,5 R/s | `place` | PLAYER / {`acheter_chaton`, `acheter_amelioration`} | coût commun du seuil [60 R : chaton 2 = amélioration 1] | 15–45 s actif / 3–7 min idle ; non-dominance : A > B idle, B > A actif (H1) | DECISION 6/6 (sonde, 2 trajectoires × 2 politiques) | — | — |
| `garden` | nouvelle BOUCLE de production (×1,5 au jardin) + 3 places : le plafond devient un lieu | `places` occupées = totales = 2 (2/2) ; R ≥ coût | PLAYER / `aff.ouvrir_jardin` | coût [300] ; +3 places ; ×[1,5] | 45–105 s actif / 6–12 min idle | `appears lieu` ; `hud.places` +3 ; `hud.taux` monte après placement au jardin | `kitten_3..5` au jardin ; `mastery` | « Place 2 chatons au jardin » |
| `mastery` | fin de niveau LISIBLE : le refuge est plein et le jardin vit | 5 chatons placés ET `garden` | SYSTEM | — | 2,5–5 min actif / 14–22 min idle (H5) | `hud.objectif` = « Remplis le refuge : la portée suivante t'attend » puis « Prestige disponible » ; `aff.prestige` **apparaît** (n'existait pas) | `prestige` | « Recommence plus fort : nouvelle portée » |

### PRESTIGE (boucle de transformation — §4)
| id | why | requires | actor / affordance | metric | target | proof | unlock | next_goal |
|---|---|---|---|---|---|---|---|---|
| `prestige` | recommencer dans un état DIFFÉRENT, pas plus vite seulement | `mastery` | PLAYER / `aff.prestige` | reset (R 0, chatons 0, améliorations 0, places 1, lieux refuge) ; `hud.coeurs` +1 ; multiplicateur permanent = 1 + [0,25] × cœurs, appliqué au clic ET à la production (cumulatif : 1 cœur ×1,25, 2 cœurs ×1,5) | niveau 1 rejoué −20 % (H4) | `resets` sur `hud.ronrons` ; `hud.coeurs` increases ; ADVANTAGE clic après > avant ; album conservé (silhouettes → couleur) | `attic`, `kibble`, `rare` (AVAILABLE dès la portée 2) | « Portée 2 : le jardin produit des croquettes » |

### NIVEAU 2 — « La maison entière » (portée ≥ 2)
| id | why | requires | actor / affordance | metric | target | proof | unlock | next_goal |
|---|---|---|---|---|---|---|---|---|
| `kibble` | 2ᵉ ressource : elle ORIENTE un choix, elle ne remplace pas R | `garden` (portée ≥ 2) | SYSTEM | [0,2 C/s] par chaton au jardin | 1ʳᵉ croquette < 30 s après le jardin | `hud.croquettes` increases sans clic | `decision_2` | « Développe le jardin ou ouvre le grenier » |
| `decision_2` | 2ᵉ décision : album (rares) vs production (places). Mécanisme de non-dominance : l'optimum dépend de l'OBJECTIF du joueur, pas de sa politique de clic — jardin (C ×2) rapproche le chaton rare (objectif album, portée 2), grenier (+3 places, R ×1,5) rapproche la maîtrise (objectif prestige suivant) ; aucune des deux n'accélère l'autre objectif | R ≥ coût commun | PLAYER / {`aff.developper_jardin`, `aff.ouvrir_grenier`} | coût commun [500] ; jardin : C ×2 ; grenier : +3 places, R ×1,5 | 0,7–2 min actif / 4–9 min idle après prestige ; non-dominance (H2) | **HumanGate P5** (une seule DECISION mesurée par séquence) + observations `hud.croquettes`/`hud.places` | `rare` / `kitten_6..8` | selon la branche |
| `rare` | objectif de portée : l'album se colore | `kibble` ; R ≥ [400] et C ≥ [30] | PLAYER / `aff.adopter_rare` | coût R + C | 2–5 min après prestige | `hud.collection` ; album : silhouette dorée → chaton | `album_progress` | « Complète l'album (1/3 rares) » |

### META (persistant)
| id | why | requires | actor | metric | proof | unlock | next_goal |
|---|---|---|---|---|---|---|---|
| `album` | la promesse explicite : 6 silhouettes « ? » + 3 dorées, colorées quand gagnées ; JAMAIS un chaton visible avant d'être adopté | — | SYSTEM | chatons découverts / total | panneau `album` : compte des silhouettes vs colorés ; au boot : 0 coloré | — | objectif final visible dès le départ : « Album complet » |
| `hearts` | l'héritage lisible : chaque portée laisse une trace | `prestige` | SYSTEM | +1 par portée, [+25 %] chacun | `hud.coeurs` | — | — |
| `further` | raison de revenir au cycle suivant : un contenu neuf par portée (portée 2 : grenier+rares ; portée 3 : album complet) | `prestige` n | SYSTEM | contenu nouveau par portée ≥ 1 | `appears` d'au moins une affordance nouvelle après chaque prestige | — | — |

## 3. Les étapes, dans l'ordre joué (gameplay graph — adressables `gm_worldscan:game_master.loops.progression_loop.<id>`)
Précédence = ordre de ce tableau (le Prisme/loop.json doit la conserver : Lot D, tri par ordre du Prisme).

| step | PLAYER_GOAL | PLAYER_ACTION | AFFORDANCE | GAME_RESPONSE | REWARD | UNLOCK | NEXT_GOAL | META_EFFECT | METRIC | PROOF |
|---|---|---|---|---|---|---|---|---|---|---|
| P01 | « Caresse la pelote pour gagner 20 ronrons » | clic ×20 | `pelote` | pop + son, `ronrons` +1/clic | 20 R | `acheter_chaton` devient achetable (coût affiché ≤ R) | « Adopte ton premier chaton » | — | 20 clics, 2–8 s | `hud.ronrons` increases ; `hud.cout_acheter_chaton` |
| P02 | « Adopte ton premier chaton » | achat | `acheter_chaton` | chaton apparaît dans le refuge, `collection` 1 | +0,5 R/s | `placer` **apparaît** | « Place ton chaton » | album : 1 coloré | coût 20 ; prod +0,5/s | `appears affordance` ; `hud.taux` |
| P03 | « Place ton chaton » | placer | `placer` | chaton dans son lieu, `places` 1/1 | — | mur lisible : « plus de place — achète une place (80) » | « Achète une 2ᵉ place » | — | 0 R | `hud.places` 1/1 ; `aff.acheter_chaton` grisée + raison |
| P04 | « Achète une 2ᵉ place » | achat | `acheter_place` | `places` 1/2 | capacité +1 | `acheter_chaton` redevient active ; `acheter_amelioration` visible | « Adopte — ou améliore la pelote » | — | coût 80 ; 10–30 s actif | `hud.places` 1/2 |
| P05 | « Adopte ou améliore » | **DECISION** A/B | `acheter_chaton` / `acheter_amelioration` | état A' ≠ état B' | A : +0,5 R/s ; B : clic ×2 | A : 2ᵉ chaton ; B : `caresse_longue` apparaît | objectif nomme la branche prise | — | coût commun ; non-dominance H1 | DECISION 6/6 |
| P06 | « Ouvre le jardin (+3 places) » | achat | `ouvrir_jardin` | lieu 2 apparaît, `places` n/5 | production ×1,5 pour les chatons placés au jardin | 3 places ; `placer` vers le jardin | « Place 2 chatons au jardin » | — | coût 300 ; 45–105 s actif | `appears lieu` ; `hud.places` +3 |
| P07 | « Place 2 chatons au jardin » | placer ×2 | `placer` | `taux` monte | ×1,5 effectif | — | « Remplis le refuge (5 chatons) » | — | Δtaux > 0 | `hud.taux` increases sans clic |
| P08 | « Remplis le refuge » | achats | `acheter_chaton` ×3 | `collection` 5, `places` 5/5 | prod cumulée | `prestige` **apparaît** | « Prestige disponible : recommence plus fort » | — | 3–6 min actif / 8–14 idle | `appears affordance` (prestige) |
| P09 | « Recommence plus fort » | prestige | `prestige` | reset visible | `coeurs` +1 | grenier, croquettes, rares (portée 2) | « Portée 2 : le jardin produit des croquettes » | album conservé, cœurs | reset complet ; +25 % | `resets` ; `hud.coeurs` increases |
| P10 | « Rejoue le niveau 1, plus vite » | REPEAT P01…P08 (niveau 1 COMPLET, mêmes steps, mêmes coûts) | — | mêmes réponses, deltas ×(1+0,25×cœurs) | ADVANTAGE | — | P11 devient disponible dès que R ≥ 500 pendant ce rejeu (la portée 2 se joue EN MÊME TEMPS que le niveau 1 rejoué, pas après) | — | clic après > avant ; niveau 1 rejoué −20 % | REPEAT (la sonde rejoue P01…P06 ; P07–P08 observés) + ADVANTAGE |
| P11 | « Développe le jardin ou ouvre le grenier » | DECISION 2 | `developper_jardin` / `ouvrir_grenier` | C ×2 ou +3 places | selon branche | rares / places | selon branche | — | coût commun 500 ; H2 | HumanGate P5 |
| P12 | « Adopte un chaton rare » | achat R + C | `adopter_rare` | album : doré → coloré | objectif de portée | `album_progress` | « Complète l'album » | album | 400 R + 30 C ; 2–5 min | `hud.collection` ; panneau album |

## 4. Le prestige comme boucle de transformation
```text
NIVEAU 1 → développer l'espace (place, jardin) → maîtrise (5 placés + jardin) → PRESTIGE
  RESET    : ronrons 0 · chatons 0 (retirés de la scène) · améliorations 0 · places 1 · lieux = refuge
  CONSERVE : album (silhouettes colorées restent colorées) · cœurs (+1) · contenus déjà ouverts
  OUVRE    : le grenier (achetable dès la portée 2) · les croquettes (produites par le jardin dès la portée 2) · les chatons rares (album doré)
  NIVEAU 1 RECOMMENCÉ : plus rapide (×(1+0,25×cœurs)) ET différent (le jardin produit des croquettes, le grenier est achetable)
  NIVEAU 2 : nouvelle ressource, nouvelle décision, nouvel objectif de portée (rares) → album complet = fin visible dès le départ
```
Règle contractuelle : un prestige qui ne fait pas RESET + CONSERVE + ACCÉLÈRE + TRANSFORME n'est pas un prestige (P0). La sonde
prouve RESET (`resets`) et ACCÉLÈRE (ADVANTAGE) ; CONSERVE et TRANSFORME se prouvent par `appears` (grenier/croquettes après
prestige) et par le HumanGate.

## 5. Les nombres par leur fonction (valeurs proposées, calibration V2 ensuite)
```text
20 R            → premier chaton            → première POSSESSION, `placer` apparaît
0 R             → placer                    → l'ESPACE devient une règle visible (places n/m)
80 R            → deuxième place            → l'espace COÛTE ; première dépense hors chaton
60 · 180 · 540 R → améliorations clic ×2    → la DÉCISION actif/passif à coût COMMUN (60 = chaton 2), rendement décroissant (coût ×3, gain ×2)
300 R           → jardin                    → nouvelle BOUCLE de production (×1,5) + 3 places : le plafond devient un lieu
5 placés+jardin → prestige                  → MAÎTRISE lisible du niveau 1, transformation (reset + héritage)
+25 %/cœur      → héritage                  → niveau 1 rejoué −20 % : assez pour sentir la portée, pas assez pour la sauter
0,2 C/s         → croquettes (jardin)       → 2ᵉ RESSOURCE lente : elle oriente un choix
500 R (commun)  → jardin OU grenier         → 2ᵉ DÉCISION : album (rares) vs production (places)
400 R + 30 C    → chaton rare               → OBJECTIF de portée 2, album qui se colore
```
Ce que la V2 devra calibrer (pas ici) : les durées cibles de chaque step sous deux politiques, la valeur exacte des coûts pour tenir
3–6 min actif / 8–14 min idle, et H1/H2/H4 (hypothèses de balance, mesurées par la sonde et le HumanGate, jamais décrétées).

## 6. Ce que le GM (contrat s2.7) devra produire en plus — à reporter dans le contrat (Lot D, texte, pas de code nouveau)
Deux graphes adressables : `game_master.gameplay_graph` (= `loops.progression_loop`, steps P01…) et `game_master.progression_graph`
(= `grey_blocks` avec `requires`, `unlock`, `next_goal`), chaque nœud portant why · requires · actor · affordance · metric · target ·
proof · unlock · next_goal. Le schéma du Lot B couvre déjà why/requires/proof/metric (via `proof_ref`/`metric_ref`) ; `unlock` et
`next_goal` sont à AJOUTER aux grey blocks (champs optionnels, additifs).

## 7bis. Portée 3 et fin de partie
Portée 3 (après le 2ᵉ prestige) : aucun contenu nouveau — c'est voulu (P0 : pas de « plusieurs heures »). L'objectif de portée 3 est
« Complète l'album (3/3 rares) ». **Fin de partie** : quand l'album est complet (6 communs + 3 rares colorés), un écran final « Refuge
complet » s'affiche avec le compteur de portées et de cœurs ; le joueur peut continuer à cliquer mais aucun objectif nouveau n'est
proposé (`hud.objectif` = « Refuge complet — merci d'avoir joué »). Pas de portées infinies.

## 7ter. Protocole des preuves automatiques (résumé, pour lecture autonome)
`sonde` = un bot lancé sur la vraie scène, qui ne connaît que les InputEvent et les Labels/Controls des groupes `hud`/`affordance` :
il exécute les steps dans l'ordre, clique l'affordance, lit le HUD avant/après et évalue le prédicat. DECISION : il ré-instancie la
scène, rejoue le préfixe, prend A puis B (2 trajectoires), puis rejoue chaque option sous 2 politiques (idle / clic toutes les 3 frames)
pendant 300 frames et compare le hud `ronrons` : PASS ssi l'optimum s'inverse entre politiques + coût/effet affichés + états A'≠B' +
affordances ou coûts futurs différents + objectifs différents. `HumanGate` = jugement de Pierre en jouant (jamais automatisé).

## 8. Réponses aux questions de builder (2ᵉ passe du test de reconstruction)
1. `decision_2` : non-dominance par OBJECTIF (voir nœud) ; mesurée au HumanGate parce que la sonde ne rejoue qu'une DECISION par séquence — choix assumé pour le run 10, à automatiser ensuite (même protocole que `decision_1`, avec deux politiques « album » / « production » = deux cibles d'achat).
2. Cœurs : formule ADDITIVE voulue (1 + 0,25 × cœurs), pas composée — lisible par le joueur (« chaque cœur = +25 % »). **RATIFIÉ Pierre 2026-08-23**.
3. Après prestige : les améliorations repartent de 0, le clic de base vaut 1 × (1 + 0,25 × cœurs). Les cœurs sont la seule accélération.
4. Coûts du niveau 1 : STRICTEMENT identiques à chaque portée (jardin 300, chatons 20…600, place 80, améliorations 60·180·540 — valeurs V2.1) ; l'accélération vient des cœurs, jamais d'une remise. **RATIFIÉ**.
5. Grenier : un seul effet, celui de `decision_2` (+3 places, R ×1,5) ; existe seulement à partir de la portée 2.
6. Chatons rares : 3 au total, tous disponibles dès la portée 2, adoptables un par un (chacun coûte 400 R + 30 C, valeur V2.1) ; l'album complet = 6 communs + 3 rares. La portée 3 sert à finir l'album si la portée 2 n'a pas suffi.
7. `hearts` (§2 META) et le multiplicateur du prestige (§4) sont la MÊME mécanique (un seul chiffre, 0,25).
8. Les murs (« plus de place », « il te faut N ronrons ») ne bloquent JAMAIS la core loop : la pelote reste cliquable en permanence ; seuls les achats se grisent, avec leur raison.

## 7. Test de reconstruction (critère de validité de ce document)
Un agent qui ne lit QUE ce document doit pouvoir répondre, sans inventer : (1) quelle est la première chose que voit le joueur et ce
qu'il doit faire ; (2) dans quel ordre les possibilités apparaissent et ce qui les déclenche ; (3) où se trouve chaque décision et
pourquoi aucune option ne domine ; (4) ce que le prestige détruit, conserve et ouvre ; (5) ce qui est différent à la portée 2 ;
(6) comment chaque étape se prouve à l'écran. Si l'une des six réponses exige une invention, le document est incomplet.

## 9. Réalignement sur le Gameplay Loop & Content Contract V1.1b (C.2, ratifié Pierre 2026-08-23) — C.2 fait foi
| Step C.1 | Step C.2 | Ce qui change |
|---|---|---|
| P01 caresser ×20 → P02 `acheter_chaton` | P01 `accueillir` | l'affordance s'appelle `accueillir` ; le panier s'ouvre, le chaton SORT (animation) ; `placer` apparaît |
| P03 `placer` | P02 | le jardin se déverrouille VISUELLEMENT (volets entrouverts) |
| P04 `acheter_place` (80) | — | SUPPRIMÉ comme step propre : l'espace s'ouvre par le jardin (P03 de C.2) ; `places` reste le HUD et le mur lisible |
| P05 DÉCISION A chaton / B amélioration | P05 DÉCISION A `amenager` (banc 60) / B `caresse_longue` (60) | les « améliorations » abstraites deviennent OBJETS et INTERACTIONS ; coût commun 60 ; exclusives au seuil |
| P06 `ouvrir_jardin` (300) | P03 | le jardin est ouvert AVANT le 2ᵉ chaton dans C.2 (ordre joué de C.2 fait foi) |
| P07 placer ×2 au jardin | P04 | 2ᵉ chaton placé au jardin, comportement propre |
| P08 chatons 3-5 | P06 + P07 | objets (fleurs 140, jouet 300, niche 600) ET chatons 3-5 (140 · 300 · 600) : un chaton et un objet en concurrence à chaque palier |
| P09 prestige | P08 | + TRANSFORME (saison, grenier fermé, croquettes, rares, ruban) ; jardin re-verrouillé, pas rétréci ; chatons partent adoptés |
| P10 REPEAT | P10 | inchangé |
| P11 DÉCISION 2 | §4/§7 de C.2 | `developper_jardin` / `ouvrir_grenier`, 500 commun, non-dominance par OBJECTIF |
| P12 rare | §5 rare | 400 R + 30 C, 3 rares dès la portée 2 |
Règles héritées de C.2 : `appears` porte aussi sur les groupes `objet` et `lieu` ; les 6 chatons décoratifs n'existent plus ; départ = panier +
coussin + jardin fermé + album de silhouettes ; règle maîtresse « UNLOCK = possibilité perceptible » ; `hud.*` = mesures. L'ordre joué de
référence pour le Prisme (précédence) est **C.2 §3 P01 → P08**, puis C.1 P10 → P12.
