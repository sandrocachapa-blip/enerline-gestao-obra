/* ENERLINE – camada de dados partilhada (Vercel + Neon). Substitui window.claude.use('db'). */
(function(){
const KEY='enerline_access_key';
const getKey=()=>{try{return localStorage.getItem(KEY)||''}catch(e){return ''}};
async function call(body){
  const r=await fetch('/api/db',{method:'POST',headers:{'content-type':'application/json','x-key':getKey()},body:JSON.stringify(body)});
  if(r.status===401){const e=new Error('unauthorized');e.code='unauthorized';throw e}
  if(!r.ok){const e=new Error('server');e.code='unavailable';throw e}
  return r.json();
}
function gate(){return new Promise(resolve=>{
  const go=async k=>{try{localStorage.setItem(KEY,k)}catch(e){}try{await call({op:'ping'});return true}catch(e){return false}};
  go(getKey()).then(good=>{if(good)return resolve();
    const o=document.createElement('div');
    o.style.cssText='position:fixed;inset:0;z-index:99999;background:#1f2a24;display:flex;align-items:center;justify-content:center;font-family:Barlow,system-ui,sans-serif';
    o.innerHTML='<form style="background:#fff;border-radius:10px;padding:28px;width:min(92vw,340px);box-shadow:0 10px 40px #0006"><div style="font:700 22px Barlow Condensed,sans-serif;color:#2f7d32;letter-spacing:.5px">ENERLINE</div><div style="color:#555;margin:2px 0 16px">Gestão de Obra</div><label style="font-size:13px;color:#444">Chave de acesso</label><input type="password" autofocus style="width:100%;box-sizing:border-box;margin:6px 0 10px;padding:10px;border:1px solid #bbb;border-radius:6px;font-size:16px"><div class="m" style="color:#b00020;font-size:13px;min-height:18px"></div><button style="width:100%;padding:11px;border:0;border-radius:6px;background:#2f7d32;color:#fff;font-size:15px;font-weight:600;cursor:pointer">Entrar</button></form>';
    document.body.appendChild(o);
    const f=o.querySelector('form'),i=o.querySelector('input'),m=o.querySelector('.m');
    f.onsubmit=async e=>{e.preventDefault();m.textContent='';if(await go(i.value.trim())){o.remove();resolve()}else m.textContent='Chave inválida.'};
  })})}
/* escritas em lote */
let q=[],timer=null,pending=0;const listeners=new Set();
function flush(){timer=null;const ops=q;q=[];if(!ops.length)return;pending++;
  const run=async(a)=>{try{await call({op:'batch',ops});}catch(e){if(a<3&&e.code!=='unauthorized'){await new Promise(r=>setTimeout(r,800*(a+1)));return run(a+1)}throw e}};
  return run(0).then(()=>{pending--;poke()},e=>{pending--;ops.forEach(o=>o._rej&&o._rej(e))}).finally(()=>{ops.forEach(o=>o._res&&o._res())});
}
function enqueue(o){return new Promise((res,rej)=>{o._res=res;o._rej=rej;q.push(o);if(q.length>=200){clearTimeout(timer);flush()}else if(!timer)timer=setTimeout(flush,30)})}
/* o resolve acontece no finally; rejeições chegam via _rej antes */
const wrapOp=o=>new Promise((res,rej)=>{let done=false;const p=enqueue(Object.assign(o,{}));o._rej=e=>{if(!done){done=true;rej(e)}};p.then(()=>{if(!done){done=true;res()}})});
const poke=()=>listeners.forEach(f=>f());
const mkDoc=d=>({id:d.id,data:()=>d.data});
function Query(col,where,lim){this.col=col;this.w=where||[];this.l=lim||1000}
Query.prototype.where=function(f,op,v){return new Query(this.col,this.w.concat([[f,v]]),this.l)};
Query.prototype.limit=function(n){return new Query(this.col,this.w,n)};
Query.prototype.get=async function(){const r=await call({op:'query',col:this.col,where:this.w,limit:this.l});return{docs:r.docs.map(mkDoc)}};
Query.prototype.onSnapshot=function(cb,err){
  let last='',stop=false,busy=false;
  const tick=async force=>{if(stop||busy||pending>0||q.length)return;busy=true;
    try{const s=await this.get();const h=JSON.stringify(s.docs.map(d=>[d.id,d.data()]));if(h!==last||force){last=h;cb(s)}}
    catch(e){if(err&&e.code==='unauthorized')err(e)}finally{busy=false}};
  const f=()=>tick(false);listeners.add(f);tick(true);
  const iv=setInterval(()=>{if(!document.hidden)tick(false)},4000);
  const vis=()=>{if(!document.hidden)tick(false)};document.addEventListener('visibilitychange',vis);
  return()=>{stop=true;clearInterval(iv);listeners.delete(f);document.removeEventListener('visibilitychange',vis)};
};
const db={collection:col=>{const base=new Query(col);
  base.doc=id=>({
    set:obj=>wrapOp({t:'set',col,id,data:obj}),
    delete:()=>wrapOp({t:'del',col,id}),
    get:async()=>{const r=await call({op:'get',col,id});return{exists:!!r.doc,id,data:()=>r.doc&&r.doc.data}}});
  return base}};
const dls={save:async({filename,data})=>{const b=data instanceof Blob?data:new Blob([data]);const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}};
window.claude={use:async n=>{if(n==='db'){await gate();return db}if(n==='downloads')return dls;return null}};
})();
