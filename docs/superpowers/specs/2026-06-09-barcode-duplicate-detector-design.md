# Barcode Duplicate Detector — Design Spec

## Problem
Un lote de productos fue enviado con códigos de barra duplicados. Necesitamos escanear cada producto físico con la cámara del celular para identificar cuáles están duplicados y separarlos.

## Solution
App web (PWA) que usa la cámara del celular para escanear códigos de barra en vivo, detecta duplicados automáticamente, y permite exportar los resultados a Excel y/o sincronizar con Google Sheets.

## Architecture

```
[Celular] → App Web (PWA) → (opcional) Google Apps Script → Google Sheet
                ↓
          localStorage (caché offline)
                ↓
          Exportar a .xlsx (solo duplicados)
```

### Stack
| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + CSS + JS vanilla |
| Escáner | html5-qrcode |
| Excel | xlsx (SheetJS) |
| Google Sheets | Google Apps Script Web App (POST) |
| Caché offline | localStorage |

## UI — Pantalla única

```
┌──────────────────────────────────┐
│  [📷 Cámara en vivo]             │
│  (escaneo continuo automático)   │
│  Último: 7891234567890           │
│  ⚠️ ¡Código repetido!            │
├──────────────────────────────────┤
│  Resultados (N escaneos)         │
│  ┌─────┬──────────┬──────────┬─────────┬──┐ │
│  │ #   │ Código   │ Nombre   │ Veces   │  │ │
│  ├─────┼──────────┼──────────┼─────────┤  │ │
│  │ ⚠️ 1│ 789...   │ Prod A   │ 3       │  │ │
│  │ ✅ 2│ 456...   │ Prod B   │ 1       │  │ │
│  │ ✅ 3│ 123...   │ Prod C   │ 1       │  │ │
│  └─────┴──────────┴──────────┴─────────┴──┘ │
│                                  │
│  [📥 Exportar Excel - solo reps] │
│  [🔗 Enviar a Google Sheets]     │
└──────────────────────────────────┘
```

### Funcionalidades
- Cámara activa siempre — escanea automáticamente al detectar un código
- Cada escaneo se agrega a la tabla en vivo
- Si el código ya fue escaneado → alerta + marca como ⚠️ Repetido
- Si es nuevo → ✅ Único
- La tabla se ordena con los repetidos primero

## Estados de cada fila
| Columna | Descripción |
|---------|-------------|
| Índice | N° de orden |
| Código | Código de barra escaneado |
| Nombre | Nombre del producto (editable inline) |
| Veces | Contador de ocurrencias |
| Estado | ✅ Único o ⚠️ Repetido |

- 1er escaneo → Único
- 2do escaneo del mismo código → Repetido (ambos se marcan)
- 3ro+ → Repetido, incrementa contador
- Al escanear repetido → notificación breve + vibración (si el navegador lo permite)
- Al escanear un código, se puede editar el nombre del producto tocando la celda correspondiente en la tabla

## Google Sheets (opcional)
- Columnas: Índice, Código, Veces, Estado, Timestamp
- Google Apps Script recibe POST y escribe en el sheet
- La app envía cada escaneo al Web App URL
- Si no hay conexión, se guarda en localStorage y se sincroniza después

## Exportación a Excel
- Botón "Exportar Excel" descarga .xlsx
- Solo incluye los productos con estado ⚠️ Repetido
- Columnas: Índice, Código, Veces

## Almacenamiento local
- `localStorage` mantiene la lista completa
- Persiste entre sesiones
- Botón "Limpiar" para empezar un nuevo lote

## Archivos del proyecto
```
/index.html      → App completa (HTML + CSS + JS inline)
/docs/specs/     → Este spec
```
