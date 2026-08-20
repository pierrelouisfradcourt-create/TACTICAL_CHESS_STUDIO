---
tags: [workflow, doctrine, architecture]
---
# Les loops LLM + le cerveau Qwen local (design)

But : que Pierre comprenne les **renvois (handoffs) entre LLM** et qu'on ait un **Qwen local qui copie la structure de Cowork** (pas son intelligence brute).

## Les 3 niveaux (qui parle à qui)
- **Niveau 3 — Pierre** : intention + HumanGate (irréversibles : dépense, publish, archi).
- **Niveau 2 — Cowork/Claude (cerveau principal)** : conçoit/analyse/améliore les loops, fait le /plan stratégique, le red-team dur, **découpe et assigne** le travail. Rare et cher → réservé au stratégique.
- **Niveau 1 — Exécution** : Qwen local (gratuit, 24/7), sous-agents, skills, et les **oracles non-LLM** qui tranchent.

## La loop générique d'une tâche (le renvoi)
```
intention (Pierre / brain)
  → /plan v1            (Qwen local rédige le plan depuis le skill.md)
  → red-team            (Cowork + Gemini Flash critiquent le plan)
  → /plan v2            (corrigé)
  → GATE Pierre         (no-plan-no-patch : rien ne part sans plan approuvé)
  → découpe + assign    (le brain découpe en modules, assigne agent/skill)
  → exécution           (Qwen local OU sous-agent OU Claude Code via skill)
  → oracle non-LLM      (cargo/pytest/headless_sim/télémétrie) → tranche
  → mémoire             (écrit le résultat : vault Obsidian + ledger)
  → ↺ retour intention
```
Le **renvoi clé** : Qwen *propose* (cheap), Cowork *améliore/valide la logique* (stratégique), l'oracle *décide du ship* (mécanique), Pierre *gate l'irréversible*. Aucun LLM ne valide seul un merge (anti-Skynet).

## « Qwen local qui copie Claude » — honnête
Qwen 14B copie la **structure** de Cowork (lire un skill.md, rédiger un /plan, décomposer, dispatcher, lancer un oracle, écrire la mémoire), **pas** la qualité de raisonnement de Claude. Division réaliste :
- **Qwen local = @coordinateur** (OpenClaw) : tâches bornées, routine, exécution gratuite à 3h du matin. Mécanique de loop.
- **Cowork/Claude = cerveau** : conçoit les loops, fait le red-team dur, les décisions d'archi, la synthèse cross-sessions, et **améliore** les loops au fil du temps.
- C'est la doctrine : Claude rare/stratégique, Qwen fréquent/exécutant.

L'infra existe déjà (dormante) : OpenClaw gateway :18789, agents (coordinateur/producteur_routine/producteur_dur/council), claude_proxy :8765. Activer = câbler autopilot → OpenClaw (le « M3 », gate Pierre). Voir [[system-vision]], [[studio-operating-flow]].

## Mémoire auto-update
- Après chaque loop fermé : un hook écrit le résultat dans le vault (via MCP filesystem, cf. [[mcp-setup]]) + le ledger.
- Daemon `sync_memory.py` (existe) réécrit les métriques depuis les oracles.
- Tâche planifiée hebdo (dimanche 18h) : consolidation + élagage.
- Cible : la mémoire se met à jour **sans intervention**, le brain la relit en début de session.

## Rôle du cerveau principal (ce que Pierre demande)
Cowork/Claude : **analyser les loops, les améliorer, découper et assigner le travail.** C'est le niveau 2. Le cockpit (vue Loops) rend ces boucles visibles ; le brain les optimise et distribue aux exécutants (Qwen/agents/skills).
