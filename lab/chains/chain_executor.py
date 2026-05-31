"""
chain_executor.py — Devstral applique le TaskPacket
Usage:
  python lab/chains/chain_executor.py --task-packet path/to/task_packet.json

Devstral génère le code. auto_merge_guard valide avant tout stage.
Ne committe pas. Ne pushe pas. HumanGate avant merge.
"""

import argparse
import json
import os
import subprocess
import requests
from datetime import datetime
from pathlib import Path

LM_URL  = os.environ.get("TCS_LM_STUDIO_URL", "http://127.0.0.1:1234")
MODEL   = os.environ.get("TCS_LLM_MODEL", "devstral")
TRACES  = Path("lab/traces")

SYSTEM_EXECUTOR = """
Tu es l'Exécuteur du Tactical Chess Studio.
Tu reçois un TaskPacket validé et tu génères le code ou patch demandé.

RÈGLES STRICTES :
- Tu produis UNIQUEMENT le contenu des fichiers à créer ou modifier.
- Tu respectes forbidden_files et forbidden_actions sans exception.
- Tu ne commites pas. Tu ne pushes pas.
- Tu fournis les validation_commands à exécuter après.
- claim_verdict: NO_CLAIM_ALLOWED.

FORMAT DE SORTIE — JSON strict :
{
  "execution_id": "uuid",
  "files_produced": [
    {
      "path": "src/example.rs",
      "action": "create | edit",
      "content": "contenu complet du fichier"
    }
  ],
  "validation_commands": ["cargo check", "python -m pytest"],
  "skipped_validation": [],
  "risks": [],
  "software_verdict": "EXECUTION_COMPLETE | EXECUTION_PARTIAL | EXECUTION_FAILED",
  "evidence_verdict": "DOCUMENTATION_ONLY",
  "claim_verdict": "NO_CLAIM_ALLOWED"
}
""".strip()

def call_lm_studio(system: str, user_content: str) -> str:
    payload = {
        "model": MODEL,
        "temperature": 0.1,
        "max_tokens": 4000,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user_content}
        ]
    }
    try:
        r = requests.post(
            f"{LM_URL}/v1/chat/completions",
            json=payload,
            timeout=180
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return json.dumps({"error": str(e), "software_verdict": "EXECUTION_FAILED"})

def parse_json_safe(text: str) -> dict:
    try:
        start = text.index("{")
        end   = text.rindex("}") + 1
        return json.loads(text[start:end])
    except Exception:
        return {"raw": text, "software_verdict": "EXECUTION_FAILED"}

def write_files(execution: dict, dry_run: bool = True) -> list:
    written = []
    for f in execution.get("files_produced", []):
        path    = Path(f["path"])
        content = f.get("content", "")
        if dry_run:
            print(f"  [DRY RUN] would write {path} ({len(content)} chars)")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(content)
            print(f"  [WRITTEN] {path}")
        written.append(str(path))
    return written

def run_validation(commands: list) -> dict:
    results = {}
    for cmd in commands:
        print(f"  [VALIDATE] {cmd}")
        try:
            r = subprocess.run(
                cmd, shell=True, capture_output=True,
                text=True, timeout=60
            )
            results[cmd] = {
                "returncode": r.returncode,
                "stdout":     r.stdout[-500:],
                "stderr":     r.stderr[-200:],
                "passed":     r.returncode == 0
            }
            status = "✅" if r.returncode == 0 else "❌"
            print(f"  {status} returncode={r.returncode}")
        except Exception as e:
            results[cmd] = {"error": str(e), "passed": False}
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--task-packet", required=True)
    parser.add_argument("--dry-run", action="store_true", default=True,
                        help="Simule sans écrire (défaut: True)")
    parser.add_argument("--apply", action="store_true",
                        help="Écrit réellement les fichiers (HumanGate requis)")
    args = parser.parse_args()

    with open(args.task_packet, "r", encoding="utf-8") as f:
        task = json.load(f)

    dry_run = not args.apply

    print(f"\n{'='*60}")
    print(f"EXECUTOR — {'DRY RUN' if dry_run else '⚠ APPLY MODE'}")
    print(f"Tâche : {task.get('task_summary', '?')}")
    print(f"{'='*60}\n")

    # Devstral génère
    print("[1/3] Devstral génère le code...")
    raw  = call_lm_studio(SYSTEM_EXECUTOR, json.dumps(task, ensure_ascii=False))
    exec_out = parse_json_safe(raw)

    # Affiche ce qui sera produit
    print(f"[2/3] Fichiers à produire : {len(exec_out.get('files_produced', []))}")
    written = write_files(exec_out, dry_run=dry_run)

    # Validation
    validation_results = {}
    if not dry_run and written:
        print("[3/3] Validation...")
        cmds = exec_out.get("validation_commands", task.get("validation_commands", []))
        validation_results = run_validation(cmds)

    # Rapport final
    report = {
        "task_packet":        task,
        "execution_output":   exec_out,
        "files_written":      written,
        "validation_results": validation_results,
        "dry_run":            dry_run,
        "timestamp":          datetime.now().isoformat(),
        "software_verdict":   exec_out.get("software_verdict", "UNKNOWN"),
        "evidence_verdict":   "DOCUMENTATION_ONLY",
        "claim_verdict":      "NO_CLAIM_ALLOWED"
    }

    ts       = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = Path("lab/chains/output") / f"execution_{ts}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"RAPPORT : {out_path}")
    print(f"Verdict : {report['software_verdict']}")
    if dry_run:
        print("⚠  DRY RUN — rien n'a été écrit.")
        print("   Pour appliquer : python chain_executor.py --task-packet X --apply")
    print(f"{'='*60}\n")
