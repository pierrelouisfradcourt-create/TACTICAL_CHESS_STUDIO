import json
import os
import sys
import time
import hashlib

print(f"PYTHON_SYS_EXECUTABLE|{sys.executable}", file=sys.stderr, flush=True)
print(f"PYTHON_SYS_PATH|{json.dumps(sys.path)}", file=sys.stderr, flush=True)

import torch
import numpy as np

from dataset_loader import fen_to_tensor
from model import PolicyValueNet
from move_vocab import try_move_to_index

try:
    from memory_core.retrieve import retrieve_memory
except Exception:
    retrieve_memory = None


def get_env_str(name: str, default: str) -> str:
    return os.environ.get(name, default).strip()


def get_env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except Exception:
        return default


def get_env_float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, str(default)))
    except Exception:
        return default


def memory_core_enabled() -> bool:
    return get_env_str("TCS_MEMORY_CORE", "0").lower() in {"1", "true", "yes", "on"}


def resolve_model_path() -> str:
    profile = get_env_str("TCS_NEURAL_PROFILE", "latest").lower()

    custom_path = get_env_str("TCS_MODEL_PATH", "")
    if custom_path:
        return custom_path

    if profile == "latest":
        return "models/latest.pt"

    return f"models/{profile}.pt"


def compute_model_sha256(model_path: str) -> str:
    """Compute SHA256 of model file, return 'unknown' if unavailable."""
    try:
        with open(model_path, "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()
    except Exception:
        return "unknown"


def load_model(device: torch.device) -> PolicyValueNet:
    model_path = resolve_model_path()
    print(
        f"PYTHON INFER: loading profile={get_env_str('TCS_NEURAL_PROFILE', 'latest')} path={model_path}",
        file=sys.stderr,
        flush=True,
    )

    model = PolicyValueNet().to(device)
    state = torch.load(model_path, map_location=device)
    model.load_state_dict(state)
    model.eval()
    return model


def should_emit_value_debug() -> bool:
    return get_env_str("TCS_NEURAL_VALUE_DEBUG", "1").lower() in {"1", "true", "yes", "on"}


def should_emit_policy_debug() -> bool:
    return get_env_str("TCS_NEURAL_POLICY_DEBUG", "0").lower() in {"1", "true", "yes", "on"}


def score_legal_moves(
    logits: np.ndarray,
    legal_moves: list[str],
) -> list[tuple[str, float, int]]:
    scored: list[tuple[str, float, int]] = []

    for mv in legal_moves:
        idx = try_move_to_index(mv)
        if idx is None:
            continue
        if idx < 0 or idx >= len(logits):
            continue
        scored.append((mv, float(logits[idx]), int(idx)))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored


def top_candidate_moves(
    logits: np.ndarray,
    legal_moves: list[str],
    rerank_topk: int,
) -> list[tuple[str, int]]:
    scored = score_legal_moves(logits, legal_moves)
    k = max(1, min(rerank_topk, len(scored)))
    return [(mv, idx) for mv, _, idx in scored[:k]]


def choose_move_from_logits(
    logits: np.ndarray,
    legal_moves: list[str],
    mode: str,
    topk: int,
    temp: float,
) -> tuple[str, int]:
    scored = score_legal_moves(logits, legal_moves)

    if not scored:
        fallback_move = legal_moves[0]
        fallback_idx = try_move_to_index(fallback_move)
        if fallback_idx is None:
            fallback_idx = -1
        return fallback_move, fallback_idx

    if should_emit_policy_debug():
        preview = ", ".join(
            f"{mv}:{score:.4f}:{idx}" for mv, score, idx in scored[: min(5, len(scored))]
        )
        print(f"PYTHON INFER TOP_LEGAL={preview}", file=sys.stderr, flush=True)

    if mode == "greedy":
        return scored[0][0], scored[0][2]

    if mode == "topk":
        k = max(1, min(topk, len(scored)))
        subset = scored[:k]

        values = np.array([score for _, score, _ in subset], dtype=np.float64)
        t = max(temp, 1e-6)
        values = values / t
        values = values - np.max(values)

        probs = np.exp(values)
        probs_sum = np.sum(probs)

        if not np.isfinite(probs_sum) or probs_sum <= 0:
            return subset[0][0], subset[0][2]

        probs = probs / probs_sum
        choice = np.random.choice(len(subset), p=probs)
        return subset[int(choice)][0], subset[int(choice)][2]

    return scored[0][0], scored[0][2]


def build_memory_payload(fen: str) -> dict:
    if not memory_core_enabled() or retrieve_memory is None:
        return {}
    try:
        payload = retrieve_memory(fen)
        if isinstance(payload, dict):
            return payload
    except Exception as e:
        print(f"PYTHON MEMORY_CORE ERROR={e}", file=sys.stderr, flush=True)
    return {}


def infer_one(
    model: PolicyValueNet,
    device: torch.device,
    fen: str,
    legal_moves: list[str],
    mode: str,
    topk: int,
    temp: float,
    rerank_topk: int,
) -> tuple[str, int, float, list[tuple[str, int]], dict]:
    x = fen_to_tensor(fen)
    x_tensor = torch.tensor(x, dtype=torch.float32, device=device).unsqueeze(0)

    with torch.no_grad():
        logits, pred_value = model(x_tensor)

    logits_np = logits[0].detach().cpu().numpy()
    value = float(pred_value.squeeze().detach().cpu().item())
    move, policy_index = choose_move_from_logits(logits_np, legal_moves, mode, topk, temp)
    candidates = top_candidate_moves(logits_np, legal_moves, rerank_topk)
    memory_payload = build_memory_payload(fen)
    return move, policy_index, value, candidates, memory_payload


def parse_line_payload(line: str) -> tuple[str, list[str]]:
    payload = line.strip()
    print(f"PYTHON_RECEIVED|{payload[:100]}", file=sys.stderr, flush=True)
    if "|" not in payload:
        raise ValueError(f"Invalid payload: {payload}")

    parts = payload.split("|")
    if len(parts) < 2:
        raise ValueError("Invalid payload: expected 'fen|move1|move2|...'")

    fen = parts[0].strip()
    legal_moves = [p.strip() for p in parts[1:] if p.strip()]

    if not fen:
        raise ValueError("Empty FEN")
    if not legal_moves:
        raise ValueError("No legal moves")

    return fen, legal_moves


def safe_stdout_line(message: str) -> bool:
    try:
        sys.stdout.write(message + "\n")
        sys.stdout.flush()
        return True
    except (BrokenPipeError, OSError):
        return False


def serve() -> None:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = load_model(device)

    mode = get_env_str("TCS_NEURAL_MODE", "greedy").lower()
    topk = get_env_int("TCS_NEURAL_TOPK", 3)
    temp = get_env_float("TCS_NEURAL_TEMP", 0.8)
    rerank_topk = get_env_int("TCS_NEURAL_RERANK_TOPK", 5)

    model_path = resolve_model_path()
    model_sha256 = compute_model_sha256(model_path)
    profile = get_env_str("TCS_NEURAL_PROFILE", "latest")

    print(f"PYTHON MODEL_IDENTITY|path={model_path}|profile={profile}|sha256={model_sha256}", file=sys.stderr, flush=True)

    if not safe_stdout_line("READY"):
        return

    while True:
        try:
            raw = sys.stdin.readline()
        except Exception as e:
            print(f"PYTHON_STDIN_READ_ERROR={e}", file=sys.stderr, flush=True)
            time.sleep(0.05)
            continue

        if raw == "":
            break

        line = raw.strip()
        if not line:
            continue
        if line.upper() == "QUIT":
            safe_stdout_line("BYE")
            break

        try:
            if "|" not in line:
                if not safe_stdout_line(f"ERROR|Invalid payload: {line}"):
                    break
                continue
            fen, legal_moves = parse_line_payload(line)
            move, policy_index, value, candidates, memory_payload = infer_one(
                model,
                device,
                fen,
                legal_moves,
                mode,
                topk,
                temp,
                rerank_topk,
            )
            if should_emit_value_debug():
                print(f"PYTHON INFER VALUE={value:.4f}", file=sys.stderr, flush=True)
            shortlist = ",".join(f"{mv}:{idx}" for mv, idx in candidates)
            if memory_core_enabled():
                memory_json = json.dumps(memory_payload, separators=(",", ":"), sort_keys=True)
                if not safe_stdout_line(f"{move}|{policy_index}|{value:.6f}|{shortlist}|{memory_json}"):
                    break
            else:
                if not safe_stdout_line(f"{move}|{policy_index}|{value:.6f}|{shortlist}"):
                    break
        except Exception as e:
            if not safe_stdout_line(f"ERROR|{e}"):
                break


def main() -> None:
    if "--serve" in sys.argv:
        serve()
        return

    if len(sys.argv) < 3:
        print("Usage:")
        print(r"  .\.venv\Scripts\python.exe ml/infer_policy.py --serve")
        print(r"  .\.venv\Scripts\python.exe ml/infer_policy.py '<fen>' e2e4 d2d4 g1f3")
        sys.exit(1)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = load_model(device)

    fen = sys.argv[1]
    legal_moves = sys.argv[2:]

    mode = get_env_str("TCS_NEURAL_MODE", "greedy").lower()
    topk = get_env_int("TCS_NEURAL_TOPK", 3)
    temp = get_env_float("TCS_NEURAL_TEMP", 0.8)
    rerank_topk = get_env_int("TCS_NEURAL_RERANK_TOPK", 5)

    move, policy_index, value, candidates, memory_payload = infer_one(
        model,
        device,
        fen,
        legal_moves,
        mode,
        topk,
        temp,
        rerank_topk,
    )
    print(move)
    print(f"policy_index={policy_index}", file=sys.stderr, flush=True)
    print(f"value={value:.4f}", file=sys.stderr, flush=True)
    print(
        "rerank_candidates="
        + ",".join(f"{mv}:{idx}" for mv, idx in candidates),
        file=sys.stderr,
        flush=True,
    )
    if memory_core_enabled():
        print(
            "memory_payload=" + json.dumps(memory_payload, separators=(",", ":"), sort_keys=True),
            file=sys.stderr,
            flush=True,
        )


if __name__ == "__main__":
    main()
