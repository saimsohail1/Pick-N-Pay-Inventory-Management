#!/usr/bin/env python3
"""
Convert a RetailItems export CSV into an SQL import script for the
PickNPay inventory system (tables: categories, items).

Handles quirks of the source export:
  - one record broken across two physical lines (unterminated quote)
  - unquoted commas inside item names
  - trailing/leading whitespace in names and category names
  - duplicate barcodes: the CSV has no batch column, so these are the same
    product entered twice; only one row is kept per barcode (preferring the
    row with actual stock movement, then the later expiry date)
  - "Normal VAT 20%" rows (UK rate) are mapped to 23%
  - expiry dates DD/MM/YYYY -> YYYY-MM-DD into items.general_expiry_date

Output: multi-row INSERTs, idempotent (safe to re-run).
Usage: python3 convert_retail_items_csv_to_sql.py <input.csv> <output.sql>
"""
import sys
import re
import collections
from datetime import datetime

EXPECTED_FIELDS = 22
NAME_IDX = 2  # Item Name column position


def load_records(path):
    raw = open(path, encoding="utf-8-sig").read().splitlines()
    header = [h.strip() for h in raw[0].split(",")]
    assert len(header) == EXPECTED_FIELDS, f"unexpected header: {header}"

    records = []
    i = 1
    while i < len(raw):
        line = raw[i]
        # A record with fewer than 21 commas was broken by a newline
        # inside a field; keep appending physical lines until complete.
        while line.count(",") < EXPECTED_FIELDS - 1 and i + 1 < len(raw):
            i += 1
            line = line + " " + raw[i]
        line = line.replace('"', "")
        parts = line.split(",")
        if len(parts) > EXPECTED_FIELDS:
            # extra commas belong to the item name field
            extra = len(parts) - EXPECTED_FIELDS
            parts = (
                parts[:NAME_IDX]
                + [",".join(parts[NAME_IDX : NAME_IDX + 1 + extra])]
                + parts[NAME_IDX + 1 + extra :]
            )
        assert len(parts) == EXPECTED_FIELDS, f"bad record at line {i + 1}: {parts}"
        records.append(dict(zip(header, [p.strip() for p in parts])))
        i += 1
    return records


def sql_str(value):
    if value is None or value == "":
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def convert_expiry(ddmmyyyy):
    return datetime.strptime(ddmmyyyy, "%d/%m/%Y").strftime("%Y-%m-%d")


def normalise_vat(vat_rate_str):
    rate = float(vat_rate_str or 0)
    if rate == 20:  # UK standard rate in source data; Irish standard is 23
        rate = 23
    return f"{rate:.2f}"


def main():
    src, dst = sys.argv[1], sys.argv[2]
    records = load_records(src)

    # ---- categories: majority VAT rate among their items becomes the default
    cat_vats = collections.defaultdict(collections.Counter)
    for r in records:
        cat = r["Category"]
        if cat:
            cat_vats[cat][normalise_vat(r["VAT Rate"])] += 1
    categories = {c: v.most_common(1)[0][0] for c, v in sorted(cat_vats.items())}

    # ---- duplicate barcodes: keep one row per barcode, drop the rest.
    # Preference: row with stock movement (qty != 0) > later expiry > first seen.
    def sort_key(r):
        qty = int(float(r["Quantity"] or 0))
        expiry = (
            datetime.strptime(r["Expiry Date"], "%d/%m/%Y")
            if r["Expiry Date"]
            else datetime.min
        )
        return (qty != 0, expiry)

    groups = collections.defaultdict(list)
    for r in records:
        groups[r["Item Barcode"]].append(r)

    kept, dropped = [], []
    for r in records:
        grp = groups[r["Item Barcode"]]
        if r["Item Barcode"] and len(grp) > 1:
            winner = max(grp, key=sort_key)
            if r is not winner:
                dropped.append(r)
                continue
        kept.append(r)

    items = []
    for r in kept:
        name = re.sub(r"\s+", " ", r["Item Name"]).strip()
        items.append(
            {
                "name": name,
                "description": f"Product Code: {r['Product Code']}" if r["Product Code"] else None,
                "price": f"{float(r['Price']):.2f}",
                # negative quantities in the export are oversell artifacts; clamp to 0
                "stock": max(0, int(float(r["Quantity"] or 0))),
                "barcode": r["Item Barcode"] or None,
                "vat": normalise_vat(r["VAT Rate"]),
                "expiry": convert_expiry(r["Expiry Date"]) if r["Expiry Date"] else None,
                "category": r["Category"] or None,
            }
        )

    out = []
    out.append("-- =====================================================================")
    out.append("-- Import of RetailItems CSV export into the PickNPay inventory system")
    out.append(f"-- Source: {src.split('/')[-1]}")
    out.append(f"-- Generated: {datetime.now():%Y-%m-%d %H:%M}")
    out.append(f"-- {len(categories)} categories, {len(items)} items")
    out.append("-- Idempotent: categories matched by name, items matched by barcode")
    out.append("-- (or by name for items without a barcode). Safe to re-run.")
    out.append("-- =====================================================================")
    out.append("")
    out.append("BEGIN;")
    out.append("")
    out.append("-- ---------- 1. Categories (VAT = majority rate of their items) ----------")
    out.append("INSERT INTO categories (name, description, is_active, display_on_pos, vat_rate, created_at, updated_at)")
    out.append("SELECT v.name, NULL, true, true, v.vat_rate::numeric, now(), now()")
    out.append("FROM (VALUES")
    cat_rows = [f"    ({sql_str(c)}, {sql_str(v)})" for c, v in categories.items()]
    out.append(",\n".join(cat_rows))
    out.append(") AS v(name, vat_rate)")
    out.append("WHERE NOT EXISTS (")
    out.append("    SELECT 1 FROM categories c WHERE lower(trim(c.name)) = lower(v.name)")
    out.append(");")
    out.append("")
    out.append("-- ---------- 2. Items ----------")

    CHUNK = 500
    for start in range(0, len(items), CHUNK):
        chunk = items[start : start + CHUNK]
        out.append(f"-- items {start + 1}..{start + len(chunk)}")
        out.append("INSERT INTO items (name, description, price, stock_quantity, barcode,")
        out.append("                   vat_rate, general_expiry_date, category_id, created_at, updated_at)")
        out.append("SELECT v.name, v.description, v.price::numeric, v.stock, v.barcode,")
        out.append("       v.vat_rate::numeric, v.expiry::date,")
        out.append("       (SELECT c.id FROM categories c WHERE lower(trim(c.name)) = lower(v.category)),")
        out.append("       now(), now()")
        out.append("FROM (VALUES")
        rows = []
        for it in chunk:
            rows.append(
                "    ({name}, {desc}, {price}, {stock}, {barcode}, {vat}, {expiry}, {cat})".format(
                    name=sql_str(it["name"]),
                    desc=sql_str(it["description"]),
                    price=f"'{it['price']}'",
                    stock=it["stock"],
                    barcode=sql_str(it["barcode"]),
                    vat=f"'{it['vat']}'",
                    expiry=sql_str(it["expiry"]),
                    cat=sql_str(it["category"]),
                )
            )
        out.append(",\n".join(rows))
        out.append(") AS v(name, description, price, stock, barcode, vat_rate, expiry, category)")
        out.append("WHERE NOT EXISTS (")
        out.append("    SELECT 1 FROM items i")
        out.append("    WHERE (v.barcode IS NOT NULL AND i.barcode = v.barcode)")
        out.append("       OR (v.barcode IS NULL AND lower(i.name) = lower(v.name))")
        out.append(");")
        out.append("")

    out.append("COMMIT;")
    out.append("")
    out.append("-- ---------- Verification ----------")
    out.append("SELECT COUNT(*) AS total_items FROM items;")
    out.append("SELECT c.name, c.vat_rate, COUNT(i.id) AS items")
    out.append("FROM categories c LEFT JOIN items i ON i.category_id = c.id")
    out.append("GROUP BY c.id ORDER BY items DESC;")

    with open(dst, "w") as f:
        f.write("\n".join(out) + "\n")

    print(f"records parsed:       {len(records)}")
    print(f"categories:           {len(categories)}")
    print(f"items written:        {len(items)}")
    print(f"items w/o category:   {sum(1 for i in items if not i['category'])}")
    print(f"duplicate-barcode rows removed: {len(dropped)}")
    for r in dropped:
        print(f"    {r['Item Barcode']}  {r['Item Name'][:60]!r} (kept the other row)")
    vat_dist = collections.Counter(i["vat"] for i in items)
    print(f"item VAT distribution: {dict(vat_dist)}")
    print(f"output: {dst}")


if __name__ == "__main__":
    main()
