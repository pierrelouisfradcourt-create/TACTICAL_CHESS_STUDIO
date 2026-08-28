# game_state.gd — ETAT DE PARTIE PUR (game.state). Detient, n'agit pas.
#
# Vocabulaire ferme : le genre incremental ne connait aucun etat 'defaite'/'game_over'
# (charter hors_scope). `statut` ne vaut jamais que STATUT_EN_COURS.
#
# PURETE : aucune connaissance de scene, noeud, Input ou rendu. Les adaptateurs dependent
# de cet objet, jamais l'inverse.
extends RefCounted

const P = preload("res://05_SYSTEMS/params/params.gd")

var ronrons: float = 0.0          # compteur de ronrons DISPONIBLES (monnaie a depenser)
var total_earned: float = 0.0     # ronrons TOTAUX gagnes (jamais reduit par un achat) :
                                  # c'est LUI qui classe la progression (paliers), pas le
                                  # solde ; sinon depenser ferait redescendre le palier.
var taux: float = 0.0             # production par tick, cache recalcule par economy
var kittens: Array = []           # ids de chatons possedes, dans l'ordre d'achat (colonie)
var unlocked: Array = []          # ids DISTINCTS debloques, dans l'ordre (suivi de collection)
var upgrade_level: int = 0        # nombre d'ameliorations achetees
var palier: int = 0               # plus haut palier franchi (compte de seuils traverses)
var prestige_units: int = 0       # bonus permanent accumule (survit au prestige)
var prestige_count: int = 0       # nombre de prestiges effectues
var place_unlocked: bool = false  # 2e lieu (jardin) debloque par palier
var statut: String = P.STATUT_EN_COURS
var total_kittens: int = 6        # T du compteur de collection X/T (nb de chatons au registre)


# Etat neuf. `total` = taille du registre de chatons (lu au boot par le runtime), sinon 6.
static func initial(total: int = 6) -> Object:
	var s = load("res://05_SYSTEMS/game_state/game_state.gd").new()
	s.total_kittens = maxi(1, total)
	return s


# Multiplicateur permanent du prestige. Multiplie le clic ET la production passive : c'est
# ce qui rend le prestige effectif (reatteindre un palier prend moins de ticks).
func prestige_mult() -> float:
	return 1.0 + float(prestige_units) * P.PRESTIGE_BONUS_PER


# Multiplicateur d'amelioration : +UPGRADE_STEP par niveau. 1.0 sans amelioration.
func upgrade_mult() -> float:
	return 1.0 + float(upgrade_level) * P.UPGRADE_STEP


# Copie profonde de l'etat, pour un oracle ou un rejeu. Aucun partage de reference.
func clone() -> Object:
	var c = load("res://05_SYSTEMS/game_state/game_state.gd").new()
	c.ronrons = ronrons
	c.total_earned = total_earned
	c.taux = taux
	c.kittens = kittens.duplicate(true)
	c.unlocked = unlocked.duplicate(true)
	c.upgrade_level = upgrade_level
	c.palier = palier
	c.prestige_units = prestige_units
	c.prestige_count = prestige_count
	c.place_unlocked = place_unlocked
	c.statut = statut
	c.total_kittens = total_kittens
	return c


# Instantane LISIBLE par un oracle (copie, sans effet de bord). Ne prend que des valeurs
# declarees.
func snapshot() -> Dictionary:
	return {
		"ronrons": ronrons,
		"total_earned": total_earned,
		"taux": taux,
		"kittens": kittens.size(),
		"unlocked": unlocked.size(),
		"upgrade_level": upgrade_level,
		"palier": palier,
		"prestige_units": prestige_units,
		"prestige_count": prestige_count,
		"place_unlocked": place_unlocked,
		"statut": statut,
		"total_kittens": total_kittens,
	}
