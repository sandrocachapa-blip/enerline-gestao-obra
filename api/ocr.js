// Leitura avançada de faturas por IA (opcional). Só funciona com a variável ANTHROPIC_API_KEY definida no projeto.
// Recebe o documento (PDF ou imagem, em base64) e devolve os dados da fatura em JSON. Sem a chave, a plataforma usa a leitura local.
export const config = { maxDuration: 60 };
const ok = (res, o, s = 200) => res.status(s).setHeader('Cache-Control', 'no-store').json(o);
const PROMPT = `És um leitor de faturas de fornecedores (Angola e Portugal). Lê o documento e devolve APENAS um objeto JSON, sem texto antes nem depois, com estes campos:
{"fornecedor":{"nome":"","nif":""},"numero":"","data":"AAAA-MM-DD","vencimento":"AAAA-MM-DD","moeda":"AOA|USD|EUR","base":0,"desconto":0,"iva":0,"taxa":0,"retencao":0,"total":0,
"itens":[{"ref":"","descr":"","qtd":0,"un":"","preco":0,"desc":0,"taxa":0,"valor":0}],"manuscrita":false,"duvidas":[""]}
Regras: o fornecedor é quem emite a fatura, não o cliente. "base" é o total sem imposto; "valor" de cada item é o valor da linha sem imposto; "desc" é a percentagem de desconto da linha.
Números como números JSON (ponto decimal, sem separador de milhares). Um item por linha da tabela, pela ordem do documento; não incluas linhas de totais, resumos nem subtotais como itens.
Se um campo não estiver no documento ou não for legível, usa "" ou 0 e explica em "duvidas". Não inventes valores.`;
export default async function handler(req, res) {
  if (req.method !== 'POST') return ok(res, { error: 'method' }, 405);
  const key = process.env.APP_KEY;
  if (!key || req.headers['x-key'] !== key) return ok(res, { error: 'unauthorized' }, 401);
  const ak = process.env.ANTHROPIC_API_KEY || '';
  const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  if (b.op === 'status') return ok(res, { configured: !!ak });
  if (!ak) return ok(res, { configured: false });
  const data = String(b.data || '').replace(/^data:[^,]*,/, '');
  const mt = String(b.contentType || '').toLowerCase();
  if (!data || data.length > 5600000) return ok(res, { configured: true, ok: false, error: 'tamanho' });
  const pdf = mt.includes('pdf');
  if (!pdf && !/^image\/(jpeg|png|webp|gif)$/.test(mt)) return ok(res, { configured: true, ok: false, error: 'tipo' });
  const doc = pdf ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
                  : { type: 'image', source: { type: 'base64', media_type: mt, data } };
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': ak, 'anthropic-version': process.env.ANTHROPIC_VERSION || '2026-10-21' },
      body: JSON.stringify({ model: process.env.OCR_MODEL || 'claude-haiku-5-5', max_tokens: 4000, messages: [{ role: 'user', content: [doc, { type: 'text', text: PROMPT }] }] }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return ok(res, { configured: true, ok: false, error: 'servico', status: r.status, detail: (j.error && j.error.type) || '' });
    const txt = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return ok(res, { configured: true, ok: false, error: 'formato' });
    let out; try { out = JSON.parse(m[0]); } catch (e) { return ok(res, { configured: true, ok: false, error: 'formato' }); }
    return ok(res, { configured: true, ok: true, fatura: out });
  } catch (e) { return ok(res, { configured: true, ok: false, error: 'ligacao' }); }
}
