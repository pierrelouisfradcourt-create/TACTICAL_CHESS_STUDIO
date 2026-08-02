"""Vue ROADMAP STUDIO de la console Observer — jeux / chantiers Forge / infrastructure.

Reprend la partie « Détail H · LE CURRICULUM » de `STUDIO_MASTER_SCHEMA.html` (l'arbre
de jeux, chacun avec un statut ● FAIT / ◐ EN COURS / ◇ CIBLE) et la complète avec :

  1. les TRACES mesurées (vue Fleet, `observer.fleet.view_fleet`) croisées par nom de
     projet — la doctrine affichée COMME doctrine (`SELF_DECLARED`, datée par le mtime
     du document) plutôt que comme un fait ;
  2. cinq « chantiers Forge » (Observer, Knowledge Runtime, World Scan, Asset Forge,
     Game Discovery) : ce que la doctrine en dit (recherche best-effort, exacte ou par
     terme proche) × un indice mécanique quand il existe ;
  3. six lignes d'infrastructure (LM Studio, Workers, Qwen, Claude, Playwright, GitHub) :
     doctrine seule — Observer lit des fichiers, il ne sonde jamais un port ni un
     service, donc la mesure y est NOT_OBSERVABLE par construction, jamais par oubli.

Les deux documents HTML sont de la doctrine manuelle (SVG écrits à la main), pas un
format stable : ce module les parse par regex/découpage de sections, best-effort assumé.
Toute cellule qui en résulte porte `"proof": "SELF_DECLARED"` et une `"note"` qui dit
comment elle a été obtenue. Un désaccord entre la doctrine et une mesure réelle devient
un `drift_item` de famille `documentation` (propriétaire DOCTRINE, action CORRIGER) —
jamais une correction silencieuse : Observer signale, HumanGate tranche.

Règle héritée de `cockpit.py`/`command.py`, non négociable ici aussi : une donnée qui
n'existe pas dans les traces ou dans la doctrine porte `NOT_OBSERVABLE` et sa raison —
jamais 0, jamais vide, jamais deviné.

Interface imposée :
    view_roadmap(ctx, result, events) -> dict          # la vue s2_roadmap elle-même
    build_roadmap_views(ctx, result, events) -> dict    # {"s2_roadmap": ...}
"""

from __future__ import annotations

import logging
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

_HERE = Path(__file__).resolve().parent
if str(_HERE.parent) not in sys.path:  # rend `import observer` possible sans install
    sys.path.insert(0, str(_HERE.parent))

from observer.sources import BlindnessViolation  # noqa: E402

LOG = logging.getLogger("observer.system_roadmap")

NOT_OBSERVABLE = "NOT_OBSERVABLE"
SELF_DECLARED = "SELF_DECLARED"

SCHEMA_RELPATH = ("docs", "forge", "STUDIO_MASTER_SCHEMA.html")
PILOTAGE_RELPATH = ("docs", "forge", "FORGE_V2_PILOTAGE.html")

DRIFT_TYPE = "roadmap_doctrine_vs_mesure"


# --------------------------------------------------------------------------- #
# Cellule — meme contrat que cockpit.py/command.py : {v, src?, why?}
# --------------------------------------------------------------------------- #


def _cell(value: Any, src: Optional[dict[str, Any]] = None, why: Optional[str] = None) -> dict[str, Any]:
    out: dict[str, Any] = {"v": value}
    if src:
        out["src"] = src
    if value == NOT_OBSERVABLE and why:
        out["why"] = why
    return out


def _drift(detail: str, source: Any, severity: str = "medium") -> dict[str, Any]:
    """Item de drift au format attendu par la vue Drift unique (§ cockpit.py) —
    fusionné par l'orchestrateur, jamais consommé seul par ce module."""
    return {
        "type": DRIFT_TYPE,
        "severity": severity,
        "famille": "documentation",
        "owner": "DOCTRINE",
        "action": "CORRIGER",
        "detail": detail,
        "source": source,
    }


def _iso(epoch: float) -> str:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat()


def _mtime_iso(ctx: Any, path: Path) -> Any:
    """Horodatage de modification, sous la MEME garde de cecite que le reste d'Observer.

    `ObserverContext` n'expose pas de lecteur de mtime dedie (seulement `stat_size`,
    borne aux octets) ; on reutilise sa garde privee `_check` pour ne jamais appeler
    `.stat()` sur un chemin que le contexte n'a pas lui-meme valide comme lisible.
    `BlindnessViolation` n'est jamais rattrapee ici.
    """
    resolved = ctx._check(path)  # noqa: SLF001 - meme garde que sources.py, pas de contournement
    if not resolved.is_file():
        return NOT_OBSERVABLE
    try:
        return _iso(resolved.stat().st_mtime)
    except OSError as exc:
        LOG.warning("mtime illisible pour %s: %s", resolved, exc)
        return NOT_OBSERVABLE


_TAG_RE = re.compile(r"<[^>]+>")


def _strip_tags(text: str) -> str:
    return _TAG_RE.sub(" ", text).strip()


# --------------------------------------------------------------------------- #
# Lecture des deux documents doctrine — jamais rattraper BlindnessViolation
# --------------------------------------------------------------------------- #


def _read_doc(ctx: Any, parts: tuple[str, ...]) -> Optional[dict[str, Any]]:
    path = ctx.repo_root.joinpath(*parts)
    text = ctx.read_text(path)
    if text is None:
        LOG.warning("document doctrine illisible ou absent: %s", path)
        return None
    return {
        "text": text,
        "lines": text.splitlines(),
        "path": ctx.rel(path),
        "mtime": _mtime_iso(ctx, path),
    }


# --------------------------------------------------------------------------- #
# Parsing best-effort — « Détail H · LE CURRICULUM » (STUDIO_MASTER_SCHEMA.html)
#
# Chaque nœud du curriculum est un <rect> suivi de <text> : le 1er texte est le nom
# du jeu, le 2e son système, un texte libre optionnel, et un marqueur de statut
# (● FAIT / ◐ EN COURS / ◇ CIBLE) quelque part dans le bloc. C'est un SVG écrit a la
# main, pas un format stable — ce parseur est volontairement tolerant et ne suppose
# aucun ordre fixe au-dela des deux premiers textes.
# --------------------------------------------------------------------------- #

_RECT_START_RE = re.compile(r"<rect\b")
_TEXT_CONTENT_RE = re.compile(r"<text\b[^>]*>([^<]*)</text>")
_STATUS_RE = re.compile(r"(\u25cf|\u25d0|\u25c7)\s*(FAIT|EN COURS|CIBLE)")


def _extract_curriculum(doc: dict[str, Any]) -> list[dict[str, Any]]:
    """Un noeud par jeu du Detail H, dans l'ordre d'apparition du SVG."""
    text = doc["text"]
    start = text.find("D\u00e9tail H \u00b7")
    if start == -1:
        return []
    end = text.find("D\u00e9tail H-bis")
    if end == -1:
        end = len(text)
    section = text[start:end]
    base_line = text.count("\n", 0, start)

    nodes: list[dict[str, Any]] = []
    positions = [m.start() for m in _RECT_START_RE.finditer(section)]
    for i, pos in enumerate(positions):
        chunk_end = positions[i + 1] if i + 1 < len(positions) else len(section)
        chunk = section[pos:chunk_end]
        texts = [t.strip() for t in _TEXT_CONTENT_RE.findall(chunk) if t.strip()]
        if not texts:
            continue
        status_match = _STATUS_RE.search(chunk)
        status_text = status_match.group(0) if status_match else None
        name = texts[0]
        systeme = texts[1] if len(texts) > 1 else None
        note_libre = [t for t in texts[2:] if not _STATUS_RE.fullmatch(t)]
        lineno = base_line + section.count("\n", 0, pos) + 1
        nodes.append({
            "nom": name,
            "systeme": systeme,
            "statut_doctrine": status_text or NOT_OBSERVABLE,
            "note_libre": note_libre,
            "ligne": lineno,
        })
    return nodes


# --------------------------------------------------------------------------- #
# Parsing best-effort — « lecture B : jeux et connaissance » (FORGE_V2_PILOTAGE.html)
# Boîtes PONG / SNAKE / BREAKOUT, plus riches (preuve, rôle d'apprentissage) que le
# curriculum mais couvrant seulement les jeux réellement forgés — source secondaire,
# fusionnée sous une clé distincte pour que tout désaccord entre les deux documents
# reste visible plutôt que d'être écrasé par un merge silencieux.
# --------------------------------------------------------------------------- #


def _extract_pilotage_boxes(doc: dict[str, Any]) -> dict[str, dict[str, Any]]:
    text = doc["text"]
    start = text.find("QUEL JEU PRODUIT QUELLE CONNAISSANCE")
    if start == -1:
        return {}
    end = text.find("LE BUDGET M\u00c9CANIQUE")
    if end == -1:
        end = len(text)
    section = text[start:end]
    base_line = text.count("\n", 0, start)

    boxes: dict[str, dict[str, Any]] = {}
    positions = [m.start() for m in _RECT_START_RE.finditer(section)]
    for i, pos in enumerate(positions):
        chunk_end = positions[i + 1] if i + 1 < len(positions) else len(section)
        chunk = section[pos:chunk_end]
        texts = [t.strip() for t in _TEXT_CONTENT_RE.findall(chunk) if t.strip()]
        if not texts:
            continue
        name = texts[0]
        lineno = base_line + section.count("\n", 0, pos) + 1
        boxes[name] = {
            "statut_pilotage": texts[1] if len(texts) > 1 else NOT_OBSERVABLE,
            "notes": texts[2:],
            "ligne": lineno,
        }
    return boxes


# --------------------------------------------------------------------------- #
# Croisement doctrine <-> traces (vue Fleet), par nom de projet
# --------------------------------------------------------------------------- #


def _normalize_key(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.strip().lower()).strip("_")


def _match_fleet_projects(doctrine_name: str, projects: list[str]) -> list[str]:
    key = _normalize_key(doctrine_name)
    if not key:
        return []
    out = []
    for projet in projects:
        pkey = _normalize_key(projet)
        if pkey == key or pkey.startswith(key + "_") or key.startswith(pkey + "_"):
            out.append(projet)
    return out


def _lines_by_project(fleet: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for ligne in fleet.get("lignes", []):
        if ligne.get("v") == "ERREUR":
            continue
        projet = (ligne.get("projet") or {}).get("v")
        if not projet:
            continue
        grouped.setdefault(projet, []).append(ligne)
    return grouped


def _trace_summary(ligne: dict[str, Any]) -> dict[str, Any]:
    return {
        "run_id": (ligne.get("run_id") or {}).get("v"),
        "decision": (ligne.get("decision") or {}).get("v"),
        "mutation": (ligne.get("mutation") or {}).get("v"),
        "tests": (ligne.get("tests") or {}).get("v"),
    }


def _progression_cell(lines_for_project: list[dict[str, Any]]) -> dict[str, Any]:
    """Barre de progression UNIQUEMENT si dérivable d'une mesure réelle — jamais de
    la doctrine, jamais devinée. `lines_for_project` doit être trié plus-récent-en-tête
    (c'est l'ordre que rend déjà `view_fleet`)."""
    if not lines_for_project:
        return _cell(NOT_OBSERVABLE, why="aucune mesure de progression n'existe, la "
                     "barre de la doctrine est déclarative")

    latest = lines_for_project[0]
    mutation_cell = latest.get("mutation") or {}
    mutation = mutation_cell.get("v")
    if isinstance(mutation, str) and mutation != NOT_OBSERVABLE and "/" in mutation:
        parts = mutation.split("/", 1)
        try:
            killed, total = float(parts[0]), float(parts[1])
        except (ValueError, IndexError):
            killed = total = None
        if total:
            pct = round(100.0 * killed / total, 1)
            cell = _cell(pct, mutation_cell.get("src"))
            cell["derive_de"] = "mutation kill rate (dernier run)"
            return cell

    decision_cell = latest.get("decision") or {}
    decision = decision_cell.get("v")
    if decision == "HUMANGATE_READY":
        cell = _cell("avance", decision_cell.get("src"))
        cell["derive_de"] = "decision HUMANGATE_READY -> interpretee comme 'avance' (pas un pourcentage)"
        return cell
    if isinstance(decision, str) and "BLOCK" in decision.upper():
        cell = _cell("bloque", decision_cell.get("src"))
        cell["derive_de"] = f"decision '{decision}' -> interpretee comme 'bloque'"
        return cell

    return _cell(NOT_OBSERVABLE, why="run(s) tracé(s) observé(s) mais ni mutation ni "
                 "décision HUMANGATE_READY/BLOCKED n'est disponible pour en dériver "
                 "une progression")


# --------------------------------------------------------------------------- #
# Section 1 — JEUX
# --------------------------------------------------------------------------- #


def _build_games_section(
    fleet: dict[str, Any],
    schema_doc: Optional[dict[str, Any]],
    pilotage_doc: Optional[dict[str, Any]],
) -> dict[str, Any]:
    lignes: list[dict[str, Any]] = []
    drift_items: list[dict[str, Any]] = []

    if schema_doc is None:
        return {
            "lignes": [{
                "jeu": _cell(NOT_OBSERVABLE, why="STUDIO_MASTER_SCHEMA.html illisible ou absent"),
            }],
            "drift_items": [],
        }

    curriculum = _extract_curriculum(schema_doc)
    pilotage_boxes = _extract_pilotage_boxes(pilotage_doc) if pilotage_doc else {}
    grouped = _lines_by_project(fleet)
    projects = sorted(grouped.keys())
    covered: set[str] = set()

    if not curriculum:
        drift_items.append(_drift(
            "le marqueur 'D\u00e9tail H \u00b7' est introuvable dans STUDIO_MASTER_SCHEMA.html : "
            "la section curriculum a peut-\u00eatre \u00e9t\u00e9 renomm\u00e9e ou d\u00e9plac\u00e9e",
            {"path": schema_doc["path"]},
            severity="high",
        ))

    for node in curriculum:
        name = node["nom"]
        matches = _match_fleet_projects(name, projects)
        covered.update(matches)
        lines_for_project: list[dict[str, Any]] = []
        for m in matches:
            lines_for_project.extend(grouped.get(m, []))

        doctrine_cell = _cell(
            {
                "systeme": node["systeme"] or NOT_OBSERVABLE,
                "statut_doctrine": node["statut_doctrine"],
                "note_libre": node["note_libre"],
            },
            {"path": schema_doc["path"], "line": node["ligne"]},
        )
        doctrine_cell["proof"] = SELF_DECLARED
        doctrine_cell["note"] = (
            "extrait best-effort du SVG 'D\u00e9tail H' (d\u00e9coupage <rect>/<text>, pas un "
            f"format stable) ; document dat\u00e9 {schema_doc['mtime']}"
        )

        pilotage_entry = pilotage_boxes.get(name)
        if pilotage_entry:
            pilotage_cell = _cell(
                {"statut_pilotage": pilotage_entry["statut_pilotage"], "notes": pilotage_entry["notes"]},
                {"path": pilotage_doc["path"], "line": pilotage_entry["ligne"]},
            )
            pilotage_cell["proof"] = SELF_DECLARED
            pilotage_cell["note"] = f"document dat\u00e9 {pilotage_doc['mtime']}"
        else:
            pilotage_cell = _cell(
                NOT_OBSERVABLE,
                why="pas de case d\u00e9di\u00e9e dans 'lecture B : jeux et connaissance' de "
                    "FORGE_V2_PILOTAGE.html pour ce nom",
            )

        if lines_for_project:
            traces_cell = _cell(
                [_trace_summary(l) for l in lines_for_project],
                {"path": "c8_fleet", "field": "lignes[].projet"},
            )
        else:
            traces_cell = _cell(
                NOT_OBSERVABLE,
                why="aucun run Forge \u00e0 \u00e9tats pour ce projet (vue Fleet vide sur ce nom)",
            )

        lignes.append({
            "jeu": _cell(name),
            "doctrine_curriculum": doctrine_cell,
            "doctrine_pilotage": pilotage_cell,
            "traces": traces_cell,
            "progression": _progression_cell(lines_for_project),
        })

        if node["statut_doctrine"] in ("\u25cf FAIT", "\u25d0 EN COURS") and not lines_for_project:
            drift_items.append(_drift(
                f"la doctrine D\u00e9tail H d\u00e9clare '{name}' au statut "
                f"'{node['statut_doctrine']}' mais aucun run Forge trac\u00e9 (lab/forge_runs/) "
                "ne correspond \u00e0 ce nom",
                {"path": schema_doc["path"], "line": node["ligne"]},
            ))

    for projet in projects:
        if projet in covered:
            continue
        lines_for_project = grouped[projet]
        lignes.append({
            "jeu": _cell(projet),
            "doctrine_curriculum": _cell(
                NOT_OBSERVABLE,
                why="aucun n\u0153ud de la doctrine D\u00e9tail H ne correspond \u00e0 ce nom de projet",
            ),
            "doctrine_pilotage": _cell(
                NOT_OBSERVABLE,
                why="aucune case de 'lecture B' ne correspond \u00e0 ce nom de projet",
            ),
            "traces": _cell([_trace_summary(l) for l in lines_for_project],
                             {"path": "c8_fleet", "field": "lignes[].projet"}),
            "progression": _progression_cell(lines_for_project),
        })
        drift_items.append(_drift(
            f"le projet '{projet}' porte {len(lines_for_project)} run(s) Forge trac\u00e9(s) "
            "mais n'appara\u00eet dans aucun n\u0153ud de la doctrine D\u00e9tail H "
            "(STUDIO_MASTER_SCHEMA.html)",
            [{"path": schema_doc["path"]}, {"path": f"lab/forge_runs/{projet}"}],
        ))

    return {"lignes": lignes, "drift_items": drift_items}


# --------------------------------------------------------------------------- #
# Section 2 — FORGE (chantiers)
# --------------------------------------------------------------------------- #

CHANTIER_TERMS: dict[str, list[str]] = {
    "Observer": ["Observer"],
    "Knowledge Runtime": ["Knowledge Runtime", "knowledge_base", "BIBLIOTH\u00c8QUE"],
    "World Scan": ["World Scan", "worldscan"],
    "Asset Forge": ["Asset Forge", "art bible", "artbible", "assets"],
    "Game Discovery": ["Game Discovery"],
}


def _search_terms(docs: list[dict[str, Any]], terms: list[str], max_hits: int = 4) -> list[dict[str, Any]]:
    hits: list[dict[str, Any]] = []
    for doc in docs:
        for term in terms:
            for m in re.finditer(re.escape(term), doc["text"], flags=re.IGNORECASE):
                lineno = doc["text"].count("\n", 0, m.start()) + 1
                line_text = doc["lines"][lineno - 1] if lineno - 1 < len(doc["lines"]) else ""
                hits.append({
                    "terme": term,
                    "doc": doc["path"],
                    "line": lineno,
                    "extrait": _strip_tags(line_text)[:220],
                })
                if len(hits) >= max_hits:
                    return hits
    return hits


def _doctrine_mentions_cell(label: str, terms: list[str], docs: list[dict[str, Any]]) -> dict[str, Any]:
    hits = _search_terms(docs, terms)
    if not hits:
        proches = ", ".join(f"'{t}'" for t in terms[1:]) or "aucun"
        return _cell(NOT_OBSERVABLE, why=(
            f"ni le nom exact '{label}' ni les termes proches test\u00e9s ({proches}) "
            "n'apparaissent dans les 2 documents doctrine"
        ))
    exact = any(h["terme"].lower() == label.lower() for h in hits)
    cell = _cell(hits, {"path": hits[0]["doc"], "line": hits[0]["line"]})
    cell["proof"] = SELF_DECLARED
    cell["note"] = (
        f"nom exact '{label}' trouv\u00e9 dans la doctrine" if exact else
        f"nom exact '{label}' absent des 2 documents ; rapprochement best-effort sur "
        "un terme proche (voir 'terme' par occurrence)"
    )
    return cell


def _mesure_observer(ctx: Any, result: dict[str, Any], events: list[dict[str, Any]]) -> dict[str, Any]:
    lessons_path = ctx.repo_root / "lab" / "reports" / "lessons.jsonl"
    value = {
        "result_recu": bool(result),
        "runs_reconstruits": len((result or {}).get("runs") or []),
        "evenements_recus": len(events or []),
        "lessons_jsonl_existe": ctx.exists(lessons_path),
    }
    return _cell(value, {
        "path": "result/events (arguments en m\u00e9moire de build_roadmap_views, pas un "
                "fichier lu par ctx)",
        "field": "n/a",
    })


def _mesure_knowledge_runtime(ctx: Any) -> dict[str, Any]:
    kb_root = ctx.repo_root / "knowledge_base"
    files = [p for p in ctx.iter_files(kb_root) if p.is_file()]
    if not files:
        return _cell(NOT_OBSERVABLE, why="knowledge_base/ est vide ou absent des racines lisibles")
    mtimes: list[float] = []
    for f in files:
        try:
            mtimes.append(f.stat().st_mtime)
        except OSError:
            continue
    catalog = ctx.read_json(kb_root / "catalog.json")
    entries = catalog.get("entries") if isinstance(catalog, dict) else None
    search_log_lines = list(ctx.read_jsonl(kb_root / "search_log.jsonl"))
    value = {
        "fichiers_knowledge_base": len(files),
        "derniere_ecriture_utc": _iso(max(mtimes)) if mtimes else NOT_OBSERVABLE,
        "catalog_entrees": len(entries) if isinstance(entries, list) else NOT_OBSERVABLE,
        "search_log_lignes": len(search_log_lines),
    }
    return _cell(value, {"path": ctx.rel(kb_root)})


def _mesure_world_scan(ctx: Any) -> dict[str, Any]:
    contract_path = ctx.repo_root / "scripts" / "forge" / "contracts" / "s2-worldscan.yaml"
    if not ctx.exists(contract_path):
        return _cell(NOT_OBSERVABLE, why="scripts/forge/contracts/s2-worldscan.yaml absent")
    contract_text = ctx.read_text(contract_path) or ""
    value = {
        "contrat_existe": True,
        "contrat_mtime_utc": _mtime_iso(ctx, contract_path),
        "contrat_lignes": len(contract_text.splitlines()),
    }
    return _cell(value, {"path": ctx.rel(contract_path)})


def _mesure_asset_forge(ctx: Any) -> dict[str, Any]:
    assets_root = ctx.repo_root / "knowledge_base" / "assets"
    files = [p for p in ctx.iter_files(assets_root) if p.is_file()]
    contract_path = ctx.repo_root / "scripts" / "forge" / "contracts" / "s2.5-artbible.yaml"
    contract_exists = ctx.exists(contract_path)
    if not files and not contract_exists:
        return _cell(NOT_OBSERVABLE, why=(
            "knowledge_base/assets/ est vide et scripts/forge/contracts/s2.5-artbible.yaml "
            "est absent"
        ))
    mtimes: list[float] = []
    for f in files:
        try:
            mtimes.append(f.stat().st_mtime)
        except OSError:
            continue
    value = {
        "fichiers_assets": len(files),
        "derniere_ecriture_utc": _iso(max(mtimes)) if mtimes else NOT_OBSERVABLE,
        "contrat_artbible_existe": contract_exists,
    }
    return _cell(value, {"path": ctx.rel(assets_root)})


def _mesure_game_discovery(_ctx: Any) -> dict[str, Any]:
    return _cell(NOT_OBSERVABLE, why=(
        "aucun contrat, script ou dossier du p\u00e9rim\u00e8tre lecture d'Observer ne porte le "
        "nom 'Game Discovery' ou un terme proche connu : aucun indice m\u00e9canique \u00e0 mesurer"
    ))


def _build_forge_section(
    ctx: Any,
    result: dict[str, Any],
    events: list[dict[str, Any]],
    docs: list[dict[str, Any]],
) -> dict[str, Any]:
    lignes: list[dict[str, Any]] = []
    drift_items: list[dict[str, Any]] = []

    mesures = {
        "Observer": lambda: _mesure_observer(ctx, result, events),
        "Knowledge Runtime": lambda: _mesure_knowledge_runtime(ctx),
        "World Scan": lambda: _mesure_world_scan(ctx),
        "Asset Forge": lambda: _mesure_asset_forge(ctx),
        "Game Discovery": lambda: _mesure_game_discovery(ctx),
    }

    for label, terms in CHANTIER_TERMS.items():
        doctrine_cell = _doctrine_mentions_cell(label, terms, docs)
        mesure_cell = mesures[label]()
        lignes.append({
            "chantier": _cell(label),
            "doctrine": doctrine_cell,
            "mesure": mesure_cell,
        })
        if doctrine_cell["v"] == NOT_OBSERVABLE and mesure_cell["v"] != NOT_OBSERVABLE:
            drift_items.append(_drift(
                f"le chantier '{label}' porte un indice m\u00e9canique mesurable mais son nom "
                "n'appara\u00eet dans aucun des deux documents doctrine",
                mesure_cell.get("src"),
            ))

    return {"lignes": lignes, "drift_items": drift_items}


# --------------------------------------------------------------------------- #
# Section 3 — INFRASTRUCTURE (doctrine seule, jamais de sonde reseau)
# --------------------------------------------------------------------------- #

INFRA_TERMS: dict[str, list[str]] = {
    "LM Studio": ["LM Studio", "LM_MODEL"],
    "Workers": ["worker"],
    "Qwen": ["Qwen"],
    "Claude": ["Claude"],
    "Playwright": ["Playwright"],
    "GitHub": ["GitHub"],
}

_INFRA_MESURE_WHY = (
    "aucune sonde d'infrastructure dans le p\u00e9rim\u00e8tre lecture d'Observer — les "
    "ports/services ne sont pas des fichiers"
)


def _build_infra_section(docs: list[dict[str, Any]]) -> dict[str, Any]:
    lignes: list[dict[str, Any]] = []
    for label, terms in INFRA_TERMS.items():
        doctrine_cell = _doctrine_mentions_cell(label, [label, *terms], docs)
        mesure_cell = _cell(NOT_OBSERVABLE, why=_INFRA_MESURE_WHY)
        lignes.append({
            "composant": _cell(label),
            "doctrine": doctrine_cell,
            "mesure": mesure_cell,
        })
    return {"lignes": lignes}


# --------------------------------------------------------------------------- #
# Fraicheur doctrine
# --------------------------------------------------------------------------- #


def _fraicheur_doctrine(schema_doc: Optional[dict[str, Any]],
                        pilotage_doc: Optional[dict[str, Any]]) -> dict[str, Any]:
    return {
        "studio_master_schema_html": {
            "path": schema_doc["path"] if schema_doc else "/".join(SCHEMA_RELPATH),
            "mtime_utc": schema_doc["mtime"] if schema_doc else NOT_OBSERVABLE,
        },
        "forge_v2_pilotage_html": {
            "path": pilotage_doc["path"] if pilotage_doc else "/".join(PILOTAGE_RELPATH),
            "mtime_utc": pilotage_doc["mtime"] if pilotage_doc else NOT_OBSERVABLE,
        },
        "avertissement": (
            "document manuel qui vieillit en silence — l'historique du Master Schema "
            "documente des d\u00e9rives r\u00e9currentes entre ce qui est \u00e9crit et ce qui est "
            "r\u00e9ellement c\u00e2bl\u00e9"
        ),
    }


# --------------------------------------------------------------------------- #
# Assemblage
# --------------------------------------------------------------------------- #


def view_roadmap(ctx: Any, result: dict[str, Any], events: list[dict[str, Any]]) -> dict[str, Any]:
    """La vue `s2_roadmap` : jeux (doctrine x traces), chantiers Forge, infrastructure,
    drift doctrine<->mesure, fraicheur des deux documents. Lecture uniquement via ctx ;
    `BlindnessViolation` n'est jamais rattrap\u00e9e."""
    schema_doc = _read_doc(ctx, SCHEMA_RELPATH)
    pilotage_doc = _read_doc(ctx, PILOTAGE_RELPATH)
    docs = [d for d in (schema_doc, pilotage_doc) if d is not None]

    from observer.fleet import view_fleet

    fleet = view_fleet(ctx.repo_root, ctx.transcripts_root, ctx.project, result)

    jeux = _build_games_section(fleet, schema_doc, pilotage_doc)
    forge = _build_forge_section(ctx, result, events, docs)
    infra = _build_infra_section(docs)

    drift_items = [*jeux["drift_items"], *forge["drift_items"]]

    return {
        "jeux": {"lignes": jeux["lignes"]},
        "forge": {"lignes": forge["lignes"]},
        "infrastructure": {"lignes": infra["lignes"]},
        "drift_items": drift_items,
        "fraicheur_doctrine": _fraicheur_doctrine(schema_doc, pilotage_doc),
    }


def build_roadmap_views(ctx: Any, result: dict[str, Any], events: list[dict[str, Any]]) -> dict[str, Any]:
    return {"s2_roadmap": view_roadmap(ctx, result, events)}


# --------------------------------------------------------------------------- #
# Preuve d'execution
# --------------------------------------------------------------------------- #

if __name__ == "__main__":
    import json

    from observer.sources import ObserverContext  # noqa: E402

    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")

    _repo_root = Path(r"C:\TACTICAL_CHESS_STUDIO")
    _transcripts_root = Path(r"C:\Users\Studio-Dev\.claude\projects\C--TACTICAL-CHESS-STUDIO")
    _project = "breakout_v2"
    _ctx = ObserverContext.build(_repo_root, _project, _transcripts_root)

    _report_dir = _repo_root / "lab" / "reports" / "observer" / _project
    with (_report_dir / "observer_run.json").open("r", encoding="utf-8-sig") as _fh:
        _result = json.load(_fh)

    _events: list[dict[str, Any]] = []
    with (_report_dir / "events.jsonl").open("r", encoding="utf-8-sig") as _fh:
        for _line in _fh:
            _line = _line.strip()
            if _line:
                _events.append(json.loads(_line))

    _views = build_roadmap_views(_ctx, _result, _events)
    _roadmap = _views["s2_roadmap"]

    print(f"cles produites        : {sorted(_views.keys())}")

    _jeux = _roadmap["jeux"]["lignes"]
    _doctrine_names = [
        l["jeu"]["v"] for l in _jeux
        if "doctrine_curriculum" in l and l["doctrine_curriculum"]["v"] != NOT_OBSERVABLE
    ]
    _mesures_names = [
        l["jeu"]["v"] for l in _jeux
        if "traces" in l and l["traces"]["v"] != NOT_OBSERVABLE
    ]
    print(f"jeux (lignes totales)  : {len(_jeux)}")
    print(f"jeux dans la doctrine  : {len(_doctrine_names)} -> {_doctrine_names}")
    print(f"jeux mesures (traces)  : {len(_mesures_names)} -> {_mesures_names}")

    print(f"drift_items            : {len(_roadmap['drift_items'])}")
    for _d in _roadmap["drift_items"]:
        print(f"  - [{_d['severity']}] {_d['detail']}")

    print("chantiers Forge :")
    for _l in _roadmap["forge"]["lignes"]:
        print(
            f"  - {_l['chantier']['v']:<20} doctrine={_l['doctrine']['v'] if _l['doctrine']['v'] == NOT_OBSERVABLE else 'trouve'} "
            f"mesure={_l['mesure']['v'] if _l['mesure']['v'] == NOT_OBSERVABLE else 'trouve'}"
        )

    print("infrastructure (doctrine seule) :")
    for _l in _roadmap["infrastructure"]["lignes"]:
        print(f"  - {_l['composant']['v']:<12} doctrine={_l['doctrine']['v'] if _l['doctrine']['v'] == NOT_OBSERVABLE else 'trouve'}")

    _fr = _roadmap["fraicheur_doctrine"]
    print(f"mtime STUDIO_MASTER_SCHEMA.html : {_fr['studio_master_schema_html']['mtime_utc']}")
    print(f"mtime FORGE_V2_PILOTAGE.html    : {_fr['forge_v2_pilotage_html']['mtime_utc']}")
