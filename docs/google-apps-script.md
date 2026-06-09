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

    // ---- WRITE (lock, check duplicates server-side) ----

    if (action === 'addScan') {
      var code = (params.code || '').trim();
      if (!code) return json({ error: 'Missing code' });

      var lock = LockService.getScriptLock();
      var gotLock = lock.tryLock(5000);
      if (!gotLock) return json({ error: 'No se pudo obtener bloqueo, reintente' });

      try {
        ensureHeaders();
        var data = sheet.getDataRange().getValues();
        // Check if code already exists in sheet (server-side duplicate detection)
        var isDuplicate = false;
        for (var i = 1; i < data.length; i++) {
          if (data[i][1] && String(data[i][1]).trim() === code) {
            isDuplicate = true;
            break;
          }
        }
        var status = isDuplicate ? '⚠️ REPETIDO' : '✓ Único';
        sheet.appendRow([data.length, code, params.nombre || '', params.descripcion || '', status]);
        SpreadsheetApp.flush();
        return json({ success: true, status: isDuplicate ? 'duplicate' : 'unique' });
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

4. **Si es tu primer deploy:** Deployar > Nuevo deployment
   - Tipo: **Web app**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
   - Copiá la URL que te da

5. **Si ya tenías un deploy (actualizar):**
   - Deployar > **Administrar deployments**
   - Click en **Editar** (lápiz) sobre tu deployment actual
   - Click en **Deploy** (no cambia la URL)
   - La URL sigue siendo la misma, no necesitás actualizar la app
