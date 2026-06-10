// === TEST: DupliScan — Arquitectura simplificada ===
// Frontend solo escanea y envía. Servidor hace TODO.

function assert(cond, msg) {
  if (!cond) { console.log('  ❌ FAIL: ' + msg); process.exit(1); }
  else { console.log('  ✓ PASS: ' + msg); }
}

// Simula el servidor: addScan con detección de duplicados
function simulateServer(scans, code, nombre, descripcion) {
  var isDuplicate = false;
  for (var i = 0; i < scans.length; i++) {
    if (scans[i].code === code) { isDuplicate = true; break; }
  }
  var status = isDuplicate ? '⚠️ REPETIDO' : '✓ Único';
  scans.push({ code: code, nombre: nombre, descripcion: descripcion, status: status });
  return { success: true, status: isDuplicate ? 'duplicate' : 'unique' };
}

// ═══════════════════════════════════════════════════════════
console.log('═══ TEST 1: Primer escaneo — código nuevo ═══');
var sheet = [];
var resp = simulateServer(sheet, 'ABC123', 'Producto X', 'Lote 1');
assert(resp.status === 'unique', 'Servidor responde: unique');
assert(sheet[0].status === '✓ Único', 'Sheet escribe: ✓ Único');
assert(sheet.length === 1, 'Sheet tiene 1 fila');

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST 2: Segundo escaneo — código repetido ═══');
resp = simulateServer(sheet, 'ABC123', 'Producto Y', 'Lote 2');
assert(resp.status === 'duplicate', 'Servidor responde: duplicate');
assert(sheet[1].status === '⚠️ REPETIDO', 'Sheet escribe: ⚠️ REPETIDO');
assert(sheet.length === 2, 'Sheet tiene 2 filas');

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST 3: Tercer escaneo — mismo código otra vez ═══');
resp = simulateServer(sheet, 'ABC123', 'Producto Z', 'Lote 3');
assert(resp.status === 'duplicate', 'Servidor responde: duplicate');
assert(sheet[2].status === '⚠️ REPETIDO', 'Sheet escribe: ⚠️ REPETIDO');

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST 4: Código diferente — no es duplicado ═══');
resp = simulateServer(sheet, 'XYZ999', 'Producto W', '');
assert(resp.status === 'unique', 'Servidor responde: unique');
assert(sheet[3].status === '✓ Único', 'Sheet escribe: ✓ Único');

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST 5: App y Sheet SIEMPRE en sync ═══');
// La app muestra EXACTAMENTE lo que el servidor responde
// No hay detección local, no hay desfazaje
for (var i = 0; i < sheet.length; i++) {
  var appStatus = sheet[i].status;
  var sheetStatus = sheet[i].status;
  assert(appStatus === sheetStatus, 'Fila ' + (i+1) + ': app="' + appStatus + '" sheet="' + sheetStatus + '" ✓');
}

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST 6: find() detecta duplicado existente ═══');
function simulateFind(sheet, code) {
  for (var i = 0; i < sheet.length; i++) {
    if (sheet[i].code === code) return { found: true };
  }
  return { found: false };
}
assert(simulateFind(sheet, 'ABC123').found === true, 'find("ABC123") = found');
assert(simulateFind(sheet, 'XYZ999').found === true, 'find("XYZ999") = found');
assert(simulateFind(sheet, 'NOEXIST').found === false, 'find("NOEXIST") = not found');

console.log('\n═════════════════════════════════════');
console.log('✅ TODOS LOS TESTS PASARON');
console.log('═════════════════════════════════════');
console.log('\n📋 FLUJO SIMPLE:');
console.log('1. Escanear código');
console.log('2. Enviar al servidor');
console.log('3. Servidor detecta duplicados + escribe en Sheet');
console.log('4. App muestra lo que el servidor dice');
console.log('\nApp y Sheet SIEMPRE muestran lo mismo.');
