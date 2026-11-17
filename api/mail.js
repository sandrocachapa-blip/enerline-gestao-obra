// Envio real de emails de aviso através de um fluxo (Power Automate / Logic Apps) definido em MAIL_FLOW_URL.
// Sem essa variável, a plataforma continua em modo de simulação.
export const config = { maxDuration: 15 };
const ok = (res, o, s = 200) => res.status(s).setHeader('Cache-Control', 'no-store').json(o);
const ALLOW = /(\.logic\.azure\.com|\.powerplatform\.com|\.powerautomate\.com|\.azure-api\.net)$/i;
export default async function handler(req, res) {
  if (req.method !== 'POST') return ok(res, { error: 'method' }, 405);
  const key = process.env.APP_KEY;
  if (!key || req.headers['x-key'] !== key) return ok(res, { error: 'unauthorized' }, 401);
  const flow = process.env.MAIL_FLOW_URL || '';
  const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  if (b.op === 'status') return ok(res, { configured: !!flow });
  if (!flow) return ok(res, { configured: false });
  let u;
  try { u = new URL(flow); } catch (e) { return ok(res, { configured: false, error: 'url' }); }
  if (u.protocol !== 'https:' || !ALLOW.test(u.hostname)) return ok(res, { configured: false, error: 'url' });
  const to = String(b.to || '').split(/[;,]/).map((x) => x.trim()).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)).slice(0, 20);
  if (!to.length) return ok(res, { configured: true, ok: false, error: 'destinatario' });
  try {
    const r = await fetch(u.href, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to: to.join(';'), subject: String(b.subject || '').slice(0, 250), body: String(b.body || '').slice(0, 8000) }) });
    return ok(res, { configured: true, ok: r.ok, status: r.status });
  } catch (e) { return ok(res, { configured: true, ok: false, error: 'send' }); }
}
