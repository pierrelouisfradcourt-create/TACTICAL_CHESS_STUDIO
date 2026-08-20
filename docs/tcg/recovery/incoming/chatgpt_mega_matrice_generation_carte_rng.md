# Mega Matrice de génération de cartes — Graphe Sémantique (récupéré ChatGPT)

> **Source** : ChatGPT, projet « chess data centralisation », conversation « Matrice création carte RNG »
> (dernière discussion de Pierre sur le sujet). Récupéré le 2026-07-06 via navigateur (session Pierre).
> **Statut** : DESIGN / VISION — d'après ChatGPT lui-même, « toute la partie autobattler / cartes / RNG contrôlé
> est aujourd'hui considérée comme roadmap / idea dump, pas vérité runtime ». À traiter comme canon-candidat, PAS
> comme code existant. C'est une **3ᵉ version du générateur**, distincte de la matrice budget-de-puissance
> (`repos/games/ChessTCG/MASTER_DOCS/04_RNG_FORMULA_CANON`) — bien plus ambitieuse.
>
> **Traces citées par ChatGPT à chercher** (côté sources) : `tactical_chess_rng_bible.md` dans `01_MASTER_BIBLE`,
> et des bases de contenu `ability_library_5000.csv` / `ability_library_10000.csv` + matrices de synergies dans le
> corpus `Tactical_Chess_ULTRA_FUSED_MAST…` (probablement = les `MEGA_CORPUS_PART_1/2.md` 136 Mo du Bureau).

---

## Principe fondateur
Une carte n'est **pas un objet statique** mais **le résultat d'un graphe de matrices**. Le moteur ne produit **PAS
directement des statistiques** : il produit des **TAGS**, et les tags produisent les bonus. Ainsi les mots restent
**indépendants des règles** (extensible : ajouter un mot enrichit tout le système sans toucher aux règles).

**Le nom devient un système de gameplay** (name-driven) : « Dragon Blanc aux yeux Bleus » hérite automatiquement des
tags/bonus de Dragon + Blanc + Yeux + Bleu. Plus de séparation lore/gameplay : le nom raconte ce que la carte fait.

## Pipeline de génération
```
SEED
 ├── Univers ├── Faction ├── Race ├── Classe ├── Alignement
 ├── Biome   ├── Époque  ├── Rareté ├── Niveau ├── Budget de puissance
      ▼
Génération de l'IDENTITÉ
 ├── Nom ├── Titre ├── Surnom ├── Épithète ├── Famille ├── Maison ├── Légende
      ▼
Génération GAMEPLAY
 ├── Stats ├── Keywords ├── Compétences ├── Passives ├── Actives
 ├── Trigger ├── Coût ├── Cooldown ├── Limitations
      ▼
Validation ▼ Carte finale
```
Version « mémoire » antérieure du pipeline : `Seed → Faction → Archétype → Rareté → Coût → Stat budget →
Capacité principale → Capacité secondaire (proba) → Tags → Restrictions → Synergies → Poids d'apparition → Validation`.
Une 2ᵉ matrice pilotait probabilités / exclusions / combos interdits / combos autorisés / budgets de puissance / courbes.

## Matrice Générale (exemple de tirage)
| ID | Matrice | Exemple |
|---|---|---|
| M001 | Univers | Dark Fantasy |
| M002 | Époque | Ancienne |
| M003 | Faction | Pirates |
| M004 | Race | Dragon |
| M005 | Classe | Mage |
| M006 | Sexe | Aucun |
| M007 | Rareté | Légendaire |
| M008 | Niveau | 8 |
| M009 | Budget puissance | 124 |
| M010 | Budget complexité | 14 |

## Identité (N001–N013)
Prénom · Nom · Titre · Maison · Surnom · Adjectif · Origine · Épithète · Couleur · Matière · Animal · Arme · Élément.

### Grammaire générative des noms
```
[Titre] + [Nom] + [de] + [Origine] + [Épithète]
[Race]  + [Couleur] + [aux] + [Organe] + [Couleur]
[Titre] + [Adjectif] + [Race]
```
Exemples : *Grand Inquisiteur des Cendres* · *Dragon Primordial du Néant* · *Baron Corrompu de Valoria* ·
*Oracle aux Mille Yeux* · *Reine des Tempêtes Éternelles*. Chaque segment injecte des tags → résolution des bonus,
vérif incompatibilités, synergies, ajustement du budget.

## Dictionnaire des Tags (le cœur)
Chaque mot = une fiche de tags. Exemples :
- **Dragon** : Race=Dragon, Feu, Vol, Ancien, Écailles, Boss, Souffle, Masse, Puissance
- **Blanc** : Pureté, Lumière, Ordre, Glace, Défense, Sacré
- **Bleu** : Arcane, Eau, Distance, Mana, Vision, Intelligence

Puis **tags → bonus** :
- Feu → +2 dégâts feu, Résistance feu, Souffle feu
- Vol → Ignore terrain, +Mobilité, Vulnérable Anti-Air
- Massif → +PV, +Poids, −Hâte
- Vision → Révélation, Détection, Sniper, Ignore camouflage, Portée +2

**Multi-couches** : chaque mot influence Stats · Gameplay · VFX · SFX · Lore · Prix · Rareté · IA · Dialogue ·
Succès · Quêtes · Drop. Ex. **Maudit** → +2 ATK, −1 chance, aura noire, musique spéciale, PNJ méfiants, +loot démoniaque, réputation négative.

## Matrices lexicales
- **Couleurs** : Rouge(Rage/Feu/Sang) · Bleu(Arcane/Eau/Intelligence) · Vert(Nature/Poison) · Noir(Mort/Ombre/Corruption) · Blanc(Sacré/Défense) · Violet(Chaos/Vide) · Or(Noble/Prestige) · Argent(Lune/Magie) · Bronze(Guerrier)
- **Titres** (multiplicateurs) : Roi(Leadership) · Empereur(Aura, +20%HP, +20%Leadership, coût+3, +rare) · Baron(Économie) · Seigneur(Commandement) · Oracle(Vision) · Inquisiteur(Purification) · Gardien(Protection) · Exécuteur(Exécution) · Fléau(Corruption) · Champion(Duel)
- **Matières** : Bois(Léger) · Pierre(Défense) · Acier(Armure) · Argent(Sacré) · Or(Prestige) · Mythril(Mana) · Obsidienne(Ombre) · Cristal(Magie) · Dragonite(Dragon) · Os · Adamantium
- **Organes** : Yeux(Vision) · Griffes(Critique) · Ailes(Mobilité) · Queue(Zone) · Cornes(Charge) · Crocs(Saignement) · Carapace(Armure) · Cœur(Régénération)
- **Adjectifs** : Ancien(PV) · Millénaire(Résistance) · Céleste(Sacré) · Infernal(Feu) · Corrompu(Ombre) · Maudit(Risque) · Éternel(Régén) · Furieux(Berserk) · Invisible(Furtivité)
- **Éléments** : Feu · Glace · Foudre · Terre · Vent · Nature · Ombre · Lumière · Chaos · Vide · Sang · Arcane
- **Lieux/Origines** : *des Glaces*(Froid/Vent/Gel) · *du Néant*(Vide/Chaos/Téléportation) · *des Abysses*(Ombre/Eau/Tentacules)
- **Épithètes** : Le Cruel · Le Sage · Le Brisé · Le Sanguinaire · Le Millénaire · L'Immortel · Le Sans-Visage · Le Dernier · Le Dévoreur(Vol de vie, consomme cadavres, grossit) · Le Céleste

## Matrices systémiques
- **Comportementale (IA)** : Agressif · Protecteur · Fuyard · Calculateur · Sacrificiel · Invocateur · Prédateur · Chasseur · Gardien · Errant
- **Personnalité (textes)** : Arrogant · Calme · Fou · Sadique · Loyal · Stoïque · Curieux · Fanatique · Timide
- **Culturelle** : Nordique · Impériale · Nomade · Nécromancienne · Elfe · Draconique · Orientale · Céleste · Souterraine (influence vocabulaire du nom, voix, bâtiments, quêtes, récompenses)

## Synergies & contraintes (combinaisons lexicales)
- **Doubles** : Dragon+Bleu→Souffle Arcane · Dragon+Rouge→Souffle Feu · Dragon+Blanc→Dragon Sacré · Dragon+Noir→Dragon Corrompu (Vol de vie) · Dragon+Ancien→+50%HP · Dragon+Feu→Immunité feu · Dragon+Empereur→Aura de commandement
- **Triples** : Dragon+Blanc+Oracle → Vision Divine (révèle cartes cachées)
- **Quadruples** : Dragon+Empereur+Ancien+Noir → Boss Mythique (Aura de Peur, Invocation, Double Taille)
- **Interdictions / antagonisme** : Mort-Vivant+Sacré → interdit **OU** « Version Déchue » ; Saint+Démon → impossible ; Lumière+Corruption → « Déchu » (arbre de transformation plutôt qu'interdiction sèche)
- **Familles** (tables de génération propres) : Dragon → Rouge / Bleu / Noir / Vert / Blanc / Doré / Primordial / Spectral
- **Évolution** : Chevalier ↓ Capitaine ↓ Commandeur ↓ Maréchal ↓ Roi ↓ Empereur (conserve l'identité, fait évoluer stats/compétences/apparence)

## Sorties dérivées des tags
- **Capacités** : Feu → Explosion / Brûlure / Mur de flammes / Souffle / Météore ; Vision → Révélation / Détection / Sniper / Ignore camouflage / Portée+2
- **Cosmétique** : Feu → particules rouges, fumée, lumière orange ; Glace → cristaux, brume, neige, traînées blanches

## La matrice ultime : le Graphe Sémantique
Tous les mots = **nœuds d'un graphe** (Dragon → {Race, Feu, Vol, Ancien, Écailles, Boss, Souffle, Trésor, Ailes} ;
Blanc → {Lumière, Glace, Sacré, Pureté, Défense, Ordre} ; Oracle → {Vision, Mana, Prophétie, Révélation, Sagesse}).
**Générer une carte = parcourir le graphe → accumuler les tags → résoudre les conflits → appliquer les synergies →
convertir en stats / capacités / IA / VFX / coût / rareté / texte.** Extensible (ajouter « Tempête », « Archonte »,
« Vermillon » enrichit tout automatiquement). Millions de cartes cohérentes à partir d'un vocabulaire limité mais
fortement connecté.
