# GridNav — navigation déterministe en grille par BFS.
# Interface : next_step(from, to, walls) et path_length(from, to, walls).
# Pureté : aucune modification de walls, aucun état global, aucun appel aléatoire.
# Déterminisme : l'ordre d'exploration des voisins est FIXE (haut, droite, bas, gauche).
extends RefCounted

# Directions en ordre FIXE pour garantir le déterminisme.
# Haut (nord), Droite (est), Bas (sud), Gauche (ouest).
const DIRECTIONS := [
	Vector2i(0, -1),  # nord
	Vector2i(1, 0),   # est
	Vector2i(0, 1),   # sud
	Vector2i(-1, 0),  # ouest
]

# Distance infinie de Manhattan sur une grille non limitée.
const MAX_DISTANCE := 1000

## Calcule un pas depuis from vers to, en évitant les murs.
## Retourne la position après un pas du chemin le plus court, ou from si impossible.
static func next_step(from: Vector2i, to: Vector2i, walls: Dictionary) -> Vector2i:
	if from == to:
		return from

	# BFS pour trouver le chemin le plus court, puis retourner le premier pas.
	var queue: Array = [from]
	var parent := {}
	parent[from] = null  # from n'a pas de parent
	var visited := {}
	visited[from] = true

	var head := 0
	var found := false
	while head < queue.size() and not found:
		var current = queue[head]
		head += 1

		for direction in DIRECTIONS:
			var neighbor = current + direction

			# Déjà visité ? skip.
			if visited.has(neighbor):
				continue

			# C'est un mur ? skip.
			if walls.has(neighbor) and walls[neighbor]:
				continue

			# Ajouter à la queue.
			visited[neighbor] = true
			parent[neighbor] = current
			queue.append(neighbor)

			# Avons-nous trouvé la cible ?
			if neighbor == to:
				found = true
				break

	# Si la cible n'a pas été trouvée, retourner from.
	if not found:
		return from

	# Reconstituer le chemin en remontant les parents.
	var current = to
	while parent[current] != from:
		current = parent[current]

	return current

## Calcule la longueur du chemin le plus court depuis from vers to.
## Retourne -1 si inatteignable. Explore au maximum 10000 cellules pour éviter boucles infinies.
static func path_length(from: Vector2i, to: Vector2i, walls: Dictionary) -> int:
	if from == to:
		return 0

	# BFS classique avec queue FIFO et visited set.
	var queue: Array = [from]
	var visited := {}
	visited[from] = 0  # distance de from à from

	var head := 0  # pointeur sur la queue
	var max_cells_explored := 10000

	while head < queue.size() and visited.size() < max_cells_explored:
		var current = queue[head]
		head += 1
		var current_dist = visited[current]

		# Arrêt prématuré si on a trouvé la cible.
		if current == to:
			return current_dist

		# Explore les voisins en ordre FIXE pour déterminisme.
		for direction in DIRECTIONS:
			var neighbor = current + direction

			# Déjà visité ? skip.
			if visited.has(neighbor):
				continue

			# C'est un mur ? skip.
			if walls.has(neighbor) and walls[neighbor]:
				continue

			# Ajouter à la queue et marquer comme visité.
			visited[neighbor] = current_dist + 1
			queue.append(neighbor)

	# Cible non trouvée ou limite atteinte.
	return -1
