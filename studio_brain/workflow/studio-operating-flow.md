# Studio Operating Flow
#workflow #doctrine

> La boucle opérationnelle du studio TCS.
> Règle fondamentale : **no-plan-no-patch** — aucun code écrit sans `/plan` validé.
> Date de dernière révision : 2026-06-28

---

## La Boucle (vue macro)

```
Pierre (intention / HumanGate)
    ↓  donne l'intention, tranche les irréversibles
Cowork — cerveau studio
    ↓  lit le ledger, mémoire, docs
    ↓  /plan  →  red-team (sous-agent sonnet)
    ↓  délègue l'exécution
Sous-agents / Skills + Claude Code
    ↓  écrivent le code, font les calculs
    ↓  retournent un diff + preuve d'exécution
Oracles non-LLM (juges objectifs)
    ↓  cargo build --release
    ↓  pytest / headless_sim / export Godot vert
    ↓  télémétrie joueurs / wishlists Steam
    ↓  verdict binaire : OK ou FAIL
HumanGate (si irréversible)
    →  Pierre merge / rejette / freeze
    →  sinon : retour à Cowork (rebond)
```

---

## Les 3 acteurs et leurs rôles

### Pierre — Intention & HumanGate
- Donne l'intention initiale (ce qu'on veut)
- Est le seul à décider des irréversibles : publier, merger, dépenser, changer la doctrine
- Joue et donne le verdict fun (les LLM ne peuvent pas)
- **Ne code pas, ne merge pas sans review**

### Cowork — Cerveau Studio
- Tient la mémoire persistante (vault + MEMORY.md)
- Orchestre les skills et sous-agents
- Fait le plan avant tout patch (`/plan` → red-team)
- **Ne code pas directement** — délègue à Claude Code via sous-agents
- Lit le ledger, les métriques, les docs pour contextualiser

### Claude Code + Sous-agents — Exécution
- Exécutent les tâches techniques (code, build, tests)
- Retournent diff + preuve d'exécution (pas juste "j'ai implémenté")
- Respectent les lanes (ne pas toucher autopilot.py depuis lane ROCKY, etc.)
- Verdicts obligatoires : `software_verdict` / `evidence_verdict` / `claim_verdict: NO_CLAIM_ALLOWED`

---

## Règle no-plan-no-patch

> Avant tout `Edit` ou `Write` sur du code de production :
> 1. `/plan` — plan écrit, périmètre délimité
> 2. Red-team — quoi peut casser en premier ?
> 3. Implémentation — avec protection du pire cas avant le happy path
> 4. Oracle — preuve d'exécution (output réel, pas assertion)
> 5. Verdict — `software_verdict: OK|FAIL|BLOCKED`

**Jamais** : lire une demande → écrire du code → livrer. Toujours planifier d'abord.

---

## La build-machine (CERFA → Ship)

Modèle de production pour chaque nouveau jeu :

```
CERFA (manifeste) → /plan → build (Godot/Rust/Python)
    → /playtest (session joueur + télémétrie)
    → /balance-check (headless_sim)
    → patch (si rebond)
    → /gate (si irréversible : page Steam, EA, prix)
    → HumanGate Pierre → ship
```

- Chaque jeu commence par remplir le CERFA (`docs/studio_v2/08_GAME_MANIFEST_CERFA.md`)
- Les kill-gates sont définis dans le CERFA **avant** de construire
- Le pipeline est identique pour chaque titre : vélocité par réplication

---

## Oracles valides (non-LLM)

| Oracle | Ce qu'il prouve |
|---|---|
| `cargo build --release && cargo test` | Moteur Rust compilable + tests verts |
| `export Godot vert` | Build jouable exporté |
| `pytest lab/chess_fantasy/tests/` | Lane JEUX OK |
| `headless_sim.py` | Courbes de survie, balance de jeu |
| Télémétrie joueurs | Rétention J1, abandon/min, cause de mort |
| Wishlists Steam | Intérêt marché réel |
| Pierre qui joue | Le seul verdict de fun valide |

> Un LLM qui dit "c'est fun" ou "ça marche" n'est PAS un oracle.

---

## Rebond (boucle d'itération)

Si un oracle retourne FAIL :
1. Le sous-agent retourne le diagnostic (log, stacktrace, diff)
2. Cowork analyse et reformule le plan
3. `/plan` mis à jour → nouveau cycle
4. **Jamais** continuer sur une base cassée

Si un oracle retourne BLOCKED (besoin HumanGate) :
1. Cowork remonte à Pierre avec contexte + recommandation
2. Pierre décide
3. Exécution reprend après décision

---

## Ce que cette boucle interdit

- Auto-merger du code sans review Pierre
- `git push` sans demande explicite
- Modifier `IMPROVEMENT_LEDGER.yaml` manuellement (passe par `kaizen_loop.py`)
- Utiliser l'API Anthropic externe (Qwen local = gratuit)
- Art IA brut shippé visible par les joueurs
- Automatiser l'irréversible (jamais de "cliquer publier" sans Pierre)

---

## Liens
- [[skills-catalog|Skills Catalog]] — la boite à outils
- [[../doctrine/studio-doctrine|Doctrine]] — les principes directeurs
- [[../decisions/decision-log|Decision Log]] — les irréversibles passés
- [[../meta/vault-usage-guide|Vault Usage Guide]]
