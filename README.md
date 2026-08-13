# Unified ZIP Code

A seven character postal code for the Philippines that resolves to the barangay.

```
BC23023
^^        province, two letters       Bulacan
  ^^      municipality, two digits    San Rafael
    ^^^   barangay, three digits      Poblacion
```

The Philippine zip code is four digits and resolves to a city or municipality.
[PHLPost's own locator](https://phlpost.gov.ph/zip-code/) returns one code for a
whole city, so in Malabon twelve of the twenty one barangays share the code 1470.
Four digits cannot separate 42,047 barangays, and a sorting machine cannot
sequence deliveries against a code that stops at the city.

This repository holds the code set that was produced to fix that, covering every
barangay in the country, together with a small library for looking codes up.

## The data

`data/unified-zip-codes.csv`, 42,047 rows.

| column | |
|---|---|
| `province` | |
| `municipality` | city or municipality |
| `barangay` | |
| `psgc` | the nine digit Philippine Standard Geographic Code |
| `unified` | the seven character code |
| `postal` | the existing four digit zip code, where one exists |

Every barangay carries its geographic code and its existing postal code
alongside the new one, so the three can be reconciled instead of requiring a
cutover on a single day.

`data/unified-zip-codes.json` is the same data as a compact tree for the
browser. 1.6 MB, about 430 KB over the wire.

`data/provinces.csv` and `data/municipalities.csv` hold the two letter and four
character prefixes on their own.

## Why it is built this way

**Seven characters, because a person has to hold it.** Miller's Law puts what an
average person reliably holds at about seven items. Systems that locate better
than this exist. What3Words resolves to a three metre square, which across
300,000 km² of Philippines is 33 billion addresses; its codes also carry no
proximity relationship, so two adjacent squares tell you nothing about each
other, and proximity is what a sorting machine sorts on. Google Plus Codes,
Natural Area Coding, MGRS, mapcode and makani have the same problem in different
proportions. None of them works on a sorting belt or on an envelope somebody is
filling in by hand.

**Two letters in front, because a code that carries meaning survives being
written out by hand.** This is borrowed from the United States, where `CA 90210`
puts two letters of meaning in front of five digits of structure. A Filipino
seeing `BC` can tell you it is Bulacan.

**Derived from the PSGC, because the classification is not the post office's to
set.** The Philippine Statistics Authority is the central statistical authority
mandated under [Republic Act 10625](https://lawphil.net/statutes/repacts/ra2013/ra_10625_2013.html)
to develop and maintain the country's classification standards. Deriving the
code from the standard PSA already maintains means the structure exists and
stays current at the source.

## Deriving a code

For 1,632 of the 1,634 municipalities, the code is the municipality's four
character prefix followed by the barangay digits of its PSGC:

```
PSGC     031422023
                ^^^  barangay digits
BC23  +  023  =  BC23023
```

Two municipalities do not follow this, and the data is the authority for them:

- **Manila.** 896 of its 897 barangays use a sequential index rather than the
  PSGC barangay digits.
- **Cebu City.** North Reclamation Area and Santo Niño have no PSGC assigned, and
  are coded `CE17999` and `CE17998`, outside the derived range.

Those two are the reason this ships as data rather than as an algorithm. They
are also the problem the format does not solve on its own: barangays get
created, merged and renamed, PSA can change codes at any time, and a code set is
stale from the moment an administrative boundary moves.

## Using it

```js
import { UnifiedZipCode, parse, isValid } from "unified-zip-code";
import data from "unified-zip-code/data" with { type: "json" };

const uzc = new UnifiedZipCode(data);

uzc.get("BC23023");
// { code: 'BC23023', barangay: 'Poblacion', municipality: 'San Rafael',
//   province: 'Bulacan', psgc: '031422023', postal: '3008' }

uzc.fromPsgc("031422023");         // the same record
uzc.search("Poblacion San Rafael"); // [ ...records ]

uzc.provinces();                    // 82
uzc.municipalities("Bulacan");      // every municipality, with its prefix
uzc.barangays("San Rafael", "Bulacan");

parse("BC23023");   // { province: 'BC', municipality: 'BC23', barangay: '023' }
isValid("BC2302");  // false
```

`parse` and `isValid` work on the shape of a code alone and need no data
loaded, which is what you want in form validation.

In a browser, fetch the JSON when the user first needs it rather than on page
load:

```js
import { load } from "unified-zip-code";
const uzc = await load("/data/unified-zip-codes.json");
```

## The API

Live at [zip.jamesventura.dev](https://zip.jamesventura.dev). Public, no key,
60 requests a minute per address. Every response is JSON carrying an `ok` field.
CORS is open, so it works from a browser.

| Endpoint | Returns |
|---|---|
| `/api/lookup?code=BC23023` | one barangay |
| `/api/lookup?psgc=031422023` | one barangay, by geographic code |
| `/api/search?q=malabon&limit=25` | matching barangays, limit 1 to 100 |
| `/api/provinces` | all 82 provinces |
| `/api/municipalities?province=Bulacan` | municipalities, with their prefixes |
| `/api/barangays?municipality=BC23` | barangays in a municipality |

```json
{
  "ok": true,
  "query": { "code": "BC23023" },
  "data": {
    "code": "BC23023",
    "barangay": "Poblacion",
    "municipality": "San Rafael",
    "province": "Bulacan",
    "psgc": "031422023",
    "postal": "3008"
  }
}
```

A refusal carries `ok: false`, an `error`, and usually a `hint`. Every response
carries `x-ratelimit-limit`, `x-ratelimit-remaining` and `x-ratelimit-reset`; a
429 also carries `retry-after`.

The limit is counted in memory, so on Vercel each serverless container keeps its
own tally and a cold start resets the window. That is enough for a public
demonstration and it is not enforcement. Enforcing it means a shared store,
which this project has not paid for.

## Running it

```
npm test        # 17 tests
npm run dev     # the app and the API, locally
npm run build   # a Vercel build
npm run extract # regenerate the data from the source workbook
```

The library itself has no dependencies. Astro and the Vercel adapter are there
only to serve the app and the API.

`scripts/extract.py` is the only thing that reads the original workbook.
Everything else reads the CSVs it writes.

## Status

This is the code set as delivered to the Philippine Postal Corporation on
24 July 2019. PHLPost's locator still returns a city or municipality.

The code set is a snapshot and PSA has continued to publish the PSGC since, so
barangays created, merged or renamed after that date are not in it. Anyone
depending on this should treat the PSGC as the source of truth and regenerate.

## Licence

MIT, see [LICENSE](LICENSE).

The Philippine Standard Geographic Code is published by the Philippine
Statistics Authority. The existing four digit zip codes are published by the
Philippine Postal Corporation.
