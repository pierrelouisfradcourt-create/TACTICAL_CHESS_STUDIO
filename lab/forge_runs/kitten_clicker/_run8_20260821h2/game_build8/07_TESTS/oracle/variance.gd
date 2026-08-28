# variance.gd — VOLET PRODUIT (FORGE_ORACLE). Regle de variance (ratifiee Pierre
# 2026-07-21) : l'echelle des couts affichee a l'ecran porte >=3 valeurs DISTINCTES
# et non triviales (> 0). Charge la VRAIE scene principale (res://main.tscn) et lit
# les labels du groupe "cost_ladder" — jamais la table interne (garde V4 : aucun
# acces a l'economie, uniquement l'ecran).
extends SceneTree

const SETTLE := 6

var _f := 0
var _num := RegEx.new()


func _init() -> void:
	_num.compile("[-+]?\\d+(?:[.,]\\d+)?")
	var packed = load("res://main.tscn")
	if packed == null or not (packed is PackedScene):
		_emit(false, ["main.tscn introuvable"], {})
		return
	get_root().add_child(packed.instantiate())


func _process(_d: float) -> bool:
	_f += 1
	if _f < SETTLE:
		return false
	var distinct: Array = []
	for n in get_nodes_in_group("cost_ladder"):
		if n is Label:
			var m := _num.search(n.text)
			if m != null:
				var v := int(m.get_string())
				if v > 0 and not distinct.has(v):
					distinct.append(v)
	var fails: Array = []
	if distinct.size() < 3:
		fails.append("seulement %d cout(s) distinct(s) non trivial(aux) a l'ecran (< 3)" % distinct.size())
	_emit(fails.is_empty(), fails, {"distinct_costs": distinct})
	return true


func _emit(ok: bool, fails: Array, data: Dictionary) -> void:
	print("FORGE_ORACLE variance " + JSON.stringify({"ok": ok, "fails": fails, "data": data}))
	quit(0 if ok else 1)
