# Context Loop V1 — Architecture du contexte agentique de la Forge

- **Statut** : PROPOSED — gate Pierre requis avant tout code
- **Date** : 2026-07-25 · **Auteur** : Fable (rôle : Architecte du contexte agentique, mandat Pierre 2026-07-25)
- **Fondations factuelles** : docs/audit/FORGE_AUDIT_BRANCHEMENTS_2026-07-24.md + docs/audit/AGENT_CONTEXT_AUDIT_2026-07-25.md (écarts E1→E8)
- **Règle appliquée** : anti-couches (doctrine Knowledge Resolver 2026-07-20) — la boucle RÉUTILISE la porte,
  le driver, verify_run et les manifestes existants. Aucun nouveau service, aucun nouvel agent.

## 1. Problème

Un agent Forge peut être réveillé plusieurs fois pendant qu'autour de lui la Game Bible, la Wiremap, la KB,
les invariants ou l'environnement changent. Aujourd'hui, RIEN ne dit à un agent ce qui a changé depuis sa
dernière activation, et rien ne permet de prouver sur quelle version d'une source il a conclu.

**Cas réel constaté ce jour** (repo, HEAD 6932be7) :
`lab/forge_runs/shmup_slice/wiremap.json` (mtime 2026-07-18) a changé **4 jours après** son gel
`wiremap_frozen.json` (mtime 2026-07-14). Un agent repris le 18/07 travaillait sur une wiremap différente
de celle gelée à s5 — la pause de 4 jours du run shmup_slice (audit Workflow) est exactement la fenêtre où
ce type de dérive frappe. Seul `check_feature_set_frozen` en attrape une partie (noms de règles), pas le contenu.

## 2. Principe directeur

> Le contexte devient un **artefact versionné du run**, produit par la porte existante, diffé entre
> activations, vérifié par verify_run. On ne donne pas PLUS de contexte : on donne le bon delta, avec preuve.

La boucle cible :
```
CONTEXTE INITIAL → SNAPSHOT (manifest signé au dispatch)
                → ÉVOLUTION DU PROJET (le repo vit)
                → CONTEXT DIFF (manifest N vs état courant / manifest N+1)
                → ANALYSE D'IMPACT (qui consomme quoi → étapes affectées)
                → REFRESH CIBLÉ (bloc « CE QUI A CHANGÉ » injecté, delta seulement)
                → REPRISE DE L'AGENT
```

## 3. Les trois couches, mappées sur l'existant

| Couche | Réponse à | Existe aujourd'hui | Trou (réf. audit) |
|---|---|---|---|
| **Bootstrap** | qu'a-t-on donné au démarrage ? | prompt rendu par la porte + artefacts amont inlinés + pré-mortem (chemin driver) | contenu non versionné (E2), mandatory_read sans force (E1), prose non tracée (E6) |
| **Dynamique** | qu'est-ce qui a changé depuis ? | RIEN — aucun mécanisme | tout ce chapitre |
| **Prouvé** | qu'a-t-il vu avant de conclure ? | « servi » (driver) et « cité » (knowledge_trace) | « lu » jamais capturé (E3) |

Vocabulaire imposé de la couche prouvée : **fourni** (dans le prompt — prouvable dès l'étape 1) ·
**lu** (ouvert via un outil — exige la capture transcript, étape 5) · **utilisé** (cité dans l'artefact —
knowledge_trace existant) · **influent** (déclaré dans le rapport de l'agent — champ à ajouter au
format rapport, chantier R6 de l'audit du 24/07).

## 4. Pièce centrale : le Context Manifest

Un fichier par dispatch, écrit par `prepare_dispatch` (le SEUL point où étape, run_id, contrat et prompt
sont tous connus) : `lab/forge_runs/<projet>/context/<etape>-<n>.manifest.json`, **HMAC-signé comme les
reçus d'oracle** (même clé, même mécanisme verdict.py).

```json
{
  "run_id": "shmup_slice-20260714a",
  "etape": "s9-build",
  "activation": 2,
  "ts": "...",
  "git_head": "6932be7",
  "prompt_sha256": "<hash du prompt FINAL assemblé>",
  "sources": [
    {"path": "lab/forge_runs/shmup_slice/wiremap.json",        "sha256": "b0f48b7d8df858fd...", "role": "injected"},
    {"path": "lab/forge_runs/shmup_slice/wiremap_frozen.json", "sha256": "1b9e1e16758032b1...", "role": "oracle_ref"},
    {"path": "scripts/forge/contracts/s9-build.yaml",          "sha256": "d20f16e56180a807...", "role": "contract"},
    {"path": "knowledge_base/catalog.json",                    "sha256": "f294a7233e228940...", "role": "declared_only"}
  ],
  "premortem_snapshot_sha256": "<fige le pré-mortem injecté — aujourd'hui mouvant, E2>",
  "claim_verdict": "NO_CLAIM_ALLOWED"
}
```

Ce que ça ferme d'un coup : **E2** (prompt versionné/reconstituible), **E4 partiellement** (le contrat est
hashé au moment du dispatch — une édition post-validation devient détectable), et donne l'assise de tout le reste.

## 5. Context Diff + analyse d'impact

`context_diff.mjs` (CLI, même famille que pending_review.mjs) : compare un manifest à l'état courant du
repo (ou deux manifests). Sortie : `unchanged / changed / added / removed` par source, avec hashes.
L'**impact** est résolu par une table statique `CONTEXT_CONSUMERS` dérivée de ce qui existe déjà —
`_UPSTREAM_BY_STEP` (qui injecte quoi) + `mandatory_read` des contrats (qui déclare lire quoi) :
« `wiremap.json` a changé → étapes affectées : s9-build, s11-redteam-code, s10c ». Aucune inférence LLM.

## 6. Refresh ciblé

Chemin driver uniquement (V1) : à la reprise d'une étape (retry, escalade, reprise après pause), le driver
compare le manifest de l'activation précédente à l'état courant et injecte un bloc :

```
## CE QUI A CHANGÉ DEPUIS TA DERNIÈRE ACTIVATION (2026-07-14 → 2026-07-18)
- wiremap.json : MODIFIÉE (diff des features : R14 ajoutée, R7 reformulée) — relis-la.
- blueprint.json : inchangé.
- 2 nouvelles leçons pré-mortem depuis ton dernier passage : [...]
```

Delta seulement — jamais de rechargement complet. Coût tokens : le diff, pas le corpus.

## 7. Context Integrity Check (avant chaque run important)

CLI `context_check.mjs` produisant un rapport advisory (format à la /fog : VÉRIFIÉ vs FOG) :

1. **Sources attendues** : union mandatory_read (contrats du profil) + _UPSTREAM_BY_STEP + registres (roles.yaml).
2. **Réellement disponibles** : existence + lisibilité (attrape le mort-vivant PROJECT_BIBLE, E1).
3. **Versions** : sha256 + git_head courant.
4. **Différences depuis dernière activation** : diff vs dernier manifest du projet.
5. **Impacts** : étapes affectées via CONTEXT_CONSUMERS.
6. **Refresh nécessaires** : liste des blocs à injecter à la reprise.

Verdict : `CONTEXT_COHERENT` / `CONTEXT_DRIFT (n sources)` / `CONTEXT_INCOMPLETE (sources manquantes)` —
**advisory en V1** (jamais gate dur sans décision Pierre, même règle que R3 selfaudit).

## 8. Plan incrémental (chaque étape utile seule, ordre = valeur/coût)

| # | Livrable | Ferme | Coût | Dépend de |
|---|---|---|---|---|
| 1 | `context_manifest` écrit+signé par prepare_dispatch (+ figement du pré-mortem injecté) | E2, E4 partiel | ~½ j (module + tests + câblage porte) | — |
| 2 | `context_diff.mjs` + table CONTEXT_CONSUMERS | couche dynamique (lecture) | ~½ j | 1 |
| 3 | `context_check.mjs` (Integrity Check pré-run, advisory) | boucle §7 | ~½ j | 2 |
| 4 | Refresh ciblé dans le driver (bloc « ce qui a changé » à la reprise) | contexte obsolète | ~1 j (+ tests driver) | 2 |
| 5 | Capture transcript (`--output-format stream-json` dans run_real) → couche « lu » | E3 | ~1 j + coût stockage | 1 |

Étapes 1-3 = lecture/écriture d'artefacts, zéro changement de comportement agent → risque faible.
Étape 4 modifie les prompts (comportement) → à valider sur un run d'essai. Étape 5 = opt-in coût.

## 9. Ce que la V1 ne prétend PAS résoudre

- Le chemin **prose** (16/21 runs) reste non manifesté — la boucle exige le passage par la porte/driver ;
  c'est un argument de plus pour l'Option A (doctrine driver, décision déjà en attente, audit 24/07 §5).
- « Lu » sans l'étape 5 : le manifest prouve le **fourni**, pas la lecture.
- La qualité sémantique des sources (une Game Bible fausse mais à jour passe le check).
- La KB vide de résultats (search 5/5 matchCount:0) : problème de contenu, pas de contexte — chantier séparé.

## 10. Décisions Pierre requises

1. **Go étapes 1-3** (manifest + diff + integrity check, advisory) ?
2. Integrity check : advisory définitif, ou destiné à devenir gate dur après période d'observation ?
3. Étape 4 (refresh dans les prompts) : direct, ou après observation d'un run avec étapes 1-3 ?
4. Étape 5 (transcript, couche « lu ») : opt-in par run, systématique, ou différée ?
5. Confirmer que la boucle est **driver-only** en V1 (lie cette architecture à l'Option A).
