# COMPARATIF — schéma maître vs réel exécuté, et solutions pour les angles morts

Date : 2026-07-27 · Auteur : session Troisième Cerveau · Statut : **PROPOSED — décisions Pierre**.
Référence comparée : `docs/forge/STUDIO_MASTER_SCHEMA.html` (rev 2026-07-26).
Tous les états « réel » sont re-dérivés de sources primaires ce jour (P7). `claim_verdict:
NO_CLAIM_ALLOWED`.

---

## 1. Le constat de cadrage — la moitié avant du schéma n'est pas dans le profil qui produit les jeux

Le schéma décrit une chaîne en deux moitiés :

- **moitié AVANT (former l'exigence)** : s0 charter → s1 Prisme → s2 world scan → s3 décompo →
  s4 archi → s5 wiremap (gel) → s6 red-team du plan ;
- **moitié ARRIÈRE (produire et vérifier)** : s9 build → s10 oracles → s11 red-team code →
  s12 verdict signé.

Fait mesuré (`dispatch.PROFILES`, lu ce jour) :

| profil | étapes | moitié avant ? |
|---|---|---|
| `full` | 13 | **oui, complète** |
| `increment` | 10 | partielle (s3→s6) |
| **`standard`** ← le profil du curriculum, celui de Pong | **5** | **AUCUNE** |
| `patch` / `micro` | 4 / 3 | aucune |

`standard` = `s9-build-standard · s10a · s10s · s11 · s12`. **Aucune étape ne forme
l'exigence.** La wiremap est un squelette écrit à la main (13/13 lignes `decider: null`), et
`_freeze_rules` (driver.py:517) ne se déclenche qu'après `s5-wiremap` — donc **le profil
standard n'a même pas d'événement de gel**. La seule validation de la wiremap est `s10s`, en
mode `frozen="built"` : **après** le build.

**Conséquence directe, non spéculative** : les 3 constats « jamais spécifié » du playtest
(adversaire automatique · vitesse jouable · lisibilité du score) ne pouvaient pas être
attrapés — aucun organe de la chaîne exécutée n'a pour fonction de les faire naître. Nous ne
sommes pas *hors plan* : nous sommes *dans le plan, avec les cibles du plan non construites*,
et le playtest vient de prouver empiriquement pourquoi elles comptent.

---

## 2. Comparatif détail par détail

Légende : le schéma s'auto-étiquette (RÉEL = cartographie du repo · CIBLE = prospectif).

| Détail du schéma | Prévu (étiquette du schéma) | Réel vérifié 2026-07-27 | Écart |
|---|---|---|---|
| **A — Prisme** (5 lectures CEO/GD/Front/Back/Joueur) | 1 agent RÉEL, les 5 lectures = CIBLE | `s1-prisme` **absent du profil standard** ⇒ ne tourne pas du tout pour le curriculum. Décision antérieure assumée (« Prisme ÉTEINT sur Pong→Tetris, intention triviale ») | La lecture **Joueur** — celle qui aurait posé la jouabilité — n'existe nulle part |
| **Coupe B — pyramide** (renvois, pool, escalade) | RÉEL | **Confirmé au travail** sur pong_r2 : s9 relancé (2 tentatives), pool au même tier, escalade impossible car Opus = sommet, chaîne allée au verdict | ✅ conforme |
| **Nomenclature C — flux mémoire** | RÉEL | 5 connecteurs orphelins trouvés cette semaine : `learning_curve` sans lecteur · `forge_brick_proposals` jamais écrit (réparé hier, V4) · findings red-team non pliés · `forge_bible_proposals` jamais utilisé · `spawn_authorized` jamais écrit (0/10) | Le diagramme surestime les arêtes réellement actives |
| **G — 4 sources → RÉCONCILIATION** | CIBLE, « rien de ce schéma n'est codé » (07-22) | **Toujours vrai.** « réconciliation » n'existe que dans des **commentaires** (capabilities.yaml:12, repo_map.yaml:4/96). Les règles qu'elle devait appliquer SONT vérifiées — mais par `s10s`, **après le build**. Seule `CORE` a un support réel (`core_requirements.yaml`) ; `EXPECTED`/`DERIVED`/`ADDITIONS` n'ont aucun producteur | L'angle mort n°1 : la formation d'exigence, et le point de contrôle arrivé **trop tard** |
| **F — boucle d'apprentissage** | 4 compilateurs RÉELS avec trous d'enforcement (P2) ; courbe committée « en attente de son premier run réel » | Le run réel a eu lieu (pong_r2). Mais `learning_curve.jsonl` **n'a aucun lecteur décisionnel** ⇒ par le critère du schéma lui-même (« toute recommandation qui s'arrête avant le maillon 3 est documentaire »), le **maillon 3 (comportement modifié) est rompu** | La boucle mesure et n'agit pas |
| **E — arbre / MCTS workflow** | CIBLE | Rien. **Correctement non commencé** (prématuré) | ✅ pas un angle mort |
| **H — curriculum** | Pong = 1re brique du rail | Pong **FAIL** (verdict signé, 2 oracles rouges) ⇒ le rail n'a pas démarré | Bloqué par les angles morts ci-dessus |
| **H-bis — JALON 0** (4 cases) | bloque tout le rail | **3/4 faites hier** : M1 télémétrie ✅ · s10s→driver ✅ · promotion decision-log ✅ · M01 arbitré (re-mesuré vert, clean pass impossible par mesure seule) | ✅ jalon franchi |
| **I — troisième cerveau** | rôle RÉEL, protocole PROPOSED | Protocole **PROMU au decision-log** hier ⇒ ratifié. Contre-vérification P7 opérationnelle (5 rapports d'agents corrigés en 2 jours) | ✅ conforme |
| **J — calendrier** (séquence 1→4) | 1 M1 · 2 run réel observé · 3 M2/M3 · 4 reprise Pong | 1 ✅ · 2 ✅ (pong_r2) · 3 **non fait** (M2 devenu mesurable : pool_attempts 2, pool_saves 0, escalations_avoided 0) · 4 ✅ fait, FAIL | La séquence a avancé de 3 crans sur 4 |

**Lecture d'ensemble** : la couche **C (pilotage)** et les **instruments** ont beaucoup avancé
(JALON 0 franchi, 4 missions livrées, verdict séparé de l'intégrité). La couche **A
(production)** est bloquée, et les angles morts sont tous situés aux **deux extrémités** de la
chaîne : former l'exigence (avant) et prouver le produit (après). Le milieu — build, retry,
oracles mécaniques, verdict signé — fonctionne.

---

## 3. Les angles morts, classés par ce qu'ils ont réellement coûté

| # | Angle mort | Preuve du coût | Gravité |
|---|---|---|---|
| 1 | **Aucune formation d'exigence en profil standard** (pas de s0/s1, réconciliation non codée, pas d'événement de gel) | 3 des 4 constats playtest = « jamais spécifié » ; 1 run à 13,82 $ dont le résultat était prévisible | **bloquante** |
| 2 | **Aucun oracle produit** (e2e sauté par décision 23-07, s10d jamais branché, captures jamais appelées par un gate) | « verdict vert » ≠ « jeu jouable » ; le jeu n'avait jamais booté en navigateur (2 bugs invisibles pour 50 tests) | **bloquante** |
| 3 | **Findings red-team jamais pliés** dans le verdict | F1 (vitesse) et F6 (exit tautologique) — les deux constats playtest les plus proches — trouvés **avant** le playtest, morts dans un rapport de 14 Ko | **haute, fix bon marché** |
| 4 | **Maillon 3 de la boucle d'apprentissage rompu** (`learning_curve` sans lecteur) | l'usine mesure ses runs et ne change aucun comportement en conséquence | haute |
| 5 | **Point de contrôle du standard arrivé trop tard** (règles vérifiées après build, jamais avant) | budget `game_loop` détecté rouge **après** avoir payé 2 builds Opus | moyenne |
| 6 | **`spawn_authorized` déclaré, jamais écrit** (0 sur 10 dispatches) | maillon d'audit inexistant — cause non mesurée | basse (à vérifier) |

---

## 4. Solutions proposées — graduées, chacune avec son coût et son critère de succès

### Correction de ma proposition d'hier (importante)

`docs/forge/PROPOSAL_BOUCLE_PREUVE_V1.md` accrochait le volet `proof_review` « au gel de la
wiremap ». **C'est inapplicable au profil standard : il n'y a pas d'étape de gel.** La revue
doit donc être **une commande que l'humain lance sur la wiremap écrite à la main, avant de
lancer le run** — ce qui est en réalité plus simple, plus honnête (le rédacteur de la wiremap
EST humain) et moins cher qu'un nouvel agent.

### Les 5 solutions, dans l'ordre de rentabilité

| S | Solution | Ferme | Coût | Critère de succès falsifiable |
|---|---|---|---|---|
| **S1** | **Plier les findings red-team dans le verdict** — `redteam_advisory` cesse d'être vide quand un rapport existe ; les findings deviennent des `humangate_flags` advisory | angle 3 | **~½ j-session** | sur un rejeu de pong_r2, F1 et F6 apparaissent dans le verdict signé |
| **S2** | **`proof_review` — commande pré-run sur la wiremap** (déterministe, non-LLM) : fidélité preuve↔intention · champ structuré `observable_by_player` · densité (lignes couvrables par un run auto) · coût. Rendue au rédacteur humain **avant** de payer un build | angles 1 et 5 | **1-2 j-session** | appliquée à la wiremap Pong actuelle, elle sort les 3 « jamais spécifié » + la preuve infidèle `core.exit` — c'est-à-dire les constats du playtest, sans run |
| **S3** | **Oracle produit** (chemin du rapport C1) : partie auto 10-30 s + captures + logs branchés en gate ; remplace le critère pixel faible et la décision de saut e2e | angle 2 | **2-4 j-session** | un run dont le jeu ne boote pas, ou dont le score n'évolue pas, devient ROUGE mécaniquement |
| **S4** | **Dossier architecte** post-s12 (plieur déterministe) : verdict + mutation par fichier + coûts + findings pliés + delta learning_curve, avec **deux lecteurs nommés** (la revue pré-run suivante, et Pierre) | angles 3, 4 | **1 j-session** | `learning_curve` et les rapports red-team ont chacun un lecteur ; le compte de lecteurs passe de 0 à ≥1 |
| **S5** | **Réactiver la lecture « Joueur »** — la plus petite forme utile : pas les 5 rôles du Prisme, mais **une checklist jouabilité** obligatoire au moment d'écrire une wiremap de jeu temps réel (vitesse jouable · adversaire ou mode solo · lisibilité de l'état · sortie fonctionnelle · condition de fin) | angle 1, versant produit | **~½ j-session** (c'est une liste, pas un agent) | aucune wiremap de jeu temps réel ne passe la revue S2 sans ces 5 lignes renseignées ou explicitement `n_a` |

**Séquence recommandée** : S1 + S5 d'abord (≈1 jour, ferment les deux angles les moins chers
et les plus liés au playtest) → S2 (la revue qui rend l'arbitrage possible avant de payer) →
S3 (l'oracle produit, le plus gros morceau, mais c'est lui qui rend « jouable » mesurable) →
S4 (referme la boucle vers l'architecte). Ensuite seulement : relancer Pong, dont le verdict
aura enfin une signification produit.

**Ce qui reste délibérément non proposé** : coder la RÉCONCILIATION complète du Détail G
(gros, et S2 en capte l'essentiel du bénéfice au dixième du coût) · ressusciter les 5 lectures
du Prisme (S5 en capte la valeur produit sans agent) · l'arbre MCTS du Détail E (prématuré,
et le schéma le sait) · toucher au milieu de la chaîne, qui fonctionne.

### Décisions attendues de Pierre

D-1 go S1 · D-2 go S2 (et son champ `observable_by_player`) · D-3 go S3 (= D-A du rapport
d'allègement : remplacer la décision de saut e2e) · D-4 go S4 · D-5 go S5 · D-6 mise à jour du
schéma maître : les étiquettes de Détail G et Nomenclature C doivent porter l'état réel mesuré
ici (aujourd'hui elles surestiment les arêtes actives).
