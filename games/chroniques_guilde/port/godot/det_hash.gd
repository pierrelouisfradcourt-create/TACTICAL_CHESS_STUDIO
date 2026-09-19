# =============================================================================
#  det_hash.gd — HACHAGE FNV-1a 32 BITS (Godot 4)
#  Chroniques de Guilde · portage. Date : 2026-09-19.
#  Source : sim.js §0 lignes 27-52 (utf8Bytes, fnvBytes, fnvStr, fnvU32, hex8),
#  repris à l'identique dans tactic.js lignes 25-38.
#
#  ---------------------------------------------------------------------------
#  CE CODE N'A PAS ÉTÉ EXÉCUTÉ (pas de Godot sur la machine d'écriture).
#  Les valeurs attendues viennent du moteur JavaScript (port/gen_primitives.mjs).
#  ---------------------------------------------------------------------------
#
#  VALEURS ATTENDUES — fnv1a_u32(v), hachage d'un entier, 4 octets PETIT-BOUTISTE
#    fnv1a_u32(0)          == 0x4b95f515
#    fnv1a_u32(1)          == 0xfb69b604
#    fnv1a_u32(4242)       == 0xea27a717
#    fnv1a_u32(4243)       == 0x76d1d166      # = fnv1a_u32(4242 ^ 1), graine du jour 1
#    fnv1a_u32(4236)       == 0x64929d89      # = fnv1a_u32(4242 ^ 30), graine du jour 30
#    fnv1a_u32(4294967295) == 0xe3160fb1
#
#  VALEURS ATTENDUES — fnv1a_str(s), hachage des OCTETS UTF-8
#    fnv1a_str("")                       == 0x811c9dc5   (0 octets)
#    fnv1a_str("p1")                     == 0xa04ed67a   (2 octets)
#    fnv1a_str("ai_prudent")             == 0x1463a334   (10 octets)
#    fnv1a_str("hall")                   == 0xd0bebf32   (4 octets)
#    fnv1a_str("Maëlle")                 == 0x4f8ceb34   (7 octets, PAS 6)
#    fnv1a_str("Château")                == 0xf0c3c2e6   (8 octets, PAS 7)
#    fnv1a_str("é")                      == 0x1e9de8c1   (2 octets, PAS 1)
#    fnv1a_str("Ysolde")                 == 0xcfa785a9   (6 octets)
#    fnv1a_str("forêt")                  == 0x752141b7   (6 octets, PAS 5)
#    fnv1a_str("Hydre des marais")       == 0x3e130d4e   (16 octets)
#    fnv1a_str("Les Loups d’Argent")     == 0xf9d6efaa   (20 octets — l'apostrophe typographique fait 3 octets)
#    fnv1a_str("jour|3")                 == 0x6945f60c   (6 octets)
#    fnv1a_str("raid_forest")            == 0xf1c12a03   (11 octets)
#    fnv1a_str("aventurier_être_blessé") == 0x7e7f3ce1   (24 octets, PAS 22)
#    fnv1a_str("🐉")                     == 0x0c8d3deb   (4 octets — hors BMP)
#
#    octets UTF-8 de "Maëlle"  == [77, 97, 195, 171, 108, 108, 101]
#    octets UTF-8 de "Château" == [67, 104, 195, 162, 116, 101, 97, 117]
#
#  PIÈGE : String.length() de Godot compte des POINTS DE CODE, pas des octets.
#  "Maëlle".length() == 6 mais son UTF-8 fait 7 octets. Hacher les points de code
#  au lieu des octets donne un hachage FAUX sur tout texte accentué — c'est-à-dire
#  sur presque tout le jeu, dont les noms de managers du vecteur de référence.
#  La seule forme juste est to_utf8_buffer().
# =============================================================================
class_name DetHash
extends RefCounted

const MASK32: int = 0xFFFFFFFF
const FNV_OFFSET: int = 0x811C9DC5
const FNV_PRIME: int = 0x01000193

## FNV-1a sur une suite d'octets, à partir d'une empreinte de départ.
static func fnv1a_bytes(h: int, bytes: PackedByteArray) -> int:
	h &= MASK32
	for i in bytes.size():
		h = (h ^ bytes[i]) & MASK32
		h = DetInt.imul32(h, FNV_PRIME)
	return h & MASK32

## FNV-1a des OCTETS UTF-8 d'une chaîne. to_utf8_buffer() ne pose ni BOM ni
## terminateur nul : c'est exactement utf8Bytes() de sim.js.
static func fnv1a_str(s: String) -> int:
	return fnv1a_bytes(FNV_OFFSET, s.to_utf8_buffer())

## FNV-1a d'un entier 32 bits, décomposé en 4 octets PETIT-BOUTISTE
## (octet de poids faible d'abord) — sim.js:48-51.
static func fnv1a_u32(v: int) -> int:
	v &= MASK32
	var b := PackedByteArray()
	b.append(v & 255)
	b.append((v >> 8) & 255)
	b.append((v >> 16) & 255)
	b.append((v >> 24) & 255)
	return fnv1a_bytes(FNV_OFFSET, b)

## Graine du flux de la journée : fnv1a_u32(seed ^ day) — CONTRACT.md §journée.
## Le XOR se fait sur les entiers de la partie AVANT le hachage, jamais après.
static func day_seed(seed: int, day: int) -> int:
	return fnv1a_u32((seed ^ day) & MASK32)
