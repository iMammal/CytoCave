from pathlib import Path
import csv

DATA = Path("data")

SOURCE = DATA / "LookupTable_upenn_gbm_00013_c16_kcompare.csv" #"LookupTable_upenn_gbm_00388_11_committee_v0_1_2_seg.csv"
#TARGET = DATA / "LookupTable_upenn_gbm_00388_11_committee_v0_1_2_glyph5.csv"
TARGET = DATA / "LookupTable_upenn_gbm_00013_c16_kcompare_glyph5.csv"

SHAPES = (
    "sphere",
    "cube",
    "tetrahedron",
    "icosahedron",
    "star",
)

with SOURCE.open("r", newline="", encoding="utf-8-sig") as src:
    reader = csv.DictReader(src, delimiter=";")

    if not reader.fieldnames:
        raise RuntimeError("Source LUT has no header")

    fieldnames = list(reader.fieldnames)

    for field in ("glyph_shape", "glyph_test_group"):
        if field not in fieldnames:
            fieldnames.append(field)

    rows = []
    counts = {shape: 0 for shape in SHAPES}

    for row_number, row in enumerate(reader):
        raw_node_id = row.get("node_id", "").strip()

        try:
            node_id = int(raw_node_id)
        except ValueError:
            node_id = row_number

        shape = SHAPES[node_id % len(SHAPES)]
        row["glyph_shape"] = shape
        row["glyph_test_group"] = shape
        counts[shape] += 1
        rows.append(row)

with TARGET.open("w", newline="", encoding="utf-8") as dst:
    writer = csv.DictWriter(
        dst,
        fieldnames=fieldnames,
        delimiter=";",
        lineterminator="\n",
        extrasaction="ignore",
    )
    writer.writeheader()
    writer.writerows(rows)

print(f"Wrote: {TARGET.resolve()}")
print(f"Rows: {len(rows)}")
print("Counts:", counts)