# audio.gd — adaptateur audio AUTO-CONTENU. Son ENTIEREMENT GENERE a l'execution
# (AudioStreamGenerator) : ZERO fichier audio dans le depot.
#
# DERIVE DE (provenance, pas copie octet-identique) : la TECHNIQUE de synthese de
# games/pacman/06_RUNTIME/adapters/audio/audio.gd — meme moteur (onde/enveloppe/
# echantillons/journal, AudioStreamGenerator). Une copie octet-identique (CODE_COPIE)
# etait impossible sur la carte gelee : l'original precharge deux dependances pacman
# (sound_bank.gd, settings.gd -> params.gd) qu'AUCUNE ligne de la wiremap ne declare
# (les deposer serait un ecrit hors-carte, orphelins refuses par check_index), et son
# vocabulaire de sons (6 moments pacman) ne porte pas les 4 evenements d'un clicker.
# Ce fichier est donc SELF-CONTAINED : descripteurs inlines pour les 4 evenements
# (clic, achat, deblocage, prestige), sans aucune dependance hors 06_RUNTIME. Ecart
# CODE_COPIE remonte au rapport (SKIPPED_VALIDATION + FOG), jamais maquille.
extends RefCounted

const FREQUENCE := 22050.0
const TAMPON := 0.5

# 4 DESCRIPTEURS DISTINCTS deux a deux : un son propre par evenement (aucun son partage).
const DESCRIPTEURS := {
	"clic":      {"onde": "carree",   "hz": 440.0, "duree_ms": 40.0,  "attaque_ms": 1.0, "chute_ms": 20.0,  "volume": 0.25},
	"achat":     {"onde": "triangle", "hz": 660.0, "duree_ms": 90.0,  "attaque_ms": 2.0, "chute_ms": 45.0,  "volume": 0.35},
	"deblocage": {"onde": "sinus",    "hz": 880.0, "duree_ms": 160.0, "attaque_ms": 4.0, "chute_ms": 90.0,  "volume": 0.40},
	"prestige":  {"onde": "dent",     "hz": 330.0, "duree_ms": 320.0, "attaque_ms": 6.0, "chute_ms": 180.0, "volume": 0.45},
}
const EVENEMENTS := ["clic", "achat", "deblocage", "prestige"]

# Journal des declenchements : un observateur en headless (aucun haut-parleur ne temoigne).
static var _journal: Array = []
static var _lecteur: AudioStreamPlayer = null

static func reinitialiser() -> void:
	_journal = []

static func journal() -> Array:
	return _journal

# Valeur d'onde a la phase donnee (phase dans [0,1[).
static func onde(forme: String, phase: float) -> float:
	if forme == "carree":
		return 1.0 if phase < 0.5 else -1.0
	if forme == "triangle":
		return 4.0 * absf(phase - 0.5) - 1.0
	if forme == "dent":
		return 2.0 * phase - 1.0
	return sin(TAU * phase)

# Enveloppe d'amplitude a l'instant t (attaque lineaire, chute lineaire). Deterministe.
static func enveloppe(t: float, d: Dictionary) -> float:
	var duree := float(d["duree_ms"]) / 1000.0
	if t < 0.0 or t > duree:
		return 0.0
	var a := float(d["attaque_ms"]) / 1000.0
	var c := float(d["chute_ms"]) / 1000.0
	if a > 0.0 and t < a:
		return t / a
	var reste := duree - t
	if c > 0.0 and reste < c:
		return reste / c
	return 1.0

# Echantillons SYNTHETISES a l'execution pour un descripteur.
static func echantillons(d: Dictionary) -> PackedFloat32Array:
	var out := PackedFloat32Array()
	if d.is_empty():
		return out
	var n := int(FREQUENCE * float(d["duree_ms"]) / 1000.0)
	out.resize(n)
	for i in range(n):
		var t := float(i) / FREQUENCE
		var phase := fmod(t * float(d["hz"]), 1.0)
		out[i] = onde(String(d["onde"]), phase) * enveloppe(t, d) * float(d["volume"])
	return out

# Flux GENERE (AudioStream de plateforme), jamais un fichier importe.
static func fabriquer_flux() -> AudioStreamGenerator:
	var f := AudioStreamGenerator.new()
	f.mix_rate = FREQUENCE
	f.buffer_length = TAMPON
	return f

# Branche un lecteur reel sur un parent de scene et demarre la lecture. En l'absence de
# parent (contexte pur), rien n'est branche : la synthese a quand meme eu lieu.
static func brancher_lecteur(parent: Node) -> AudioStreamPlayer:
	if parent == null:
		return null
	var l := AudioStreamPlayer.new()
	l.stream = fabriquer_flux()
	parent.add_child(l)
	if l.is_inside_tree():
		l.play()
	_lecteur = l
	return l

# Pousse le tampon synthetise dans le playback de plateforme (chemin de lecture reel).
static func pousser(buffer: PackedFloat32Array) -> int:
	if _lecteur == null or not _lecteur.playing:
		return 0
	var pb = _lecteur.get_stream_playback()
	if pb == null:
		return 0
	var pousses := 0
	for v in buffer:
		if pb.get_frames_available() <= 0:
			break
		pb.push_frame(Vector2(v, v))
		pousses += 1
	return pousses

# DECLENCHE le son d'un evenement : synthese + journal (identifiant de son propre a
# l'evenement). Rend le constat, jamais un booleen nu.
static func jouer(evenement: String, tick: int) -> Dictionary:
	var d: Dictionary = DESCRIPTEURS.get(evenement, {})
	var buf := echantillons(d)
	var entree := {
		"evenement": evenement,
		"son_id": evenement,
		"tick": tick,
		"echantillons": buf.size(),
		"frames": pousser(buf),
	}
	_journal.append(entree)
	return entree

# core.audio : consomme une liste d'evenements d'un tick, chacun sur SON son propre.
static func consommer(evenements: Array, tick: int) -> void:
	for e in evenements:
		jouer(String(e), tick)

# Identifiants de son DISTINCTS observes dans le journal (attendu : 4).
static func sons_distincts() -> Array:
	var vus: Array = []
	for e in _journal:
		if not vus.has(e["son_id"]):
			vus.append(e["son_id"])
	return vus
