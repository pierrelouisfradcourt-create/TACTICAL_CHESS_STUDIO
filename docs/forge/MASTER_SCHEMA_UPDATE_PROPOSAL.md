# MASTER_SCHEMA_UPDATE_PROPOSAL

**Cible :** `docs/forge/STUDIO_MASTER_SCHEMA.html` (commit `5ec42be`, 113 265 o, 1053 lignes)
**Statut : PROPOSED — rien n'est appliqué.** L'application (livrable 3 de la mission) n'aura lieu qu'après validation Pierre, édition par édition ou en bloc.
Date : 2026-07-30 (soir) · Source des écarts : `MASTER_SCHEMA_TRUTH_AUDIT_2026-07-30.md` + 6 audits délégués re-vérifiés · Spécification d'ancrage : agent Doc Master, ancres **vérifiées par l'orchestrateur** (P1a l.154, P1b l.256, P8 l.222, légende l.34-35, contradiction l.1017-1021 — toutes confirmées).
`claim_verdict: NO_CLAIM_ALLOWED`

**Principes d'édition** (relevés dans le fichier lui-même, à respecter) :
- Réutiliser la légende existante — cyan `#59cbff` plein = EXISTE, ambre `#ffb454` pointillé = CIBLE. **Aucun nouveau code couleur.** Les statuts fins (TESTED, PASSIVE, DOCUMENTED_ONLY, NOT_FOUND, UNKNOWN) s'écrivent **en texte**, mappés sur ce binaire.
- Les nouveautés datées entrent par un bloc `⚠ MISE À JOUR JJ-MM` en tête (pattern des blocs 07-20 / 07-26) ; les nouveautés structurelles par une section `Détail X` en fin de document (pattern Détail K).
- Aucune fonctionnalité hypothétique ne doit apparaître comme construite.

---

## Édition 0 — Bloc « ⚠ MISE À JOUR 2026-07-30 » (tête de document)

**Ancre :** après la fermeture du bloc `⚠ MISE À JOUR 2026-07-26` (l.60), avant `VISION A · B · C DU STUDIO` (l.62). **Risque : nul** (HTML de flux).

Contenu (résumé — le HTML complet est dans la spécification Doc Master, à ajuster d'un point, voir É9) :
- Verdict d'audit : document globalement honnête, écarts **chronologiques**, pas de fausse affirmation.
- 4 mécanismes réels invisibles : profil `standard_godot` · oracle `s10s` (6 sondes) · garde de référence `reference_guard.py` (détecte sans empêcher) · calibration N=3 (bande ~20 %). Renvoi Détail L.
- Statut Breakout corrigé (ratifié) : **expérience externe, hors campagne Forge** — le critère mécanique d'une campagne Forge est la présence de `state.json` + `verdict.json` signés.
- Invariant ratifié : **producteur avant validateur**.
- Doctrine de routage V2 : renvoi vers `INFERENCE_ORCHESTRATOR_V2_PROPOSAL.md` (ce document renvoie, ne duplique pas).
- Distribution réelle des profils : **16× standard_godot · 3× standard · 3× patch · 1× full · 1× artbible** — la chaîne complète dessinée par ce schéma a tourné une fois.

**Justification :** c'est le vecteur principal de convergence — un lecteur du canon doit voir immédiatement que le monde a bougé depuis le 07-28. **Impact :** aucun sur les vues ; pur ajout.

---

## Éditions ciblées É1→É9 (P1→P8 de l'audit + corrections issues des audits délégués)

### É1 (=P1) — Panel Prisme : vues B et C alignées sur Détail A
- **Ancres vérifiées :** l.154 `s1 PRISME — PANEL ▷ Détail A` · l.256 `s1 PRISME (panel ×5)`.
- **Édition :** remplacer par `s1 PRISME (1 agent ; panel ×5 = code présent, non contractualisé) ▷ Détail A` et `s1 PRISME (panel ×5 : PASSIVE)`.
- **⚠ Changement vs audit du matin :** la formulation initiale (« panel ×5 = cible ») est **devenue fausse dans la journée** — l'audit délégué a établi que `panel.py` existe et est câblé (`run_real.py:34/803`, activé par `--charter`). Le statut juste est PASSIVE : code présent, contourne la porte de contrat, mono-modèle, sorties non écrites.
- **Justification :** É1 corrige l'incohérence interne (Détail A dit « 1 agent Opus », B/C disaient « panel » sans marqueur) **sans** introduire la nouvelle erreur inverse.
- **Impact :** texte SVG plus long dans des boîtes de 240-250 px — réduire `font-size` à 9.5-10 si débordement. Risque **faible**.

### É2 (=P2) — s8 HABILLAGE : marqueur d'inexistence
- **Ancre :** rect l.200-203 (déjà ambre pointillé — le style est correct).
- **Édition :** ajouter `◇ aucun contrat, hors ORDER` (l'espace vertical est serré : 4e ligne à y=456 dans un rect finissant à 458 — tester, sinon réduire à 3 lignes en fusionnant).
- **Justification :** le style dit « cible » mais rien ne dit qu'aucun contrat n'existe. **Risque : faible.**

### É3 (=P3) — Lever l'homonymie RÉCONCILIATION — l'édition la plus importante et la plus risquée
- **Ancres :** 6 occurrences (l.113-115, l.129, l.439, l.505, l.1019 + une vue) — toutes vérifiées.
- **Éditions :** renommer la cible en `RÉCONCILIATION D'EXIGENCES` partout où elle désigne les 4 sources ; note d'homonymie en l.129 : *« homonyme distinct de la réconciliation du régime STANDARD (`repo_map.yaml`) — elle, déjà implémentée (`check_placement`) »*.
- **Contradiction interne à corriger dans la même passe (l.1017-1021, vérifiée)** : le bloc U-9 affirme « *"réconciliation" n'existe que dans des commentaires de capabilities.yaml/repo_map.yaml* » — c'est faux depuis que `check_placement` applique mécaniquement `repo_map`. Reformuler : « le sens 4-sources reste NON CODÉ ; le sens STANDARD est appliqué mécaniquement par `check_placement` — deux homonymes, un seul cible ».
- **Justification :** règle ratifiée 2026-07-23 (deux usages → deux noms) ; sans É3, le document contient deux affirmations contradictoires sur le même mot.
- **Impact/risque : moyen-élevé** — 6 occurrences en `text-anchor="middle"` dans des boîtes étroites ; relecture visuelle obligatoire post-édition, réduction de police probable.

### É4 (=P4+P5+P8) — Étage 3 : NE PAS retoucher les SVG denses, tout porter en Détail L
- **Décision de forme (diverge de la spec Doc Master, qui proposait d'insérer des lignes dans le rect de l'étage 3)** : la zone est verticalement saturée (`height=116`, dernière ligne à y=742) et P8 allongerait une ligne SVG unique. **Toutes ces informations vont dans le Détail L** (édition É8), avec seulement deux retouches minimales dans les vues :
  - l.222 : suffixer la ligne escalade de ` (builders uniquement — ▷ Détail L)` — court, tient dans la ligne.
  - l.210 : suffixer le titre de l'étage 3 de ` ▷ Détail L (profil réel)`.
- **Justification :** minimiser le risque de casse SVG ; le pattern « détail en section, renvoi dans la vue » est déjà celui du document. **Risque : faible** (au lieu de moyen).

### É5 (=P6) — Détail A : les 3 contrats de lentille existent, non dispatchables
- **Ancre :** note l.129 (HTML de flux).
- **Édition :** insérer la phrase spécifiée (3 contrats existants, ni CEO ni Joueur, aucun dans un profil, critère `Inter > Intra`, renvoi Détail L).
- **Risque : faible.**

### É6 (=P7) — Renvoi doctrine de routage V2
- Porté par le Détail L (É8), plus une ligne dans le bloc de tête (É0). **Risque : nul.**

### É7 — Corrections issues des audits délégués (nouvelles, hors P1-P8)
1. **Fouille ① de l'étage 2** : annoter `search.mjs — filtres déterministes` (l.195 env.) de ` (instruit au builder JS §2bis ; NON instruit au builder Godot — advisory, ne gate jamais)`. **[M]** vérifié : 1 occurrence vs 0.
2. **Pool ③** : annoter `pool.py construit — 2026-07-13` de ` (câblé driver:62, testé ; jamais déclenché en réel — condition oracle_fail jamais vraie à ce jour)`.
3. **Gel des règles** : dans Détail G ou L, noter **[M]** : `wiremap_frozen.json` : lecteur v1 (`features[]`) inapplicable au schéma v2 (`lines[]`) — gel jamais posé pour Snake, défaut silencieux, correction CV-3 proposée.
- **Justification :** trois écarts mesurés absents du document ; les taire recréerait la dérive qu'on corrige. **Risque : faible** (annotations textuelles courtes).

### É8 — Nouvelle section « Détail L · MISE À JOUR 2026-07-30 »
- **Ancre :** fin de document, avant `</div></body></html>` (l.1050), après Détail K. **Risque : nul.**
- **Contenu :** (1) profil `standard_godot` + s10s, chaîne réelle et distribution des profils ; (2) garde de référence + calibration N=3 ; (3) doctrine routage V2 (lien) + protocole Intra/Inter ; (4) invariant producteur/validateur (encadré) ; (5) statut Breakout (rappel une ligne) ; (6) escalade builders-only + panel Prisme PASSIVE (détail des 3 corrections nécessaires) ; (7) les 3 annotations d'É7 en version développée.
- **Attention homonymie (relevée par Doc Master, retenue)** : « témoin gelé » désigne déjà la décision produit Pong (Détail K) ; la garde de référence est un mécanisme de fichiers — nommer « garde de référence (`reference_guard`) » sans réutiliser « témoin gelé ».

### É7bis — Annotations Knowledge Base (audit KB 2026-07-30 soir, re-vérifié)

Le master schema présente l'étage 2 ① et la bibliothèque comme un circuit vivant. Quatre annotations factuelles à porter (Détail L de préférence, ancres courtes dans les vues) :

1. **Fouille ①** : compléter l'annotation É7.1 — **[M]** `search_log.jsonl` : 5 recherches réelles, **5/5 zéro résultat**, figé depuis le 2026-07-20. L'outil est branché en advisory ; il n'a jamais rien rendu.
2. **Bibliothèque** : **[M]** ~78 % du catalogue (25/32) jamais réutilisé ; 1 seul jeu assemblé depuis la KB (`kb_tactics`) ; Snake réutilise 3 artefacts KB contre 25 lignes reprises de Pong directement. La flèche « pièces trouvées → IMPORT RÉEL » existe mais son débit réel est marginal.
3. **Mémoire d'apprentissage** : **[M]** le store officiel de leçons (`lessons.jsonl`) **n'existe pas sur disque** — la seule mémoire injectée au pré-mortem est le fallback legacy (3 leçons de méthode de `forge_error_journal.jsonl`). Toute case du schéma suggérant une boucle leçons vivante doit être marquée en conséquence.
4. **Knowledge Resolver** : **[M]** `pending_review.mjs` → `apply_decisions.mjs` : chaîne construite et testée, **aucun appelant en production** — connecteur dormant à ajouter à la liste U-9/Nomenclature C.

**Justification :** sans ces annotations, le lecteur du canon croit à une bibliothèque et une mémoire vivantes ; les deux sont câblées et affamées. **Impact :** annotations textuelles + Détail L ; risque faible.

### É9 — Marquages UNKNOWN (sans trancher)
Annoter comme UNKNOWN, pas corriger : générateur de wiremap déterministe (n'existe pas ; des volets sont mécanisables — voir plan CV-6) · `s10d` capteur visuel (non couvert par l'audit) ·
**Tranché depuis (audit KB, ne plus marquer UNKNOWN)** : `GAME_REFERENCE/` = **PASSIVE** — grep exhaustif indépendant, aucun consommateur code ; lu uniquement en `mandatory_read` LLM ; débouché prévu = volet EXPECTED du producteur de réconciliation (CV-6/CV-17). · **s6-redteam-plan affiché actif en Coupe B alors qu'il ne tourne jamais sur le curriculum** — marquer ` (profil full uniquement — jamais parcouru en standard_godot)`.
**Point de la spec Doc Master ajusté :** son bloc de tête citait « observable_coverage/genre_coverage » parmi les 6 sondes s10s — garder la liste canonique : `line_states, placement, collisions, index, contract_completeness, budget` (celles des reçus réels), et mentionner observable/genre_coverage comme sondes additionnelles si vérifiées à l'application.

---

## Ordre d'application recommandé (après validation)

1. É0 + É8 (ajouts purs, risque nul) → 2. É5, É6, É7 (flux/annotations courtes) → 3. É1, É2, É4 (SVG légers) → 4. **É3 en dernier** (6 occurrences, relecture visuelle obligatoire).
Après application : re-rendu visuel complet, puis commit dédié `docs(schema-maitre): mise à jour 2026-07-30 — audit de vérité + Détail L` (gate commit habituelle).

## Ce que cette proposition ne fait pas

Elle ne transforme aucune roadmap en implémentation ; elle ne retire aucune vision (la RÉCONCILIATION D'EXIGENCES reste dessinée comme cible — c'est un chantier du plan de convergence, pas un abandon) ; elle ne duplique pas les documents de doctrine (renvois systématiques).

`software_verdict: n/a — proposition documentaire`
`evidence_verdict: MECHANICAL_VALIDATION_ONLY`
`claim_verdict: NO_CLAIM_ALLOWED`
