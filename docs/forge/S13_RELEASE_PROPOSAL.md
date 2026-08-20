# S13/S14 — Profil `release` : du verdict ratifié au build publiable

- **Statut : RATIFIÉ DANS LE PRINCIPE (Pierre, 2026-07-19 : « ok pour la release, ça peut t'aider à garder la vision ») — IMPLÉMENTATION DIFFÉRÉE.** Prérequis posé par Pierre : avoir playtesté les jeux (« tant que j'ai pas testé les jeux […] nous n'y sommes pas »). Aucun code modifié, aucun contrat activé.
- Contexte 2026-07-19 : publication réelle en cours À LA MAIN via Render (sessions parallèles Belote + auto battler) — S13 formalisera plus tard ce geste manuel (paquet déterministe + preuves signées), il ne le remplace pas aujourd'hui.
- Date : 2026-07-19 · Source : session stratégie productivité/entreprise (orchestrateur Fable)
- Périmètre : lane FORGE uniquement (`scripts/forge/`, `lab/forge_runs/`) — zéro contact autopilot/STUDIO.

## 1. Problème

La chaîne Forge s'arrête à `verdict.json` signé + HumanGate ([dispatch.py:32-46](../../scripts/forge/dispatch.py) : ORDER se termine à `s12-verdict` ; grep `release|publish|deploy|itch` sur `scripts/forge/` + skill forge = zéro hit réel). Après ratification Pierre, **aucun mécanisme ne transforme le run en artefact jouable par un inconnu**. Conséquence mesurable : builds publiés = 0 depuis le début de la lane, alors que des jeux ont des verdicts signés authentiques.

C'est le mode de panne connu « déclaré ≠ exécuté » appliqué au produit : un jeu mergé mais non publié est *déclaré*, pas *exécuté*.

## 2. Principe doctrinal (non négociable)

1. **La chaîne automatique ne franchit JAMAIS le HumanGate.** Le profil `release` n'est pas ajouté à `full` ; il est invoqué manuellement, par Pierre, APRÈS ratification du run du jeu. Mécanisme maison existant : `DEDICATED_PROFILE_STEPS` ([dispatch.py:51-58](../../scripts/forge/dispatch.py), précédent `s2.5-artbible` — « jamais silencieusement incluses dans full »).
2. **La publication effective (upload itch.io / hébergeur) reste HORS chaîne** : la Forge produit un paquet prêt-à-uploader + une checklist ; l'acte de publication est un geste manuel de Pierre (acte externe, irréversible, à visibilité publique — même régime que push).
3. **Étapes 100 % déterministes non-LLM** (`capability_role: deterministic`, comme s10a/s12) : zéro nouveau rôle LLM, zéro nouvelle surface d'agent.
4. **Reçus signés HMAC** comme tout oracle (réutilise `make_signed_receipt`, [verdict.py:134](../../scripts/forge/verdict.py)) ; `forge.verify_run` doit rester exit 0 sur le run étendu.
5. `claim_verdict: NO_CLAIM_ALLOWED` — un paquet vert prouve « le paquet démarre et le smoke passe », jamais « le jeu est bon ».

## 3. Les deux étapes proposées

### s13-package (déterministe)

**Préconditions mécaniques (fail-closed, dans cet ordre)** :
- P1 — `forge.verify_run` exit 0 sur le run référencé (provenance intacte).
- P2 — `is_clean_pass(verdict)` vrai ([verdict.py:196-218](../../scripts/forge/verdict.py), prédicat canonique — jamais `software_verdict` seul). **OU** : decision `HUMANGATE_READY_WITH_OBJECTION` + chemin d'un enregistrement de gate Pierre (`--gate-record`, ex. `HUMANGATE_*.md` contenant le run_id et la décision MERGE) — consigné dans le manifest. Sans l'un des deux → BLOCKED.
- P3 — worktree propre sur le périmètre du jeu (pas d'écart non commité dans `games/<jeu>/`) — sinon le paquet ne correspond à aucun état ratifié.
- P4 — jeu statique-servable (index.html autonome ; un `server.mjs` de dev/e2e n'est pas une dépendance runtime). Jeu non statique = hors scope v0, BLOCKED explicite.

**Sortie** : `lab/forge_runs/<projet>/release/<run_id>/`
- `dist/` — build web autonome (copie des fichiers runtime, chemins posix)
- `release_manifest.json` — projet, run_id, git_head, sha256 du verdict.json, sha256 par fichier, sha256 du zip, gate_record éventuel, date
- `<projet>-<run_id>.zip` — archive **déterministe** (mtimes normalisés, ordre d'entrées trié : deux packagings du même état → zip byte-identique)
- reçu signé `s13-package` dans `evidence/`

### s14-smoke-release (déterministe)

Sert `dist/` (le paquet EXACT, pas les sources) sur un port éphémère local, rejoue le smoke e2e existant du jeu contre ce paquet, capture les screenshots dans `release/<run_id>/evidence/`. Vert = « jouable tel qu'empaqueté ». Reçu signé. Aucun réseau sortant.

**Ce que release ne refait PAS** : mutation, oracles archi/wiremap, red-team — déjà prouvés et signés dans le run ratifié ; release les **re-vérifie** (P1) au lieu de les re-juger.

## 4. Câblage exact (vérifié sur le code réel)

| Point | Modification | Réf |
|---|---|---|
| `contracts/s13-package.yaml`, `contracts/s14-smoke-release.yaml` | 2 contrats schéma 17 champs, `capability_role: deterministic` | SCHEMA.md ; annexe A |
| `dispatch.py` | `DEDICATED_PROFILE_STEPS += ("s13-package", "s14-smoke-release")` ; `PROFILES["release"] = ("s13-package", "s14-smoke-release")` ; `DETERMINISTIC +=` les deux. **PAS dans ORDER** (`full = tuple(ORDER)` ligne 69 : l'étendre étendrait full) | dispatch.py:49, 58, 68-69 |
| `driver.py` | 2 branches `elif` avant le else-BLOCKED (« étape déterministe non câblée ») | driver.py:481-485 |
| `roles.yaml` | **rien** (rôle `deterministic` existant) | roles.yaml |
| `oracles.json` | réutilise l'entrée e2e du jeu, pointée sur `dist/` (variable d'env ou argument) — détail à trancher au build | oracles.json |

Numérotation : s13/s14 continuent après s12 (le trou s7/s8 est historique et assumé).

## 5. Critères d'acceptance (oracle de l'implémentation future)

1. `python -m scripts.forge.driver --project <jeu_ratifié> --profile release` → paquet + manifest + zip + 2 reçus signés.
2. Déterminisme : deux exécutions successives sur le même état → même sha256 de zip.
3. Smoke e2e vert **sur le paquet servi**, screenshots en évidence.
4. `forge.verify_run` toujours exit 0 ; reçus release vérifiables.
5. Préconditions falsifiées une à une (verdict altéré, WITH_OBJECTION sans gate-record, worktree sale, jeu non statique) → BLOCKED à chaque fois, jamais un vert par défaut.
6. Zéro écriture hors `lab/forge_runs/<projet>/release/` et `evidence/` ; zéro fichier tmp restant.

## 6. Risques connus

- **Déterminisme zip sous Windows** (mtimes, séparateurs) — traité par normalisation explicite, testé par le critère 2.
- **TOCTOU git_head** — même limite que `verify_run` (avertissement non bloquant existant) ; P3 la réduit.
- **E2e flaky sur paquet** — même harnais que le run, surface de flakiness identique, pas nouvelle.
- **Confusion avec le skill studio `/release`** — `/release` (gate Pierre obligatoire) devient l'orchestrateur humain qui INVOQUE ce profil ; le profil est le bras mécanique. À consigner dans le skill au moment du build.

## 7. Hors scope explicite

Création de compte itch.io, upload automatique, monétisation, pages marketing, analytics. Tout acte de publication = Pierre.

---

## Annexe A — squelette des contrats (à finaliser au build, schéma 17 champs)

```yaml
# s13-package.yaml — champs saillants (les 17 requis seront tous remplis)
role: "Empaqueteur déterministe de release — aucun jugement, préconditions fail-closed"
capability_role: deterministic
mandatory_read: [lab/forge_runs/<projet>/verdict.json, release_gate_record?]
objectif: "Produire dist/ + manifest + zip déterministe depuis un run ratifié"
in_scope: [lab/forge_runs/<projet>/release/]
out_of_scope: [games/<jeu>/ en écriture, toute mémoire studio, tout réseau]
permissions: {read: [games/<jeu>/, lab/forge_runs/<projet>/], write: [lab/forge_runs/<projet>/release/], run: [python], create: [release/], delete: []}
gardeFou: "Jamais de vert par défaut ; précondition manquante = BLOCKED ; NO_CLAIM_ALLOWED"
success_criteria: [manifest complet, zip déterministe, reçu signé]
tests_oracles: [sha256 stable sur double run, verify_run exit 0]
```

```yaml
# s14-smoke-release.yaml — champs saillants
role: "Smoke e2e sur le paquet servi — prouve jouable-tel-qu'empaqueté"
capability_role: deterministic
objectif: "Servir dist/ en local éphémère, rejouer le smoke e2e du jeu, screenshots en évidence"
gardeFou: "Teste le paquet, jamais les sources ; aucun réseau sortant ; NO_CLAIM_ALLOWED"
```

---
software_verdict s'appliquera à l'implémentation, pas à ce document.
claim_verdict: NO_CLAIM_ALLOWED
