// Envia o aviso de novo documento para o canal Teams de uma frente (webhook configurado na frente).
export const config = { maxDuration: 15 };
const ok = (res, o, s = 200) => res.status(s).setHeader('Cache-Control', 'no-store').json(o);
const ALLOW = /(\.webhook\.office\.com|\.logic\.azure\.com|\.powerplatform\.com|\.powerautomate\.com)$/i;
export default async function handler(req, res) {
  if (req.method !== 'POST') return ok(res, { error: 'method' }, 405);
  const key = process.env.APP_KEY;
  if (!key || req.headers['x-key'] !== key) return ok(res, { error: 'unauthorized' }, 401);
  const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  let u;
  try { u = new URL(String(b.url || '')); } catch (e) { return ok(res, { error: 'url' }, 400); }
  if (u.protocol !== 'https:' || !ALLOW.test(u.hostname)) return ok(res, { error: 'url' }, 400);
  const t = (v, n) => String(v || '').slice(0, n);
  const card = { type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', type: 'AdaptiveCard', version: '1.4',
    body: [{ type: 'TextBlock', weight: 'Bolder', size: 'Medium', wrap: true, text: t(b.title, 200) }, { type: 'TextBlock', wrap: true, text: t(b.text, 1500) }],
    actions: /^https:\/\//.test(b.link || '') ? [{ type: 'Action.OpenUrl', title: 'Abrir documento', url: t(b.link, 500) }] : [] } }] };
  try {
    const r = await fetch(u.href, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(card) });
    return ok(res, { ok: r.ok, status: r.status });
  } catch (e) { return ok(res, { ok: false, error: 'send' }); }
}
