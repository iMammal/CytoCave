#!/usr/bin/env python3

import argparse
import csv
import sys
from collections import Counter
from pathlib import Path


SEG_TO_GLYPH_SHAPE = {
    "1": "sphere",
    "2": "cube",
    "4": "tetrahedron",
}


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Create a CytoCave preview LUT whose glyph_shape field "
            "encodes seg_label as glyph shape. Values are not anatomical."
        )
    )
    parser.add_argument("input_lut", type=Path)
    parser.add_argument("output_lut", type=Path)
    args = parser.parse_args()

    if args.output_lut.exists():
        raise FileExistsError(f"Refusing to overwrite: {args.output_lut}")

    with args.input_lut.open(newline="", encoding="utf-8-sig") as source:
        reader = csv.DictReader(source, delimiter=";")
        if reader.fieldnames is None:
            raise ValueError("Input LUT has no header")

        required = {"seg_label"}
        missing = required.difference(reader.fieldnames)
        if missing:
            raise ValueError(f"Missing required LUT columns: {sorted(missing)}")

        rows = list(reader)
        fieldnames = list(reader.fieldnames)
        if "glyph_shape" not in fieldnames:
            fieldnames.append("glyph_shape")

    seg_counts = Counter()
    shape_counts = Counter()
    fallback_counts = Counter()

    for row_number, row in enumerate(rows, start=2):
        seg_label = row["seg_label"].strip()
        seg_counts[seg_label or "<missing>"] += 1

        if seg_label in SEG_TO_GLYPH_SHAPE:
            glyph_shape = SEG_TO_GLYPH_SHAPE[seg_label]
            if seg_label == "4":
                fallback_counts["seg_label_4_to_tetrahedron"] += 1
        else:
            glyph_shape = "star"
            fallback_counts["missing_or_unknown_to_star"] += 1
            print(
                f"warning: row {row_number}: unexpected "
                f"seg_label={seg_label!r}; using star",
                file=sys.stderr,
            )

        row["glyph_shape"] = glyph_shape
        shape_counts[glyph_shape] += 1

    args.output_lut.parent.mkdir(parents=True, exist_ok=True)

    with args.output_lut.open("x", newline="", encoding="utf-8") as target:
        writer = csv.DictWriter(
            target,
            fieldnames=fieldnames,
            delimiter=";",
            lineterminator="\n",
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"rows: {len(rows)}")
    print(f"seg_label counts: {dict(sorted(seg_counts.items()))}")
    print(f"glyph counts: {dict(sorted(shape_counts.items()))}")
    print(f"fallback counts: {dict(sorted(fallback_counts.items()))}")
    print(f"created: {args.output_lut}")


if __name__ == "__main__":
    main()
