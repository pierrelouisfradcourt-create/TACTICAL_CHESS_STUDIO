import random
import math
from typing import Dict, Any, List, Optional

from entities import (
    Snake, Orb, Enemy, Arena, Vec2,
    SnakeState, OrbType, EnemyClass, AbilityType, Ability,
)
from physics import (
    check_orb_collision, check_enemy_collision,
    check_self_collision, check_wall_collision,
    steer_toward, random_direction, distance,
)


ABILITY_COOLDOWNS: Dict[AbilityType, float] = {
    AbilityType.DASH:   3.0,
    AbilityType.SHIELD: 5.0,
    AbilityType.MAGNET: 4.0,
    AbilityType.GHOST:  6.0,
}


class RuleEngine:
    def __init__(self, config: Dict[str, Any]):
        entity_map = {e["id"]: e["attributes"] for e in config["entities"]}
        self.snake_cfg  = entity_map.get("player_snake", {})
        self.orb_cfg    = entity_map.get("orb", {})
        self.enemy_cfg  = entity_map.get("enemy", {})
        self.arena_cfg  = entity_map.get("arena", {})
        self.economy    = config.get("economy", {})
        self.spawn_cfg  = config.get("spawn", {})

        self.vel_threshold  = self.snake_cfg.get("velocity_penalty_threshold", 10)
        self.vel_factor     = self.snake_cfg.get("velocity_growth_penalty", 0.92)
        self.vel_floor      = self.snake_cfg.get("velocity_floor_factor", 0.4)
        self.stun_dur       = self.snake_cfg.get("stun_duration", 0.3)
        self.absorption_dur = 0.8

        self.score_per_orb  = self.economy.get("score_per_orb", 10)
        self.score_per_abs  = self.economy.get("score_per_absorption", 50)
        self.score_per_sec  = self.economy.get("score_per_second", 2)
        self.xp_per_orb     = self.economy.get("xp_per_orb", 5)

        self.ability_drop_pool: List[AbilityType] = [
            AbilityType[a] for a in self.enemy_cfg.get("ability_drops", ["DASH", "SHIELD", "MAGNET", "GHOST"])
        ]

    # ── Movement ────────────────────────────────────────────────────────────

    def compute_velocity(self, snake: Snake) -> float:
        base   = self.snake_cfg.get("base_velocity", 120.0)
        excess = max(0, snake.length() - self.vel_threshold)
        steps  = excess // 10
        vel    = base * (self.vel_factor ** steps)
        return max(vel, base * self.vel_floor)

    def apply_movement(self, snake: Snake, dt: float, boost_active: bool) -> None:
        if snake.state == SnakeState.DEAD:
            return

        if snake.state == SnakeState.STUNNED:
            snake.stun_timer -= dt
            if snake.stun_timer <= 0.0:
                snake.state = SnakeState.ALIVE
            return

        if snake.state == SnakeState.ABSORBING:
            snake.absorb_timer -= dt
            if snake.absorb_timer <= 0.0:
                snake.state = SnakeState.ALIVE
            return

        vel = self.compute_velocity(snake)

        if boost_active and snake.boost_charge > 0.0:
            vel *= self.snake_cfg.get("boost_multiplier", 1.8)
            drain = self.snake_cfg.get("boost_drain_rate", 0.3)
            snake.boost_charge = max(0.0, snake.boost_charge - drain * dt)
            snake.state = SnakeState.BOOSTING
        else:
            if snake.state == SnakeState.BOOSTING:
                snake.state = SnakeState.ALIVE

        snake.velocity = vel
        new_head = Vec2(
            snake.head().x + snake.direction.x * vel * dt,
            snake.head().y + snake.direction.y * vel * dt,
        )
        snake.segments.appendleft(new_head)
        snake.segments.pop()

    # ── Orbs ────────────────────────────────────────────────────────────────

    def apply_orb_rules(self, snake: Snake, orbs: List[Orb]) -> List[Orb]:
        if snake.state == SnakeState.DEAD:
            return []
        collected: List[Orb] = []
        for orb in orbs:
            if not orb.active:
                continue
            if check_orb_collision(snake, orb):
                orb.active = False
                collected.append(orb)
                if orb.orb_type == OrbType.XP:
                    snake.score += self.score_per_orb
                    snake.xp    += self.xp_per_orb
                    snake.segments.append(snake.segments[-1].copy())
                else:
                    gain = self.orb_cfg.get("energy_value", 0.25)
                    snake.boost_charge = min(1.0, snake.boost_charge + gain)
        return collected

    # ── Enemy interactions ───────────────────────────────────────────────────

    def apply_enemy_rules(self, snake: Snake, enemies: List[Enemy]) -> List[Enemy]:
        if snake.state in (SnakeState.DEAD, SnakeState.STUNNED, SnakeState.ABSORBING):
            return []
        absorbed: List[Enemy] = []
        for enemy in enemies:
            if not enemy.active:
                continue
            if not check_enemy_collision(snake, enemy):
                continue
            slot = snake.free_ability_slot()
            if slot is not None:
                ab_type = enemy.ability_drop or random.choice(self.ability_drop_pool)
                snake.abilities[slot] = Ability(
                    ability_type=ab_type,
                    cooldown_max=ABILITY_COOLDOWNS.get(ab_type, 4.0),
                )
                snake.score += self.score_per_abs
                enemy.active = False
                snake.state  = SnakeState.ABSORBING
                snake.absorb_timer = self.absorption_dur
                absorbed.append(enemy)
                break
            else:
                snake.state      = SnakeState.STUNNED
                snake.stun_timer = self.stun_dur
                break
        return absorbed

    # ── Death ────────────────────────────────────────────────────────────────

    def apply_death_rules(self, snake: Snake, arena: Arena) -> Optional[str]:
        if snake.state == SnakeState.DEAD:
            return "already_dead"
        if check_self_collision(snake):
            snake.state = SnakeState.DEAD
            return "self_collision"
        if check_wall_collision(snake, arena):
            snake.state = SnakeState.DEAD
            return "wall"
        return None

    # ── Arena ────────────────────────────────────────────────────────────────

    def apply_arena_shrink(self, arena: Arena, session_time: float, dt: float) -> None:
        if session_time >= arena.shrink_start:
            arena.shrink(dt)

    # ── Enemy AI ─────────────────────────────────────────────────────────────

    def apply_enemy_ai(self, enemy: Enemy, snake: Snake, arena: Arena, dt: float) -> None:
        enemy.ai_timer -= dt
        if enemy.ai_timer <= 0.0:
            enemy.ai_timer = enemy.ai_change_interval
            if enemy.enemy_class == EnemyClass.PATROL:
                enemy.direction = random_direction()
            elif enemy.enemy_class in (EnemyClass.CHASER, EnemyClass.SHOOTER):
                enemy.direction = steer_toward(enemy.pos, snake.head())

        new_pos = Vec2(
            enemy.pos.x + enemy.direction.x * enemy.velocity * dt,
            enemy.pos.y + enemy.direction.y * enemy.velocity * dt,
        )

        if not arena.contains(new_pos):
            enemy.direction = steer_toward(enemy.pos, arena.center())
            new_pos = Vec2(
                enemy.pos.x + enemy.direction.x * enemy.velocity * dt,
                enemy.pos.y + enemy.direction.y * enemy.velocity * dt,
            )

        enemy.pos = new_pos

    # ── Score tick ───────────────────────────────────────────────────────────

    def apply_score_tick(self, snake: Snake, dt: float) -> None:
        if snake.state != SnakeState.DEAD:
            snake.score += int(self.score_per_sec * dt)
