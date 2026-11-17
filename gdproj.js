/* ENERLINE – Doc. Obra: documentos de projecto (folhas de dados, memórias de cálculo, especificações) lidos do PDF,
   com o código do projectista, o n.º do cliente, as revisões e as características do equipamento que o documento define. */
(function(root){
const TP={FD:'DTS',DS:'DTS',MC:'CAL',NC:'CAL',DE:'DWG',DES:'DWG',DWG:'DWG',ET:'SPC',ES:'SPC',ESP:'SPC',PR:'PRO',PRO:'PRO',LM:'LST',LS:'LST',LT:'LST',LC:'LST',RL:'REL',RT:'REL',REL:'REL',MD:'MTD',PL:'PLN',PE:'ENS',TF:'TLF'};
const EP={EL:'ELE',ELE:'ELE',CV:'CIV',CIV:'CIV',ES:'EST',EST:'EST',MC:'MEC',MEC:'MEC',TL:'TEL',TEL:'TEL',PC:'PCC',PCC:'PCC',SE:'SUB',SUB:'SUB',LT:'LIN',LIN:'LIN',TP:'TOP',IN:'INS',AR:'ARQ',FV:'FOT',GS:'GAS',QA:'QUA',SMS:'HSE',HSE:'HSE'};
const TN=[[/folha\s+de\s+dados/i,'DTS'],[/mem[óo]ria\s+de\s+c[áa]lculo|memorial/i,'CAL'],[/especifica[cç][aã]o/i,'SPC'],[/desenho|diagrama|planta|esquema/i,'DWG'],[/procedimento/i,'PRO'],[/lista/i,'LST'],[/relat[óo]rio/i,'REL'],[/plano/i,'PLN'],[/ensaio|protocolo/i,'ENS'],[/m[ée]todo/i,'MTD']];
const sp=l=>l.trim().split(/\s{2,}/).map(x=>x.trim()).filter(Boolean);
function parse(lines){lines=(lines||[]).map(l=>String(l).replace(/\t/g,'   ').replace(/\s+$/,''));const r={revs:[],carac:[]};
  const ne=i=>{for(let j=i+1;j<Math.min(lines.length,i+5);j++)if(lines[j].trim())return j;return -1};
  /* capa */
  let iN=lines.findIndex(l=>/N[úu]mero\b.*\bCliente\b|N[úu]mero\s+do\s+documento/i.test(l));
  if(iN>=0){const j=ne(iN);if(j>=0){const p=sp(lines[j]);r.codigo=p[0]||'';if(p.length>=3){r.ncli=p[1];r.rev=p[2];r.folhas=p[3]||''}else if(p.length===2)r.rev=p[1]}}
  if(!r.codigo){const m=lines.slice(0,80).join(' ').match(/\b[A-Z0-9]{2,8}(?:-[A-Z0-9]{2,10}){3,8}\b/);if(m)r.codigo=m[0]}
  const iT=lines.findIndex(l=>/T[íi]tulo\s+do\s+Documento/i.test(l));
  if(iT>=0){const t=[];for(let j=iT+1;j<(iN>iT?iN:iT+5);j++)if(lines[j]&&lines[j].trim())t.push(lines[j].trim());r.tipoNome=t[0]||'';r.equip=t.slice(1).join(' ');r.titulo=t.join(' — ')}
  if(!r.titulo){const t=lines.slice(0,12).map(l=>l.trim()).filter(Boolean);r.titulo=t.slice(0,4).join(' — ')}
  const iI=lines.findIndex(l=>/Instala[cç][aã]o\s+Projec?to/i.test(l));if(iI>=0){const j=ne(iI);if(j>=0){const p=sp(lines[j]);r.inst=p[0]||'';r.projeto=p[1]||''}}
  if(!r.projeto){const f=lines.find(l=>l.trim());if(f)r.projeto=f.trim()}
  for(const l of lines.slice(0,Math.max(60,iN+3))){const m=l.match(/^\s*(\d{1,2}|[A-Z]\d?)\s{2,}(.+?)\s{2,}(\d{1,2}\/\d{1,2}\/\d{4})\s+(\S+)\s+(\S+)\s+(\S+)\s*$/);if(m)r.revs.push({rev:m[1],descr:m[2].trim(),data:m[3],exec:m[4],verif:m[5],aprov:m[6]})}
  if(!r.rev&&r.revs.length)r.rev=r.revs[0].rev;
  r.revs.sort((a,b)=>String(b.rev).localeCompare(String(a.rev),'pt',{numeric:true}));
  /* tabelas de características */
  const skip=new Set([r.projeto,r.tipoNome,r.equip,r.inst].filter(Boolean).map(x=>x.toUpperCase()));
  let cur=null,pend=null,last=null,wrap=false;const close=()=>{if(cur&&cur.r.length)r.carac.push(cur);cur=null;pend=null;last=null;wrap=false};
  for(const raw of lines){const l=raw.trim();if(!l){continue}
    const mt=l.match(/^Tabela\s+(\d+)\s*[–-]\s*(.+)$/i);
    if(mt){if(/\.{4,}/.test(l))continue;close();cur={t:mt[2].replace(/\s*Nota\s*\d+\s*$/i,'').trim(),h:null,r:[]};continue}
    if(!cur)continue;
    if(skip.has(l.toUpperCase())||/^\d{1,3}$/.test(l))continue;
    if(/^\d+(\.\d+)*\s+[A-ZÀ-Ú]{3}/.test(l)||/^(Nota|Obs\.?)\b/i.test(l)){close();continue}
    const p=sp(raw);
    if(!cur.h){if(p.length>=2){cur.h=p;continue}else continue}
    const n=cur.h.length;
    if(p.length>=2){if(pend&&p.length<n){last=[pend,...p];cur.r.push(last);wrap=true;pend=null}else{if(pend)cur.r.push([pend]);pend=null;last=p;cur.r.push(last);wrap=false}}
    else{if(wrap&&last&&/^[a-zà-ú(]/.test(l)){last[0]+=' '+l;wrap=false}else{if(pend)cur.r.push([pend]);pend=l}}}
  close();
  /* classificação */
  const sg=String(r.codigo||'').toUpperCase().split('-');r.tipo='';r.esp='';
  for(const s of sg){if(!r.tipo&&TP[s])r.tipo=TP[s]}for(const s of sg){if(!r.esp&&EP[s]&&TP[s]!==r.tipo)r.esp=EP[s]}
  if(r.tipoNome){const k=TN.find(x=>x[0].test(r.tipoNome));if(k)r.tipo=k[1]}
  if(!r.tipo){const k=TN.find(x=>x[0].test(r.titulo||''));r.tipo=k?k[1]:'SPC'}if(!r.esp)r.esp='ELE';
  if(r.tipo!=='DTS'&&r.tipo!=='SPC'&&!r.carac.length)r.equip='';
  return r}
const api={parse};
if(typeof module!=='undefined'&&module.exports){module.exports=api;return}
root.GDPARSE=api;
if(typeof VIEWS==='undefined'||!root.GD)return;
/* ---------- integração na aplicação ---------- */
const G=root.GD,{show,hide,F,sel,upload,blobOf,head,kb,loadPdf}=G;
const L=c=>Object.entries(data[c]||{}).filter(([,r])=>r.obra===st.obra).map(([id,r])=>({...r,id}));
const isGD=()=>{const u=me();return !u||['Administrador','Diretor de obra','Gestão documental'].includes(u.perfil)};
const ESPN={GER:'Geral',TOP:'Topografia e traçado',CIV:'Civil',EST:'Estruturas',LIN:'Linhas de transmissão',SUB:'Subestações',ELE:'Elétrica',PCC:'Proteção, comando e controlo',MEC:'Eletromecânica',INS:'Instrumentação',FOT:'Solar fotovoltaico',TEL:'Telecomunicações e fibra ótica',GAS:'Gás',ARQ:'Arquitetura',HSE:'Segurança e ambiente',QUA:'Qualidade'};
const TIPN={DWG:'Desenho',SPC:'Especificação',PRO:'Procedimento',CAL:'Nota de cálculo',LST:'Lista',DTS:'Folha de dados',MTD:'Método construtivo',PLN:'Plano',REL:'Relatório',ENS:'Protocolo de ensaio',TLF:'Tela final'};
{const i=VIEWS.findIndex(v=>v[0]==='gdobra');if(i>=0)VIEWS.splice(i+1,0,['gdequip','Equipamentos do projecto']);
 Object.values(PERF).forEach(p=>{if(Array.isArray(p.v)&&p.v.includes('gdobra')&&!p.v.includes('gdequip'))p.v.push('gdequip')});
 if(!S.gdequip)S.gdequip={title:'Equipamentos do projecto',cols:[],fields:[],sort:()=>0}}
const css=document.createElement('style');css.textContent=`
.gpc{margin-top:6px}.gpc summary{cursor:pointer;font-weight:700}.gpc table{width:100%;font-size:13px;border-collapse:collapse;margin:6px 0 10px}.gpc td,.gpc th{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}.gpc th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}.gpc tr.grp td{font-weight:700;background:var(--bg)}
.gpkv{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:13px}.gpkv span b{font-weight:600}
.gpsum{border:1px dashed var(--line);border-radius:8px;padding:8px 12px;font-size:14px}`;document.head.appendChild(css);
const tabHtml=c=>`<table><thead><tr>${(c.h||[]).map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${c.r.map(r=>r.length===1?`<tr class="grp"><td colspan="${(c.h||[]).length||1}">${esc(r[0])}</td></tr>`:`<tr>${r.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const nPar=d=>(d.carac||[]).reduce((a,c)=>a+c.r.filter(r=>r.length>1).length,0);
function cardExtra(d){if(!d||!(d.ext||d.equip||d.ncli||(d.carac||[]).length))return'';
  return `<div class="gpkv">${d.ncli?`<span>N.º do cliente: <b>${esc(d.ncli)}</b></span>`:''}${d.projeto?`<span>Projecto: <b>${esc(d.projeto)}</b></span>`:''}${d.inst?`<span>Instalação: <b>${esc(d.inst)}</b></span>`:''}${d.folhas?`<span>Folhas: <b>${esc(d.folhas)}</b></span>`:''}</div>
   ${d.equip?`<div>Equipamento definido por este documento: <strong>${esc(d.equip)}</strong></div>`:''}
   ${(d.revs||[]).length?`<details class="gpc"><summary>Revisões indicadas na capa do documento (${d.revs.length})</summary><table><thead><tr><th>Rev.</th><th>Descrição</th><th>Data</th><th>Execução</th><th>Verificação</th><th>Aprovação</th></tr></thead><tbody>${d.revs.map(x=>`<tr><td><strong>${esc(x.rev)}</strong></td><td>${esc(x.descr)}</td><td>${esc(x.data)}</td><td>${esc(x.exec)}</td><td>${esc(x.verif)}</td><td>${esc(x.aprov)}</td></tr>`).join('')}</tbody></table></details>`:''}
   ${(d.carac||[]).length?`<details class="gpc" open><summary>Características definidas pelo projecto (${nPar(d)} parâmetros)</summary>${d.carac.map(c=>`<div class="meta" style="margin-top:6px"><strong>${esc(c.t)}</strong></div>${tabHtml(c)}`).join('')}</details>`:''}`}
/* leitura do PDF */
async function readPdf(file){const P=await loadPdf(),pdf=await P.getDocument({data:await file.arrayBuffer()}).promise;let lines=[];
  for(let i=1;i<=Math.min(pdf.numPages,30);i++){const c=await(await pdf.getPage(i)).getTextContent();lines=lines.concat(root.FATLER.pdfLines(c.items))}return parse(lines)}
let PEND=null; /* {file,carac,revs,folhas} do documento lido, à espera de «Guardar» */
function form(id,r){const d=id?data.gdocs[id]:null,x=d||r||{},us=(me()||{}).nome||'';
  if(d)PEND={file:null,carac:d.carac||[],revs:d.revs||[],folhas:d.folhas||''};
  const np=PEND?PEND.carac.reduce((a,c)=>a+c.r.filter(q=>q.length>1).length,0):0,lock=d&&(d.transmittal||d.ifc);
  show(`<form data-gpf="${id||''}"><h2 style="margin:0">${d?'Editar documento de projecto':'Documento de projecto lido do PDF'}</h2>
   <div class="fields">${F('Código do documento (do projectista)',`<input name="codigo" required value="${esc(x.codigo||'')}" class="gdcode"${lock?' disabled':''}>`)}${F('N.º do cliente',`<input name="ncli" value="${esc(x.ncli||'')}">`)}
   ${F('Título',`<input name="titulo" required value="${esc(x.titulo||'')}">`,1)}
   ${F('Revisão',`<input name="rev" required maxlength="4" value="${esc(x.rev||'')}"${d?' disabled':''}>`)}${F('Tipo de documento',sel('tipo',Object.entries(TIPN).map(([k,v])=>[k,k+' · '+v]),x.tipo||'DTS'))}
   ${F('Especialidade',sel('esp',Object.entries(ESPN).map(([k,v])=>[k,k+' · '+v]),x.esp||'ELE'))}${F('Responsável / projectista',`<input name="resp" value="${esc(x.resp||'')}">`)}
   ${F('Projecto',`<input name="projeto" value="${esc(x.projeto||'')}">`)}${F('Instalação',`<input name="inst" value="${esc(x.inst||'')}">`)}
   ${F('Equipamento que este documento define (vazio se não define nenhum)',`<input name="equip" value="${esc(x.equip||'')}">`,1)}
   ${d?'':F('Situação do documento',sel('sit',[['A','Aprovado — pode ser publicado para a obra'],['E','Em elaboração — ainda vai seguir para aprovação']],'A'),1)}</div>
   <div class="gpsum">${PEND&&PEND.file?`Ficheiro: <strong>${esc(PEND.file.name)}</strong> · ${kb(PEND.file.size)}<br>`:''}Lido do documento: <strong>${PEND?PEND.revs.length:0}</strong> revisões na capa e <strong>${PEND?PEND.carac.length:0}</strong> tabelas com <strong>${np}</strong> características.${PEND&&PEND.carac.length?'':' Se o documento for uma digitalização, as características não são lidas.'}</div>
   ${PEND&&PEND.carac.length?`<details class="gpc"><summary>Ver as características lidas</summary>${PEND.carac.map(c=>`<div class="meta" style="margin-top:6px"><strong>${esc(c.t)}</strong></div>${tabHtml(c)}`).join('')}</details>`:''}
   <p class="help" id="gpprog">Confira os dados lidos com o documento antes de guardar. As características ficam consultáveis na ficha do documento e em «Equipamentos do projecto».</p>
   <div class="actions"><button type="button" class="btn ghost" data-gd="close">Cancelar</button><button class="btn" type="submit">Guardar</button></div></form>`,true)}
function pick(){if(!(isGD()&&canEdit()))return toast('Só a gestão documental pode fazer esta operação.');if(!data.obras[st.obra])return toast('Crie ou escolha primeiro uma obra.');
  const i=document.createElement('input');i.type='file';i.accept='application/pdf,.pdf';i.onchange=async()=>{const f=i.files[0];if(!f)return;if(f.size>20*1048576)return toast('O ficheiro tem mais de 20 MB.');
    toast('A ler o documento…');let r;try{r=await readPdf(f)}catch(e){console.warn(e);r={revs:[],carac:[],titulo:f.name.replace(/\.pdf$/i,''),codigo:f.name.replace(/\.pdf$/i,'').replace(/-\d{1,2}$/,'')}}
    if(!r.codigo){r.codigo=f.name.replace(/\.pdf$/i,'').replace(/^[0-9a-f]{8}-/,'').replace(/-\d{1,2}$/,'')}
    PEND={file:f,carac:r.carac,revs:r.revs,folhas:r.folhas||''};form(null,r)};i.click()}
document.addEventListener('submit',async e=>{const fm=e.target.closest&&e.target.closest('form[data-gpf]');if(!fm)return;e.preventDefault();const id=fm.getAttribute('data-gpf'),d=id?data.gdocs[id]:null,v=n=>fm.elements[n]?String(fm.elements[n].value).trim():'',btn=fm.querySelector('button[type=submit]');if(btn.disabled)return;
  const codigo=(d&&fm.elements.codigo.disabled?d.codigo:v('codigo')).toUpperCase();if(!/^[A-Z0-9][A-Z0-9._\/-]{3,60}$/.test(codigo))return toast('Código inválido: use letras, números e hífenes.');
  if(L('gdocs').some(x=>x.codigo===codigo&&x.id!==id))return toast('Já existe um documento com o código '+codigo+'. Para uma revisão nova, abra-o e use «Nova revisão».');
  const base={codigo,ncli:v('ncli'),titulo:v('titulo'),tipo:v('tipo'),esp:v('esp'),resp:v('resp'),projeto:v('projeto'),inst:v('inst'),equip:v('equip'),ext:true};
  if(d){await save('gdocs',id,{...d,...base});PEND=null;hide();return toast('Guardado: '+codigo)}
  if(!PEND||!PEND.file)return toast('Escolha outra vez o PDF.');if((window.enlSync||{}).offline)return toast('Sem internet: o carregamento de PDF precisa de ligação.');
  btn.disabled=true;let f;const pg=$('#gpprog');try{f=await upload(PEND.file,(i,n)=>{if(pg)pg.textContent='A carregar… '+Math.round(100*i/n)+' %'})}catch(x){btn.disabled=false;return toast('Não foi possível carregar o ficheiro. Verifique a ligação e tente outra vez.')}
  const ap=v('sit')==='A';
  await save('gdocs','d'+uid(),{obra:st.obra,...base,rev:v('rev').toUpperCase(),estado:ap?'Aprovado':'Em elaboração',cod:ap?'A':'',transmittal:'',dEnvio:'',dResp:ap?today():'',file:f,ifc:null,hist:[],revs:PEND.revs,carac:PEND.carac,folhas:PEND.folhas,origem:'projecto',carregadoPor:(me()||{}).nome||'',carregadoEm:G.now?G.now():''});
  PEND=null;hide();toast('Documento '+codigo+' registado.'+(ap?' Para chegar às frentes, abra-o e use «Publicar para obra».':''))},true);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-gp]');if(!b)return;const a=b.getAttribute('data-gp');if(a==='imp')pick();if(a==='csv'){const ds=L('gdocs').filter(d=>d.equip);const out=[];ds.forEach(d=>(d.carac||[]).forEach(c=>c.r.forEach(r=>{if(r.length>1)out.push([d.equip,d.codigo,d.rev,c.t,...r])})));G.csv('equipamentos-projecto.csv',['Equipamento','Documento','Rev.','Tabela','Parâmetro','Coluna 2','Coluna 3','Coluna 4'],out)}},true);
/* vista: equipamentos definidos pelo projecto */
function key(d){const out=[],all=d.carac||[],pr=all.filter(c=>/principa|par[aâ]metro|el[eé]ctric|elétric/i.test(c.t)&&!/ambient|sistema/i.test(c.t));for(const c of (pr.length?pr:all)){const vi=(c.h||[]).findIndex(h=>/valor/i.test(h)),ui=(c.h||[]).findIndex(h=>/unid/i.test(h));
    for(const r of c.r){if(r.length<2||out.length>=5)continue;const val=r[vi>0&&vi<r.length?vi:r.length-1],un=ui>0&&ui<r.length?r[ui]:'';if(/^-?$/.test(val)||/^quantidade$/i.test(r[0]))continue;out.push(esc(r[0])+': <b>'+esc(val)+(un&&un!=='-'&&un!==val?' '+esc(un):'')+'</b>')}if(out.length>=5)break}return out}
function vEquip(){const ds=L('gdocs').filter(d=>d.equip).sort((a,b)=>a.equip.localeCompare(b.equip)),g=isGD();
  return head('Equipamentos do projecto','Cada equipamento é definido por um documento de projecto (folha de dados ou especificação). As características vêm do próprio documento: abra a linha para ver todas e o PDF.',
   `<input type="search" id="q" placeholder="Procurar" aria-label="Procurar">${g?'<button class="btn" data-gp="imp">Carregar documento de projecto (PDF)</button>':''}<button class="btn ghost" data-gp="csv">Exportar características (CSV)</button>`)
  +`<div class="tablewrap">${ds.length?`<table><thead><tr><th>Equipamento</th><th>Documento que o define</th><th>Rev.</th><th>Estado</th><th>Características principais</th><th>Parâmetros</th></tr></thead><tbody>${ds.map(d=>`<tr class="click" data-gd="doc:${d.id}"><td><strong>${esc(d.equip)}</strong>${d.inst?`<br><span class="meta">${esc(d.inst)}</span>`:''}</td><td><span class="gdcode">${esc(d.codigo)}</span>${d.ncli?`<br><span class="meta">Cliente: ${esc(d.ncli)}</span>`:''}<br><span class="meta">${esc(TIPN[d.tipo]||d.tipo)}</span></td><td><span class="gdrev">${esc(d.rev)}</span></td><td>${pill(d.estado)}</td><td style="font-size:13px">${key(d).join('<br>')||'<span class="meta">sem características lidas</span>'}</td><td class="num">${nPar(d)}</td></tr>`).join('')}</tbody></table>`:`<div class="empty">Ainda não há equipamentos. Carregue as folhas de dados do projecto em PDF: a plataforma lê o código, a revisão, o n.º do cliente e as tabelas de características.</div>`}</div>`}
{const o=vGeneric;vGeneric=function(c){if(c==='gdequip')return vEquip();const h=o(c);return c==='gdmdl'&&isGD()?h.replace('<button class="btn" data-gd="newdoc">','<button class="btn" data-gp="imp">Carregar documento de projecto (PDF)</button><button class="btn ghost" data-gd="newdoc">'):h}}
root.GDP={cardExtra,form,parse};
})(this);
