const { kv } = require('@vercel/kv');
const crypto = require('crypto');

const USER = 'elimaeda';
const PASS = 'sofiyjuli';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { action, token, code, id, name, desc, rows, user, pass } = req.body || {};
  if (!action) return res.status(400).json({ error: 'Missing action' });

  try {
    if (action === 'login') {
      if (user !== USER || pass !== PASS) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
      const sessionToken = crypto.randomBytes(24).toString('hex');
      await kv.set(`token:${sessionToken}`, USER, { ex: 86400 });
      return res.json({ token: sessionToken });
    }

    if (!token) return res.status(401).json({ error: 'Token requerido' });
    const sessionUser = await kv.get(`token:${token}`);
    if (!sessionUser) return res.status(401).json({ error: 'Sesión expirada' });

    if (action === 'list') {
      const ids = await kv.lrange('scan:ids', 0, -1);
      if (!ids.length) return res.json([]);
      const pipe = kv.pipeline();
      ids.forEach(id => pipe.hgetall(`scan:${id}`));
      const scans = (await pipe.exec()).filter(Boolean);
      return res.json(scans);
    }

    if (action === 'import') {
      if (!Array.isArray(rows)) return res.status(400).json({ error: 'Rows required' });

      const existingIds = await kv.lrange('scan:ids', 0, -1);
      const existingScans = [];
      if (existingIds.length) {
        const pipe = kv.pipeline();
        existingIds.forEach(id => pipe.hgetall(`scan:${id}`));
        (await pipe.exec()).filter(Boolean).forEach(scan => existingScans.push(scan));
      }

      const oldCodes = Array.from(new Set(existingScans.map(scan => scan.code).filter(Boolean)));
      for (const scanId of existingIds) await kv.del(`scan:${scanId}`);
      for (const oldCode of oldCodes) await kv.del(`code_to_scan_ids:${oldCode}`);
      await kv.del('scan:ids');

      const seenCodes = new Set();
      let imported = 0;
      for (const row of rows) {
        const rowCode = String(row.code || '').trim();
        if (!rowCode) continue;

        const scanId = String(await kv.incr('scan:counter'));
        const now = new Date().toISOString();
        const isDuplicate = seenCodes.has(rowCode);
        const status = isDuplicate ? '⚠️ REPETIDO' : '✓ Único';
        const scan = {
          id: scanId,
          code: rowCode,
          name: String(row.name || ''),
          desc: String(row.desc || ''),
          qty: row.qty === undefined || row.qty === null ? '' : String(row.qty),
          status,
          scanned_at: row.scanned_at || now,
          updated_at: now,
        };

        await kv.hset(`scan:${scanId}`, scan);
        await kv.lpush('scan:ids', scanId);
        await kv.sadd(`code_to_scan_ids:${rowCode}`, scanId);
        seenCodes.add(rowCode);
        imported++;
      }

      return res.json({ success: true, count: imported });
    }

    if (action === 'scan') {
      if (!code) return res.status(400).json({ error: 'Missing code' });

      const now = new Date().toISOString();
      const scanId = await kv.incr('scan:counter');

      const existingCodeScans = await kv.scard(`code_to_scan_ids:${code}`);
      const isDuplicate = existingCodeScans > 0;

      const status = isDuplicate ? '⚠️ REPETIDO' : '✓ Único';
      const scan = { id: String(scanId), code, name: '', desc: '', qty: '', status, scanned_at: now, updated_at: now };

      await kv.hset(`scan:${scanId}`, scan);
      await kv.lpush('scan:ids', String(scanId));
      await kv.sadd(`code_to_scan_ids:${code}`, String(scanId)); // Add scanId to the set of scans for this code
      return res.json({ success: true, status: isDuplicate ? 'duplicate' : 'unique', id: String(scanId), scan });
    }

    if (action === 'update') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const existing = await kv.hgetall(`scan:${id}`);
      if (!existing) return res.status(404).json({ error: 'Scan not found' });
      if (name !== undefined) existing.name = name;
      if (desc !== undefined) existing.desc = desc;
      existing.updated_at = new Date().toISOString();
      await kv.hset(`scan:${id}`, existing);
      return res.json({ success: true });
    }

    if (action === 'delete') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      
      const scanToDelete = await kv.hgetall(`scan:${id}`);
      if (!scanToDelete) return res.status(404).json({ error: 'Scan not found' });

      await kv.del(`scan:${id}`);
      await kv.lrem('scan:ids', 0, id);
      await kv.srem(`code_to_scan_ids:${scanToDelete.code}`, id); // Remove from code_to_scan_ids set

      // If no more scans for this code, remove the code_to_scan_ids set
      const remainingScansForCode = await kv.scard(`code_to_scan_ids:${scanToDelete.code}`);
      if (remainingScansForCode === 0) {
        await kv.del(`code_to_scan_ids:${scanToDelete.code}`);
      }

      return res.json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
