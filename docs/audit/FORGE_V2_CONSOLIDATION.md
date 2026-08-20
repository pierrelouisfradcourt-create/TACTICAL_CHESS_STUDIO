# FORGE V2 — Consolidation (P3-P6)

- **Statut : PROPOSED — synthèse finale de la mission Forge V2, en attente gate Pierre avant toute application.**
- Date : 2026-07-20 · Auteur : orchestrateur Fable · Sources : `FORGE_V2_P1_AUTOPSIE.md` (faits horodatés) · `FORGE_V2_P2_PATTERNS.md` (challenge Opus) · recensement de réutilisation 2026-07-20 · bilans sessions/GPT/télémétrie.
- **Principe directeur (ratifié Pierre)** : nous ne créons pas une architecture de connaissance — nous rendons la **boucle d'apprentissage observable et vérifiable**. Métrique canonique de toute la suite :

```
information produite → actif créé → comportement modifié → résultat mesuré
```

Toute recommandation qui s'arrête avant le maillon 3 est une amélioration documentaire, pas une amélioration du Studio. Hold ratifié : PAS de Resolver-comme-architecture.

**Principe de viabilité (ratifié Pierre, 2026-07-20)** : « La Forge ne doit pas prouver qu'un jeu est amusant. Elle doit empêcher de construire longtemps sur un système manifestement invalide. » Leçon AutoBattler reformulée : le problème n'était pas l'absence de mesure du fun — c'était **l'absence de preuve minimale de viabilité avant accumulation de production**.

---

## §1 — Le modèle de circulation (P3)

**Actif cognitif** (définition opérationnelle) : connaissance ayant (1) une **forme opposable**, (2) un **lecteur câblé à un moment imposé**, (3) une **preuve de consommation vérifiable**. Tout le reste est un document.

### Les 4 compilateurs d'actifs — et leur niveau d'enforcement réel (P2)

| Compilateur | Transformation | Enforcement actuel | Trou (P2/AM2) |
|---|---|---|---|
| Citation-par-ID (bible→code) | intention → règle grep-able | 8/11 bibles vivantes | l'ID n'est jamais RÉSOLU vers la bible (présence de fonction seule, `check_wiremap`) |
| Import + `reuse_ratio` (KB→jeu) | pattern → brique exécutable | requête imposée, import advisory — 2/14 jeux | l'import n'est pas exigé, seulement mesuré |
| Injection pré-mortem (erreur→contrainte) | post-mortem → comportement du builder | câblé driver, prouvé (card_engine) | prompt-injection de bonne foi — consommation non vérifiée |
| `mandatory_read` (doc→contexte) | document → lecture au bon moment | par contrat, prouvé quand déclaré | good-faith ; des types entiers n'y sont pas routés (packets !) |

**Constat central (AM2)** : aucun compilateur ne ferme aujourd'hui la boucle jusqu'au *comportement vérifié*. Les renforcements du §4 ferment ce bout — sans rien créer.

### Table des formes-cibles par type de connaissance

| Type | Forme-cible (jamais un rapport) | Lecteur / moment | Preuve de consommation |
|---|---|---|---|
| Recherche/world-scan | packet JSON cité → `mandatory_read` s3/s4 | décompo + architecte, au dispatch | refs du packet dans blueprint + knowledge_trace |
| **Playtest Pierre** | entrées `error_journal(domain=playtest)` : constat → règle observable | pré-mortem s0 du run suivant | item servi tracé + action changée (M2) |
| Erreur/réparation | entrée journal + fix (existant, vivant) | pré-mortem | idem (prouvé sur card_engine) |
| Décision/HumanGate | fiche `HUMANGATE_*.md` AVEC run_id + ID citables | contrats (`mandatory_read`), code (IDs) | citation grep-able |
| Pattern mécanique éprouvé | entrée `knowledge_base` + `usage_examples` + preuve | builder s9 (search-first) | import réel mesuré (`reuse_ratio`) |
| Audit | constats → actions gatées ; le doc reste archive | Pierre (gate) puis exécution | actions exécutées (ex. triage v2) |
| Benchmark/télémétrie | jsonl auto (existant) | `run_cost`, comparaisons | **règle : pas de run sans télémétrie** (i2 a tourné en aveugle) |
| Leçon d'orchestration | règle §2 (CLAUDE.md) ou entrée `_global_` du journal | toute session / tout run | comportement de session conforme |
| Contrainte technique/licence | champ de charter ou `gardeFou` de contrat | s0/s9 | présence au charter + respect vérifié |

### Cycle de vie (composants existants seulement)

Naissance (capteurs, red-teams, recherches, erreurs, playtests, décisions) → **Qualification** (Promotion Policies ratifiées : automatic/oracle/human — cadre existant, à exercer) → **Transformation** (table ci-dessus — le maillon qui manquait) → **Consommation** (les 4 compilateurs) → **Retour** (knowledge_trace + M2 + reuse_ratio + péremption ; un actif jamais servi en N runs → candidat dépréciation en pending_review).

---

## §2 — Règles d'orchestration (P4) — une page, chacune née d'un fait

| # | Règle | Fait fondateur |
|---|---|---|
| O1 | **Incident de session (limite, crash) → on RE-DÉLÈGUE.** Basculer en exécution directe prolongée = décision de gate, jamais un réflexe. | session audit : 78 % du volume en direct après une limite, sans gate |
| O2 | **L'humain n'est pas un bus de données.** Les échanges inter-outils (GPT compris) passent par artefacts structurés (fiches de gate, pending_review), pas par copier-coller de rapports. | fils GPT : rapports entiers recopiés dans les deux sens |
| O3 | **Gate design-intent AVANT tout build de jeu** : plateforme cible, modèle de jeu de référence, critères observables de démo — choisis par PIERRE au charter. | Battlegrounds choisi unilatéralement par l'agent ; Godot jamais posé ; 2 playtests négatifs |
| O4 | **Jamais de build de jeu hors chaîne.** Un build direct en session = les artefacts divergent. | wiremap auto_battler 21/53 fausse après 5 builds hors-rail vs card_engine 39/39 vraie |
| O5 | **Reviewer indépendant down → signalé + relance tentée avant le run suivant.** Le fallback reste assumé et signé. | 2 red-teams card_engine en fallback claude-blind (LM Studio down) |
| O6 | **Pas de run sans télémétrie** — le connecteur 3 fait partie de la définition d'un run. | i2 : 22 dispatches, 0 ligne de télémétrie |

---

## §3 — Workflow cible (P5) — la chaîne actuelle, amendée aux bornes

```
idée → s0 CHARTER (+ design-intent, gate Pierre — O3)
     → s1 prisme → s2 world-scan ──packet──▶ mandatory_read s3/s4 (R6)
     → s3 décompo → s4 archi → s5 wiremap + GEL → s6 red-team plan
     → RÉACTIVATION tracée (pré-mortem + search KB + packets → knowledge_trace,
       recoupée par verify_run — R3)
     → s9 build (en chaîne uniquement — O4) → s10 oracles (+ anti-théâtre R1)
     → s11 red-team code → s12 verdict signé → HUMANGATE Pierre
     → [profil release — ratifié, différé] → PLAYTEST Pierre
     → capture playtest → error_journal(domain=playtest) (R2)
     → MOISSON : propositions d'actifs typées par Promotion Policy
       (conditionnée au SUCCESS V1 — 2 runs de mesure restants)
     → pending_review → gates → patrimoine (KB, contrats, doctrine)
```

Rien de nouveau dans ce schéma : chaque flèche ajoutée est un câblage d'un composant existant. Le playtest y entre comme **capteur humain** (correction P2 de T4 : pas un oracle — le feel n'est pas oracle-exprimable), routé vers le canal pré-mortem qui, lui, est prouvé.

---

## §4 — Recommandations classées (P6)

### A. RENFORCEMENTS de l'existant (impact élevé / effort faible — l'ordre est l'ordre d'exécution proposé)

| # | Reco | Connaissance | Forme | Lecteur/Moment | Comportement futur changé | Preuve de fonctionnement | Résultat mesuré |
|---|---|---|---|---|---|---|---|
| **R9 — PRIORITAIRE** | **Solvabilité minimale OBLIGATOIRE avant toute augmentation de contenu** : boucle jouable · conditions de victoire atteignables · ressources disponibles · simulation terminable · mécaniques centrales activables | leçon AutoBattler reformulée (0 or, combat jamais lancé — pattern maison jamais appliqué) | `solvability.mjs` par jeu (template existant), 5 volets ci-contre | driver s10a, chaque oracle-code, DÈS le 1er incrément | on ne peut plus accumuler de la production sur un système manifestement invalide | `check_solvability_wired` verte + les 5 volets FAIL sur fixture invalide | récurrence « injouable au playtest » = 0 |
| R1 | Check anti-théâtre des harnais (`static_oracles`, frère de `check_e2e_harness:334`) | pattern bi-projet « statut écrit ≠ calculé » (P1) | check structurel + fixture témoin | driver, chaque s10a | un oracle à flags littéraux ROUGIT à s10a au lieu d'être découvert par red-team tardif | fixture théâtrale → FAIL prouvé | incidents théâtre = 0 sur les runs suivants ; coût du cycle tardif économisé (télémétrie) |
| R2 | Playtest → `error_journal(domain=playtest)` + formulaire de capture (constat → règle observable) | retours playtests Pierre (aujourd'hui : 0 fichier, jamais) | entrées journal structurées | pré-mortem s0 du run suivant | un retour de playtest ne peut plus s'évaporer — il contraint le build suivant | item servi dans knowledge_trace + action changée (M2) | délai retour→règle ; récurrence des mêmes retours = 0 |
| R3 | `verify_run` recoupe `knowledge_trace` | lineage de lecture (aujourd'hui auto-attesté — AM1) | vérification mécanique dans le sceau | verify_run, chaque verdict | une trace non recoupable invalide le run — le remède ne peut plus reproduire la maladie | fixture trace-théâtrale → exit 2 | M1 vérifié par un tiers mécanique sur chaque run |
| R6 | Packets → `mandatory_read` de s3/s4 (2 lignes de contrat) | recherches web citées (3/3 orphelines structurelles) | packet existant, routé | décompo + architecte, au dispatch | toute architecture future est contrainte par les faits sourcés | refs packet dans blueprint + trace | orphelins packets : 100 % → 0 % |
| R7 | Champ design-intent au charter (opérationnalise O3) | intention produit de Pierre | 3 champs de charter (plateforme · référence de jeu · critères de démo) | s0, gate Pierre | plus aucun choix de modèle de jeu pris par un agent | charter card_engine/futurs : champs remplis + HumanGate | playtests « mal cerné mes envies » = 0 |
| R8 | `usage_examples` rempli automatiquement à l'import détecté (`reuse_ratio` → catalog) | usage réel des briques KB (0/30 rempli) | champ catalog | search-first des builders suivants | les briques montrent leur usage réel — la fouille devient probante | usage_examples > 0 après le prochain import | taux de remplissage catalog |

### B. CAPTEURS EXPÉRIMENTAUX (classe d'oracle expérimentale — ratifié Pierre 2026-07-20)

Advisory UNIQUEMENT · aucune décision automatique · aucun claim « jeu fun » · détection d'anomalies structurelles seulement. Détail : `FORGE_V2_ANNEXE_SANTE_LUDIQUE.md`.

| Capteur | Statut | Conditions de branchement |
|---|---|---|
| Dégénérescence d'issue (matrice win-rate `resolveCombat`, flag si une config domine > ~70 %) | PROPOSED expérimental | sondes P1.1 passées (Belote saine ne rougit pas · fixture truquée ×10 rougit) · sha bot gelé · politiques hétérogènes · fail-open · jamais dans `software_verdict` |

### C. DÉCISIONS PIERRE (héritées, toujours ouvertes)

`project_bible` à s0 : câbler ou acter l'abandon (R4/audit) · consacrer les formats de décision + fiches HUMANGATE avec run_id (audit D1 + gap P1) · doctrine finding→run (D5) · **moisson/Promotion Policies = étape 3 de l'ordre ratifié, conditionnée au SUCCESS V1** (M1-M4 sur 2 runs restants).

### D. HYPOTHÉTIQUES — ne pas faire maintenant (triple gate Evolve : aucun cas ne passe — P2 Q3)

Resolver-comme-architecture (**HOLD ratifié**) · Policy Compiler (étape 5, si maintenance le justifie) · télémétrie-compare automatisée · table des bilans multi-LLM ★ du schéma maître (comportement futur changé : non démontré — reste cible hypothétique) · panel prisme ×5 (cible non prouvée) · MCTS workflow (protocole écrit, attend que la boucle de base soit fermée) · **santé ludique — familles abandonnées** (annexe) : anti-impasse/anti-faux-choix/anti-atrophie **ABANDONNÉES** (faux positifs = choix de design) ; « empêcher le non-fun comme gate » = ABANDON (triple gate 0/3). Le capteur dégénérescence survivant est classé §4-B (expérimental).

### E. Filtre d'abandon

Toute proposition dont la réponse à « quel comportement futur change ? » est « on aura un meilleur document » est **rejetée par construction** — y compris dans ce document.

---

## §5 — Tableau de bord de la boucle (le « résultat mesuré » du système lui-même)

| Indicateur | Baseline 2026-07-20 | Instrument |
|---|---|---|
| Orphelins packets / protocoles / docs forge | 100 % · 63 % · ~40 % | recensement (à rejouer à J+30) |
| `usage_examples` KB | 0/30 | catalog.json |
| Playtests capturés | 0 fichier (catégorie absente) | error_journal(domain=playtest) |
| Réutilisation briques | 2/14 jeux | reuse_ratio |
| Incidents « théâtre d'oracle » | 2 (bi-projet) | R1 + journal |
| M1-M4 Resolver V1 | 1 run mesuré / 3 | protocole V1 |
| Coût/run par étape | i1 550k · card_engine 1,81 M · i2 INCONNU | télémétrie (O6) |

---

## §6 — Limites et revue

L'autopsie reste partiellement auto-attestée (l'orchestrateur audite des sessions qu'il a pilotées) — mitigée par le challenge Opus indépendant (P2, 2 angles morts contre l'auteur) et par la primauté de la télémétrie sur les récits. i2 est non reconstructible (télémétrie absente). Prochaine revue : après les 2 runs de mesure V1 restants — recensement rejoué, tableau §5 comparé.

---
software_verdict : s'appliquera aux renforcements une fois câblés et prouvés, pas à ce document.
evidence_verdict : MECHANICAL_VALIDATION_ONLY (tout fait cité provient de P1/P2/recensement/télémétrie, sources datées)
claim_verdict : NO_CLAIM_ALLOWED
