# training_runs/

Sorties d'entraînement du réseau neuronal (lane IA_APPRENTISSAGE). Chaque run
d'entraînement écrit dans son propre sous-dossier — rien n'est partagé entre runs.

## Structure attendue

```
training_runs/
├── README.md                  # ce fichier
├── baseline/
│   └── dataset_sha.txt        # SHA256 du dataset de référence (pool_selfplay.jsonl)
└── run_<YYYYMMDD_HHMMSS>/      # un sous-dossier par run, nommé par horodatage
    ├── manifest.json          # hyperparamètres + résumé (dataset, lr, best_loss, ...)
    ├── metrics.jsonl          # une ligne JSON par epoch (loss, best_loss, ts, ...)
    ├── train.log              # log texte du run
    ├── model.pt / best.pt     # checkpoints
    └── epoch_NNN.pt           # checkpoint par epoch
```

### Convention de nommage des runs

`run_<YYYYMMDD_HHMMSS>` — horodatage local du début du run. Garantit l'unicité et
le tri chronologique sans collision.

### metrics.jsonl

Append-only, une ligne JSON par epoch. Schéma minimal :

```json
{"epoch": 1, "loss": 4.02, "best_loss": 4.02, "best_epoch": 1, "epoch_seconds": 0.8, "ts": "2026-06-26T18:21:36.350358"}
```

C'est le fichier que le pipeline d'entraînement (cf. IMP-057) écrit incrémentalement
dans `training_runs/<run_id>/metrics.jsonl`. Le répertoire `<run_id>/` doit exister
avant la première écriture.

### manifest.json

Écrit en fin de run. Contient les hyperparamètres, le chemin du dataset, le
`vocab_fingerprint`, et le résumé (`best_loss`, `best_epoch`, `loss_per_epoch`,
`total_seconds`).

## baseline/dataset_sha.txt

SHA256 du dataset de référence `lab/datasets/pool_selfplay.jsonl`. Sert d'ancre :
permet de vérifier qu'un run a été entraîné sur le dataset baseline attendu, et de
détecter toute dérive/corruption du pool. Format : `<sha256>  <chemin relatif repo>`.

Régénération :

```bash
sha256sum lab/datasets/pool_selfplay.jsonl
```
