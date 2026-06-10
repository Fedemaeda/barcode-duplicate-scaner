# Excel Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Excel import flow that replaces the current inventory with rows from a `.xlsx` file.

**Architecture:** The browser parses Excel with SheetJS and sends normalized JSON rows to the existing `/api/app` endpoint. The backend replaces all active scan records, rebuilds duplicate indexes, stores `qty`, and the table/export paths display that quantity.

**Tech Stack:** Plain HTML/CSS/JS frontend, SheetJS `xlsx`, Vercel serverless CommonJS API, Vercel KV/Upstash Redis.

---

### Task 1: Add Backend Import Action

**Files:**
- Modify: `api/app.js`

- [ ] **Step 1: Add `qty` support and import action**

Implement `action === 'import'` after the existing `list` action. The action receives `rows`, deletes existing active scans, deletes active duplicate indexes for the cleared codes, inserts each valid imported row, and rebuilds `code_to_scan_ids:{code}`.

- [ ] **Step 2: Run API smoke test**

Run a Node integration script that logs in, imports two rows with the same code, lists rows, deletes both, imports one row with the same code again, and verifies it is `✓ Único`.

Expected: import returns `{ success: true, count: N }`; first duplicate group row is `✓ Único`; subsequent rows are `⚠️ REPETIDO`.

### Task 2: Add Quantity To Export

**Files:**
- Modify: `api/export.js`

- [ ] **Step 1: Include `Cantidad` in exported rows**

Add `Cantidad: p.qty || ''` between `Descripción` and `Estado`.

- [ ] **Step 2: Verify CSV export**

Run an import with `qty: 3`, request `/api/export?format=csv`, and verify header includes `Cantidad` and the row includes `3`.

### Task 3: Add Frontend Import UI

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add SheetJS browser script**

Add `https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js` before app JS.

- [ ] **Step 2: Add import button and hidden file input**

Add an `Importar Excel` button next to exports and an `<input type="file" accept=".xlsx,.xls">`.

- [ ] **Step 3: Parse first worksheet and call API**

Use `XLSX.read(arrayBuffer, { type: 'array', cellDates: true })`, map columns to `{ code, name, desc, qty, scanned_at }`, confirm replacement, and call `{ action: 'import', rows, token }`.

- [ ] **Step 4: Show quantity in table**

Add `Cantidad` column to table rows using `esc(p.qty || '')`.

### Task 4: Deploy And Verify

**Files:**
- Modify: `sw.js`

- [ ] **Step 1: Bump service worker version**

Set cache version to `dupliscan-v9`.

- [ ] **Step 2: Deploy production**

Run `npx vercel --prod`.

- [ ] **Step 3: Verify deployed code**

Fetch `https://scanspot.vercel.app/` and confirm it contains `Importar Excel` and `handleImportFile`.

- [ ] **Step 4: Commit**

Commit spec, plan, and implementation with `feat: add Excel import replacing inventory`.

---

## Self-Review

- Spec coverage: import, replace-current-list behavior, date preservation, quantity column, duplicate recalculation, table, and export are covered.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: frontend rows and backend scan objects use `code`, `name`, `desc`, `qty`, and `scanned_at` consistently.
