"""PreToolUse hook — bloque un spawn de sous-agent Forge sans contrat validé.

Contrat Claude Code : lit l'événement PreToolUse en JSON sur stdin. Sort 0 pour
autoriser, 2 pour BLOQUER (le message stderr est remonté au modèle).

Politique (voir forge.hook_guard.hook_decision) :
- HORS périmètre Forge (autre outil, ou aucun marqueur FORGE_DISPATCH) => fail-OPEN :
  le hook ne gêne jamais les usages non-Forge de l'outil Agent.
- SUR le périmètre Forge (marqueur présent) => fail-CLOSED : toute impossibilité de
  vérifier (garde qui lève, import cassé, audit illisible) => refus (2). L'ancien
  fail-open aveugle laissait passer un spawn Forge non gardé sur le moindre bug.
"""
import json
import sys
from pathlib import Path

MARKER_TOKEN = "FORGE_DISPATCH"


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0  # pas d'entrée exploitable -> impossible de savoir si Forge -> on n'entrave rien

    tool = data.get("tool_name") or data.get("tool") or ""
    ti = data.get("tool_input") or {}
    prompt = " ".join(str(ti.get(k, "")) for k in ("prompt", "description"))

    # Périmètre Forge détecté par pur test de chaîne, AVANT tout import fragile :
    # si le garde ne se charge même pas, on doit quand même fail-closed sur Forge.
    forge_scope = tool in ("Task", "Agent") and MARKER_TOKEN in prompt

    try:
        repo_root = Path(__file__).resolve().parents[2]
        sys.path.insert(0, str(repo_root / "scripts"))
        from forge.hook_guard import hook_decision, record_authorization

        code, reason = hook_decision(tool, prompt)
    except Exception as exc:
        if forge_scope:
            print(f"[forge-gate] garde indisponible ({exc}) -> refus fail-closed (périmètre Forge).",
                  file=sys.stderr)
            return 2
        return 0  # hors périmètre : un bug du garde ne casse pas la session

    if code == 2:
        print(f"[forge-gate] spawn refusé : {reason}. "
              f"Passe par forge.dispatch.prepare_dispatch (contrat validé) avant de spawner.",
              file=sys.stderr)
    elif forge_scope:
        # RÉPARATION (post-mortem pacman 2026-08-07, lot A réparation 3) : le hook
        # AUTORISE ce spawn (code == 0, marqueur FORGE_DISPATCH présent) -> trace
        # `spawn_authorized` AVANT de rendre la main. `record_authorization` était
        # implémentée et testée (forge.hook_guard) mais jamais appelée ici — c'est
        # le seul appelant légitime documenté dans sa propre docstring, d'où
        # `spawn_authorized` mesuré à 0/1418. Best-effort strict (jamais lever) :
        # une trace non écrite dégrade la preuve, elle ne doit JAMAIS transformer
        # un spawn déjà autorisé en refus — le hook a déjà rendu sa décision au
        # moment où cet appel a lieu, il ne peut plus la changer.
        try:
            record_authorization(prompt)
        except Exception:  # noqa: BLE001 — best-effort, jamais bloquant
            pass
    return code


if __name__ == "__main__":
    sys.exit(main())
