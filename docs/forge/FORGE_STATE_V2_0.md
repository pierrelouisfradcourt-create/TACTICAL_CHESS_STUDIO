# FORGE_STATE_V2_0 — snapshot canonique

*Figé le 2026-08-03. Source : preuves déjà obtenues ce jour (double audit structurel, audit des
campagnes, sorties Observer, suites de tests). **Aucun audit nouveau n'a été lancé pour produire ce
document.** Il ne fait que trier ce qui était déjà prouvé.*

```
software_verdict: OK        (état de l'outillage au moment du gel)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED
```

**Règle de lecture, non négociable** : un composant **non construit n'est pas un bug**. Les trois
sections ci-dessous ont des statuts de nature différente et ne se traitent pas de la même façon.

---

## 1. RÉPARÉ — câblé, actif, avec preuve

| composant | ce qui a été réparé | preuve |
|---|---|---|
| Détection de moteur (oracles) | aiguillage par **observation du projet** (`project.godot`) au lieu du nom de profil | `tetris`/`breakout_v2`/`snake` → `engine=godot` ; `collect_runner`/`shmup_slice` → `engine=web` |
| World Scan — objectifs joueur | bloc `objectives[]` (mode, victoire, défaite, but) + contrat producteur durci | 45/45 tests ; solvabilité Tetris **dérivable** de `has_win_state` |
| Contrat wiremap Tetris | exigence explicite des 10 lignes CORE (le jumeau Breakout la portait déjà) | `wm1-wiremap-tetris.yaml` |
| Boucle « manque ? » | `identifiants_inconnus` → `propose_capability_gap` → `pending_review.mjs` | 14 manques réels remontés et dédoublonnés |
| `propose_bible_entry` | écrivain branché (le lecteur avait sa file depuis toujours) | `driver.py`, `_run_standard_oracle` |
| Observer — portabilité | chemins dérivés du dépôt ; `events.jsonl` écrit **par défaut** | 0 littéral de poste hors commentaire ; 2 049 événements sans flag |
| Observer — 7 axes | axe `bloqué` + 4 états distincts (`ABSENT`/`JAMAIS_APPELE`/`APPELE_SANS_SORTIE`/`BLOQUE`) | falsifié sur les 4 états |
| Statut de run | vocabulaire `RUNNING · FROZEN_HUMAN · CLOSED · FAILED` ; driver refuse de reprendre un gel | Pong `FROZEN_HUMAN`, 4 étapes `PENDING` conservées |
| Master Schéma | 5 écarts prouvés corrigés + encart vocabulaire | débordement SVG levé par mesure (`getBBox`) |
| Capitalisation Pong/Snake | 8 leçons récupérées rétroactivement, catalogue 42 → 50 | chaque leçon ancrée sur une trace citée |

**Profil `full_godot`** créé : 14 étapes, seule chaîne cumulant conception amont, build Godot et les
deux familles d'oracles. Premier `wiremap_frozen.json` d'un jeu Godot (9 règles).

---

## 2. CONSTRUIT MAIS NON EXPLOITÉ — *ce n'est pas un défaut à corriger en urgence*

| composant | état | pourquoi ce n'est pas un bug |
|---|---|---|
| `learning_curve.jsonl` | écrivain câblé et actif, 11 lignes, **aucun lecteur de code** | Décision Pierre 2026-08-03 : **le 3e cerveau est le consommateur**. Ne pas fabriquer de lecteur artificiel. |
| Artefacts Observer (`RECONSTRUCTION.md`, `decisions_normalized.jsonl`, `wiremap_LIVING.json`, `planning_PROPOSED.yaml`) | produits, lus par aucun code | Même décision. Consommation humaine/orchestrateur assumée. |
| `propose_brick` | **appelé à chaque run**, fermé par son prédicat (`oracles.code.status == "OK"`) | `BLOQUÉ`, pas absent. Prédicat **volontairement non desserré** (décision Pierre). |
| `propose_bible_entry` | branché ce jour, file jamais peuplée par un run réel | Attend un run portant des décisions d'abandon. État honnête. |
| Pool de builders (`pool.py`) | construit, condition de bascule jamais vraie | Jamais déclenché depuis sa création. Conséquence : tout incrément retombe en from-scratch. |
| `s10d-oracle-visual` | **FANTÔME et redondant** | Capteur web DOM/canvas, aucune config Godot, aucun consommateur de reçu. Le vrai mécanisme Godot (`check_visual_capture`) est câblé. Retiré du Master Schéma. |
| `spawn_authorized` | `NON` sur les 4 axes | Trou `DISPATCH_SPAWN_AUTHORITY_V1` (2026-07-23), toujours ouvert. 19 dispatches exécutés / 0 autorisé sur le run Tetris. |

---

## 3. NON CONSTRUIT — *roadmap, jamais un bug*

| composant | statut | note |
|---|---|---|
| Réconciliation CORE/EXPECTED/DERIVED/ADDITIONS | `NOT_FOUND` | Rien n'est codé, le Master Schéma l'avoue. **Ne pas ouvrir** (décision Pierre). Chantier de capacité future. |
| Étage s8 — habillage / assets | `NOT_FOUND` | Aucun contrat, hors chaîne. |

---

## 4. DÉCISIONS HUMAINES RESTANTES

1. **`check_search_consulted` — advisory → bloquant.** Essai mesuré : 36 nouveaux échecs. Cause :
   la fonction lit un chemin absolu fixe sans portée par run, donc gater dessus ferait dépendre un
   oracle d'un état global étranger au run testé. Trois options valides — journal indexé par
   `run_id` (ma préférence : rend la preuve de fouille attribuable), `log_path` de portée run, ou
   accepter la mise à jour des 36 tests. **Décision de conception.**
2. **Chantier `P4-doctrine-vs-realite`** — 12 arbitrages doc↔réalité, `EN_ATTENTE` depuis le
   2026-08-02 par décision Pierre, un arbitrage **par drift**.
3. **Prédicat de `propose_brick`** — une brique ne doit-elle être proposable que sur oracle de code
   vert ? C'est ce prédicat qui bloque toute capitalisation de briques. Gelé volontairement.
4. **Commit de `lab/reports/observer/`** — geste Pierre en attente depuis le 2026-07-31.

---

## 5. RISQUES CONNUS

- **Le pool jamais déclenché** est le maillon cassé le plus précoce de la chaîne de production :
  fouille et retour web fonctionnent (22 requêtes réelles, dernière avec 7 résultats), mais rien ne
  bascule vers la réutilisation. Tout incrément repart de zéro.
- **`spawn_authorized` à 0** — la preuve d'autorisation de spawn n'est pas produite ; le hook
  vérifie la présence d'un dispatch, pas l'autorisation.
- **Prompt système et skills chargés non captés** par l'Observer (0 occurrence de `system_prompt`).
  Un benchmark inter-modèles serait donc non attribuable en l'état.
- **Le run de référence Tetris est moins traçable que Breakout** : lancé sans `--charter` ni
  `--tasks-file`, il ne porte ni `run.task_prompt` ni `run.charter`. À corriger au relancement.
- **5 échecs de tests préexistants** hors périmètre Forge (studioV2 gelée, ML train, roadmap ledger,
  dataset admission) — stables, jamais masqués.
- **3 démos Breakout V2 en échec** par contrainte de fenêtre GPU (`--headless` rend une texture
  nulle) : limite d'oracle documentée, pas un défaut de jeu.

---

## 6. ÉTAT DES CAMPAGNES

| projet | statut | leçons | KB | décisions | verdicts |
|---|---|---|---|---|---|
| Pong | `FROZEN_HUMAN` — run jamais terminé, aucun verdict signé | 5 | oui | `PONG_FROZEN_HUMAN_V1` | 2 (FAIL) |
| Snake | `CLOSED_WITH_OBJECTION` — wiremap jamais gelée | 6 | oui | clôture 08-03 | 14 |
| Breakout V2 | `CLOSED` — ratifié et gelé, témoin de régression | 6 | oui | `BREAKOUT_V2_FREEZE_V1` | 4 |
| Tetris | **OUVERT** — `FAIL / BLOCKED`, intégrité AUTHENTIQUE | 5 | oui | — (normal : rien à clore) | 2 |

---

*Ce document est un **constat**, pas une ratification. `claim_verdict: NO_CLAIM_ALLOWED`.
HumanGate Pierre sur merge/reject/freeze.*
