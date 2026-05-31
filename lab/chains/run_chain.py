# run_chain.py — Studio Chain Runner (v3)
# Usage:
#   python lab/chains/run_chain.py --idea "je voudrais corriger la doc..."
#   python lab/chains/run_chain.py --truth-packet path/to/truth_packet.yaml
#   python lab/chains/run_chain.py --objective "Implémenter X dans ml/Y.py"
#
# Requiert : LM Studio actif sur http://127.0.0.1:1234
# Env vars : TCS_LLM_MODEL (défaut: devstral)
#            TCS_LM_STUDIO_URL (défaut: http://127.0.0.1:1234)

import argparse
import fnmatch
import json
import os
import re
import sys
import uuid
import yaml
import requests
from datetime import datetime
from pathlib import Path, PurePosixPath

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── Sécurité hardcodée (non délégable au LLM) ────────────
REQUIRED_FORBIDDEN_FILES = [
    "scripts/auto_merge_guard.py",
    ".github/",
    "src/engine/engine.rs",
    "src/chess/search.rs",
    "ml/train.py",
    "lab/runs/",
    "latest.json",
]

REQUIRED_FORBIDDEN_ACTIONS = [
    "benchmark as proof",
    "push main",
    "force push",
    "dataset reset",
    "holdout",
    "create lab/runs/RUN_*",
    "create latest.json",
    "broad refactor engine/search/neural",
]

REQUIRED_FINAL_REPORT_FIELDS = [
    "commands_run",
    "results",
    "skipped_validation",
    "risks",
    "software_verdict",
    "evidence_verdict",
    "claim_verdict",
]

ESCALATION_STOP_RULE = (
    "If scope expands to engine/search/neural broad refactor → BLOCKED immediately."
)

# ── Path safety guards (porté depuis generate_codex_task_queue.py) ──
def is_safe_relative_path(path: str) -> bool:
    """Bloque absolute paths et traversal .."""
    p = path.replace("\\", "/")
    if p.startswith("/") or p.startswith("C:") or p.startswith(".."):
        return False
    if ".." in PurePosixPath(p).parts:
        return False
    return True

def assert_noncanonical_output_path(path: str):
    """Vérifie que le path de sortie est dans une zone non-canonique."""
    ALLOWED_OUTPUT_PREFIXES = [
        "lab/chains/output/",
        "lab/traces/",
        "lab/chains/claude_prompts/",
        "lab/gameplay_observation/",
    ]
    p = path.replace("\\", "/")
    if not any(p.startswith(prefix) for prefix in ALLOWED_OUTPUT_PREFIXES):
        raise ValueError(
            f"Output path '{path}' hors zone non-canonique autorisée. "
            f"Zones OK : {ALLOWED_OUTPUT_PREFIXES}"
        )

def validate_truth_packet(tp: dict):
    """Fail-closed : vérifie les champs obligatoires du Truth Packet."""
    if tp.get("claim_verdict") != "NO_CLAIM_ALLOWED":
        raise ValueError(
            f"claim_verdict doit être NO_CLAIM_ALLOWED, reçu : {tp.get('claim_verdict')}"
        )
    if not tp.get("task_summary") and not tp.get("objective"):
        raise ValueError("Truth Packet doit avoir task_summary ou objective.")

def merge_forbidden(engineer_out: dict) -> dict:
    """Merge les forbidden_files/actions hardcodés avec ceux de l'Ingénieur."""
    eng_files   = engineer_out.get("forbidden_files", [])
    eng_actions = engineer_out.get("forbidden_actions", [])
    merged = dict(engineer_out)
    merged["forbidden_files"] = list(set(
        REQUIRED_FORBIDDEN_FILES + [f for f in eng_files if isinstance(f, str)]
    ))
    merged["forbidden_actions"] = list(set(
        REQUIRED_FORBIDDEN_ACTIONS + [a for a in eng_actions if isinstance(a, str)]
    ))
    return merged

# ── Config ────────────────────────────────────────────────
LM_URL    = os.environ.get("TCS_LM_STUDIO_URL", "http://127.0.0.1:1234")
MODEL     = os.environ.get("TCS_LLM_MODEL", "devstral")
TRACES    = Path("lab/traces")
CHAINS    = Path("lab/chains/output")
PROMPTS   = Path("lab/chains/claude_prompts")
MAX_RETRY = 1

# ── System prompts ────────────────────────────────────────

SYSTEM_TRANSLATOR = """
Tu es le Traducteur du Tactical Chess Studio.
Tu reçois une idée en langage naturel de Pierre, l'opérateur solo.

ÉTAPE OBLIGATOIRE AVANT DE TRADUIRE — SOURCE READBACK :
Tu DOIS lire les fichiers pertinents avant de produire le Truth Packet.
Sans lecture → pas de Truth Packet. C'est la règle absolue.

Pour chaque idée reçue :
1. Si elle mentionne un fichier spécifique →
   read_file("C:/TACTICAL_CHESS_STUDIO/<fichier>")
2. Si elle mentionne des known issues →
   read_file("C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/00_MASTER_DOCS/06_KNOWN_ISSUES.md")
3. Si elle mentionne le moteur, search, neural →
   read_dir("C:/TACTICAL_CHESS_STUDIO/src/chess/")
4. Si elle mentionne le dataset ou ML →
   read_dir("C:/TACTICAL_CHESS_STUDIO/ml/")

SOURCE STATE — pour chaque fichier lu, indique son état :
- created : fichier existe
- registered : référencé dans la doc
- loaded : lu par toi maintenant
- enforced : règles appliquées dessus
- evidenced : testé et prouvé

RÈGLE FONDAMENTALE :
"No source readback → no Truth Packet"
Si tu n'as pas lu les fichiers concernés → retourne clarification_needed.

CONTEXTE PROJET :
- Stack : Rust (src/) = runtime truth | Python (ml/) = ML/tooling
- Rocky = Search (autorité finale) + Neural (propose) + LLM (slow path)
- Fichiers interdits : scripts/auto_merge_guard.py, .github/, src/ sans HumanGate
- Lanes : SAFE_AUTO (docs, ml/, lab/) | AUDIT_REQUIRED (src/) | HUMAN_REQUIRED (CI)
- claim_verdict: NO_CLAIM_ALLOWED toujours

FORMAT JSON strict uniquement, sans markdown ni texte autour :
{
  "task_summary": "titre court et précis",
  "objective": "description technique basée sur ce que tu as LU",
  "lane": "SAFE_AUTO | AUDIT_REQUIRED | HUMAN_REQUIRED",
  "files_read": ["C:/TACTICAL_CHESS_STUDIO/06_KNOWN_ISSUES.md"],
  "files_to_modify": ["lab/chains/run_chain.py"],
  "source_state": {
    "06_KNOWN_ISSUES.md": "loaded"
  },
  "existing_context": "ce que tu as RÉELLEMENT lu dans les fichiers",
  "constraints": [
    "Ne pas toucher src/ (runtime Rust)",
    "Windows compatible",
    "Python 3.12 uniquement"
  ],
  "clarification_needed": "",
  "claim_verdict": "NO_CLAIM_ALLOWED"
}
""".strip()

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

SYSTEM_CLAUDE_CODE_FORMATTER = """
Tu es le Formateur de prompt Claude Code du Tactical Chess Studio.
Tu reçois un Codex Pack validé et tu produis un prompt Claude Code CLI.

Le prompt doit être autonome et inclure :
1. Contexte minimal du projet
2. Tâche précise basée sur les fichiers réellement lus
3. Fichiers à modifier (chemins exacts)
4. Fichiers interdits (liste complète mergée)
5. Commandes de validation
6. Template de rapport final obligatoire
7. Escalation stop rule

FORMAT DE SORTIE — texte brut prêt à coller dans Claude Code :

MODE REPO — Tactical Chess Studio
Repo : C:\\TACTICAL_CHESS_STUDIO

TÂCHE : {task_summary}

CONTEXTE (lu depuis le repo) :
{existing_context}

CE QUI DOIT ÊTRE FAIT :
{objective}

FICHIERS À MODIFIER :
{files_to_modify}

FICHIERS INTERDITS (ne pas toucher) :
{forbidden_files}

ACTIONS INTERDITES :
{forbidden_actions}

ESCALATION STOP RULE :
Si le scope s'étend au runtime Rust (engine/search/neural) → STOP immédiat.

VALIDATION :
{validation_commands}

RAPPORT FINAL OBLIGATOIRE (à produire avant HumanGate) :
- commands_run: [liste des commandes exécutées]
- results: [résultats]
- skipped_validation: [ce qui n'a pas été testé et pourquoi]
- risks: [risques résiduels]
- software_verdict: PATCH_APPLIED / DOCS_UPDATED / EXECUTION_FAILED
- evidence_verdict: DOCUMENTATION_ONLY
- claim_verdict: NO_CLAIM_ALLOWED

Ne committe pas. Ne pushe pas. HumanGate avant tout.
claim_verdict: NO_CLAIM_ALLOWED
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

# ── Étape 0 : Traducteur ──────────────────────────────────
def run_translator(idea: str) -> dict:
    raw = call_lm_studio(SYSTEM_TRANSLATOR, idea)
    out = parse_json_safe(raw)
    out.setdefault("claim_verdict", "NO_CLAIM_ALLOWED")
    return out

# ── Étape 1 : Ingénieur ───────────────────────────────────
def run_engineer(truth_packet: dict, extra_directive: str = "") -> dict:
    user_content = json.dumps(truth_packet, ensure_ascii=False, indent=2)
    if extra_directive:
        user_content += f"\n\nCORRECTIONS REQUISES (Red Team):\n{extra_directive}"
    raw = call_lm_studio(SYSTEM_ENGINEER, user_content)
    out = parse_json_safe(raw)
    out.setdefault("recommendation", "PROCEED")
    out.setdefault("claim_verdict", "NO_CLAIM_ALLOWED")
    return out

# ── Étape 2 : Red Team ────────────────────────────────────
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

# ── Étape 3 : Formateur prompt Claude Code ────────────────
def run_formatter(truth_packet: dict, eng_out: dict, verdict: str) -> str:
    formatter_input = json.dumps({
        "truth_packet":      truth_packet,
        "engineer_proposal": eng_out,
        "redteam_verdict":   verdict
    }, ensure_ascii=False, indent=2)
    return call_lm_studio(SYSTEM_CLAUDE_CODE_FORMATTER, formatter_input, temperature=0.1)

# ── Étape 4 : Launcher Claude Code CLI ───────────────────
def launch_claude_code(prompt_path: str, auto: bool = False) -> int:
    print(f"\n{'='*60}")
    print("ÉTAPE 4 — CLAUDE CODE CLI")
    print(f"Prompt préparé : {prompt_path}")
    print(f"{'='*60}")

    with open(prompt_path, encoding="utf-8") as f:
        prompt_content = f.read()

    print("\n--- PROMPT CLAUDE CODE ---")
    print(prompt_content)
    print("--- FIN PROMPT ---\n")

    if not auto:
        print("⚠  HUMAN GATE")
        print("1. Vérifie le prompt ci-dessus")
        print("2. Lance manuellement dans PowerShell :")
        print(f"\n   cd C:\\TACTICAL_CHESS_STUDIO")
        print(f"   npx @anthropic-ai/claude-code\n")
        print("   Puis colle le prompt quand Claude Code démarre.")
        print("\nAppuie sur Entrée pour continuer ou Ctrl+C pour annuler.")
        input("> ")
        return 0
    else:
        import subprocess
        print("[launcher] Lancement Claude Code CLI...")
        result = subprocess.run(
            ["npx", "@anthropic-ai/claude-code", "--print", prompt_content],
            cwd="C:\\TACTICAL_CHESS_STUDIO",
            capture_output=False,
            text=True,
            shell=True
        )
        return result.returncode

# ── Main chain v3 ─────────────────────────────────────────
def run_chain(idea: str = None, truth_packet: dict = None) -> dict:
    chain_id  = str(uuid.uuid4())[:8]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print(f"\n{'='*60}")
    print(f"CHAIN {chain_id} — {timestamp}")
    print(f"{'='*60}\n")

    # ── Étape 0 : Traducteur ──────────────────────────────
    if idea and not truth_packet:
        print("[0/4] Mistral Traducteur...")
        truth_packet = run_translator(idea)
        save_trace(chain_id, "00_translator", truth_packet)
        print(f"  → tâche : {truth_packet.get('task_summary', '?')}")
        print(f"  → lane  : {truth_packet.get('lane', '?')}")

        if truth_packet.get("clarification_needed"):
            print(f"\n⚠  CLARIFICATION REQUISE :")
            print(f"   {truth_packet['clarification_needed']}")
            print("   Précise ta demande et relance.")
            return {"chain_id": chain_id, "status": "CLARIFICATION_NEEDED",
                    "claim_verdict": "NO_CLAIM_ALLOWED"}

    # ── Validate Truth Packet ─────────────────────────────
    validate_truth_packet(truth_packet)

    # ── Étape 1 : Ingénieur ───────────────────────────────
    print("[1/4] Devstral Ingénieur...")
    eng_out = run_engineer(truth_packet)
    eng_out = merge_forbidden(eng_out)
    eng_out.setdefault("proposal_id", chain_id + "_eng")
    save_trace(chain_id, "01_engineer", eng_out)
    print(f"  → recommendation: {eng_out.get('recommendation', '?')}")

    # ── Étape 2 : Red Team ────────────────────────────────
    print("[2/4] Devstral Red Team...")
    rt_out = run_redteam(truth_packet, eng_out)
    save_trace(chain_id, "02_redteam", rt_out)
    print(f"  → verdict: {rt_out.get('verdict', '?')}")
    for flaw in rt_out.get("critical_flaws", []):
        print(f"     ⚠  {flaw}")

    # ── Retry si HOLD ─────────────────────────────────────
    retried = False
    if rt_out.get("verdict") == "HOLD" and MAX_RETRY > 0:
        retried = True
        condition = rt_out.get("survival_condition", "")
        print(f"\n[retry] HOLD → relance Ingénieur")
        print(f"  Condition : {condition}")
        eng_out = run_engineer(truth_packet, extra_directive=condition)
        eng_out = merge_forbidden(eng_out)
        save_trace(chain_id, "01b_engineer_retry", eng_out)
        rt_out = run_redteam(truth_packet, eng_out)
        save_trace(chain_id, "02b_redteam_retry", rt_out)
        print(f"  → verdict final: {rt_out.get('verdict', '?')}")

    # ── Path safety check ─────────────────────────────────
    for f in eng_out.get("files_to_create", []) + eng_out.get("files_to_edit", []):
        if not is_safe_relative_path(f):
            print(f"  ❌ PATH UNSAFE : {f}")
            return {"chain_id": chain_id, "status": "BLOCKED_UNSAFE_PATH",
                    "claim_verdict": "NO_CLAIM_ALLOWED"}

    verdict = rt_out.get("verdict", "HOLD")

    if verdict == "BLOCKED":
        print(f"\n❌ BLOCKED — {rt_out.get('survival_condition', '?')}")
        envelope = {
            "chain_id": chain_id, "timestamp": timestamp,
            "status": "BLOCKED",
            "truth_packet": truth_packet,
            "engineer_proposal": eng_out,
            "redteam_output": rt_out,
            "claim_verdict": "NO_CLAIM_ALLOWED",
            "software_verdict": "CHAIN_BLOCKED",
            "evidence_verdict": "DOCUMENTATION_ONLY"
        }
        CHAINS.mkdir(parents=True, exist_ok=True)
        out_path = CHAINS / f"chain_{chain_id}_{timestamp}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(envelope, f, indent=2, ensure_ascii=False)
        return envelope

    # ── Étape 3 : Formateur prompt Claude Code ────────────
    print("[3/4] Formatage prompt Claude Code...")
    raw_prompt = run_formatter(truth_packet, eng_out, verdict)
    PROMPTS.mkdir(parents=True, exist_ok=True)
    prompt_path = PROMPTS / f"{chain_id}_{timestamp}.md"
    with open(prompt_path, "w", encoding="utf-8") as f:
        f.write(raw_prompt)
    save_trace(chain_id, "03_claude_code_prompt", {"prompt_path": str(prompt_path)})
    print(f"  → prompt sauvé : {prompt_path}")

    # Génère execution_report_template.json à côté du prompt
    report_template = {
        "chain_id": chain_id,
        "task_summary": truth_packet.get("task_summary", ""),
        "commands_run": [],
        "results": [],
        "skipped_validation": [],
        "risks": [],
        "files_modified": [],
        "software_verdict": "PENDING",
        "evidence_verdict": "DOCUMENTATION_ONLY",
        "claim_verdict": "NO_CLAIM_ALLOWED"
    }
    report_template_path = PROMPTS / f"{chain_id}_exec_report_template.json"
    with open(report_template_path, "w", encoding="utf-8") as f:
        json.dump(report_template, f, indent=2, ensure_ascii=False)
    print(f"  → report template : {report_template_path}")

    # ── Étape 4 : Launcher Claude Code ───────────────────
    print("[4/4] Launcher Claude Code CLI...")
    launch_claude_code(str(prompt_path), auto=False)

    # ── Envelope finale ───────────────────────────────────
    rt_label = verdict + (" (après retry)" if retried else "")
    envelope = {
        "chain_id":           chain_id,
        "timestamp":          timestamp,
        "truth_packet":       truth_packet,
        "engineer_proposal":  eng_out,
        "redteam_output":     rt_out,
        "retried":            retried,
        "claude_code_prompt": str(prompt_path),
        "status":             "READY_FOR_CLAUDE_CODE",
        "claim_verdict":      "NO_CLAIM_ALLOWED",
        "software_verdict":   "CHAIN_COMPLETE",
        "evidence_verdict":   "DOCUMENTATION_ONLY"
    }
    CHAINS.mkdir(parents=True, exist_ok=True)
    out_path = CHAINS / f"chain_{chain_id}_{timestamp}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(envelope, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"CHAIN {chain_id} — RÉSUMÉ")
    print(f"  Traducteur: {truth_packet.get('task_summary', '?')}")
    print(f"  Ingénieur : {eng_out.get('recommendation', '?')}")
    print(f"  Red Team  : {rt_label}")
    print(f"  Lane      : {truth_packet.get('lane', '?')}")
    print(f"  Prompt CC : {prompt_path}")
    print(f"  Status    : ✅ READY FOR CLAUDE CODE")
    print(f"{'='*60}\n")

    return envelope

# ── Entry point ───────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--idea", type=str, default=None,
                        help="Idée en langage naturel — Mistral la traduit en Truth Packet")
    parser.add_argument("--truth-packet", type=str, default=None,
                        help="Chemin vers un fichier YAML truth packet")
    parser.add_argument("--objective", type=str, default=None,
                        help="Objectif technique direct (bypass traducteur)")
    args = parser.parse_args()

    if args.truth_packet:
        with open(args.truth_packet, "r", encoding="utf-8") as f:
            tp = yaml.safe_load(f)
        result = run_chain(truth_packet=tp)
    elif args.idea:
        result = run_chain(idea=args.idea)
    elif args.objective:
        tp = {
            "task_summary":  args.objective,
            "objective":     args.objective,
            "lane":          "AUDIT_REQUIRED",
            "claim_verdict": "NO_CLAIM_ALLOWED"
        }
        result = run_chain(truth_packet=tp)
    else:
        parser.print_help()
        exit(1)

    exit(0 if result.get("status") == "READY_FOR_CLAUDE_CODE" else 1)
