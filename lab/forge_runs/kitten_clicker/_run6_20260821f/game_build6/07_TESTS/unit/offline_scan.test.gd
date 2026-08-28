# offline_scan.test.gd — INVARIANT HORS-LIGNE : aucun appel reseau dans 06_RUNTIME.
# Scan statique de TOUS les scripts .gd de 06_RUNTIME ; toute occurrence d'une API reseau
# est un finding. Controle POSITIF : le scan doit avoir REELLEMENT lu des scripts (>0),
# sinon un dossier vide passerait le test sans rien prouver.
extends RefCounted

const RACINE := "res://06_RUNTIME"

# APIs reseau interdites (jeu solo hors-ligne). Liste FERMEE.
const INTERDITS := [
	"HTTPRequest", "HTTPClient", "StreamPeerTCP", "TCPServer", "PacketPeerUDP",
	"UDPServer", "WebSocketPeer", "WebSocketMultiplayerPeer", "ENetConnection",
	"ENetMultiplayerPeer", "StreamPeerTLS",
]


func _lister_gd(dir: String, out: Array) -> void:
	var da := DirAccess.open(dir)
	if da == null:
		return
	da.list_dir_begin()
	var nom := da.get_next()
	while nom != "":
		var chemin := dir + "/" + nom
		if da.current_is_dir():
			if nom != "." and nom != "..":
				_lister_gd(chemin, out)
		elif nom.ends_with(".gd"):
			out.append(chemin)
		nom = da.get_next()
	da.list_dir_end()


func run(h) -> void:
	var fichiers: Array = []
	_lister_gd(RACINE, fichiers)
	# controle positif : le scan a bien trouve des scripts a examiner
	h.gt(fichiers.size(), 0, "offline: le scan a REELLEMENT lu des scripts 06_RUNTIME")

	var findings: Array = []
	for chemin in fichiers:
		var f := FileAccess.open(chemin, FileAccess.READ)
		if f == null:
			continue
		var txt := f.get_as_text()
		f.close()
		for token in INTERDITS:
			if txt.contains(token):
				findings.append("%s: %s" % [chemin, token])

	h.eq(findings.size(), 0, "offline: aucun appel reseau dans 06_RUNTIME (findings: %s)" % str(findings))
