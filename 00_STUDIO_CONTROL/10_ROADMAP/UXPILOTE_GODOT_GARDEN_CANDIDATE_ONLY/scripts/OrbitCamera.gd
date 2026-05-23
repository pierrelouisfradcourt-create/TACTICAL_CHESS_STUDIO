extends Camera3D
class_name OrbitCamera

@export var target: Vector3 = Vector3(0.0, 0.4, 0.0)
@export var distance: float = 22.0
@export var min_distance: float = 5.0
@export var max_distance: float = 34.0
@export var orbit_speed: float = 0.01
@export var pan_speed: float = 0.018
@export var zoom_step: float = 1.0

var _yaw: float = 0.0
var _pitch: float = -0.68
var _drag_button: int = 0

func _ready() -> void:
	reset_view()

func reset_view() -> void:
	target = Vector3(0.8, 1.15, 0.6)
	distance = 27.5
	_yaw = 0.46
	_pitch = -0.74
	_update_transform()

func focus_on_zone(zone_position: Vector3, zone_data: Dictionary) -> void:
	var weight := float(zone_data.get("scale_or_weight", 1.0))
	var shape := String(zone_data.get("shape", "bed"))
	var height_bias := 0.92
	if shape == "tree":
		height_bias = 2.2
	elif shape == "feedback_sphere":
		height_bias = 0.35
	elif shape == "merle":
		height_bias = 0.72
	target = zone_position + Vector3(0.0, max(0.55, weight * height_bias), 0.0)
	distance = clamp(max(7.5, weight * 5.4), min_distance, max_distance)
	_pitch = -0.68
	_update_transform()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_R:
		reset_view()
		get_viewport().set_input_as_handled()

	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			distance = max(min_distance, distance - zoom_step)
			_update_transform()
			get_viewport().set_input_as_handled()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			distance = min(max_distance, distance + zoom_step)
			_update_transform()
			get_viewport().set_input_as_handled()
		elif event.button_index in [MOUSE_BUTTON_LEFT, MOUSE_BUTTON_RIGHT, MOUSE_BUTTON_MIDDLE]:
			_drag_button = event.button_index if event.pressed else 0

	if event is InputEventMouseMotion and _drag_button != 0:
		if _drag_button == MOUSE_BUTTON_LEFT:
			_yaw -= event.relative.x * orbit_speed
			_pitch = clamp(_pitch - event.relative.y * orbit_speed, -1.25, -0.18)
		else:
			var right := global_transform.basis.x
			var forward := -global_transform.basis.z
			forward.y = 0.0
			forward = forward.normalized()
			target -= right * event.relative.x * pan_speed
			target += forward * event.relative.y * pan_speed
		_update_transform()
		get_viewport().set_input_as_handled()

func _update_transform() -> void:
	var offset := Vector3(
		sin(_yaw) * cos(_pitch),
		-sin(_pitch),
		cos(_yaw) * cos(_pitch)
	) * distance
	global_position = target + offset
	look_at(target, Vector3.UP)
