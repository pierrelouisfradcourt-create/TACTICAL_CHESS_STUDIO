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
attach(state, data) -> state               // V5 T2b : ré-attache la table de données à un état RELU (JSON.parse) —
                                           // `state.__data` est non énumérable et ne survit pas à JSON.stringify
listManagers(state) -> string[]            // ['p1','ai_prudent','ai_audacieux'] — p1 = humain, toujours premier
planDefaults(state, managerId, data?) -> Action[] // plan complet par défaut pour state.day (profil IA pour les IA,
                                           // plan raisonnable pour l'humain : chaque aventurier reçoit une activité) ; [] si la table manque
validateAction(state, action, data?) -> {ok:boolean, reason?:string}   // reason en français, jamais d'exception
resolveDay(state, actions:Action[], data?) -> {state, chronicle, log:string[]}
   // PURE : même (state, actions) => même résultat, ne mute pas l'entrée.
   // Manager sans action => planDefaults appliqué. Action invalide => ignorée, raison dans log et notices.
   // Table de données absente => {state (inchangé), chronicle:null, log, error:'…'} — jamais d'exception.
hashState(state) -> string   // FNV-1a 32 bits en hex sur JSON canonique (clés triées récursivement)
viewModel(state, managerId, data?) -> VM | {error:string}   // seul point d'accès de l'UI à l'état (voir plus bas)
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
V5 T2b : dans la phase de raid, les passages **réellement reçus** sont rejoués d'abord, dans leur **ordre de réception**
(champ `rank` de l'action `raid_pass`), puis les passages par défaut des managers absents, par identifiant de manager.

## Chronicle (retour de resolveDay et champ VM.chronicle)
```
{ day:int, title:string, headline:string,          // headline = « l'instant du jour »
  sections:[{phase:string, title:string, lines:string[]}],   // dans l'ordre de résolution, phases vides omises
  expedition:{quest_name, biome_name, participants:string[], participant_ids:string[],
              outcome:'succès'|'échec'|'retraite'|'aucune',
              rooms:[{name, lines:string[]}], loot:string[], xp:int} | null,
  summary:{gold_delta:int, injuries:string[], injury_ids:string[], level_ups:string[], level_up_ids:string[],
           recruits:string[], construction:string, construction_id:string|null} }
  // V5 T2b : les *_ids doublent les libellés français, dans le même ordre, pour que la page n'ait plus à
  // reconnaître un préfixe de texte. threat porte de même defender_ids[] et building_hit_id.
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

## V5 T1 — raid tactique persistant du Sylvain, six classes de base (Invocateur), tactic.js
Date : 2026-09-18. Source : mission « V5 tranche T1 » (GO Pierre 2026-09-18) d'après V5_SPEC.md §1, §2.1, §3, §7, §8 ; preuves dans
`test/tactic_t1_check.mjs` (nouveau) et `test/engine_v4_check.mjs` (adapté, en-tête documenté). API publique de sim.js inchangée ;
`data.json` version 5 ; `data.js` régénéré. Tous les chiffres restent « à calibrer » (T5) : les valeurs retenues et leur écart au spec
sont listés plus bas.

### Fichiers
- `tactic.js` — module pur UMD (`module.exports` / `window.GuildeTactic`), aucune dépendance : mêmes primitives entières et même
  mulberry32 que sim.js (code dupliqué, flux RNG propre au raid sérialisé dans `state.raid.rng_s / rng_count`). Grille 9×11,
  Manhattan, LdV Bresenham entier **symétrique par construction** (libre dans les deux sens), formes `single · circle · cross · ring ·
  line · cone · wall3`, Dijkstra entier 4-voisinage (départage coût, y, x), poussée/attirance/collision, états à durée, initiative fixe
  `H1 · S · B · H2 · S · B · H3 · S · RIPOSTE`, riposte télégraphiée, nuit, enrage, victoire/échec, politique par défaut.
- `sim.js` charge tactic.js : `require('./tactic.js')` sous node, `window.GuildeTactic` dans la page (**charger tactic.js avant sim.js**).
- `data.json` : `raid` (constantes §1.14 + `roots_damage`, `summon_cap_guild`, `raid_enabled`), `raids.raid_forest` (fiche Sylvain),
  `layouts.clairiere` (99 entiers, 4 souches en losange autour du tronc, `boss_cell`, `spawn_cells`), `tactic_spells` (25 sorts :
  `arme` + 4 par classe), `tactic_passives`, classe `summoner` + 3 compétences d'auto-combat (`presence`, `swarm`, `sacrifice`),
  `constants.ap_cost.raid = 3`, `activity_deltas.raid`, `death_permille.raid`, `craft_by_class.summoner`, 27 gabarits `raid_*`.

### Activité, action, ordre du jour
- Activité `raid` (journée entière, 3 PA) : permise quand `state.raid.status === 'active'` et héros apte (blessure 0, fatigue < 100) ;
  elle **remplace `defend`** (refusé : « le village est en raid ») ; `presets.defense` → `Raid` ; `activity_options` la propose.
  Plans par défaut (tous profils) : jour de raid, tout héros apte monte sur la grille.
- Action `raid_pass` `{adventurer_id, actions:[{type:'move', to:{x,y}} | {type:'cast', spell_id, x, y} | {type:'end_turn'} | {type:'end_pass'}]}`
  (≤ 60 actions). `validateAction` : héros à vous, vivant, apte, raid actif, actions **rejouées sur une copie du raid du matin**
  (chaque action légale, sinon `action k (cast X) : raison`). `end_turn` est ajouté aux types du §7 (un tour se termine explicitement ;
  jamais d'avance automatique). Le dernier `raid_pass` reçu pour un héros gagne. ~~Un passage humain est rejoué **à son tour** dans
  l'ordre des managers (id ASCII)~~ **→ REMPLACÉ par V5 T2b : ordre de RÉCEPTION (`rank`), voir la section V5 T2b.**
  S'il devient illégal parce que la grille a changé, il est interrompu là (notice « passage de X
  interrompu : … »), la riposte a lieu, jamais d'exception. Pas de `seq` : un passage est atomique dans la journée.
- Ordre du jour : … 7 expédition · 7b menace (auto-combat V4 : mont, marais, ou repli forêt) · **7b' raid** (passages du jour) · 7c solo
  · … · 11 soir · **11' nuit du raid** · 11b âge · 11c réveil + présage (**startRaid** le soir du présage : la grille est dressée pour le
  lendemain, `day_start` = jour d'attaque) · 12 derby · 13 bilan.
- Réveil du Sylvain (V4) → raid ; retour après échec (ravage) à J+3 → nouveau raid au présage. Repli V4 : si aucun héros n'est déclaré
  `raid` le premier jour, `state.raid = null` et la menace se résout en auto-combat V4 (ligne « raid_fallback »).
- Passages : ~~managers triés par id ASCII, héros par id~~ **→ V5 T2b : passages reçus par rang de réception, puis défauts par id de manager** ; sans `raid_pass` → `raidDefaults`. KO : `injure(sévérité 1)`, fatigue +15,
  moral −5, tirage `death_permille.raid` (100 ‰). XP : `div(xp_win, 4)` par passage joué ; victoire : `xp_win × (1 + 10 % × passages)`
  (moitié pour un KO) + moral +10 ; légendaire au plus gros `damage_total` (invocations comptées pour leur maître).
- Issue : `won` → sortie V4 `vaincu` (or, matériaux, prestige, trophée, légendaire, `slain`) ; `lost` (4e nuit) → sortie V4 `ravage`
  (bâtiment, or −20 %, prestige −10, retour J+3, chute possible). Les deux passent par `applyThreatOutcome` / `finalizeThreat`
  (extraits de phaseThreat, partagés). `threat.outcome` n'est connu **qu'au jour de clôture** ; le raid est archivé dans
  `state.raid_history[]` puis `state.raid = null`. Un raid encore actif au J30 reste en l'état (non résolu).

### `state.raid` (privé, haché comme le reste)
```
{ id:'raid_forest', dragon_id, name, day_start, nights, status:'active'|'won'|'lost', enrage_pct, rng_s, rng_count,
  grid_w:9, grid_h:11, layout:[99], spawn_cells:[{x,y}], zones:{ "idx": {zone_id, turns_left, owner_kind:'boss'|'hero', source_id, owner_name, value?, power?, level?} },
  boss:{ id, kind:'boss', side:'boss', name, x,y,w:2,h:2, facing:'S', hp, hp_max, shield, atk, def, mass:3, phase:1|2|3, states:[{id,turns,value,…}],
         controls_today, last_stun, alive, crit_immune, level, fissures },
  units:[{ id, kind:'hero'|'summon'|'add', side:'guild'|'boss', owner, master_id, name, gender, class_id, level, x,y, hp,hp_max, shield, shield_turns,
           atk_eff, def, heal, crit, spd, mass, pa_max, pm_max, range_min, range_max, los, states:[], cooldowns:{}, born_pass, passive, guard_of? }],
  pass:{ hero_id, manager_id, hero_name, turn, turn_max, pa, pm, seq, ko, done, spawn:{x,y}, last_cell, damage_start, actions }|null,
  pass_count, riposte_count, next_unit, passes_done:[{day, hero_id, manager_id, hero_name, damage, ko, turns, actions}],
  damage_total:{hero_id:int}, healing_total:{}, journal:[{day, pass, hero_id, hero_name, lines:[≤8], ko, damage}] (jour courant),
  events:[] (vidé après chaque appel), won_by, stats:{casts:{spell_id:n}, regen_total, burn_turns, adds_spawned, shield_absorbed, add_heal, night_regen},
  riposte_next:{kind, label, cells:[{x,y}]}, last_riposte:{kind, cells, by}|null }
```
Zones : `roots` (boss, 2 ripostes, entrée = immobilise 1 + 8 dégâts, 8 par tour dedans, coût +1) · `spores` (boss, 1 riposte, poison à
l'entrée) · `sanctuaire` (héros, +15 PV/tour, bloque racines/spores) · `piege` (héros, persistant, cap 3 : premier rejeton entrant 80 % +
immobilise) · `glace` (eau gelée) · `mur_glace` (bloque mouvement, LdV et **la ligne du fouet**, 1 riposte). Zones tickées à chaque
riposte (avant la pose de la nouvelle) ; la nuit efface les zones du boss et décrémente celles des héros.
États : `immobilise · etourdi · marque(+20 %) · aveugle · entrave · brule (8+2×niv/tour, coupe la sève) · poison (6+niv, ×3) ·
chancelant (masse 0, DÉF ÷2, +30 %) · reduction · provoque · vol_temps · garde`. Durées en tours du porteur ; boss tické à chaque tour B
et à la riposte (persistance entre passages : marque, brûlure, provocation). Contrôle du boss : `max(150, 750 − 200 × controls_today)`
‰, jamais deux étourdissements consécutifs, remis à zéro la nuit.

### API de tactic.js (pures ; `env` = `sim._internal.raidEnvOf(state, raiders|null, day?)` : tables, jour, managers, profils du matin)
```
startRaid(state, raid_id, env) -> state'                 raidView(state, managerId, env) -> VM.raid | null
raidAction(state, {type:'begin_pass', hero_id} | {type:'move'|'cast'|'end_turn'|'end_pass', …}, env) -> {state, ok, reason, log, events}
raidEndPass(state, env) · raidNight(state, env) -> {state, log, events}      // events : ko | won | lost | phase | stagger
raidPass(state, hero_id, actions, env) -> {state, ok, reason, log, events}  // un passage complet (begin + actions + end_pass implicite)
validateRaidPass(state, hero_id, actions, env) -> {ok, reason}            // rejeu strict sur copie
raidDefaults(state, managerId, env) -> [{adventurer_id, actions:[…]}]     // politique IA d'un passage, simulée séquentiellement
raidDefaultsFor(state, hero_id, env) -> actions | null
previewCast(view, spell_id, {x,y}) -> {valid, reason, cells:[{x,y}], targets:[{unit_id,name,dmg_min,dmg_max,dmg_crit_max,heal,effects}], path:null}
```
`previewCast` est pur (vue non mutée) et utilise les mêmes helpers de forme/portée/LdV que `raidAction` (banc (7) : validité identique
sur 8 910 couples sort×case, dégâts réels dans [min, max critique]). Aussi exposé : `sim._internal.previewCast`, `.raidEnvOf`,
`.raidDefaults`, `.tactic`.
`raidDefaults` (§7.6, complété) : passage complet (3 tours, 2 si fatigue ≥ 60) ; quitte les zones de boss, ne traverse les racines qu'à
défaut de chemin propre, quitte la rangée d'entrée (la riposte y laisserait des racines), politique par classe (Guerrier : rempart,
charge, provocation quand un corps est sur la grille, taillade ; Clerc : soin des blessés, cercle sacré, bénédiction, lumière ;
Voleur : pas de côté vers le dos, coup de l'ombre, vol de temps, poudre sur rejeton ; Rôdeur : marque, tir précis à 3-7 avec LdV,
pièges près du tronc, flèche sur rejeton ; Mage : trait de feu dès que la brûlure tombe, tempête T2 et givre T3 sur les rejetons, mur de
glace T3 ; Invocateur : golem puis nuée, lien vital, sacrifice d'une invocation mourante, arme au contact). Les rejetons collés au tronc
(ils le soignent) sont visés en priorité par les corps à corps.

### `VM.raid` (§7.5, `lineage: null` en T1) et autres ajouts du modèle de vue
```
{ active, id, name, day_start, nights, max_nights, status, phase, phase_label, hp_pct, hp_label:'394 / 893', enrage_pct, regen_pct,
  boss:{ id,name, x,y,w,h, facing, hp,hp_max, shield, def, atk, mass, phase, crit_immune, states:[{id,label,turns,value}],
         next_riposte:{kind,label,cells:[{x,y}]} (cellules calculées depuis ma case), last_riposte:{kind,by,cells}|null, heads:null, fissures, controls_today, tenacity_label },
  grid:{ w,h, cells:[{x,y, kind:'floor'|'wall'|'water'|'pit', zone:{id,label,turns_left,mine,owner_name}|null, safe, boss, spawn}] },
  units:[{ id, kind, name, owner_name, owner_id, x,y, hp,hp_max, shield, def, level, master_id, states:[{id,label,turns,value}], is_mine, side }],
  me:{ hero_id|null, can_play, reason|null, cell:{x,y}|null (case d'entrée), atk_eff, heal, hp, hp_max, pm_max, crit, level, class_id, shield,
       pass:{turn:1, turn_max, pa, pa_max, pm, pm_max, seq}|null,
       spells:[{ id,name, cost_pa, range_min, range_max, los, line_only, shape, r, power, magic, target, range_label, zone_label, verb, cooldown, cooldown_left, castable, reason, description, crit_bonus, back_power, effect_labels }],
       reachable:[{x,y,cost}], default_actions:[…] (passage par défaut prêt à soumettre en raid_pass) },
  passes_today:[{hero_name, manager_name, damage, ko, turns}], waiting_on:[string], journal:[{hero_name, lines:[≤8], ko, damage}],
  damage_total:[{hero_id,name,damage}], warnings:[string] (« La sève coule sans obstacle » sans Mage), lineage:null }
VM.threat (raid actif, du présage à l'issue) = { …, phase:'raid', day:day_start, defenders_planned (héros planifiés en raid), raid:{nights,max_nights,hp_pct,status,day_start} }
VM.roster[].activity_options += { activity:'raid', cost_ap:3 } (defend absent pendant un raid) · VM.raid_history:[{id,dragon_name,day_start,day_end,status,nights,passes,ko}]
chronicle += raid:{id,name,day_start,nights,status,hp_pct,passes:[{hero_name,manager_name,damage,ko}],won_by}|null ; summary.raid_status ;
section 'raid' « Raid » (jamais rognée, ≤ 26 lignes : dressage de la grille, entrée sur la grille, un fait marquant ou la trace laissée par
les copains, bilan de chaque passage, nuit/enrage, victoire ou chute + dépouilles) ; chronicle.threat au jour de clôture seulement.
```

### Calibrage retenu (banc `tactic_t1_check`, 30 raids forcés au J12, 6 managers × 1 héros, `raidDefaults`) et écarts au spec
| Paramètre | Spec | Retenu | Motif |
|---|---|---|---|
| `hp_base / hp_per_day` (Sylvain) | 900 / 60 | 450 / 20 | 6 passages/jour ≈ 900-1 100 dégâts ; le boss doit tomber en 2-3 jours |
| `regen_pct` par tour du boss | 4 | 1 | 15 tours de boss par jour : 4 % effaçait toute journée sans brûleur permanent |
| `shield_p3` (écorce, rechargée à chaque riposte) | 250 | 80 | 250 × 6 passages/jour = +1 500 PV effectifs par jour |
| rejetons : soin du tronc / PV | 20 / 100 % | 10 / 60 % du monstre V4 | sinon +300 PV/jour non contrés par les plans par défaut |
| fouet | 100 % | 50 % (deux fouets par tour B) | KO des corps à corps sinon systématiques (ATQ V4 15 + 3/jour) |
| invocations : ATQ golem / nuée | 60 % / 50 % | 80 % / 70 % | Invocateur à 10 dégâts/passage sinon |
| `activity_deltas.raid.fatigue` | (defend 20) | 12 | fatigue ≥ 60 dès le 2e jour = passages à 2 tours |
| `death_permille.raid` | 150 | 100 | §9 (parade « mort en raid trop fréquente ») |
Mesuré (30 graines, J12) : 25 gagnés / 5 perdus, **20/30 gagnés en ≤ 3 jours (67 %)**, jours par raid 2-4, KO 1/389 passages, 0 mort,
part de dégâts par classe : Mage 41 % · Rôdeur 20 % · Voleur 14 % · Guerrier 11 % · Clerc 7 % · Invocateur 6 % ; sans Mage : 9/30 gagnés.
Forcés au J20 : 17/30 en ≤ 3 jours, KO 3 % ; au J26 : 11/30, KO 9 %, 6 morts (fouet 15 + 3×26). Saison naturelle (engine_v4_check, 5
managers sans Invocateur, 30 graines) : 34 raids, 12 gagnés, 13 perdus, 9 en cours au J30, KO 9 %, morts 5,1 % (V4 : 5,1 %).
Les 25 sorts sont lancés par la politique par défaut (`ice_wall` 1 fois, `sacrifice` 3, `sidestep` 5 : rares mais présents).

### Décisions et limites T1 (non couvertes par les bancs)
- Formule de dégâts §1.5 reprise (variance 90-110, critique ×1,5, boss sans variance ni critique) ; pas de jet de toucher, `dodge` ignoré.
- Poussée du boss non chancelant nulle (masse 3) ; chancelant → masse 0, collision contre une souche = 40 (`stump_collision`).
- Les unités ne coupent pas la LdV ; le cône de spores ignore les murs ; le fouet s'arrête au premier mur (souche, mur de glace).
- Rejetons instanciés à `level = div(jour, 2)` sur les cases libres autour du tronc (index croissant) ; cap 4, 2 par entrée en P2.
- Invocations persistantes (Présence) : cap 2 par héros, 4 par guilde (les plus anciennes se dissipent) ; leurs dégâts sont crédités au
  maître pour le légendaire ; elles n'agissent que pendant les passages (phases S).
- `genHero` continue de tirer parmi les 5 classes V4 (`rng.roll(5)`) : l'Invocateur n'apparaît que par `class_id` explicite (IA de la
  page, `options.managers`) — jamais à la taverne ni chez les fondateurs en T1 (choix : trajectoires V4 préservées).
- Spec §1.12.1 (passages non joués = 2 tours prudents le soir) : en T1 tout se résout en 7b', `raidDefaults` joue les 3 tours.
- Non vérifié : jeu sur téléphone, page index.html (T4), hybrides/spés (T2/T3), Drake et Hydre (auto-combat V4 inchangé), rejeu du journal
  de la page avec des `raid_pass` humains réels (seule la voie moteur est prouvée), raid encore actif au J30 (laissé non résolu).

---

## V5 T2 — les treize voies (hybrides), Drake des monts et Hydre des marais
Date : 2026-09-18. Source : mission « V5 tranche T2 » (GO Pierre 2026-09-18) d'après V5_SPEC.md §2.2, §2.3, §4, §5.4, §6, §7, §8 ;
HumanGates ratifiés le 2026-09-18 : (1) quatre branches fusionnées — Guerrier+Mage → **Chasseur de monstres**, Voleur+Invocateur →
**Illusionniste**, donc **13 hybrides** ; (2) second choix **libre avec affinité** (§6.3 option B) : l'affinité met une voie en avant,
ne l'impose jamais ; choix automatique après deux jours sans réponse. Preuves : `test/tactic_t2_check.mjs` (nouveau),
`test/tactic_t1_check.mjs` et `test/engine_v4_check.mjs` (adaptés, en-têtes documentés). API publique de sim.js inchangée
(`newGame · planDefaults · validateAction · resolveDay · hashState · viewModel · listManagers`) ; `data.js` régénéré depuis `data.json`.

### Données (`data.json`)
- `hybrids` : 13 fiches `{id, name, bases:[2], pairs:[[base,base]…], resource, resource_name, resource_max, resource_label, mechanic,
  verb, need, identity, territory, spells:[2], answers:[raid_id…], traits:[…]}`. `pairs` couvre les **15** paires de bases :
  `chasseur_monstres` porte `warrior+ranger` **et** `warrior+mage`, `illusionniste` porte `rogue+mage` **et** `rogue+summoner`.
- `tactic_spells` : 51 entrées (25 de base + **26 hybrides**, `hybrid_id` renseigné, `class_id` nul).
- `lineage` : `hybrid_level_min 5`, `hybrid_day_min 8`, `hybrid_auto_days 2`, `affinity_craft_level 3`, `affinity_expeditions 4`,
  `affinity_max 3`, `affinity_resource_bonus 1`, `need_missing 2`, `need_columns` (7 colonnes §3.8, chacune avec son `weight` = ce
  qu'une table des six bases apporte naturellement), `base_needs` par classe, `hybrid_need_bonus 2`, `spec_*` (réservé T3).
- `raids.raid_mountain` (Drake, `kind:'drake'`) et `raids.raid_marsh` (Hydre, `kind:'hydre'`) ; `layouts.eboulis` (4 rochers,
  2 gouffres) et `layouts.tourbiere` (4 souches, 12 cases d'eau). 20 gabarits `raid_*` de plus, 5 gabarits `voie_*`.
- Héros : `hybrid`, `hybrid_day`, `hybrid_offer_day`, `hybrid_bonus`, `companions{class_id:n}` (expéditions menées avec un héros de
  cette classe — compteur d'affinité). `raid_history[].stats` conserve les compteurs du raid clos (mécanismes, ressources, sorts, zones).

### Choix de la voie (sim.js)
- **Seuil** : niveau ≥ 5 **ou** jour ≥ 8. Phase 11a' (`phaseLineage`, après le soir, avant la nuit du raid) : proposition le soir du
  seuil, section de chronique **« Voie »** (gabarits `voie_offer · voie_choice · voie_auto · voie_affinity · voie_needs`, ≥ 6 chacun).
- **Action** `choose_hybrid {adventurer_id, hybrid_id}` : refusée avec sa raison si le héros n'est pas à vous / inconnu, si le seuil
  n'est pas atteint, s'il a déjà une voie, si la voie est inconnue ou fermée à sa classe de base. Appliquée en phase 1 (comme `equip`).
- **Amis simulés** : un héros d'un manager IA tranche le **lendemain** de la proposition, dans `phaseLineage`, héros par héros par
  identifiant ASCII (chaque choix change les besoins du suivant) ; aucun tirage. Le héros d'un manager humain sans réponse tranche
  **exactement 2 jours** après la proposition (`hybrid_auto_days`).
- **Règle de choix** (auto et amis, §6.3 « Auto ») : colonne de besoin la moins remplie d'abord (`value × 100 / weight`, par tranches
  de 10 %), puis une voie que la table n'a pas encore, puis l'affinité, puis l'identifiant ASCII.
- **Affinité** (§6.3 option B) : `+1` savoir-faire de la 2e base ≥ 3, `+1` ≥ 4 expéditions avec un héros de la 2e base, `+1` trait
  compatible (0-3). La voie d'affinité maximale (> 0) démarre avec **+1** dans sa ressource (`hybrid_bonus`, ligne `voie_affinity`).
- **Besoins du groupe** (§6.2) : chaque base apporte sa colonne (§3.8), chaque hybride **+2** dans la sienne ; les deux colonnes les
  moins remplies sont écrites en clair.

### viewModel (ajouts, aucun champ retiré)
- `VM.roster[].hybrid` = `{id, name, resource, resource_label}` ou `null`.
- `VM.choice` = `{kind:'hybrid', adventurer_id, adventurer_name, deadline_day, options:[{id, name, identity, verb, resource,
  resource_label, mechanic, affinity, affinity_max, resource_bonus, recommended, spells:[{id,name,cost_pa,range_label,description}]×2,
  answers:[nom de dragon…]}]}` ou `null` (une seule pastille `recommended`).
- `VM.group_needs` = `{columns:[{id,name,value,filled_pct}]×7, missing:[2 ids], missing_labels:[2 noms], label}`.
- `VM.biomes[].dragon.raid` = `{id, name, kind, layout_id, hp_base, hp_per_day, phases, max_nights, needs, active, nights, hp_pct}`
  pour **les trois biomes** (le repli auto-combat V4 ne sert plus que si tactic.js est absent ou si personne ne monte sur la grille).

### Drake des monts (`kind:'drake'`, §2.2)
Réserve 400 + 13/jour (pool × (managers+2)/6), PM 3, `target_rule:'strongest'`, phases 50 % / 25 %.
1. **Souffle télégraphié** : riposte → annonce `line 6` large de 3 vers la case du héros (`souffle_annonce`) ; il tombe au **début du
   passage suivant** (`souffle`, 120 % magique, les boucliers < 40 ne tiennent pas) et laisse des **cendres** 2 ripostes (12 dégâts à
   l'entrée, +1 PM). 2. **Écailles de fer** : DEF +20, `crit_immune` tant que PV > 50 % ; chaque `fissure` (Chasseur de monstres, sur
   cible marquée) rend 5 de DEF, cap 4. 3. **Envol** (entrée en P2) : un passage entier hors de portée ; seules une ancre (Filet,
   Appel d'air) ou une portée ≥ 4 sans LdV l'atteignent ; à l'atterrissage `etourdi` 1 + `chancelant` 2. 4. **Fournaise** (P3, une
   riposte sur deux) : `circle 2`, 100 %, puis il fond de 3 cases sur sa cible. 5. **Morsure** 110 % / **coup de queue** `ring 1`
   poussée 1 quand deux héros sont au contact.

### Hydre des marais (`kind:'hydre'`, §2.3)
Réserve 500 + 17/jour, PM 2, `target_rule:'weakest'`, phases 66 % / 33 %.
1. **Trois gueules** : une attaque par tête vivante (70 %, portée 1-2), cibles séparées — les corps posés (recrues, doubles, bête,
   élémentaire, invocations) absorbent. 2. **Têtes** : `head_hp = hp_pool/6` ; une tête à 0 est coupée (`tete_coupee`) et repousse en
   2 tours **sauf souche cautérisée** (`brule`/`gele` → `cauterisation`) ; deux têtes dans le même passage → corps `chancelant` 2 tours
   (`decapitation_double`, masse 0 : poussée sur un pieu = 60). 3. **Venin** (riposte) : 2 `circle 1` autour du héros, zone 2 ripostes.
   4. **Immersion** (P2+) : elle rejoint l'eau — DEF +10, +6 % de régénération, −1 PM pour les héros dans l'eau. 5. **Sangsues** :
   2 `giant_leech` par riposte en P2 (cap 4), `drain` 8.

### Politique par défaut (`raidDefaults`) et voies
La voie parle **avant** la routine de classe : ses sorts de dégâts (Coup de grâce, Sentence, Embuscade, Rafale) à volonté, ses sorts de
corps (Lever une recrue, Double, Bête, Élémentaire) dans la limite de leurs caps, et **une seule installation par passage**, jamais au
prix d'un coup (il faut 3 PA de reste ou un tour entier devant soi). Sans cette règle, les héros hybrides cessaient de frapper : la part
de dégâts du Mage montait à 47 % et une journée de raid pouvait tomber à 0 dégât.

### Calibrage retenu (T2) et écarts au spec
| Paramètre | Spec | Retenu | Motif |
|---|---|---|---|
| Drake `hp_base / hp_per_day` | 800 / 55 | 400 / 13 | même échelle que le Sylvain T1 (450 / 20) ; à 18/jour, un réveil au J22 n'était plus gagnable (2/8 en partie naturelle) |
| Hydre `hp_base / hp_per_day` | 1 000 / 65 | 500 / 17 | idem : le combat d'endurance reste le plus long sans devenir impossible tard |
| Têtes / repousse | 3 / 2 tours | inchangé | — |
| Venin | 2 cases `circle 1` | inchangé (`venom_cells 2`, `venom_range 3`) | — |
| Immersion | +6 % régén., DEF +10 | inchangé | — |
| Souffle | 120 %, `line 6` large 3 | inchangé (`breath_shield_ignore 40`, `ash_damage 12`) | — |
| Affinité | +1 ressource | inchangé | la pastille « recommandé » ne verrouille rien : les 13 voies restent proposées |
| Départage du besoin | colonne la plus basse | colonne la **moins remplie** (÷ `weight`), par tranches de 10 % | en valeur absolue, « dégâts » et « contrôle » n'étaient jamais les plus bas : quatre voies (Chasseur, Inquisiteur, Oracle, Traqueur) n'étaient jamais choisies |
| Complémentarité | — | à besoin égal, une voie absente de la table passe devant | sinon six héros prenaient la même voie le même soir |

Mesuré (`tactic_t2_check`, 2026-09-18) : 13 voies choisies au moins une fois sur 40 graines ; **72/72 héros hybrides au J10** ; choix
automatique à J+2 ; 117 raids forcés (13 voies × 3 dragons × 3 graines) → chaque ressource prend ≥ 2 valeurs distinctes et les 26 sorts
hybrides sont lancés ; Drake 15/20 (J14) et 12/20 (J21), Hydre 10/20 (J14) et 9/20 (J21), aucune journée de raid à 0 dégât, aucun raid
non clos ; sans brûleur (ni Mage, ni Spirite, ni Conjurateur) le Sylvain tombe 9/20 contre 17/20 avec — le besoin existe toujours ;
déterminisme 30 graines × 30 jours ; `VM.choice`, `VM.roster[].hybrid`, `VM.group_needs`, `VM.biomes[].dragon.raid` sans `undefined`
(504 vues). Saison naturelle (40 graines, 6 managers) : Sylvain 21 gagnés / 20 perdus, Drake 3/5, Hydre 2/5.

### Contrôles adaptés (devenus faux par conception, en-têtes documentés dans les bancs)
- `engine_v4_check` : le trophée/`slain` et le retour du dragon après un raid perdu sont lus sur **le biome du raid** (les trois dragons
  se jouent en raid, plus seulement la forêt) ; l'issue `repoussé` n'existe plus avec les plans par défaut (elle appartient à
  l'auto-combat V4) ; plus aucun « jour d'attaque » d'auto-combat, le refus de `defend` hors menace et pendant un raid reste vérifié.
- `tactic_t1_check` : la liste « tous les sorts lancés » ne porte que sur les **sorts de base** (les 26 hybrides sont couverts par
  `tactic_t2_check`) ; les **raids forcés du banc T1 rejouent des héros de base** (`hybrid = null`), puisque T1 mesure le calibrage des
  six classes ; le seuil « sans Mage, victoire < 40 % » devient « < 60 % et nettement moins qu'avec un Mage » car deux voies brûlent
  sans Mage (Spirite : esprit de cendre ; Conjurateur : élémentaire de feu, §2.1).

### Décisions et limites T2 (non couvertes par les bancs)
- Le choix des amis simulés est résolu **dans le moteur** (phase 11a'), pas par une action `choose_hybrid` de `planDefaults` : les héros
  tranchent l'un après l'autre, chaque choix déplaçant les besoins du suivant (une liste d'actions calculée le matin les aurait tous
  figés sur le même besoin). L'action reste le chemin du joueur et est prouvée par le banc.
- La proposition n'est pas obligatoire pour agir : un joueur peut envoyer `choose_hybrid` dès le seuil atteint, avant la ligne du soir.
- `hybrid_bonus` ne vaut que +1 dans la ressource au début de chaque passage ; il ne change ni les PA, ni les PV, ni les sorts.
- Les sorts hybrides sont refusés par `previewCast` avec la même raison que `raidAction` (ressource insuffisante, cap de corps atteint,
  cible illégale, Drake en vol) : l'aperçu ne ment pas.
- Le `taken` de complémentarité regarde toute la guilde (les héros des autres managers compris) : c'est « la table des copains ».
- Non vérifié : la page (T4), les 26 spécialisations et la reconversion (T3), le Derby des Lames (§2.5), le gate fun, l'équilibre d'une
  saison complète à 5 managers avec des voies choisies à la main, la lisibilité des cartes de choix sur téléphone.

---

## V5 T2b — ordre de réception des passages, correctifs et nettoyage

Date : 2026-09-18. Source : mission « corriger le défaut du raid asynchrone, les bugs et retirer le code mort »,
pilotée par `AUDIT_ARCHI.md` (audit architectural du 2026-09-18). Fichiers touchés : `sim.js`, `tactic.js`,
`index.html`, `data.json`, `data.js`, bancs sous `test/`. `harness.mjs` non modifié.

### B1 — les passages du raid sont rejoués dans l'ORDRE DE RÉCEPTION (décision de conception)

Constat de l'audit : `phaseRaid` rejouait les managers triés par identifiant ASCII, donc `p1` en dernier ; le joueur
composait son passage sur la grille du matin et le moteur le rejouait sur celle que les amis avaient laissée.

**Règle retenue** : chacun joue sur la grille que les précédents ont laissée, dans l'ordre où les passages sont
**arrivés**. Concrètement :

* l'action `raid_pass` porte un **rang de réception** : `applyOrQueue(ctx, a, rank)` inscrit `rank` (l'index de
  l'action dans la liste reçue, avant le tri par manager de `phaseValidation`) dans `ctx.queued.raid[hero_id]`.
  Le journal conserve l'ordre, donc le rang est reproductible ; il rend le rejeu indépendant du parcours de
  `ctx.queued.raid`, qui est un objet non ordonné.
* `phaseRaid` rejoue d'abord les **passages réellement reçus**, triés par `rank` (départage par identifiant de héros),
  puis les **passages par défaut des managers absents**, dans l'ordre d'identifiant de manager.
* Le déterminisme est entier : même journal → même état, même hachage, même flux de tirages (le flux du raid reste
  séparé, `rng_s` / `rng_count`).
* Un passage qui devient illégal reste **interrompu avec sa notice française** et le héros garde ce qu'il a joué.

Côté page : `raidForecast` ne rejoue plus les passages des amis avant le sien (il revalide le passage sur l'état
courant) et `raidOrderLabel` ne trie plus par identifiant de manager — la page ne reconstruit plus l'ordre du moteur.

Mesure (12 graines × 30 jours, 5 managers, passage humain = `VM.raid.me.default_actions` du matin) :

| | avant | après |
|---|---|---|
| jours de raid humains | 56 | 39 |
| passages interrompus | **40 (71,4 %)** | **0 (0 %)** |
| actions jouées par passage | 3,09 | **6,00** |

Contrôles : `tactic_t1_check` (8) interruptions ≤ 10 %, (8b) rejeu identique sur 30 graines × 14 jours avec des
`raid_pass` humains, (8c) deux passages humains soumis dans l'ordre inverse sont rejoués dans l'ordre inverse.

### B2 — le derby ne vole plus « l'instant du jour »

`phaseDerby` simule l'expédition de la guilde **rivale** avec le `ctx` de la journée : ses « moments » entraient dans
le tirage du titre. La pile est désormais tronquée autour de l'appel (`ctx.moments.length` mémorisée puis restaurée).
Mesure (30 graines × 30 jours, 3 managers, 120 jours de derby) : titres nommant un héros absent de l'effectif
**14 → 0**. Contrôle : `engine_v4_check` « §B2 derby ».

### B3 — une classe sans compétence ne fait plus planter le moteur

`(D.skills_by_class[h.class_id] || [])` aux trois sites (`combatProfile`, montées de niveau, `rosterVm`).
Contrôle : `engine_v4_check` « §B3 / G4 » — classe nue ajoutée à `data.classes`, `newGame`, 5 journées, `viewModel`.

### B4 — un état sérialisé se relit hors de la page : `attach`

`state.__data` est posée **non énumérable** : elle ne survit pas à `JSON.stringify`. Ajout à l'API publique :

```
attach(state, data) -> state      // ré-attache la table de données et renseigne le repli de module
viewModel(state, managerId, data?) -> VM | {error:string}
resolveDay(state, actions, data?) -> {state, chronicle, log} | {state, chronicle:null, log, error:string}
validateAction(state, action, data?) -> {ok, reason?}      // reason = la raison française si la table manque
planDefaults(state, managerId, data?) -> Action[]          // [] si la table manque
```

Sans table de données, **aucune entrée ne jette** : chacune rend la raison
« table de données absente : appelez SIM.attach(état, data)… ». Contrôles : `engine_extra` « §B4 » (état écrit,
relu dans un **processus neuf**, raison sans attach puis VM et journée résolue après attach, hachage identique).

### B5 à B8

* **B5** — la page lit `data.raid.pa_per_turn` (`PA_PER_TURN`) au lieu d'un `6` figé.
* **B6** — `slotCount` et `setDayFromAssign` ne plafonnent plus l'affichage à 4 créneaux : le nombre de cases suit
  `ap_today` (plancher 3 pour `slotCount`).
* **B7** — vocabulaire d'effets explicite dans `tactic.js` et **refus au chargement** :
  `TACTIC.checkEffects(data) -> {ok, unknown:string[], reason}`. Trois familles : `state|heal|shield|purify|push`
  (appliqués par `applyEffectOn`), `zone|wall|summon|freeze` (appliqués par `castSpell` sur la case), et
  `teleport|vital_link|sacrifice`, **réservés** aux sorts `sidestep`, `vital_link`, `sacrifice` dont le comportement
  est porté par l'identifiant. Un `kind` inconnu — ou un `kind` réservé réutilisé par un autre sort — est refusé :
  `index(data)` le mémorise, `raidEnabled` devient faux et le dragon retombe sur l'affrontement V4 avec une notice
  française (« Raid tactique indisponible : … »). Plus de sort écrit en données qui ne fait rien en silence.
* **B8** — la chronique porte des **identifiants** à côté de ses libellés français :
  `summary.injury_ids`, `summary.level_up_ids`, `summary.construction_id`, `threat.defender_ids`,
  `threat.building_hit_id`, `expedition.participant_ids`. La page s'en sert pour les marqueurs du tableau vivant
  (`managersOf(ids, labels)`), avec repli par nom pour les chroniques d'une partie antérieure.

### Gardes mécaniques ajoutées

* **G1** (`tactic_t1_check` 9) : les deux `makeRng` (sim.js / tactic.js) rendent la même suite sur 100 graines × 100 tirages.
* **G2** (`tactic_t1_check` 10) : `state.raid` parcouru en profondeur — aucun nombre non entier, 12 graines × 30 jours.
* **G3** (`tactic_t1_check` 11) : vocabulaire d'effets — `data.json` accepté, `kind` inconnu refusé, `kind` réservé refusé
  pour un autre sort. (La garde échouait avant B7 ; B7 est implémenté, elle passe.)
* **G4** (`engine_v4_check`) : classe sans compétence (B3).

### Code mort retiré

`bEffect` (sim.js) · `sum`, `isEnemyOf` (tactic.js) · gabarits `templates.greedy_theft` et `templates.empty_guild`
(data.json, `data.js` régénéré) · bancs et doublures périmés `test/index_stub.html`, `test/stub_sim.js`,
`test/ui_check.mjs`, `test/index_real.html`, `test/data_real.js`, `test/real_check.mjs` · sauvegardes
`test/index_v1..v4_backup.html`, `test/sim_v1_backup.js`, `test/sim_v3_backup.js`, `test/data_v3_backup.json`
(≈ 1,12 Mo). **Non retiré** : `clamp` de `tactic.js`, que la tranche T2 a remis en service (2 appels).

### Contrôles adaptés (devenus faux par conception en V5 T2, en-têtes documentés dans les bancs)

Depuis V5 T2 les **trois** dragons ont une fiche de raid : `vm.threat.phase` ne vaut plus jamais `'today'` et la
journée d'auto-combat V4 (bandeau d'attaque, préréglage « Défense », issue le soir même) n'existe plus.
`ui_v3_check` et `ui_v4_check` échouaient déjà pour cette raison **avant cette tranche** ; ils vérifient désormais la
disparition de la journée d'auto-combat et mesurent le jour de dragon comme un **jour de raid** (présage, grille
dressée, préréglage « Raid », biome « éveillé »). Le sous-bloc d'auto-combat de `ui_v3_check` reste écrit, conditionné
à l'existence d'une journée `'today'`, pour le jour où un dragon sans fiche de raid reviendrait.
`ui_v4_check` : la mort de p1 n'apparaît sur aucune graine 1..400 avec la politique de la page — contrôle marqué
« non vérifié » (idiome déjà utilisé pour la défaite).

### Preuves d'exécution (2026-09-18, après la tranche)

| Banc | Résultat |
|---|---|
| `ENGINE_ONLY=1 node test/harness.mjs` | 10/10 |
| `node test/engine_extra.mjs` | 16/16 |
| `node test/engine_v4_check.mjs` | 27/27 |
| `node test/tactic_t1_check.mjs` | 26/26 |
| `node test/tactic_t2_check.mjs` | 14/14 |
| `node test/harness.mjs` | 19/19 |
| `node test/ui_v2_check.mjs` | 52/52 |
| `node test/ui_v3_check.mjs` | 35/35 |
| `node test/ui_v4_check.mjs` | 47/47 |
| `node test/ui_v5_check.mjs` | 43/43 |

### Non vérifié

Le comportement à **deux passages humains le même jour** n'existe pas dans le prototype (un seul manager humain) :
il est prouvé par le contrôle (8c) sur des passages fabriqués, pas par une partie réelle. Les `kind` `teleport`,
`vital_link` et `sacrifice` restent portés par l'identifiant du sort : ils sont **gardés**, pas généralisés — écrire un
nouveau sort avec l'un d'eux est refusé au chargement plutôt qu'implémenté. La mort de p1 et la défaite de la guilde
restent non observées avec la politique de la page. Rien n'a été mesuré sur téléphone réel.

---

## V5 T3 — les 26 spécialisations, la reconversion, le Derby des Lames

Date : 2026-09-18. Source : mission « V5 tranche T3 » (GO Pierre 2026-09-18) d'après V5_SPEC.md §2.5, §5, §5.4, §6.1, §6.4, §7, §8 ;
HumanGates ratifiés le 2026-09-18 : (1) les quatre branches qui échouaient au test de branche sur le papier (Lame de feu, Lame de
givre, Charmeur, Montreur) restent fusionnées : **26 spécialisations**, deux par voie pour les treize voies de T2 ; (2) **une seule
reconversion par saison** (§6.4 option B). Preuves : `test/tactic_t3_check.mjs` (nouveau), les dix bancs existants restent verts
(trois en-têtes documentés, voir plus bas). API publique de sim.js inchangée, additions seulement ; `data.js` régénéré depuis `data.json`.

### Données (`data.json`)
- `specs` : 26 fiches `{id, hybrid, sister, name, verb, need, answers:[raid_id…], identity, distinction, spells:[2]}`.
- `tactic_spells` : **103 entrées** (25 de base + 26 de voie + **52 de spécialisation**, `spec_id` renseigné, `class_id`/`hybrid_id` nuls).
  Champs ajoutés : `daily` (vrai = `cooldown 99`, une fois par passage) et `spec_id`.
- `lineage` : `spec_level_min 12`, `spec_day_min 20`, `spec_auto_days 2`, `spec_need_bonus 2`, `respec_cost_gold 100`,
  `respec_deadline_day 27`, `respec_max 1`, `spec_answers[spec_id] = [raid_id…]` (§7.1).
- `raids.raid_derby` (Derby des Lames, `kind:'derby'`) : Capitaine 1×1 masse 1 (`hp_base 300`, `hp_per_day 10`, `boss_w/h/mass`),
  `max_nights 3`, `steal_pa 2`, `banner_hp 200`, `banner_hold_win 3`, `banner_lost_max 2`, trois `rivals` (rustre, clerc, rôdeur),
  `score {hold 10, rival 25, captain 100}`, `reward_gold 220`, `reward_prestige 12`. `layouts.arene` (9×11, six barricades,
  `banner_cell` au centre bas, six cases d'entrée).
- `constants.derby_raid_day 26`, `constants.derby_raid_skip_day 28`. Gabarits : `voie_spec_offer/choice/auto/needs`,
  `voie_respec_offer`, `voie_respec`, `derby_start/hold/lost_hold/win/lost`, `derby_pass_summary/raid_enter/raid_night/raid_lost` (≥ 6 chacun).
- Héros : `spec`, `spec_day`, `spec_offer_day`, `respec_used`, `respec_day`.

### Moteur (`tactic.js`)
- `castSpec` : les 52 sorts signature, tous avec un effet mesurable sur la grille — mur héroïque (`mur_heros`, bloque LdV, souffle et
  passage), zone d'étendard (+1 PA au héros qui commence son tour à côté), portails liés (`enterZone` téléporte, une fois par
  déplacement), terrain changé et rendu (`setTerrain`/`tickTerrain` : Source, Assèchement), riposte scellée (`R.sealed`, Censeur),
  riposte détournée (`R.riposte_redirect`, Devin et Mirage), riposte sautée (`R.skip_riposte`, Chronomancien), tour légué
  (`R.legs` → `turn_max` +1 au passage suivant), corps tombés mémorisés (`R.fallen` → Relever), fissures, charme d'un rejeton
  (`charmedTurn`), silence d'un rejeton, hantise (−10 DÉF via `defEff`), auras de bouclier, ours (masse 2, garde), faucon
  (`u.fly` : PM 6, portée 4 sans LdV, ignore eau et zones), Avatar (masse 3, immunité au contrôle et aux zones, arme en cercle 1 à 120 %).
- `specWhy` : refus français propres à chaque sort (aucune bête, aucun portail, pas de recrue, deux pièges lourds déjà posés…),
  répliqués à l'identique dans `previewCast` — l'aperçu ne ment pas.
- `specPolicy` : politique par défaut des 26 spés, jouée **avant** la voie ; **une installation de spé par passage** (la voie garde
  la sienne), jamais au prix d'un coup (mêmes garde-fous qu'en T2).
- Derby des Lames : `derbyTurn` (le Capitaine marche sur la Bannière), `rivalTurn` (le clerc soigne le plus blessé sauf s'il est
  muselé, le rôdeur marque le héros et piège la hampe, le rustre charge la Bannière), `derbyRiposte` (vol de tour −2 PA au passage
  suivant, comptage des tenues et des pertes), `spawnRivals` (les rivaux reviennent au complet chaque matin), `derbyPolicy`
  (la politique par défaut défend la hampe avant de courir sur le Capitaine), issue `won` à 3 tenues ou Capitaine abattu,
  `lost` à 2 ripostes de Bannière tenue par l'adversaire, à la chute de la Bannière ou au bout de 3 nuits.
- `_internal` expose de quoi scripter un scénario (`newRaid`, `beginPass`, `applyPassAction`, `policyAction`, `heroUnit`…) : c'est
  le banc de branche qui s'en sert, le moteur n'en dépend pas.

### sim.js
- Actions **`choose_spec {adventurer_id, spec_id}`** et **`respec {adventurer_id, spec_id}`** (validées, appliquées en phase 1 comme
  `choose_hybrid`). Refus français : pas de voie, seuil non atteint, déjà spécialisé, spé d'une autre voie, spé inconnue, héros d'un
  autre manager ; pour la reconversion : déjà utilisée, pendant un raid, après le jour 27, or de guilde insuffisant, changement de voie.
- Phase 11a' (`phaseSpec`, à la suite de `phaseLineage`) : proposition le soir du seuil (niveau ≥ 12 **ou** jour ≥ 20), section de
  chronique « Voie » enrichie, amis simulés le lendemain, choix automatique deux jours après. Règle de choix : colonne de besoin la
  moins remplie, puis spé absente de la table, puis identifiant ASCII.
- `respecHint` (§6.4) : quand un dragon est réveillé et qu'aucun héros ne porte une des branches qui lui répondent, le tableau le dit
  et nomme les héros qui peuvent encore se reconvertir.
- `applyRespec` : 100 or de guilde **et** la journée entière du héros (`ctx.plans[h.id] = rest`), chronique « X a changé de voie ».
- Derby des Lames : l'arène est dressée le soir du **jour 25** (`phaseDerby`), les passages se jouent les jours 26-28, le derby
  ordinaire du jour 28 est remplacé ; victoire → or + prestige + XP, défaite → prestige perdu ; un dragon déjà sur la grille le jour 25
  garde la priorité (le derby n'a alors pas lieu : mesuré 3 saisons sur 16).
- viewModel : `VM.roster[].spec` `{id,name,verb,identity,distinction,spells[2],answers}` · `VM.choice` étendu au type `'spec'`
  (deux options, verbe, identité, deux sorts chiffrés, « utile contre », une seule pastille `recommended`, `deadline_day`) ·
  `VM.respec` `{available, reason, cost, deadline_day, used, adventurer_id, adventurer_name, options[], hint}`.

### index.html
Nouvelle section « Sa voie » de l'écran Mon héros (`#lineage-block`) : cartes de choix côte à côte (nom, verbe, phrase d'identité,
les deux sorts avec coût/portée/forme/journalier, « Utile contre », ce qui la distingue de sa sœur, pastille « Recommandé pour le
groupe »), spécialisation acquise et ses sorts, bloc de reconversion avec son coût, son échéance et le rappel de dragon. Le choix part
avec les ordres du soir (`choose_spec`, `choose_hybrid`, `respec` → `MANAGED.extras`), validé par le moteur avant d'être retenu ;
aucune règle n'est calculée dans la page.

### Calibrage retenu (T3) et écarts au spec
| Paramètre | Spec | Retenu | Motif |
|---|---|---|---|
| Capitaine du derby `hp_base / hp_per_day` | 600 / 40 | 300 / 10 | même échelle que les trois dragons (T2) : à 600/40 le derby n'était jamais gagnable en 3 jours |
| Nuits du derby | 3 jours (26-28) | `max_nights 3` | inchangé |
| Botte secrète (Bretteur) | 130 % (+40 %) | 160 % (+40 % → 224 %) | à 130 % la pointe frappait moins fort que la voie nue |
| Mur de boucliers (Sergent) | recrues **adjacentes** | recrues à **2 cases** | les recrues bougent avant l'ordre ; à 1 case le sort ne prenait qu'un corps |
| Piège lourd | `immobilise 2 tours` | inchangé (corrigé : `enterZone` posait 1 tour) | le piège ordinaire garde 1 tour |
| Colonnes de besoin | §3.8 | Sergent `tenir`, Porte-étendard `degats`, Sourcier `controler` | deux sœurs sur la même colonne : le départage ASCII rendait l'une inatteignable (mesuré : jamais choisie sur 40 graines) |
| Sorts de zone (`onction_zone`, `grande_purification`, `esprit_gardien_majeur`, `detourner`, `rabattage`, `oeil_cyclone`, `assechement`) | `target: cell` | `target: any` | une zone se pose aussi sur une case occupée ; sinon le sort était refusé sur sa propre cible |
| Budget d'installation | — | 1 pour la spé + 1 pour la voie par passage | budget commun : les mécaniques de voie (Défi, Formation…) ne se déclenchaient plus |

### Mesuré (`tactic_t3_check`, 2026-09-18)
26 spés atteignables et **toutes choisies au moins une fois sur 40 graines** ; **240/240 héros spécialisés au jour 22** ; choix
automatique exactement 2 jours après la proposition ; `choose_spec` légal appliqué et six refus distincts ; reconversion acceptée une
fois puis refusée cinq fois (seconde fois, raid, jour 28, or, autre voie), écart d'or mesuré 145 = 100 d'or de guilde + la journée
perdue du héros ; variance de l'effet des 26 spés (4 valeurs distinctes sur 4 situations chacune) ; Derby des Lames joué 13 fois sur
16 saisons (3 fois un dragon occupait la grille), 3 gagnés / 10 perdus, 16 tenues de Bannière, 21 menaces, 37 vols de tour ;
déterminisme 30 graines × 30 jours ; `VM.roster[].spec`, `VM.choice`, `VM.respec` sans `undefined` (2 016 vues).
Distribution sur 30 graines × 30 jours (plans par défaut) : Bretteur 21 · Sergent 15 · Écorcheur 15 · Harponneur 15 · Passe-muraille 11 ·
Pèlerin 11 · Porte-étendard 10 · Chronomancien 9 · Confesseur 8 · Sourcier 8 · Templier 7 · Hospitalier 7 · Bourrasque 6 · Avatar 5 ·
Matador 5 · Portier 5 · Censeur 4 · Devin 3 · Fauconnier 3 · Médium 2 · Mirage 2 · Cyclone 1 · Maître-ours 1 · Piégeur 1 · Veilleur 1 ·
Assassin 0 (choisi sur d'autres graines, cf. contrôle (2)).

### Test de branche (§5.3) — résultat mécanique
**25 spés sur 26** résolvent leur scénario en au moins 25 % de tours de moins que leur sœur **et** que leur hybride nu.
**Échoue à son propre test : l'Assassin** — 2 tours pour emporter le quart de la réserve du Drake chancelant, comme le Traqueur nu
et comme le Piégeur. Le verbe « exécuter » est déjà tenu par la voie (Embuscade + Ombre 3 = critique assuré) : la pointe n'ajoute
pas de réponse, seulement des chiffres. C'est exactement le motif des quatre fusions du §5.4. Recommandation portée au rapport de
tranche (retravailler le verbe — exécution sur cible entamée, seuil de PV — ou fusionner l'Assassin dans le Traqueur et laisser le
Piégeur seul). Aucun scénario n'a été maquillé pour faire passer le banc : le banc sort en échec tant que Pierre n'a pas tranché.
Deux scénarios ont en revanche été **recentrés sur le verbe** après une première mesure trompeuse : le Bretteur se mesure au nombre
de coups rendus sous trois gueules (« riposter »), pas aux dégâts bruts ; l'Assassin au quart de réserve emporté **en un tour**
(« exécuter »), pas à un total de dégâts. Les chiffres de la Botte secrète (160 %) ont été relevés dans le même mouvement.

### Contrôles adaptés (devenus faux par conception, en-têtes documentés dans les bancs)
- `tactic_t1_check` (4a) : la liste « tous les sorts lancés » exclut désormais aussi les sorts de spécialisation (`spec_id`),
  couverts par `tactic_t3_check`.
- `tactic_t2_check` (8) : une journée où **personne** n'est monté sur la grille (effectif entièrement blessé) ne compte plus comme
  « journée à 0 dégât » — un raid sans défenseur apte n'est pas un raid impossible.
- `engine_v4_check` : le Derby des Lames est un raid **sans dragon** (ni menace, ni trophée, ni légendaire) ; ses journées sont
  vérifiées à part (section Raid, clôture, archive, `derby.last`), un contrôle de plus le prouve.
- `engine_extra` : le derby de fin de saison peut se clore les jours 26, 27 ou 28 (le Derby des Lames remplace celui du jour 28).
- `ui_chateau_check` : la saison ayant changé de trajectoire (spés au J20, derby aux J26-28), le jour où le village atteint un âge
  n'a plus forcément un héros parti ; la propriété (« un héros parti n'est jamais dans la cour ») est alors rejouée sur le jour de
  raid de la graine.
- `ui_v5_check` : **bloc E ajouté** (ce n'est pas une adaptation, c'est une preuve de plus) — cartes de spécialisation, choix envoyé
  au moteur, spécialisation acquise le lendemain, bloc de reconversion, 400 px sans défilement horizontal.

### Preuves d'exécution (2026-09-18, après la tranche)
| Banc | Résultat |
|---|---|
| `ENGINE_ONLY=1 node test/harness.mjs` | 10/10 |
| `node test/engine_extra.mjs` | 16/16 |
| `node test/engine_v4_check.mjs` | 28/28 |
| `node test/tactic_t1_check.mjs` | 26/26 |
| `node test/tactic_t2_check.mjs` | 14/14 |
| `node test/tactic_t3_check.mjs` | **10/11** — seul le test de branche (1) sort en échec, sur l'Assassin |
| `node test/harness.mjs` | 19/19 |
| `node test/ui_v2_check.mjs` | 52/52 |
| `node test/ui_v3_check.mjs` | 35/35 |
| `node test/ui_v4_check.mjs` | 52/52 |
| `node test/ui_v5_check.mjs` | 48/48 (bloc T3 compris) |
| `node test/ui_chateau_check.mjs` | 82/82 |

Le banc T3 porte aussi (6b) : **les 52 sorts signature sont exécutés au moins une fois et écrivent quelque chose** — 43 par la
politique par défaut dans les scénarios, les 9 autres par tir direct sur la première case légale (le moteur doit les accepter et
produire une ligne de journal). Aucun sort de spécialisation n'est décoratif.

### Décisions et limites T3 (non couvertes par les bancs)
- Le Derby des Lames ne démarre pas si un dragon occupe déjà la grille le soir du jour 25 ; le dragon garde la priorité et le derby
  ordinaire du jour 28 reprend ses droits. Un dragon qui se réveille **pendant** le derby est affronté à l'ancienne (auto-combat V4).
- La reconversion n'est jamais proposée par `planDefaults` : c'est un geste de joueur (0 reconversion spontanée mesurée sur 30 graines).
- Le mur héroïque du Templier (`mur_heros`) a 120 PV en données mais n'est pas attaquable : il disparaît à l'expiration (2 ripostes).
- Le charme (`fils_solides`) retourne un rejeton contre les siens ; il ne compte pas dans les dégâts du héros.
- Non vérifié : le gate fun, la lisibilité des deux cartes sur téléphone, une saison complète jouée à la main avec reconversion,
  l'équilibre du Derby des Lames avec des passages humains (mesuré avec `raidDefaults` seulement), les deux spés en échec de branche.

## V5 T3b — l'Assassin devient un finisseur, le Derby se recalibre, le château se finit

*Tranche du 2026-09-19. Source des chiffres : exécution des bancs et sondes temporaires (`test/_m_assassin.mjs`,
`test/_m_derby.mjs`, `test/_m_ui.mjs`, `test/_m_occl.mjs`, `test/_m_forced.mjs`), supprimées après mesure. L'état
« avant » est celui du dépôt (`games/chroniques_guilde/`, commit `2f21b5c`), relu en lecture seule et rejoué avec
les mêmes sondes. Aucune affirmation de cette section n'est reprise d'un rapport : tout est remesuré.*

### 1. L'Assassin — nouvelle règle de finisseur

Le reproche de T3 : l'Assassin était un **second burst**, doublon du Bretteur, et son test de branche échouait
(il n'était meilleur ni que sa sœur le Piégeur, ni que le Traqueur nu). Son verbe devient **achever** : sa force
vient des **PV manquants de la cible**, pas de sa propre frappe.

| Donnée | Avant | Après |
|---|---|---|
| `lame_dos.power` | 120 | **50** |
| `lame_dos.cost_pa` | 5 | **4** |
| `lame_dos` — depuis le dos | × 200 % (multiplicateur) | **+ 40 points de puissance** (`exec_back`) |
| `lame_dos` — cible chancelante | × 300 % | *supprimé* (le chancelant n'est plus un cas particulier de la lame) |
| `lame_dos` — pente | aucune | **+ 26 points par tranche de 10 % de réserve perdue** (`exec_step`) |
| `lame_dos` — seuil d'exécution | aucun | **20 % de réserve** (`exec_hp_pct`) : rejeton achevé, monstre à **200 %** (`exec_boss_pct`) |
| passive `specs.assassin.passive` | aucune | **« Curée »** : `full_pct` 60, `step_pct` 13 |

**Curée** (`assassinCurePct`) multiplie **tous** les dégâts de l'Assassin contre le camp adverse :
60 % sur une cible intacte, + 13 points par tranche de dix pour cent de réserve perdue — donc 190 % sur une cible
à terre. C'est le prix de la spécialité : il ouvre plus mal que n'importe qui.
La politique par défaut (`specPolicy`) a été refaite avec : choix de la proie **la plus entamée** (tri par PV
manquants puis par identifiant), déplacement vers son dos quand elle est mûre (`missingTenths ≥ 3` ou sous le
seuil), paiement de `ombre_longue` seulement s'il reste de quoi enchaîner la lame dans le même tour, et aucune
course derrière un Drake en vol.

**Mesure** — `test/_m_assassin.mjs` : 8 graines × 3 raids, héros niveau 12 (320 PV, atk 64), politique par défaut,
plafond 15 tours. Chiffre = **tours moyens pour atteindre l'objectif**, plus bas = meilleur.

| Scénario | Avant : Assassin / Piégeur / Traqueur nu | Après : Assassin / Piégeur / Traqueur nu |
|---|---|---|
| cible **intacte**, lui prendre 20 % de sa réserve | 3,00 / 2,46 / **2,00** | **5,92** / 2,46 / **2,00** |
| cible **entamée** (30 %), l'achever | 3,63 / 4,04 / **2,75** | **1,83** / 4,04 / 2,75 |
| cible **à terre** (15 %), l'achever | 2,17 / 2,25 / **1,83** | **1,08** / 2,25 / 1,83 |

Avant, l'Assassin était moins bon que le Traqueur nu **partout** — il n'avait pas d'identité. Après, il est le pire
des trois sur une cible intacte et le meilleur dès qu'elle est entamée. C'est l'inversion recherchée.
Le banc `tactic_t3_check` la scelle des deux côtés : test de branche (1) sur l'Hydre entamée (spé 2 · sœur 5 ·
hybride nu 4) et **contre-scénario (1b)** sur l'Hydre intacte (spé 10 · sœur 2 · hybride nu 2), ajouté pour qu'on
ne puisse pas relever la pente jusqu'à le rendre bon partout.

### 2. Recalibrage du Derby des Lames

| Donnée (`raids.raid_derby`) | Avant | Après |
|---|---|---|
| `banner_lost_max` (ripostes perdues d'affilée = défaite) | 2 | **3** |
| rival `warrior` « Rustre » — PV | 120 | **100** |
| `banner_hp`, `banner_hold_win`, autres rivaux | 200 · 3 · inchangés | identiques |

Le journal disait « les rivaux tiennent la Bannière **deux** ripostes de suite » en dur ; il annonce désormais le
compte réel (`R.banner_lost`).

**Mesure** — `test/_m_derby.mjs` : 60 graines, saison complète de 30 jours, **politique par défaut** pour les cinq
managers (aucun geste humain). 47 saisons sur 60 jouent effectivement le derby (dans les 13 autres un dragon
occupe la grille et garde la priorité, cf. limites T3).

| | Avant | Après |
|---|---|---|
| derbys gagnés | **14 / 47 = 29,8 %** | **22 / 47 = 46,8 %** |
| tenues de Bannière (moyenne par derby) | 1,60 | 2,19 |
| Bannière menacée (moyenne par derby) | 1,57 | 2,17 |
| durée en journées | {1 j : 46, 2 j : 1} | {1 j : 40, 2 j : 5, 3 j : 2} |

L'objectif « environ une victoire sur deux » est tenu, et le derby reste franchement perdable. Le banc ajoute
**(7b)** : sur 30 saisons, le taux doit tenir dans la **bande 40-60 %** — une borne haute autant qu'une borne
basse, parce qu'un derby imperdable ne vaut pas mieux qu'un derby ingagnable. Mesure du banc : **12 gagnés /
24 joués = 50 %**. L'échantillon du contrôle (7) passe de 16 à 30 saisons pour mesurer un taux et non une anecdote.

### 3. Le mur héroïque du Templier devient destructible

Limite écrite noir sur blanc en T3 : « `mur_heros` a 120 PV en données mais n'est pas attaquable ». **Levée.**

- `WALL_HP = 120` est maintenant une constante nommée, **lue** par le moteur (c'était un littéral mort).
- `wearHeroWalls` : le **souffle** du Drake, la **fournaise** et les **spores** usent le bouclier qu'ils frappent
  (dégâts = attaque du boss portée par la puissance du souffle, majorée de l'enrage). À 0 PV il vole en éclats.
  Une flaque de **venin** ne l'use pas : seules les trois attaques ci-dessus le paient.
- `breathBlockers` : le souffle annoncé mémorise **ce qui l'arrête** (une case qui coupe la ligne de vue casse la
  rangée) ; quand il part, ces cases encaissent.
- **Replanter** : un Templier peut replanter son bouclier sur sa propre case ébréchée ; le mur **garde ses
  ébréchures** (`Math.min(was.hp, WALL_HP)`) au lieu de repartir neuf. Le ciblage `cell` l'autorise explicitement
  (`mend`), des deux côtés — moteur **et** aperçu.
- Compteurs de mécanique : `mur_heros_use`, `mur_heros_brise`.

**Mesure** — banc `tactic_t3_check` (1c), Drake des monts, trois passages : PV au moment de planter
**120 → 120 → 26**, 2 coups encaissés, 1 bouclier brisé.

### 4. L'aperçu ne ment plus sur les cases occupées

`raidCastWhy` (l'aperçu lu par l'interface) acceptait une case portant un **mur posé** — mur de glace, mur de
terre, bouclier planté — que le moteur refusait ensuite via `passable`. Les deux côtés appliquent désormais la
même règle, replantage de son propre bouclier compris (lu dans `view.grid.cells[].zone.mine`).

### 5. Placeur d'étiquettes : deux familles d'obstacles

Le rééquilibrage de la tranche avait ajouté trois obstacles **mous** pondérés et une pénalité d'éloignement
**quadratique** :

| Constante | Valeur | Rôle |
|---|---|---|
| `LAB_WALL_BACK_K` | 0,95 | le mur du fond : une bulle posée dessus se perd dans la pierre |
| `LAB_WALL_FRONT_K` | 0,3 | le mur de face : les figurines se tiennent juste devant, la proximité prime |
| `LAB_SKY_K` | 0,7 | le ciel vide : rien derrière l'étiquette |
| `LAB_NEAR` / `LAB_FAR` | 34 px / 26 | rayon de confort et raideur de la pénalité au-delà |

**Régression trouvée et corrigée (2026-09-19).** Le coût d'éloignement est devenu quadratique (jusqu'à ~3 700 pour
une plaque), alors que le recouvrement d'un bâtiment restait une pénalité **plate de 320**. Le placeur préférait
donc mordre un toit plutôt que de s'écarter : la plaque « Chapelle à bâtir » recouvrait **l'infirmerie** de 24 %
(âge 3) et 22 % (âge 4) — les deux échecs de `ui_chateau_check`. (Le défaut était bien la plaque de la chapelle,
mais le bâtiment mordu était l'infirmerie, pas la parcelle qu'elle nomme.)

Correctif : le placeur distingue **deux familles**.
- **Durs** — toits (`__scene.buildings`), **parcelles à bâtir** (`__scene.lots`, publiées par `sceneLot`), pastille
  d'heure : un **interdit**. Une candidate dont le recouvrement dépasse `LAB_HARD_MAX` (2 %, la valeur même du
  contrat) est éliminée, pas pénalisée. Le balayage de dernier recours garde la même hiérarchie (poids 4 000).
- **Mous** — murs, ciel : un **coût** (`LAB_SOFT_W` = 320 × pondération `LAB_*_K`) qui cède devant la proximité.

`__scene.lots` publie l'assise **réellement dessinée** (la tente au campement, l'assise de pierre ensuite), pas la
boîte théorique du bâtiment absent. Une parcelle n'est pas un bâtiment : elle ne compte ni dans la silhouette ni
dans les contrôles de cour, mais on ne lit pas « Chapelle à bâtir » posé sur l'assise de la chapelle absente.

**Mesure** — `test/_m_ui.mjs`, graine 10, cinq âges, largeur 1280 (rapport de un). Étiquettes qui recouvrent un
**mur** de plus de 2 % :

| Âge | Avant la tranche | Après |
|---|---|---|
| 0 · 1 | 0 · 0 | 0 · 0 |
| 2 (bourg) | **4** (pire 42 %) | **1** (pire 10 %) |
| 3 (ville) | **2** (pire 80 %) | **0** |
| 4 (château) | **4** (pire 82 %) | **3** (pire 50 %) |

Recouvrement d'un **bâtiment** par une étiquette, mesuré par le banc (largeur 1280, `deviceScaleFactor` 2) :
pire cas **24 % / 22 %** (âges 3 / 4) → **1 % / 0 %**.

### 6. Chevauchement de bâtiments au bourg

`BNEAR.warehouse` passe de `[322, 242]` à `[300, 232]`. Mesure à l'âge 2 : **2 paires** qui se chevauchent
(dont `warehouse × hall`, 14 % du plus petit) → **aucune**.

### 7. Occlusion figurine / mur de face

Les figurines vivent en pixels du canevas : elles sont dessinées **après** le monde. Un héros dont les pieds
tombent dans la bande de pierre du mur de face (de la crête au pied), hors de l'ouverture de la porte, se tient
derrière ce mur et doit être repassé par lui.

La première version du repassage (`drawWallFrontMask`) avait **deux défauts, tous deux mesurés** :
1. elle ne repeignait **pas à l'identique** — le lavis doré (`goldWash`) et la moucheture de pierre manquaient,
   si bien qu'elle **aplatissait** le mur de face ;
2. elle s'exécutait **à chaque image**, alors qu'avec les ancrages actuels aucune figurine ne tombe jamais dans la
   bande (`FCOURT` / `FNEAR` sont tous au-dessus de la crête, la sortie passe par la porte ou sous le pied du mur).

Coût mesuré, sans rien masquer du tout : **1 241 à 4 419 pixels changés par image** (cinq scènes comparées au même
rendu sans repassage).

Correctif : repassage **fidèle** (bandeau + lavis + moucheture, exactement comme `drawWallFront`), **armé
uniquement** quand `figuresBehindFront` compte au moins une figurine dans la bande, et **désarmé pendant le
glissement de caméra** (`e.alpha < 1` : recomposer un mur translucide sur lui-même le rendrait opaque —
l'occlusion est alors imparfaite le temps du glissement, et c'est assumé). Le couple mesuré est publié dans
**`__scene.front_occlusion = { behind, repaint }`** ; le contrat est l'implication *behind > 0 ⇒ repaint*.

**Mesure** — `test/_m_occl.mjs` : sur les cinq scènes (âges 2, 3, 4, fin de journée, jour de raid) `behind = 0`,
repassage désarmé, **0 pixel** d'écart. **Preuve positive** (`test/_m_forced.mjs`, copie du tableau dont l'ancrage
« repos » de la cour est descendu à y 360, dans la bande 335→372) : `behind = 3`, repassage armé, **1 297 pixels**
d'écart avec la même copie sans repassage — la pierre passe bien devant la figurine.

### 8. Code mort

- `WALL_HP` remplace le littéral 120 et est désormais lu (§3).
- `FIG_H`, introduit puis rendu inutile par la bonne formule d'occlusion, a été retiré.
- Vérifié, **pas** du code mort : l'état `chancelant` reste consommé par huit autres mécaniques (décapitation de
  l'Hydre, masse du boss, poussée, lecture d'états) même après sa sortie de `lame_dos`.

### Contrôles ajoutés aux bancs
- `tactic_t3_check` **(1b)** : contre-scénario de l'Assassin sur cible intacte — il doit être strictement le moins bon.
- `tactic_t3_check` **(1c)** : le mur héroïque encaisse, garde ses ébréchures, finit par céder.
- `tactic_t3_check` **(7b)** : taux de victoire du Derby dans la bande 40-60 % sur 30 saisons.
- `ui_chateau_check` : **aucune étiquette ne recouvre une parcelle à bâtir** (âges 3 et 4, `__scene.lots`).
- `ui_chateau_check` : **occlusion du mur de face** (âges 3 et 4, `__scene.front_occlusion`).

### Preuves d'exécution (2026-09-19, fin de tranche)
| Banc | Résultat |
|---|---|
| `node test/harness.mjs` | 19/19 (dont 10/10 moteur pur sous node) |
| `node test/engine_extra.mjs` | 16/16 |
| `node test/engine_v4_check.mjs` | 28/28 |
| `node test/tactic_t1_check.mjs` | 26/26 |
| `node test/tactic_t2_check.mjs` | 14/14 |
| `node test/tactic_t3_check.mjs` | **14/14** (10/11 avant la tranche) |
| `node test/ui_v2_check.mjs` | 52/52 |
| `node test/ui_v3_check.mjs` | 35/35 |
| `node test/ui_v4_check.mjs` | 52/52 |
| `node test/ui_v5_check.mjs` | 48/48 |
| `node test/ui_chateau_check.mjs` | **86/86** (82/82 avant, dont 2 échecs au début de cette tranche) |

`data.js` a été régénéré depuis `data.json` et relu : les deux sont identiques champ pour champ.

### Décisions et limites T3b
- **Ce que la règle dure coûte.** Interdire tout recouvrement de bâtiment éloigne certaines étiquettes : au bourg,
  la distance moyenne étiquette → figurine passe de **41 à 56 px** (graine 10), parce que le nom « Anselme »
  mordait le toit de la taverne de 6,7 % et doit maintenant s'écarter. Le contrat (« aucune étiquette ne recouvre
  un bâtiment ») prime sur la proximité ; c'est un choix, pas un effet de bord.
- **La plaque de la chapelle se pose dans le ciel** aux âges 2 à 4. Sa parcelle est contre la tour est, au fond de
  la cour : au-dessus il n'y a que le ciel, à droite l'infirmerie, à gauche le donjon. Le ciel est un coût mou
  (0,7), le bâtiment un interdit — la plaque choisit le ciel. C'est lisible, mais ce n'est pas joli ; un vrai
  correctif demanderait de déplacer l'ancrage `BCOURT.chapel`, pas de retoucher le placeur.
- **Le gain de proximité du rééquilibrage n'est pas démontré.** Mesure sur la graine 10 : distance moyenne
  étiquette → figurine par âge, avant la tranche 26 / 31 / 42 / 25 / 39 px, après le rééquilibrage seul
  26 / 28 / 41 / 26 / 38 px. L'écart est dans le bruit. Ce que le rééquilibrage a réellement apporté, et qui est
  mesuré, c'est la sortie des étiquettes de la pierre et du ciel (§5), pas un rapprochement.
- **Chevauchement des bâtiments de COUR non corrigé.** Aux âges 3 et 4, `BCOURT` laisse 4 paires qui se
  chevauchent, la pire étant `infirmary × tavern` (25 % du plus petit à l'âge 3, 19 % à l'âge 4). Défaut
  antérieur à cette tranche, inchangé : la tranche portait sur le bourg. Corriger `BCOURT` toucherait les
  contrôles d'enceinte (bâtiment entouré, bas masqué par le mur de face, silhouette) et mérite sa propre tranche.
- **Le repassage d'occlusion est aujourd'hui une garde, pas un correctif visible.** Aucun ancrage actuel ne place
  une figurine derrière le mur de face ; le contrôle du banc est donc vrai par vacuité (`behind = 0`). Il protège
  le jour où un ancrage descendra dans la bande. La preuve positive est faite hors banc, sur une copie forcée.
- **L'Assassin reste quasi jamais choisi par les plans par défaut** : 1 fois sur 40 graines (banc (2)), 0 fois sur
  la saison type du banc (7). La refonte change ce qu'il fait, pas la fréquence à laquelle l'IA le prend.
- **Non vérifié** : l'équilibre du Derby avec des passages humains (tout est mesuré avec `raidDefaults`) ; le
  ressenti de l'Assassin manette en main ; la lisibilité de la plaque de chapelle dans le ciel sur téléphone ; le
  comportement du repassage d'occlusion pendant un glissement de caméra (il est désarmé par construction, non
  mesuré) ; la tenue du mur héroïque face à une fournaise de Drake enragé au-delà de trois passages.

---

## V5 T5 — calibrage de la saison entière, équilibre des voies, finitions de cour

*Tranche du 2026-09-19. Toutes les mesures de cette section sont **remesurées** dans cette tranche par des sondes
temporaires (`test/_m_season.mjs`, `_m_sweep.mjs`, `_m_dragons.mjs`, `_m_dmg.mjs`, `_m_band.mjs`, `_m_hyb.mjs`,
`_m_mast.mjs`, `_m_ravage.mjs`, `_m_scan.mjs`, `_m_derby.mjs`, `_m_derbyh.mjs`, `_m_court.mjs`, `_m_fit.mjs`,
`_m_bret.mjs`, `_m_respec.mjs`, `_sim_trace.cjs`), supprimées après mesure. L'« avant » est l'état du dossier au
début de la tranche, rejoué avec les mêmes sondes. Aucun chiffre n'est repris d'un rapport.*

**Protocole de mesure** — 60 graines (1000 + 7 i), saisons complètes de 30 jours, 5 ou 6 managers selon la parité de
la graine, plans par défaut pour tout le monde, aucun geste humain. Les taux par dragon sont recoupés sur 240 graines
et sur des raids forcés (24 à 30 graines × 3 dragons × 6 jours de réveil : J12, J14, J17, J20, J23, J26). Le banc
`test/season_t5_check.mjs` rejoue le protocole des 60 graines et verrouille les bornes.

### 1. Tableau de calibrage — avant / après

| Grandeur (60 graines, 30 jours, plans par défaut) | Avant | Après | Cible |
|---|---|---|---|
| Morts de héros | 14 / 343 = **4,1 %** | 9 / 338 = **2,7 %** (240 graines : 3,4 %) | ≤ 8 % |
| Chute de la guilde | 0 / 60 = **0 %** *(et 0 sur 2 500 graines : règle morte, §4)* | 2 / 60 = **3,3 %** (400 graines : 0,75 %) | ≤ 5 %, et la règle doit pouvoir se déclencher |
| Sylvain — raids · victoires | 71 · 36 = **51 %** | 33 · 25 = **76 %** | [40 %, 85 %] |
| Drake — raids · victoires | 2 · 2 = **100 %** (2 raids seulement) | 17 · 12 = **71 %** | idem |
| Hydre — raids · victoires | 5 · 0 = **0 %** (raid impossible) | 26 · 16 = **62 %** | idem |
| Réveils par biome | forêt **53** · marais **4** · montagne **2** | forêt **34** · marais **21** · montagne **15** | chacun ≥ 10 % |
| KO par passage — Sylvain / Drake / Hydre | 7,8 % / 39,1 % / 2,2 % | **1 % / 13 % / 3 %** | ≤ 25 % |
| Raids clos en 4 nuits (le plafond) | 48 / 78 = **62 %** | 30 / 76 = **39 %** | le 4e jour doit rester une exception |
| Victoires en ≤ 2 nuits | — | 46 / 53 = **87 % des victoires** | la majorité |
| Derby des Lames | 20 / 41 = **49 %** | 21 / 44 = **48 %** | bande 40-60 % |
| Voie la plus prise / la moins prise | Chasseur 50 / Traqueur **6** (×8,3) | Duelliste 44 / Tisse-vent **14** (×3,1 ; Traqueur 21) | ≤ ×5 |
| Spés jamais choisies sur 60 graines | **Cyclone 0**, Assassin 2 | **aucune** ; Assassin **12**, Cyclone 2 | aucune |
| Château (âge 4) au J30 | 21 / 60 = **35 %** | 28 / 60 = **47 %** (240 graines : 38 %) | 20-70 % |
| Or de guilde moyen au J30 | 143 | 185 | — |
| Raids non clos au J30 | 12 / 60 | 11 / 60 | — |

**Raids forcés** (24 à 30 graines par case, voies et spés naturelles, plans par défaut) — part des raids gagnés en
≤ 2 nuits, la mesure du §8 T1 :

| | J12 | J14 | J17 | J20 | J23 | J26 |
|---|---|---|---|---|---|---|
| Sylvain — avant | — | 54 % | — | 54 % | — | 33 % |
| Sylvain — après | 70 % | 83 % | 87 % | 73 % | 70 % | 43 % |
| Drake — avant | — | 75 % | — | 33 % | — | 8 % |
| Drake — après | 60 % | 70 % | 77 % | 70 % | 47 % | 33 % |
| Hydre — avant | — | 54 % | — | 29 % | — | 25 % |
| Hydre — après | 53 % | 67 % | 77 % | 67 % | 80 % | 67 % |

**Ce que ce tableau dit, et ce qu'il ne dit pas.** Au milieu de la saison (J14 à J20) les trois dragons tiennent
dans la bande [55 %, 80 %] du §8 T1 et la courbe est franchement plus plate qu'avant. **Aux réveils tardifs elle
retombe encore** : Sylvain 43 % et Drake 33 % au J26. C'est le reste de la dérive mesurée au §2 (les héros ne
montent pas en puissance autant que la réserve du boss), pas un raid impossible : le dragon est toujours abattu en
trois ou quatre nuits. En saison naturelle, où les réveils se répartissent du J11 au J29, les trois dragons
ressortent à 76 %, 71 % et 62 %. Les bornes du banc portent sur la saison naturelle, qui est ce qu'on joue.

### 2. Ce que la mesure a montré, et les chiffres qui ont bougé

**La guilde ne monte pas en puissance, le dragon si.** Sonde `_m_dmg.mjs` : dégâts de la guilde pendant la PREMIÈRE
journée de raid, contre la réserve du boss, à six jours de réveil.

| | J12 | J17 | J20 | J23 | J26 |
|---|---|---|---|---|---|
| Sylvain — dégâts / réserve | 820 / 863 = 95 % | 847 / 987 = 86 % | 916 / 1 062 = 86 % | 775 / 1 137 = 68 % | 751 / 1 212 = **62 %** |
| Drake — dégâts / réserve | 386 / 695 = 56 % | 369 / 776 = 48 % | 340 / 825 = 41 % | 306 / 874 = 35 % | 250 / 923 = **27 %** |
| Hydre — dégâts / réserve | 619 / 880 = 70 % | 575 / 986 = 58 % | 656 / 1 050 = 62 % | 610 / 1 114 = 55 % | 578 / 1 178 = **49 %** |

Les dégâts de la guilde sont **plats** (le niveau moyen passe de 3,4 à 5,3, mais la garde et l'attaque du boss
montent de 1 et 3 par jour, et les KO effacent des passages), pendant que la réserve du boss gagne 40 %. D'où la
chute du taux de victoire avec le jour du réveil — et l'Hydre jamais abattue en partie naturelle.

| Donnée | Avant | Après | Motif mesuré |
|---|---|---|---|
| `raids.*.def_per_day` (nouveau, surcharge de raid) | (V4 : 1) | **0** | la garde du boss montait plus vite que les héros ; à 0, la réserve devient la seule chose qui grandit |
| `raids.*.atk_per_day` (nouveau, surcharge de raid) | (V4 : 3) | **2** | KO du Drake à 40 % par passage au J26 ; à 2, 13 % — la menace grandit encore, moins vite |
| `raids.raid_forest.hp_base / hp_per_day` | 450 / 20 | **580 / 14** | courbe aplatie : à pente 20 le J26 valait 62 % de dégâts contre 95 % au J12 |
| `raids.raid_forest.regen_pct` | 1 | **2** | à 1, une guilde SANS brûleur gagnait 18 fois sur 30 (le besoin de brûler la sève disparaissait) ; à 2, 14/30 contre 28/30 avec |
| `raids.raid_mountain.hp_base / hp_per_day` | 400 / 13 | **880 / 6** | le Drake était le plus fragile et le plus meurtrier ; il devient le plus endurant |
| `raids.raid_mountain.breath_power` | 120 | **105** | avec `attack.power`, ramène les KO du Drake de 40 % à 13 % |
| `raids.raid_mountain.attack.power` (morsure) | 110 | **90** | idem |
| `raids.raid_marsh.hp_base / hp_per_day` | 500 / 17 | **600 / 13** | l'Hydre passe de 0 victoire sur 5 à 16 sur 26 |
| `raids.raid_derby.banner_lost_max` | 3 (T3b) | **2** (valeur du §2.5) | la guilde s'étant renforcée, le derby remontait à 61 % ; à 2 ripostes perdues, 48 % (60 graines) et 54 % (banc T3, 30 graines) |
| `lineage.hybrid_need_band` (nouveau) | (10) | **20** | tranche de remplissage sous laquelle deux colonnes sont à égalité ; à 10, une seule colonne décidait toujours |
| `lineage.spec_need_band` (nouveau) | (10) | **50** | la colonne de la voie — que le héros vient lui-même de remplir de +2 — écrasait la sœur qui l'approfondit |
| `specs.bretteur.passive` (nouveau) | — | `{cap 6, per_hit 2, power_pct 70, reach 3}` | la garde doublée était écrite en dur ; §3 |

**Non retenus, et pourquoi.** `raid.night_regen_pct` reste à **10** : à 0 le Sylvain tombe 82 % du temps et le Drake
94 % (trop mou), à 20 l'Hydre retombe à 54 % — 10 est le milieu mesuré. `raid.enrage_per_night_pct` reste à **15** :
son effet est **dans le bruit** au niveau de la saison (à 0 : Sylvain 71 % au lieu de 74 %, 22 raids au plafond au
lieu de 20 ; à 25 : identique à 15). Il est gardé pour ce qu'il raconte, pas pour ce qu'il pèse — c'est dit ici.
`raid.raid_max_nights` reste à **4** : le 4e jour convertit 9 raids sur 29, ce n'est pas du temps mort.

### 3. Les règles de choix corrigées (le défaut n'était pas dans les branches)

**(a) Le départage d'égalité parfaite était alphabétique.** `rankHybrids` et `rankSpecs` ordonnent par besoin du
groupe, puis complémentarité (`taken`), puis affinité, puis **identifiant ASCII**. Deux options peuvent arriver à
égalité sur les trois premiers critères : l'ASCII tranchait alors TOUJOURS dans le même sens. Trace relevée sur un
Rôdeur (`_sim_trace.cjs`) : `chasseur_monstres(nr10,t0,a0,degats)` et `traqueur(nr10,t0,a0,degats)` — même besoin,
même complémentarité, même affinité, et « chasseur_monstres » < « traqueur ». Nouveau départage : `tieBreak` =
`fnvStr(graine|héros|option) % 997`, déterministe et rejouable, stable pour un même héros, sans biais alphabétique ;
l'ASCII reste le dernier recours. Mesure sur 60 graines : Traqueur **6 → 21**, Chasseur **50 → 31**, Assassin
**2 → 12**, Cyclone **0 → 2**.

**(b) L'Assassin n'était pas ignoré par sa branche, mais par sa voie.** L'Assassin et le Piégeur sont les deux
pointes du **Traqueur** ; le Traqueur était pris 5 fois sur 343 héros à cause de (a). La refonte T3b de l'Assassin
n'était pas en cause : il est désormais pris **12 fois sur 60 graines** (banc T3 : 13 fois sur 40 graines) sans que
sa fiche ait bougé d'un point.

**(c) La largeur des tranches de besoin.** `div(filled, 10)` : la colonne de la voie, que le héros vient de remplir
de +2, ressortait systématiquement en tête de liste des colonnes les plus pleines, ce qui condamnait la sœur qui
l'approfondit. Mesuré avant : Hospitalier 2 contre Templier 28, Veilleur 2 contre Médium 28, Portier 2 contre
Avatar 15. À `hybrid_need_band` 20 et `spec_need_band` 50 : voies de 14 à 44 (au lieu de 5 à 50), spés de 2 à 25
(au lieu de 0 à 39), les 26 toujours atteintes.

**(d) `preferredBiome` enfermait la guilde dans un seul biome.** La règle « le biome dont la maîtrise est la plus
haute, égalité : ASCII » se refermait sur elle-même : au premier jour toutes les maîtrises valent 0, la forêt gagne
l'égalité ASCII, tous les votes de quête partent en forêt, et la maîtrise n'y monte que là. Mesuré : maîtrise
moyenne au J30 forêt **7,6** contre marais 1,4 et montagne 1,5 ; **53 réveils sur 59 en forêt**. Deux correctifs :
le biome dont le dragon n'est plus endormi sort de la préférence (son affaire est faite), et l'égalité tourne avec
la graine. Après : maîtrise 4,6 / 3,5 / 3,1, réveils **34 / 21 / 15**, et une saison sur six voit deux dragons.

### 4. Bugs trouvés en chemin, et corrigés

1. **La chute de la guilde était une règle morte.** `ravageBuilding` n'ajoutait le hall aux cibles que si son niveau
   atteignait 2, ou s'il avait « déjà brûlé une fois » (`hall_hits ≥ 1`). Or le vote de chantier prend toujours le
   bâtiment finançable le moins cher : **le hall reste au niveau 1 dans 300 saisons sur 300**, et `hall_hits` ne
   pouvait donc jamais passer à 1. Verrou circulaire : **0 chute sur 2 500 graines**, et l'écran de défaite était
   inatteignable. Le hall est désormais une cible comme les autres ; c'est le **second** incendie qui le jette à
   terre (le premier le marque sans lui coûter son niveau), exactement ce que dit le commentaire de la fonction.
   Après : 26 incendies du hall et **3 chutes sur 400 saisons (0,75 %)**.
2. **Le moteur jetait quand toute l'escouade était à terre.** `applyEvent` lisait `c[0]` ou le premier d'un tri vide
   dans six branches ; « heroic_feat » posait `best.feat_crit` sur `undefined` — `TypeError` au milieu d'une
   journée. Trouvé en balayant 2 500 graines. Sans escouade debout, l'événement n'a simplement pas lieu.
3. **« Défi » ne tenait pas sa promesse contre l'Hydre.** Le sort dit « la cible ne vise plus que le Duelliste » ;
   `hydreTurn` ne consultait `bossTargets` (qui lit l'état `provoque`) que pour la PREMIÈRE gueule, les deux autres
   prenant la plus proche **en excluant les cibles déjà mordues**, c'est-à-dire tout le monde sauf le provocateur.
   Un boss provoqué mord désormais le provocateur de chacune de ses gueules.
4. **Le Bretteur ne défiait jamais.** Sa politique dépensait ses six PA en garde doublée (2) + botte secrète (4) ;
   le Défi de sa voie ne passait jamais. Ordre corrigé : garde, Défi, botte.

### 5. Le Bretteur : sa garde doublée sort des littéraux, et son test de branche redevient une mesure

Le test de branche (1) de `tactic_t3_check` est sorti en échec après le recalibrage : **Bretteur 10 tours contre 11
au Duelliste nu** (8 graines : 8,75 contre 11,5 — 24 %, juste sous la barre des 25 %). La cause n'était pas le
Bretteur : avant T5, la garde gonflée de l'Hydre empêchait le Duelliste nu de finir le scénario (15* = non résolu),
et la marge était vraie par vacuité. Trois constats mesurés, trois corrections :

* la garde doublée (`cap`, `per_hit`, `power_pct`) était écrite en dur dans `duelRiposte` ; elle est lue dans
  `data.specs.bretteur.passive` ;
* **« au contact » est la clause de la MÉCANIQUE DE VOIE**, pas celle du Bretteur (« chaque coup reçu lui en rend
  deux » ne dit rien de la distance). L'Hydre happe à 2 cases : sur 13 morsures encaissées, **6 ne recevaient aucune
  réponse**. La garde doublée répond désormais jusqu'à 3 cases (`reach`) ;
* **le seuil du scénario passe de six à dix coups rendus**, et les trois gueules sont épaissies pour que le corps
  morde bien trois fois par tour, comme son étiquette le promet. Six coups tenaient **sous le plafond de la voie nue
  elle-même** (le Duelliste riposte deux fois par tour ennemi) : le scénario ne testait pas le doublement. Mesuré
  sur 8 graines : le Duelliste nu plafonne à **huit** ripostes en quinze tours, le Bretteur passe **dix** en onze.

Résultat du banc : **Bretteur 11 · Matador 15\* · Duelliste nu 15\***, 26/26 spés passent leur propre test.

### 6. Finitions de tableau

**Chevauchement des bâtiments de cour (levé).** Mesure (graine 11, 1280 px, `deviceScaleFactor` 2, recouvrement en
% de l'aire du plus petit des deux) :

| Âge | Avant | Après |
|---|---|---|
| 2 (bourg) | aucune paire | aucune paire |
| 3 (ville) | **4 paires** : entrepôt × forge 8 %, infirmerie × taverne 6 %, donjon × marché 2 %, forge × marché 1 % | **aucune** |
| 4 (château) | **5 paires** : entrepôt × forge 9 %, infirmerie × taverne 6 %, donjon × marché 2 %, forge × marché 1 %, chapelle × infirmerie 0 % | **aucune** |

`BCOURT` : `chapel [576,212] → [517,255]`, `forge [196,286] → [181,292]`, `warehouse [232,212] → [233,207]`,
`infirmary [604,288] → [623,279]`, `market [300,300] → [288,299]`. Le **donjon**, le **terrain d'entraînement** et la
**taverne** ne bougent pas. Les trois contrôles d'enceinte tiennent après déplacement : les 7 (âge 3) et 8 (âge 4)
bâtiments restent **entourés** par les quatre murs, deux d'entre eux passent toujours **derrière le mur de face**
(terrain d'entraînement, taverne), et la silhouette est inchangée (126,7 / 210 / 291 aux âges 2 / 3 / 4).

**La plaque de la chapelle n'est plus dans le ciel.** La parcelle était collée au mur du fond : au-dessus, rien que
le ciel — le placeur d'étiquettes, pour qui le ciel est un coût mou (0,7) et le bâtiment un interdit, y posait
« Chapelle à bâtir ». Mesuré avant : âge 2 à (458,9 · 208,1) et âge 3 à (500 · 172,5) dans le repère logique, au-dessus
de la crête du mur de fond (249,2 et 215,5). La parcelle descend : `BNEAR.chapel [512,248] → [610,312]`, et
`BCOURT.chapel` comme ci-dessus. Après : **aucune étiquette entièrement dans le ciel** aux âges 2, 3 et 4. Le
placeur n'a pas été touché — c'est bien l'ancrage qui était en cause, comme la limite T3b le disait.

### 7. Le Derby avec des passages humains

Sonde `_m_derbyh.mjs` : le manager p1 joue son passage **coup par coup** comme la page (`TACTIC.raidAction` :
`begin_pass`, puis chaque geste sur la grille du matin, les gestes refusés ne sont jamais envoyés), et la liste
obtenue est soumise en `raid_pass` — donc rejouée dans l'**ordre de réception** (§B1). 180 saisons, mêmes graines,
comparées à la politique par défaut seule.

| | Politique par défaut | Passages humains de p1 |
|---|---|---|
| Derby des Lames | 65 / 133 = **49 %** | 71 / 132 = **54 %** |
| Sylvain | 58 / 87 = 67 % | 53 / 91 = 58 % |
| Drake | 44 / 73 = 60 % | 45 / 74 = 61 % |
| Hydre | 42 / 70 = 60 % | 39 / 67 = 58 % |
| Morts | 41 / 1 028 = 4,0 % | 44 / 1 032 = 4,3 % |
| Passages humains · interrompus | — | 748 · **0** |

**L'équilibre tient.** L'écart du derby (5 points sur 132 parties, écart-type binomial 4,3) est dans le bruit ; les
trois dragons restent dans la bande, les morts ne bougent pas, et **aucun passage humain n'a été interrompu** — la
grille du matin est bien celle qu'on joue.

### 8. Contrôles ajoutés aux bancs

* **`test/season_t5_check.mjs` (nouveau, 12 contrôles)** : verrouille les cibles de cette section en **bornes**, pas
  en valeurs — chute ≤ 5 % et morts ≤ 8 % (1), chute atteignable (1b), taux par dragon dans [40 %, 85 %] avec un
  échantillon suffisant (2, 2b), aucun raid au-delà du plafond de nuits et majorité de victoires en ≤ 2 nuits (3),
  KO ≤ 25 % (4), chaque biome ≥ 10 % des réveils (5), 13 voies avec un rapport max/min ≤ 5 (6), 26 spés choisies et
  Assassin ≥ 3 (7), château entre 20 % et 70 % des saisons (8), derby 40-60 % (9), déterminisme (10).
* `tactic_t3_check` **(1)** : scénario du Bretteur recentré sur son verbe (dix coups rendus, trois gueules qui
  tiennent) — §5.
* `tactic_t3_check` **(5)** : la journée de contrôle de la reconversion **impose le repos** au même héros, de sorte
  que l'écart d'or vaut EXACTEMENT le prix affiché. L'ancienne comparaison mélangeait les 100 or et les emplettes
  que la guilde fait ou ne fait pas selon l'emploi du héros (écart mesuré 145 avec un jeu de valeurs, 55 avec le
  suivant, sans que le prix ait bougé d'une pièce).
* `tactic_t1_check` **(3b)** : on ne mesure que le PREMIER raid de chaque graine (depuis §3d, un second dragon peut
  se réveiller le soir de la victoire : 32 raids clos pour 30 graines).
* `ui_chateau_check` : **aucune paire de bâtiments de cour ne se chevauche** (âges 3 et 4) et **aucune étiquette
  n'est posée entièrement dans le ciel** (âges 2, 3, 4).
* `ui_v4_check` : recherche complémentaire 61..400 pour la **mort de mon héros** (les morts ayant baissé, le cas ne
  se présente plus dans les soixante premières graines ; première trouvée : graine 121, jour 23).
* `ui_v3_check` : la graine « château » est cherchée **avant le dernier jour** (le bloc clique « Jour suivant » ;
  une saison qui devient château le jour 30 n'a pas de lendemain).
* `ui_v5_check` : le bloc A se joue sur un raid du **Sylvain**, dont le fouet se pointe vers la case du héros et se
  recalcule à chaque pas ; le souffle du Drake retient ses cases par conception (T3b) et ne mesurait rien.

### 9. Code mort retiré

* `tactic.js` : `headsAlive` (définie, jamais appelée).
* `index.html` : `encIn` (définie, jamais appelée ; `inEnc` du banc est une fonction du banc, pas de la page).

### 10. Preuves d'exécution (2026-09-19, fin de tranche)

| Banc | Résultat |
|---|---|
| `ENGINE_ONLY=1 node test/harness.mjs` | 10/10 |
| `node test/harness.mjs` | 19/19 |
| `node test/engine_extra.mjs` | 16/16 |
| `node test/engine_v4_check.mjs` | 28/28 |
| `node test/tactic_t1_check.mjs` | 26/26 |
| `node test/tactic_t2_check.mjs` | 14/14 |
| `node test/tactic_t3_check.mjs` | 14/14 |
| `node test/season_t5_check.mjs` | **12/12** (nouveau) |
| `node test/ui_v2_check.mjs` | 52/52 |
| `node test/ui_v3_check.mjs` | **36/36** (35 avant) |
| `node test/ui_v4_check.mjs` | **55/55** (52 avant) |
| `node test/ui_v5_check.mjs` | 48/48 |
| `node test/ui_chateau_check.mjs` | **90/90** (86 avant) |

`data.js` a été régénéré depuis `data.json` et relu : les deux sont identiques champ pour champ.

### 11. Décisions et limites T5

* **A4 de l'audit (le modèle de vue du raid décrit un passage en cours) n'est PAS fait, et c'est délibéré.**
  Le correctif demande de bâtir `me` depuis `R` quand un passage est en cours, d'ajouter `me.path_to` et
  `units[].class_id` au contrat du VM, puis de retirer les neuf accès bruts et les ~39 lignes dupliquées de la page
  (`raidMe`, `raidSpells`, `raidReach`, `raidRetelegraph`, `raidUnit`). C'est un changement de contrat du modèle de
  vue au milieu de l'écran le plus délicat, couvert par 48 contrôles ; la tranche T5 portait sur le calibrage, et
  l'avoir engagé en fin de tranche aurait mis les deux en risque. **A5 est déjà fait** (T2b §B4 : `sim.attach` et le
  3e argument `data`, prouvés par `engine_extra`).
* **Le Cyclone et le Portier restent rares** (2 sur 60 graines chacun). Leur colonne de besoin (`mobilite`, poids 4)
  est celle de leur propre voie (Tisse-vent, Conjurateur) : le héros vient de la remplir en choisissant sa voie.
  Élargir encore la tranche des spés aplatirait tout le reste ; le choix retenu est d'en rester là et de le dire.
* **`enrage_per_night_pct` est un chiffre qui raconte plus qu'il ne pèse** : son effet mesuré à l'échelle de la
  saison est dans le bruit (§2). Il est conservé pour la lecture du siège, pas pour l'équilibre.
* **Le taux de chute est une mesure à petit échantillon.** 2 sur 60 graines, 3 sur 400 : l'intervalle est large. La
  borne du banc (≤ 5 %) et le contrôle de mécanisme (1b) sont ce qui est réellement prouvé.
* **11 raids sur 60 ne sont pas clos au jour 30.** Ce sont des réveils tardifs (jours 25 à 29) ; la saison s'arrête
  avant le siège. Rien n'est cassé, mais la fin de saison ne raconte rien de ces sièges-là.
* **Non vérifié** : le gate fun (Pierre seul) ; une saison jouée à la main du premier au dernier jour ; le ressenti
  du Bretteur avec sa portée de riposte manette en main ; la lisibilité de la cour recomposée sur téléphone ; le
  comportement des ancrages de cour sur d'autres graines que la graine 11 du banc (les boîtes de bâtiments ne
  dépendent que de l'âge et de la caméra, pas de la graine — vérifié en lecture, pas mesuré sur plusieurs graines) ;
  l'équilibre avec des passages humains de PLUSIEURS managers à la fois (seul p1 a été simulé) ; le rendement des
  nouvelles bandes de besoin quand un joueur choisit ses voies à la main.

## V5 T6 — LE SOLEIL COMPTE LES JOUEURS (2026-09-19)

Source : demande de Pierre — « le soleil devrait descendre en fonction du nombre de joueurs en attente de jouer
ou ayant déjà joué » — plus l'addition retenue par l'orchestrateur : « le jour t'attend ». Périmètre : `index.html`
(§7 de la scène), `CHATEAU_SPEC.md` §7, bancs `test/ui_soleil_check.mjs` (nouveau) et `test/ui_chateau_check.mjs`
(trois contrôles adaptés). Aucune règle de jeu déplacée : `sim.js`, `tactic.js`, `data.json` et `data.js` ne sont
pas touchés.

### 1. La règle, avec ses chiffres

Deux signaux se faisaient concurrence : une horloge simulée qui allait de 8 h à 20 h en douze secondes et pilotait
le ciel, et un compteur en texte « N / 5 ont joué ». **Le soleil est devenu ce compteur.**

* `t = joueurs ayant joué / joueurs de la guilde` (mon héros compris), publié dans `window.__scene.sun`.
* `heure de scène = DAY_START + t × (DAY_END − DAY_START)` = `8 + 12 t`. À cinq joueurs :
  **0/5 = 8 h · 1/5 = 10 h 24 · 2/5 = 12 h 48 · 3/5 = 15 h 12 · 4/5 = 17 h 36 · 5/5 = 20 h** ; le soir de la
  résolution bascule la scène à la nuit (`NIGHT_HOUR = 23`).
* **Seuil bas `SUN_HOLD = 0,8` (17 h 36).** Tant que mon héros n'a pas joué, `t = min(t_brut, SUN_HOLD)` et la
  course est déclarée retenue (`sun.blocked`) dès que `t_brut ≥ SUN_HOLD` **ou** que tous les autres ont joué.
  À cinq managers les deux conditions tombent ensemble, sur 4/5 ; la borne `min` ne mord que si la guilde compte
  plus de cinq joueurs, elle est là pour ce cas-là.
* **Glissement.** Le passage d'une position à l'autre est interpolé en `SUN_MS = 900 ms` (`ease`), instantané sous
  `prefers-reduced-motion`. « Passer » ne fait donc pas sauter le soleil : il l'y amène en glissant.
* **Course.** Arc d'est en ouest : `x = 212 + t × 464` (dégagé de la montagne, qui finit à 206, et du donjon
  lointain, qui commence à 706), `y = hz − (0,2 hz + 16) − sin(π t) × 0,52 hz`, `hz` = ligne d'horizon de la
  caméra de l'âge. La garde au-dessus de l'horizon est proportionnelle : l'horizon descend dans l'image quand la
  caméra recule (§1), et une garde fixe faisait passer le soleil d'aube derrière la ligne d'arbres aux âges 3 et 4.
* **Lecture retenue sur « il descend ».** La course est un ARC : c'est la seule forme qui fasse TOURNER les ombres
  (direction ET longueur, §7) et qui donne une « aube rasante à l'est ». Sur un arc, la hauteur monte puis descend.
  Ce qui croît strictement à chaque joueur, c'est l'avancement `t`, la position est-ouest `x` et l'heure ; la
  hauteur descend strictement sur la seconde moitié du tour de table. Le banc contrôle les deux propriétés
  séparément et le dit en tête de fichier.

### 2. Ce que la page publie

`window.__scene.sun = { played, total, mine_played, t, hour, blocked, evening, moving, x, y, hold, label }` —
`x`/`y` en repère logique 800 × 460, `label` = le texte réellement posé dans la pastille.
`window.__scene.palette` gagne `sky0`, `sky1`, `warm`, `night_k`, `shadow {dx, len, a}`, `gold`, `lamps` : les
valeurs **réellement utilisées par le dessin**, pour que le banc n'ait rien à recalculer ni à deviner.
`window.__tableau` n'a pas changé (`hour` y reste l'horloge simulée, c'est-à-dire l'échéancier des révélations).

### 3. Ce qui suit désormais le soleil, et ce qui reste à l'horloge simulée

`sceneHour()` rend l'heure du soleil : le ciel, la prairie, les ombres portées (`sunK`), la lumière rasante
(`goldK`), les fenêtres et torches (`tone.night > 0,45`), le pont-levis (`bridgeWanted`), la position des soldats
de ronde et la pastille en dérivent. Un seul soleil est calculé par image (`sunC`, remis à zéro en tête de
`drawAll`) : toutes les couches lisent la même valeur.
L'horloge simulée (`tb.hour`) garde un seul rôle : **révéler les amis à leur heure déterministe**
(`8 h + fnv1a(graine:jour:manager) % 12`), borner la durée des bulles, et masquer « Passer » à 20 h.

### 4. Retouches d'image faites au passage (toutes dans §7)

* **Palier de gamme à 20 h** (`sky ['#4b3f70','#f09a5c']`, `night 0,58`) : sans lui, « 5 / 5 » et le soir de la
  résolution se ressemblaient — le couchant était un fondu au noir. Le disque se charge d'orange à mesure que la
  nuit monte.
* **La lune n'apparaît plus qu'à `night > 0,9`** (le soir), le soleil reste dessiné jusqu'à `night < 0,92` : le
  jour garde son soleil jusqu'au couchant, sans quoi l'état « tout le monde a joué » n'avait plus d'astre.
* **Nuages déplacés hors de l'arc** (126 / 306 / 700) et **dragon des jours d'attaque descendu à `hz × 0,63`** :
  rien ne voile le compteur.
* **Disque un tiers plus gros au LOD 2** (vignette 160 px) : même position, même teinte, seul le rayon change —
  c'est là que se juge la lisibilité de la hauteur.
* **Pastille de largeur mesurée** : « le jour attend » est plus large qu'« 12h », et le placeur d'étiquettes
  réserve maintenant la boîte réelle au lieu d'un gabarit de 68 px.

### 5. Écarts assumés dans les bancs existants

`ui_chateau_check.mjs` (3 contrôles devenus faux par conception, écart écrit en tête du fichier) :
1. « pont-levis abaissé à 12 h » comparait `__scene.hour` à l'heure simulée poussée par le banc ; le contrôle
   porte maintenant sur la propriété visée (pont abaissé tant que la course dure) **et** sur le fait que l'heure
   de la scène EST celle du soleil.
2. « deux rendus à la même heure simulée » : le soleil glisse quand le compteur bouge, exactement comme la caméra
   d'âge ; le banc laisse le glissement se poser (`settleSun`) avant de mesurer le déterminisme, et compare en
   plus `__scene.sun` au caractère près.
3. « 18 h 30 : lumière rasante » : l'heure ne se pousse plus à la main ; le contrôle porte sur `palette.gold`
   dans l'état « le jour attend », sur une page à part (y arriver masque le bouton « Passer » dont la suite du
   bloc a besoin). Le banc passe de 90 à **91** contrôles (un contrôle d'erreurs console en plus).

### 6. Preuves d'exécution (2026-09-19)

| Banc | Résultat |
|---|---|
| `ENGINE_ONLY=1 node test/harness.mjs` | 10/10 |
| `node test/harness.mjs` | 19/19 |
| `node test/engine_extra.mjs` | 16/16 |
| `node test/engine_v4_check.mjs` | 28/28 |
| `node test/tactic_t1_check.mjs` | 26/26 |
| `node test/tactic_t2_check.mjs` | 14/14 |
| `node test/tactic_t3_check.mjs` | 14/14 |
| `node test/season_t5_check.mjs` | 12/12 |
| `node test/ui_v2_check.mjs` | 52/52 |
| `node test/ui_v3_check.mjs` | 36/36 |
| `node test/ui_v4_check.mjs` | 55/55 |
| `node test/ui_v5_check.mjs` | 48/48 |
| `node test/ui_chateau_check.mjs` | **91/91** (90 avant, un contrôle ajouté) |
| `node test/ui_soleil_check.mjs` | **57/57** (nouveau) |

Captures : `test/out/sun_0_joueur.png`, `sun_2_joueurs.png`, `sun_4_joueurs_bloque.png`, `sun_5_joueurs.png`,
`sun_soir.png`, `sun_sombre_bloque.png`, `sun_400px.png`, les vignettes 160 px `sun_2_joueurs_vignette.png`,
`sun_4_joueurs_bloque_vignette.png`, `sun_5_joueurs_vignette.png`, et la même histoire sur un village fortifié
(jour 26, âge 3) : `sun_chateau_0_joueur.png`, `sun_chateau_milieu.png`, `sun_chateau_bloque.png`,
`sun_chateau_5_joueurs.png`, `sun_chateau_bloque_vignette.png`, `sun_chateau_5_joueurs_vignette.png`.

### 7. Limites et non vérifié (T6)

* **Le palier du zénith.** À cinq joueurs, `t = 0,4` et `t = 0,6` donnent la même hauteur (`sin` est symétrique) :
  entre 2/5 et 3/5 le soleil avance en est-ouest mais ne change pas de hauteur. C'est une propriété de l'arc, pas
  un défaut de la règle ; le banc le dit et contrôle la descente stricte à partir du zénith.
* **La borne `min(t, SUN_HOLD)` n'est pas exerçée à cinq joueurs** (4/5 = 0,8 tombe pile sur le seuil) : seule la
  déclaration `blocked` l'est. Elle ne mordrait qu'avec une guilde de six joueurs ou plus, cas que la page ne sait
  pas produire aujourd'hui.
* **Le halo pulsé n'est pas mesuré en pixels** : le banc contrôle l'état (`sun.blocked`, `data-blocked` dans le
  DOM, la pastille) et le rendu est jugé sur les captures. Sous `prefers-reduced-motion` il est immobile, donc les
  contrôles de déterminisme au pixel près restent valables.
* **La pastille et le soleil se frôlent à 400 px** quand la course est retenue (« le jour attend » est large, le
  soleil est haut à droite) : recouvrement mesuré de l'ordre de 2 px, visible sur `sun_400px.png`. Pas corrigé.
* **Non vérifié** : le rendu sur un vrai téléphone ; le fond d'écran animé (il n'existe pas encore) ; le ressenti
  du glissement de 900 ms manette en main ; le comportement avec une guilde dont la taille change en cours de
  saison ; le gate fun (Pierre seul) — est-ce que la journée se lit d'un coup d'œil, sans le texte ?

---

## V5 T7 — couche statistiques : charisme, Barde, invocations héritées (2026-09-19)

Source : `AUDIT_STATS.md` (audit chiffré du 2026-09-19) et les décisions D1-D9 + règles R-A/R-B/R-C transmises par
l'orchestrateur. Fichiers touchés : `sim.js`, `tactic.js`, `data.json`, `data.js` (régénéré), les bancs sous `test/`
(nouveau : `test/stats_t6_check.mjs`). `test/harness.mjs`, `V5_SPEC.md` et `AUDIT_STATS.md` ne sont pas modifiés.
Toutes les mesures ci-dessous viennent de l'exécution du moteur sous node 22, graines `1000 + 7 i` (saison) et
`2000 + 13 i` (raids forcés), plans par défaut, 5 ou 6 managers.

### 1. Ce qui n'a PAS bougé (D1, R6)

La formule de dégâts (`raw = max(1, trunc(trunc(atk × power/100) × variance/100))`, `dmg = trunc(raw²/(raw+def))`),
la variance 90-110 et le permille sont inchangés. L'audit les mesure sains : 125 paliers entiers de dégâts sur la
plage d'ATQ utilisée, +1 ATQ séparable en bout de chaîne. **Aucune échelle interne n'a été démultipliée.**

### 2. Entraînement (D2 / R1 / bug B1) — avant et après

`constants.tp_base` passe de `[4, 12, 16, 20, 24]` à `[40, 120, 160, 200, 240]` (×10, comme l'audit le propose) ;
`tp_threshold_base` passe de 20 à **80** et `tp_threshold_step` de 10 à **40** (×4 et non ×10 : le ×10 strict gardait
la vitesse d'avant, c'est-à-dire presque rien — la calibration est mesurée ci-dessous). Rien d'autre n'a changé.

Points d'entraînement effectifs après `max(1, trunc(tp / 3))`, par niveau de terrain et par modificateur :

| niv. | normal | primaire +20 % | dump −20 % | Appliqué +25 % | Paresseux −30 % | jeune +20 % | vieux −50 % | valeurs distinctes |
|---|---|---|---|---|---|---|---|---|
| **0 avant** | 1 | 1 | 1 | 1 | 1 | 1 | 1 | **1** |
| **0 après** | 13 | 16 | 10 | 16 | 9 | 16 | 6 | **5** |
| **1 avant** | 4 | 4 | 3 | 5 | 2 | 4 | 2 | 4 |
| **1 après** | 40 | 48 | 32 | 50 | 28 | 48 | 20 | **6** |
| 2 après | 53 | 64 | 42 | 66 | 37 | 64 | 26 | 6 |
| 3 après | 66 | 80 | 53 | 83 | 46 | 80 | 33 | 6 |
| 4 après | 80 | 96 | 64 | 100 | 56 | 96 | 40 | 6 |

Effet mesuré sur 30 saisons de 30 jours (165 héros vivants au J30) :

| observable | avant | après |
|---|---|---|
| points d'attribut gagnés à l'entraînement, moyenne / héros | **0,048** | **0,388** |
| part des héros qui en gagnent au moins un | **5 %** | **32 %** |
| maximum atteint par un héros | 1 | **3** |
| dix journées d'entraînement au terrain de niveau 1 (calcul exact) | **0 point** | **3 points** |

Le contrôle `(1b)` de `stats_t6_check` verrouille la cible de conception : **dix journées d'entraînement valent
deux à quatre points d'attribut**. `(1a)` verrouille la distinction des modificateurs, `(1c)` le rendement réel.

### 3. Moral (D3 / R3 / bug B8) — avant et après

Deux corrections :

1. **Bug de données.** `decoration_morale_cap` vit à la RACINE de `data.json`, pas dans `constants` ; `sim.js`
   lisait `D.C.decoration_morale_cap` → `Math.min(undefined, …)` = `NaN`, que le `|| 0` suivant transformait en
   zéro. **Les dix décorations n'ont jamais donné un seul point de moral.** La constante est maintenant présente
   dans `constants` et le code retombe sur la racine si elle manque.
2. **Usure du soir**, donc plafond MOBILE. `moraleWear(D, h) = trunc(max(0, moral − morale_wear_floor) / morale_wear_div)`
   avec `morale_wear_floor = 25` et `morale_wear_div = 6`. L'usure est **nulle sous 25** (jamais punitive pour un
   héros déjà bas) et croît avec le moral. Le moral s'équilibre là où le gain quotidien du manager compense l'usure :
   `moral d'équilibre ≈ 25 + 6 × gain quotidien`. Chapelle, décorations et trait Jovial redeviennent le levier.

Répartition dans les trois paliers de `moraleMod` (×90 sous 30, ×100 de 30 à 69, ×105 au-delà), en jours-héros :

| observable | avant | après |
|---|---|---|
| moral moyen au J30 | 98,2 | **73,1** |
| héros à 100 de moral au J30 | **89 %** | **0 %** |
| palier bas (< 30) | 0 % | **1 %** |
| palier du milieu (30-69) | **2 %** | **38 %** |
| palier haut (≥ 70) | **98 %** | **61 %** |
| moral cumulé de la table, 6 jours, sans chapelle ni décoration | — | 263 |
| idem, chapelle 4 + quatre kiosques | — | **485 (+222)** |

### 4. Les sept statistiques mortes en raid (D5 / R2) — branché ou retiré

| statistique | décision | ce qui a été fait | preuve |
|---|---|---|---|
| **MAG d'objet hors Mage** (B2) | **BRANCHÉE** | `magicAffinity(D, h)` sonde `attackBase` avec un vecteur unité sur Esprit puis Volonté : toute classe dont l'attaque est bâtie sur l'un des deux lit la magie de ses objets (Mage, Clerc, Invocateur, Barde) | `stats_t6_check (3f)` |
| **SOIN** (B4) | **BRANCHÉ** | le soin qui déborde devient BOUCLIER pour les unités de la guilde (`raid.overheal_to_shield_pct = 50`) ; la politique du Clerc lance la prière au premier tour quand il n'a pas de bouclier | `stats_t6_check (3a)` |
| **Esquive** (Discrétion) | **BRANCHÉE** | `dodge` est transmis au raid et tiré contre les coups du camp du boss ; le montant du coup reste exact, seule sa rencontre est tirée | `stats_t6_check (3b)` |
| **Toucher** (Archerie) | **BRANCHÉ** | `hit_bonus` devient `+n %` de dégâts à `raid.hit_bonus_dmg_range` cases ou plus (un tireur sûr place mieux ses coups) | `stats_t6_check (3c)` |
| **Feu d'objet** | **BRANCHÉ** | `fire` est transmis ; une arme de braise met le feu au monstre une fois par passage (`fire_burn_turns`, `fire_burn_per_pass`) | `stats_t6_check (3d)` |
| **VIT (vitesse)** (B3) | **RETIRÉE du raid** | `spd` n'est plus transmis par `raidEnvOf` ni porté par l'unité : `unitsOrderS` exclut les héros, il n'avait aucun lecteur. Elle reste une grandeur d'EXPÉDITION (initiative, toucher, souffle) — `combatProfile.spd` existe toujours et neuf objets la portent | `stats_t6_check (3g)` |
| **Les six fioles** | **NON branchées, étiquetées** | boire une fiole en raid est un VERBE nouveau (une action, une case d'interface) : hors périmètre d'une réparation de statistiques. Elles restent pleinement actives en expédition | — |
| **Les treize compétences de classe** | **NON branchées, étiquetées** | le raid a son propre vocabulaire (`tactic_spells`, 29 sorts de base) ; les compétences servent en expédition. Seul `precise_shot` traverse, via `+100 ‰` de critique | — |
| **Traits Loyal et Héritier** | **assumés décoratifs** | Loyal reste un jeton d'affinité de voie ; Héritier est posé et jamais relu. Écrit ici plutôt que corrigé | — |

**Ce qui n'est PAS branché est à étiqueter dans la page** (« en expédition seulement ») : les six fioles, les
compétences de classe, et la VIT des neuf objets qui la portent. Le moteur expose de quoi le faire —
`statsLabel` nomme chaque statistique d'objet, et `spd` a disparu du profil de raid : une page peut donc
décider d'afficher la VIT dans une colonne « expédition ». **La page n'a pas été modifiée ici** (tranche moteur).

### 5. Les 26 passifs de spécialisation (D4 / R5 / bug B9)

Les 26 fiches `data.specs[*].passive` sont remplies. Chaque valeur tient dans la bande mesurée utile par l'audit —
**8 à 15 % sur une grandeur dérivée** — et le volet offensif est CONDITIONNEL, sa condition étant la posture propre
à la spé (ancré, au contact, à distance, derrière ses corps, sur sa case gardée, sablier plein, cible entravée…).
Champs : `dmg_pct` / `dmg_when`, `taken_pct`, `hp_pct`, `def_pct`, `heal_pct`, `shield_pct`, `summon_pct`, `cost_cut`.

`cost_cut: 1` (**maîtrise de la pointe**) est le volet qui rembourse mécaniquement le TOUR que le verbe coûte :
les deux sorts signature de la spé coûtent un point d'action de moins à celui qui la porte. C'est la cause mesurée
du déclassement du troisième étage — la pointe installait pendant que la voie nue frappait.

Puissance mesurée (part de réserve entamée au premier jour, ‰ ; toute la table porte la voie, puis la pointe ;
raid forcé au J20, quatre graines × les raids que la spé « répond ») :

| population | avant T6 | après T6 |
|---|---|---|
| spés qui font STRICTEMENT plus que leur voie nue | **2 / 26** | **13 / 26** |
| spés qui font moins | **24 / 26** | **13 / 26** |
| pire rapport spé / voie nue | non mesuré | **51 %** (Chronomancien) |

Détail après T6 (spé/voie nue, en ‰, et rapport) : assassin 448/745 (60 %) · avatar 229/284 (81 %) ·
bourrasque 352/582 (60 %) · **bretteur 784/411 (191 %)** · censeur 224/359 (62 %) · chronomancien 214/420 (51 %) ·
**confesseur 663/507 (131 %)** · cyclone 349/582 (60 %) · devin 332/304 (109 %) · **ecorcheur 704/464 (152 %)** ·
fauconnier 495/448 (110 %) · harponneur 501/477 (105 %) · hospitalier 409/422 (97 %) · maitre_ours 562/445 (126 %) ·
matador 565/472 (120 %) · medium 599/430 (139 %) · mirage 229/229 (100 %) · passe_muraille 220/240 (92 %) ·
pelerin 466/441 (106 %) · piegeur 722/792 (91 %) · porte_etendard 204/349 (58 %) · portier 316/223 (142 %) ·
sergent 207/324 (64 %) · sourcier 333/446 (75 %) · **templier 474/348 (136 %)** · veilleur 305/280 (109 %).

**La contrainte « aucune spécialisation ne fait moins que sa voie nue » n'est PAS atteinte, et elle ne l'est pas
par arithmétique.** Treize pointes restent en dessous sur l'observable « dégâts au monstre ». La raison est mesurée :
une pointe achète un VERBE avec des TOURS (installer un mur, clouer des rejetons, annuler une riposte, regrouper la
vase), et un multiplicateur de 8 à 15 % ne rembourse pas une dépense de 30 à 60 % du temps de jeu. Fermer l'écart
demanderait un levier plus gros que celui que l'audit recommande — ce que D1 interdit. Ce qui est verrouillé au banc,
à la place : **au moins dix pointes au-dessus de leur voie nue** `(4c)`, **aucune sous 45 % de sa voie nue** `(4d)`,
et le **test de branche des 26** reste vert (`tactic_t3_check (1)`), qui mesure ce qu'une pointe est censée faire :
résoudre SON problème en au moins 25 % de tours de moins que sa sœur ET que sa voie nue.
L'Assassin est l'exception ratifiée en T3b : sur une cible intacte il DOIT être le moins bon des trois
(`tactic_t3_check (1b)`), son passif « Curée » ne payant que sur une cible entamée.

### 6. Septième attribut : le CHARISME (D7)

`charisma` est le septième attribut, présent partout où vivent les six autres : `data.attributes`, `start` et
`growth` des sept classes (les six attributs existants sont inchangés, exigence de Pierre), `bonus_attrs`, `trained`,
`attrEff`, les tirages de rareté, le modèle de vue. Savoir-faire associé : **Commandement**
(`constants.craft_by_attribute.charisma`), +4 % de soutien par niveau (+6 % pour le Barde).

Valeurs de départ : Barde 16 · Clerc 11 · Invocateur 10 · Voleur 9 · Guerrier 8 · Rôdeur 7 · Mage 6.

Grandeur dérivée : **SOUTIEN** = `pct(pct(charisme × 4 + volonté/2, performance), 100 + Commandement) + objets`.
Statistique d'objet associée : `support` (libellé « SOUTIEN »), portée par cinq objets.
Le soutien pilote QUATRE choses, et seulement celles-là :

1. la VALEUR et la DURÉE des états bénéfiques et des boucliers posés sur la guilde
   (`support_div_pct = 5`, `support_turn_step = 30`, `support_turn_max = 2`) ;
2. la DURÉE des zones de soutien posées par un héros — sanctuaire, esprit gardien, sentier, étendard
   (`support_zone_step = 40`, `support_zone_max = 2`) ;
3. la SOLIDITÉ et le NOMBRE des corps COMMANDÉS — recrue du Capitaine, bête du Dresseur
   (`command_cap_threshold = 45` ouvre une recrue de plus) ;
4. les CHANCES d'un contrôle de COMPORTEMENT — provoqué, aveuglé, entravé, muselé, charmé
   (`support_control_div = 3`). Les contrôles du CORPS (immobilisé, étourdi, gelé) n'y gagnent rien.

Il ne pilote PAS les invocations : celles-ci héritent du maître (§8).

### 7. Septième base : le BARDE (D8)

`bard` — buffeur de ZONE orienté contrôle. Primaire charisme, secondaire esprit, dump force.
Quatre sorts tactiques dans la grammaire des six autres bases :

| sort | verbe | PA | portée | forme | effet |
|---|---|---|---|---|---|
| Chant de guerre | galvaniser | 3 | 0-3 | cercle 1 | bouclier 18 + 2×niveau, 3 tours, sur tout le cercle |
| Pas de danse | dérober | 3 | 0-3 | cercle 1 | feinte 2 tours sur tout le cercle |
| Fausse note | désorienter | 3 | 1-4 | cible | 95 % magique ; aveugle un rejeton 1 tour |
| Ballade lente | ralentir | 4 | 1-4 | croix 1 | entrave 2 tours (contrôle de comportement) |

Passif tactique : `refrain` — les états bénéfiques qu'il pose durent un tour de plus, en plus du soutien.
Compétences d'expédition : Chant de guerre (zone), Encouragement (+15 % d'attaque au groupe), Dernier couplet.
Sa marque est la zone et la DURÉE, pas le soin ponctuel : aucun de ses sorts ne soigne.

**Une septième base ouvre de nouvelles paires de voies — elles ne sont PAS écrites dans cette tranche.** Le moteur
tient le cas : `phaseLineage` ne propose pas de voie à une classe qui n'en ouvre aucune, et `choiceVm` ne rend plus
une carte de choix à zéro option. Le Barde reste jouable en base, monte en niveau et lance ses quatre sorts
(`stats_t6_check (6a)(6b)(6c)`). **Ce qui devient faux par conception :** le contrôle `(2a)` de `tactic_t2_check`
(« 90 % des héros ont choisi leur voie au J10 ») porte désormais sur les héros **dont la classe ouvre une voie** —
mesuré 61/72 tous héros confondus, 61/61 une fois les Bardes écartés.

### 8. Les corps invoqués héritent de leur maître (D9)

Avant T6, une invocation ne lisait du maître que son niveau (et la vigueur, pour le golem) : l'équipement de
l'invocateur ne changeait RIEN à ce qu'il posait. `data.raid.summons` donne maintenant, par type de corps, la part
des grandeurs du maître dont il hérite AU MOMENT DE L'INVOCATION :

| corps | PV | attaque | défense | pas de plus | commandé |
|---|---|---|---|---|---|
| golem | 30 + 4×niv + 2×vigueur + **25 % des PV du maître** | 95 % de son attaque | +60 % de sa DÉF | — | non |
| nuée | 12 + 2×niv + 8 % de ses PV | 85 % de son attaque | +10 % de sa DÉF | Adresse ≥ 18 | non |
| bête | 40 + 5×niv + 18 % de ses PV | 90 % de son attaque | +30 % de sa DÉF | Adresse ≥ 20 | oui |
| élémentaire | 25 + 3×niv + 10 % de ses PV | **140 % de sa PUISSANCE MAGIQUE** | +20 % de sa DÉF | — | non |
| soldat (recrue) | 20 + 3×niv + 15 % de ses PV | 60 % de son attaque | +40 % de sa DÉF | — | **oui** |
| double | 1 PV | — | — | — | non |

`magic_power = pct(esprit + volonté, performance) + magie des objets` est la nouvelle grandeur dérivée dont hérite
le corps d'élément : c'est elle qui rend les objets à MAG utiles à un invocateur. Les corps **commandés** (recrue,
bête) passent en plus par le SOUTIEN du maître.

Mesuré : le même invocateur au même niveau, avec une panoplie de chair (460 PV / 44 DÉF) puis de papier
(220 PV / 14 DÉF), pose un golem à **233 PV / 48 DÉF** contre **173 PV / 30 DÉF** ; un maître adroit (Adresse 34)
pose une nuée à **4 PM** contre **3 PM** pour un maître peu adroit (`stats_t6_check (7a)(7b)(7c)`).

### 9. Les trois règles tranchées par Pierre (R-A, R-B, R-C)

* **R-A — une invocation ne ressuscite pas, elle se réinvoque.** `R.fallen` et le sort « Relever » sont supprimés.
  Le sort signature de l'Hospitalier devient **Second souffle** : sur un corps VIVANT de la guilde, il lave poison,
  brûlure, entrave et immobilisation, rend 150 % du soin + 20, et laisse un bouclier de 20 + 2×niveau. Le verbe de
  l'Hospitalier devient « remettre debout » ; son scénario de branche a été réécrit sur cet énoncé et reste vert.
  *Devenu caduc et retiré :* le suivi des corps tombés, le sort `relever`, la mécanique `mech('relever')`.
* **R-B — les invocations restent avec leur maître.** À la fin d'un passage, tous les corps du héros quittent la
  grille avec lui. Les ZONES (pièges, murs, sanctuaires, étendard) ne sont pas des corps : elles restent.
  *Devenu caduc et retiré :* `raid.summon_cap_guild` et la dissipation de la plus ancienne invocation de la guilde.
  La seule limite restante est celle du maître (`summon_cap = 2` par maître, la place sur la grille, ses PA).
  *Conséquences mesurées et traitées :* les corps ne chipotent plus le monstre entre deux passages — c'est la
  principale baisse de puissance de la guilde en T6 (l'Invocateur passe de 6 % à 7 % des dégâts par passage mais
  perd sa contribution continue) ; poser un corps n'est plus compté comme une « installation » pour une pointe, et
  une pointe qui a déjà un corps à elle peut jouer une SECONDE installation dans le passage
  (`raid.spec_installs_per_pass = 2`), sans quoi les verbes en deux temps (Maître-ours, Fauconnier, Sergent) ne
  franchissaient plus leur second temps ; l'Invocateur fait exploser au dernier tour un corps resté au contact
  plutôt que de le laisser partir en fumée ; l'Ermite purifie aussi ce qui brûle ou est empoisonné, et à défaut
  efface la zone ennemie la plus proche.
* **R-C — une voie donne accès aux deux barres d'action.** `unitSpells` ajoute les quatre sorts de la SECONDE BASE
  de la voie ; la politique par défaut rejoue sa routine de base sur cette seconde barre quand la première n'a plus
  rien à proposer. Rien d'autre n'est mélangé. **Effet mesuré, dit avec les chiffres plutôt que bridé :** le
  Duelliste nu gagne la barre du Voleur et la dépense à s'approcher — sur le décor de branche du Bretteur, la voie
  nue rend quatre coups là où elle en rendait huit sans seconde barre, et le Bretteur six en neuf tours au lieu de
  dix en onze. Le seuil du scénario passe donc de DIX à SEPT coups rendus, au-dessus de ce que la voie nue produit.

### 10. Les onze bugs de l'audit

| bug | sort | preuve |
|---|---|---|
| **B1** entraînement écrasé par la troncature | **corrigé** (§2) | `stats_t6_check (1a)(1b)(1c)` |
| **B2** magie d'objet perdue hors Mage | **corrigé** — test sur la grandeur d'attaque | `(3f)` |
| **B3** vitesse calculée et jamais lue | **retirée du raid**, reste en expédition | `(3g)` |
| **B4** SOIN sans effet mesurable en raid | **corrigé** — le soin qui déborde devient bouclier | `(3a)` |
| **B5** plafonds de critique et d'esquive appliqués AVANT les objets | **corrigé** — `min` après la somme, `constants.crit_max_permille = 400`, `dodge_max_permille = 350` | `(10a)` |
| **B6** `pm_dex_threshold = 30` hors de portée | **laissé à 30, autrement résolu** : l'Adresse agit désormais sur la grille par l'ESQUIVE à chaque point (`dodge = adresse × 4 + Discrétion`), au lieu d'un seuil franchi par 3,6 % des héros. Abaisser le seuil DÉGRADE le résultat tant que `raidDefaults` dépense le PM à se déplacer (mesuré par l'audit : 681 ‰ contre 610 ‰) ; la politique n'a pas été retouchée sur ce point | `(3b)` |
| **B7** rareté de héros jamais utilisée | **politique corrigée** — à bourse suffisante, `planEconomy` prend la MEILLEURE offre (rareté, puis niveau) au lieu de la moins chère. **Reste imparfait** : avec les plans par défaut, seuls 6 recrutements ont lieu sur 30 saisons, si bien que la rareté reste de fait un contenu de joueur humain. Le banc prouve la préférence, pas la fréquence | `(10c)` |
| **B8** moral plafonné à 100 atteint par 93 % des héros | **corrigé** (§3), plus le bug de données `decoration_morale_cap` = `NaN` | `(2a)(2b)` |
| **B9** 24 fiches de passif sur 26 à `null` | **corrigé** (§5) | `(4a)(4b)(4c)(4d)` |
| **B10** la DÉF ignore la performance en raid | **corrigé** — `combatProfile.def` passe par `fatigueDefMod`, lu par les deux résolutions | `(10b)` |
| **B11** trois plafonds déclarés jamais approchés | **porté au contrat** (§11) | `(10d)` |

### 11. Plafonds déclarés et plafonds atteints (B11) — à lire avant de calibrer quoi que ce soit

Mesuré au J30 sur 165 héros vivants, 30 saisons, plans par défaut :

| plafond déclaré | valeur | maximum réellement atteint |
|---|---|---|
| `constants.attr_max` | 60 | **33** |
| `constants.level_max` | 20 | **9** (médiane 6) |
| `constants.trained_max` | 10 | **3** |
| `crit_max_permille` | 400 ‰ | 330 ‰ sur un héros aux attributs forcés au maximum |
| `xp_table` | défini jusqu'au niveau 20 | les entrées 10 à 20 ne sont jamais lues |

**Personne ne doit calibrer une branche en supposant un héros de niveau 15.** Une saison de trente jours amène un
héros au niveau 6-9, avec des attributs à deux chiffres bas. Le contrôle `(10d)` de `stats_t6_check` échouera si un
de ces plafonds devient atteignable sans décision consciente.

### 12. Recalibrage rendu nécessaire par T6

La guilde a changé de puissance dans les deux sens (plus forte : passifs de pointe, maîtrise, soutien, corps hérités,
entraînement réel ; plus faible : moral qui s'use, DÉF fatiguée, plafonds de critique refermés, et surtout R-B qui
retire les corps entre les passages). Les réserves ont été remesurées et réajustées :

| table | avant T6 | après T6 | raison |
|---|---|---|---|
| `raids.raid_forest.hp_base` | 580 | **380** | R-B retire la contribution continue des corps ; sans cet ajustement le Sylvain tombait sur 17 % des graines en ≤ 3 jours au lieu de 40 % |
| `raid.summons` | absent | table d'héritage | D9 |
| `lineage.hybrid_need_band` | 20 | **200** | une septième base aplatit le vecteur de besoins : avec la bande de 20, quatre voies sur treize n'étaient PLUS JAMAIS choisies (Ermite, Traqueur, Illusionniste, Conjurateur) et neuf pointes sur vingt-six non plus. À 200, les treize voies et les vingt-six pointes sont toutes prises, et la plus prise ne vaut que 3,2 fois la moins prise |
| `lineage.spec_need_band` | 50 | **200** | idem |
| `raids.raid_derby.banner_lost_max` | 2 | **3** | le Derby tombait à 37 % de victoires (bande 40-60) |
| `raids.raid_derby.hp_base` | 300 | 260 | sans effet mesurable (le Derby se joue sur la Bannière) ; conservé |

Taux de victoire après recalibrage, 60 saisons complètes : **Drake 73 % · Hydre 61 % · Sylvain 47 %**
(cible : chaque dragon dans `[40 %, 85 %]`), Derby **49 %** sur 35 derbys joués (cible 40-60 %),
morts 1,2 % des héros (cible ≤ 8 %), chute de la guilde 0 (cible ≤ 5 %).

### 13. Bornes de banc devenues fausses par conception, remesurées

Aucune n'a été supprimée. Chacune porte son commentaire dans le banc.

| banc | borne | avant | après | raison |
|---|---|---|---|---|
| `engine_v4_check` | `r.crafts.length !== 6` | 6 | `data.crafts.length` (7) | le Commandement est le savoir-faire du charisme |
| `tactic_t1_check` | table des managers | 6 bases | **7 bases** (un Barde) | sans Barde à la table, ses quatre sorts rendaient `(4a)` invérifiable |
| `tactic_t1_check` | Rempart, Bénédiction, Cercle sacré | constantes nues | formule + SOUTIEN, écrite en entier dans le banc | D7 |
| `tactic_t1_check` | PV du golem | `30 + 4×niv + 2×vig` | + 25 % des PV du maître | D9 |
| `tactic_t1_check` | premier manager du passage | premier par ordre alphabétique | premier qui a effectivement un passage | le banc plantait au lieu de mesurer |
| `tactic_t2_check` | `(2a)` 90 % de héros avec une voie | tous les héros | les héros **dont la classe ouvre une voie** | le Barde n'a pas de voie dans cette tranche |
| `tactic_t3_check` | seuil du Bretteur | 10 coups rendus | **7** | R-C donne la seconde barre à la voie nue aussi (§9) |
| `tactic_t3_check` | scénario de l'Hospitalier | relever un corps tombé | laver, remonter et couvrir un corps VIVANT | R-A |
| `tactic_t3_check` | scénario du Porte-étendard | corps massés sur la Bannière du Derby | corps massés sur SA hampe | R-B : les corps ne survivent plus au passage |
| `tactic_t3_check` | `(7)` et `(7b)` Derby | 30 saisons, `played ≥ 22` | **60 saisons, `played ≥ 30`** | les raids tiennent plus longtemps, un dragon occupe la grille une saison sur trois ; l'échantillon est doublé pour garder la bande 40-60 % INCHANGÉE |

### 14. Ce qui reste imparfait, et ce qui n'est pas vérifié

* **Treize pointes sur vingt-six font encore moins de dégâts que leur voie nue** sur leur propre terrain (§5). La
  cause est mesurée et structurelle ; la contrainte de vérification n'est pas atteinte.
* **La rareté des héros reste de fait inutilisée** avec les plans par défaut : six recrutements sur trente saisons.
  La préférence est corrigée et prouvée, la fréquence ne l'est pas.
* **Les six fioles, les treize compétences de classe et la VIT** restent sans effet EN RAID, par décision assumée.
  Rien ne les étiquette encore dans la page — la page n'a pas été touchée (tranche moteur).
* **Le seuil `pm_dex_threshold = 30`** n'est franchi que par 3,6 % des héros. Il n'a pas été abaissé (§10, B6).
* **Traits Loyal et Héritier** sont toujours du décor.
* **Non vérifié** : le rendu et l'équilibre ressentis manette en main ; le comportement avec des gestes humains
  (tout est mesuré sous plans par défaut) ; les nouvelles paires de voies que le Barde ouvre (hors périmètre) ;
  l'effet des passifs de pointe sur une table aux pointes MÉLANGÉES (toutes les mesures forcent la même pointe sur
  toute la table, comme l'audit) ; le comportement de la couche statistiques si le raid tour par tour était
  remplacé par une résolution automatique.

---

## V5 T8 — CINQ EMPLACEMENTS DE SORTS (2026-09-19)

Source : règle de Pierre, dans ses mots — « Tu as toujours cinq emplacements de compétences. Tu choisis entre les
deux premières classes et la nouvelle voie pour en avoir cinq, que tu gardes. » Périmètre : `tactic.js` (vivier,
règle de sélection, validation), `sim.js` (persistance, action `set_loadout`, modèle de vue), `data.json`/`data.js`
(emplacements, demande de chaque raid, calibrage), `index.html` (écran « Mon héros » et barre du Raid),
`test/loadout_t8_check.mjs` (banc neuf) et un bloc F dans `test/ui_v5_check.mjs`.

### 1. La règle telle qu'implémentée

* **Cinq emplacements, toujours** (`data.constants.spell_slots = 5`). Un héros emporte `min(5, vivier)` sorts :
  jamais plus, jamais moins, jamais une liste vide. Le nombre d'emplacements ne change à aucun moment de la lignée.
* **Le vivier grandit, pas la barre.** `TACTIC.spellPool(env, héros)` rend ce que le héros POSSÈDE :
  **5** à la classe nue (l'arme + les 4 sorts de classe) · **11** à la voie (+ les 4 de la seconde base, + les 2 de
  la voie) · **13** à la pointe (+ ses 2 verbes). Mesuré sur les 97 profils atteignables : 7 viviers à 5, 30 à 11,
  60 à 13. `TACTIC.unitLoadout(env, héros)` rend les cinq EMPORTÉS, dans l'ordre du vivier (donc groupés par
  origine). C'est `unitSpells` — la porte unique de `castWhy` — qui a changé de sens : la politique par défaut, la
  validation d'un passage, l'aperçu et l'écran Raid suivent le chargement sans une ligne de plus.
* **L'arme occupe un emplacement.** C'est ce qui fait que la classe nue tombe juste (arme + 4 = 5 = cinq
  emplacements exactement) et que « le Paladin dispose de onze sorts » se lit tel quel dans le vivier.
* **Les passifs ne prennent pas d'emplacement.** Les 7 passifs de classe (`data.tactic_passives`) et les 26 passifs
  de pointe (`data.specs[].passive`) ne sont PAS des sorts : ils ne figurent pas dans le vivier et restent actifs
  quoi qu'on emporte. Vérifié : aucun des 33 identifiants n'apparaît dans un vivier.
* **Le choix se garde.** `h.loadout` (+ `loadout_kind`, `loadout_day`, `loadout_pool`, `loadout_for`) est écrit dans
  l'état. Un chargement `choice` vaut jusqu'à ce que le joueur en décide autrement — il ne suit ni la voie, ni la
  pointe, ni le dragon du jour. Un chargement `auto` se refait quand le vivier grandit ou quand la situation de boss
  change, et pas autrement.
* **Il se change hors combat, comme un équipement.** Action additive `set_loadout {adventurer_id, spells[5]}`,
  appliquée en phase 1 comme `equip`, donc AVANT que le héros monte sur la grille (phase 7b'). Refus français :
  « … est en plein passage : le chargement ne se change jamais pendant un passage » et « … a déjà joué son passage
  aujourd'hui : le chargement se revoit le matin, avant la grille ».
* **Phase 12b `phaseLoadout`, au SOIR.** Le chargement de DEMAIN se fixe avec la grille de demain (dressée en phase
  11c). Placée le matin, elle changeait la barre sous les pieds d'un joueur qui avait déjà composé son passage :
  mesuré, 15 passages humains sur 45 étaient interrompus (« sort d'une autre classe »). `newGame` sème les
  chargements initiaux (`seedLoadouts`) pour que le premier matin ait déjà ses cinq sorts.
* **Un vivier qui rétrécit ne troue pas la barre.** Si un chargement stocké n'est plus entièrement dans le vivier
  (reconversion, héros ramené à sa classe nue), les emplacements manquants se remplissent par la règle par défaut.
* **Un héros sans choix explicite** reçoit toujours le chargement par défaut calculé par la même règle — mesuré sur
  97 profils × 5 situations de boss × 4 héros : 1 940 chargements, tous valides, aucun vide.

### 2. La règle de sélection des amis simulés (`defaultLoadout`)

Déterministe, sans tirage, et construite sur le BESOIN. Pour chaque sort du vivier :

1. **Rôles du sort**, lus sur sa fiche : `degats` (puissance > 0), `soigner` (effet `heal`/`purify`/`sacrifice`),
   `tenir` (effet `shield`, état bénéfique), `controler` (effet `state` de contrôle ou état hostile),
   `zones` (effet `zone`/`wall`/`freeze`, forme ≠ `single`, cible `cell`), `corps` (effet `summon`/`vital_link`,
   cible `summon`), `mobilite` (effet `push`/`teleport`). Les 60 sorts dont le comportement est porté par
   l'identifiant dans `castSpell` n'ont ni puissance ni effet déclaré : leur rôle est alors celui que revendique
   leur fiche d'origine (`need` de la pointe, puis de la voie, puis colonne dominante de la classe).
2. **Score** = somme des `loadout_role_cap = 2` besoins les MIEUX servis par la situation du jour
   (`data.raids.<id>.demand`, ou `data.lineage.loadout_demand_default` hors raid)
   `+ loadout_answer_bonus (4) ×` ce que le sort « répond » au dragon du jour
   `+ loadout_spec_bonus (1)` si c'est un verbe de pointe, `+ loadout_hybrid_bonus (1)` si c'est un verbe de voie.
   « Répondre au dragon » a deux canaux : la BRANCHE le revendique (`answers` de la voie ou de la pointe) et le SORT
   porte un état que la fiche du raid rend décisif (`data.raids.<id>.demand_states` : la braise qui cautérise les
   souches du Sylvain et de l'Hydre, la marque qui ouvre les écailles du Drake, le contrôle qui tient le clerc rival
   au gué).
3. **Tranche** : `tier = score / loadout_band (6)`. Sans cette grossièreté, la meilleure réponse gagnait toujours et
   le même chargement revenait ; avec elle, deux sorts également utiles restent réellement disputés.
4. **Départage stable et NON alphabétique** : `fnvStr(graine | héros | sort) % 997`, exactement le procédé retenu en
   T5 pour le choix de voie. Rejouable au bit près, stable pour un même héros, sans biais ASCII. L'identifiant ne
   sert qu'en dernier recours.
5. **Garantie dure** : si les cinq retenus ne couvrent aucun moyen d'infliger des dégâts, le dernier emplacement
   passe au mieux classé des sorts qui blessent.

Le **plafond à deux rôles** (4) est une correction mesurée : sans lui, un sort qui coche quatre colonnes à la fois
(le Sacrifice de l'Invocateur) écrasait tout son vivier et devenait obligatoire — 99,5 % de sélection.

**Calibrage retenu** (`data.lineage`) : `loadout_band 6` · `loadout_answer_bonus 4` · `loadout_spec_bonus 1` ·
`loadout_hybrid_bonus 1` · `loadout_role_cap 2`. Balayage de 60 combinaisons mesuré sur 40 saisons ; c'est le seul
réglage à **zéro sort jamais pris et zéro sort toujours pris**, avec la plus large plage de chargements distincts.

| réglage essayé | jamais pris | toujours pris | bornes |
|---|---|---|---|
| bande 5, réponse 4, pointe 1, voie 1, rôles 2 | 2 (`mur_boucliers`, `rabattre`) | 1 (`rafale`) | 0 – 100 % |
| bande 7, réponse 4, pointe 1, voie 1, rôles 3 | 0 | 1 (`sacrifice`) | 4,8 – 100 % |
| bande 6, réponse 4, pointe 2, voie 1, rôles 2 | 0 | 2 (`second_souffle`, `tempete_vent`) | 9,5 – 100 % |
| bande 6, réponse 4, pointe 1, voie 1, rôles 3 | 0 | 0 | 9,5 – 99,5 % |
| **bande 6, réponse 4, pointe 1, voie 1, rôles 2** | **0** | **0** | **7,5 – 97,2 %** |

### 3. La nouvelle mesure de santé : la FRÉQUENCE DE SÉLECTION

La contrainte « aucune spécialisation ne doit faire moins que sa voie nue » est **retirée du contrat et des bancs**.
Elle n'a plus de sens : avec cinq emplacements, une pointe ne peut pas être un déclassement, puisqu'un sort moins bon
n'est simplement pas emporté — et comparer « la pointe » à « la voie nue » revient à comparer deux barres d'action
qui n'existent plus. (`stats_t6_check (4c)/(4d)` mesuraient avant T8 : 13 pointes sur 26 au-dessus de leur voie nue,
la pire à 51 %.) Elle est remplacée par deux garde-fous et une bande, mesurés sur **100 saisons × 30 jours × 6 héros**
et comptés **uniquement là où le vivier dépasse les cinq emplacements** (sinon il n'y a pas de choix à faire : un
Barde sans voie ouverte emporte forcément ses cinq sorts, et ce 100 % ne dit rien) :

* **aucun sort jamais choisi** — un sort jamais pris est un sort mort ;
* **aucun sort toujours choisi** par tous les héros qui y ont accès — un sort obligatoire écrase les autres ;
* **bande retenue [15 %, 97 %]**, posée autour de la mesure : **23,1 %** (Mur de boucliers, Sergent) à **94,8 %**
  (Rafale, Tisse-vent) ; les 52 verbes de pointe vont de 23,1 % à 89,7 % (Tempête de vent, Cyclone). 103 sorts
  mesurés sur 107 (les 4 restants appartiennent à des viviers qui ne dépassent jamais cinq).
* **diversité** : 1 373 chargements distincts observés, **3,49 chargements distincts par héros-saison**.

Aucun sort n'est hors bornes. Contrôles : `loadout_t8_check (7a)(7b)(7c)(8)`.

### 4. Mesure avant / après

« Avant » = le MÊME moteur avec la règle neutralisée (`spell_slots` au-dessus du vivier, chacun joue tout ce qu'il
possède) et les chiffres de raid d'avant T8 ; « après » = le jeu livré. 60 saisons × 30 jours, 5-6 managers, plans
par défaut, mêmes graines (`test/tmp_mesure.mjs`, supprimé après mesure).

| grandeur | avant T8 | après T8 |
|---|---|---|
| passages de raid joués | 1 460 | 1 482 |
| **dégâts par passage** | **143** | **136** |
| KO par passage | 8,4 % | 8,4 % |
| Sylvain abattu | 22/46 (48 %) | 25/47 (**53 %**) |
| Drake abattu | 14/20 (70 %) | 15/25 (**60 %**) |
| Hydre abattue | 10/16 (63 %) | 12/18 (**67 %**) |
| Derby gagné | 25/49 (51 %) | 23/42 (**55 %**) |
| **sorts distincts réellement lancés** | **95 / 107** | **98 / 107** |
| lancers totaux | 6 055 | 5 296 |
| part des 5 sorts les plus joués | 30 % | 39 % |
| entropie normalisée des lancers | 0,839 | 0,780 |
| sorts jamais lancés de la saison | 12 | **9** |

Lecture : un héros frappe 5 % moins fort par passage (il emporte cinq sorts au lieu de onze ou treize), les issues
des quatre raids restent toutes dans leur bande, et **trois sorts qui n'étaient jamais joués le sont maintenant**
(`esquive`, `vol_bouclier`, `legs`, `hantise`, `assechement` entrent ; `rabattage` et `remanence` sortent). La
concentration monte (les cinq plus joués passent de 30 % à 39 % des lancers) : c'est le prix assumé d'une barre plus
courte, compensé par la ROTATION entre héros — 3,49 chargements distincts par héros-saison.

### 5. Recalibrage rendu nécessaire, et mesuré

Cinq emplacements retirent de la puissance aux raids et en donnent au Derby (dont la victoire se joue sur les tenues
de Bannière, pas sur la barre d'action). Les bornes de `season_t5_check` et `tactic_t3_check` ont été retrouvées par
la mesure, pas par l'élargissement des bandes (une exception, §7).

| réglage | avant | après | pourquoi |
|---|---|---|---|
| `raids.raid_forest.hp_base` | 380 | **280** | le Sylvain tombait sur 37 % des saisons (bande 40-85 %) et sur 27 % des graines en ≤ 3 jours (cible ≥ 40 %) ; à 280 : 53 % et 43 % |
| `raids.raid_forest.demand` | — (neuf) | `zones 4 · degats 3 · controler 3 · mobilite 3 · corps 2 · tenir 1 · soigner 1` | rétablit le BESOIN DE BRÛLEUR, qui s'était inversé (sans brûleur 12/20 contre 10/20 avec) ; à ce réglage : sans 9/20, avec 14/20, 25 points d'écart |
| `raids.<id>.demand_states` | — (neuf) | forêt et marais `brule` · montagne `marque` · gué `aveugle/etourdi/immobilise` | sans ce canal, la règle ne voyait pas les besoins MÉCANIQUES d'un raid : les écailles du Drake n'étaient plus jamais fissurées |
| `raids.raid_derby.banner_hold_win` | 3 | **4** | le Derby passait de 51 % à 77 % (bande 40-60 %) |
| `raids.raid_derby.banner_lost_max` | 3 | **2** | |
| `raids.raid_derby.steal_pa` | 2 | **1** | rend une victoire au gué à la population de `tactic_t3` sans repousser celle de `season_t5` au-dessus de 60 % |
| `raids.raid_derby.hp_base` | 260 | **200** | la victoire par les armes reste une vraie option quand il faut quatre tenues |
| `raids.raid_derby.rivals[].atk` | 22 / 14 / 20 | **26 / 18 / 24** | |

Résultat : Sylvain 53 %, Drake 60 %, Hydre 67 % (bande 40-85 %) · Derby 55 % sur `season_t5` (bande 40-60 %) et 39 %
sur `tactic_t3` (bande élargie, §7) · morts 15/164 = 9,1 % (plafond 10 %) · déterminisme intact.

### 6. Trois correctifs de politique, mesurés en chemin

* **Aucun filet de repli.** Un filet avait été écrit pour qu'un héros dont la routine de classe ne trouve aucun de
  ses sorts dans le chargement frappe quand même avec ce qu'il porte. Mesuré : +4 dégâts par passage et 3 points de
  passages non muets, mais **+2,2 points de MORTS sur la saison** (9,1 % → 11,3 % des héros) — un coup de plus, c'est
  une riposte de plus. Il a été **retiré**. Un héros qui n'a plus rien à faire termine son tour, comme avant T8 ;
  la garantie de dégâts de la règle et l'arme au bout de chaque routine suffisent (10 héros-saisons sur 111 à zéro
  dégât, tous des soigneurs ou des invocateurs).
* **Mur de glace (Mage)** : sa fenêtre était une lame de rasoir — tour 3 EXACTEMENT, aucun rejeton sur toute la
  grille, une seule case candidate. Mesuré : **1 pose en 30 raids avant T8, 0 après** le recalibrage. Elle devient
  « au dernier tour, s'il reste des PA et que le trait de feu est en relance », sur quatre cases candidates au sud du
  tronc. Même verbe, il arrive enfin à se dire.
* **Provocation (Guerrier)** : n'était ouverte qu'avec un corps invoqué sur la grille — or depuis R-B les corps ne
  survivent plus au passage de leur maître, et le Guerrier arrivait sur une grille vide (1 provocation en 30 raids
  avant T8, 0 après). Elle s'ouvre aussi au dernier tour quand la taillade est en relance : il laisse la haine du
  boss derrière lui au lieu d'un coup d'arme de plus.

### 7. Écarts assumés dans les bancs (documentés en tête de chaque banc)

| banc | avant | après | raison |
|---|---|---|---|
| `stats_t6_check (4c)/(4d)` | « au moins 10 pointes font plus que leur voie nue », « aucune sous 45 % » | « chaque pointe apporte deux sorts actifs déclarés » et « le vivier est cloisonné » | la contrainte est caduque à cinq emplacements ; la santé d'une pointe se mesure par sa FRÉQUENCE DE SÉLECTION (`loadout_t8_check (7a-7c)`) |
| `stats_t6_check (9)` R-C | `unitSpells` contient les deux barres de base | le **VIVIER** contient les deux barres, et le héros en emporte cinq | « tu as ACCÈS à la barre des deux classes » reste vrai mot pour mot ; ce qui change, c'est qu'on n'en emporte que cinq |
| `tactic_t3_check` bac à sable de branche | le sujet joue tout ce qu'il possède | le sujet reçoit explicitement son **vivier entier**, et le Sylvain y garde sa réserve d'avant T8 (380) | ce banc mesure la CONCEPTION des sorts, pas la règle de sélection ; laisser la règle décider ferait mesurer la règle, et un Sylvain abattu avant la fin du scénario le rend inatteignable pour les trois variantes à la fois (mesuré : Portier 15\*/15\*/15\*) |
| `tactic_t3_check (7b)` | bande 40-60 % | **bande 35-65 %** | seule bande élargie. La cible de conception ne bouge pas ; c'est la précision qui est écrite honnêtement : la population de `season_t5` mesure 55 %, celle-ci 39 % sur 38 derbys — à p = 0,5 et n = 38, deux écarts-types binomiaux valent ±16 points. La bande serrée reste gardée par `season_t5_check (9)`, sur son propre échantillon. |
| `tactic_t1_check (8c)` | l'ordre des passages se lit dans `state.raid` | il se lit aussi dans `raid_history[].passes_done` | un Sylvain recalibré peut tomber DANS LA JOURNÉE ; le raid est alors archivé et `state.raid` vaut null. `raid_history` conserve désormais `passes_done` (ajout additif). |
| `ui_v4_check` recherche du témoin « Atelier » | 60 graines | **250 graines** | le recalibrage a déplacé la fatigue d'un cheveu et le témoin est sorti des 60 premières graines (12 occasions de forge, préréglage au plus à 2 cases) ; sur 250 : 52 occasions, 21 préréglages, jusqu'à 3 cases. Le contrôle est le même. |

### 8. Interface

* **Écran « Mon héros », volet « Mes cinq sorts »** (`#fold-loadout`) : une ligne de cinq emplacements
  (`[data-testid="ld-slot-0..4"]`, nom + coût en PA + portée, bordure pleine si rempli), puis le VIVIER groupé par
  origine — **Première classe · Deuxième classe · Voie · Pointe** — chaque sort portant son **coût en points
  d'action, sa portée, sa forme et son verbe** (`[data-testid="pool-<id>"]`). Un tap remplit ou vide un emplacement.
* **Aucune règle calculée dans la page.** Le nombre d'emplacements, le vivier, les groupes, les coûts, les portées,
  les formes, les verbes et la raison d'un refus viennent tous de `VM.roster[].loadout`. À chaque tap la page
  soumet la liste à `validateAction('set_loadout')` et affiche la réponse du moteur — dans le volet
  (`[data-testid="loadout-why"]`) et en bandeau. Exemples mesurés : « il faut exactement 5 sorts emportés
  (4 reçus) », « « Prière de soin » n'est pas dans son vivier », « le même sort ne peut pas occuper deux
  emplacements (« Arme ») », « il faut au moins un sort qui inflige des dégâts parmi les 5 emportés ».
* **Écran Raid** : `raidSpells` lisait `classSpells(classe de base)` — ni le vivier, ni ce que le héros emporte.
  Il lit désormais `TACTIC.unitLoadout` : **la barre du raid ne montre plus que les cinq sorts emportés.**
* Quand le héros n'est pas à vous ou qu'il est sur la grille, le volet est en lecture seule avec la raison du moteur.

### 9. Bancs

Quinze bancs verts : `harness` 10/10 (moteur seul) et 19/19 · `engine_extra` 16/16 · `engine_v4` 28/28 ·
`tactic_t1` 26/26 · `tactic_t2` 14/14 · `tactic_t3` 14/14 · `season_t5` 12/12 · `stats_t6` 33/33 ·
**`loadout_t8` 12/12 (neuf)** · `ui_v2` 52/52 · `ui_v3` 36/36 · `ui_v4` 55/55 · `ui_v5` **55/55** (48 + bloc F) ·
`ui_chateau` 91/91 · `ui_soleil` 58/58.

`test/loadout_t8_check.mjs` : (1) cinq emplacements toujours, sur 5 346 héros-jours · (2) le vivier grandit 5 → 11 →
13 · (3) les 33 passifs ne prennent pas d'emplacement · (4) huit refus français et une acceptation · (5) 1 940
chargements par défaut, tous valides · (6a) le choix se garde huit jours, différent du défaut · (6b) refusé pendant
un passage, accepté le matin · (7a-c) fréquences dans leurs bornes · (8) diversité · (9) déterminisme sur 30 graines.

### 10. Ce qui reste imparfait

* **Neuf sorts sur 107 ne sont jamais LANCÉS** sur 60 saisons (`onction_zone`, `mur_boucliers`,
  `sacrifice_ordonne`, `silence`, `detourner`, `veille`, `rabattage`, `fils_solides`, `remanence`) — c'était douze
  avant T8. Ils sont bien CHOISIS (aucun n'est sous 23 % de sélection) : ce qui manque est la condition de politique
  par défaut qui les jouerait, pas le chargement. C'est un chantier de politique, pas de règle.
* **La concentration des lancers monte** (les cinq plus joués passent de 30 % à 39 %). C'est mécanique — la barre est
  plus courte — et compensé par la rotation entre héros, pas annulé.
* **Le Derby reste la mesure la plus bruyante du jeu** : deux populations de managers donnent 55 % et 39 % sur le
  même réglage. Une seule bande a dû être élargie ; un échantillon plus grand vaudrait mieux qu'une bande plus large.
* **Le joueur ne peut pas encore nommer ni enregistrer plusieurs chargements** (« celui du Drake », « celui du
  gué ») : un seul chargement à la fois, comme un équipement. La règle le permettrait.
* **Non vérifié** : l'effet des cinq emplacements sur une partie jouée à la main (tout est mesuré sous plans par
  défaut) ; ce que le joueur choisirait réellement, donc si la bande de fréquences tient aussi pour des gestes
  humains ; l'équilibre ressenti d'un raid où deux joueurs se répartiraient les rôles à la composition.
