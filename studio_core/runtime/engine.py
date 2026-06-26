import random
import math
from collections import deque
from typing import Dict, Any, Optional, List

from entities import (
    Snake, Orb, Enemy, Arena, Vec2,
    SnakeState, OrbType, EnemyClass, AbilityType,
)
from rules import RuleEngine


class GameSession:
    def __init__(self, config: Dict[str, Any]):
        self.config           = config
        self.meta             = config["meta"]
        self.session_duration = float(self.meta["session_duration"])
        self.session_time:    float = 0.0
        self.game_over:       bool  = False
        self.outcome:         str   = ""
        self.death_cause:     Optional[str] = None

        entity_map        = {e["id"]: e["attributes"] for e in config["entities"]}
        self.snake_cfg    = entity_map["player_snake"]
        self.orb_cfg      = entity_map["orb"]
        self.enemy_cfg    = entity_map["enemy"]
        spawn             = config["spawn"]

        self.arena = Arena(
            width        = float(self.meta["arena_width"]),
            height       = float(self.meta["arena_height"]),
            shrink_start = float(self.meta.get("arena_shrink_start", 90.0)),
            shrink_rate  = float(self.meta.get("arena_shrink_rate",  0.5)),
        )

        self.rule_engine = RuleEngine(config)
        self.snake       = self._init_snake()
        self.orbs:    List[Orb]   = []
        self.enemies: List[Enemy] = []

        self.orb_spawn_timer:    float = 0.0
        self.enemy_spawn_timer:  float = 0.0
        self.orb_spawn_interval   = float(spawn["orb_spawn_interval"])
        self.enemy_spawn_interval = float(spawn["enemy_spawn_interval"])
        self.max_orbs             = int(spawn["max_orbs"])
        self.max_enemies          = int(spawn["max_enemies"])
        self.enemy_wave:  int     = 0

        for _ in range(int(spawn.get("initial_orbs", 8))):
            self.orbs.append(self._spawn_orb())
        for _ in range(int(spawn.get("initial_enemies", 2))):
            self.enemies.append(self._spawn_enemy())

    # ── Init ─────────────────────────────────────────────────────────────────

    def _init_snake(self) -> Snake:
        cx       = self.meta["arena_width"]  / 2.0
        cy       = self.meta["arena_height"] / 2.0
        seg_size = float(self.snake_cfg["segment_size"])
        n_segs   = int(self.snake_cfg["initial_segments"])
        segments: deque = deque()
        for i in range(n_segs):
            segments.append(Vec2(cx - i * seg_size, cy))
        return Snake(
            segments         = segments,
            direction        = Vec2(1.0, 0.0),
            base_velocity    = float(self.snake_cfg["base_velocity"]),
            velocity         = float(self.snake_cfg["base_velocity"]),
            segment_size     = seg_size,
            collision_radius = float(self.snake_cfg["collision_radius"]),
        )

    def _spawn_orb(self) -> Orb:
        x0, y0, x1, y1 = self.arena.bounds()
        pad = 30.0
        pos = Vec2(
            random.uniform(x0 + pad, x1 - pad),
            random.uniform(y0 + pad, y1 - pad),
        )
        xp_w     = float(self.orb_cfg.get("xp_weight", 0.75))
        orb_type = OrbType.XP if random.random() < xp_w else OrbType.ENERGY
        value    = (float(self.orb_cfg["xp_value"]) if orb_type == OrbType.XP
                    else float(self.orb_cfg["energy_value"]))
        return Orb(pos=pos, orb_type=orb_type, value=value,
                   radius=float(self.orb_cfg["radius"]))

    def _spawn_enemy(self) -> Enemy:
        x0, y0, x1, y1 = self.arena.bounds()
        side = random.randint(0, 3)
        if side == 0:
            pos = Vec2(random.uniform(x0, x1), y0 + 5.0)
        elif side == 1:
            pos = Vec2(random.uniform(x0, x1), y1 - 5.0)
        elif side == 2:
            pos = Vec2(x0 + 5.0, random.uniform(y0, y1))
        else:
            pos = Vec2(x1 - 5.0, random.uniform(y0, y1))

        wave_scale = self.enemy_cfg.get("velocity_scale_per_wave", 1.1) ** self.enemy_wave
        velocity   = float(self.enemy_cfg["base_velocity"]) * wave_scale
        chaser_t   = float(self.enemy_cfg.get("chaser_threshold_time", 60))

        if self.session_time > chaser_t:
            enemy_class = random.choice([EnemyClass.PATROL, EnemyClass.CHASER, EnemyClass.CHASER])
        else:
            enemy_class = EnemyClass.PATROL

        drops      = self.rule_engine.ability_drop_pool
        ab_drop    = random.choice(drops)
        angle      = random.uniform(0.0, 2.0 * math.pi)

        enemy = Enemy(
            pos              = pos,
            enemy_class      = enemy_class,
            direction        = Vec2(math.cos(angle), math.sin(angle)),
            velocity         = velocity,
            collision_radius = float(self.enemy_cfg["collision_radius"]),
            ability_drop     = ab_drop,
        )
        return enemy

    # ── Tick ─────────────────────────────────────────────────────────────────

    def tick(self, dt: float, input_state: Dict[str, Any]) -> Dict[str, Any]:
        if self.game_over:
            return self._build_state()

        self.session_time += dt

        direction = input_state.get("direction")
        if direction is not None:
            new_dir = direction.normalized()
            dot = new_dir.x * self.snake.direction.x + new_dir.y * self.snake.direction.y
            if dot >= 0:
                self.snake.direction = new_dir

        boost_active = bool(input_state.get("boost", False))

        self.rule_engine.apply_movement(self.snake, dt, boost_active)
        self.rule_engine.apply_score_tick(self.snake, dt)
        self.rule_engine.apply_orb_rules(self.snake, self.orbs)

        self.orbs = [o for o in self.orbs if o.active]

        for enemy in self.enemies:
            if enemy.active:
                self.rule_engine.apply_enemy_ai(enemy, self.snake, self.arena, dt)

        self.rule_engine.apply_enemy_rules(self.snake, self.enemies)
        self.enemies = [e for e in self.enemies if e.active]

        cause = self.rule_engine.apply_death_rules(self.snake, self.arena)
        if cause and cause != "already_dead":
            self.game_over  = True
            self.outcome    = "death"
            self.death_cause = cause
            return self._build_state()

        if self.session_time >= self.session_duration:
            self.game_over = True
            self.outcome   = "timeout"
            return self._build_state()

        self.rule_engine.apply_arena_shrink(self.arena, self.session_time, dt)

        self.orb_spawn_timer += dt
        active_orbs = sum(1 for o in self.orbs if o.active)
        if self.orb_spawn_timer >= self.orb_spawn_interval and active_orbs < self.max_orbs:
            self.orbs.append(self._spawn_orb())
            self.orb_spawn_timer = 0.0

        self.enemy_spawn_timer += dt
        active_enemies = sum(1 for e in self.enemies if e.active)
        if self.enemy_spawn_timer >= self.enemy_spawn_interval and active_enemies < self.max_enemies:
            self.enemies.append(self._spawn_enemy())
            self.enemy_spawn_timer = 0.0
            if self.session_time > 60.0:
                self.enemy_wave += 1

        return self._build_state()

    # ── State export ─────────────────────────────────────────────────────────

    def _build_state(self) -> Dict[str, Any]:
        return {
            "session_time":  self.session_time,
            "score":         self.snake.score,
            "snake_length":  self.snake.length(),
            "boost_charge":  self.snake.boost_charge,
            "snake_state":   self.snake.state.value,
            "abilities":     [ab.ability_type.value if ab else None for ab in self.snake.abilities],
            "orb_count":     sum(1 for o in self.orbs if o.active),
            "enemy_count":   sum(1 for e in self.enemies if e.active),
            "game_over":     self.game_over,
            "outcome":       self.outcome,
            "death_cause":   self.death_cause,
            "arena_bounds":  self.arena.bounds(),
        }

    def is_over(self) -> bool:
        return self.game_over

    def get_score(self) -> int:
        return self.snake.score
