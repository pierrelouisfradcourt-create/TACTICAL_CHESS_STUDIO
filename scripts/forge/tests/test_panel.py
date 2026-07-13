"""Panel Prisme (Tier 2 #6, WFL-02 promu en mecanisme reel) — N lenses isoles +
recombinaison mecanique (merge_prisme.mjs, zero LLM-arbitre)."""
import json
from pathlib import Path

import pytest

from forge.panel import LENSES, lens_prompt, panel_prisme_executor

CHARTER = """objectif: >-
  Forger un jeu de test.

criteres_succes:
  - "SOLVABILITE PROUVEE : un bot gagne reellement."
  - "DETERMINISME : meme seed, meme resultat."
"""

_SNAPSHOT_TEMPLATE = """# Snapshot ({label})

## 1. CE QUE LE JOUEUR VOIT

Une raquette et une balle dans une aire de jeu bien delimitee et lisible partout.

## 2. CE QUE LE JOUEUR FAIT

Deplace la raquette au clavier pour intercepter la balle et progresser dans le niveau.

## 3. CE QUE LE JOUEUR RESSENT

Tension puis satisfaction a la victoire, frustration mesuree a la defaite du joueur.

## 4. RÈGLES OBSERVABLES

- **R1 — {label} couvre {tag}.**
"""


def _snapshot(label: str, tag: str) -> str:
    return _SNAPSHOT_TEMPLATE.format(label=label, tag=tag)


@pytest.fixture
def charter_path(tmp_path):
    p = tmp_path / "charter.yaml"
    p.write_text(CHARTER, encoding="utf-8")
    return p


def test_lens_prompt_construit_un_prompt_borne_a_un_seul_angle(charter_path):
    charter_text = charter_path.read_text(encoding="utf-8")
    prompt = lens_prompt("ceo", "CONTRAT DE BASE", charter_text)
    assert "CONTRAT DE BASE" in prompt
    assert "lens=ceo" in prompt
    assert "CEO" in prompt
    assert CHARTER.splitlines()[0] in prompt


def test_lens_prompt_lens_inconnu_leve():
    with pytest.raises(ValueError):
        lens_prompt("stagiaire", "x", "y")


def test_lenses_tuple_a_les_5_points_de_vue_wfl02():
    assert set(LENSES) == {"ceo", "game_designer", "front", "back", "joueur"}


def test_panel_controle_echoue_ok_false(tmp_path, charter_path):
    def claude_call(prompt, model):
        return None  # tout echoue
    executor = panel_prisme_executor(claude_call, charter_path, tmp_path)
    res = executor(_payload(), None, {})
    assert res["ok"] is False
    assert "contrôle" in res["reason"] or "controle" in res["reason"]


def test_panel_tous_les_lenses_echouent_ok_false(tmp_path, charter_path):
    def claude_call(prompt, model):
        return _snapshot("controle", "SOLVABILITE PROUVEE") if "lens=" not in prompt else None
    executor = panel_prisme_executor(claude_call, charter_path, tmp_path)
    res = executor(_payload(), None, {})
    assert res["ok"] is False
    assert "lens" in res["reason"]


def test_panel_run_reel_succes_produit_le_document_recombine(tmp_path, charter_path):
    def claude_call(prompt, model):
        if "lens=ceo" in prompt:
            return _snapshot("ceo", "solvabilite prouvee")
        if "lens=" in prompt:
            return _snapshot("autre-lens", "determinisme")
        return _snapshot("controle", "SOLVABILITE PROUVEE et DETERMINISME")
    executor = panel_prisme_executor(claude_call, charter_path, tmp_path, lenses=("ceo", "front"))
    res = executor(_payload(), None, {})
    assert res["ok"] is True, res
    assert res["blocked"] is False
    assert "RECOMBINÉE" in res["output"]
    # les fichiers intermediaires sont ecrits sur disque (evidence)
    assert (tmp_path / "prisme_control.md").exists()
    assert (tmp_path / "prisme_lens_ceo.md").exists()
    assert (tmp_path / "prisme_lens_front.md").exists()


def test_panel_lens_partiellement_echoue_continue_avec_le_reste(tmp_path, charter_path):
    def claude_call(prompt, model):
        if "lens=ceo" in prompt:
            return None  # ce lens echoue
        if "lens=" in prompt:
            return _snapshot("front", "solvabilite prouvee")
        return _snapshot("controle", "SOLVABILITE PROUVEE")
    executor = panel_prisme_executor(claude_call, charter_path, tmp_path, lenses=("ceo", "front"))
    res = executor(_payload(), None, {})
    assert res["ok"] is True
    assert not (tmp_path / "prisme_lens_ceo.md").exists()
    assert (tmp_path / "prisme_lens_front.md").exists()


def test_panel_lens_mal_forme_signale_par_check_prisme_mais_ne_bloque_pas_le_merge(tmp_path, charter_path):
    def claude_call(prompt, model):
        if "lens=" in prompt:
            return "# lens incomplet\n\nrien de conforme ici.\n"  # rate check_prisme
        return _snapshot("controle", "SOLVABILITE PROUVEE")
    executor = panel_prisme_executor(claude_call, charter_path, tmp_path, lenses=("ceo",))
    res = executor(_payload(), None, {})
    assert res["ok"] is True                 # le merge tourne quand meme (advisory)
    assert res["blocked"] is True             # mais le signal est remonte, jamais tu
    assert res["findings"]


class _Payload:
    prompt = "CONTRAT DE BASE (payload.prompt du contrat s1-prisme)"
    model = "claude-opus-4-8"
    etape = "s1-prisme"


def _payload():
    return _Payload()
