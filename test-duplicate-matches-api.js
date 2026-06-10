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
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log('✓ ' + message);
}

async function clearList(token) {
  const list = await post({ action: 'list', token });
  for (const item of list) await post({ action: 'delete', token, id: item.id });
}

async function run() {
  const login = await post({ action: 'login', user: 'elimaeda', pass: 'sofiyjuli' });
  const token = login.token;
  assert(Boolean(token), 'login returns token');
  await clearList(token);

  const first = await post({ action: 'scan', token, code: 'MATCH_TEST_1' });
  assert(first.status === 'unique', 'first scan is unique');

  await post({ action: 'update', token, id: first.id, name: 'Producto original', desc: 'Marca original' });

  const duplicate = await post({ action: 'scan', token, code: 'MATCH_TEST_1' });
  assert(duplicate.status === 'duplicate', 'second scan is duplicate');
  assert(Array.isArray(duplicate.matches), 'duplicate response includes matches array');
  assert(duplicate.matches.length === 1, 'duplicate response includes one matching product');
  assert(duplicate.matches[0].id === first.id, 'match references original scan id');
  assert(duplicate.matches[0].name === 'Producto original', 'match includes original product name');

  const list = await post({ action: 'list', token });
  const duplicateRow = list.find((item) => item.id === duplicate.id);
  assert(duplicateRow.match_text && duplicateRow.match_text.includes(first.id), 'duplicate row stores visible match text');

  await clearList(token);
}

run().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
