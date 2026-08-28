# hud.gd — bandeau HUD (capacite render.hud, R2). Adaptateur de presentation.
#
# Depend de game_state (lecture seule) et de number_format (meme module runtime). Affiche
# en permanence le compteur de ronrons et le taux/sec ; se met a jour apres un achat.
# Ne contient AUCUNE logique de jeu : il ne fait qu'exposer l'etat.
extends Node2D

const NumberFormat = preload("res://06_RUNTIME/adapters/render/number_format.gd")

var _label_total: Label
var _label_rate: Label


func _ready() -> void:
	_label_total = Label.new()
	_label_total.position = Vector2(16, 12)
	add_child(_label_total)
	_label_rate = Label.new()
	_label_rate.position = Vector2(16, 40)
	add_child(_label_rate)
	draw_hud(0.0, 0.0)


# Met a jour le bandeau : total de ronrons + taux/sec, en notation abregee.
# La fonction accepte les deux grandeurs deja calculees par le jeu (l'etat n'est pas
# importe ici : l'appelant lui passe aggregate_rate()).
func draw_hud(total: float, rate: float) -> void:
	if _label_total != null:
		_label_total.text = NumberFormat.abbreviate(total) + " ronrons"
	if _label_rate != null:
		_label_rate.text = NumberFormat.abbreviate(rate) + " /sec"
