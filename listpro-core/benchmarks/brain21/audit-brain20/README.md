# Brain 2.0 — ancestry audit

Every rotation is counted once along the physical genealogy, including trim rotations. Initial loading contributes zero. Machine compatibility remains unknown.

|Variant|Global turns|Maximum on a part path|Parts exceeding 4|First violating operation|Limit 4|Unlimited|
|---|---:|---:|---:|---:|---|---|
|balanced|16|8|13|57|reject|pass|
|fewest-cuts|15|6|17|46|reject|pass|
|low-turns|13|4|0|—|pass|pass|
|best-remnant|19|6|12|37|reject|pass|

[Per-part CSV](parts.csv). Complete per-profile JSON reports in this folder include every rotation step and blank path.
