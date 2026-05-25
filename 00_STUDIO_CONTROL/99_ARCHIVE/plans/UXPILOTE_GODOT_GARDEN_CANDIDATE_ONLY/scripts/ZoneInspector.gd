extends PanelContainer
class_name ZoneInspector

var _title: Label
var _metaphor: Label
var _surface: Label
var _status: Label
var _provenance: Label
var _map_role: Label
var _authority: Label
var _focus_hint: Label
var _layer_context: Label
var _human_feedback: Label
var _data_weight: Label
var _signal_context: Label
var _description: Label
var _blocked: Label
var _selected_layer_data: Dictionary = {}
var _current_zone_data: Dictionary = {}

func _ready() -> void:
	custom_minimum_size = Vector2(420, 520)
	_build_ui()
	show_empty()

func show_empty() -> void:
	_current_zone_data = {}
	_title.text = "Zone du jardin"
	_metaphor.text = "Sélectionnez une zone plantée."
	_surface.text = "Surface: PASSIVE"
	_status.text = "Statut: UNKNOWN"
	_provenance.text = "chemin réel: non sélectionné\nrapport source: non sélectionné\nNiveau de preuve: UNKNOWN\nQuestion HumanGate: sélectionner une zone\nCette carte ne lit pas le disque en direct."
	_map_role.text = "Rôle carte: contexte du jardin"
	_authority.text = "Autorité: feedback humain requis pour toute promotion"
	_focus_hint.text = "Focus sélectionné: clic ou Tab; F cadre la zone; R restaure la vue du jardin; touche A cycle les architectures; touche 0 affiche tout; touches 1-7 sélectionnent une architecture."
	_layer_context.text = "%s\nArchitectures: Toutes les architectures, Architecture actuelle / vérité, Architecture sensible / verrouillée, Architecture des flux, Architecture Build / Archive, Architecture cible, Architecture roadmap, Salle des pyramides." % _selected_layer_text()
	_human_feedback.text = "Feedback humain: la sphère d'eau symbolise le retour humain vivant"
	_data_weight.text = "Poids des données: taille symbolique codée en dur, aucune mesure réelle"
	_signal_context.text = "Signal: sélectionnez une zone pour lire flux entrant, flux sortant, perte de signal et ancrage réel"
	_description.text = "Ce panneau est passif. Sélectionnez calques, Zone Build, Archive, Zone Outils, Merle, forêt de jeux ou touche 7 pour lire les trois pyramides séparées."
	_blocked.text = "Actions bloquées: exécution, mutation, scan, connexion, approbation automatique"

func set_layer_reading_mode(layer_data: Dictionary) -> void:
	_selected_layer_data = layer_data
	if _title == null:
		return
	if _title.text == "Zone du jardin":
		show_empty()
	else:
		_layer_context.text = "%s\n%s" % [_layer_context_text_without_selected(_current_zone_data), _selected_layer_text()]

func show_zone(zone_data: Dictionary) -> void:
	_current_zone_data = zone_data
	_title.text = String(zone_data.get("label", "Garden Zone"))
	_metaphor.text = String(zone_data.get("metaphor", ""))
	_surface.text = "Surface: %s" % String(zone_data.get("surface", "UNKNOWN"))
	_status.text = "Statut: %s" % String(zone_data.get("status", "UNKNOWN"))
	_provenance.text = _provenance_text(zone_data)
	_map_role.text = "Rôle carte: %s" % _map_role_text(zone_data)
	_authority.text = "Autorité: %s" % String(zone_data.get("authority", "revue humaine requise"))
	_focus_hint.text = "Focus sélectionné: %s est surlignée; F cadre sans changer les données; touche A, touche 0 et touches 1-7 changent seulement le switch visuel local" % String(zone_data.get("label", "cette zone"))
	_layer_context.text = _layer_context_text(zone_data)
	_human_feedback.text = _human_feedback_text(zone_data)
	_data_weight.text = _data_weight_text(zone_data)
	_signal_context.text = _signal_context_text(zone_data)
	_description.text = _read_only_description(zone_data)
	if String(zone_data.get("id", "")) == "merle_audit_scout":
		_description.text = _merle_description(zone_data)
	var blocked_items: Array = zone_data.get("blocked_actions", [])
	var blocked_text := PackedStringArray()
	for item in blocked_items:
		blocked_text.append(String(item))
	_blocked.text = "Actions bloquées: %s" % ", ".join(blocked_text)

func _build_ui() -> void:
	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.045, 0.065, 0.055, 0.92)
	panel_style.border_color = Color(0.34, 0.48, 0.34, 1.0)
	panel_style.set_border_width_all(1)
	panel_style.corner_radius_top_left = 6
	panel_style.corner_radius_top_right = 6
	panel_style.corner_radius_bottom_left = 6
	panel_style.corner_radius_bottom_right = 6
	add_theme_stylebox_override("panel", panel_style)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 12)
	add_child(margin)

	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 6)
	margin.add_child(stack)

	_title = _label(20, Color(0.96, 0.98, 0.86, 1.0))
	stack.add_child(_title)

	_metaphor = _label(14, Color(0.78, 0.90, 0.72, 1.0))
	stack.add_child(_metaphor)

	_surface = _label(13, Color(0.74, 0.82, 0.76, 1.0))
	stack.add_child(_surface)

	_status = _label(13, Color(0.74, 0.82, 0.76, 1.0))
	stack.add_child(_status)

	_provenance = _label(11, Color(0.78, 0.92, 0.86, 1.0))
	_provenance.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(_provenance)

	_map_role = _label(12, Color(0.78, 0.88, 0.78, 1.0))
	_map_role.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(_map_role)

	_authority = _label(12, Color(0.95, 0.78, 0.34, 1.0))
	_authority.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(_authority)

	_focus_hint = _label(12, Color(1.0, 0.94, 0.58, 1.0))
	_focus_hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(_focus_hint)

	_layer_context = _label(12, Color(0.74, 0.96, 0.82, 1.0))
	_layer_context.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(_layer_context)

	_human_feedback = _label(12, Color(0.80, 0.92, 0.68, 1.0))
	_human_feedback.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(_human_feedback)

	_data_weight = _label(12, Color(0.92, 0.86, 0.62, 1.0))
	_data_weight.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(_data_weight)

	_signal_context = _label(12, Color(0.72, 0.92, 1.0, 1.0))
	_signal_context.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(_signal_context)

	_description = _label(12, Color(0.88, 0.90, 0.84, 1.0))
	_description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(_description)

	_blocked = _label(11, Color(1.0, 0.66, 0.58, 1.0))
	_blocked.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(_blocked)

func _label(panel_size: int, color: Color) -> Label:
	var label := Label.new()
	label.add_theme_font_size_override("font_size", panel_size)
	label.add_theme_color_override("font_color", color)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return label

func _provenance_text(zone_data: Dictionary) -> String:
	var blocked_items: Array = zone_data.get("blocked_actions", [])
	var blocked_text := PackedStringArray()
	for item in blocked_items:
		blocked_text.append(String(item))
	var warning := String(zone_data.get("warning", ""))
	var warning_suffix := "" if warning.is_empty() else "\nAvertissement: %s" % warning
	return "Chemin réel: %s\nchemin réel: %s\nRapport source: %s\nrapport source: %s\nNiveau de preuve: %s\nStatut: %s\nSurface: %s\nActions bloquées: %s\nQuestion HumanGate: %s%s\nCette carte ne lit pas le disque en direct." % [
		String(zone_data.get("real_path", "UNKNOWN")),
		String(zone_data.get("real_path", "UNKNOWN")),
		String(zone_data.get("evidence_report", "UNKNOWN")),
		String(zone_data.get("evidence_report", "UNKNOWN")),
		String(zone_data.get("evidence_level", "UNKNOWN")),
		String(zone_data.get("status", "UNKNOWN")),
		String(zone_data.get("surface", "UNKNOWN")),
		", ".join(blocked_text),
		String(zone_data.get("human_gate_question", "HumanGate requis avant toute action réelle.")),
		warning_suffix,
	]

func _human_feedback_text(zone_data: Dictionary) -> String:
	var zone_id := String(zone_data.get("id", ""))
	var authority := String(zone_data.get("authority", ""))
	var metaphor := String(zone_data.get("metaphor", ""))
	var status := String(zone_data.get("status", "UNKNOWN"))
	if zone_id == "build_zone":
		return "Zone Build: bac à sable de préparation/test hors système; branche symbolique seulement, pas une vraie branche Git"
	if zone_id == "tool_zone":
		return "Zone Outils: logiciels professionnels Godot / Codex tenus par l'humain; aucun lancement d'outil"
	if zone_id == "archive_zone":
		return "Zone Archive: stockage symbolique hors système; aucune action d'archive ou déplacement réel"
	if zone_id == "humangate":
		return "Feedback humain: sphère de feedback vivant, source/réservoir du retour humain; aucune approbation automatique"
	if zone_id == "architecture_layer" or zone_id == "roadmap_layer":
		return "Calque: superposition visuelle symbolique seulement; aucun contrôle, promotion, exécution ou workflow"
	if zone_id == "video_game_garden" or zone_id.begins_with("future_game_tree"):
		return "Forêt de jeux: un arbre par jeu, valeurs d'exemple codées en dur; pas de découverte repo ni métrique réelle"
	if zone_id == "merle_audit_scout":
		return "Merle: les yeux passifs du système; auditeur, hygiène, vérité, détection de dérive, rapport vers la sphère de feedback humain"
	if zone_id == "python_tools":
		return "Observation passive: poste dormant sous le sens du merle; ce n'est pas la Zone Outils et ne lance rien"
	if metaphor.contains("Living Feedback Sphere") or authority.contains("human feedback"):
		return "Feedback humain: sphère de feedback vivant, irrigation, brume d'observation et retour; aucune approbation automatique"
	if status == "DOCUMENTED_ONLY" or status == "BLOCKED":
		return "Feedback humain: requis avant activation, promotion ou revendication de prêt"
	return "Feedback humain: requis pour toute action au-delà de l'inspection passive"

func _data_weight_text(zone_data: Dictionary) -> String:
	var weight := float(zone_data.get("scale_or_weight", 1.0))
	var data_weight := String(zone_data.get("data_weight", "poids des données symbolique: %.2f / taille symbolique" % weight))
	return "Poids des données: %s. Codé en dur; aucune taille de fichier, mesure ou télémétrie réelle." % data_weight

func _signal_context_text(zone_data: Dictionary) -> String:
	if not zone_data.has("incoming_flow"):
		return "Signal: aucun échantillon symbolique pour cette zone"
	return "Signal: Flux entrant: %s | Flux sortant: %s | force symbolique: %s | Perte de signal: %s | Ancrage réel: %s | vérité/note: %s" % [
		String(zone_data.get("incoming_flow", "UNKNOWN")),
		String(zone_data.get("outgoing_flow", "UNKNOWN")),
		String(zone_data.get("feedback_signal_strength", "UNKNOWN")),
		String(zone_data.get("signal_loss", "UNKNOWN")),
		String(zone_data.get("reality_grounding", "UNKNOWN")),
		String(zone_data.get("doctrine_note", "Symbolic sample only.")),
	]

func _layer_context_text(zone_data: Dictionary) -> String:
	return "%s\n%s" % [_layer_context_text_without_selected(zone_data), _selected_layer_text()]

func _layer_context_text_without_selected(zone_data: Dictionary) -> String:
	var layers: Array = zone_data.get("layers", [])
	var layer_names := PackedStringArray()
	for item in layers:
		layer_names.append(String(item))
	var layer_prefix := "Calques: %s" % ", ".join(layer_names)
	if layer_names.is_empty():
		layer_prefix = "Calques: visuel passif de lecture"
	return "%s. %s Ces calques n'exécutent, ne scannent, ne lisent, n'entraînent, ne chargent et ne promeuvent rien; aucun bouton actif." % [
		layer_prefix,
		String(zone_data.get("layer_meaning", "Superposition symbolique de lecture seulement.")),
	]

func _selected_layer_text() -> String:
	if _selected_layer_data.is_empty():
		return "Architecture active: Toutes les architectures. switch visuel local — aucun effet système; aucun bouton actif."
	var shows: Array = _selected_layer_data.get("shows", [])
	var show_text := PackedStringArray()
	for item in shows:
		show_text.append(String(item))
	if String(_selected_layer_data.get("id", "")) == "semantic_pyramid_architecture":
		return "Architecture active: Salle des pyramides. Pyramide Architecture Système: C:/TACTICAL_CHESS_STUDIO = full garden / whole studio system; Studio Control = governance/control room; Outputs / runtime_outputs = artifact/output areas; Datasets = sensitive data zone, training blocked; Models = sensitive model zone, loading/promotion blocked; Secrets = locked/unknown; PureLab = component inside the system, not root; Tool Zone, Build Zone, Archive Zone = structural zones; no execution, scan, file move, build/archive/tool action or system mutation. Pyramide Agentique: HumanGate apex; Merle eyes/audit/hygiene/truth; ChatGPT navigator/critic/prompt builder; Codex bounded local executor; Local LLM future passive assistant; Mistral / Devstral future local assistant/dev capability, passive unless explicitly authorized; aucune activation agent, no auto-approval, workflow engine, autonomous loop or mutation without HumanGate. Pyramide Rocky IA joueur d’échecs: Engine world/rules/state/legal actions; Search décide as final tactical authority; Neural propose / rerank only and is not final authority; Evidence observations/logs/reports, not proof alone; HumanGate promotion/claim/activation authority. Pas de DecisionController activation, Chess960 activation, benchmark proof, model promotion, training ou chargement modèle. aucun effet système."
	return "Architecture active: %s. But: %s. Montre: %s. switch visuel local — aucun effet système; aucun bouton actif." % [
		String(_selected_layer_data.get("label", "Calque")),
		String(_selected_layer_data.get("purpose", "lecture passive")),
		", ".join(show_text),
	]

func _map_role_text(zone_data: Dictionary) -> String:
	var zone_id := String(zone_data.get("id", ""))
	var surface := String(zone_data.get("surface", "UNKNOWN"))
	if zone_id == "central_tree":
		return "arbre central TacticalChessPureLab, ancre lisible du jardin vivant propre"
	if zone_id == "humangate":
		return "sphère de feedback vivant au-dessus de l'arbre, source du feedback humain"
	if zone_id == "build_zone":
		return "Zone Build hors système: bac à sable de test, pas une branche Git réelle"
	if zone_id == "archive_zone":
		return "Zone Archive hors système: stockage symbolique, aucune action archive"
	if zone_id == "tool_zone":
		return "Zone Outils hors système: Godot / Codex / futurs logiciels, aucun lancement"
	if zone_id == "video_game_garden" or zone_id.begins_with("future_game_tree"):
		return "forêt de jeux, un arbre par jeu"
	if zone_id == "merle_audit_scout":
		return "merle auditeur: observation passive, hygiène, vérité, rapport vers feedback humain"
	if zone_id == "python_tools":
		return "poste d'observation passive lié au merle, dormant et non primaire"
	if zone_id == "architecture_layer" or zone_id == "roadmap_layer":
		return "marqueur de calque en lecture seule, sans contrôle de calque réel"
	return "zone du jardin pour le contexte %s" % surface

func _read_only_description(zone_data: Dictionary) -> String:
	var description := String(zone_data.get("description", ""))
	if description.begins_with("Zone de carte symbolique"):
		return description
	return "Zone de carte symbolique en lecture seule. %s" % description

func _merle_description(zone_data: Dictionary) -> String:
	var chain_items: Array = zone_data.get("chain", [])
	var chain_text := PackedStringArray()
	for item in chain_items:
		chain_text.append(String(item))
	return "Zone de carte symbolique en lecture seule. %s Chaîne passive: %s. Le merle n'exécute pas, ne mute pas, n'approuve pas, n'active pas d'agents, ne scanne pas les repos, n'entraîne pas et ne benchmarke pas." % [
		String(zone_data.get("description", "")),
		" -> ".join(chain_text)
	]
