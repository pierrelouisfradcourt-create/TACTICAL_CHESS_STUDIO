# Cadrage — Vue organique + Brouillard d'audit + Ancrage edge

> Passe **cadrage uniquement**. Aucun code écrit, aucune brique créée/modifiée, aucun commit.
> Ancrages `builder.html:ligne` vérifiés de première main. Date : 2026-07-03.
> Le skill `frontend-design` (`/mnt/skills/public/...`) est un chemin Linux **absent de cette
> machine Windows** (recherché, introuvable) — calibrage fait sur le langage visuel existant
> de `builder.html` (fond `#0b0f19`, indigo `#6366f1`, violet `#a78bfa`, pastilles
> fonctionnelles, chrome minimal) et la doctrine « surface affichée > surface câblée ».
>
> software_verdict: N/A (cadrage) · evidence_verdict: MECHANICAL_VALIDATION_ONLY ·
> claim_verdict: NO_CLAIM_ALLOWED

---

## Rappel de l'existant sur lequel ces 3 idées se greffent

- **Agent composite** (`builder.html:283-314`) : 1 nœud central + jusqu'à **8 satellites**
  (`agent-component` : role, objectif, memoire, skill, plugin, gardeFou, modele,
  sortieAttendue). `agentCardStatus()` renvoie `{filled, total, complete}`. **Le total
  n'est pas figé à 8** : les agents legacy (Council, Chaîne idée→IMP) sont X/7 (grand-père
  du 8ᵉ). Complétude = **booléenne par satellite** (`componentFilled` = rempli ou vide, pas
  de « à moitié rempli »). Déjà rendu : la pastille `.card-badge` en haut-droite, verte
  `card-ok` si complet / ambre `card-warn` sinon (`builder.html:136-141`).
- **Edge** (`builder.html:1160-1264`) : porte déjà `condition`, `visualStyle`
  (arrow/chain/stream), `loop`/`maxIterations`, et `controlPoint` (le point médian qui
  courbe). Le `mid-handle` (cercle draggable, `builder.html:1251-1255`) sert **uniquement**
  à poser `controlPoint`. Ces champs **persistent avec la Chaîne** et sont **retirés du
  graphe moteur** par `toEngineGraph` (qui ne garde que id/from/to/condition/loop/
  maxIterations — `builder.html:391`).
- **`note`** existe à DEUX endroits : un **nœud** canvas (`type:'note'`, exclu du moteur via
  `NON_EXEC_TYPES` — `builder.html:393`) ET une **brique** bibliothèque (`kind:'note'` —
  `builder.html:726`). Un note-nœud flotte librement, a position/taille, porte `data.text`.
- **`wiredStatus`** : champ **proposé mais NON construit** par `TCS_MAP_SCOPING.md:143-176`
  — scalaire sur l'enveloppe commune (wired / partial / scaffold / documented-only / broken),
  rendu comme la pastille `maturity`. C'est le **P0 bloquant** de ce doc. Retenir ce lien :
  **l'Idée 2 EST la moitié « rendu » de ce champ.**

---

## Idée 1 — Vue organique Agents

### Point 1 — Quelle métaphore SVG scale le mieux avec un score 0–8 ?

Contrainte cachée que la plupart des métaphores ratent : **le dénominateur est variable**
(7 ou 8 selon grand-père) et **la donnée sous-jacente est 8 booléens nommés**, pas un
scalaire continu. Une bonne métaphore doit donc (a) gérer un total variable sans mentir, et
(b) idéalement préserver *quel* satellite manque, pas seulement *combien*.

| Métaphore | Comment le score se lit | Avantages | Inconvénients |
|---|---|---|---|
| **Rosace / roue à N segments** (recommandée) | N wedges = N satellites requis ; chaque wedge s'allume quand son satellite est rempli | Mapping **1 wedge = 1 satellite nommé** (survol → « mémoire manquante ») ; total variable géré nativement (roue à 7 ou 8 parts) ; compact, radial, trivial en SVG (`<path>` d'arc) ; honnête (discret, comme la donnée) | Peu « organique » — c'est un anneau de progression segmenté déguisé. Assume-le : c'est un **gain de lisibilité**, pas une plante |
| **Arbre** (meilleure métaphore *pure* si Pierre veut du vivant) | 8 branches ; branche feuillue = satellite rempli, branche nue = vide ; croissance par paliers | Familier, « maturité » culturellement lisible, croissance en étapes = narratif fort | SVG génératif d'arbre joli = **coûteux et fragile** ; un arbre nu lit « mort/négatif » pour un agent **légitimement neuf** ; 8 branches fixes **mentent** sur un agent legacy X/7 ; perd le mapping par satellite (une branche = laquelle ?) |
| **Planète / phases de lune** | Fraction illuminée = filled/total | Élégant, la lumière/obscurité joue bien le « plein vs vide » ; superbe en vue dézoomée | **Perd toute l'info par satellite** (un croissant ne dit pas *lequel* manque) ; un croissant est ambigu (à moitié = 4/8 ? ou « en déclin » ?). À réserver à une vue d'ensemble, pas au nœud |
| **Ville** | N bâtiments, 1 par satellite | Mapping direct comme la rosace | 8 bâtiments alignés = un **bar-chart avec des toits** ; encombrant horizontalement à côté d'un nœud |

**Recommandation honnête (2 temps, pas 1 métaphore imposée) :**
1. Si l'objectif est **la lisibilité de la complétude** → **rosace segmentée**. 90 % de la
   valeur « organique au coup d'œil » pour 10 % de l'effort d'un arbre, et **seule** option
   qui garde le mapping par satellite + le total variable.
2. Si l'objectif est **le ressenti vivant/jardin** (Pierre insiste sur l'organique) →
   **arbre**, en assumant le coût génératif et en corrigeant le piège « arbre nu = mort »
   (un agent neuf doit être une **pousse/graine**, pas un tronc sec).

Je **ne tranche pas la métaphore à ta place** : rosace = pari lisibilité/effort ; arbre =
pari ressenti. La planète est écartée pour le nœud (perte d'info) mais **excellente pour la
vue-jardin dézoomée** (point 3).

### Point 2 — Continu ou par paliers ?

**Par paliers, sans hésitation.** `componentFilled` est booléen (`builder.html:301-305`) :
un satellite est rempli ou vide, il n'existe **aucune** donnée « 60 % rempli ». Un dégradé
continu **inventerait une précision que la donnée n'a pas** — exactement le péché que la
doctrine TCS combat. Donc : **N états discrets, un par satellite** (rosace : N wedges
allumés/éteints ; arbre : N branches feuillues/nues). Un « score de santé » continu ne
pourrait venir **que** d'une donnée continue à créer plus tard (ex. fraîcheur, cohérence) —
tant qu'elle n'existe pas, tout dégradé serait décoratif et malhonnête.

### Point 3 — Où vit cette vue ?

Deux emplacements, **valeurs très différentes** :

- **(A) Toggle in-place sur le canvas** — le nœud Agent change d'apparence (devient l'objet
  organique), les edges continuent de s'y connecter. C'est **littéralement ce que Pierre a
  décrit** (« un bouton bascule entre les deux vues pour un même agent »). Contrainte réelle :
  la **bounding box du nœud doit rester stable** en basculant, sinon les edges (ancrés aux
  ports, `builder.html:1164`) sautent. Effort modéré si la rosace occupe le même cadre que le
  badge actuel.
- **(B) Vue dédiée « Jardin »** — un onglet qui affiche **tous** les agents côte à côte comme
  des plantes/planètes. C'est une **feature différente** : un portfolio/overview, pas un mode
  du nœud. Plus gros, mais c'est **là qu'est la vraie valeur** (voir point 4).

**Recommandation** : commencer par **(A)** (fidèle à la demande, réutilise le cadre du badge).
La **vue-jardin (B)** est un R2 naturel **si** la métaphore prouve sa valeur — et c'est là que
la planète (lumière/obscurité) brille pour repérer d'un coup les agents négligés.

### Point 4 — Sur-ingénierie : effort vs valeur (honnête)

La donnée est **déjà entièrement affichée** : la pastille `X/8` verte/ambre
(`builder.html:136-141`) + les satellites eux-mêmes. Une vue organique **n'ajoute aucune
donnée** — elle re-présente `filled/total`.

- **Au niveau d'UN nœud** (mode A) : valeur marginale **faible** sur le badge existant.
  Coût : rosace = faible ; arbre génératif = réel (composant SVG + réglages, ~150–300 l).
  **Verdict : joli, pas prioritaire.**
- **À l'ÉCHELLE** (vue-jardin B, 20 agents) : valeur **réelle** — repérer d'un coup d'œil les
  agents « qui flétrissent » (satellites vides) est un vrai gain qu'aucune pastille ne donne à
  l'échelle. Mais c'est **l'option la plus chère**.

**Inversion à assumer** : le pas-cher (rosace in-place) a peu de valeur marginale ; le
précieux (jardin) est le plus cher. C'est le signe d'une idée **esthétique d'abord** —
légitime, mais **à ne pas prioriser sur 2 et 3**.

---

## Idée 2 — Brouillard d'audit

**Lien explicite** : cette idée n'est PAS un nouveau scope. C'est la **moitié « rendu »** du
champ `wiredStatus` déjà recommandé en **P0** par `TCS_MAP_SCOPING.md:143-176`. Le doc
proposait une **pastille texte** ; Pierre demande en plus un **impact visuel pré-attentif**
(flou/brouillard). Pastille = l'étiquette lisible de près ; brouillard = le canal
pré-attentif lisible de loin. **Les deux sont le même champ, à faire ensemble.**

### Point 1 — Comment rendre un « brouillard » (CSS/SVG)

| Technique | Rendu | Avantages | Inconvénients |
|---|---|---|---|
| **`filter: blur()` progressif** | Nœud flou selon l'inconnu | 1 ligne CSS, « hors focus = pas connu » très intuitif | **Détruit le texte** — on floute le label même dont on a besoin pour identifier la brique. Un nœud illisible est honnête mais **inutilisable** |
| **Désaturation + opacité** (`grayscale()`+`opacity`) | Nœud grisâtre/fantôme | « Inactif/inconnu » clair, **garde le texte lisible**, léger | Moins « brouillard » littéral |
| **Voile de bruit superposé** (`feTurbulence` ou PNG data-URI semi-transparent) | Vraie brume feutrée | Le plus littéralement « brouillard » | Le plus cher, risque de clutter décoratif |

**Recommandation — calibrer sur la LISIBILITÉ, pas sur l'effet** : **désaturation + voile
feutré léger**, en gardant le **titre net** (flouter le corps, jamais le titre). Le principe
directeur : le brouillard doit dire « on ne sait pas » **sans supprimer l'affordance de lire
et identifier** la chose. Réserver un `blur()` fort uniquement au tier le plus inconnu.

**Nuance critique que la liste `wiredStatus` mélange** : le brouillard doit encoder
l'**épistémique** (est-ce qu'on *sait* ?), pas la **qualité** (est-ce *bon* ?). Or `broken`
= **connu-mauvais** (audité, contradictoire) — ce n'est PAS de l'inconnu, c'est un **danger**.
Donc :

- Intensité du brouillard = **inverse de la confiance d'audit** :
  `unset/jamais-audité` = brume maximale → `documented-only` = fantôme → `scaffold` = brume
  moyenne + contour tireté → `partial` = voile léger → `wired` = **net, pleine couleur**.
- `broken` = **PAS du brouillard** mais une **teinte danger** (rouge `#7c2d12`/⚠, cf. classes
  `badge-target`) superposable — on *sait* que c'est faux.

Ça garde la métaphore honnête : brume = « je ne sais pas », hazard = « je sais que c'est
cassé ». Deux canaux distincts.

### Point 2 — Sur quoi le brouillard s'applique

**Pas sur tout objet sans `wiredStatus`.** Une brique `draft` fraîchement créée sans
`sourceRef` (`builder.html:559,586,606…` — toutes naissent `maturity:'draft'`,`badge:'demo'`)
n'est pas « du TCS non audité » — c'est **juste une idée neuve**. La brumer noierait le canvas
(tout neuf serait flou = bruit).

**Déclencheur recommandé** : brouillard **ssi** `sourceRef` présent (la brique **prétend**
refléter un vrai système TCS) **ET** `wiredStatus ∈ {unset, documented-only}`. Ça arrime le
brouillard **précisément** au problème « surface affichée > surface câblée » : les briques qui
*affichent* une connaissance de TCS qu'on n'a pas *câblée/vérifiée*. Les notes/goals qu'un
utilisateur invente (pas de `sourceRef`) = **jamais de brume**.

### Point 3 — Comment ça se dissipe

Le brouillard **EST** le rendu de `wiredStatus=non-audité`. Le lever = **poser
`wiredStatus`** sur une valeur connue.

- **v1 (cheap, honnête)** : `wiredStatus` réglé **manuellement** (la pastille P0) vers
  `wired`/`partial` → un humain **affirme avoir regardé**. La brume tombe. C'est exactement
  le geste d'audit que Pierre décrit (« on a scanné/mappé »).
- **v2 (haute fidélité)** : un **oracle/probe** pose `wiredStatus` mécaniquement (ex. le test
  de dispatch openclaw, un « cet endpoint répond-il »). La brume tombe **par preuve
  d'exécution**, pas par affirmation — cohérent avec « preuve d'exécution, pas d'existence ».

**Conséquence de cadrage** : l'Idée 2 = **P0 (champ + pastille) + le canal flou**, en **une
seule passe**. Ne pas la traiter comme un item séparé du `wiredStatus` : c'est sa surface
visuelle.

---

## Idée 3 — Ancrage sur edge

### Point 1 — Qu'est-ce qui a du sens sur un edge (vs un nœud) ?

Un edge = une **relation/transition**. Ce qui appartient à une relation est une **annotation
sur la relation** : *pourquoi* cette connexion existe, une condition en langage naturel, un
commentaire. **PAS une brique complète** — un agent/oracle/prompt *fait* un travail, il a des
ports, il vit sur un **nœud**. Poser une vraie brique exécutable au milieu d'un edge créerait
un objet hybride (un nœud sans ports ? un edge qui exécute ?) qui casse le modèle
`toEngineGraph`.

**Portée recommandée** : une **annotation texte courte** (une-deux phrases) — le « pourquoi »
de la connexion, distincte de `condition` (qui est un garde quasi-machine déjà rendu au
milieu, `builder.html:1248-1250`). Explicitement **non exécutable**, purement documentaire.

### Point 2 — Mécanique d'attache

L'edge **ouvre déjà l'inspecteur** au clic (`setSel({kind:'edge'})` → panneau droit avec les
boutons `visualStyle`, `builder.html:3738-3740`). Le chemin le **moins de code neuf** :

- **v1** : un `<textarea>` « note / annotation » dans l'inspecteur d'edge, à côté de
  `condition`/`visualStyle`. **Aucun nouveau paradigme d'interaction, aucune boîte de dialogue**
  (respecte la règle anti-dialog de CLAUDE.md). Un petit indicateur `💬` au médian quand
  l'edge porte une note (comme le label `condition` déjà rendu là).
- **v2 (polish)** : double-clic sur le `mid-handle` → mini-champ inline. Le `mid-handle`
  existe déjà (`builder.html:1251`) et sert au drag/courbe ; le simple-clic sélectionne déjà
  → réserver le double-clic à l'édition inline évite le conflit. **Différer** : l'inspecteur
  suffit en v1.

### Point 3 — Persistance

**Oui, et c'est déjà le patron en place.** L'annotation = un **champ string sur l'objet edge**
(ex. `e.note`), sérialisé avec la Chaîne **exactement** comme `condition`/`visualStyle`/
`controlPoint` le sont déjà (`controlPoint` — une struct `{x,y}` — persiste déjà,
`builder.html:1055,1165`). Un simple champ texte est **le même patron, en plus simple**.

**Point de vérité à confirmer (et il tient)** : ce champ doit être **retiré du graphe
moteur**. `toEngineGraph` ne garde sur un edge que id/from/to/condition/loop/maxIterations
(`builder.html:391`) — il **ignore déjà tout champ edge inconnu**. Donc `e.note` est
**nativement exclu** du moteur, comme les nœuds note/artefact le sont. Cohérent, zéro risque
de fuite vers le moteur.

### Point 4 — Réutiliser le `kind:'note'` ou pas ?

**Ne pas surcharger `note`.** Différence **structurelle** :

- Un **note-nœud** (`type:'note'`) flotte librement, a **position + taille**, existence
  indépendante, repositionnable partout (`builder.html:500,726`).
- Une **annotation d'edge** n'a **aucune existence propre** : elle vit et meurt avec l'edge,
  est **ancrée au médian** et bouge avec lui. Si l'edge est supprimé, elle disparaît.

Rendre le `note` kind « tantôt nœud libre, tantôt ancré à un edge » exigerait un **mode
toggle** + une **référence “à quel edge suis-je lié”** que le note-nœud n'a pas aujourd'hui —
**plus de complexité que de valeur**, et ça brouille deux mécanismes distincts.

**Recommandation** : ajouter un **champ string `note` sur l'edge** (comme `condition`), **pas**
un note-nœud lié à un edge. Ils partagent le *concept* « annotation » mais **pas le
mécanisme**. Garder : note-nœud = commentaire flottant libre ; edge-note = champ inline de
l'edge. Si un jour Pierre veut une **vraie brique riche** ancrée au milieu (l'edge devient une
cible droppable) → c'est une **feature bien plus grosse**, à différer explicitement.

---

## Priorité recommandée

**Ordre : 3 → 2 (avec P0) → 1.**

1. **Idée 3 (annotation d'edge) — MEILLEUR ratio valeur/effort. À construire en premier.**
   Minuscule : un champ `e.note` + un `<textarea>` dans l'inspecteur + un indicateur `💬`,
   **tout en réutilisant des patrons existants** (persistance façon `controlPoint`,
   inspecteur, exclusion `toEngineGraph`). Valeur pratique immédiate : documenter *pourquoi*
   les connexions existent est une vraie valeur de carnet d'ingénieur dans un graphe qui
   devient une **carte**. Risque le plus bas.

2. **Idée 2 (brouillard) — HAUTE valeur stratégique, effort MOYEN, mais couplée à P0.**
   Ce n'est **pas décoratif** : c'est la leçon centrale du projet (« surface affichée >
   surface câblée ») rendue **pré-attentive**. Mais elle **dépend** du champ `wiredStatus`
   (P0 de `TCS_MAP_SCOPING.md`, décision Pierre encore due). Donc : faire **P0 (champ +
   pastille) + le rendu flou ensemble**, en une passe. Deuxième — forte valeur, **gatée** sur
   la décision `wiredStatus`.

3. **Idée 1 (vue organique) — plus faible ratio, à différer.** Le mode in-place re-présente
   une donnée **déjà affichée** par le badge `X/8` (esthétique pure, coût SVG génératif réel).
   La vue-jardin a une vraie valeur **à l'échelle** mais c'est la plus chère. Si poursuivie :
   **rosace segmentée d'abord** (cheap, garde le mapping par satellite + le total variable), et
   ne construire le **jardin** que si la métaphore fait ses preuves. **Nice-to-have, pas
   maintenant.**

---

## Questions restantes pour Pierre

1. **Idée 1 — cible de valeur** : veux-tu la lisibilité **d'un nœud** (valeur faible sur le
   badge existant) ou une **vue-jardin d'ensemble** (valeur réelle, plus chère) ? Et
   veux-tu une **vraie métaphore organique** (arbre — ressenti, coûteux) ou acceptes-tu la
   **rosace segmentée** honnête (lisibilité/effort) ? *Je ne tranche pas la métaphore à ta
   place.*
2. **Idée 2 — décision `wiredStatus` (P0)** : valides-tu `wiredStatus` comme **vrai champ**
   (pas juste convention `notes`) ? Le brouillard **ne peut pas exister sans lui**. Et
   valides-tu la **séparation épistémique/qualité** (brume = *inconnu* ; teinte danger = `broken`
   *connu-mauvais*) ?
3. **Idée 3 — bornage** : confirmes-tu que la portée reste une **annotation courte** et ne
   glisse **pas** vers « déposer une brique complète sur un edge » (feature bien plus grosse) ?

---

*Cadrage — ne construit rien, ne modifie aucune brique ni edge. À ajouter à `AUDIT_INDEX.md`.*
*software_verdict: N/A · evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED*
