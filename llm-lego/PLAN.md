# PLAN — Validation autonome LLM-Lego

## 0.1 Outils retenus (vérifiés, pas supposés)
- **Exécution shell** : Bash (Git Bash/MINGW64) ✓ + PowerShell ✓
- **Fichiers** : Read/Write/Edit ✓
- **HTTP** : `curl` (`/mingw64/bin/curl`) ✓ + `fetch` natif Node 24 ✓
- **Gestion process** : tâches background du harness (run_in_background → TaskStop, PID tracké) **en primaire** ; backup Windows `netstat -ano | findstr :3000` + `taskkill /PID`
- **Browser automation** : **Playwright** (à installer `npm i -D playwright` + chromium) — choisi car headless, déterministe, screenshot fichier, 100% autonome. Fallback 1 : MCP `Claude_Preview`. Fallback 2 : documenter la limitation (pas de faux PASS UX).
- **Oracle** : LM Studio `http://localhost:1234` ✓ (HTTP 200), modèle **`qwen2.5-14b-instruct`** (Qwen3.6 INTERDIT JSON per CLAUDE.md)

## 0.2 Environnement
- **Windows natif** (MINGW64_NT, PAS WSL2) → pas de translation réseau WSL. Le serveur tourne sous node.exe Windows, donc `http://localhost:3000` est directement joignable par Edge Windows. **À vérifier par vraie requête** (Phase 1), pas supposé.
- Process : syntaxe Windows (`taskkill`/`netstat`), pas `pkill`/`lsof`.

## 0.3 Port
- 3000 **LIBRE** (netstat). Si occupé plus tard → kill via PID tracké, sinon bascule 3001 documentée.

## 0.4 Stratégie & critères
| Tâche | Outil | Justification |
|---|---|---|
| Process | harness bg + taskkill | kill propre sans deviner le PID |
| HTTP | curl + résultats → `testN_result.json` | preuve persistante |
| UX | Playwright (DOM textContent + screenshot) | valider l'écran, pas le 200 |
| Oracle | fetch LM Studio, `response_format json_object`, parse strict | sortie structurée, pas `.includes()` |

**Tests** : T1 linéaire · T2 routing exact-match · T3 cycle safety · T4 graphe mal formé.
**Anomalie connue** : T3 (a↔b, 0 nœud d'entrée) déclenche le garde "exactly one start node" (invariant voulu) AVANT maxSteps. → run as-given + variante `s→a→b→a` pour prouver "max steps exceeded". Je ne casse PAS l'invariant.
**Borne** : 5 tentatives max/test, puis STOP + blocage précis.
**Sortie OK** : T1/T2/T4 PASS asserts+oracle · T3 stop propre prouvé (2 formes) · UX screenshot réel · oracle PASS ou indispo documenté.
