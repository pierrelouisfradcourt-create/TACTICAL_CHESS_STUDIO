---
styles: [flat-cute-vector, kawaii-pastel]
mood_keywords: [cosy, mignon, chaleureux, bienveillant, doux, pastel, lisible-640x480, sans-echec, collection]
---

# Art Bible — kitten_clicker (étape 2.5, run kitten_clicker-20260821e)

> Source : `lab/forge_runs/kitten_clicker/product_snapshot.md` (étape 1, sections 1–4 + règles observables R1–R22) et `charter.yaml` (critères_demo a–h). Story Bible : `context`/`characters`/`coherence_rules` GROUNDED (les noms concrets de chatons ne sont établis par AUCUNE source — voir fog). Format cible de production imposé par la tâche : **SVG** vectoriel écrit par le builder et importé par Godot 4 comme texture (aucun générateur d'images 2D n'existe dans le studio). Ce document fixe une identité visuelle **cohérente et actionnable**, jamais un jugement esthétique (cf. garde-fou du contrat).

## 1. IDENTITÉ VISUELLE

**Style global : `flat-cute-vector` (kawaii pastel, aplats vectoriels).** Formes simples et arrondies, contours doux et réguliers (2–3 px à l'échelle native), aplats de couleur sans texture photographique, ombres minimales (au plus une ombre portée douce sous les objets). Tout est dessinable en primitives SVG (cercles, ellipses, chemins courbes, dégradés légers) — c'est la contrainte de production centrale : le builder écrit les SVG à la main, donc chaque entité doit se réduire à quelques formes élémentaires nommées.

**Palette (aplats pastel, chaleureux et lisibles).**
- Fonds / refuge : pêche crème `#FFF3E0`, bois clair `#E8CFA9`, ciel doux `#DDECF5`.
- Accents chaton / coussin : rose corail `#FF8FA3`, roux clair `#F0B27A`, gris tabby neutre `#B8B0AA`.
- Rareté (cadres, du plus fréquent au plus rare) : gris `#B0A99F` → vert doux `#8FCB9B` → bleu `#7FB6E0` → violet-lavande `#B79CE0` → or rayonnant `#F2C94C`.
- Interface : crème translucide `#FFF8EF` sur cadres arrondis, texte brun chaud `#6B4F3A`.

**Point de vue et échelle.** Vue de face / composition frontale posée (le refuge est une scène-tableau, pas une vue de dessus). Cible d'affichage **640x480** : chaque silhouette doit rester identifiable à cette résolution — priorité à la lisibilité de la forme sur le détail. Les chatons se lisent d'abord à leur cadre de rareté (couleur + épaisseur + taille), pas au détail du pelage, pour satisfaire une distinction visuelle sans lecture de texte.

**Ton.** Mignon, chaleureux, bienveillant, sans aucune menace : ni combat, ni dégâts, ni écran de défaite. Le seul « grand moment » visuel est le prestige, traité comme une renaissance gratifiante et non comme une victoire/défaite.

**Références de style (advisory, non vérifiées mécaniquement).** Registre visuel Neko Atsume / Cookie Clicker : props cosy, chatons ronds, interface douce et arrondie. Ces références orientent, elles ne sont pas un critère d'oracle.

## 2. RATIONALE

Chaque choix visuel dérive du `product_snapshot.md` :

- **Coussin/pelote central très lisible + halo d'appel au clic** ⟸ section 1 (« objet cliquable au centre qui appelle le clic »), R1 (clic incrémente le compteur), R13 (réaction visible dans la même frame), R21 (indicateur visuel au premier lancement). C'est l'objet le plus regardé du jeu : il obtient la silhouette la plus forte et un état de feedback dédié.
- **Cadres de rareté à 5 tiers, distinguables sans texte** ⟸ section 1 (« apparence visuellement différente selon sa rareté, reconnaissable au premier coup d'œil »), R7 (≥6 chatons nommés porteurs d'un palier de rareté), R8 (rareté distinguable visuellement au-delà d'un seuil de pixels), R9 (les tiers rares moins fréquents que les communs). La différenciation est portée par **couleur + épaisseur de cadre + taille**, ordonnée du gris (commun) à l'or (légendaire), pour que la « chasse à la collection » (section 3, ressenti) soit lisible d'un coup d'œil.
- **Deux fonds de lieu distincts** ⟸ R10 (≥2 lieux : refuge de départ + ≥1 débloqué au prestige) ; le second lieu change franchement de teinte dominante pour matérialiser la méta-progression (section 2, « débloque le second lieu »).
- **Trois props de décor identifiables** ⟸ section 1 (« des objets décorent et habitent la scène »), R11 (≥3 objets distincts présents et identifiables). Griffoir / gamelle / souris-jouet : trois silhouettes franchement différentes pour éviter toute confusion.
- **HUD compteur + taux/sec toujours visible, notation abrégée** ⟸ R2 (compteur et taux visibles en permanence), R19 (≥10000 affiché en K/M/B). Cadre haut permanent, typographie ronde, gabarit prévu pour texte abrégé.
- **Panneau boutique et panneau quêtes** ⟸ section 1 (« panneau de boutique », « panneau de quêtes »), R5/R6 (améliorations et coûts croissants), R12 (≥3 quêtes à objectifs affichés). Deux panneaux au même langage d'UI arrondi, avec un gabarit de ligne réutilisable.
- **Écran de prestige gratifiant, jamais un écran de défaite** ⟸ R17 (prestige = reset + multiplicateur permanent) et R18 (aucun contenu de combat/défaite). Le jeu n'a **pas** d'écran de victoire ni de défaite : ce sont des entités volontairement absentes, pas un oubli (voir §3, note).
- **Jeu d'icônes cohérent (améliorations/quêtes)** ⟸ R5 et R12 : chaque amélioration et chaque quête a besoin d'une vignette lisible ; un set d'icônes au même contour garantit la cohérence.
- **Effet de clic (particules + texte flottant «+N»)** ⟸ R13/R21 et section 3 (« récompense immédiate à chaque clic »). Particules SVG simples destinées à être animées par le moteur.
- **Audio hors périmètre de cette bible.** R14 (4 sons distincts) est satisfait par de l'audio **procédural** (charter (e) : « audio procedural accepté ») écrit par le builder — aucun asset visuel ni sonore n'est donc demandé ici. Cette exclusion est une décision assumée, pas un manque de couverture.

La couverture réelle besoin↔requête est portée par les données structurées ci-dessous et par `asset_requests.json` — **cette prose ne prétend aucune couverture que la section 3 et les requêtes ne démontrent pas mécaniquement** (la prose n'est jamais lue par l'oracle `check_artbible.mjs`).

## 3. BESOINS VISUELS

Chaque entité visuelle distincte du produit est listée ci-dessous. `required:true` dès qu'une Règle observable (Rn) la cite ou qu'elle est centrale à la boucle. Aucune entité centrale n'est reclassée `false` pour éviter d'en produire la requête. Les écrans de victoire/défaite ne sont **pas** listés : le jeu n'a pas d'état de défaite (R18) ni de victoire (genre idle, `has_win_state=false`) — absence par conception, pas entité omise. L'audio (R14) est procédural, hors périmètre visuel.

```json
{
  "visual_requirements": [
    { "id": "central_cushion", "entity_role": "item", "required": true, "description": "Coussin rond moelleux avec pelote de laine posee dessus — objet cliquable central. SVG ~256px : cercle coussin creme #FFF3E0 a couture ondulee, pelote laine rose corail #FF8FA3 en 3 arcs de fil, petit reflet blanc. Deux etats : repos, et un halo/anneau lumineux doux d'appel au clic (R21). Silhouette forte, contour 2-3px, lisible a 640x480." },
    { "id": "kitten_common", "entity_role": "collectible", "required": true, "description": "Chaton COMMUN (rarete la plus frequente). Squelette SVG ~128px partage entre tous les tiers : corps ovale, tete ronde, 2 oreilles triangulaires, queue courbe, 2 yeux points + museau. Palette gris tabby neutre #B8B0AA, cadre fin gris #B0A99F (le plus petit/leger). Rarete lisible sans texte via couleur+cadre+taille (R8). Fond transparent." },
    { "id": "kitten_uncommon", "entity_role": "collectible", "required": true, "description": "Chaton PEU COMMUN. Meme squelette SVG que le commun, palette creme/roux clair #F0B27A, cadre vert doux #8FCB9B legerement plus epais. Distinct au premier coup d'oeil du commun par la teinte et le cadre (R8, R9)." },
    { "id": "kitten_rare", "entity_role": "collectible", "required": true, "description": "Chaton RARE. Squelette SVG partage, palette bleu-gris, cadre bleu #7FB6E0 plus marque, petit ornement (collier/noeud). Reconnaissable sans lire de texte (R8)." },
    { "id": "kitten_epic", "entity_role": "collectible", "required": true, "description": "Chaton EPIQUE. Squelette SVG partage, palette violette/lavande, cadre violet-lavande #B79CE0 ornemente, motif de petites etoiles discretes, leger halo. Cadre plus grand (R8)." },
    { "id": "kitten_legendary", "entity_role": "collectible", "required": true, "description": "Chaton LEGENDAIRE (sommet de rarete). Squelette SVG partage, palette doree pastel, cadre or rayonnant #F2C94C avec petites etincelles et halo lumineux — le plus grand et le plus orne, immediatement identifiable (R7, R8). Sa moindre frequence d'acquisition (R9) est une regle de gameplay, pas un fait visuel." },
    { "id": "place_shelter", "entity_role": "environment", "required": true, "description": "REFUGE de depart : fond de scene plein ecran 640x480. Mur pastel peche #FFF3E0, sol bois clair #E8CFA9, fenetre ronde avec lumiere douce. Aplats plats, zones de repos pour poser les sprites chatons. Ambiance cosy, aucune menace (R10, R18)." },
    { "id": "place_second", "entity_role": "environment", "required": true, "description": "SECOND LIEU debloque au prestige : fond plein ecran 640x480 franchement distinct du refuge (ex. veranda/jardin ensoleille, dominante verte/ciel #DDECF5). Meme langage plat pastel, reconnaissable comme un nouvel endroit (R10, meta-progression)." },
    { "id": "prop_scratching_post", "entity_role": "item", "required": true, "description": "GRIFFOIR : poteau enroule de corde beige sur socle, SVG ~96px, formes simples, palette bois/corde. Prop de decor identifiable qui habite la scene (R11)." },
    { "id": "prop_food_bowl", "entity_role": "item", "required": true, "description": "GAMELLE : bol arrondi pastel avec croquettes/lait, SVG ~80px, contour simple + petit reflet. Prop distinct des autres (R11)." },
    { "id": "prop_toy_mouse", "entity_role": "item", "required": true, "description": "SOURIS-JOUET : petite souris en feutrine grise avec queue en ficelle, SVG ~64px, formes rondes mignonnes. Prop distinct des autres (R11)." },
    { "id": "hud_counter", "entity_role": "ui", "required": true, "description": "Bandeau HUD haut : grand compteur de ronrons + sous-ligne taux ronrons/sec, toujours visibles (R2). Cadre arrondi creme translucide #FFF8EF, typographie ronde brun chaud #6B4F3A, pictogramme ronron (coeur/note). Gabarit SVG nine-slice + emplacements de texte supportant l'affichage abrege 12.3K / 4.5M (R19)." },
    { "id": "shop_panel", "entity_role": "ui", "required": true, "description": "PANNEAU BOUTIQUE : liste verticale d'entrees (chaton ou amelioration) avec vignette, nom, prix croissant et bouton d'achat. Cadre arrondi pastel, lignes alternees douces. SVG : cadre + un gabarit de ligne reutilisable (R5 ameliorations, R6 couts croissants)." },
    { "id": "quest_panel", "entity_role": "ui", "required": true, "description": "PANNEAU QUETES : liste d'au moins 3 objectifs, chacun avec libelle, indicateur d'avancement et coche de completion. Cadre arrondi assorti a la boutique. SVG : cadre + gabarit de ligne de quete (R12)." },
    { "id": "prestige_screen", "entity_role": "ui", "required": true, "description": "ECRAN DE PRESTIGE : overlay doux plein ecran 640x480, grande icone de renaissance (chaton etoile / coeur rayonnant), texte du multiplicateur permanent >1 et bouton de confirmation. Ton chaleureux et gratifiant. Ce n'est PAS un ecran de defaite — le jeu n'en a aucun (R17, R18)." },
    { "id": "upgrade_icons", "entity_role": "icon", "required": true, "description": "JEU D'ICONES coherent pour ameliorations et quetes (ex. patte, coeur, poisson, pelote, etoile), grille ~48px chacune, meme contour/epaisseur et palette pastel. Servent de vignettes dans boutique et panneau quetes (R5, R12)." },
    { "id": "click_effect", "entity_role": "effect", "required": true, "description": "FEEDBACK DE CLIC : petit eclat au point de clic — coeurs/etincelles pastel qui montent + texte flottant '+N' de ronrons. Particules SVG (coeur, etincelle) destinees a etre animees par le moteur, reaction dans la meme frame que le clic (R13, R21)." }
  ]
}
```
