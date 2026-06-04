# CHARTER IMP-045 — LoRA training Devstral sur 57 exemples golden

**Lane:** HUMAN_REQUIRED
**Fichiers autorises:**
  - ml/lora_train_devstral.py  (créé)
  - ml/lora_config.yaml        (lecture)
  - lab/datasets/ux_finetune_golden_20260603.jsonl  (lecture)

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED
- HumanGate a approuvé ce charter explicitement.

## OBJECTIF

1. Installer les dépendances LoRA :
   `.venv312\Scripts\pip.exe install peft transformers accelerate --quiet`

2. Créer ml/lora_train_devstral.py avec :
   - Lecture de ml/lora_config.yaml
   - Chargement du dataset lab/datasets/ux_finetune_golden_20260603.jsonl
   - Config LoRA : rank=8, alpha=16, dropout=0.05, target_modules=[q_proj, v_proj]
   - Dry-run MODE par défaut : charge config + dataset + vérifie format
     sans charger le modèle (évite OOM si VRAM insuffisante)
   - Flag --train pour lancement réel (HumanGate explicite)
   - Rapport : nb exemples chargés, format validé, VRAM estimée requise

3. Lancer le dry-run de validation :
   `.venv312\Scripts\python.exe ml/lora_train_devstral.py --dry-run`

4. Reporter :
   - peft installé : oui/non
   - Exemples chargés : N
   - Format valide : oui/non
   - VRAM estimée pour training réel : X GB
   - Commande pour lancer le vrai training : ...

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile ml/lora_train_devstral.py
.\.venv312\Scripts\python.exe ml/lora_train_devstral.py --dry-run
```

## RAPPORT FINAL

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED

peft_installed:    oui (peft 0.19.1, transformers 5.10.1, accelerate 1.13.0)
exemples_charges:  38 (lab/datasets/ux_finetune_golden_20260603.jsonl)
format_valide:     oui (input + output_ideal présents, claim_verdict OK sur tous)
categories:        {'charter_generation': 38}
vram_requise:      17.1 GB (fp16) ou 6.6 GB (4-bit bitsandbytes)
modele_base:       devstral-small-2507 (local, chemin à fournir)

commande_training:
  python ml/lora_train_devstral.py --train --model-path <chemin_local_devstral>
