#!/usr/bin/env python3
"""council.py — SCAFFOLD (non câblé, non exécutable) pour IMP-198.

ECG: Council Claude + Qwen2.5-14B + Gemini Flash, async PLAN -> CONSENSUS.
Désaccord -> HumanGate. Fallback si un modèle est indisponible.

⚠️ SQUELETTE DE PRÉPARATION UNIQUEMENT :
    - aucune inférence LLM réelle (corps = NotImplementedError / TODO) ;
    - aucune exécution (le __main__ refuse de tourner) ;
    - non câblé au reste du studio.
    À matérialiser sous gate Pierre (IMP-198, AUDIT_REQUIRED, blocked_by IMP-197, IMP-199).

Réutilise l'existant plutôt que de réinventer (cf docs/orchestration/skills_reuse_map.md) :
    - skill `council` (Gemini + Qwen14B déjà branchés sur LM Studio :1234) — à ÉTENDRE ;
    - skill `verdict`/`gate` pour la ratification ;
    - SOA router (IMP-199) pour décider s'il faut vraiment convoquer un council.

Doctrine : claim_verdict = NO_CLAIM_ALLOWED ; le council RECOMMANDE, il ne décide jamais
(seuls l'oracle non-LLM et Pierre décident). Désaccord non résolu -> HumanGate.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol


# ── Modèles du council (cible IMP-198) ────────────────────────────────────────

class ModelId(str, Enum):
    CLAUDE = "claude"            # via Claude Code / API locale du studio
    QWEN14B = "qwen2.5-14b"      # LM Studio local :1234 (modèle principal studio)
    GEMINI_FLASH = "gemini-flash"


class Stance(str, Enum):
    APPROUVE = "APPROUVE"
    BLOQUE = "BLOQUE"
    ESCALADE = "ESCALADE"        # -> HumanGate


@dataclass(frozen=True)
class CouncilTask:
    """Tâche soumise au council (typiquement un IMP AUDIT_REQUIRED)."""
    imp_id: str
    title: str
    lane: str
    charter: str
    context: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ModelOpinion:
    """Avis d'UN modèle. Schéma de sortie à valider (IMP-198 acceptance)."""
    model: ModelId
    stance: Stance
    rationale: str
    risks: list[str] = field(default_factory=list)
    available: bool = True       # False -> fallback (modèle indispo)


@dataclass(frozen=True)
class CouncilVerdict:
    """Synthèse. RECOMMANDATION uniquement — décision finale = oracle + Pierre."""
    task_id: str
    opinions: list[ModelOpinion]
    consensus: Stance
    requires_humangate: bool
    claim_verdict: str = "NO_CLAIM_ALLOWED"


# ── Adaptateur modèle (un par LLM) ────────────────────────────────────────────

class ModelAdapter(Protocol):
    """Contrat d'un backend LLM. Implémentations concrètes = IMP-198."""

    model_id: ModelId

    def is_available(self) -> bool:
        """Ping non bloquant (ex. LM Studio :1234 up ?). TODO IMP-198."""
        ...

    def opine(self, task: CouncilTask) -> ModelOpinion:
        """Produit un ModelOpinion schema-valide. TODO IMP-198 (inférence réelle)."""
        ...


# ── Orchestration (signatures seulement) ──────────────────────────────────────

async def run_council(
    task: CouncilTask,
    adapters: list[ModelAdapter],
    *,
    quorum: int = 2,
) -> CouncilVerdict:
    """PLAN -> CONSENSUS async sur N modèles.

    Étapes cibles (IMP-198) :
      1. filtrer les adapters disponibles (fallback si < quorum -> ESCALADE) ;
      2. lancer `opine` en parallèle (async) avec cap tokens/latence (cf caps doctrine) ;
      3. synthétiser via `synthesize` ;
      4. tout désaccord non résolu -> requires_humangate=True.

    NON IMPLÉMENTÉ — scaffold.
    """
    raise NotImplementedError("council scaffold — câblage IMP-198 sous gate Pierre")


def synthesize(task_id: str, opinions: list[ModelOpinion], quorum: int) -> CouncilVerdict:
    """Agrège les avis en un consensus.

    Règle cible (à valider IMP-198) :
      - >= quorum APPROUVE et 0 BLOQUE        -> consensus APPROUVE
      - >= 1 BLOQUE                            -> consensus BLOQUE
      - sinon / désaccord / quorum non atteint -> ESCALADE (HumanGate)

    NON IMPLÉMENTÉ — scaffold.
    """
    raise NotImplementedError("council scaffold — câblage IMP-198 sous gate Pierre")


def to_humangate_dossier(verdict: CouncilVerdict) -> dict[str, Any]:
    """Transforme un verdict ESCALADE en dossier pour le skill `gate` (DREAMS.md).

    NON IMPLÉMENTÉ — scaffold.
    """
    raise NotImplementedError("council scaffold — câblage IMP-198 sous gate Pierre")


# ── Garde-fou : ce scaffold ne s'exécute pas ──────────────────────────────────

if __name__ == "__main__":
    import sys
    print(
        "council.py est un SCAFFOLD non câblé (IMP-198, AUDIT_REQUIRED). "
        "Aucune exécution. Voir docs/orchestration/PHASES_1-5_PLAN.md.",
        file=sys.stderr,
    )
    raise SystemExit(2)
