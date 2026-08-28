# feedback.gd — retour visuel au clic (capacite render.click_feedback, R13).
#
# Adaptateur de presentation. Au clic sur l'objet central, fait apparaitre un texte
# flottant "+N" qui monte : une reaction visible dans la meme frame que le clic.
extends Node2D


# Joue le retour de clic : cree un label "+N" a la position du clic, anime vers le haut,
# auto-detruit. Rend le Label cree (present au frame du clic).
func play_click_feedback(amount: float, pos: Vector2) -> Label:
	var label := Label.new()
	label.text = "+" + str(int(amount))
	label.position = pos
	label.modulate = Color("ff8fa3")
	add_child(label)
	var tween := create_tween()
	tween.tween_property(label, "position", pos + Vector2(0, -32), 0.5)
	tween.parallel().tween_property(label, "modulate:a", 0.0, 0.5)
	tween.tween_callback(label.queue_free)
	return label
