# Excel Import Design

## Goal

Add an `Importar Excel` feature that lets the user load an existing `.xlsx` inventory into the web app.

## Confirmed Behavior

- One Excel row becomes one product row in the web app.
- Import replaces the current web inventory completely.
- The original Excel `Fecha` is preserved as the product scan date.
- The Excel `Cantidad` column becomes a first-class `Cantidad` column in the web table and exports.

## Excel Format

The existing file `inventario.xlsx` has one sheet named `Prueba scaner 1` with these columns:

- `Código de barras`
- `Nombre`
- `Descripción`
- `Cantidad`
- `Ubicación GPS`
- `Fecha`
- `Última modificación por`

Only the first five data columns needed by the app will be imported: code, name, description, quantity, and date.

## Frontend Design

- Add an `Importar Excel` button near the existing export buttons.
- Use a hidden file input that accepts `.xlsx` and `.xls`.
- Parse the file in the browser with SheetJS (`xlsx`), already present in the project.
- Read the first worksheet.
- Map columns:
  - `Código de barras` -> `code`
  - `Nombre` -> `name`
  - `Descripción` -> `desc`
  - `Cantidad` -> `qty`
  - `Fecha` -> `scanned_at`
- Before import, show a confirmation that the current list will be replaced.
- After successful import, reload the table and show a toast.

## Backend Design

- Add API action `import` to `api/app.js`.
- Validate the session token like all other protected actions.
- Receive parsed rows as JSON, not the raw Excel file.
- Clear the current `scan:ids` list and all existing `scan:{id}` records.
- Clear current duplicate indexes `code_to_scan_ids:{code}` for codes that were active before import.
- Insert each imported row as a new scan record with a fresh incrementing ID.
- Recompute status during import:
  - First active row for a code: `✓ Único`
  - Later active rows for the same code: `⚠️ REPETIDO`
- Store `qty` on each scan.

## Table And Export

- Add `Cantidad` column to the product table.
- Keep inline editing limited to `Nombre` and `Descripción` for now.
- Include `Cantidad` in CSV/XLSX exports.

## Error Handling

- If the Excel has no readable rows, show an import error.
- If a row has no barcode, skip it.
- If the backend import fails, keep the visible table unchanged and show an error toast.

## Testing

- Parse `inventario.xlsx` and confirm 38 rows are read.
- Import rows and verify the web list has the expected count.
- Verify duplicate statuses are recalculated based only on imported rows.
- Verify deleting all rows allows the same code to be scanned as `✓ Único` again.
- Verify CSV/XLSX export includes `Cantidad`.
