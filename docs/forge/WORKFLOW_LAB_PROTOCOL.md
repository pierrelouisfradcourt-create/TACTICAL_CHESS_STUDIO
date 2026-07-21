# WORKFLOW LAB — protocole MCTS sur le workflow (gabarit)

- **Date** : 2026-07-12 · **Statut** : PROPOSED (gabarit — chaque expérience instanciée doit être
  ratifiée Pierre AVANT run) · `claim_verdict: NO_CLAIM_ALLOWED`.
- **Filiation** : méthode `P1_1_PROTOCOL.md` (hypothèse → contrat → red-team → ratification →
  expérience → conclusion limitée), appliquée à un nouvel objet : **le workflow lui-même**.
- **Schéma** : `STUDIO_MASTER_SCHEMA.html` Détail E (« L'ARBRE »).

---

## 0. Principe (une phrase)

Le studio est un échiquier : la **position** = le schéma de workflow, un **coup** = une mutation
bornée du schéma, un **rollout** = un run forké sur le même input, la **récompense** = le panel
d'oracles, la **sélection** = Pierre. MCTS à petit budget — le joueur humain, pas AlphaZero.

## 1. Le mapping (fermé)

| MCTS | Ici | Coût |
|---|---|---|
| Position | schéma de workflow (profil, ordre, contrats, rôles) + étape courante | 0 token (données) |
| Coup | **UNE** mutation de schéma (ex. prisme→panel ; builder→pool ; s2 élargi) | 0 token (diff YAML) |
| Prior (« supposition ») | PILOU + red-teams + bilans multi-LLM — cité, jamais inventé | 0 token (lecture) |
| Rollout | run **forké tardivement** : artefacts partagés en cache (ex. s0→s5), seuls les aval re-tournent, seeds figés, petits modèles, escalade ×2 max | borné, plafonné AVANT |
| Récompense | panel §3 (oracles uniquement) | 0 token (traces) |
| Rétropropagation | PILOU (leçons `_global_`) + tableau des branches (n, scores) | 0 token |
| Politique d'arbre | UCB à petit budget : explorer n-faible, exploiter score-haut | — |
| Sélection finale | **HumanGate Pierre** : keep / kill / re-explorer | — |

## 2. Règles dures (non négociables — héritées de la doctrine)

1. **1 coup = 1 variable.** Une branche qui diffère par 2 mutations est ininterprétable → interdite.
2. **Branche contrôle obligatoire** : le workflow actuel court TOUJOURS sur le même input. « Mieux »
   n'existe que relativement à elle.
3. **Panel + pondérations figés AVANT le premier rollout.** Aucun re-tuning après lecture d'un
   résultat. Un axe raté = un RÉSULTAT.
4. **Même input, seeds figés, N répétitions déclarées** (variance : 1 rollout est bruité ; N≥2 sur
   la branche gagnante avant toute conclusion).
5. **Budget déclaré d'avance** : nb max de coups explorés, nb max de rollouts, plafond tokens par
   rollout. Budget épuisé = expérience close, pas prolongée.
6. **Fork au plus tard** : on ne re-paye jamais un préfixe partagé (le run dir est un fil ; on fork
   la conversation, pas l'input).
7. **Le « fun » est HORS panel** : jugement humain (playtest Pierre), jamais un score.
8. Aucune promotion de workflow (le coup devient le nouveau standard) sans HumanGate.

## 3. Panel de récompense v0 (oracles seuls, proxies déclarés)

| Axe | Mesure | Source | État |
|---|---|---|---|
| Coût | tokens/étape, durée | `forge_telemetry.jsonl` | ✅ |
| Robustesse | renvois ↺, escalades, attempts | `state.json` | ✅ |
| Qualité code | verdict, `is_clean_pass`, score mutation | `verdict.json` + reçus | ✅ |
| Jouabilité | solvabilité (bot gagne) + **tours bot = PROXY de durée de jeu** (pas des heures humaines) | `solvability.mjs` | ✅ (proxy déclaré) |
| Rendu visuel | signaux s10d (A1/A2/A3/A5) | `lab/forge_sensors/` | ✅ advisory |
| Difficulté | bande de difficulté mesurée | Role-Sim | 🔶 cible (absent aujourd'hui) |

Scalarisation : soit pondérations ratifiées avant (une seule), soit lecture en front de Pareto +
jugement Pierre. Jamais de pondération choisie après coup.

## 4. Gabarit d'une expérience (à remplir, ratifier, puis courir)

```
WFL-<nn> — <titre court>
- Supposition (prior, CITÉ) : <ex. « s9 unique sature au-delà de 3 modules » — PILOU L.x / bilan y>
- Coup (le diff, UNE variable) : <ex. s9-build → pool 3 builders bornés par ownership>
- Point de fork : <ex. après s5 — artefacts s0→s5 partagés en cache>
- Input commun : <projet + charter + seed>
- Branches : CONTRÔLE (workflow actuel) · VARIANTE (le coup)
- Répétitions : N=<2..3> · Budget : <max rollouts, plafond tokens/rollout>
- Panel + pondérations (FIGÉS) : <axes §3 retenus + poids OU Pareto>
- Critère de succès / échec (falsifiable, AVANT) : <ex. −20 % tokens à qualité ≥ contrôle>
- INVALIDE si : <déviation de protocole — liste fermée>
- Dépouillement : mécanique depuis les traces (zéro jugement post-hoc)
- Conclusion LIMITÉE attendue : <ce que ça prouvera — et ce que ça ne prouvera PAS>
```

## 5. Limites déclarées d'avance

- Un rollout coûte des minutes et des tokens : l'arbre restera **petit** (peu de coups, priors
  forts). C'est voulu — la profondeur vient de l'accumulation inter-expériences (PILOU), pas d'un
  arbre géant.
- L'espace est **non stationnaire** (les modèles sous-jacents évoluent) : un score date ; le
  tableau des branches porte la date et le registry (`roles.yaml`) du moment.
- La récompense est multi-objectif : un « meilleur workflow » absolu n'existe pas — seulement des
  branches dominantes sur des axes déclarés, sous jugement final humain.

```
software_verdict: (aucun — gabarit de protocole)
evidence_verdict: MECHANICAL_VALIDATION_ONLY (panel = oracles existants ; fork = state.json/artefacts réels)
claim_verdict: NO_CLAIM_ALLOWED
```
