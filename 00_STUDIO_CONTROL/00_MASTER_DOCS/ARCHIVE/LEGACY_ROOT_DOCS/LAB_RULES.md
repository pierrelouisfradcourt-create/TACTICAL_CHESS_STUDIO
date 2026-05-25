# LAB RULES — Tactical Chess Studio

## Core Principle

This lab produces knowledge, not experiments.

---

## 1. No Experiment Without Baseline

Every experiment must be compared to:

baseline_v1_0

No baseline → result invalid.

---

## 2. One Variable Only

Each experiment changes exactly ONE element:

- dataset
- training config
- model architecture
- inference policy

Multiple changes → invalid experiment.

---

## 3. No Single-Run Conclusions

One run = observation.

Not a conclusion.

---

## 4. No Hidden Modifications

All experiments must declare:

- dataset used
- model used
- parameters
- seed (if applicable)

If not → result invalid.

---

## 5. Registry Is Truth

If it is not in:

lab_registry.json

It does not exist.

---

## 5b. External Shares Are Sources, Not Runtime Truth

Shared ChatGPT references may inform the lab docs.

They do not override:

- local code
- local registry
- local experiment outputs

Most recent external source refresh:

- ChatGPT - Verification de patch Rust
  https://chatgpt.com/share/69e3de83-5834-8386-970d-b0506db2e789

Supporting external sources:

- ChatGPT - Sortir du mode echec
  https://chatgpt.com/share/69e3ddd4-d75c-838e-9566-83f1973c8704
- ChatGPT - Prompt de reprise GPT
  https://chatgpt.com/share/69e3de02-9e50-838f-bebb-0e9a1504aa18
- ChatGPT - Point sur le projet
  https://chatgpt.com/share/69e3de31-29b0-838e-bf97-fc3a8a3268e5
- ChatGPT - Limite de message Codex
  https://chatgpt.com/share/69e3de40-ae60-838c-aa25-266074240fc2

---

## 5c. Active Marker Does Not Override Data Contract

`lab/ACTIVE_DATASET.txt` is a canonical pointer.

It is not automatic proof that the pointed artifact is trainable.

A dataset is only train-valid if it satisfies the active loader and training contract in source.

If pointer target and loader contract disagree:
- loader contract wins
- training claim is invalid
- documentation must describe the artifact as curation-only, staging-only, or incompatible until conversion exists

---

## 5d. Curation DB Is Not Training Data By Default

Pedagogy DB artifacts may be:
- candidate sources
- triage tables
- promoted curation packs

They are not ML training datasets by default.

No one may claim:
- “dataset active”
- “dataset trains”
- “dataset validated”
- “dataset benchmark-ready”

unless the pointed artifact matches the active train contract in source and runtime.

---

## 5e. Source-Proven Language Only

When documenting the lab:
- do not upgrade a curation artifact into a training artifact by narrative
- do not upgrade a pointer into compatibility proof
- do not upgrade a code path into validated runtime behavior unless the behavior has actually been exercised or directly proven from source

---

## 6. Baseline Is Read-Only

baseline_v1_0:

- never modified
- never overwritten
- only compared against

---

## 7. No Mixing Exploration and Validation

Do not:

- explore and validate at the same time

Exploration:
fast, many tests

Validation:
strict, controlled

---

## 8. Results Classification

Each experiment must end with:

- VALIDATED
- REJECTED
- UNCERTAIN

No ambiguity allowed.

---

## 9. No Silent Failure

If something breaks:

- log it
- classify it
- do not ignore it

---

## 10. Reproducibility First

A result without reproducibility:

is not knowledge.

---

## Final Rule

The goal is not to build a strong model.

The goal is to understand:

how strategy emerges from data.
