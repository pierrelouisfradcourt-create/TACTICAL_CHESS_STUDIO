# LOCAL BRAIN LOOP — Spec d'orchestration Qwen local
# Source : IMP-XXX (à créer) | claim_posture: NO_CLAIM_ALLOWED
# Propriétaire : Studio OS — HumanGate = Pierre

## Honnêteté préliminaire

Qwen 14B local copie la **structure** de la boucle — pas la qualité de raisonnement de Claude.
Domaine légitime : tâches bornées SAFE_AUTO avec oracle clair (cargo test, pytest, build Godot).
Domaine interdit local : red-team, design loop, décisions structurelles → escalade Claude/Cowork.

---

## 1. TaskPacket — format JSON inter-agent

```json
{
  "packet_id": "<uuid4>",
  "intention_racine": "<string — origine humaine ou IMP-id>",
  "imp_id": "<string | null>",
  "skill": "<string — ex: imp_run, code_review, plan>",
  "lane": "<STUDIO | ROCKY_MOTEUR | IA_APPRENTISSAGE | JEUX>",
  "tier": "<SAFE_AUTO | AUDIT | HUMAN_GATE>",
  "payload": {
    "context": "<string>",
    "files": ["<repo-relative path>"],
    "constraints": ["<string>"]
  },
  "oracle": {
    "command": "<string — ex: cargo test | pytest ml/ -q>",
    "scope": "<string>",
    "timeout_s": 120
  },
  "caps": {
    "max_tokens": 60000,
    "max_iterations": 4
  },
  "created_at": "<ISO8601>",
  "created_by": "<autopilot | cowork | human>",
  "rollback_if_oracle_red": true
}
```

### Règles TaskPacket
- `intention_racine` obligatoire — anti-Skynet : toute action traçable à une intention humaine
- `tier` détermine le chemin de routing (voir §3)
- `rollback_if_oracle_red: true` par défaut — jamais contournable par un agent
- `caps` plafonnés : 60k tokens / 4 itérations pour SAFE_AUTO ; 200k / 8 pour AUDIT (Claude)
- Zones interdites dans `files` : tests/, eval/, oracle/, bench/, puzzles/, .github/

---

## 2. @coordinateur — boucle en 6 étapes

```
STEP 1  READ SKILL     Charger skill definition + constraints depuis capabilities.yaml
STEP 2  DRAFT PLAN     Qwen 14B génère un plan décomposé (≤ 5 sous-tâches) + fog_map
STEP 3  CLASSIFY TIER  Pour chaque sous-tâche : SAFE_AUTO / AUDIT / HUMAN_GATE
STEP 4  DISPATCH       SAFE_AUTO → @producteur_routine (Qwen local worktree/routine)
                        AUDIT    → escalade Claude/Cowork via claude_proxy_8765
                        HUMAN_GATE → pause + notification Pierre (canvas /api/gate/{id})
STEP 5  RUN ORACLE     cargo test | pytest | build — timeout 120s — rouge = stop total
STEP 6  VERDICT+MEM    Signer verdict HMAC → écrire loops-log.md → POST /api/refresh
```

### Détail de chaque étape

#### STEP 1 — Read skill
- Lire `openclaw/capabilities.yaml` pour le skill demandé
- Vérifier provider disponible (healthcheck endpoint)
- Si provider KO → fallback selon providers.yaml, sinon HUMAN_GATE

#### STEP 2 — Draft /plan
- Prompt Qwen 14B (lmstudio, 127.0.0.1:1234) :
  ```
  Tu es @coordinateur. Décompose la tâche en ≤5 sous-tâches bornées.
  Pour chaque sous-tâche : titre, fichiers touchés, oracle attendu, tier (SAFE_AUTO/AUDIT/HUMAN_GATE).
  Réponds en JSON strict. intention_racine: {intention_racine}
  ```
- Valider JSON — si invalide après 2 tentatives → HUMAN_GATE
- **NE PAS** utiliser Qwen3.6 pour ce step (thinking mode vide le content JSON)

#### STEP 3 — Classify tier
```
SAFE_AUTO  : oracle existant + fichiers hors zones interdites + IMP status OPEN SAFE_AUTO
AUDIT      : refactor structurel, nouvelle dépendance, changement API publique
HUMAN_GATE : fog (pas d'oracle), décision irréversible, φ / Rocky traces, merge
```

#### STEP 4 — Dispatch
- SAFE_AUTO → POST http://127.0.0.1:18789/task avec TaskPacket (worktree: routine)
- AUDIT → POST http://127.0.0.1:8765/v1/chat/completions (claude-proxy, Claude/Cowork)
- HUMAN_GATE → POST http://127.0.0.1:8766/api/gate/{packet_id} + attente verdict Pierre

#### STEP 5 — Run oracle
```python
import subprocess, sys
result = subprocess.run(
    oracle["command"], shell=True, capture_output=True,
    text=True, encoding="utf-8", timeout=oracle["timeout_s"],
    cwd="C:/TACTICAL_CHESS_STUDIO"
)
if result.returncode != 0:
    # STOP TOTAL — pas de contournement
    raise OracleRedError(result.stderr)
```

#### STEP 6 — Verdict + memory write
- Générer verdict JSON : `{packet_id, oracle_status, files_changed, duration_s, imp_id}`
- Signer HMAC : `echo "$VERDICT" | openssl dgst -sha256 -hmac "$STUDIO_HMAC_KEY"`
- Appeler `loop_memory_hook.py` (§4) pour écrire loops-log.md
- POST http://127.0.0.1:8766/api/refresh

---

## 3. Routing table tier → agent

| Tier | Agent | Modèle | Worktree |
|---|---|---|---|
| SAFE_AUTO | @producteur_routine | qwen/qwen2.5-coder-14b | worktrees/routine |
| AUDIT | Claude/Cowork via proxy | claude-code-cli (8765) | worktrees/dur |
| HUMAN_GATE | — (pause) | — | — |

### Ce que Qwen local NE fait PAS
- Red-team et audit d'hypothèses → @council (Claude + Qwen délibératif)
- Design de boucle, décisions architecturales → Claude/Cowork HumanGate
- Délibérations φ(T), traces Rocky ML → lignées locales Claude+Qwen uniquement (Gemini interdit)
- Merge/push → ratification Pierre obligatoire

---

## 4. Gated patch spec — dispatch autopilot → OpenClaw(:18789)

### Principe
Ne pas éditer autopilot.py sans go explicite Pierre.
Ce bloc est la spec exacte du patch à appliquer quand Pierre valide.

### Point d'insertion
Chercher dans autopilot.py la fonction qui lance les sous-processus IMP
(pattern : `subprocess.run` + `kaizen` ou `imp_run`).
Insérer **avant** l'appel subprocess existant.

### Bloc à insérer (Python, utf-8)

```python
# --- LOCAL BRAIN LOOP DISPATCH (patch gated — IMP-XXX) ---
import requests as _req, os as _os

_OPENCLAW_URL = _os.environ.get("OPENCLAW_URL", "http://127.0.0.1:18789")
_OPENCLAW_TIMEOUT = int(_os.environ.get("OPENCLAW_TIMEOUT_S", "5"))

def _dispatch_to_openclaw(task_packet: dict) -> dict | None:
    """
    Tente d'envoyer le TaskPacket à OpenClaw(:18789).
    Retourne la réponse JSON si succès, None si OpenClaw indisponible.
    Rollback garanti : en cas d'échec, l'appelant retombe sur subprocess direct.
    """
    try:
        resp = _req.post(
            f"{_OPENCLAW_URL}/task",
            json=task_packet,
            timeout=_OPENCLAW_TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception:
        # OpenClaw KO → fallback silencieux vers subprocess direct
        return None

# Usage dans la fonction d'appel IMP :
#
#   packet = build_task_packet(imp_id, skill, lane, tier, oracle)
#   result = _dispatch_to_openclaw(packet)
#   if result is None:
#       # Fallback : subprocess direct (comportement original)
#       result = subprocess.run([...], ...)
# --- FIN PATCH ---
```

### Condition de rollback
- `OPENCLAW_URL` absent ou OpenClaw KO → subprocess direct (comportement pré-patch)
- Oracle rouge après dispatch → `OracleRedError` remonte, patch ne masque rien
- Variable d'environnement `LOCAL_BRAIN_DISABLED=1` → bypass complet du patch

### Ce qui reste gated à HumanGate
- Activation du patch (`LOCAL_BRAIN_DISABLED` à retirer)
- Tout merge sur main après oracle vert
- Tout changement de caps (tokens, iterations)
- Toute tâche tier AUDIT ou HUMAN_GATE
- φ / Rocky ML internals

---

## 5. Limites honnêtes du cerveau local

| Capacité | Qwen 14B local | Claude/Cowork |
|---|---|---|
| Décomposition tâche bornée | OUI (SAFE_AUTO) | OUI |
| Red-team / audit hypothèse | NON | OUI |
| Raisonnement JSON fiable | OUI (pas Qwen3.6) | OUI |
| Décision architecturale | NON → escalade | OUI |
| Disponibilité offline | OUI (LM Studio) | NON |
| φ / Rocky deliberations | Partiel (local) | OUI (primary) |

Le cerveau local est un **dispatcher mécanique** — pas un substitut au raisonnement stratégique.
Claude/Cowork reste l'autorité sur la conception de la boucle elle-même.

---

## Rapport

software_verdict: SPEC_ONLY — aucun service démarré
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
