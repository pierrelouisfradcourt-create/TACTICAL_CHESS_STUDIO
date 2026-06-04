"""
lora_train_devstral.py — LoRA fine-tuning de Devstral-small sur golden examples

Usage:
    python ml/lora_train_devstral.py --dry-run                    # valide config + dataset
    python ml/lora_train_devstral.py --train --model-path <path>  # lancement réel

Fichiers lus:
    ml/lora_config.yaml
    lab/datasets/ux_finetune_golden_20260603.jsonl

Fichiers produits (--train uniquement):
    lab/runs/lora_devstral_tcs_v1/  (adaptateur LoRA)

claim_verdict: NO_CLAIM_ALLOWED
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
from typing import Any, Dict, List

import yaml

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
CONFIG_PATH = REPO_ROOT / "ml" / "lora_config.yaml"
DATASET_PATH = REPO_ROOT / "lab" / "datasets" / "ux_finetune_golden_20260603.jsonl"
DEFAULT_OUTPUT = REPO_ROOT / "lab" / "runs" / "lora_devstral_tcs_v1"

# Devstral-small ≈ 7B params — constantes pour estimation VRAM
DEVSTRAL_PARAMS = 7_000_000_000
BYTES_PER_PARAM_FP16 = 2
BYTES_PER_PARAM_4BIT = 0.5


# ---------------------------------------------------------------------------
# Config + dataset helpers
# ---------------------------------------------------------------------------

def load_config(path: pathlib.Path) -> Dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_dataset(path: pathlib.Path) -> List[Dict[str, Any]]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for lineno, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                print(f"[WARN] ligne {lineno} invalide : {exc}")
    return rows


def validate_rows(rows: List[Dict[str, Any]], input_key: str, output_key: str) -> List[str]:
    errors = []
    for i, row in enumerate(rows):
        if input_key not in row:
            errors.append(f"  ligne {i+1} : champ '{input_key}' manquant")
        if output_key not in row:
            errors.append(f"  ligne {i+1} : champ '{output_key}' manquant")
        if row.get("claim_verdict", "NO_CLAIM_ALLOWED") != "NO_CLAIM_ALLOWED":
            errors.append(f"  ligne {i+1} : claim_verdict invalide ({row.get('claim_verdict')})")
    return errors


def estimate_vram(fp16: bool = True, quantized_4bit: bool = False) -> Dict[str, float]:
    bytes_per_param = BYTES_PER_PARAM_4BIT if quantized_4bit else BYTES_PER_PARAM_FP16
    base_gb = DEVSTRAL_PARAMS * bytes_per_param / 1e9
    # LoRA adapters rank=8 sur q_proj+v_proj (32 layers, hidden=4096): négligeable
    lora_gb = 0.1
    # Optimizer states AdamW sur params trainables (rank=8, ~4M params): 2 états × fp32
    opt_gb = 4_000_000 * 4 * 2 / 1e9
    # Activations avec gradient_checkpointing (batch=4, seq=2048): ≈ 2-4 GB
    act_gb = 3.0 if fp16 else 2.0
    total_gb = base_gb + lora_gb + opt_gb + act_gb
    return {
        "base_gb": round(base_gb, 1),
        "lora_gb": round(lora_gb, 2),
        "optimizer_gb": round(opt_gb, 2),
        "activations_gb": round(act_gb, 1),
        "total_estimated_gb": round(total_gb, 1),
    }


# ---------------------------------------------------------------------------
# Dry-run
# ---------------------------------------------------------------------------

def run_dry_run(cfg: Dict[str, Any]) -> int:
    fmt = cfg.get("data_format", {})
    input_key = fmt.get("input_key", "input")
    output_key = fmt.get("output_key", "output_ideal")

    print(f"[CONFIG] base_model        : {cfg['model']['base']}")
    print(f"[CONFIG] target_model      : {cfg['model']['target_model']}")
    print(f"[CONFIG] rank={cfg['model']['rank']} alpha={cfg['model']['alpha']} "
          f"dropout={cfg['model']['dropout']}")
    print(f"[CONFIG] target_modules    : {cfg['model']['target_modules']}")
    print(f"[CONFIG] epochs={cfg['training']['epochs']} "
          f"batch={cfg['training']['batch_size']} "
          f"lr={cfg['training']['learning_rate']}")
    print()

    print(f"[DATASET] path : {DATASET_PATH}")
    rows = load_dataset(DATASET_PATH)
    print(f"[DATASET] nb_exemples : {len(rows)}")

    errors = validate_rows(rows, input_key, output_key)
    if errors:
        print("[DATASET] ERREURS DE FORMAT :")
        for e in errors:
            print(e)
        return 1

    cats = {}
    for r in rows:
        c = r.get("categorie", "?")
        cats[c] = cats.get(c, 0) + 1
    print(f"[DATASET] format_valide : oui")
    print(f"[DATASET] categories    : {cats}")

    vram_fp16 = estimate_vram(fp16=True, quantized_4bit=False)
    vram_4bit = estimate_vram(fp16=True, quantized_4bit=True)
    print()
    print(f"[VRAM] fp16 (sans quantization)  : {vram_fp16['total_estimated_gb']} GB estimés")
    print(f"[VRAM]   dont base_model         : {vram_fp16['base_gb']} GB")
    print(f"[VRAM]   dont activations        : {vram_fp16['activations_gb']} GB (gradient_checkpointing)")
    print(f"[VRAM] 4-bit (bitsandbytes)      : {vram_4bit['total_estimated_gb']} GB estimés")
    print()
    print("[TRAIN] Commande pour lancer le training réel :")
    print(f"  python ml/lora_train_devstral.py --train --model-path <chemin_devstral>")
    print()
    print("[DRY-RUN] OK — aucun modèle chargé, aucune modification effectuée")
    return 0


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def run_training(cfg: Dict[str, Any], model_path: str, output_dir: pathlib.Path) -> int:
    try:
        import torch
        from peft import LoraConfig, TaskType, get_peft_model
        from transformers import (
            AutoModelForCausalLM,
            AutoTokenizer,
            DataCollatorForLanguageModeling,
            Trainer,
            TrainingArguments,
        )
        from datasets import Dataset
    except ImportError as exc:
        print(f"[ERROR] Dépendance manquante : {exc}")
        print("  pip install peft transformers accelerate datasets torch")
        return 1

    fmt = cfg.get("data_format", {})
    input_key = fmt.get("input_key", "input")
    output_key = fmt.get("output_key", "output_ideal")
    model_cfg = cfg["model"]
    train_cfg = cfg["training"]

    rows = load_dataset(DATASET_PATH)
    errors = validate_rows(rows, input_key, output_key)
    if errors:
        print("[ERROR] Dataset invalide — corriger avant training")
        for e in errors:
            print(e)
        return 1

    print(f"[TRAIN] Chargement tokenizer depuis {model_path}")
    tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    max_seq = train_cfg.get("max_seq_length", 2048)

    def format_and_tokenize(row: Dict[str, Any]) -> Dict[str, Any]:
        text = row[input_key] + "\n\n" + row[output_key] + tokenizer.eos_token
        enc = tokenizer(text, truncation=True, max_length=max_seq, padding="max_length")
        enc["labels"] = enc["input_ids"].copy()
        return enc

    hf_dataset = Dataset.from_list(rows)
    tokenized = hf_dataset.map(format_and_tokenize, remove_columns=hf_dataset.column_names)

    print(f"[TRAIN] Chargement modèle depuis {model_path} (fp16={train_cfg.get('fp16', True)})")
    model = AutoModelForCausalLM.from_pretrained(
        model_path,
        torch_dtype=torch.float16 if train_cfg.get("fp16") else torch.float32,
        trust_remote_code=True,
    )

    lora_cfg = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=model_cfg["rank"],
        lora_alpha=model_cfg["alpha"],
        lora_dropout=model_cfg["dropout"],
        target_modules=model_cfg["target_modules"],
        bias="none",
    )
    model = get_peft_model(model, lora_cfg)
    model.print_trainable_parameters()

    output_dir.mkdir(parents=True, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=train_cfg["epochs"],
        per_device_train_batch_size=train_cfg["batch_size"],
        learning_rate=train_cfg["learning_rate"],
        warmup_ratio=train_cfg.get("warmup_ratio", 0.03),
        gradient_checkpointing=train_cfg.get("gradient_checkpointing", True),
        fp16=train_cfg.get("fp16", True),
        logging_steps=5,
        save_strategy="epoch",
        report_to="none",
    )

    collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized,
        data_collator=collator,
    )

    print(f"[TRAIN] Démarrage training — {len(rows)} exemples, {train_cfg['epochs']} epochs")
    trainer.train()

    model.save_pretrained(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))
    print(f"[TRAIN] Adaptateur sauvegardé dans {output_dir}")
    return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="LoRA training Devstral — TCS IMP-045")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", default=True,
                      help="Valide config + dataset sans charger le modèle (défaut)")
    mode.add_argument("--train", action="store_true",
                      help="Lance le training réel (HumanGate requis)")
    parser.add_argument("--model-path", type=str, default="",
                        help="Chemin local vers devstral-small (requis avec --train)")
    parser.add_argument("--output-dir", type=str, default=str(DEFAULT_OUTPUT),
                        help="Dossier de sortie pour l'adaptateur LoRA")
    args = parser.parse_args()

    if not CONFIG_PATH.exists():
        print(f"[ERROR] Config non trouvée : {CONFIG_PATH}")
        sys.exit(1)
    if not DATASET_PATH.exists():
        print(f"[ERROR] Dataset non trouvé : {DATASET_PATH}")
        sys.exit(1)

    cfg = load_config(CONFIG_PATH)

    if args.train:
        if not args.model_path:
            print("[ERROR] --train requiert --model-path <chemin_devstral>")
            sys.exit(1)
        if not pathlib.Path(args.model_path).exists():
            print(f"[ERROR] model-path introuvable : {args.model_path}")
            sys.exit(1)
        rc = run_training(cfg, args.model_path, pathlib.Path(args.output_dir))
    else:
        rc = run_dry_run(cfg)

    sys.exit(rc)


if __name__ == "__main__":
    main()
