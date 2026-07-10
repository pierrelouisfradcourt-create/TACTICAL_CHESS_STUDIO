"""PreToolUse hook — bloque un spawn de sous-agent Forge sans contrat validé.

Contrat Claude Code : lit l'événement PreToolUse en JSON sur stdin. Sort 0 pour
autoriser, 2 pour BLOQUER (le message stderr est remonté au modèle).

FAIL-OPEN STRICT : toute erreur/imprévu => exit 0 (ne jamais casser une session
sur un bug du hook). Seul le cas « marqueur Forge présent mais aucun dispatch
validé » bloque. Les spawns hors Forge passent toujours.
"""
import json
import sys
from pathlib import Path


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0  # pas d'entrée exploitable -> on n'entrave rien

    tool = data.get("tool_name") or data.get("tool") or ""
    if tool not in ("Task", "Agent"):
        return 0

    ti = data.get("tool_input") or {}
    prompt = " ".join(str(ti.get(k, "")) for k in ("prompt", "description"))

    try:
        repo_root = Path(__file__).resolve().parents[2]
        sys.path.insert(0, str(repo_root / "scripts"))
        from forge.hook_guard import check_spawn

        allow, reason = check_spawn(prompt)
    except Exception:
        return 0  # fail-open : jamais bloquer sur un bug du garde

    if not allow:
        print(f"[forge-gate] spawn refusé : {reason}. "
              f"Passe par forge.dispatch.prepare_dispatch (contrat validé) avant de spawner.",
              file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
