---
styles: [flat-top-down, high-contrast-minimal, flat-geometric]
mood_keywords: [clair, lisible, minimal, fonctionnel, calme, contraste-eleve, affordance-first]
---

# Art Bible — chain_probe_v1 (v0.1, s2.5-artbible)

> Genre reel (autorite : s0-contrat) : `exploration_interaction`, cible **web/HTML**, 2D, DOM-only.
> Cette bible corrige une divergence de genre heritee du World Scan (voir `## heritage_worldscan`)
> et se decide sur une matiere-monde vide cote Story Bible (voir `## heritage_story_bible`).
> Objet de RUN 1 : un jeu **vivant et solvable**, pas *bon* (s0-contrat `intention`). L'identite
> visuelle est donc calibree sur la **lisibilite de l'affordance**, jamais sur la beaute.

## 1. IDENTITE VISUELLE

Style decide : **flat, geometrique, contraste eleve, vue de dessus (top-down)** — une identite
minimale et fonctionnelle ou la couleur et la silhouette portent le sens du jeu, pas la
decoration. C'est un choix d'art direction assume pour une mini-sonde web dont le critere est
« vivant et solvable » (s0-contrat `intention`, `criteres_succes`) : le joueur doit lire d'un
coup d'oeil ce qui est **explorable**, ce qui est **interactif**, et ce qui est **le but**.

Palette d'affordance (roles, pas decor) — chaque role du jeu porte UNE teinte distincte,
saturee, a fort contraste sur un fond neutre desature :
- **Fond / espace explorable** : neutre desature, clair (gris-bleu tres pale) — recule, ne
  capte jamais l'attention. Sert de scene, pas d'acteur.
- **Avatar joueur** : teinte primaire franche et unique (bleu vif) — jamais partagee avec un
  autre role, pour que « moi » soit toujours identifiable instantanement.
- **Objet interactif (mi-boucle)** : teinte secondaire chaude (ambre) — signale « tu peux
  agir ici ».
- **But / interaction terminale** : teinte d'accent maximale et reservee (vert-emeraude
  sature) — n'apparait que sur l'objet terminal, jamais ailleurs : le but est visuellement
  unique dans toute la scene.
- **Feedback d'etat** : blanc/flash bref a fort contraste — un changement d'etat produit une
  impulsion lumineuse visible (le critere « action -> changement d'etat visible » materialise).
- **Inerte / decor** : desature, faible contraste — visiblement « rien a faire ici ».

Mood : clair, calme, fonctionnel, contraste eleve. Pas d'ambiance narrative (aucune matiere
narrative disponible en amont, voir `## heritage_story_bible`) : l'ambiance est celle d'un
banc de test lisible, assume comme tel.

## 2. RATIONALE

**Pourquoi ce style, trace a la source.**

1. *Le genre reel impose la clarte top-down, pas une esthetique de roguelike a chaine.* Le
   charter (`s0-contrat` §2 `plateforme_cible` = web/HTML ; `provenance.genre` =
   `exploration_interaction`, FIXE par Pierre, non delegue) fixe un jeu d'exploration web 2D.
   Le World Scan heritte, lui, decrit un genre DIFFERENT (« chain-based roguelike/incremental »,
   voir `## heritage_worldscan`) : ses conventions visuelles specifiques (physique de chaine,
   prestige, permadeath) ne s'appliquent PAS ici et ne sont pas reprises. Ce que j'en herite
   est uniquement le **primitif d'attente joueur genre-neutre** : un feedback immediat et
   visible des la premiere interaction (adresses citees en `## heritage_worldscan`).

2. *« Vivant et solvable, pas bon » oriente vers l'affordance, pas la beaute.* s0-contrat
   `intention` et `criteres_succes` posent que RUN 1 ne mesure pas la qualite ludique. Une
   identite qui maximise la lisibilite de l'affordance sert directement le critere de
   solvabilite (un bot, comme un humain, doit pouvoir distinguer le but des objets inertes) —
   pre-mortem `s10a` (solvabilite obligatoire).

3. *La matiere-monde etant vide, aucune ambiance narrative n'est inventee.* La Story Bible rend
   7/8 sections NOT_GROUNDED (`## heritage_story_bible`) : pas de lieu, personnage, faction ou
   ton. J'assume donc une identite **abstraite/fonctionnelle** plutot que de fabriquer un
   univers — conforme au garde-fou « une bible honnete et minimale vaut mieux qu'une riche
   fabriquee ».

**Couverture (adossee a la donnee structuree, jamais a cette prose).** Les 7 entites visuelles
de la section 3 sont derivees des `criteres_demo` du charter (espace explorable affiche ; action
-> changement d'etat visible ; interaction terminale atteignable et visible) — chacune a sa
propre `asset_request` en `asset_requests.json`. La verification de couverture besoin<->requete
est faite par `check_artbible.mjs::checkCoverage`, pas par ce paragraphe.

**Fogs remontes a HumanGate (jamais un claim auto-certifie), voir aussi le fence
`design_questions` :**
- **F1 (divergence de genre amont)** : le World Scan a scanne le mauvais genre (deduit du nom
  de sonde « chain_probe_v1 » — ou « chain » = la chaine du pipeline `full_content`, pas une
  mecanique de jeu). Autorite du genre reel = s0-contrat (Pierre). A confirmer que la chaine
  aval doit ignorer le cadre roguelike-a-chaine.
- **F2 (boucle concrete non definie)** : le charter delegue la boucle concrete aux etapes aval
  (s0-contrat `reference_jeu` = aucune, boucle libre). Je ne connais donc pas encore l'objet
  terminal concret ni le jeu d'interactions exact — mes regles d'affordance lient la couleur/
  silhouette a des ROLES generiques, a specialiser quand le GM aura tranche la boucle.
- **F3 (conformite esthetique)** : `check_artbible.mjs` et `asset_request.mjs` comparent des
  TAGS, jamais des pixels — aucune de mes affirmations n'est un satisfecit visuel (jugement
  Pierre requis).

## 3. BESOINS VISUELS

Chaque entite visuelle distincte du jeu minimal `exploration_interaction`, derivee des
`criteres_demo` du charter (s0-contrat). Toutes `required:true` : dans une sonde minimale, il
n'y a pas de decor purement cosmetique — chaque entite sert la boucle vivante ou l'etat de fin
observable. En cas de doute, `required:true` (cout d'une requete en plus = nul).

```json
{
  "visual_requirements": [
    {
      "id": "vr_player_avatar",
      "entity_role": "player",
      "required": true,
      "description": "Avatar controle par le joueur, l'acteur unique de l'exploration. Teinte primaire reservee (bleu vif), silhouette lisible en vue de dessus. Source: s0-contrat criteres_demo 'au moins une action joueur (clic/DOM) -> changement d'etat visible' (le joueur est l'agent de l'action)."
    },
    {
      "id": "vr_explorable_space",
      "entity_role": "environment",
      "required": true,
      "description": "L'espace explorable unique (un seul espace, pas de niveaux multiples). Fond neutre desature qui recule. Source: s0-contrat criteres_demo 'au lancement, un espace explorable s'affiche (etat initial visible - pas d'ecran vide)' + perimetre V1 'un seul espace explorable'."
    },
    {
      "id": "vr_interactive_object",
      "entity_role": "item",
      "required": true,
      "description": "Objet interactif de mi-boucle : ce avec quoi le joueur interagit pour faire progresser l'etat. Teinte secondaire chaude (ambre) = 'agissable'. Source: s0-contrat perimetre V1 'un petit ensemble d'interactions' + criteres_demo 'action -> changement d'etat visible'."
    },
    {
      "id": "vr_terminal_goal",
      "entity_role": "item",
      "required": true,
      "description": "Objet/interaction TERMINALE, distinct de l'objet interactif ordinaire : declenche la condition de victoire unique et non ambigue. Teinte d'accent maximale reservee (vert-emeraude), visuellement unique dans la scene. Source: s0-contrat criteres_demo 'l'exploration permet d'atteindre l'interaction terminale, et son atteinte est visible' + charter 'une seule condition terminale, atteignable'."
    },
    {
      "id": "vr_interaction_feedback",
      "entity_role": "effect",
      "required": true,
      "description": "Effet de feedback visible sur changement d'etat (impulsion/flash bref, contraste eleve). Materialise le critere 'action -> changement d'etat VISIBLE'. Source: s0-contrat criteres_demo 'action joueur -> changement d'etat visible a l'ecran'."
    },
    {
      "id": "vr_hud_state",
      "entity_role": "ui",
      "required": true,
      "description": "HUD minimal d'etat (progression / lecture de l'etat courant). Doit rendre l'etat lisible sans encombrer la scene. Source: s0-contrat criteres_demo (etat initial visible, etat courant lisible) + N1 'window.__game expose, etat observable'."
    },
    {
      "id": "vr_end_state_screen",
      "entity_role": "ui",
      "required": true,
      "description": "Ecran / banniere d'etat de fin, non ambigu, distinct du HUD courant : rend l'atteinte de la condition terminale VISIBLE (fin de partie observable). Source: s0-contrat 'son atteinte est observable a l'ecran (etat de fin visible)' + criteres_demo 'etat de fin non ambigu'."
    }
  ]
}
```

## 4. HERITAGE ET DECISIONS

Les deux sections `heritage_*` citent leurs adresses sources reelles. Les cinq sections
suivantes sont DECIDEES par l'Art Director (aucune adresse heritee exigee), bornees par le
charter reel (s0-contrat).

## heritage_worldscan

Ce que le World Scan (`worldscan.json`, `advisory:true`) apporte reellement — et ce qu'il
n'apporte PAS.

**Divergence de genre (fait heritte, a ne pas propager en silence).** Le World Scan situe le
projet dans le genre « chain-based roguelike/incremental hybrid » et scanne trois jeux de CE
genre : `worldscan:games[0].game` (Chained), `worldscan:games[1].game` (Domino Idle),
`worldscan:games[2].game` (Slay the Spire). Or le genre reel FIXE par Pierre est
`exploration_interaction` (s0-contrat `provenance.genre`). Le World Scan a deduit son genre du
NOM de la sonde (« chain_probe_v1 »), ou « chain » designe la chaine du pipeline `full_content`,
pas une mecanique de jeu. **Consequence : les conventions visuelles specifiques du World Scan
(physique de chaine, prestige, permadeath, boss a phases) NE sont PAS heritees ici** — elles
appartiennent a un autre genre. Remonte en fog F1.

**Ce qui reste heritable (primitif genre-neutre d'attente joueur).** Les trois `minute_1`
scannes convergent sur un meme primitif independant du genre — un feedback immediat et visible
des la premiere interaction : `worldscan:games[0].loops.minute_1` (« collision chaine ->
degats directs. Recompense : Or immediat »), `worldscan:games[1].loops.minute_1` (« clique
domino #1 -> 2-3 dominos tombent... satisfaction visuelle »), `worldscan:games[2].loops.minute_1`
(« joue une carte -> synergie decouverte = dopamine »). J'herite ce primitif — et lui seul —
pour justifier le role visuel `vr_interaction_feedback` et la regle d'affordance « toute action
produit une impulsion visible ». La `worldscan:games[0].retention_answer` (« friction basse »)
soutient aussi le parti-pris de lisibilite immediate. `worldscan:advisory` = true : cet apport
est advisory, jamais un juge.

## heritage_story_bible

Ce que la Story Bible (`story_bible.json`) apporte : **presque rien, honnetement**. Elle rend
7 sections sur 8 NOT_GROUNDED faute de matiere-monde et de charter injecte
(`story_bible:inputs_recus.charter` = false).

- `story_bible:context` (seule section GROUNDED) : ancre uniquement l'ABSENCE d'un monde decrit
  plus un cadre de genre — « le seul fait de contexte reellement ancrable est donc l'ABSENCE
  d'un monde decrit dans les entrees ».
- `story_bible:characters` = NOT_GROUNDED (« aucun personnage propre a chain_probe_v1 n'est
  ancrable ») -> aucun etat de personnage narratif a decliner ; `## character_states` traite
  donc des ETATS FONCTIONNELS de l'avatar, pas d'une psychologie.
- `story_bible:factions` = NOT_GROUNDED, `story_bible:events` = NOT_GROUNDED,
  `story_bible:coherence_rules` = NOT_GROUNDED -> aucun lieu, faction, evenement ou regle de
  monde a traduire visuellement.

**Decision heritee de ce vide** : l'identite visuelle est **abstraite/fonctionnelle** et ne
fabrique aucun element narratif (garde-fou : ne jamais inventer un monde absent). Toute richesse
narrative future devra venir d'un charter/story-bible reellement alimente (fog F2).

## visual_language

DECIDE. Langage visuel = **la couleur encode le role, la silhouette encode la fonction, le
contraste encode l'interactivite**. Un fond neutre desature ; un role = une teinte reservee
(bleu = joueur, ambre = interactif, emeraude = but terminal, blanc-flash = feedback,
desature-faible-contraste = inerte). Aucune teinte n'est partagee entre deux roles. Formes
plates, geometriques, sans texture parasite : en vue de dessus, la lecture prime sur le detail.
Ancrage charter : cible web/HTML 2D DOM-only (s0-contrat `plateforme_cible`) -> primitives
visuelles simples, rendables en DOM/canvas sans dependance runtime (s0-contrat
`actions_interdites` : aucune dependance reseau/CDN au runtime).

## affordance_rules

DECIDE. Regles d'affordance (a specialiser quand la boucle concrete sera tranchee — fog F2) :
1. **Un seul but visible** : la teinte emeraude est RESERVEE a l'objet terminal (`vr_terminal_goal`)
   et n'apparait nulle part ailleurs — le but est unique dans toute la scene.
2. **Agissable = chaud + contraste** : tout objet avec lequel on peut interagir porte la teinte
   ambre saturee sur fond neutre ; l'inerte est desature et a faible contraste.
3. **Moi = bleu, toujours** : l'avatar joueur ne partage sa teinte primaire avec aucun autre
   role, pour rester identifiable a tout instant.
4. **Toute action -> impulsion visible** : chaque changement d'etat declenche un feedback
   `vr_interaction_feedback` (primitif heritee du World Scan, voir `## heritage_worldscan`).
5. **Etat de fin distinct de l'etat courant** : l'ecran de fin (`vr_end_state_screen`) est
   visuellement distinct du HUD (`vr_hud_state`) pour que l'atteinte du but soit non ambigue.

## character_states

DECIDE (fonctionnel, pas narratif — voir `## heritage_story_bible`). L'avatar joueur porte au
minimum trois etats visuels lisibles, tous exprimes par la variation de la teinte primaire, pas
par un changement de silhouette :
- **inactif / au repos** : teinte primaire pleine, statique.
- **en mouvement / exploration** : teinte primaire pleine + trainee/indice de direction leger.
- **en interaction** : bref surlignage (couple au feedback `vr_interaction_feedback`) au moment
  d'agir sur un objet.
Aucun etat de degat/mort narratif n'est defini : le charter ne pose pas de combat (genre
`exploration_interaction`), et rien en amont n'ancre une mecanique de vie/mort (fog F2 si la
boucle aval en introduit une).

## ui_readability

DECIDE. Le HUD (`vr_hud_state`) est minimal, en peripherie, a contraste eleve sur son propre
fond pour ne jamais se confondre avec la scene ni avec les objets agissables (aucune teinte de
role reutilisee dans l'UI). Taille de cible tactile/clic confortable (cible : joueur solo
navigateur sans competence pre-requise, s0-contrat `joueur cible`). L'etat de fin
(`vr_end_state_screen`) occupe le premier plan de facon non ambigue (overlay lisible), distinct
du HUD courant. Contraintes de lisibilite : contraste texte/fond eleve, roles distinguables sans
dependre uniquement de la teinte (forme + position en appui, pour robustesse daltonisme —
`check_artbible.mjs` ne mesure pas ceci : c'est une exigence decidee, verifiee humainement).

## world_constraints

DECIDE (borne par le charter reel). Contraintes de monde/production heritees de s0-contrat :
- **Cible web/HTML, 2D** (s0-contrat `plateforme_cible`) : format 2D, runtime html pour toutes
  les `asset_request`. Godot/natif = hors_scope (s0-contrat `hors_scope`).
- **DOM-only, page unique, aucune persistance, aucun reseau au runtime** (s0-contrat perimetre
  V1 + `actions_interdites`) : les assets doivent etre embarquables sans dependance runtime.
- **Determinisme, seed reproductible** (s0-contrat perimetre V1, N1) : aucune variation visuelle
  aleatoire non seedee.
- **Un seul espace explorable** (s0-contrat perimetre V1) : pas de tileset multi-niveaux.
- **Note de tension chaine** : le pipeline hote a pu etre concu « full_godot_content », mais le
  charter reel de CE run fixe web/HTML. En cas de conflit, l'autorite est s0-contrat (Pierre) ;
  remonte comme point de coherence a HumanGate (lie a F1).

## asset_rules

DECIDE. Regles d'asset pour ce run :
- **Un seul tag de style de resolution** : `flat-top-down` (present au catalogue en 2D/html,
  CC0) est le style declare pour chaque `asset_request`, pour une identite coherente ; les tags
  `high-contrast-minimal` / `flat-geometric` du frontmatter sont des descripteurs d'intention,
  non des tags de resolution catalogue.
- **Pas de filtre de genre a la resolution** : `constraints.genre = []` — le genre reel
  `exploration_interaction` n'est pas un tag de genre du catalogue ; filtrer dessus forcerait un
  BLOCKED artificiel. Decision assumee (regle des 3 etats : `[]` = decision, pas oubli).
- **Licences** : `license_allowed = null` -> allowlist par defaut du studio (CC0-1.0, MIT,
  CC-BY-4.0, CC-BY-3.0).
- **Une requete par entite distincte** : jamais une requete generique pour couvrir plusieurs
  entites (garde-fou anti « deceptive builder »). 7 entites `required:true` -> 7 requetes.
- **Aucune generation ni telechargement d'asset** : resolution mecanique dans l'existant du
  catalogue uniquement ; toute ingestion nouvelle reste une gate Pierre (hors_perimetre de cette
  etape). Un `resolution_stats.blocked` eventuel est un fait legitime (catalogue incomplet), pas
  une erreur a masquer.
