"""Extract the Unified ZIP Code set from the delivered workbook into open data.

The workbook is the 24 July 2019 deliverable. This script is the only thing that
reads it; everything downstream reads the CSVs it writes.
"""
import zipfile, re, csv, json, sys, collections
from pathlib import Path

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else
           "../references/unified-zip-codes/Unified ZIP Codes 07242019.xlsx")
OUT = Path(__file__).resolve().parent.parent / "data"

z = zipfile.ZipFile(SRC)
ss = [re.sub(r"<.*?>", "", s)
      for s in re.findall(r"<si>(.*?)</si>", z.read("xl/sharedStrings.xml").decode(), re.S)]

def sheet(name):
    xml = z.read("xl/worksheets/" + name).decode()
    for rm in re.finditer(r'<row r="(\d+)"[^>]*>(.*?)</row>', xml, re.S):
        cells = {}
        for cm in re.finditer(
            r'<c r="([A-Z]+)\d+"([^>]*)>(?:<v>(.*?)</v>|<is>(.*?)</is>)?</c>',
            rm.group(2), re.S):
            col, attrs, v, isv = cm.groups()
            if v is None and isv is None:
                continue
            val = re.sub(r"<.*?>", "", isv) if isv is not None else v
            if 't="s"' in attrs and v is not None:
                val = ss[int(v)]
            cells[col] = val
        yield int(rm.group(1)), cells

# Excel stores PSGC as a number, so leading zeros are gone. Nine digits always.
def psgc9(v):
    return (v or "").zfill(9)

provinces = {}                      # name -> two letters
for n, c in sheet("sheet3.xml"):
    if n > 1 and "B" in c and "D" in c:
        provinces[c["B"]] = c["D"]

municipalities = {}                 # (province, name) -> four chars, e.g. AB01
for n, c in sheet("sheet4.xml"):
    if n > 1 and "E" in c:
        municipalities[(c["B"], c["C"])] = c["E"]

barangays = []
for n, c in sheet("sheet6.xml"):
    if n == 1:
        continue
    barangays.append({
        "province": c["B"], "municipality": c["C"], "barangay": c["D"],
        "psgc": psgc9(c.get("E")), "unified": c.get("F", ""),
        "postal": c.get("G", ""),
    })

# The rule: municipality code + the barangay digits of the PSGC.
exceptions = collections.Counter()
for b in barangays:
    derived = municipalities[(b["province"], b["municipality"])] + b["psgc"][6:9]
    b["derived"] = derived == b["unified"]
    if not b["derived"]:
        exceptions[(b["province"], b["municipality"])] += 1

OUT.mkdir(exist_ok=True)
with (OUT / "provinces.csv").open("w", newline="") as f:
    w = csv.writer(f); w.writerow(["province", "code"])
    w.writerows(sorted(provinces.items()))
with (OUT / "municipalities.csv").open("w", newline="") as f:
    w = csv.writer(f); w.writerow(["province", "municipality", "code"])
    w.writerows(sorted((p, m, c) for (p, m), c in municipalities.items()))
with (OUT / "unified-zip-codes.csv").open("w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["province", "municipality", "barangay", "psgc", "unified", "postal"])
    for b in barangays:
        w.writerow([b["province"], b["municipality"], b["barangay"],
                    b["psgc"], b["unified"], b["postal"]])

print(f"provinces      {len(provinces)}")
print(f"municipalities {len(municipalities)}")
print(f"barangays      {len(barangays)}")
print(f"unique codes   {len(set(b['unified'] for b in barangays))}")
print(f"follow the derivation rule {sum(b['derived'] for b in barangays)}")
print("exceptions:")
for (p, m), v in exceptions.most_common():
    print(f"   {m}, {p}: {v}")

# A compact tree for the browser. Every unified code is its municipality code
# plus a three-character barangay part, including the two exceptions, so the
# barangay part is all that needs storing.
tree = []
by_prov = collections.defaultdict(lambda: collections.defaultdict(list))
for b in barangays:
    by_prov[b["province"]][b["municipality"]].append(b)
for prov in sorted(by_prov):
    munis = []
    for muni in sorted(by_prov[prov]):
        code = municipalities[(prov, muni)]
        rows = [[b["unified"][4:], b["barangay"], b["psgc"], b["postal"]]
                for b in sorted(by_prov[prov][muni], key=lambda x: x["barangay"])]
        munis.append([code[2:], muni, rows])
    tree.append([provinces[prov], prov, munis])

payload = {"version": "2019-07-24", "count": len(barangays), "provinces": tree}
(OUT / "unified-zip-codes.json").write_text(
    json.dumps(payload, separators=(",", ":"), ensure_ascii=False))
print(f"\nwrote unified-zip-codes.json "
      f"({(OUT / 'unified-zip-codes.json').stat().st_size // 1024} KB)")
