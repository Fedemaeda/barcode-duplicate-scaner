# Google Apps Script — Conectar App con Google Sheet

## Columnas del Sheet

| A | B | C | D | E |
|---|---|---|---|---|
| Índice | Código de Barras | Nombre del Producto | Descripción | Estado de Validación |

## Código para el Script

1. Abrí tu Google Sheet
2. **Extensiones > Apps Script**
3. Borrá el código que viene por defecto y pegá este:

```javascript
function doGet(e) {
  try {
    // Handle case where e is undefined (direct test)
    if (!e) return jsonResponse({ error: 'No event data', tip: 'Open the deployed URL in your browser, not the editor' });

    const params = e.parameter || {};
    const action = params.action || '';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    const data = sheet.getDataRange().getValues();

    if (action === 'find') {
      const code = (params.code || '').trim();
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[1] && String(row[1]).trim() === code) {
          return jsonResponse({
            found: true,
            codigo: row[1],
            nombre: row[2] || '',
            descripcion: row[3] || '',
            estado: row[4] || ''
          });
        }
      }
      return jsonResponse({ found: false });
    }

    if (action === 'getAll') {
      const rows = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        rows.push({
          indice: row[0],
          codigo: row[1],
          nombre: row[2] || '',
          descripcion: row[3] || '',
          estado: row[4] || ''
        });
      }
      return jsonResponse(rows);
    }

    if (action === 'addScan') {
      const code = (params.code || '').trim();
      if (!code) return jsonResponse({ error: 'Missing code' });

      for (let i = 1; i < data.length; i++) {
        if (data[i][1] && String(data[i][1]).trim() === code) {
          const rowNum = i + 1;
          sheet.getRange(rowNum, 5).setValue(params.estado || '✓ Único');
          return jsonResponse({ success: true, updated: true });
        }
      }
      // Not found — add new row
      sheet.appendRow([
        data.length,
        code,
        params.nombre || '',
        params.descripcion || '',
        params.estado || '✓ Único'
      ]);
      return jsonResponse({ success: true, isNew: true });
    }

    return jsonResponse({ error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. **Deployar > Nuevo deployment**
   - Tipo: **Web app**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**

5. **Importante — Primera autorización:**
   - Copiá la URL que te da (termina en `/exec`)
   - Abrila DIRECTAMENTE en el navegador
   - Si aparece una pantalla de autorización, aceptá
   - Después agregá `?action=getAll` al final y presioná Enter
   - Si ves un JSON con datos o un array vacío, el script funciona

6. Recién después pegá la URL en la app (⚙️ > Probar conexión)
