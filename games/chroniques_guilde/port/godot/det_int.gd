# =============================================================================
#  det_int.gd — ARITHMÉTIQUE ENTIÈRE DÉTERMINISTE (Godot 4)
#  Chroniques de Guilde · portage. Date : 2026-09-19.
#  Source : sim.js §0 (lignes 22-25) et tactic.js §0 (lignes 21-23), à l'identique.
#
#  ---------------------------------------------------------------------------
#  CE CODE N'A PAS ÉTÉ EXÉCUTÉ. Godot n'était pas installé sur la machine qui l'a
#  écrit. Les valeurs attendues ci-dessous, elles, SONT produites par le moteur
#  JavaScript (port/gen_primitives.mjs). Colle ce fichier dans Godot, lance
#  det_selftest.gd, et tu sais en deux minutes si la base tient.
#  ---------------------------------------------------------------------------
#
#  VALEURS ATTENDUES — div(a, b), TRONCATURE VERS ZÉRO (jamais floor)
#    div(7, 2)            ==  3
#    div(-7, 2)           == -3          floor() donnerait -4  → FAUX
#    div(7, -2)           == -3          floor() donnerait -4  → FAUX
#    div(-7, -2)          ==  3
#    div(1, 3)            ==  0
#    div(-1, 3)           ==  0          floor() donnerait -1  → FAUX
#    div(-2, 3)           ==  0          floor() donnerait -1  → FAUX   <-- le cas le plus fréquent du moteur
#    div(-4, 3)           == -1          floor() donnerait -2  → FAUX
#    div(-5, 2)           == -2          floor() donnerait -3  → FAUX
#    div(-15, 2)          == -7          floor() donnerait -8  → FAUX
#    div(-31, 2)          == -15         floor() donnerait -16 → FAUX
#    div(0, 5)            ==  0
#    div(2147483647, 3)   ==  715827882
#    div(-2147483648, 3)  == -715827882  floor() donnerait -715827883 → FAUX
#
#  VALEURS ATTENDUES — imul32(a, b), les 32 bits BAS du produit
#    imul32(0x811c9dc5, 0x01000193) == 0x050c5d1f
#    imul32(0xffffffff, 0xffffffff) == 0x00000001
#    imul32(0x6d2b79f5, 0x00000003) == 0x47826ddf
#    imul32(0x075bcd15, 0x3ade68b1) == 0xfbff5385
#    imul32(0x80000000, 0x00000002) == 0x00000000
#
#  MESURÉ sur les 7 vecteurs de référence (161 journées) : 57 divisions entières
#  à signes opposés et reste non nul, donc 57 endroits où floor() diverge —
#  50 d'entre elles sont div(-2, 3) dans sim.js:3086 (usure de moral par créneau).
#  Une seule suffit à faire diverger le hachage du jour.
# =============================================================================
class_name DetInt
extends RefCounted

const MASK32: int = 0xFFFFFFFF

## Division entière tronquée VERS ZÉRO — l'équivalent exact de Math.trunc(a / b).
## L'opérateur / de GDScript entre deux int tronque déjà vers zéro (comme le C++),
## mais il faut que les DEUX opérandes soient des int : si l'un devient float,
## GDScript rend un float et l'arrondi change. D'où les types explicites.
@warning_ignore("integer_division")
static func div(a: int, b: int) -> int:
	return a / b

## clamp entier (sim.js:23). Godot a clampi() ; on le nomme pour rester lisible.
static func clamp_i(x: int, lo: int, hi: int) -> int:
	return mini(hi, maxi(lo, x))

## pct(x, p) = div(x * p, 100)    — multiplicateurs en centièmes (sim.js:24)
@warning_ignore("integer_division")
static func pct(x: int, p: int) -> int:
	return (x * p) / 100

## permille(x, p) = div(x * p, 1000) — probabilités en pour mille (sim.js:25)
@warning_ignore("integer_division")
static func permille(x: int, p: int) -> int:
	return (x * p) / 1000

## Les 32 bits BAS du produit de deux entiers 32 bits — l'équivalent de Math.imul.
## Pourquoi ce découpage en deux moitiés de 16 bits plutôt qu'un simple
## (a * b) & MASK32 : les int de GDScript font 64 bits, et a * b peut valoir
## jusqu'à 2^64, ce qui déborde int64 (comportement non garanti). Ici le plus
## gros produit intermédiaire vaut 0xFFFF * 0xFFFFFFFF ≈ 2^48 : aucun débordement.
static func imul32(a: int, b: int) -> int:
	a &= MASK32
	b &= MASK32
	var lo: int = (a & 0xFFFF) * b                       # <= 2^48
	var hi: int = ((a >> 16) * (b & 0xFFFF)) & 0xFFFF
	return (lo + (hi << 16)) & MASK32

## Décalage à droite NON SIGNÉ sur 32 bits — l'équivalent de >>> en JavaScript.
## Tant que la valeur est masquée à 32 bits elle est positive, et >> de GDScript
## est alors logique. Ce passage par u32() est la garde qui l'assure.
static func shr32(v: int, n: int) -> int:
	return (v & MASK32) >> n

## Ramène une valeur dans 0 .. 2^32-1 (l'équivalent de >>> 0 en JavaScript).
static func u32(v: int) -> int:
	return v & MASK32

## Hexadécimal sur 8 chiffres minuscules — l'équivalent de hex8() (sim.js:52).
static func hex8(h: int) -> String:
	return "%08x" % (h & MASK32)
