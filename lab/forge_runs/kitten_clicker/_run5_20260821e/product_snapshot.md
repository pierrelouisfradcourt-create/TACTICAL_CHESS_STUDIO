I have the complete resolver and schema semantics. Key facts confirmed:

- **`validateChaine`**: `observation`/`claim`/`enonce` must all be non-empty **and normalized-distinct**.
- **`validateProvenance`**: `source ∈ {EXPECTED,ADDITIONS}`; `source_role` non-empty; EXPECTED → `reference` non-empty; ADDITIONS → `reference` present and **exactly `null`**.
- **`check_prisme_manifest`** FAILs only on bad chain/provenance/id or **zero actionable** exigences. Worldscan anchoring and story_bible/gm_worldscan anchoring are **classified, not FAIL** (confirmed line 144 + pré-mortem `515ca55`).
- **`canonicalize`** resolves `worldscan:<jsonpath>` (non-null nodes only), `story_bible:<sectionId>`, `gm_worldscan:<dimId>`.
- **`check_prisme.mjs`**: 4 numbered headers, ≥40 chars each, ≥1 `- **Rn`, no placeholders — a `## 5.` heading cleanly terminates section 4.

Here is my delivery. Everything below (except the terminal `json` block and the final `RETURN_REASON` line) **is** `product_snapshot.md`.

---

Kitten Clicker est un petit clicker de chatons mignons pour Godot 4.6.3 desktop. Le joueur nourrit une colonie en cliquant sur un coussin central qui produit des ronrons ; la colonie grandit, se peuple de chatons nommés, débloque un second lieu, et se relance par prestige. Ce document décrit le produit **fini tel que le joueur le vit** — pas le chemin pour le construire.

## 1. CE QUE LE JOUEUR VOIT

Au démarrage : la scène du **refuge de départ**, chaude et douce, sans surcharge d'interface. Au centre de l'écran, un **objet cliquable** (pelote / coussin) qui appelle le clic. En haut, un **compteur de ronrons** grand et toujours visible, qui monte en direct, et juste sous lui un **taux de production (ronrons/sec)** qui agrège toutes les sources. Au fil du jeu, des **chatons nommés** peuplent le refuge sous forme de sprites distincts, chacun avec son nom affiché et une **apparence visuellement différente selon sa rareté** (couleur / cadre / taille) reconnaissable au premier coup d'œil. Un **panneau de boutique** liste les chatons et améliorations avec leurs prix qui montent à chaque achat. Un **panneau de quêtes** montre au moins trois objectifs et leur état. Des **objets** décorent et habitent la scène. À chaque clic, une **réaction visible** se produit sur l'objet central. Une fois le seuil atteint, l'écran de **prestige** apparaît, et après prestige un **second lieu** s'ouvre. Les très grands nombres s'affichent en notation abrégée (12.3K, 4.5M) plutôt qu'en chiffres bruts illisibles.

## 2. CE QUE LE JOUEUR FAIT

Il **clique** sur l'objet central pour gagner des ronrons, geste primaire toujours disponible. Il **achète des chatons** : chaque achat fait apparaître un nouveau chaton visible qui se met à produire tout seul. Il **achète des améliorations** qui font monter le taux de production, valeur qu'il voit changer à l'écran. Il **laisse tourner la production automatique** pendant qu'il ne clique pas, et revient voir les ronrons accumulés. Il **franchit des paliers** de progression. Il **accomplit de petites quêtes** dont les objectifs sont lisibles à l'écran. Il **débloque le second lieu** par la méta-progression. Quand il a assez avancé, il **déclenche le prestige** : il remet sa progression à zéro en échange d'un multiplicateur permanent, et repart plus fort. Aucune de ces actions ne peut le faire perdre — il n'y a pas d'état de défaite.

## 3. CE QUE LE JOUEUR RESSENT

Une **récompense immédiate** à chaque clic : le compteur bouge dans la même fraction de seconde, et l'objet réagit — la dopamine du compteur qui monte. Un sentiment de **puissance croissante** à mesure que les nombres grossissent et que le taux/sec s'emballe. Un calme **cosy et sans échec** : le refuge est mignon, bienveillant, sans violence ni menace, on ne peut que progresser. Une **envie de collection** : chaque rareté de chaton tire vers « les avoir tous », et le rare qu'on n'a pas encore appelle à continuer. Au prestige, un **second souffle** — le plaisir de tout relancer en sachant qu'on ira plus vite et plus loin qu'au tour précédent.

## 4. RÈGLES OBSERVABLES

Chacune est un fait vérifiable à l'écran ou par oracle déterministe (testable plus tard, jamais un `>=` tautologique).

- **R1.** Cliquer sur l'objet central incrémente le compteur de ronrons affiché d'une valeur strictement positive à chaque clic (assertion stricte `==`).
- **R2.** Le compteur de ronrons ET le taux ronrons/sec sont visibles à l'écran en permanence et se mettent à jour en direct.
- **R3.** Après l'achat d'un chaton, un nouveau sprite de chaton nommé apparaît et reste visible jusqu'à la fin de la session.
- **R4.** Avec ≥1 chaton possédé et sans aucun clic pendant T ticks, le compteur augmente d'exactement `taux_production × T`.
- **R5.** Acheter une amélioration augmente strictement le taux de production affiché (ronrons/sec).
- **R6.** Le coût du N-ième chaton d'un type est strictement supérieur au (N−1)-ième, escalade fixe ≥ +10 % par achat.
- **R7.** Le jeu embarque un registre d'au moins 6 chatons nommés, aux noms uniques, chacun porteur d'un palier de rareté, tous affichables à l'écran.
- **R8.** La rareté d'un chaton est distinguable visuellement sans lire de texte (différence de pixels au-delà d'un seuil entre tiers).
- **R9.** L'acquisition de chatons suit une distribution de rareté où les tiers rares sont strictement moins fréquents que les tiers communs (≥2 fréquences distinctes).
- **R10.** Le jeu définit ≥2 lieux : le refuge disponible au départ et ≥1 lieu débloqué uniquement après un seuil de prestige.
- **R11.** Le jeu contient ≥3 objets distincts, chacun présent dans le monde et identifiable.
- **R12.** Le jeu définit ≥3 quêtes, chacune avec un objectif affiché à l'écran et une condition de complétion atteignable.
- **R13.** Chaque clic sur l'objet central déclenche une réaction visible à l'écran dans la même frame que l'entrée.
- **R14.** Le jeu joue un son DISTINCT pour chacun des quatre événements clic / achat / déblocage / prestige, déclenché par l'événement correspondant (journal des déclenchements).
- **R15.** La courbe de paliers porte au moins 3 valeurs de seuil strictement distinctes et non triviales (règle de variance).
- **R16.** Un bot déterministe atteint le 3e palier en un nombre de ticks FINI et borné, prouvé par assertion stricte d'atteinte (`palier == 3`, ticks ≤ borne explicite).
- **R17.** Effectuer un prestige remet ronrons et chatons à zéro et octroie un multiplicateur de production permanent > 1 qui persiste après le reset.
- **R18.** Aucun contenu du jeu ne représente combat, dégâts, défaite ou PvP ; chatons, objets et événements restent doux et mignons.
- **R19.** Un total de ronrons ≥ 10000 s'affiche en notation abrégée (K/M/B), jamais en chiffres bruts.
- **R20.** La progression (ronrons, chatons, lieux, état de prestige) persiste localement sur disque et est restaurée à l'identique au relancement (round-trip strict).
- **R21.** Au premier lancement, l'objet central porte un indicateur visuel et un clic change le compteur affiché dans les 3 premières secondes d'entrée.
- **R22.** Tout chaton nommé possédé augmente strictement le taux total de ronrons/sec de sa contribution déclarée — aucun chaton n'est du contenu mort sans consommateur.

## 5. TRAÇABILITÉ & RESTITUTION (annexe contrat — hors description produit)

**Ancre charter.** Sections 1–4 dérivent du `charter.yaml` (étape 0) : `objectif` (boucle clic→ronrons→chatons→production auto→améliorations→lieux→prestige), `criteres_demo` (a) 6 chatons nommés par rareté, (b) 2 lieux, (c) 3 objets, (d) 3 quêtes, (e) sons distincts, (f) feedback de clic, (g) courbe ≥3 paliers, (h) bot au 3e palier ; `criteres_succes` (variance, solvabilité stricte, producteur avec lecteur). Sources amont consommées : `worldscan.json`, `story_bible.json` (context/characters/coherence_rules GROUNDED ; chronology/stakes/factions/relations/events NOT_GROUNDED), `gm_worldscan.json` (7 dimensions MEASURED, `combat` NOT_MEASURED).

**Reçu d'oracle.** Je n'ai PAS exécuté `check_prisme_manifest.mjs` (permissions `run: aucun`) ; il tourne à la matérialisation par l'exécuteur (`node scripts/forge/check_prisme_manifest.mjs <run_dir>/prisme.json --worldscan <run_dir>/worldscan.json`). Le bloc JSON est construit en conformité stricte à `upstream_schema.mjs` : trio observation/claim/énoncé distinct par exigence, provenance EXPECTED (adresse résolvant dans l'artefact cité) / ADDITIONS (`reference: null`), et chaque exigence actionnable (kind ∈ PROOF_KINDS + destination ∈ DESTINATIONS).
- `software_verdict: BLOCKED` sur l'axe *preuve exécutée* (oracle non lancé dans ce contexte).
- `evidence_verdict: MECHANICAL_VALIDATION_ONLY`.
- `claim_verdict: NO_CLAIM_ALLOWED`.

**Exigences classées non actionnables :** aucune. Les 22 portent une `expected_proof{kind,statement}` exploitable et une `destination` valide.

**Références EXPECTED non ancrées dans le World Scan (classification advisory de `check_prisme_manifest`, PAS un défaut).** L'oracle ne construit ses jetons d'ancrage qu'à partir de `worldscan.json` (noms de jeux, URLs, `games[i]`). Les 8 exigences dont la `reference` est `story_bible:*` (C1, C2, C5, V1) ou `gm_worldscan:*` (C3, C4, G4, G5, G6, G7, G8, A1, L1, L2) seront donc reportées `references_non_ancrees`. Leur ancrage cross-artefact relève de `check_amont_traversal.mjs` (sonde distincte, non exécutée ici) où chaque adresse `story_bible:<section>` / `gm_worldscan:<dimension>` résout. C'est l'écart mesuré au pré-mortem `manifest-515ca55` : deux oracles de périmètres différents, pas un artefact bancal. Les 10 exigences `worldscan:*` (G1, G2, G3, G9, V2, A1…) s'ancrent, elles, via le jeton `games N`.

**fog → HumanGate (Pierre).** Deux exigences sont des ADDITIONS (proposées par le Prisme, hors source amont) : **D2** persistance locale à la relance et **D1** lisibilité des 30 premières secondes. Le charter exclut la sauvegarde *cloud* mais reste muet sur la sauvegarde *locale* ; ces deux promesses produit sont un jugement de conception à ratifier, pas un fait ancré.

**SKIPPED_VALIDATION :**
- item : exécution de `check_prisme_manifest.mjs` · périmètre : `prisme.json` de ce run · statut : non fait · raison : permissions `run: aucun` — l'oracle tourne à la matérialisation.
- item : exécution de la sonde `check_amont_traversal.mjs` · périmètre : ancrage cross-artefact des adresses `story_bible:` / `gm_worldscan:` · statut : non fait · raison : `run: aucun` ; adresses vérifiées par lecture (résolution `canonicalize`) mais non exécutées.
- item : `check_prisme.mjs` (forme markdown du snapshot) · périmètre : sections 1–4 ci-dessus · statut : non fait · raison : `run: aucun` — validé à la matérialisation ; construit au format exigé (4 en-têtes, ≥40 car., règles `- **Rn`, zéro placeholder).

**RETURN LINEAGE.**
- why_task_existed :
  - problem : la chaîne Forge exige un artefact `prisme.json` structuré qui transforme les faits amont (World Scan, Story Bible, GM World Scan) en exigences falsifiables routables vers l'aval — sans lui, `s3-decompo` n'a aucune ligne candidate à décomposer.
  - oracle : `check_prisme_manifest.mjs` (conformité chaîne + provenance + actionnabilité) et `check_prisme.mjs` (forme du snapshot).
  - root_cause : non transmis (activation par la séquence normale du pipeline `full_godot_narratif`, pas par un défaut).
  - action_reason : produire les deux sorties (product_snapshot + prisme.json) en conformité stricte au schéma pour que l'aval consomme des exigences prouvables.
- result : 22 exigences émises (19 EXPECTED, 3 ADDITIONS) couvrant les familles GAMEPLAY, CONTENT, VISUAL, AUDIO, LONGUEUR ; chaînes obs/claim/énoncé distinctes ; 22/22 actionnables ; product_snapshot à 4 sections + 22 règles observables.
- proof : lecture des validateurs `upstream_schema.mjs` (validateChaine l.146, validateProvenance l.98, validateExpectedProof l.74) et des résolveurs `canonicalize`/`resolvePath` (`check_amont_traversal.mjs` l.39, l.88) ; adresses vérifiées présentes dans les artefacts lus. Exécution des oracles déléguée à la matérialisation (`run: aucun`).
- learning : dans ce run, l'ancrage `story_bible:`/`gm_worldscan:` est structurellement invisible pour `check_prisme_manifest` (jetons worldscan-only) et n'est mesuré que par `check_amont_traversal` ; router une famille CONTENT/LONGUEUR sur ces adresses est correct mais sera toujours reporté `references_non_ancrees` par le manifest — à ne pas confondre avec un défaut d'artefact.
- next_reason : chaîne causale FERMÉE ici pour ce qui relève de l'oracle (artefact conforme, actionnable) ; escalade limitée au fog HumanGate ci-dessus (in-scope des additions D1/D2), jugement de conception que le Prisme ne tranche pas.
