# Duplicate Match Details Design

## Goal

When a scanned code already exists, show which active products match that duplicate code so the user can identify both products.

## Behavior

- A first scan for a code remains `✓ Único`.
- A later scan for the same code becomes `⚠️ REPETIDO`.
- The scan response includes all existing active matching rows in `matches`.
- The duplicate row stores `match_ids` and visible `match_text`.
- The table displays a `Coincidencia` column.
- CSV/XLSX export includes `Coincidencia`.

## Display

- Toast after duplicate scan: `⚠️ Coincide con #ID - Nombre`.
- Table `Coincidencia`: semicolon-separated list, e.g. `#23 - Producto original; #24 - Otro duplicado`.

## Data Model

- Existing `code_to_scan_ids:{code}` index remains the source of matching active scan IDs.
- `match_ids` stores comma-separated matching scan IDs at the time the duplicate row was created.
- `match_text` stores a human-readable snapshot for table/export readability.

## Testing

- Integration test scans the same code twice, updates the first product name, and verifies the second response contains `matches` with the original ID/name.
- Integration test verifies the duplicate row stores visible `match_text`.
- Export smoke test verifies CSV includes `Coincidencia` and the original product name.
