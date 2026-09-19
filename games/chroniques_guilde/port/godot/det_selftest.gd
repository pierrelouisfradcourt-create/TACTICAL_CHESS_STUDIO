# =============================================================================
#  det_selftest.gd — VÉRIFICATION DES PRIMITIVES EN DEUX MINUTES (Godot 4)
#  Chroniques de Guilde · portage. Date : 2026-09-19.
#
#  À FAIRE EN PREMIER, AVANT D'ÉCRIRE UNE SEULE RÈGLE DE JEU.
#  Toutes les valeurs attendues ci-dessous sont produites par le moteur
#  JavaScript de référence (port/gen_primitives.mjs, 2026-09-19).
#
#  EXÉCUTÉ LE 2026-09-19 SUR GODOT 4.6.stable.official.89cea1439 : 65/65.
#  Un seul défaut réel trouvé au passage — JSON.parse_string rend des
#  flottants — réparé par det_json.gd, qui est désormais la seule façon
#  correcte de lire data.json. Voir PORT_GODOT.md, piège 11.
#
#  Usage, depuis ce dossier (il contient un project.godot) :
#      godot --headless --path . --import            # une fois, cf. README
#      godot --headless --path . --script res://run_selftest.gd
#  Sinon, à la souris : ouvre ce dossier comme projet, pose ce script sur le
#  nœud racine d'une scène vide, puis F6.
#  Sortie attendue : « 65/65 — PRIMITIVES CONFORMES ».
#  Le premier échec dit lequel : c'est là que le portage diverge.
# =============================================================================
extends Node

var _ok: int = 0
var _ko: int = 0

func _ready() -> void:
	run_all()
	get_tree().quit(0 if _ko == 0 else 1)

func run_all() -> void:
	print("=== primitives déterministes — Chroniques de Guilde ===")
	_t_div()
	_t_imul()
	_t_hash_u32()
	_t_hash_str()
	_t_rng()
	_t_canonical()
	print("---")
	if _ko == 0:
		print("%d/%d — PRIMITIVES CONFORMES" % [_ok, _ok])
	else:
		print("%d/%d — %d ÉCHEC(S) : le portage diverge, ne va pas plus loin" % [_ok, _ok + _ko, _ko])

# Nombre d'échecs, pour le lanceur en ligne de commande (run_selftest.gd).
func failures() -> int:
	return _ko

func _eq(name: String, got: Variant, want: Variant) -> void:
	if str(got) == str(want):
		_ok += 1
	else:
		_ko += 1
		printerr("ÉCHEC  %s  attendu %s  obtenu %s" % [name, str(want), str(got)])

# --- division entière : troncature VERS ZÉRO ---------------------------------
func _t_div() -> void:
	_eq("div(7,2)", DetInt.div(7, 2), 3)
	_eq("div(-7,2)", DetInt.div(-7, 2), -3)          # floor() donnerait -4
	_eq("div(7,-2)", DetInt.div(7, -2), -3)
	_eq("div(-7,-2)", DetInt.div(-7, -2), 3)
	_eq("div(1,3)", DetInt.div(1, 3), 0)
	_eq("div(-1,3)", DetInt.div(-1, 3), 0)           # floor() donnerait -1
	_eq("div(-2,3)", DetInt.div(-2, 3), 0)           # le cas le plus fréquent du moteur
	_eq("div(-4,3)", DetInt.div(-4, 3), -1)
	_eq("div(-5,2)", DetInt.div(-5, 2), -2)
	_eq("div(-15,2)", DetInt.div(-15, 2), -7)
	_eq("div(-31,2)", DetInt.div(-31, 2), -15)
	_eq("div(2147483647,3)", DetInt.div(2147483647, 3), 715827882)
	_eq("div(-2147483648,3)", DetInt.div(-2147483648, 3), -715827882)
	_eq("pct(250,150)", DetInt.pct(250, 150), 375)
	_eq("permille(250,150)", DetInt.permille(250, 150), 37)

# --- multiplication 32 bits ---------------------------------------------------
func _t_imul() -> void:
	_eq("imul32(0x811c9dc5,0x01000193)", DetInt.hex8(DetInt.imul32(0x811C9DC5, 0x01000193)), "050c5d1f")
	_eq("imul32(0xffffffff,0xffffffff)", DetInt.hex8(DetInt.imul32(0xFFFFFFFF, 0xFFFFFFFF)), "00000001")
	_eq("imul32(0x6d2b79f5,3)", DetInt.hex8(DetInt.imul32(0x6D2B79F5, 3)), "47826ddf")
	_eq("imul32(123456789,987654321)", DetInt.hex8(DetInt.imul32(123456789, 987654321)), "fbff5385")
	_eq("imul32(0x80000000,2)", DetInt.hex8(DetInt.imul32(0x80000000, 2)), "00000000")

# --- hachage d'entier ---------------------------------------------------------
func _t_hash_u32() -> void:
	_eq("fnv1a_u32(0)", DetInt.hex8(DetHash.fnv1a_u32(0)), "4b95f515")
	_eq("fnv1a_u32(1)", DetInt.hex8(DetHash.fnv1a_u32(1)), "fb69b604")
	_eq("fnv1a_u32(4242)", DetInt.hex8(DetHash.fnv1a_u32(4242)), "ea27a717")
	_eq("fnv1a_u32(4294967295)", DetInt.hex8(DetHash.fnv1a_u32(4294967295)), "e3160fb1")
	_eq("day_seed(4242,1)", DetInt.hex8(DetHash.day_seed(4242, 1)), "76d1d166")
	_eq("day_seed(4242,30)", DetInt.hex8(DetHash.day_seed(4242, 30)), "64929d89")

# --- hachage de chaîne sur OCTETS UTF-8 --------------------------------------
func _t_hash_str() -> void:
	_eq("octets UTF-8 « Maëlle »", str(Array("Maëlle".to_utf8_buffer())), str([77, 97, 195, 171, 108, 108, 101]))
	_eq("octets UTF-8 « Château »", str(Array("Château".to_utf8_buffer())), str([67, 104, 195, 162, 116, 101, 97, 117]))
	_eq("fnv1a_str(\"\")", DetInt.hex8(DetHash.fnv1a_str("")), "811c9dc5")
	_eq("fnv1a_str(\"p1\")", DetInt.hex8(DetHash.fnv1a_str("p1")), "a04ed67a")
	_eq("fnv1a_str(\"ai_prudent\")", DetInt.hex8(DetHash.fnv1a_str("ai_prudent")), "1463a334")
	_eq("fnv1a_str(\"hall\")", DetInt.hex8(DetHash.fnv1a_str("hall")), "d0bebf32")
	_eq("fnv1a_str(\"Maëlle\")", DetInt.hex8(DetHash.fnv1a_str("Maëlle")), "4f8ceb34")
	_eq("fnv1a_str(\"Château\")", DetInt.hex8(DetHash.fnv1a_str("Château")), "f0c3c2e6")
	_eq("fnv1a_str(\"é\")", DetInt.hex8(DetHash.fnv1a_str("é")), "1e9de8c1")
	_eq("fnv1a_str(\"forêt\")", DetInt.hex8(DetHash.fnv1a_str("forêt")), "752141b7")
	_eq("fnv1a_str(\"Hydre des marais\")", DetInt.hex8(DetHash.fnv1a_str("Hydre des marais")), "3e130d4e")
	_eq("fnv1a_str(\"Les Loups d’Argent\")", DetInt.hex8(DetHash.fnv1a_str("Les Loups d’Argent")), "f9d6efaa")
	_eq("fnv1a_str(\"jour|3\")", DetInt.hex8(DetHash.fnv1a_str("jour|3")), "6945f60c")
	_eq("fnv1a_str(\"raid_forest\")", DetInt.hex8(DetHash.fnv1a_str("raid_forest")), "f1c12a03")
	_eq("fnv1a_str(\"aventurier_être_blessé\")", DetInt.hex8(DetHash.fnv1a_str("aventurier_être_blessé")), "7e7f3ce1")
	_eq("fnv1a_str(\"🐉\")", DetInt.hex8(DetHash.fnv1a_str("🐉")), "0c8d3deb")

# --- générateur pseudo-aléatoire ---------------------------------------------
func _t_rng() -> void:
	var seed_u32: int = DetHash.day_seed(4242, 1)     # 0x76d1d166
	var r := DetRng.new(seed_u32)
	var got := PackedStringArray()
	for i in 8:
		got.append(DetInt.hex8(r.next()))
	_eq("mulberry32 next() x8", ",".join(got),
		"decaa58c,c95a9721,367847f8,ff97cdb9,e38b015b,47983ce4,c726ad8e,edb32668")
	_eq("mulberry32 count après 8", r.count, 8)
	var r2 := DetRng.new(seed_u32)
	var rolls := PackedStringArray()
	for i in 8:
		rolls.append(str(r2.roll(1000)))
	_eq("roll(1000) x8", ",".join(rolls), "604,345,408,681,883,396,782,968")
	var r3 := DetRng.new(seed_u32)
	var d6 := PackedStringArray()
	for i in 8:
		d6.append(str(r3.roll(6) + 1))
	_eq("roll(6)+1 x8", ",".join(d6), "1,2,5,2,6,5,1,1")
	var r4 := DetRng.new(seed_u32)
	_eq("roll(1) ne consomme rien", str(r4.roll(1)) + "/" + str(r4.count), "0/0")

# --- canonique et empreinte ---------------------------------------------------
func _t_canonical() -> void:
	var ex := {"z": 1, "a": {"d": [3, 2, 1], "c": "é"}, "b": null, "n": -7}
	_eq("canonical(exemple)", DetCanonical.canonical(ex), '{"a":{"c":"é","d":[3,2,1]},"b":null,"n":-7,"z":1}')
	_eq("hash_state(exemple)", DetCanonical.hash_state(ex), "294809ed")
	_eq("canonical([])", DetCanonical.canonical([]), "[]")
	_eq("canonical({})", DetCanonical.canonical({}), "{}")
	_eq("canonical(\"Château\")", DetCanonical.canonical("Château"), '"Château"')
	_eq("canonical(0)", DetCanonical.canonical(0), "0")
	_eq("canonical(-7)", DetCanonical.canonical(-7), "-7")
	_eq("hash_state({})", DetCanonical.hash_state({}), "5465b825")
	_eq("hash_state([])", DetCanonical.hash_state([]), "741638a5")
	var k: Array = ["b", "A", "10", "2", "é", "a"]
	k.sort()
	_eq("tri par point de code", str(k), str(["10", "2", "A", "a", "b", "é"]))
	# PIÈGE 11, MESURÉ SUR GODOT 4.6.stable : le parseur JSON rend des FLOTTANTS.
	# Ce contrôle n'attend donc plus des entiers — il constate le défaut, pour que
	# personne ne croie un jour qu'il a disparu sans l'avoir vérifié.
	var brut: Variant = JSON.parse_string('{"n":1000,"m":-7}')
	_eq("JSON.parse_string rend des flottants (défaut connu de Godot)",
		"%d/%d" % [typeof(brut["n"]), typeof(brut["m"])], "%d/%d" % [TYPE_FLOAT, TYPE_FLOAT])
	# ... et DetJson est ce qui le répare. C'est LUI qui doit lire data.json.
	var net: Variant = DetJson.parse('{"n":1000,"m":-7,"a":[1,2,[3]],"o":{"k":4},"s":"x","b":true,"z":null}')
	_eq("DetJson.parse : entiers à la racine", "%d/%d" % [typeof(net["n"]), typeof(net["m"])],
		"%d/%d" % [TYPE_INT, TYPE_INT])
	_eq("DetJson.parse : valeurs", "%d/%d" % [net["n"], net["m"]], "1000/-7")
	_eq("DetJson.parse : entiers dans un tableau imbriqué",
		"%d/%d" % [typeof(net["a"][0]), typeof(net["a"][2][0])], "%d/%d" % [TYPE_INT, TYPE_INT])
	_eq("DetJson.parse : entiers dans un dictionnaire imbriqué", typeof(net["o"]["k"]), TYPE_INT)
	_eq("DetJson.parse : chaîne, booléen et nul intacts",
		"%d/%d/%d" % [typeof(net["s"]), typeof(net["b"]), typeof(net["z"])],
		"%d/%d/%d" % [TYPE_STRING, TYPE_BOOL, TYPE_NIL])
	# Un vrai fractionnaire n'est PAS tronqué en douce : il reste visible, et
	# DetCanonical le refusera bruyamment s'il arrive jusqu'au hachage.
	var frac: Variant = DetJson.parse('{"x":1.5}')
	_eq("DetJson.parse : un fractionnaire reste flottant", typeof(frac["x"]), TYPE_FLOAT)
	# Et le canonique d'une table passée par DetJson est identique à celui de JS.
	_eq("canonical après DetJson", DetCanonical.canonical(DetJson.parse('{"b":2,"a":1}')), '{"a":1,"b":2}')
