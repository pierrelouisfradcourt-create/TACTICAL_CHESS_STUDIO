import math
import random
from entities import Vec2, Snake, Orb, Enemy, Arena


def distance(a: Vec2, b: Vec2) -> float:
    return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)


def check_orb_collision(snake: Snake, orb: Orb) -> bool:
    if not orb.active:
        return False
    return distance(snake.head(), orb.pos) < (snake.collision_radius + orb.radius)


def check_enemy_collision(snake: Snake, enemy: Enemy) -> bool:
    if not enemy.active:
        return False
    return distance(snake.head(), enemy.pos) < (snake.collision_radius + enemy.collision_radius)


def check_self_collision(snake: Snake) -> bool:
    if snake.length() < 6:
        return False
    head = snake.head()
    threshold = snake.collision_radius * 0.85
    segs = list(snake.segments)
    for seg in segs[5:]:
        if distance(head, seg) < threshold:
            return True
    return False


def check_wall_collision(snake: Snake, arena: Arena) -> bool:
    return not arena.contains(snake.head())


def random_direction() -> Vec2:
    angle = random.uniform(0.0, 2.0 * math.pi)
    return Vec2(math.cos(angle), math.sin(angle))


def steer_toward(src: Vec2, target: Vec2) -> Vec2:
    diff = Vec2(target.x - src.x, target.y - src.y)
    return diff.normalized()


def clamp_to_arena(pos: Vec2, arena: Arena) -> Vec2:
    x0, y0, x1, y1 = arena.bounds()
    return Vec2(
        max(x0 + 1.0, min(x1 - 1.0, pos.x)),
        max(y0 + 1.0, min(y1 - 1.0, pos.y)),
    )
