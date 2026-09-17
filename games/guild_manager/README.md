# Guild Manager — gestion d'une guilde d'aventuriers

*Généré le 2026-09-16 — source : session Claude Code (branche `claude/guild-management-game-21jcqk`), demande Pierre « un jeu où on doit gérer une guilde d'aventuriers ».*

Jeu de gestion au tour par tour (1 tour = 1 jour), navigateur, zéro dépendance.
Lancer : `node server.mjs` puis ouvrir http://localhost:4731 (port via `GUILD_PORT`).

## Boucle de jeu
0. **Races** (`RACES`) : Humain (aucun modificateur de stat, +10 % xp, une compétence héritée de plus) · Nain (+20 % PV,
   +15 % DEF, −15 % SPD, insensible au poison) · Elfe (+20 % SPD, +15 % MAG, −10 % PV, +10 % de précision) ·
   Orc (+20 % ATK, +10 % PV, −20 % MAG, soif de sang cumulative après chaque ennemi abattu) · Halfelin (+25 % SPD,
   −10 % ATK, 15 % d'esquive) · Gnome (+25 % MAG, −15 % PV, sorts 25 % moins chers). La race change aussi le visage
   (oreilles en pointe, défenses, barbe, teint, stature).
0b. **Métiers** (`CRAFTS`, niveaux 0 à 5, seuils `CRAFT_THRESHOLDS`) : un artisanat par aventurier, +1 point par jour
   passé à la guilde (hors mission). Les niveaux de TOUS les artisans se cumulent en bonus de guilde :
   Forgeron (−3 % prix de la Forge par niveau, +1 palier tous les 3) · Alchimiste (1 potion par niveau tous les 5 jours) ·
   Cuisinier (+2 % de moral par niveau) · Scribe (+4 % d'xp par niveau) · Herboriste (−1 jour de convalescence tous les 2) ·
   Négociant (+4 % d'or par niveau). Changement de métier depuis la fiche (gratuit tant qu'il n'a rien appris, 120 or ensuite, progression remise à zéro).
0c. **Vos aventuriers** : chacun a un **portrait généré** (stable, dérivé de son identifiant), un prénom + patronyme unique
   dans la guilde, et des **traits de caractère** tirés au recrutement (`TRAITS`, 14) qui modifient ses statistiques
   (Brave, Colosse), son combat (Chanceux, Féroce, Teigneux, Vigilant, Béni) ou la gestion (Érudit, Frugal, Loyal, Éclaireur).
   Leurs actes leur valent des **titres** (`TITLES`) : l'Éprouvé, le Boucher, Brise-Chefs, le Guérisseur, l'Invaincu…
   La **fiche** (clic sur le portrait) est aussi la fenêtre d'inventaire du personnage : statistiques détaillées avec la part
   de l'équipement, race et capacité, traits, faits d'armes, compétences (actives et héritées), métier avec sa barre de
   progression, trois emplacements d'équipement en poupée, et l'inventaire de la guilde trié par gain avec le détail
   statistique par statistique, un filtre « ce qu'il peut porter » et un bouton « Équiper au mieux ».
1. **Recruter** à la taverne (3 candidats/jour, classes de base, niveau selon le rang).
2. **Équiper** : un objet sur deux sort de la forge avec une **affinité** de rôle (du Gardien, du Traqueur, du
   Sanctuaire) qui rend `AFFINITY_BONUS` = +25 % de ses statistiques à qui tient ce rôle, et se paie 30 % plus cher.
   Boutique (6 objets/jour, paliers fer / acier / runique) → « Acheter et équiper » ou inventaire → fiche.
   Les armes sont restreintes par classe (un mage ne porte pas d'épée).
3. **Progresser (multiclasse, à la D&D)** : l'xp va à la classe active (`xpToNext(L) = 24 × L`, niveau de classe max 20).
   Les stats cumulent la croissance de toutes les classes pratiquées. Changer de classe de base est gratuit, les niveaux restent.
   **Spécialisation** : une classe secondaire ne rend que `SECONDARY_GROWTH` = la moitié de sa croissance, et
   au-delà de deux classes pratiquées l'apprentissage ralentit de 12 % par classe (`focusMultiplier`, plancher 50 %).
   Tout maîtriser reste possible mais coûte en puissance brute : mesuré, un Guerrier 18 pur atteint 179 de puissance
   contre 163 pour un Paladin 6 issu de Guerrier 6 + Clerc 6 (18 niveaux au total), qui gagne en revanche 9 compétences
   accessibles et deux bonus de maîtrise.
   Une classe est **maîtrisée au niveau 6** (+6 HP, +1 aux autres stats, permanent) — abaissé de 10 le 2026-09-17,
   les classes avancées arrivaient trop tard.
   **Les acquis restent** : chaque classe maîtrisée lègue sa compétence signature (`learnedSkills`), portée en combat
   en plus de celles de la classe active, dans la limite de `MAX_LEARNED_SKILLS` (+1 pour un Humain).
4. **Classes avancées** (300 or) : deux bases maîtrisées (niveau 6 chacune). Paladin = Guerrier + Clerc · Berserker = Guerrier + Voleur ·
   Rôdeur = Archer + Clerc · Assassin = Archer + Voleur · Archimage = Mage + Guerrier · Nécromancien = Mage + Voleur ·
   Prêtre = Clerc + Mage. **Légendaires** (1000 or) : Champion = 2 parmi Paladin/Berserker/Prêtre · Légende = 2 parmi les 4 dps avancés.
4b. **Escouades, colonne vertébrale de la guilde** : 3 groupes de `SQUAD_SIZE` = 8, débloqués par le Quartier
   (1 → 2 → 3, effectif logé 8 → 24), hiérarchisés par `SQUAD_RANKS` :
   l'**escouade principale** porte le renom (+20 % d'or et de réputation), les deux **escouades de formation**
   font monter la relève (+25 % d'expérience). La mission retient l'escouade qui la porte (`mission.squadId`) et
   applique son barème au compte-rendu ; une équipe montée à la main n'a aucun bonus.
   Onglet *Escouades* : renommage, affectation, déplacement entre escouades et réserve, lecture de composition
   (rôles de classe, lignes avant/arrière, archétypes de compétences) et alertes sur les manques. Chaque mission
   propose un bouton par escouade qui l'envoie en bloc (membres disponibles, dans la limite de l'effectif).
4b-bis. **File d'entraînement** : tout aventurier sans escouade part chaque jour en quête solo (`runTrainingQueue`) :
   +`TRAINING_XP` = 22 xp, +3 or, 8 % de risque de blessure d'un jour. Il devient **prêt** au niveau total
   `TRAINING_READY_LEVEL` = 6, et `fillSquadsFromQueue` (bouton « Intégrer les aventuriers prêts ») complète les
   escouades avec les plus puissants d'entre eux. Un membre d'escouade ne s'entraîne pas : il sert.
4c. **Trois compétences par classe** (`CLASSES[x].skills`, invariant testé), actives ou **passives** (`SKILLS[x].kind`).
   Une passive ne consomme pas de tour : elle modifie le combattant en permanence (Endurance +15 % PV, Précision +10 % de
   toucher, Arcanes +20 % magique, Foi +25 % de soins, Esquive, Serment +15 % DEF, Fureur +10 % ATK, Pistage +25 % contre
   les Bêtes, Ombre +15 % de critique, Savoir +30 % de mana, Liturgie régénération doublée, Bravoure +10 % partout,
   Aura légendaire +10 % ATK/MAG pour toute l'escouade).
4d. **Compétences au choix** : `availableSkills` expose TOUTES les compétences de la classe active et de chaque classe
   maîtrisée. Le joueur coche celles que l'aventurier emporte (`toggleSkill`, `adv.loadout`), dans la limite de
   `MAX_LEARNED_SKILLS` (+1 pour un Humain) ; l'ordre de sélection est l'ordre de priorité en combat. `resetLoadout`
   revient à la sélection automatique. Archétypes (`SKILL_ROLES`) : corps à corps, distance, invocation, contrôle,
   soin, amélioration, affaiblissement. Exemple : Guerrier ★ + Clerc ★ → Paladin, qui pioche dans 9 compétences et en porte 5.
4e. **Invocations** : Loup spectral (Rôdeur), Squelette servile (Nécromancien), Élémentaire (Archimage), Esprit gardien
   (Prêtre). L'invoqué combat aux côtés de l'escouade, ses statistiques dérivent de la MAG de l'invocateur, il disparaît
   à la fin de la vague et ne peut pas tenir une vague à lui seul.
5. **Missions** : *solo* (1, 1–2 vagues), *équipe* (2–4, 2–3 vagues, +1 ennemi, chef), *raid* (4–6, 4–6 vagues, +2 ennemis, gros chef, rang ≥ 2).
   Chaque mission a un **thème** (Bêtes, Morts-vivants, Brigands, Horde, Démons) qui favorise 2–3 classes (+30 % dégâts).
6. **Combat simulé v2** (`combat.mjs`) : tours à l'initiative (SPD), deux lignes (avant : guerrier, paladin, berserker, champion,
   voleur, assassin, légende ; arrière : archer, mage, clerc, rôdeur, archimage, nécromancien, prêtre). Jet de toucher
   (85 % ± 1,5 %/pt de SPD, borné 55–98), critique (5 % + 0,3 %/SPD, ×1,5 ; voleur/assassin 30 % ×2).
   Mana pour les lanceurs (10 + MAG + niveau, +10 %/tour, +50 % entre vagues) et compétences à recharge (`SKILLS`, 20).
   Statuts : poison, étourdi, béni (+30 % ATK), protégé (+DEF), maudit (−25 % ATK), provocation. Passifs : Garde, Riposte,
   Tir précis, Rage, Double action, attaques sacrées (×1,5 morts-vivants) ou arcaniques.
   Ennemis par thème (3 types + chef) avec IA : mêlée (vise l'avant, 70 % le tank), tireur (70 % l'arrière), brute (×2 tous les 4 tours),
   lanceur (magie, ignore ¾ DEF), soutien (soigne les siens), chef (souffle sur tout le groupe). Le zombie empoisonne, la succube maudit.
   Dégâts physiques = ATK × mult × (±25 %) − DEF/2, magiques = MAG × ratio − DEF/4. Repos 50 % PV entre vagues.
   Le % affiché = 24 simulations déterministes de l'équipe cochée. Membre à terre = blessé (durée de la mission).
   Chaque combat réel produit un journal tour par tour (≤ 400 lignes, 8 derniers conservés) visible dans l'onglet Journal.
6b. **Rejeu animé** : chaque combat résolu est rejoué image par image (`replay.mjs`) à partir des événements structurés
   émis par le moteur : portraits face à face, barres de vie, chiffres de dégâts, critiques, bannières de compétence,
   bilan final (or, réputation, xp, héros du jour). Lecture, pause, ×1/×2/×4, saut à la fin.
7. **Guilde** (`BUILDINGS`, 3 niveaux chacun) : Quartier (4 → 6 → 8 → 10 aventuriers : 200/500/1200 or) · Forge (palier d'objets 1 → 2 → 3,
   4 → 8 objets, remise 20 % au max : 250/600/1500) · Alchimiste (potion 40 % → grande 60 % → élixir 100 % + dissipe : 150/400/1000 ;
   chaque partant emporte la meilleure potion en stock, bue sous 35 % PV, rendue si non bue) · Scriptorium (parchemin d'entraînement
   +100 xp 80 or → étude +300 xp 220 or → maîtrise +1 à toutes les stats 500 or, max 3 par aventurier : 200/500/1200) ·
   **Taverne** (150/400/1000), cœur de la guilde : 3 → 6 candidats de niveau +0/+2/+5/+9 avec 1 puis 2 traits ·
   **infirmerie** (convalescence raccourcie de 1 puis 2 jours par nuit) · **moral** (+5 % puis +10 % ATK et DEF en mission,
   appliqué au combat ET à l'estimation) · **renouvellement** des candidats contre or.
8. **Répartition de l'xp** : chaque membre reçoit l'xp de la mission (moitié en cas d'échec) dans sa classe active ; un membre dont le
   niveau total est sous la moyenne de la guilde − 3 reçoit × 1,5 (rattrapage).
9. **Fin de journée** : missions avancent, salaires (`3 + niveau total / 2` par tête ; 3 soirs impayés → un vétéran part),
   blessés récupèrent, tableau / taverne / boutique se renouvellent.

**Chaîne d'éveil** (inspirée de l'attunement d'EverQuest et de WoW) : au rang `ATTUNEMENT_RANK` = 3, un **sceau**
apparaît au tableau, un par thème (`SEALS` : Ossuaire, Horde, Braise), un seul à la fois, sans péremption.
Le briser arrache un fragment ; les trois fragments ET le rang 4 ouvrent le raid final.

**Bestiaire** : chaque espèce abattue est comptée (`state.bestiary`). Aux paliers `BESTIARY_TIERS` (10, 30, 75 proies)
la guilde passe Repéré, Étudié puis Maîtrisé, gagne +5 / +10 / +15 % de dégâts permanents contre elle
(`loreTable` est passée au combat) et découvre ses caractéristiques. Onglet dédié.

**Guilde rivale** (`RIVAL_NAME`) : chaque soir, 45 % de chances qu'elle rafle le contrat le plus juteux laissé au
tableau depuis plus d'un jour, sceaux et raid final exclus. Elle engrange la réputation correspondante ;
tant qu'elle vous devance, recruter coûte 25 % plus cher.

**Victoire** : rang 4 (réputation 350) et les trois fragments débloquent le raid final *Le Cœur du Léviathan* (difficulté 10) ; le réussir gagne.
**Défaite** : guilde vide sans or pour recruter, ou 365 jours écoulés.

## Fichiers
| Fichier | Rôle |
|---|---|
| `data.mjs` | tables : classes, objets, missions, constantes d'équilibrage |
| `rng.mjs` | mulberry32 ; l'état du générateur vit dans `state.rngState` (déterminisme) |
| `adventurer.mjs` | multiclasse : niveaux par classe, stats cumulées, maîtrises, prérequis, équipement |
| `portrait.mjs` | portraits SVG déterministes et glyphes d'ennemis |
| `combat.mjs` | simulation par vagues, compétences, statuts, traits, événements structurés, estimation |
| `replay.mjs` | rejeu animé d'un combat à partir des événements |
| `missions.mjs` | génération (type, thème, difficulté), résolution via combat, récompenses |
| `guild.mjs` | état de guilde, bâtiments, potions, parchemins, actions du joueur, `endDay`, snapshot/restore |
| `bot.mjs` | régisseur glouton + plan de carrière multiclasse (solvabilité, bouton « Régisseur : 1 jour ») |
| `render.mjs` / `input.mjs` / `index.html` | UI DOM, `data-action` → `InputHandler` → `guild.mjs` |

## Oracle
`node run-oracle.mjs` = (a) `node --test logic.test.mjs properties.test.mjs` · (b) `node e2e.mjs` (Playwright, vrais clics) ·
(c) `node solvability.mjs` (le bot doit vaincre le Léviathan en ≤ 250 jours, graine 12345, + déterminisme sur 60 jours).
Résultat mesuré au 2026-09-17 (chaîne d'éveil, bestiaire, guilde rivale) : 101 tests verts, e2e 21/21, solvabilité PASS ; 5 graines gagnent entre J88 et J118 en brisant les 3 sceaux, avec 18 à 20 espèces étudiées et une rivale maintenue derrière (609–854 rép. contre 1133–1734).
