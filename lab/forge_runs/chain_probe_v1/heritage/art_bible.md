---
styles: [flat-top-down, high-contrast-minimal, flat-geometric]
mood_keywords: [clair, lisible, minimal, fonctionnel, calme, contraste-eleve, affordance-first]
---

# Art Bible — chain_probe_v1 (v0.2, s2.5-artbible-r2)

> Genre reel (autorite : s0-contrat) : `exploration_interaction`, cible **web/HTML**, 2D, DOM-only.
> **Passe r2 (boucle de completion mutuelle Art <-> GM).** La v0.1 fixait une identite de ROLES
> generiques faute de boucle concrete (fog F2). Le Game Master a depuis materialise la boucle
> (s2.7-gm-worldscan) : 4 boucles reelles, 8 grey_blocks, 7 artist_requirements, et a CONFIRME le
> genre `exploration_interaction`. Cette v0.2 SPECIALISE l'identite sur ces entites concretes et
> ferme F2 ; F1 (divergence de genre amont) est confirmee cote GM ; F3 (conformite esthetique)
> reste un fog HumanGate permanent, hors autorite de tout oracle.
> Objet de RUN 1 : un jeu **vivant et solvable**, pas *bon* (s0-contrat `intention`). L'identite
> visuelle reste calibree sur la **lisibilite de l'affordance**, jamais sur la beaute.

## 1. IDENTITE VISUELLE

Style decide : **flat, geometrique, contraste eleve, vue de dessus (top-down)** — une identite
minimale et fonctionnelle ou la couleur et la silhouette portent le sens du jeu, pas la
decoration. C'est un choix d'art direction assume pour une mini-sonde web dont le critere est
« vivant et solvable » (s0-contrat `intention`, `criteres_succes`) : le joueur doit lire d'un
coup d'oeil ce qui est **explorable**, ce qui est **interactif**, et ce qui est **le but**.

Palette d'affordance — chaque role porte UNE teinte reservee, saturee, a fort contraste sur un
fond neutre desature. En r2, chaque teinte est desormais liee a une entite CONCRETE de la boucle
du GM (grey_blocks) et a ses etats reels :
- **Fond / espace explorable** (`gb_explorable_space`, LOCATION) : neutre desature, clair
  (gris-bleu tres pale) — recule, ne capte jamais l'attention. Sert de scene, pas d'acteur.
- **Avatar joueur** (`gb_player_avatar`, ACTOR, etat PLACED) : teinte primaire franche et unique
  (bleu vif) — jamais partagee avec un autre role, pour que « moi » soit toujours identifiable.
- **Objet interactif de mi-boucle** (`gb_interactive_object`, ITEM, etats AVAILABLE -> CONSUMED) :
  teinte secondaire chaude (ambre) — signale « tu peux agir ici » ; passe visiblement a l'etat
  consomme au clic.
- **But / interaction terminale** (`gb_terminal_goal`, ITEM/PROGRESSION_GATE, etats LOCKED ->
  AVAILABLE) : teinte d'accent maximale reservee (vert-emeraude sature) — n'apparait QUE sur
  l'objet terminal, unique dans toute la scene ; l'etat LOCKED montre POURQUOI (raison visible)
  et un apercu (preview) de ce qui attend.
- **Feedback d'etat** (`gb_interaction_feedback`, UI/FEEDBACK) : blanc/flash bref a fort
  contraste — un changement d'etat produit une impulsion lumineuse visible (le critere « action
  -> changement d'etat visible » materialise), sans masquer la scene.
- **HUD d'etat courant** (`gb_hud_state`, UI/FEEDBACK) : peripherique, sur son propre fond, sans
  reutiliser aucune teinte de role.
- **Ecran de fin** (`gb_end_state_screen`, UI/REWARD, etats LOCKED -> AVAILABLE) : overlay de
  premier plan, distinct du HUD, qui rend l'atteinte du but non ambigue.
- **Inerte / decor** : desature, faible contraste — visiblement « rien a faire ici », jamais
  confondable avec l'ambre agissable.

Mood : clair, calme, fonctionnel, contraste eleve. Pas d'ambiance narrative (aucune matiere
narrative disponible en amont, voir `## heritage_story_bible`) : l'ambiance est celle d'un
banc de test lisible, assume comme tel.

## 2. RATIONALE

**Pourquoi ce style, trace a la source.**

1. *Le genre reel impose la clarte top-down, pas une esthetique de roguelike a chaine.* Le
   charter (`s0-contrat` `plateforme_cible` = web/HTML ; `provenance.genre` =
   `exploration_interaction`, FIXE par Pierre, non delegue) fixe un jeu d'exploration web 2D.
   Le World Scan herite, lui, decrit un genre DIFFERENT (« chain-based roguelike/incremental »,
   voir `## heritage_worldscan`) : ses conventions specifiques (physique de chaine, prestige,
   permadeath) ne s'appliquent PAS ici. **En r2, le GM a leve l'ambiguite** : son bloc de genre
   pose `genre = exploration_interaction` et son `world_interpretation` premiere entree confirme
   que le cadre roguelike-a-chaine est une divergence a ne pas propager (cite en reponse a
   q_art_002). ART et GM partagent donc desormais le meme genre — c'etait la condition de mon
   travail commun. Ce que j'herite du World Scan est uniquement le **primitif genre-neutre** :
   un feedback immediat et visible des la premiere interaction (adresses en `## heritage_worldscan`).

2. *« Vivant et solvable, pas bon » oriente vers l'affordance, pas la beaute.* s0-contrat
   `intention` et `criteres_succes` posent que RUN 1 ne mesure pas la qualite ludique. Une
   identite qui maximise la lisibilite de l'affordance sert directement le critere de
   solvabilite (un bot, comme un humain, doit distinguer le but des objets inertes) — pre-mortem
   `s10a` (solvabilite obligatoire), repris par le GM en invariant `terminal_reachable`.

3. *La boucle concrete est desormais connue : l'identite est SPECIALISEE, plus generique.* Ma
   v0.1 liait la couleur/silhouette a des ROLES generiques faute de boucle (fog F2). Le GM a
   materialise 8 grey_blocks et 7 artist_requirements avec leurs ETATS reels (LOCKED/AVAILABLE/
   CONSUMED/PLACED). J'ai donc specialise `## affordance_rules`, `## character_states`,
   `## ui_readability` et `## visual_language` sur ces entites concretes (adresses `gm_worldscan:
   grey_blocks.<id>` / `gm_worldscan:artist_requirements.<id>` citees dans ces sections). **F2 est
   ferme.**

4. *La matiere-monde restant vide, aucune ambiance narrative n'est inventee.* La Story Bible rend
   7/8 sections NOT_GROUNDED (`## heritage_story_bible`). J'assume une identite **abstraite/
   fonctionnelle** plutot que de fabriquer un univers — garde-fou « une bible honnete et minimale
   vaut mieux qu'une riche fabriquee ».

**Couverture (adossee a la donnee structuree, jamais a cette prose).** Les 7 entites visuelles de
la section 3 correspondent 1:1 aux 7 `artist_requirements` du GM (memes entites que ses
grey_blocks) — chacune a sa propre `asset_request` en `asset_requests.json`. La verification de
couverture besoin<->requete est faite par `check_artbible.mjs::checkCoverage`, pas par ce
paragraphe.

**Fogs remontes a HumanGate (jamais un claim auto-certifie), voir aussi le fence
`design_questions` :**
- **F1 (divergence de genre amont) — confirmee, non fermee.** Le World Scan a scanne le mauvais
  genre (« chain » = la chaine du pipeline `full_content`, pas une mecanique de jeu). Autorite du
  genre reel = s0-contrat (Pierre). Le GM a re-ancre la mesure sur des jeux reels du bon genre
  (Samorost 1, Machinarium). A confirmer par HumanGate que la chaine aval doit ignorer le cadre
  roguelike-a-chaine.
- **F2 (boucle concrete non definie) — FERMEE en r2.** Le GM a tranche la boucle ; j'ai specialise
  l'identite dessus (voir point 3 et les sections DECIDEES).
- **F3 (conformite esthetique) — fog permanent.** `check_artbible.mjs` et `asset_request.mjs`
  comparent des TAGS, jamais des pixels — aucune de mes affirmations n'est un satisfecit visuel
  (jugement Pierre requis). `ready_for_freeze` cote ART = design COMPLET et coherent, jamais un
  verdict d'esthetique.

## 3. BESOINS VISUELS

Chaque entite visuelle distincte de la boucle materialisee par le GM (grey_blocks /
artist_requirements). Toutes `required:true` : dans cette sonde minimale, aucune entite n'est du
decor purement cosmetique — chacune sert une boucle vivante ou l'etat de fin observable. En cas
de doute, `required:true` (cout d'une requete en plus = nul). Les `description` citent l'ancre GM
et les etats a rendre.

```json
{
  "visual_requirements": [
    {
      "id": "vr_player_avatar",
      "entity_role": "player",
      "required": true,
      "description": "Avatar controle par le joueur, acteur unique de l'exploration. Teinte primaire reservee (bleu vif), silhouette lisible en vue de dessus, etats fonctionnels repos/mouvement/interaction. Ancre GM: gm_worldscan:grey_blocks.gb_player_avatar (ACTOR, etat PLACED) + gm_worldscan:artist_requirements.ar_player_avatar. Source charter: s0-contrat criteres_demo 'au moins une action joueur (clic/DOM) -> changement d'etat visible'."
    },
    {
      "id": "vr_explorable_space",
      "entity_role": "environment",
      "required": true,
      "description": "Espace explorable unique (un seul espace, pas de niveaux multiples). Fond neutre desature qui recule, avatar place a l'etat initial (jamais un ecran vide). Ancre GM: gm_worldscan:grey_blocks.gb_explorable_space (LOCATION, AVAILABLE) + gm_worldscan:artist_requirements.ar_explorable_space. Source charter: s0-contrat criteres_demo 'au lancement, un espace explorable s'affiche' + perimetre V1 'un seul espace explorable'."
    },
    {
      "id": "vr_interactive_object",
      "entity_role": "item",
      "required": true,
      "description": "Objet interactif de mi-boucle : ce que le joueur active pour faire progresser l'etat. Teinte chaude (ambre) = 'agissable' ; passe de AVAILABLE a CONSUMED au clic, distinct de l'inerte. Le contenu porte 2 a 8 TYPES distincts (calibration build, non invente ici). Ancre GM: gm_worldscan:grey_blocks.gb_interactive_object (ITEM, AVAILABLE) + gm_worldscan:artist_requirements.ar_interactive_object + gm_worldscan:loops.content_loop. Source charter: s0-contrat perimetre V1 'un petit ensemble d'interactions'."
    },
    {
      "id": "vr_terminal_goal",
      "entity_role": "item",
      "required": true,
      "description": "Objet/interaction TERMINALE, distinct de l'objet ordinaire : declenche la condition de victoire unique. Teinte emeraude reservee, unique dans la scene ; etat LOCKED (raison du verrou visible + apercu) -> AVAILABLE quand le gate ouvre. Ancre GM: gm_worldscan:grey_blocks.gb_terminal_goal (ITEM/PROGRESSION_GATE, LOCKED, requires gb_interactive_object) + gm_worldscan:artist_requirements.ar_terminal_goal + gm_worldscan:loops.progression_loop. Source charter: s0-contrat criteres_demo 'l'exploration permet d'atteindre l'interaction terminale, et son atteinte est visible'."
    },
    {
      "id": "vr_interaction_feedback",
      "entity_role": "effect",
      "required": true,
      "description": "Effet de feedback visible sur changement d'etat (impulsion/flash bref, fort contraste), perceptible sans masquer la scene. Materialise 'action -> changement d'etat VISIBLE'. Ancre GM: gm_worldscan:grey_blocks.gb_interaction_feedback (UI/FEEDBACK) + gm_worldscan:artist_requirements.ar_interaction_feedback + gm_worldscan:loops.core_loop. Source charter: s0-contrat criteres_demo 'action joueur -> changement d'etat visible a l'ecran'."
    },
    {
      "id": "vr_hud_state",
      "entity_role": "ui",
      "required": true,
      "description": "HUD minimal d'etat courant (progression), peripherique, contraste eleve, aucune teinte de role reutilisee ; window.__game observable (N1). Ancre GM: gm_worldscan:grey_blocks.gb_hud_state (UI/FEEDBACK) + gm_worldscan:artist_requirements.ar_hud_state. Source charter: s0-contrat criteres_demo (etat courant lisible) + N1 'window.__game expose, etat observable'."
    },
    {
      "id": "vr_end_state_screen",
      "entity_role": "ui",
      "required": true,
      "description": "Ecran/banniere d'etat de fin, non ambigu, distinct du HUD courant : overlay de premier plan qui rend l'atteinte de la condition terminale VISIBLE (etats LOCKED -> AVAILABLE). Ancre GM: gm_worldscan:grey_blocks.gb_end_state_screen (UI/REWARD, LOCKED, requires gb_terminal_goal) + gm_worldscan:artist_requirements.ar_end_state_screen. Source charter: s0-contrat 'son atteinte est observable a l'ecran (etat de fin visible)'."
    }
  ]
}
```

## 4. HERITAGE ET DECISIONS

Les deux sections `heritage_*` citent leurs adresses sources reelles (World Scan, Story Bible).
Les cinq sections suivantes sont DECIDEES par l'Art Director (aucune adresse heritee exigee),
bornees par le charter reel (s0-contrat) et, en r2, SPECIALISEES sur la boucle materialisee par le
GM (adresses `gm_worldscan:…` citees a titre de consommation aval — le GM est un pair de la boucle
de completion, pas une source d'heritage amont).

## heritage_worldscan

Ce que le World Scan (`worldscan.json`, `advisory:true`) apporte reellement — et ce qu'il
n'apporte PAS.

**Divergence de genre (fait herite, a ne pas propager en silence).** Le World Scan situe le
projet dans le genre « chain-based roguelike/incremental hybrid » et scanne trois jeux de CE
genre : `worldscan:games[0].game` (Chained), `worldscan:games[1].game` (Domino Idle),
`worldscan:games[2].game` (Slay the Spire). Or le genre reel FIXE par Pierre est
`exploration_interaction` (s0-contrat `provenance.genre`). Le World Scan a deduit son genre du
NOM de la sonde (« chain_probe_v1 »), ou « chain » designe la chaine du pipeline `full_content`,
pas une mecanique de jeu. **Consequence : les conventions visuelles specifiques du World Scan
(physique de chaine, prestige, permadeath, boss a phases) NE sont PAS heritees ici.** Remonte en
fog F1 ; confirme cote GM en r2 (`gm_worldscan:world_interpretation.0`).

**Ce qui reste heritable (primitif genre-neutre d'attente joueur).** Les trois `minute_1` scannes
convergent sur un meme primitif independant du genre — un feedback immediat et visible des la
premiere interaction : `worldscan:games[0].loops.minute_1` (« collision chaine -> degats directs.
Recompense : Or immediat »), `worldscan:games[1].loops.minute_1` (« clique domino #1 -> 2-3
dominos tombent... satisfaction visuelle »), `worldscan:games[2].loops.minute_1` (« joue une
carte -> synergie decouverte = dopamine »). J'herite ce primitif — et lui seul — pour justifier le
role visuel `vr_interaction_feedback` et la regle « toute action produit une impulsion visible ».
La `worldscan:games[0].retention_answer` (« friction basse ») soutient aussi le parti-pris de
lisibilite immediate. `worldscan:advisory` = true : cet apport est advisory, jamais un juge.

## heritage_story_bible

Ce que la Story Bible (`story_bible.json`) apporte : **presque rien, honnetement**. Elle rend
7 sections sur 8 NOT_GROUNDED faute de matiere-monde et de charter injecte
(`story_bible:inputs_recus.charter` = false).

- `story_bible:context` (seule section GROUNDED) : ancre uniquement l'ABSENCE d'un monde decrit
  plus un cadre de genre — « le seul fait de contexte reellement ancrable est donc l'ABSENCE d'un
  monde decrit dans les entrees ».
- `story_bible:characters` = NOT_GROUNDED (« aucun personnage propre a chain_probe_v1 n'est
  ancrable ») -> aucun etat de personnage narratif a decliner ; `## character_states` traite donc
  des ETATS FONCTIONNELS de l'avatar, pas d'une psychologie.
- `story_bible:factions` = NOT_GROUNDED, `story_bible:events` = NOT_GROUNDED,
  `story_bible:coherence_rules` = NOT_GROUNDED -> aucun lieu, faction, evenement ou regle de monde
  a traduire visuellement.

**Decision heritee de ce vide** : l'identite visuelle est **abstraite/fonctionnelle** et ne
fabrique aucun element narratif (garde-fou : ne jamais inventer un monde absent). Toute richesse
narrative future devra venir d'un charter/story-bible reellement alimente.

## visual_language

DECIDE. Langage visuel = **la couleur encode le role, la silhouette encode la fonction, le
contraste encode l'interactivite**. Un fond neutre desature ; un role = une teinte reservee (bleu
= joueur, ambre = interactif, emeraude = but terminal, blanc-flash = feedback, desature-faible-
contraste = inerte). Aucune teinte n'est partagee entre deux roles — cette regle correspond au
fait GM `gm_worldscan:world_interpretation.2` (« la couleur encode le ROLE, la silhouette la
FONCTION, le contraste l'INTERACTIVITE »), que le GM a repris de ma v0.1 : ART et GM partagent
donc ce langage. Formes plates, geometriques, sans texture parasite : en vue de dessus, la lecture
prime sur le detail. **Specialisation r2 — la silhouette distingue les FONCTIONS** : l'avatar
(rond/agent mobile), l'objet agissable (forme compacte saillante), le terminal (forme distincte,
jamais reutilisee ailleurs), l'inerte (forme neutre sans saillance). Ancrage charter : cible
web/HTML 2D DOM-only (s0-contrat `plateforme_cible`) -> primitives visuelles simples, rendables en
DOM/canvas sans dependance runtime (s0-contrat `actions_interdites` : aucune dependance
reseau/CDN au runtime).

## affordance_rules

DECIDE, SPECIALISE en r2 sur les grey_blocks/artist_requirements du GM (F2 ferme) :
1. **Un seul but visible** : la teinte emeraude est RESERVEE a l'objet terminal
   (`gm_worldscan:grey_blocks.gb_terminal_goal`, `vr_terminal_goal`) et n'apparait nulle part
   ailleurs. Etat LOCKED : la RAISON du verrou est visible + un apercu (preview) de la cible
   (`gm_worldscan:artist_requirements.ar_terminal_goal` : visible_reason=true, preview=true) ;
   etat AVAILABLE quand `gb_interactive_object` requis est consomme.
2. **Agissable = chaud + contraste, avec transition d'etat** : tout objet interactif porte l'ambre
   saturee sur fond neutre et passe visiblement de AVAILABLE a CONSUMED au clic
   (`gm_worldscan:artist_requirements.ar_interactive_object` : states_to_show AVAILABLE/CONSUMED) ;
   l'inerte (desature, faible contraste) ne doit JAMAIS etre confondu avec l'agissable.
3. **Moi = bleu, toujours** : l'avatar (`gm_worldscan:grey_blocks.gb_player_avatar`) ne partage sa
   teinte primaire avec aucun autre role, pour rester identifiable a tout instant.
4. **Toute action -> impulsion visible** : chaque changement d'etat declenche le feedback
   `gm_worldscan:grey_blocks.gb_interaction_feedback` (`vr_interaction_feedback`), primitif herite
   du World Scan (voir `## heritage_worldscan`) et pose par le GM en step `core_feedback` de
   `gm_worldscan:loops.core_loop`. Le flash est bref et ne masque ni la scene ni les objets.
5. **Etat de fin distinct de l'etat courant** : l'ecran de fin
   (`gm_worldscan:grey_blocks.gb_end_state_screen`, `vr_end_state_screen`) est un overlay de
   premier plan visuellement distinct du HUD (`gb_hud_state`, `vr_hud_state`), pour que l'atteinte
   du but soit non ambigue.

## character_states

DECIDE (fonctionnel, pas narratif — voir `## heritage_story_bible`). L'avatar joueur
(`gm_worldscan:grey_blocks.gb_player_avatar`, etat de base PLACED) porte au minimum trois etats
visuels lisibles, tous exprimes par la variation de la teinte primaire, pas par un changement de
silhouette (aligne sur `gm_worldscan:artist_requirements.ar_player_avatar` : « identifiable a tout
instant comme moi ») :
- **inactif / au repos** (PLACED) : teinte primaire pleine, statique.
- **en mouvement / exploration** : teinte primaire pleine + trainee/indice de direction leger
  (supporte la boucle `gm_worldscan:loops.gameplay_loop`, deplacement au clic).
- **en interaction** : bref surlignage, couple au feedback `vr_interaction_feedback`, au moment
  d'agir sur un objet (step `core_action` de `gm_worldscan:loops.core_loop`).
Aucun etat de degat/mort narratif n'est defini : le genre `exploration_interaction` ne pose pas de
combat, et le GM confirme l'absence de dimension combat (`gm_worldscan:dimensions.combat` =
NOT_MEASURED, structurellement absente du genre). Aucune mecanique de vie/mort en amont.

## ui_readability

DECIDE, SPECIALISE en r2. Le HUD (`gm_worldscan:grey_blocks.gb_hud_state`, `vr_hud_state`) est
minimal, en peripherie, a contraste eleve sur son propre fond pour ne jamais se confondre avec la
scene ni avec les objets agissables — AUCUNE teinte de role reutilisee dans l'UI
(`gm_worldscan:artist_requirements.ar_hud_state` : « aucune teinte de role reutilisee »). Taille de
cible tactile/clic confortable (cible : joueur solo navigateur sans competence pre-requise,
s0-contrat `joueur cible`). L'etat de fin (`gm_worldscan:grey_blocks.gb_end_state_screen`,
`vr_end_state_screen`) occupe le premier plan de facon non ambigue (overlay lisible), distinct du
HUD courant, et n'apparait qu'a l'atteinte du terminal (etat LOCKED -> AVAILABLE). Contraintes de
lisibilite : contraste texte/fond eleve, roles distinguables sans dependre UNIQUEMENT de la teinte
(forme + position en appui, pour robustesse daltonisme — `check_artbible.mjs` ne mesure pas ceci :
exigence decidee, verifiee humainement).

## world_constraints

DECIDE (borne par le charter reel). Contraintes de monde/production heritees de s0-contrat, toutes
confirmees coherentes avec la boucle du GM en r2 :
- **Cible web/HTML, 2D** (s0-contrat `plateforme_cible`) : format 2D, runtime html pour toutes les
  `asset_request`. Godot/natif = hors_scope (s0-contrat `hors_scope`).
- **DOM-only, page unique, aucune persistance, aucun reseau au runtime** (s0-contrat perimetre V1
  + `actions_interdites`) : les assets doivent etre embarquables sans dependance runtime.
- **Determinisme, seed reproductible** (s0-contrat perimetre V1, N1) : aucune variation visuelle
  aleatoire non seedee ; coherent avec `gm_worldscan:dimensions.rng` = NOT_MEASURED (genre
  deterministe, hand-authored).
- **Un seul espace explorable** (s0-contrat perimetre V1) : pas de tileset multi-niveaux ; coherent
  avec `gm_worldscan:grey_blocks.gb_explorable_space` (espace unique navigable).
- **Note de tension chaine** : le pipeline hote a pu etre concu « full_godot_content », mais le
  charter reel de CE run fixe web/HTML. En cas de conflit, l'autorite est s0-contrat (Pierre) ;
  remonte comme point de coherence a HumanGate (lie a F1).

## asset_rules

DECIDE. Regles d'asset pour ce run :
- **Un seul tag de style de resolution** : `flat-top-down` (present au catalogue en 2D/html, CC0)
  est le style declare pour chaque `asset_request`, pour une identite coherente ; les tags
  `high-contrast-minimal` / `flat-geometric` du frontmatter sont des descripteurs d'intention, non
  des tags de resolution catalogue.
- **Pas de filtre de genre a la resolution** : `constraints.genre = []` — le genre reel
  `exploration_interaction` n'est pas un tag de genre du catalogue ; filtrer dessus forcerait un
  BLOCKED artificiel. Decision assumee (regle des 3 etats : `[]` = decision, pas oubli).
- **Licences** : `license_allowed = null` -> allowlist par defaut du studio (CC0-1.0, MIT,
  CC-BY-4.0, CC-BY-3.0).
- **Une requete par entite distincte** : jamais une requete generique pour couvrir plusieurs
  entites (garde-fou anti « deceptive builder »). 7 entites `required:true` -> 7 requetes, en
  correspondance 1:1 avec les 7 `gm_worldscan:artist_requirements`.
- **Bande de contenu 2-8 types interactifs** : `gm_worldscan:progression_metrics` pose
  `distinct_interactables` dans [2,8], « valeur exacte a calibrer, jamais un point invente ». La
  requete `req_interactive_object` (entity_role item) couvre le TYPE d'objet interactif ; la
  differenciation de silhouette PAR sous-type distinct est une specialisation de production aval
  (build/decompo), pas une invention a poser ici — le GM a deja fixe la regle de lisibilite
  (`ar_interactive_object` : l'inerte ne doit jamais etre confondu avec l'agissable).
- **Aucune generation ni telechargement d'asset** : resolution mecanique dans l'existant du
  catalogue uniquement ; toute ingestion nouvelle reste une gate Pierre (hors_perimetre de cette
  etape). Un `resolution_stats.blocked` eventuel est un fait legitime (catalogue incomplet), pas
  une erreur a masquer.
