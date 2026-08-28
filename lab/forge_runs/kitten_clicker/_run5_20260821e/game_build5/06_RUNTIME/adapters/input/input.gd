# input.gd — adaptateur d'entree (capacite input.click, R1).
#
# Route un clic sur l'objet central vers production.click : une entree = un increment.
# L'adaptateur depend de la logique (production/click) ; la logique n'a jamais connaissance
# de l'entree (dependance a sens unique).
extends RefCounted

const Click = preload("res://05_SYSTEMS/production/click.gd")


# Capture un clic et le route vers la production : rend le gain applique a l'etat.
# C'est le MEME canal que celui qu'utilise le bot de solvabilite (aucun forcage d'etat).
static func capture_click(state) -> float:
	return Click.on_click(state)
