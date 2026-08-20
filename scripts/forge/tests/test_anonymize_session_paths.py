# -*- coding: utf-8 -*-
"""Anonymisation CIBLEE de `session_file` dans les artefacts Observer (GO Pierre 2026-08-18).

PRINCIPE RATIFIE : ne pas supprimer une information parce qu'elle est PERSONNELLE si elle
constitue une PREUVE ; anonymiser ce qui est personnel ET sans fonction probatoire.

CADRAGE MESURE, quatre verifications toutes favorables :
  · AUCUNE ligne portant un chemin n'est signee (0 sur 1848 pour tetris, 0 sur 4152 pour
    breakout_v2) -> aucune signature ne peut casser ;
  · `session_file` est ECRIT (`observer/adapters/transcripts.py:313`, `observer/prompt.py:355`)
    et JAMAIS RELU -> 0 lecture de la cle dans tout `scripts/` hors tests ;
  · aucune preuve, aucun hash, aucune reference n'en depend — le seul consommateur de ces
    artefacts (`runtime_inventory_oracle.py:36`) en extrait les `capability_role` ;
  · perimetre : 8 fichiers, 122 occurrences.

CE QUI NE DOIT PAS ETRE TOUCHE, et c'est l'objet de la moitie de ces tests :
  · `proof_chain.binaire.path` et `command_executee[]` — ils documentent COMMENT la mesure a
    ete obtenue (quel binaire Godot, quelle commande). Traçabilite PROBANTE, arbitree telle
    par Pierre ;
  · `.source.path`, `.payload.path`, `.payload.result_excerpt` — hors perimetre de ce lot ;
  · `product_oracle.check_solo_ai_session(session_file=...)` — HOMONYME SANS RAPPORT : un
    parametre de fonction designant un fichier de preuve a EXECUTER. La confusion aurait ete
    facile ; ce lot ne touche que la CLE d'un artefact JSON.

FORME DE L'ANONYMISATION : seul le prefixe personnel est remplace. `<CLAUDE_HOME>` conserve
le projet et l'identifiant de session — donc la correlation reste possible — et retire le nom
de compte et la disposition du disque. On n'efface pas la reference, on la deracine du poste.
"""
from __future__ import annotations

import json

from forge.anonymize_session_paths import (
    CLAUDE_HOME_PLACEHOLDER, anonymize_obj, anonymize_session_file_value,
)

REEL = r"C:\Users\Studio-Dev\.claude\projects\C--TACTICAL-CHESS-STUDIO\8a434257-94b6.jsonl"


# --- la valeur ---------------------------------------------------------------------------


def test_le_prefixe_personnel_disparait():
    out = anonymize_session_file_value(REEL)
    assert "Studio-Dev" not in out
    assert "Users" not in out
    assert out.startswith(CLAUDE_HOME_PLACEHOLDER)


def test_le_projet_et_la_session_SURVIVENT():
    """On deracine, on n'efface pas : la correlation artefact <-> session reste possible."""
    out = anonymize_session_file_value(REEL)
    assert "C--TACTICAL-CHESS-STUDIO" in out
    assert "8a434257-94b6.jsonl" in out


def test_la_forme_POSIX_est_traitee_aussi():
    out = anonymize_session_file_value(
        "C:/Users/Studio-Dev/.claude/projects/P/abc.jsonl")
    assert "Studio-Dev" not in out and "P/abc.jsonl" in out


def test_une_valeur_DEJA_anonyme_est_INCHANGEE():
    """Idempotence : rejouer l'anonymisation ne doit rien abimer."""
    once = anonymize_session_file_value(REEL)
    assert anonymize_session_file_value(once) == once


def test_une_valeur_SANS_chemin_personnel_est_INCHANGEE():
    for v in ["", "relatif/session.jsonl", "C:/autre/chemin.jsonl", None, 42]:
        assert anonymize_session_file_value(v) == v


# --- le parcours de l'objet : SEULE la cle session_file est touchee -----------------------


def test_seule_la_cle_session_file_est_modifiee():
    obj = {"payload": {"session_file": REEL, "path": REEL}, "source": {"path": REEL}}
    out = anonymize_obj(obj)
    assert "Studio-Dev" not in out["payload"]["session_file"]
    assert out["payload"]["path"] == REEL, "`payload.path` est HORS perimetre"
    assert out["source"]["path"] == REEL, "`source.path` est HORS perimetre"


def test_la_CHAINE_DE_PREUVE_est_INTOUCHEE():
    """LE TEST QUI COMPTE. `proof_chain.binaire.path` documente QUEL binaire a produit la
    mesure — tracabilite probante, arbitree conservee par Pierre. L'anonymiser detruirait
    une preuve pour un gain de confidentialite nul."""
    obj = {"payload": {"session_file": REEL, "detail": {"mutation": {"receipt": {"detail": {
        "proof_chain": {"binaire": {"path": r"C:\Users\Studio-Dev\Desktop\Godot.exe"},
                        "command_executee": [r"C:\Users\Studio-Dev\Desktop\Godot.exe", "--x"]}}}}}}}
    out = anonymize_obj(obj)
    pc = out["payload"]["detail"]["mutation"]["receipt"]["detail"]["proof_chain"]
    assert pc["binaire"]["path"] == r"C:\Users\Studio-Dev\Desktop\Godot.exe"
    assert pc["command_executee"][0] == r"C:\Users\Studio-Dev\Desktop\Godot.exe"
    assert "Studio-Dev" not in out["payload"]["session_file"]


def test_session_file_IMBRIQUE_profond_est_atteint():
    obj = {"a": [{"b": {"session_file": REEL}}]}
    assert "Studio-Dev" not in anonymize_obj(obj)["a"][0]["b"]["session_file"]


def test_l_objet_d_origine_n_est_PAS_mute():
    """Fonction PURE : l'appelant garde son objet intact — indispensable pour comparer
    avant/apres et prouver que seul le champ vise a bouge."""
    obj = {"payload": {"session_file": REEL}}
    anonymize_obj(obj)
    assert obj["payload"]["session_file"] == REEL


def test_aucune_autre_cle_ne_bouge():
    obj = {"session_file": REEL, "session_id": "abc", "ts": 1.0, "kind": "spawn"}
    out = anonymize_obj(obj)
    assert out["session_id"] == "abc" and out["ts"] == 1.0 and out["kind"] == "spawn"
    assert set(out) == set(obj), "aucune cle ajoutee ni retiree"


def test_une_ligne_JSONL_REELLE_reste_du_JSON_valide():
    ligne = json.dumps({"payload": {"session_file": REEL, "hmac": "deadbeef"}})
    out = json.dumps(anonymize_obj(json.loads(ligne)))
    r = json.loads(out)
    assert r["payload"]["hmac"] == "deadbeef", "une signature voisine reste intacte"
    assert "Studio-Dev" not in out

# --- EXTENSION : du CHAMP au PREFIXE (GO Pierre 2026-08-20) -------------------------------
#
# CE QUE CES TESTS DOIVENT PROUVER, dans les DEUX sens — un test qui ne verifierait que le
# deracinement laisserait passer une extension qui emporte la chaine de preuve :
#   · les 3 formes reelles de chemin sont deracinees (Windows, POSIX, nom COURT 8.3) ;
#   · l'identite de session SURVIT (projet + fichier), c'est elle qui rend l'artefact utile ;
#   · les chemins PROBANTS restent INTACTS, y compris sous la clef `path` — qui est la clef
#     DOMINANTE des artefacts Observer (11 414 occurrences) ET celle de
#     `proof_chain.binaire.path`. La surete ne peut donc PAS venir du nom de clef.
#
# Le nom court `STUDIO~2` est teste explicitement : c'est une SECONDE graphie du meme compte,
# invisible a un grep sur la forme longue. Une premiere mesure d'exposition de cette session
# ne connaissait qu'une graphie — le chiffre tenait par chance, pas par methode.
from forge.anonymize_session_paths import (  # noqa: E402
    CLAUDE_HOME_PLACEHOLDER,
    anonymize_deep,
    anonymize_text,
)

_COMPTE_LONG = "Studio" + "-Dev"
_COMPTE_COURT = "STUDIO~2"
_SLUG = "C--TACTICAL-CHESS-STUDIO"
_SESSION = "8a434257-94b6-44b0-a268-002e436f219e.jsonl"

# Les 2 chemins dont il est PROUVE que la redaction invalide le recu signe
# (`verify_receipt` : True -> False sur bomberman_3d-proof3-20260817).
_PROBANTS = [
    "C:" + chr(92) + "Users" + chr(92) + _COMPTE_LONG + chr(92) + "Desktop" + chr(92)
    + "Godot_v4.6.3-stable_win64.exe",
    "C:" + chr(92) + "Users" + chr(92) + _COMPTE_LONG + chr(92) + "Desktop" + chr(92)
    + "Godot_v4.6.3-stable_win64_console.exe",
]


def _transcript(compte, sep):
    return sep.join(["C:", "Users", compte, ".claude", "projects", _SLUG, _SESSION])


def test_EXT_les_trois_formes_de_chemin_sont_deracinees():
    for compte in (_COMPTE_LONG, _COMPTE_COURT):
        for sep in (chr(92), "/"):
            v = _transcript(compte, sep)
            sortie = anonymize_deep({"path": v})["path"]
            assert compte not in sortie, f"compte subsistant pour {compte!r} sep={sep!r}"
            assert CLAUDE_HOME_PLACEHOLDER in sortie


def test_EXT_l_identite_de_session_SURVIT():
    """Deraciner n'est pas effacer : sans projet ni session, l'artefact perd sa valeur."""
    sortie = anonymize_deep({"path": _transcript(_COMPTE_LONG, chr(92))})["path"]
    assert _SLUG in sortie, "le projet a disparu — on a efface au lieu de deraciner"
    assert _SESSION in sortie, "l'identifiant de session a disparu"


def test_EXT_la_CHAINE_DE_PREUVE_reste_intacte_MEME_sous_la_cle_path():
    """LE test de l'extension. `path` porte a la fois le transcript et le binaire signe :
    si la surete venait du nom de clef, ce test serait rouge."""
    entree = {"proof_chain": {"binaire": {"path": _PROBANTS[0]}},
              "command_executee": [_PROBANTS[1]]}
    sortie = anonymize_deep(entree)
    assert sortie == entree, "la chaine de preuve a ete modifiee — le recu signe serait invalide"


def test_EXT_les_deux_coexistent_dans_le_MEME_objet():
    """Cas reel : un artefact porte les deux. L'un doit bouger, l'autre PAS."""
    entree = {"sources_read": [_transcript(_COMPTE_LONG, chr(92))],
              "proof_chain": {"binaire": {"path": _PROBANTS[0]}}}
    sortie = anonymize_deep(entree)
    assert _COMPTE_LONG not in sortie["sources_read"][0]
    assert sortie["proof_chain"]["binaire"]["path"] == _PROBANTS[0]


def test_EXT_le_TEXTE_non_structure_est_traite():
    """7 des 21 artefacts Observer sont du Markdown sans aucune clef, et concentrent
    l'essentiel du volume. Sans ce point d'entree, la moitie du probleme passerait."""
    ligne = "| `" + _transcript(_COMPTE_LONG, chr(92)) + "` | 42 |"
    sortie = anonymize_text(ligne)
    assert _COMPTE_LONG not in sortie
    assert _SESSION in sortie and "| 42 |" in sortie


def test_EXT_l_objet_d_origine_n_est_PAS_mute():
    entree = {"path": _transcript(_COMPTE_LONG, chr(92))}
    copie = dict(entree)
    anonymize_deep(entree)
    assert entree == copie


def test_EXT_est_IDEMPOTENTE():
    v = {"path": _transcript(_COMPTE_LONG, chr(92))}
    une = anonymize_deep(v)
    assert anonymize_deep(une) == une


def test_EXT_les_types_non_chaine_traversent_sans_dommage():
    entree = {"n": 3, "ok": True, "rien": None, "l": [1, {"x": None}]}
    assert anonymize_deep(entree) == entree
