# PRE-RUN s9 — Snake, build Godot (run `snake-20260728-091302`)

**Statut : PROPOSED — attend la validation de Pierre. AUCUN build lancé.**
Produit le 2026-07-28 par la session Fable. Tous les chiffres sont re-exécutés par
l'orchestrateur. `claim_verdict: NO_CLAIM_ALLOWED`.

## 1. Ce qui sera lancé

```
Profil        : standard_godot          (nouveau, câblé et testé)
Étapes (5)    : s9-build-godot-standard [LLM]          -> claude-opus-4-8
                s10a-oracle-code        [déterministe] -> non-llm
                s10s-oracle-standard    [déterministe] -> non-llm
                s11-redteam-code        [LLM]          -> claude-opus-4-8   (advisory)
                s12-verdict             [déterministe] -> non-llm           (agrégation signée)
Run id        : snake-20260728-091302   (continuité de la télémétrie du run de conception)
Carte         : lab/forge_runs/snake/wiremap.json — 44 lignes, gelée, 4 oracles verts
Lancement     : PAR LE DRIVER, depuis LA SESSION — jamais un spawn manuel, jamais depuis
                un sous-agent (invariant 2 : un run long ne survit pas à son parent ;
                et l'allowlist d'outils vit dans run_real._STEP_TOOLS, que seul le driver lit)
```

## 2. Entrées, toutes vertes et re-vérifiées

| Artefact | État |
|---|---|
| `charter.yaml` v2 | `check_charter` **passed: True** · 22 criteres_succes · 16 criteres_demo · 8 paramètres isolés |
| Genre Bible Snake | **RATIFIÉE** (D4) · 12 règles · lisible par oracle |
| Panel Prisme (4 artefacts) | `check_prisme` **PASS ×4** |
| Recombinaison | `merge_prisme` **FULL_COVERAGE 22/22**, 0 GAP |
| Gameplay Review | `check_gameplay_review` **exit 0** · 23/23 items · 23 décisions dont 6 rejets |
| Wiremap | `line_states` **True** · `placement` **True** · `collisions` **True** (0 inconnu) · `genre_coverage` **True 52/52, taux 1.0** |
| Réutilisation typée | CONCEPT 25 · NEW 14 · OUTIL_FORGE 3 · CODE_COPIE 2 (empreintes non nulles vérifiées) |

## 3. Les 3 prérequis — traités

1. **Export templates Godot** — ✅ **faux prérequis, prouvé** : Godot 4.6.3 headless sort
   exit 0 sans eux ; la chaîne n'appelle jamais `--export`. Ils ne conditionnent qu'un
   colis distribuable, pas ce build.
2. **Session parallèle** — ✅ **archivée** (décision Pierre : option B). Tag
   `archive/godot-adapter-b0`, 43 fichiers / 5 206 lignes, worktree nettoyé. Le contrat de
   build **interdit explicitement** d'en extraire ou d'en dépendre.
3. **`s9-build-godot`** — ✅ **non touché** (trace historique de l'étape 0, brique M01).
   Remplacé par le jumeau `s9-build-godot-standard`, câblé au profil `standard_godot`.
   Vérifié : `s9-build-godot` n'appartient à aucun profil, comme voulu.

## 4. Non-régression au moment du PRE-RUN

- Témoin Pong : **72/72, exit 0** · `git status games/pong/` **vide** (état gelé strict).
- Suite studio : **994 passed, 1 skipped** (988 de référence + 6 tests du profil).
- `studio_selfaudit` : **STUDIO ALIGNÉ ✅**.
- Un défaut silencieux a été attrapé par un test existant pendant le câblage :
  `s9-build-godot-standard` manquait à `run_real._STEP_TOOLS` — l'agent serait parti
  **sans aucun outil**. Même panne que pour `s9-build-standard` le 2026-07-22 ; corrigée.

## 5. Ce que le run mesurera (l'expérience d'apprentissage)

- **Réutilisation typée** : combien de lignes CODE_COPIE (empreinte attestée) vs CONCEPT vs
  NEW se retrouvent dans le code réellement déposé. C'est la mesure d'accélération du cycle.
- **Citations résolues / revendiquées** : `taux_resolution` sur la Genre Bible (aujourd'hui
  1.0 sur la carte ; le build ne doit pas le dégrader).
- **Coût** : télémétrie M1. Référence de conception mesurée sur ce run : **2,24 M tokens /
  ~2 h 12** pour la moitié conception que Pong n'a jamais eue. **Ne pas comparer aux runs
  Pong** (périmètres différents) — le piège de mesure ratifié.
- **Densité de preuve** : nombre de lignes REQUIRED passées à IMPLEMENTED avec leur
  `expected_proof` réellement exécutée.

## 6. Risques connus, déclarés avant de partir

- **Cible de victoire (25) et trio d'accélération** : `A_EQUILIBRER`, non ratifiés — décision
  Pierre après la première boucle jouable observée. Le build les prend comme valeurs de
  travail, pas comme vérités.
- **Fog de courbe** : partie gagnante = 4 paliers, fin ≈143 ms/case ; le plancher 80 ms
  n'est atteint qu'au 55ᵉ fruit. La bande déclarée [80,200] ≠ bande jouée — la saturation
  se testera sur la règle pure, pas dans une partie gagnée.
- **`check_observable_coverage`** exige un reçu d'exécution : il ne s'exécutera qu'AU build.
  Il n'est pas vert aujourd'hui, et n'est pas présenté comme tel.
- **Preuve visuelle** : exige une fenêtre GPU réelle (`--headless` rend une texture nulle).
  Si un volet visuel est demandé, il ne peut pas être headless.
- **Tautologie R9** : le générateur d'instances ne doit jamais consulter la brique testée
  (précédent du 2026-07-21). Le contrat le porte ; à vérifier sur le reçu réel.
- **`--headless --script`** n'a été prouvé sans effet de bord qu'avec `--quit` ; son
  comportement complet sera observé sur le projet Snake, **jamais sur le témoin**.

## 7. Ce que ce run ne couvre PAS

Colis distribuable (export), télémétrie/équilibrage/progression comme systèmes (rejetés par
la review : l'extensibilité se paie en prises, pas en appareils), multijoueur, son
(`core.audio` DEFERRED, décideur Pierre), promotion de briques en bibliothèque
(propose-only, HumanGate).

## 8. Commande exacte proposée (à valider avant exécution)

```
PYTHONIOENCODING=utf-8 PYTHONPATH=scripts .venv312/Scripts/python.exe -m forge.driver \
  --project snake --profile standard_godot --run-id snake-20260728-091302 --step-timeout 3600
```
*(l'argumentaire exact du driver sera confirmé par `--help` au lancement ; le principe est :
un run par le driver, profil `standard_godot`, timeout par étape, depuis la session.)*

## 9. Décision demandée à Pierre

1. Valider le contrat `s9-build-godot-standard` (PROPOSED).
2. Valider le profil `standard_godot`.
3. Donner — ou non — le go d'exécution du build.

---
software_verdict: OK · evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED
