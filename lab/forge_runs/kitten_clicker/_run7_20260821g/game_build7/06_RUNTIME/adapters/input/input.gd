# input.gd — adaptateur d'ENTREE. Traduit les InputEvent moteur (clic sur une affordance)
# en appels de la LOGIQUE PURE. Les affordances joueur (pelote, acheter_chaton,
# acheter_amelioration, prestige) entrent dans le systeme UNIQUEMENT par ici. Cet
# adaptateur ne connait AUCUNE regle de jeu : il route, il ne decide pas.
extends Node

const Purrs := preload("res://05_SYSTEMS/core/purrs.gd")
const Shop := preload("res://05_SYSTEMS/core/shop.gd")
const Prestige := preload("res://05_SYSTEMS/core/prestige.gd")

# Emis apres chaque action : (action, effet). `effet` = true si l'action a change l'etat
# (clic toujours ; achat/prestige seulement s'il a reussi). Le controleur s'y branche pour
# rafraichir l'ecran et declencher l'audio — l'adaptateur d'entree ne fait ni l'un ni l'autre.
signal action_effectuee(action: String, effet: bool)

# Etat de jeu pur, remis par le controleur (l'adaptateur ne le possede pas).
var etat: Dictionary = {}

# Relie une affordance (Control, groupe "affordance") a son action logique. Unique porte
# par laquelle une entree joueur entre dans le systeme.
func brancher(affordance: Control, action: String) -> void:
	affordance.gui_input.connect(func(ev: InputEvent) -> void: _sur_gui(ev, action))

# Filtre l'InputEvent : seul un clic gauche presse declenche l'action.
func _sur_gui(ev: InputEvent, action: String) -> void:
	if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		declencher(action)

# Traduit une action nommee en appel de la logique pure, puis emet le signal.
func declencher(action: String) -> bool:
	var effet := false
	match action:
		"pelote":
			effet = sur_pelote()
		"acheter_chaton":
			effet = sur_acheter_chaton()
		"acheter_amelioration":
			effet = sur_acheter_amelioration()
		"prestige":
			effet = sur_prestige()
	action_effectuee.emit(action, effet)
	return effet

# --- une porte par affordance (EX02/EX05/EX18/EX07) ---
func sur_pelote() -> bool:
	Purrs.clic(etat)
	return true

func sur_acheter_chaton() -> bool:
	return Shop.acheter_chaton(etat)

func sur_acheter_amelioration() -> bool:
	return Shop.acheter_amelioration(etat)

func sur_prestige() -> bool:
	return Prestige.prestige(etat)
