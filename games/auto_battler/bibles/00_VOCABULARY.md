# Vocabulary Bible — Auto Battler

**Date** : 2026-07-18
**Mise à jour** : 2026-07-18 — intégration des décisions ratifiées (`HUMANGATE_2026-07-18_FOUNDATION.md` + `HUMANGATE_2026-07-18_DECISIONS.md` + `HUMANGATE_2026-07-18_GATE3.md`)
**Source** : session de co-conception Pierre × Claude (Fable 5)
**Statut** : IMPLEMENTED (documentaire) — ratifié HumanGate 2026-07-18 (gates Foundation + Decisions + gate #3 intégrés)
**Rôle** : langage officiel du projet. Un mot = une notion. Référence transversale de toutes
les autres bibles (`00_ARCHITECTURE.md`, règle d'écriture : « tous les termes canoniques
viennent de `00_VOCABULARY.md` »). Sur un projet long multi-agents, ce document empêche que
trois documents utilisent trois mots différents pour la même chose.

---

## 0. Convention de langue — ratifié HumanGate 2026-07-18

Décision (Q1, `HUMANGATE_2026-07-18_FOUNDATION.md`) :

- **Identifiants canoniques en ANGLAIS** : code, DSL, logs, noms d'événements, JSON, schémas
  de données et tests doivent rester stables (ex. `event: UnitAttackResolved`,
  `effect: DamageApplied`).
- **Documentation explicative en FRANÇAIS** : les bibles sont rédigées en français et emploient
  le terme canonique tel quel (« le Round », « la Shop », « un Merge »).
- Les traductions françaises restent dans les **synonymes interdits** des docs générés,
  SAUF traduction explicitement admise par le HumanGate pour la prose — cas ratifié :
  « fusion » pour Merge (Q6). L'identifiant canonique reste `Merge` dans le code, le DSL,
  les Events et les tests.

## Règles d'usage

1. **Portée des interdits** : les synonymes interdits s'appliquent aux bibles et documents
   générés à partir de maintenant. Ils ne s'appliquent PAS aux notes brutes de Pierre
   (`SOURCE_GAME_BIBLE_V1_PIERRE.md`, jamais réécrite) ni aux citations de celles-ci.
2. **Ajout de terme** : toute nouvelle notion introduite par une bible doit d'abord être
   ajoutée ici (DRAFT), sinon elle n'existe pas. Pas de terme fantôme.
3. **Conflit** : si une bible contredit ce document, ce document gagne ; la bible est à
   corriger (ou la modification passe par ratification Pierre ici).
4. **Casse** : les identifiants canoniques s'écrivent en CamelCase dans le code et les noms
   d'événements (`GameState`, `EventLog`), en mot simple capitalisé dans la prose (Round, Shop).

---

## 1. Partie / Structure

| Terme | Définition | Bible propriétaire | Synonymes INTERDITS |
|---|---|---|---|
| **Match** | Une partie complète : du premier Round jusqu'à la victoire du dernier Seat survivant. Un Match = un Seed initial + un journal d'Inputs (replay intégral). | Core Rules | partie, game, run, session |
| **Lobby** | L'ensemble des N Seats d'un Match. N appartient aux Core Rules (valeur de référence N = 8) et calibre pool, probabilités, durée, dégâts. « Lire le Lobby » = information stratégique (Pool partagé). Sommet de la hiérarchie Lobby → Seat → Player → Army — ratifié HumanGate 2026-07-18. | Core Rules | salle, room, table |
| **Seat** | Un des N emplacements du Lobby. Entité neutre du moteur : la place dans le Lobby, distincte de son occupant. Porte un `seat_index` FIXE, sans rotation — ratifié HumanGate 2026-07-18 (QD-6) : l'équité vient du pairing et du RNG contrôlé, pas d'un déplacement des identités. Son occupant logique est le Player (hiérarchie Lobby → Seat → Player → Army — ratifié HumanGate 2026-07-18) ; l'incarnation concrète relève de la Platform Bible. | Core Rules (invariant) / Platform (incarnation) | siège, place, slot, position |
| **Player** | Occupant LOGIQUE d'un Seat : humain, Bot ou IA de simulation sont tous des Players — ratifié HumanGate 2026-07-18 (Q2). Le Seat représente la place dans le Lobby ; le Player l'occupe et possède une Army. Hiérarchie : Lobby → Seat → Player → Army. | Core Rules (occupant logique) / Platform (incarnation) | joueur, user, participant |
| **Army** | L'armée d'un Player : l'ensemble des Units qu'il possède. Dernier étage de la hiérarchie Lobby → Seat → Player → Army — ratifié HumanGate 2026-07-18 (Q2). | Core Rules (structure) | armée, équipe, team, roster |
| **Round** | Un cycle complet de la boucle principale : revenus → Preparation State (Inputs + Merge automatique) → ConfirmPreparation → appariement (GhostBoard si nombre impair) → Combat → Round Resolution → mise à jour des Life — boucle ratifiée HumanGate 2026-07-18. | Core Rules | manche, tour, turn, stage |
| **Preparation State** | Fenêtre UNIQUE de préparation au sein d'un Round — un état, pas des phases rigides. Le Player y réorganise librement via les Inputs Buy, Sell, Reroll, Lock, LevelUp, Place ; le Merge y survient AUTOMATIQUEMENT (action du système, jamais un Input). Se clôt par l'Input ConfirmPreparation. — ratifié HumanGate 2026-07-18 (QC-2, QC-3) | Core Rules | phase d'achat, phase de préparation, planning phase, shopping phase |
| **Round Resolution** | Résolution de fin de Round — remplace l'ancienne phase « Récompenses ». Peut produire : rewards, damage (à la Life du Player/Seat), progression. La récompense est un sous-système de la résolution, pas une phase. — ratifié HumanGate 2026-07-18 (QC-1) | Core Rules | récompenses, rewards phase, phase de récompenses |
| **Life** | Ressource du Player/Seat (ex. `Player Life: 32`), entamée par le damage de la Round Resolution après un Combat perdu ; à zéro → Elimination. Distincte de la Health d'une Unit — invariant : une Unit ne perd jamais de Life, seulement de la Health. — ratifié HumanGate 2026-07-18 (Q3) | Core Rules | vie, HP (du Seat), points de vie |
| **Elimination** | Sortie définitive d'un Seat du Match quand sa Life atteint zéro. Le dernier Seat non éliminé gagne le Match. | Core Rules | mort (d'un Seat), KO, défaite finale |

## 2. Combat

| Terme | Définition | Bible propriétaire | Synonymes INTERDITS |
|---|---|---|---|
| **Combat** | La phase de résolution automatique au sein d'un Round : les Units s'affrontent sans aucune entrée joueur, de façon déterministe, en Ticks successifs. Distinct du Round (qui l'englobe). | Combat | bataille, fight, battle |
| **Board** | La surface de jeu où les Units sont placées et combattent (lignes avant/arrière, coins, centre — V1). Chaque Seat possède son Board pendant le Preparation State. | Combat (géométrie) / Core Rules (dimensions) | plateau, terrain, grille, arène, battlefield |
| **GhostBoard** | Copie FIGÉE et IMMUABLE du Board d'un adversaire — donnée historique, ne change jamais (invariant Oracle). Snapshot du DERNIER board validé du joueur adverse : après ConfirmPreparation, avant Combat — jamais un état intermédiaire, un état après combat ou un état mutable ; un GhostBoard est une photographie immuable (QD-3). Sert d'adversaire à l'appariement quand le nombre de Seats actifs est impair : pas d'attente, simulation simple, replay possible. Identifiant canonique en un seul mot. — ratifié HumanGate 2026-07-18 (QC-4 + QD-3) | Core Rules (appariement) / Combat (résolution) | board fantôme, clone, copie, shadow board |
| **Placement** | Disposition des Units sur le Board par le Seat avant le Combat. C'est un Input du joueur ; objectif V1 : ~30 % de la victoire. | Core Rules (phase/Input) / Combat (conséquences) | positionnement, positioning, disposition |
| **Attack** | L'attaque de base d'une Unit : action récurrente dirigée sur sa cible, qui inflige du Damage et génère du Mana. Aussi un Event du vocabulaire fermé. | Combat | auto-attack, coup, strike, basic attack |
| **Ability** | La compétence d'une Unit, lancée (Cast) quand son Mana est plein. Définie en DSL ; ses Effects sont résolus par le moteur. | Content (instances) / DSL (contraintes) / Combat (résolution) | compétence, skill, spell, sort, capacité, power |
| **Cast** | Le lancement d'une Ability à Mana plein. Aussi un Event du vocabulaire fermé. Après un Cast, le Mana retombe selon les règles de la Combat Bible. | Combat | lancement, incantation, activation |
| **Mana** | Ressource d'une Unit qui se remplit UNIQUEMENT en attaquant, en recevant du Damage, ou par des effets déclarés en DSL (QB-11 : « uniquement » — le remplissage « avec le temps » de la V1 est SUPPRIMÉ, delta V1 assumé). À Mana plein : Cast automatique. — ratifié HumanGate 2026-07-18 (gate #3) | Combat | énergie, ressource, MP |
| **Damage** | Quantité de points retirés à la Health d'une Unit par une Attack, une Ability ou un Effect. Aussi un Event du vocabulaire fermé. Les dégâts infligés au Seat après une défaite (survivants + niveau de Round, V1) sont une notion distincte définie par les Core Rules. | Combat | dégâts, blessure, hit |
| **Health** | Points de vie d'une **Unit** ; à zéro → Event Death. Les deux termes coexistent — ratifié HumanGate 2026-07-18 (Q3) : Life = ressource du Player/Seat, Health = points de vie d'une Unit (ex. `Player Life: 32`, `Dragon Health: 240`). | Combat | PV, HP, vie, points de vie |
| **Targeting** | Sélection de cible d'une Unit (priorité, distance préférée — V1). Point de décision automatique : ordre total obligatoire (P6), jamais d'aléatoire hors RNG d'état ; chaque règle de Targeting est un invariant Oracle. | Decision | ciblage, aggro, focus |
| **Range** | Distance à laquelle une Unit peut exécuter son Attack ou son Ability. Paramètre de Targeting et de déplacement. | Combat | portée, distance d'attaque, reach |
| **Tick** | Pas de temps discret de la Simulation de Combat. Pas de temps réel (P1) : tout ce qui arrive « avec le temps » (déplacements, effets périodiques) s'exprime en Ticks. Son ordre interne est le TickPipeline. | Combat / Technical | frame, step, pas de temps, itération |
| **TickPipeline** | Ordre total intra-Tick FIGÉ, sémantique hybride (QB-4) : le Tick est **séquentiel dans son exécution** (phases) mais **simultané dans ses effets** — par phase : `Intent → Validation → Resolution → Commit`. Toutes les unités décident sur le même état ; les conséquences sont appliquées ensemble (pas d'effets de priorité artificiels). — ratifié HumanGate 2026-07-18 (gate #3) | Combat | boucle de tick, ordre d'exécution, update loop |
| **Resolve** | Application déterministe d'une action (Attack, Cast, Effect…) au GameState, dans l'ordre défini par la Combat Bible et la Decision Bible. Forme nominale acceptée : Resolution. Même état + mêmes entrées → même Resolve, toujours. | Combat / Decision (ordre) | appliquer, exécuter, procéder |
| **CombatResult** | Sortie canonique d'un Combat, consommée par la Round Resolution (CBT-1/CBT-6). Structure exacte (vainqueur, survivants…) → Combat Bible ; conséquences (rewards, damage à la Life, progression) → Round Resolution (Core Rules). — ratifié HumanGate 2026-07-18 (gate #3) | Combat (production) / Core Rules (consommation) | résultat de combat, outcome, battle result |
| **Trigger** | Condition, exprimée en DSL, qui déclenche un Effect quand elle devient vraie (ex. « à la mort », « à l'Attack », « au seuil de Health »). Le Trigger écoute ; l'Event constate. | DSL (vocabulaire) / Combat (évaluation) | déclencheur, condition, hook, on-event |
| **Effect** | Modification d'état produite par une Ability, un Item, une Synergy ou une Aura, décrite avec les primitives du DSL (monde fermé, P8). Tout Effect est résolu par le moteur — jamais par le Renderer. Porte OBLIGATOIREMENT un MaxTriggerPerTick (QB-16). | DSL (primitives) / Combat (résolution) | effet, modifier, mod |
| **MaxTriggerPerTick** | Attribut DSL **OBLIGATOIRE** de chaque Effect : nombre maximal de déclenchements du même Effect au sein d'un même Tick — garde-fou déterministe contre les boucles infinies (QB-16 : « très efficace contre les boucles »). — ratifié HumanGate 2026-07-18 (gate #3) | DSL (attribut) / Combat (application) | limite de trigger, anti-boucle, loop guard |
| **Buff** | Effect qui améliore une Unit (statistiques ou comportement), temporaire ou permanent (V1 : « Buffs initiaux » en début de Combat, ordre QB-12 : Origin → Class → Items → Temporary). Aussi un **Event** du registre fermé (QB-9) — payload → Combat Bible. Antonyme canonique : **Debuff** (entrée propre). — ratifié HumanGate 2026-07-18 (gate #3) | Combat | bonus, boost, amélioration |
| **Debuff** | Effect qui dégrade une Unit (statistiques ou comportement) — antonyme canonique de Buff, désormais Event DISTINCT. Aussi un **Event** du registre fermé (QB-9, « pas davantage ») — payload → Combat Bible. Nota : « nerf » désigne une action d'équilibrage (Balance Bible), jamais un Debuff en jeu. — ratifié HumanGate 2026-07-18 (gate #3) | Combat | malus, nerf, affaiblissement |
| **Heal** | Restauration de Health d'une Unit. **Event** du registre fermé (QB-9, « pas davantage ») — sémantique exacte et payload → Combat Bible. — ratifié HumanGate 2026-07-18 (gate #3) | Combat | soin, régénération, restore |
| **Shield** | Protection qui absorbe du Damage avant la Health d'une Unit. **Event** du registre fermé (QB-9, « pas davantage ») — sémantique exacte et payload → Combat Bible. — ratifié HumanGate 2026-07-18 (gate #3) | Combat | bouclier, barrière, absorb, armure temporaire |
| **Aura** | Effect continu attaché à une Unit, appliqué à d'autres Units tant qu'une condition spatiale ou d'appartenance est vraie, et retiré quand elle cesse. | Combat (résolution) / DSL (définition) | halo, zone passive, émanation |

## 3. Économie

| Terme | Définition | Bible propriétaire | Synonymes INTERDITS |
|---|---|---|---|
| **Gold** | La ressource économique du Seat. Sert à acheter, Reroll et monter de Level (V1). L'économie doit peser autant que le Combat. | Economy | or, pièces, coins, argent, money |
| **Income** | Gold reçu par un Seat en début de Round : revenu de base + primes éventuelles définies par l'Economy Bible. SANS intérêts : « Interest » n'est PAS un terme du jeu (QE-4 : rejeté — économie originale, pas de stratégie passive) ; pas de win/lose streak non plus en V1 (QE-5). — ratifié HumanGate 2026-07-18 (gate #3) | Economy | revenus, revenue, gain de manche, interest, intérêts (mécanisme rejeté gate #3) |
| **Shop** | L'offre d'unités proposée à un Seat à chaque Round, tirée du Pool via le RNG du GameState selon le Level et la Rarity. Invariant P4 : probabilités affichées = probabilités réelles. | Economy | boutique, magasin, store, market |
| **Reroll** | Input : payer du Gold pour re-tirer le contenu de la Shop. | Economy | relance, refresh, roll |
| **Lock** | Input : verrouiller la Shop courante pour la conserver au Round suivant. Nota : « freeze » est réservé au vocabulaire de verdict studio (merge/reject/freeze) — interdit ici. | Economy | verrouillage, freeze |
| **Pool** | Réserve partagée et finie d'unités du Lobby : chaque achat retire l'unité du Pool et réduit les chances des autres Seats de l'obtenir (V1). Moteur de l'adaptation et des contres. | Economy | réserve, bassin, stock partagé |
| **Bench** | Zone du Player HORS Board. Une Unit achetée a trois états possibles : Shop → Purchased → {Board \| Bench}. Le Bench appartient au Player, conserve les Units, permet la préparation et n'intervient pas directement dans le Combat. Le nombre maximum de places relève de l'Economy/Balance Bible. — ratifié HumanGate 2026-07-18 (QD-5) | Core Rules (concept) / Economy-Balance (capacité) | banc, réserve personnelle, sideboard, backline |
| **Level** | Le niveau d'un **Player** : augmente la taille d'équipe, débloque les Rarity hautes, améliore les probabilités de la Shop (V1). « Level » est RÉSERVÉ au Player ; le rang d'une Unit issu d'un Merge s'appelle Star. — ratifié HumanGate 2026-07-18 (Q4) | Economy | niveau, rank, XP |
| **Rarity** | Palier de rareté d'une unité (V1), qui conditionne son coût et sa disponibilité dans la Shop selon le Level. | Economy (probabilités) / Content (attribution) | rareté, tier, cost-tier, palier |

## 4. Contenu / Synergies

| Terme | Définition | Bible propriétaire | Synonymes INTERDITS |
|---|---|---|---|
| **Unit** | L'entité combattante de base : achetée à la Shop, placée sur le Board ou le Bench, combat automatiquement selon ses règles de Decision. Porte des Traits, une Ability, des statistiques, des Items. Distinction OBLIGATOIRE ratifiée HumanGate 2026-07-18 : UnitDefinition (le modèle) ≠ UnitInstance (l'occurrence réelle en partie) — voir ces deux entrées. | Content (données) / Combat (comportement) | unité, pion, champion, minion, créature, pièce |
| **UnitDefinition** | Le MODÈLE de l'unité : la définition de contenu dont toutes les occurrences en partie sont tirées (ex. `Goblin Warrior`). Distinction obligatoire avec UnitInstance. — ratifié HumanGate 2026-07-18 | Content | modèle d'unité, template, blueprint, prototype |
| **UnitInstance** | Une occurrence RÉELLE d'une UnitDefinition en partie (ex. `Goblin Warrior #18472, Star 2, Health 340`). Porte un `unit_instance_id` unique — avant-dernière clé du TieBreakChain (QD-1) ; un Merge produit un nouvel `unit_instance_id` (QD-4). Distinction obligatoire avec UnitDefinition. — ratifié HumanGate 2026-07-18 | Content (données) / Combat (état) | instance, exemplaire, copie d'unité |
| **Origin** | Première sorte de Trait d'une Unit — son appartenance « d'où elle vient » (ex. V1 : Dragon). Une Unit a 1 ou plusieurs Origins. | Content | origine, faction, race, tribu |
| **Class** | Seconde sorte de Trait d'une Unit — son rôle « ce qu'elle fait » (ex. V1 : Mage). Une Unit a 1 ou plusieurs Classes. | Content | classe, métier, rôle, job |
| **Trait** | Terme générique CHAPEAU couvrant les deux catégories Origin et Class : toute étiquette d'une Unit comptée pour l'activation des Synergies. — ratifié HumanGate 2026-07-18 (Q5) | Content | caractéristique, tag, attribut |
| **Synergy** | Bonus collectif accordé à l'équipe quand le nombre d'Units partageant un Trait atteint un Threshold. Cœur du jeu (V1). Ses effets concrets sont des Effects (souvent des Buffs). | Content (instances) / Combat (application) | synergie, combo, set bonus, bonus de trait |
| **Threshold** | Seuil d'activation d'une Synergy (ex. V1 : 2/4/6/8 Units). Jamais de bonus linéaire : rien entre deux Thresholds. | Content (valeurs) / Core Rules (mécanisme) | seuil, palier, breakpoint, tier |
| **Item** | Objet porté par une Unit qui l'améliore, la transforme ou la spécialise (V1) — doit modifier les décisions du joueur, pas seulement les statistiques. Ses effets sont des Effects définis en DSL. | Content | objet, équipement, artefact, gear |
| **Merge** | Combinaison de trois Units identiques en une Unit de Star supérieur (statistiques, Ability, effets — V1). « Identiques » = même UnitDefinition + même Star : ★1+★1+★1 = Merge, ★1+★1+★2 ≠ Merge. La Unit produite reçoit un nouvel `unit_instance_id` (QD-4). Action AUTOMATIQUE du système pendant le Preparation State — jamais un Input joueur ; le moteur émet les Events MergeTriggered puis MergeResolved (replay). Terme canonique ; « fusion » = traduction française admise en prose. — ratifié HumanGate 2026-07-18 (Q6, QC-3, QD-4) | Core Rules (règle) / Content (résultats) | combine, upgrade, évolution |
| **Star** | Rang d'une Unit résultant d'un Merge (Star 1/2/3, noté ★). Invariant Oracle : un Merge produit un Star supérieur. « Level » reste réservé au Player. — ratifié HumanGate 2026-07-18 (Q4) | Core Rules (règle) / Content (valeurs) | étoile, rang, grade |
| **Archetype** | Composition-type reconnaissable visée par le méta (objectif Meta Bible : ex. 8 Archetypes viables). Unité de mesure de la diversité du jeu. | Meta | archétype, composition, compo, build |
| **Pivot** | Changement d'Archetype par un Seat en cours de Match, en réaction au Lobby ou à la Shop. Sa fréquence est un objectif de la Meta Bible. | Meta | transition, switch, respec |

## 5. Simulation / Validation

| Terme | Définition | Bible propriétaire | Synonymes INTERDITS |
|---|---|---|---|
| **GameState** | L'état complet de la simulation à un instant t, incluant `rng_state`. Le moteur est une fonction pure `GameState → GameState` (P1) : pas d'aléatoire caché, pas d'état hors GameState. | Core Rules (P1) / Technical (structures) | état de jeu, state, world state |
| **Seed** | Graine initialisant `rng_state` à la création du Match — n'apparaît qu'à l'initialisation, jamais de re-seed en cours de partie (P1). `rng_state` est une **composante du GameState**, pas un concept à part. | Core Rules (P1) | graine, random seed |
| **Input** | Entrée d'un Player appliquée au GameState pendant le Preparation State. Liste CLOSE ratifiée : Buy, Sell, Reroll, Lock, LevelUp, Place, ConfirmPreparation. Merge n'est PAS un Input (action automatique du système — QC-3, correction INV-13). Aucun Input pendant le Combat. — ratifié HumanGate 2026-07-18 | Core Rules | entrée, commande, action, ordre |
| **ConfirmPreparation** | Input explicite qui clôt le Preparation State du Player. Le moteur n'utilise AUCUN timer : entrée → transition (un éventuel timer mobile relève de l'interface, jamais du moteur). — ratifié HumanGate 2026-07-18 (QC-5) | Core Rules | ready, end turn, valider, fin de tour |
| **Event** | Fait accompli émis par la Simulation, appartenant à un vocabulaire **fermé** dont le REGISTRE UNIQUE est tenu par les **Core Rules** (P10) ; chaque bible propriétaire définit les payloads de SES Events. Liste close ratifiée — **19 noms** : Spawn, Move, Attack, Cast, Damage, Death, Victory, Heal, Shield, Buff, Debuff (→ Combat) ; MergeTriggered, MergeResolved (→ Core Rules/Decision, QC-3) ; PairingResolved (→ Decision) ; GoldChanged, ShopRolled, UnitBought, UnitSold, PlayerLevelUp (→ Economy, QE-6). Nom hors registre = fail-hard (INV-12). Seule interface entre la Simulation et le Renderer (P2). — ratifié HumanGate 2026-07-18 (gate #3) | Core Rules (registre, P10) / bible propriétaire (payloads) / Technical (format) | événement, message, signal, notification |
| **Event Log** | Journal ordonné des Events produit par la Simulation, consommé par le Renderer, les spectateurs et l'export vidéo (P2). Distinct du journal d'Inputs (qui, lui, sert au Replay). | Technical | journal d'événements, event stream, timeline |
| **Replay** | Reproduction exacte d'un Match = GameState initial + journal d'Inputs, rien d'autre (P1). Rejouer produit le même Event Log, au bit près. | Core Rules (P1) / Technical | rediffusion, enregistrement, VOD |
| **Simulation** | L'exécution déterministe du moteur pur : `GameState → Simulation → Event Log → Renderer` (P2). Le code qui l'implémente est le moteur (« engine », Technical Bible). | Core Rules / Technical | sim, temps réel |
| **Campaign** | Série CONTRÔLÉE de simulations (ex. 10 000 games, seed range, versions de bots, métriques) produisant de la connaissance d'équilibrage (P7) : advisory pour le HumanGate, jamais un gate de merge. Protocole pré-enregistré, pas de tuning post-hoc. — ratifié HumanGate 2026-07-18 (Q7) | Simulation | batch, run de mesure, campagne de test |
| **Bot** | Player automatique occupant un Seat (Q2 : un Bot EST un Player), utilisé en solo et dans les Campaigns. Bot-méta ≠ méta humain : version et force des Bots consignées avec chaque Campaign (P7). | Platform (incarnation) / Decision (politique) | IA (ambigu), NPC, computer player |
| **Renderer** | Lecteur d'événements : il consomme l'Event Log et ne lit **jamais** le GameState (P2). Changer tout le rendu ne change aucun test. L'Oracle garde la Simulation ; le playtest humain garde le Renderer. | Technical / UX-UI / Visual | moteur de rendu, view, frontend, client |
| **Oracle** | Validateur déterministe **non-LLM** (P7) : fixtures + invariants qui produisent le `software_verdict`, gate de merge. Le validateur DSL est lui-même un Oracle (fail-hard). | Oracle | validateur, test suite, checker, juge |
| **Verdict** | Sortie typée de la validation, toujours en trois champs séparés : `software_verdict` (uniquement depuis reçus d'Oracle vérifiés), `evidence_verdict`, `claim_verdict: NO_CLAIM_ALLOWED`. Vocabulaire unique : OK / FAIL / BLOCKED. | Oracle | résultat, statut, rapport, PASS/CONCERNS |
| **DSL** | Langage fermé de définition du contenu (Abilities, Items, Synergies) : whitelist de primitives, aucune échappatoire vers du code arbitraire (P8). Nouvelle primitive = gate HumanGate. Une saison LiveOps = fichiers DSL + fixtures Oracle, zéro changement moteur. | DSL | langage de contenu, script, format de données |
| **HumanGate** | Pierre. Décide merge / reject / freeze — jamais un agent, jamais la Simulation, jamais un Verdict seul. Toute décision de design nouvelle rencontrée dans une bible lui est remontée via le marqueur « QUESTION → Pierre » (convention définie en `00_ARCHITECTURE.md`). | Architecture (00) | gate humain, validation humaine, review |
| **DecisionPoint** | Point de décision automatique du moteur, enregistré dans la Decision Bible sous un identifiant DP-n (DEC-1 : un site de décision dans le code sans DP-n déclaré = défaut fail-hard). État donné → décision unique (DEC-2). — ratifié HumanGate 2026-07-18 | Decision | point de choix, branchement, décision |
| **TieBreakChain** | Chaîne canonique de clés déterministes départageant TOUT ex æquo (DEC-4) : mêmes clés, même ordre, implémentée en un seul endroit du moteur. Jamais de hasard pour les ex æquo (DEC-3). Ordre canonique ratifié (QD-1) : décision stratégique déclarée → priorité de règle → distance Manhattan → initiative de création → `unit_instance_id` → `seat_index`. Principe : l'identité technique garantit l'unicité, jamais une stratégie cachée. — ratifié HumanGate 2026-07-18 | Decision | tie-break local, ordre ad hoc, départage |
| **BotPolicy** | Politique de décision versionnée d'un Bot : fonction déterministe (état visible du Seat → Inputs de la liste close INV-13). La version de la BotPolicy est consignée avec chaque Campaign (P7). — ratifié HumanGate 2026-07-18 | Decision (interface) / Simulation (versions) | IA du bot, stratégie, comportement |

---

## 6. Décisions HumanGate 2026-07-18 (récapitulatif)

Les 7 questions Vocabulary sont TRANCHÉES — source verbatim : `HUMANGATE_2026-07-18_FOUNDATION.md`
(jamais réécrite). Aucune question Vocabulary ouverte.

| # | Décision ratifiée | Entrée concernée |
|---|---|---|
| Q1 | Identifiants canoniques EN ; documentation explicative FR | §0 |
| Q2 | Player = occupant logique d'un Seat (humain, Bot, IA de simulation) ; hiérarchie Lobby → Seat → Player → Army | Player, Seat, Army |
| Q3 | Les deux conservés : Life (ressource du Player/Seat) ET Health (points de vie d'une Unit) | Life, Health |
| Q4 | Merge = action, Star = rang résultant, Level réservé au Player | Merge, Star, Level |
| Q5 | Trait = terme générique chapeau ; catégories Origin et Class | Trait |
| Q6 | Merge canonique ; « fusion » = traduction française admise en prose | Merge |
| Q7 | Campaign = série contrôlée de simulations | Campaign |

Décisions Core Rules reflétées ici (propriétaire : `02_CORE_RULES.md`) : QC-1 Round Resolution,
QC-2 Preparation State, QC-3 Merge automatique + Events MergeTriggered/MergeResolved,
QC-4 GhostBoard, QC-5 ConfirmPreparation, correction INV-13 (liste close des Inputs).

Décisions du gate `HUMANGATE_2026-07-18_DECISIONS.md` (verbatim, jamais réécrit) reflétées ici :
QD-1 ordre canonique du TieBreakChain, QD-3 GhostBoard = snapshot du dernier board validé,
QD-4 Merge (même UnitDefinition + même Star, nouvel `unit_instance_id`), QD-5 Bench,
QD-6 `seat_index` fixe ; ratification des termes DecisionPoint, TieBreakChain, BotPolicy,
Bench, GhostBoard, UnitDefinition, UnitInstance.

Décisions du gate `HUMANGATE_2026-07-18_GATE3.md` (verbatim, jamais réécrit) reflétées ici :
P10 (propriété étanche — registre unique des Events tenu par les Core Rules, entrée Event) ;
QB-9 Events Heal/Shield/Buff/Debuff (« pas davantage ») ; QB-11 Mana (attaque, dégâts reçus,
effets DSL — uniquement) ; QB-15 (passage Vocabulary : oui) ; QB-16 MaxTriggerPerTick ;
QE-4 Interest REJETÉ (synonyme interdit d'Income, aucune entrée) ; QE-6 les 5 Events
économiques ; PairingResolved validé ; nouveaux termes de structure : CombatResult,
TickPipeline.

---

*74 termes canoniques, tous ratifiés ou DRAFT ordinaire.
Toute notion absente de ce document n'a pas encore de nom officiel : l'ajouter ici (DRAFT)
avant de l'employer dans une bible.*
