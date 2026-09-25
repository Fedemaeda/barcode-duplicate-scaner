const { kv } = require('@vercel/kv');

// Keep-alive para Upstash Redis (plan free).
//
// Upstash archiva las bases free que no reciben trafico (~30 dias de inactividad)
// y al archivarlas borra la instancia. OJO: un PING **no** cuenta como actividad,
// solo cuentan las operaciones reales de datos (SET/GET/LRANGE/...).
//
// Este endpoint existe para que un Vercel Cron (vercel.json -> "crons") haga
// actividad real una vez al dia y la base nunca se archive.
//   - Con el user-agent del cron: escribe un valor (SET) y lo lee (GET).
//   - Cualquier otro request: solo lee (GET), que tambien es actividad.
module.exports = async function handler(req, res) {
  const ua = String(req.headers['user-agent'] || '');
  const isCron = ua.indexOf('vercel-cron') !== -1;
  const key = 'keepalive';
  const now = new Date().toISOString();

  try {
    let wrote = null;
    if (isCron) {
      await kv.set(key, now);
      wrote = now;
    }
    const lastSeen = await kv.get(key);
    return res.status(200).json({
      ok: true,
      cron: isCron,
      wrote: wrote,
      last_seen: lastSeen,
      at: now,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
