"""Oracle des niveaux de « Qui va où » (2026-09-19).

Source : portage de la sonde artifact V8. Déterministe, sans LLM, sans réseau.
Vérifie ce qu'un niveau doit garantir AVANT d'être dessiné ou joué :
  - chaque verbe employé existe dans le roster, et un chat sait le faire ;
  - le niveau est soluble, et on compte les ordres de résolution valides ;
  - aucune zone cliquable n'en recouvre une autre (le bug qui volait les clics) ;
  - tout blocage sait dire pourquoi (sinon l'enfant reste devant un clic muet) ;
  - aucun chat n'est décoratif, aucun drapeau n'est inatteignable.

Usage : python games/qui_va_ou/outils/valider_niveaux.py
Sortie : exit 0 si tous les niveaux passent, 1 sinon.
"""

from __future__ import annotations

import json
import logging
import sys
from itertools import permutations
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
CANEVAS_L = 1600
CANEVAS_H = 900

logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stdout)
log = logging.getLogger("valider_niveaux")


def charger(chemin: Path) -> dict:
    with open(chemin, encoding="utf-8") as f:
        return json.load(f)


def se_chevauchent(a: list[int], b: list[int]) -> bool:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    return ax < bx + bw and bx < ax + aw and ay < by + bh and by < ay + ah


def verbes_du_roster(roster: dict) -> dict[str, str]:
    """id du chat -> verbe qu'il sait faire."""
    return {c["id"]: c["verbe"] for c in roster["chats"]}


def resoudre(niveau: dict, par_verbe: dict[str, str], ordre: tuple[str, ...]) -> bool:
    """Rejoue le niveau dans un ordre de zones donné. True si le prisonnier est libéré."""
    drapeaux: set[str] = set()
    dispo: set[str] = set(niveau["equipe"])
    zones = {z["id"]: z for z in niveau["zones"]}
    libere = False
    for zid in ordre:
        z = zones[zid]
        if not set(z.get("requiert", [])).issubset(drapeaux):
            return False
        if not any(par_verbe.get(c) == z["verbe"] for c in dispo):
            return False
        if z.get("pose"):
            drapeaux.add(z["pose"])
        if z.get("libere"):
            libere = True
        for source in niveau["zones"]:
            appel = source.get("appelle")
            if appel and set(appel.get("si", [])).issubset(drapeaux):
                dispo.add(appel["chat"])
    return libere


def verifier_niveau(niveau: dict, roster: dict) -> list[str]:
    erreurs: list[str] = []
    par_verbe = verbes_du_roster(roster)
    zones: list[dict] = niveau["zones"]
    ids = [z["id"] for z in zones]

    if len(ids) != len(set(ids)):
        erreurs.append("deux zones portent le même id")

    liberatrices = [z for z in zones if z.get("libere")]
    if len(liberatrices) != 1:
        erreurs.append(f"{len(liberatrices)} zone(s) libératrice(s), il en faut exactement 1")

    poses = {z["pose"] for z in zones if z.get("pose")}

    for z in zones:
        if z["verbe"] not in par_verbe.values():
            erreurs.append(f"zone '{z['id']}' : verbe '{z['verbe']}' absent du roster")

        x, y, w, h = z["rect"]
        if x < 0 or y < 0 or x + w > CANEVAS_L or y + h > CANEVAS_H:
            erreurs.append(f"zone '{z['id']}' : rect hors canevas {CANEVAS_L}x{CANEVAS_H}")

        manquants = [d for d in z.get("requiert", []) if d not in poses]
        if manquants:
            erreurs.append(f"zone '{z['id']}' : drapeau(x) jamais posé(s) {manquants}")

        expliques = {b["sans"] for b in z.get("bloque", [])}
        muets = [d for d in z.get("requiert", []) if d not in expliques]
        if muets:
            erreurs.append(f"zone '{z['id']}' : blocage muet, aucun texte pour {muets}")

        appel = z.get("appelle")
        if appel:
            if appel["chat"] not in par_verbe:
                erreurs.append(f"zone '{z['id']}' : appelle un chat inconnu '{appel['chat']}'")
            inconnus = [d for d in appel.get("si", []) if d not in poses]
            if inconnus:
                erreurs.append(f"zone '{z['id']}' : appelle si drapeau(x) jamais posé(s) {inconnus}")

    for i, a in enumerate(zones):
        for b in zones[i + 1:]:
            if se_chevauchent(a["rect"], b["rect"]):
                erreurs.append(f"zones '{a['id']}' et '{b['id']}' : rectangles cliquables qui se recouvrent")

    for c in niveau["equipe"]:
        if c not in par_verbe:
            erreurs.append(f"équipe de départ : chat inconnu '{c}'")

    ordres_valides = [o for o in permutations(ids) if resoudre(niveau, par_verbe, o)]
    if not ordres_valides:
        erreurs.append("INSOLUBLE : aucun ordre de résolution ne libère le prisonnier")

    verbes_utiles = {z["verbe"] for z in zones}
    convoques = set(niveau["equipe"]) | {
        z["appelle"]["chat"] for z in zones if z.get("appelle")
    }
    oisifs = [c for c in convoques if par_verbe.get(c) not in verbes_utiles]
    if oisifs:
        erreurs.append(f"chat(s) convoqué(s) mais sans rien à faire : {oisifs}")

    non_couverts = [v for v in verbes_utiles if v not in {par_verbe[c] for c in convoques if c in par_verbe}]
    if non_couverts:
        erreurs.append(f"verbe(s) sans chat disponible dans le niveau : {non_couverts}")

    for cle in ("coince", "libere"):
        px, py = niveau["prisonnier"][cle]
        if not (0 <= px <= CANEVAS_L and 0 <= py <= CANEVAS_H):
            erreurs.append(f"prisonnier '{cle}' hors canevas")

    if not erreurs:
        log.info(
            "  %-12s %d zones · %d ordre(s) de résolution valide(s) sur %d possibles · verbes %s",
            niveau["id"], len(zones), len(ordres_valides), len(list(permutations(ids))),
            ", ".join(sorted(verbes_utiles)),
        )
    return erreurs


def main() -> int:
    roster = charger(RACINE / "data" / "chats.json")
    dossier = RACINE / "data" / "niveaux"
    fichiers = sorted(dossier.glob("*.json"))
    if not fichiers:
        log.error("aucun niveau trouvé dans %s", dossier)
        return 1

    log.info("Oracle des niveaux — %d chats au roster, %d niveaux", len(roster["chats"]), len(fichiers))
    total = 0

    index = charger(RACINE / "data" / "niveaux.json").get("ordre", [])
    sur_disque = [f.name for f in fichiers]
    if index != sur_disque:
        manque = [n for n in sur_disque if n not in index]
        fantome = [n for n in index if n not in sur_disque]
        log.error("  index        ECHEC : data/niveaux.json désynchronisé (absents de l'index : %s · listés mais introuvables : %s)",
                  manque or "aucun", fantome or "aucun")
        total += 1
    for f in fichiers:
        niveau = charger(f)
        erreurs = verifier_niveau(niveau, roster)
        for e in erreurs:
            log.error("  %-12s ECHEC : %s", niveau["id"], e)
        total += len(erreurs)

    if total:
        log.error("\n%d erreur(s). software_verdict: FAIL", total)
        return 1
    log.info("\nTous les niveaux passent. software_verdict: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
