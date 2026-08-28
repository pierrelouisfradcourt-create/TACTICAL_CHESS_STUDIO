# gallery_view.gd — adaptateur `gallery_view` (blueprint s4-archi). Rend l'ecran collection a
# partir du releve observable : chaque chaton avec son etat verrouille (silhouette/cadenas) ou
# debloque, et son badge de rarete. LIT l'etat, ne le modifie JAMAIS ; AUCUNE donnee de
# collection n'est detenue ici (elle vit dans le module collection, projetee par game_state).
#
# Deps (blueprint) : game_state (via la projection). Le noyau `cells` est PUR et teste headless ;
# le _draw est le volet visuel (preuve GPU R5).
extends Control

const COLS := 3
const CELL := Vector2(180.0, 150.0)
const MARGIN := Vector2(20.0, 20.0)
const RARITY_COLORS := [Color(0.7, 0.7, 0.7), Color(0.4, 0.6, 1.0), Color(1.0, 0.8, 0.2)]

var _proj: Dictionary = {}

# --- NOYAU PUR (teste headless) ---

# Prepare la liste ordonnee des cellules a dessiner depuis la projection : un objet par chaton
# avec {id, rarity, unlocked}. Ne detient aucune donnee : recopie collection_entries.
static func cells(proj: Dictionary) -> Array:
	var out: Array = []
	var entries: Array = proj.get("collection_entries", [])
	for e in entries:
		out.append({"id": e.get("id", ""), "rarity": int(e.get("rarity", 0)), "unlocked": bool(e.get("unlocked", false))})
	return out

static func rarity_color(rarity: int) -> Color:
	if rarity < 0 or rarity >= RARITY_COLORS.size():
		return Color.MAGENTA
	return RARITY_COLORS[rarity]

# --- PARTIE VISUELLE (Control) — preuve GPU R5 ---

func render(proj: Dictionary) -> void:
	_proj = proj
	queue_redraw()

func _draw() -> void:
	var font := ThemeDB.fallback_font
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.12, 0.12, 0.16))
	draw_string(font, Vector2(24, 40), "Galerie de chatons", HORIZONTAL_ALIGNMENT_LEFT, -1, 28, Color.WHITE)
	var liste := cells(_proj)
	for i in range(liste.size()):
		var c: Dictionary = liste[i]
		var col := i % COLS
		var row := i / COLS
		var origin := Vector2(MARGIN.x + col * (CELL.x + MARGIN.x), 70.0 + row * (CELL.y + MARGIN.y))
		var rect := Rect2(origin, CELL - Vector2(8, 8))
		if c["unlocked"]:
			# Debloque : vignette coloree + badge de rarete.
			draw_rect(rect, Color(0.25, 0.22, 0.30))
			draw_circle(origin + CELL * 0.4, 42, Color(0.95, 0.72, 0.45))
			draw_rect(Rect2(origin + Vector2(8, 8), Vector2(28, 28)), rarity_color(c["rarity"]))
			draw_string(font, origin + Vector2(10, CELL.y - 20), String(c["id"]), HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color.WHITE)
		else:
			# Verrouille : silhouette sombre + cadenas.
			draw_rect(rect, Color(0.08, 0.08, 0.10))
			draw_circle(origin + CELL * 0.4, 42, Color(0.16, 0.16, 0.18))
			draw_rect(Rect2(origin + CELL * 0.5 - Vector2(12, 6), Vector2(24, 20)), Color(0.5, 0.5, 0.5))
			draw_string(font, origin + Vector2(10, CELL.y - 20), "???", HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color(0.6, 0.6, 0.6))
