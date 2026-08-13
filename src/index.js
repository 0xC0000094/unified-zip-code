/**
 * Unified ZIP Code. A seven character postal code for the Philippines,
 * resolving to the barangay.
 *
 *   BC23023
 *   ^^        province, two letters        Bulacan
 *     ^^      municipality, two digits     San Rafael
 *       ^^^   barangay, three digits       Poblacion
 *
 * Zero dependencies. Works in Node and in a browser.
 */

const CODE = /^([A-Z]{2})(\d{2})(\d{3})$/;

/**
 * Split a code into its parts without consulting the data.
 * Returns null if the string is not a well formed code.
 */
export function parse(code) {
  const m = CODE.exec(String(code || "").trim().toUpperCase());
  if (!m) return null;
  return { province: m[1], municipality: m[1] + m[2], barangay: m[3], code: m[0] };
}

/** True if the string is a well formed code. Says nothing about whether it exists. */
export function isValid(code) {
  return parse(code) !== null;
}

const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export class UnifiedZipCode {
  /**
   * @param {object} data the parsed contents of data/unified-zip-codes.json
   */
  constructor(data) {
    if (!data || !Array.isArray(data.provinces)) {
      throw new TypeError("expected the unified-zip-codes.json payload");
    }
    this.version = data.version;
    this.count = data.count;
    this._byCode = new Map();
    this._byPsgc = new Map();
    this._records = [];
    this._provinces = [];

    for (const [pCode, pName, munis] of data.provinces) {
      const province = { code: pCode, name: pName, municipalities: [] };
      this._provinces.push(province);
      for (const [mSuffix, mName, rows] of munis) {
        const mCode = pCode + mSuffix;
        const municipality = { code: mCode, name: mName, province: pName };
        province.municipalities.push(municipality);
        for (const [bSuffix, bName, psgc, postal] of rows) {
          const record = {
            code: mCode + bSuffix,
            barangay: bName,
            municipality: mName,
            province: pName,
            psgc,
            postal: postal || null,
          };
          this._records.push(record);
          this._byCode.set(record.code, record);
          if (psgc) this._byPsgc.set(psgc, record);
        }
      }
    }
  }

  /** Every province, with its two letter code. */
  provinces() {
    return this._provinces.map(({ code, name }) => ({ code, name }));
  }

  /** Municipalities in a province, named or by two letter code. */
  municipalities(province) {
    const p = this._findProvince(province);
    return p ? p.municipalities.map(({ code, name }) => ({ code, name })) : [];
  }

  /** Barangays in a municipality, by four character code or by names. */
  barangays(municipality, province) {
    const code = this._municipalityCode(municipality, province);
    if (!code) return [];
    return this._records.filter((r) => r.code.startsWith(code));
  }

  /** The full record for a code, or null. */
  get(code) {
    const p = parse(code);
    return p ? this._byCode.get(p.code) || null : null;
  }

  /** The full record for a nine digit PSGC, or null. */
  fromPsgc(psgc) {
    return this._byPsgc.get(String(psgc || "").padStart(9, "0")) || null;
  }

  /**
   * Free text search across barangay, municipality and province.
   * Exact code and PSGC matches are returned first.
   */
  search(query, limit = 25) {
    const direct = this.get(query) || this.fromPsgc(query);
    if (direct) return [direct];
    const q = norm(query);
    if (!q) return [];
    const terms = q.split(" ");
    const hits = [];
    for (const r of this._records) {
      const hay = norm(`${r.barangay} ${r.municipality} ${r.province}`);
      if (!terms.every((t) => hay.includes(t))) continue;
      hits.push([norm(r.barangay).startsWith(terms[0]) ? 0 : 1, hay.length, r]);
      if (hits.length > 4000) break;
    }
    hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return hits.slice(0, limit).map((h) => h[2]);
  }

  _findProvince(v) {
    const q = norm(v);
    const code = String(v || "").trim().toUpperCase();
    return (
      this._provinces.find((p) => p.code === code) ||
      this._provinces.find((p) => norm(p.name) === q) ||
      null
    );
  }

  _municipalityCode(municipality, province) {
    const raw = String(municipality || "").trim().toUpperCase();
    if (/^[A-Z]{2}\d{2}$/.test(raw)) return raw;
    const q = norm(municipality);
    const list = province
      ? (this._findProvince(province)?.municipalities ?? [])
      : this._provinces.flatMap((p) => p.municipalities);
    return list.find((m) => norm(m.name) === q)?.code ?? null;
  }
}

/** Convenience loader for Node. */
export async function load(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`could not load ${url}: ${res.status}`);
  return new UnifiedZipCode(await res.json());
}

export default UnifiedZipCode;
