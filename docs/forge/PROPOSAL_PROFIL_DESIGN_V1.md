# PROPOSITION — Le profil `design` : transformer une wiremap V1 en V2 avant de payer un build

Date : 2026-07-27 · Auteur : session Troisième Cerveau · Statut : **PROPOSED — décisions Pierre**.
Origine : analyse de Pierre du 2026-07-27 (« la Forge répond bien à *construis-moi un jeu*, mal
à *est-ce qu'on construit le bon jeu ?* »). Tous les faits ci-dessous sont re-dérivés du journal
d'audit signé et des contrats (P7). `claim_verdict: NO_CLAIM_ALLOWED`.

---

## 1. Le fait qui change la nature du chantier

Ton diagnostic est juste, avec **une correction qui le rend meilleur** : la moitié conception
n'est pas non fonctionnelle — elle a fonctionné, puis elle a été **abandonnée par un choix de
profil**.

Compté sur `dispatch_audit.jsonl` (198 lignes, 37 runs, 2026-07-10 → 2026-07-27) — piège
d'instrument à connaître : le champ `event` n'existe que sur les lignes récentes, un filtre
dessus efface les 30+ runs anciens :

| étape | dispatches | derniers runs |
|---|---|---|
| `s9-build` | 35 | — |
| `s3-decompo` | 14 | — |
| **`s6-redteam-plan`** | **14** | chesscolor · collect_runner · breakout · shmup_slice · auto_battler ×3 · **card_engine (07-20)** |
| `s4-archi` | 8 | idem (8 runs) |
| `s5-wiremap` | 8 | idem |
| `s0-contrat` | 8 | — |
| `s1-prisme` | 6 | jusqu'à card_engine (07-20) |
| `s2-worldscan` | 6 | jusqu'à card_engine (07-20) |

**Le retour red-team → architecte que tu dis avoir été prévu a réellement tourné 8 fois**, et
son contrat porte littéralement « **RE-ENTRÉE de la boucle** » dans son objectif
(`s6-redteam-plan.yaml:30-32`). Il a été perdu le **2026-07-22**, quand le profil `standard` a
été créé pour le curriculum avec 5 étapes — la moitié arrière seulement. Depuis, aucun jeu du
rail ne passe par la conception : 0 dispatch de s0→s6 sur `pong_r2`.

**Conséquence pour le chantier** : il ne s'agit pas de construire quatre boucles neuves. Trois
des quatre existent, ont tourné, et ont produit des jeux vérifiés (card_engine accepté et
commité). Le travail est du **re-câblage + une re-spécification + une seule création**.

---

## 2. Tes quatre boucles, confrontées au réel

| Boucle demandée | État réel vérifié | Ce qu'il faut faire |
|---|---|---|
| **Design Review** — que manque-t-il, qu'est-ce qui se contredit, quelle hypothèse n'a jamais été vérifiée | **`s6-redteam-plan` EXISTE**, 8 runs. Attaque le plan (failles, angles morts, décisions). Reviewer indépendant (Qwen local, `redteam_reviewer`) | **Re-câbler** + ajouter le volet manquant : « hypothèse jamais vérifiée » comme champ structuré |
| **World Research** — pratiques du genre, difficulté, onboarding, équilibrage, UX, pièges connus, synthèse réutilisable | **`s2-worldscan` EXISTE**, 6 runs · skill `/world-scan` · `knowledge_base/` comme dépôt · packets routés en `mandatory_read` de s3/s4 (renforcement R6) | **Re-câbler** + exiger que la synthèse entre en bibliothèque (aujourd'hui advisory) |
| **Gameplay Review** — courbe de difficulté, stratégie dominante, blocage possible, boucle de récompense, durée d'une partie | **N'EXISTE PAS.** Aucune étape, aucun contrat, aucune ligne de wiremap ne pose ces questions | **CRÉER** — la seule création réelle du chantier. C'est aussi ce que le playtest a prouvé le plus cher |
| **Architecture Review** — brique existante ou nouvelle, API réutilisable, studio ou seulement ce jeu | **`s4-archi` EXISTE mais avec le MAUVAIS MANDAT** — vérifiable dans son texte : objectif = `blueprint.yaml` (modules · deps autorisées/interdites · ownership · invariants). **Zéro mention** de la bibliothèque, de la réutilisation de briques, d'une API transverse, ou du studio | **RE-SPÉCIFIER** — ton « architecte du dépôt » contre l'architecte UML actuel. Ton diagnostic est confirmé par le contrat lui-même |

---

## 3. Le Prisme — l'infrastructure multi-points-de-vue est déjà construite

Deux faits :

- **Le contrat s1 n'a qu'UN point de vue** : « réalisateur qui décrit le produit FINI », sortie
  `product_snapshot.md`. Les 5 lectures (CEO/GD/Front/Back/Joueur) du schéma sont une **CIBLE**
  jamais entrée dans le contrat.
- **Mais `scripts/forge/prisme/merge_prisme.mjs` EXISTE** : recombinaison **mécanique** de N
  sorties de panel, **aucun LLM-arbitre** (« exactement le risque qu'un LLM-arbitre non outillé
  recréerait »), union des règles par critère de charter cité + **détection explicite des GAP**
  (un critère que personne ne couvre est remonté tel quel, marqué non couvert, jamais deviné).

Donc ajouter tes deux profils n'est pas construire un panel : c'est **donner deux lentilles de
plus à une machine qui les attend**.

Et tes deux profils corrigent une taxonomie que je crois fausse : `Front`/`Back` est un
découpage d'application web qui a fui dans un studio de jeux. `Programmeur Gameplay`
(mécaniques, difficulté, game feel, progression, exploits) et `Programmeur Runtime` (moteur,
perfs, adaptateurs Godot/Web, événements réels, simulation, dépendances) sont les rôles que le
domaine réclame.

**Prérequis gratuit non fait** : `source_role` par ligne produite (idée du 2026-07-22, jamais
implémentée — `grep source_role scripts/forge/prisme/*.mjs` = vide). Sans lui, impossible de
mesurer plus tard **quelle lentille apporte réellement de la diversité** (ton expérience de
diversité des rôles). Il coûte quelques lignes maintenant, il est irrécupérable après coup.

---

## 4. L'architecte du dépôt — comment le rendre mesurable et pas rhétorique

Tes quatre questions deviennent des **champs structurés** du contrat (doctrine ratifiée :
aucune décision dans un commentaire), et trois des quatre ont une **résolution mécanique** :

| Question | Champ | Résolution |
|---|---|---|
| Cette fonctionnalité existe-t-elle déjà en brique ? | `brick_lookup: {query, matches[]}` | **mécanique** — recherche dans `knowledge_base/`. ⚠️ à surveiller : les 5 requêtes KB historiques ont toutes rendu `matchCount: 0` — l'outil tourne et ne trouve rien, à instruire avant de s'y fier |
| Nouvelle brique ou enrichir l'existante ? | `brick_decision: {new\|extend, target, raison}` | décision déclarée, revue par s6 |
| Cette API servira-t-elle un RPG / auto battler / jeu de cartes ? | `cross_game_api: {claim, jeux_cibles[]}` | déclarative, mais **falsifiable plus tard** : le jeu suivant l'importe-t-il ? |
| Améliore-t-on le studio ou seulement ce jeu ? | — | **mécanique, et déjà instrumenté** : `reuse_ratio` (import réel de briques) + dépôt de brique via `propose_brick` (branché hier par V4). Un run qui n'enrichit pas la bibliothèque le dit dans ses chiffres |

C'est ce qui rend ton « le builder pense au jeu, l'architecte pense au studio » **mesurable** :
la réussite de l'architecte n'est plus une intention, c'est `reuse_ratio` + brique déposée.

---

## 5. La forme proposée : un profil `design` qui ne produit AUCUN code

`PROFILES` accepte déjà des profils spécialisés (`review` = 1 étape, `artbible` = 1 étape). Je
propose :

```
design = s2-worldscan · s1-prisme(N lentilles) · sX-gameplay-review · s4-archi(re-spécifié) · s6-redteam-plan
```

**Sortie du profil : une wiremap V2 + un dossier de conception. Zéro ligne de code produite,
zéro build payé.** Il réutilise intégralement la porte, l'audit HMAC, le driver, les retries.

Pourquoi un profil séparé plutôt que rallonger `standard` : la wiremap du curriculum est écrite
**à la main** et il n'existe **aucun événement de gel** en standard (`_freeze_rules` ne se
déclenche qu'après `s5`, absent du profil). La conception est donc une phase **par jeu**, pas
par run — la lancer une fois produit une V2 qui sert ensuite à tous les runs et à tous les
retries. Rallonger `standard` ferait repayer la conception à chaque tentative de build.

### Le garde-fou anti-théâtre (le point le plus important)

Ces cinq étapes sont des revues LLM. Elles **proposent**, elles ne jugent jamais : les oracles
restent déterministes et non-LLM (ADR-002 intact). `s6` fonctionne déjà exactement ainsi.

**Critère falsifiable de la boucle entière, à poser AVANT de la lancer** :

> wiremap V2 ≠ wiremap V1, **et chaque ligne du diff est attribuable à une critique nommée**
> (`source_role` ou boucle d'origine).

Si la boucle produit un diff vide, ou un diff que personne ne peut rattacher à une critique,
c'est du théâtre de conception et il faut la requalifier — pas la durcir. C'est ta règle de
variance des métriques appliquée à un processus au lieu d'une mesure.

Mesure de valeur, gratuite parce que rétroactive : **appliquer le profil `design` à la wiremap
Pong actuelle**. Si le dossier de conception ressort l'adversaire manquant, la vitesse
injouable, la lisibilité du score et le quitter infidèle — c'est-à-dire tes quatre constats de
playtest — la boucle est démontrée sur un cas où la vérité est déjà connue. **Coût : un run de
conception, aucun build.** C'est le test le moins cher et le plus concluant disponible.

---

## 6. Coûts et séquence

| # | Lot | Contenu | Coût |
|---|---|---|---|
| 1 | **Gameplay Review** | 1 contrat neuf : difficulté · stratégie dominante · blocage · boucle de récompense · durée de partie · exploits. Questions obligatoires quel que soit le jeu | 1 j-session |
| 2 | **Architecte du dépôt** | re-spécification de `s4-archi` + les 4 champs structurés + branchement `brick_lookup` sur la KB | 1 j-session |
| 3 | **Profil `design`** | entrée dans `PROFILES` + enchaînement + sortie wiremap V2 & dossier | ½ j-session |
| 4 | **Prisme 2 lentilles** | `gameplay_programmer` + `runtime_programmer` dans le contrat s1 et le registry, servies à `merge_prisme` (existant) | ½-1 j-session |
| 5 | **`source_role` + diff attribué** | le champ + la mesure V1→V2 (le garde-fou anti-théâtre) | ½ j-session |
| 6 | **World Research en bibliothèque** | la synthèse de genre devient une entrée KB citable, plus un packet advisory | ½ j-session |

**Total ≈ 4-4,5 jours-session**, dont **1 seule création** (lot 1) — le reste est du re-câblage
et de la re-spécification de choses qui ont déjà tourné.

**Séquence recommandée** : 5 d'abord (le garde-fou avant la machine, sinon on ne pourra pas
juger la machine) → 1 → 2 → 3 → 4 → 6. Puis le **test rétroactif sur Pong** avant tout nouveau
build.

**Articulation avec les solutions du comparatif** : S1 (plier les findings red-team) devient
prioritaire — sans elle, les critiques du profil `design` mourraient comme F1 et F6. S2
(`proof_review` pré-run) reste complémentaire : le profil `design` améliore la wiremap, S2
vérifie que sa stratégie de preuve tient. S3 (oracle produit) reste indispensable côté aval :
la conception ne remplace pas la preuve que le jeu tourne.

## 7. Ce que je ne propose pas

Coder la RÉCONCILIATION du Détail G (les 4 sources) — le profil `design` en capte le bénéfice
par des étapes qui existent déjà · ressusciter `Front`/`Back` (taxonomie fausse pour un studio
de jeux) · faire des revues des juges (les oracles restent seuls juges) · rallonger `standard`
(ferait repayer la conception à chaque retry) · l'arbre MCTS du Détail E (prématuré).
