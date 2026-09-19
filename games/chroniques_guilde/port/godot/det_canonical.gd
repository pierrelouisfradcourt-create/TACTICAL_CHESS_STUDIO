# =============================================================================
#  det_canonical.gd — SÉRIALISATION CANONIQUE ET EMPREINTE D'ÉTAT (Godot 4)
#  Chroniques de Guilde · portage. Date : 2026-09-19.
#  Source : sim.js §0 lignes 76-82 (canonical, hashState).
#
#  ---------------------------------------------------------------------------
#  CE CODE N'A PAS ÉTÉ EXÉCUTÉ (pas de Godot sur la machine d'écriture).
#  Les valeurs attendues viennent du moteur JavaScript (port/gen_primitives.mjs).
#  ---------------------------------------------------------------------------
#
#  VALEURS ATTENDUES — canonical()
#    canonical({"z":1,"a":{"d":[3,2,1],"c":"é"},"b":null,"n":-7})
#        == '{"a":{"c":"é","d":[3,2,1]},"b":null,"n":-7,"z":1}'
#       (clés triées À TOUS LES NIVEAUX ; l'ordre des ÉLÉMENTS D'UN TABLEAU
#        n'est JAMAIS touché : [3,2,1] reste [3,2,1])
#    canonical([])          == "[]"
#    canonical({})          == "{}"
#    canonical("Château")   == '"Château"'      (accent BRUT, jamais â)
#    canonical(0)           == "0"              (jamais "0.0")
#    canonical(-7)          == "-7"
#
#  VALEURS ATTENDUES — hash_state()
#    hash_state({"z":1,"a":{"d":[3,2,1],"c":"é"},"b":null,"n":-7}) == "294809ed"
#    hash_state({})                                                == "5465b825"
#    hash_state([])                                                == "741638a5"
#
#  VALEURS ATTENDUES — tri des clés (par POINT DE CODE, jamais par locale)
#    ["b","A","10","2","é","a"] trié == ["10","2","A","a","b","é"]
#    Un tri par locale française rendrait ["10","2","a","A","b","é"] ou
#    ["10","2","A","a","b","é"] selon la plateforme : c'est exactement le genre de
#    divergence qui n'apparaît que sur le téléphone d'un joueur.
#
#  TROIS PIÈGES
#  1. N'utilise PAS JSON.stringify() de Godot. Il n'ordonne pas les clés, il
#     n'échappe pas forcément comme JavaScript, et il écrit les entiers 64 bits
#     et les flottants à sa façon. Le format d'empreinte doit être identique
#     à l'octet près : on l'écrit à la main, ci-dessous.
#  2. AUCUN FLOTTANT ne doit exister dans l'état. Le moteur JS est prouvé sans
#     flottant (banc harness : « aucun nombre non entier dans l'état »). Ici on
#     lève une erreur plutôt que d'écrire "1.0" là où JavaScript écrit "1".
#     Attention : le parseur JSON de Godot peut rendre des float là où le JSON
#     porte des entiers — VÉRIFIE-LE avant toute comparaison (det_selftest.gd).
#  3. Les clés d'un Dictionary doivent être des String, jamais des int. Un
#     Dictionary { 1: "x" } se sérialise autrement qu'un { "1": "x" }, et le JSON
#     d'origine n'a que des clés String.
# =============================================================================
class_name DetCanonical
extends RefCounted

## Sérialisation canonique : clés de dictionnaires triées récursivement,
## aucun espace, échappement identique à JSON.stringify de JavaScript.
static func canonical(v: Variant) -> String:
	match typeof(v):
		TYPE_NIL:
			return "null"
		TYPE_BOOL:
			return "true" if v else "false"
		TYPE_INT:
			return str(v)
		TYPE_FLOAT:
			# Le moteur n'a pas le droit d'avoir de flottant dans l'état.
			# Un flottant entier (3.0) venant du parseur JSON est ramené à l'entier ;
			# tout le reste est une ERREUR DE PORTAGE qu'il vaut mieux voir tout de suite.
			var f: float = v
			assert(f == floor(f) and absf(f) < 9007199254740992.0,
				"DetCanonical : flottant non entier dans l'état (%f) — le moteur est ENTIER partout" % f)
			return str(int(f))
		TYPE_STRING, TYPE_STRING_NAME:
			return _quote(String(v))
		TYPE_ARRAY, TYPE_PACKED_INT32_ARRAY, TYPE_PACKED_INT64_ARRAY, TYPE_PACKED_STRING_ARRAY:
			var parts := PackedStringArray()
			for e in v:
				parts.append(canonical(e))
			return "[" + ",".join(parts) + "]"
		TYPE_DICTIONARY:
			var keys: Array = (v as Dictionary).keys()
			for k in keys:
				assert(typeof(k) == TYPE_STRING or typeof(k) == TYPE_STRING_NAME,
					"DetCanonical : clé de dictionnaire non textuelle (%s)" % str(k))
			keys.sort()   # tri par point de code, comme .sort() de JavaScript sur des clés ASCII
			var out := PackedStringArray()
			for k in keys:
				out.append(_quote(String(k)) + ":" + canonical(v[k]))
			return "{" + ",".join(out) + "}"
		_:
			assert(false, "DetCanonical : type non sérialisable (%d)" % typeof(v))
			return "null"

## Empreinte de l'état : FNV-1a 32 bits du JSON canonique, 8 chiffres hexadécimaux
## minuscules. C'est hashState() de sim.js, ligne 82.
static func hash_state(state: Variant) -> String:
	return DetInt.hex8(DetHash.fnv1a_str(canonical(state)))

## Échappement de chaîne, à la lettre de JSON.stringify de JavaScript :
##   "  -> \"      \  -> \\      0x08 -> \b    0x09 -> \t
##   0x0A -> \n    0x0C -> \f    0x0D -> \r
##   tout autre caractère < 0x20 -> \u00XX (minuscules)
##   tout caractère >= 0x20 est écrit BRUT, accents et emojis compris.
## En particulier : / n'est PAS échappé, et rien n'est converti en \uXXXX au-delà
## de 0x1F. Un échappeur « prudent » qui écrirait é pour é casserait
## l'empreinte de chaque journée.
static func _quote(s: String) -> String:
	var out := "\""
	for i in s.length():
		var c: int = s.unicode_at(i)
		match c:
			0x22: out += "\\\""
			0x5C: out += "\\\\"
			0x08: out += "\\b"
			0x09: out += "\\t"
			0x0A: out += "\\n"
			0x0C: out += "\\f"
			0x0D: out += "\\r"
			_:
				if c < 0x20:
					out += "\\u%04x" % c
				else:
					out += s[i]
	return out + "\""

## Copie profonde — l'équivalent de JSON.parse(JSON.stringify(v)) (sim.js:83).
## duplicate() SANS argument est une copie de SURFACE : les sous-dictionnaires
## restent partagés et la mutation d'un jour contamine l'état précédent. C'est un
## bug qui ne se voit qu'au rejeu, des dizaines de journées plus loin.
static func deep_clone(v: Variant) -> Variant:
	match typeof(v):
		TYPE_DICTIONARY:
			return (v as Dictionary).duplicate(true)
		TYPE_ARRAY:
			return (v as Array).duplicate(true)
		_:
			return v

## Clés d'un dictionnaire triées — l'équivalent de sortedKeys() (sim.js:84).
## TOUTE itération qui consomme du hasard passe par là. Jamais .keys() nu :
## l'ordre d'insertion d'un Dictionary Godot n'est pas celui d'un objet JS.
static func sorted_keys(d: Dictionary) -> Array:
	var k: Array = d.keys()
	k.sort()
	return k
