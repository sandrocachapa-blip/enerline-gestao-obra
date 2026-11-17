/* ENERLINE – leitura de faturas de fornecedores: a partir do texto lido (PDF ou OCR), linha a linha,
   identifica o fornecedor, números, datas, totais, impostos e os itens da fatura. Não depende do resto da app. */
(function(root){
const RATES=[14,7,5,2,0];
const UNITS=/^(un|und|unid|uni|un\.|und\.|pc|pç|pcs|m|ml|mt|mts|m2|m²|m3|m³|km|kg|kgs|g|t|ton|l|lt|lts|cx|cxs|sacos?|sc|rolos?|rl|vg|hr|hor|h|horas?|dia|dias|mês|mes|jg|par|kit|lote|serv|srv|gl|bid)$/i;
const NUMTOK=/^[-(]?\d[\d.,]*\)?%?$/;
function toNum(s){s=String(s).replace(/[()%\s]/g,'');const neg=/^-/.test(s);s=s.replace(/^-/,'');
  const c=s.lastIndexOf(','),d=s.lastIndexOf('.');
  if(c>=0&&d>=0){if(c>d)s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'')}
  else if(c>=0){s=s.split(',').length>2?s.replace(/,/g,''):s.replace(',','.')}
  else if(d>=0){const p=s.split('.');if(p.length>2||(p[1].length===3&&p[0]!=='0'))s=s.replace(/\./g,'')}
  const v=parseFloat(s);return isNaN(v)?NaN:(neg?-v:v)}
const near=(a,b)=>Math.abs(a-b)<=Math.max(1,Math.abs(b)*0.005);
const r2=v=>Math.round(v*100)/100;
/* divide uma linha em palavras, guardando se o espaço antes é de coluna (grande) ou normal */
/* corrige trocas típicas do OCR em números: «o»→0, «l»/«I»→1 */
const fixN=t=>/^[oO]$/.test(t)?'0':(/\d/.test(t)&&/^[-(]?[\dOoIl|.,]+%?\)?$/.test(t)?t.replace(/[Oo]/g,'0').replace(/[Il|]/g,'1'):t);
function toks(line){const out=[];const re=/(\s*)(\S+)/g;let m;while((m=re.exec(line)))out.push({t:fixN(m[2]),big:m[1].length>=2});return out}
/* agrupa números cujos milhares vêm separados por espaço («2 256 000,00») — várias hipóteses */
function partitions(ts){const res=[];const n=ts.length;
  const go=(i,cur,acc)=>{if(res.length>400)return;if(i===n){res.push([...acc,cur]);return}
    if(cur&&cur.open&&canJoinTo(cur,ts[i]))go(i+1,{ti:cur.ti,bj:(cur.bj||0)+(ts[i].big?1:0),s:cur.s+ts[i].t,open:/^\d{3}$/.test(ts[i].t),pct:/%$/.test(ts[i].t)},acc);
    go(i+1,{ti:ts[i].ti,s:ts[i].t,open:/^[-(]?\d{1,3}$/.test(ts[i].t),pct:/%$/.test(ts[i].t)},cur?[...acc,cur]:acc)};
  const canJoinTo=(cur,t)=>/^\d{3}([.,]\d{1,4})?$/.test(t.t);
  go(0,null,[]);return res.map(p=>p.map(x=>({v:toNum(x.s),pct:x.pct,s:x.s,ti:x.ti,bj:x.bj||0})).filter(x=>!isNaN(x.v)))}
const bjs=p=>p.reduce((a,x)=>a+(x.bj||0),0);
function assign(nums){/* procura quantidade × preço (com ou sem desconto) = valor */
  const n=nums.length;let best=null;
  for(let v=n-1;v>=1;v--)for(let i=0;i<v;i++)for(let j=i+1;j<v;j++){const q=nums[i].v,p=nums[j].v,val=nums[v].v;if(!(q>0&&p>0&&val>0)||nums[i].pct||nums[j].pct)continue;
    let desc=0,ok=near(q*p,val);
    if(!ok)for(let k=j+1;k<n;k++)if(k!==v&&nums[k].v>0&&nums[k].v<100&&near(q*p*(1-nums[k].v/100),val)){desc=nums[k].v;ok=true;break}
    if(ok){const sc=(v===n-1?3:v===n-2?2:0)+(Number.isInteger(q)?1:0)+(j===i+1?1:0);if(!best||sc>best.sc)best={sc,i,j,v,desc}}}
  return best}
function item(line,o){o=o||{};let ts=toks(line.replace(/[|¦]/g,' ').replace(/[“”"']/g,'').trim());if(ts.length<2)return null;
  /* parte final só com números, percentagens e unidades */
  let k=ts.length;const isN=t=>NUMTOK.test(t.t)||t.t==='%',isU=t=>UNITS.test(t.t.replace(/[.:]$/,''));
  while(k>0&&(isN(ts[k-1])||isU(ts[k-1])||ts[k-1].t==='-'))k--;
  const tail=ts.slice(k),head=ts.slice(0,k);let un='';
  const numT=[];tail.forEach((t,i)=>{if(t.t==='%'){if(numT.length)numT[numT.length-1].t+='%';return}if(isU(t)&&!NUMTOK.test(t.t))return;if(t.t==='-')return;numT.push({...t,ti:i})});
  if(!numT.length||!head.length)return null;
  let words=head.map(t=>t.t);const txt=words.join(' ');if(!/[A-Za-zÀ-ú]{3}/.test(txt))return null;
  const unAfter=ti=>{const u=tail.find((t,i)=>i>ti&&isU(t)&&!NUMTOK.test(t.t));return u?u.t.replace(/[.:]$/,''):''};
  let best=null,bp=null;for(const p of partitions(numT)){const a=assign(p);if(a){a.sc-=bjs(p)*0.6;if(!best||a.sc>best.sc||(a.sc===best.sc&&p.length<bp.length)){best=a;bp=p}}}
  let q,pr,val,desc=0,taxa=null,rest=[];
  if(best){const qi=bp[best.i].ti;q=bp[best.i].v;pr=bp[best.j].v;val=bp[best.v].v;desc=best.desc;rest=bp.filter((x,i)=>i>best.j&&i!==best.v&&!(desc&&x.v===desc));if(qi>0){words=words.concat(tail.slice(0,qi).map(t=>t.t))}un=unAfter(qi)}
  else{const p=partitions(numT).sort((a,b)=>bjs(a)-bjs(b)||a.length-b.length)[0]||[];if(!p.length)return null;
    if(o.strict)return null;
    val=p[p.length-1].v;let pp=p.slice(0,-1);if(RATES.includes(val)&&p.length>=2&&!p[p.length-1].pct===false){taxa=val;val=p[p.length-2].v;pp=p.slice(0,-2)}
    un=unAfter(-1);if(pp.length>=2){q=pp[0].v;pr=pp[1].v}else if(pp.length===1&&pp[0].v<val&&pp[0].v>0&&near(val/pp[0].v,Math.round(val/pp[0].v))){q=Math.round(val/pp[0].v);pr=pp[0].v}else{q=1;pr=val}rest=pp.slice(2)}
  if(!(val>0))return null;
  const rr=rest.filter(x=>RATES.includes(x.v)),rt=rr.filter(x=>x.v>0).pop()||rr.pop();if(rt&&taxa===null)taxa=rt.v;
  /* referência e designação */
  let ref='',dw=words.slice();
  if(dw.length>=3&&/^\d{1,3}$/.test(dw[0])&&/\d/.test(dw[1])&&/[A-Z-]/i.test(dw[1]))dw.shift();
  const codes=o.codes||{};
  if(dw.length>=2){const f=dw[0].replace(/[.:,;]$/,'');
    if(codes[f.toUpperCase()]||(head[1]&&head[1].big&&f.length<=24&&/\d/.test(f))||/^[A-Z0-9]{1,6}[-./][A-Z0-9.\-/]+$/i.test(f)||(/^[A-Z]{0,4}\d{3,}[A-Z0-9-]*$/i.test(f))||/^\d{3,10}$/.test(f)){ref=f;dw.shift()}}
  const descr=dw.join(' ').replace(/^[-–:;,.\s]+/,'').trim();if(!/[A-Za-zÀ-ú]{2}/.test(descr))return null;
  return{ref,descr,qtd:q,un,preco:pr,desc,taxa,valor:val,ok:!!best}}
const HEAD=/(descri|designa|artigo|produto|servi[cç]o|material)/i,HEAD2=/(qt|quant|pre[cç]o|valor|total|p\.\s?unit|unit)/i;
const END=/^(sub-?\s?total|total|incid[eê]ncia|resumo|valor total|iva\b|imposto|observa|desconto|banco|iban|coordenadas|processado|documento processado|quadro resumo|taxa\b|motivo|n[ºo°]? de itens|regime)/i;
const lastNum=l=>{const all=toks(l);let j=-1;for(let i=all.length-1;i>=0;i--)if(NUMTOK.test(all[i].t)&&!/%$/.test(all[i].t)){j=i;break}if(j<0)return NaN;
  let s=all[j].t;while(j>0&&(/^\d{1,3}$/.test(all[j-1].t)||(/^\d{4}$/.test(all[j-1].t)&&!/^\d{3}$/.test(all[j].t)))&&/^\d{3}([.,]\d+)?$/.test(all[j].t)&&!(j>1&&/%$/.test(all[j-2].t)&&all[j].big)){s=all[j-1].t+s;j--}return toNum(s)};
const ENDANY=/(resumo\s+do\s+documento|dados\s+adicionais|quadro\s+(resumo|de\s+impostos)|resumo\s+de\s+(iva|impostos)|total\s+do\s+documento|total\s+a\s+pagar|total\s+il[ií]quido|produtos\s+e\s+servi[cç]os|incid[eê]ncia|valor\s+por\s+extenso|os\s+bens\s+e\/ou\s+servi[cç]os|processado\s+por|coordenadas\s+banc[aá]rias|\biban\b)/i;
const NOTITEM=/^(produtos\s+e\s+servi|total\b|sub-?\s?total|iva\b|imposto|incid|reten[cç]|desconto|n[.ºo°]*\s*(de\s+)?cliente|cc\s*:|c\.?\s?custo|moeda|ref\.?\s*interna|refer[eê]ncia|telefone|tel\.?\s*:|telem|fax|nif\b|contribuinte|iban|banco|swift|p[aá]g(ina)?\.?\b|data\b|vencimento|cliente|morada|endere[cç]o|original|duplicado|triplicado|aoa\b|kz\b|usd\b|eur\b|cond(i[cç][oõ]es)?\.?\s+de\s+pagamento|operador|vendedor|requisi[cç][aã]o\s+n|v\/?\s*ref|n\/?\s*ref|capital\s+social|matr[ií]cula|cons\.?\s+reg)/i;
/* resumo em colunas: os rótulos numa linha e os valores na linha seguinte, pela mesma ordem */
function resumoCols(lines,r){const LB=[['base',/produtos\s+e\s+servi[cç]os|total\s+il[ií]quido|incid[eê]ncia|total\s+s(em|\/)\s*(iva|imposto)|sub-?\s?total|mercadorias?/i],['desconto',/descontos?/i],['iva',/\biva\b|impostos?/i],['ret',/reten[cç][aã]o/i],['total',/total\s+(do\s+)?documento|total\s+a\s+pagar|total\s+geral|\btotal\b(?!\s+(il|s))/i]];
  for(let i=0;i<lines.length-1;i++){const l=lines[i],found=[];let rest=l;LB.forEach(([k,re])=>{const m=rest.match(re);if(m){found.push([k,rest.search(re)]);rest=rest.replace(re,x=>' '.repeat(x.length))}});
    if(found.length<2)continue;found.sort((a,b)=>a[1]-b[1]);if(/\d{3}/.test(l.slice(found[0][1])))continue;
    for(let j=i+1;j<=Math.min(lines.length-1,i+2);j++){const ts=toks(lines[j]).filter(t=>NUMTOK.test(t.t));if(!ts.length)continue;const ps=partitions(ts).filter(p=>p.length===found.length&&p.every(x=>!x.pct));if(!ps.length)break;
      const p=ps.sort((a,b)=>bjs(a)-bjs(b))[0];found.forEach(([k],n)=>{r[k]=p[n].v});return true}}return false}
function moneyAfter(lines,re,ex){for(let i=0;i<lines.length;i++){const l=lines[i];if(!re.test(l)||(ex&&ex.test(l)))continue;
    const m=l.slice(l.search(re));let v=lastNum(m);if(isNaN(v)&&lines[i+1]&&!/[A-Za-z]{4}/.test(lines[i+1]))v=lastNum(lines[i+1]);if(!isNaN(v))return v}return NaN}
function parse(lines,o){o=o||{};lines=(lines||[]).map(l=>String(l).replace(/\t/g,'   ').replace(/[ ]+$/,'')).filter(l=>l.trim());const tx=lines.join('\n'),flat=tx.replace(/\s+/g,' ');
  const r={itens:[]};
  /* NIF do fornecedor (o primeiro que não seja o do cliente) */
  const nifs=[];const nre=/(?:NIF|N\.\s?I\.\s?F\.?|Contribuinte|Contrib\.)\s*(?:n[.ºo°]*)?\s*[:.\-]?\s*([0-9]{9,10}(?:[A-Z]{2}[0-9]{3})?|[0-9]{3}\s?[0-9]{3}\s?[0-9]{3,4})/gi;let m;
  while((m=nre.exec(flat)))nifs.push(m[1].replace(/\s/g,''));
  const own=(o.ownNif||[]).map(String);r.nif=nifs.find(n=>!own.includes(n))||'';r.nifs=nifs;
  /* nome do fornecedor: no topo, antes do bloco do cliente */
  const top=[];for(const l of lines.slice(0,14)){if(/^\s*(cliente|exmo|exm[ºo]s?|destinat|para:|adquirente)/i.test(l))break;l.split(/\s{2,}/).forEach(s=>top.push(s.trim()))}
  const bad=/^(fatura|factura|original|duplicado|triplicado|p[aá]gina|pag\.|data|nif|contribuinte|tel|telefone|email|e-mail|www|rua|av\.|avenida|bairro|luanda|benguela|angola|n[ºo°]|vencimento|moeda|cliente)/i,own2=o.ownName?new RegExp(o.ownName,'i'):/enerline/i;
  const cand=top.filter(s=>s&&/[A-Za-zÀ-ú]{3}/.test(s)&&!bad.test(s)&&!own2.test(s)&&!/@|\d{6,}/.test(s));
  r.nome=(cand.find(s=>/\b(lda|limitada|s\.?\s?a\.?|sarl|unipessoal|comercial|com[eé]rcio|ind[uú]stria|servi[cç]os|& )\b|,\s*(lda|sa)\b/i.test(s))||cand[0]||'').replace(/\s{2,}/g,' ').trim();
  /* número e datas */
  const mn=flat.match(/\b((?:FT|FR|FA|FAC|FTR)\s?[A-Z0-9]*\s?\/\s?\d[\w\/.-]*|(?:FT|FR|FA)\s\d[\w\/.-]*)/)||flat.match(/\b(?:Factura|Fatura)(?:[\s-]*Recibo)?\s*(?:n\.?\s?[ºo°]|n[uú]mero|nr\.?)\s*[:.]?\s*([A-Z]{0,4}\s?[A-Z0-9]*\/?\s?\d[\w\/.-]*)/i);
  if(mn)r.num=mn[1].trim().replace(/[.,;]$/,'');
  const dt=s=>{const x=String(s).match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/)||String(s).match(/(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/);if(!x)return'';return x[1].length===4?x[1]+'-'+x[2].padStart(2,'0')+'-'+x[3].padStart(2,'0'):x[3]+'-'+x[2].padStart(2,'0')+'-'+x[1].padStart(2,'0')};
  const md=flat.match(/Data(?: da fatura| da factura| de emiss[ãa]o| do documento| doc\.?)?\s*:?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}|\d{4}-\d{2}-\d{2})/i);if(md)r.data=dt(md[1]);
  const mv=flat.match(/(?:Vencimento|Data de venc\w*|Venc\.)\s*:?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}|\d{4}-\d{2}-\d{2})/i);if(mv)r.venc=dt(mv[1]);
  /* totais e impostos */
  const RC={},rc=resumoCols(lines,RC);
  r.base=moneyAfter(lines,/(total\s*(sem|s\/)\s*(iva|imposto)|total il[ií]quido|incid[eê]ncia|sub-?\s?total|valor sem imposto|base tribut[aá]vel|total mercadorias?|valor l[ií]quido|total l[ií]quido|produtos\s+e\s+servi[cç]os)/i);
  r.iva=moneyAfter(lines,/(total\s*(do\s*)?iva|valor\s*(do\s*)?iva|total\s*(de\s*)?impostos?|^\s*iva\b|imposto sobre o valor acrescentado)/i,/(sem|s\/)\s*iva|incid/i);
  r.desconto=moneyAfter(lines,/(total\s*(de\s*)?descontos?|desconto\s*(comercial|global|financeiro)?\s*[:\s]*-?\s*\d|^\s*descontos?\b)/i);
  r.ret=moneyAfter(lines,/(reten[cç][aã]o|imposto industrial)/i);
  r.total=moneyAfter(lines,/(total\s*(a\s*pagar|do\s*documento|geral|da\s*fa[c]?tura|\((aoa|kz)\))|valor\s*(total|a\s*pagar)|^\s*total\s*(aoa|kz)?\s*[:\s]*\d)/i,/(sem|s\/)\s*iva|total\s*(do\s*)?iva|il[ií]quido|descontos?|impostos?/i);
  if(rc)['base','iva','total','desconto','ret'].forEach(k=>{if(RC[k]!=null&&!isNaN(RC[k]))r[k]=RC[k]});
  if(r.base>0&&r.iva>=0&&r.total>0&&!near(r.base+r.iva-(isNaN(r.desconto)?0:0),r.total)){/* totais incoerentes: confia no par que fecha */if(near(r.total-r.iva,r.base*1)===false&&r.total>r.iva&&r.iva>0&&RATES.some(t=>near((r.total-r.iva)*t/100,r.iva)))r.base=r2(r.total-r.iva)}
  const pr=flat.match(/IVA\s*\(?\s*(\d{1,2}(?:[.,]\d+)?)\s*%/i)||flat.match(/(\d{1,2}(?:[.,]0+)?)\s*%\s*(?:de\s*)?IVA/i);if(pr)r.taxa=toNum(pr[1]);
  if(!/\bKz\b|AOA|Kwanza/i.test(flat)){if(/\bUSD\b|US\$|d[óo]lar/i.test(flat))r.moeda='USD';else if(/\bEUR\b|€|euro/i.test(flat))r.moeda='EUR'}else r.moeda='AOA';
  /* itens: entre o cabeçalho da tabela e os totais */
  let s=lines.findIndex(l=>HEAD.test(l)&&HEAD2.test(l)),e=-1;
  const area=s>=0?lines.slice(s+1):lines;
  for(let i=0;i<area.length;i++){const l=area[i].trim();if(r.itens.length&&((s>=0&&END.test(l))||ENDANY.test(l))){e=i;break}
    if(NOTITEM.test(l)||ENDANY.test(l))continue;
    const it=item(area[i],{codes:o.codes,strict:s<0});
    if(it)r.itens.push(it);else if(r.itens.length&&s>=0&&!/\d{2,}/.test(l)&&/[A-Za-zÀ-ú]{3}/.test(l)&&l.length<70&&!END.test(l))r.itens[r.itens.length-1].descr+=' '+l}
  r.itens=r.itens.filter(x=>!NOTITEM.test(x.descr)&&!ENDANY.test(x.descr));
  r.itens.forEach(x=>{if(x.taxa===null||x.taxa===undefined)x.taxa=isNaN(r.taxa)||r.taxa==null?null:r.taxa});
  /* acertos entre totais */
  {const S=()=>r.itens.reduce((a,x)=>a+(+x.valor||0),0),alvo=!isNaN(r.base)?r.base:(!isNaN(r.total)&&!isNaN(r.iva)?r.total-r.iva:NaN);
   if(alvo>0&&r.itens.length>1&&S()>alvo*1.02){const sus=x=>near(x.valor,alvo)||(!isNaN(r.total)&&near(x.valor,r.total))||(!isNaN(r.iva)&&r.iva>0&&near(x.valor,r.iva));
     for(let i=r.itens.length-1;i>=0&&S()>alvo*1.02;i--){if(sus(r.itens[i])&&Math.abs(S()-r.itens[i].valor-alvo)<Math.abs(S()-alvo))r.itens.splice(i,1)}}
   if(alvo>0&&r.itens.length>1&&near(S(),alvo*2)){/* tabela lida duas vezes (duas vias ou duas páginas iguais) */const h=r.itens.length/2;if(Number.isInteger(h)&&r.itens.slice(0,h).every((x,i)=>near(x.valor,r.itens[h+i].valor)))r.itens=r.itens.slice(0,h)}}
  const soma=r2(r.itens.reduce((a,x)=>a+(+x.valor||0),0));r.somaItens=soma;
  if(isNaN(r.base)&&!isNaN(r.total)&&!isNaN(r.iva))r.base=r2(r.total-r.iva);
  if(isNaN(r.base)&&soma)r.base=r2(soma-(isNaN(r.desconto)?0:r.desconto));
  if(isNaN(r.iva)&&!isNaN(r.total)&&!isNaN(r.base)&&r.total>=r.base)r.iva=r2(r.total-r.base);
  if((r.taxa==null||isNaN(r.taxa))&&r.base>0&&r.iva>=0){const t=r.iva/r.base*100,k=RATES.find(x=>Math.abs(x-t)<0.3);if(k!==undefined)r.taxa=k}
  if(r.taxa!=null&&!isNaN(r.taxa))r.itens.forEach(x=>{if(x.taxa==null)x.taxa=r.taxa});
  ['base','iva','desconto','ret','total','taxa'].forEach(k=>{if(r[k]==null||isNaN(r[k]))delete r[k]});
  return r}
/* texto do PDF (pdf.js) em linhas, com espaços largos entre colunas */
function pdfLines(items){const it=items.filter(x=>x.str&&x.str.trim()).map(x=>({s:x.str,x:x.transform[4],y:x.transform[5],w:x.width,h:Math.abs(x.transform[3])||x.height||10}));
  it.sort((a,b)=>b.y-a.y||a.x-b.x);const rows=[];for(const t of it){const r=rows.find(r=>Math.abs(r.y-t.y)<Math.max(2,t.h*0.45));if(r)r.it.push(t);else rows.push({y:t.y,it:[t]})}
  rows.sort((a,b)=>b.y-a.y);return rows.map(r=>{r.it.sort((a,b)=>a.x-b.x);let s='',end=null;for(const t of r.it){if(end!==null){const g=t.x-end;s+=g>t.h*0.9?'   ':g>t.h*0.12?' ':''}s+=t.s;end=t.x+t.w}return s.replace(/ {4,}/g,'   ')})}
/* texto do OCR (Tesseract) em linhas, a partir da posição de cada palavra */
function ocrLines(d){let ls=d.lines;if(!ls||!ls.length){ls=[];(d.blocks||[]).forEach(b=>(b.paragraphs||[]).forEach(p=>(p.lines||[]).forEach(l=>ls.push(l))))}
  if(!ls.length)return String(d.text||'').split(/\n/);
  return ls.map(l=>{const ws=(l.words||[]).filter(w=>w.text&&w.text.trim());if(!ws.length)return String(l.text||'').trim();const hs=ws.map(w=>w.bbox.y1-w.bbox.y0).sort((a,b)=>a-b),h=hs[Math.floor(hs.length/2)]||12;
    let s='',end=null;for(const w of ws){if(end!==null)s+=(w.bbox.x0-end)>h*0.95?'   ':' ';s+=w.text;end=w.bbox.x1}return s})}
/* OCR avançado: reconstrói as linhas da página a partir da posição de cada palavra (corrige a inclinação e junta o que o
   reconhecimento separou em colunas), e dá a confiança média */
function ocrWords(d){const ls=[];if(d.lines&&d.lines.length)ls.push(...d.lines);else(d.blocks||[]).forEach(b=>(b.paragraphs||[]).forEach(p=>(p.lines||[]).forEach(l=>ls.push(l))));
  const ws=[],angs=[];ls.forEach(l=>{const bl=l.baseline;if(bl&&bl.x1-bl.x0>120)angs.push(Math.atan2(bl.y1-bl.y0,bl.x1-bl.x0));(l.words||[]).forEach(w=>{const t=String(w.text||'').trim();if(!t||!w.bbox)return;const c=w.confidence==null?w.conf:w.confidence;
      if(c!=null&&c<18&&(t.length<=2||!/[A-Za-zÀ-ú0-9]{2}/.test(t)))return;ws.push({t,c:c==null?80:c,x0:w.bbox.x0,x1:w.bbox.x1,y0:w.bbox.y0,y1:w.bbox.y1})})});
  angs.sort((a,b)=>a-b);const ang=angs.length?angs[Math.floor(angs.length/2)]:0;return{ws,ang:Math.abs(ang)<0.2?ang:0}}
function ocrRows(d){const{ws,ang}=ocrWords(d);if(ws.length<3)return{lines:ocrLines(d),conf:0};
  const cs=Math.cos(-ang),sn=Math.sin(-ang);ws.forEach(w=>{const xc=(w.x0+w.x1)/2,yc=(w.y0+w.y1)/2;w.h=w.y1-w.y0;w.yr=xc*sn+yc*cs;w.xr0=w.x0*cs-yc*sn;w.xr1=w.x1*cs-yc*sn});
  const hs=ws.map(w=>w.h).filter(h=>h>4).sort((a,b)=>a-b),H=hs[Math.floor(hs.length/2)]||14;
  ws.sort((a,b)=>a.yr-b.yr);const rows=[];for(const w of ws){const r=rows.length&&rows[rows.length-1];if(r&&Math.abs(w.yr-r.y)<H*0.55){r.ws.push(w);r.y=(r.y*(r.ws.length-1)+w.yr)/r.ws.length}else rows.push({y:w.yr,ws:[w]})}
  const lines=rows.map(r=>{r.ws.sort((a,b)=>a.xr0-b.xr0);let s='',end=null;for(const w of r.ws){if(end!==null)s+=(w.xr0-end)>H*0.95?'   ':' ';s+=w.t;end=w.xr1}return s});
  const tc=ws.reduce((a,w)=>a+w.c*w.t.length,0),tl=ws.reduce((a,w)=>a+w.t.length,0);return{lines,conf:tl?Math.round(tc/tl):0}}
/* nota de qualidade de uma leitura: serve para escolher a melhor de várias passagens */
function score(r){let s=0;if(r.num)s+=1;if(r.data)s+=1;if(r.nif)s+=1;if(r.base>0)s+=2;if(r.total>0)s+=2;const fecha=r.base>0&&r.total>0&&near(r.base+(r.iva||0),r.total);if(fecha)s+=4;
  const n=(r.itens||[]).length;s+=Math.min(n,6);const bate=n&&r.base>0&&near(r.somaItens-(r.desconto||0),r.base);if(bate)s+=6;return{s,fecha,bate,ok:!!(fecha&&bate)}}
const api={parse,item,toNum,pdfLines,ocrLines,ocrRows,score,RATES,UNITS};
if(typeof module!=='undefined')module.exports=api;else root.FATLER=api})(this);
