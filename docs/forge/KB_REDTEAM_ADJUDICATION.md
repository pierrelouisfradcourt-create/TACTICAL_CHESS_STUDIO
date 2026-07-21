# ADJUDICATION RED-TEAM — Contrat d'ingestion KB + validateur (v1 → v2)

- **Date** : 2026-07-12
- **Statut** : corrections APPLIQUÉES et prouvées ; **ratification Pierre en attente** (gate).
- **Dispositif** : LM Studio :1234 **down** (prouvé `curl connection refused`) → red-team en
  **fallback claude-blind assumé** (2 sous-agents Claude en contexte vierge, prompt adversarial,
  aucune mémoire de run partagée). Ce n'est **pas** un reviewer Qwen indépendant — honnêteté A2.
- **Cibles** : `docs/forge/KB_INGESTION_CONTRACT.md` (v1) + `knowledge_base/kb-validate.mjs` (v1).
- **Résultat brut** : agent A (contrat) — 11 findings, 7 confirmés par exécution (12/12 exploits
  admis sur v1). agent B (validateur) — 7 findings, dont un **crash** (EISDIR) manqué par A.
- **Preuve des corrections** : `knowledge_base/kb-validate.test.mjs` — **46/46 verts** (29 d'origine
  + 17 non-régression red-team `RT-F*`), vrai catalogue vert (exit 0), contrôle anti-théâtre
  toujours rejeté (exit 1). Fichier durci = `kb-validate.mjs` v2.

---

## 1. Convergence des deux agents

Les deux red-teams, indépendants, ont convergé sur les **deux invariants centraux réellement
cassés** en v1 :

1. **Le tier `validated` était un tampon.** `proof_of_use`/`usage_examples` ne passaient PAS par
   la garde de chemin : n'importe quel chemin existant (racine repo, absolu, dossier, chaîne vide,
   binaire système) « validait » une brique. C'est exactement le risque n°1 de l'arbitrage
   (« admission sans validation »). **→ le §6 anti-théâtre v1 ne testait qu'un cas trivial
   (`proof_of_use: null`) et ratait le cas réaliste (preuve plausible mais bidon).**
2. **La pureté offline R10 était contournable par des formes d'import STANDARD** (pas de
   l'obfuscation) : `import ... from "fs"` (sans préfixe `node:`), `from"node:fs"` (sans espace),
   `import()` dynamique. Un « system » pouvait lire/écrire le disque, exécuter des process.

Ces deux constats, confirmés par exécution, justifient à eux seuls le durcissement.

## 2. Disposition finding par finding

Légende : **CONFIRMÉ→CORRIGÉ** (reproduit + fix + test RT) · **PARTIEL** (corrigé pour les formes
standard, limite résiduelle déclarée) · **CORRIGÉ-CONTRAT** (le contrat était ambigu, resserré) ·
**RÉFUTÉ** (attaque infructueuse, preuve).

| # | Source | Sévérité | Disposition | Correctif (kb-validate.mjs v2) | Test |
|---|---|---|---|---|---|
| Crash EISDIR sur `path`=dossier | B-F1 | SÉRIEUX | **CONFIRMÉ→CORRIGÉ** | `guardedPath` : `lstatSync`+`isFile` avant tout `read` ; `validateCatalog` enveloppé try/catch (jamais de throw) ; CLI try/catch → exit 2 | `RT-F1: path dossier -> verdict, pas crash` |
| `proof_of_use` bidon | A-F1 / B-F3 | CRITIQUE | **CONFIRMÉ→CORRIGÉ** | `proof_of_use` routé par `guardedPath` (confiné `knowledge_base/proofs/`, fichier réel, pas `.`/absolu/dossier/vide) | `RT-F1` ×3 + cas positif |
| `usage_examples` bidon | A-F2 | CRITIQUE | **CONFIRMÉ→CORRIGÉ** | chaque `usage_examples[i]` routé par `guardedPath` | `RT-F2: usage vide -> R8` |
| import nu `from "fs"` | A-F3 / B-F2 | CRITIQUE | **CONFIRMÉ→CORRIGÉ** | `node:` optionnel, `\s*`, liste de modules élargie | `RT-F2: from "fs"` |
| `import()` dynamique | A-F4 / B-F2 | CRITIQUE | **CONFIRMÉ→CORRIGÉ** | motif `\bimport\s*\(` ajouté | `RT-F2: await import(...)` |
| `Math['random']`, `globalThis['fetch']` | A-F5 / B-F2 | SÉRIEUX | **CONFIRMÉ→CORRIGÉ** | motifs notation-crochet sur texte BRUT | `RT-F2: Math['random']` |
| aliasing `const M=Math; M.random()` | A-F5 | SÉRIEUX | **PARTIEL** | non couvert par analyse textuelle — **limite déclarée** (AST = incrément futur). Les formes courantes/standard sont fermées | — (documenté §3) |
| symlink/junction hors kb | A-F6 | SÉRIEUX | **CONFIRMÉ→CORRIGÉ** | `lstat` refuse les liens ; `realpathSync` confine la cible sous `knowledge_base/` | (couvert par `guardedPath` ; garde active) |
| `path:null` esquive R7/R10 | A-F7 | SÉRIEUX | **CONFIRMÉ→CORRIGÉ** | system/template non-godot **exige** `path` non-null | `RT-F7` |
| licence/format auto-déclarés | A-F8 | SÉRIEUX | **PARTIEL** | sniff marqueur GPL/LGPL/AGPL dans le code → R4 ; magic-bytes raster pour asset 2D ingéré → R6. **Résiduel** : un fichier GPL sans marqueur textuel déclaré MIT reste un gate humain (contrat §7) | `RT-F8`, `RT-F8b` |
| faux positifs R10 (commentaire/chaîne) | B-F5 | MINEUR | **CONFIRMÉ→CORRIGÉ** | `stripCommentsAndStrings` avant les motifs d'accès global | `RT-F5` ×2 |
| schéma ouvert (clé inconnue) | B-F6 | MINEUR | **CONFIRMÉ→CORRIGÉ** | `checkSpec` rejette toute clé hors spec | `RT-F6` |
| casse NTFS (verdict non portable) | B-F4 | MINEUR | **CONFIRMÉ→CORRIGÉ** | `readdirSync` : basename réel = basename déclaré (casse exacte) | (garde active) |
| confinement sous-dossier | B-F7 | MINEUR | **CONFIRMÉ→CORRIGÉ** | `SUBDIR` par type (assets/systems/patterns/proofs) | (garde active) |
| templates hors R10/R12 | A-F9 | MINEUR | **PARTIEL** | R10 (pureté) désormais appliqué aux templates code ; R12 (tests) **volontairement non exigé** (un template = squelette, pas une unité testée) — documenté | — |
| import dynamique de patterns | A-F10 | MINEUR | **CONFIRMÉ→CORRIGÉ** | `import()`/`require()` ajoutés à `PATTERN_IMPORT` | (motifs actifs) |
| pas de provenance pour du code | A-F11 | MINEUR | **CONFIRMÉ→CORRIGÉ** | system/template : `provenance_url` OU une dépendance `pat-*` (réécriture propre citée) | (garde active) |

### Réfutés / vérifiés corrects par le red-team (aucune modification)
- **`detectCycles`** : batterie exécutée par B (auto-boucle, cycle indirect, 2 composantes,
  figure-8, DAG diamant) → correct (DFS 3 couleurs). **RÉFUTÉ.**
- **Champ `path` lui-même** : `pathViolation` v1 gardait déjà absolu/`..`/antislash/hors-préfixe
  (axe 4 de A). La brèche était sur les chemins de PREUVE, pas sur `path` — corrigée.
- **Octet NUL, `size_kb` (0/Infinity/NaN), codes CLI nominaux** : pas de faille (B).

## 3. Limites résiduelles DÉCLARÉES (honnêteté — ne pas surjouer le durcissement)

1. **Évasion par aliasing de variable** (`const M = Math; M.random()`, `const g = globalThis.fetch;
   g()`) : l'analyse textuelle ne résout pas les identifiants. **Non couvert.** Recommandation :
   analyse AST (résolution des liaisons) dans un incrément futur. Ce qui EST fermé : les formes
   directes et la notation crochet, i.e. les contournements à coût nul cités par le red-team.
2. **Licence sémantique** : un fichier réellement GPL, déclaré `MIT`, **sans** marqueur GPL dans son
   texte, passe le gate mécanique. Le sniff attrape le code qui s'auto-identifie GPL ; le reste
   relève du **gate humain** (provenance vérifiée par Pierre). Explicité au contrat §7.
3. **Templates** : la pureté R10 s'y applique désormais ; l'exigence de tests (R12) **non** — un
   template est un squelette d'assemblage, pas une unité testée. Choix assumé.

Ces trois points sont des **frontières de l'outil**, pas des trous ignorés : le gate mécanique fait
ce qu'un gate mécanique peut faire ; le reste est nommé comme relevant du HumanGate.

## 4. Amendements au contrat (KB_INGESTION_CONTRACT.md)

- R7 étendu : couvre **tous** les chemins déclarés (`path`, `proof_of_use`, `usage_examples`,
  `tests`), refuse les **liens symboliques**, confine par **realpath** et **casse exacte**.
- R10 : préfixe `node:` optionnel, spécificateurs nus, `import()`/`eval`/`Function`/notation
  crochet ; passe RAW (imports) + passe STRIPPED (accès globaux). Limite AST déclarée.
- R4/R6 : ajout du **sniff de contenu** (marqueur GPL dans le code ; magic-bytes raster pour un
  asset 2D ingéré). Requalification explicite : la licence **sémantique** reste gate humain.
- R1 : **schéma fermé** (clé inconnue rejetée).
- Nouvelle règle : system/template non-godot **exige** un `path` ; code **exige** une provenance
  (URL ou dépendance `pat-*`).

## Rapport de charter

```
software_verdict: OK (validateur v2 durci — 46/46 tests, exploits red-team fermés ou déclarés limites)
evidence_verdict: MECHANICAL_VALIDATION_ONLY (LM Studio down prouvé ; red-team claude-blind assumé ; corrections reproduites en tests)
claim_verdict: NO_CLAIM_ALLOWED
```
