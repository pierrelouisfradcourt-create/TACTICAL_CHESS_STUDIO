# Director v0 — Runtime Status

- Généré : `2026-06-27T10:15:17.343348+00:00`
- Mode : `dry-run` · version `v0`

## Observations
- studio_meta stale (24.27h > 2.0h)
- studio_meta global_verdict = FAIL
- current_state stale (18.61h > 2.0h)
- surface BLOCKED: inference
- HumanGate requis: 1 item(s)
- services DOWN: autopilot
- IMP ouverts: 42 (IMP-057, IMP-127, IMP-128, IMP-129, IMP-130, IMP-131, IMP-132, IMP-133, IMP-134, IMP-135, IMP-136, IMP-137, IMP-138, IMP-139, IMP-140, IMP-141, IMP-143, IMP-144, IMP-145, IMP-146, IMP-147, IMP-148, IMP-149, IMP-150, IMP-151, IMP-152, IMP-153, IMP-154, IMP-155, IMP-156, IMP-157, IMP-158, IMP-159, IMP-160, IMP-161, IMP-162, IMP-163, IMP-165, IMP-169, IMP-170, IMP-171, IMP-175)

## Services

| Service | Port | État |
|---|---|---|
| claude_proxy | 8765 | UP |
| canvas_gateway | 8766 | UP |
| openclaw_gateway | 18789 | UP |
| autopilot | 7331 | DOWN |

## studio_meta
- global_verdict : **FAIL**
- âge : 24.27h
- ELO : hybrid=1195.05 heuristic=1175.73 neural=989.44 delta=19.3 (FAIL)
- blockers :
  - φ pipeline NOT_STARTED (encoder/clustering/LoRA) — P4, non bloquant P1

## current_state
- claim_posture : NO_CLAIM_ALLOWED
- âge : 18.61h
- blocked_surfaces : inference
- open_blockers :
  - validation failed: elo_match.hybrid_vs_heuristic
  - inference has BLOCKED surface status
- open_risks :
  - ELO delta -17.9 < 20.0 — hybrid n améliore pas l heuristique
- HumanGate requis : 1 item(s)

## ledger
- total : 186 · last_updated : 2026-06-27
- by_status : {'CLOSED': 144, 'OPEN': 42}
- OPEN : IMP-057, IMP-127, IMP-128, IMP-129, IMP-130, IMP-131, IMP-132, IMP-133, IMP-134, IMP-135, IMP-136, IMP-137, IMP-138, IMP-139, IMP-140, IMP-141, IMP-143, IMP-144, IMP-145, IMP-146, IMP-147, IMP-148, IMP-149, IMP-150, IMP-151, IMP-152, IMP-153, IMP-154, IMP-155, IMP-156, IMP-157, IMP-158, IMP-159, IMP-160, IMP-161, IMP-162, IMP-163, IMP-165, IMP-169, IMP-170, IMP-171, IMP-175

## events
- count : 1
- dernier : `elo_match` / `elo_match` @ 2026-06-26T15:38:33Z (âge 18.61h)
