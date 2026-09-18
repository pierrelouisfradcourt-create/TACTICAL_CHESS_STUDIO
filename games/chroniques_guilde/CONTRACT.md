# CONTRAT TECHNIQUE — prototype « Chroniques de Guilde » (titre de travail)
Date : 2026-09-17. Source : orchestrateur (session Claude Code), après les 3 documents de conception
design_aventuriers.md, design_quetes_donjons.md, design_objets_economie.md (design_village.md si présent).
Ce contrat PRIME sur les documents de conception en cas de conflit. Les documents fournissent le contenu
(tables, formules, textes) ; le contrat fixe la forme (fichiers, API, modèle de vue, ids de test).

## Fichiers (tous dans ce dossier, rien dans le dépôt git)
- `data.json`  — toutes les tables. JSON strict, clés snake_case ASCII, textes affichés en français,
  ENTIERS uniquement (permille 0-1000 pour les probabilités, centièmes pour les multiplicateurs).
- `data.js`    — généré depuis data.json : `window.GUILDE_DATA = <json>;` (une ligne, utf-8).
- `sim.js`     — moteur pur, UMD : `module.exports` sous node, `window.GuildeSim` dans le navigateur.
  Aucune dépendance. Interdit : Math.random, Date, Intl, localeCompare, toLocale*, flottants dans l'état,
  itération sur l'ordre d'insertion d'un objet pour consommer le RNG (toujours trier par id ASCII avant).
- `index.html` — page de l'artefact : `<title>` + `<style>` en tête, PAS de doctype/html/head/body.
  Charge `<script src="data.js"></script><script src="sim.js"></script>` puis le script applicatif inline.
- `test/harness.mjs` — banc d'essai (déjà écrit, NE PAS MODIFIER). `ENGINE_ONLY=1 node test/harness.mjs`
  teste le moteur seul ; `node test/harness.mjs` teste moteur + page dans Chromium.

## API du moteur (sim.js) — signatures exactes
```
newGame(seed:int, data:object, options?:{}) -> state
listManagers(state) -> string[]            // ['p1','ai_prudent','ai_audacieux'] — p1 = humain, toujours premier
planDefaults(state, managerId) -> Action[] // plan complet par défaut pour state.day (profil IA pour les IA,
                                           // plan raisonnable pour l'humain : chaque aventurier reçoit une activité)
validateAction(state, action) -> {ok:boolean, reason?:string}   // reason en français, jamais d'exception
resolveDay(state, actions:Action[]) -> {state, chronicle, log:string[]}
   // PURE : même (state, actions) => même résultat, ne mute pas l'entrée.
   // Manager sans action => planDefaults appliqué. Action invalide => ignorée, raison dans log et notices.
hashState(state) -> string   // FNV-1a 32 bits en hex sur JSON canonique (clés triées récursivement)
viewModel(state, managerId) -> VM   // seul point d'accès de l'UI à l'état (voir plus bas)
```
state : objet JSON pur (sérialisable, sans fonctions, sans undefined). Champs publics garantis :
`state.seed:int`, `state.day:int` (1 au début, la journée résolue incrémente), `state.season_length:int` (30),
`state.managers:[{id,name,kind:'human'|'ai',profile}]`. Le reste est privé au moteur.

## Actions
`{manager_id:string, day:int, type:string, payload:object}` — types :
- `assign` {adventurer_id, activity:'gather'|'train'|'craft'|'rest'|'expedition', target?:string}
   target = resource_id (gather) | attribute_id (train) | recipe_id (craft) | omis (rest, expedition)
- `vote_quest` {quest_id}            - `vote_build` {building_id}
- `craft_order` {recipe_id}          - `recruit` {recruit_id}
- `equip` {adventurer_id, item_id}   - `unequip` {adventurer_id, slot}
- `deposit` {resource_id, qty}       - `withdraw` {resource_id, qty}
- `buy` {item_id}                    - `sell` {item_id}
- `decorate` {decoration_id, x:int, y:int}
Règles : un aventurier a au plus une activité par jour (la dernière action assign valide gagne) ;
un manager n'agit que sur ses aventuriers, son inventaire, son quartier ; les votes sont un par manager ;
départage des votes à égalité : le building_id / quest_id le plus petit en ordre ASCII.

## Journée : ordre de résolution (fixe)
1 validation des actions (tri par manager_id ASCII puis ordre de réception) · 2 paie/entretien (or de guilde)
· 3 récolte · 4 entraînement · 5 forge (avancement de la file, livraison) · 6 soins/repos (infirmerie)
· 7 expédition sur la quête votée (participants = aventuriers assignés 'expedition', tous managers confondus)
· 8 marché (achats/ventes) · 9 taverne (nouvelles recrues) · 10 chantier (avancement du bâtiment voté)
· 11 fin de jour (fatigue/moral/blessures, XP, montées de niveau, expiration des quêtes, nouveau tableau)
· 12 derby si day ∈ {7,14,21,28} · 13 bilan de saison si day == 30.
RNG : mulberry32 sur entiers ; graine du jour = fnv1a(seed ^ day). Un seul flux, consommé dans l'ordre ci-dessus.

## Chronicle (retour de resolveDay et champ VM.chronicle)
```
{ day:int, title:string, headline:string,          // headline = « l'instant du jour »
  sections:[{phase:string, title:string, lines:string[]}],   // dans l'ordre de résolution, phases vides omises
  expedition:{quest_name, biome_name, participants:string[], outcome:'succès'|'échec'|'retraite'|'aucune',
              rooms:[{name, lines:string[]}], loot:string[], xp:int} | null,
  summary:{gold_delta:int, injuries:string[], level_ups:string[], recruits:string[], construction:string} }
```
Cible : 25-60 lignes par jour, français, gabarits variés (>= 30), traits de personnalité visibles.

## VM = viewModel(state, managerId) — forme exacte, tout est prêt à afficher (aucun calcul côté UI)
```
{ day, season_length, seed, hash, is_season_over,
  manager:{id,name,kind,gold},
  managers:[{id,name,kind,profile_label,gold,adventurer_count}],
  guild:{gold, prestige, upkeep_per_day, storage_capacity, storage_used,
         storage:[{resource_id,name,glyph,qty,value}]},
  roster:[{id,name,class_id,class_name,class_glyph,manager_id,manager_name,level,xp,xp_next,
           attributes:[{id,name,value}], form,fatigue,morale, injury:{days,label}|null,
           traits:[{id,name}], skills:[{id,name,level_req,unlocked}],
           equipment:[{slot,slot_name,item_name|null,rarity|null}],
           activity_options:[{activity,label,targets:[{id,label}]}],   // ce qui est permis AUJOURD'HUI
           planned:{activity,target}|null, status_label, is_available, is_mine}],
  quest_board:[{id,name,type_label,biome_name,difficulty,days,party_min,party_max,rewards_label,
                votes,voted_by_me,expires_in}],
  buildings:[{id,name,level,max_level,description,decor:{glyph,color,size,smoke,light},effect_label,
              next_cost:[{resource_id,name,qty,have}]|null,upgrade_gold,upgradable,votes,voted_by_me}],
  construction:{building_id,name,to_level,progress,needed,days_left}|null,
  forge:{level,capacity,queue:[{recipe_id,name,days_left,owner_name}],
         recipes:[{id,name,result_name,cost:[{resource_id,name,qty,have}],gold,days,available,reason}]},
  tavern:[{id,name,class_name,class_glyph,level,cost,attributes_summary,traits:[string],affordable}],
  quarter:{grid_w,grid_h,placed:[{decoration_id,name,glyph,x,y}],
           catalog:[{id,name,glyph,cost_gold,effect_label,affordable}]},
  market:[{item_id,name,rarity,slot_name,buy,sell,stock,affordable}],
  inventory:[{item_id,name,slot_name,rarity,stats_label,equipped_by|null,sell_price}],
  chronicle: Chronicle|null,   // dernière journée résolue
  history:[{day,title,headline,hash}],
  derby:{next_day|null, last:{day,result:'victoire'|'défaite'|'nul',our_score,their_score,rival_name}|null},
  season_report: {title, lines:string[]}|null,   // non nul après le jour 30
  notices:string[] }                             // actions rejetées de la dernière résolution, etc.
```

## Interface (index.html) — comportement obligatoire
- Au chargement : partie neuve graine 4242, plan du jour prérempli par planDefaults(state,'p1'), rendu au repos.
- Bouton Lancer la journée `data-testid="btn-launch"` : actions humaines de l'écran + planDefaults des IA →
  resolveDay → conserve `{day, actions, hash}` dans un journal → affiche la chronique → prépare le jour suivant.
- Bouton Rejouer `data-testid="btn-replay"` : repart de newGame(seed) et rejoue le journal complet ; écrit dans
  `data-testid="replay-result"` le mot « IDENTIQUE » (hash final égal) ou « DIVERGENCE jour N ».
- `data-testid="state-hash"` (hash courant), `data-testid="day-counter"` (texte contenant le numéro du jour),
  `data-testid="chronicle"` (conteneur de la dernière chronique, texte complet).
- Onglets `data-testid="tab-journee" | "tab-village" | "tab-effectif" | "tab-chronique" | "tab-journal"`.
- Journal : hash par jour, export du journal (textarea JSON `{seed, days:[{day,actions}]}`), import + rejeu,
  bouton Nouvelle partie avec champ graine. Sauvegarde localStorage dans try/catch, page correcte sans elle.
- Fonctionne à 400 px de large sans défilement horizontal ; thèmes clair et sombre via tokens.

## Plan graphique (décision prise, à suivre)
Couleurs clair : fond #F3F4F0 · surface #FFFFFF · encre #1B2620 · atténué #5D6B63 · trait #D6DBD3 ·
accent #1F6F78 (actions) · or #B8892B (trésorerie/récompenses) · bon #2F7D4F · alerte #B7791F · critique #B23A3A.
Couleurs sombre : fond #141A17 · surface #1D2521 · encre #E8ECE7 · atténué #9AA79F · trait #2C3631 ·
accent #5FB3BC · or #D4A64A · bon #5DBA83 · alerte #D9A441 · critique #E06B6B.
Rareté : commun = atténué, rare = accent, épique = #7B5EA7 (clair) / #B497E0 (sombre), légendaire = or.
Typo (Google Fonts, avec fallback) : titres « Bricolage Grotesque » 600/800 · chronique « Alegreya » 17-18 px,
mesure ~65 caractères · interface et chiffres « IBM Plex Sans », tabular-nums.
Mise en page : en-tête collant (jour X/30, or de guilde, hash, bouton Lancer). Bureau ≥ 960 px : deux colonnes,
gauche = onglet actif (Journée / Village / Effectif / Journal), droite = Chronique toujours visible. Mobile :
barre d'onglets fixée en bas (padding safe-area), la Chronique devient un onglet. Village = Canvas 2D,
8 parcelles en 4×2, glyphe/couleur/taille par niveau, fumée et lumière selon decor, grille 4×4 du quartier
en dessous. Aventuriers = cartes avec sélecteur d'activité et cible. Pas de carte pour tout : les listes de
ressources et de recettes sont des tableaux denses.

## V4 — dragons de biome, points d'action, savoir-faire, missions solo, mort, défaite
Date : 2026-09-18. Source : mission « Moteur V4 » (GO Pierre 2026-09-18), implémentée par le moteur ; preuves dans
`test/engine_v4_check.mjs` (remplace `engine_v3_check.mjs`). API publique inchangée ; `data.json` version 4.

### Dragons (plus de calendrier)
- `data.dragons[biome_id]` : un dragon nommé par biome (Sylvain corrompu ancestral · Drake des monts · Hydre des marais),
  profil PV/ATQ/DÉF/VIT + `mechanic` du boss du biome (`roots` · `breath` · `heads`) + souffle de zone (`breath_every`, `breath_power`),
  `materials` (2 ressources `gatherable:false`, `dragon:<biome>`), `legendary_pool` (3 objets `rarity:'legendary'`, pool `dragon_pool`,
  `flavor` FR). Paramètres communs dans `data.threats.dragon` (fuite, gardes, muraille, or, prestige, XP, `material_min/max`).
- Maîtrise : `state.biome_mastery[biome]` = +1 par quête réussie (`success`), +2 si le boss du donjon est vaincu. Les votes de quête
  préfèrent le biome le mieux maîtrisé (égalité : id ASCII) — concentration naturelle.
- Réveil (phase 11c, le soir) : `mastery ≥ constants.dragon_wake_mastery` (6) ET `day ≥ dragon_wake_day_min` (10) ET aucune menace
  en cours → présage le soir même, attaque le lendemain (phase 7b). Un seul réveil par biome et par saison. Vaincu → `slain`
  (jamais de retour) ; repoussé → revient `dragon_return_repelled` (5) jours plus tard ; ravage → `dragon_return_ravage` (3) jours.
  `state.threats[]` = `{type:'dragon', biome, dragon_id, day, presage_day, outcome}` (planifiées à la volée, vide à la création).
- Butin du vaincu : un légendaire (jamais deux fois le même par saison, `state.legendary_given`) au défenseur ayant fait le plus de
  dégâts (à défaut premier manager) ; 4-8 matériaux à l'entrepôt — l'entrepôt fait de la place en vendant les ressources ordinaires
  les moins chères (moitié du prix) ; or à la caisse ; `state.trophies.push({dragon_id, day})`. Recettes `category:'dragon'`
  (forge niveau 3, 6 recettes, résultats épiques/légendaires, pool `dragon_craft`). Les IA retirent les matériaux nécessaires puis
  commandent ; le désencombrement de l'entrepôt par les IA ne touche jamais aux matériaux de dragon.
- Combat : le dragon porte `dragon:true` ; sa mort met fin au combat même si ses rejetons vivent ; la fuite ne regarde que lui.

### Points d'action et journées composées
- `ap_max` = 3 (+1 si trait `endurant` ou terrain d'entraînement ≥ 3) ; `ap_today` = ap_max − 1 si fatigue ≥ 60 ; minimum 1.
  Coûts (`constants.ap_cost`) : train 1 · craft 1 · gather 1 · solo 2 · expedition 3 · defend 3 · rest 0. Expédition, défense et
  repos sont des **journées entières** : seules dans le plan, toujours acceptées si le héros y a droit (quel que soit ap_today).
- Action `plan` `{adventurer_id, slots:[{activity, target?}...]}` : somme des coûts des créneaux ≤ ap_today (raison sinon),
  au plus une mission solo par jour, journée entière non combinable. `assign` reste accepté = journée pleine (train/craft/gather × ap,
  expedition, rest, defend) ; `assign solo` est refusé (passer par `plan`). Blessé (sévérité ≥ 1) : repos ou forge seulement ;
  épuisé (fatigue ≥ 100) : repos.
- Résolution : phases 3-5 fusionnées en un passage « par créneau » (héros triés par id, créneaux dans l'ordre) ; rendement d'un
  créneau = rendement journalier V3 / `slot_divisor` (3), entier, min 1 (XP et chance d'accident divisées de même). Un accident
  interrompt les créneaux restants. Une ligne de chronique par héros et par activité (agrégée). Deltas du soir = Σ par activité
  de delta_journalier × PA dépensés / 3 (journée vide = repos). Ordre du jour : 1 validation · 2 paie · 3-5 créneaux · 6 infirmerie ·
  7 expédition · 7b menace · 7c missions solo · 8 marché · 9 taverne (héritiers) · 10 chantier · 11 soir (tableau solo renouvelé) ·
  11b âge · 11c réveil des dragons + présage · 12 derby · 13 bilan.
- Savoir-faire (`data.crafts`) : forge, herboristerie, archerie, discretion, endurance, erudition ; XP dans `hero.crafts[id]`,
  niveaux 1-10 par `constants.craft_xp_table`, bonus = per_level × (niveau − 1) (`per_level_class` pour ranger/rogue) :
  forge +5 %/niv points de travail · herboristerie +4 %/niv récolte · archerie +1 (+2 ranger) toucher · discretion +5 ‰ (+8 rogue)
  esquive et protège en solo · endurance +3 %/niv PV · erudition +3 %/niv XP. Gains : train → savoir-faire de l'attribut
  (`craft_by_attribute`), craft → forge, gather → herboristerie, solo → celui de la mission, expédition → endurance + savoir-faire
  de classe (`craft_by_class`). Montée de niveau signalée dans « Soir ».
- Missions solo (`data.solo_missions`, 16) : classe ou libre, difficulté 1-5, 2 PA, or + matériaux **personnels** (inventaire du
  manager), XP, savoir-faire, chance d'objet (`item_permille`), blessure par jet (`injury_permille`, ×2 sur échec, sévérité 2 si
  échec à difficulté ≥ 4). Réussite si aptitude (niveau×5 + attributs principal/secondaire + 4×niveau du savoir-faire + classe/traits,
  × performance) + tirage(0-29) ≥ `constants.solo_dc[difficulté]`. `state.solo_board[manager]` = 2 missions/jour (ids triés),
  éligibles à la classe des héros du manager et à leur niveau, renouvelées le soir.
- Préréglages (`VM.roster[].presets`) : atelier (craft × (ap−1) + train ; nécessite une commande à la forge), aventure (expédition,
  sinon solo + train), recuperation (repos), cueillette (gather × ap), defense (jour d'attaque). `planDefaults` : prudent =
  solo facile (≤ 2) + atelier/cueillette ; audacieux = expédition sinon solo la plus dure + entraînement ; humain = expédition
  (critères V3) sinon solo « raisonnable » + entraînement sinon atelier sinon entraînement/cueillette ; jour de dragon = defend V3.

### Mort et défaite
- Mort UNIQUEMENT : héros tombé à 0 PV face à un dragon (tirage `death_permille.dragon` = 400) ; ou parti en expédition/solo avec
  une blessure grave (sévérité ≥ 2) et tombé à 0 PV (`death_permille.wounded` = 300) — chemin codé mais inatteignable tant que la
  validation « blessé = repos ou forge » est en vigueur. Sinon KO classique. Mort : retiré de `state.heroes`,
  `state.graves.push({hero_id, name, day, cause})`, équipement → `state.guild_chest[{uid, item_id, from}]`, section « Deuil »,
  instant du jour 99. Héritier : offre à la taverne (phase 9 du même jour, visible le lendemain) `cost:0`, `heir_for:manager`,
  niveau = niveau de guilde − 1 (min 1), classe et épithète du défunt, traits `heritier` + un trait du défunt ; réservée au manager
  endeuillé, recrutable même effectif complet (max_heroes = 1 compris), expire après `heir_expires_days` (4).
- Défaite : le hall ne perd un niveau que s'il est ≥ 2, ou (niveau 1) s'il est le seul bâtiment ≥ 1 ou s'il a déjà brûlé
  (`state.hall_hits`). Hall à 0 après un ravage → `state.collapsed = {day, reason}`, `season_report` « Chute de la guilde »,
  `resolveDay` retourne ensuite l'état inchangé (hash identique, jour non incrémenté) avec une chronique « La guilde est dispersée ».

### viewModel — ajouts
```
VM.roster[] += { ap_max, ap_today, slots_planned:[{activity,target,label}], presets:[{id,label,slots:[{activity,target}],available,reason}],
                 crafts:[{id,name,level,xp,xp_next,bonus_label}], is_dead:false }
VM.roster[].activity_options[] += { cost_ap }   // defend (jour d'attaque, héros apte) et solo (tableau du manager, missions
                                                 // compatibles avec la classe du héros, ap_today ≥ 2) inclus quand permis
VM.solo_board = [{id,name,class_id|null,class_name|null,difficulty,cost_ap:2,rewards_label,risk_label}]
VM.biomes = [{id,name,mastery,mastery_needed,dragon:{id,name,state:'dormant'|'awake'|'slain'|'repelled',next_day|null,legendary_left}}]
VM.threat += { biome_id, biome_name, dragon_id }      // name = nom du dragon du biome
VM.village += { graves:[{name,day,cause}], trophies:[{dragon_name,day}], hall_level }
VM.guild += { chest:[{item_id,name,rarity}] }         // item_id = id de catalogue
VM.defeat = {day, reason} | null ; VM.is_season_over vaut aussi true après une chute
VM.chronicle.summary += { deaths:[noms], legendary:[noms], solo_results:[string] }
VM.chronicle.threat += { biome_id, biome_name, dragon_id, dragon_name, legendary:string|null }  // loot inclut le légendaire
VM.inventory[].rarity peut valoir 'legendary' (les 3 légendaires V3 sont désormais réservés aux dragons : pool dragon_pool).
```
Sections de chronique ajoutées : `solo` (« Missions solo »), `deuil` (« Deuil », jamais rognée). Ressource `scales` (V3) supprimée.

### Calibrage mesuré (engine_v4_check, 30 graines × 30 jours, 5 managers, plans par défaut)
Réveils : 28/30 graines (un seul biome à chaque fois) ; première attaque J13-J29 ; 54 attaques : 13 vaincus · 31 repoussés ·
10 ravages ; 8 morts / 157 héros (5,1 %) ; 0 chute ; 953 missions solo (91 % réussies, 108 blessures) ; savoir-faire : 100 % des
paires (même classe/niveau, graines différentes) divergent en XP, 86 % en niveaux.
