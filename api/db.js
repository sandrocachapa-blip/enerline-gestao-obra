import { neon } from '@neondatabase/serverless';
export const config = { maxDuration: 30 };
const ok = (res, o, s = 200) => res.status(s).setHeader('Cache-Control', 'no-store').json(o);
export default async function handler(req, res) {
  if (req.method !== 'POST') return ok(res, { error: 'method' }, 405);
  const key = process.env.APP_KEY;
  if (!key || req.headers['x-key'] !== key) return ok(res, { error: 'unauthorized' }, 401);
  const sql = neon(process.env.DATABASE_URL);
  const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  try {
    if (b.op === 'ping') return ok(res, { ok: true });
    if (b.op === 'query') {
      const params = [String(b.col)];
      let q = 'select id, data from docs where col=$1';
      for (const [f, v] of b.where || []) {
        params.push(String(f), String(v));
        q += ` and data->>$${params.length - 1} = $${params.length}`;
      }
      q += ` order by id limit ${Math.min(+b.limit || 1000, 5000)}`;
      return ok(res, { docs: await sql.query(q, params) });
    }
    if (b.op === 'get') {
      const r = await sql.query('select id, data from docs where col=$1 and id=$2', [String(b.col), String(b.id)]);
      return ok(res, { doc: r[0] || null });
    }
    if (b.op === 'batch') {
      const ops = (b.ops || []).slice(0, 500);
      const stmts = ops.map((o) => o.t === 'del'
        ? sql.query('delete from docs where col=$1 and id=$2', [String(o.col), String(o.id)])
        : sql.query(
            'insert into docs(col,id,data,updated_at) values($1,$2,$3::jsonb,now()) on conflict(col,id) do update set data=excluded.data, updated_at=now()',
            [String(o.col), String(o.id), JSON.stringify(o.data ?? {})]));
      if (stmts.length) await sql.transaction(stmts);
      return ok(res, { ok: true, n: stmts.length });
    }
    return ok(res, { error: 'op' }, 400);
  } catch (e) {
    return ok(res, { error: 'server', msg: String(e.message || e).slice(0, 200) }, 500);
  }
}
