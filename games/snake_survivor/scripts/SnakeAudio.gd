extends Node
# SnakeAudio.gd — Procedural SFX + generative music loop.
# No external audio assets — all synthesis via AudioStreamGenerator.
#
# PUBLIC API:
#   func play_sfx(name: String) -> void
#       names: "kill", "levelup", "constriction", "hit", "boss_phase"
#   func set_music_intensity(intensity: float) -> void  # 0.0 calm … 1.0 boss
#   func start_music() -> void
#   func stop_music() -> void

const SFX_POOL_SIZE := 4       # simultaneous SFX slots
const MUSIC_BUF_LEN := 0.15   # seconds of look-ahead buffer
const BPM := 96.0
const TAU := 2.0 * PI

# ── SFX pool ──────────────────────────────────────────────────────────────────
var _sfx_players: Array = []   # Array of AudioStreamPlayer
var _sfx_idx: int = 0          # round-robin index

# ── Music player ──────────────────────────────────────────────────────────────
var _music_player: AudioStreamPlayer
var _music_playback: AudioStreamGeneratorPlayback
var _music_running: bool = false
var _music_intensity: float = 0.0

# Music synthesis state
var _phase_bass: float = 0.0
var _phase_arp: float = 0.0
var _phase_hat: float = 0.0
var _beat_accum: float = 0.0         # accumulator in seconds
var _step: int = 0                   # current 16th-note step (0..15)
var _step_dur: float = 0.0           # seconds per 16th note
var _sample_rate: float = 44100.0

# Chord/bass tables (Am, F, C, G)
const BASS_FREQS := [110.0, 87.31, 130.81, 98.0]    # A2 F2 C3 G2
const CHORD_FREQS := [
	[220.0, 261.63, 329.63],   # Am
	[174.61, 220.0,  261.63],  # F
	[261.63, 329.63, 392.0],   # C
	[196.0,  246.94, 293.66],  # G
]

# One-shot SFX buffers (generated on demand)
var _sfx_buffers: Dictionary = {}   # name -> AudioStreamWAV

func _ready() -> void:
	_sample_rate = float(AudioServer.get_mix_rate())
	_step_dur = 60.0 / BPM / 4.0   # 16th note

	# Create SFX pool
	for i in range(SFX_POOL_SIZE):
		var gen := AudioStreamGenerator.new()
		gen.mix_rate = _sample_rate
		gen.buffer_length = 0.25
		var player := AudioStreamPlayer.new()
		player.stream = gen
		player.volume_db = -6.0
		add_child(player)
		_sfx_players.append(player)

	# Create music player
	var mgen := AudioStreamGenerator.new()
	mgen.mix_rate = _sample_rate
	mgen.buffer_length = MUSIC_BUF_LEN
	_music_player = AudioStreamPlayer.new()
	_music_player.stream = mgen
	_music_player.volume_db = -10.0
	add_child(_music_player)

# ── PUBLIC API ────────────────────────────────────────────────────────────────

func start_music() -> void:
	if _music_running:
		return
	_music_running = true
	_music_player.play()
	_music_playback = _music_player.get_stream_playback() as AudioStreamGeneratorPlayback

func stop_music() -> void:
	_music_running = false
	_music_player.stop()

func set_music_intensity(intensity: float) -> void:
	_music_intensity = clampf(intensity, 0.0, 1.0)

func play_sfx(sfx_name: String) -> void:
	var frames: PackedVector2Array = _gen_sfx(sfx_name)
	if frames.is_empty():
		return
	# Pick next available player (round-robin)
	for _try in range(SFX_POOL_SIZE):
		var player: AudioStreamPlayer = _sfx_players[_sfx_idx]
		_sfx_idx = (_sfx_idx + 1) % SFX_POOL_SIZE
		if not player.playing:
			player.play()
			var pb: AudioStreamGeneratorPlayback = player.get_stream_playback() as AudioStreamGeneratorPlayback
			if pb != null:
				pb.push_buffer(frames)
			return
	# All busy — use first anyway
	var player: AudioStreamPlayer = _sfx_players[0]
	player.stop()
	player.play()
	var pb: AudioStreamGeneratorPlayback = player.get_stream_playback() as AudioStreamGeneratorPlayback
	if pb != null:
		pb.push_buffer(frames)

# ── _process: fill music buffer ───────────────────────────────────────────────

func _process(delta: float) -> void:
	if not _music_running or _music_playback == null:
		return
	var frames_avail: int = _music_playback.get_frames_available()
	if frames_avail <= 0:
		return

	var out := PackedVector2Array()
	out.resize(frames_avail)

	var dt: float = 1.0 / _sample_rate
	var intensity: float = _music_intensity

	for i in range(frames_avail):
		_beat_accum += dt
		# Advance sequencer step
		if _beat_accum >= _step_dur:
			_beat_accum -= _step_dur
			_step = (_step + 1) % 16

		var chord_idx: int = (_step / 4) % 4
		var bass_freq: float = BASS_FREQS[chord_idx]
		var arp_freq: float = CHORD_FREQS[chord_idx][_step % 3]

		# Bass: sawtooth, always present but volume scales with time
		var bass_vol: float = 0.18 + intensity * 0.18
		_phase_bass += bass_freq * dt * TAU
		if _phase_bass > TAU:
			_phase_bass -= TAU
		var bass_sample: float = (fmod(_phase_bass, TAU) / PI - 1.0) * bass_vol   # sawtooth

		# Arp: triangle, fades in with intensity
		var arp_vol: float = maxf(0.0, intensity - 0.15) * 0.22
		# At high intensity, arp plays at double speed feel
		var arp_freq_mod: float = arp_freq * (1.0 + intensity * 0.5)
		_phase_arp += arp_freq_mod * dt * TAU
		if _phase_arp > TAU:
			_phase_arp -= TAU
		var t_tri: float = _phase_arp / TAU
		var arp_sample: float = (1.0 - absf(t_tri * 4.0 - 2.0 - floorf(t_tri * 2.0) * 2.0)) * arp_vol

		# Hi-hat: bandpass noise, only at high intensity
		var hat_vol: float = maxf(0.0, intensity - 0.5) * 0.12
		# Simple LFSR-style noise approximation (deterministic pseudo-noise)
		_phase_hat += 7919.0 * dt * TAU   # prime freq
		if _phase_hat > TAU:
			_phase_hat -= TAU
		var hat_noise: float = sin(_phase_hat * 37.0) * sin(_phase_hat * 53.0) * hat_vol
		# Gate hat to even 8th notes
		var hat_gate: float = 1.0 if ((_step % 2) == 1) else 0.0
		hat_noise *= hat_gate

		var sample: float = clampf(bass_sample + arp_sample + hat_noise, -1.0, 1.0)
		out[i] = Vector2(sample, sample)

	_music_playback.push_buffer(out)

# ── SFX synthesis ─────────────────────────────────────────────────────────────

func _gen_sfx(sfx_name: String) -> PackedVector2Array:
	match sfx_name:
		"kill":
			return _sfx_blip(440.0, 880.0, 0.08, 0.08)
		"levelup":
			return _sfx_chord_rise([523.25, 659.25, 783.99], 0.14, 0.35)
		"constriction":
			return _sfx_boom(80.0, 38.0, 0.22, 0.30)
		"hit":
			return _sfx_blip(220.0, 110.0, 0.06, 0.10)
		"boss_phase":
			return _sfx_sweep(110.0, 440.0, 0.40, 0.20)
	return PackedVector2Array()

# Short frequency sweep (blip)
func _sfx_blip(freq_start: float, freq_end: float, duration: float, vol: float) -> PackedVector2Array:
	var n: int = int(_sample_rate * duration)
	var out := PackedVector2Array()
	out.resize(n)
	var phase: float = 0.0
	for i in range(n):
		var t: float = float(i) / float(n)
		var freq: float = lerpf(freq_start, freq_end, t)
		phase += freq / _sample_rate * TAU
		if phase > TAU:
			phase -= TAU
		var env: float = (1.0 - t) * vol
		var sample: float = sin(phase) * env
		out[i] = Vector2(sample, sample)
	return out

# Ascending chord (levelup ding)
func _sfx_chord_rise(freqs: Array, note_dur: float, vol: float) -> PackedVector2Array:
	var total: int = int(_sample_rate * note_dur * float(freqs.size()))
	var out := PackedVector2Array()
	out.resize(total)
	var fi: int = 0
	for freq in freqs:
		var n: int = int(_sample_rate * note_dur)
		var phase: float = 0.0
		for i in range(n):
			var t: float = float(i) / float(n)
			phase += freq / _sample_rate * TAU
			if phase > TAU:
				phase -= TAU
			var env: float = (1.0 - t * t) * vol
			var sample: float = sin(phase) * env
			if fi < total:
				out[fi] = Vector2(sample, sample)
			fi += 1
	return out

# Low boom (constriction)
func _sfx_boom(freq_start: float, freq_end: float, duration: float, vol: float) -> PackedVector2Array:
	var n: int = int(_sample_rate * duration)
	var out := PackedVector2Array()
	out.resize(n)
	var phase_tone: float = 0.0
	var phase_noise: float = 0.0
	for i in range(n):
		var t: float = float(i) / float(n)
		var freq: float = lerpf(freq_start, freq_end, t * t)   # exponential drop
		phase_tone += freq / _sample_rate * TAU
		if phase_tone > TAU:
			phase_tone -= TAU
		phase_noise += 8000.0 / _sample_rate * TAU
		if phase_noise > TAU:
			phase_noise -= TAU
		var env: float = (1.0 - t) * (1.0 - t) * vol
		var tone: float = sin(phase_tone) * env
		# Noise burst: pseudo-noise via high-freq sine multiplication
		var noise: float = sin(phase_noise * 31.7) * sin(phase_noise * 47.3) * env * 0.4
		var sample: float = clampf(tone + noise, -1.0, 1.0)
		out[i] = Vector2(sample, sample)
	return out

# Dramatic frequency sweep (boss_phase)
func _sfx_sweep(freq_start: float, freq_end: float, duration: float, vol: float) -> PackedVector2Array:
	var n: int = int(_sample_rate * duration)
	var out := PackedVector2Array()
	out.resize(n)
	var phase: float = 0.0
	for i in range(n):
		var t: float = float(i) / float(n)
		var freq: float = lerpf(freq_start, freq_end, t)
		phase += freq / _sample_rate * TAU
		if phase > TAU:
			phase -= TAU
		# Sawtooth for edgier sound
		var saw: float = (fmod(phase, TAU) / PI - 1.0)
		var env: float = (1.0 - t * 0.7) * vol
		var sample: float = saw * env
		out[i] = Vector2(sample, sample)
	return out
