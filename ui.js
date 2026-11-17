/* ENERLINE – perfis de acesso configuráveis (sem acesso / leitura / escrita por módulo), resumos compactos e resumo em todos os submenus */
(function(){
const ADM='Administrador',KEY='perfis';
/* ---------- números com ponto nos milhares e vírgula nos decimais, em toda a aplicação ---------- */
{const o=Number.prototype.toLocaleString;Number.prototype.toLocaleString=function(l,opt){return o.call(this,l==='pt-PT'?'de-DE':l,opt)}}
const P=v=>{v=String(v==null?'':v).replace(/[^\d.,-]/g,'');if(!v)return NaN;return window.FATLER?window.FATLER.toNum(v):+v.replace(/\./g,'').replace(',','.')};
const FM=v=>{const n=typeof v==='number'?v:P(v);return isNaN(n)?'':n.toLocaleString('de-DE',{maximumFractionDigits:2})};
/* campos de valor dos formulários gerais: mostram o número formatado ao sair do campo e voltam a número ao guardar */
{const o=openForm;openForm=function(c,id,custom){const r=o.apply(this,arguments);try{const s=custom||S[c];(s&&s.fields||[]).filter(f=>f.money&&f.type==='number').forEach(f=>{const e=document.querySelector('#frm #f_'+f.k);if(e){e.dataset.mny='1';if(e.value!==''){e.type='text';e.inputMode='decimal';e.value=FM(e.value)}}})}catch(e){}return r}}
document.addEventListener('focusin',e=>{const t=e.target;if(t.dataset&&t.dataset.mny&&t.type==='text'){const n=P(t.value);t.type='number';t.value=isNaN(n)?'':n}},true);
document.addEventListener('focusout',e=>{const t=e.target;if(t.dataset&&t.dataset.mny&&t.type==='number'&&t.value!==''){const v=t.value;t.type='text';t.inputMode='decimal';t.value=FM(v)}},true);
document.addEventListener('submit',e=>{const fm=e.target;if(!fm||fm.id!=='frm')return;fm.querySelectorAll('input[data-mny]').forEach(t=>{if(t.type==='text'){const n=P(t.value);t.type='number';t.value=isNaN(n)?'':n}})},true);
/* ---------- resumos mais curtos ---------- */
const css=document.createElement('style');css.textContent=`
.dash{margin:0 0 12px;gap:8px}
.tiles{grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:8px}
.tile{padding:8px 10px;gap:2px}.tile b{font-size:24px}.tile b.sm,.tile b.money{font-size:18px}.tile b i{font-size:14px}.tile span{font-size:11px;letter-spacing:.04em;line-height:1.25}
.tiles.sm .tile b{font-size:22px}
.dgrid{grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}
.dcard{padding:8px 10px;max-width:460px}.dcard h3{font-size:12px;margin:0 0 6px}
.bars{gap:3px;max-height:132px;overflow-y:auto}.br{grid-template-columns:minmax(70px,130px) minmax(0,1fr) auto;gap:6px;font-size:12.5px}.br .tr,.br .tr i{height:7px}.br b{min-width:22px}
.qsak{grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:8px}.qsak a{padding:8px 10px}.qsak b{font-size:22px}.qsak span{font-size:11px;line-height:1.25;display:block}
.qsabar{font-size:12.5px;padding:1px 0}.qsabar i{height:7px}.qsag{gap:12px;margin-top:12px}
.logfl b{font-size:18px}.logfl a{padding:6px 8px;font-size:12px}
.dashtg{display:inline-flex;align-self:flex-start;width:auto;align-items:center;gap:6px;border:1px solid var(--line);background:var(--surface);color:var(--muted);border-radius:99px;padding:2px 12px;font-size:12px;cursor:pointer;margin:0 0 8px}
.dash.off>*{display:none}
.pfx{display:grid;grid-template-columns:minmax(220px,300px) minmax(0,1fr);gap:16px;align-items:start}@media(max-width:860px){.pfx{grid-template-columns:1fr}}
.pfl{display:flex;flex-direction:column;gap:4px}.pfl button{display:flex;justify-content:space-between;gap:8px;text-align:left;border:1px solid var(--line);background:var(--surface);color:inherit;border-radius:6px;padding:7px 10px;cursor:pointer;font:inherit}.pfl button.on{border-color:var(--brand);box-shadow:inset 3px 0 0 var(--brand);font-weight:700}
.pfm{width:100%;border-collapse:collapse;font-size:14px}.pfm td,.pfm th{padding:4px 8px;border-bottom:1px solid var(--line)}.pfm th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);text-align:center}.pfm th:first-child{text-align:left}.pfm td.c{text-align:center;width:92px}.pfm tr.g td{background:var(--neu-bg);font-weight:700;text-transform:uppercase;font-size:12px;letter-spacing:.05em}.pfm tr.g button{font:inherit;font-size:11px;border:1px solid var(--line);background:var(--surface);border-radius:99px;padding:1px 9px;cursor:pointer;margin-left:4px;text-transform:none;letter-spacing:0;font-weight:400;color:inherit}
.pfm input{width:18px;height:18px;cursor:pointer}.pfbox{max-height:62vh;overflow:auto;border:1px solid var(--line);border-radius:8px;background:var(--surface)}.pfbox thead th{position:sticky;top:0;background:var(--surface)}
@media(max-width:620px){.pfm{font-size:13px}.pfm td,.pfm th{padding:4px 3px}.pfm td.c{width:52px}.pfm th{font-size:9px;letter-spacing:0}.pfm tr.g button{margin:2px 2px 0 0}.pfx .fields{grid-template-columns:1fr}.pfx>div{min-width:0}}`;(document.body||document.head).appendChild(css);
const dOff=()=>{try{return localStorage.getItem('enerline_dash_off')==='1'}catch(e){return false}};
/* ---------- resumo automático nos submenus que não tinham ---------- */
const badSet=()=>new Set(TONE.bad),warnSet=()=>new Set(TONE.warn);
function autoDash(c){const s=S[c];if(!s||!s.fields||!s.fields.length)return null;
  return()=>{const r=rows(c);if(!r.length)return'';const F=k=>s.fields.find(f=>f.k===k),B=badSet(),W=warnSet(),est=F('estado')||F(s.chip),sit=F('situacao')||F('nivel')||F('significancia')||F('classificacao');
    const tiles=[T(c,null,'Registos')];
    if(est&&est.opts){cnt(r,x=>x[est.k]).slice(0,3).forEach(([v])=>{if(v!=='—')tiles.push(T(c,x=>x[est.k]===v,v,B.has(v)?'bad':W.has(v)?'warn':TONE.ok.includes(v)?'ok':''))})}
    if(sit){const bad=x=>B.has(x[sit.k]),wr=x=>W.has(x[sit.k]);if(r.some(bad))tiles.push(T(c,bad,sit.l+': a tratar','bad'));if(r.some(wr))tiles.push(T(c,wr,sit.l+': atenção','warn'))}
    const mon=s.fields.find(f=>f.money&&f.type==='number');if(mon&&r.some(x=>+x[mon.k]))tiles.push(tl(kz(sumBy(r,x=>x[mon.k])),mon.l.split(' (')[0],'',1));
    const ks=[...new Set([s.chip,...s.fields.filter(f=>f.opts&&f.opts.length&&!f.calc&&f.k!=='estado').map(f=>f.k),'estado'])].filter(k=>k&&F(k)).slice(0,2);
    const cards=ks.map(k=>{const f=F(k);return BK('Por '+f.l.split(' (')[0].toLowerCase(),c,null,x=>f.ref?name(f.ref,x[k]):x[k],6)});
    return dwrap(tiles,cards)}}
VIEWS.forEach(v=>{const c=v[0];if(!DASH[c]&&S[c]&&S[c].fields&&S[c].fields.length&&c!=='utilizadores'){const d=autoDash(c);if(d)DASH[c]=d}});
/* ---------- perfis configuráveis ---------- */
const BASE={};Object.entries(PERF).forEach(([k,p])=>{BASE[k]={d:p.d,v:p.v==='*'?'*':[...p.v],edit:p.edit!==false}});
const allViews=()=>VIEWS.map(v=>v[0]).filter(v=>v!=='utilizadores'&&v!=='perfis');
const groups=()=>{const out=[];let g='';VIEWS.forEach(v=>{if(v[2])g=v[2];if(v[0]==='utilizadores'||v[0]==='perfis')return;let o=out.find(x=>x.g===g);if(!o){o={g,vs:[]};out.push(o)}o.vs.push(v)});return out};
const baseMod=n=>{const b=BASE[n],m={};if(!b)return m;allViews().forEach(v=>{if(/^adm/.test(v)&&n!=='Administração')return;if(b.v==='*'||b.v.includes(v)||v==='hoje')m[v]=b.edit?'w':'r'});return m};
const stored=()=>((data.config||{})[KEY]||{}).list||{};
let applied='';
function apply(){const L=stored(),sig=JSON.stringify(L)+'|'+VIEWS.length;if(sig===applied)return;applied=sig;
  Object.keys(PERF).forEach(k=>{if(!BASE[k]&&!L[k])delete PERF[k]});
  Object.entries(BASE).forEach(([k,b])=>{if(!L[k]){PERF[k]={d:b.d,v:b.v==='*'?'*':[...b.v],edit:b.edit}}});
  Object.entries(L).forEach(([k,p])=>{if(k===ADM)return;const m=p.mod||{},v=Object.keys(m).filter(x=>m[x]==='r'||m[x]==='w'),w=v.filter(x=>m[x]==='w');if(!v.includes('hoje'))v.push('hoje');
    const o={d:p.d||(BASE[k]||{}).d||'Perfil personalizado.',v,w,custom:true};Object.defineProperty(o,'edit',{enumerable:true,get(){return w.includes(st.view)||(st.view==='hoje'&&w.length>0)}});PERF[k]=o});
  const order=[...Object.keys(BASE),...Object.keys(L).filter(k=>!BASE[k])],cp={};order.forEach(k=>{if(PERF[k])cp[k]=PERF[k]});Object.keys(PERF).forEach(k=>delete PERF[k]);Object.assign(PERF,cp);
  const pf=S.utilizadores.fields.find(f=>f.k==='perfil');if(pf)pf.opts=Object.keys(PERF)}
/* vista */
{const i=VIEWS.findIndex(v=>v[0]==='utilizadores');VIEWS.splice(i+1,0,['perfis','Perfis e acessos']);S.perfis={title:'Perfis e acessos',cols:[],fields:[],sort:()=>0}}
let ED=null; /* {nome, d, mod, novo} em edição */
const isAdm=()=>{const u=me();return !u||u.perfil===ADM};
function load(n){const L=stored();ED={nome:n,d:(L[n]&&L[n].d)||(BASE[n]||{}).d||'',mod:{...(L[n]?L[n].mod:baseMod(n))},novo:false,dirty:false}}
function vPerfis(){if(!isAdm())return `<div class="vh"><h1>Perfis e acessos</h1></div><div class="empty">Só o administrador pode alterar os perfis.</div>`;
  const names=Object.keys(PERF),L=stored();if(!ED||(!ED.novo&&!PERF[ED.nome]))load(names.find(n=>n!==ADM)||ADM);
  const us=rows('utilizadores'),lock=ED.nome===ADM,gr=groups(),tot=allViews().length,nr=Object.values(ED.mod).filter(x=>x==='r').length,nw=Object.values(ED.mod).filter(x=>x==='w').length;
  const rad=(v,val)=>`<td class="c"><input type="radio" name="pm_${v}" value="${val}" data-pf="set:${v}:${val}"${(ED.mod[v]||'')===val?' checked':''}${lock||(v==='hoje'&&val==='')?' disabled':''} aria-label="${val==='w'?'Escrita':val==='r'?'Leitura':'Sem acesso'}"></td>`;
  return `<div class="vh"><h1>Perfis e acessos</h1><div class="tools"><button class="btn ghost" data-pf="new">Novo perfil</button><button class="btn ghost" data-pf="dup">Duplicar este</button></div></div>
  <p class="sub">Escolha um perfil e marque, para cada módulo, se não tem acesso, se só pode ver (leitura) ou se também pode criar e alterar (escrita). Depois atribua o perfil a cada pessoa em «Utilizadores e perfis».</p>
  <div class="pfx"><div><div class="pfl">${names.map(n=>`<button type="button" data-pf="sel:${esc(n)}" class="${!ED.novo&&ED.nome===n?'on':''}"><span>${esc(n)}${L[n]?' <span class="meta">· alterado</span>':''}</span><span class="pill">${us.filter(u=>u.perfil===n).length}</span></button>`).join('')}${ED.novo?`<button type="button" class="on"><span>${esc(ED.nome||'(novo perfil)')}</span><span class="pill">novo</span></button>`:''}</div>
    <p class="meta" style="margin-top:8px">O número indica quantos utilizadores têm o perfil.</p></div>
   <div><div class="fields" style="margin-bottom:10px"><label>Nome do perfil<input id="pfnome" value="${esc(ED.nome)}"${ED.novo?'':' disabled'} maxlength="40"></label><label>Descrição<input id="pfd" value="${esc(ED.d)}"${lock?' disabled':''} maxlength="160"></label></div>
    ${lock?'<div class="banner">O perfil Administrador tem sempre acesso total e não pode ser alterado.</div>':`<div class="gdrow" style="margin-bottom:8px"><span class="meta">${nw} módulos com escrita · ${nr} só leitura · ${tot-nw-nr} sem acesso</span><button class="btn ghost" data-pf="all:w">Tudo com escrita</button><button class="btn ghost" data-pf="all:r">Tudo só leitura</button><button class="btn ghost" data-pf="all:">Limpar tudo</button></div>`}
    <div class="pfbox"><table class="pfm"><thead><tr><th>Módulo</th><th>Sem acesso</th><th>Leitura</th><th>Escrita</th></tr></thead><tbody>${gr.map(g=>`<tr class="g"><td colspan="4">${esc(g.g)}${lock?'':`<button type="button" data-pf="grp:${esc(g.g)}:">nenhum</button><button type="button" data-pf="grp:${esc(g.g)}:r">leitura</button><button type="button" data-pf="grp:${esc(g.g)}:w">escrita</button>`}</td></tr>${g.vs.map(v=>`<tr><td>${esc(v[1])}</td>${lock?'<td class="c"></td><td class="c"></td><td class="c">✓</td>':rad(v[0],'')+rad(v[0],'r')+rad(v[0],'w')}</tr>`).join('')}`).join('')}</tbody></table></div>
    ${lock?'':`<div class="actions" style="margin-top:12px">${!ED.novo&&!BASE[ED.nome]?`<button class="btn danger" data-danger data-pf="del">Apagar perfil</button>`:''}${!ED.novo&&BASE[ED.nome]&&L[ED.nome]?`<button class="btn ghost" data-pf="reset">Repor o perfil original</button>`:''}<button class="btn" data-pf="save">Guardar perfil</button></div>`}
    <p class="help">«Hoje» fica sempre visível. Algumas funções continuam ligadas ao nome do perfil (por exemplo, registar faturas é do perfil DAF e publicar documentos é da Gestão documental): um perfil novo dá acesso aos módulos, mas não a essas funções reservadas. As alterações aplicam-se quando o utilizador abrir ou atualizar a aplicação.</p></div></div>`}
function keep(){const n=$('#pfnome'),d=$('#pfd');if(ED&&n&&ED.novo)ED.nome=n.value.trim();if(ED&&d&&!d.disabled)ED.d=d.value.trim()}
async function persist(L){await save('config',KEY,{list:L,at:new Date().toISOString(),by:(me()||{}).nome||''});applied='';apply();render()}
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-pf]');if(!b)return;const a=b.getAttribute('data-pf').split(':'),k=a[0];
  if(k==='dash'){try{localStorage.setItem('enerline_dash_off',dOff()?'0':'1')}catch(x){}return render()}
  if(!isAdm())return;
  if(k==='set'){ED.mod[a[1]]=a[2];if(!a[2])delete ED.mod[a[1]];return}
  keep();
  if(k==='sel'){load(a.slice(1).join(':'));return render()}
  if(k==='new'){ED={nome:'',d:'',mod:{hoje:'r'},novo:true};render();const i=$('#pfnome');if(i)i.focus();return}
  if(k==='dup'){ED={nome:ED.nome+' (cópia)',d:ED.d,mod:{...ED.mod},novo:true};return render()}
  if(k==='all'){allViews().forEach(v=>{if(a[1])ED.mod[v]=a[1];else delete ED.mod[v]});ED.mod.hoje=ED.mod.hoje||'r';return render()}
  if(k==='grp'){const g=groups().find(x=>x.g===a[1]);if(g)g.vs.forEach(v=>{if(a[2])ED.mod[v[0]]=a[2];else if(v[0]!=='hoje')delete ED.mod[v[0]]});return render()}
  if(k==='save'){const n=ED.nome.trim();if(n.length<2)return toast('Dê um nome ao perfil.');if(n===ADM)return;if(ED.novo&&PERF[n])return toast('Já existe um perfil com esse nome.');
    if(!Object.values(ED.mod).some(x=>x))return toast('Escolha pelo menos um módulo.');const L={...stored()};L[n]={d:ED.d,mod:{...ED.mod,hoje:ED.mod.hoje||'r'}};ED.novo=false;ED.nome=n;await persist(L);return toast('Perfil «'+n+'» guardado.')}
  if(k==='reset'){const L={...stored()};delete L[ED.nome];const n=ED.nome;ED=null;await persist(L);load(n);render();return toast('Perfil reposto.')}
  if(k==='del'){if(!b.classList.contains('armed'))return;const n=ED.nome,c=rows('utilizadores').filter(u=>u.perfil===n).length;if(c)return toast('Há '+c+' utilizador'+(c>1?'es':'')+' com este perfil: mude-lhes o perfil primeiro.');const L={...stored()};delete L[n];ED=null;await persist(L);return toast('Perfil apagado.')}},true);
{const o=vGeneric;vGeneric=function(c){if(c==='perfis')return vPerfis();const h=o(c);return c==='utilizadores'&&isAdm()?h.replace('<div class="tools">','<div class="tools"><a class="btn ghost" href="#perfis">Perfis e acessos</a>'):h}}
{const o=render;render=function(){try{apply()}catch(e){console.warn(e)}const r=o.apply(this,arguments);try{const d=document.querySelector('#main .dash');if(d&&!document.querySelector('#main .dashtg')){const off=dOff();d.classList.toggle('off',off);d.insertAdjacentHTML('beforebegin',`<button type="button" class="dashtg" data-pf="dash" aria-expanded="${!off}">${off?'Mostrar resumo ▸':'Esconder resumo ▾'}</button>`)}
    if(!isAdm()){const l=document.querySelector('#nav a[data-nav="perfis"]');if(l)l.remove()}}catch(e){}return r}}
/* ---------- seletor de obra só onde faz falta, e «Todas as obras» nas listas ---------- */
['admpainel','admobras','admfin','admrh','admrel','perfis','ligacoes','dafval','dafguias','dafprim','dafarq','dafrel','emails'].forEach(v=>NOOB.add(v));
const NOALL=new Set(['tarefas','ponto','rh','requisicoes','compras','orcamento','hst_']);
allOk=v=>SC.includes(v)&&!NOALL.has(v)&&S[v]&&S[v].fields&&S[v].fields.length>0&&rows('obras').length>1;
let allBusy=false;
async function loadTodas(){if(allBusy||typeof db==='undefined'||!db)return;allBusy=true;toast('A carregar os registos de todas as obras…');
  try{unsubs.forEach(u=>u());unsubs=[];st.all=true;render();
    await Promise.all(SC.map(async c=>{if(c==='ponto')return;try{const m={};(await db.collection(c).limit(5000).get()).docs.forEach(d=>{m[d.id]=d.data()});if(st.all)data[c]=m}catch(e){}}));
    if(st.all){render();toast('A mostrar todas as obras. Para criar ou alterar um registo, escolha a obra.')}}catch(e){toast('Não foi possível carregar todas as obras.')}allBusy=false}
window.ENLALL=()=>{if(!allOk(st.view))return;loadTodas()};
const sairTodas=()=>{if(!st.all)return;st.all=false;if(db)subObra()};
{const o=vGeneric;vGeneric=function(c){if(!st.all||!allOk(c))return o(c);const s=S[c],had=s.fields.some(f=>f.k==='obra'),cols=s.cols;
    if(!had)s.fields.push({k:'obra',l:'Obra',ref:'obras',calc:1});if(!cols.includes('obra'))s.cols=['obra',...cols];
    try{return o(c)}finally{s.cols=cols;if(!had){const i=s.fields.findIndex(f=>f.k==='obra'&&f.calc);if(i>=0)s.fields.splice(i,1)}}}}
{const o=render;render=function(){try{if(st.all&&!allOk(st.view))sairTodas()}catch(e){}return o.apply(this,arguments)}}
document.addEventListener('click',e=>{if(!st.all)return;const t=e.target.closest&&e.target.closest('[data-new],[data-edit],[data-del],[data-cycle]');if(!t)return;
  if(t.hasAttribute('data-edit')){const[c,id]=t.getAttribute('data-edit').split(':'),r=data[c]&&data[c][id];if(r&&r.obra&&data.obras[r.obra]){e.preventDefault();e.stopPropagation();const nome=data.obras[r.obra].nome;setObra(r.obra);toast('Obra «'+nome+'» escolhida. A abrir o registo…');
      let n=0;const iv=setInterval(()=>{if(++n>40){clearInterval(iv);return}if(data[c]&&data[c][id]&&st.obra===r.obra){clearInterval(iv);try{openForm(c,id)}catch(x){}}},150);return}}
  e.preventDefault();e.stopPropagation();toast('Em «Todas as obras» só se consulta. Escolha a obra para criar ou alterar registos.')},true);
/* ---------- RH: um trabalhador nunca é apagado; é desativado com data e motivo e fica no histórico ---------- */
const MOT=['Despedimento','Fim de contrato','Demissão (iniciativa do trabalhador)','Fim de obra / desmobilização','Abandono do posto','Período experimental não aprovado','Reforma','Falecimento','Outro'];
{const s=S.trabalhadores,e=s.fields.find(f=>f.k==='estado');if(e&&!e.opts.includes('Inativo'))e.opts.push('Inativo');s.chip=s.chip||'estado';
 if(!s.fields.some(f=>f.k==='dataSaida'))s.fields.push({k:'dataSaida',l:'Data de saída',type:'date',calc:1},{k:'motivoSaida',l:'Motivo da saída',calc:1});
 if(!TONE.bad.includes('Inativo'))TONE.bad.push('Inativo')}
const podeRH=()=>{const u=me();return canEdit()&&(!u||['Administrador','Administração','Diretor de obra','RH'].includes(u.perfil)||(PERF[u.perfil]&&PERF[u.perfil].custom))};
{const o=del;del=function(c,id){if(c==='trabalhadores'){toast('Os trabalhadores não se apagam: use «Desativar trabalhador», para ficar no histórico.');return}return o.apply(this,arguments)}}
{const o=openForm;openForm=function(c,id,custom){const r=o.apply(this,arguments);if(c!=='trabalhadores'||custom)return r;try{const fm=$('#frm'),w=id&&data.trabalhadores[id];if(!fm)return r;
    const d=fm.querySelector('[data-del]');if(d)d.remove();const es=fm.querySelector('#f_estado'),ina=w&&w.estado==='Inativo';
    if(es){[...es.options].forEach(op=>{if(op.value==='Inativo'&&!ina)op.remove()});if(ina){es.disabled=true;es.insertAdjacentHTML('afterend','<input type="hidden" id="f_estado_keep" name="estado" value="Inativo">')}}
    if(w){const h=(w.hist||[]).slice().reverse(),ac=fm.querySelector('.actions');
      const box=`<div class="rhsai">${ina?`<div class="banner" style="display:block;margin:10px 0 0"><strong>Trabalhador inativo</strong> desde ${fdate(w.dataSaida)} · motivo: <strong>${esc(w.motivoSaida||'—')}</strong>${w.obsSaida?'<br>'+esc(w.obsSaida):''}</div>`:''}
        ${h.length?`<div style="margin-top:10px"><strong>Histórico</strong><ul style="margin:4px 0 0;padding-left:18px;font-size:14px">${h.map(x=>`<li><strong>${esc(x.acao)}</strong> · ${fdate((x.data||x.at||'').slice(0,10))}${x.motivo?' · '+esc(x.motivo):''}${x.obs?' — '+esc(x.obs):''} <span class="meta">(${esc(x.by||'')})</span></li>`).join('')}</ul></div>`:''}</div>`;
      if(ac){ac.insertAdjacentHTML('beforebegin',box);if(podeRH())ac.insertAdjacentHTML('afterbegin',ina?`<button type="button" class="btn ghost" data-rh="reat:${id}">Reativar trabalhador</button>`:`<button type="button" class="btn danger" data-rh="sai:${id}">Desativar trabalhador</button>`)}}}catch(e){console.warn(e)}return r}}
function saiForm(id){const w=data.trabalhadores[id];if(!w)return;const G_=window.GD;if(!G_)return;
  G_.show(`<form data-rhf="sai:${id}"><h2 style="margin:0">Desativar trabalhador</h2><p class="meta" style="margin:4px 0 10px"><strong>${esc(w.nome)}</strong>${w.funcao?' · '+esc(w.funcao):''}${w.numPonto?' · n.º '+esc(w.numPonto):''}. O registo não é apagado: fica inativo, com o histórico de ponto, tarefas e documentos.</p>
   <div class="fields"><label>Motivo<select name="motivo" required><option value="">Escolher…</option>${MOT.map(m=>`<option>${esc(m)}</option>`).join('')}</select></label><label>Data de saída<input type="date" name="data" required value="${today()}"></label>
   <label class="wide">Razão / observações<textarea name="obs" rows="3" required placeholder="Descreva a razão da saída"></textarea></label></div>
   <p class="help">Depois de desativado, deixa de poder ser escolhido para tarefas e equipas. Se tiver código no relógio de ponto, convém bloqueá-lo também no terminal.</p>
   <div class="actions"><button type="button" class="btn ghost" data-gd="close">Cancelar</button><button class="btn danger" type="submit">Desativar</button></div></form>`)}
function reatForm(id){const w=data.trabalhadores[id];if(!w||!window.GD)return;
  window.GD.show(`<form data-rhf="reat:${id}"><h2 style="margin:0">Reativar trabalhador</h2><p class="meta" style="margin:4px 0 10px"><strong>${esc(w.nome)}</strong> · inativo desde ${fdate(w.dataSaida)} (${esc(w.motivoSaida||'')}).</p>
   <div class="fields"><label>Data de reentrada<input type="date" name="data" required value="${today()}"></label><label class="wide">Observações<textarea name="obs" rows="2" placeholder="Por exemplo: novo contrato"></textarea></label></div>
   <div class="actions"><button type="button" class="btn ghost" data-gd="close">Cancelar</button><button class="btn" type="submit">Reativar</button></div></form>`)}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-rh]');if(!b)return;e.preventDefault();e.stopPropagation();const[a,id]=b.getAttribute('data-rh').split(':');if(!podeRH())return toast('Só os RH ou a direção podem desativar trabalhadores.');if(a==='sai')saiForm(id);if(a==='reat')reatForm(id)},true);
document.addEventListener('submit',async e=>{const fm=e.target.closest&&e.target.closest('form[data-rhf]');if(!fm)return;e.preventDefault();e.stopPropagation();const[a,id]=fm.getAttribute('data-rhf').split(':'),w=data.trabalhadores[id];if(!w||!podeRH())return;
  const v=n=>fm.elements[n]?String(fm.elements[n].value).trim():'',by=(me()||{}).nome||'',at=new Date().toISOString().slice(0,16);
  if(a==='sai'){if(!v('motivo')||!v('obs'))return toast('Indique o motivo e a razão da saída.');
    await save('trabalhadores',id,{...w,estadoAntes:w.estado||'Ativo',estado:'Inativo',dataSaida:v('data'),motivoSaida:v('motivo'),obsSaida:v('obs'),hist:[...(w.hist||[]),{acao:'Desativado',data:v('data'),motivo:v('motivo'),obs:v('obs'),by,at}]});
    window.GD.hide();try{if(window.ENL&&window.ENL.mail&&window.ENL.byPerf)window.ENL.mail(window.ENL.byPerf('RH'),'Trabalhador desativado: '+w.nome,w.nome+(w.numPonto?' (n.º '+w.numPonto+')':'')+' foi desativado em '+fdate(v('data'))+'.\nMotivo: '+v('motivo')+'\n'+v('obs')+'\n\nRegistado por '+by+'.',w.numPonto||'')}catch(x){}
    return toast('Trabalhador desativado. Fica no histórico.')}
  if(a==='reat'){const{dataSaida,motivoSaida,obsSaida,estadoAntes,...r}=w;await save('trabalhadores',id,{...r,estado:'Ativo',hist:[...(w.hist||[]),{acao:'Reativado',data:v('data'),obs:v('obs'),by,at}]});window.GD.hide();return toast('Trabalhador reativado.')}},true);
window.ENLUI={apply};
})();
