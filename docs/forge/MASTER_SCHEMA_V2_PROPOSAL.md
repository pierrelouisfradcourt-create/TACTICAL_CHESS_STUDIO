# MASTER_SCHEMA_V2_PROPOSAL — refonte de la représentation canonique de la Forge

**Date** : 2026-07-30 · **Statut** : PROPOSED (aucune application, aucun commit)
**Portée** : proposition de réorganisation de `docs/forge/STUDIO_MASTER_SCHEMA.html`. Le fichier HTML n'a **pas** été modifié par cette mission.
**Cadrage Pierre (verbatim)** : « on a ajouté une couche de documentation par-dessus l'ancien schéma au lieu de faire évoluer la représentation du système. Ne pas empiler une nouvelle couche. Ne pas créer un "Détail L" qui devient un patch permanent. »

**Convention de marquage** : `[M]` mesuré/vérifié contre le dépôt · `[H]` hypothèse · `[E]` estimation.
`claim_verdict: NO_CLAIM_ALLOWED`

---

## 0. Ce qui a été vérifié pour écrire ce document

| vérification | commande / ancre | résultat |
|---|---|---|
| Structure complète du HTML | `grep -n '<h3\|MISE À JOUR' STUDIO_MASTER_SCHEMA.html` | 17 blocs de premier niveau, 12 sections `h3`, **pas de Détail D**, ordre A·B·C·**F·E**·G·H·H-bis·I·J·K·L [M] |
| Chaîne réelle | `scripts/forge/dispatch.py:53-67` (`ORDER`, 13 étapes) et `:123-182` (`PROFILES`, 8 profils) | `standard_godot` = **5 étapes** ; `full` = 13 [M] |
| Distribution des profils | `PLAN_CONVERGENCE_FORGE_V1.md` §1.2 | 16× `standard_godot` · 3× `standard` · 3× `patch` · 1× `full` · 1× `artbible` (24 runs) [M] |
| Store de leçons | `find . -name lessons.jsonl` | **0 fichier sur disque** [M] |
| Store d'événements d'échec | `find . -name failure_events.jsonl` | **0 fichier sur disque** (producteur CV-14 câblé `driver.py:840`, jamais déclenché) [M] |
| Fouille KB | `knowledge_base/search_log.jsonl` | 5 lignes, `matchCount:0` ×5, dernière du **2026-07-20** [M] |
| Panel Prisme | `run_real.py:34,1086-1095` · `panel.py` | code présent, activé par `--charter`, hors porte de contrat [M] |
| Gel des règles v2 | `static_oracles.py:728-745` (`frozen_features_from_wiremap`) | branche `schema_version == 2` présente — CV-3 réellement livré [M] |
| Garde d'absence de gel | `driver.py:949-967` (`_check_wiremap_frozen_presence`) | écrit `humangate_notes`, **advisory, ne gate pas** [M] |
| Producteur failure_event | `driver.py:720-741` + appel `:840` dans `_halt_step` | branché, best-effort, `etape_detection` seul [M] |
| Pool | `driver.py:62`, appel `:2107` | câblé, déclencheur `oracle_fail` [M] |
| Modules absents | `ls scripts/forge/` | **pas de `calibration.py`** — la calibration N=3 n'est pas un composant de code [M] |

---

# 1. Audit de la représentation actuelle

## 1.1 Inventaire des sections

| # | Section (ligne) | Ce qu'elle prétend décrire | Verdict | Preuve |
|---|---|---|---|---|
| 1 | Cartouche `rev. 2026-07-26` (l.30-38) | version + légende 2 couleurs | **CONTRADICTOIRE** | La révision affichée est **07-26** alors que le document porte des blocs et une section datés **07-30** (l.62, l.1072). Le tampon de version n'a pas été touché : c'est la trace mécanique de l'accrétion [M] |
| 2 | Barre de vues (l.40-43) | navigation vers VUE 2 contrats | **V2 réel** — à garder tel quel | — |
| 3 | ⚠ MISE À JOUR 2026-07-20 (l.45-51) | changelog de 6 vérifications | **HISTORIQUE** | Contenu déjà absorbé ou périmé : « profil `increment` nouveau », « mission Forge V2 lancée » — 10 jours et 3 campagnes plus tard |
| 4 | ⚠ MISE À JOUR 2026-07-26 (l.53-60) | changelog consolidation git + D1→D6 | **HISTORIQUE** | Décrit des commits (`ffd0703`, `954ca38`) et un état de branches ; aucune information de structure |
| 5 | ⚠ MISE À JOUR 2026-07-30 (l.62-77) | changelog du dégel CV-3/4/8/9/14/15/16/19 | **HISTORIQUE** (le fond est V2 réel, le format est un changelog) | 15 lignes de `<br>` en tête de carte : un lecteur neuf lit un journal de nuit avant de voir un seul schéma |
| 6 | VISION A·B·C (l.79-85) | vision studio Production / Forge / Pilotage | **V2 réel** mais **CONTRADICTOIRE de nommage** | Le bloc dit lui-même (l.80) : « les lettres des schémas ci-dessous restent les vues **historiques** ; la vision studio est celle-ci ». Deux systèmes de lettres A/B/C coexistent et ne désignent pas la même chose [M] |
| 7 | **Détail A · Le PRISME** (l.88-146) | le Prisme, 5 lectures, 4 sources d'exigence | **CONTRADICTOIRE** (3×) | voir §1.2 |
| 8 | **Coupe B · La pyramide** (l.149-263) | la chaîne complète fouille→web→pool→HumanGate | **V1 seulement** | Elle dessine la chaîne `full` (13 étapes, `dispatch.py:53`). `full` a tourné **1 fois sur 24** ; `standard_godot` (16/24) ne contient ni Prisme, ni worldscan, ni wiremap, ni s6 [M]. La carte principale décrit le chemin le moins emprunté |
| 9 | ↳ encart « ★ TABLE DES BILANS (HYPOTHÈSE) » dans la SVG de B (l.246-250) | dépôt de bilans multi-LLM | **DOIT DISPARAÎTRE DES VUES PRINCIPALES** | Une hypothèse explicitement étiquetée `HYPOTHÈSE` est **dessinée dans la carte d'architecture**, avec flèches. `lab/reports/bilans/` : aucun consommateur [M] |
| 10 | **Nomenclature C · Flux mémoire** (l.265-357) | qui lit / qui écrit quoi | **V2 réel partiel + CONTRADICTOIRE** | Décrit des flux mémoire vivants ; le Détail K (l.1043-1046) et le Détail L §7 (l.1124-1130) **annulent** 7 puis 2 de plus de ces flèches (« connecteurs orphelins »). La correction vit 800 lignes plus bas que la carte qu'elle corrige |
| 11 | **Détail F · Boucle d'apprentissage** (l.359-391) | 4 compilateurs d'actifs, R1-R9, état 26-07 | **CONTRADICTOIRE** | Présente la boucle comme `EXISTE` avec 4 compilateurs ; le Détail L §7 (l.1124) dit « le store officiel de leçons `lessons.jsonl` **n'existe pas sur disque** ». Vérifié : **aucun `lessons.jsonl` nulle part** [M]. Deux sections du même document, verdicts opposés |
| 12 | **Détail E · L'ARBRE (MCTS)** (l.393-457) | MCTS sur l'espace des workflows | **CIBLE / à archiver hors canon** | Le texte se qualifie lui-même : « rasoir V2 : comportement futur changé — non démontré ». Aucun code. Placé **avant** G/H/K qui, eux, décrivent le réel : l'ordre du document ne trie pas réel/cible |
| 13 | **Détail G · Le STANDARD, 4 sources** (l.459-578) | réconciliation d'exigences → squelette | **CIBLE assumée** (bandeau l.460 : « rien de ce schéma n'est codé ») | Statut consolidé : `DOCUMENTED_ONLY — producteur absent, validateur présent` (`check_line_states`, plan §1.1). 120 lignes de SVG pour un mécanisme non codé, au même rang visuel que les vues réelles |
| 14 | **Détail H · Le CURRICULUM** (l.580-739) | arbre de compétences des jeux | **V2 réel, mais périmé** + **CONTRADICTOIRE avec K** | l.588 : « le run Pong est **HALTED** … Pong ◐ EN COURS ». l.1054-1057 (Détail K) : « **PONG = TÉMOIN GELÉ** … le jeu boote en navigateur réel, 72 tests exit 0 ». Le même objet a deux états dans le même document [M]. Ni l'un ni l'autre ne mentionne Snake, pourtant livré (nœud 2) |
| 15 | **Détail H-bis · File d'attente calibrée** (l.741-927) | jalons, différés, décisions en attente | **V2 réel** mais **c'est du pilotage, pas de l'architecture** | Contenu = DEFERRED.md + MISSION_M1 + RUN_INDEX. 186 lignes de SVG qui **dupliquent** trois fichiers vivants, donc périment dès qu'ils bougent |
| 16 | **Détail I · Troisième cerveau** (l.929-974) | couche C, rôles Pierre / 3e cerveau / Forge | **V2 réel** — doctrine, pas topologie | Aucun SVG : c'est un texte de doctrine dans un document de schémas |
| 17 | **Détail J · Calendrier studio** (l.976-1007) | séquence opérationnelle | **HISTORIQUE (périmé)** | l.995 : « Séquence opérationnelle actuelle (état au **2026-07-26**) : 1. go Pierre exécution M1 … 4. Pong à re-passer sous standard ». Le bloc de tête 07-30 (l.75) désigne **Breakout V2** comme campagne suivante. **Deux « prochaines étapes » contradictoires** [M] |
| 18 | **Détail K · Boucle de fabrication + 5 règles** (l.1009-1070) | 6 grandes flèches, 5 règles d'usine, corrections U-9 | **V2 réel** (les 5 règles) **+ CORRECTIF** (le bloc U-9) | Les 5 règles d'usine sont de la doctrine durable → doivent vivre en tête. Le bloc « CORRECTIONS D'ÉTIQUETTES » (l.1037-1051) est un **patch textuel sur les vues A/C/G** : exactement le mode de panne dénoncé |
| 19 | **Détail L · MàJ 2026-07-30** (l.1072-1141) | 8 sous-blocs de corrections | **DOIT DISPARAÎTRE** — c'est le patch permanent nommé par Pierre | Son titre est littéralement `MISE À JOUR 2026-07-30`. Il contient de la **vérité neuve et importante** (profils réels, statuts PASSIVE, mesures `[M]`) qui devrait **modifier les vues**, pas s'ajouter après elles |

**Compte** : sur 19 blocs — 4 historiques, 2 cibles, 1 hypothèse dessinée dans la carte, 5 contradictoires, 1 patch de patch (L corrige K qui corrige A/C/G).

## 1.2 Le cas du Prisme — quatre descriptions incompatibles du même objet

| où | ce qui est dit | statut impliqué |
|---|---|---|
| Détail A, note l.146 | « L'INTENTION traverse le PRISME (s1) … **aujourd'hui 1 agent Opus** » | actif, mono-modèle |
| Détail A, SVG l.101-113 | 5 rôles en **ambre** (= cible) | pas encore construit |
| Détail K l.1047 | « `s1-prisme` est **absent du profil `standard`** ⇒ la moitié conception … **abandonnée par choix de profil** le 22-07 » | mort par configuration |
| Détail L §6 l.1107-1112 | « Le panel Prisme est **PASSIVE** : code présent et câblé … (a) contourne la porte de contrat, (b) mono-modèle, (c) n'écrit nulle part de consommable » | code vivant, sorties orphelines |

**Réel vérifié** [M] : `s1-prisme` ∈ `ORDER` (`dispatch.py:55`) donc ∈ `PROFILES["full"]` **uniquement** ; `full` = 1 run sur 24 ; `panel.py` n'est atteint que via `run_real.py --charter` (`:1086`), hors porte de contrat. Les trois contrats de lentille (`s1-prisme-lens-{archidepot,gamedesign,gameplayprog}.yaml`) existent et n'appartiennent à aucun profil.

**Un lecteur neuf ne peut pas trancher** : les quatre affirmations sont dans le même fichier, aucune ne dit qu'elle remplace les autres.

## 1.3 Le mécanisme de la dérive, nommé

Trois symptômes mécaniques, tous vérifiables :

1. **Le tampon de version ne suit pas le contenu** (`rev. 2026-07-26` l.32 vs section datée 07-30 l.1072). Quand on ajoute par la fin, on ne touche jamais la tête.
2. **Les corrections sont plus bas que ce qu'elles corrigent** (K corrige A/C/G ; L corrige K, A, B, C). La distance lecteur→vérité croît à chaque session.
3. **Deux vocabulaires de statut coexistent sans passerelle** : la légende du cartouche (l.34-35) n'a que **2 états** — cyan `EXISTE (câblé/prouvé)` / ambre `CIBLE` — alors que le Détail L et le plan de convergence utilisent **6 états** (IMPLEMENTED / TESTED / PASSIVE / DOCUMENTED_ONLY / BLOCKED / UNKNOWN). `PASSIVE` — code réel, jamais exercé — **n'est représentable dans aucune vue** : il finit peint en cyan (faux : ça ne tourne pas) ou en ambre (faux : c'est écrit et testé). C'est la cause structurelle des contradictions du §1.2.

---

# 2. Verdict sur la question centrale

> « Si quelqu'un découvre la Forge aujourd'hui, est-ce que le schéma lui explique réellement comment elle fonctionne ? »

**Non — sur 5 questions, 0 réponse correcte et sans contradiction, 2 réponses partielles.**

### Q1 · « Que se passe-t-il quand je lance `/forge` ? »

**Réponse du document : NON, et trompeuse.** La seule vue qui répond est **Coupe B**, qui dessine la chaîne à 13 étapes. La notion de **profil** — le seul paramètre qui détermine réellement ce qui va tourner — n'apparaît dans **aucune vue** : elle est mentionnée en prose dans le bloc 07-20 (l.48, `increment`) et dans le Détail L §1 (l.1074-1079). Réel [M] : `/forge` sur le curriculum lance `standard_godot` = **5 étapes** (`s9-build-godot-standard` → `s10a` → `s10s` → `s11` → `s12`, `dispatch.py:175-181`). Un nouvel arrivant qui lit Coupe B attend un Prisme, un world scan, une wiremap et une red-team de plan : **aucun des quatre ne tourne**.

### Q2 · « Qui décide qu'un jeu est bon ? »

**Réponse : PARTIELLE, éclatée sur 4 endroits.** Coupe B montre la fondation `HUMANGATE — PIERRE` (l.257-259) : correct. Mais la chaîne de preuve qui alimente cette décision est décrite en morceaux : oracles s10a/b/c dans Coupe B ; `s10s` (6 sondes) **seulement** en texte dans Détail L §1 ; l'`ORACLE PRODUIT` 7 volets et la couche `BIBLE` (`check_genre_coverage`) **seulement** en texte dans Détail K (l.1049-1050), signalés comme « NOUVEAU, absent des vues précédentes » — et jamais ajoutés aux vues depuis. Le caractère **advisory** de la red-team (invariant ADR-002) n'est pas lisible dans la vue.

### Q3 · « Où va une erreur ? »

**Réponse : NON.** Aucune vue ne porte le chemin d'échec. Détail F décrit une boucle d'apprentissage `EXISTE` ; Détail L §7 dit que le store de leçons n'existe pas. Vérifié [M] : `lessons.jsonl` **absent du disque**, `failure_events.jsonl` **absent du disque** (le producteur CV-14 existe et est testé — `driver.py:840` — mais n'a jamais été déclenché en réel). La bonne réponse aujourd'hui est : *une erreur s'arrête à `_halt_step`, écrit une ligne de télémétrie HALT et un `failure_event` dans le run dir ; elle ne remonte à aucune leçon sans geste humain*. Le document ne dit ni cela, ni le contraire — il dit les deux.

### Q4 · « Qu'est-ce qui est prouvé, qu'est-ce qui est une intention ? »

**Réponse : NON.** La légende à 2 couleurs ne peut pas exprimer `PASSIVE` (§1.3). Conséquence mesurable : le Prisme est cyan dans une vue, ambre dans une autre, et déclaré PASSIVE dans un texte. Idem pour le Pool (`IMPLEMENTED + TESTED, jamais exercé` — plan §1.1) qui est dessiné plein cyan dans Coupe B.

### Q5 · « D'où vient la connaissance réutilisée, où va celle produite ? »

**Réponse : PARTIELLE et optimiste.** Nomenclature C dessine les flux mémoire. Le débit réel [M] : fouille KB **5 requêtes, 5× zéro résultat, figée au 2026-07-20** ; **78 % du catalogue jamais réutilisé** (25/32) ; `pending_review → apply_decisions` sans appelant en production jusqu'au 30-07 (`--apply` jamais exécuté) ; `learning_curve.jsonl` journal-only. Ces cinq faits sont dans le Détail L §7 — **après** la carte qu'ils invalident.

---

# 3. Proposition de structure nouvelle

## 3.1 Principe directeur

> **Le canon décrit un état, jamais une trajectoire.**
> Une carte n'a pas de changelog. Si une information est vraie aujourd'hui, elle **modifie une vue**. Si elle raconte comment on y est arrivé, elle sort du canon.

## 3.2 Que deviennent les 3 blocs `⚠ MISE À JOUR` ?

**Ils disparaissent du canon. Un seul fichier d'historique les recueille.**

- Création de `docs/forge/STUDIO_MASTER_SCHEMA_HISTORY.md` — journal antéchronologique, une entrée par révision : date · ce qui a changé dans le système · quelles vues ont été modifiées · commits/preuves citées. Les 3 blocs y sont transposés **tels quels** (aucune perte : c'est un déplacement, pas une suppression).
- Le canon ne garde qu'**une ligne dans le cartouche** : `rev. AAAA-MM-JJ · historique des révisions : STUDIO_MASTER_SCHEMA_HISTORY.md`.

**Argument** — trois raisons, dont deux mécaniques :
1. **Un changelog en tête inverse la priorité de lecture.** Aujourd'hui, les 33 premières lignes visibles d'une carte d'architecture sont un journal de nuit. Le lecteur neuf paie l'historique avant d'atteindre le premier schéma.
2. **Un changelog ne périme jamais, donc il s'accumule structurellement.** Une vue, elle, se corrige en place : sa taille est bornée par le système décrit. Trois blocs en 10 jours, sans qu'aucun n'ait jamais été retiré, est la démonstration expérimentale du problème.
3. **Le tampon de version prouve que la tête n'est plus maintenue** (`rev. 2026-07-26` sur un document du 30). Réduire la tête à une seule ligne datée rend son oubli impossible à masquer.

**Ce que l'historique doit garder et que le canon perd volontairement** : les numéros de commit, les mesures d'un jour donné (« 1287 → 1321 tests »), les décisions en cours de ratification, les tensions signalées non arbitrées. Rien de tout cela n'est de l'architecture.

## 3.3 Que deviennent les Détails A → L ?

| section actuelle | destination | opération |
|---|---|---|
| Détail A · Prisme | **V1 · Architecture actuelle** | Fusion. Le Prisme devient **un composant avec statut `PASSIVE`** dans le flux, plus une vue à lui. Les 4 sources d'exigence partent en **Annexe CIBLE** avec G |
| Coupe B · Pyramide | **V1 · Architecture actuelle** | Remplacée. Le nouveau flux est **profil-conscient** : le chemin réellement parcouru est plein, les étapes hors profil courant sont grisées avec la mention du profil qui les contient |
| ↳ « ★ TABLE DES BILANS (HYPOTHÈSE) » | **Annexe CIBLE** | Retirée de la SVG principale. Une hypothèse ne se dessine pas dans une carte |
| Nomenclature C · Flux mémoire | **V3 · Ce que l'usine apprend** | Fusion + purge : les 9 connecteurs orphelins recensés par K et L sont **supprimés de la carte** (une flèche sans lecteur n'est pas une flèche) ou tracés en pointillé `ORPHELIN` explicite |
| Détail E · MCTS | **Annexe CIBLE** | Déplacée. Auto-étiquetée « non démontré » |
| Détail F · Boucle d'apprentissage | **V2 · Où vit la preuve** + **V3** | Éclatée : les 4 compilateurs et R1-R9 vont en V2/V3 avec leur statut réel ; « l'état 2026-07-26 » part en historique |
| Détail G · 4 sources → squelette | **Annexe CIBLE** | Déplacée, inchangée. Bandeau conservé |
| Détail H · Curriculum | **V3 · Ce que l'usine apprend** | Conservée comme vue (c'est le seul objet vraiment arborescent), **état de chaque nœud re-vérifié** — la contradiction Pong HALTED / TÉMOIN GELÉ tranchée en une seule mention, Snake ajouté |
| Détail H-bis · File d'attente | **V4 · Ce qui attend une décision** | Fusion avec I et J. **La SVG de 186 lignes est supprimée** : elle duplique `DEFERRED.md` / `RUN_INDEX.md` / `MISSION_M1`. Remplacée par une table courte qui **référence** ces fichiers |
| Détail I · Troisième cerveau | **V4** | Fusion. Doctrine, pas topologie |
| Détail J · Calendrier | **V4** | Fusion. La « séquence opérationnelle » périmée est **supprimée**, pas corrigée : elle vit dans `studio_brain/00_CURRENT_CONTEXT.md` |
| Détail K · 5 règles d'usine | **V0 · Comment lire + invariants** | Les **5 règles d'usine + l'invariant « producteur avant validateur »** montent en tête : ce sont les lois du système, pas un détail n° 11 |
| ↳ K · bloc « CORRECTIONS D'ÉTIQUETTES » U-9 | **DISPARAÎT** | Chaque correction est appliquée **dans la vue concernée**. Un correctif qui survit à son application est une couche |
| Détail L · MàJ 07-30 | **DISPARAÎT** | §1 (profils) et §6 (PASSIVE) → **V1** · §2 (reference guard, calibration) → **V2** · §3 (routage) → renvoi en V0 · §4 (invariant) → **V0** · §5 (Breakout) → historique/contexte courant · §7 (mesures `[M]`) → **annotations dans les vues** · §8 (UNKNOWN) → statuts dans les vues |

## 3.4 Structure cible — 5 vues maximum

```
STUDIO_MASTER_SCHEMA.html   (canon — un état, jamais une trajectoire)
│
├─ CARTOUCHE          rev. AAAA-MM-JJ · → HISTORY.md · → VUE 2 contrats
│
├─ V0 · COMMENT LIRE — invariants et vocabulaire de statut
│     Q: « à quoi je peux me fier dans ce document ? »
│     · légende des 6 statuts (remplace les 2 couleurs)
│     · 5 règles d'usine + « producteur avant validateur »
│     · renvois : routage → INFERENCE_ORCHESTRATOR_V2_PROPOSAL.md
│
├─ V1 · FORGE V2 — ARCHITECTURE ACTUELLE          ← LA vue d'entrée
│     Q: « que se passe-t-il quand je lance /forge ? »
│     Intent → Charter → KB → Orchestration(profil) → Builders →
│     Validation/Oracles → HumanGate → FailureEvent → Lessons → KB
│
├─ V2 · OÙ VIT LA PREUVE
│     Q: « qui décide qu'un jeu est bon, et sur quoi ? »
│     oracles s10a/s10s · mutation · solvabilité · oracle produit ·
│     genre bible · red-team ADVISORY · verdict HMAC · verify_run ·
│     reference guard · gel des règles · calibration
│
├─ V3 · CE QUE L'USINE APPREND
│     Q: « d'où vient ce qui est réutilisé, où va ce qui est produit ? »
│     curriculum (ex-H) · catalogue KB · fouille · reuse_ratio ·
│     learning_curve · lessons · flux mémoire purgés (ex-C)
│
├─ V4 · CE QUI ATTEND UNE DÉCISION
│     Q: « qu'est-ce qui est bloqué, et sur quoi ? »
│     rôles Pierre/3e cerveau/Forge (ex-I) · files d'attente (ex-H-bis)
│     — table courte qui RÉFÉRENCE DEFERRED.md / RUN_INDEX.md
│
└─ ANNEXE · CIBLES NON CONSTRUITES  (repliée, jamais dans le flux de lecture)
      réconciliation 4 sources (ex-G) · MCTS (ex-E) · table des bilans
```

**Pourquoi 5 et pas 12** : chaque vue répond à **une question de lecteur**. Une information qui ne répond à aucune de ces cinq questions n'a pas sa place dans le canon — c'est le test d'entrée.

## 3.5 La vue V1 — composants et statuts vérifiés

Vocabulaire de statut (6 états, remplace la légende à 2 couleurs) :

| statut | définition opérationnelle | rendu |
|---|---|---|
| `IMPL+TEST` | code présent, tests verts, **exercé en réel** | cyan plein |
| `IMPL` | code présent et testé, **jamais exercé en réel** | cyan trait fin |
| `PASSIVE` | code présent et câblé, **hors du profil courant** ou sorties sans consommateur | cyan pointillé + libellé |
| `DOC` (`DOCUMENTED_ONLY`) | décrit et parfois validé, **aucun producteur** | ambre pointillé |
| `BLOCKED` | dépend d'un maillon manquant nommé | rouge pointillé |
| `UNKNOWN` | non audité | gris |

| composant | statut | ancre de vérification |
|---|---|---|
| Intent / Charter `s0-contrat` | `PASSIVE` sur le profil courant | ∈ `ORDER` seul → `full` (1/24 runs) — `dispatch.py:54,124` [M] |
| Prisme `s1-prisme` + `panel.py` | `PASSIVE` | `dispatch.py:55` (full only) ; `run_real.py:1086` hors porte de contrat [M] |
| 3 lentilles contractualisées | `PASSIVE` | contrats 17 champs présents, **aucun profil** ne les contient [M] |
| World scan `s2` | `PASSIVE` | `full` uniquement — 1 run (`shmup_slice`) [M] |
| KB — catalogue | `IMPL` | 32 entrées, **25 jamais réutilisées** (plan §1.1) [M] |
| KB — fouille `search.mjs` | `PASSIVE` | `search_log.jsonl` : 5 requêtes, **5× `matchCount:0`**, figé au 20-07 ; `check_search_consulted` advisory (`driver.py:1056`) [M] |
| Knowledge Resolver `pending_review→apply_decisions` | `IMPL` (appelant posé 30-07, `--apply` jamais exécuté) | câblage `/gate` ; dry-run 10 décisions / 0 conflit [M] |
| WireMap — cœur (modèle, validation, nav) | `IMPL+TEST` | plan §1.1 ; `wiremap_nav.mjs` + tests [M] |
| WireMap — **étape dans le profil courant** | `BLOCKED` (absente) | `standard`/`standard_godot` n'ont **aucune** étape wiremap ; Snake = contrat ad hoc `wm1` hors profil [M] |
| Réconciliation 4 sources | `DOC` | validateur `check_line_states` présent, **producteur absent** ; `merge_prisme.mjs:85` sans appelant [M] |
| Gel des règles `wiremap_frozen` | `IMPL+TEST` | branche v2 `static_oracles.py:728-745` (CV-3) [M] |
| Garde d'absence de gel | `IMPL` **advisory** | `driver.py:949-967` → `humangate_notes`, ne gate jamais [M] |
| Orchestration / dispatch (profils) | `IMPL+TEST` | `dispatch.py:123-182`, 8 profils [M] |
| Porte de contrat (fail-closed) | `IMPL+TEST` | `.claude/settings.json:39` → `pretool_forge_guard.py` [M] |
| Builders `s9-build-godot-standard` | `IMPL+TEST` | 16 runs [M] |
| Pool best-of-N | `IMPL` (jamais exercé) | `driver.py:62,2107` ; déclencheur `oracle_fail` jamais vrai [M] |
| Escalade haiku→sonnet→opus | `IMPL` — **builders seulement** | `escalate.py` ; aucun autre étage n'escalade [M] |
| Oracle code `s10a` (+mutation, e2e, solvabilité) | `IMPL+TEST` | `driver.py:_run_code_oracle` [M] |
| Oracle STANDARD `s10s` (6 sondes) | `IMPL+TEST` | `standard_oracles.py` ; hors `full` [M] |
| Oracle produit / genre bible | `IMPL` | `product_oracle.py`, `product_oracle_godot.py`, `check_genre_coverage` [M] |
| Red-team `s11` | `IMPL` — **ADVISORY, jamais juge** | invariant ADR-002 [M] |
| Red-team plan `s6` | `PASSIVE` | `full` uniquement, jamais sur le curriculum [M] |
| Verdict signé `s12` + `verify_run` | `IMPL+TEST` | `verdict.py`, `verify_run.py` [M] |
| Reference Guard | `IMPL` **advisory** | `reference_guard.py` + `driver.py:349-386` — détecte, n'empêche pas [M] |
| Calibration (bande de difficulté, N=3) | `DOC` | **aucun module** `calibration.py` dans `scripts/forge/` ; N=3, bande ~20 % [M] |
| HumanGate — Pierre | `HUMAIN` (hors échelle de statut) | invariant ADR-002 |
| FailureEvent (producteur) | `IMPL+TEST` — **jamais déclenché** | `driver.py:720-741`, appelé `:840` ; **`failure_events.jsonl` absent du disque** [M] |
| Lessons (store) | `BLOCKED` | **`lessons.jsonl` inexistant sur disque** ; seule mémoire injectée = fallback legacy `forge_error_journal.jsonl` [M] |
| `learning_curve.jsonl` | `IMPL` **journal-only** | producteur sans lecteur, documenté `LEARNING_CURVE_README.md` [M] |

## 3.6 Principe anti-accrétion (la règle à graver en V0)

> **RÈGLE D'ENTRÉE DU CANON — trois clauses, mécaniquement vérifiables :**
>
> **1. Toute nouveauté modifie une vue existante, ou elle n'entre pas.**
> Aucune section ne peut être créée pour porter une mise à jour. Si une information neuve ne trouve pas de vue à corriger, c'est qu'elle ne décrit pas ce système — elle va dans son document propre.
>
> **2. L'historique vit ailleurs, et une seule date vit ici.**
> `STUDIO_MASTER_SCHEMA_HISTORY.md` porte le « comment on en est arrivé là ». Le canon porte `rev. AAAA-MM-JJ`. Aucun bloc daté dans le corps.
>
> **3. Un correctif ne survit pas à son application.**
> Un bloc « corrections d'étiquettes » est la preuve que la correction n'a pas été faite. On corrige l'étiquette, on supprime le correctif.
>
> **Corollaire de nombre** : 5 vues maximum. Une 6ᵉ vue exige de prouver qu'aucune des 5 questions de lecteur ne couvre son contenu — sinon elle fusionne.
>
> **Test d'acceptation à chaque révision** (30 s, à faire avant de fermer le fichier) : reposer les 5 questions du §2. Si une réponse demande de lire deux sections, la révision n'est pas finie.

---

# 4. Code HTML+SVG de la vue V1 — prêt à insérer

Conventions respectées : conteneur `.bp` existant · `h3` (l.20 du style) · `div.note` (l.22) · `code` cyan (l.23) · palette `--cyan #59cbff` / `--amber #ffb454` / `--muted #83a6d6` / `--ink #d3e6ff` / `--human #ff8098` (l.10-11) · SVG `viewBox` + `font-family="monospace"` · markers `id` uniques préfixés `v1` (aucune collision avec `a/aa/bc/ba/br/cc/ca/cr/ec/ea/er/gc/ga/gr/hc/ha/qc/qa/qr`). Le statut est écrit **en toutes lettres** à côté de chaque nom.

```html
  <!-- ============================================================ V1 =========== -->
  <h3>V1 · FORGE V2 — ARCHITECTURE ACTUELLE (« que se passe-t-il quand je lance /forge ? »)</h3>

  <div class="note" style="border:1px solid #59cbff;border-radius:6px;padding:8px 11px;margin-bottom:8px">
    <b style="color:#fff">LIRE CETTE VUE</b> — le chemin <b>plein</b> est celui qu'un run parcourt réellement aujourd'hui
    (profil <code>standard_godot</code>, <b>16 runs sur 24</b>). Les composants <b>pointillés</b> existent en code mais ne sont
    <b>pas dans ce profil</b> : ils portent le nom du profil qui les contient. Statut écrit à côté de chaque nom —
    <span style="color:#59cbff">IMPL+TEST</span> exercé en réel ·
    <span style="color:#59cbff">IMPL</span> testé jamais exercé ·
    <span style="color:#59cbff">PASSIVE</span> câblé hors profil ou sans consommateur ·
    <span style="color:#ffb454">DOC</span> aucun producteur ·
    <span style="color:#ff8098">BLOCKED</span> maillon manquant nommé.
  </div>

  <svg viewBox="0 0 1180 780" xmlns="http://www.w3.org/2000/svg" font-family="monospace">
    <defs>
      <marker id="v1c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#59cbff"/></marker>
      <marker id="v1a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#ffb454"/></marker>
      <marker id="v1r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#ff8098"/></marker>
    </defs>

    <!-- ---------- BANDE 1 : AMONT (hors profil courant) ---------- -->
    <text x="30" y="26" fill="#83a6d6" font-size="9.5">① AMONT — CONCEPTION · aucune de ces étapes n'est dans le profil courant</text>
    <rect x="30" y="34" width="1120" height="118" rx="8" fill="rgba(255,180,84,.04)" stroke="rgba(130,190,255,.22)" stroke-dasharray="5 4"/>

    <rect x="46" y="52" width="180" height="52" rx="6" fill="rgba(89,203,255,.10)" stroke="#59cbff" stroke-width="1.6"/>
    <text x="58" y="70" fill="#fff" font-size="10.5" font-weight="700">INTENT · PIERRE</text>
    <text x="58" y="84" fill="#83a6d6" font-size="8.5">demande produit</text>
    <text x="58" y="96" fill="#ff8098" font-size="8.5">HUMAIN — hors échelle</text>

    <line x1="226" y1="78" x2="256" y2="78" stroke="#59cbff" stroke-width="1.6" marker-end="url(#v1c)"/>

    <rect x="258" y="52" width="190" height="52" rx="6" fill="rgba(89,203,255,.06)" stroke="#59cbff" stroke-dasharray="5 3"/>
    <text x="270" y="70" fill="#d3e6ff" font-size="10.5" font-weight="700">CHARTER · s0-contrat</text>
    <text x="270" y="84" fill="#83a6d6" font-size="8.5">charter.yaml · check_charter</text>
    <text x="270" y="96" fill="#59cbff" font-size="8.5">PASSIVE — profil « full » (1/24)</text>

    <line x1="448" y1="78" x2="478" y2="78" stroke="#59cbff" stroke-width="1.2" stroke-dasharray="5 3" marker-end="url(#v1c)"/>

    <rect x="480" y="52" width="200" height="52" rx="6" fill="rgba(89,203,255,.06)" stroke="#59cbff" stroke-dasharray="5 3"/>
    <text x="492" y="70" fill="#d3e6ff" font-size="10.5" font-weight="700">PRISME · s1 (panel.py)</text>
    <text x="492" y="84" fill="#83a6d6" font-size="8.5">5 lectures · 3 lentilles sous contrat</text>
    <text x="492" y="96" fill="#59cbff" font-size="8.5">PASSIVE — hors porte de contrat</text>

    <line x1="680" y1="78" x2="710" y2="78" stroke="#59cbff" stroke-width="1.2" stroke-dasharray="5 3" marker-end="url(#v1c)"/>

    <rect x="712" y="52" width="180" height="52" rx="6" fill="rgba(89,203,255,.06)" stroke="#59cbff" stroke-dasharray="5 3"/>
    <text x="724" y="70" fill="#d3e6ff" font-size="10.5" font-weight="700">WORLD SCAN · s2</text>
    <text x="724" y="84" fill="#83a6d6" font-size="8.5">patterns externes cités</text>
    <text x="724" y="96" fill="#59cbff" font-size="8.5">PASSIVE — 1 run (shmup)</text>

    <line x1="892" y1="78" x2="922" y2="78" stroke="#ffb454" stroke-width="1.2" stroke-dasharray="5 3" marker-end="url(#v1a)"/>

    <rect x="924" y="46" width="210" height="64" rx="6" fill="rgba(255,180,84,.08)" stroke="#ffb454" stroke-dasharray="6 3"/>
    <text x="936" y="64" fill="#ffdca6" font-size="10.5" font-weight="700">RÉCONCILIATION</text>
    <text x="936" y="77" fill="#ffdca6" font-size="10.5" font-weight="700">D'EXIGENCES (4 sources)</text>
    <text x="936" y="90" fill="#83a6d6" font-size="8.5">validateur check_line_states présent</text>
    <text x="936" y="102" fill="#ffb454" font-size="8.5">DOC — producteur absent (annexe)</text>

    <text x="46" y="128" fill="#83a6d6" font-size="8.5">Conséquence lisible : sur le profil qui tourne 16 fois sur 24, la moitié CONCEPTION n'est pas parcourue — le charter est écrit à la main, en amont du run.</text>
    <text x="46" y="143" fill="#83a6d6" font-size="8.5">WIREMAP (cœur : modèle · validation · nav) = <tspan fill="#59cbff">IMPL+TEST</tspan> — mais <tspan fill="#ff8098">AUCUNE étape wiremap dans standard/standard_godot</tspan> : Snake est passé par un contrat ad hoc (wm1), hors profil.</text>

    <!-- ---------- BANDE 2 : CONNAISSANCE ---------- -->
    <text x="30" y="180" fill="#83a6d6" font-size="9.5">② CONNAISSANCE — ce que l'usine sait déjà (consulté par les builders)</text>
    <rect x="30" y="188" width="1120" height="88" rx="8" fill="rgba(89,203,255,.03)" stroke="rgba(130,190,255,.22)"/>

    <rect x="46" y="204" width="240" height="56" rx="6" fill="rgba(89,203,255,.10)" stroke="#59cbff" stroke-width="1.4"/>
    <text x="58" y="222" fill="#fff" font-size="10.5" font-weight="700">CATALOGUE KB</text>
    <text x="58" y="236" fill="#83a6d6" font-size="8.5">knowledge_base/ · 32 entrées</text>
    <text x="58" y="250" fill="#59cbff" font-size="8.5">IMPL — [M] 25/32 jamais réutilisées</text>

    <rect x="302" y="204" width="250" height="56" rx="6" fill="rgba(89,203,255,.06)" stroke="#59cbff" stroke-dasharray="5 3"/>
    <text x="314" y="222" fill="#d3e6ff" font-size="10.5" font-weight="700">FOUILLE · search.mjs</text>
    <text x="314" y="236" fill="#83a6d6" font-size="8.5">check_search_consulted (advisory)</text>
    <text x="314" y="250" fill="#59cbff" font-size="8.5">PASSIVE — [M] 5 requêtes, 5× 0 résultat</text>

    <rect x="568" y="204" width="250" height="56" rx="6" fill="rgba(89,203,255,.06)" stroke="#59cbff" stroke-dasharray="5 3"/>
    <text x="580" y="222" fill="#d3e6ff" font-size="10.5" font-weight="700">KNOWLEDGE RESOLVER</text>
    <text x="580" y="236" fill="#83a6d6" font-size="8.5">pending_review → apply_decisions</text>
    <text x="580" y="250" fill="#59cbff" font-size="8.5">IMPL — appelant /gate ; --apply = geste Pierre</text>

    <rect x="834" y="204" width="300" height="56" rx="6" fill="rgba(255,128,152,.07)" stroke="#ff8098" stroke-dasharray="5 3"/>
    <text x="846" y="222" fill="#d3e6ff" font-size="10.5" font-weight="700">LEÇONS (pré-mortem)</text>
    <text x="846" y="236" fill="#83a6d6" font-size="8.5">injection pré-mortem : fallback legacy seul</text>
    <text x="846" y="250" fill="#ff8098" font-size="8.5">BLOCKED — [M] lessons.jsonl absent du disque</text>

    <!-- ---------- BANDE 3 : EXÉCUTION (le chemin réel) ---------- -->
    <text x="30" y="304" fill="#59cbff" font-size="9.5">③ EXÉCUTION — LE CHEMIN RÉELLEMENT PARCOURU · profil standard_godot = 5 étapes (dispatch.py:175)</text>
    <rect x="30" y="312" width="1120" height="180" rx="8" fill="rgba(89,203,255,.05)" stroke="#59cbff" stroke-width="1.4"/>

    <rect x="46" y="330" width="200" height="64" rx="6" fill="rgba(89,203,255,.14)" stroke="#59cbff" stroke-width="2"/>
    <text x="58" y="349" fill="#fff" font-size="11" font-weight="700">ORCHESTRATION</text>
    <text x="58" y="363" fill="#83a6d6" font-size="8.5">dispatch.py · 8 profils</text>
    <text x="58" y="376" fill="#83a6d6" font-size="8.5">porte de contrat fail-closed</text>
    <text x="58" y="388" fill="#59cbff" font-size="8.5">IMPL+TEST</text>

    <line x1="246" y1="362" x2="276" y2="362" stroke="#59cbff" stroke-width="2" marker-end="url(#v1c)"/>

    <rect x="278" y="330" width="210" height="64" rx="6" fill="rgba(89,203,255,.14)" stroke="#59cbff" stroke-width="2"/>
    <text x="290" y="349" fill="#fff" font-size="11" font-weight="700">BUILDERS · s9</text>
    <text x="290" y="363" fill="#83a6d6" font-size="8.5">s9-build-godot-standard</text>
    <text x="290" y="376" fill="#83a6d6" font-size="8.5">escalade haiku→sonnet→opus</text>
    <text x="290" y="388" fill="#59cbff" font-size="8.5">IMPL+TEST — 16 runs</text>

    <rect x="278" y="406" width="210" height="46" rx="6" fill="rgba(89,203,255,.05)" stroke="#59cbff" stroke-dasharray="5 3"/>
    <text x="290" y="423" fill="#d3e6ff" font-size="10" font-weight="700">POOL best-of-N</text>
    <text x="290" y="435" fill="#83a6d6" font-size="8.5">déclencheur : oracle_fail</text>
    <text x="290" y="447" fill="#59cbff" font-size="8.5">IMPL — [M] jamais déclenché en réel</text>

    <line x1="488" y1="362" x2="518" y2="362" stroke="#59cbff" stroke-width="2" marker-end="url(#v1c)"/>

    <rect x="520" y="322" width="250" height="150" rx="6" fill="rgba(89,203,255,.12)" stroke="#59cbff" stroke-width="2"/>
    <text x="532" y="341" fill="#fff" font-size="11" font-weight="700">VALIDATION · ORACLES</text>
    <text x="532" y="357" fill="#d3e6ff" font-size="9">· s10a code + mutation + e2e</text>
    <text x="532" y="370" fill="#d3e6ff" font-size="9">&nbsp;&nbsp;+ solvabilité — <tspan fill="#59cbff">IMPL+TEST</tspan></text>
    <text x="532" y="386" fill="#d3e6ff" font-size="9">· s10s STANDARD, 6 sondes</text>
    <text x="532" y="399" fill="#83a6d6" font-size="8.5">&nbsp;&nbsp;line_states·placement·collisions</text>
    <text x="532" y="411" fill="#83a6d6" font-size="8.5">&nbsp;&nbsp;index·contract_completeness·budget</text>
    <text x="532" y="423" fill="#59cbff" font-size="8.5">&nbsp;&nbsp;IMPL+TEST</text>
    <text x="532" y="439" fill="#d3e6ff" font-size="9">· s11 red-team — <tspan fill="#ffb454">ADVISORY</tspan></text>
    <text x="532" y="452" fill="#83a6d6" font-size="8.5">&nbsp;&nbsp;jamais juge du code (ADR-002)</text>
    <text x="532" y="465" fill="#83a6d6" font-size="8.5">· gel des règles v2 — <tspan fill="#59cbff">IMPL+TEST</tspan> · garde d'absence advisory</text>

    <line x1="770" y1="362" x2="800" y2="362" stroke="#59cbff" stroke-width="2" marker-end="url(#v1c)"/>

    <rect x="802" y="330" width="200" height="64" rx="6" fill="rgba(89,203,255,.14)" stroke="#59cbff" stroke-width="2"/>
    <text x="814" y="349" fill="#fff" font-size="11" font-weight="700">VERDICT SIGNÉ · s12</text>
    <text x="814" y="363" fill="#83a6d6" font-size="8.5">HMAC · verify_run re-vérifie</text>
    <text x="814" y="376" fill="#83a6d6" font-size="8.5">software ≠ evidence ≠ claim</text>
    <text x="814" y="388" fill="#59cbff" font-size="8.5">IMPL+TEST</text>

    <rect x="802" y="406" width="200" height="46" rx="6" fill="rgba(89,203,255,.05)" stroke="#59cbff" stroke-dasharray="5 3"/>
    <text x="814" y="423" fill="#d3e6ff" font-size="10" font-weight="700">REFERENCE GUARD</text>
    <text x="814" y="435" fill="#83a6d6" font-size="8.5">écart au GAME_REFERENCE</text>
    <text x="814" y="447" fill="#59cbff" font-size="8.5">IMPL — advisory, n'empêche pas</text>

    <line x1="1002" y1="362" x2="1032" y2="362" stroke="#ff8098" stroke-width="2" marker-end="url(#v1r)"/>
    <rect x="1034" y="330" width="100" height="64" rx="6" fill="rgba(255,128,152,.14)" stroke="#ff8098" stroke-width="2"/>
    <text x="1084" y="352" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">HUMAN</text>
    <text x="1084" y="366" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">GATE</text>
    <text x="1084" y="381" text-anchor="middle" fill="#83a6d6" font-size="8">PIERRE — seul</text>
    <text x="1084" y="391" text-anchor="middle" fill="#83a6d6" font-size="8">décideur</text>

    <!-- calibration, en marge de la validation -->
    <rect x="520" y="480" width="250" height="0" />

    <!-- ---------- BANDE 4 : RETOUR (la boucle d'amélioration) ---------- -->
    <text x="30" y="520" fill="#83a6d6" font-size="9.5">④ RETOUR — ce qu'un run laisse derrière lui (la boucle d'amélioration)</text>
    <rect x="30" y="528" width="1120" height="112" rx="8" fill="rgba(130,190,255,.03)" stroke="rgba(130,190,255,.22)"/>

    <rect x="46" y="548" width="240" height="72" rx="6" fill="rgba(89,203,255,.08)" stroke="#59cbff" stroke-dasharray="5 3"/>
    <text x="58" y="567" fill="#fff" font-size="10.5" font-weight="700">FAILURE EVENT</text>
    <text x="58" y="581" fill="#83a6d6" font-size="8.5">producteur sur _halt_step</text>
    <text x="58" y="593" fill="#83a6d6" font-size="8.5">driver.py:840 · best-effort</text>
    <text x="58" y="607" fill="#59cbff" font-size="8.5">IMPL+TEST — [M] jamais déclenché</text>
    <text x="58" y="617" fill="#83a6d6" font-size="8">failure_events.jsonl absent du disque</text>

    <line x1="286" y1="584" x2="322" y2="584" stroke="#ff8098" stroke-width="1.4" stroke-dasharray="5 3" marker-end="url(#v1r)"/>
    <text x="290" y="576" fill="#ff8098" font-size="8">curation humaine</text>

    <rect x="324" y="548" width="240" height="72" rx="6" fill="rgba(255,128,152,.07)" stroke="#ff8098" stroke-dasharray="5 3"/>
    <text x="336" y="567" fill="#fff" font-size="10.5" font-weight="700">LESSONS</text>
    <text x="336" y="581" fill="#83a6d6" font-size="8.5">écriture jamais ascendante</text>
    <text x="336" y="593" fill="#83a6d6" font-size="8.5">(doctrine 4 couches)</text>
    <text x="336" y="607" fill="#ff8098" font-size="8.5">BLOCKED — lessons.jsonl inexistant</text>
    <text x="336" y="617" fill="#83a6d6" font-size="8">seule mémoire injectée : fallback legacy</text>

    <line x1="564" y1="584" x2="600" y2="584" stroke="#ffb454" stroke-width="1.4" stroke-dasharray="5 3" marker-end="url(#v1a)"/>

    <rect x="602" y="548" width="250" height="72" rx="6" fill="rgba(89,203,255,.08)" stroke="#59cbff" stroke-dasharray="5 3"/>
    <text x="614" y="567" fill="#fff" font-size="10.5" font-weight="700">RETOUR AU CATALOGUE KB</text>
    <text x="614" y="581" fill="#83a6d6" font-size="8.5">promotion de brique · reuse_ratio</text>
    <text x="614" y="593" fill="#83a6d6" font-size="8.5">learning_curve.jsonl : journal-only</text>
    <text x="614" y="607" fill="#59cbff" font-size="8.5">PASSIVE — promotion en file d'attente</text>
    <text x="614" y="617" fill="#83a6d6" font-size="8">cause mesurée des 5 fouilles à zéro</text>

    <rect x="868" y="548" width="266" height="72" rx="6" fill="rgba(89,203,255,.08)" stroke="#59cbff" stroke-dasharray="5 3"/>
    <text x="880" y="567" fill="#fff" font-size="10.5" font-weight="700">CALIBRATION (bande de difficulté)</text>
    <text x="880" y="581" fill="#83a6d6" font-size="8.5">N=3 échantillons · bande ~20 %</text>
    <text x="880" y="593" fill="#83a6d6" font-size="8.5">aucun module scripts/forge/calibration.py</text>
    <text x="880" y="607" fill="#ffb454" font-size="8.5">DOC — jamais un seuil dur</text>
    <text x="880" y="617" fill="#83a6d6" font-size="8">règle de variance : prouver l'info avant d'en faire un gate</text>

    <!-- boucle de retour vers la connaissance -->
    <path d="M735 548 C 735 512 300 512 300 276" fill="none" stroke="#ffb454" stroke-width="1.4" stroke-dasharray="6 4" marker-end="url(#v1a)"/>
    <text x="470" y="506" fill="#ffb454" font-size="8.5">↺ amélioration suivante — cette flèche est la RAISON D'ÊTRE de l'usine, et c'est la plus faible du système</text>

    <!-- HumanGate est la fondation : renvoi -->
    <path d="M1084 394 L1084 660 L60 660 L60 636" fill="none" stroke="#ff8098" stroke-width="1.3" stroke-dasharray="6 4" marker-end="url(#v1r)"/>
    <text x="600" y="674" text-anchor="middle" fill="#ff8098" font-size="9">↺ ratifie / rejette / gèle — aucune écriture durable (ledger · catalogue · decision-log) sans ce geste</text>

    <!-- bandeau de lecture -->
    <rect x="30" y="692" width="1120" height="68" rx="8" fill="rgba(255,128,152,.07)" stroke="#ff8098" stroke-width="1.4"/>
    <text x="46" y="712" fill="#fff" font-size="10.5" font-weight="700">CE QUE CETTE VUE DIT ET QU'AUCUNE VUE PRÉCÉDENTE NE DISAIT</text>
    <text x="46" y="729" fill="#83a6d6" font-size="9">· La chaîne à 13 étapes existe (profil « full ») mais a tourné 1 fois sur 24 · le profil réel en compte 5 · [M] dispatch.py:53,175</text>
    <text x="46" y="743" fill="#83a6d6" font-size="9">· La boucle d'amélioration (④ → ②) n'a jamais bouclé une fois de bout en bout : ni failure_events.jsonl ni lessons.jsonl n'existent sur disque · [M]</text>
    <text x="46" y="756" fill="#83a6d6" font-size="9">· « PASSIVE » n'est pas « à construire » : c'est du code écrit, testé, et hors du chemin — la première dette à traiter est de brancher, pas d'écrire</text>
  </svg>

  <div class="note">
    <b style="color:#d3e6ff">Sources de statut</b> — profils et étapes : <code>scripts/forge/dispatch.py:53-67,123-182</code> ·
    distribution 24 runs : <code>PLAN_CONVERGENCE_FORGE_V1.md</code> §1.2 ·
    gel des règles v2 : <code>static_oracles.py:728-745</code> · garde d'absence : <code>driver.py:949-967</code> ·
    producteur failure_event : <code>driver.py:720-741,840</code> · pool : <code>driver.py:62,2107</code> ·
    fouille : <code>knowledge_base/search_log.jsonl</code> (5 lignes, 5× <code>matchCount:0</code>) ·
    panel Prisme : <code>panel.py</code> + <code>run_real.py:34,1086</code> ·
    porte de contrat : <code>.claude/settings.json</code> → <code>pretool_forge_guard.py</code>.
    Routage de modèle : ce schéma <b>renvoie</b> à <code>INFERENCE_ORCHESTRATOR_V2_PROPOSAL.md</code>, il ne le duplique pas.
    <b>Cibles non construites</b> (réconciliation 4 sources · MCTS · table des bilans) : <b>Annexe CIBLE</b>, jamais dans ce flux.
  </div>
```

**Note de rendu** : la ligne `<rect x="520" y="480" width="250" height="0" />` est un séparateur nul volontaire (ancre de mise en page) ; elle peut être supprimée sans effet. Le rendu pixel n'a **pas** été vérifié visuellement (aucun navigateur ouvert dans cette mission) — les coordonnées ont été posées sans chevauchement calculé, une relecture visuelle est à prévoir à l'insertion. `[E]`

---

# 5. Plan de migration

**Principe de sécurité** : le canon actuel reste lisible à chaque étape. Aucune étape ne supprime avant d'avoir déplacé.

| # | Étape | Ce qui casse | Risque | Réversibilité |
|---|---|---|---|---|
| **M1** | Créer `docs/forge/STUDIO_MASTER_SCHEMA_HISTORY.md` et y **copier** les 3 blocs `⚠ MISE À JOUR` (l.45-77) + la « séquence opérationnelle » périmée du Détail J (l.995-1002) + le bloc U-9 de K (l.1037-1051). **Copie, pas déplacement.** | Rien | **Nul** — création pure | Supprimer le fichier |
| **M2** | Insérer **V0** (légende 6 statuts + 5 règles d'usine + invariant producteur/validateur, remontés de K) et **V1** (§4) en tête du corps, **avant** Détail A. Ne rien supprimer. | Rien ; le document double temporairement de longueur en tête | **Faible** — risque de rendu SVG uniquement | `git checkout` du HTML |
| **M3** | **Relecture visuelle de V1 par Pierre** dans un navigateur. Gate. | — | — | — |
| **M4** | Supprimer du canon les 3 blocs `⚠ MISE À JOUR` (déjà copiés en M1) et remplacer le cartouche par `rev. AAAA-MM-JJ · → HISTORY.md`. | **Les liens/ancres externes vers ces blocs cassent** — vérifier avant : `grep -rn "MASTER_SCHEMA" docs/ scripts/ .claude/` | **Moyen** : perte d'information si M1 a été incomplet. **Mitigation** : diff mot-à-mot HISTORY vs blocs supprimés avant commit | `git checkout` |
| **M5** | Supprimer **Détail L** et **Coupe B**, dont le contenu vivant est intégralement porté par V1. | Toute référence textuelle « voir Détail L » / « Coupe B » dans les autres sections et dans `PLAN_CONVERGENCE`, `MASTER_SCHEMA_TRUTH_AUDIT`, `RAPPORT_EXECUTION` | **Élevé** — ces trois documents citent « Détail L » nommément. **Mitigation obligatoire** : `grep -rn "Détail L\|Coupe B\|Détail A" docs/` et poser une table de correspondance ancienne→nouvelle vue **en tête de HISTORY.md** | `git checkout` |
| **M6** | Fusionner Détail A (résiduel) + Détail F + Nomenclature C purgée → **V2** et **V3** ; Détail H conservé dans V3 avec l'état des nœuds re-vérifié (trancher Pong : HALTED **ou** témoin gelé, une seule mention ; ajouter Snake). | La contradiction Pong doit être **tranchée**, ce qui exige une vérification (ou un arbitrage Pierre) | **Moyen** — c'est un arbitrage de vérité, pas une édition | — |
| **M7** | Fusionner Détail H-bis + I + J → **V4**, en **supprimant** la SVG de 186 lignes de H-bis au profit d'une table qui référence `DEFERRED.md` / `RUN_INDEX.md` / `00_CURRENT_CONTEXT.md`. | Perte du rendu visuel du rail de jalons | **Faible** — l'information reste dans ses fichiers sources, qui sont eux à jour ; c'est la duplication qui périmait | — |
| **M8** | Déplacer Détail G + Détail E + « table des bilans » (extraite de la SVG de Coupe B) dans l'**Annexe CIBLE**, repliée en fin de document. | Rien | **Faible** | — |
| **M9** | Graver la **règle anti-accrétion** (§3.6) en V0 et rejouer le **test d'acceptation** (les 5 questions du §2). | — | **Nul** | — |

**Ce qui doit être archivé, et où** :
- Changelogs, mesures datées, commits, décisions en cours → `docs/forge/STUDIO_MASTER_SCHEMA_HISTORY.md` (nouveau).
- Séquence opérationnelle / prochaine étape → **jamais dans le canon** : `studio_brain/00_CURRENT_CONTEXT.md` (référent existant, déjà prévu par CLAUDE.md).
- Files d'attente et différés → **jamais dupliqués** : `studio_brain/decisions/DEFERRED.md`, `lab/forge_runs/RUN_INDEX.md`.
- Cibles non construites → Annexe CIBLE du canon (visible, mais hors du flux de lecture).

**Risque global de la migration** : le point unique de rupture est **M5** (références externes nommées à « Détail L » / « Coupe B » dans au moins 3 documents vivants). La table de correspondance ancienne→nouvelle vue n'est pas optionnelle : sans elle, la migration crée exactement le type de dette qu'elle prétend supprimer.

**Ce que cette proposition ne fait pas** : elle ne tranche pas la contradiction Pong (M6) — c'est un fait à vérifier ou un arbitrage HumanGate ; elle ne vérifie pas le rendu pixel de V1 (M3) ; elle ne touche à aucun fichier du dépôt hors création de celui-ci.

---

`software_verdict: OK — proposition écrite, statuts vérifiés contre le dépôt (ancres citées §0)`
`evidence_verdict: MECHANICAL_VALIDATION_ONLY`
`claim_verdict: NO_CLAIM_ALLOWED`
