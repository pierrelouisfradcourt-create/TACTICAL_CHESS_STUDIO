# run_chain.py — Studio Chain Runner (v2)
# Usage:
#   python lab/chains/run_chain.py --truth-packet path/to/truth_packet.yaml
#   python lab/chains/run_chain.py --objective "Implémenter X dans ml/Y.py"
#
# Requiert : LM Studio actif sur http://127.0.0.1:1234
# Env vars : TCS_LLM_MODEL (défaut: devstral)
#            TCS_LM_STUDIO_URL (défaut: http://127.0.0.1:1234)

import argparse
import json
import os
import re
import uuid
import yaml
import requests
from datetime import datetime
from pathlib import Path

# ── Config ────────────────────────────────────────────────
LM_URL = os.environ.get("TCS_LM_STUDIO_URL", "http://127.0.0.1:1234")
MODEL  = os.environ.get("TCS_LLM_MODEL", "devstral")
TRACES = Path("lab/traces")
CHAINS = Path("lab/chains/output")
MAX_RETRY = 1

# ── System prompts (calibrés Gemini) ──────────────────────
SYSTEM_ENGINEER = """
Tu es l'Ingénieur du Tactical Chess Studio.
Tu reçois un Truth Packet ou une directive décrivant une tâche de développement.
Tu produis un Codex Pack borné.

RÈGLES STRICTES :
1. Rust = runtime truth. Python = ML/tooling uniquement.
2. Search = autorité finale. Neural = propose seulement.
3. Ne jamais toucher : scripts/auto_merge_guard.py, .github/, benchmarks.
4. claim_verdict: "NO_CLAIM_ALLOWED" toujours. Ne jamais prétendre qu'un résultat est prouvé.
5. Scope explicite : files_to_create et files_to_edit doivent être précis.
6. Validation requise : validation_commands ne doit jamais être vide.

FORMAT DE SORTIE — JSON strict uniquement, sans markdown ni texte autour :
{
  "proposal_id": "uuid",
  "task_summary": "Création d'un script de test ML",
  "files_to_create": ["ml/test_coach.py"],
  "files_to_edit": [],
  "forbidden_files": ["scripts/auto_merge_guard.py", ".github/", "src/"],
  "forbidden_actions": ["benchmark", "push main", "dataset reset"],
  "validation_commands": ["python -m pytest ml/test_coach.py"],
  "scope_note": "Scope restreint au dossier ml/ en Python.",
  "recommendation": "PROCEED",
  "claim_verdict": "NO_CLAIM_ALLOWED"
}
""".strip()

SYSTEM_REDTEAM = """
Tu es le Red Team du Tactical Chess Studio.
Tu reçois une proposition d'Ingénieur et tu dois l'évaluer selon des règles strictes.

MÉTHODE D'ÉVALUATION EN 2 ÉTAPES :
Étape 1 : files_to_edit touche-t-il "src/" (Rust runtime), "scripts/auto_merge_guard.py" ou ".github/" ?
Étape 2 : validation_commands est-il présent et non vide ?

RÈGLES DE DÉCISION STRICTES (Applique le premier qui correspond) :
- BLOCKED : Si (files_to_edit touche src/, scripts/auto_merge_guard.py, .github/) OU (des actions interdites sont listées).
- HOLD : Si (scope non borné) OU (validation_commands vide/absent) OU (benchmark/dataset reset impliqué).
- PROCEED : Dans TOUS les autres cas (ex: modifications ml/*.py, créations dans lab/, ajout de tests Python). Les faux risques sur des scripts Python ne doivent pas bloquer.

EXEMPLES DE RÉPONSES :
Cas 1 (PROCEED) : Modifs dans ml/coach.py avec tests.
{"verdict":"PROCEED","critical_flaws":[],"scope_violations":[],"missing_validation":[],"survival_condition":"N/A","flags":[],"claim_verdict":"NO_CLAIM_ALLOWED"}

Cas 2 (HOLD) : validation_commands est vide.
{"verdict":"HOLD","critical_flaws":["Validation manquante"],"scope_violations":[],"missing_validation":["Il manque la commande pytest"],"survival_condition":"Ajouter 'python -m pytest ml/' dans validation_commands","flags":["FLAG_MISSING_GUARD"],"claim_verdict":"NO_CLAIM_ALLOWED"}

Cas 3 (BLOCKED) : Touche à src/main.rs.
{"verdict":"BLOCKED","critical_flaws":["Modification du runtime Rust non autorisée ici"],"scope_violations":["src/main.rs"],"missing_validation":[],"survival_condition":"Retirer les fichiers src/ de la proposition","flags":["FLAG_AUTH_DRIFT"],"claim_verdict":"NO_CLAIM_ALLOWED"}

FORMAT DE SORTIE : JSON strict uniquement.
""".strip()

# ── LM Studio call ────────────────────────────────────────
def call_lm_studio(system: str, user_content: str, temperature: float = 0.2) -> str:
    payload = {
        "model": MODEL,
        "temperature": temperature,
        "max_tokens": 2000,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user_content}
        ]
    }
    try:
        r = requests.post(f"{LM_URL}/v1/chat/completions", json=payload, timeout=120)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "recommendation": "HOLD",
            "verdict": "HOLD",
            "claim_verdict": "NO_CLAIM_ALLOWED"
        })

# ── JSON parsing robuste (gère backticks markdown) ────────
def parse_json_safe(text: str) -> dict:
    if not isinstance(text, str):
        return {"raw": str(text), "verdict": "HOLD", "recommendation": "HOLD"}
    # Retire les fences markdown ```json ... ``` ou ``` ... ```
    cleaned = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()
    try:
        start = cleaned.index("{")
        end   = cleaned.rindex("}") + 1
        return json.loads(cleaned[start:end])
    except Exception:
        return {"raw": text, "verdict": "HOLD", "recommendation": "HOLD",
                "claim_verdict": "NO_CLAIM_ALLOWED"}

def save_trace(chain_id: str, step_label: str, data: dict):
    trace_dir = TRACES / chain_id
    trace_dir.mkdir(parents=True, exist_ok=True)
    path = trace_dir / f"{step_label}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  [trace] {path}")

# ── Étape Ingénieur ───────────────────────────────────────
def run_engineer(truth_packet: dict, extra_directive: str = "") -> dict:
    user_content = json.dumps(truth_packet, ensure_ascii=False, indent=2)
    if extra_directive:
        user_content += f"\n\nCORRECTIONS REQUISES (Red Team):\n{extra_directive}"
    raw = call_lm_studio(SYSTEM_ENGINEER, user_content)
    out = parse_json_safe(raw)
    out.setdefault("recommendation", "PROCEED")
    out.setdefault("claim_verdict", "NO_CLAIM_ALLOWED")
    return out

# ── Étape Red Team ────────────────────────────────────────
def run_redteam(truth_packet: dict, engineer_out: dict) -> dict:
    user_content = json.dumps({
        "truth_packet": truth_packet,
        "engineer_proposal": engineer_out
    }, ensure_ascii=False, indent=2)
    raw = call_lm_studio(SYSTEM_REDTEAM, user_content)
    out = parse_json_safe(raw)
    out.setdefault("verdict", "HOLD")
    out.setdefault("claim_verdict", "NO_CLAIM_ALLOWED")
    return out

# ── Main chain ────────────────────────────────────────────
def run_chain(truth_packet: dict) -> dict:
    chain_id  = str(uuid.uuid4())[:8]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print(f"\n{'='*60}")
    print(f"CHAIN {chain_id} — {timestamp}")
    print(f"Tâche : {truth_packet.get('task_summary', truth_packet.get('objective', '?'))}")
    print(f"{'='*60}\n")

    # --- Step 1 : Ingénieur ---
    print("[1/3] Devstral Ingénieur...")
    eng_out = run_engineer(truth_packet)
    eng_out.setdefault("proposal_id", chain_id + "_eng")
    save_trace(chain_id, "01_engineer", eng_out)
    print(f"  → recommendation: {eng_out.get('recommendation', '?')}")

    # --- Step 2 : Red Team ---
    print("[2/3] Devstral Red Team...")
    rt_out = run_redteam(truth_packet, eng_out)
    save_trace(chain_id, "02_redteam", rt_out)
    print(f"  → verdict: {rt_out.get('verdict', '?')}")
    for f in rt_out.get("critical_flaws", []):
        print(f"     ⚠  {f}")

    retried = False
    # --- Retry automatique si HOLD ---
    if rt_out.get("verdict") == "HOLD" and MAX_RETRY > 0:
        retried = True
        condition = rt_out.get("survival_condition", "")
        print(f"\n[retry] HOLD détecté → relance Ingénieur avec correction")
        print(f"  Condition : {condition}")
        eng_out = run_engineer(truth_packet, extra_directive=condition)
        eng_out.setdefault("proposal_id", chain_id + "_eng_retry")
        save_trace(chain_id, "01b_engineer_retry", eng_out)
        print(f"  → recommendation: {eng_out.get('recommendation', '?')}")

        print("[retry] Red Team réévalue...")
        rt_out = run_redteam(truth_packet, eng_out)
        save_trace(chain_id, "02b_redteam_retry", rt_out)
        print(f"  → verdict: {rt_out.get('verdict', '?')}")
        for f in rt_out.get("critical_flaws", []):
            print(f"     ⚠  {f}")

    # --- Envelope ---
    verdict = rt_out.get("verdict", "HOLD")
    envelope = {
        "chain_id": chain_id,
        "timestamp": timestamp,
        "truth_packet": truth_packet,
        "engineer_proposal": eng_out,
        "redteam_output": rt_out,
        "retried": retried,
        "ready_for_arbitrage": verdict == "PROCEED",
        "human_gate_required": verdict in ("HOLD", "BLOCKED"),
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "software_verdict": "CHAIN_COMPLETE",
        "evidence_verdict": "DOCUMENTATION_ONLY"
    }
    save_trace(chain_id, "03_envelope", envelope)

    CHAINS.mkdir(parents=True, exist_ok=True)
    out_path = CHAINS / f"chain_{chain_id}_{timestamp}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(envelope, f, indent=2, ensure_ascii=False)

    # --- Résumé structuré ---
    rt_label = verdict
    if retried:
        rt_label = f"{verdict} (après retry)"
    files = (eng_out.get("files_to_create", []) + eng_out.get("files_to_edit", []))
    print(f"\n{'='*60}")
    print(f"CHAIN {chain_id} — RÉSUMÉ")
    print(f"  Ingénieur : {eng_out.get('recommendation', '?')}")
    print(f"  Red Team  : {rt_label}")
    print(f"  Fichiers  : {', '.join(files) if files else '(aucun)'}")
    print(f"  Validation: {', '.join(eng_out.get('validation_commands', [])) or '(aucune)'}")
    if envelope["ready_for_arbitrage"]:
        print(f"  Status    : READY FOR ARBITRAGE")
    elif verdict == "HOLD":
        print(f"  Status    : HOLD → {rt_out.get('survival_condition', '?')}")
    else:
        print(f"  Status    : BLOCKED → {rt_out.get('survival_condition', '?')}")
    print(f"  Output    : {out_path}")
    print(f"{'='*60}\n")

    return envelope

# ── Entry point ───────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--truth-packet", type=str, default=None)
    parser.add_argument("--objective", type=str, default=None)
    args = parser.parse_args()

    if args.truth_packet:
        with open(args.truth_packet, "r", encoding="utf-8") as f:
            tp = yaml.safe_load(f)
    elif args.objective:
        tp = {
            "task_summary": args.objective,
            "objective": args.objective,
            "lane": "AUDIT_REQUIRED",
            "claim_verdict": "NO_CLAIM_ALLOWED"
        }
    else:
        parser.print_help()
        exit(1)

    result = run_chain(tp)
    exit(0 if result["ready_for_arbitrage"] else 1)
