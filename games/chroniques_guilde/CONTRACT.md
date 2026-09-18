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
  jamais d'avance automatique). Le dernier `raid_pass` reçu pour un héros gagne. Un passage humain est rejoué **à son tour** dans
  l'ordre des managers (id ASCII) ; s'il devient illégal parce que la grille a changé, il est interrompu là (notice « passage de X
  interrompu : … »), la riposte a lieu, jamais d'exception. Pas de `seq` : un passage est atomique dans la journée.
- Ordre du jour : … 7 expédition · 7b menace (auto-combat V4 : mont, marais, ou repli forêt) · **7b' raid** (passages du jour) · 7c solo
  · … · 11 soir · **11' nuit du raid** · 11b âge · 11c réveil + présage (**startRaid** le soir du présage : la grille est dressée pour le
  lendemain, `day_start` = jour d'attaque) · 12 derby · 13 bilan.
- Réveil du Sylvain (V4) → raid ; retour après échec (ravage) à J+3 → nouveau raid au présage. Repli V4 : si aucun héros n'est déclaré
  `raid` le premier jour, `state.raid = null` et la menace se résout en auto-combat V4 (ligne « raid_fallback »).
- Passages : managers triés par id ASCII, héros par id ; sans `raid_pass` → `raidDefaults`. KO : `injure(sévérité 1)`, fatigue +15,
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
