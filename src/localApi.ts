// In-browser replacement for the Express/SQLite API.
// Used for the static build (GitHub Pages), where there is no server:
// every `fetch('/api/...')` call is answered here and data is kept in
// the browser's IndexedDB, so it stays on this device.

type Row = Record<string, any>;
interface Store {
  meals: Row[];
  exercise: Row[];
  ketones: Row[];
  weight: Row[];
  stats: Row;
  nextId: number;
}

const DB_NAME = 'ketotrack';
const STORE = 'kv';
const KEY = 'data';

function emptyStore(): Store {
  return {
    meals: [], exercise: [], ketones: [], weight: [],
    stats: { id: 1, xp: 0, level: 1, streak_days: 0, last_log_date: null, badges: '[]' },
    nextId: 1,
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let cache: Store | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

async function load(): Promise<Store> {
  if (cache) return cache;
  dbPromise ||= openDb();
  const db = await dbPromise;
  const data = await new Promise<Store | undefined>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  cache = { ...emptyStore(), ...(data || {}) };
  return cache;
}

async function save(s: Store) {
  const db = await dbPromise!;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(s, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const nowIso = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const sortByTime = (a: Row, b: Row) => (a.date + a.time).localeCompare(b.date + b.time);

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calcLevel(xp: number): number {
  if (xp >= 1500) return 6;
  if (xp >= 1000) return 5;
  if (xp >= 600) return 4;
  if (xp >= 300) return 3;
  if (xp >= 100) return 2;
  return 1;
}

function addXp(s: Store, amount: number) {
  s.stats.xp += amount;
  s.stats.level = calcLevel(s.stats.xp);
}

function award(s: Store, ids: string[]): string[] {
  const badges: string[] = JSON.parse(s.stats.badges || '[]');
  const added = ids.filter(id => !badges.includes(id));
  if (added.length) s.stats.badges = JSON.stringify([...badges, ...added]);
  return added;
}

function insert(s: Store, table: 'meals' | 'exercise' | 'ketones' | 'weight', row: Row): Row {
  const full = { id: s.nextId++, ...row, created_at: nowIso() };
  s[table].push(full);
  return full;
}

function updateStreak(s: Store, today: string) {
  const last = s.stats.last_log_date;
  if (!last) s.stats.streak_days = 1;
  else if (last !== today) {
    const diff = Math.round((new Date(today).getTime() - new Date(last).getTime()) / 86400000);
    s.stats.streak_days = diff === 1 ? s.stats.streak_days + 1 : 1;
  }
  s.stats.last_log_date = today;
}

async function foodSearch(q: string) {
  if (!q) return { products: [] };
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=8&fields=product_name,nutriments,serving_size,image_thumb_url,brands`;
  try {
    const parsed = await (await realFetch(url)).json();
    const products = (parsed.products || []).map((p: any) => ({
      name: p.product_name || 'Unknown',
      brand: p.brands || '',
      serving_size: p.serving_size || '100g',
      image: p.image_thumb_url || null,
      calories: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
      fat: Math.round((p.nutriments?.fat_100g || 0) * 10) / 10,
      protein: Math.round((p.nutriments?.proteins_100g || 0) * 10) / 10,
      carbs: Math.round((p.nutriments?.carbohydrates_100g || 0) * 10) / 10,
      fiber: Math.round((p.nutriments?.fiber_100g || 0) * 10) / 10,
    })).filter((p: any) => p.name && p.name !== 'Unknown');
    return { products };
  } catch {
    return { products: [] };
  }
}

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function handle(method: string, path: string, q: URLSearchParams, body: any): Promise<any> {
  const s = await load();
  const parts = path.replace(/^\/api\//, '').split('/').filter(Boolean);
  const [resource, sub, sub2] = parts;
  const need = (ok: boolean, msg: string) => { if (!ok) throw new HttpError(400, msg); };
  let changed = false;
  let result: any;

  if (resource === 'stats') {
    result = s.stats;
  } else if (resource === 'calendar') {
    need(!!q.get('year') && !!q.get('month'), 'year and month required');
    const prefix = `${q.get('year')}-${String(q.get('month')).padStart(2, '0')}`;
    const out: Record<string, { meals: boolean; exercise: boolean; ketones: boolean }> = {};
    for (const key of ['meals', 'exercise', 'ketones'] as const) {
      for (const r of s[key]) {
        if (!r.date.startsWith(prefix)) continue;
        out[r.date] ||= { meals: false, exercise: false, ketones: false };
        out[r.date][key] = true;
      }
    }
    result = out;
  } else if (resource === 'ai' && sub === 'search') {
    result = await foodSearch(q.get('q') || '');
  } else if (resource === 'meals' || resource === 'exercise' || resource === 'ketones' || resource === 'weight') {
    const table = s[resource];
    if (method === 'DELETE' && sub) {
      s[resource] = table.filter(r => String(r.id) !== sub);
      changed = true;
      result = { success: true };
    } else if (method === 'GET') {
      if (resource === 'weight' && sub === 'date') {
        result = table.filter(r => r.date === sub2).sort((a, b) => a.time_of_day.localeCompare(b.time_of_day));
      } else if (resource === 'ketones' || resource === 'weight') {
        const from = daysAgo(parseInt(q.get('days') || '') || (resource === 'weight' ? 60 : 30));
        result = table.filter(r => r.date >= from).sort(resource === 'weight'
          ? (a, b) => (a.date + a.time_of_day).localeCompare(b.date + b.time_of_day)
          : sortByTime);
      } else {
        need(!!q.get('date'), 'date query param required');
        result = table.filter(r => r.date === q.get('date')).sort(sortByTime);
      }
    } else if (method === 'POST') {
      const b = body || {};
      changed = true;
      if (resource === 'meals') {
        need(b.date && b.time && b.category && b.name, 'date, time, category, name are required');
        const meal = insert(s, 'meals', {
          date: b.date, time: b.time, category: b.category, name: b.name,
          calories: b.calories || 0, fat: b.fat || 0, protein: b.protein || 0,
          carbs: b.carbs || 0, fiber: b.fiber || 0, notes: b.notes || null, image_data: b.image_data || null,
        });
        addXp(s, 10);
        updateStreak(s, b.date);
        const ids = ['first_meal'];
        if (s.stats.streak_days >= 3) ids.push('streak_3');
        if (s.stats.streak_days >= 7) ids.push('streak_7');
        if (s.exercise.length >= 5) ids.push('gym_rat');
        const lastK = [...s.ketones].sort((a, b) => a.created_at.localeCompare(b.created_at)).pop();
        if (lastK?.level >= 0.5) ids.push('keto_confirmed');
        if (lastK?.level >= 1.5) ids.push('deep_ketosis');
        result = { meal, xp_gained: 10, new_xp: s.stats.xp, level: s.stats.level, new_streak: s.stats.streak_days, new_badges: award(s, ids) };
      } else if (resource === 'exercise') {
        need(b.date && b.time && b.type, 'date, time, type are required');
        const exercise = insert(s, 'exercise', {
          date: b.date, time: b.time, type: b.type, duration_minutes: b.duration_minutes || null, notes: b.notes || null,
        });
        addXp(s, 15);
        result = { exercise, xp_gained: 15, new_xp: s.stats.xp, level: s.stats.level, new_badges: award(s, s.exercise.length >= 5 ? ['gym_rat'] : []) };
      } else if (resource === 'ketones') {
        need(b.date && b.time && b.level !== undefined && b.level !== null, 'date, time, level are required');
        const ketone = insert(s, 'ketones', {
          date: b.date, time: b.time, level: b.level, glucose: b.glucose ?? null, notes: b.notes || null,
        });
        const xp = 5 + (b.level >= 1.5 && b.level <= 3.0 ? 20 : 0);
        addXp(s, xp);
        const ids: string[] = [];
        if (b.level >= 0.5) ids.push('keto_confirmed');
        if (b.level >= 1.5) ids.push('deep_ketosis');
        result = { ketone, xp_gained: xp, new_xp: s.stats.xp, level: s.stats.level, new_badges: award(s, ids) };
      } else {
        need(b.date && b.time_of_day && b.kg !== undefined, 'date, time_of_day, kg are required');
        need(['morning', 'noon', 'night'].includes(b.time_of_day), 'time_of_day must be morning, noon, or night');
        s.weight = s.weight.filter(r => !(r.date === b.date && r.time_of_day === b.time_of_day));
        const entry = insert(s, 'weight', { date: b.date, time_of_day: b.time_of_day, kg: b.kg });
        addXp(s, 5);
        result = { entry, xp_gained: 5, new_xp: s.stats.xp, level: s.stats.level };
      }
    }
  }

  if (result === undefined) throw new HttpError(404, 'Not found');
  if (changed) await save(s);
  return result;
}

const realFetch = window.fetch.bind(window);

export function installLocalApi() {
  navigator.storage?.persist?.().catch(() => {});
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
      return realFetch(input, init);
    }
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    let body: any = undefined;
    if (typeof init?.body === 'string') {
      try { body = JSON.parse(init.body); } catch { body = undefined; }
    }
    try {
      const data = await handle(method, url.pathname, url.searchParams, body);
      return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (err: any) {
      const status = err instanceof HttpError ? err.status : 500;
      return new Response(JSON.stringify({ error: err?.message || 'Error' }), { status, headers: { 'Content-Type': 'application/json' } });
    }
  };
}
