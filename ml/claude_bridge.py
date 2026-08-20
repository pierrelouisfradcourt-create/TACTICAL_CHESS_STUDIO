"""
claude_bridge.py — Arbitre Claude API
Usage:
  python ml/claude_bridge.py --envelope lab/chains/output/chain_XYZ.json

Requiert : ANTHROPIC_API_KEY dans l'environnement
           pip install anthropic
"""

import argparse
import json
import os
from datetime import datetime
from pathlib import Path

try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

TRACES = Path("lab/traces")

SYSTEM_ARBITRE = """
Tu es l'arbitre du Tactical Chess Studio.
Tu reçois une proposition d'Ingénieur (Devstral) et une critique Red Team (Devstral).
Tu tranches et produis le TaskPacket final validé.

RÈGLES :
- Si Red Team dit PROCEED : confirme et produis le TaskPacket.
- Si Red Team dit HOLD : intègre les corrections et produis un TaskPacket corrigé.
- Si Red Team dit BLOCKED : confirme BLOCKED, ne produis pas de TaskPacket.
- Tu ne génères pas de code. Tu valides la décision d'architecture.
- claim_verdict: NO_CLAIM_ALLOWED toujours.

FORMAT DE SORTIE — JSON strict :
{
  "arbitrage_verdict": "APPROVED | APPROVED_WITH_CORRECTIONS | BLOCKED",
  "task_packet": {
    "task_id": "TASK-XXX",
    "task_summary": "...",
    "files_to_create": [],
    "files_to_edit": [],
    "forbidden_files": [],
    "forbidden_actions": [],
    "validation_commands": [],
    "corrections_applied": []
  },
  "arbitre_notes": "...",
  "next_step": "chain_executor | human_gate | stop",
  "claim_verdict": "NO_CLAIM_ALLOWED"
}
""".strip()

def arbitrate(envelope: dict) -> dict:
    if not HAS_ANTHROPIC:
        print("[claude_bridge] anthropic SDK absent — pip install anthropic")
        return {"arbitrage_verdict": "BLOCKED", "error": "SDK missing"}

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("[claude_bridge] ANTHROPIC_API_KEY manquante")
        return {"arbitrage_verdict": "BLOCKED", "error": "No API key"}

    client = anthropic.Anthropic(api_key=api_key)

    user_content = json.dumps({
        "engineer_proposal": envelope.get("engineer_proposal", {}),
        "redteam_output":    envelope.get("redteam_output", {}),
        "truth_packet":      envelope.get("truth_packet", {})
    }, ensure_ascii=False, indent=2)

    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=SYSTEM_ARBITRE,
        messages=[{"role": "user", "content": user_content}]
    )

    raw = msg.content[0].text
    try:
        start  = raw.index("{")
        end    = raw.rindex("}") + 1
        result = json.loads(raw[start:end])
    except Exception:
        result = {"arbitrage_verdict": "HOLD", "raw": raw}

    # Sauvegarde trace
    chain_id  = envelope.get("chain_id", "unknown")
    trace_dir = TRACES / chain_id
    trace_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    trace_path = trace_dir / f"04_arbitre_{ts}.json"
    with open(trace_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"  [trace] {trace_path}")

    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--envelope", required=True,
                        help="Path vers envelope JSON de run_chain.py")
    args = parser.parse_args()

    with open(args.envelope, "r", encoding="utf-8") as f:
        env = json.load(f)

    if not env.get("ready_for_arbitrage"):
        print("❌ Envelope non prête pour arbitrage (Red Team = HOLD/BLOCKED)")
        print(f"   Condition : {env.get('redteam_output', {}).get('survival_condition', '?')}")
        exit(1)

    result = arbitrate(env)
    print(json.dumps(result, indent=2, ensure_ascii=False))

    verdict = result.get("arbitrage_verdict", "BLOCKED")
    print(f"\nVerdict arbitre : {verdict}")
    exit(0 if verdict in ("APPROVED", "APPROVED_WITH_CORRECTIONS") else 1)
