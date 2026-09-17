# Journal — jeu `games/guild_manager/` (sessions 2026-09-16 et 2026-09-17)

*Archivé le 2026-09-17 depuis `00_CURRENT_CONTEXT.md` (règle : handoff < 100 lignes).
Source : session Claude Code, branche `claude/guild-management-game-21jcqk`.*

## Itérations, dans l'ordre des retours de Pierre
1. **Livraison initiale** (2026-09-16) — gestion de guilde tour par tour sur le modèle `p3_alpha` :
   recrutement, équipement, xp, changement de classe, missions solo/équipe/raid, salaires, raid final.
2. **« On comprend mal l'or et l'équipement »** — ligne de trésorerie (jours de salaires couverts),
   or attendu des missions en cours, achat-et-équipement en un geste, messages explicites.
3. **« C'est mou, pas de lien entre classes et missions, y a-t-il un vrai combat ? »** — moteur de combat v2 :
   vagues, initiative, lignes avant/arrière, jets de toucher et de critique, mana, compétences à recharge,
   statuts, ennemis typés par thème avec IA, journal tour par tour. Thèmes favorisant des classes.
4. **« Améliorer la guilde, progression du nombre d'aventuriers, répartition de l'xp »** — 5 bâtiments
   (Quartier, Forge, Alchimiste, Scriptorium, Taverne), potions bues en mission, parchemins, fiche de personnage,
   rattrapage d'xp pour les membres sous la moyenne.
5. **« On ne s'attache pas, on ne les différencie pas, la taverne n'intéresse pas »** — portraits SVG générés,
   patronymes uniques, 14 traits, titres gagnés par les actes, rejeu de combat animé depuis des événements
   structurés, taverne refondue (infirmerie, moral, renouvellement des candidats).
6. **« Des races, un artisanat, une fenêtre d'inventaire, les classes avancées trop tard »** — 6 races
   (stats, capacité de combat, morphologie du portrait), 6 métiers cumulatifs en bonus de guilde, fiche-inventaire
   avec comparaison par statistique, maîtrise abaissée du niveau 10 au niveau 6.
   **Défaut vérifié à cette occasion** : les statistiques des classes précédentes étaient conservées, mais leurs
   compétences étaient perdues au changement de classe. Corrigé par l'héritage des compétences.
7. **« Des groupes de 8, 3 à la fin, switcher les membres, choisir les compétences »** — escouades (3 × 8),
   composition par archétypes avec alertes, envoi en bloc, choix explicite des compétences, invocations.
8. **« 3 compétences par classe, passives ou actives, éviter de tout maîtriser »** — normalisation à 3 compétences
   par classe (13 passives, 29 actives), croissance des classes secondaires divisée par deux, dispersion d'xp
   au-delà de deux classes, affinités d'équipement par rôle.
9. **« 1 groupe principal, 2 secondaires, une file de solos »** — hiérarchie d'escouades (principale +20 % or et
   renom, formations +25 % xp) et file d'entraînement solo avec intégration des aventuriers prêts.
10. **« Cherche des idées dans le folklore RPG »** — recherche web, puis choix de Pierre : chaîne d'éveil façon
   attunement (3 sceaux), bestiaire à paliers, guilde rivale qui rafle les contrats.

## Pistes proposées et NON retenues à ce stade
Stress et afflictions façon Darkest Dungeon · liens de compagnonnage façon Fire Emblem · retraite, mentorat et
héritage · priorité de butin type DKP · ennemis calibrés sur la puissance de la guilde façon Battle Brothers.

## État mesuré au 2026-09-17
- Oracle `run-oracle.mjs` PASS : 101 tests `node --test` · e2e Playwright 21/21 (vrais clics) · solvabilité PASS
  + déterminisme 60 jours.
- Régisseur : 3 escouades pleines, 3 sceaux brisés, victoires entre J88 et J118, guilde rivale tenue derrière.
- 18 fichiers, ~6 100 lignes, zéro dépendance. `node server.mjs` → http://localhost:4731.
- Artefact jouable : https://claude.ai/artifact/R58fvm1XGfMekhVa7TqCtY (bundle d'un seul fichier, hors dépôt).
- **Rien n'est commité** : règle absolue du CLAUDE.md, en attente d'un GO explicite de Pierre.
