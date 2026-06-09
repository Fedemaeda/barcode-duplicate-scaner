# Google Apps Script — Conectar App con Google Sheet

## Columnas del Sheet

| A | B | C | D | E |
|---|---|---|---|---|
| Índice | Código de Barras | Nombre del Producto | Descripción | Estado de Validación |

## Código para el Script

1. Abrí tu Google Sheet
2. **Extensiones > Apps Script**
3. Pegá este código:

```javascript
function doGet(e) {
  const action = e.parameter.action || '';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const data = sheet.getDataRange().getValues();

  if (action === 'find') {
    const code = (e.parameter.code || '').trim();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === code) {
        return jsonResponse({
          found: true,
          codigo: data[i][1],
          nombre: data[i][2],
          descripcion: data[i][3],
          estado: data[i][4]
        });
      }
    }
    return jsonResponse({ found: false });
  }

  if (action === 'getAll') {
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      rows.push({
        indice: data[i][0],
        codigo: data[i][1],
        nombre: data[i][2],
        descripcion: data[i][3],
        estado: data[i][4]
      });
    }
    return jsonResponse(rows);
  }

  if (action === 'addScan') {
    const code = (e.parameter.code || '').trim();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === code) {
        const row = i + 1;
        sheet.getRange(row, 5).setValue(e.parameter.estado || '✓ Único');
        return jsonResponse({ success: true, updated: true });
      }
    }
    const nextIndex = data.length;
    sheet.appendRow([
      nextIndex,
      code,
      e.parameter.nombre || '',
      e.parameter.descripcion || '',
      e.parameter.estado || '✓ Único'
    ]);
    return jsonResponse({ success: true, isNew: true });
  }

  return jsonResponse({ error: 'Unknown action: ' + action });
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
5. Copiás la URL que te da y la pegás en la app web (botón ⚙️ en el header)
