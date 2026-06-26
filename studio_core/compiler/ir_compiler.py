import json
import os
import sys
from typing import Dict, Any

# Ensure runtime is importable when this module is loaded standalone
_runtime = os.path.join(os.path.dirname(__file__), "..", "runtime")
if _runtime not in sys.path:
    sys.path.insert(0, os.path.abspath(_runtime))

from engine import GameSession  # noqa: E402


REQUIRED_TOP_KEYS = {"meta", "entities", "rules", "spawn", "economy"}
REQUIRED_ENTITIES = {"player_snake", "enemy", "orb", "arena"}
REQUIRED_META     = {"name", "version", "session_duration", "arena_width", "arena_height"}


class IRValidationError(ValueError):
    pass


class CompiledGame:
    def __init__(self, config: Dict[str, Any]):
        self.config  = config
        self.meta    = config["meta"]
        self.name    = self.meta["name"]
        self.version = self.meta["version"]

    def new_session(self) -> GameSession:
        return GameSession(self.config)

    def describe(self) -> str:
        m = self.meta
        entity_ids = [e["id"] for e in self.config["entities"]]
        rule_ids   = [r["rule"] for r in self.config["rules"]]
        lines = [
            f"{'='*56}",
            f"  {self.name}  v{self.version}",
            f"{'='*56}",
            f"  Session cap   : {m['session_duration']}s",
            f"  Arena         : {m['arena_width']} × {m['arena_height']}  "
            f"(shrink @{m.get('arena_shrink_start', 90)}s)",
            f"  Entities ({len(entity_ids)}) : {entity_ids}",
            f"  Rules    ({len(rule_ids)}) : {rule_ids}",
            f"  Max orbs      : {self.config['spawn']['max_orbs']}",
            f"  Max enemies   : {self.config['spawn']['max_enemies']}",
            f"  Score/orb     : {self.config['economy']['score_per_orb']}",
            f"  Score/absorb  : {self.config['economy']['score_per_absorption']}",
            f"{'='*56}",
        ]
        return "\n".join(lines)


class IRCompiler:
    def __init__(self, ir_path: str):
        self.ir_path  = ir_path
        self._raw: Dict[str, Any] = {}

    def load(self) -> "IRCompiler":
        with open(self.ir_path, "r", encoding="utf-8") as fh:
            self._raw = json.load(fh)
        self._validate()
        return self

    def compile(self) -> CompiledGame:
        return CompiledGame(self._raw)

    # ── Validation ────────────────────────────────────────────────────────────

    def _validate(self) -> None:
        missing_keys = REQUIRED_TOP_KEYS - set(self._raw.keys())
        if missing_keys:
            raise IRValidationError(f"IR missing top-level keys: {missing_keys}")

        missing_meta = REQUIRED_META - set(self._raw["meta"].keys())
        if missing_meta:
            raise IRValidationError(f"IR meta missing fields: {missing_meta}")

        entity_ids = {e["id"] for e in self._raw["entities"]}
        missing_entities = REQUIRED_ENTITIES - entity_ids
        if missing_entities:
            raise IRValidationError(f"IR missing required entities: {missing_entities}")

        for entity in self._raw["entities"]:
            if "attributes" not in entity:
                raise IRValidationError(f"Entity '{entity.get('id')}' has no 'attributes' block")

        if not self._raw["rules"]:
            raise IRValidationError("IR has an empty rules list")

        for rule in self._raw["rules"]:
            for field in ("rule", "condition", "effect"):
                if field not in rule:
                    raise IRValidationError(f"Rule missing field '{field}': {rule}")
