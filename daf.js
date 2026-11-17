/* ENERLINE – DAF: circuito das faturas de fornecedores (receção, validação, guia de entrada, registo no PRIMAVERA, arquivo digital) */
(function(){
const G=window.GD;if(!G)return;
const{show,hide,F,sel,csv,upload,blobOf,preview,dropFile,fdt,now,kb,tile,head}=G;
const C='dafaturas',VIEWS_=['dafaturas','dafval','dafguias','dafrast','dafprim','dafarq'];
const EST=['Em validação','Aguarda guia de entrada','Pronta para registo','Registada no PRIMAVERA','Rejeitada'];
if(!GL.includes(C))GL.push(C);if(!COLS.includes(C))COLS.push(C);data[C]=data[C]||{};S[C]={title:'Faturas',cols:[],fields:[],sort:()=>0};
VIEWS.splice(VIEWS.findIndex(v=>v[0]==='utilizadores'),0,['dafaturas','Faturas de fornecedores','DAF'],['dafval','Validações'],['dafguias','Guias de entrada'],['dafrast','Rastreio de compras'],['dafprim','Registo no PRIMAVERA'],['dafarq','Arquivo digital']);
{const np={};Object.entries(PERF).forEach(([k,v])=>{if(k==='Consulta (só leitura)')np['DAF']={v:['hoje',...VIEWS_,'fornecedores','compras'],edit:true,d:'Faturas de fornecedores: receção, validações, guias de entrada, registo no PRIMAVERA e arquivo.'};np[k]=v});
 Object.keys(PERF).forEach(k=>delete PERF[k]);Object.assign(PERF,np);
 Object.entries(PERF).forEach(([k,v])=>{if(!Array.isArray(v.v)||k==='DAF')return;v.v.push('dafval');if(k==='Fiel de armazém')v.v.push('dafguias');if(k==='Compras')v.v.push('dafaturas','dafrast','dafarq')});
 const pf=S.utilizadores.fields.find(f=>f.k==='perfil');if(pf)pf.opts=Object.keys(PERF)}
TONE.ok.push('Pronta para registo','Registada no PRIMAVERA','Validada','Emitida');TONE.warn.push('Em validação','Aguarda guia de entrada','Pedida','Pendente','Não é necessária');TONE.bad.push('Rejeitada');
const css=document.createElement('style');css.textContent=`
.dafcard{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:18px;align-items:start}@media(max-width:860px){.dafcard{grid-template-columns:1fr}}
dialog.dafx{max-width:min(1280px,calc(100% - 24px))}
.dafsteps{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.dafsteps>div{border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:14px}.dafsteps b{display:block;margin-bottom:4px}
.dafh{margin:0;padding:0;list-style:none;font-size:14px}.dafh li{padding:5px 0;border-top:1px solid var(--line)}.dafh li:first-child{border-top:0}
.dafold{color:var(--bad);font-weight:700}
.dafch{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}@media(max-width:700px){.dafch{grid-template-columns:repeat(2,1fr)}}
.dafch>div{border:1px solid var(--line);border-left:4px solid var(--line);border-radius:6px;padding:6px 8px;font-size:13px;min-width:0;overflow-wrap:anywhere}.dafch>div.ok{border-left-color:var(--brand)}.dafch>div.nx{border-left-color:#c08a1e;background:var(--warn-bg)}.dafch b{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted,#667)}
.dafmiss{color:#a06a00;font-weight:600}
.dafcard .dafch{grid-template-columns:repeat(3,minmax(0,1fr));margin-top:6px}
.dafcol{display:flex;flex-direction:column;gap:12px;min-width:0}`;document.head.appendChild(css);

/* ---------- utilitários ---------- */
const A=()=>Object.entries(data[C]||{}).map(([id,r])=>({...r,id}));
const isDAF=()=>{const u=me();return !u||['Administrador','DAF'].includes(u.perfil)};
const isArm=()=>{const u=me();return !u||['Administrador','DAF','Fiel de armazém'].includes(u.perfil)};
const un=id=>(data.utilizadores[id]||{}).nome||'—';
const fn=f=>(data.fornecedores[f.fornecedor]||{}).nome||f.fornNome||'—';
const ob=id=>id&&data.obras[id]?data.obras[id]:null;
const kzf=v=>v===''||v==null||isNaN(v)?'—':Number(v).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})+' Kz';
const calc=f=>f.prim&&f.prim.doc?EST[3]:f.val.estado==='Rejeitada'?EST[4]:f.val.estado==='Pendente'?EST[0]:f.guia.precisa&&f.guia.estado!=='Emitida'?EST[1]:EST[2];
const quem=f=>{const e=f.estado;return e===EST[0]?un(f.resp)+(f.guia.precisa&&f.guia.estado!=='Emitida'?' · Armazém':''):e===EST[1]?'Armazém'+(f.guia.armazem&&data.armazens[f.guia.armazem]?' ('+data.armazens[f.guia.armazem].nome+')':''):e===EST[2]?'Contabilidade (DAF)':e===EST[4]?'DAF — devolver ao fornecedor':'Arquivo'};
const dias=f=>Math.max(0,Math.floor((Date.now()-new Date(f.desde||f.recebida||Date.now()))/864e5));
const diasT=f=>Math.max(0,Math.floor(((f.prim&&f.prim.at?new Date(f.prim.at):Date.now())-new Date(f.recebida||Date.now()))/864e5));
const dtag=f=>{const d=dias(f);return f.estado===EST[3]?'—':`<span class="${d>5?'dafold':''}">${d===0?'hoje':d+' dia'+(d>1?'s':'')}</span>`};
function commit(id,f,acao,obs){const e=calc(f),n={...f,estado:e,desde:e!==f.estado||!f.desde?now():f.desde,hist:[...(f.hist||[]),{at:now(),by:(me()||{}).nome||'',acao,obs:obs||''}]};delete n.id;return save(C,id,n)}
const nextGuia=()=>{const y=today().slice(0,4),n=A().filter(f=>f.guia&&f.guia.numero&&f.guia.numero.startsWith('GE-'+y)).reduce((m,f)=>Math.max(m,+f.guia.numero.split('-').pop()||0),0)+1;return 'GE-'+y+'-'+String(n).padStart(4,'0')};
const form=(name,title,body,okLabel,extra)=>`<form data-daff="${name}"><h2 style="margin:0">${title}</h2>${body}<div class="actions">${extra||''}<button type="button" class="btn ghost" data-gd="close">Cancelar</button><button class="btn" type="submit">${okLabel||'Guardar'}</button></div></form>`;
const dlg=()=>$('#dlg');dlg().addEventListener('close',()=>dlg().classList.remove('dafx'));

/* ---------- rastreio: requisição → pedido de compra → nota de encomenda → compra → fatura → registo ---------- */
function snapChain(cid){const c=data.compras[cid];if(!c)return null;const r=c.requisicao&&data.requisicoes[c.requisicao];
  return{req:r?{numero:r.numero||'',data:r.data||''}:null,pedido:{data:c.data||'',artigo:c.artigo||'',qtd:c.qtd||'',un:c.unidade||'',estado:c.estado||''},ne:c.ne?{numero:c.ne,data:c.dataNE||''}:null,recebida:c.estado==='Recebido'}}
function chain(f,c0){const live=f&&f.compra?snapChain(f.compra):null,k=c0?snapChain(c0):(live||(f&&f.cadeia)||null),g=f?f.guia:null,st6=[];
  st6.push({t:'Requisição',v:k&&k.req?esc(k.req.numero)+'<br>'+fdate(k.req.data):'',ok:!!(k&&k.req)});
  st6.push({t:'Pedido de compra',v:k&&k.pedido?fdate(k.pedido.data)+'<br>'+esc(k.pedido.artigo):'',ok:!!(k&&k.pedido)});
  st6.push({t:'Nota de encomenda',v:k&&k.ne?esc(k.ne.numero)+'<br>'+fdate(k.ne.data):'',ok:!!(k&&k.ne)});
  st6.push({t:'Compra recebida',v:g&&g.numero?'Guia '+esc(g.numero)+'<br>'+fdate(g.data):k&&k.recebida?'Recebido':f&&!g.precisa&&f.val.estado==='Validada'?'Serviço prestado':'',ok:!!((g&&g.numero)||(k&&k.recebida)||(f&&!g.precisa&&f.val.estado==='Validada'))});
  st6.push({t:'Fatura da compra',v:f?esc(f.num)+'<br>'+esc(f.val.estado==='Validada'?'validada':f.val.estado==='Rejeitada'?'rejeitada':'em validação'):'',ok:!!(f&&f.val.estado==='Validada')});
  st6.push({t:'Registo da fatura',v:f&&f.prim&&f.prim.doc?esc(f.prim.doc)+'<br>'+fdate(f.prim.data):'',ok:!!(f&&f.prim&&f.prim.doc)});
  const nx=st6.findIndex(x=>!x.ok);return{st6,nx,html:`<div class="dafch">${st6.map((x,i)=>`<div class="${x.ok?'ok':i===nx?'nx':''}"><b>${i+1}. ${x.t}</b>${x.v||(i===nx?'<span class="dafmiss">em falta</span>':'<span class="meta">—</span>')}</div>`).join('')}</div>`}}
function vRast(){const cs=rows('compras').filter(c=>c.estado!=='Cancelado').sort((a,b)=>(b.data||'').localeCompare(a.data||'')),fs=A(),byC={};fs.forEach(f=>{if(f.compra)byC[f.compra]=f});
  const L=cs.map(c=>{const f=byC[c.id]||null,ch=chain(f,c.id);return{c,f,ch}}),inc=st.dafinc,list=inc?L.filter(x=>x.ch.nx>=0):L,soltas=fs.filter(f=>!f.compra&&f.obra===st.obra);
  const cell=(x,i)=>{const s6=x.ch.st6[i];return `<td>${s6.ok||s6.v?s6.v.replace('<br>',' · '):(i===x.ch.nx?'<span class="dafmiss">em falta</span>':'<span class="meta">—</span>')}</td>`};
  return head('Rastreio de compras','A linha completa de cada compra desta obra: requisição → pedido de compra → nota de encomenda → compra → fatura → registo da fatura.',`<input type="search" id="q" placeholder="Procurar" aria-label="Procurar"><button class="btn ghost" data-daf="tginc">${inc?'Ver todas':'Ver só as incompletas'}</button><button class="btn ghost" data-daf="csvrast">Exportar CSV</button>`)
  +`<div class="tiles">${tile(L.length,'Compras nesta obra')}${tile(L.filter(x=>x.ch.nx<0).length,'Linha completa','ok')}${tile(L.filter(x=>!x.ch.st6[0].ok).length,'Sem requisição','warn')}${tile(L.filter(x=>x.ch.st6[1].ok&&!x.ch.st6[2].ok).length,'Sem nota de encomenda')}${tile(L.filter(x=>x.ch.st6[3].ok&&!x.f).length,'Recebidas sem fatura','warn')}${tile(L.filter(x=>x.f&&x.ch.st6[4].ok&&!x.ch.st6[5].ok).length,'Faturas por registar','warn')}</div>
  <div class="tablewrap">${list.length?`<table><thead><tr><th>Artigo</th><th>1. Requisição</th><th>2. Pedido de compra</th><th>3. Nota de encomenda</th><th>4. Compra recebida</th><th>5. Fatura</th><th>6. Registo</th></tr></thead><tbody>${list.map(x=>`<tr class="click" ${x.f?`data-daf="card:${x.f.id}"`:`data-edit="compras:${x.c.id}"`}><td><strong>${esc(x.c.artigo)}</strong><br><span class="meta">${esc(x.c.qtd||'')} ${esc(x.c.unidade||'')} · ${esc((data.fornecedores[x.c.fornecedor]||{}).nome||'')}</span></td>${[0,1,2,3,4,5].map(i=>i===1?`<td>${fdate(x.c.data)} ${pill(x.c.estado)}</td>`:cell(x,i)).join('')}</tr>`).join('')}</tbody></table>`:'<div class="empty">Sem compras para mostrar nesta obra.</div>'}</div>
  ${soltas.length?`<h2>Faturas desta obra sem pedido de compra associado</h2>${table(soltas,['num','forn','data','total','tipo','est','prim'],'')}`:''}
  <p class="help">Clique numa linha para abrir a fatura (ou o pedido de compra, se ainda não houver fatura). A nota de encomenda é numerada automaticamente quando o pedido passa a «Encomendado».</p>`}
/* ---------- vistas ---------- */
const row=(f,cols)=>`<tr class="click" data-daf="card:${f.id}">${cols.map(c=>`<td${c.n?' class="num"':''}>${c.f(f)}</td>`).join('')}</tr>`;
const K={num:{h:'Nº da fatura',f:f=>`<strong>${esc(f.num)}</strong>`},forn:{h:'Fornecedor',f:f=>esc(fn(f))},data:{h:'Data',f:f=>fdate(f.data)},total:{h:'Total',n:1,f:f=>kzf(f.total)},obra:{h:'Obra',f:f=>esc((ob(f.obra)||{}).nome||'—')},
  est:{h:'Estado',f:f=>pill(f.estado)},quem:{h:'Com quem',f:f=>esc(quem(f))},dias:{h:'Há quanto tempo',f:dtag},guia:{h:'Guia de entrada',f:f=>f.guia.precisa?(f.guia.numero?esc(f.guia.numero):pill('Pedida')):'<span class="meta">não se aplica</span>'},
  prim:{h:'Doc. PRIMAVERA',f:f=>esc((f.prim||{}).doc||'—')},venc:{h:'Vencimento',f:f=>fdate(f.venc)},tipo:{h:'Tipo',f:f=>esc(f.tipo||'—')},resp:{h:'Validação',f:f=>esc(un(f.resp))+' '+pill(f.val.estado)},dreg:{h:'Registada em',f:f=>f.prim&&f.prim.data?fdate(f.prim.data):'—'},ciclo:{h:'Dias até ao registo',n:1,f:f=>f.prim&&f.prim.doc?diasT(f):'—'}};
const table=(list,keys,vazio)=>`<div class="tablewrap">${list.length?`<table><thead><tr>${keys.map(k=>`<th${K[k].n?' class="num"':''}>${K[k].h}</th>`).join('')}</tr></thead><tbody>${list.map(f=>row(f,keys.map(k=>K[k]))).join('')}</tbody></table>`:`<div class="empty">${vazio}</div>`}</div>`;
const srt=(a,b)=>(b.recebida||'').localeCompare(a.recebida||'');
function vFat(){const all=A().sort(srt),f=st.daff||'curso',cnt=e=>all.filter(x=>x.estado===e),sum=l=>l.reduce((t,x)=>t+(+x.total||0),0);
  const cur=all.filter(x=>x.estado!==EST[3]&&x.estado!==EST[4]),list=f==='curso'?cur:f==='todas'?all:all.filter(x=>x.estado===f),par=cur.filter(x=>dias(x)>5);
  return head('Faturas de fornecedores','Cada fatura tem um estado visível: onde está, com quem e há quantos dias. As validações e os pedidos ao armazém são feitos aqui, sem emails.',
   `<input type="search" id="q" placeholder="Procurar" aria-label="Procurar">${isDAF()?'<button class="btn" data-daf="new">Registar fatura</button>':''}<button class="btn ghost" data-daf="csv">Exportar CSV</button>`)
  +`<div class="tiles">${tile(cnt(EST[0]).length,'Em validação','warn')}${tile(cnt(EST[1]).length,'A aguardar guia de entrada','warn')}${tile(cnt(EST[2]).length,'Prontas para registo','ok')}${tile(par.length,'Paradas há mais de 5 dias',par.length?'bad':'')}${tile(kz(sum(cur)),'Valor em circuito')}${tile(cnt(EST[3]).filter(x=>(x.prim.data||'').slice(0,7)===today().slice(0,7)).length,'Registadas este mês')}</div>
  <div class="gdrow"><label class="meta">Mostrar ${sel('daf_f',[['curso','Em circuito'],...EST.map(e=>[e,e]),['todas','Todas']],f)}</label></div>
  ${table(list,['num','forn','data','total','obra','est','quem','dias','guia','prim'],all.length?'Nenhuma fatura neste filtro.':'Ainda não há faturas registadas.')}
  <p class="help">Circuito: a fatura é registada com o documento digitalizado → o responsável valida na plataforma → o armazém emite a guia de entrada (quando há material) → a contabilidade regista no PRIMAVERA a partir dos dados já recolhidos → fica em arquivo digital com todo o histórico.</p>`}
function vVal(){const all=A().filter(x=>x.val.estado==='Pendente').sort((a,b)=>(a.recebida||'').localeCompare(b.recebida||'')),mine=all.filter(x=>x.resp===st.user),todas=isDAF()&&st.dafall,list=todas?all:mine;
  return head('Validações','Faturas à espera da sua validação. Abra a fatura, veja o documento e valide ou rejeite; fica tudo registado.',isDAF()?`<button class="btn ghost" data-daf="tgall">${todas?'Ver só as minhas':'Ver as de todos ('+all.length+')'}</button>`:'')
  +`<div class="tiles">${tile(mine.length,'À espera da minha validação',mine.length?'warn':'')}${tile(mine.filter(x=>dias(x)>5).length,'Há mais de 5 dias','')}${tile(kz(mine.reduce((t,x)=>t+(+x.total||0),0)),'Valor por validar')}</div>
  ${table(list,todas?['num','forn','data','total','obra','resp','dias']:['num','forn','data','total','obra','tipo','dias'],todas?'Não há faturas por validar.':'Não tem faturas por validar.')}`}
function vGuias(){const pend=A().filter(x=>x.guia.precisa&&x.guia.estado!=='Emitida'&&x.val.estado!=='Rejeitada').sort((a,b)=>(a.recebida||'').localeCompare(b.recebida||'')),emit=A().filter(x=>x.guia.numero).sort((a,b)=>(b.guia.at||'').localeCompare(a.guia.at||''));
  const KG={...K,gnum:{h:'Guia',f:f=>`<strong>${esc(f.guia.numero)}</strong>`},garm:{h:'Armazém',f:f=>esc((data.armazens[f.guia.armazem]||{}).nome||'—')},gdt:{h:'Emitida em',f:f=>fdate(f.guia.data)},gby:{h:'Por',f:f=>esc(f.guia.by||'')},mat:{h:'Material',f:f=>esc((f.guia.linhas||[]).map(l=>l.artigo).slice(0,3).join(', ')||f.descr||'—')}};
  const tb=(l,keys,v)=>`<div class="tablewrap">${l.length?`<table><thead><tr>${keys.map(k=>`<th>${KG[k].h}</th>`).join('')}</tr></thead><tbody>${l.map(f=>row(f,keys.map(k=>KG[k]))).join('')}</tbody></table>`:`<div class="empty">${v}</div>`}</div>`;
  return head('Guias de entrada','Pedidos de guia de entrada feitos pela DAF ao armazém. Ao emitir a guia, o material pode dar entrada em stock.','<input type="search" id="q" placeholder="Procurar" aria-label="Procurar">')
  +`<div class="tiles">${tile(pend.length,'Guias por emitir',pend.length?'warn':'')}${tile(pend.filter(x=>dias(x)>5).length,'Pedidas há mais de 5 dias')}${tile(emit.filter(x=>(x.guia.data||'').slice(0,7)===today().slice(0,7)).length,'Emitidas este mês','ok')}</div>
  <h2>Por emitir</h2>${tb(pend,['num','forn','mat','garm','obra','est','dias'],'Não há guias por emitir.')}<h2>Emitidas</h2>${tb(emit.slice(0,200),['gnum','num','forn','garm','gdt','gby','est'],'Ainda não foram emitidas guias.')}`}
function vPrim(){const l=A().filter(x=>x.estado===EST[2]).sort((a,b)=>(a.data||'').localeCompare(b.data||'')),sem=[...new Set(l.filter(x=>!(data.fornecedores[x.fornecedor]||{}).codPrim).map(fn))];
  return head('Registo no PRIMAVERA','Faturas validadas e com guia emitida, prontas a registar. Depois de registar no PRIMAVERA, confirme aqui o número do documento.',isDAF()?`<button class="btn ghost" data-daf="exp">Exportar ficheiro (opcional)</button>`:'')
  +`<div class="tiles">${tile(l.length,'Prontas para registo',l.length?'ok':'')}${tile(l.filter(x=>dias(x)>5).length,'Prontas há mais de 5 dias','warn')}${tile(kz(l.reduce((t,x)=>t+(+x.total||0),0)),'Valor por registar')}</div>
  ${sem.length?`<div class="banner">Fornecedores sem «Código no Primavera»: ${esc(sem.join(', '))}. Preencha-o na ficha do fornecedor para o ficheiro sair completo.</div>`:''}
  <div class="tablewrap">${l.length?`<table><thead><tr><th>Nº da fatura</th><th>Fornecedor</th><th>Cód. Primavera</th><th>Data</th><th>Vencimento</th><th class="num">Total</th><th>Guia</th><th>Exportada</th><th></th></tr></thead><tbody>${l.map(f=>`<tr class="click" data-daf="card:${f.id}"><td><strong>${esc(f.num)}</strong></td><td>${esc(fn(f))}</td><td>${esc((data.fornecedores[f.fornecedor]||{}).codPrim||'—')}</td><td>${fdate(f.data)}</td><td>${fdate(f.venc)}</td><td class="num">${kzf(f.total)}</td><td>${esc(f.guia.numero||'—')}</td><td>${f.prim&&f.prim.exportado?fdt(f.prim.exportado):'—'}</td><td>${isDAF()?`<button class="btn ghost" data-daf="reg:${f.id}">Confirmar registo</button>`:''}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Não há faturas prontas para registo.</div>'}</div>
  <p class="help">Registe a fatura no PRIMAVERA e clique em «Confirmar registo» para indicar o número do documento; a fatura passa para o arquivo digital. A exportação do ficheiro com os dados já recolhidos é opcional.</p>`}
function vArq(){const all=A().filter(x=>x.estado===EST[3]||x.estado===EST[4]).sort((a,b)=>((b.prim||{}).data||b.desde||'').localeCompare((a.prim||{}).data||a.desde||'')),y=st.dafy||'',anos=[...new Set(all.map(x=>(x.data||'').slice(0,4)).filter(Boolean))].sort().reverse(),l=all.filter(x=>!y||(x.data||'').slice(0,4)===y);
  const reg=l.filter(x=>x.estado===EST[3]),med=reg.length?Math.round(reg.reduce((t,x)=>t+diasT(x),0)/reg.length):0;
  return head('Arquivo digital','Fatura, guia de entrada e histórico de aprovações ficam ligados entre si. Abra uma fatura para ver tudo.',`<input type="search" id="q" placeholder="Procurar" aria-label="Procurar"><button class="btn ghost" data-daf="csvarq">Exportar CSV</button>`)
  +`<div class="tiles">${tile(reg.length,'Faturas registadas','ok')}${tile(kz(reg.reduce((t,x)=>t+(+x.total||0),0)),'Valor registado')}${tile(med+' dias','Tempo médio até ao registo')}${tile(l.length-reg.length,'Rejeitadas')}</div>
  <div class="gdrow"><label class="meta">Ano ${sel('daf_y',[['','Todos'],...anos],y)}</label></div>
  ${table(l,['num','forn','data','total','obra','est','guia','prim','dreg','ciclo'],'O arquivo ainda está vazio.')}`}
const VW={dafaturas:vFat,dafval:vVal,dafguias:vGuias,dafrast:vRast,dafprim:vPrim,dafarq:vArq};
{const o=vGeneric;vGeneric=function(c){if(VW[c]){autoDemo();return VW[c]()}return o(c)}}

/* ---------- ficha da fatura ---------- */
async function card(id){const f=data[C][id];if(!f)return;const d=dlg(),podeVal=f.val.estado==='Pendente'&&(f.resp===st.user||isDAF())&&canEdit(),podeGuia=f.guia.precisa&&f.guia.estado!=='Emitida'&&f.val.estado!=='Rejeitada'&&isArm()&&canEdit(),o=ob(f.obra),g=f.guia,inf=(l,v)=>`<div><span class="meta">${l}</span><br><strong>${v}</strong></div>`;
  const b=(a,l,cls)=>`<button type="button" class="btn ${cls||'ghost'}" data-daf="${a}:${id}">${l}</button>`;
  show(`<form><div class="gdrow" style="justify-content:space-between"><h2 style="margin:0">Fatura ${esc(f.num)} · ${esc(fn(f))}</h2>${pill(f.estado)}</div>
  <div class="dafcard"><div class="dafcol">
   <div class="winfo">${inf('Data',fdate(f.data))}${inf('Vencimento',fdate(f.venc))}${inf('Valor sem IVA',kzf(f.base))}${inf('IVA',kzf(f.iva))}${inf('Total',kzf(f.total))}${inf('Tipo',esc(f.tipo||'—'))}${inf('Obra / centro de custo',esc(o?o.nome:'Sede / geral'))}${inf('Com quem está',esc(quem(f)))}${inf('Neste estado',f.estado===EST[3]?'—':dias(f)+' dia'+(dias(f)===1?'':'s'))}${inf('Recebida em',fdt(f.recebida))}</div>
   ${f.descr?`<div>${esc(f.descr)}</div>`:''}
   <div><strong>Rastreio da compra</strong>${f.compra||f.cadeia?'':' <span class="meta">— fatura sem pedido de compra associado</span>'}${chain(f).html}</div>
   <div class="dafsteps"><div><b>1. Validação</b>${pill(f.val.estado)}<br><span class="meta">${esc(un(f.resp))}${f.val.at?' · '+fdt(f.val.at):''}</span>${f.val.obs?`<br>${esc(f.val.obs)}`:''}</div>
    <div><b>2. Guia de entrada</b>${g.precisa?pill(g.estado==='Emitida'?'Emitida':'Pedida'):pill('Não é necessária')}<br><span class="meta">${g.numero?esc(g.numero)+' · '+esc((data.armazens[g.armazem]||{}).nome||'')+' · '+fdate(g.data):g.precisa?esc((data.armazens[g.armazem]||{}).nome||'Armazém'):'Fatura de serviços'}</span></div>
    <div><b>3. PRIMAVERA</b>${f.prim&&f.prim.doc?pill('Registada no PRIMAVERA'):pill(f.estado===EST[2]?'Pronta para registo':'Pendente')}<br><span class="meta">${f.prim&&f.prim.doc?esc(f.prim.doc)+' · '+fdate(f.prim.data):f.prim&&f.prim.exportado?'Exportada em '+fdt(f.prim.exportado):'—'}</span></div></div>
   ${g.numero&&(g.linhas||[]).length?`<div><strong>Guia ${esc(g.numero)}</strong><table class="gdhist"><tbody>${g.linhas.map(l=>`<tr><td>${esc(l.artigo)}</td><td class="num">${esc(l.qtd)} ${esc(l.un||'')}</td></tr>`).join('')}</tbody></table><span class="meta">${g.stock?'Deu entrada em stock.':'Sem movimento de stock.'}${g.obs?' '+esc(g.obs):''}</span></div>`:''}
   ${podeVal?`<div class="card" style="padding:12px"><strong>A sua validação</strong><textarea id="dafobs" rows="2" placeholder="Comentário (obrigatório se rejeitar)" style="width:100%;margin:8px 0"></textarea><div class="gdrow">${b('ok','Validar fatura','')}${b('no','Rejeitar','danger')}</div></div>`:''}
   <div class="gdrow">${podeGuia?b('guia','Emitir guia de entrada',''):''}${g.numero?b('pguia','Imprimir guia'):''}${isDAF()&&canEdit()?(f.estado===EST[2]?b('reg','Confirmar registo no PRIMAVERA',''):'')+(f.estado!==EST[3]?b('edit','Editar dados')+(f.val.estado==='Pendente'?b('resp','Mudar quem valida'):'')+(f.val.estado==='Rejeitada'?b('redo','Reenviar para validação'):''):''):''}</div>
   <div><strong>Histórico</strong><ul class="dafh">${(f.hist||[]).slice().reverse().map(h=>`<li><strong>${esc(h.acao)}</strong> · ${esc(h.by||'')} · <span class="meta">${fdt(h.at)}</span>${h.obs?`<br>${esc(h.obs)}`:''}</li>`).join('')}</ul></div>
  </div><div class="dafcol"><div class="gdrow" id="daflinks"><span class="meta">${f.file?esc(f.file.name)+' · '+kb(f.file.size):'Sem documento digitalizado.'}</span></div><div class="gdpdf gdpv" id="dafpv"><div class="empty">${f.file?'A abrir o documento…':'Esta fatura não tem documento anexado.'}</div></div></div></div>
  <div class="actions">${isDAF()&&canEdit()&&f.estado!==EST[3]?`<button type="button" class="btn danger" data-danger data-daf="del:${id}">Apagar</button>`:''}<button type="button" class="btn ghost" data-gd="close">Fechar</button></div></form>`,true);
  d.classList.add('dafx');
  if(f.file){try{const bl=await blobOf(f.file),box=$('#dafpv');if(!box||!box.isConnected)return;const url=URL.createObjectURL(bl);setTimeout(()=>URL.revokeObjectURL(url),600000);
      const lk=$('#daflinks');if(lk)lk.insertAdjacentHTML('afterbegin',`<a class="btn ghost" href="${url}" target="_blank" rel="noopener">Abrir em ecrã inteiro</a><a class="btn ghost" href="${url}" download="${esc(f.file.name)}">Descarregar</a>`);
      if(/^image\//.test(bl.type))box.innerHTML=`<img alt="Fatura" style="max-width:100%;display:block;margin:auto" src="${url}">`;else{try{await preview(bl,box)}catch(x){if(box.isConnected)box.outerHTML=`<iframe class="gdpdf" title="Fatura" src="${url}"></iframe>`}}}
    catch(e){const box=$('#dafpv');if(box)box.innerHTML='<div class="empty">Não foi possível abrir o documento (sem internet?).</div>'}}}
function fatForm(id){const f=id?data[C][id]:null,fs=rows('fornecedores').filter(x=>x.estado!=='Suspenso'||(f&&f.fornecedor===x.id)),us=rows('utilizadores').filter(u=>u.estado!=='Inativo'),os=rows('obras'),as=rows('armazens'),g=f?f.guia:{precisa:true};
  const cs=rows('compras').filter(c=>c.estado!=='Cancelado');
  show(form('fat:'+(id||''),f?'Editar fatura':'Registar fatura de fornecedor',`<div class="fields">
   ${F('Fornecedor',`<select name="fornecedor" required><option value="">Escolher…</option>${fs.map(x=>`<option value="${x.id}"${f&&f.fornecedor===x.id?' selected':''}>${esc(x.nome)}</option>`).join('')}</select>`)}${F('Nº da fatura',`<input name="num" required value="${esc(f?f.num:'')}">`)}
   ${F('Data da fatura',`<input type="date" name="data" required value="${f?f.data:today()}">`)}${F('Vencimento',`<input type="date" name="venc" value="${f?f.venc||'':''}">`)}
   ${F('Valor sem IVA (Kz)',`<input type="number" step="0.01" min="0" name="base" required value="${f?f.base:''}">`)}${F('Taxa de IVA (%)',`<input type="number" step="0.01" min="0" name="taxa" value="${f?f.taxa:14}">`)}
   ${F('Total (Kz)',`<input name="total" disabled id="daftot" value="">`)}${F('Tipo',sel('tipo',['Material','Serviço','Outro'],f?f.tipo:'Material'))}
   ${F('Obra / centro de custo',`<select name="obra"><option value="">Sede / geral</option>${os.map(x=>`<option value="${x.id}"${(f?f.obra:st.obra)===x.id?' selected':''}>${esc(x.nome)}</option>`).join('')}</select>`)}
   ${F('Quem valida',`<select name="resp" required><option value="">Escolher…</option>${us.map(u=>`<option value="${u.id}"${f&&f.resp===u.id?' selected':''}>${esc(u.nome)} (${esc(u.perfil)})</option>`).join('')}</select>`)}
   ${F('Guia de entrada',`<div class="checks"><label><input type="checkbox" name="precisa"${g.precisa?' checked':''}${f&&f.guia.numero?' disabled':''}>Pedir guia de entrada ao armazém</label></div>`)}
   ${F('Armazém que recebe',`<select name="armazem"><option value="">Escolher…</option>${as.map(x=>`<option value="${x.id}"${g.armazem===x.id?' selected':''}>${esc(x.nome)}</option>`).join('')}</select>`)}
   ${F('Pedido de compra / nota de encomenda a que respeita (obra atual)',`<select name="compra"><option value="">Nenhum</option>${cs.filter(c=>!c.fatura||(f&&f.compra===c.id)).map(c=>`<option value="${c.id}"${f&&f.compra===c.id?' selected':''}>${esc(c.ne||'sem NE')} · ${fdate(c.data)} · ${esc(c.artigo)} · ${esc(c.qtd||'')} ${esc(c.unidade||'')}</option>`).join('')}</select>`,1)}
   ${F('Descrição',`<textarea name="descr" rows="2">${esc(f?f.descr||'':'')}</textarea>`,1)}
   ${F(f&&f.file?'Substituir o documento (PDF ou fotografia)':'Fatura digitalizada (PDF ou fotografia, máx. 20 MB)',`<input type="file" name="file" accept="application/pdf,.pdf,image/*"${f?'':' required'}>`,1)}</div>
   <p class="help" id="dafprog">${f?'':'Ao guardar, o pedido de validação segue para o responsável e, se houver material, o pedido de guia segue para o armazém. Ninguém precisa de enviar email.'}</p>`,f?'Guardar':'Registar e pedir validação'));tot()}
function tot(){const fm=dlg().querySelector('form[data-daff^="fat:"]'),o=$('#daftot');if(!fm||!o)return;const b=+fm.elements.base.value||0,t=+fm.elements.taxa.value||0;o.value=kzf(Math.round(b*(1+t/100)*100)/100)}
function guiaForm(id){const f=data[C][id],as=rows('armazens'),c=f.compra&&data.compras[f.compra],ja=c&&c.estado==='Recebido';
  show(form('guia:'+id,'Emitir guia de entrada',`<p class="meta" style="margin:0">Fatura ${esc(f.num)} · ${esc(fn(f))} · ${kzf(f.total)}${f.descr?' · '+esc(f.descr):''}</p><div class="fields">
   ${F('Armazém',`<select name="armazem" required><option value="">Escolher…</option>${as.map(x=>`<option value="${x.id}"${f.guia.armazem===x.id?' selected':''}>${esc(x.nome)}</option>`).join('')}</select>`)}${F('Data de receção',`<input type="date" name="data" required value="${today()}">`)}
   ${F('Material recebido — uma linha por artigo: artigo ; quantidade ; unidade',`<textarea name="linhas" rows="5" required placeholder="Cimento ; 200 ; sacos">${esc(c?[c.artigo,c.qtd||'',c.unidade||''].join(' ; '):'')}</textarea>`,1)}
   ${F('Stock',`<div class="checks"><label><input type="checkbox" name="stock"${ja?'':' checked'}>Dar entrada deste material em stock</label></div>`,1)}${F('Observações (faltas, danos, diferenças para a fatura)','<textarea name="obs" rows="2"></textarea>',1)}</div>
   <p class="help">${ja?'O pedido de compra associado já foi marcado «Recebido» e já deu entrada em stock; por isso a opção vem desligada.':'Será atribuído o número '+esc(nextGuia())+'.'}</p>`,'Emitir guia'))}
function printGuia(id){const f=data[C][id],g=f.guia,pr=$('#gdprint');if(!pr)return;pr.innerHTML=`<p style="margin:0;font-size:12px"><b>ENERLINE, S.A.</b> · Belas Business Park, Ed. Bengo, Fração 201, Talatona, Luanda</p><h1 style="margin:8px 0 0">Guia de entrada ${esc(g.numero)}</h1><p>Armazém: <b>${esc((data.armazens[g.armazem]||{}).nome||'')}</b> · Data de receção: <b>${fdate(g.data)}</b><br>Fornecedor: <b>${esc(fn(f))}</b> · Fatura: <b>${esc(f.num)}</b> de ${fdate(f.data)}${ob(f.obra)?'<br>Obra: <b>'+esc(ob(f.obra).nome)+'</b>':''}</p><table><thead><tr><th>Artigo</th><th>Quantidade</th><th>Unidade</th></tr></thead><tbody>${(g.linhas||[]).map(l=>`<tr><td>${esc(l.artigo)}</td><td>${esc(l.qtd)}</td><td>${esc(l.un||'')}</td></tr>`).join('')}</tbody></table>${g.obs?'<p>Observações: '+esc(g.obs)+'</p>':''}<p style="margin-top:60px">Recebido por: ${esc(g.by||'')} ______________________ &nbsp;&nbsp; Conferido por: ______________________</p>`;hide();setTimeout(()=>window.print(),100)}
function primLines(l){return l.map(f=>{const fo=data.fornecedores[f.fornecedor]||{},o=ob(f.obra);return['VFA',(f.data||today()).slice(0,4),fo.codPrim||'',fo.nif||'',fn(f),f.num,fdate(f.data),fdate(f.venc),'AOA',f.descr||'',Number(f.base||0).toFixed(2).replace('.',','),String(f.taxa??'').replace('.',','),Number(f.iva||0).toFixed(2).replace('.',','),Number(f.total||0).toFixed(2).replace('.',','),o?o.codigo||o.nome:'',(data.armazens[f.guia.armazem]||{}).nome||'',f.guia.numero||'',f.id]})}
const PH=['TipoDoc','Serie','Entidade','NIF','Nome','NumDocExterno','DataDoc','DataVencimento','Moeda','Descricao','TotalMercadoria','TaxaIVA','TotalIVA','TotalDocumento','CentroCusto','Armazem','GuiaEntrada','RefPlataforma'];

document.addEventListener('submit',async e=>{const fm=e.target.closest&&e.target.closest('form[data-daff]');if(!fm)return;e.preventDefault();
  const[k,arg]=fm.getAttribute('data-daff').split(/:(.*)/),v=n=>fm.elements[n]?String(fm.elements[n].value).trim():'',btn=fm.querySelector('button[type=submit]');if(btn.disabled)return;
  try{
  if(k==='fat'){const old=arg?data[C][arg]:null,file=fm.elements.file.files[0],num=v('num'),fo=v('fornecedor');
    if(A().some(x=>x.id!==arg&&x.fornecedor===fo&&String(x.num).toLowerCase()===num.toLowerCase()))return toast('Esta fatura já está registada para este fornecedor.');
    const prec=fm.elements.precisa.checked;if(prec&&!v('armazem'))return toast('Escolha o armazém que recebe o material.');
    if(file){if(file.size>20*1048576)return toast('O ficheiro tem mais de 20 MB.');if((window.enlSync||{}).offline)return toast('Sem internet: anexar o documento precisa de ligação.')}
    btn.disabled=true;let fl=old?old.file:null;
    if(file){const pg=$('#dafprog');try{fl=await upload(file,(i,n)=>{if(pg)pg.textContent='A carregar o documento… '+Math.round(100*i/n)+' %'})}catch(x){btn.disabled=false;return toast('Não foi possível carregar o documento. Verifique a ligação.')}if(old&&old.file)dropFile(old.file)}
    const base=+v('base')||0,taxa=+v('taxa')||0,iva=Math.round(base*taxa)/100,id=arg||'df'+uid();
    const f={...(old||{recebida:now(),criadoPor:(me()||{}).nome||'',val:{estado:'Pendente'},prim:{},hist:[],estado:'',desde:''}),num,fornecedor:fo,fornNome:(data.fornecedores[fo]||{}).nome||'',data:v('data'),venc:v('venc'),base,taxa,iva,total:Math.round((base+iva)*100)/100,moeda:'AOA',tipo:v('tipo'),obra:v('obra'),resp:v('resp'),compra:v('compra'),descr:v('descr'),file:fl,
      guia:old&&old.guia.numero?old.guia:{...(old?old.guia:{}),precisa:prec,estado:prec?'Pedida':'',armazem:prec?v('armazem'):''}};
    if(f.compra&&data.compras[f.compra]){f.cadeia=snapChain(f.compra);const c=data.compras[f.compra];if(c.fatura!==num)save('compras',f.compra,{...c,fatura:num})}else if(!f.compra)delete f.cadeia;
    if(old&&old.compra&&old.compra!==f.compra&&data.compras[old.compra]){const c={...data.compras[old.compra]};delete c.fatura;save('compras',old.compra,c)}
    await commit(id,f,old?'Dados alterados':'Fatura registada; validação pedida a '+un(f.resp)+(prec?'; guia de entrada pedida ao armazém':''),old&&old.resp!==f.resp?'Validação passa para '+un(f.resp):'');hide();toast(old?'Guardado.':'Fatura registada. O pedido de validação já está com '+un(f.resp)+'.');return}
  if(k==='guia'){const f={...data[C][arg]},linhas=v('linhas').split(/\r?\n/).map(l=>l.split(/[;\t]/).map(x=>x.trim())).filter(l=>l[0]).map(l=>({artigo:l[0],qtd:+String(l[1]||'').replace(',','.')||0,un:l[2]||''}));
    if(!linhas.length)return toast('Indique pelo menos um artigo recebido.');const stock=fm.elements.stock.checked,arm=v('armazem'),numero=nextGuia();
    if(stock&&typeof stockAdj==='function')linhas.forEach(l=>{if(l.qtd>0)stockAdj(arm,l.artigo,l.un,l.qtd)});
    f.guia={...f.guia,precisa:true,estado:'Emitida',numero,armazem:arm,data:v('data'),linhas,stock,obs:v('obs'),by:(me()||{}).nome||'',at:now()};
    {const c=f.compra&&data.compras[f.compra];if(c&&c.estado!=='Recebido'){save('compras',f.compra,{...c,estado:'Recebido'});const r=c.requisicao&&data.requisicoes[c.requisicao];if(r&&r.estado!=='Satisfeita')save('requisicoes',c.requisicao,{...r,estado:'Satisfeita'})}if(c)f.cadeia={...snapChain(f.compra),recebida:true}}
    await commit(arg,f,'Guia de entrada '+numero+' emitida',(stock?'Com entrada em stock. ':'')+v('obs'));hide();toast('Guia '+numero+' emitida.');return}
  if(k==='reg'){const f={...data[C][arg]};f.prim={...(f.prim||{}),doc:v('doc'),data:v('data'),by:(me()||{}).nome||'',at:now()};await commit(arg,f,'Registada no PRIMAVERA',f.prim.doc);hide();toast('Fatura registada e arquivada.');return}
  if(k==='resp'){const f={...data[C][arg]},nv=v('resp');if(nv===f.resp)return hide();f.resp=nv;await commit(arg,f,'Validação reencaminhada para '+un(nv),v('obs'));hide();return}
  }catch(x){console.error(x);btn.disabled=false;toast('Não foi possível concluir. Tente outra vez.')}});
document.addEventListener('input',e=>{if(e.target.closest&&e.target.closest('form[data-daff^="fat:"]'))tot()});
document.addEventListener('change',e=>{const t=e.target;if(t.name==='daf_f'){st.daff=t.value;render()}else if(t.name==='daf_y'){st.dafy=t.value;render()}
  else if(t.name==='compra'&&t.closest('form[data-daff^="fat:"]')){const c=data.compras[t.value],fm=t.form;if(c){if(c.fornecedor&&!fm.elements.fornecedor.value)fm.elements.fornecedor.value=c.fornecedor;if(!fm.elements.descr.value)fm.elements.descr.value=[c.artigo,c.qtd,c.unidade].filter(Boolean).join(' ');fm.elements.obra.value=st.obra;if(!fm.elements.base.value&&c.valor){fm.elements.base.value=c.valor;tot()}}}
  else if(t.name==='tipo'&&t.closest('form[data-daff^="fat:"]')){const c=t.form.elements.precisa;if(c&&!c.disabled)c.checked=t.value==='Material'}});
document.addEventListener('click',async e=>{const el=e.target.closest&&e.target.closest('[data-daf]');if(!el)return;
  if(el.hasAttribute('data-danger')&&!el.classList.contains('armed'))return;
  const[a,id]=el.getAttribute('data-daf').split(':');if(a==='reg'||a==='ok'||a==='no')e.stopPropagation();
  const need=()=>{if(isDAF()&&canEdit())return true;toast('Só a DAF pode fazer esta operação.');return false};
  if(a==='card')return card(id);
  if(a==='new')return need()&&fatForm();
  if(a==='edit')return need()&&fatForm(id);
  if(a==='tgall'){st.dafall=!st.dafall;return render()}
  if(a==='tginc'){st.dafinc=!st.dafinc;return render()}
  if(a==='csvrast'){const fs={};A().forEach(f=>{if(f.compra)fs[f.compra]=f});const tx=h=>String(h||'').replace(/<br>/g,' · ').replace(/<[^>]+>/g,'');return csv('Rastreio-compras-'+today()+'.csv',['Artigo','Quantidade','Fornecedor','Requisição','Pedido de compra','Estado do pedido','Nota de encomenda','Compra recebida','Fatura','Registo da fatura','Linha completa'],rows('compras').filter(c=>c.estado!=='Cancelado').map(c=>{const f=fs[c.id]||null,ch=chain(f,c.id),s6=ch.st6;return[c.artigo,(c.qtd||'')+' '+(c.unidade||''),(data.fornecedores[c.fornecedor]||{}).nome||'',tx(s6[0].v),fdate(c.data),c.estado,tx(s6[2].v),tx(s6[3].v),tx(s6[4].v),tx(s6[5].v),ch.nx<0?'Sim':'Não']}))}
  if(a==='ok'||a==='no'){const f={...data[C][id]};if(f.val.estado!=='Pendente'||!(f.resp===st.user||isDAF())||!canEdit())return toast('Esta fatura não está à espera da sua validação.');
    const obs=($('#dafobs')||{}).value||'';if(a==='no'&&!obs.trim())return toast('Indique o motivo da rejeição.');
    f.val={estado:a==='ok'?'Validada':'Rejeitada',by:(me()||{}).nome||'',at:now(),obs:obs.trim()};await commit(id,f,a==='ok'?'Fatura validada':'Fatura rejeitada',obs.trim());hide();return toast(a==='ok'?'Fatura validada.':'Fatura rejeitada; volta para a DAF.')}
  if(a==='redo'){if(!need())return;const f={...data[C][id]};f.val={estado:'Pendente'};await commit(id,f,'Reenviada para validação a '+un(f.resp));return card(id)}
  if(a==='resp'){if(!need())return;const f=data[C][id],us=rows('utilizadores').filter(u=>u.estado!=='Inativo');return show(form('resp:'+id,'Mudar quem valida',`<div class="fields">${F('Quem valida',`<select name="resp" required>${us.map(u=>`<option value="${u.id}"${f.resp===u.id?' selected':''}>${esc(u.nome)} (${esc(u.perfil)})</option>`).join('')}</select>`)}${F('Motivo','<input name="obs">')}</div>`))}
  if(a==='guia'){if(!(isArm()&&canEdit()))return toast('Só o armazém pode emitir a guia de entrada.');return guiaForm(id)}
  if(a==='pguia')return printGuia(id);
  if(a==='reg'){if(!need())return;const f=data[C][id];return show(form('reg:'+id,'Confirmar registo no PRIMAVERA',`<p class="meta" style="margin:0">Fatura ${esc(f.num)} · ${esc(fn(f))} · ${kzf(f.total)}</p><div class="fields">${F('Número do documento no PRIMAVERA','<input name="doc" required placeholder="VFA 2026/123">')}${F('Data do registo',`<input type="date" name="data" required value="${today()}">`)}</div>`,'Confirmar e arquivar'))}
  if(a==='del'){if(!need())return;const f=data[C][id];if(f.file)dropFile(f.file);del(C,id);return hide()}
  if(a==='exp'){if(!need())return;const l=A().filter(x=>x.estado===EST[2]).sort((p,q)=>(p.data||'').localeCompare(q.data||''));if(!l.length)return toast('Não há faturas prontas para registo.');
    csv('PRIMAVERA-faturas-'+today()+'.csv',PH,primLines(l));const at=now();l.forEach(f=>{const{id:i,...r}=f;save(C,i,{...r,prim:{...(r.prim||{}),exportado:at},hist:[...(r.hist||[]),{at,by:(me()||{}).nome||'',acao:'Exportada para o PRIMAVERA',obs:''}]})});return toast(l.length+' fatura'+(l.length>1?'s exportadas':' exportada')+'.')}
  const full=l=>l.map(f=>[f.num,fn(f),fdate(f.data),fdate(f.venc),String(f.base??'').replace('.',','),String(f.iva??'').replace('.',','),String(f.total??'').replace('.',','),f.tipo,(ob(f.obra)||{}).nome||'',f.estado,quem(f),f.estado===EST[3]?'':dias(f),un(f.resp),f.val.estado,f.val.at?fdt(f.val.at):'',f.guia.numero||'',(f.prim||{}).doc||'',(f.prim||{}).data?fdate(f.prim.data):'']),FH=['Nº da fatura','Fornecedor','Data','Vencimento','Valor sem IVA','IVA','Total','Tipo','Obra','Estado','Com quem','Dias no estado','Quem valida','Validação','Validada em','Guia de entrada','Doc. PRIMAVERA','Registada em'];
  if(a==='csv')return csv('Faturas-fornecedores-'+today()+'.csv',FH,full(A().sort(srt)));
  if(a==='csvarq')return csv('Arquivo-faturas-'+today()+'.csv',FH,full(A().filter(x=>x.estado===EST[3]||x.estado===EST[4]).sort(srt)));
},true);

/* ---------- faturas de exemplo (só quando existem obras de demonstração) ---------- */
function demoPdf(f,forn,obra){const J=window.jspdf&&window.jspdf.jsPDF;if(!J)return null;const p=new J({unit:'mm',format:'a4'});
  p.setTextColor(232);p.setFont('helvetica','bold');p.setFontSize(90);p.text('EXEMPLO',105,170,{align:'center',angle:35});p.setTextColor(30);
  p.setFontSize(16);p.text(forn.nome||'',20,26,{maxWidth:110});p.setFont('helvetica','normal');p.setFontSize(10);p.text(['NIF '+(forn.nif||''),forn.local||'Luanda',forn.email||''],20,40);
  p.setFont('helvetica','bold');p.setFontSize(18);p.text('FATURA',190,26,{align:'right'});p.setFontSize(12);p.text(f.num,190,34,{align:'right'});p.setFont('helvetica','normal');p.setFontSize(10);p.text(['Data: '+fdate(f.data),'Vencimento: '+fdate(f.venc)],190,42,{align:'right'});
  p.setDrawColor(120);p.rect(20,62,170,22);p.setFont('helvetica','bold');p.text('Cliente',24,69);p.setFont('helvetica','normal');p.text(['ENERLINE, S.A. · Belas Business Park, Ed. Bengo, Fração 201, Talatona, Luanda',obra?'Obra: '+obra:'Sede'],24,75);
  p.setFillColor(238);p.rect(20,94,170,8,'F');p.setFont('helvetica','bold');p.text('Descrição',24,99.5);p.text('Valor (Kz)',186,99.5,{align:'right'});p.setFont('helvetica','normal');
  const n=v=>Number(v).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2});p.text(p.splitTextToSize(f.descr||'',120),24,110);p.text(n(f.base),186,110,{align:'right'});
  p.line(120,130,190,130);[['Total sem IVA',f.base],['IVA '+f.taxa+' %',f.iva]].forEach((r,i)=>{p.text(r[0],124,138+i*7);p.text(n(r[1]),186,138+i*7,{align:'right'})});p.setFont('helvetica','bold');p.setFontSize(12);p.text('Total',124,154);p.text(n(f.total)+' Kz',186,154,{align:'right'});
  return new File([p.output('blob')],'Fatura_'+f.num.replace(/[^\w]+/g,'-')+'.pdf',{type:'application/pdf'})}
let seeded=false;
function autoDemo(){if(seeded||A().length||!rows('obras').some(o=>o.exemplo))return;seeded=true;
  setTimeout(()=>{if(A().length||!VIEWS_.includes(st.view)||(typeof demoBusy!=='undefined'&&demoBusy)||(window.enlSync||{}).offline||!rows('fornecedores').length){seeded=false;return}demo()},3500)}
async function demo(){const fs=rows('fornecedores').filter(x=>x.exemplo),us=Object.entries(data.utilizadores),u=p=>(us.find(([,x])=>x.perfil===p)||us[0]||[''])[0],os=rows('obras').filter(o=>o.exemplo),as=rows('armazens');if(!fs.length||!os.length)return;
  const daf=(data.utilizadores[u('DAF')]||{}).nome||'DAF',arm=(data.utilizadores[u('Fiel de armazém')]||{}).nome||'Armazém',dir=u('Diretor de obra'),enc=u('Encarregado'),cmp=u('Compras');
  const day=n=>{const d=new Date();d.setDate(d.getDate()-n);return iso(d)},at=(n,h)=>day(n)+'T'+(h||'10:00'),t=$('#toast');
  const X=[['Cimento Portland, 600 sacos','Material',4800000,16,'val',dir],['Aluguer de grua móvel 50 t, outubro','Serviço',9200000,9,'val',dir],['Cabo de cobre nu 50 mm², 2 000 m','Material',9600000,12,'guia',dir],['Isoladores de cadeia 60 kV, 400 un','Material',16800000,7,'guia',enc],
   ['Gasóleo a granel, 12 000 L','Material',5400000,6,'pronta',enc],['Serviços de topografia, levantamento do traçado','Serviço',3100000,5,'pronta',dir],['Capacetes, luvas e arneses','Material',2350000,20,'reg',cmp],['Transporte de bobinas Luanda–obra','Serviço',1850000,25,'reg',dir],['Ferragens para linhas, lote 3','Material',7400000,31,'reg',dir],['Parafusos M16 galvanizados, preço acima do contratado','Material',980000,8,'rej',cmp]];
  t.textContent='A criar faturas de exemplo…';t.hidden=false;let gi=0;const OBR=st.obra,isDemoObra=!!(data.obras[OBR]||{}).exemplo,pool=rows('compras').filter(c=>c.ne&&!c.fatura),used=new Set();
  for(let i=0;i<X.length;i++){const[descr,tipo,base,d0,stg,resp]=X[i],fo=fs[(i*3)%fs.length],o=os[i%os.length],prec=tipo==='Material',iva=Math.round(base*14)/100,armz=(as.find(a=>a.obra===o.id)||as[0]||{}).id||'';
    let cp=null;if(prec&&isDemoObra){const want=stg==='val'||stg==='guia'?['Encomendado']:stg==='rej'?['Encomendado','Recebido']:['Recebido'];cp=pool.find(c=>want.includes(c.estado)&&!used.has(c.id));if(cp)used.add(cp.id)}
    const fo2=cp&&data.fornecedores[cp.fornecedor]?{...data.fornecedores[cp.fornecedor],id:cp.fornecedor}:fo;
    const f={num:'FT '+today().slice(0,4)+'/'+(1180+i*37),fornecedor:fo.id,fornNome:fo.nome,data:day(d0+2),venc:day(d0-28),base,taxa:14,iva,total:base+iva,moeda:'AOA',tipo,obra:o.id,resp,compra:'',descr,file:null,recebida:at(d0,'09:15'),criadoPor:daf,exemplo:true,
      val:{estado:'Pendente'},guia:{precisa:prec,estado:prec?'Pedida':'',armazem:prec?armz:''},prim:{},hist:[{at:at(d0,'09:15'),by:daf,acao:'Fatura registada; validação pedida a '+un(resp)+(prec?'; guia de entrada pedida ao armazém':''),obs:''}]};
    const okV=n=>{f.val={estado:'Validada',by:un(resp),at:at(n,'14:30'),obs:''};f.hist.push({at:at(n,'14:30'),by:un(resp),acao:'Fatura validada',obs:''})};
    const okG=n=>{const numero='GE-'+today().slice(0,4)+'-'+String(++gi).padStart(4,'0');f.guia={...f.guia,estado:'Emitida',numero,data:day(n),linhas:[{artigo:descr.split(',')[0],qtd:+(descr.match(/([\d ]+)\s*(sacos|m|un|L)\b/)||[0,'1'])[1].replace(/\s/g,'')||1,un:(descr.match(/\d\s*(sacos|m|un|L)\b/)||[0,'un'])[1]}],stock:false,obs:'',by:arm,at:at(n,'16:00')};f.hist.push({at:at(n,'16:00'),by:arm,acao:'Guia de entrada '+numero+' emitida',obs:''})};
    let desde=at(d0,'09:15');
    if(stg==='guia'){okV(d0-2);desde=at(d0-2,'14:30')}
    if(stg==='pronta'){okV(d0-2);if(prec)okG(d0-3);desde=at(prec?d0-3:d0-2,prec?'16:00':'14:30');if(prec&&d0-3<d0-2)desde=at(d0-2,'14:30')}
    if(stg==='reg'){okV(d0-3);if(prec)okG(d0-4);f.prim={doc:'VFA '+today().slice(0,4)+'/'+(410+i),data:day(d0-7),by:daf,at:at(d0-7,'11:20'),exportado:at(d0-7,'11:00')};f.hist.push({at:at(d0-7,'11:00'),by:daf,acao:'Exportada para o PRIMAVERA',obs:''},{at:at(d0-7,'11:20'),by:daf,acao:'Registada no PRIMAVERA',obs:f.prim.doc});desde=at(d0-7,'11:20')}
    if(stg==='rej'){f.val={estado:'Rejeitada',by:un(resp),at:at(d0-1,'15:10'),obs:'Preço unitário acima do contratado. Pedir nota de crédito ao fornecedor.'};f.hist.push({at:at(d0-1,'15:10'),by:un(resp),acao:'Fatura rejeitada',obs:f.val.obs});desde=at(d0-1,'15:10')}
    f.hist.sort((a,b)=>a.at.localeCompare(b.at));f.estado=calc(f);f.desde=desde;
    if(cp){Object.assign(f,{fornecedor:fo2.id,fornNome:fo2.nome,obra:OBR,compra:cp.id,descr:[cp.artigo,cp.qtd,cp.unidade].filter(Boolean).join(' '),base:+cp.valor||base});f.iva=Math.round(f.base*14)/100;f.total=f.base+f.iva;f.guia.armazem=(as.find(a=>a.obra===OBR)||as[0]||{}).id||'';if(f.guia.linhas)f.guia.linhas=[{artigo:cp.artigo,qtd:+cp.qtd||1,un:cp.unidade||''}];{const cc={...data.compras[cp.id],fatura:f.num,data:day(d0+9),dataNE:day(d0+7)};data.compras[cp.id]=cc;save('compras',cp.id,cc);const rq=cc.requisicao&&data.requisicoes[cc.requisicao];if(rq){const r2={...rq,data:day(d0+12)};data.requisicoes[cc.requisicao]=r2;save('requisicoes',cc.requisicao,r2)}}
      f.cadeia={...snapChain(cp.id),recebida:cp.estado==='Recebido'||!!f.guia.numero}}
    try{const pf=demoPdf(f,cp?fo2:fo,(data.obras[f.obra]||{}).nome);if(pf)f.file=await upload(pf)}catch(x){}
    t.textContent='A criar faturas de exemplo… '+(i+1)+' de '+X.length;t.hidden=false;save(C,'dfx'+(i+1),f)}
  toast('Faturas de exemplo criadas.')}
window.addEventListener('enl-sync',()=>{});
})();
