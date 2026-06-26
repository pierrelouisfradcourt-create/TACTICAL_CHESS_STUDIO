"""
Snake Survivor Lite — Playable runtime.
Entry: run_game()   or   python snake_survivor_v1.py  (standalone)

Controls:
  Arrow keys / WASD  — steer
  SPACE / LSHIFT     — boost
  R                  — restart after game over
  Q / ESC            — quit
"""

import os
import sys
import json
import math

# Allow both standalone and imported execution
_here       = os.path.dirname(os.path.abspath(__file__))
_studio_core = os.path.dirname(_here)
for _p in (_studio_core, os.path.join(_studio_core, "runtime")):
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    import pygame
except ImportError:
    print("pygame is required.  Install: pip install pygame")
    sys.exit(1)

from runtime.engine   import GameSession
from runtime.entities import Vec2, SnakeState, OrbType, EnemyClass

# ── Constants ────────────────────────────────────────────────────────────────

WIN_W, WIN_H = 800, 650
HUD_H        = 50
FPS          = 60

C_BG           = (15,  15,  25)
C_GRID         = (20,  20,  35)
C_SNAKE_HEAD   = (80,  220, 120)
C_SNAKE_BODY   = (50,  160, 80)
C_SNAKE_BOOST  = (120, 255, 180)
C_SNAKE_STUN   = (220, 220, 50)
C_SNAKE_ABS    = (80,  180, 255)
C_ORB_XP       = (255, 220, 50)
C_ORB_ENERGY   = (100, 180, 255)
C_ENEMY_PATROL = (200, 70,  70)
C_ENEMY_CHASER = (255, 120, 50)
C_BORDER       = (70,  70,  110)
C_BORDER_SHRINK= (200, 60,  60)
C_HUD_TEXT     = (200, 200, 220)
C_WHITE        = (255, 255, 255)
C_DEAD         = (180, 50,  50)
C_WIN          = (80,  255, 140)

ABILITY_COLORS = {
    "DASH":   (100, 200, 255),
    "SHIELD": (80,  255, 150),
    "MAGNET": (220, 120, 255),
    "GHOST":  (180, 180, 180),
}


def _load_config() -> dict:
    ir_path = os.path.join(_studio_core, "ir", "example_snake_game.json")
    with open(ir_path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def run_game() -> None:
    pygame.init()
    screen = pygame.display.set_mode((WIN_W, WIN_H))
    pygame.display.set_caption("Snake Survivor Lite — S0 Studio")
    clock      = pygame.time.Clock()
    font_lg    = pygame.font.SysFont("monospace", 26, bold=True)
    font_md    = pygame.font.SysFont("monospace", 17)
    font_sm    = pygame.font.SysFont("monospace", 13)

    config  = _load_config()
    session = GameSession(config)
    direction = Vec2(1.0, 0.0)

    running = True
    while running:
        dt = clock.tick(FPS) / 1000.0
        dt = min(dt, 0.05)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key in (pygame.K_ESCAPE, pygame.K_q):
                    running = False
                if event.key == pygame.K_r and session.is_over():
                    session   = GameSession(config)
                    direction = Vec2(1.0, 0.0)

        if not session.is_over():
            keys = pygame.key.get_pressed()
            dx = dy = 0.0
            if keys[pygame.K_UP]    or keys[pygame.K_w]: dy = -1.0
            if keys[pygame.K_DOWN]  or keys[pygame.K_s]: dy =  1.0
            if keys[pygame.K_LEFT]  or keys[pygame.K_a]: dx = -1.0
            if keys[pygame.K_RIGHT] or keys[pygame.K_d]: dx =  1.0

            if dx != 0.0 or dy != 0.0:
                mag = math.sqrt(dx * dx + dy * dy)
                direction = Vec2(dx / mag, dy / mag)

            boost_active = keys[pygame.K_SPACE] or keys[pygame.K_LSHIFT]
            session.tick(dt, {"direction": direction, "boost": boost_active})

        # ── Render ───────────────────────────────────────────────────────────

        screen.fill(C_BG)

        # Grid
        for gx in range(0, WIN_W, 40):
            pygame.draw.line(screen, C_GRID, (gx, 0), (gx, WIN_H - HUD_H))
        for gy in range(0, WIN_H - HUD_H, 40):
            pygame.draw.line(screen, C_GRID, (0, gy), (WIN_W, gy))

        # Arena border
        x0, y0, x1, y1 = session.arena.bounds()
        border_c = C_BORDER_SHRINK if session.session_time > session.arena.shrink_start else C_BORDER
        pygame.draw.rect(screen, border_c, (x0, y0, x1 - x0, y1 - y0), 2)

        tick_ms = pygame.time.get_ticks()

        # Orbs
        for orb in session.orbs:
            if not orb.active:
                continue
            pulse = int(abs(math.sin(tick_ms * 0.003)) * 2)
            c = C_ORB_XP if orb.orb_type == OrbType.XP else C_ORB_ENERGY
            pygame.draw.circle(screen, c, (int(orb.pos.x), int(orb.pos.y)), int(orb.radius) + pulse)

        # Enemies
        for en in session.enemies:
            if not en.active:
                continue
            ec = (int(en.pos.x), int(en.pos.y))
            c  = C_ENEMY_CHASER if en.enemy_class == EnemyClass.CHASER else C_ENEMY_PATROL
            pygame.draw.circle(screen, c, ec, int(en.collision_radius))
            tip = (ec[0] + int(en.direction.x * 14), ec[1] + int(en.direction.y * 14))
            pygame.draw.line(screen, C_WHITE, ec, tip, 2)

        # Snake
        snake    = session.snake
        segments = list(snake.segments)
        n        = len(segments)

        for i, seg in enumerate(segments):
            sx, sy = int(seg.x), int(seg.y)
            if snake.state == SnakeState.STUNNED:
                c = C_SNAKE_STUN
            elif snake.state == SnakeState.ABSORBING:
                c = C_SNAKE_ABS
            elif snake.state == SnakeState.BOOSTING:
                c = C_SNAKE_BOOST
            elif i == 0:
                c = C_SNAKE_HEAD
            else:
                t = i / max(n - 1, 1)
                r = int(C_SNAKE_BODY[0] * (1 - t * 0.3))
                g = int(C_SNAKE_BODY[1] * (1 - t * 0.2))
                b = int(C_SNAKE_BODY[2] * (1 - t * 0.1))
                c = (r, g, b)

            radius = max(3, int(snake.segment_size) - (1 if i > 0 else 0))
            pygame.draw.circle(screen, c, (sx, sy), radius)

        # ── HUD ──────────────────────────────────────────────────────────────

        hud_y = WIN_H - HUD_H
        pygame.draw.rect(screen, (10, 10, 20), (0, hud_y, WIN_W, HUD_H))
        pygame.draw.line(screen, C_BORDER, (0, hud_y), (WIN_W, hud_y), 1)

        score_surf = font_lg.render(f"SCORE {snake.score:06d}", True, C_HUD_TEXT)
        screen.blit(score_surf, (10, hud_y + 12))

        remaining  = max(0.0, session.session_duration - session.session_time)
        t_color    = C_DEAD if remaining < 30 else C_HUD_TEXT
        time_surf  = font_lg.render(f"{int(remaining):3d}s", True, t_color)
        screen.blit(time_surf, (WIN_W - 80, hud_y + 12))

        # Boost bar
        bx = 255
        pygame.draw.rect(screen, (35, 35, 55), (bx, hud_y + 18, 100, 10))
        boost_w = int(snake.boost_charge * 100)
        if boost_w > 0:
            pygame.draw.rect(screen, C_ORB_ENERGY, (bx, hud_y + 18, boost_w, 10))
        screen.blit(font_sm.render("BOOST", True, C_ORB_ENERGY), (bx, hud_y + 5))

        len_surf = font_md.render(f"LEN {snake.length():3d}", True, C_HUD_TEXT)
        screen.blit(len_surf, (385, hud_y + 14))

        # Ability slots
        ab_x = 460
        for i, ab in enumerate(snake.abilities):
            slot_r = pygame.Rect(ab_x + i * 70, hud_y + 8, 65, 34)
            if ab:
                c   = ABILITY_COLORS.get(ab.ability_type.value, (80, 80, 100))
                pygame.draw.rect(screen, c, slot_r)
                lbl = font_sm.render(ab.ability_type.value[:5], True, (0, 0, 0))
                screen.blit(lbl, (slot_r.x + 4, slot_r.y + 11))
            else:
                pygame.draw.rect(screen, (35, 35, 55), slot_r, 1)
                lbl = font_sm.render(f"[{i+1}]", True, (60, 60, 80))
                screen.blit(lbl, (slot_r.x + 18, slot_r.y + 11))

        # ── Game-over overlay ─────────────────────────────────────────────────

        if session.is_over():
            overlay = pygame.Surface((WIN_W, WIN_H - HUD_H), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, 160))
            screen.blit(overlay, (0, 0))

            if session.outcome == "timeout":
                title_surf = font_lg.render("TIME UP  —  YOU SURVIVED!", True, C_WIN)
            else:
                cause      = (session.death_cause or "unknown").upper().replace("_", " ")
                title_surf = font_lg.render(f"DEAD  [{cause}]", True, C_DEAD)

            screen.blit(title_surf, (WIN_W // 2 - title_surf.get_width() // 2, 180))

            s2 = font_lg.render(f"FINAL SCORE  {snake.score}", True, C_WHITE)
            screen.blit(s2, (WIN_W // 2 - s2.get_width() // 2, 225))

            s3 = font_md.render(
                f"Survived {session.session_time:.1f}s   ·   Length {snake.length()}   ·   Absorptions {snake.ability_count()}",
                True, C_HUD_TEXT,
            )
            screen.blit(s3, (WIN_W // 2 - s3.get_width() // 2, 270))

            s4 = font_md.render("[R] Restart     [Q] Quit", True, (130, 130, 160))
            screen.blit(s4, (WIN_W // 2 - s4.get_width() // 2, 320))

        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    run_game()
