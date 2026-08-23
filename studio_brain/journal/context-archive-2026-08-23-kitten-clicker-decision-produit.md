# Archive contexte — décision significative (run 8b → run 9), 2026-08-23
*(Archivé par Fable depuis `00_CURRENT_CONTEXT.md`.)*

### Décision Pierre 2026-08-23 (après run 8b) — ratifiée
**A → J est nécessaire, pas suffisant.** Gameplay Contract = mécanisme de vérification VALIDÉ (runtime, entrées, affordances,
feedback, reward, unlock, repeat, progression observable, meta-loop : TESTED) ; qualité du gameplay = **HumanGate FAIL** (« encore
le même objectif avec un numéro différent » ; machine à compter). Pas de verdict global. **Code : ne pas toucher. Rien aujourd'hui.**
Prochain travail SEULEMENT après avoir défini ce qu'est une **décision significative** dans le jeu cible : le contrat devra
distinguer LOOP_EXISTS de LOOP_HAS_MEANINGFUL_DECISION (REWARD → DECISION → NEXT_STATE avec transformation réelle : deux choix
→ deux états différents → objectif adapté) et mesurer des **changements de possibilité** (affordances disponibles par objectif),
pas un texte (`new_distinct` = syntaxiquement correct, sémantiquement insuffisant). Jamais un LLM pour ça. Confrontation aux
données 8b : les 4 affordances existent dès le Palier 0 (capture) ; `appears` n'a compté que le lieu `jardin` → sous ce critère,
GOAL_1/2/3 ont le même espace d'action = FAIL, cohérent avec le ressenti. Interdits maintenus : oracle LLM, station, profil,
narration, architecture, « plusieurs heures », vocabulaire STANDARD/Prisme, reuse, red-team.

## Audits design → runtime et World Scan → Art Bible → GM (archivé)
### Audit lecture seule design → runtime (2026-08-23, Opus, confronté Fable) — `docs/audit/2026-08-23-kitten-clicker-design-chain-audit.md`
Réponse : **on a construit avant de spécifier** — aucune station n'écrit les nombres ni la causalité du jeu (le GM mesure le GENRE,
la « station suivante » qu'il annonce n'existe pas) ; `design_intent.md` n'est lu par AUCUNE étape ; 0/21 exigences citent le design
(schéma d'adresse l'interdit) ; toutes les valeurs naissent dans `pricing.gd`/`prestige.gd` ; contenu entier épuisé en < 1 s ;
G et J verts pour la mauvaise raison (phrase suffixée d'un compteur ; J sans affordance = production passive — la sonde ignore
`replay_ref`). Table : boucle/progression DOCUMENTED_ONLY · métriques NOT_FOUND amont · métagame PASSIVE · design→GM BLOCKED ·
GM→Prisme PASSIVE · Prisme→runtime TESTED forme. Run 10 **non lancé** (run 10 `…b` avorté à s0 : build run 9 verrouillé par Godot ;
artefacts au scratchpad). Build run 9 déplacé au scratchpad, `games/kitten_clicker/` absent. **Audit 2 (Fable, sur pièces) :
World Scan → Art Bible → GM = NON par ORDRE** (s2.5 Art Bible produite APRÈS s2.7 GM et s1 ; GM ne reçoit que le World Scan ; l'Art
Bible n'a AUCUNE injection amont, ancrée Prisme seul ; le « GM » est un scan de genre, pas un Game Master) —
`docs/audit/2026-08-23-kitten-clicker-worldscan-artbible-gm-pipe.md`. Cible ratifiée Pierre : WORLD SCAN → ART BIBLE (héritée +
décidée) → GAME MASTER (loops, progression, métriques, preuves, Grey Blocks) → ARTIST/BUILDER ; réparer ce tuyau AVANT gameplay.

## HumanGate run 9 — détail (archivé)
### HumanGate Pierre 2026-08-23 sur le build run 9 — FAIL « jeu complet » = BASELINE PRODUIT (ratifié)
« Prototype mécanique avec habillage. » 4 causes : (1) les 6 chatons sont décoratifs (récompense visible avant d'être gagnée) ;
(2) le prestige n'est pas un 2ᵉ niveau (pas de reset réel / bonus permanent / nouvelle stratégie — un bouton) ; (3) espace trop
pauvre (nombre de chatons = variable, pas une colonie ; plafond = mur arbitraire) ; (4) guidage illisible (hiérarchie OBJECTIF →
ACTION → CONSÉQUENCE → PROCHAINE POSSIBILITÉ absente). V4/V5 n'ont pas échoué : ils ont fait apparaître la vérité produit.
**Prochain chantier = PRODUIT/GAMEPLAY, pas infrastructure** (pas de « V5 plus d'oracles ») : plan
`docs/superpowers/plans/2026-08-23-kitten-clicker-lot-produit.md` (P0 direction produit → P1 boucle → P2 vrai prestige →
P3 monde/placement → P4 guidage → P5 2ᵉ HumanGate « envie de continuer après le premier prestige ? »), réalisé PAR LA FORGE
(intention/tâches/contrat, mesure inchangée). P0 rédigé : `studio_brain/gamedesign/kitten_clicker_direction_produit_v1.md`
(PROPOSED : niveau 1 par possibilités nouvelles, prestige reset/conserve/cœurs/grenier, niveau 2 croquettes + décision
jardin/grenier, places = règle lisible, album de silhouettes).

