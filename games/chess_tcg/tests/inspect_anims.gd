extends SceneTree

func _initialize() -> void:
	for path in ["res://assets/characters/adventurers/Knight.glb",
			"res://assets/characters/skeletons/Skeleton_Warrior.glb"]:
		var scene = load(path)
		if scene == null:
			print(path, " -> LOAD FAIL")
			continue
		var inst = scene.instantiate()
		get_root().add_child(inst)
		var ap = _find_ap(inst)
		if ap != null:
			print("\n== ", path)
			print(ap.get_animation_list())
		else:
			print(path, " -> no AnimationPlayer")
	quit(0)

func _find_ap(n):
	if n is AnimationPlayer:
		return n
	for c in n.get_children():
		var r = _find_ap(c)
		if r != null:
			return r
	return null
