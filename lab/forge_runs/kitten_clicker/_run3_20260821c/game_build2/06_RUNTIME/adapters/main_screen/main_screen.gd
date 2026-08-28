# main_screen.gd — adaptateur `main_screen` (blueprint s4-archi). Rend l'ecran principal a
# partir du SEUL releve observable : compteur de caresses lisible en permanence, chaton central
# cliquable en zone focale, feedback visuel immediat a chaque clic (nombre flottant).
#
# LIT l'etat, ne le modifie JAMAIS, ne consulte aucun systeme de regles, ne fait remonter
# aucune couleur dans la logique (separation : la presentation depend de l'observable, jamais
# l'inverse). Deps (blueprint) : game_state (via la projection recue). Le noyau de PREPARATION
# (counter_text/feedback_text/focal_rect) est PUR et teste headless ; le _draw est le volet
# visuel (preuve GPU R9).
extends Control

# Geometrie de la zone focale du chaton central (rectangle englobant le disque). Constantes
# nommees de mise en page (pas des parametres de gameplay).
const FOCAL_CENTER := Vector2(320.0, 270.0)
const FOCAL_RADIUS := 90.0
const COUNTER_POS := Vector2(24.0, 40.0)
const FEEDBACK_POS := Vector2(300.0, 150.0)

var _proj: Dictionary = {}
var _feedback_visible: bool = false
var _feedback_text: String = ""

# --- NOYAU PUR (teste headless) ---

static func counter_text(proj: Dictionary) -> String:
	return "%d ronrons" % int(proj.get("purrs", 0))

static func feedback_text(gain: float) -> String:
	return "+%d" % int(gain)

static func focal_rect() -> Rect2:
	return Rect2(FOCAL_CENTER - Vector2(FOCAL_RADIUS, FOCAL_RADIUS), Vector2(FOCAL_RADIUS * 2.0, FOCAL_RADIUS * 2.0))

# Le chaton focal existe-t-il toujours dans cet ecran ? (invariant structurel de presence)
static func has_focal_kitten() -> bool:
	return true

# --- PARTIE VISUELLE (Control) — preuve GPU R9 ---

func render(proj: Dictionary) -> void:
	_proj = proj
	queue_redraw()

# Affiche le feedback flottant du dernier clic (present apres un clic, absent avant).
func flash_feedback(gain: float) -> void:
	_feedback_visible = true
	_feedback_text = feedback_text(gain)
	queue_redraw()

func clear_feedback() -> void:
	_feedback_visible = false
	queue_redraw()

func _draw() -> void:
	var font := ThemeDB.fallback_font
	# Fond de l'ecran (evite un viewport monochrome par defaut).
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.18, 0.14, 0.22))
	# Chaton central (disque + oreilles en triangles) en zone focale, cliquable.
	draw_circle(FOCAL_CENTER, FOCAL_RADIUS, Color(0.95, 0.72, 0.45))
	var ear := 34.0
	draw_colored_polygon(PackedVector2Array([
		FOCAL_CENTER + Vector2(-55, -70), FOCAL_CENTER + Vector2(-20, -70), FOCAL_CENTER + Vector2(-40, -70 - ear)
	]), Color(0.95, 0.72, 0.45))
	draw_colored_polygon(PackedVector2Array([
		FOCAL_CENTER + Vector2(55, -70), FOCAL_CENTER + Vector2(20, -70), FOCAL_CENTER + Vector2(40, -70 - ear)
	]), Color(0.95, 0.72, 0.45))
	# Yeux (feedback de vie visuelle).
	draw_circle(FOCAL_CENTER + Vector2(-30, -10), 8, Color.BLACK)
	draw_circle(FOCAL_CENTER + Vector2(30, -10), 8, Color.BLACK)
	# Compteur de ronrons, lisible en permanence en haut.
	draw_string(font, COUNTER_POS, counter_text(_proj), HORIZONTAL_ALIGNMENT_LEFT, -1, 32, Color.WHITE)
	# Feedback flottant apres un clic (nombre flottant), absent avant.
	if _feedback_visible:
		draw_string(font, FEEDBACK_POS, _feedback_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 40, Color(0.6, 1.0, 0.6))
