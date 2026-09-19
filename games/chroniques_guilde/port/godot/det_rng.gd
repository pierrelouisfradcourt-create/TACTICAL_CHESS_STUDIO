# =============================================================================
#  det_rng.gd — GÉNÉRATEUR PSEUDO-ALÉATOIRE mulberry32 (Godot 4)
#  Chroniques de Guilde · portage. Date : 2026-09-19.
#  Source : sim.js §0 lignes 54-74 (makeRng), repris à l'identique tactic.js 40-53.
#
#  ---------------------------------------------------------------------------
#  CE CODE N'A PAS ÉTÉ EXÉCUTÉ (pas de Godot sur la machine d'écriture).
#  Les valeurs attendues viennent du moteur JavaScript (port/gen_primitives.mjs).
#  Le MODÈLE arithmétique, lui, est prouvé : port/gen_primitives.mjs réimplémente
#  ce même algorithme en entiers 64 bits masqués (aucun opérateur 32 bits de JS,
#  aucun Math.imul) et compare 16 000 tirages au moteur — 0 divergence.
#  ---------------------------------------------------------------------------
#
#  VALEURS ATTENDUES — rng = DetRng.new(DetHash.fnv1a_u32(4242 ^ 1)),
#  c'est-à-dire le flux de la JOURNÉE 1 de la partie par défaut (graine 4242).
#    graine du flux            == 0x76d1d166
#    8 premiers next()         == 0xdecaa58c, 0xc95a9721, 0x367847f8, 0xff97cdb9,
#                                 0xe38b015b, 0x47983ce4, 0xc726ad8e, 0xedb32668
#    8 premiers roll(1000)     == 604, 345, 408, 681, 883, 396, 782, 968
#    8 premiers roll(6) + 1    == 1, 2, 5, 2, 6, 5, 1, 1
#  (chaque ligne repart d'un générateur NEUF sur la même graine)
#
#  DEUX PIÈGES MORTELS
#  1. next() doit rendre un entier NON SIGNÉ 0..4294967295. Si une étape laisse
#     passer un négatif, roll(n) = next() % n rend un reste NÉGATIF en GDScript
#     (le % garde le signe du dividende, comme en JS) et le jeu part en vrille
#     sans lever la moindre erreur. D'où le masque & MASK32 à chaque étape.
#  2. L'ÉTAT du générateur, c'est le couple (s, count). `count` ne sert à rien au
#     calcul mais il est sérialisé dans state.raid (rng_s / rng_count) : il fait
#     partie de l'empreinte. Un portage qui oublie de l'incrémenter, ou qui
#     l'incrémente ailleurs, fait diverger hash_state sans changer une seule règle.
# =============================================================================
class_name DetRng
extends RefCounted

const MASK32: int = 0xFFFFFFFF
const STEP: int = 0x6D2B79F5

var s: int = 0      ## état interne, entier NON SIGNÉ 32 bits
var count: int = 0  ## nombre de tirages consommés — sérialisé, donc haché

func _init(seed_u32: int = 0) -> void:
	s = seed_u32 & MASK32
	count = 0

## Restaure un générateur depuis un état relu (state.raid.rng_s / rng_count).
static func from_state(rng_s: int, rng_count: int) -> DetRng:
	var r := DetRng.new(rng_s)
	r.count = rng_count
	return r

## Un tirage brut : entier non signé sur 32 bits. mulberry32.
func next() -> int:
	s = (s + STEP) & MASK32
	var t: int = s
	t = DetInt.imul32(t ^ (t >> 15), t | 1)
	t = ((t + DetInt.imul32(t ^ (t >> 7), t | 61)) ^ t) & MASK32
	count += 1
	return (t ^ (t >> 14)) & MASK32

## Entier de 0 à n-1. n <= 1 ne consomme AUCUN tirage : c'est une règle du moteur,
## pas une optimisation. La sauter décale tout le flux.
func roll(n: int) -> int:
	if n <= 1:
		return 0
	return next() % n

## Vrai avec une probabilité p POUR MILLE (0..1000).
func chance(p: int) -> bool:
	return roll(1000) < p

## Entier de lo à hi inclus. hi <= lo ne consomme aucun tirage.
func between(lo: int, hi: int) -> int:
	if hi <= lo:
		return lo
	return lo + roll(hi - lo + 1)

## Tirage pondéré. `entries` = Array de [clé, poids], DANS L'ORDRE DE LA TABLE
## d'origine — surtout pas retrié : l'ordre décide du découpage de l'intervalle.
## Rend null si la somme des poids est nulle, sans consommer de tirage.
func pick_weighted(entries: Array) -> Variant:
	var total: int = 0
	for e in entries:
		total += maxi(0, int(e[1]))
	if total == 0:
		return null
	var r: int = roll(total)
	var acc: int = 0
	for e in entries:
		acc += maxi(0, int(e[1]))
		if r < acc:
			return e[0]
	return entries[entries.size() - 1][0]
