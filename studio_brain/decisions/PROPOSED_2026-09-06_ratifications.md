# PROPOSÉ — décisions candidates au decision-log (2026-09-06)

#decisions #proposed

> **Statut : PROPOSED. Rien ici n'est acté.** Ce fichier est produit par la revue hebdomadaire de
> mémoire, qui est **propose-only** (CLAUDE.md § « Écritures durables ») : le `decision-log.md` est
> append-only et **écrit par `/gate` sur ratification explicite de Pierre**, jamais par la revue.
>
> **Source** : lecture du dépôt seul (git log, `00_CURRENT_CONTEXT.md`, dossiers de preuve).
> Généré le **2026-09-06**. `claim_verdict: NO_CLAIM_ALLOWED`.
>
> **Ce que la revue ne peut PAS établir** : si Pierre a effectivement tenu une séance HumanGate sur
> ces points. Les messages de commit disent « décision Pierre » pour ①, mais **un message de commit
> n'est pas une ratification** — c'est de l'`AUTO_ATTESTED` au sens de l'invariant de provenance
> ratifié le 2026-08-28. Chaque entrée ci-dessous est donc un **candidat**, à confirmer ou à écarter.

---

## Constat de couverture

Le `decision-log.md` s'arrête au **2026-09-01** (dernière entrée : « Clôture de l'analyse PAIRE 2 »).
Entre le **2026-09-01 et le 2026-09-03**, cinq gestes portant une décision apparaissent dans le dépôt
sans entrée correspondante. Vérifié par `grep` sur le log : `Shadow Audit` = 0 · `p3_beta`/`P3-1` = 0 ·
`PAIRE 3`/`PAIRE 4` = 0 · `carte de vérité` = 0 · `lesson.v2` = 0.

---

## ① Arrêt honnête de `p3_beta` (L3) — finding P3-1, option (b)

- **Trace** : `a999f6dc` (2026-09-01) *« arrêt honnête p3_beta (L3) — finding P3-1, décision Pierre (b) »*,
  complété par `24aa124c` *« addendum portée du finding P3-1 — distinction Pierre (comportement observé,
  pas capacité du modèle) »*.
- **Ce qui semble décidé** : le run L3 est arrêté sans hotfix ; le finding P3-1 est enregistré comme
  **comportement observé**, explicitement **pas** comme une conclusion sur la capacité du modèle.
- **Caractère irréversible** : moyen — l'arrêt est consommé, la qualification de portée engage
  l'interprétation de toute la campagne L/D.
- **À confirmer par Pierre** : le libellé exact de l'option (b), et si l'addendum de portée est une
  décision distincte ou la même.

## ② Pré-enregistrements PAIRE 3 et PAIRE 4

- **Trace** : `fcf56b5e` (PAIRE 3, 10 items matérialisés/vérifiés/scellés) · `feeb29cb` (PAIRE 4,
  10 items scellés + registre de non-régression de paire EXÉCUTÉ). Les deux : **zéro dépense LLM**.
- **Ce qui semble décidé** : le protocole des paires 3 et 4 est **scellé avant exécution** — ce qui,
  par construction, interdit de le retoucher après avoir vu les résultats.
- **Caractère irréversible** : élevé. Un pré-enregistrement scellé qu'on rouvre ne vaut plus rien.
- **Précédent** : la ratification du pré-enregistrement RUN 2 **a** été loguée (entrée 2026-08-30).
  Les paires 3 et 4 ne l'ont pas été — asymétrie à trancher.
- **À confirmer par Pierre** : le GO d'exécution est-il donné, ou les paires restent-elles `BLOCKED`
  en attente d'un arbitrage coût/valeur (~2 runs) comme pour la paire 2 ?

## ③ Sas moteur — `check_charter` devient BLOQUANT (findings 7-8)

- **Trace** : `08fea292` (findings 7-8 : `check_charter` bloquant, bloc charter unique, tick de mesure
  gardé) · `58095ba9` (sas 2 + sas 3 : acquittement mesurable, jointure observable — **tout en advisory**).
- **Ce qui semble décidé** : le passage d'un contrôle **advisory** à un contrôle **bloquant** sur
  `check_charter`, en réponse directe au finding n°7 qui avait invalidé L2.
- **Caractère irréversible** : élevé — un gate bloquant change le comportement de toute la chaîne et
  peut faire échouer des runs qui passaient. C'est exactement le type de geste que la doctrine
  réserve au HumanGate.
- **Point de vigilance** : les sas 2 et 3 restent **advisory**. Le log devrait dire pourquoi l'un
  bloque et pas les autres, sinon la distinction se perdra.

## ④ Clôture Shadow Audit V1→V6 + retrait du P0 « débrider l'Architecte »

- **Trace** : `d6c2510c` (2026-09-01) *« clôture session — campagne Shadow Audit + E0/E1/E1b + lesson.v2 »*,
  détaillé dans `00_CURRENT_CONTEXT.md` mais **absent du decision-log**.
- **Ce qui semble décidé** : (a) Shadow Audit **CLOS sans patch** — les défauts confirmés (producteur
  = son propre juge, Brief sans champ capacitaire, télémétrie de jeu `NOT_FOUND`, 5 contrôleurs
  dormants) sont laissés **observables** plutôt que réparés ; (b) le **P0 « débrider l'Architecte »
  est RETIRÉ** sur mesure E1b (`margin_ratio` identique, **4,4× le coût**, run `BLOCKED`) ;
  (c) `lesson.v2` — `cause` devient un champ et la porte du contexte agent (121 leçons migrées,
  **205 causes perdues** à la migration).
- **Caractère irréversible** : élevé sur (b) et (c). Le retrait d'un P0 réoriente la feuille de
  route ; **205 causes perdues** est une perte de données irréversible qui mérite d'être écrite
  quelque part de durable, pas seulement dans un handoff.
- **À confirmer par Pierre** : le retrait du P0 est-il définitif ou suspendu à un signal ?

## ⑤ Studio V2 — carte de vérité + plan de construction (2026-09-03)

- **Trace** : `427d8db2` + `844df04a` (carte de vérité V2, 3 corrections Pierre avant clôture) ·
  `3a9ef2d3` (plan de construction, lots 0→4). Le plan se déclare lui-même **`PROPOSED`, non commité,
  aucune ligne de code modifiée** — il l'était au moment de sa rédaction, il est depuis commité.
- **Ce qui n'est PAS une décision** : le plan lui-même. Il est explicitement proposé.
- **Ce qui EST une décision en attente** : le plan pose **D0 — la construction V2 n'a pas de
  destination canonique** (le code V2 vit hors du dépôt, sans remote) et **D2 — séparer « projet »
  de « run »**. Ces deux points sont des arbitrages Pierre, non pris.
- **Recommandation** : ne rien loguer comme décision ; **ouvrir D0 et D2 en décisions attendues**.
  Voir aussi `decisions/DEFERRED.md`.

---

## Non proposé volontairement

- **Refresh `CLAUDE.md` du 09-03** (`49eacd3a`) — GO Pierre déjà donné dans la session, geste
  documentaire, déjà tracé dans `00_CURRENT_CONTEXT.md`. Pas une décision irréversible.
- **Ratification `FORGE_DESIGN_FREEDOM_SPEC_V0`** — déjà présente au `decision-log.md` (2026-08-30).
- **Disparition de `games/kitten_clicker/`** — **fait constaté, pas décision.** Si Pierre confirme
  que la suppression était volontaire, cela devient une décision à loguer ; si c'est une perte, cela
  devient une entrée d'impasse. Voir [[../000_HOME|Map of Content]].

---

`software_verdict: OK` · `evidence_verdict: MECHANICAL_VALIDATION_ONLY` · `claim_verdict: NO_CLAIM_ALLOWED`
