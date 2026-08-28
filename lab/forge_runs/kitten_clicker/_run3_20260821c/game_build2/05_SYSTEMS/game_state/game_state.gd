# game_state.gd — ORIGINE UNIQUE de l'etat de jeu (module `game_state`, blueprint s4-archi).
#
# L'instance de cette classe EST l'etat : elle porte les champs, sait se cloner et derive
# `gain_par_clic`. Les fonctions STATIQUES `initial`/`tick`/`project` composent les systemes
# purs dans un ordre FIGE. Logique PURE : aucune scene, aucun noeud, aucun Input, aucun rendu,
# aucune horloge de plateforme (le pas de temps `dt` est REMIS en argument). Ne mute jamais
# son entree : `tick` clone puis rend un nouvel etat (garde-fou determinisme + immutabilite).
#
# Dependances (blueprint) : purr_action, economy, prestige, collection, offline_gains,
# bonus_event. Ces systemes ne connaissent PAS game_state (dependances a sens unique) : ils
# recoivent l'etat en argument non type et appellent ses methodes (`clone`, `gain_par_clic`).
extends RefCounted

const Economy = preload("res://05_SYSTEMS/economy/economy.gd")
const Collection = preload("res://05_SYSTEMS/collection/collection.gd")
const BonusEvent = preload("res://05_SYSTEMS/bonus_event/bonus_event.gd")

# --- Constantes structurelles du bloc etat (valeurs de base non economiques) ---
# Les literaux ECONOMIQUES (couts, taux, seuil de prestige, plafond hors-ligne, fenetre de
# bonus) vivent chacun dans le systeme QUI en est proprietaire (economy/prestige/offline_gains/
# bonus_event/collection), jamais disperses ici. Aucun bloc `params` central n'est declare par
# la carte de ce jeu : la propriete est distribuee par systeme (voir rapport, note de fog).
const GAIN_DE_BASE: float = 1.0          # gain de caresse de base, avant multiplicateur de prestige
const MULT_PRESTIGE_INITIAL: float = 1.0 # multiplicateur permanent au premier demarrage

# --- Champs de l'etat ---
var purrs: float = 0.0                    # compteur de ronrons (caresses accumulees)
var base_gain: float = GAIN_DE_BASE       # gain de base par clic
var prestige_mult: float = MULT_PRESTIGE_INITIAL  # multiplicateur permanent (>=1), monte au prestige
var producer_counts: Array = []           # [int] par type de producteur (indices d'economy)
var collection_unlocked: Array = []       # [bool] par chaton (indices de collection) — add-only
var bonus_factor: float = 1.0             # facteur de gain temporaire de l'objet-bonus (1 = inactif)
var bonus_expiry_s: float = -1.0          # temps de fin d'effet du bonus (<= time_s => inactif)
var time_s: float = 0.0                   # temps de simulation accumule (pas de temps remis)
var seed_value: int = 1                   # graine (planning deterministe du bonus)
var tick_index: int = 0                   # numero de tick (diagnostic/determinisme)
var last_offline_gain: float = 0.0        # dernier gain hors-ligne applique (0 si aucun)

# Gain reellement applique par une caresse : derive de la base et du multiplicateur de prestige
# portes par l'etat. Strictement positif tant que base_gain>0 et prestige_mult>=1.
func gain_par_clic() -> float:
	return base_gain * prestige_mult

func clone() -> RefCounted:
	var c = get_script().new()
	c.purrs = purrs
	c.base_gain = base_gain
	c.prestige_mult = prestige_mult
	c.producer_counts = producer_counts.duplicate()
	c.collection_unlocked = collection_unlocked.duplicate()
	c.bonus_factor = bonus_factor
	c.bonus_expiry_s = bonus_expiry_s
	c.time_s = time_s
	c.seed_value = seed_value
	c.tick_index = tick_index
	c.last_offline_gain = last_offline_gain
	return c

# Fabrique l'etat initial deterministe pour une graine. Le roster des producteurs et des
# chatons est demande aux systemes proprietaires (jamais recopie ici).
static func initial(graine: int) -> RefCounted:
	var s = load("res://05_SYSTEMS/game_state/game_state.gd").new()
	s.purrs = 0.0
	s.base_gain = GAIN_DE_BASE
	s.prestige_mult = MULT_PRESTIGE_INITIAL
	s.producer_counts = Economy.producer_counts_initial()
	s.collection_unlocked = Collection.unlocked_initial()
	s.bonus_factor = 1.0
	s.bonus_expiry_s = -1.0
	s.time_s = 0.0
	s.seed_value = graine
	s.tick_index = 0
	s.last_offline_gain = 0.0
	# Un chaton peut etre debloque des le depart (seuil 0) : appliquer les seuils au demarrage.
	return Collection.refresh_unlocks(s)

# Compose UN pas de temps dans un ordre fige et rend un NOUVEL etat :
#   1) avancer le temps de dt ;
#   2) appliquer la production passive (taux d'economy) sur dt, modulee par le facteur de bonus ;
#   3) faire expirer l'objet-bonus si sa fenetre d'effet est passee ;
#   4) reprojeter les deblocages de collection (add-only) selon le nouveau total.
# Ne mute jamais l'entree.
static func tick(state, dt: float) -> RefCounted:
	var s = state.clone()
	if dt < 0.0:
		dt = 0.0
	s.time_s += dt
	s.tick_index += 1
	var taux: float = Economy.passive_rate(s)
	s.purrs += taux * dt * s.bonus_factor
	s = BonusEvent.advance(s)
	s = Collection.refresh_unlocks(s)
	return s

# Releve OBSERVABLE pur : la seule vue que lisent les adaptateurs de presentation et le
# debug_probe. Ne contient que des grandeurs projetees (aucune reference a un noeud).
# Les entrees de collection (id, rarete, etat) sont projetees ici pour que gallery_view les
# lise sans importer le module collection (dep: game_state seul, blueprint).
static func project(state) -> Dictionary:
	var entries: Array = []
	for i in range(state.collection_unlocked.size()):
		entries.append({
			"id": Collection.KITTEN_IDS[i],
			"rarity": Collection.KITTEN_RARITY[i],
			"unlocked": state.collection_unlocked[i],
		})
	return {
		"collection_entries": entries,
		"purrs": state.purrs,
		"gain_par_clic": state.gain_par_clic(),
		"prestige_mult": state.prestige_mult,
		"producer_counts": state.producer_counts.duplicate(),
		"passive_rate": Economy.passive_rate(state),
		"bonus_factor": state.bonus_factor,
		"bonus_active": BonusEvent.is_active(state),
		"collection_unlocked": state.collection_unlocked.duplicate(),
		"collection_size": Collection.unlocked_count(state),
		"collection_total": state.collection_unlocked.size(),
		"time_s": state.time_s,
		"tick_index": state.tick_index,
		"last_offline_gain": state.last_offline_gain,
		"game_over": false,
	}

# Route la caresse (delegue au systeme pur purr_action). Point de composition unique pour
# l'input_adapter, qui n'appelle jamais bonus_event directement (deps: game_state).
static func click_bonus(state) -> RefCounted:
	return BonusEvent.click_bonus(state)
