# pricing.gd — rampe de prix (capacite economy.pricing, couvre R6).
#
# Depend UNIQUEMENT de game_state. Cout strictement croissant a chaque exemplaire
# deja possede : ratio geometrique >= 1.10 (regle du genre idle).
extends RefCounted

const RATIO: float = 1.15   # facteur multiplicatif par exemplaire deja possede (au moins 1.10)


# Cout du prochain exemplaire : cout_de_base * RATIO^(nb_possedes). Arrondi a l'entier
# inferieur (les ronrons se depensent en unites entieres). Strictement croissant en
# `owned` tant que cout_de_base est assez grand pour que l'arrondi ne colle pas deux
# paliers (verifie par l'oracle economy sur la sequence reelle).
static func next_cost(base_cost: int, owned: int) -> int:
	return int(floor(float(base_cost) * pow(RATIO, owned)))
