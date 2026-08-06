"""build_asset.py — PRODUCTEUR d'assets Blender, pilote par une spec JSON.

COUCHE PRODUCTEUR (cf. docs/forge/ASSET_GEOMETRY_PIPELINE_BOUNDARY_V1.md).
Ce script CREE. Il ne juge jamais, et il n'ecrit JAMAIS le manifeste de recensement
(`<asset>.glb.geometry.json`) : celui-ci est la parole du HumanGate, pas du producteur.
S'il l'ecrivait, le producteur declarerait sa propre geometrie legitime et court-circuiterait
l'oracle -- exactement ce que l'architecture interdit.

Il ecrit :
  <asset>.glb                  la geometrie
  <asset>.glb.metadata.json    sa DECLARATION (confrontee ensuite a la mesure independante)
  <asset>.generation_report.json  ce qu'il a fait, et avec quels parametres

Invariants imposes A LA CONSTRUCTION (pas verifies ici -- c'est le role de l'oracle) :
  - origine au pied  : la geometrie est batie en Z>=0 dans Blender (=> Y>=0 en glTF)
  - materiau present : chaque objet en recoit un
  - pas de parasite  : scene videe avant construction, un seul objet racine par piece
  - echelle en metres

Usage (depuis WSL) :
  <blender> -b --python scripts/forge/asset_producer/build_asset.py -- <spec.json> <dest_dir>
"""
import json
import os
import sys

import bpy

SCHEMA_VERSION = "1.0"

# Doit correspondre EXACTEMENT au prefixe attendu par knowledge_base/kb-validate.mjs
# (ORIGINAL_MARKER) : R3 accepte `provenance_url: null` seulement si `source` commence
# par cette chaine. Une paraphrase (« ORIGINAL — genere par ... ») fait echouer
# l'ingestion beaucoup plus tard, au moment de la ratification -- constate le 2026-08-06.
ORIGINAL_MARKER = "ORIGINAL — aucune inspiration externe citee"

# Archetypes disponibles. Enumeration FERMEE : un archetype inconnu est une erreur
# explicite, jamais un cube par defaut silencieux.
ARCHETYPES = ["crate", "door", "platform", "barrel", "pillar", "button", "chest"]


def _reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def _mat(name, rgba):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = False
    m.diffuse_color = rgba
    return m


def _box(name, sx, sy, sz, cx=0.0, cy=0.0, base_z=0.0, mat=None):
    """Boite dont la BASE est a base_z (jamais centree sur l'origine)."""
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
    ob = bpy.context.active_object
    ob.name = name
    for v in ob.data.vertices:
        v.co.x *= sx
        v.co.y *= sy
        v.co.z = (v.co.z + 0.5) * sz          # bas du cube ramene a z=0
    ob.location = (cx, cy, base_z)
    ob.data.materials.append(mat or _mat(f"{name}_mat", (0.6, 0.6, 0.6, 1.0)))
    return ob


def _cyl(name, radius, height, cx=0.0, cy=0.0, base_z=0.0, mat=None, verts=16):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=height, vertices=verts,
                                        location=(0, 0, 0))
    ob = bpy.context.active_object
    ob.name = name
    for v in ob.data.vertices:
        v.co.z += height / 2.0                # base ramenee a z=0
    ob.location = (cx, cy, base_z)
    ob.data.materials.append(mat or _mat(f"{name}_mat", (0.6, 0.6, 0.6, 1.0)))
    return ob


def build(spec):
    """Construit la geometrie. Retourne la liste des noms d'objets crees."""
    a = spec["archetype"]
    w = float(spec["size"]["w"])
    d = float(spec["size"]["d"])
    h = float(spec["size"]["h"])
    col = tuple(spec.get("color", [0.55, 0.45, 0.35, 1.0]))
    name = spec["asset_id"]
    mat = _mat(f"{name}_mat", col)

    if a == "crate":
        _box(name, w, d, h, mat=mat)
    elif a == "platform":
        _box(name, w, d, h, mat=mat)
    elif a == "pillar":
        _cyl(name, min(w, d) / 2.0, h, mat=mat)
    elif a == "barrel":
        _cyl(name, min(w, d) / 2.0, h, mat=mat, verts=24)
    elif a == "button":
        _cyl(f"{name}_base", min(w, d) / 2.0, h * 0.3, mat=mat)
        _cyl(f"{name}_cap", min(w, d) / 2.0 * 0.7, h * 0.7, base_z=h * 0.3,
             mat=_mat(f"{name}_cap_mat", (0.8, 0.15, 0.15, 1.0)))
    elif a == "door":
        jamb = _mat(f"{name}_jamb_mat", (0.35, 0.30, 0.25, 1.0))
        t = w * 0.12
        _box(f"{name}_panel", w - 2 * t, d, h - t, mat=mat)
        _box(f"{name}_jamb_left", t, d, h, cx=-(w / 2 - t / 2), mat=jamb)
        _box(f"{name}_jamb_right", t, d, h, cx=(w / 2 - t / 2), mat=jamb)
        _box(f"{name}_lintel", w, d, t, base_z=h - t, mat=jamb)
    elif a == "chest":
        # Le couvercle est une VARIANTE : deux etats exclusifs livres ensemble.
        # L'oracle bloquera donc cet asset tant qu'un humain n'aura pas declare
        # les roles -- comportement voulu, c'est la porte qui fonctionne.
        _box(f"{name}_body", w, d, h * 0.6, mat=mat)
        lid = _mat(f"{name}_lid_mat", (0.45, 0.35, 0.25, 1.0))
        _box(f"{name}_lid_closed", w, d, h * 0.4, base_z=h * 0.6, mat=lid)
        _box(f"{name}_lid_open", w, d * 0.4, h * 0.4, cy=-d * 0.8, base_z=h * 0.6, mat=lid)
    else:
        raise SystemExit(f"archetype inconnu (liste fermee {ARCHETYPES}): {a}")

    return [o.name for o in bpy.data.objects if o.type == "MESH"]


def measure_declaration():
    """Ce que le producteur CROIT avoir fait. Jamais une preuve — juste sa parole."""
    lo, hi = 1e9, -1e9
    dx = dy = 0.0
    xs, ys = [], []
    for o in bpy.data.objects:
        if o.type != "MESH":
            continue
        for c in o.bound_box:
            w = o.matrix_world @ __import__("mathutils").Vector(c)
            lo = min(lo, w.z)
            hi = max(hi, w.z)
            xs.append(w.x)
            ys.append(w.y)
    if xs:
        dx = max(xs) - min(xs)
        dy = max(ys) - min(ys)
    # Blender est Z-up ; le GLB exporte est Y-up. La declaration parle en Y (espace fichier).
    return {"lowest_point_y": round(lo, 6), "height_y": round(hi - lo, 6),
            "width_x": round(dx, 6), "depth_z": round(dy, 6)}


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    spec_path, dest = argv[0], argv[1]
    with open(spec_path, "r", encoding="utf-8") as fh:
        spec = json.load(fh)

    for champ in ("asset_id", "archetype", "category", "size", "consumer"):
        if champ not in spec:
            raise SystemExit(f"spec incomplete : champ '{champ}' absent")
    if not spec["consumer"]:
        raise SystemExit("spec refusee : aucun consumer — un asset sans consommateur "
                         "n'entre pas dans la bibliotheque")

    os.makedirs(dest, exist_ok=True)
    _reset()
    objets = build(spec)

    glb = os.path.join(dest, f"{spec['asset_id']}.glb")
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB")

    decl = measure_declaration()
    meta = {
        "schema_version": SCHEMA_VERSION,
        "_statut": "DECLARATION — ne fait JAMAIS foi (confrontee par declaration_mismatch)",
        "asset_id": spec["asset_id"],
        "category": spec["category"],
        "style": spec.get("style", "lowpoly"),
        "license": "CC0-1.0",
        "source": ORIGINAL_MARKER + " — scripts/forge/asset_producer/build_asset.py",
        "provenance_url": None,
        "produced_by": f"blender {bpy.app.version_string} / archetype={spec['archetype']}",
        "origin_rule": "base_center",
        "ground_rule": "base_contact",
        "variants": spec.get("variants", []),
        "consumer_examples": spec["consumer"],
        **decl,
    }
    with open(glb + ".metadata.json", "w", encoding="utf-8") as fh:
        json.dump(meta, fh, indent=2, ensure_ascii=False)

    report = {
        "schema_version": SCHEMA_VERSION,
        "asset_id": spec["asset_id"],
        "archetype": spec["archetype"],
        "params": {"size": spec["size"], "color": spec.get("color")},
        "objects_created": objets,
        "blender_version": bpy.app.version_string,
        "glb_bytes": os.path.getsize(glb),
        "manifest_written": False,
        "manifest_note": ("le producteur n'ecrit JAMAIS <asset>.glb.geometry.json : "
                          "le recensement des roles appartient au HumanGate"),
    }
    with open(os.path.join(dest, f"{spec['asset_id']}.generation_report.json"),
              "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, ensure_ascii=False)

    print(f"PRODUCED|{spec['asset_id']}|{os.path.getsize(glb)}|objets={len(objets)}")


main()
