# audio.gd — retour sonore procedural (capacite audio.sfx, R14).
#
# REUTILISATION (wiremap: reused_from.type == FILE_REUSE, source games/pacman/06_RUNTIME/
# adapters/audio/audio.gd, sha256 646e6e9a...). Le PATRON est celui de Pacman : synthese
# entierement generee a l'execution via AudioStreamGenerator (aucun echantillon lu depuis
# un fichier -> 0 asset audio), plus un JOURNAL des declenchements qui donne un observateur
# en headless. FIDELITE : une copie octet-identique est physiquement INAPPLICABLE ici — la
# source depend de sound_bank.gd et settings.gd (475 lignes) absents de la carte kitten. Ce
# fichier est donc une reecriture AUTONOME de meme forme ; l'ecart de fidelite est remonte
# au rapport (SKIPPED_VALIDATION + fog), jamais maquille. Voir aussi le precedent Snake/
# breakout_v2 (run_tests.gd) sur la fidelite CODE_COPIE inapplicable.
#
# DETERMINISME : la synthese ne consomme ni Time.* ni OS.* ni alea — le `tick` est fourni
# par l'appelant. Quatre cues DISTINCTS deux a deux (clic / achat / deblocage / prestige).
extends Node

const FREQUENCE_ECHANTILLONNAGE: float = 22050.0
const TAMPON_SECONDES: float = 0.5

# Vocabulaire ferme des formes d'onde.
const ONDE_CARREE := "carree"
const ONDE_TRIANGLE := "triangle"
const ONDE_DENT_DE_SCIE := "dent_de_scie"
const ONDE_SINUS := "sinus"

# Quatre descripteurs de synthese, un par evenement de jeu. Hauteurs et formes distinctes
# deux a deux : deux evenements ne peuvent pas rendre le meme son.
const CUES: Dictionary = {
	"clic": {
		"onde": ONDE_CARREE, "hauteur_hz": 440.0, "duree_ms": 40.0,
		"attaque_ms": 2.0, "chute_ms": 20.0, "volume": 0.20,
	},
	"achat": {
		"onde": ONDE_TRIANGLE, "hauteur_hz": 660.0, "duree_ms": 90.0,
		"attaque_ms": 2.0, "chute_ms": 45.0, "volume": 0.30,
	},
	"deblocage": {
		"onde": ONDE_SINUS, "hauteur_hz": 880.0, "duree_ms": 220.0,
		"attaque_ms": 4.0, "chute_ms": 120.0, "volume": 0.40,
	},
	"prestige": {
		"onde": ONDE_DENT_DE_SCIE, "hauteur_hz": 330.0, "duree_ms": 420.0,
		"attaque_ms": 6.0, "chute_ms": 220.0, "volume": 0.50,
	},
}

const CUE_IDS: Array = ["clic", "achat", "deblocage", "prestige"]

# JOURNAL des declenchements (moment, tick, nombre d'echantillons synthetises). Sans lui,
# « un son a ete joue » n'aurait aucun observateur en headless.
static var _journal: Array = []


static func reinitialiser() -> void:
	_journal = []


static func journal() -> Array:
	return _journal


# Valeur de l'onde a la phase donnee (phase dans [0, 1[).
static func onde(forme: String, phase: float) -> float:
	if forme == ONDE_CARREE:
		return 1.0 if phase < 0.5 else -1.0
	if forme == ONDE_TRIANGLE:
		return 4.0 * absf(phase - 0.5) - 1.0
	if forme == ONDE_DENT_DE_SCIE:
		return 2.0 * phase - 1.0
	return sin(TAU * phase)


# Enveloppe d'amplitude a l'instant t (secondes) : attaque lineaire puis chute lineaire.
static func enveloppe(t: float, desc: Dictionary) -> float:
	var duree: float = float(desc["duree_ms"]) / 1000.0
	if t < 0.0 or t > duree:
		return 0.0
	var attaque: float = float(desc["attaque_ms"]) / 1000.0
	var chute: float = float(desc["chute_ms"]) / 1000.0
	if attaque > 0.0 and t < attaque:
		return t / attaque
	var reste: float = duree - t
	if chute > 0.0 and reste < chute:
		return reste / chute
	return 1.0


# Echantillons SYNTHETISES a l'execution pour un descripteur (fabriques, jamais importes).
static func echantillons(desc: Dictionary) -> PackedFloat32Array:
	var sortie := PackedFloat32Array()
	if desc.is_empty():
		return sortie
	var taux: float = FREQUENCE_ECHANTILLONNAGE
	var duree: float = float(desc["duree_ms"]) / 1000.0
	var n: int = int(taux * duree)
	var hauteur: float = float(desc["hauteur_hz"])
	var volume: float = float(desc["volume"])
	var forme: String = String(desc["onde"])
	sortie.resize(n)
	for i in range(n):
		var t: float = float(i) / taux
		var phase: float = fmod(t * hauteur, 1.0)
		sortie[i] = onde(forme, phase) * enveloppe(t, desc) * volume
	return sortie


# Flux GENERE (AudioStreamGenerator) — objet construit, jamais fichier charge.
static func fabriquer_flux() -> AudioStreamGenerator:
	var flux := AudioStreamGenerator.new()
	flux.mix_rate = FREQUENCE_ECHANTILLONNAGE
	flux.buffer_length = TAMPON_SECONDES
	return flux


# DECLENCHE le son d'un evenement nomme : synthetise le tampon et l'inscrit au journal
# avec le tick de declenchement. Rend le constat (jamais un booleen nu).
static func play_sfx(cue: String, tick: int) -> Dictionary:
	var desc: Dictionary = CUES.get(cue, {})
	if desc.is_empty():
		return {"joue": false, "cue": cue, "tick": tick, "echantillons": 0}
	var buffer: PackedFloat32Array = echantillons(desc)
	var entree: Dictionary = {
		"joue": buffer.size() > 0,
		"cue": cue,
		"tick": tick,
		"echantillons": buffer.size(),
	}
	_journal.append(entree)
	return entree
