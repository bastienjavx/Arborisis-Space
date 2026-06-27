#!/usr/bin/env python3
"""Slice AI-generated Arborisis asset sheets into web-ready thumbnails."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SHEET_DIR = ROOT / "tools/ai-asset-sheets"
OUT_ROOT = ROOT / "apps/web/public/images/game"
SIZE = 512


SHEETS: dict[str, dict[str, object]] = {
    "buildings": {
        "grid": (3, 3),
        "keys": [
            "BIOMASS_SYNTHESIZER",
            "SAP_WELL",
            "MINERAL_VEIN",
            "SPORANGE",
            "PHOTOSYNTHETIC_CANOPY",
            "STORAGE_VACUOLE",
            "RESEARCH_NEXUS",
            "SYMBIOTIC_CORE",
            "ORBITAL_NURSERY",
        ],
    },
    "ships": {
        "grid": (5, 4),
        "keys": [
            "SPORAL_SCOUT",
            "SYMBIOTIC_HARVESTER",
            "MYCELIAL_TENDRIL",
            "CHITIN_FREIGHTER",
            "BIOLUMINESCENT_CRUISER",
            "SPOROGENESIS_TITAN",
            "SPORAL_DRONE",
            "ACID_BOMBER",
            "CHITIN_DESTROYER",
            "BIOMASS_DREADNOUGHT",
            "SEED_POD",
            "SHADOW_SPORE",
            "ORBITAL_THORN",
            "SPORAL_SWARM",
            "LUMINOUS_WARDEN",
            "CHITIN_BULWARK",
            "BIO_RECYCLER",
        ],
    },
    "items": {
        "grid": (4, 3),
        "keys": [
            "MYCELIAL_FIBER",
            "BIOLUMINESCENT_GEL",
            "CHITIN_SHARD",
            "SPORE_ESSENCE",
            "VOID_CRYSTAL",
            "ANCIENT_FRAGMENT",
            "REINFORCED_CHITIN",
            "CRYSTALLIZED_SAP",
            "NEURAL_MATRIX",
            "VOID_ALLOY",
            "MYCOTOXIN_VIAL",
            "CONVERGENCE_SHARD",
        ],
    },
    "commanders": {
        "grid": (4, 3),
        "keys": [
            "MYCO_WARLORD",
            "CHITIN_GUARDIAN",
            "VOID_REAPER",
            "SPORE_STORM",
            "SYMBIONT_SAGE",
            "ROOT_WEAVER",
            "FUNGAL_MERCHANT",
            "CANOPY_ARCHITECT",
            "VOID_NAVIGATOR",
            "SPORE_ORACLE",
            "HIVE_HERALD",
            "ANCIENT_SYMBIONT",
        ],
    },
    "npc": {
        "grid": (4, 3),
        "keys": [
            "VOID_RIFT",
            "MYCOXIN_NEST",
            "ABANDONED_DERELICT",
            "FUNGAL_HIVEMIND",
            "VOID_LEVIATHAN",
            "CRYSTALLINE_GUARDIAN",
            "BIOMASS_CORRUPTED",
            "ANCIENT_SENTINEL",
            "CHITIN_WARLORD",
            "SPORAL_PARASITE",
            "MYCOSPORE_SWARM",
        ],
    },
    "defenses": {
        "grid": (3, 2),
        "keys": [
            "ION_CANNON",
            "SPORE_NET",
            "SHIELD_MEMBRANE",
            "MYCELIAL_TURRET",
            "VOID_LANCE",
            "ORBITAL_THORN_BED",
        ],
    },
    "moon-buildings": {
        "grid": (3, 2),
        "keys": [
            "LUNAR_CORE",
            "SPORE_PHALANX",
            "BIO_JUMP_GATE",
            "LUNAR_NURSERY",
            "CRYSTALLINE_SILO",
        ],
    },
}


def slugify_enum(value: str) -> str:
    return value.lower().replace("_", "-")


def crop_cell(sheet: Image.Image, cols: int, rows: int, index: int) -> Image.Image:
    width, height = sheet.size
    cell_w = width / cols
    cell_h = height / rows
    col = index % cols
    row = index // cols

    left = round(col * cell_w)
    top = round(row * cell_h)
    right = round((col + 1) * cell_w)
    bottom = round((row + 1) * cell_h)
    cell = sheet.crop((left, top, right, bottom))

    side = min(cell.size)
    x = (cell.width - side) // 2
    y = (cell.height - side) // 2
    return cell.crop((x, y, x + side, y + side)).resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def main() -> None:
    count = 0
    for category, config in SHEETS.items():
        sheet_path = SHEET_DIR / f"{category}.png"
        cols, rows = config["grid"]  # type: ignore[index]
        keys = config["keys"]  # type: ignore[index]
        sheet = Image.open(sheet_path).convert("RGB")
        out_dir = OUT_ROOT / category
        out_dir.mkdir(parents=True, exist_ok=True)

        for index, key in enumerate(keys):
            image = crop_cell(sheet, int(cols), int(rows), index)
            image.save(out_dir / f"{slugify_enum(str(key))}.webp", "WEBP", quality=90, method=6)
            count += 1

    print(f"Sliced {count} AI assets into {OUT_ROOT}")


if __name__ == "__main__":
    main()
