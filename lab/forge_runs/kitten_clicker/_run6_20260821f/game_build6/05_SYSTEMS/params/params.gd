# params.gd — BLOC UNIQUE des constantes equilibrables (game.params).
#
# Contrainte ratifiee Pierre 2026-07-28 : aucun litteral de gameplay hors de ce bloc.
# Tout ce qui classe/genere/calibre le jeu (seuils de paliers, gain au clic, couts, taux)
# vit ICI et nulle part ailleurs. La logique pure lit ces constantes ; elle n'en invente
# aucune.
#
# DETERMINISME : aucune source d'alea ni de temps. Le clicker n'a pas de RNG — sa
# reproductibilite est totale a etat egal.
extends RefCounted

# --- fenetre (le rendu s'y cale ; la pelote est au CENTRE, cible du clic injecte) ---
const SCREEN_W: int = 640
const SCREEN_H: int = 480
const WOOL_BALL_CENTER := Vector2(320, 240)
const WOOL_BALL_RADIUS: float = 72.0

# --- economie du clic ---
const CLICK_GAIN: float = 1.0            # gain de base d'un clic, STRICTEMENT positif

# --- chatons : cout croissant, production par chaton ---
const KITTEN_BASE_COST: float = 15.0
const KITTEN_COST_GROWTH: float = 1.15
const KITTEN_PROD_PER: float = 1.0       # ronrons/tick apportes par UN chaton

# --- ameliorations : cout croissant, pas de taux ---
const UPGRADE_BASE_COST: float = 100.0
const UPGRADE_COST_GROWTH: float = 1.6
const UPGRADE_STEP: float = 0.25         # +25 % de taux par palier d'amelioration

# --- prestige (meta-progression) ---
const PRESTIGE_MIN_PALIER: int = 1       # prestige autorise des le 1er palier franchi
const PRESTIGE_BONUS_PER: float = 0.5    # +50 % permanent (clic ET production) par prestige

# --- COURBE DE PALIERS : >=3 valeurs de seuil DISTINCTES et non triviales ---
# Regle de variance des metriques (ratifie Pierre 2026-07-21) : cette courbe classe la
# progression ; elle doit porter une information variable. 4 seuils, 4 valeurs distinctes.
# Le "3e palier" (index 2, seuil 1000) est la cible de solvabilite.
const PALIERS: Array = [50.0, 250.0, 1000.0, 5000.0]

# --- vocabulaire ferme du statut : le genre incremental n'a PAS de defaite ---
const STATUT_EN_COURS: String = "en_cours"

# --- noms des 4 evenements sonores (audio.cue via game.events) ---
const EV_CLICK: String = "click"
const EV_BUY: String = "buy"
const EV_UNLOCK: String = "unlock"
const EV_PRESTIGE: String = "prestige"

# --- chemins des registres de contenu (03_WORLD/rules) lus au boot ---
const REG_KITTENS: String = "res://03_WORLD/rules/kittens_registry/kittens.json"
const REG_PLACES: String = "res://03_WORLD/rules/places_registry/places.json"
const REG_OBJECTS: String = "res://03_WORLD/rules/objects_registry/objects.json"
const REG_QUESTS: String = "res://03_WORLD/rules/quests_registry/quests.json"

# --- cadence de tick du runtime (production passive), derivee ici, jamais dans l'adaptateur ---
const TICKS_PAR_SECONDE: int = 10
