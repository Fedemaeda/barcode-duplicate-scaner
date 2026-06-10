# DupliScan v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild DupliScan as a full web app with persistent storage (Vercel KV), login, editable products, and XLSX/CSV export.

**Architecture:** Single-page frontend + Vercel serverless functions + Vercel KV (Redis). Eliminates all Google dependencies.

**Tech Stack:** Vanilla HTML/CSS/JS, Vercel KV, xlsx (SheetJS), Node.js 18+

---

### Task 1: Setup package.json and dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "scanspot",
  "private": true,
  "dependencies": {
    "@vercel/kv": "^1.0.1",
    "xlsx": "^0.18.5"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @vercel/kv and xlsx dependencies"
```

---

### Task 2: Create api/app.js (main API handler)

**Files:**
- Create: `api/app.js`
- Remove: `api/scan.js`
- Remove: `api/data.js`

- [ ] **Step 1: Write api/app.js**

This handles: login, scan, list, update, delete. All via POST with `req.body.action`.

```javascript
import { kv } from '@vercel/kv';
import crypto from 'crypto';

const USER = 'elimaeda';
const PASS = 'sofiyjuli';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { action, token, code, id, name, desc, user, pass } = req.body || {};
  if (!action) return res.status(400).json({ error: 'Missing action' });

  try {
    // ── LOGIN ──────────────────────────────────────────────
    if (action === 'login') {
      if (user !== USER || pass !== PASS) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
      const sessionToken = crypto.randomBytes(24).toString('hex');
      await kv.set(`token:${sessionToken}`, USER, { ex: 86400 });
      return res.json({ token: sessionToken });
    }

    // ── AUTH CHECK ─────────────────────────────────────────
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    const sessionUser = await kv.get(`token:${token}`);
    if (!sessionUser) return res.status(401).json({ error: 'Sesión expirada' });

    // ── LIST ────────────────────────────────────────────────
    if (action === 'list') {
      const ids = await kv.smembers('product:ids');
      if (!ids.length) return res.json([]);
      const pipe = kv.pipeline();
      ids.forEach(id => pipe.hgetall(`product:${id}`));
      const products = (await pipe.exec()).filter(Boolean);
      return res.json(products.sort((a, b) => (b.scanned_at || '').localeCompare(a.scanned_at || '')));
    }

    // ── SCAN ────────────────────────────────────────────────
    if (action === 'scan') {
      if (!code) return res.status(400).json({ error: 'Missing code' });
      const existing = await kv.hgetall(`product:${code}`);
      if (existing) {
        return res.json({ success: true, status: 'duplicate', id: code, product: existing });
      }
      const now = new Date().toISOString();
      const product = { id: code, code, name: '', desc: '', scanned_at: now, updated_at: now };
      await kv.hset(`product:${code}`, product);
      await kv.sadd('product:ids', code);
      return res.json({ success: true, status: 'unique', id: code, product });
    }

    // ── UPDATE ──────────────────────────────────────────────
    if (action === 'update') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const existing = await kv.hgetall(`product:${id}`);
      if (!existing) return res.status(404).json({ error: 'Product not found' });
      if (name !== undefined) existing.name = name;
      if (desc !== undefined) existing.desc = desc;
      existing.updated_at = new Date().toISOString();
      await kv.hset(`product:${id}`, existing);
      return res.json({ success: true });
    }

    // ── DELETE ──────────────────────────────────────────────
    if (action === 'delete') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await kv.del(`product:${id}`);
      await kv.srem('product:ids', id);
      return res.json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 2: Delete old API files**

Remove `api/scan.js` and `api/data.js` since `api/app.js` replaces them.

- [ ] **Step 3: Commit**

```bash
git add api/app.js
git rm api/scan.js api/data.js
git commit -m "feat: add unified API handler with auth and CRUD"
```

---

### Task 3: Create api/export.js (XLSX and CSV download)

**Files:**
- Create: `api/export.js`

- [ ] **Step 1: Write api/export.js**

```javascript
import { kv } from '@vercel/kv';
import xlsx from 'xlsx';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const token = req.query.token;
  const format = req.query.format || 'xlsx';

  if (!token) return res.status(401).json({ error: 'Token requerido' });
  const sessionUser = await kv.get(`token:${token}`);
  if (!sessionUser) return res.status(401).json({ error: 'Sesión expirada' });

  try {
    const ids = await kv.smembers('product:ids');
    const products = [];
    if (ids.length) {
      const pipe = kv.pipeline();
      ids.forEach(id => pipe.hgetall(`product:${id}`));
      const results = await pipe.exec();
      results.filter(Boolean).forEach(p => {
        products.push({ Código: p.code, Nombre: p.name || '', Descripción: p.desc || '', Escaneado: p.scanned_at || '', Actualizado: p.updated_at || '' });
      });
    }

    const ws = xlsx.utils.json_to_sheet(products);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Productos');

    if (format === 'csv') {
      const csv = xlsx.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=productos.csv');
      return res.send(csv);
    }

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=productos.xlsx');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/export.js
git commit -m "feat: add XLSX/CSV export endpoint"
```

---

### Task 4: Write the frontend (index.html)

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write index.html**

Full SPA with login, scanner, product table, inline editing, export buttons. Pastel aesthetic.

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>DupliScan</title>
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <link rel="manifest" href="manifest.json">
  <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(135deg, #f8f0ff 0%, #f0f8ff 100%); color: #4a4a6a; min-height: 100vh; }
    .hidden { display: none !important; }
    #login-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .login-card { background: white; border-radius: 24px; padding: 48px 36px; width: 100%; max-width: 380px; box-shadow: 0 8px 40px rgba(0,0,0,0.06); text-align: center; animation: fadeIn 0.5s ease; }
    .login-card h1 { font-size: 28px; font-weight: 700; color: #4a4a6a; margin-bottom: 4px; }
    .login-card p { color: #a0a0b8; margin-bottom: 32px; font-size: 14px; }
    .login-card input { width: 100%; padding: 14px 16px; margin-bottom: 16px; border: none; border-bottom: 2px solid #e8e0f0; background: #faf8ff; border-radius: 12px 12px 0 0; font-size: 15px; color: #4a4a6a; outline: none; transition: border-color 0.3s; font-family: inherit; }
    .login-card input:focus { border-bottom-color: #b8a9ff; }
    .btn-primary { width: 100%; padding: 14px; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; background: linear-gradient(135deg, #b8a9ff, #a8e6cf); color: white; box-shadow: 0 4px 15px rgba(184, 169, 255, 0.3); }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(184, 169, 255, 0.4); }
    .btn-primary:active { transform: translateY(0); }
    .login-error { color: #ff8a8a; font-size: 13px; margin-top: 12px; min-height: 20px; }
    #dashboard { padding: 0; }
    .header { background: white; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 12px rgba(0,0,0,0.04); position: sticky; top: 0; z-index: 10; }
    .header h1 { font-size: 18px; font-weight: 700; color: #4a4a6a; }
    .header-actions { display: flex; gap: 8px; align-items: center; }
    .btn-icon { padding: 8px 14px; border: none; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: inherit; background: #f0ecf8; color: #4a4a6a; }
    .btn-icon:hover { background: #e4dcf0; }
    .btn-icon.danger { background: #ffe8e8; color: #ff8a8a; }
    .btn-icon.danger:hover { background: #ffd4d4; }
    .btn-icon.export { background: #e8f8f0; color: #5a9a7a; }
    .btn-icon.export:hover { background: #d4f0e4; }
    .scanner-section { background: white; margin: 16px; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
    .scanner-section .scanner-label { padding: 12px 16px 0; font-size: 13px; font-weight: 600; color: #a0a0b8; text-transform: uppercase; letter-spacing: 0.5px; }
    #reader { width: 100%; min-height: 220px; background: #000; }
    .scan-status { padding: 12px 16px; font-size: 14px; font-weight: 500; text-align: center; min-height: 44px; display: flex; align-items: center; justify-content: center; }
    .scan-status.success { color: #6abf8a; }
    .scan-status.duplicate { color: #f0a070; }
    .scan-status.error { color: #ff8a8a; }
    .table-section { background: white; margin: 16px; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); overflow-x: auto; }
    .table-header { padding: 16px 16px 8px; font-size: 13px; font-weight: 600; color: #a0a0b8; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between; align-items: center; }
    .count-badge { background: #f0ecf8; padding: 2px 10px; border-radius: 20px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 600; color: #b0b0c8; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 1px solid #f0ecf8; }
    td { padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #f8f6fc; vertical-align: middle; }
    td .editable { cursor: text; padding: 4px 8px; border-radius: 8px; transition: background 0.2s; min-width: 60px; display: inline-block; }
    td .editable:hover { background: #f8f6fc; }
    td .editable:empty:before { content: '✎'; color: #d0d0e0; }
    td .edit-input { width: 100%; padding: 4px 8px; border: 2px solid #b8a9ff; border-radius: 8px; font-size: 14px; font-family: inherit; color: #4a4a6a; outline: none; background: white; }
    .code-cell { font-family: 'Courier New', monospace; font-size: 13px; color: #8888aa; font-weight: 500; max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
    .date-cell { font-size: 12px; color: #b0b0c8; white-space: nowrap; }
    .actions-cell { display: flex; gap: 4px; }
    .btn-delete { padding: 4px 8px; border: none; border-radius: 6px; cursor: pointer; background: #fff0f0; color: #ff8a8a; font-size: 16px; transition: all 0.2s; }
    .btn-delete:hover { background: #ffe0e0; }
    .empty-state { text-align: center; padding: 40px 20px; color: #c0c0d8; }
    .empty-state p { margin-top: 8px; font-size: 14px; }
    .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(80px); background: white; padding: 12px 24px; border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,0.1); font-size: 14px; font-weight: 500; opacity: 0; transition: all 0.4s ease; z-index: 100; white-space: nowrap; }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    .toast.duplicate { border-left: 4px solid #f0a070; }
    .toast.success { border-left: 4px solid #6abf8a; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .table-section { animation: fadeIn 0.4s ease; }
    @media (min-width: 768px) { #dashboard { max-width: 960px; margin: 0 auto; padding-bottom: 40px; } .scanner-section { max-width: 500px; } }
    @media (max-width: 500px) { .login-card { padding: 32px 24px; } .header { padding: 12px 16px; } .header h1 { font-size: 16px; } .btn-icon { font-size: 12px; padding: 6px 10px; } td { font-size: 13px; padding: 8px; } .code-cell { max-width: 80px; font-size: 12px; } }
  </style>
</head>
<body>
<div id="login-screen">
  <div class="login-card">
    <h1>DupliScan</h1>
    <p>Gestión de productos</p>
    <form id="login-form" autocomplete="off">
      <input type="text" id="login-user" placeholder="Usuario" autocomplete="username" required>
      <input type="password" id="login-pass" placeholder="Contraseña" autocomplete="current-password" required>
      <button type="submit" class="btn-primary">Ingresar</button>
      <div class="login-error" id="login-error"></div>
    </form>
  </div>
</div>
<div id="dashboard" class="hidden">
  <div class="header">
    <h1>DupliScan</h1>
    <div class="header-actions">
      <button class="btn-icon export" onclick="downloadXLSX()">📥 XLSX</button>
      <button class="btn-icon export" onclick="downloadCSV()">📥 CSV</button>
      <button class="btn-icon danger" onclick="logout()">Salir</button>
    </div>
  </div>
  <div class="scanner-section" id="scanner-section">
    <div class="scanner-label">📷 Escanear código</div>
    <div id="reader"></div>
    <div class="scan-status" id="scan-status">Esperando código...</div>
  </div>
  <div class="table-section">
    <div class="table-header">
      <span>Productos</span>
      <span class="count-badge" id="count-badge">0</span>
    </div>
    <div id="table-body">
      <div class="empty-state"><div style="font-size: 40px;">📦</div><p>Escaneá tu primer producto</p></div>
    </div>
  </div>
</div>
<div class="toast" id="toast"></div>
<script>
var TOKEN = localStorage.getItem('token');
var QR = null;
var scanning = false;

document.getElementById('login-form').addEventListener('submit', function(e) {
  e.preventDefault();
  var user = document.getElementById('login-user').value.trim();
  var pass = document.getElementById('login-pass').value.trim();
  fetch('/api/app', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', user, pass }) })
  .then(r => r.json()).then(d => {
    if (d.token) { TOKEN = d.token; localStorage.setItem('token', TOKEN); showDashboard(); }
    else { document.getElementById('login-error').textContent = d.error || 'Error'; }
  }).catch(() => { document.getElementById('login-error').textContent = 'Error de conexión'; });
});

function logout() { TOKEN = null; localStorage.removeItem('token'); stopScanner(); document.getElementById('dashboard').classList.add('hidden'); document.getElementById('login-screen').classList.remove('hidden'); }
function showDashboard() { document.getElementById('login-screen').classList.add('hidden'); document.getElementById('dashboard').classList.remove('hidden'); loadProducts(); startScanner(); }
function startScanner() { stopScanner(); try { QR = new Html5Qrcode('reader'); QR.start({ facingMode: 'environment' }, { fps: 10, qrbox: function(vw, vh) { var m = Math.min(vw, vh) * 0.7; return { width: m, height: m * 0.5 }; }}, onScan, function(){}); } catch(e){} }
function stopScanner() { if (QR) { try { QR.stop(); QR.clear(); } catch(e){} QR = null; } }
function onScan(code) {
  if (scanning) return; code = (code||'').trim(); if (!code) return; scanning = true;
  try { navigator.vibrate(100); } catch(e){}
  setScanStatus('Enviando...', '');
  fetch('/api/app', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'scan', code, token: TOKEN }) })
  .then(r => r.json()).then(d => {
    if (d.success) {
      if (d.status === 'duplicate') { setScanStatus('⚠️ Ya existe: ' + code, 'duplicate'); showToast('⚠️ "' + (d.product.name || code) + '" ya estaba registrado', 'duplicate'); }
      else { setScanStatus('✅ ' + code, 'success'); }
      loadProducts();
    } else { setScanStatus('Error: ' + code, 'error'); }
  }).catch(() => { setScanStatus('Error de conexión', 'error'); })
  .finally(() => { setTimeout(function(){ scanning = false; }, 2000); });
}
function setScanStatus(text, cls) { var el = document.getElementById('scan-status'); el.textContent = text; el.className = 'scan-status ' + (cls||''); }

function loadProducts() {
  fetch('/api/app', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list', token: TOKEN }) })
  .then(r => r.json()).then(renderTable).catch(function(){});
}
function renderTable(products) {
  var container = document.getElementById('table-body');
  document.getElementById('count-badge').textContent = products.length;
  if (!products.length) { container.innerHTML = '<div class="empty-state"><div style="font-size: 40px;">📦</div><p>Escaneá tu primer producto</p></div>'; return; }
  var h = '<table><thead><tr><th>Código</th><th>Nombre</th><th>Descripción</th><th>Fecha</th><th></th></tr></thead><tbody>';
  products.forEach(function(p) {
    h += '<tr><td class="code-cell" title="'+p.code+'">'+p.code+'</td>';
    h += '<td><span class="editable" onclick="editField(this,\''+p.id+'\',\'name\')" data-id="'+p.id+'" data-field="name">'+esc(p.name)+'</span></td>';
    h += '<td><span class="editable" onclick="editField(this,\''+p.id+'\',\'desc\')" data-id="'+p.id+'" data-field="desc">'+esc(p.desc)+'</span></td>';
    h += '<td class="date-cell">'+formatDate(p.scanned_at)+'</td>';
    h += '<td class="actions-cell"><button class="btn-delete" onclick="deleteProduct(\''+p.id+'\')">✕</button></td></tr>';
  });
  h += '</tbody></table>';
  container.innerHTML = h;
}
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function formatDate(d) { if (!d) return ''; var dt = new Date(d); return dt.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit'})+' '+dt.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}); }

function editField(el, id, field) {
  var current = el.textContent; var input = document.createElement('input'); input.type = 'text'; input.className = 'edit-input';
  input.value = (current === '✎' ? '' : current); el.replaceWith(input); input.focus();
  function save() {
    var val = input.value.trim();
    var body = {}; body.action = 'update'; body.id = id; body.token = TOKEN; body[field] = val;
    fetch('/api/app', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => r.json()).then(function(d) {
      var span = document.createElement('span'); span.className = 'editable'; span.onclick = function(){editField(span,id,field);};
      span.dataset.id = id; span.dataset.field = field; span.textContent = val || '✎'; input.replaceWith(span);
      if (d.success) loadProducts();
    }).catch(function(){
      var span = document.createElement('span'); span.className = 'editable'; span.onclick = function(){editField(span,id,field);};
      span.dataset.id = id; span.dataset.field = field; span.textContent = val || '✎'; input.replaceWith(span);
    });
  }
  input.addEventListener('blur', save);
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter') { input.blur(); } if (e.key === 'Escape') { var span = document.createElement('span'); span.className = 'editable'; span.onclick = function(){editField(span,id,field);}; span.dataset.id=id; span.dataset.field=field; span.textContent=current||'✎'; input.replaceWith(span); } });
}

function deleteProduct(id) { if (!confirm('¿Eliminar este producto?')) return; fetch('/api/app',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',id,token:TOKEN})}).then(r=>r.json()).then(function(d){if(d.success)loadProducts();}); }
function downloadXLSX() { window.open('/api/export?token='+TOKEN+'&format=xlsx&_='+Date.now(), '_blank'); }
function downloadCSV() { window.open('/api/export?token='+TOKEN+'&format=csv&_='+Date.now(), '_blank'); }
function showToast(msg, cls) { var el = document.getElementById('toast'); el.textContent = msg; el.className = 'toast '+(cls||'')+' show'; clearTimeout(el._timer); el._timer = setTimeout(function(){el.classList.remove('show');},3000); }
if (TOKEN) { showDashboard(); }
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: complete frontend with login, scanner, table, editing, export"
```

---

### Task 5: Update manifest.json and sw.js

**Files:**
- Modify: `manifest.json`
- Modify: `sw.js`

- [ ] **Step 1: Update manifest.json**

```json
{
  "name": "DupliScan - Gestión de Productos",
  "short_name": "DupliScan",
  "description": "Escanea códigos, gestiona productos, exporta a Excel",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#f8f0ff",
  "theme_color": "#b8a9ff",
  "icons": [
    {
      "src": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%23b8a9ff'/%3E%3Ctext x='50' y='68' text-anchor='middle' font-size='55'%3E📦%3C/text%3E%3C/svg%3E",
      "sizes": "192x192",
      "type": "image/svg+xml"
    }
  ]
}
```

- [ ] **Step 2: Update sw.js cache version**

Change line 2: `var CACHE_NAME = 'dupliscan-v6';`

- [ ] **Step 3: Commit**

```bash
git add manifest.json sw.js
git commit -m "chore: update manifest and sw for v2"
```

---

### Task 6: Deploy and test

- [ ] **Step 1: Deploy to Vercel**

Run: `vercel --prod --yes`

- [ ] **Step 2: Test API**

```bash
# Login
curl -s -X POST "https://scanspot.vercel.app/api/app" -H "Content-Type: application/json" -d '{"action":"login","user":"elimaeda","pass":"sofiyjuli"}'
# Expected: {"token":"..."}
```

- [ ] **Step 3: Test frontend**

Open https://scanspot.vercel.app, login with elimaeda/sofiyjuli, verify scanner + table + edit + export.

---

## Spec Coverage

| Spec Requirement | Task |
|-----------------|------|
| Login (elimaeda/sofiyjuli) | Task 2 (app.js) + Task 4 (frontend) |
| Persistent storage (Vercel KV) | Task 1 (@vercel/kv) |
| Scan barcode | Task 4 (html5-qrcode) + Task 2 (scan action) |
| Duplicate detection | Task 2 (checks existing before insert) |
| Editable name/description | Task 4 (inline edit) + Task 2 (update action) |
| Delete products | Task 4 (delete button) + Task 2 (delete action) |
| Export XLSX | Task 3 (api/export.js) + Task 4 (download button) |
| Export CSV | Task 3 (api/export.js) + Task 4 (download button) |
| Pastel suave design | Task 4 (CSS: gradient, pastel colors) |
| Mobile + Desktop | Task 4 (responsive CSS) |
