const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const views = $$('.view');
let compressedPhoto = null;
let lastResult = null;
let deferredInstall = null;

function showView(name) {
  views.forEach(v => v.classList.toggle('active', v.id === `${name}View`));
  window.scrollTo({top:0,behavior:'instant'});
}
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.remove('hidden'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.classList.add('hidden'),3200); }
function loading(on, text){ $('#loading').classList.toggle('hidden',!on); if(text) $('#loading strong').textContent=text; }

$$('[data-home]').forEach(b => b.addEventListener('click',()=>showView('home')));
$$('[data-open]').forEach(b => b.addEventListener('click',()=>showView(b.dataset.open)));
$$('[data-example]').forEach(b=>b.addEventListener('click',()=>{$('#mealText').value=b.dataset.example;}));

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall=e; $('#installBtn').classList.remove('hidden'); });
$('#installBtn').addEventListener('click', async()=>{ if(deferredInstall){ deferredInstall.prompt(); deferredInstall=null; $('#installBtn').classList.add('hidden'); } else { toast('Auf dem iPhone: Teilen → „Zum Home-Bildschirm“.'); } });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});

$('#photoInput').addEventListener('change', async e => {
  const file=e.target.files?.[0]; if(!file) return;
  try{
    compressedPhoto=await resizeImage(file,1600,.82);
    $('#photoPreview').src=compressedPhoto;
    $('#photoPreview').classList.remove('hidden');
    $('#photoPlaceholder').classList.add('hidden');
    $('#analyzePhotoBtn').disabled=false;
  }catch{ toast('Das Bild konnte nicht verarbeitet werden.'); }
});

async function resizeImage(file,maxDim=1600,quality=.82){
  const data=await fileToDataURL(file); const img=new Image(); img.src=data; await img.decode();
  const scale=Math.min(1,maxDim/Math.max(img.width,img.height));
  const c=document.createElement('canvas'); c.width=Math.round(img.width*scale); c.height=Math.round(img.height*scale);
  c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  return c.toDataURL('image/jpeg',quality);
}
function fileToDataURL(file){ return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);}); }

async function api(url, options={}){
  const res=await fetch(url,{headers:{'content-type':'application/json',...(options.headers||{})},...options});
  let body={}; try{body=await res.json();}catch{}
  if(!res.ok) throw new Error(body.error || 'Verbindung fehlgeschlagen.');
  return body;
}

$('#analyzePhotoBtn').addEventListener('click', async()=>{
  if(!compressedPhoto) return;
  loading(true);
  try{
    const data=await api('/api/check',{method:'POST',body:JSON.stringify({imageDataUrl:compressedPhoto,text:$('#photoNote').value.trim()})});
    renderResult(data);
  }catch(e){ toast(e.message); } finally{ loading(false); }
});

$('#analyzeMealBtn').addEventListener('click', async()=>{
  const text=$('#mealText').value.trim(); if(!text) return toast('Beschreibe kurz deine Mahlzeit.');
  loading(true,'Spoony ordnet deine Mahlzeit ein …');
  try{ renderResult(await api('/api/check',{method:'POST',body:JSON.stringify({text})})); }
  catch(e){toast(e.message)} finally{loading(false)}
});

function renderResult(data){
  lastResult=data;
  $('#mealLabel').textContent=data.mealLabel || 'Deine Mahlzeit';
  $('#demoBadge').classList.toggle('hidden',!data.demo);
  const root=$('#categoryCards'); root.innerHTML='';
  data.result.categories.forEach(c=>{
    const cls=c.label.toLowerCase();
    const card=document.createElement('article'); card.className='category-card';
    const count=Math.min(8,Math.max(0,Number(c.spoons)||0));
    let spoons='';
    const full=Math.floor(count), half=count-full>=.5;
    for(let i=0;i<full;i++) spoons+='<span class="spoon"></span>';
    if(half) spoons+='<span class="spoon half"></span>';
    card.innerHTML=`<div><div class="category-title ${cls}"><span class="cat-dot"></span><span>${escapeHtml(c.label)}</span></div><div class="spoons ${cls}">${spoons || '<span style="color:#aaa;font-size:12px">—</span>'}</div></div><div class="category-amount">${escapeHtml(c.amountLabel)}</div><div class="category-foods">${c.foods?.length ? 'Lebensmittel: '+c.foods.map(escapeHtml).join(', ') : 'Keine klare Quelle erkannt'}</div>`;
    root.append(card);
  });
  $('#recommendation').textContent=data.result.recommendation;
  const u=$('#uncertainties');
  if(data.result.uncertainties?.length){u.textContent='Foto-Schätzung: '+data.result.uncertainties.join(' ');u.classList.remove('hidden')} else u.classList.add('hidden');
  const f=$('#followUps'); f.innerHTML='';
  data.result.followUps.forEach(x=>{const b=document.createElement('button');b.className='followup-btn';b.textContent=x.question;b.addEventListener('click',()=>openFollowup(x.question));f.append(b)});
  showView('result');
}

$('#resultBack').addEventListener('click',()=>showView(compressedPhoto?'photo':'meal'));

async function openFollowup(question){
  $('#followupSheet').classList.remove('hidden'); $('#sheetQuestion').textContent=question; $('#sheetAnswer').textContent='Spoony denkt kurz nach …';
  try{const r=await api('/api/followup',{method:'POST',body:JSON.stringify({question,context:lastResult?.result||{}})});$('#sheetAnswer').textContent=r.answer;}
  catch(e){$('#sheetAnswer').textContent=e.message;}
}
function closeSheet(){ $('#followupSheet').classList.add('hidden'); }
$('#sheetClose').addEventListener('click',closeSheet); $('#sheetBackdrop').addEventListener('click',closeSheet);

$('#foodBtn').addEventListener('click', lookupFood); $('#foodQuery').addEventListener('keydown',e=>{if(e.key==='Enter')lookupFood()});
async function lookupFood(){
  const q=$('#foodQuery').value.trim(); if(!q)return;
  try{
    const d=await fetch(`/api/food?q=${encodeURIComponent(q)}`).then(async r=>{const x=await r.json();if(!r.ok)throw new Error(x.error);return x});
    const root=$('#foodResults');root.innerHTML='';
    if(!d.results.length){root.innerHTML='<div class="answer-card">Noch nicht eindeutig in der Matrix gefunden.</div>';return;}
    d.results.forEach(item=>{const card=document.createElement('div');card.className='food-card';card.innerHTML=`<h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.category)} · ${escapeHtml(item.unit)}</p><div class="portion-grid">${item.amounts.map(a=>`<div class="portion-chip"><strong>${a.spoonies}</strong>${escapeHtml(a.label)}</div>`).join('')}</div>${item.note?`<p>${escapeHtml(item.note)}</p>`:''}`;root.append(card)});
  }catch(e){toast(e.message)}
}

$('#askBtn').addEventListener('click',async()=>{const q=$('#askText').value.trim();if(!q)return toast('Stell Spoony eine Frage.');loading(true,'Spoony antwortet …');try{const d=await api('/api/ask',{method:'POST',body:JSON.stringify({question:q})});$('#askAnswer').textContent=d.answer;$('#askAnswer').classList.remove('hidden')}catch(e){toast(e.message)}finally{loading(false)}});

$('#suggestBtn').addEventListener('click',async()=>{const context=$('#suggestText').value.trim();loading(true,'Spoony baut 3 passende Ideen …');try{const d=await api('/api/suggest',{method:'POST',body:JSON.stringify({context})});const root=$('#suggestions');root.innerHTML='';d.options.forEach(o=>{const c=document.createElement('div');c.className='suggestion-card';c.innerHTML=`<h3>${escapeHtml(o.title)}</h3><p>${escapeHtml(o.subtitle)}</p><p><strong>Warum:</strong> ${escapeHtml(o.why)}</p>`;root.append(c)});const r=document.createElement('div');r.className='recommendation-card';r.innerHTML=`<div class="rec-label">💡 MEINE EMPFEHLUNG</div><p>${escapeHtml(d.recommendation)}</p>`;root.append(r)}catch(e){toast(e.message)}finally{loading(false)}});

function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
