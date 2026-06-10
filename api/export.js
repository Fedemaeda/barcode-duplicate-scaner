const { kv } = require('@vercel/kv');
const xlsx = require('xlsx');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const token = req.query.token;
  const format = req.query.format || 'xlsx';

  if (!token) return res.status(401).json({ error: 'Token requerido' });
  const sessionUser = await kv.get(`token:${token}`);
  if (!sessionUser) return res.status(401).json({ error: 'Sesión expirada' });

  try {
    const ids = await kv.lrange('scan:ids', 0, -1);
    const products = [];
    if (ids.length) {
      const pipe = kv.pipeline();
      ids.forEach(id => pipe.hgetall(`scan:${id}`));
      const results = await pipe.exec();
      results.filter(Boolean).forEach(p => {
        products.push({ Código: p.code, Nombre: p.name || '', Descripción: p.desc || '', Estado: p.status || '', Escaneado: p.scanned_at || '', Actualizado: p.updated_at || '' });
      });
    }

    const ws = xlsx.utils.json_to_sheet(products);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Productos');

    if (format === 'csv') {
      const csv = '\uFEFF' + xlsx.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=productos.csv');
      return res.send(csv);
    }

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=productos.xlsx');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
