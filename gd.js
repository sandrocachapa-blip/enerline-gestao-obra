/* ENERLINE – Gestão Documental de Obra (MDL, revisões, transmittals, publicação para obra, retorno das frentes, offline) */
(function(){
const GDC=['gdocs','gdtrans','gdfrentes','gdavisos','gdretorno'];
const ESP={GER:'Geral',TOP:'Topografia e traçado',CIV:'Civil',EST:'Estruturas',LIN:'Linhas de transmissão',SUB:'Subestações',ELE:'Elétrica',PCC:'Proteção, comando e controlo',MEC:'Eletromecânica',INS:'Instrumentação',FOT:'Solar fotovoltaico',TEL:'Telecomunicações e fibra ótica',GAS:'Gás',ARQ:'Arquitetura',HSE:'Segurança e ambiente',QUA:'Qualidade'};
const TIPO={DWG:'Desenho',SPC:'Especificação',PRO:'Procedimento',CAL:'Nota de cálculo',LST:'Lista',DTS:'Folha de dados',MTD:'Método construtivo',PLN:'Plano',REL:'Relatório',ENS:'Protocolo de ensaio',TLF:'Tela final'};
const EST=['Em elaboração','Em aprovação','Aprovado','Aprovado com comentários','Pronto para Construção','Arquivado'];
const COD={A:'A · Aprovado',B:'B · Aprovado com comentários',C:'C · Rejeitado, rever e reenviar'};
const RT=['Dúvida','Red-line','Fotografia','Nota'];
const RE=/^[A-Z0-9]{2,6}-[A-Z0-9]{2,6}-[A-Z]{3}-[A-Z]{3}-\d{4}$/;
const MAXMB=20,CH=600000;

/* ---------- registo na aplicação ---------- */
GDC.forEach(c=>{if(!SC.includes(c))SC.push(c);if(!COLS.includes(c))COLS.push(c);data[c]=data[c]||{};S[c]={title:c,cols:[],fields:[],sort:()=>0}});
VIEWS.splice(VIEWS.findIndex(v=>v[0]==='utilizadores'),0,['gdmdl','Lista de documentos (MDL)','Documentação'],['gdobra','Biblioteca Obra'],['gdtrans','Transmittals'],['gdmatriz','Frentes e distribuição'],['gdretorno','Retorno de obra']);
{const G=['gdmdl','gdobra','gdtrans','gdmatriz','gdretorno'],np={};
 Object.entries(PERF).forEach(([k,v])=>{if(k==='Consulta (só leitura)'){np['Gestão documental']={v:['hoje',...G],edit:true,d:'Lista de documentos, revisões, transmittals e publicação para obra.'};np['Frente de obra']={v:['hoje','gdobra','gdretorno'],edit:true,d:'Lê os documentos em vigor da sua frente e envia dúvidas, red-lines e fotografias.'}}np[k]=v});
 Object.keys(PERF).forEach(k=>delete PERF[k]);Object.assign(PERF,np);
 if(Array.isArray(PERF['Encarregado'].v))PERF['Encarregado'].v.push('gdobra','gdretorno');
 const pf=S.utilizadores.fields.find(f=>f.k==='perfil');if(pf)pf.opts=Object.keys(PERF)}
TONE.ok.push('Pronto para Construção','Respondido','Incorporado','Em vigor','Enviado');TONE.warn.push('Em aprovação','Aprovado com comentários','Por ler');TONE.bad.push('Rejeitado');
const css=document.createElement('style');css.textContent=`
.gdrow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.gdcode{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:600;white-space:nowrap}
.gdrev{display:inline-block;min-width:26px;text-align:center;border:1px solid var(--line);border-radius:5px;padding:0 6px;font-weight:700}
.gdsteps{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px}.gdsteps li::marker{color:var(--brand-ink);font-weight:700}
.gdmx td,.gdmx th{text-align:center}.gdmx td:first-child,.gdmx th:first-child{text-align:left}.gdmx input{width:20px;height:20px;cursor:pointer}
.gdth{display:flex;gap:8px;flex-wrap:wrap}.gdth img{width:84px;height:84px;object-fit:cover;border-radius:6px;border:1px solid var(--line);cursor:pointer}
.gdpv{overflow:auto;padding:8px;background:#e9ebe6!important}
.gdpdf{width:100%;height:min(72vh,900px);border:1px solid var(--line);border-radius:6px;background:#fff}
dialog.gdwide{max-width:min(980px,calc(100% - 24px))}
.gdsync{position:fixed;left:12px;bottom:12px;z-index:8;background:var(--warn-bg,#fdeccb);color:var(--warn,#8a5a00);border-radius:99px;padding:6px 14px;font-size:14px;font-weight:600;box-shadow:0 2px 10px #0003}
.gdhist{width:100%}.gdhist td{padding:4px 8px;border-top:1px solid var(--line);font-size:14px}
.gdfb{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-top:1px solid var(--line)}.gdfb:first-child{border-top:0}
@media print{body>*:not(#gdprint){display:none!important}#gdprint{display:block!important}}
#gdprint{display:none;font:14px/1.4 Arial,sans-serif;color:#000;padding:24px}#gdprint table{width:100%;border-collapse:collapse;margin-top:12px}#gdprint td,#gdprint th{border:1px solid #999;padding:6px 8px;text-align:left}`;
document.head.appendChild(css);
const pr=document.createElement('div');pr.id='gdprint';document.body.appendChild(pr);
const sb=document.createElement('div');sb.className='gdsync';sb.hidden=true;document.body.appendChild(sb);
const syncBadge=()=>{const s=window.enlSync||{};sb.hidden=!(s.offline||s.queued);sb.textContent=s.offline?('Sem internet · a trabalhar com os dados guardados'+(s.queued?' · '+s.queued+' alteraç'+(s.queued>1?'ões':'ão')+' por enviar':'')):(s.queued?'A enviar '+s.queued+' alteraç'+(s.queued>1?'ões':'ão')+'…':'')};
window.addEventListener('enl-sync',()=>{syncBadge();if(!(window.enlSync||{}).offline)setTimeout(syncFiles,1500)});syncBadge();

/* ---------- utilitários ---------- */
const L=c=>Object.entries(data[c]||{}).filter(([,r])=>r.obra===st.obra).map(([id,r])=>({...r,id}));
const isGD=()=>{const u=me();return !u||['Administrador','Diretor de obra','Gestão documental'].includes(u.perfil)};
const uname=()=>(me()||{}).nome||'';
const myFrentes=()=>L('gdfrentes').filter(f=>(f.users||[]).includes(st.user));
const onlyMine=()=>{const u=me();return !!u&&u.perfil==='Frente de obra'};
const fdt=s=>s?fdate(s.slice(0,10))+(s.length>10?' '+s.slice(11,16):''):'—';
const now=()=>{const d=new Date();return today()+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
const kb=n=>n>1048576?(n/1048576).toFixed(1).replace('.',',')+' MB':Math.max(1,Math.round(n/1024))+' KB';
const inForce=d=>!!(d&&d.ifc&&d.ifc.file&&d.estado!=='Arquivado');
const isNum=r=>/^\d+$/.test(String(r));
const nextRev=r=>{r=String(r??'');if(r==='')return 'A';if(isNum(r))return String(+r+1);const c=r.toUpperCase().charCodeAt(0);return c>=65&&c<90?String.fromCharCode(c+1):r+'1'};
const proj=()=>{const d=L('gdocs')[0];return d?d.codigo.split('-')[0]:((data.obras[st.obra]||{}).codigo||'OBR').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)||'OBR'};
const nextTrm=(pre)=>{const n=L('gdtrans').filter(t=>t.numero&&t.numero.startsWith(pre+'-')).reduce((m,t)=>Math.max(m,+(t.numero.split('-').pop())||0),0)+1;return pre+'-'+proj()+'-'+String(n).padStart(4,'0')};
const dlgEl=()=>$('#dlg');
function show(html,wide){const d=dlgEl();d.classList.toggle('gdwide',!!wide);d.innerHTML=html;if(!d.open)d.showModal()}
function hide(){const d=dlgEl();if(d.open)d.close();d.classList.remove('gdwide')}
dlgEl().addEventListener('close',()=>{dlgEl().classList.remove('gdwide');if(curUrl){URL.revokeObjectURL(curUrl);curUrl=''}});
const F=(l,h,w)=>`<label${w?' class="wide"':''}>${l}${h}</label>`;
const sel=(n,opts,v,req)=>`<select name="${n}"${req?' required':''}>${opts.map(o=>{const[a,b]=Array.isArray(o)?o:[o,o];return `<option value="${esc(a)}"${a===v?' selected':''}>${esc(b)}</option>`}).join('')}</select>`;
const form=(name,title,body,okLabel,extra)=>`<form data-gdf="${name}"><h2 style="margin:0">${title}</h2>${body}<div class="actions">${extra||''}<button type="button" class="btn ghost" data-gd="close">Cancelar</button><button class="btn" type="submit">${okLabel||'Guardar'}</button></div></form>`;
function csv(name,head,lines){const t='﻿'+[head,...lines].map(l=>l.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');const b=new Blob([t],{type:'text/csv'});
  if(dl)dl.save({filename:name,data:b}).catch(()=>{});else{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click()}}

/* ---------- ficheiros: partes na base de dados + cópia local para uso sem internet ---------- */
const fdb=(()=>{let p=null;const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open('enl_gd',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
  const tx=(m,fn)=>open().then(d=>new Promise((res,rej)=>{const t=d.transaction('files',m),rq=fn(t.objectStore('files'));t.oncomplete=()=>res(rq&&rq.result);t.onerror=()=>rej(t.error)})).catch(()=>undefined);
  return{get:k=>tx('readonly',o=>o.get(k)),put:(k,v)=>tx('readwrite',o=>o.put(v,k)),del:k=>tx('readwrite',o=>o.delete(k)),keys:()=>tx('readonly',o=>o.getAllKeys()),all:()=>tx('readonly',o=>o.getAll())}})();
let cached=new Set(),curUrl='';
fdb.keys().then(k=>{cached=new Set(k||[]);if(/^gd/.test(st.view))render()});
const b64=buf=>{let s='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
const unb64=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
async function upload(file,onp){const id='f'+uid(),s=b64(await file.arrayBuffer()),n=Math.ceil(s.length/CH)||1;
  for(let i=0;i<n;i++){await db.collection('gdfiles').doc(id+'_'+i).set({obra:st.obra,file:id,i,n,d:s.slice(i*CH,(i+1)*CH)});if(onp)onp(i+1,n)}
  if((window.enlSync||{}).queued)throw new Error('offline');
  await fdb.put(id,{obra:st.obra,name:file.name,blob:new Blob([file],{type:file.type||'application/pdf'})});cached.add(id);
  return{id,name:file.name,size:file.size,n,type:file.type||'application/pdf'}}
async function blobOf(f){const c=await fdb.get(f.id);if(c&&c.blob)return c.blob;
  const parts=new Array(f.n);let next=0;
  await Promise.all([0,1,2,3].map(async()=>{while(next<f.n){const i=next++;const r=await db.collection('gdfiles').doc(f.id+'_'+i).get();if(!r.exists)throw new Error('missing');parts[i]=unb64(r.data().d)}}));
  const blob=new Blob(parts,{type:f.type||'application/pdf'});await fdb.put(f.id,{obra:st.obra,name:f.name,blob});cached.add(f.id);return blob}
async function dropFile(f){if(!f)return;for(let i=0;i<f.n;i++)db.collection('gdfiles').doc(f.id+'_'+i).delete().catch(()=>{});fdb.del(f.id);cached.delete(f.id)}
/* documentos em vigor visíveis para este utilizador */
function ifcDocs(frente){let ds=L('gdocs').filter(inForce);const fr=L('gdfrentes');
  let fs=frente?fr.filter(f=>f.id===frente):onlyMine()?myFrentes():null;
  if(fs)ds=ds.filter(d=>fs.some(f=>(f.esp||[]).includes(d.esp)));return ds}
let syncing=false;
async function syncFiles(force){if(syncing||!db||!st.obra||!st.user)return;const auto=force||onlyMine()||myFrentes().length>0;
  const cur=L('gdocs'),keep=new Set(cur.flatMap(d=>[inForce(d)&&d.ifc.file.id,isGD()&&d.file&&d.file.id]).filter(Boolean));syncing=true;let ch=false;
  try{ /* a revisão anterior é removida do dispositivo assim que deixa de estar em vigor */
    if(cur.length){const all=await fdb.keys()||[];for(const k of all){if(keep.has(k))continue;const r=await fdb.get(k);if(r&&r.obra===st.obra){await fdb.del(k);cached.delete(k);ch=true}}}
    if(auto&&!(window.enlSync||{}).offline)loadPdf().catch(()=>{});
    if(auto&&!(window.enlSync||{}).offline)for(const d of ifcDocs()){const f=d.ifc.file;if(f&&!cached.has(f.id)){try{await blobOf(f);ch=true}catch(e){}}}
  }finally{syncing=false}if(ch&&/^gd/.test(st.view)&&!dlgEl().open)render()}
setInterval(()=>syncFiles(),30000);
/* pré-visualização: as páginas do PDF são desenhadas pela própria aplicação (funciona em qualquer navegador e tablet) */
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';let pdfLib=null;
function loadPdf(){return pdfLib||(pdfLib=new Promise((res,rej)=>{const sc=document.createElement('script');sc.src=PDFJS+'pdf.min.js';sc.onload=async()=>{try{const L=window.pdfjsLib;const w=await (await fetch(PDFJS+'pdf.worker.min.js')).text();L.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([w],{type:'text/javascript'}));res(L)}catch(e){rej(e)}};sc.onerror=rej;document.head.appendChild(sc)}).catch(e=>{pdfLib=null;throw e}))}
async function preview(blob,box){const L=await loadPdf(),pdf=await L.getDocument({data:await blob.arrayBuffer()}).promise,n=Math.min(pdf.numPages,40),W=Math.max(300,box.clientWidth-18),dpr=Math.min(2,window.devicePixelRatio||1);
  box.innerHTML='';
  for(let i=1;i<=n;i++){if(!box.isConnected)return;const pg=await pdf.getPage(i),v0=pg.getViewport({scale:1}),vp=pg.getViewport({scale:W/v0.width*dpr}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;c.style.cssText='width:100%;height:auto;display:block;background:#fff;box-shadow:0 1px 6px #0003;margin:0 0 10px';box.appendChild(c);await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise}
  if(pdf.numPages>n){const m=document.createElement('p');m.className='meta';m.textContent='A pré-visualização mostra as primeiras '+n+' de '+pdf.numPages+' páginas. Use «Abrir em ecrã inteiro» para ver todas.';box.appendChild(m)}}
async function openDoc(f,title,sub){show(`<form><h2 style="margin:0">${esc(title)}</h2><p class="meta" style="margin:0">${sub||''}</p><div id="gdv" class="empty">A abrir o documento…</div><div class="actions"><button type="button" class="btn ghost" data-gd="close">Fechar</button></div></form>`,true);
  try{const b=await blobOf(f);if(curUrl)URL.revokeObjectURL(curUrl);curUrl=URL.createObjectURL(b);const v=$('#gdv');if(!v)return;v.className='';
    v.innerHTML=`<div class="gdrow" style="margin-bottom:8px"><a class="btn" href="${curUrl}" target="_blank" rel="noopener">Abrir em ecrã inteiro</a><a class="btn ghost" href="${curUrl}" download="${esc(f.name)}">Descarregar</a><span class="meta">${esc(f.name)} · ${kb(f.size)}</span></div><div class="gdpdf gdpv" id="gdpv"><div class="empty">A preparar a pré-visualização…</div></div>`;
    const box=$('#gdpv');if(/^image\//.test(b.type)){box.innerHTML=`<img alt="Documento" style="max-width:100%;display:block;margin:auto" src="${curUrl}">`;return}
    try{await preview(b,box)}catch(x){if(box&&box.isConnected)box.outerHTML=`<iframe class="gdpdf" title="Documento" src="${curUrl}"></iframe>`}}
  catch(e){const v=$('#gdv');if(v)v.textContent='Não foi possível abrir: sem internet e este documento ainda não estava guardado neste dispositivo.'}}

/* ---------- vistas ---------- */
const tile=(n,l,cls)=>`<div class="tile ${cls||''}"><b>${n}</b><span>${l}</span></div>`;
const head=(t,sub,tools)=>`<div class="vh"><div><h1>${t}</h1><p class="sub">${sub}</p></div><div class="tools">${tools||''}</div></div>`;
const revTag=r=>`<span class="gdrev">${esc(r===''||r==null?'—':r)}</span>`;
function vMdl(){const ds=L('gdocs').sort((a,b)=>a.codigo.localeCompare(b.codigo)),g=isGD(),f=st.gdf||{},cnt=e=>ds.filter(d=>d.estado===e).length;
  const list=ds.filter(d=>(!f.esp||d.esp===f.esp)&&(!f.est||d.estado===f.est));
  return head('Lista de documentos (MDL)','Registo de todos os documentos previstos no projeto. O código é único e não muda entre revisões; a revisão fica no seu próprio campo.',
    `<input type="search" id="q" placeholder="Procurar" aria-label="Procurar">${g?'<button class="btn" data-gd="newdoc">Novo documento</button><button class="btn ghost" data-gd="impdocs">Importar lista</button>':''}<button class="btn ghost" data-gd="csvmdl">Exportar CSV</button>`)
  +`<div class="tiles">${tile(ds.length,'Documentos previstos')}${tile(cnt('Em elaboração'),'Em elaboração')}${tile(cnt('Em aprovação'),'Em aprovação','warn')}${tile(cnt('Aprovado')+cnt('Aprovado com comentários'),'Aprovados, por publicar','warn')}${tile(cnt('Pronto para Construção'),'Prontos para construção','ok')}${tile(ds.filter(d=>!d.file).length,'Sem ficheiro carregado')}</div>
  <div class="gdrow"><label class="meta">Especialidade ${sel('gdf_esp',[['','Todas'],...Object.entries(ESP).map(([k,v])=>[k,k+' · '+v])],f.esp||'')}</label><label class="meta">Estado ${sel('gdf_est',[['','Todos'],...EST],f.est||'')}</label>${g?'<button class="btn ghost" data-gd="sendsel">Enviar selecionados para aprovação</button>':''}</div>
  <div class="tablewrap">${list.length?`<table><thead><tr>${g?'<th></th>':''}<th>Código</th><th>Título</th><th>Especialidade</th><th>Rev.</th><th>Estado</th><th>Cód. aprov.</th><th>Transmittal</th><th>Envio</th><th>Resposta</th><th>Responsável</th><th>Ficheiro</th></tr></thead><tbody>${list.map(d=>`<tr class="click" data-gd="doc:${d.id}">${g?`<td><input type="checkbox" class="gdck" value="${d.id}" aria-label="Selecionar"${d.file&&d.estado==='Em elaboração'?'':' disabled'}></td>`:''}<td class="gdcode">${esc(d.codigo)}</td><td>${esc(d.titulo)}</td><td>${esc(ESP[d.esp]||d.esp)}</td><td>${revTag(d.rev)}</td><td>${pill(d.estado)}${inForce(d)&&String(d.ifc.rev)!==String(d.rev)?`<br><span class="meta">em obra: rev. ${esc(d.ifc.rev)}</span>`:''}</td><td>${d.cod?`<strong>${esc(d.cod)}</strong>`:'—'}</td><td>${esc(d.transmittal||'—')}</td><td>${fdate(d.dEnvio)}</td><td>${fdate(d.dResp)}</td><td>${esc(d.resp||'—')}</td><td>${d.file?'PDF · '+kb(d.file.size):'<span class="meta">por carregar</span>'}</td></tr>`).join('')}</tbody></table>`:`<div class="empty">${ds.length?'Nenhum documento com estes filtros.':'Ainda não há documentos na lista. Comece por registar os documentos previstos; depois carregue o ficheiro de cada um.'+(g?'<br><br><button class="btn" data-gd="demo">Criar documentos de exemplo</button>':'')}</div>`}</div>
  <p class="help">Fluxo: Em elaboração → Em aprovação (transmittal) → Aprovado (A) ou Aprovado com comentários (B) → Pronto para Construção → Arquivado. Só os documentos «Pronto para Construção» chegam à Biblioteca Obra; a revisão anterior passa a «Substituído».</p>`}
function vObra(){const frs=L('gdfrentes'),mine=myFrentes(),only=onlyMine(),fsel=only?'':(st.gdfr||''),ds=ifcDocs(fsel).sort((a,b)=>a.codigo.localeCompare(b.codigo));
  const myIds=(only||mine.length?mine:frs).map(f=>f.id),av=L('gdavisos').filter(a=>myIds.includes(a.frente)&&!(a.lidos||[]).includes(st.user)).sort((a,b)=>b.at.localeCompare(a.at));
  const seen=new Set(),avU=av.filter(a=>{const k=a.doc+'|'+a.rev;if(seen.has(k))return false;seen.add(k);return true}),off=ds.filter(d=>cached.has(d.ifc.file.id)).length;
  return head('Biblioteca Obra','Só leitura. Aqui está apenas a revisão em vigor de cada documento pronto para construção.'+(only?(mine.length?' Frente: '+esc(mine.map(f=>f.nome).join(', '))+'.':' O seu utilizador ainda não está associado a nenhuma frente.'):''),
    `<input type="search" id="q" placeholder="Procurar" aria-label="Procurar">${only?'':`<select id="gdfrsel" aria-label="Frente"><option value="">Todas as frentes</option>${frs.map(f=>`<option value="${f.id}"${f.id===fsel?' selected':''}>${esc(f.nome)}</option>`).join('')}</select>`}<button class="btn ghost" data-gd="offall">Guardar tudo neste dispositivo</button><button class="btn" data-gd="newfb">Enviar dúvida / red-line</button>`)
  +`<div class="tiles">${tile(ds.length,'Documentos em vigor','ok')}${tile(off+' / '+ds.length,'Disponíveis sem internet')}${tile(avU.length,'Avisos por ler',avU.length?'warn':'')}</div>
  ${avU.length?`<div class="list">${avU.slice(0,8).map(a=>`<div class="click" data-gd="open:${a.doc}" style="cursor:pointer"><span><strong>Nova revisão em vigor: ${esc(a.codigo)} rev. ${esc(a.rev)}</strong><br><span class="meta">${esc(a.titulo)} · publicado em ${fdt(a.at)} · transmittal ${esc(a.transmittal||'—')}</span></span>${pill('Por ler')}</div>`).join('')}</div>`:''}
  <div class="tablewrap">${ds.length?`<table><thead><tr><th>Código</th><th>Título</th><th>Especialidade</th><th>Rev. em vigor</th><th>Publicado</th><th>Sem internet</th><th></th></tr></thead><tbody>${ds.map(d=>`<tr class="click" data-gd="open:${d.id}"><td class="gdcode">${esc(d.codigo)}</td><td>${esc(d.titulo)}</td><td>${esc(ESP[d.esp]||d.esp)}</td><td>${revTag(d.ifc.rev)}</td><td>${fdt(d.ifc.at)}</td><td>${cached.has(d.ifc.file.id)?pill('Disponível'):'<span class="meta">só com internet</span>'}</td><td><button class="btn ghost" data-gd="fbdoc:${d.id}">Reportar</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Ainda não há documentos publicados para obra'+(fsel||only?' para esta frente':'')+'.</div>'}</div>
  <p class="help">Cópia controlada: quando sai uma revisão nova, a anterior desaparece desta lista e é apagada deste dispositivo. Os documentos das suas frentes ficam guardados automaticamente para consulta sem internet.</p>`}
function vTrans(){const ts=L('gdtrans').sort((a,b)=>(b.data+b.numero).localeCompare(a.data+a.numero));
  return head('Transmittals','Tudo o que entra ou sai fica num transmittal numerado: é a prova do que foi enviado, a quem e quando.',`<input type="search" id="q" placeholder="Procurar" aria-label="Procurar">${isGD()?'<button class="btn" data-gd="newin">Registar transmittal recebido</button>':''}<button class="btn ghost" data-gd="csvtrm">Exportar CSV</button>`)
  +`<div class="tiles">${tile(ts.filter(t=>t.sentido==='Saída').length,'Enviados')}${tile(ts.filter(t=>t.sentido==='Entrada').length,'Recebidos')}${tile(ts.filter(t=>t.motivo==='Para aprovação'&&!t.respondido).length,'A aguardar resposta','warn')}</div>
  <div class="tablewrap">${ts.length?`<table><thead><tr><th>Número</th><th>Sentido</th><th>Data</th><th>Motivo</th><th>De</th><th>Para</th><th>Documentos</th><th>Resposta</th></tr></thead><tbody>${ts.map(t=>`<tr class="click" data-gd="trm:${t.id}"><td class="gdcode">${esc(t.numero)}</td><td>${pill(t.sentido)}</td><td>${fdate(t.data)}</td><td>${esc(t.motivo||'—')}</td><td>${esc(t.de||'—')}</td><td>${esc(t.para||'—')}</td><td>${(t.docs||[]).map(x=>esc(x.codigo)+' rev. '+esc(x.rev)).join('<br>')}</td><td>${t.motivo==='Para aprovação'?(t.respondido?fdate(t.respondido):pill('Em aprovação')):'—'}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Ainda não há transmittals. São criados automaticamente ao enviar documentos para aprovação e ao publicar para obra.</div>'}</div>`}
function vMatriz(){const frs=L('gdfrentes').sort((a,b)=>a.nome.localeCompare(b.nome)),g=isGD();
  return head('Frentes e matriz de distribuição','A matriz define que frentes recebem cada especialidade quando um documento é publicado para obra.',g?'<button class="btn" data-gd="newfr">Nova frente</button>':'')
  +(frs.length?`<div class="tablewrap"><table class="gdmx"><thead><tr><th>Especialidade</th>${frs.map(f=>`<th>${esc(f.nome)}</th>`).join('')}</tr></thead><tbody>${Object.entries(ESP).map(([k,v])=>`<tr><td><strong>${k}</strong> · ${esc(v)}</td>${frs.map(f=>`<td><input type="checkbox" data-gdmx="${f.id}:${k}"${(f.esp||[]).includes(k)?' checked':''}${g?'':' disabled'} aria-label="${esc(f.nome)} recebe ${esc(v)}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <h2>Frentes de obra</h2><div class="list">${frs.map(f=>`<div class="click" data-gd="fr:${f.id}" style="cursor:pointer"><span><strong>${esc(f.nome)}</strong><br><span class="meta">${esc([f.resp,f.email,(f.users||[]).length+' utilizador'+((f.users||[]).length===1?'':'es'),f.teams?'aviso Teams ligado':'sem canal Teams'].filter(Boolean).join(' · '))}</span></span><span class="meta">${(f.esp||[]).join(', ')||'sem especialidades'}</span></div>`).join('')}</div>`
   :'<div class="card empty">Crie as frentes de obra (por exemplo: Frente Civil, Frente Elétrica) e marque na matriz as especialidades que cada uma recebe.</div>')}
function vRet(){const g=isGD(),only=onlyMine(),mine=myFrentes().map(f=>f.id),f=st.gdr||{};
  let rs=L('gdretorno').sort((a,b)=>b.at.localeCompare(a.at));if(only)rs=rs.filter(r=>mine.includes(r.frente)||r.autor===st.user);
  const list=rs.filter(r=>(!f.tipo||r.tipo===f.tipo)&&(!f.est||r.estado===f.est)),fn=id=>(data.gdfrentes[id]||{}).nome||'—';
  return head('Retorno de obra','Dúvidas, red-lines, fotografias e notas enviadas pelas frentes. As red-lines são a base das telas finais.',`<button class="btn" data-gd="newfb">Novo registo</button><button class="btn ghost" data-gd="csvret">Exportar red-lines (CSV)</button>`)
  +`<div class="tiles">${tile(rs.filter(r=>r.estado==='Aberto').length,'Por responder','warn')}${tile(rs.filter(r=>r.tipo==='Red-line').length,'Red-lines recolhidas')}${tile(rs.filter(r=>r.tipo==='Red-line'&&r.estado!=='Incorporado').length,'Red-lines por incorporar','warn')}${tile(rs.filter(r=>r.tipo==='Dúvida').length,'Dúvidas')}</div>
  <div class="gdrow"><label class="meta">Tipo ${sel('gdr_tipo',[['','Todos'],...RT],f.tipo||'')}</label><label class="meta">Estado ${sel('gdr_est',[['','Todos'],'Aberto','Respondido','Incorporado'],f.est||'')}</label></div>
  <div class="list">${list.length?list.map(r=>`<div class="gdfb"><div class="gdrow">${pill(r.tipo)} ${pill(r.estado)} <strong class="gdcode">${esc(r.codigo||'Sem documento')}${r.rev!=null&&r.codigo?' rev. '+esc(r.rev):''}</strong><span class="meta">${esc(fn(r.frente))} · ${esc(r.autorNome||'')} · ${fdt(r.at)}</span></div><div>${esc(r.texto||'')}</div>${(r.fotos||[]).length?`<div class="gdth">${r.fotos.map((p,i)=>`<img alt="Fotografia ${i+1}" src="${p.t}" data-gd="foto:${p.id}">`).join('')}</div>`:''}${r.resposta?`<div class="meta"><strong>Resposta (${esc(r.respBy||'')}, ${fdt(r.respAt)}):</strong> ${esc(r.resposta)}</div>`:''}${g?`<div class="gdrow"><button class="btn ghost" data-gd="answer:${r.id}">${r.resposta?'Alterar resposta':'Responder'}</button>${r.tipo==='Red-line'&&r.estado!=='Incorporado'?`<button class="btn ghost" data-gd="incorp:${r.id}">Marcar como incorporada nas telas finais</button>`:''}</div>`:''}</div>`).join(''):'<div class="empty">Sem registos.</div>'}</div>`}
const VW={gdmdl:vMdl,gdobra:vObra,gdtrans:vTrans,gdmatriz:vMatriz,gdretorno:vRet};
const seeded=new Set();
function autoDemo(){const ob=st.obra,o=data.obras[ob];if(!o||!o.exemplo||seeded.has(ob)||L('gdocs').length)return;seeded.add(ob);
  setTimeout(()=>{if(st.obra!==ob||L('gdocs').length||!/^gd/.test(st.view)||(typeof demoBusy!=='undefined'&&demoBusy)){seeded.delete(ob);return}demo(true)},3500)}
{const o=vGeneric;vGeneric=function(c){if(VW[c]){setTimeout(()=>syncFiles(),50);autoDemo();return VW[c]()}return o(c)}}

/* ---------- formulários e ações ---------- */
function docForm(id){const d=id?data.gdocs[id]:null,last=L('gdocs').slice(-1)[0],seg=d?d.codigo.split('-'):[proj(),last?last.codigo.split('-')[1]:'ENL','ELE','DWG',''];
  const lock=d&&(d.transmittal||d.ifc);
  show(form('doc:'+(id||''),d?'Editar documento':'Novo documento previsto',`<div class="fields">
   ${F('Projeto',`<input name="c0" value="${esc(seg[0])}" required maxlength="6" style="text-transform:uppercase"${lock?' disabled':''}>`)}${F('Emissor',`<input name="c1" value="${esc(seg[1])}" required maxlength="6" style="text-transform:uppercase"${lock?' disabled':''}>`)}
   ${F('Especialidade',lock?`<input value="${esc(seg[2]+' · '+(ESP[seg[2]]||''))}" disabled>`:sel('c2',Object.entries(ESP).map(([k,v])=>[k,k+' · '+v]),seg[2]))}${F('Tipo de documento',lock?`<input value="${esc(seg[3]+' · '+(TIPO[seg[3]]||''))}" disabled>`:sel('c3',Object.entries(TIPO).map(([k,v])=>[k,k+' · '+v]),seg[3]))}
   ${F('Número (vazio = seguinte)',`<input name="c4" value="${esc(seg[4])}" inputmode="numeric" maxlength="4" pattern="\\d{1,4}"${lock?' disabled':''}>`)}${F('Código',`<input id="gdcod" value="${esc(d?d.codigo:'')}" disabled class="gdcode">`)}
   ${F('Título',`<input name="titulo" value="${esc(d?d.titulo:'')}" required>`,1)}${F('Responsável',`<input name="resp" value="${esc(d?d.resp||'':uname())}">`)}${d?'':F('Revisão inicial',`<input name="rev" value="A" maxlength="3" required>`)}</div>
   <p class="help">${lock?'O código já não pode ser alterado porque o documento já circulou em transmittal.':'Código: projeto-emissor-especialidade-tipo-número, por exemplo QLB-ENL-ELE-DWG-0001. A revisão não faz parte do código.'}</p>`,
   'Guardar',d&&!lock?`<button type="button" class="btn danger" data-danger data-gd="deldoc:${id}">Apagar</button>`:''));codePrev()}
function codeOf(fm){const g=n=>(fm.elements[n]?fm.elements[n].value:'').trim().toUpperCase();const esp=g('c2'),tp=g('c3');let n=g('c4');
  if(!n){const pre=[g('c0'),g('c1'),esp,tp].join('-')+'-';n=String(L('gdocs').filter(x=>x.codigo.startsWith(pre)).reduce((m,x)=>Math.max(m,+x.codigo.slice(-4)||0),0)+1)}
  return [g('c0'),g('c1'),esp,tp,n.padStart(4,'0')].join('-')}
function codePrev(){const fm=dlgEl().querySelector('form[data-gdf^="doc:"]'),o=$('#gdcod');if(fm&&o&&fm.elements.c2)o.value=codeOf(fm)}
function docCard(id){const d=data.gdocs[id];if(!d)return;const g=isGD(),h=(d.hist||[]).slice().reverse(),canPub=g&&d.file&&['A','B'].includes(d.cod)&&['Aprovado','Aprovado com comentários'].includes(d.estado);
  const b=(a,l,cls)=>`<button type="button" class="btn ${cls||'ghost'}" data-gd="${a}:${id}">${l}</button>`;
  show(`<form><div class="gdrow" style="justify-content:space-between"><h2 style="margin:0" class="gdcode">${esc(d.codigo)}</h2>${pill(d.estado)}</div>
   <div><strong>${esc(d.titulo)}</strong><br><span class="meta">${esc(ESP[d.esp]||d.esp)} · ${esc(TIPO[d.tipo]||d.tipo)} · Responsável: ${esc(d.resp||'—')}</span></div>
   <div class="winfo"><div><span class="meta">Revisão atual</span><br>${revTag(d.rev)}</div><div><span class="meta">Código de aprovação</span><br><strong>${esc(d.cod?COD[d.cod]:'—')}</strong></div><div><span class="meta">Transmittal</span><br><strong>${esc(d.transmittal||'—')}</strong></div><div><span class="meta">Envio / resposta</span><br><strong>${fdate(d.dEnvio)} / ${fdate(d.dResp)}</strong></div><div><span class="meta">Em vigor na obra</span><br><strong>${inForce(d)?'Rev. '+esc(d.ifc.rev)+' desde '+fdt(d.ifc.at):'—'}</strong></div></div>
   <div class="gdrow">${d.file?b('view','Abrir PDF da rev. '+esc(d.rev),'')+`<span class="meta">${esc(d.file.name)} · ${kb(d.file.size)}</span>`:'<span class="meta">Esta revisão ainda não tem ficheiro.</span>'}</div>
   ${g?`<div class="gdrow">${b('edit','Editar dados')}${d.estado==='Em elaboração'?b('up',d.file?'Substituir PDF':'Carregar PDF'):''}${d.estado!=='Arquivado'?b('rev','Nova revisão'):''}${d.estado==='Em elaboração'&&d.file?b('send','Enviar para aprovação'):''}${d.estado==='Em aprovação'?b('resp','Registar resposta'):''}${canPub?b('pub','Publicar para obra',''):''}${d.estado!=='Arquivado'?b('arch','Arquivar'):''}</div>`:''}
   <h3 style="margin:6px 0 0">Histórico de revisões</h3><table class="gdhist"><tbody><tr><td>${revTag(d.rev)}</td><td>${pill(d.estado)}</td><td>${d.cod?'Cód. '+esc(d.cod):''}</td><td>${esc(d.transmittal||'')}</td><td>atual</td><td></td></tr>${inForce(d)&&String(d.ifc.rev)!==String(d.rev)?`<tr><td>${revTag(d.ifc.rev)}</td><td>${pill('Em vigor')}</td><td></td><td>${esc(d.ifc.transmittal||'')}</td><td>${fdt(d.ifc.at)}</td><td>na obra até sair a nova revisão</td></tr>`:''}${h.map((x,i)=>`<tr><td>${revTag(x.rev)}</td><td>${pill('Substituído')}</td><td>${x.cod?'Cód. '+esc(x.cod):''}</td><td>${esc(x.transmittal||'')}</td><td>${fdt(x.at)}</td><td>${x.file&&g?`<button type="button" class="btn ghost" data-gd="hview:${id}:${(d.hist||[]).length-1-i}">Abrir</button>`:''}</td></tr>`).join('')}</tbody></table>
   <div class="actions"><button type="button" class="btn ghost" data-gd="close">Fechar</button></div></form>`,true)}
function upForm(id,isRev){const d=data.gdocs[id];
  show(form((isRev?'rev:':'up:')+id,isRev?'Nova revisão de '+esc(d.codigo):'Carregar PDF · '+esc(d.codigo)+' rev. '+esc(d.rev),`<div class="fields">${isRev?F('Nova revisão',`<input name="rev" value="${esc(isNum(d.rev)?nextRev(((d.hist||[]).filter(h=>!isNum(h.rev)).slice(-1)[0]||{}).rev||''):nextRev(d.rev))}" required maxlength="3">`)+F('Motivo (opcional)','<input name="nota">'):''}${F('Ficheiro PDF (máx. '+MAXMB+' MB)',`<input type="file" name="file" accept="application/pdf,.pdf"${isRev?'':' required'}>`,1)}</div><p class="help" id="gdprog">${isRev?(inForce(d)&&String(d.ifc.rev)===String(d.rev)?'A rev. '+esc(d.rev)+' continua em vigor na obra até a nova ser publicada. Use':'A revisão atual ('+esc(d.rev)+') passa automaticamente a «Substituído». Use')+' letras (A, B, C…) nas revisões para aprovação; os números (0, 1, 2…) são atribuídos ao publicar para construção.':'O nome do ficheiro não interessa: o documento fica identificado pelo código e pela revisão.'}</p>`,isRev?'Criar revisão':'Carregar'))}
function sendForm(ids){const ds=ids.map(i=>({...data.gdocs[i],id:i})).filter(d=>d.codigo&&d.file&&d.estado==='Em elaboração');if(!ds.length)return toast('Selecione documentos em elaboração que já tenham o PDF carregado.');
  const lastTo=(L('gdtrans').filter(t=>t.sentido==='Saída'&&t.motivo==='Para aprovação').sort((a,b)=>b.data.localeCompare(a.data))[0]||{}).para||'';
  show(form('send:'+ds.map(d=>d.id).join(','),'Enviar para aprovação',`<p class="meta" style="margin:0">Será criado o transmittal <strong>${esc(nextTrm('TRM'))}</strong> com ${ds.length} documento${ds.length>1?'s':''}:</p><div class="list">${ds.map(d=>`<div><span><span class="gdcode">${esc(d.codigo)}</span> rev. ${esc(d.rev)}<br><span class="meta">${esc(d.titulo)}</span></span></div>`).join('')}</div><div class="fields">${F('Para (entidade que aprova)',`<input name="para" value="${esc(lastTo)}" required placeholder="Dono de obra / Fiscalização">`)}${F('Data de envio',`<input type="date" name="data" value="${today()}" required>`)}${F('Observações','<textarea name="obs" rows="2"></textarea>',1)}</div>`,'Emitir transmittal'))}
function respForm(id){const d=data.gdocs[id];show(form('resp:'+id,'Registar resposta · '+esc(d.codigo)+' rev. '+esc(d.rev),`<div class="fields">${F('Código de aprovação',sel('cod',Object.entries(COD),'A',1))}${F('Data da resposta',`<input type="date" name="data" value="${today()}" required>`)}${F('Referência do transmittal recebido',`<input name="ref" placeholder="Número dado por quem respondeu">`)}${F('De',`<input name="de" value="${esc((L('gdtrans').find(t=>t.numero===d.transmittal)||{}).para||'')}">`)}${F('Comentários','<textarea name="obs" rows="2"></textarea>',1)}</div><p class="help">A e B permitem publicar para obra. C devolve o documento a «Em elaboração» para sair uma nova revisão.</p>`,'Registar'))}
function targets(d){return L('gdfrentes').filter(f=>(f.esp||[]).includes(d.esp))}
function pubForm(id){const d=data.gdocs[id],fr=targets(d),nr=d.ifc?String(+d.ifc.rev+1):'0';
  show(form('pub:'+id,'Publicar para obra',`<p style="margin:0"><span class="gdcode">${esc(d.codigo)}</span> · ${esc(d.titulo)}<br><span class="meta">Rev. ${esc(d.rev)} aprovada com código ${esc(d.cod)}</span></p>
   <div class="fields">${F('Revisão para construção',`<input name="rev" value="${esc(nr)}" required pattern="\\d{1,3}" inputmode="numeric">`)}${F('Data',`<input type="date" name="data" value="${today()}" required>`)}</div>
   <ol class="gdsteps"><li>O estado passa a «Pronto para Construção»${d.ifc?' e a rev. '+esc(d.ifc.rev)+' passa a «Substituído»':''}.</li><li>O PDF é copiado para a Biblioteca Obra (só leitura).</li><li>Distribuição pela matriz, especialidade ${esc(d.esp)}: ${fr.length?'<strong>'+esc(fr.map(f=>f.nome).join(', '))+'</strong>':'<strong>nenhuma frente recebe esta especialidade</strong> (configure em «Frentes e distribuição»)'}.</li><li>Aviso a cada frente (na aplicação, Teams se configurado, e email pronto a enviar), com ligação direta.</li><li>É gerado o transmittal <strong>${esc(nextTrm('TRM'))}</strong> e registado na lista de documentos.</li><li>Os tablets das frentes recebem a nova versão e apagam a anterior.</li></ol>`,'Publicar para obra'))}
function frForm(id){const f=id?data.gdfrentes[id]:{esp:[],users:[]},us=rows('utilizadores').filter(u=>u.estado!=='Inativo');
  show(form('fr:'+(id||''),id?'Editar frente':'Nova frente de obra',`<div class="fields">${F('Nome da frente',`<input name="nome" value="${esc(f.nome||'')}" required placeholder="Frente Elétrica">`)}${F('Responsável',`<input name="resp" value="${esc(f.resp||'')}">`)}${F('Email da frente (para avisos)',`<input type="email" name="email" value="${esc(f.email||'')}">`)}${F('Webhook do canal Teams (opcional)',`<input name="teams" value="${esc(f.teams||'')}" placeholder="https://…">`)}
   ${F('Especialidades que recebe',`<div class="checks" data-ck="esp">${Object.entries(ESP).map(([k,v])=>`<label><input type="checkbox" value="${k}"${(f.esp||[]).includes(k)?' checked':''}>${k} · ${esc(v)}</label>`).join('')}</div>`,1)}
   ${F('Utilizadores desta frente (tablets)',`<div class="checks" data-ck="users">${us.map(u=>`<label><input type="checkbox" value="${u.id}"${(f.users||[]).includes(u.id)?' checked':''}>${esc(u.nome)} (${esc(u.perfil)})</label>`).join('')||'<span class="meta">Sem utilizadores.</span>'}</div>`,1)}</div>`,'Guardar',id?`<button type="button" class="btn danger" data-danger data-gd="delfr:${id}">Apagar</button>`:''))}
function fbForm(docId){const only=onlyMine(),mine=myFrentes(),frs=only||mine.length?mine:L('gdfrentes'),ds=ifcDocs().sort((a,b)=>a.codigo.localeCompare(b.codigo));
  show(form('fb:','Enviar para a gestão documental',`<div class="fields">${F('Tipo',sel('tipo',RT,docId?'Red-line':'Dúvida'))}${F('Frente',sel('frente',[...frs.map(f=>[f.id,f.nome]),...(frs.length?[]:[['','—']])],frs[0]?frs[0].id:''))}
   ${F('Documento',`<select name="doc"><option value="">Sem documento associado</option>${ds.map(d=>`<option value="${d.id}"${d.id===docId?' selected':''}>${esc(d.codigo)} rev. ${esc(d.ifc.rev)} · ${esc(d.titulo)}</option>`).join('')}</select>`,1)}
   ${F('Descrição','<textarea name="texto" rows="4" required placeholder="O que encontrou em obra, o que foi alterado, o que precisa de saber…"></textarea>',1)}
   ${F('Fotografias ou red-line fotografada (até 4)','<input type="file" name="fotos" accept="image/*" multiple>',1)}</div><p class="help">Pode enviar sem internet: fica guardado no dispositivo e segue assim que houver ligação.</p>`,'Enviar'))}
function inForm(){show(form('in:','Registar transmittal recebido',`<div class="fields">${F('Referência (número de quem enviou)','<input name="ref" required>')}${F('Data',`<input type="date" name="data" value="${today()}" required>`)}${F('De','<input name="de" required>')}${F('Motivo',sel('motivo',['Para informação','Resposta','Para aprovação','Outro'],'Para informação'))}${F('Documentos e assunto','<textarea name="obs" rows="3" required></textarea>',1)}</div>`,'Registar'))}
function trmCard(id){const t=data.gdtrans[id];if(!t)return;
  show(`<form><div class="gdrow" style="justify-content:space-between"><h2 style="margin:0" class="gdcode">${esc(t.numero)}</h2>${pill(t.sentido)}</div><div class="winfo"><div><span class="meta">Data</span><br><strong>${fdate(t.data)}</strong></div><div><span class="meta">Motivo</span><br><strong>${esc(t.motivo||'—')}</strong></div><div><span class="meta">De</span><br><strong>${esc(t.de||'—')}</strong></div><div><span class="meta">Para</span><br><strong>${esc(t.para||'—')}</strong></div>${t.ref?`<div><span class="meta">Referência externa</span><br><strong>${esc(t.ref)}</strong></div>`:''}<div><span class="meta">Emitido por</span><br><strong>${esc(t.by||'—')}</strong></div></div>
   ${(t.docs||[]).length?`<table class="gdhist"><tbody>${t.docs.map(x=>`<tr><td class="gdcode">${esc(x.codigo)}</td><td>${revTag(x.rev)}</td><td>${esc(x.titulo)}</td></tr>`).join('')}</tbody></table>`:''}${t.obs?`<div>${esc(t.obs)}</div>`:''}
   <div class="actions"><button type="button" class="btn ghost" data-gd="printtrm:${id}">Imprimir / PDF</button><button type="button" class="btn ghost" data-gd="close">Fechar</button></div></form>`,true)}
function printTrm(id){const t=data.gdtrans[id],o=data.obras[st.obra]||{};pr.innerHTML=`<p style="margin:0;font-size:12px"><b>ENERLINE, S.A.</b> · Belas Business Park, Ed. Bengo, Fração 201, Talatona, Luanda · geral@enerline.ao · +244 926 920 368</p><h1 style="margin:8px 0 0">Transmittal ${esc(t.numero)}</h1><p>Obra: <b>${esc(o.nome||'')}</b><br>Data: <b>${fdate(t.data)}</b> · Sentido: <b>${esc(t.sentido)}</b> · Motivo: <b>${esc(t.motivo||'')}</b><br>De: <b>${esc(t.de||'')}</b><br>Para: <b>${esc(t.para||'')}</b>${t.ref?'<br>Referência externa: <b>'+esc(t.ref)+'</b>':''}</p><table><thead><tr><th>Código</th><th>Rev.</th><th>Título</th></tr></thead><tbody>${(t.docs||[]).map(x=>`<tr><td>${esc(x.codigo)}</td><td>${esc(x.rev)}</td><td>${esc(x.titulo)}</td></tr>`).join('')}</tbody></table>${t.obs?'<p>Observações: '+esc(t.obs)+'</p>':''}<p style="margin-top:60px">Enviado por: ${esc(t.by||'')} ______________________ &nbsp;&nbsp; Recebido por: ______________________ Data: ____/____/______</p>`;hide();setTimeout(()=>window.print(),100)}
const link=id=>location.origin+location.pathname+'#gdobra/'+id;
async function notifyTeams(f,d,rev,trm){if(!f.teams)return 'sem canal';try{const r=await fetch('/api/notify',{method:'POST',headers:{'content-type':'application/json','x-key':localStorage.getItem('enerline_access_key')||''},body:JSON.stringify({url:f.teams,title:'Nova revisão em vigor: '+d.codigo+' rev. '+rev,text:d.titulo+' · '+(data.obras[st.obra]||{}).nome+' · transmittal '+trm+'. A revisão anterior deixou de ser válida.',link:link(d.id)})});const j=await r.json();return j.ok?'enviado':'falhou'}catch(e){return 'falhou'}}
async function publish(id,rev,dia){const d={...data.gdocs[id]},fr=targets(d),trm=nextTrm('TRM'),at=now();
  const hist=(d.hist||[]).concat([{rev:d.rev,estado:'Substituído',cod:d.cod||'',file:null,at,transmittal:d.transmittal||'',nota:'Aprovada; emitida para construção como rev. '+rev}]);
  const old=d.ifc;if(old)hist.push({rev:old.rev,estado:'Substituído',cod:'',file:null,at,transmittal:old.transmittal||'',nota:'Substituída pela rev. '+rev});
  const nd={...d,rev,estado:'Pronto para Construção',transmittal:trm,dEnvio:dia,hist,ifc:{rev,file:d.file,at,by:uname(),transmittal:trm}};
  await save('gdocs',id,nd);
  await save('gdtrans','t'+uid(),{obra:st.obra,numero:trm,sentido:'Saída',motivo:'Para construção',data:dia,de:'Gestão documental ENERLINE',para:fr.map(f=>f.nome).join(', ')||'Sem frentes na matriz',docs:[{id,codigo:d.codigo,titulo:d.titulo,rev}],by:uname(),obs:''});
  L('gdavisos').filter(a=>a.doc===id).forEach(a=>del('gdavisos',a.id));
  for(const f of fr)await save('gdavisos','a'+uid(),{obra:st.obra,frente:f.id,doc:id,codigo:d.codigo,titulo:d.titulo,rev,transmittal:trm,at,lidos:[]});
  if(old&&old.file&&old.file.id!==d.file.id)dropFile(old.file);
  const tm=await Promise.all(fr.map(f=>notifyTeams(f,nd,rev,trm)));
  const mails=fr.map(f=>f.email).filter(Boolean),subj='Nova revisão em vigor: '+d.codigo+' rev. '+rev,body='Foi publicada para obra a revisão '+rev+' do documento '+d.codigo+' — '+d.titulo+'.\n\nA revisão anterior deixou de ser válida e foi retirada da Biblioteca Obra.\n\nAbrir: '+link(id)+'\n\nTransmittal: '+trm;
  show(`<form><h2 style="margin:0">Publicado para obra</h2><p style="margin:0"><span class="gdcode">${esc(d.codigo)}</span> rev. <strong>${esc(rev)}</strong> · transmittal <strong>${esc(trm)}</strong></p>
   <ol class="gdsteps"><li>Estado «Pronto para Construção»${old?'; rev. '+esc(old.rev)+' marcada «Substituído»':''}.</li><li>PDF disponível na Biblioteca Obra (só leitura).</li><li>Distribuído a: ${fr.length?esc(fr.map(f=>f.nome).join(', ')):'<strong>nenhuma frente</strong> — a matriz não tem frentes para a especialidade '+esc(d.esp)}.</li>
   <li>Avisos: ${fr.length?fr.map((f,i)=>esc(f.nome)+' — na aplicação'+(tm[i]==='enviado'?', Teams enviado':tm[i]==='falhou'?', <strong>Teams falhou</strong>':'')).join('; '):'—'}.${mails.length?` <a class="btn ghost" href="mailto:${encodeURIComponent(mails.join(','))}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}">Enviar email às frentes</a>`:''}</li><li>Transmittal ${esc(trm)} registado.</li><li>Os dispositivos das frentes atualizam na próxima sincronização.</li></ol>
   <div class="actions"><button type="button" class="btn" data-gd="close">Fechar</button></div></form>`,true)}
function thumb(file,max,q){return new Promise((res,rej)=>{const im=new Image(),u=URL.createObjectURL(file);im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);res(c.toDataURL('image/jpeg',q))};im.onerror=()=>{URL.revokeObjectURL(u);rej()};im.src=u})}

document.addEventListener('submit',async e=>{const fm=e.target.closest&&e.target.closest('form[data-gdf]');if(!fm)return;e.preventDefault();
  const[k,arg]=fm.getAttribute('data-gdf').split(/:(.*)/),v=n=>fm.elements[n]?String(fm.elements[n].value).trim():'',btn=fm.querySelector('button[type=submit]');
  const cks=n=>[...fm.querySelectorAll(`[data-ck="${n}"] input:checked`)].map(i=>i.value);
  if(btn.disabled)return;
  try{
  if(k==='doc'){const d=arg?data.gdocs[arg]:null,lock=d&&(d.transmittal||d.ifc),codigo=lock?d.codigo:codeOf(fm);
    if(!RE.test(codigo))return toast('Código inválido. Formato: PROJETO-EMISSOR-ESPECIALIDADE-TIPO-0001.');
    if(L('gdocs').some(x=>x.codigo===codigo&&x.id!==arg))return toast('Já existe um documento com o código '+codigo+'.');
    const sg=codigo.split('-');
    save('gdocs',arg||'d'+uid(),{...(d||{obra:st.obra,rev:v('rev').toUpperCase()||'A',estado:'Em elaboração',cod:'',transmittal:'',dEnvio:'',dResp:'',file:null,ifc:null,hist:[]}),codigo,esp:sg[2],tipo:sg[3],titulo:v('titulo'),resp:v('resp')});hide();toast('Guardado: '+codigo);return}
  if(k==='up'||k==='rev'){const d={...data.gdocs[arg]},file=fm.elements.file.files[0];
    if(file){if(!/pdf$/i.test(file.type)&&!/\.pdf$/i.test(file.name))return toast('Carregue o documento em PDF.');if(file.size>MAXMB*1048576)return toast('O ficheiro tem mais de '+MAXMB+' MB.');if((window.enlSync||{}).offline)return toast('Sem internet: o carregamento de PDF precisa de ligação.')}
    if(k==='rev'){const nr=v('rev').toUpperCase();if(!nr||nr===String(d.rev)||(d.hist||[]).some(h=>String(h.rev)===nr))return toast('Essa revisão já existe neste documento.')}
    btn.disabled=true;let f=null;
    if(file){const pg=$('#gdprog');try{f=await upload(file,(i,n)=>{if(pg)pg.textContent='A carregar… '+Math.round(100*i/n)+' %'})}catch(x){btn.disabled=false;return toast('Não foi possível carregar o ficheiro. Verifique a ligação e tente outra vez.')}}
    if(k==='up'){const old=d.file;d.file=f;await save('gdocs',arg,d);if(old)dropFile(old)}
    else{const keepFile=d.ifc&&d.file&&d.ifc.file&&d.ifc.file.id===d.file.id;
      if(!(d.ifc&&String(d.ifc.rev)===String(d.rev)))d.hist=(d.hist||[]).concat([{rev:d.rev,estado:'Substituído',cod:d.cod||'',file:keepFile?null:d.file,at:now(),transmittal:d.transmittal||'',nota:v('nota')}]);
      Object.assign(d,{rev:v('rev').toUpperCase(),estado:'Em elaboração',cod:'',transmittal:'',dEnvio:'',dResp:'',file:f});await save('gdocs',arg,d)}
    hide();toast(k==='up'?'PDF carregado.':'Revisão '+d.rev+' criada.'+(inForce(d)?' A rev. '+d.ifc.rev+' continua em vigor na obra até à nova publicação.':' A anterior ficou «Substituído».'));return}
  if(k==='send'){const ids=arg.split(','),trm=nextTrm('TRM'),dia=v('data');
    await save('gdtrans','t'+uid(),{obra:st.obra,numero:trm,sentido:'Saída',motivo:'Para aprovação',data:dia,de:'ENERLINE',para:v('para'),docs:ids.map(i=>({id:i,codigo:data.gdocs[i].codigo,titulo:data.gdocs[i].titulo,rev:data.gdocs[i].rev})),obs:v('obs'),by:uname()});
    ids.forEach(i=>save('gdocs',i,{...data.gdocs[i],estado:'Em aprovação',transmittal:trm,dEnvio:dia,dResp:'',cod:''}));hide();toast('Transmittal '+trm+' emitido.');return}
  if(k==='resp'){const d={...data.gdocs[arg]},cod=v('cod'),dia=v('data'),num=nextTrm('REC');
    await save('gdtrans','t'+uid(),{obra:st.obra,numero:num,sentido:'Entrada',motivo:'Resposta',data:dia,de:v('de'),para:'ENERLINE',ref:v('ref'),docs:[{id:arg,codigo:d.codigo,titulo:d.titulo,rev:d.rev}],obs:'Código '+cod+(v('obs')?' · '+v('obs'):''),by:uname()});
    const out=L('gdtrans').find(t=>t.numero===d.transmittal);if(out&&!out.respondido){const{id:tid,...rest}=out;save('gdtrans',tid,{...rest,respondido:dia})}
    save('gdocs',arg,{...d,cod,dResp:dia,estado:cod==='A'?'Aprovado':cod==='B'?'Aprovado com comentários':'Em elaboração'});hide();toast(cod==='C'?'Rejeitado (C): crie uma nova revisão.':'Resposta registada. Já pode publicar para obra.');return}
  if(k==='pub'){btn.disabled=true;const rev=v('rev'),d=data.gdocs[arg];if(d.ifc&&+rev<=+d.ifc.rev){btn.disabled=false;return toast('A revisão para construção tem de ser superior à que está em vigor ('+d.ifc.rev+').')}await publish(arg,rev,v('data'));return}
  if(k==='fr'){const o=arg?data.gdfrentes[arg]:{obra:st.obra},t=v('teams');if(t&&!/^https:\/\//.test(t))return toast('O webhook do Teams tem de começar por https://');
    save('gdfrentes',arg||'fr'+uid(),{...o,nome:v('nome'),resp:v('resp'),email:v('email'),teams:t,esp:cks('esp'),users:cks('users')});hide();return}
  if(k==='in'){save('gdtrans','t'+uid(),{obra:st.obra,numero:nextTrm('REC'),sentido:'Entrada',motivo:v('motivo'),data:v('data'),de:v('de'),para:'ENERLINE',ref:v('ref'),docs:[],obs:v('obs'),by:uname()});hide();return}
  if(k==='fb'){btn.disabled=true;const d=data.gdocs[v('doc')],fotos=[];
    for(const file of [...fm.elements.fotos.files].slice(0,4)){try{const pid='p'+uid(),full=await thumb(file,1400,.72),t=await thumb(file,180,.6);db.collection('gdfiles').doc(pid).set({obra:st.obra,file:pid,i:0,n:1,d:full}).catch(()=>{});fotos.push({id:pid,t})}catch(x){}}
    save('gdretorno','r'+uid(),{obra:st.obra,frente:v('frente'),doc:d?v('doc'):'',codigo:d?d.codigo:'',rev:d&&d.ifc?d.ifc.rev:'',tipo:v('tipo'),texto:v('texto'),fotos,autor:st.user,autorNome:uname(),at:now(),estado:'Aberto'});hide();toast((window.enlSync||{}).offline?'Guardado no dispositivo. Será enviado quando houver internet.':'Enviado à gestão documental.');return}
  if(k==='answer'){const r=data.gdretorno[arg];save('gdretorno',arg,{...r,resposta:v('resposta'),respBy:uname(),respAt:now(),estado:r.estado==='Incorporado'?r.estado:'Respondido'});hide();return}
  if(k==='imp'){const lines=v('txt').split(/\r?\n/).map(l=>l.split(/[;\t]/).map(x=>x.trim())).filter(l=>l[0]);let ok=0,bad=[];const seen=new Set(L('gdocs').map(x=>x.codigo));
    for(const l of lines){const c=l[0].toUpperCase();if(/^c[óo]digo$/i.test(l[0]))continue;if(!RE.test(c)||!ESP[c.split('-')[2]]||!TIPO[c.split('-')[3]]||seen.has(c)||!l[1]){bad.push(l[0]);continue}seen.add(c);const sg=c.split('-');
      save('gdocs','d'+uid(),{obra:st.obra,codigo:c,esp:sg[2],tipo:sg[3],titulo:l[1],resp:l[2]||'',rev:(l[3]||'A').toUpperCase(),estado:'Em elaboração',cod:'',transmittal:'',dEnvio:'',dResp:'',file:null,ifc:null,hist:[]});ok++}
    hide();toast(ok+' documento'+(ok===1?'':'s')+' adicionado'+(ok===1?'':'s')+(bad.length?'. Ignorados (código inválido ou repetido): '+bad.slice(0,5).join(', ')+(bad.length>5?'…':''):'.'));return}
  }catch(x){console.error(x);btn.disabled=false;toast('Não foi possível concluir. Tente outra vez.')}
});
document.addEventListener('input',e=>{if(e.target.closest&&e.target.closest('form[data-gdf^="doc:"]'))codePrev()});
document.addEventListener('change',e=>{const t=e.target;
  if(t.name==='gdf_esp'||t.name==='gdf_est'){st.gdf={...(st.gdf||{}),[t.name==='gdf_esp'?'esp':'est']:t.value};render();return}
  if(t.name==='gdr_tipo'||t.name==='gdr_est'){st.gdr={...(st.gdr||{}),[t.name==='gdr_tipo'?'tipo':'est']:t.value};render();return}
  if(t.id==='gdfrsel'){st.gdfr=t.value;render();return}
  const mx=t.getAttribute&&t.getAttribute('data-gdmx');if(mx){const[fid,k]=mx.split(':'),f=data.gdfrentes[fid];if(!f||!isGD())return;const s=new Set(f.esp||[]);t.checked?s.add(k):s.delete(k);save('gdfrentes',fid,{...f,esp:[...s]})}});
document.addEventListener('click',async e=>{const el=e.target.closest&&e.target.closest('[data-gd]');if(!el)return;
  if(e.target.closest('.gdck'))return;
  if(el.hasAttribute('data-danger')&&!el.classList.contains('armed'))return; /* 1.º clique: a aplicação pede confirmação */
  const[a,id,x]=el.getAttribute('data-gd').split(':');
  if(a==='fbdoc'||a==='foto'||a==='answer'||a==='incorp')e.stopPropagation();
  const need=()=>{if(isGD()&&canEdit())return true;toast('Só a gestão documental pode fazer esta operação.');return false};
  if(a==='close')return hide();
  if(a==='doc')return docCard(id);
  if(a==='demo')return need()&&demo();
  if(a==='newdoc')return need()&&docForm();
  if(a==='edit')return need()&&docForm(id);
  if(a==='deldoc'){if(!need())return;const d=data.gdocs[id];if(d.file)dropFile(d.file);del('gdocs',id);hide();return}
  if(a==='up')return need()&&upForm(id,false);
  if(a==='rev')return need()&&upForm(id,true);
  if(a==='send')return need()&&sendForm([id]);
  if(a==='sendsel')return need()&&sendForm([...document.querySelectorAll('.gdck:checked')].map(i=>i.value));
  if(a==='resp')return need()&&respForm(id);
  if(a==='pub')return need()&&pubForm(id);
  if(a==='arch'){if(!need())return;const d=data.gdocs[id];if(d.estado==='Pronto para Construção'&&!el.classList.contains('armed2')){el.classList.add('armed2');el.textContent='Confirmar: sai da Biblioteca Obra';return}
    L('gdavisos').filter(v=>v.doc===id).forEach(v=>del('gdavisos',v.id));save('gdocs',id,{...d,estado:'Arquivado'});hide();toast('Documento arquivado.');return}
  if(a==='view'){const d=data.gdocs[id];return openDoc(d.file,d.codigo+' · rev. '+d.rev,esc(d.titulo)+' · '+esc(d.estado))}
  if(a==='hview'){const d=data.gdocs[id],h=d.hist[+x];return openDoc(h.file,d.codigo+' · rev. '+h.rev+' (SUBSTITUÍDO)','<strong style="color:var(--bad)">Revisão substituída: não usar em obra.</strong>')}
  if(a==='open'){const d=data.gdocs[id];if(!d||!d.ifc)return toast('Este documento já não está em vigor.');
    if(canEdit())L('gdavisos').filter(v=>v.doc===id&&!(v.lidos||[]).includes(st.user)).forEach(v=>{const{id:aid,...r}=v;save('gdavisos',aid,{...r,lidos:[...(r.lidos||[]),st.user]})});
    return openDoc(d.ifc.file,d.codigo+' · rev. '+d.ifc.rev,esc(d.titulo)+' · <strong>Em vigor</strong> desde '+fdt(d.ifc.at)+' · transmittal '+esc(d.ifc.transmittal||'—'))}
  if(a==='offall'){if((window.enlSync||{}).offline)return toast('Sem internet.');toast('A guardar os documentos em vigor neste dispositivo…');await syncFiles(true);render();return toast('Documentos em vigor guardados para uso sem internet.')}
  if(a==='newfb'||a==='fbdoc'){if(!canEdit())return toast('Este perfil só pode consultar.');return fbForm(a==='fbdoc'?id:'')}
  if(a==='foto'){show('<form><div id="gdv" class="empty">A abrir…</div><div class="actions"><button type="button" class="btn ghost" data-gd="close">Fechar</button></div></form>',true);try{const r=await db.collection('gdfiles').doc(id).get();$('#gdv').outerHTML=`<img alt="Fotografia" style="max-width:100%;border-radius:6px" src="${r.data().d}">`}catch(x){const v=$('#gdv');if(v)v.textContent='Fotografia ainda não disponível (sem internet ou por sincronizar).'}return}
  if(a==='answer'){if(!need())return;const r=data.gdretorno[id];return show(form('answer:'+id,'Responder à frente',`<p class="meta" style="margin:0">${esc(r.tipo)} · ${esc(r.codigo||'')} · ${esc(r.autorNome||'')}</p><div>${esc(r.texto)}</div><div class="fields">${F('Resposta',`<textarea name="resposta" rows="4" required>${esc(r.resposta||'')}</textarea>`,1)}</div>`,'Guardar resposta'))}
  if(a==='incorp'){if(!need())return;const r=data.gdretorno[id];save('gdretorno',id,{...r,estado:'Incorporado',incBy:uname(),incAt:now()});return}
  if(a==='newfr')return need()&&frForm();
  if(a==='fr')return need()&&frForm(id);
  if(a==='delfr'){if(!need())return;L('gdavisos').filter(v=>v.frente===id).forEach(v=>del('gdavisos',v.id));del('gdfrentes',id);hide();return}
  if(a==='trm')return trmCard(id);
  if(a==='printtrm')return printTrm(id);
  if(a==='newin')return need()&&inForm();
  if(a==='impdocs')return need()&&show(form('imp:','Importar lista de documentos previstos','<div class="fields">'+F('Uma linha por documento: código ; título ; responsável ; revisão','<textarea name="txt" rows="9" required placeholder="QLB-ENL-ELE-DWG-0001;Esquema unifilar geral;Eng. Sofia;A"></textarea>',1)+'</div><p class="help">Pode colar diretamente do Excel (colunas separadas por tabulação). Códigos inválidos ou repetidos são ignorados.</p>','Importar'));
  if(a==='csvmdl')return csv('MDL-'+proj()+'.csv',['Código','Título','Especialidade','Tipo','Revisão atual','Estado','Código de aprovação','Transmittal','Data de envio','Data de resposta','Responsável','Rev. em vigor na obra'],L('gdocs').sort((p,q)=>p.codigo.localeCompare(q.codigo)).map(d=>[d.codigo,d.titulo,ESP[d.esp]||d.esp,TIPO[d.tipo]||d.tipo,d.rev,d.estado,d.cod,d.transmittal,fdate(d.dEnvio),fdate(d.dResp),d.resp,inForce(d)?d.ifc.rev:'']));
  if(a==='csvtrm')return csv('Transmittals-'+proj()+'.csv',['Número','Sentido','Data','Motivo','De','Para','Referência externa','Documentos','Observações','Resposta'],L('gdtrans').sort((p,q)=>p.numero.localeCompare(q.numero)).map(t=>[t.numero,t.sentido,fdate(t.data),t.motivo,t.de,t.para,t.ref||'',(t.docs||[]).map(d=>d.codigo+' rev. '+d.rev).join(' | '),t.obs||'',t.respondido?fdate(t.respondido):'']));
  if(a==='csvret')return csv('Red-lines-'+proj()+'.csv',['Data','Tipo','Documento','Revisão','Frente','Autor','Descrição','Estado','Resposta','Fotografias'],L('gdretorno').filter(r=>r.tipo==='Red-line').sort((p,q)=>(p.codigo+p.at).localeCompare(q.codigo+q.at)).map(r=>[fdt(r.at),r.tipo,r.codigo,r.rev,(data.gdfrentes[r.frente]||{}).nome||'',r.autorNome,r.texto,r.estado,r.resposta||'',(r.fotos||[]).length]));
},true);
/* ---------- documentos de exemplo ---------- */
function demoPdf(d,rev,stamp,obra){const J=window.jspdf&&window.jspdf.jsPDF;if(!J)return null;const dwg=d.tipo==='DWG',p=new J({orientation:dwg?'landscape':'portrait',unit:'mm',format:dwg?'a3':'a4'}),W=p.internal.pageSize.getWidth(),H=p.internal.pageSize.getHeight();
  let sd=0;for(const c of d.codigo)sd=(sd*31+c.charCodeAt(0))%9973;const rnd=()=>{sd=(sd*137+71)%9973;return sd/9973};
  p.setDrawColor(50);p.setLineWidth(.7);p.rect(10,10,W-20,H-20);p.setLineWidth(.2);
  p.setTextColor(232);p.setFont('helvetica','bold');p.setFontSize(dwg?120:90);p.text('EXEMPLO',W/2,H/2+10,{align:'center',angle:25});p.setTextColor(30);
  if(dwg){const x0=28,y0=28,w=W-56,h=H-110;
    if(['ELE','INS','SUB','PCC','FOT'].includes(d.esp)){p.setLineWidth(.9);p.line(x0,y0+18,x0+w,y0+18);p.setFontSize(9);p.setFont('helvetica','normal');p.text(d.esp==='FOT'?'Barramento de média tensão 30 kV':'Barramento 220 kV',x0,y0+13);
      for(let i=0;i<6;i++){const x=x0+20+i*(w-40)/5;p.setLineWidth(.4);p.line(x,y0+18,x,y0+50);p.rect(x-4,y0+50,8,8);p.line(x,y0+58,x,y0+80);p.circle(x,y0+90,10);p.circle(x,y0+104,10);p.line(x,y0+114,x,y0+140);p.line(x-6,y0+140,x+6,y0+140);p.text((d.esp==='FOT'?'Inversor ':d.esp==='PCC'||d.esp==='INS'?'Proteção ':'Painel ')+(i+1),x-9,y0+150)}
      p.setLineWidth(.9);p.line(x0,y0+140,x0+w,y0+140);p.text(d.esp==='FOT'?'Strings de corrente contínua':'Barramento 60 kV',x0,y0+136)}
    else{p.setLineWidth(.4);for(let i=0;i<7;i++){const bw=24+rnd()*30,bh=18+rnd()*26,x=x0+10+i*(w-60)/6,y=y0+20+(i%2)*70+rnd()*12;p.rect(x,y,bw,bh);p.setLineDashPattern([2,2],0);p.line(x+bw/2,y-8,x+bw/2,y+bh+8);p.line(x-8,y+bh/2,x+bw+8,y+bh/2);p.setLineDashPattern([],0);p.setFontSize(8);p.setFont('helvetica','normal');p.text((d.esp==='CIV'?'M':d.esp==='LIN'?'AP':'P')+(i+1)+'  '+bw.toFixed(1)+' x '+bh.toFixed(1),x,y+bh+13)}
      p.setFontSize(9);p.text('Cotas em metros. Eixos de referência a traço interrompido.',x0,y0+h)}}
  else{p.setFont('helvetica','bold');p.setFontSize(16);p.text(d.titulo,20,34,{maxWidth:W-40});p.setFont('helvetica','normal');p.setFontSize(11);
    ['1. Objetivo','2. Âmbito de aplicação','3. Documentos de referência','4. Requisitos','5. Responsabilidades','6. Registos'].forEach((t,i)=>{const y=58+i*30;p.setFont('helvetica','bold');p.text(t,20,y);p.setFont('helvetica','normal');p.setTextColor(110);p.text('Texto de exemplo criado para demonstrar a gestão documental da obra. Substituir pelo conteúdo real do documento.',20,y+7,{maxWidth:W-40});p.setTextColor(30)})}
  const bx=W-10-150,by=H-10-46;p.setLineWidth(.5);p.rect(bx,by,150,46);p.line(bx,by+14,bx+150,by+14);p.line(bx,by+30,bx+150,by+30);p.line(bx+105,by+14,bx+105,by+46);
  p.setFont('helvetica','bold');p.setFontSize(13);p.setTextColor(61,111,6);p.text('ENERLINE',bx+4,by+9.5);p.setTextColor(30);p.setFont('helvetica','normal');p.setFontSize(8);p.text(String(obra||'').slice(0,58),bx+40,by+9);
  p.setFontSize(9);p.text(p.splitTextToSize(d.titulo,98).slice(0,2),bx+4,by+20.5);p.setFont('helvetica','bold');p.setFontSize(11);p.text(d.codigo,bx+4,by+40);
  p.setFontSize(8);p.setFont('helvetica','normal');p.text('Revisão',bx+109,by+19);p.text('Data',bx+109,by+35);p.setFont('helvetica','bold');p.setFontSize(15);p.text(String(rev),bx+109,by+27.5);p.setFontSize(10);p.text(fdate(today()),bx+109,by+42);
  const ifc=/CONSTRU/.test(stamp);p.setDrawColor(ifc?61:192,ifc?111:138,ifc?6:30);p.setTextColor(ifc?61:192,ifc?111:138,ifc?6:30);p.setLineWidth(.8);{const sx=dwg?bx-78:bx+80,sy=dwg?by+26:by-20;p.rect(sx,sy,70,14);p.setFontSize(10);p.text(stamp,sx+35,sy+9,{align:'center'})}
  const b=p.output('blob');return new File([b],d.codigo+'_rev'+rev+'.pdf',{type:'application/pdf'})}
async function demo(auto){if(L('gdocs').length)return auto||toast('A lista já tem documentos.');const OBR=st.obra;if(!(window.jspdf&&window.jspdf.jsPDF))return auto||toast('Não foi possível criar os PDF de exemplo. Recarregue a página com internet e tente outra vez.');
  if((window.enlSync||{}).offline)return auto||toast('Sem internet: os documentos de exemplo precisam de ligação.');
  const P=proj(),ob=(data.obras[OBR]||{}).nome||'',day=n=>{const d=new Date();d.setDate(d.getDate()-n);return iso(d)},at=n=>day(n)+'T10:00';
  const tp=(data.obras[OBR]||{}).tipo||'';
  const BASE=[['HSE','PLN',1,'Plano de segurança e saúde da obra','Técnico HST','ifc0'],['QUA','PRO',1,'Procedimento de controlo de documentos da obra','Gestão documental','ifc0'],['GER','PLN',1,'Plano de execução da obra','Diretor de obra','plan']];
  const SETS={'Linha aérea':[['LIN','DWG',1,'Planta e perfil longitudinal da linha','Projetista de linhas','ifc1'],['LIN','DWG',2,'Silhuetas dos apoios e cadeias de isoladores','Projetista de linhas','ifc0'],['LIN','LST',1,'Lista de apoios e tabela de regulação de condutores','Projetista de linhas','B'],['LIN','SPC',1,'Especificação do cabo de guarda com fibra ótica (OPGW)','Eng. eletrotécnico','sent'],['TOP','DWG',1,'Levantamento topográfico do traçado','Topógrafo','ifc0'],['CIV','DWG',1,'Fundações dos apoios, tipos e dimensões','Eng. civil','ifc0'],['CIV','CAL',1,'Nota de cálculo das fundações dos apoios','Eng. civil','draft'],['EST','DWG',1,'Estrutura metálica dos apoios treliçados','Eng. de estruturas','sent'],['LIN','MTD',1,'Método de desenrolamento e regulação de condutores','Diretor de obra','A'],['LIN','ENS',1,'Protocolo de ensaios e comissionamento da linha','Eng. eletrotécnico','plan']],
   'Central solar fotovoltaica':[['FOT','DWG',1,'Implantação geral do campo solar','Projetista','ifc1'],['FOT','DWG',2,'Esquema de strings e caixas de junção','Eng. eletrotécnico','ifc0'],['ELE','DWG',1,'Esquema unifilar de média tensão','Eng. eletrotécnico','B'],['FOT','DTS',1,'Folha de dados dos módulos e inversores','Eng. eletrotécnico','sent'],['CIV','DWG',1,'Valas de cabos e maciços dos postos de transformação','Eng. civil','ifc0'],['EST','CAL',1,'Nota de cálculo das estruturas de suporte','Eng. de estruturas','draft'],['SUB','DWG',1,'Subestação elevadora, planta e cortes','Eng. eletrotécnico','sent'],['FOT','ENS',1,'Protocolo de ensaio de strings (curvas I-V)','Eng. eletrotécnico','A'],['TOP','DWG',1,'Levantamento topográfico do terreno','Topógrafo','ifc0'],['PCC','DWG',1,'Arquitetura do sistema de monitorização (SCADA)','Eng. de automação','plan']],
   'Telecomunicações':[['TEL','DWG',1,'Traçado da rede primária de fibra ótica','Projetista de redes','ifc1'],['TEL','DWG',2,'Esquema de fusões e ocupação de fibras','Projetista de redes','ifc0'],['TEL','LST',1,'Lista de caixas de emenda e armários de rua','Projetista de redes','B'],['TEL','SPC',1,'Especificação do cabo de fibra ótica','Eng. de telecomunicações','sent'],['CIV','DWG',1,'Valas, tritubo e câmaras de visita','Eng. civil','ifc0'],['EST','DWG',1,'Torre treliçada de 45 m, estrutura e fundação','Eng. de estruturas','ifc0'],['EST','CAL',1,'Nota de cálculo da fundação da torre','Eng. de estruturas','draft'],['ELE','DWG',1,'Sistema de energia da estação (retificadores e baterias)','Eng. eletrotécnico','sent'],['TEL','ENS',1,'Protocolo de ensaios de refletometria (OTDR)','Eng. de telecomunicações','A'],['TEL','REL',1,'Relatório de levantamento de campo (site survey)','Projetista de redes','plan']],
   'Rede de gás':[['GAS','DWG',1,'Traçado geral da rede de gás','Projetista','ifc1'],['GAS','DWG',2,'Perfil longitudinal e pormenores de vala','Projetista','ifc0'],['GAS','SPC',1,'Especificação de tubagem e acessórios','Eng. mecânico','B'],['GAS','PRO',1,'Procedimento de soldadura de PEAD','Eng. mecânico','sent'],['GAS','DWG',3,'Posto de regulação e medida, implantação','Eng. mecânico','ifc0'],['CIV','DWG',1,'Travessias e reposição de pavimentos','Eng. civil','ifc0'],['GAS','CAL',1,'Nota de cálculo hidráulico da rede','Eng. mecânico','draft'],['GAS','ENS',1,'Protocolo de ensaio de resistência e estanquidade','Eng. mecânico','sent'],['HSE','PRO',1,'Procedimento de trabalhos em atmosferas explosivas','Técnico HST','A'],['TOP','DWG',1,'Levantamento topográfico e serviços enterrados','Topógrafo','plan']],
   'Rede de distribuição':[['ELE','DWG',1,'Planta geral da rede de média e baixa tensão','Projetista','ifc1'],['ELE','DWG',2,'Esquema unifilar dos postos de transformação','Eng. eletrotécnico','ifc0'],['ELE','LST',1,'Lista de postes e vãos','Projetista','B'],['ELE','SPC',1,'Especificação do cabo torçada e acessórios','Eng. eletrotécnico','sent'],['ELE','DWG',3,'Rede de iluminação pública','Projetista','ifc0'],['CIV','DWG',1,'Maciços dos postes e dos postos de transformação','Eng. civil','ifc0'],['CIV','CAL',1,'Nota de cálculo dos maciços','Eng. civil','draft'],['TOP','DWG',1,'Levantamento topográfico das aldeias','Topógrafo','sent'],['ELE','ENS',1,'Protocolo de ensaios e ligação à rede','Eng. eletrotécnico','A'],['ELE','LST',2,'Lista de ramais domiciliários e contadores','Projetista','plan']]};
  const SE=[['SUB','DWG',1,'Esquema unifilar geral','Eng. eletrotécnico','ifc1'],['SUB','DWG',2,'Planta de implantação dos equipamentos de alta tensão','Eng. eletrotécnico','ifc0'],['ELE','SPC',1,'Especificação técnica de cabos de potência e comando','Eng. eletrotécnico','B'],['ELE','LST',1,'Lista de cabos de potência e comando','Projetista elétrico','sent'],['CIV','DWG',1,'Planta de fundações dos pórticos','Eng. civil','ifc0'],['CIV','DWG',2,'Maciços dos transformadores de potência','Eng. civil','A'],['CIV','CAL',1,'Nota de cálculo das fundações','Eng. civil','draft'],['EST','DWG',1,'Estrutura metálica dos pórticos','Eng. de estruturas','sent'],['MEC','DTS',1,'Folha de dados do transformador de potência','Eng. eletromecânico','plan'],['PCC','DWG',1,'Arquitetura do sistema de proteção, comando e controlo','Eng. de automação','ifc0']];
  const DOCS=[...(SETS[tp]||SE),...BASE];
  const t=$('#toast'),say=m=>{t.textContent=m;t.hidden=false};say('A criar documentos de exemplo…');
  let frs=L('gdfrentes');
  if(!frs.length){[['Frente Civil',['CIV','EST','TOP','GER','HSE','QUA']],['Frente de Montagem',['LIN','SUB','ELE','MEC','FOT','TEL','GAS','EST','GER','HSE','QUA']],['Frente de Ensaios e comissionamento',['PCC','INS','ELE','SUB','LIN','FOT','TEL','GAS','GER','HSE','QUA']]].forEach(([nome,esp],i)=>save('gdfrentes','gxf'+OBR+i,{obra:OBR,nome,resp:'',email:'',teams:'',esp,users:[],exemplo:true}));frs=L('gdfrentes')}
  let nK=0,nR=0;const OUT=[],put=(c,id,o)=>OUT.push([c,id,o]),trm=()=>'@@'+(++nK)+'@',rec=()=>'@@'+(++nK)+'@',who='Gestão documental ENERLINE',apr='Fiscalização / Dono de obra',T=[];
  const out=(d,rev,n,motivo,para)=>{const num=trm();T.push({obra:OBR,numero:num,sentido:'Saída',motivo,data:day(n),de:motivo==='Para aprovação'?'ENERLINE':who,para,docs:[{id:d.id,codigo:d.codigo,titulo:d.titulo,rev}],obs:'',by:who,exemplo:true,...(d._resp?{respondido:d._resp}:{})});return num};
  const inn=(d,rev,n,cod)=>{T.push({obra:OBR,numero:rec(),sentido:'Entrada',motivo:'Resposta',data:day(n),de:apr,para:'ENERLINE',ref:'FISC-TR-'+String(100+(++nR)).padStart(4,'0'),docs:[{id:d.id,codigo:d.codigo,titulo:d.titulo,rev}],obs:'Código '+cod,by:who,exemplo:true})};
  let i=0;
  for(const[esp,tipo,n,titulo,resp,stg]of DOCS){i++;say('A criar documentos de exemplo… '+i+' de '+DOCS.length);
    const id='gxd'+OBR+'_'+i,d={id,obra:OBR,codigo:[P,'ENL',esp,tipo,String(n).padStart(4,'0')].join('-'),esp,tipo,titulo,resp,rev:'A',estado:'Em elaboração',cod:'',transmittal:'',dEnvio:'',dResp:'',file:null,ifc:null,hist:[],exemplo:true};
    const mk=async(rev,stamp)=>upload(demoPdf(d,rev,stamp,ob));
    const targets_=()=>frs.filter(f=>(f.esp||[]).includes(esp));
    const pubTo=(rev,nd)=>{const num=out(d,rev,nd,'Para construção',targets_().map(f=>f.nome).join(', ')||'Sem frentes na matriz');return num};
    try{
    if(stg==='draft')d.file=await mk('A','PARA APROVAÇÃO');
    if(stg==='sent'){d.file=await mk('A','PARA APROVAÇÃO');d.transmittal=out(d,'A',5,'Para aprovação',apr);d.dEnvio=day(5);d.estado='Em aprovação'}
    if(stg==='A'||stg==='B'){d.file=await mk('A','PARA APROVAÇÃO');d._resp=day(3);d.transmittal=out(d,'A',9,'Para aprovação',apr);inn(d,'A',3,stg);d.dEnvio=day(9);d.dResp=day(3);d.cod=stg;d.estado=stg==='A'?'Aprovado':'Aprovado com comentários'}
    if(stg==='ifc0'){d._resp=day(14);const t1=out(d,'A',20,'Para aprovação',apr);inn(d,'A',14,'A');d.file=await mk('0','BOM PARA CONSTRUÇÃO');const t2=pubTo('0',12);
      Object.assign(d,{rev:'0',estado:'Pronto para Construção',cod:'A',transmittal:t2,dEnvio:day(12),dResp:day(14),hist:[{rev:'A',estado:'Substituído',cod:'A',file:null,at:at(12),transmittal:t1,nota:'Aprovada; emitida para construção como rev. 0'}],ifc:{rev:'0',file:d.file,at:at(12),by:who,transmittal:t2}})}
    if(stg==='ifc1'){d._resp=day(40);const t1=out(d,'A',45,'Para aprovação',apr);inn(d,'A',40,'B');const t2=pubTo('0',38);d._resp=day(6);const t3=out(d,'B',10,'Para aprovação',apr);inn(d,'B',6,'A');d.file=await mk('1','BOM PARA CONSTRUÇÃO');const t4=pubTo('1',2);
      Object.assign(d,{rev:'1',estado:'Pronto para Construção',cod:'A',transmittal:t4,dEnvio:day(2),dResp:day(6),hist:[{rev:'A',estado:'Substituído',cod:'B',file:null,at:at(38),transmittal:t1,nota:'Aprovada com comentários; emitida para construção como rev. 0'},{rev:'B',estado:'Substituído',cod:'A',file:null,at:at(2),transmittal:t3,nota:'Aprovada; emitida para construção como rev. 1'},{rev:'0',estado:'Substituído',cod:'',file:null,at:at(2),transmittal:t2,nota:'Substituída pela rev. 1'}],ifc:{rev:'1',file:d.file,at:at(2),by:who,transmittal:t4}})}
    }catch(x){console.error(x);return toast('Não foi possível criar os documentos de exemplo. Verifique a ligação.')}
    const{id:_i,_resp,...clean}=d;put('gdocs',id,clean);
    if(clean.ifc)targets_().forEach((f,k)=>put('gdavisos','gxa'+OBR+'_'+i+'_'+k,{obra:OBR,frente:f.id,doc:id,codigo:d.codigo,titulo,rev:clean.ifc.rev,transmittal:clean.ifc.transmittal,at:clean.ifc.at,lidos:[],exemplo:true}));
    if(stg==='ifc1'){const f=frs.find(f=>f.nome==='Frente de Montagem')||frs[0];put('gdretorno','gxr'+OBR+'a',{obra:OBR,frente:f?f.id:'',doc:id,codigo:d.codigo,rev:'1',tipo:'Dúvida',texto:'O material entregue em obra não coincide com o indicado na rev. 1 deste documento ('+titulo+'). Qual prevalece: o documento ou o material recebido?',fotos:[],autor:'',autorNome:'Encarregado da frente de montagem',at:at(1),estado:'Aberto',exemplo:true})}
    if(esp==='CIV'&&stg==='ifc0'){const f=frs.find(f=>f.nome==='Frente Civil')||frs[0];put('gdretorno','gxr'+OBR+'b',{obra:OBR,frente:f?f.id:'',doc:id,codigo:d.codigo,rev:'0',tipo:'Red-line',texto:'Execução deslocada 0,40 m para norte por interferência com uma infraestrutura enterrada existente. Cotas reais marcadas a vermelho na cópia de obra de «'+titulo+'».',fotos:[],autor:'',autorNome:'Encarregado da frente civil',at:at(4),estado:'Respondido',resposta:'Alteração aceite pela fiscalização. Entra nas telas finais.',respBy:who,respAt:at(3),exemplo:true})}}
  const map={};let a=0,b=0;T.map((x,k)=>[x,k]).sort((x,y)=>x[0].data.localeCompare(y[0].data)||x[1]-y[1]).forEach(([x])=>{map[x.numero]=x.sentido==='Saída'?'TRM-'+P+'-'+String(++a).padStart(4,'0'):'REC-'+P+'-'+String(++b).padStart(4,'0')});
  const fix=o=>JSON.parse(JSON.stringify(o).replace(/@@\d+@/g,m=>map[m]||m));
  OUT.forEach(([c,id,o])=>save(c,id,fix(o)));T.forEach((x,k)=>save('gdtrans','gxt'+OBR+'_'+k,fix(x)));
  toast(DOCS.length+' documentos de exemplo criados, com frentes, transmittals e retorno de obra.')}
/* ligação direta a um documento: #gdobra/<id> */
function deep(){const m=location.hash.match(/^#gdobra\/(.+)$/);if(!m)return;const id=m[1],d=data.gdocs[id];if(!st.user||!d)return false;try{history.replaceState(null,'','#gdobra')}catch(e){}st.view='gdobra';render();el_open(id);return true}
function el_open(id){const b=document.createElement('button');b.setAttribute('data-gd','open:'+id);b.hidden=true;document.body.appendChild(b);b.click();b.remove()}
{let tries=0;const t=setInterval(()=>{if(!/^#gdobra\//.test(location.hash)||deep()||++tries>60)clearInterval(t)},700)}
window.addEventListener('hashchange',deep);
if(typeof db!=='undefined'&&db&&st.obra&&typeof subObra==='function')subObra();
window.GD={syncFiles,ifcDocs,show,hide,F,sel,csv,upload,blobOf,preview,dropFile,fdt,now,kb,openDoc,tile,head,loadPdf};
})();
