import argparse
import hashlib
import json
import os
import random
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader

from dataset_loader import TeacherDataset, load_dataset_rows, resolve_dataset_path
from model import PolicyValueNet
from move_vocab import try_move_to_index, vocab_fingerprint


# =========================
# 🔧 SEED GLOBAL
# =========================
def set_global_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)

    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)

    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


# =========================
# 🔧 LOSS
# =========================
def soft_cross_entropy(
    logits: torch.Tensor,
    target_probs: torch.Tensor,
    reduction: str = "mean",
) -> torch.Tensor:
    log_probs = F.log_softmax(logits, dim=1)
    loss = -(target_probs * log_probs).sum(dim=1)
    if reduction == "none":
        return loss
    return loss.mean()


def parse_boolish(value, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value) != 0.0
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off", ""}:
            return False
        return default
    return default


def inspect_dataset(path: str) -> dict:
    file_path = Path(path).resolve()
    dataset_rows, dataset_meta = load_dataset_rows(path)

    result_counts = {"1-0": 0, "0-1": 0, "1/2-1/2": 0}
    termination_counts = {}
    draw_cause_counts = {}
    hard_cap_draw_rows = 0
    unique_fens = set()
    unique_best_moves = set()
    rows = 0
    policy_only_rows = 0
    supervised_value_rows = 0
    engine_eval_rows = 0
    legal_moves_rows = 0
    top_moves_rows = 0
    aaa_rows = 0
    aaa_search_rows = 0
    aaa_valid_alt_total = 0
    aaa_alt_unmapped = 0
    aaa_confidence_total = 0.0
    aaa_confidence_count = 0
    best_move_vocab_mismatch_rows = 0
    schema_version_counts = {}
    source_counts = {}

    sha256 = hashlib.sha256()
    sha256.update(json.dumps(dataset_meta, sort_keys=True, ensure_ascii=True).encode("utf-8"))

    for row in dataset_rows:
        sha256.update(b"\n")
        sha256.update(json.dumps(row, sort_keys=True, ensure_ascii=True).encode("utf-8"))
        rows += 1

        fen = row.get("fen")
        best_move = row.get("best_move")
        result = row.get("result")
        engine_eval = row.get("engine_eval")
        policy_only = parse_boolish(row.get("policy_only", False), default=False)
        schema_version = row.get("schema_version", 0)
        source = row.get("source", row.get("adaptive_source", "unknown"))
        termination = str(
            row.get("termination_reason", row.get("termination", "")) or ""
        ).strip()
        draw_cause = str(row.get("draw_cause", "") or "").strip()

        if fen:
            unique_fens.add(fen)

        if best_move:
            unique_best_moves.add(best_move)
            if try_move_to_index(best_move) is None:
                best_move_vocab_mismatch_rows += 1

        if result in result_counts:
            result_counts[result] += 1

        if termination:
            termination_counts[termination] = termination_counts.get(termination, 0) + 1

        if draw_cause:
            draw_cause_counts[draw_cause] = draw_cause_counts.get(draw_cause, 0) + 1

        if result == "1/2-1/2" and (
            termination in {"turn_limit", "lab_hard_turn_cap"}
            or draw_cause == "turn_limit"
        ):
            hard_cap_draw_rows += 1

        if policy_only:
            policy_only_rows += 1
        else:
            supervised_value_rows += 1

        if engine_eval is not None:
            engine_eval_rows += 1

        if row.get("legal_moves"):
            legal_moves_rows += 1

        if row.get("top_moves"):
            top_moves_rows += 1

        if has_aaa_payload(row):
            aaa_rows += 1
            valid_alt_count = 0
            for alt_move in row.get("aaa_alt_moves", []) or []:
                if try_move_to_index(alt_move) is None:
                    aaa_alt_unmapped += 1
                else:
                    valid_alt_count += 1
            aaa_valid_alt_total += valid_alt_count

            raw_conf = row.get("aaa_confidence")
            if raw_conf is not None:
                try:
                    aaa_confidence_total += float(raw_conf)
                    aaa_confidence_count += 1
                except (TypeError, ValueError):
                    pass

        if parse_boolish(row.get("aaa_used_search", False), default=False):
            aaa_search_rows += 1

        schema_version_counts[str(schema_version)] = schema_version_counts.get(str(schema_version), 0) + 1
        source_counts[source] = source_counts.get(source, 0) + 1

    return {
        "path": str(file_path),
        "mode": dataset_meta.get("mode", "single_file"),
        "dataset_meta": dataset_meta,
        "rows": rows,
        "sha256": sha256.hexdigest(),
        "unique_fens": len(unique_fens),
        "unique_best_moves": len(unique_best_moves),
        "result_counts": result_counts,
        "termination_counts": termination_counts,
        "draw_cause_counts": draw_cause_counts,
        "hard_cap_draw_rows": hard_cap_draw_rows,
        "policy_only_rows": policy_only_rows,
        "supervised_value_rows": supervised_value_rows,
        "engine_eval_rows": engine_eval_rows,
        "legal_moves_rows": legal_moves_rows,
        "top_moves_rows": top_moves_rows,
        "aaa_rows": aaa_rows,
        "aaa_search_rows": aaa_search_rows,
        "aaa_used_search_proportion": aaa_search_rows / max(aaa_rows, 1),
        "avg_valid_aaa_alternatives_per_aaa_row": aaa_valid_alt_total / max(aaa_rows, 1),
        "aaa_alt_unmapped": aaa_alt_unmapped,
        "best_move_vocab_mismatch_rows": best_move_vocab_mismatch_rows,
        "avg_aaa_confidence": aaa_confidence_total / max(aaa_confidence_count, 1),
        "aaa_signal_status": classify_aaa_signal(
            aaa_rows,
            rows,
            aaa_valid_alt_total / max(aaa_rows, 1),
        ),
        "schema_version_counts": schema_version_counts,
        "source_counts": source_counts,
    }


def has_aaa_payload(row: dict) -> bool:
    aaa_fields = [
        "aaa_search_depth",
        "aaa_search_score",
        "aaa_heuristic_score",
        "aaa_policy_score",
        "aaa_decision_score",
        "aaa_second_best_search_gap",
        "aaa_second_best_decision_gap",
        "aaa_nodes",
        "aaa_q_nodes",
        "aaa_beta_cutoffs",
        "aaa_tt_hits",
        "aaa_ordering_cutoff_index",
        "aaa_best_move_initial_rank",
        "aaa_best_move_final_rank",
        "aaa_principal_changed",
        "aaa_confidence",
    ]
    for field in aaa_fields:
        if row.get(field) is not None:
            return True

    return bool(row.get("aaa_alt_moves")) or bool(row.get("aaa_alt_decision_scores"))


def classify_aaa_signal(aaa_rows: int, total_rows: int, avg_valid_alt: float) -> str:
    if aaa_rows <= 0:
        return "absent"
    density = aaa_rows / max(total_rows, 1)
    if density < 0.05 or avg_valid_alt <= 0.0:
        return "sparse"
    return "usable"


def summarize_loaded_dataset(dataset: TeacherDataset) -> dict:
    policy_only_samples = 0
    value_supervised_samples = 0
    schema_version_counts = {}
    conversion_focus_samples = 0
    nonzero_soft_policy_samples = 0
    legal_mask_nonempty_samples = 0
    aaa_search_samples = 0
    aaa_samples = 0
    avg_aaa_confidence = 0.0
    adaptive_bucket_counts = {}
    adaptive_source_counts = {}
    adaptive_weight_total = 0.0

    for extra in dataset.extra_samples:
        schema_version = extra.get("schema_version", 0)
        schema_version_counts[str(schema_version)] = schema_version_counts.get(str(schema_version), 0) + 1

        if float(extra["y_policy_soft"].sum().item()) > 0.0:
            nonzero_soft_policy_samples += 1

        if float(extra["legal_mask"].sum().item()) > 0.0:
            legal_mask_nonempty_samples += 1

        if float(extra["conversion_focus"].item()) > 0.0:
            conversion_focus_samples += 1

        aaa_confidence_value = float(extra["aaa_confidence"].item())

        if float(extra["aaa_used_search"].item()) > 0.0:
            aaa_search_samples += 1

        if bool(extra.get("aaa_has_payload", False)):
            aaa_samples += 1
            avg_aaa_confidence += aaa_confidence_value

        if bool(extra.get("policy_only", False)):
            policy_only_samples += 1
        else:
            value_supervised_samples += 1

        adaptive_bucket = str(extra.get("adaptive_bucket", "unknown"))
        adaptive_source = str(extra.get("adaptive_source", "unknown"))
        adaptive_bucket_counts[adaptive_bucket] = adaptive_bucket_counts.get(adaptive_bucket, 0) + 1
        adaptive_source_counts[adaptive_source] = adaptive_source_counts.get(adaptive_source, 0) + 1
        adaptive_weight_total += float(extra.get("adaptive_weight", 1.0) or 1.0)

    return {
        "loaded_samples": len(dataset),
        "policy_only_samples": policy_only_samples,
        "value_supervised_samples": value_supervised_samples,
        "schema_version_counts": schema_version_counts,
        "conversion_focus_samples": conversion_focus_samples,
        "nonzero_soft_policy_samples": nonzero_soft_policy_samples,
        "legal_mask_nonempty_samples": legal_mask_nonempty_samples,
        "aaa_search_samples": aaa_search_samples,
        "aaa_samples": aaa_samples,
        "aaa_used_search_proportion": aaa_search_samples / max(aaa_samples, 1),
        "avg_aaa_confidence": (avg_aaa_confidence / max(aaa_samples, 1)),
        "adaptive_bucket_counts": adaptive_bucket_counts,
        "adaptive_source_counts": adaptive_source_counts,
        "avg_adaptive_weight": adaptive_weight_total / max(len(dataset), 1),
        "aaa_signal_status": classify_aaa_signal(
            aaa_samples,
            len(dataset),
            1.0 if aaa_samples > 0 else 0.0,
        ),
    }


def env_flag(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def classify_dataset_fitness(dataset_info: dict, loaded_dataset_info: dict) -> dict:
    min_rows_for_ab = int(os.environ.get("TCS_DATASET_MIN_ROWS_FOR_AB", "500"))
    min_loaded_samples_for_ab = int(os.environ.get("TCS_DATASET_MIN_LOADED_SAMPLES_FOR_AB", "500"))
    result_skew_threshold = float(os.environ.get("TCS_DATASET_RESULT_SKEW_THRESHOLD", "0.85"))
    hard_cap_draw_ratio_limit = float(os.environ.get("TCS_HARD_CAP_DRAW_RATIO", "0.05"))
    min_source_confidence = float(os.environ.get("TCS_MIN_SOURCE_CONFIDENCE", "0.80"))

    rows = int(dataset_info["rows"])
    loaded_samples = int(loaded_dataset_info["loaded_samples"])
    result_counts = dataset_info["result_counts"]
    source_counts = dataset_info["source_counts"]
    termination_counts = dataset_info.get("termination_counts", {})
    draw_cause_counts = dataset_info.get("draw_cause_counts", {})

    white_wins = int(result_counts.get("1-0", 0))
    black_wins = int(result_counts.get("0-1", 0))
    draws = int(result_counts.get("1/2-1/2", 0))
    known_result_total = white_wins + black_wins + draws
    max_result_ratio = (
        max(white_wins, black_wins, draws) / known_result_total
        if known_result_total > 0
        else 0.0
    )
    source_unknown_only = bool(source_counts) and all(source == "unknown" for source in source_counts)
    known_source_rows = sum(count for source, count in source_counts.items() if source != "unknown")
    source_confidence = (known_source_rows / rows) if rows > 0 else 0.0
    hard_cap_rows = int(dataset_info.get("hard_cap_draw_rows", 0))
    hard_cap_draw_ratio = (hard_cap_rows / draws) if draws > 0 else 0.0

    reject_reasons = []
    warning_reasons = []

    if rows < min_rows_for_ab:
        reject_reasons.append("too_few_rows")
    if loaded_samples < min_loaded_samples_for_ab:
        reject_reasons.append("too_few_loaded_samples")
    if white_wins == 0:
        reject_reasons.append("no_white_wins")
    if black_wins == 0:
        reject_reasons.append("no_black_wins")
    if source_confidence < min_source_confidence:
        reject_reasons.append("low_source_confidence")
    if hard_cap_draw_ratio > hard_cap_draw_ratio_limit:
        reject_reasons.append("hard_cap_draw_ratio_too_high")

    if source_unknown_only:
        warning_reasons.append("source_unknown_only")
    if known_result_total > 0 and max_result_ratio >= result_skew_threshold:
        warning_reasons.append("result_distribution_skewed")

    if reject_reasons:
        dataset_fitness = "reject_for_ab"
    elif warning_reasons:
        dataset_fitness = "warning"
    else:
        dataset_fitness = "admissible"

    reasons = reject_reasons + warning_reasons

    return {
        "dataset_fitness": dataset_fitness,
        "reasons": reasons,
        "reject_reasons": reject_reasons,
        "warning_reasons": warning_reasons,
        "signals": {
            "rows": rows,
            "loaded_samples": loaded_samples,
            "loaded_sample_ratio": (loaded_samples / rows) if rows > 0 else 0.0,
            "result_counts": {
                "1-0": white_wins,
                "0-1": black_wins,
                "1/2-1/2": draws,
            },
            "has_white_win": white_wins > 0,
            "has_black_win": black_wins > 0,
            "source_unknown_only": source_unknown_only,
            "source_confidence": source_confidence,
            "max_result_ratio": max_result_ratio,
            "hard_cap_rows": hard_cap_rows,
            "hard_cap_draw_ratio": hard_cap_draw_ratio,
            "min_rows_for_ab": min_rows_for_ab,
            "min_loaded_samples_for_ab": min_loaded_samples_for_ab,
            "result_skew_threshold": result_skew_threshold,
            "hard_cap_draw_ratio_limit": hard_cap_draw_ratio_limit,
            "min_source_confidence": min_source_confidence,
            "termination_counts": termination_counts,
            "draw_cause_counts": draw_cause_counts,
        },
    }


def effective_run_tag(tag: str, dataset_fitness: str) -> str:
    cleaned = tag.strip()
    if not cleaned:
        return ""

    lowered = cleaned.lower()
    if "ab" in lowered and "clean" in lowered and dataset_fitness != "admissible":
        suffix = "dataset_warning" if dataset_fitness == "warning" else "not_ab_admissible"
        if suffix not in lowered:
            return f"{cleaned}_{suffix}"
    return cleaned


class IndexedTeacherDataset(torch.utils.data.Dataset):
    """Preserve original sample indices so shuffled batches can recover aligned metadata."""

    def __init__(self, base_dataset: TeacherDataset):
        self.base_dataset = base_dataset

    def __len__(self) -> int:
        return len(self.base_dataset)

    def __getitem__(self, idx: int):
        return (idx, *self.base_dataset[idx])


def build_manifest(
    *,
    run_id: str,
    run_dir: str,
    args: argparse.Namespace,
    seed: int,
    dataset_info: dict,
    loaded_dataset_info: dict,
    dataset_admission: dict,
    requested_tag: str,
    effective_tag_value: str,
    strict_dataset_admission: bool,
    device: torch.device,
    dataset: TeacherDataset,
    shuffle_enabled: bool,
    sampler_name: str,
    split_name: str,
    best_loss,
    best_path: str,
    latest_path: str,
    training_status: str,
) -> dict:
    return {
        "run_id": run_id,
        "requested_tag": requested_tag,
        "effective_tag": effective_tag_value,
        "run_semantics": (
            "ab_admissible"
            if dataset_admission["dataset_fitness"] == "admissible"
            else "exploratory_only"
        ),
        "training_status": training_status,
        "strict_dataset_admission": strict_dataset_admission,
        "dataset_fitness": dataset_admission["dataset_fitness"],
        "dataset_fitness_reasons": dataset_admission["reasons"],
        "dataset_admission": dataset_admission,
        "dataset": dataset_info,
        "loaded_dataset": loaded_dataset_info,
        "vocab_fingerprint": vocab_fingerprint(),
        "seed": seed,
        "rng_contract": {
            "global_seed": seed,
            "dataset_loader_seed": seed,
            "shuffle": shuffle_enabled,
            "sampler": sampler_name,
            "split": split_name,
            "dataset_path": dataset_info["path"],
            "dataset_sha256": dataset_info["sha256"],
        },
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "lr": args.lr,
        "value_weight": args.value_weight,
        "conversion_focus_weight": args.conversion_focus_weight,
        "device": str(device),
        "vocab_size": dataset[0][3].numel() if len(dataset) > 0 else 0,
        "best_loss": best_loss,
        "trainer_contract": {
            "dataset_batch_shape": 6,
            "aaa_influence_enabled": not env_flag("TCS_DISABLE_AAA_INFLUENCE"),
            "aaa_influence_status": (
                "disabled"
                if env_flag("TCS_DISABLE_AAA_INFLUENCE")
                else loaded_dataset_info.get("aaa_signal_status", dataset_info.get("aaa_signal_status", "absent"))
            ),
            "dataset_batch_fields": [
                "x",
                "y_policy",
                "y_value",
                "y_policy_soft",
                "legal_mask",
                "aaa_confidence",
            ],
            "extra_sample_fields": [
                "best_move",
                "fen",
                "schema_version",
                "policy_only",
                "side_material_plus",
                "conversion_focus",
                "aaa_used_search",
                "aaa_has_payload",
                "adaptive_weight",
                "adaptive_bucket",
                "adaptive_source",
                "material_signature",
            ],
            "aaa_alt_search_scores": "diagnostic_only",
            "policy_only_definition": "policy_only=true => excluded from value loss via zero value_weight_mask",
            "value_supervised_definition": "policy_only=false or missing => included in value loss via value_weight_mask=1",
        },
        "loss_contract": {
            "policy_loss": "mean(sample_weight * soft_cross_entropy(masked_logits, y_policy_soft))",
            "value_loss": "sum(value_weight_mask * mse(pred_value, y_value)) / clamp_min(sum(value_weight_mask), 1.0)",
            "total_loss": "policy_loss + cli_value_weight * value_loss",
            "policy_only_rows": "included in policy loss, excluded from value loss",
            "conversion_focus": "reweights policy loss only",
        },
        "best_model": str(Path(best_path).resolve()),
        "latest_model": str(Path(latest_path).resolve()),
        "run_dir": str(Path(run_dir).resolve()),
    }


# =========================
# 🚀 MAIN
# =========================
def main() -> None:
    parser = argparse.ArgumentParser()

    parser.add_argument("--input", type=str, default=None)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=3e-4)

    parser.add_argument("--value-weight", type=float, default=0.4)
    parser.add_argument("--conversion-focus-weight", type=float, default=1.25)

    parser.add_argument("--tag", type=str, default="")
    parser.add_argument("--strict-dataset-admission", action="store_true")

    args = parser.parse_args()

    seed = int(os.environ.get("TCS_TRAIN_SEED", "42"))
    set_global_seed(seed)
    strict_dataset_admission = args.strict_dataset_admission or env_flag("TCS_STRICT_DATASET_ADMISSION")

    print(f"Training seed: {seed}")
    print(f"value_weight: {args.value_weight}")
    print(f"conversion_focus_weight: {args.conversion_focus_weight}")
    print(f"strict_dataset_admission: {strict_dataset_admission}")

    dataset_path = resolve_dataset_path(args.input)
    dataset_info = inspect_dataset(dataset_path)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    print("Device:", device)
    print(
        "Dataset semantics:",
        f"policy_only_rows={dataset_info['policy_only_rows']} | "
        f"supervised_value_rows={dataset_info['supervised_value_rows']} | "
        f"engine_eval_rows={dataset_info['engine_eval_rows']}",
    )

    dataset = TeacherDataset(dataset_path)
    loaded_dataset_info = summarize_loaded_dataset(dataset)
    dataset_admission = classify_dataset_fitness(dataset_info, loaded_dataset_info)

    print(
        "Dataset summary:",
        f"rows={dataset_info['rows']} | "
        f"mode={dataset_info['mode']} | "
        f"loaded_samples={loaded_dataset_info['loaded_samples']} | "
        f"results=1-0:{dataset_info['result_counts']['1-0']} "
        f"0-1:{dataset_info['result_counts']['0-1']} "
        f"1/2-1/2:{dataset_info['result_counts']['1/2-1/2']} | "
        f"aaa_rows={dataset_info['aaa_rows']} | "
        f"aaa_status={dataset_info['aaa_signal_status']} | "
        f"sources={dataset_info['source_counts']}",
    )
    print(
        "AAA dataset signal:",
        f"influence_enabled={not env_flag('TCS_DISABLE_AAA_INFLUENCE')} | "
        f"rows={dataset_info['aaa_rows']} | "
        f"used_search_proportion={dataset_info['aaa_used_search_proportion']:.4f} | "
        f"avg_valid_alts={dataset_info['avg_valid_aaa_alternatives_per_aaa_row']:.4f} | "
        f"alt_unmapped={dataset_info['aaa_alt_unmapped']} | "
        f"best_move_vocab_mismatch_rows={dataset_info['best_move_vocab_mismatch_rows']} | "
        f"avg_confidence={dataset_info['avg_aaa_confidence']:.4f} | "
        "aaa_alt_search_scores=diagnostic_only",
    )
    print(
        "Loaded dataset:",
        f"loaded_samples={loaded_dataset_info['loaded_samples']} | "
        f"policy_only_samples={loaded_dataset_info['policy_only_samples']} | "
        f"value_supervised_samples={loaded_dataset_info['value_supervised_samples']} | "
        f"aaa_samples={loaded_dataset_info['aaa_samples']} | "
        f"aaa_search_samples={loaded_dataset_info['aaa_search_samples']} | "
        f"avg_aaa_confidence={loaded_dataset_info['avg_aaa_confidence']:.3f} | "
        f"adaptive_buckets={loaded_dataset_info['adaptive_bucket_counts']} | "
        f"avg_adaptive_weight={loaded_dataset_info['avg_adaptive_weight']:.3f}",
    )
    print(
        "Dataset admission:",
        f"fitness={dataset_admission['dataset_fitness']} | "
        f"reasons={','.join(dataset_admission['reasons']) if dataset_admission['reasons'] else 'none'}",
    )
    print(
        "Dataset admission signals:",
        f"rows={dataset_admission['signals']['rows']} | "
        f"loaded_samples={dataset_admission['signals']['loaded_samples']} | "
        f"white_wins={dataset_admission['signals']['result_counts']['1-0']} | "
        f"black_wins={dataset_admission['signals']['result_counts']['0-1']} | "
        f"draws={dataset_admission['signals']['result_counts']['1/2-1/2']} | "
        f"source_unknown_only={dataset_admission['signals']['source_unknown_only']} | "
        f"source_confidence={dataset_admission['signals']['source_confidence']:.3f} | "
        f"hard_cap_draw_ratio={dataset_admission['signals']['hard_cap_draw_ratio']:.3f}",
    )

    requested_tag = args.tag.strip()
    effective_tag_value = effective_run_tag(requested_tag, dataset_admission["dataset_fitness"])
    run_suffix = f"_{effective_tag_value}" if effective_tag_value else ""
    run_id = time.strftime(f"run_%Y%m%d_%H%M%S{run_suffix}")
    run_dir = os.path.join("lab", "runs", run_id)

    model_dir = os.environ.get("TCS_MODEL_DIR", "models")
    os.makedirs(run_dir, exist_ok=True)
    os.makedirs(model_dir, exist_ok=True)

    generator = torch.Generator()
    generator.manual_seed(seed)
    shuffle_enabled = True
    sampler_name = "RandomSampler"
    split_name = "full_dataset_no_split"
    indexed_dataset = IndexedTeacherDataset(dataset)

    loader = DataLoader(
        indexed_dataset,
        batch_size=args.batch_size,
        shuffle=shuffle_enabled,
        generator=generator,
    )

    model = PolicyValueNet().to(device)

    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=args.lr,
    )

    best_loss = float("inf")

    best_path = os.path.join(model_dir, "best.pt")
    latest_path = os.path.join(model_dir, "latest.pt")
    registry_path = os.path.join(model_dir, "latest_run.json")

    if strict_dataset_admission and dataset_admission["dataset_fitness"] == "reject_for_ab":
        manifest = build_manifest(
            run_id=run_id,
            run_dir=run_dir,
            args=args,
            seed=seed,
            dataset_info=dataset_info,
            loaded_dataset_info=loaded_dataset_info,
            dataset_admission=dataset_admission,
            requested_tag=requested_tag,
            effective_tag_value=effective_tag_value,
            strict_dataset_admission=strict_dataset_admission,
            device=device,
            dataset=dataset,
            shuffle_enabled=shuffle_enabled,
            sampler_name=sampler_name,
            split_name=split_name,
            best_loss=None,
            best_path=best_path,
            latest_path=latest_path,
            training_status="blocked_by_dataset_admission",
        )

        with open(
            os.path.join(run_dir, "manifest.json"),
            "w",
            encoding="utf-8",
        ) as f:
            json.dump(manifest, f, indent=4)

        with open(
            registry_path,
            "w",
            encoding="utf-8",
        ) as f:
            json.dump(manifest, f, indent=4)

        raise SystemExit(
            "Dataset admission rejected this run in strict mode: "
            + ",".join(dataset_admission["reasons"])
        )

    epoch_log_path = os.path.join(run_dir, "training_epochs.csv")

    with open(epoch_log_path, "w", encoding="utf-8") as f:
        f.write(
            "epoch,total_loss,policy_loss,value_loss,"
            "policy_only_samples,value_supervised_samples,conversion_focus_samples\n"
        )

    for epoch in range(1, args.epochs + 1):
        model.train()

        total_loss = 0.0
        total_policy = 0.0
        total_value = 0.0
        epoch_policy_only_samples = 0
        epoch_value_supervised_samples = 0
        epoch_conversion_focus_samples = 0

        for batch_idx, batch in enumerate(loader):
            if len(batch) != 7:
                raise ValueError(
                    f"Unexpected batch contract from TeacherDataset: expected 7 tensors, got {len(batch)}"
                )

            sample_indices, x, y_policy, y_value, y_policy_soft, legal_mask, aaa_confidence = batch

            x = x.to(device)
            y_policy = y_policy.to(device)
            y_value = y_value.to(device).squeeze(-1)
            y_policy_soft = y_policy_soft.to(device)
            legal_mask = legal_mask.to(device)
            aaa_confidence = aaa_confidence.to(device).squeeze(-1)
            batch_extras = [
                dataset.extra_samples[int(sample_idx)]
                for sample_idx in sample_indices.tolist()
            ]

            conversion_focus = torch.tensor(
                [float(extra["conversion_focus"].item()) for extra in batch_extras],
                dtype=torch.float32,
                device=device,
            )
            adaptive_weight = torch.tensor(
                [float(extra.get("adaptive_weight", 1.0) or 1.0) for extra in batch_extras],
                dtype=torch.float32,
                device=device,
            )
            policy_only_mask = torch.tensor(
                [1.0 if bool(extra.get("policy_only", False)) else 0.0 for extra in batch_extras],
                dtype=torch.float32,
                device=device,
            )
            value_weight_mask = torch.where(
                policy_only_mask > 0,
                torch.zeros(x.size(0), dtype=torch.float32, device=device),
                torch.ones(x.size(0), dtype=torch.float32, device=device),
            )

            logits, pred_value = model(x)
            pred_value = pred_value.squeeze(1)

            masked_logits = logits.masked_fill(
                legal_mask == 0,
                -1e9,
            )

            y_policy_soft = y_policy_soft * legal_mask
            target_sum = y_policy_soft.sum(dim=1, keepdim=True)

            fallback = F.one_hot(
                y_policy,
                num_classes=masked_logits.size(1),
            ).float()

            fallback = fallback.to(device)
            fallback = fallback * legal_mask

            fallback_sum = fallback.sum(dim=1, keepdim=True)

            fallback = torch.where(
                fallback_sum > 0,
                fallback / fallback_sum.clamp_min(1e-8),
                F.one_hot(
                    y_policy,
                    num_classes=masked_logits.size(1),
                ).float().to(device),
            )

            y_policy_soft = torch.where(
                target_sum > 0,
                y_policy_soft / target_sum.clamp_min(1e-8),
                fallback,
            )

            loss_policy = soft_cross_entropy(
                masked_logits,
                y_policy_soft,
                reduction="none",
            )

            raw_value_loss = F.mse_loss(
                pred_value,
                y_value,
                reduction="none",
            )

            sample_weight = torch.where(
                conversion_focus == 1,
                torch.full_like(raw_value_loss, args.conversion_focus_weight),
                torch.ones_like(raw_value_loss),
            )
            sample_weight = sample_weight * aaa_confidence
            sample_weight = sample_weight * adaptive_weight

            loss_policy = (sample_weight * loss_policy).mean()

            value_denom = value_weight_mask.sum().clamp_min(1.0)
            loss_value = (raw_value_loss * value_weight_mask).sum() / value_denom
            loss = loss_policy + args.value_weight * loss_value

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            total_policy += loss_policy.item()
            total_value += loss_value.item()
            epoch_policy_only_samples += int((value_weight_mask == 0).sum().item())
            epoch_value_supervised_samples += int((value_weight_mask > 0).sum().item())
            epoch_conversion_focus_samples += int((conversion_focus > 0).sum().item())

        num_batches = max(len(loader), 1)

        epoch_loss = total_loss / num_batches
        epoch_policy = total_policy / num_batches
        epoch_value = total_value / num_batches

        print(
            f"epoch={epoch} "
            f"total_loss={epoch_loss:.4f} "
            f"policy_loss={epoch_policy:.4f} "
            f"value_loss={epoch_value:.4f} "
            f"value_weight={args.value_weight} "
            f"policy_only_samples={epoch_policy_only_samples} "
            f"value_supervised_samples={epoch_value_supervised_samples} "
            f"conversion_focus_samples={epoch_conversion_focus_samples}"
        )

        with open(epoch_log_path, "a", encoding="utf-8") as f:
            f.write(
                f"{epoch},"
                f"{epoch_loss},"
                f"{epoch_policy},"
                f"{epoch_value},"
                f"{epoch_policy_only_samples},"
                f"{epoch_value_supervised_samples},"
                f"{epoch_conversion_focus_samples}\n"
            )

        torch.save(model.state_dict(), latest_path)

        if epoch_loss < best_loss:
            best_loss = epoch_loss
            torch.save(model.state_dict(), best_path)
            print(
                f"[COUVEUSE] New BEST model saved "
                f"(loss={best_loss:.4f})"
            )

        torch.save(
            model.state_dict(),
            os.path.join(
                run_dir,
                f"epoch_{epoch:03d}.pt",
            ),
        )

    manifest = build_manifest(
        run_id=run_id,
        run_dir=run_dir,
        args=args,
        seed=seed,
        dataset_info=dataset_info,
        loaded_dataset_info=loaded_dataset_info,
        dataset_admission=dataset_admission,
        requested_tag=requested_tag,
        effective_tag_value=effective_tag_value,
        strict_dataset_admission=strict_dataset_admission,
        device=device,
        dataset=dataset,
        shuffle_enabled=shuffle_enabled,
        sampler_name=sampler_name,
        split_name=split_name,
        best_loss=best_loss,
        best_path=best_path,
        latest_path=latest_path,
        training_status="completed",
    )

    with open(
        os.path.join(run_dir, "manifest.json"),
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(manifest, f, indent=4)

    with open(
        registry_path,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(manifest, f, indent=4)

    print(f"[COUVEUSE] Run saved in {run_dir}")


if __name__ == "__main__":
    main()
