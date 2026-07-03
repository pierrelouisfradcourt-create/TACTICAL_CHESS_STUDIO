# Audit — Clarté UX Bibliothèque + Solidité de l'import

> Méthode : test manuel réel via Chrome (localhost:3000/builder, serveur `demo-server.ts`,
> store `library/` réel, 18 briques), lecture du DOM rendu, et inspection des payloads via
> `/api/library`. **Aucune ligne de code modifiée** hors ce fichier. Le canvas a servi à
> observer la carte d'identité (nœud en mémoire, non persisté). Library `/` intacte.

## Inventaire réel constaté (live, pas théorique)

**18 briques** (le prompt annonçait « 19+ » — l'écart est réel : il y en a 18).

| # | Brique | Type | Badge | Maturité | Provenance | Remplissage constaté |
|---|--------|------|-------|----------|-----------|----------------------|
| 1-5 | Code / Docs / Producer / QA / Review Agent | agent | réel | saved | `lab/agent_registry/*.agent.json` | **1/7** — seul `rôle` rempli, 6 champs LLM vides ; gouvernance remplie |
| 6 | Agent générateur de charter | agent | réel | saved | autopilot | rempli |
| 7 | Profil d'appel LM — autopilot (Director) | agent | démo | draft | autopilot | LLM rempli (modèle/temp/top_p/max_tokens), **gouvernance vide** |
| 8-13 | Garde-fou: dedup / ghost-file / lane-guard / needs_human / smoke-level / tool-permission | oracle | réel | saved | autopilot | rempli, `catégorie="mécanique"` |
| 14-17 | Rôle: extract / fusion / redteam / roadmap | prompt | réel | saved | autopilot | rempli, `catégorie="autopilot-import"`, sourceRef ligne-citée |
| 18 | Pipeline idée→IMP (autopilot) | chain | démo | draft | autopilot | **partielle/dérivée** (voir F7) |

Répartition (filtre Type vérifié) : agent 7 · prompt 4 · oracle 6 · chain 1 · **roadmap 0 · goal 0**.

---

## Volet 1 — Navigation et remplissage

### Frictions trouvées (priorisées, avec preuve)

#### F1 — HAUTE — Aucune recherche par nom
La Bibliothèque n'a **aucun champ de recherche**. `read_page` sur le bandeau ne renvoie qu'un
seul `combobox` (filtre Type, 7 options) — pas de `textbox`. Trouver « le prompt du rôle
redteam » = balayage visuel des 18 lignes ; le mot « redteam » n'apparaît que dans la
parenthèse de *« Rôle: Avocat du diable (redteam) »*. À 18 briques tout tient sur un écran et
ça passe ; le coût est O(n) et devient pénible dès qu'on dépasse une hauteur d'écran (~25-30).
> Preuve : contrôles de la vue = `combobox "Tous"` + `button "＋ Nouveau ▾"`. Aucun input texte.

#### F2 — HAUTE — « Toutes les briques autopilot » est impossible à obtenir
12 des 18 briques sont issues d'autopilot.py, mais **rien dans la liste ne le montre** : les
colonnes sont NOM / TYPE / BADGE / MATURITÉ. La provenance vit (a) dans le champ `catégorie`
(prompts + chain = `"autopilot-import"`) et (b) dans le préfixe d'`id` (`autopilot-*`) — ni
l'un ni l'autre affichés, aucun filtre ni recherche dessus. La donnée existe, elle n'est pas
exploitable par l'utilisateur.
> Aggravant : `catégorie` est **incohérente** selon le type — les Oracles portent
> `catégorie="mécanique"` (nature), les Prompts/Chain `="autopilot-import"` (provenance).
> Même surfacée, cette colonne ne regrouperait pas proprement « autopilot ».

#### F3 — HAUTE — Badge/maturité ≠ complétude ; la complétude est invisible depuis la liste
La liste distingue bien réel/démo et SAVED/DRAFT (c'est un point fort, cf. plus bas). Mais
« réel/saved » encode la **provenance** (semé depuis `agent_registry`), **pas** le remplissage.
Preuve dure : **Code Agent** est réel/saved et **1/7 rempli** (`rôle="code"` ;
mémoire/skill/plugin/objectif/garde-fou/modèle tous `""`). Les 5 seeds sont dans ce cas : ils
ressemblent, dans la liste, à un agent complet. Le badge de complétude **0/7 → 7/7** de la
carte d'identité n'existe **que sur le nœud canvas** (« L'exécution est bloquée tant que la
carte n'est pas 7/7 »), jamais dans la liste. → réponse au test #4 : **non**, statut
complet/incomplet et relations ne sont pas lisibles depuis la liste ; il faut ouvrir la fiche
(et y compter 7 champs à l'œil) ou déposer la brique sur le canvas.

#### F4 — MOYENNE — Le contenu d'une Chaîne est invisible depuis sa fiche
La fiche Chaîne n'affiche que des **métadonnées** (id/nom/maturité/badge/sourceRef/catégorie/
tags). Le graphe réel (6 nœuds) n'est visible qu'après « → Canvas ». → réponse au test #5 :
on ne comprend **pas** ce que contient « Pipeline idée→IMP » en la regardant ; le seul indice
est le nom + des tags (`pipeline, roadmap, production-réel`) qui sont eux-mêmes trompeurs (F7).

#### F5 — MOYENNE — Cohérence des éditeurs : ~80 % cohérente, divergences réelles
Point positif d'abord : **enveloppe commune** (id/type/nom/maturité/badge/sourceRef) et
**même barre d'actions en bas** pour tous les types (`→ Canvas · Sauvegarder · Dupliquer ·
Supprimer`). Divergences constatées :
- Le **verbe d'action de ligne** change par type : *« s'attache à un nœud agent »* (agent),
  *« s'attache à un nœud llm »* (prompt), *« gardien : valide la sortie d'un nœud »* (oracle),
  *« se charge sur le canvas »* (chain). Quatre formulations pour « utiliser cette brique ».
- La sémantique de `catégorie` diverge (provenance vs nature, cf. F2).
- La fiche Agent est un **formulaire plat de 20 champs sans indicateur de complétude**, alors
  que le **même** agent sur le canvas montre une carte riche 0/7 : fiche et canvas ne
  communiquent pas la complétude de la même manière.

#### F6 — BASSE — Deux catégories mortes
Le filtre Type **et** « ＋ Nouveau » proposent **Roadmap** et **Goal**, or 0 brique de ces
types existe (roadmap=0, goal=0). Les sélectionner donne une liste vide sans message d'état
visible. Proposer des catégories sans contenu est une confusion mineure (elles sont créables,
donc « offertes non utilisées », pas cassées).

#### F7 — HAUTE (confiance) — La Chaîne vedette est partielle + dérivée, mais taguée « production-réel »
Vérifié sur le payload de `chain-mr3kt9sj` (6 nœuds : `llm-1→llm-2→llm-3→llm-4→agent-5→humangate-6`) :
- **Prompts copiés, pas référencés** : le texte de `llm-1` est **strictement identique** au
  prompt autonome `autopilot-prompt-roadmap-001` (`identical: true`). Idem les 4 rôles. Éditer
  la brique Prompt **ne met pas à jour** la chaîne. Double source de vérité — exactement le
  risque signalé par `LIBRARY_AUDIT.md`.
- **Zéro oracle câblé** : `typesPresent = [llm, agent, humangate]`. Les 6 Garde-fou (needs_human,
  dedup, ghost-file…) — qui *sont* le cœur doctrinal du pipeline idée→IMP — sont **absents** du
  graphe. Ils existent en briques isolées mais ne sont pas montés dans la chaîne censée les utiliser.
- **Nœud fictif** : `agent-5 = "qwen-coder"` — le rôle VISION/dérive que `COMPLETENESS_AUDIT.md`
  qualifie de « pas du vrai code ». Le vrai pipeline finit en STAGE vers `ROADMAP_PROPOSALS.yaml`,
  pas sur un agent qwen-coder.
- **sourceRef vide** : les 11 briques autopilot « réelles » citent des plages de lignes exactes
  (ex. redteam → `autopilot.py:1453-1459`) ; la chaîne, qui correspond pourtant à
  `autopilot.py:1411-1658`, ne cite rien.
- **Signal contradictoire** : badge démo/draft (honnête) MAIS tags `production-réel` (trompeur).

### Ce qui fonctionne bien (à ne pas casser)
- **Colonnes Badge + Maturité** : réel/démo et SAVED/DRAFT lisibles d'un coup d'œil (test 1.3 : OK net).
- **Enveloppe + barre d'actions communes** à toutes les fiches (cohérence de base solide).
- **Traçabilité sourceRef** sur les 11 briques autopilot réelles : chacune cite les lignes
  autopilot.py exactes. C'est la meilleure partie du remplissage.
- **Filtre Type** exact (comptages agent 7 / prompt 4 / oracle 6 / chain 1 vérifiés).
- **Carte d'identité canvas** (7 satellites + badge X/7 + blocage d'exécution < 7/7) : vraiment
  bonne — le seul défaut est qu'elle est **canvas-only**.
- **18 lignes tiennent sur un écran** : à cette échelle, la liste brute suffit encore.

### Le remplissage actuel reflète-t-il fidèlement nos travaux ?
Partiellement — fidèle en provenance, avec de vrais trous :
- **Bien représenté** : 4 prompts de rôle + 6 oracles garde-fou + agent charter → tous réels,
  traçables à autopilot.py. Fidèle au travail de mining.
- **Creux** : les 5 seeds sont de vraies cartes mais 1/7 remplies — elles disent *qui* existe,
  pas *comment* ça appelle le LM. (Le Profil LM comble ce « comment »… mais pour le seul Director.)
- **Cassé/partiel** : la Chaîne (F7) — l'artefact jugé le plus précieux par le rapport de mining
  est la brique **la moins fidèle** : prompts dupliqués, oracles perdus, nœud fictif, pas de sourceRef.
- **Manquants vs ce qui devrait logiquement exister** : aucune brique **Council** (or Council ⊂
  Chaîne était acté), aucune brique **fragment / preset modèle** (recommandé par MICRO_BRICKS),
  aucune **roadmap/goal/system**, aucun **prompt de charter** (seul l'agent charter existe).

---

## Volet 2 — Solidité de l'import

### 2a — Kit de fouille réutilisable

**Parties généralisables de la méthode autopilot** (extraites de `AUTOPILOT_MINING_REPORT.md`,
qui décrit sa propre méthode) :
1. **Passe ToC** — `grep "^class"/"^def"`, cartographier zones denses vs inertes. → généralisable
   à tout fichier de code.
2. **Grep ciblé par familles** (prompts/rôles ; config/params ; constantes nommées). → le motif
   est universel ; les mots-clés sont propres à la source.
3. **Lecture approfondie des zones denses + liste explicite du « survolé, non lu »**. → l'honnêteté
   de nommer ce qu'on n'a *pas* lu est le cœur généralisable.
4. **Tag obsolète-vs-valide** (noms morts type « Devstral », constantes gelées, prompts dupliqués,
   incohérence de routage « signalée, non jugée »). → généralisable et précieux.
5. **Top-5 pépites + mapping vers `kind`**. → structure de sortie généralisable.

**Non généralisable** : numéros de ligne, listes de mots-clés, jugements propres à autopilot.

**Outil réutilisable déjà présent ?** **Non.** Les 27 `.mjs` de `llm-lego/` sont des
*validateurs*/runners (`agent-card-validate`, `oracle-validate`, `run-build`…), pas des mineurs.
`build-idea-pipeline.mjs` est un **constructeur one-off** de la chaîne idée→IMP (« CONSTRUITS À
LA SOURIS » via Playwright, il logge même ses `frictions`) — c'est du contenu, pas du mining de
source. La méthode n'existe donc **que sous forme de prose** dans un rapport.

**Structure minimale d'un kit (si construit)** :
- Un **prompt-template** à fentes : `{chemin source, type de source, familles de mots-clés}` →
  sortie = ToC + table top-N (nom | kind | source-ref | actuel/obsolète | note de valeur) +
  liste « non lu ».
- Une **checklist de sortie standard** = les propres titres de section du rapport autopilot.
- Optionnel : un petit **script grep déterministe** (ToC + familles → hits ligne-cités) pour
  mécaniser les étapes 1-2. **Pas un outil LLM** — un wrapper grep.

#### ⚠ Correction (2e passe) — ce n'est PAS n=1 : `lab/chains/` est une famille entière de chaînes réelles, déjà écrites et testées
Ma 1ʳᵉ passe n'avait cité `kaizen_autoloop.py` qu'en une ligne et n'avait pas ouvert le
répertoire. En réalité `lab/chains/` contient tout l'apparatus kaizen — plusieurs **chaînes
exécutables + oracles + une matrice de fusion + les roadmaps**, chacune avec son test. Ce sont
des briques directement importables, pas de futures fouilles hypothétiques :

| Source (vérifiée) | Devient (kind) | Contenu concret constaté |
|---|---|---|
| `lab/chains/doc_hygiene_chain.py` (21 KB, + `test_doc_hygiene.py`) | **chain** + **oracle**×3 | Audit hygiène/vérité read-only git : détection **4 lanes** (SAFE_AUTO/AUDIT_REQUIRED/HUMAN_REQUIRED/FORBIDDEN), audit message de commit, audit file-routing, propositions de doc → verdicts. **C'est exactement le CLAIM_MATRIX 4-lanes que `COMPLETENESS_AUDIT` disait manquant — et il est ici, en code déterministe.** |
| `lab/chains/fusion_matrix_chain.py` (+ `test_`, `FUSION_LOG.jsonl`) | **chain** | **La matrice de fusion.** Merge des sorties de doc_hygiene + run_chain + scripts_route → table `verdict/evidence/risk/contradiction`. C'est la séparation doctrinale software/evidence/claim *rendue exécutable*. |
| `lab/chains/kaizen_autoloop.py` + `kaizen_loop.py` (35 KB / 17 KB) | **chain** + **agent** | Le vrai exécuteur autoloop. Importer sa chaîne **corrigerait le nœud fictif `qwen-coder`** de la chaîne actuelle. |
| `lab/chains/prompt_chain_map.json` — clé **`agents_a_creer`** | **agent**×3+ | Agents prêts à créer, **avec modèle + calibration** : `agent-roadmap` (Architecte solo-dev, qwen2.5-14b, calibr. 0.4→0.3), `agent-redteam`, `agent-fusion`… Exactement la config modèle qui manque aux 5 seeds. |
| `lab/chains/prompt_chain_map.json` — clé **`lm_config`** | **agent/preset** | Le vrai Profil LM — et il en révèle **deux** : Director `qwen2.5-14b @ 0.4` et CEO `qwen3.6-27b`. Le brique Profil LM actuelle n'en capture qu'un. |
| `lab/chains/prompt_chain_map.json` — clé **`architecture_ideale`** | **chain (cible)** | La version *idéale* du pipeline (contraindre→decomposer→…) avec model/max_tokens/temperature par étape + tagging role_current/pre_imp089/**role_target** (obsolète-vs-valide déjà fait). Meilleure que la chaîne dérivée actuelle à importer. |
| `lab/chains/ROADMAP_PROPOSALS.yaml` (15 KB) | **roadmap**×N | Propositions `PROP-NNN` avec source_phase/task/priority + **`humangate_verdict` (APPROVED/REJECTED)** + bloc `imp` (title/type/lane/impact/effort). Briques Roadmap prêtes — or la lib en a **zéro** alors qu'elle offre le type. |
| `lab/chains/IMPROVEMENT_LEDGER.yaml` (**244 IMP**) | **roadmap**×N | La source primaire des roadmaps/`impRef`. Le serveur ne l'a jamais lue (`COMPLETENESS_AUDIT` axe 4). |
| `scripts/council.py` (572 l) | **chain/council** + **prompt**×3 | Council 3-voix parallèle réel. |
| `lab/claim_data_gates/` | **oracle** | Doctrine verdict/claim → oracles. |
| `scripts/cockpit_server.py` | agent/config | Possibles briques config. |

**Recommandation corrigée : le kit de fouille est désormais justifié — parce que la matière
est déjà semi-structurée, pas parce qu'on abstrait dans le vide.** `prompt_chain_map.json`
prouve que l'extraction a *déjà été faite une fois en JSON* (chain/agents_a_creer/lm_config/
architecture_ideale/obsolète-valide) : le « kit » consiste surtout à **écrire l'importeur
`prompt_chain_map.json → briques`** (agents_a_creer→agents, lm_config→preset(s), chain/
architecture_ideale→chain, zones_ombre→notes), pas à re-fouiller du code brut. Le miner LLM
générique reste, lui, à éviter tant qu'on n'a pas fouillé une source d'un *autre type* (une doc,
un YAML de config) — ça, c'est la seule partie encore n=1.
> Autrement dit : **importer ≠ fouiller.** `lab/chains/` est prêt à importer (données
> structurées + code testé). autopilot.py était le cas « fouille de monolithe ». Ne pas
> confondre les deux : construire un importeur `lab/chains/` maintenant, garder le miner-de-code
> générique pour après un 2ᵉ cas de *fouille* réel.

### 2b — Transformation/fusion entre briques

- **Prompt → base d'un Agent ?** Impossible aujourd'hui (pas de transform inter-type ; seul
  Dupliquer même-type existe). **Besoin réel : partiel/hypothétique.** Les 4 prompts de rôle
  *sont* le contenu objectif/rôle qui manque aux 5 cartes creuses — mais les agents à remplir
  (Code/Docs/QA…) sont des rôles **différents** des 4 prompts autopilot (architecte/redteam/
  fusion/extract). Aucun transform 1:1 n'attend dans le contenu **actuel**. → pas encore un
  vrai besoin ; le deviendrait si on créait des agents correspondant à ces rôles.
- **Fusionner deux briques (ex. 2 Oracles → règle composite) ?** Impossible aujourd'hui. Les 6
  oracles sont des vérifications mécaniques distinctes, aucune redondance. **Aucun besoin
  observé — hypothétique** *au niveau brique-UI*.
  > ⚠ Distinction importante (soulevée après revue) : « fusion » a **deux sens** ici, et mon
  > analyse ci-dessus ne couvrait que le premier. (1) Fusion de *briques* dans l'UI (merge de
  > contenu) — hypothétique. (2) **`lab/chains/fusion_matrix_chain.py`** — la matrice de fusion
  > que tu as construite : elle fusionne les *sorties de plusieurs chaînes* (doc_hygiene +
  > run_chain + scripts_route) en une table `verdict/evidence/risk/contradiction`. Ça, ce n'est
  > pas un besoin hypothétique — **c'est du réel à importer** comme brique **chain**, et c'est
  > la matérialisation exacte de la doctrine software/evidence/claim. La Bibliothèque devrait la
  > porter, pas la réinventer.
- **Profil LM × les 5 cartes `agent_registry` — le refus « factuellement faux » tient-il ?**
  **Oui pour une fusion littérale ; mais le besoin sous-jacent est réel et désormais mieux
  structuré.** Complémentarité vérifiée sur les payloads :
  - Profil LM : `modèle=qwen2.5-14b`, `temp=0.4`, `top_p=0.9`, `max_tokens=8000`, mémoire+gardeFou
    remplis — **gouvernance vide**.
  - 5 seeds : gouvernance remplie (`autonomy_level=L1`, permissions, surfaces) — **champs LLM/
    modèle vides**.
  - Ce sont des **compléments exacts**. MAIS Profil LM est `role="director"` : le profil d'appel
    d'**un** agent précis, pas un preset générique. Fusionner le profil du Director dans Code/
    Docs/QA/Producer/Review **affirmerait** que ces 5 tournent en qwen2.5-14b @ 0.4 — non vérifié
    et probablement faux → **c'est le « factuellement faux », et il tient toujours.**
  - Ce qui a changé : la carte d'identité a maintenant un **satellite `modèle` dédié par agent**.
    Le bon geste n'est donc **pas une fusion** mais un **preset/fragment modèle réutilisable**
    (le `kind:"fragment"` modèle-first de MICRO_BRICKS) qui remplit les slots modèle/temperature/
    max_tokens de **n'importe quelle** carte, choisi agent par agent. **Profil LM (Director)
    devient le premier de ces presets.**
  - Conclusion : rejeter la fusion brute (toujours fausse), accepter le besoin réel (les agents
    manquent de config modèle), le servir par un mécanisme de preset, pas par un merge.
  - **Précision (2e passe) :** `prompt_chain_map.json` fournit deux choses qui rendent ce besoin
    trivial à combler sans aucune fusion — (a) **`lm_config`** montre qu'il y a en fait **deux**
    profils (Director `qwen2.5-14b @ 0.4` + CEO `qwen3.6-27b`), donc « Profil LM » devrait être
    **deux presets**, pas un ; (b) **`agents_a_creer`** liste des agents déjà porteurs de leur
    `model` + `calibration` (agent-roadmap/redteam/fusion). Autrement dit, la config modèle
    manquante existe déjà, structurée — il suffit de l'**importer**, ce qui clôt définitivement
    la question « faut-il fusionner ? » : non, il faut importer `agents_a_creer` + `lm_config`.

### Constats
- **Ce n'est pas n=1.** `lab/chains/` est une famille de chaînes réelles **déjà écrites et
  testées** (doc_hygiene_chain, fusion_matrix_chain, kaizen_autoloop/loop, run_chain,
  scripts_route_chain) + `prompt_chain_map.json` qui contient déjà l'extraction **semi-structurée**
  (chain / agents_a_creer / lm_config / architecture_ideale / obsolète-valide). La chaîne
  idée→IMP importée était **un membre** de cette famille, pas un one-off.
- **Trou de remplissage majeur, chiffré** : la lib offre les types **Roadmap** et **Council** et
  n'en a **aucune brique**, alors que `ROADMAP_PROPOSALS.yaml` (PROP-NNN avec humangate_verdict)
  + le **ledger 244 IMP** + `council.py` sont des sources prêtes.
- **Priorité import (données structurées, effort faible) avant fouille (code brut, effort fort)** :
  1. `prompt_chain_map.json` → agents_a_creer + lm_config + architecture_ideale.
  2. `ROADMAP_PROPOSALS.yaml` + ledger → briques Roadmap.
  3. `doc_hygiene_chain.py` → chain audit hygiène/vérité + oracles 4-lanes.
  4. `fusion_matrix_chain.py` → chain matrice de fusion.
  5. `kaizen_autoloop.py` → chaîne autoloop (corrige la dérive qwen-coder).
  6. Puis seulement : fouille d'un type de source *nouveau* (doc, config) → là, générer le kit.
- **Kit de fouille** : ce qu'il faut construire d'abord n'est pas un miner-LLM générique mais un
  **importeur `lab/chains/*` → briques** (les données sont déjà là). Le miner générique attend un
  2ᵉ cas de *fouille* d'un type différent — ça, oui, reste n=1.
- **Transformation/fusion** : **aucun besoin réel confirmé** au niveau brique-UI ; le besoin réel
  (agents sans config modèle) se comble par **import** de `agents_a_creer`/`lm_config`, pas par
  transform/fusion. La fusion Profil-LM-dans-les-5-cartes reste factuellement fausse. En
  revanche la **matrice de fusion** (`fusion_matrix_chain`) est un vrai artefact à importer, pas
  une fusion de briques.

---

## Recommandation de découpage en passes

Si des corrections sont retenues, dans cet ordre :

- **Passe A — Confiance/exactitude (HAUTE)** : réparer la brique Chaîne. Le mieux n'est pas de
  patcher la démo dérivée mais d'**importer la version cible** depuis `prompt_chain_map.json`
  (`architecture_ideale`) ou `kaizen_autoloop.py` : câbler les 6 oracles, retirer le nœud fictif
  qwen-coder, ajouter `sourceRef`, trancher référence-vs-copie des 4 prompts. À défaut, étiqueter
  honnêtement (retirer le tag `production-réel`). *Petit-moyen, forte valeur — brique vedette qui se travestit.*
- **Passe B — Import `lab/chains/` (HAUTE — c'est le vrai remplissage manquant)** : écrire
  l'importeur `prompt_chain_map.json → briques` (agents_a_creer→agents avec modèle, lm_config→2
  presets, architecture_ideale→chain cible) ; importer `ROADMAP_PROPOSALS.yaml` + ledger →
  briques **Roadmap** (type aujourd'hui vide) ; importer `doc_hygiene_chain` → chain + oracles
  **4-lanes** ; importer `fusion_matrix_chain` → chain **matrice de fusion**. *Effort faible
  (données structurées), valeur haute (comble Roadmap/Council vides + config modèle + doctrine 4-lanes).*
- **Passe C — Navigation (HAUTE dès ~25 briques)** : recherche in-list (nom + id + catégorie) ;
  surfacer provenance/`catégorie` en colonne ou filtre ; surfacer la complétude (X/7) pour les
  agents. *Moyen. Fine à 18, cassera d'autant plus vite que la Passe B remplit la lib.*
- **Passe D — Cohérence (MOYENNE)** : unifier la sémantique de `catégorie` (séparer provenance
  de nature) ; réconcilier l'affichage complétude fiche-vs-canvas.
- **Passe E — Miner générique (BASSE, différée)** : seulement après une fouille d'une source d'un
  *type nouveau* (doc/config), extraire le template de mining comme sous-produit. Pas avant —
  c'est la seule partie encore n=1.

---

## Verdict honnête

À l'échelle d'aujourd'hui (18 briques, un écran), la Bibliothèque est un catalogue **utilisable**
pour parcourir et éditer : badges à peu près honnêtes, enveloppe cohérente, traçabilité sourceRef
des briques autopilot réellement solide. Ce n'est **pas encore** un outil clair et solide sur deux
points qui comptent **avant d'ajouter du contenu** :

1. **Navigation** : ni recherche, ni surfaçage de provenance/complétude. Correct à 18, cassé à 40.
   C'est un manque « à combler avant de remplir davantage ».
2. **Confiance** : la brique de plus forte valeur (la chaîne idée→IMP) **travestit son contenu**
   (oracles perdus, prompts dupliqués, nœud fictif, tag « production-réel » mensonger). Une
   bibliothèque dont l'artefact vedette est partiellement fictif érode la confiance dans tout le
   reste. **Réparer la chaîne avant de vitriner la bibliothèque.**

Le **pipeline d'import lui-même** (la méthode de fouille) est sain et a produit de bonnes briques ;
les maillons faibles sont (a) le dernier mètre d'assemblage de la chaîne et (b) la couche de
navigation manquante — **pas** l'extraction.

3. **Correction de fond après revue :** le remplissage n'est pas « presque complet, il manque un
   2ᵉ cas de fouille ». Il manque **tout `lab/chains/`** — les chaînes kaizen, la matrice de
   fusion (`fusion_matrix_chain`), la chaîne audit hygiène/vérité 4-lanes (`doc_hygiene_chain`),
   et surtout les **roadmaps** (`ROADMAP_PROPOSALS.yaml` + ledger 244 IMP) qui rempliraient un
   type aujourd'hui **vide**. Ces sources sont **déjà structurées et testées** : c'est de
   l'**import** à faire, pas de la fouille. Mon « attendre, n=1 » était faux pour l'import ;
   il ne vaut que pour le miner-de-code générique.

Donc, réordonné : (A) réparer/importer la vraie chaîne, (B) **importer `lab/chains/` — c'est le
gros du remplissage manquant, effort faible car données structurées**, (C) ajouter la recherche,
(D) cohérence, (E) miner générique seulement plus tard. Ne pas construire de kit de fouille
générique maintenant ; **construire l'importeur `lab/chains/` maintenant**.

---

software_verdict: OK — audit produit, 18 briques testées live via navigateur + API
evidence_verdict: MECHANICAL_VALIDATION_ONLY — DOM rendu, payloads `/api/library`, existence fichiers vérifiée ; aucun jugement de qualité au-delà de l'observable
claim_verdict: NO_CLAIM_ALLOWED
