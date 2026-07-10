# `/forge` — Autonomous Engineering Loop — Design

Date : 2026-07-09
Source : session brainstorming (Pierre + Claude Code), recoupée avec 7 explorations du repo,
recherche web, un red-team Qwen local, et une lecture croisée des conversations GPT + Gemini
de Pierre (« Réévaluation progressive des plans », « Red Teaming pour la Qualité du Code »).
Statut : DESIGN — en attente de revue Pierre. Non commité, non implémenté.

Verdicts (posture) : `software_verdict: N/A_DESIGN_ONLY` · `evidence_verdict: DESIGN_DOC_ONLY` ·
`claim_verdict: NO_CLAIM_ALLOWED`.

---

## 1. Problème

La méthode de Pierre n'est pas appliquée. Pas parce qu'elle est absente — parce qu'elle est
**éparpillée** :

- Elle vit dans sa tête et dans ~37 skills isolés (`/plan`, `/world-scan`, `/smoke-check`,
  `/code-review`, `/gate`…) qu'il faudrait invoquer à la main, dans le bon ordre, à chaque fois.
- Le seul orchestrateur end-to-end qui existe (`lab/chains/kaizen_autoloop.py`) est **verrouillé**
  par un gate ELO hérité du moteur d'échecs Rocky — or Rocky est GELÉ depuis le pivot du 06-07.
  Le pipeline refuse de démarrer sur un critère mort.
- Une couche de plomberie d'orchestration (`autopilot.py`, ~9000 lignes) **ré-implémente à la main**
  ce que Claude Code fournit nativement (subagents, hooks, skills, git worktrees), sans checkpointing
  ni observabilité.

Conséquence, les 3 douleurs déclarées par Pierre :
1. **Dispersion** — commence 5 choses, n'en finit aucune.
2. **Perte du fil** entre sessions.
3. **Pas de preuve** que « ça marche » (l'agent s'auto-valide par complaisance).

## 2. Intention

Compacter la méthode en **un seul skill Claude Code — `/forge`** — qui déroule la chaîne complète,
dans le bon ordre, **en refusant de sauter une étape**, et qui laisse une trace visible + une preuve
à chaque étape. On **réutilise** les briques existantes (dont les « trésors morts » débranchés) et on
**délègue la plomberie à Claude Code natif** plutôt que d'entretenir un orchestrateur maison.

Principe central (convergence GPT + Gemini + Claude) :

> Une tâche n'avance que si elle produit **un artefact, une preuve, un verdict**. Aucun passage
> implicite. Le *runtime* (le skill), pas l'agent, vérifie la présence de l'artefact signé de
> l'étape ; sinon il **gèle**.

Trois invariants doctrinaux non négociables (le différenciateur de Pierre, confirmé en avance sur
l'industrie par la recherche web + non démoli par le red-team Qwen) :

- **L'oracle du résultat est déterministe et non-LLM** (`cargo test`, `pytest`, tests du projet).
  Jamais un LLM-as-judge sur la sortie de test. Le test vert EST le verdict.
- **Le red-team porte sur le PLAN, pas sur l'oracle.** L'adversarial LLM a de la valeur là où il faut
  du jugement (le plan, les hypothèses, le ROI), pas pour re-juger un test déjà tranché.
- **HumanGate reste souverain** : `NO_CLAIM_ALLOWED`, verdict signé HMAC, merge/reject/freeze humain.

## 3. La boucle `/forge`

```
 0  CONTRAT             charter: objectif · hors-scope · critères de succès · actions interdites
 1  PRISME PRODUIT      product_snapshot.md — le produit vu par l'UTILISATEUR (écrans · parcours ·
                        états visibles · règles observables). ZÉRO technique.
 2  WORLD SCAN          recherche web sur produits comparables (découpage, features, pièges)
 3  DÉCOMPO FONCTIONNELLE  rétro-ingénierie du Prisme → arbre Système→Feature→capacité (+preuve attendue)
 4  ARCHITECTURE        features regroupées par responsabilité → modules src/ ·
                        dépendances autorisées/INTERDITES · OWNERSHIP
 5  WIREMAP ISOMORPHE   épouse l'architecture (sections ≡ modules ≡ src/) · 1 entrée/capacité ·
                        preuve + statut · CÂBLÉE AVANT une ligne de code
 6  RED-TEAM archi+wiremap  couplage · évolution · testabilité · ownership · COLLISION · ROI · "prouver?"
 7  BLUEPRINT GATE      décompo + architecture + wiremap gelés ET isomorphes ?  non → retour 1-5
 8  CREATE REPO         la structure physique est une CONSÉQUENCE du blueprint — jamais "au feeling"
 9  BUILD               délégation BORNÉE PAR L'OWNERSHIP (les builders lisent la WireMap) +
                        exécution micro-commits (+ MAJ WireMap si une feature naît/change d'ancrage)
10  ORACLE              déterministe non-LLM, TROIS niveaux :
                        (a) CODE    — les tests passent
                        (b) ARCHI   — dépendances interdites absentes · chaque module a des tests
                        (c) WIREMAP — isomorphe & cohérente (features/fichiers/fonctions/preuves/statut)
                        vert → 11 · rouge → classifie l'échec → retour 9 (max 3)
11  RED-TEAM CODE       sous-agent AVEUGLÉ : spec + code seuls, contexte vierge → "trouve la faille"
12  VERDICT             signé HMAC : software · evidence · claim (+ decision)
13  HUMAN GATE          merge · reject · freeze   (jamais "continue")
14  MÉMOIRE             faits · décisions · pannes → nourrit le re-plan → retour 6
        └─ à chaque étape : nœud du GRAPHE DE CONFIANCE (rouge/orange/vert)
        └─ artefacts dans .forge/ : product_snapshot · featuremap · blueprint · wiremap · verdicts · memory
```

### Contrats par étape (intrant requis → condition de sortie)

| # | Étape | Intrant | Condition de sortie (l'artefact signé) |
|---|---|---|---|
| 0 | Contrat | prompt utilisateur | `charter.yaml` — aucun champ « à définir » |
| 1 | Prisme Produit | charter | `product_snapshot.md` : vue utilisateur · parcours · états visibles · règles observables (ZÉRO technique) |
| 2 | World scan | prisme | section `evidence` : FOUND vs USED sur produits comparables |
| 3 | Décompo fonctionnelle | prisme + scan | `featuremap` : arbre Système→Feature→capacité + preuve attendue par feuille |
| 4 | Architecture | featuremap | `blueprint.yaml` : modules (grappes de features) · deps interdites · ownership |
| 5 | WireMap | blueprint + featuremap | `wiremap` ISOMORPHE (sections ≡ modules) : feature→appel→fichiers→fonction→preuve→statut |
| 6 | Red-team | blueprint + wiremap | rapport d'attaque (couplage/collision/testabilité/ROI) + artefacts ajustés |
| 7 | Blueprint gate | tout gelé | GO / retour 1-5 (Pierre) ; **isomorphisme wiremap↔archi vérifié** |
| 8 | Create repo | blueprint gelé | arborescence physique créée = conséquence du blueprint |
| 9 | Build | wiremap + ownership | code (micro-commits) borné à l'ownership + **wiremap tenue à jour** |
| 10 | Oracle | code + blueprint + wiremap | (a) tests + (b) invariants d'archi + (c) wiremap cohérente ; log evidence |
| 11 | Red-team code | code + logs | rapport multi-angle (technique · utilisateur · adversaire · agentique) |
| 12 | Verdict | rapports | matrice software/evidence/claim(/decision) signée HMAC |
| 13 | Human gate | verdict + graphe | MERGE / REJECT / FREEZE (Pierre) |
| 14 | Mémoire | décision gate | écriture faits/décisions/pannes |

### Le Graphe de Confiance (le « rendu visuel »)

Chaque artefact devient un nœud coloré : `requirement → design → code → test → evidence → claim`.

- **Rouge** = affirmation sans preuve, ou oracle en échec (bloquant).
- **Orange** = code sans test (avertissement).
- **Vert** = tous les parents ont un `evidence_hash` vérifiable et aucun enfant rouge/orange.

Règle de propagation : un nœud ne passe au vert que si ses parents sont verts+prouvés et aucun
enfant n'est rouge. Si le nœud Test est rouge, **le graphe refuse la transition vers le Verdict** —
l'agent ne peut pas déclarer « terminé ». Ce graphe est la carte de confiance affichée dans le
**builder llm-lego** au HumanGate : Pierre n'audite plus le code ligne à ligne, il audite la chaîne
de preuves.

Réutilise directement le **graph-coloring anti-collision** mort d'`autopilot.py` (`_ceo_assign_lanes`),
reciblé de « collision de fichiers » vers « confiance des artefacts ».

## Étape 1 — Prisme Produit (artefact `product_snapshot.md`)

Le **Prisme Produit** décrit le produit **du point de vue utilisateur, comme s'il existait déjà**. Il
répond à une seule question :

> « Si le produit était terminé demain, qu'est-ce que l'utilisateur **verrait**, **ferait** et
> **ressentirait** ? »

C'est l'entrée de toute la rétro-ingénierie : sans lui, l'architecture n'a rien à justifier. Ce n'est
**pas** une capture visuelle — c'est un artefact de conception, `product_snapshot.md`, à **4 sections
obligatoires** :

1. **Vue utilisateur** — les écrans/espaces visibles.
   *(Accueil : Jouer/Paramètres/Boutique · Partie : plateau/timer/chat/bouton son · Boutique :
   liste/prix/acheter.)* → identifie la **surface produit**.
2. **Parcours utilisateur** — les actions principales, en flux.
   *(ouvre le jeu → Jouer → partie → joue un coup → reçoit un son → Paramètres → coupe le son.)* →
   fait apparaître les **comportements nécessaires**.
3. **États visibles** — ce que le produit mémorise/affiche.
   *(Audio : activé/coupé · Joueur : inventaire/monnaie · Partie : plateau/joueur courant.)* →
   prépare la **décomposition système**.
4. **Règles observables** — les règles que l'utilisateur constate.
   *(pas assez d'argent → achat refusé · coup illégal → refusé · le bouton mute conserve son état.)*
   → prépare les **invariants du domaine**.

**Interdits stricts — le Prisme ne contient JAMAIS :** architecture technique, dossiers, noms de
fichiers, classes, fonctions, choix de framework. La séparation des niveaux est stricte :

| Niveau | Même chose, dit à son niveau |
|---|---|
| **Prisme Produit** | « Le joueur peut couper le son. » |
| **Décompo Fonctionnelle** | « Il faut une capacité `Audio / Mute`. » |
| **Architecture** | « Cette capacité appartient au module `audio`. » |
| **Code** | « `AudioManager.toggleMute()`. » |

**Validation avant l'étape 2** (l'agent doit cocher les 5) : le produit est descriptible **sans parler
de code** · les écrans principaux existent · les parcours principaux sont décrits · les états
importants sont identifiés · les règles visibles sont listées. Sortie = un artefact **stable**, entrée
de la rétro-ingénierie (étape 3).

## Étape 3 — Décomposition Fonctionnelle (artefact `featuremap`)

Rétro-ingénierie du Prisme : *« quelles capacités sont nécessaires pour produire cette photo ? »* →
un arbre **Système → Feature → capacité**, chaque **feuille portant sa preuve attendue** (héritée des
Règles observables + Parcours du Prisme). C'est le QUOI *vu de l'intérieur* (le Prisme étant le QUOI
*vu de l'extérieur*).

```
Audio
├── Son de fond      → [jouer, stopper]
└── Mute             → [bouton mute, mémoriser l'état]        preuve: test_mute_conserve_etat
Shop
├── Acheter          → [ouvrir shop, grille, bouton acheter, confirmer, débiter, +inventaire]
└── Vendre           → [bouton vendre, confirmer, +monnaie]
```

La Décompo **seed la colonne Feature de la WireMap** et **justifie l'architecture** : les modules sont
les **grappes de features regroupées par responsabilité**. C'est ce qui rend le découpage du repo
*non arbitraire* et **attaquable** par le red-team (« pourquoi Mute est-il dans le module shop ? »).

## 3ter. Architecture dérivée, gelée, vérifiée (ajout Pierre, 09-07)

L'architecture du repo n'est **jamais** décidée « au feeling » par l'agent au moment de coder. Elle
est un **artefact dérivé du plan** (`blueprint.yaml`), red-teamé puis **gelé** avant qu'un seul
fichier soit créé. On sépare l'**architecture logique** (modules, responsabilités, dépendances
autorisées/interdites) de l'**implémentation physique** (les fichiers) : la structure de fichiers est
une *conséquence* du blueprint, pas un choix improvisé.

Le `blueprint.yaml` porte 4 choses :
- **modules + responsabilités** — un module = une responsabilité claire ;
- **dépendances autorisées et INTERDITES** — ex : `ui → api → engine` autorisé, `ui → engine` interdit ;
- **ownership** — qui possède quel module (voir plus bas) ;
- **proof-contract d'architecture** — quels invariants prouveront que la structure tient.

**Le red-team de l'ARCHITECTURE (≠ red-team du code)** attaque, avant toute création de fichier :
couplage (« pourquoi l'UI connaît le moteur ? »), évolution (« si on ajoute une IA, faut-il tout
réécrire ? »), testabilité (« peut-on tester le moteur sans lancer l'app ? »), ownership, et
**collision** (« deux agents peuvent-ils toucher le même endroit ? »). Il tue les god-objects
(`chess.js` qui devient un god-object) avant qu'ils existent.

**L'oracle a donc DEUX niveaux, tous deux déterministes non-LLM :**
- **Oracle CODE** — les tests passent (le plan `forge-oracle-gate` le couvre déjà).
- **Oracle ARCHITECTURE** — les dépendances interdites sont absentes, chaque module a des tests, les
  frontières d'ownership sont respectées. Techniquement : un import-linter / vérificateur de graphe
  de dépendances (`forge check architecture` → `PASS: domain does not import infrastructure` /
  `FAIL: ui imports database`). C'est le différenciateur de Pierre — l'oracle déterministe — appliqué
  à la **structure**, pas seulement au comportement. Note d'implémentation : côté `scripts/forge/`,
  un oracle d'architecture n'est **qu'une entrée de plus dans `oracles.json`** (une commande qui
  retourne pass/fail) — la brique PROUVER le supporte déjà sans refonte.

**Ownership = la brique graph-coloring ressuscitée, à sa vraie place.** Avant délégation, chaque
module reçoit un propriétaire (`engine-agent owns src/domain/`, `test-agent owns tests/`, `ui-agent
owns src/interface/`). La délégation (étape 7) est **bornée par l'ownership** : un agent ne touche que
ses modules → plus de collision, plus de dérive d'architecture. C'est l'usage concret du
`_ceo_assign_lanes` mort d'`autopilot.py`.

**Le dossier `.forge/`** garde la chaîne de preuve, à la racine du projet cible :
```
.forge/
├── plan.yaml
├── blueprint.yaml
├── oracle.yaml        (code + architecture)
├── verdicts/          (signés HMAC)
└── memory/            (facts / decisions / postmortems = PILOU)
```

**Mise à l'échelle (honnête).** Greenfield (projet neuf) → blueprint complet. **Modification d'un repo
existant** → l'étape 3 n'est pas « réinvente l'architecture » mais « quels modules/propriétaires cette
tâche touche-t-elle, et viole-t-elle une règle du blueprint existant ? » : un *diff* contre
l'architecture en place, red-teamé pour la collision. On ne force pas un doc d'architecture complet
sur un changement d'une ligne.

## 3quater. WireMap — l'index fonctionnel vivant (ajout Pierre, 09-07)

La **WireMap** est la **source de vérité fonctionnelle** : elle relie chaque fonctionnalité attendue
au code qui l'implémente et à la preuve qui la valide. Ce n'est **pas** un diagramme d'architecture
(UML) — c'est un **index de navigation** pour l'humain, les builders et les oracles. Elle vient
**après l'Architecture (étape 5)** parce qu'elle l'**épouse** : elle n'est pas une liste plate mais un
arbre isomorphe au repo.

**Invariant d'isomorphisme (vérifié par l'oracle WireMap) : sections WireMap ≡ modules architecture ≡
dossiers `src/`.** Chaque feature est nichée sous son module ; ses fichiers tombent dans les fichiers
de ce module (converge avec l'ownership §3ter). Conséquences mécaniquement détectables : un dossier
`src/` sans section WireMap = feature non documentée ; une feature sous le mauvais module (le bouton
Mute sous `shop`) = smell d'architecture ; des fichiers hors du module = débordement d'ownership.

```
src/gameplay/   ▸  WireMap › Gameplay          src/audio/   ▸  WireMap › Audio
                     ├─ Déplacer une pièce                       ├─ Jouer un son
                     ├─ Promotion                                ├─ Musique
                     └─ Échec et mat                             └─ Mute
```

> L'idée existait déjà sous forme de « Wire Map » dans le builder llm-lego ; **cette version-ci est la
> canonique** — avec version-fraîcheur, oracle dédié, et mise à jour obligatoire.

**Format minimal** (CSV / JSON / Markdown), une ligne par fonctionnalité :

| Fonctionnalité | Appel principal | Fichiers touchés | Fonction(s) repère | Version | Preuve attendue | Statut |
|---|---|---|---|---|---|---|
| Déplacement des pièces | `Game.movePiece()` | `engine/game.py` | `movePiece()` | v0.1 | `test_move_piece` | TODO |

**La colonne Version = fraîcheur, PAS historique.** Elle date la WireMap par rapport au code. Si le
code est plus récent que la WireMap → celle-ci est **potentiellement obsolète**, à re-vérifier.

**Règle d'or (Pierre) : la WireMap est mise à jour à CHAQUE modification de l'artefact auquel elle est
rattachée.** Une feature créée ou déplacée → la WireMap bouge dans le même geste (étape 9). Un index
qui ment est pire que pas d'index.

**Oracle WireMap** — un **3ᵉ oracle déterministe** (après code et architecture). Côté `scripts/forge/`,
c'est **juste une entrée de plus dans `oracles.json`** : la brique PROUVER déjà livrée le supporte sans
refonte. Il vérifie :
- la fonctionnalité existe dans la WireMap ;
- les fichiers listés existent ;
- les fonctions repères existent encore (détecte les **renommages**) ;
- la preuve attendue existe ;
- le statut est cohérent avec la preuve (`STATUS=DONE` ⇒ la preuve passe).
Il signale : **fonctionnalité manquante · fonction renommée · WireMap obsolète · preuve absente**.

**Discipline builder** : avant d'implémenter, le builder **consulte la WireMap** (quels fichiers, quel
point d'entrée), **borne ses modifications** à ces zones (converge avec l'ownership §3ter), et **met à
jour la WireMap** si une feature naît ou change d'ancrage.

**But final** : un index vivant qui répond en un coup d'œil — *où est implémentée cette feature ? quels
fichiers ? quel point d'entrée ? quelle preuve la valide ? est-ce encore à jour ?* Chaque projet a sa
WireMap dans `.forge/wiremap.*`, rattachée à son artefact (converge avec l'auto-suivi llm-lego).

## 4. PILOU — la mémoire de `/forge` (v0 minimal)

Rocky → **PILOU** (le nom Rocky = confusion « moteur d'échecs », source d'erreur). Mais PILOU
commence **petit** : c'est l'étape 11, pas un organisme distribué.

v0 = **trois fichiers JSON** que `/forge` écrit, indexés par type d'apprentissage :

- `facts.json` — ce qui est vrai (ex : « la dépendance X exige Node 22+ »).
- `decisions.json` — pourquoi un choix a été fait (ex : « event-driven rejeté car < 100 tx/s »).
- `postmortems.json` — **le plus important** : `[hypothèse initiale] → [ce qui a cassé] →
  [règle d'immunisation pour le prochain plan]`.

Chaque entrée porte une **confiance** (0-100) et une source (interne / externe / hypothèse). La
mémoire des pannes nourrit le pre-mortem de l'étape 1 au tour suivant. On branche aussi le
`memory/` auto existant. **On ne passe à une base graphe/vectorielle que si ces JSON font mal — pas
avant.**

## 5. Réutilisation des briques existantes (rien à réinventer)

| Étape `/forge` | Brique existante réutilisée |
|---|---|
| squelette de boucle | `lab/chains/kaizen_autoloop.py` (recall→charter→exec→validate→close→loop) |
| 2 world scan | skill `/world-scan` (recherche web citée → knowledge packet) |
| 3 red-team plan | `_run_idea_pipeline` d'`autopilot.py` (roadmap→RED TEAM→fusion), aujourd'hui court-circuité |
| 5 délégation | subagents Claude Code (Haiku) ; adaptateur Qwen `llm-lego/src/adapters/lmstudio.ts` |
| 7 oracle | `/smoke-check`, `/verify`, `scripts/studio_meta.py` |
| 8 red-team code | subagent en contexte vierge (pattern adversarial-verify) |
| 9 verdict | couche verdict signé HMAC + `/verdict` |
| 10 human gate | `/gate` + `DREAMS.md` |
| graphe confiance | `_ceo_assign_lanes` (graph-coloring) reciblé |
| affichage | builder llm-lego (`/api/execute` + graphe) |

## 5bis. Rapport à superpowers — `/forge` est un orchestrateur MINCE

Superpowers (bibliothèque de skills de process génériques : brainstorming, writing-plans,
test-driven-development, systematic-debugging, requesting/receiving-code-review,
verification-before-completion, dispatching-parallel-agents, subagent-driven-development,
using-git-worktrees, finishing-a-development-branch) couvre **déjà ~70 %** de la chaîne `/forge`.
`/forge` ne doit **rien réécrire de ça** — sinon on refait le piège `autopilot.py` (reconstruire à
la main une couche qui existe).

**`/forge` DÉLÈGUE à superpowers** (rien à coder) :

| Étape `/forge` | Skill superpowers appelé |
|---|---|
| 0-1-3-4 (contrat, plan, red-team plan, plan gate) | brainstorming |
| plan d'implémentation | writing-plans |
| 5 délégation | dispatching-parallel-agents · subagent-driven-development |
| 6 exécution | executing-plans · test-driven-development · using-git-worktrees |
| 7 boucle d'échec oracle | systematic-debugging |
| 8 red-team code | requesting-code-review · receiving-code-review |
| 10 fin de branche | finishing-a-development-branch |

**`/forge` CONSTRUIT réellement — seulement 4 briques** (ce que superpowers n'a pas ; c'est la
valeur propre de Pierre) :

1. **FORCER** — le runtime qui impose les transitions : pas d'artefact signé de l'étape → gel.
   (superpowers *suggère*, ne *bloque* pas.)
2. **PROUVER** — l'oracle déterministe non-LLM par-projet comme gate dur + le verdict signé HMAC
   (software/evidence/claim, `NO_CLAIM_ALLOWED`). (superpowers rappelle de vérifier, sans contrôle.)
3. **SE SOUVENIR** — PILOU : mémoire faits/décisions/pannes qui nourrit le re-plan. (superpowers
   oublie après la tâche.)
4. **MONTRER** — le graphe de confiance rouge/orange/vert. (superpowers n'a rien de visuel.)

Plus 2 branchements d'infra existante : **World Scan** (`/world-scan`) et **délégation économique**
(Qwen/Haiku). Donc `/forge` = 4 briques + un fil qui tisse superpowers dedans, pas 12 étapes à coder.

## 6. Geste préalable — débloquer l'oracle périmé

`studio_meta.py` bloque `kaizen_autoloop` sur un `global_verdict` incluant l'ELO Rocky (gelé). Le
proof-contract de l'étape 1 rend l'oracle **par-projet** : quand `/forge` travaille sur Leviathan,
le gate lance les tests de Leviathan, pas l'ELO d'un moteur d'échecs gelé. Un jeu n'a pas d'ELO.
C'est le vrai déblocage (point soulevé, à juste titre, par le red-team Qwen).

## 7. Explicitement PARQUÉ (et pourquoi)

Issus de la vision GPT (« Adaptive AI Organization Runtime »). Bonnes idées, **mauvais moment** —
c'est le piège « construire un 2ᵉ autopilot » que ce design cherche justement à éviter :

- **Studio Governor / arbitrage de boucles concurrentes** — les boucles concurrentes n'existent pas
  encore : il y a UNE pipeline pas encore câblée. Arbitrer des boucles autonomes = résoudre un
  problème qu'on n'a pas. À reconsidérer si un jour ≥ 5 boucles tournent seules.
- **PILOU comme système cognitif distribué (Neo4j + Qdrant + Kafka)** — sur-ingénierie. Le concept
  est couvert par la triple mémoire (§4). DB seulement si les JSON font mal.
- **Organizational Reinforcement Learning** — hors scope, spéculatif.

Ces éléments restent notés ici comme *horizon*, pas comme *travail*.

## 8. Périmètre v0 (la plus petite version qui marche)

Objectif du premier incrément : **prouver la boucle sur UNE tâche réelle**, pas tout automatiser.

- `/forge` en skill Claude Code natif qui enchaîne les étapes 0→11 en **mode strict** (gate humain
  à l'étape 4 ET 10).
- Étapes 5 (délégation) et 8 (red-team aveuglé) via subagents.
- Étape 7 oracle par-projet (geste §6).
- PILOU = 3 JSON (§4).
- Graphe de confiance : d'abord en sortie texte/markdown ; affichage builder en incrément 2.
- Cible du premier run : un projet vivant (Leviathan ou Chess TCG) — à choisir avec Pierre.

Hors v0 : mode `--unattended`, arbitrage de boucles, PILOU en DB, Studio Governor.

## 9. Isolation / clarté (unités testables)

- **Le skill `/forge`** = l'orchestrateur (contrats de transition). Testable : donner un charter
  incomplet → doit geler à l'étape 0.
- **Le proof-contract / oracle par-projet** = une fonction pure `projet → commande de test`. Testable
  isolément.
- **PILOU (3 JSON)** = lecture/écriture + score de confiance. Testable isolément.
- **Le graphe de confiance** = fonction pure `artefacts → couleurs`. Testable isolément.
- **Le red-teamer aveuglé** = subagent à contexte vierge. Testable : vérifier qu'il ne reçoit PAS le
  raisonnement du builder.

## 10. Décisions (défauts retenus, Pierre a dit « on le fait » le 09-07)

1. Nom du skill : **`/forge`** (défaut retenu ; renommable plus tard sans coût).
2. Premier projet-cible du run de preuve : **Leviathan** (défaut — codebase récente, petite, tests
   vitest déjà présents = idéal pour prouver l'oracle-gate). Corrigeable → Chess TCG.
3. Rocky → **PILOU** : **oui**, au moins pour la couche mémoire (v0 = 3 JSON).
4. Geste §6 (oracle par-projet, touche `studio_meta.py`, zone sensible) : **gate Pierre explicite
   requis** avant toute écriture sur `studio_meta.py` — isolé dans sa propre tâche du plan.
5. `autopilot.py` : gardé en dashboard, **aucune suppression en v0** (extraction progressive).

Ces défauts peuvent être revus à la revue du plan d'implémentation.

---

*Prochaine étape après validation de ce spec : skill writing-plans → plan d'implémentation détaillé.*
