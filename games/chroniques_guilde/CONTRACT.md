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
