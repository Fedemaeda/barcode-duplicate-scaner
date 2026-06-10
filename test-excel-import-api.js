const https = require('https');

const API_URL = 'https://scanspot.vercel.app/api/app';

function post(data) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL);
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (err) {
          reject(new Error('Invalid JSON response: ' + raw));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
  console.log('✓ ' + message);
}

async function login() {
  const res = await post({ action: 'login', user: 'elimaeda', pass: 'sofiyjuli' });
  assert(Boolean(res.token), 'login returns token');
  return res.token;
}

async function clearList(token) {
  const list = await post({ action: 'list', token });
  for (const item of list) {
    await post({ action: 'delete', id: item.id, token });
  }
}

async function run() {
  const token = await login();
  await clearList(token);

  const imported = await post({
    action: 'import',
    token,
    rows: [
      { code: 'IMPORT_TEST_1', name: 'Producto A', desc: 'Marca A', qty: 2, scanned_at: '2026-01-02T03:04:05.000Z' },
      { code: 'IMPORT_TEST_1', name: 'Producto A duplicado', desc: 'Marca A', qty: 4, scanned_at: '2026-01-03T03:04:05.000Z' },
      { code: 'IMPORT_TEST_2', name: 'Producto B', desc: 'Marca B', qty: 1, scanned_at: '2026-01-04T03:04:05.000Z' },
    ],
  });

  assert(imported.success === true, 'import returns success');
  assert(imported.count === 3, 'import stores three rows');

  const list = await post({ action: 'list', token });
  assert(list.length === 3, 'list contains imported rows only');
  assert(list.find((p) => p.code === 'IMPORT_TEST_1' && p.status === '✓ Único'), 'first repeated code row is unique');
  assert(list.find((p) => p.code === 'IMPORT_TEST_1' && p.status === '⚠️ REPETIDO'), 'second repeated code row is duplicate');
  assert(list.find((p) => p.code === 'IMPORT_TEST_2' && String(p.qty) === '1'), 'quantity is stored');

  await clearList(token);
  const scanAgain = await post({ action: 'scan', token, code: 'IMPORT_TEST_1' });
  assert(scanAgain.status === 'unique', 'same code is unique after deleting imported rows');
  await post({ action: 'delete', token, id: scanAgain.id });
}

run().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
