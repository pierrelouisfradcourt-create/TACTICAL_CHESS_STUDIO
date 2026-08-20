import math
from dataclasses import dataclass, field
from collections import deque
from typing import Optional, List
from enum import Enum


@dataclass
class Vec2:
    x: float = 0.0
    y: float = 0.0

    def distance_to(self, other: "Vec2") -> float:
        return math.sqrt((self.x - other.x) ** 2 + (self.y - other.y) ** 2)

    def normalized(self) -> "Vec2":
        mag = math.sqrt(self.x ** 2 + self.y ** 2)
        if mag == 0.0:
            return Vec2(1.0, 0.0)
        return Vec2(self.x / mag, self.y / mag)

    def __add__(self, other: "Vec2") -> "Vec2":
        return Vec2(self.x + other.x, self.y + other.y)

    def __mul__(self, scalar: float) -> "Vec2":
        return Vec2(self.x * scalar, self.y * scalar)

    def copy(self) -> "Vec2":
        return Vec2(self.x, self.y)

    def rotate(self, angle_rad: float) -> "Vec2":
        c, s = math.cos(angle_rad), math.sin(angle_rad)
        return Vec2(self.x * c - self.y * s, self.x * s + self.y * c)


class SnakeState(Enum):
    ALIVE     = "alive"
    BOOSTING  = "boosting"
    ABSORBING = "absorbing"
    STUNNED   = "stunned"
    DEAD      = "dead"


class OrbType(Enum):
    XP     = "xp"
    ENERGY = "energy"


class EnemyClass(Enum):
    PATROL  = "PATROL"
    CHASER  = "CHASER"
    SHOOTER = "SHOOTER"


class AbilityType(Enum):
    DASH    = "DASH"
    SHIELD  = "SHIELD"
    MAGNET  = "MAGNET"
    GHOST   = "GHOST"


@dataclass
class Ability:
    ability_type:    AbilityType
    cooldown_max:    float
    cooldown_current: float = 0.0
    active:          bool  = False
    duration_current: float = 0.0
    duration_max:    float  = 3.0


@dataclass
class Snake:
    segments:         deque               = field(default_factory=deque)
    direction:        Vec2                = field(default_factory=lambda: Vec2(1.0, 0.0))
    base_velocity:    float               = 120.0
    velocity:         float               = 120.0
    state:            SnakeState          = SnakeState.ALIVE
    abilities:        List[Optional[Ability]] = field(default_factory=lambda: [None, None, None])
    boost_charge:     float               = 0.0
    stun_timer:       float               = 0.0
    absorb_timer:     float               = 0.0
    score:            int                 = 0
    xp:               int                 = 0
    segment_size:     float               = 8.0
    collision_radius: float               = 8.0

    def head(self) -> Vec2:
        return self.segments[0] if self.segments else Vec2(0.0, 0.0)

    def length(self) -> int:
        return len(self.segments)

    def free_ability_slot(self) -> Optional[int]:
        for i, ab in enumerate(self.abilities):
            if ab is None:
                return i
        return None

    def ability_count(self) -> int:
        return sum(1 for ab in self.abilities if ab is not None)


@dataclass
class Orb:
    pos:    Vec2
    orb_type: OrbType
    value:  float
    radius: float = 6.0
    active: bool  = True


@dataclass
class Enemy:
    pos:              Vec2
    enemy_class:      EnemyClass
    direction:        Vec2        = field(default_factory=lambda: Vec2(1.0, 0.0))
    velocity:         float       = 80.0
    collision_radius: float       = 10.0
    hp:               float       = 1.0
    active:           bool        = True
    ability_drop:     Optional[AbilityType] = None
    ai_timer:         float       = 0.0
    ai_change_interval: float     = 2.0


@dataclass
class Arena:
    width:    float = 800.0
    height:   float = 600.0
    shrink_start: float = 90.0
    shrink_rate:  float = 0.5
    margin_left:  float = 0.0
    margin_right: float = 0.0
    margin_top:   float = 0.0
    margin_bottom: float = 0.0

    def bounds(self):
        return (
            self.margin_left,
            self.margin_top,
            self.width  - self.margin_right,
            self.height - self.margin_bottom,
        )

    def contains(self, pos: Vec2) -> bool:
        x0, y0, x1, y1 = self.bounds()
        return x0 <= pos.x <= x1 and y0 <= pos.y <= y1

    def center(self) -> Vec2:
        x0, y0, x1, y1 = self.bounds()
        return Vec2((x0 + x1) / 2.0, (y0 + y1) / 2.0)

    def shrink(self, dt: float):
        amount = self.shrink_rate * dt
        self.margin_left   += amount
        self.margin_right  += amount
        self.margin_top    += amount
        self.margin_bottom += amount
