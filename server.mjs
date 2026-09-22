import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildResult, getMatrixCatalog, searchFood, matrixItems } from './lib/engine.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const rules = fs.readFileSync(path.join(__dirname, 'data', 'spoony-rules.md'), 'utf8');
const catalog = getMatrixCatalog();
const catalogText = catalog.map(x => `${x.name} [${x.category}]`).join('\n');

const PORT = process.env.PORT || 10000;
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-terra';
const API_KEY = process.env.OPENAI_API_KEY || '';

const MIME = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json; charset=utf-8',
  '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon'
};

function json(res, status, payload) {
  res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' });
  res.end(JSON.stringify(payload));
}

async function readJson(req, maxBytes = 16 * 1024 * 1024) {
  return await new Promise((resolve, reject) => {
    let size = 0; const chunks=[];
    req.on('data', chunk => { size += chunk.length; if (size > maxBytes) { reject(new Error('payload_too_large')); req.destroy(); } else chunks.push(chunk); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new Error('invalid_json')); } });
    req.on('error', reject);
  });
}

async function openaiResponse(payload) {
  if (!API_KEY) throw new Error('missing_api_key');
  const r = await fetch('https://api.openai.com/v1/responses', {
    method:'POST',
    headers:{ 'authorization':`Bearer ${API_KEY}`, 'content-type':'application/json' },
    body:JSON.stringify(payload)
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`openai_${r.status}:${body.slice(0,700)}`);
  return JSON.parse(body);
}

const DETECTION_SCHEMA = {
  type:'object', additionalProperties:false,
  properties:{
    meal_label:{type:'string'},
    meal_type:{type:'string', enum:['main','breakfast','lunch','dinner','snack','drink','unknown']},
    items:{type:'array', minItems:1, maxItems:14, items:{
      type:'object', additionalProperties:false,
      properties:{
        display_name:{type:'string'},
        matrix_key:{type:['string','null']},
        primary_category:{type:['string','null'], enum:['Protein','Plants','Carbs','Fat',null]},
        estimated_grams:{type:['number','null'], minimum:0, maximum:1500},
        estimated_count:{type:['number','null'], minimum:0, maximum:30},
        estimated_spoonies:{type:['number','null'], minimum:0, maximum:8},
        amount_text:{type:'string'},
        confidence:{type:'string', enum:['high','medium','low']},
        exact:{type:'boolean'},
        note:{type:'string'}
      },
      required:['display_name','matrix_key','primary_category','estimated_grams','estimated_count','estimated_spoonies','amount_text','confidence','exact','note']
    }},
    uncertainties:{type:'array', maxItems:4, items:{type:'string'}},
    aha_candidates:{type:'array', minItems:2, maxItems:5, items:{
      type:'object', additionalProperties:false,
      properties:{
        question:{type:'string'},
        angle:{type:'string', enum:['surprise','misconception','hidden_component','category_balance','comparison','change']}
      }, required:['question','angle']
    }}
  },
  required:['meal_label','meal_type','items','uncertainties','aha_candidates']
};

function extractionPrompt(source, text) {
  return `Du analysierst eine Mahlzeit für Spoony. Deine Aufgabe ist NUR Erkennung, Mengen-Schätzung und sinnvolle Aha-Fragen. Die eigentliche Spoony-Bewertung erfolgt danach deterministisch im Server.\n\nWICHTIGE REGELN:\n- Zerlege Mischgerichte in sichtbare bzw. stark plausible Komponenten.\n- Jedes Lebensmittel bekommt GENAU EINE Primärkategorie. Keine Doppelzählung.\n- \"enthält Protein\" bedeutet nicht automatisch Protein-Kategorie.\n- High-Protein-Pasta bleibt primär Carbs.\n- Champignons/Pilze bleiben Plants.\n- Mais bleibt in Spoony primär Carbs.\n- Bohnen/Linsen/Kichererbsen sind laut Matrix primär Protein.\n- Avocado/Guacamole wird für die Mengensteuerung primär Fat behandelt.\n- Käse wie Feta/Cheddar/Mozzarella ist in dieser Matrix primär Fat.\n- Erfinde kein unsichtbares Öl oder Saucen. Wenn Fett nur möglich, als Unsicherheit nennen.\n- Bei Fotos sind Mengen immer geschätzt und exact=false.\n- Bei Texteingaben exact=true nur wenn der Nutzer eine konkrete Menge/Stückzahl nennt.\n- matrix_key muss exakt einem Namen aus der Liste entsprechen, wenn ein sinnvoller Treffer existiert. Sonst null und primary_category setzen.\n- estimated_spoonies nur als groben Fallback setzen, wenn matrix_key=null und eine Menge nicht sinnvoll in Gramm/Stück ausdrückbar ist. Sonst null.\n- Formuliere 2-5 Aha-Fragen wie echte Gedanken eines Nutzers, nicht wie Funktionsbuttons. Die Winkel sollen sich unterscheiden.\n\nMATRIX-KATALOG:\n${catalogText}\n\nQUELLE: ${source}\nNUTZERTEXT: ${text || '(kein Text, Bild analysieren)'}`;
}

async function detectMeal({ imageDataUrl, text, source }) {
  if (!API_KEY) return demoDetection(text, source);
  const content = [{ type:'input_text', text: extractionPrompt(source, text) }];
  if (imageDataUrl) content.push({ type:'input_image', image_url:imageDataUrl, detail:'high' });
  const response = await openaiResponse({
    model: MODEL,
    input:[{ role:'user', content }],
    text:{ format:{ type:'json_schema', name:'spoony_detection', strict:true, schema:DETECTION_SCHEMA } }
  });
  return JSON.parse(response.output_text);
}

function demoDetection(text='', source='photo') {
  const t = (text || '').toLowerCase();
  if (t.includes('pasta') || t.includes('nudel')) {
    return {
      meal_label:'Pasta mit Gemüse', meal_type:'main',
      items:[
        {display_name:'Pasta',matrix_key:'Nudeln',primary_category:'Carbs',estimated_grams:180,estimated_count:null,estimated_spoonies:null,amount_text:'ca. 180 g',confidence:'medium',exact:false,note:''},
        {display_name:'Champignons',matrix_key:'Champignons',primary_category:'Plants',estimated_grams:150,estimated_count:null,estimated_spoonies:null,amount_text:'ca. 150 g',confidence:'medium',exact:false,note:''},
        {display_name:'Walnüsse',matrix_key:'Walnüsse',primary_category:'Fat',estimated_grams:20,estimated_count:null,estimated_spoonies:null,amount_text:'ca. 20 g',confidence:'medium',exact:false,note:''}
      ],
      uncertainties:['Sauce und zusätzliches Öl sind nicht eindeutig bestimmbar.'],
      aha_candidates:[
        {question:'Ich dachte, Champignons hätten mehr Protein?',angle:'misconception'},
        {question:'Warum kommen bei Pasta so schnell viele Carbs zusammen?',angle:'surprise'},
        {question:'Wie stark verändern Walnüsse den Fat-Anteil?',angle:'hidden_component'}
      ]
    };
  }
  return {
    meal_label:'Demo-Frühstück', meal_type:'breakfast',
    items:[
      {display_name:'Rührei',matrix_key:'Ei',primary_category:'Protein',estimated_grams:null,estimated_count:2,estimated_spoonies:null,amount_text:'ca. 2 Eier',confidence:'medium',exact:false,note:''},
      {display_name:'Tomate',matrix_key:'Tomate',primary_category:'Plants',estimated_grams:70,estimated_count:null,estimated_spoonies:null,amount_text:'ca. 70 g',confidence:'medium',exact:false,note:''},
      {display_name:'Toast',matrix_key:'Toast',primary_category:'Carbs',estimated_grams:null,estimated_count:2,estimated_spoonies:null,amount_text:'ca. 2 Scheiben',confidence:'medium',exact:false,note:''},
      {display_name:'Baked Beans',matrix_key:'Kidneybohnen',primary_category:'Protein',estimated_grams:80,estimated_count:null,estimated_spoonies:null,amount_text:'ca. 80 g',confidence:'medium',exact:false,note:''}
    ],
    uncertainties:['Demo-Modus: Ohne OPENAI_API_KEY wird das Foto nicht wirklich analysiert.'],
    aha_candidates:[
      {question:'Warum fehlen hier trotz Tomate noch Plants?',angle:'category_balance'},
      {question:'Ich dachte, Bohnen wären vor allem Carbs?',angle:'misconception'},
      {question:'Welche kleine Ergänzung würde den Teller am meisten verändern?',angle:'change'}
    ]
  };
}

async function answerFollowUp(question, context) {
  if (!API_KEY) return 'Im Demo-Modus kann ich Folgefragen nur beispielhaft beantworten. Mit hinterlegtem API-Schlüssel wird diese Antwort dynamisch aus deiner aktuellen Mahlzeit erzeugt.';
  const payload = {
    model: MODEL,
    instructions:`Du bist Spoony. Antworte knapp, verständlich und ohne Moralwertung. Nutze die Spoony-Systemlogik. Keine Kalorien nennen, außer ausdrücklich gefragt. Eine Primärkategorie pro Lebensmittel. Antworte in höchstens 4 kurzen Sätzen.`,
    input:`Mahlzeitenkontext:\n${JSON.stringify(context)}\n\nFrage des Nutzers: ${question}`
  };
  const response = await openaiResponse(payload);
  return response.output_text.trim();
}

async function askSpoony(question) {
  if (!API_KEY) return 'Spoony läuft gerade im Demo-Modus. Hinterlege OPENAI_API_KEY auf dem Server, dann beantworte ich Ernährungsfragen dynamisch.';
  const response = await openaiResponse({
    model: MODEL,
    instructions:`${rules}\n\nFür ASK SPOONY: Antworte direkt, kompakt und verständlich. Zwinge keine Spoonies in allgemeine Ernährungsfragen. Keine medizinische Diagnose oder Therapie.`,
    input:question
  });
  return response.output_text.trim();
}

const SUGGEST_SCHEMA = {
  type:'object', additionalProperties:false,
  properties:{
    options:{type:'array',minItems:3,maxItems:3,items:{type:'object',additionalProperties:false,properties:{title:{type:'string'},subtitle:{type:'string'},why:{type:'string'}},required:['title','subtitle','why']}},
    recommendation:{type:'string'}
  }, required:['options','recommendation']
};

async function suggestMeals(context) {
  if (!API_KEY) return { options:[
    {title:'Steak + Ofenkartoffeln + großer Salat',subtitle:'klarer Protein-Anker, Plants und Carbs',why:'Einfach und Spoony-kompatibel.'},
    {title:'Tofu-Gemüse-Bowl mit Reis',subtitle:'pflanzlich und gut aufteilbar',why:'Die vier Kategorien sind klar sichtbar.'},
    {title:'Omelett mit Gemüse + Vollkornbrot',subtitle:'schnell und alltagstauglich',why:'Gut für einen unkomplizierten Teller.'}
  ], recommendation:'Wähle die Option, die gerade am besten zu Hunger, Zeit und Situation passt.' };
  const response = await openaiResponse({
    model:MODEL,
    instructions:'Du bist Spoony. Schlage exakt drei alltagstaugliche Mahlzeiten vor. Keine Moralwertung, keine Kalorien. Jede Option soll eine klare Proteinquelle und einen sichtbaren Plant-Anteil haben; Carbs und Fat kontextabhängig. Kurz und konkret.',
    input:context || 'Ich weiß nicht, was ich essen soll.',
    text:{format:{type:'json_schema',name:'spoony_meal_suggestions',strict:true,schema:SUGGEST_SCHEMA}}
  });
  return JSON.parse(response.output_text);
}

function foodPayload(q) {
  const found = searchFood(q);
  const arr = Array.isArray(found) ? found : [found];
  return arr.filter(Boolean).map(item => ({
    name:item.name, category:item.category, unit:item.unit,
    amounts:item.amounts.map((a,i) => ({spoonies:i+1,label:a.label || (a.value != null ? `${a.value} ${item.reference}` : '')})),
    note:item.note
  }));
}

async function handleApi(req, res, url) {
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res,200,{ok:true,model:MODEL,demo:!API_KEY,matrixItems:matrixItems.length});

    if (req.method === 'POST' && url.pathname === '/api/check') {
      const body = await readJson(req);
      const source = body.imageDataUrl ? 'photo' : 'text';
      if (!body.imageDataUrl && !body.text) return json(res,400,{error:'Bitte Foto oder Text senden.'});
      const detection = await detectMeal({imageDataUrl:body.imageDataUrl,text:body.text || '',source});
      const result = buildResult({detectedItems:detection.items,mealType:detection.meal_type || 'main',source,aiFollowUps:detection.aha_candidates,uncertainties:detection.uncertainties});
      return json(res,200,{ok:true,mealLabel:detection.meal_label,result,demo:!API_KEY});
    }

    if (req.method === 'POST' && url.pathname === '/api/followup') {
      const body = await readJson(req, 2*1024*1024);
      if (!body.question) return json(res,400,{error:'Frage fehlt.'});
      const answer = await answerFollowUp(body.question, body.context || {});
      return json(res,200,{ok:true,answer,demo:!API_KEY});
    }

    if (req.method === 'POST' && url.pathname === '/api/ask') {
      const body = await readJson(req, 2*1024*1024);
      if (!body.question) return json(res,400,{error:'Frage fehlt.'});
      return json(res,200,{ok:true,answer:await askSpoony(body.question),demo:!API_KEY});
    }

    if (req.method === 'POST' && url.pathname === '/api/suggest') {
      const body = await readJson(req, 2*1024*1024);
      return json(res,200,{ok:true,...await suggestMeals(body.context || ''),demo:!API_KEY});
    }

    if (req.method === 'GET' && url.pathname === '/api/food') {
      const q = url.searchParams.get('q') || '';
      if (!q.trim()) return json(res,400,{error:'Lebensmittel fehlt.'});
      return json(res,200,{ok:true,results:foodPayload(q)});
    }

    return json(res,404,{error:'Not found'});
  } catch (err) {
    console.error(err);
    const message = String(err?.message || err);
    if (message === 'missing_api_key') return json(res,503,{error:'OPENAI_API_KEY fehlt auf dem Server.'});
    if (message === 'payload_too_large') return json(res,413,{error:'Bild ist zu groß.'});
    return json(res,500,{error:'Spoony konnte die Anfrage gerade nicht verarbeiten.',detail:process.env.NODE_ENV === 'development' ? message : undefined});
  }
}

function serveStatic(req,res,url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname='/index.html';
  if (pathname.includes('..')) { res.writeHead(400); return res.end('Bad request'); }
  const file = path.join(publicDir, pathname);
  if (!file.startsWith(publicDir)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file,(err,stat)=>{
    if (err || !stat.isFile()) {
      const fallback=path.join(publicDir,'index.html');
      res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
      return fs.createReadStream(fallback).pipe(res);
    }
    const ext=path.extname(file);
    const headers={'content-type':MIME[ext] || 'application/octet-stream'};
    if (pathname === '/sw.js') headers['cache-control']='no-cache';
    else if (pathname.startsWith('/icons/')) headers['cache-control']='public, max-age=604800';
    res.writeHead(200,headers);
    fs.createReadStream(file).pipe(res);
  });
}

const server=http.createServer(async (req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req,res,url);
  return serveStatic(req,res,url);
});

server.listen(PORT,()=>console.log(`Spoony PWA listening on http://localhost:${PORT} (${API_KEY ? MODEL : 'DEMO MODE'})`));
