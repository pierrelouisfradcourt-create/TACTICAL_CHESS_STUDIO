"""IMP-184 — train.py écrit models/candidate.pt, jamais models/latest.pt.

Contrat protégé (verbatim charter) :
    "ml/train.py ecrit models/candidate.pt (jamais models/latest.pt
     directement). latest.pt n'est mis a jour que par learning_loop.sh
     apres bench ELO candidat > baseline."

Aligné sur scripts/learning_loop.sh (IMP-171) :
    - Stage 1 : `python ml/train.py` produit le checkpoint candidat
    - Stage 4 : `cp models/candidate.pt models/latest.pt` UNIQUEMENT si
      l'ELO du candidat bat la baseline.

Tests hermétiques : aucun entraînement réel, torch.save est monkeypatché
pour capturer le chemin ciblé.
"""

import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

import train  # noqa: E402


class _DummyModel:
    """Modèle minimal exposant state_dict() — pas de torch.nn requis."""

    def state_dict(self):
        return {"w": 0}


def test_candidate_checkpoint_path_targets_candidate(tmp_path):
    path = train.candidate_checkpoint_path(str(tmp_path))
    assert os.path.basename(path) == "candidate.pt"
    assert os.path.basename(path) != "latest.pt"


def test_save_candidate_writes_candidate_not_latest(tmp_path, monkeypatch):
    saved = {}

    def fake_save(state, path):
        saved["path"] = path
        # écrit réellement un fichier pour prouver la cible disque
        with open(path, "w", encoding="utf-8") as f:
            f.write("stub")

    monkeypatch.setattr(train.torch, "save", fake_save)

    model_dir = tmp_path / "models"
    returned = train.save_candidate_checkpoint(_DummyModel(), str(model_dir))

    # La cible est bien candidate.pt
    assert os.path.basename(saved["path"]) == "candidate.pt"
    assert os.path.basename(returned) == "candidate.pt"

    # candidate.pt existe, latest.pt n'a JAMAIS été créé par l'entraînement
    assert (model_dir / "candidate.pt").exists()
    assert not (model_dir / "latest.pt").exists()


def test_save_candidate_creates_model_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(
        train.torch,
        "save",
        lambda state, path: open(path, "w", encoding="utf-8").write("stub"),
    )
    model_dir = tmp_path / "nested" / "models"
    assert not model_dir.exists()
    train.save_candidate_checkpoint(_DummyModel(), str(model_dir))
    assert model_dir.is_dir()
    assert (model_dir / "candidate.pt").exists()


def test_train_module_never_writes_latest_directly():
    """Garde-fou statique : aucun torch.save vers latest.pt dans train.py."""
    src = Path(train.__file__).read_text(encoding="utf-8")
    # Le seul write de checkpoint vers le modèle déployé doit passer par
    # save_candidate_checkpoint ; aucune écriture directe de latest.pt.
    assert 'os.path.join(model_dir, "latest.pt")' not in src
    assert "torch.save(model.state_dict(), latest_path)" not in src
