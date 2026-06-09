# Google Apps Script — Conectar App con Google Sheet

## Columnas del Sheet

| A | B | C | D | E |
|---|---|---|---|---|
| Índice | Código de Barras | Nombre del Producto | Descripción | Estado de Validación |

## Código para el Script

1. Abrí tu Google Sheet
2. **Extensiones > Apps Script**
3. Borrá todo y pegá este código:

```javascript
function doGet(e) {
  try {
    if (!e || !e.parameter) return json({ error: 'No event data' });

    var params = e.parameter;
    var action = params.action || '';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();

    // ---- HEADER CHECK (ensure first row has column names) ----

    function ensureHeaders() {
      var data = sheet.getDataRange().getValues();
      if (data.length === 0 || String(data[0][0]).trim() !== 'Índice') {
        sheet.insertRowBefore(1);
        sheet.getRange(1, 1, 1, 5).setValues([['Índice', 'Código de Barras', 'Nombre del Producto', 'Descripción', 'Estado de Validación']]);
        SpreadsheetApp.flush();
      }
    }

    // ---- READ ----

    if (action === 'find') {
      var code = (params.code || '').trim();
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][1] && String(data[i][1]).trim() === code) {
          return json({ found: true, codigo: data[i][1], nombre: data[i][2] || '', descripcion: data[i][3] || '', estado: data[i][4] || '' });
        }
      }
      return json({ found: false });
    }

    if (action === 'getAll') {
      var data = sheet.getDataRange().getValues();
      var rows = [];
      for (var i = 1; i < data.length; i++) {
        rows.push({ indice: data[i][0], codigo: data[i][1], nombre: data[i][2] || '', descripcion: data[i][3] || '', estado: data[i][4] || '' });
      }
      return json(rows);
    }

    // ---- WRITE (always append, never update existing rows) ----

    if (action === 'addScan') {
      var code = (params.code || '').trim();
      if (!code) return json({ error: 'Missing code' });

      var lock = LockService.getScriptLock();
      lock.tryLock(5000);
      try {
        ensureHeaders();
        sheet.appendRow([params.id || '', code, params.nombre || '', params.descripcion || '', params.estado || '✓ Único']);
        SpreadsheetApp.flush();
        return json({ success: true });
      } finally {
        lock.releaseLock();
      }
    }

    if (action === 'syncAll') {
      var incoming = JSON.parse(params.scans || '[]');
      var lock = LockService.getScriptLock();
      lock.tryLock(5000);
      try {
        ensureHeaders();
        // Remove all old data rows (keep header at row 1)
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.deleteRows(2, lastRow - 1);
        }
        // Insert all incoming scans fresh
        for (var j = 0; j < incoming.length; j++) {
          var item = incoming[j];
          if (!item.code) continue;
          sheet.appendRow([item.id || '', item.code, item.name || '', item.descripcion || '', item.status === 'duplicate' ? '⚠️ REPETIDO' : '✓ Único']);
        }
        SpreadsheetApp.flush();
        return json({ success: true, synced: incoming.length });
      } finally {
        lock.releaseLock();
      }
    }

    return json({ error: 'Unknown action: ' + action });
  } catch (err) {
    return json({ error: err.toString() });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
```

4. **Deployar > Nuevo deployment**
   - Tipo: **Web app**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**

5. Copiá la URL que te da.
