"""scripts/forge/run_real.py — premier point d'entrée RÉEL de `forge.driver.ForgeDriver`.

Jusqu'ici `ForgeDriver` n'était exercé qu'avec un `StubExecutor` (tests unitaires,
scripts/forge/tests/test_driver.py). Ce module fournit l'exécuteur RÉEL des étapes
LLM (`claude` en mode headless, `claude -p --output-format json`) : c'est la seule
façon d'obtenir un vrai tour Claude depuis une boucle Python synchrone — l'outil
Agent lui-même n'est joignable que par l'orchestrateur, pas par un sous-processus.
La dégradation Qwen -> claude-blind est déjà gérée en amont par `forge.runtime` ;
ce module n'a qu'à honorer `decision.runner in {claude, claude-blind}`.

claim_verdict: NO_CLAIM_ALLOWED — ce module ne produit aucun claim, il exécute.
"""
from __future__ import annotations

import argparse
import json
import logging
import shutil
import subprocess
import time
from pathlib import Path

from forge.driver import ForgeDriver

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]

# subprocess sans shell=True ne resout pas les wrappers .cmd npm sur Windows
# (CreateProcess ne fait pas la resolution PATHEXT que fait cmd.exe) : il faut
# le chemin resolu par PATH (shutil.which suit PATHEXT, contrairement a Popen seul).
_CLAUDE_CMD = shutil.which("claude") or "claude"

# Outils claude CLI autorisés par étape (le contrat borne l'ownership ; l'exécuteur
# borne concrètement les tools quand skill/plugin ne le font pas — cf. s9-build.yaml
# skill: aucun / plugin: aucun, donc payload.allowed_tools est vide par construction).
_STEP_TOOLS: dict[str, tuple[str, ...]] = {
    "s9-build": ("Edit", "Read"),
    "s11-redteam-code": ("Read",),
}


def claude_executor(add_dir: Path, task_by_step: dict[str, str]):
    """Fabrique un executor(payload, decision, context) -> dict pour ForgeDriver.

    Un seul canal réel (`claude -p`) pour claude et claude-blind : les deux sont
    déjà des spawns Claude en contexte vierge de session (pas de -c/--continue).
    """

    def executor(payload, decision, context) -> dict:
        etape = payload.etape
        task = task_by_step.get(etape, "")
        prompt = (
            f"{payload.prompt}\n\n## TÂCHE CONCRÈTE ({context['run_id']} / {etape})\n"
            f"{task}\n\n{context['dispatch_marker']}"
        )
        tools = _STEP_TOOLS.get(etape, ())
        # Le prompt passe par STDIN, jamais par argv : `claude` est un wrapper .cmd
        # npm sous Windows, et CreateProcess relance implicitement cmd.exe pour
        # l'exécuter — son propre parseur de ligne de commande (% ^ retours-ligne)
        # mutile un prompt long/multi-lignes même passé en liste argv non-shell.
        cmd = [
            _CLAUDE_CMD, "-p",
            "--model", payload.model,
            "--output-format", "json",
            "--add-dir", str(add_dir),
        ]
        if tools:
            cmd += ["--allowedTools", " ".join(tools), "--permission-mode", "acceptEdits"]
        else:
            cmd += ["--permission-mode", "manual"]

        started = time.time()
        try:
            completed = subprocess.run(
                cmd, cwd=str(REPO_ROOT), input=prompt, capture_output=True, text=True,
                encoding="utf-8", timeout=600,
            )
        except subprocess.TimeoutExpired:
            return {"ok": False, "reason": f"claude -p timeout à {etape}"}
        duration = time.time() - started

        if completed.returncode != 0:
            return {
                "ok": False,
                "reason": f"claude -p returncode={completed.returncode}: "
                          f"{completed.stderr[-2000:]}",
            }
        try:
            data = json.loads(completed.stdout)
        except ValueError:
            return {"ok": False, "reason": f"sortie claude -p non-JSON: {completed.stdout[-2000:]}"}
        if data.get("is_error"):
            return {"ok": False, "reason": f"claude -p is_error: {data.get('result', '')[:2000]}"}

        usage = data.get("usage") or {}
        tokens = int(usage.get("input_tokens", 0)) + int(usage.get("output_tokens", 0))
        return {
            "ok": True,
            "output": str(data.get("result", "")),
            "tokens": tokens,
            "duration_s": duration,
        }

    return executor


def main() -> None:
    parser = argparse.ArgumentParser(description="Premier run RÉEL du driver Forge (P0.1).")
    parser.add_argument("--project", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--profile", default="patch", choices=("full", "patch", "review", "micro"))
    parser.add_argument("--src-root", required=True, help="racine du code réel (relatif au repo)")
    parser.add_argument("--task-s9", default="", help="tâche concrète pour le builder (s9-build)")
    parser.add_argument("--task-s11", default="", help="tâche concrète pour le red-team (s11)")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    run_dir = REPO_ROOT / "lab" / "forge_runs" / args.project
    src_root = REPO_ROOT / args.src_root

    executor = claude_executor(
        add_dir=src_root,
        task_by_step={"s9-build": args.task_s9, "s11-redteam-code": args.task_s11},
    )

    driver = ForgeDriver(
        project=args.project,
        run_id=args.run_id,
        run_dir=run_dir,
        profile=args.profile,
        executor=executor,
        src_root=src_root,
        is_game=False,
    )
    report = driver.run()
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
