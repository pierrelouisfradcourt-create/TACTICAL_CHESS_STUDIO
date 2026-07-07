#!/usr/bin/env python3
"""Re-télécharge les personnages 3D CC0 (KayKit) — gitignorés (~33 Mo, re-téléchargeables).

Usage (depuis games/chess_tcg/) :  python assets/fetch_characters.py
Licence des assets : CC0 1.0 (KayKit, Kay Lousberg). Voir assets/CREDITS.md.
"""
import os
import urllib.request

ADV = ("https://raw.githubusercontent.com/KayKit-Game-Assets/"
       "KayKit-Character-Pack-Adventures-1.0/main/addons/"
       "kaykit_character_pack_adventures/Characters/gltf/")
SKE = ("https://raw.githubusercontent.com/KayKit-Game-Assets/"
       "KayKit-Character-Pack-Skeletons-1.0/main/addons/"
       "kaykit_character_pack_skeletons/Characters/gltf/")

PACKS = {
    "characters/adventurers": (ADV, ["Knight", "Barbarian", "Mage", "Rogue"]),
    "characters/skeletons": (SKE, ["Skeleton_Warrior", "Skeleton_Minion",
                                    "Skeleton_Mage", "Skeleton_Rogue"]),
}


def main() -> None:
    here = os.path.dirname(os.path.abspath(__file__))
    for folder, (base, names) in PACKS.items():
        dest_dir = os.path.join(here, folder)
        os.makedirs(dest_dir, exist_ok=True)
        for name in names:
            dst = os.path.join(dest_dir, name + ".glb")
            if os.path.exists(dst):
                print("= déjà présent :", name)
                continue
            print("↓ téléchargement :", name)
            urllib.request.urlretrieve(base + name + ".glb", dst)
    print("OK — personnages téléchargés (CC0, KayKit). Relance Godot pour ré-importer.")


if __name__ == "__main__":
    main()
