# rarity.gd — distribution de rarete des chatons (capacite chatons.rarity_dist, R9).
#
# Depend UNIQUEMENT de game_state. DETERMINISME : le tirage consomme un
# RandomNumberGenerator SEEDE passe par l'appelant — jamais randi()/randf()/randomize()
# global (interdits). Deux tirages depuis le meme etat de rng rendent le meme resultat.
#
# Les poids vivent dans un Array ORDONNE (jamais un Dictionary) : l'ordre de parcours
# est fixe, donc le mapping roll -> rarete est reproductible.
extends RefCounted

# Poids relatifs, du plus frequent au plus rare. freq(common) > freq(rare) par
# construction ; cinq frequences distinctes non triviales (regle de variance).
const WEIGHTS: Array = [
	["common", 60],
	["uncommon", 25],
	["rare", 10],
	["epic", 4],
	["legendary", 1],
]


# Somme des poids (borne haute inclusive du tirage).
static func total_weight() -> int:
	var total: int = 0
	for entry in WEIGHTS:
		total += int(entry[1])
	return total


# Rarete pour un tirage ENTIER donne (1..total_weight). Fonction PURE, testable a la
# borne exacte (roll == seuil cumule) : c'est ce qui rend le `<=` mesurable par mutation.
static func rarity_for_roll(roll: int) -> String:
	var cumulative: int = 0
	for entry in WEIGHTS:
		cumulative += int(entry[1])
		if roll <= cumulative:
			return String(entry[0])
	# Inatteignable si les poids sont positifs : repli defensif sur la derniere rarete.
	return String(WEIGHTS[WEIGHTS.size() - 1][0])


# Tire une rarete selon les poids, en consommant `rng` (seede par l'appelant).
static func roll_rarity(rng: RandomNumberGenerator) -> String:
	return rarity_for_roll(rng.randi_range(1, total_weight()))
