// Leitura de dados do PRIMAVERA (Web API v10): fornecedores e artigos. Só leitura; não cria documentos.
// Variáveis: PRIMAVERA_URL (ex.: https://servidor:2018/WebApi), PRIMAVERA_USER, PRIMAVERA_PASSWORD, PRIMAVERA_COMPANY,
// opcionais PRIMAVERA_INSTANCE (DEFAULT) e PRIMAVERA_LINE (professional).
export const config = { maxDuration: 30 };
const ok = (res, o, s = 200) => res.status(s).setHeader('Cache-Control', 'no-store').json(o);
const env = (k, d = '') => process.env['PRIMAVERA_' + k] || d;
const pick = (r, ...ks) => { for (const k of ks) { const f = Object.keys(r).find((x) => x.toLowerCase() === k.toLowerCase()); if (f && r[f] != null && r[f] !== '') return String(r[f]).trim(); } return ''; };
const rowsOf = (j) => (j && j.DataSet && j.DataSet.Table) || (j && j.Data) || (Array.isArray(j) ? j : []);
export default async function handler(req, res) {
  if (req.method !== 'POST') return ok(res, { error: 'method' }, 405);
  const key = process.env.APP_KEY;
  if (!key || req.headers['x-key'] !== key) return ok(res, { error: 'unauthorized' }, 401);
  const base = env('URL').replace(/\/+$/, '');
  const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const configured = !!(base && env('USER') && env('PASSWORD') && env('COMPANY'));
  if (b.op === 'status' || !configured) return ok(res, { configured });
  try {
    const form = new URLSearchParams({ username: env('USER'), password: env('PASSWORD'), company: env('COMPANY'), instance: env('INSTANCE', 'DEFAULT'), grant_type: 'password', line: env('LINE', 'professional') });
    const t = await fetch(base + '/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form });
    if (!t.ok) return ok(res, { configured, ok: false, error: 'login', status: t.status });
    const tok = (await t.json()).access_token;
    if (b.op === 'test') return ok(res, { configured, ok: !!tok });
    const get = async (p) => { const r = await fetch(base + p, { headers: { authorization: 'Bearer ' + tok } }); if (!r.ok) throw new Error('HTTP ' + r.status + ' em ' + p); return rowsOf(await r.json()); };
    if (b.op === 'fornecedores') {
      const l = await get('/Base/Fornecedores/LstFornecedores');
      return ok(res, { configured, ok: true, rows: l.map((r) => ({ codigo: pick(r, 'Fornecedor', 'Codigo', 'Entidade'), nome: pick(r, 'Nome', 'NomeFiscal'), nif: pick(r, 'NumContrib', 'NumContribuinte', 'NIF'), email: pick(r, 'Email', 'EnderecoWeb'), local: pick(r, 'Localidade', 'Local'), telefone: pick(r, 'Tel', 'Telefone') })).filter((r) => r.codigo && r.nome).slice(0, 5000) });
    }
    if (b.op === 'artigos') {
      const l = await get('/Base/Artigos/LstArtigos');
      return ok(res, { configured, ok: true, rows: l.map((r) => ({ codigo: pick(r, 'Artigo', 'Codigo'), nome: pick(r, 'Descricao', 'Nome'), unidade: pick(r, 'UnidadeBase', 'Unidade', 'UnidadeCompra'), familia: pick(r, 'Familia'), subfamilia: pick(r, 'SubFamilia'), tipoArtigo: pick(r, 'TipoArtigo', 'Tipo') })).filter((r) => r.codigo && r.nome).slice(0, 5000) });
    }
    return ok(res, { error: 'op' }, 400);
  } catch (e) {
    return ok(res, { configured, ok: false, error: 'server', msg: String(e.message || e).slice(0, 200) });
  }
}
