# Barcode Duplicate Detector — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PWA that scans barcodes from the phone camera, detects duplicates in real time, and exports results to Excel.

**Architecture:** Single `index.html` with inline CSS/JS. Uses `html5-qrcode` for camera scanning, `xlsx` (SheetJS) for Excel export, and `localStorage` for offline persistence. Optional Google Sheets sync via Google Apps Script.

**Tech Stack:** HTML5, CSS3, JS vanilla, html5-qrcode, SheetJS/xlsx

---

### Task 1: Create HTML structure

**Files:**
- Create: `index.html`

- [ ] **Step 1: Write the HTML skeleton with CDN links**

Create `index.html` with the basic structure:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Detector de Códigos Duplicados</title>
  <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <link rel="manifest" href="manifest.json">
  <style>
    /* all styles here — will be expanded in Task 2 */
  </style>
</head>
<body>
  <div id="app">
    <header>
      <h1>📷 Escáner de Códigos</h1>
      <span id="scanCount">0 escaneados</span>
    </header>

    <div id="scanner-container"></div>
    <div id="lastScan">Esperando código...</div>
    <div id="alert"></div>

    <div id="results-header">
      <h2>Resultados</h2>
      <button id="exportBtn" onclick="exportExcel()">📥 Exportar Excel</button>
    </div>

    <div id="table-wrapper">
      <table id="resultsTable">
        <thead>
          <tr>
            <th></th>
            <th>Código</th>
            <th>Nombre</th>
            <th>Veces</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody id="tableBody"></tbody>
      </table>
    </div>

    <div id="actions">
      <button id="clearBtn" onclick="clearAll()">🗑️ Limpiar todo</button>
    </div>
  </div>

  <script>
    // all JS here — will be expanded in Task 3
  </script>
</body>
</html>
```

- [ ] **Step 2: Verify HTML loads in browser**

Run: `npx serve .` from project root. Open on phone browser on same network. Verify page loads with all sections visible.

---

### Task 2: Add CSS styles

**Files:**
- Modify: `index.html` (replace the `<style>` block)

- [ ] **Step 1: Write complete styles**

Replace the `<style>` block with:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f1a; color: #e0e0e0; min-height: 100vh; }

header { background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 16px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10; }
header h1 { font-size: 18px; }
#scanCount { font-size: 14px; color: #888; }

#scanner-container { width: 100%; max-width: 500px; margin: 0 auto; background: #000; min-height: 220px; }
#scanner-container video { width: 100%; display: block; }

#lastScan { text-align: center; padding: 12px; font-size: 16px; color: #aaa; background: #1a1a2e; margin-bottom: 8px; }

#alert { display: none; text-align: center; padding: 10px; font-weight: bold; font-size: 16px; margin: 8px; border-radius: 8px; }
#alert.success { display: block; background: #1b4332; color: #52b788; }
#alert.warning { display: block; background: #4a3000; color: #ffd60a; }

#results-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; }
#results-header h2 { font-size: 16px; }
#exportBtn { background: #1d4ed8; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-size: 14px; cursor: pointer; }
#exportBtn:hover { background: #2563eb; }

#table-wrapper { overflow-x: auto; padding: 0 8px; }
table { width: 100%; border-collapse: collapse; }
th { background: #1a1a2e; padding: 10px 8px; text-align: left; font-size: 13px; color: #888; position: sticky; top: 52px; }
td { padding: 10px 8px; border-bottom: 1px solid #1e1e30; font-size: 14px; }
tr.duplicate { background: #2d1a1a; }
tr.duplicate td:first-child { color: #ff4444; }
tr.unique td:first-child { color: #4ade80; }
.status-icon { font-size: 18px; }
.status-duplicate { color: #ff4444; font-weight: bold; }
.status-unique { color: #4ade80; }

#actions { padding: 16px; text-align: center; }
#clearBtn { background: #3a1a1a; color: #ff6b6b; border: 1px solid #5a2a2a; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; }

@media (max-width: 480px) {
  header h1 { font-size: 16px; }
  th, td { font-size: 12px; padding: 8px 4px; }
}
```

- [ ] **Step 2: Verify styles render**

Reload page. Verify dark theme, sticky header, scanner area, table, buttons all render correctly.

---

### Task 3: Implement barcode scanner with html5-qrcode

**Files:**
- Modify: `index.html` (replace the `<script>` block)

- [ ] **Step 1: Write scanner initialization code**

Replace the empty `<script>` with:

```js
const STATE_KEY = 'barcode_scanner_state';
let scans = JSON.parse(localStorage.getItem(STATE_KEY)) || [];
let html5QrcodeScanner = null;

function startScanner() {
  html5QrcodeScanner = new Html5QrcodeScanner(
    "scanner-container",
    { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 },
    false
  );
  html5QrcodeScanner.render(onScanSuccess, onScanError);
}

function onScanSuccess(decodedText) {
  processScan(decodedText.trim());
}

function onScanError(err) {
  // ignore — camera keeps trying
}

function processScan(code) {
  if (!code) return;

  const existing = scans.find(s => s.code === code);
  if (existing) {
    existing.count += 1;
    existing.status = 'duplicate';
  } else {
    scans.push({ code, count: 1, status: 'unique' });
  }

  saveState();
  renderTable();
  showLastScan(code, existing !== undefined);
  if (existing) {
    showAlert('⚠️ Código duplicado: ' + code, 'warning');
  } else {
    showAlert('✅ Código nuevo: ' + code, 'success');
  }
}

function showLastScan(code, isDuplicate) {
  const el = document.getElementById('lastScan');
  el.textContent = 'Último: ' + code;
  el.style.color = isDuplicate ? '#ff6b6b' : '#52b788';
}

function showAlert(msg, type) {
  const el = document.getElementById('alert');
  el.textContent = msg;
  el.className = type;
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => { el.style.display = 'none'; }, 2000);
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(scans));
}

function clearAll() {
  if (!confirm('¿Limpiar todos los escaneos?')) return;
  scans = [];
  saveState();
  renderTable();
  document.getElementById('lastScan').textContent = 'Esperando código...';
  document.getElementById('scanCount').textContent = '0 escaneados';
}

startScanner();
renderTable();
```

- [ ] **Step 2: Test scanner starts**

Reload on phone. Grant camera permission. Verify camera viewfinder appears and scanner starts.

---

### Task 4: Implement table render with duplicate detection

**Files:**
- Modify: `index.html` (add renderTable function inside script)

- [ ] **Step 1: Add renderTable function**

Add this function before `startScanner()`:

```js
function renderTable() {
  const tbody = document.getElementById('tableBody');
  const count = document.getElementById('scanCount');

  const sorted = [...scans].sort((a, b) => {
    if (a.status === 'duplicate' && b.status !== 'duplicate') return -1;
    if (a.status !== 'duplicate' && b.status === 'duplicate') return 1;
    return 0;
  });

  tbody.innerHTML = sorted.map((s, i) => {
    const isDup = s.status === 'duplicate';
    return `
      <tr class="${isDup ? 'duplicate' : 'unique'}">
        <td class="status-icon">${isDup ? '⚠️' : '✅'}</td>
        <td>${escapeHtml(s.code)}</td>
        <td>${s.count}</td>
        <td class="${isDup ? 'status-duplicate' : 'status-unique'}">${isDup ? 'REPETIDO' : 'Único'}</td>
      </tr>
    `;
  }).join('');

  count.textContent = scans.length + ' escaneados';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

- [ ] **Step 2: Test scanning detection**

Open app on phone. Scan a barcode → verify it appears in table as "Único". Scan the same barcode again → verify it switches to "REPETIDO" with ⚠️ and red highlight. Scan a different code → verify it shows as "Único".

---

### Task 5: Implement Excel export (only duplicates)

**Files:**
- Modify: `index.html` (add exportExcel function)

- [ ] **Step 1: Add exportExcel function**

Add before `startScanner()`:

```js
function exportExcel() {
  const duplicates = scans.filter(s => s.status === 'duplicate');
  if (duplicates.length === 0) {
    showAlert('No hay códigos repetidos para exportar', 'warning');
    return;
  }

  const data = duplicates.map((s, i) => ({
    '#': i + 1,
    'Código': s.code,
    'Veces escaneado': s.count
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Duplicados');
  XLSX.writeFile(wb, 'codigos_duplicados_' + Date.now() + '.xlsx');
}
```

- [ ] **Step 2: Test Excel export**

Scan at least 2 codes, duplicate at least one. Click "Exportar Excel". Verify a `.xlsx` file downloads containing ONLY the duplicated codes.

---

### Task 6: Add PWA manifest for install prompt

**Files:**
- Create: `manifest.json`

- [ ] **Step 1: Create manifest.json**

```json
{
  "name": "Detector de Códigos Duplicados",
  "short_name": "DupliScan",
  "description": "Escanea códigos de barra y detecta duplicados",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#0f0f1a",
  "theme_color": "#1a1a2e",
  "icons": [
    {
      "src": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%231a1a2e'/%3E%3Ctext x='50' y='68' text-anchor='middle' font-size='55'%3E📷%3C/text%3E%3C/svg%3E",
      "sizes": "192x192",
      "type": "image/svg+xml"
    }
  ]
}
```

- [ ] **Step 2: Create service worker for offline support**

Add at the end of `index.html`, before `</body>`:

```html
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
</script>
```

Create `sw.js`:

```js
const CACHE = 'barcode-cache-v1';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['.', 'index.html', 'manifest.json'])));
  self.skipWaiting();
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request) || fetch(e.request));
});
```

---

### Task 7: Add Google Sheets integration (optional)

**Files:**
- Modify: `index.html` (add Google Sheets sync)

- [ ] **Step 1: Add Google Sheets sync button and function**

Add button next to export in the HTML:
```html
<button id="sheetsBtn" onclick="syncToSheets()">🔗 Enviar a Google Sheets</button>
```

Add function:
```js
const SHEETS_URL = ''; // User must set their Google Apps Script Web App URL

function syncToSheets() {
  if (!SHEETS_URL) {
    showAlert('Configurá la URL de Google Sheets primero', 'warning');
    return;
  }
  fetch(SHEETS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scans })
  }).then(() => showAlert('✅ Datos enviados a Google Sheets', 'success'))
    .catch(() => showAlert('❌ Error al enviar a Sheets', 'warning'));
}
```

- [ ] **Step 2: Verify sync button appears**

---

### Task 8: Final polish and testing

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Ensure mobile viewport and zoom work correctly**

Verify `user-scalable=no` is in meta viewport. Test on actual phone.

- [ ] **Step 2: Full integration test**

1. Open on phone → camera starts
2. Scan 3 different codes → all show "Único"
3. Scan code #1 again → alert "⚠️ Código duplicado", code shows "REPETIDO"
4. Scan code #1 a third time → count goes to 3
5. Export Excel → file downloads with 1 row (only the duplicate)
6. Clear all → table empties, counter resets
7. Reload page → state persists from localStorage
