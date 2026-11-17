// Receção de faturas por email: um fluxo (Power Automate / Logic Apps) reencaminha para aqui cada email da caixa de faturas.
// Cada anexo PDF ou imagem cria uma fatura nova no estado «Recebida», com o original guardado sem alteração.
import { neon } from '@neondatabase/serverless';
export const config = { maxDuration: 30 };
const ok = (res, o, s = 200) => res.status(s).setHeader('Cache-Control', 'no-store').json(o);
const CH = 600000;
const rid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = (n) => String(n).padStart(2, '0');
export default async function handler(req, res) {
  if (req.method !== 'POST') return ok(res, { error: 'method' }, 405);
  const key = process.env.APP_KEY;
  if (!key || req.headers['x-key'] !== key) return ok(res, { error: 'unauthorized' }, 401);
  if (!process.env.DATABASE_URL) return ok(res, { error: 'config' }, 500);
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const atts = (Array.isArray(b.attachments) ? b.attachments : []).filter((a) => a && a.contentBase64 &&
      (/pdf|image\//i.test(a.contentType || '') || /\.(pdf|png|jpe?g|tiff?|webp)$/i.test(a.name || ''))).slice(0, 10);
    if (!atts.length) return ok(res, { ok: true, created: 0, note: 'sem anexos PDF ou imagem' });
    const sql = neon(process.env.DATABASE_URL);
    const d = new Date(Date.now() + 3600000); // hora de Luanda (UTC+1)
    const at = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    const from = String(b.from || '').slice(0, 200), subject = String(b.subject || '').slice(0, 300);
    const stmts = [], ids = [];
    const put = (col, id, data) => stmts.push(sql.query(
      'insert into docs(col,id,data,updated_at) values($1,$2,$3::jsonb,now()) on conflict(col,id) do update set data=excluded.data, updated_at=now()',
      [col, id, JSON.stringify(data)]));
    for (const a of atts) {
      const s = String(a.contentBase64).replace(/\s+/g, ''), fid = rid('f'), n = Math.ceil(s.length / CH) || 1;
      const name = String(a.name || 'fatura.pdf').slice(0, 160);
      const type = a.contentType && /pdf|image\//i.test(a.contentType) ? String(a.contentType).split(';')[0] : (/\.pdf$/i.test(name) ? 'application/pdf' : 'image/jpeg');
      for (let i = 0; i < n; i++) put('gdfiles', fid + '_' + i, { obra: '', file: fid, i, n, d: s.slice(i * CH, (i + 1) * CH) });
      const id = rid('df');
      put('dafaturas', id, { num: '', fornecedor: '', fornNome: '', data: at.slice(0, 10), venc: '', base: 0, taxa: 14, iva: 0, total: 0, moeda: 'AOA', tipo: 'Material', obra: '', resp: '', compra: '', descr: subject,
        file: { id: fid, name, size: Math.floor(s.length * 0.75), n, type }, versoes: [], recebida: at, desde: at, criadoPor: 'Email', origem: 'email', emailDe: from, emailAssunto: subject,
        val: { estado: 'Pendente' }, guia: { precisa: false, estado: '' }, prim: {}, estado: 'Recebida',
        hist: [{ at, by: 'Plataforma', acao: 'Fatura recebida por email', obs: (from ? 'De ' + from : '') + (subject ? ' · ' + subject : '') }] });
      ids.push(id);
    }
    await sql.transaction(stmts);
    return ok(res, { ok: true, created: ids.length, ids });
  } catch (e) {
    return ok(res, { error: 'server', msg: String(e.message || e).slice(0, 200) }, 500);
  }
}
