import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const matrixPath = path.join(__dirname, '..', 'data', 'matrix.json');
const matrixData = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
export const matrixItems = matrixData.items;

const CATEGORY_META = {
  Protein: { color: '#3b82f6', icon: 'protein', unit: 'Spoonies', target: 2 },
  Plants: { color: '#22c55e', icon: 'plants', unit: 'Spoonies', target: 2 },
  Carbs: { color: '#ef4444', icon: 'carbs', unit: 'Spoonies', target: 2 },
  Fat: { color: '#8b5e3c', icon: 'fat', unit: 'Teaspoonies', target: 1.5 },
};

const aliasMap = new Map(Object.entries({
  'hähnchen': 'Hähnchenbrust',
  'hähnchenfilet': 'Hähnchenbrust',
  'chicken': 'Hähnchenbrust',
  'pute': 'Putenbrust',
  'putenfilet': 'Putenbrust',
  'steak': 'Rindersteak',
  'rind': 'Rindersteak',
  'rindfleisch': 'Rindersteak',
  'beef': 'Rindersteak',
  'lachsfilet': 'Lachs',
  'tuna': 'Thunfisch',
  'ei': 'Ei',
  'eier': 'Ei',
  'rührei': 'Ei',
  'spiegelei': 'Ei',
  'tofu': 'Tofu natur',
  'räuchertofu': 'Räuchertofu',
  'skyr': 'Skyr natur',
  'magerquark': 'Magerquark',
  'hüttenkäse': 'Hüttenkäse',
  'cottage cheese': 'Cottage Cheese',
  'linsen': 'Linsen',
  'kichererbsen': 'Kichererbsen',
  'kidneybohnen': 'Kidneybohnen',
  'schwarze bohnen': 'Schwarze Bohnen',
  'weiße bohnen': 'Weiße Bohnen',
  'weisse bohnen': 'Weiße Bohnen',
  'bohnen': 'Kidneybohnen',
  'baked beans': 'Kidneybohnen',
  'edamame': 'Edamame',
  'salat': 'Blattsalat',
  'blattsalat': 'Blattsalat',
  'eisbergsalat': 'Eisbergsalat',
  'romanasalat': 'Romanasalat',
  'rucola': 'Rucola',
  'spinat': 'Spinat gekocht',
  'babyspinat': 'Babyspinat',
  'brokkoli': 'Brokkoli',
  'broccoli': 'Brokkoli',
  'blumenkohl': 'Blumenkohl',
  'tomate': 'Tomate',
  'tomaten': 'Tomate',
  'cherrytomaten': 'Cherrytomaten',
  'gurke': 'Gurke',
  'paprika': 'Paprika',
  'champignons': 'Champignons',
  'pilze': 'Pilze',
  'zucchini': 'Zucchini',
  'karotte': 'Karotte',
  'karotten': 'Karotte',
  'gemüse': 'Gemüsemix',
  'gemüsemix': 'Gemüsemix',
  'apfel': 'Apfel',
  'banane': 'Banane',
  'beeren': 'Beeren',
  'erdbeeren': 'Erdbeeren',
  'himbeeren': 'Himbeeren',
  'blaubeeren': 'Blaubeeren',
  'reis': 'Reis weiß',
  'weißer reis': 'Reis weiß',
  'weisser reis': 'Reis weiß',
  'vollkornreis': 'Reis Vollkorn',
  'basmatireis': 'Basmati-Reis',
  'jasminreis': 'Jasmin-Reis',
  'pasta': 'Nudeln',
  'nudeln': 'Nudeln',
  'spaghetti': 'Nudeln',
  'penne': 'Nudeln',
  'fusilli': 'Nudeln',
  'high protein pasta': 'Nudeln',
  'high-protein-pasta': 'Nudeln',
  'vollkornnudeln': 'Vollkornnudeln',
  'kartoffel': 'Kartoffeln',
  'kartoffeln': 'Kartoffeln',
  'drillinge': 'Drillinge',
  'haferflocken': 'Haferflocken',
  'müsli': 'Müsli',
  'brot': 'Mischbrot',
  'vollkornbrot': 'Vollkornbrot',
  'toast': 'Toast',
  'vollkorntoast': 'Vollkorntoast',
  'brötchen': 'Brötchen',
  'bagel': 'Bagel',
  'mais': 'Mais',
  'olivenöl': 'Olivenöl',
  'öl': 'Olivenöl',
  'rapsöl': 'Rapsöl',
  'butter': 'Butter',
  'margarine': 'Margarine',
  'mayonnaise': 'Mayonnaise',
  'mayo': 'Mayonnaise',
  'pesto': 'Pesto',
  'feta': 'Feta',
  'cheddar': 'Cheddar',
  'mozzarella': 'Mozzarella',
  'käse': 'Gouda',
  'gouda': 'Gouda',
  'walnüsse': 'Walnüsse',
  'walnuss': 'Walnüsse',
  'mandeln': 'Mandeln',
  'cashews': 'Cashews',
  'erdnüsse': 'Erdnüsse',
  'erdnussmus': 'Erdnussmus',
  'nussmus': 'Mandelmus',
  'tahini': 'Tahini',
  'avocado': 'Avocado',
  'guacamole': 'Avocado',
}));

function norm(s = '') {
  return s.toLocaleLowerCase('de-DE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9äöüß]+/gi, ' ')
    .trim();
}

const byNormName = new Map(matrixItems.map(item => [norm(item.name), item]));

export function getMatrixCatalog() {
  return matrixItems.map(({ name, category }) => ({ name, category }));
}

export function findMatrixItem(name) {
  if (!name) return null;
  const direct = byNormName.get(norm(name));
  if (direct) return direct;
  const alias = aliasMap.get(norm(name));
  if (alias) return byNormName.get(norm(alias)) || null;
  const n = norm(name);
  // cautious contains-match only if reasonably specific
  const candidates = matrixItems.filter(i => {
    const m = norm(i.name);
    return n.length >= 5 && (n.includes(m) || m.includes(n));
  });
  if (candidates.length === 1) return candidates[0];
  return null;
}

function nearestStepFromAmount(item, amount, amountUnit) {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const values = item.amounts.map(a => a.value);
  const kinds = item.amounts.map(a => a.kind);
  const targetKind = amountUnit === 'piece' ? 'piece' : 'g';
  const usable = values.filter((v, idx) => Number.isFinite(v) && kinds[idx] === targetKind);
  if (!usable.length) return null;
  const first = usable[0];
  if (!first || first <= 0) return null;
  const raw = amount / first;
  // Half-spoony resolution for estimates, quarter would imply false precision.
  return Math.max(0.5, Math.min(8, Math.round(raw * 2) / 2));
}

export function mapDetectedItem(detected, source = 'photo') {
  const matrix = findMatrixItem(detected.matrix_key || detected.display_name || detected.name);
  const primaryCategory = matrix?.category || detected.primary_category || null;
  if (!primaryCategory || !CATEGORY_META[primaryCategory]) return null;

  const amountG = Number.isFinite(detected.estimated_grams) ? detected.estimated_grams : null;
  const pieceCount = Number.isFinite(detected.estimated_count) ? detected.estimated_count : null;
  const amountUnit = pieceCount != null ? 'piece' : 'g';
  const numericAmount = pieceCount != null ? pieceCount : amountG;
  let spoonies = matrix ? nearestStepFromAmount(matrix, numericAmount, amountUnit) : null;
  if (!Number.isFinite(spoonies) && Number.isFinite(numericAmount)) {
    const fallbackBase = { Protein: 50, Plants: 50, Carbs: 50, Fat: 10 }[primaryCategory];
    if (fallbackBase) spoonies = Math.max(0.5, Math.min(8, Math.round((numericAmount / fallbackBase) * 2) / 2));
  }
  if (!Number.isFinite(spoonies) && Number.isFinite(detected.estimated_spoonies)) {
    spoonies = Math.max(0.5, Math.min(8, Math.round(detected.estimated_spoonies * 2) / 2));
  }

  return {
    displayName: detected.display_name || detected.name || matrix?.name || 'Lebensmittel',
    matrixKey: matrix?.name || null,
    category: primaryCategory,
    spoonies,
    amountText: detected.amount_text || (amountG ? `${Math.round(amountG)} g` : pieceCount ? `${pieceCount} Stück` : ''),
    estimated: source === 'photo' || detected.exact === false,
    confidence: detected.confidence || 'medium',
    note: matrix?.note || detected.note || '',
  };
}

export function aggregate(mappedItems = []) {
  const groups = Object.fromEntries(Object.keys(CATEGORY_META).map(k => [k, { total: 0, items: [], estimated: false }]));
  for (const item of mappedItems) {
    if (!item || !groups[item.category]) continue;
    groups[item.category].items.push(item);
    groups[item.category].estimated ||= item.estimated;
    if (Number.isFinite(item.spoonies)) groups[item.category].total += item.spoonies;
  }
  for (const g of Object.values(groups)) g.total = Math.round(g.total * 2) / 2;
  return groups;
}

function relativeDeficit(groups, category) {
  const meta = CATEGORY_META[category];
  const total = groups[category]?.total ?? 0;
  return total / meta.target;
}

export function chooseRecommendation(groups, mealType = 'main') {
  const mainLike = ['main', 'breakfast', 'lunch', 'dinner'].includes(mealType);
  const p = groups.Protein?.total ?? 0;
  const pl = groups.Plants?.total ?? 0;
  const c = groups.Carbs?.total ?? 0;
  const f = groups.Fat?.total ?? 0;

  if (!mainLike) {
    if (p === 0 && pl === 0 && c === 0 && f === 0) {
      return { type: 'neutral', text: 'Dafür brauche ich etwas mehr Information zur Menge oder zu den Zutaten.' };
    }
    return { type: 'neutral', text: 'Für einen Snack muss nicht jede Spoony-Kategorie vertreten sein.' };
  }

  const deficits = [
    ['Plants', relativeDeficit(groups, 'Plants')],
    ['Protein', relativeDeficit(groups, 'Protein')],
  ].sort((a,b) => a[1]-b[1]);

  // Plants get priority when clearly underrepresented and protein is at least present.
  if (pl < 2 && (p >= 1 || deficits[0][0] === 'Plants')) {
    return {
      type: 'plants',
      text: 'Hier würde ich vor allem noch Plants ergänzen – passend zur Mahlzeit zum Beispiel Gemüse, Salat oder Obst.'
    };
  }

  if (p < 2) {
    return {
      type: 'protein',
      text: 'Hier fehlt vor allem eine klare Proteinquelle. Eine passende Proteinportion würde die Mahlzeit sinnvoll ergänzen.'
    };
  }

  // Only call out carbs/fat when the imbalance is obvious, not simply because they are present.
  if (c >= 5 && pl < 3) {
    return {
      type: 'balance',
      text: 'Die Mahlzeit ist stark carb-lastig. Mehr Plants wäre hier die sinnvollste Ergänzung, statt einzelne Lebensmittel zu verbieten.'
    };
  }

  if (f >= 4 && pl < 3) {
    return {
      type: 'balance',
      text: 'Hier fällt vor allem der hohe Fat-Anteil auf. Mehr Plants würde die Mahlzeit ausgleichen, ohne die Fettquellen pauschal schlecht zu bewerten.'
    };
  }

  return { type: 'ok', text: 'Passt so. Hier musst du nichts zwingend verändern.' };
}

export function localAhaQuestions(groups, items = []) {
  const names = items.map(i => i.displayName.toLocaleLowerCase('de-DE'));
  const qs = [];
  const push = (q, angle) => { if (!qs.some(x => x.angle === angle || x.question === q) && qs.length < 3) qs.push({ question:q, angle }); };

  if (names.some(n => n.includes('bohne'))) push('Ich dachte, Bohnen wären vor allem Protein?', 'misconception');
  if (names.some(n => n.includes('champignon') || n.includes('pilz'))) push('Ich dachte, Pilze hätten mehr Protein?', 'misconception');
  if (names.some(n => n.includes('avocado') || n.includes('guacamole'))) push('Warum zählt Avocado bei Spoony vor allem zu Fat?', 'hidden_component');
  if ((groups.Plants?.total ?? 0) < 2) push('Warum fehlen hier trotz etwas Gemüse noch Plants?', 'category_balance');
  if ((groups.Carbs?.total ?? 0) >= 4) push('Warum kommen hier so schnell viele Carbs zusammen?', 'surprise');
  if ((groups.Fat?.total ?? 0) >= 3) push('Welche Bestandteile treiben hier den Fat-Anteil nach oben?', 'hidden_component');
  if ((groups.Protein?.total ?? 0) < 2) push('Woran erkenne ich eine klare Proteinportion?', 'comparison');
  if (qs.length < 3) push('Wie würde Spoony diese Mahlzeit mit nur einer kleinen Änderung verbessern?', 'change');
  if (qs.length < 3) push('Welche Kategorie ist auf diesem Teller am stärksten vertreten?', 'category_balance');
  return qs.slice(0,3);
}

function amountLabel(total, category, estimated) {
  const unit = category === 'Fat' ? (total === 1 ? 'Teaspoony' : 'Teaspoonies') : (total === 1 ? 'Spoony' : 'Spoonies');
  if (!Number.isFinite(total) || total <= 0) return category === 'Protein' ? '0 klare Spoonies' : `0 ${unit}`;
  const value = Number.isInteger(total) ? String(total) : String(total).replace('.', ',');
  return `${estimated ? 'ca. ' : ''}${value} ${unit}`;
}

export function buildResult({ detectedItems = [], mealType = 'main', source = 'photo', aiFollowUps = [], uncertainties = [] }) {
  const mapped = detectedItems.map(i => mapDetectedItem(i, source)).filter(Boolean);
  const groups = aggregate(mapped);
  const rec = chooseRecommendation(groups, mealType);

  const categoryOrder = ['Protein','Plants','Carbs','Fat'];
  const categories = categoryOrder.map(category => {
    const g = groups[category];
    return {
      label: category,
      color: CATEGORY_META[category].color,
      amountLabel: amountLabel(g.total, category, g.estimated || source === 'photo'),
      spoons: g.total,
      foods: g.items.map(i => i.displayName),
    };
  });

  const seenAngles = new Set();
  const followUps = [];
  for (const f of aiFollowUps || []) {
    if (!f?.question || !f?.angle || seenAngles.has(f.angle)) continue;
    seenAngles.add(f.angle);
    followUps.push(f);
    if (followUps.length === 3) break;
  }
  for (const f of localAhaQuestions(groups, mapped)) {
    if (followUps.length === 3) break;
    if (!seenAngles.has(f.angle)) { seenAngles.add(f.angle); followUps.push(f); }
  }

  return {
    categories,
    recommendation: rec.text,
    recommendationType: rec.type,
    followUps: followUps.slice(0,3),
    uncertainties: uncertainties || [],
    mappedItems: mapped,
    mealType,
    source,
  };
}

export function searchFood(query) {
  const exact = findMatrixItem(query);
  if (exact) return exact;
  const n = norm(query);
  return matrixItems
    .map(item => ({ item, score: similarity(n, norm(item.name)) }))
    .filter(x => x.score > 0.32)
    .sort((a,b) => b.score-a.score)
    .slice(0,5)
    .map(x => x.item);
}

function similarity(a,b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aa = new Set(a.split(' '));
  const bb = new Set(b.split(' '));
  const inter = [...aa].filter(x => bb.has(x)).length;
  const union = new Set([...aa,...bb]).size;
  let s = union ? inter/union : 0;
  if (a.includes(b) || b.includes(a)) s = Math.max(s, Math.min(a.length,b.length)/Math.max(a.length,b.length));
  return s;
}

export { CATEGORY_META };
