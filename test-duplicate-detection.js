// === TEST DE DETECCIÓN DE DUPLICADOS ===
// Simula exactamente el flujo del navegador

var scans = [];
var processing = false;
var pendingCode = null;

function findScan(c) {
  for (var i = 0; i < scans.length; i++) {
    if (scans[i].code === c) return scans[i];
  }
  return null;
}

function log(msg) { console.log(msg); }
function assert(cond, msg) {
  if (!cond) { console.log('  ❌ FAIL: ' + msg); process.exit(1); }
  else { console.log('  ✓ PASS: ' + msg); }
}

// ───────────────────────────────────────
// TEST: Flujo COMPLETO de escaneo-escaneo
// ───────────────────────────────────────
console.log('\n═══ TEST: Sesión completa — escanear mismo código 2 veces ═══');

// Simular que la página acaba de cargarse (scans vacío, no hay datos en sheet todavía)
scans = [];
pendingCode = null;
processing = false;

// === PRIMER ESCANEO ===
console.log('\n--- PRIMER ESCANEO (código "ABC123") ---');

// onScan("ABC123") se ejecuta
var c = 'ABC123';
processing = true;
pendingCode = c;

// saveName() se ejecuta
var n1 = 'Producto X';
var d1 = 'Lote 1';
var c1 = pendingCode;        // ← pendingCode todavía tiene el código
if (!c1) { console.log('ERROR: c1 es falsy'); process.exit(1); }
pendingCode = null;

var localIsDup1 = !!findScan(c1);
assert(localIsDup1 === false, 'Primer escaneo: findScan no encuentra duplicado (scans vacío)');

// Simular respuesta del servidor: status 'unique'
var serverIsDup1 = false;
var isDup1 = localIsDup1 || serverIsDup1;
assert(isDup1 === false, 'Primer escaneo: isDup = false');

scans.push({ id: scans.length + 1, code: c1, name: n1, descripcion: d1, status: isDup1 ? 'duplicate' : 'unique' });
var last = scans[scans.length - 1];
assert(last.status === 'unique', 'Primer escaneo: estado guardado como "unique"');
assert(scans.length === 1, 'scans tiene 1 elemento');

processing = false;  // .finally() lo hace

// === SEGUNDO ESCANEO (mismo código) ===
console.log('\n--- SEGUNDO ESCANEO (mismo código "ABC123") ---');

// onScan("ABC123") se ejecuta de nuevo
var c2 = 'ABC123';
assert(processing === false, 'processing es false, se puede escanear de nuevo');
processing = true;
pendingCode = c2;

// saveName() se ejecuta
var n2 = 'Producto Y';
var d2 = 'Lote 2';
var c2_val = pendingCode;
pendingCode = null;

// *** ESTA ES LA LÍNEA CRÍTICA ***
var localIsDup2 = !!findScan(c2_val);
console.log('  → findScan("' + c2_val + '") en scans con', scans.length, 'elemento(s)');
console.log('  → scans[0].code = "' + scans[0].code + '"');
console.log('  → scans[0].code === c2_val:', scans[0].code === c2_val);

assert(localIsDup2 === true, 'Segundo escaneo: findScan ENCUENTRA el código en scans → localIsDup = true');

// This confirms the local detection works!

// Simular servidor respondiendo 'unique' (el peor caso: servidor no detecta duplicado)
var serverIsDup2 = false;
var isDup2 = localIsDup2 || serverIsDup2;
assert(isDup2 === true, 'Segundo escaneo: isDup = true (local || server)');
assert(isDup2 === true, '⚠️ CRÍTICO: localIsDup=true domina al serverIsDup=false');

scans.push({ id: scans.length + 1, code: c2_val, name: n2, descripcion: d2, status: isDup2 ? 'duplicate' : 'unique' });
var last2 = scans[scans.length - 1];
assert(last2.status === 'duplicate', 'Segundo escaneo: estado guardado como "duplicate"');
assert(last2.status !== 'unique', '⚠️ CRÍTICO: estado NO es unique');

console.log('\n═══ TEST: Sesión con recarga de página ═══\n');

// Simular recarga de página: refreshFromSheet()
// El sheet tiene el primer escaneo (unique) pero no tiene el segundo
console.log('--- Simular refreshFromSheet() después de recargar ---');
var sheetData = [
  { indice: 1, codigo: 'ABC123', nombre: 'Producto X', descripcion: 'Lote 1', estado: '✓ Único' }
];

scans = [];  // La página se recargó, scans se reinicia
for (var i = 0; i < sheetData.length; i++) {
  scans.push({
    id: sheetData[i].indice || (i + 1),
    code: String(sheetData[i].codigo || ''),
    name: sheetData[i].nombre || '',
    descripcion: sheetData[i].descripcion || '',
    status: (sheetData[i].estado && sheetData[i].estado.indexOf('REPETIDO') >= 0) ? 'duplicate' : 'unique'
  });
}

console.log('  → scans cargados desde el sheet:', scans.length, 'elemento(s)');
console.log('  → scans[0].code = "' + scans[0].code + '"');

// Escanear el mismo código de nuevo (después de recargar)
console.log('\n--- Escanear "ABC123" después de recargar ---');
var c3 = 'ABC123';
processing = true;
pendingCode = c3;

var localIsDup3 = !!findScan(c3);
assert(localIsDup3 === true, 'Después de recarga: findScan encuentra el código (vino del sheet)');

var serverIsDup3 = false;  // worst case
var isDup3 = localIsDup3 || serverIsDup3;
assert(isDup3 === true, 'Después de recarga: isDup = true');

scans.push({ id: scans.length + 1, code: c3, name: 'Producto Z', descripcion: '', status: isDup3 ? 'duplicate' : 'unique' });
var last3 = scans[scans.length - 1];
assert(last3.status === 'duplicate', 'Después de recarga: estado = duplicate');

console.log('\n═══ TEST: Múltiples códigos diferentes ═══\n');
scans = [];

// Primer escaneo: código A
var codeA = '111';
scans.push({ id: 1, code: codeA, name: 'A', descripcion: '', status: 'unique' });

// Segundo escaneo: código B (diferente)
var codeB = '222';
var localDupB = !!findScan(codeB);
assert(localDupB === false, 'Código B: no es duplicado (código diferente)');

// Tercer escaneo: código A otra vez
var localDupA2 = !!findScan(codeA);
assert(localDupA2 === true, 'Código A: es duplicado (mismo código que primero)');

// Cuarto escaneo: código C
var codeC = '333';
var localDupC = !!findScan(codeC);
assert(localDupC === false, 'Código C: no es duplicado');

console.log('\n═════════════════════════════════════');
console.log('✅ TODOS LOS TESTS PASARON');
console.log('═════════════════════════════════════');
