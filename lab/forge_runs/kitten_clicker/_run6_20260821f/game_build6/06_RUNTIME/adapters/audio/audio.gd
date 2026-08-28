# audio.gd — ADAPTATEUR AUDIO PROCEDURAL. Un son DISTINCT par evenement de jeu, ENTIEREMENT
# genere a l'execution : aucun fichier audio n'entre dans le depot (invariant ZERO ASSET).
#
# REUSE = CONCEPT (games/pacman/06_RUNTIME/adapters/audio/audio.gd, comme
# games/bomberman_3d/.../audio.gd) : synthese par AudioStreamGenerator a partir d'un
# descripteur, plus un JOURNAL des declenchements — sans ce journal, "un son a ete joue"
# n'aurait aucun observateur en headless. Copie VERBATIM ecartee a dessein : le fichier
# Pacman precharge `sound_bank.gd` et `settings.gd`, deux fichiers que la wiremap gelee de
# kitten_clicker NE declare PAS ; les importer serait ecrire hors carte (garde-fou a). La
# banque de cues est donc INLINE ici, self-contained, adaptee aux 4 evenements du clicker.
#
# SEULE couche a connaitre une API audio de plateforme (AudioStreamGenerator,
# AudioStreamPlayer, AudioServer) : c'est ce qui donne au comptage statique de purete son
# controle positif. AUCUNE decision de jeu ici : l'adaptateur REÇOIT des evenements nommes.
extends Node

const P = preload("res://05_SYSTEMS/params/params.gd")

# API audio de plateforme referencees ici (controle positif du scan de purete).
const API_PLATEFORME: Array = ["AudioStreamGenerator", "AudioStreamPlayer", "AudioServer"]

const FREQUENCE: int = 22050
const TAMPON_S: float = 0.5

# Formes d'onde.
const ONDE_SINUS: int = 0
const ONDE_CARREE: int = 1
const ONDE_TRIANGLE: int = 2

# BANQUE DE CUES : un descripteur DISTINCT par evenement. Quatre timbres deux a deux
# differents (onde + hauteur), ce qui garantit 4 identifiants sonores distincts.
const CUES: Dictionary = {
	P.EV_CLICK:    {"onde": ONDE_TRIANGLE, "hz": 660.0, "duree_ms": 90,  "gain": 0.35},
	P.EV_BUY:      {"onde": ONDE_SINUS,    "hz": 440.0, "duree_ms": 140, "gain": 0.40},
	P.EV_UNLOCK:   {"onde": ONDE_CARREE,   "hz": 880.0, "duree_ms": 200, "gain": 0.30},
	P.EV_PRESTIGE: {"onde": ONDE_SINUS,    "hz": 330.0, "duree_ms": 320, "gain": 0.45},
}

# JOURNAL des declenchements : {cue, tick, vises, frames}. C'est l'artefact observable en
# headless. STATIQUE pour qu'un oracle qui charge main.tscn puisse le relire.
static var journal: Array = []

var _joueur: AudioStreamPlayer = null


static func reinitialiser() -> void:
	journal = []


func _ready() -> void:
	_joueur = AudioStreamPlayer.new()
	var gen := AudioStreamGenerator.new()
	gen.mix_rate = float(FREQUENCE)
	gen.buffer_length = TAMPON_S
	_joueur.stream = gen
	add_child(_joueur)
	_joueur.play()


# Un descripteur de cue existe-t-il pour ce nom ?
static func connait(cue: String) -> bool:
	return CUES.has(cue)


# Valeur d'onde a une phase donnee. PURE, sans etat : verifiable hors moteur.
static func echantillon(onde: int, phase: float) -> float:
	var f: float = fmod(phase, 1.0)
	match onde:
		ONDE_CARREE:
			return 1.0 if f < 0.5 else -1.0
		ONDE_TRIANGLE:
			return 4.0 * absf(f - 0.5) - 1.0
		_:
			return sin(TAU * f)


# Nombre d'echantillons VISES pour un cue (calcul pur, independant du peripherique).
static func vises(cue: String) -> int:
	if not CUES.has(cue):
		return 0
	var d: Dictionary = CUES[cue]
	return int(float(d["duree_ms"]) * float(FREQUENCE) / 1000.0)


# DECLENCHE un son nomme : synthetise et pousse les frames si un playback existe, journalise
# TOUJOURS la demande (cue + tick + vises + frames reellement poussees). Rend les frames
# poussees. Un cue inconnu ne journalise rien et rend 0 (garde).
func jouer(cue: String, tick: int) -> int:
	if not CUES.has(cue):
		return 0
	var d: Dictionary = CUES[cue]
	var cible: int = vises(cue)
	var pousses: int = 0
	if _joueur != null:
		var pb = _joueur.get_stream_playback()
		if pb != null:
			var libres: int = pb.get_frames_available()
			var n: int = mini(cible, libres)
			var pas: float = float(d["hz"]) / float(FREQUENCE)
			var gain: float = float(d["gain"])
			for i in range(n):
				var t: float = float(i) / float(maxi(1, cible))
				var env: float = 1.0 - t
				var v: float = echantillon(int(d["onde"]), float(i) * pas) * gain * env
				pb.push_frame(Vector2(v, v))
			pousses = n
	journal.append({"cue": cue, "tick": tick, "vises": cible, "frames": pousses})
	return pousses


# Consomme une liste d'evenements NOMMES et declenche le son de chacun. Rend le nombre de
# sons declenches. C'est le point de branchement logique -> audio (evenements du JEU).
func consommer(events: Array, tick: int) -> int:
	var n: int = 0
	for e in events:
		var cue: String = String(e)
		if CUES.has(cue):
			jouer(cue, tick)
			n += 1
	return n
