---
styles: [flat-cute-svg, cozy-pastel-2d]
mood_keywords: [cosy, mignon, chaleureux, pastel, lisible, non-punitif, doux, rond]
---

# Art Bible — kitten_clicker (s2.5)

> Source : `product_snapshot.md` (s1-prisme, 14 regles observables R1–R14) + `story_bible.json`
> (sections GROUNDED : context, characters, coherence_rules) + `charter.yaml` (criteres_demo a–h).
> Format cible impose par le dispatch : **SVG vectoriel** ecrit par le builder pour Godot 4.6.3
> (aucun generateur d'image dans le studio ; identite par forme/couleur/taille, cf. charter
> hors_scope « Grey Blocks / placeholders 2D »). `claim_verdict: NO_CLAIM_ALLOWED`.

## 1. IDENTITE VISUELLE

**Direction** : un clicker cosy de collection de chatons, **mignon, chaleureux et lisible a
640x480**. Tout est dessine en **SVG plat** aux **formes rondes**, contours epais arrondis,
aucune arete dure — la rondeur porte la mignonnerie. Palette **pastel chaude** dominante
(rose-laine, creme, bois miel, terracotta doux) rehaussee d'accents froids **reserves aux
raretes elevees** (bleu-gemme, or lumineux), pour que la richesse chromatique elle-meme signale
la valeur.

**Regle de lisibilite (640x480)** : chaque entite doit rester identifiable en petit. On s'appuie
sur trois leviers mecaniques, jamais sur le detail fin : **silhouette** (contour reconnaissable
d'un coup d'oeil), **aplat de couleur** (2 a 4 tons par entite, pas de degrade complexe hors
glow de rarete), **taille** (echelle croissante avec l'importance/rarete). Contraste texte/fond
fort pour les grands nombres (compteur de ronrons, taux/tick, seuils de palier).

**Cle de rarete des chatons (R6 — differenciation A L'OEIL, pas seulement en donnees)** — trois
axes cumulatifs, du commun au legendaire :

| Rarete | Taille corps | Couleur | Fioriture de forme | Exemples nommes |
|---|---|---|---|---|
| Commun | ~56px | ton sourd, uni | silhouette ronde de base | Moustache, Biscotte |
| Peu-commun | ~64px | couleur nette | detail (contour ondule / bout de pattes) | Reglisse, Nuage |
| Rare | ~76px | sature + aura pastel legere | accessoire (foulard) | Cannelle |
| Epique | ~88px | froid + collier a gemme | oreilles plus dessinees + halo | Saphir |
| Legendaire | ~104px | or degrade + glow | couronne + rayonnement etoile | Lumina |

**Ton** : cosy over urgency (coherence_rules GROUNDED). Aucun visuel d'echec, aucune connotation
de perte ; le prestige est une **fanfare de jalon-victoire** (R13), jamais un ecran de defaite
(R14 : aucun game-over). Feedback tactile au clic (R12) : la pelote **pulse** et une **particule
ronron** douce s'envole.

## 2. RATIONALE

Chaque choix se rattache a une regle observable ou a une section amont GROUNDED — jamais un
adjectif esthetique libre :

- **Formes rondes + pastel chaud + contours doux** ancre `coherence_rules` (« tonalite cosy et
  non punitive, coziness over urgency ») et `reference_jeu` Neko Atsume (« attractivite,
  identite mignonne »). Le confort visuel EST la tension du genre, a la place d'une menace.
- **Rarete lue par taille + couleur + fioriture** repond directement a **R6** et au critere (a)
  du charter : la story_bible precise que les entrees fournissent **le nombre (>=6) et le principe
  de differenciation**, mais **pas** les identites individuelles — nommer les 7 chatons et fixer
  leur cle visuelle est donc la decision de cette station, pas une donnee heritee. On produit 7
  chatons sur 5 raretes pour depasser le seuil de 6 avec marge.
- **Deux lieux plein ecran nettement contrastes** (Refuge chaud/interieur vs Grenier
  ensoleille/ambre) sert **R7** et le critere (b) : la distinction se joue sur la lumiere et la
  structure, pas sur un simple changement de teinte, pour etre visible a l'ecran.
- **HUD a grands chiffres arrondis lisibles + bandeau de paliers a seuils marques** sert **R1**
  (compteur == n+1), **R4** (taux/tick strictement croissant, affiche) et **R9** (>=3 seuils
  distincts, regle de variance ratifiee Pierre 2026-07-21) : la variance des seuils doit se
  **voir**, donc les reperes de palier portent leur valeur.
- **Objets distincts (pelote, gamelle, souris, griffoir) et journal de 3 quetes** couvrent **R8**
  et les criteres (c)/(d) : chaque objet a une silhouette propre pour etre « identifiable a
  l'ecran », pas une icone generique reutilisee.
- **Icones d'amelioration contrastees** servent **R3/R4** : l'achat doit produire un changement
  visible ; des icones distinctes (patte/panier/herbe verte) rendent la colonne d'ameliorations
  lisible.
- **Particule ronron + fanfare de prestige** couvrent **R12** et **R13** : feedback au clic et
  marquage du cap franchi, tous deux en registre doux.

**Non couvert par cette bible, explicitement** : l'AUDIO (R11, 4 sons distincts) n'est pas une
entite visuelle — le charter le declare **procedural, genere par le builder** (`core_audio.gd`).
Il ne figure donc pas dans les BESOINS VISUELS ci-dessous (voir SKIPPED_VALIDATION du rapport).

> La prose ci-dessus n'est PAS lue par l'oracle. La couverture reelle est prouvee uniquement par
> la donnee structuree de la section 3 rapprochee des `asset_requests.json` (une request par
> entite `required:true`, meme `entity_role`).

## 3. BESOINS VISUELS

Chaque entite visuelle distincte du `product_snapshot`, avec son `entity_role` et sa couverture
`required`. En cas de doute, `required:true` (le cout d'une request de plus est nul).

```json
{
  "visual_requirements": [
    {
      "id": "obj_pelote_laine",
      "entity_role": "item",
      "required": true,
      "description": "Pelote de laine, cible cliquable centrale (R1/R12). Boule ronde de laine ~120px, brin qui depasse en spirale ; 2 etats: repos et pulse (echelle 1.0 -> 1.12) au clic. Rose-laine chaud, contour epais arrondi."
    },
    {
      "id": "obj_gamelle",
      "entity_role": "item",
      "required": true,
      "description": "Gamelle de croquettes (objet R8). Bol demi-ellipse creme, croquettes rondes brunes empilees, petite empreinte de patte peinte sur le flanc. ~64px."
    },
    {
      "id": "obj_souris_jouet",
      "entity_role": "item",
      "required": true,
      "description": "Souris en peluche (objet R8). Corps ovale gris-souris, grandes oreilles rondes roses, queue en ficelle courbe. ~48px, feutre doux."
    },
    {
      "id": "obj_griffoir",
      "entity_role": "item",
      "required": true,
      "description": "Griffoir/poteau a gratter (objet R8). Cylindre vertical enroule de corde beige, socle plat, petit pompon rouge suspendu. ~96px de haut."
    },
    {
      "id": "kitten_moustache",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton COMMUN 'Moustache' — tigre gris. Corps ovale rond ~56px, rayures grises douces, museau clair, grandes moustaches blanches. Silhouette simple, couleur sourde (rarete commune = plus petit, moins orne)."
    },
    {
      "id": "kitten_biscotte",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton COMMUN 'Biscotte' — creme uni. Corps ovale ~56px, pelage creme/beige, joues roses, oreilles arrondies. Forme et taille identiques a la classe commune, couleur seule differente."
    },
    {
      "id": "kitten_reglisse",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton PEU-COMMUN 'Reglisse' — noir. Corps ~64px (legerement plus grand que commun), pelage noir mat, yeux verts ronds brillants, bout des pattes blanc. Petite etoile de rarete au coin."
    },
    {
      "id": "kitten_nuage",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton PEU-COMMUN 'Nuage' — blanc bouffant. Corps ~64px avec contour ondule (poil long) qui le distingue par la FORME, blanc pur, collerette de fourrure marquee."
    },
    {
      "id": "kitten_cannelle",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton RARE 'Cannelle' — roux. Corps ~76px (nettement plus grand), roux vif sature, rayures ambrees, foulard orange. Aura pastel legere pour signaler la rarete."
    },
    {
      "id": "kitten_saphir",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton EPIQUE 'Saphir' — bleu-gris. Corps ~88px, pelage bleu-gris froid, collier a gemme bleue facettee, oreilles pointues plus dessinees (fioriture de forme), halo bleu diffus."
    },
    {
      "id": "kitten_lumina",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton LEGENDAIRE 'Lumina' — dore lumineux. Le plus GRAND ~104px, pelage or degrade, rayonnement etoile derriere le corps, petite couronne, queue ornee. Rarete maximale = plus grand + plus orne + glow."
    },
    {
      "id": "loc_refuge",
      "entity_role": "environment",
      "required": true,
      "description": "Lieu de depart 'Le Refuge' — fond plein ecran 640x480. Interieur douillet: murs bois chaud, tapis rond, coussins empiles, fenetre avec rideau, plante en pot. Palette pastel chaude, ambiance cosy."
    },
    {
      "id": "loc_grenier",
      "entity_role": "environment",
      "required": true,
      "description": "Lieu debloque 'Le Grenier Ensoleille' — fond plein ecran 640x480, VISUELLEMENT distinct du Refuge: poutres en A, lucarne baignee de soleil, poussiere doree, cartons empiles, teinte plus lumineuse et ambree."
    },
    {
      "id": "upg_griffes",
      "entity_role": "icon",
      "required": true,
      "description": "Icone amelioration 'Griffes affutees' — patte de chat avec 3 griffes brillantes, cadre rond ~40px, fond pastel. Lisible en petit dans la colonne d'ameliorations."
    },
    {
      "id": "upg_panier",
      "entity_role": "icon",
      "required": true,
      "description": "Icone amelioration 'Panier douillet' — petit panier en osier avec coussin, cadre rond ~40px. Signale un boost de production passif."
    },
    {
      "id": "upg_herbe",
      "entity_role": "icon",
      "required": true,
      "description": "Icone amelioration 'Herbe a chat' — touffe de feuilles vertes en pot, cadre rond ~40px. Contraste de couleur (vert) pour se distinguer des autres icones."
    },
    {
      "id": "ui_hud_ronrons",
      "entity_role": "ui",
      "required": true,
      "description": "HUD compteur de ronrons — grand nombre lisible en haut-centre + ligne 'taux/tick' juste dessous (R1 compteur == n+1, R4 taux strictement croissant). Chiffres gras arrondis, plaque pastel translucide, doit rester lisible a 640x480."
    },
    {
      "id": "ui_journal_quetes",
      "entity_role": "ui",
      "required": true,
      "description": "Journal de quetes — panneau lateral listant 3 objectifs (R8): chaque ligne = texte d'objectif + barre/etat d'avancement. Cadre de carnet, icone de patte comme puce de liste."
    },
    {
      "id": "ui_panneau_ameliorations",
      "entity_role": "ui",
      "required": true,
      "description": "Panneau d'ameliorations — colonne de boutons achetables a droite (accueille les icones upg_*), chaque bouton montre icone + cout. Cadre pastel, etats normal/achetable/verrouille distinguables par la couleur."
    },
    {
      "id": "ui_palier_track",
      "entity_role": "ui",
      "required": true,
      "description": "Bandeau de paliers — jauge horizontale marquant au moins 3 seuils DISTINCTS (R9): reperes espaces avec valeur de seuil affichee, palier atteint colore. Rend la progression et la variance des seuils lisibles."
    },
    {
      "id": "ui_prestige",
      "entity_role": "ui",
      "required": true,
      "description": "Ecran/bouton de prestige — panneau de meta-progression (R13): bouton 'Prestige' avec icone d'etoile/patte doree, affichage du multiplicateur permanent. Ton de jalon-victoire, JAMAIS un ecran d'echec (R14: aucun game-over)."
    },
    {
      "id": "fx_ronron",
      "entity_role": "effect",
      "required": true,
      "description": "Particule ronron au clic (R12) — petit symbole doux (coeur/note/ondes 'zzz') qui nait a la pelote et s'envole en fondu ~0.4s. Rose/blanc, plusieurs variantes de trajectoire pour eviter la repetition."
    },
    {
      "id": "fx_prestige_fanfare",
      "entity_role": "effect",
      "required": true,
      "description": "Fanfare visuelle de prestige (R13) — eclat d'etoiles et confettis pastel en salve depuis le centre, halo dore qui pulse une fois. Marque le cap franchi sans aucune connotation de perte (ton cosy)."
    }
  ]
}
```
