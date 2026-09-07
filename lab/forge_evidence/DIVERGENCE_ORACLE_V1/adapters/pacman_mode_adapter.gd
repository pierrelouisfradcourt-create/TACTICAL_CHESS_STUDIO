# pacman_mode_adapter.gd — ADAPTATEUR (contrat divergence_probe.gd) pour le parametre
# `mode` de Pac-Man (games/pacman/05_SYSTEMS/settings/settings.gd, enum Mode).
#
# Fichier de PREUVE, hors games/** (jamais ecrit dans le produit gele) : reconstitue en
# GDScript externe ce que games/pacman/07_TESTS/oracle/v6_p1_mode_governs_lives.gd fait a
# la main (`_campagne`), pour le rejouer via l'oracle GENERIQUE `divergence_probe.gd`.
# Charge via un chemin DISQUE ABSOLU (verifie 2026-08-07 : `load()` d'un chemin disque
# fonctionne meme sous un `--path` different du dossier qui le contient) : ce fichier ne
# vit dans AUCUN projet Godot, il n'a besoin que du `--path` pointe sur le jeu cible pour
# resoudre ses propres `preload("res://...")`.
#
# Meme graine, meme bot, meme carte que v6_p1 (aucune divergence de protocole) :
# `State.initial(carte, 7, 0, {"mode": valeur})`, avance par `Bot.choisir_action`.
extends RefCounted

const MazeClass = preload("res://05_SYSTEMS/maze/maze.gd")
const ContentV2 = preload("res://06_RUNTIME/adapters/content_provider/content_provider.gd")
const State = preload("res://05_SYSTEMS/game_state/game_state.gd")
const Loop = preload("res://05_SYSTEMS/game_loop/game_loop.gd")
const Bot = preload("res://06_RUNTIME/adapters/solvability_bot/bot_driver.gd")
const Observable = preload("res://05_SYSTEMS/game_state/observable.gd")


static func _carte():
	return MazeClass.depuis_descripteur(ContentV2.descripteur(0))


static func etat_initial(graine: int, valeur) -> Variant:
	return State.initial(_carte(), graine, 0, {"mode": int(valeur)})


static func en_cours(etat) -> bool:
	return etat.statut == State.Statut.EN_COURS


static func avancer(etat) -> Variant:
	return Loop.step(etat, Bot.choisir_action(etat))["etat"]


static func projeter(etat) -> Dictionary:
	return Observable.projeter(etat)
