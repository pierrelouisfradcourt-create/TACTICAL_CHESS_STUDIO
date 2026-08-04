## RAPPORT FINAL — s1-prisme / lens=front / `tetris-amont2-20260803-225030`

**Rôle** : Prisme Produit, angle **Front/rendu** — l'écran, les retours visuels, les états d'interface (menu/jeu/overlay game-over/restart). J'ai décrit le produit **fini** (voit / fait / ressent + 14 règles observables), jamais le chemin de fabrication. Contexte vierge : je n'ai vu ni les autres lenses ni un contrôle.

**Mandatory_read** : `scripts/forge/contracts/SCHEMA.md` ✅ lu. `charter.yaml` de s0 → **absent** (run `amont_only`, s0 non jouée) : ancré sur le bootstrap `game_contract.yaml` + la proposition `genre_bible.json`.

**Livrable** : product_snapshot front — **entièrement rédigé**, conforme à la forme de l'oracle `check_prisme.mjs` (4 sections `## N.` aux titres exacts VOIT/FAIT/RESSENT/RÈGLES, chacune > 40 car, **14 règles `- **Rn`**, zéro placeholder dans le corps des sections). R1–R10 tracent 1:1 les `genre.tetris.*` ; R11–R14 dérivent du world scan front (`ux_flow.md`, `observation_manifest.json`, s2=OK).

**Ancres (non-LLM)** : `genre_bible.json` (`NON_RATIFIEE_PROPOSITION`), `ux_flow.md` + `observation_manifest.json` (`advisory:true`), `game_contract.yaml` (bootstrap non ratifié). Aucune n'est un oracle de rendu exécuté ni un charter ratifié.

### Verdicts (séparés)
- **software_verdict: BLOCKED** — l'oracle `check_prisme.mjs` existe et l'artefact est écrit pour le passer, mais (a) contrat `run: aucun` → je ne l'exécute pas, et surtout (b) **l'écriture au dépôt est refusée par la gate du harness** (chemin pourtant dans ma zone `write/create`) → l'oracle n'a rien à valider tant que ce n'est pas persisté.
- **evidence_verdict: MECHANICAL_VALIDATION_ONLY** — appliqué aux seuls faits documentés cités (ids `genre.tetris.*`, lignes de `ux_flow.md`/`observation_manifest.json`, champs de `game_contract.yaml`).
- **claim_verdict: NO_CLAIM_ALLOWED** — je n'affirme ni conformité à une variante, ni cohérence avec un charter s0 ratifié (absent), ni que le rendu est « satisfaisant ».

### Fog HumanGate (non inventés)
1. **`fog.forge.harness_write_connector`** (infra, distinct du contenu) — mon `Write` vers `lab/forge_runs/tetris/prisme/prisme_lens_front.md` est **refusé par le harness** (« permissions not granted »), **exactement** comme les lenses back/ceo/game_designer/contrôle de ce run l'ont rapporté. Ce n'est pas un défaut de contrat : c'est un **connecteur manquant entre la porte de dispatch Forge et la permission d'écriture du harness**. Tant qu'il n'est pas branché, **aucun lens ne peut persister** son artefact et `check_prisme.mjs` n'a rien à valider. Contenu **staged** dans le scratchpad de session (`…/scratchpad/prisme_lens_front.md`), **non persisté au dépôt** — je ne prétends pas l'inverse. **À remonter à Pierre.**
2. **`fog.tetris.charter_absent`** — charter s0 ratifié absent → cohérence-avec-charter (`success_criteria` s1) non vérifiable mécaniquement ; ancré au niveau invariant de genre (lui-même `NON_RATIFIEE_PROPOSITION`).
3. **`fog.tetris.variante`** — Guideline vs NES divergent sur des éléments **de rendu** (ghost, hold, profondeur d'aperçu, hard-drop, style de flash), volontairement exclus des règles invariantes R1–R14. Décision Pierre.
4. **`fog.tetris.feel_subjectif`** — la §3 (ressenti) n'est pas vérifiable par oracle de rendu ; proxys observables fournis (R2/R3/R9/R13), mesure = playtest Pierre.

### SKIPPED_VALIDATION
- **item** : persistance disque du livrable · **où** : `lab/forge_runs/tetris/prisme/prisme_lens_front.md` · **statut** : **non fait (bloqué)** · **raison** : gate d'écriture harness non accordée → `fog.forge.harness_write_connector`. Un grant d'écriture (ou un dépôt par l'appelant depuis le scratchpad) suffit à persister.
- **item** : exécution de `check_prisme.mjs` · **où** : le livrable · **statut** : non fait · **raison** : contrat `run: aucun` (et fichier pas encore persisté). Commande appelant : `node scripts/forge/prisme/check_prisme.mjs lab/forge_runs/tetris/prisme/prisme_lens_front.md`.
- **item** : cohérence avec charter s0 ratifié · **où** : `success_criteria` s1 · **statut** : impossible · **raison** : charter s0 absent → `fog.tetris.charter_absent`.
- **item** : choix de variante de rendu (ghost/hold/aperçu/hard-drop/flash) · **où** : R4, R11, R13 · **statut** : hors périmètre · **raison** : décision de design Pierre → `fog.tetris.variante`.
- **item** : mesure du ressenti « satisfaisant » · **où** : §3 · **statut** : non fait · **raison** : aucun oracle front de plaisir → `fog.tetris.feel_subjectif`.

**Décision requise (appelant / Pierre)** : brancher/accorder l'écriture Forge→harness sur `lab/forge_runs/tetris/prisme/prisme_lens_front.md` (le connecteur manque pour **tous** les lenses de ce run), puis passer l'oracle structurel. Le contenu front est prêt et n'attend que la persistance.