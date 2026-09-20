// ─── CONFIG & SUPABASE ────────────────────────────────────────────────────────

let db = null;

function saveConfig() {
  const url = document.getElementById('cfg-url').value.trim();
  const key = document.getElementById('cfg-key').value.trim();
  const err = document.getElementById('cfg-error');
  if (!url || !key) { err.style.display = 'block'; err.textContent = 'Both fields are required.'; return; }
  if (!url.startsWith('https://')) { err.style.display = 'block'; err.textContent = 'URL should start with https://'; return; }
  localStorage.setItem('sb_url', url);
  localStorage.setItem('sb_key', key);
  initSupabase(url, key);
}

function initSupabase(url, key) {
  try {
    db = window.supabase.createClient(url, key);
    document.getElementById('config-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    init();
  } catch(e) {
    const err = document.getElementById('cfg-error');
    err.style.display = 'block';
    err.textContent = 'Could not connect. Check your URL and key.';
  }
}

function resetConfig() {
  if (!confirm('Disconnect Supabase? Your data stays in the database.')) return;
  localStorage.removeItem('sb_url');
  localStorage.removeItem('sb_key');
  location.reload();
}

// ─── DB HELPERS ───────────────────────────────────────────────────────────────

function syncStatus(msg, isError = false) {
  const el = document.getElementById('sync-status');
  el.textContent = msg;
  el.className = isError ? 'error' : '';
  if (msg) setTimeout(() => { el.textContent = ''; el.className = ''; }, 3000);
}

async function dbGet(table) {
  try {
    const { data, error } = await db.from(table).select('*');
    if (error) throw error;
    const result = data || [];
    localStorage.setItem('cache_' + table, JSON.stringify(result));
    return result;
  } catch(e) {
    syncStatus('Sync error — using local cache', true);
    const cached = localStorage.getItem('cache_' + table);
    return cached ? JSON.parse(cached) : [];
  }
}

async function dbUpsert(table, row, conflict = 'id') {
  try {
    const { error } = await db.from(table).upsert(row, { onConflict: conflict });
    if (error) throw error;
    syncStatus('Saved ✓');
  } catch(e) {
    syncStatus('Offline — saved locally', true);
  }
  const cached = JSON.parse(localStorage.getItem('cache_' + table) || '[]');
  const key = conflict === 'date' ? 'date' : 'id';
  const idx = cached.findIndex(r => r[key] === row[key]);
  if (idx >= 0) cached[idx] = row; else cached.push(row);
  localStorage.setItem('cache_' + table, JSON.stringify(cached));
}

async function dbDelete(table, id) {
  try {
    const { error } = await db.from(table).delete().eq('id', id);
    if (error) throw error;
  } catch(e) { syncStatus('Offline — will sync later', true); }
  const cached = JSON.parse(localStorage.getItem('cache_' + table) || '[]').filter(r => r.id !== id);
  localStorage.setItem('cache_' + table, JSON.stringify(cached));
}

async function dbGetKV(key) {
  try {
    const { data, error } = await db.from('kv_store').select('value').eq('key', key).maybeSingle();
    if (error) throw error;
    return data?.value ? JSON.parse(data.value) : null;
  } catch(e) {
    const cached = localStorage.getItem('kv_' + key);
    return cached ? JSON.parse(cached) : null;
  }
}

async function dbSetKV(key, value) {
  const serialized = JSON.stringify(value);
  try {
    await db.from('kv_store').upsert({ key, value: serialized }, { onConflict: 'key' });
  } catch(e) {}
  localStorage.setItem('kv_' + key, serialized);
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MUSCLE_COLORS = {
  Chest:'#3b82f6', Back:'#10b981', Shoulders:'#a855f7', Biceps:'#f97316',
  Triceps:'#ef4444', Quads:'#06b6d4', Hamstrings:'#f59e0b', Glutes:'#d97706',
  Calves:'#6b7280', Core:'#dc2626'
};
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const RECOVERY_NOTES = 'Hamstrings recover slowly — Stiff-Leg Deadlift is only on Tuesday, never in makeup sessions. Squat, Stiff-Leg Deadlift, and Bench Press are joint-sensitive heavy lifts capped at 6 reps by choice — 6 reps IS the target on these.';
const INCREMENT = { Chest:2.5, Back:10, Shoulders:2.5, Biceps:2.5, Triceps:2.5, Quads:10, Hamstrings:10, Glutes:10, Calves:10, Core:2.5 };
const JOINT_SENSITIVE = ['Squat','Stiff-Leg Deadlift','Bench Press','Dumbbell Bench Press'];
const MUSCLES = ['Chest','Back','Shoulders','Biceps','Triceps','Quads','Hamstrings','Glutes','Calves','Core'];

const DEFAULT_TEMPLATES = [
  { id:'t1', name:'Pull', days:['Mon'], exercises:[
    {name:'Barbell Row',sets:2,reps:'8-12',muscle:'Back'},
    {name:'Lat Pulldown',sets:2,reps:'8-12',muscle:'Back'},
    {name:'Cable Row',sets:2,reps:'10-12',muscle:'Back'},
    {name:'Bicep Curl',sets:2,reps:'10-12',muscle:'Biceps'},
    {name:'Rear Delt Fly',sets:2,reps:'15-20',muscle:'Shoulders'},
    {name:'Incline Curl',sets:2,reps:'10-12',muscle:'Biceps'},
  ]},
  { id:'t2', name:'Legs A', days:['Tue'], exercises:[
    {name:'Leg Extension',sets:2,reps:'12-15',muscle:'Quads'},
    {name:'Stiff-Leg Deadlift',sets:2,reps:'4-6',muscle:'Hamstrings'},
    {name:'Hip Thrust',sets:2,reps:'10-12',muscle:'Glutes'},
    {name:'Calf Raise',sets:2,reps:'15-20',muscle:'Calves'},
    {name:'Leg Curl',sets:2,reps:'10-12',muscle:'Hamstrings'},
  ]},
  { id:'t3', name:'Push + Pull', days:['Wed'], exercises:[
    {name:'Bench Press',sets:2,reps:'4-6',muscle:'Chest'},
    {name:'Barbell Row',sets:2,reps:'8-12',muscle:'Back'},
    {name:'Lateral Raise',sets:3,reps:'12-15',muscle:'Shoulders'},
    {name:'Hammer Curls',sets:2,reps:'10-12',muscle:'Biceps'},
    {name:'Tricep Pushdown',sets:3,reps:'12-15',muscle:'Triceps'},
  ]},
  { id:'t4', name:'Legs B', days:['Fri'], exercises:[
    {name:'Leg Extension',sets:2,reps:'12-15',muscle:'Quads'},
    {name:'Squat',sets:2,reps:'4-6',muscle:'Quads'},
    {name:'Calf Raise',sets:2,reps:'15-20',muscle:'Calves'},
    {name:'Split Squat',sets:2,reps:'8-10',muscle:'Quads'},
  ]},
  { id:'t5', name:'Push', days:['Sat'], exercises:[
    {name:'Bench Press',sets:2,reps:'4-6',muscle:'Chest'},
    {name:'Incline Press',sets:2,reps:'8-12',muscle:'Chest'},
    {name:'Chest Fly',sets:2,reps:'12-15',muscle:'Chest'},
    {name:'Lateral Raise',sets:3,reps:'12-15',muscle:'Shoulders'},
    {name:'Overhead Tricep Extension',sets:3,reps:'10-12',muscle:'Triceps'},
  ]}
];

const SEEDED_WEIGHTS = {};

// ─── STATE ────────────────────────────────────────────────────────────────────

let workouts = [], templates = [], workingWeights = {}, progressChart = null;
let exerciseRegistry = []; // [{name, muscle}]
let appSettings = { autoStartTimer: false, defaultRestSeconds: 180, restDays: [] };
let restDayOverride = false;
let volumeMode = 'rolling';
let viewingDate = null;    // null = today, 'YYYY-MM-DD' = viewing another date
let windowAnchor = null;   // center of the 7-tile grid; null = today
let editingPastSetId = null;
const expandedTemplates = new Set();

let todayDay = null;
let sessionSets = {};
let nudgeDismissed = new Set();
const editingSetPrefill = {}; // { 'ExName-0': { weight, reps } } — pre-fills inputs after pencil edit
let newTmplExercises = [];
let editingEx = null;
let editingRegistryEx = null; // name of the registry exercise currently being edited
let editingTemplateName = null;
let templateAddExOpen = null; // id of the template whose "add exercise" form is open
let pendingMakeupExercises = [];

// ─── TIMER STATE ──────────────────────────────────────────────────────────────

let timerTotal = 180, timerRemaining = 180, timerRunning = false, timerInterval = null;
let timerEndTime = null; // absolute ms timestamp when timer will reach zero
const expandedCards = new Set();
let addExOpen = false;

const _timerWorkerSrc = `
  let _iv = null;
  onmessage = function(e) {
    if (e.data === 'start') {
      clearInterval(_iv);
      _iv = setInterval(() => postMessage('tick'), 1000);
    } else if (e.data === 'stop') {
      clearInterval(_iv);
    }
  };
`;
const _timerWorker = new Worker(URL.createObjectURL(new Blob([_timerWorkerSrc], { type: 'application/javascript' })));
_timerWorker.onmessage = () => {
  if (!timerRunning) return;
  timerRemaining--;
  timerUpdateDisplay();
  if (timerRemaining <= 0) {
    _timerWorker.postMessage('stop');
    timerRunning = false;
    timerOnDone();
  }
};

// ─── INIT ─────────────────────────────────────────────────────────────────────

async function init() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
  syncStatus('Loading...');

  const rawWorkouts = await dbGet('workouts');
  workouts = rawWorkouts.map(r => ({
    id: r.id, date: r.date, exercise: r.exercise, muscle: r.muscle,
    weight: r.weight, reps: r.reps, ts: new Date(r.created_at).getTime(), pr: r.is_pr
  }));

  const savedTemplates = await dbGetKV('templates');
  templates = savedTemplates || DEFAULT_TEMPLATES;
  await dbSetKV('templates', templates);

  const savedWW = await dbGetKV('working_weights');
  workingWeights = { ...SEEDED_WEIGHTS };
  if (savedWW) Object.entries(savedWW).forEach(([k, v]) => { workingWeights[k] = v; });

  // Load exercise registry — seed from DEFAULT_TEMPLATES if empty
  const savedRegistry = await dbGetKV('exercises');
  if (savedRegistry && savedRegistry.length > 0) {
    exerciseRegistry = savedRegistry;
  } else {
    const seen = new Set();
    DEFAULT_TEMPLATES.forEach(t => t.exercises.forEach(ex => {
      if (!seen.has(ex.name)) { seen.add(ex.name); exerciseRegistry.push({ name: ex.name, muscle: ex.muscle }); }
    }));
    await dbSetKV('exercises', exerciseRegistry);
  }

  const savedSettings = await dbGetKV('settings');
  if (savedSettings) appSettings = { ...appSettings, ...savedSettings };
  timerTotal = appSettings.defaultRestSeconds;
  timerRemaining = timerTotal;

  await ensureTodayDay();
  syncStatus('');
  renderAll();
  initCalendarSwipe();
}

function initCalendarSwipe() {
  const el = document.getElementById('week-grid-log');
  if (!el) return;
  let startX = 0, startY = 0;
  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  el.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      weekNav(dx < 0 ? -1 : 1); // swipe left = back, swipe right = forward
    }
  }, { passive: true });
}

// ─── EXERCISE REGISTRY ───────────────────────────────────────────────────────

function lookupRegistryEntry(name) {
  return exerciseRegistry.find(e => e.name.toLowerCase() === name.toLowerCase()) || null;
}
function lookupMuscle(name) {
  return lookupRegistryEntry(name)?.muscle || null;
}

function sortedRegistry() {
  return [...exerciseRegistry].sort((a, b) => a.name.localeCompare(b.name));
}

function renderExerciseRegistry() {
  const el = document.getElementById('exercise-registry-list');
  if (!el) return;
  const dl = document.getElementById('registry-datalist');
  if (dl) dl.innerHTML = sortedRegistry().map(e => `<option value="${e.name}">`).join('');

  const sorted = sortedRegistry();
  el.innerHTML = sorted.map(ex => {
    const isEditing = editingRegistryEx === ex.name;
    if (isEditing) {
      return `<div class="entry" style="flex-direction:column;align-items:stretch;gap:8px">
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:6px">
          <div class="form-group" style="margin:0"><label>Name</label><input id="reg-edit-name" value="${ex.name.replace(/"/g,'&quot;')}" type="text"/></div>
          <div class="form-group" style="margin:0"><label>Primary</label>
            <select id="reg-edit-muscle">${muscleOptions(ex.muscle)}</select>
          </div>
          <div class="form-group" style="margin:0"><label>Secondary</label>
            <select id="reg-edit-secondary">${secondaryMuscleOptions(ex.secondaryMuscle)}</select>
          </div>
        </div>
        <div style="display:flex;gap:6px;justify-content:flex-end">
          <button class="primary" onclick="saveRegistryEx(${ja(ex.name)})" style="font-size:12px;padding:6px 14px">Save</button>
          <button onclick="cancelEditRegistryEx()" style="font-size:12px;padding:6px 14px">Cancel</button>
        </div>
      </div>`;
    }
    const secBadge = ex.secondaryMuscle ? ` <span class="badge muscle" style="opacity:0.6">${ex.secondaryMuscle}</span>` : '';
    return `<div class="entry">
      <div class="entry-main">
        <div class="entry-name">${ex.name}</div>
        <div class="entry-detail"><span class="badge muscle">${ex.muscle}</span>${secBadge}</div>
      </div>
      <button class="ghost icon-circle icon-edit" onclick="startEditRegistryEx(${ja(ex.name)})" title="Edit">✎</button>
      <button class="ghost icon-circle icon-delete" onclick="removeFromRegistry(${ja(ex.name)})" title="Delete">✕</button>
    </div>`;
  }).join('') || '<div class="empty">No exercises in registry.</div>';
}

function startEditRegistryEx(name) {
  editingRegistryEx = name;
  renderExerciseRegistry();
}

function cancelEditRegistryEx() {
  editingRegistryEx = null;
  renderExerciseRegistry();
}

async function saveRegistryEx(oldName) {
  const newName = document.getElementById('reg-edit-name')?.value.trim();
  const newMuscle = document.getElementById('reg-edit-muscle')?.value;
  const newSecondary = document.getElementById('reg-edit-secondary')?.value || '';
  if (!newName) return;

  const duplicate = exerciseRegistry.find(e => e.name.toLowerCase() === newName.toLowerCase() && e.name !== oldName);
  if (duplicate) { alert('An exercise with that name already exists.'); return; }

  const oldEntry = exerciseRegistry.find(e => e.name === oldName);
  const nameChanged = newName !== oldName;
  const muscleChanged = newMuscle !== oldEntry?.muscle || newSecondary !== (oldEntry?.secondaryMuscle || '');

  const newEntry = { name: newName, muscle: newMuscle, ...(newSecondary ? { secondaryMuscle: newSecondary } : {}) };
  exerciseRegistry = exerciseRegistry.map(e => e.name === oldName ? newEntry : e);
  await dbSetKV('exercises', exerciseRegistry);

  if (nameChanged || muscleChanged) {
    templates = templates.map(t => ({
      ...t,
      exercises: t.exercises.map(e => e.name === oldName ? { ...e, name: newName, muscle: newMuscle, ...(newSecondary ? { secondaryMuscle: newSecondary } : { secondaryMuscle: undefined }) } : e)
    }));
    await dbSetKV('templates', templates);

    if (nameChanged && workingWeights[oldName]) {
      workingWeights[newName] = workingWeights[oldName];
      delete workingWeights[oldName];
      await dbSetKV('working_weights', workingWeights);
    }

    if (todayDay) {
      todayDay.exercises = todayDay.exercises.map(e => e.name === oldName ? { ...e, name: newName, muscle: newMuscle, ...(newSecondary ? { secondaryMuscle: newSecondary } : { secondaryMuscle: undefined }) } : e);
      await saveDay();
    }
  }

  editingRegistryEx = null;
  renderExerciseRegistry();
  renderTemplates();
}

async function submitNewRegistryEx() {
  const name = document.getElementById('reg-ex-name').value.trim();
  const muscle = document.getElementById('reg-ex-muscle').value;
  const secondaryMuscle = document.getElementById('reg-ex-secondary')?.value || '';
  if (!name) return;
  if (exerciseRegistry.find(e => e.name.toLowerCase() === name.toLowerCase())) {
    alert('Exercise already in registry.');
    return;
  }
  exerciseRegistry.push({ name, muscle, ...(secondaryMuscle ? { secondaryMuscle } : {}) });
  await dbSetKV('exercises', exerciseRegistry);
  document.getElementById('reg-ex-name').value = '';
  const secEl = document.getElementById('reg-ex-secondary');
  if (secEl) secEl.value = '';
  renderExerciseRegistry();
  // Refresh add-ex datalist without destroying the form
  const dl = document.getElementById('aed-datalist');
  if (dl) dl.innerHTML = sortedRegistry().map(e => `<option value="${e.name}">`).join('');
}

async function removeFromRegistry(name) {
  if (!confirm(`Remove "${name}" from the exercise registry?`)) return;
  exerciseRegistry = exerciseRegistry.filter(e => e.name !== name);
  await dbSetKV('exercises', exerciseRegistry);
  renderExerciseRegistry();
  const dl = document.getElementById('aed-datalist');
  if (dl) dl.innerHTML = sortedRegistry().map(e => `<option value="${e.name}">`).join('');
}

// ─── DAY MANAGEMENT ───────────────────────────────────────────────────────────

async function ensureTodayDay() {
  const dateStr = today();
  const dow = todayDow();
  const tmpl = templates.find(t => t.days && t.days.includes(dow));

  try {
    const { data, error } = await db.from('days').select('*').eq('date', dateStr).maybeSingle();
    if (!error && data) {
      let exercises = data.exercises && data.exercises.length > 0 ? data.exercises : null;

      if (!exercises) {
        exercises = tmpl ? tmpl.exercises.map(e => ({ ...e })) : [];
      } else if (data.source === 'template' && tmpl) {
        // Auto-correct if exercises were written for the wrong day (UTC/local date mismatch bug)
        const loaded = exercises.map(e => e.name).sort().join(',');
        const expected = tmpl.exercises.map(e => e.name).sort().join(',');
        if (loaded !== expected) exercises = tmpl.exercises.map(e => ({ ...e }));
      }

      const changed = exercises !== data.exercises;
      todayDay = { ...data, exercises };
      if (changed) { todayDay.source = tmpl ? 'template' : 'manual'; await saveDay(); }
      initSessionSets();
      return;
    }
  } catch(e) {}

  todayDay = {
    id: uid(),
    date: dateStr,
    exercises: tmpl ? tmpl.exercises.map(e => ({ ...e })) : [],
    source: tmpl ? 'template' : 'manual'
  };
  await saveDay();
  initSessionSets();
}

async function saveDay() {
  if (!todayDay) return;
  const row = {
    id: todayDay.id,
    date: todayDay.date,
    exercises: todayDay.exercises,
    source: todayDay.source,
    updated_at: new Date().toISOString()
  };
  await dbUpsert('days', row, 'date');
  const cached = JSON.parse(localStorage.getItem('cache_days') || '[]');
  const idx = cached.findIndex(r => r.date === todayDay.date);
  if (idx >= 0) cached[idx] = row; else cached.push(row);
  localStorage.setItem('cache_days', JSON.stringify(cached));
}

function initSessionSets() {
  if (!todayDay) return;
  const todayStr = today();
  todayDay.exercises.forEach(ex => {
    if (!sessionSets[ex.name]) {
      const prior = workouts
        .filter(w => workoutDate(w) === todayStr && w.exercise === ex.name)
        .sort((a, b) => a.ts - b.ts);
      sessionSets[ex.name] = Array(ex.sets).fill(null).map((_, i) => prior[i] || null);
    }
    while (sessionSets[ex.name].length < ex.sets) sessionSets[ex.name].push(null);
  });
}

async function addExToDay(name, sets, reps, muscle) {
  if (!todayDay) return;
  todayDay.exercises.push({ name, sets: +sets, reps, muscle });
  todayDay.source = 'manual';
  sessionSets[name] = Array(+sets).fill(null);
  expandedCards.add(name); // ensure the newly added exercise opens immediately
  await saveDay();
  renderLog();
}

async function removeExFromDay(exName) {
  if (!todayDay) return;
  if (todayDay.exercises.length <= 1) { alert('You need at least one exercise in today\'s workout.'); return; }
  if (!confirm(`Remove ${exName} from today?`)) return;
  todayDay.exercises = todayDay.exercises.filter(e => e.name !== exName);
  delete sessionSets[exName];
  await saveDay();
  renderLog();
}

async function resetDayToTemplate() {
  const dow = todayDow();
  const tmpl = templates.find(t => t.days && t.days.includes(dow));
  if (!tmpl) { alert('No template assigned to today.'); return; }
  if (!confirm('Reset today\'s workout to the template? Any edits to the exercise list will be lost (logged sets are kept).')) return;
  todayDay.exercises = tmpl.exercises.map(e => ({ ...e }));
  todayDay.source = 'template';
  initSessionSets();
  await saveDay();
  renderLog();
}

// ─── DATE UTILITIES ───────────────────────────────────────────────────────────
// All calendar dates in this app are local-timezone YYYY-MM-DD strings.
// NEVER use toISOString() or getUTC*() for date comparisons — those return UTC.
// UTC timestamps from DB (created_at → w.ts) must go through workoutDate(w).
//
// Safe way to construct a Date from a stored YYYY-MM-DD string:
//   parseDateStr('2026-05-01') → new Date(2026, 4, 1)  [local midnight, correct]
//   new Date('2026-05-01')     → 2026-05-01T00:00:00Z  [UTC midnight, shifts day]

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseDateStr(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight — never shifts the calendar day
}
function workoutDate(w) {
  // Central conversion: UTC created_at timestamp → local calendar date string.
  // Use this for ALL workout date comparisons — never compare w.date directly.
  return (w.ts && !isNaN(w.ts)) ? localDateStr(new Date(w.ts)) : w.date;
}
function today()        { return localDateStr(); }
function daysAgo(n)     { const d = new Date(); d.setDate(d.getDate() - n); return localDateStr(d); }
function yesterday()    { return daysAgo(1); }
function todayDow()     { const d = new Date().getDay(); return DAYS[d === 0 ? 6 : d - 1]; }
function yesterdayDow() { const d = new Date(); d.setDate(d.getDate() - 1); return DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]; }
function dateToDow(dateStr) {
  const day = parseDateStr(dateStr).getDay(); // always local — never getUTCDay on a local date string
  return DAYS[day === 0 ? 6 : day - 1];
}

// ─── OTHER UTILITIES ──────────────────────────────────────────────────────────

function e1rm(w, r) { return Math.round(w * (1 + r / 30)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function ja(v) { return JSON.stringify(v).replace(/"/g, '&quot;'); }

function parseRepRange(r) {
  if (!r || r === 'AMRAP') return [null, null];
  const p = r.toString().split('-').map(Number);
  return p.length === 2 ? [p[0], p[1]] : [p[0], p[0]];
}
function isJointSensitive(name) { return JOINT_SENSITIVE.some(j => j.toLowerCase() === name.toLowerCase()); }
function muscleOptions(selected) {
  return MUSCLES.map(m => `<option${m === selected ? ' selected' : ''}>${m}</option>`).join('');
}
function secondaryMuscleOptions(selected) {
  return `<option value=""${!selected ? ' selected' : ''}>None</option>` +
    MUSCLES.map(m => `<option${m === selected ? ' selected' : ''}>${m}</option>`).join('');
}

function getWeekSunday(anchorStr) {
  const d = parseDateStr(anchorStr);
  d.setDate(d.getDate() - d.getDay()); // rewind to Sunday
  return d;
}

function getWeekDates() {
  const anchor = windowAnchor || today();
  const sunday = getWeekSunday(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(d.getDate() + i);
    const date = localDateStr(d);
    return { date, dow: dateToDow(date) };
  });
}

function weekNav(delta) {
  const current = windowAnchor || today();
  const d = parseDateStr(current);
  d.setDate(d.getDate() + delta * 7);
  const next = localDateStr(d);
  // Never allow navigating forward past the current week
  const todaySunday = localDateStr(getWeekSunday(today()));
  const nextSunday  = localDateStr(getWeekSunday(next));
  if (nextSunday > todaySunday) return;
  windowAnchor = nextSunday === todaySunday ? null : next;
  viewingDate = null;
  renderLog();
}

function isPR(exercise, weight, reps) {
  const allPrev = [
    ...workouts.filter(w => w.exercise === exercise),
    ...Object.values(sessionSets).flat().filter(s => s && s.exercise === exercise)
  ];
  if (!allPrev.length) return { weight: true, e1rm: true };
  const weightPR = weight > Math.max(...allPrev.map(s => s.weight));
  const e1rmPR   = weight * (1 + reps / 30) > Math.max(...allPrev.map(s => s.weight * (1 + s.reps / 30)));
  return { weight: weightPR, e1rm: e1rmPR };
}

function getMissedDay() {
  const yDow = yesterdayDow();
  const yDate = yesterday();
  const yTemplate = templates.find(t => t.days && t.days.includes(yDow));
  if (!yTemplate) return null;
  const loggedYesterday = workouts.some(w => workoutDate(w) === yDate);
  if (loggedYesterday) return null;
  return { dow: yDow, template: yTemplate };
}

// ─── TIMER ────────────────────────────────────────────────────────────────────

function fmtTime(s) { return Math.floor(s / 60) + ':' + (s % 60).toString().padStart(2, '0'); }

function timerUpdateDisplay() {
  const el = document.getElementById('tmr-display');
  el.textContent = fmtTime(timerRemaining);
  el.className = 'timer-time' +
    (timerRemaining <= 10 && timerRunning ? ' danger' :
     timerRemaining <= 30 && timerRunning ? ' warning' : '');
  document.getElementById('tmr-minus').disabled = timerRunning || timerRemaining <= 0;
  document.getElementById('tmr-plus').disabled  = timerRunning || timerRemaining >= 300;
  const btn = document.getElementById('tmr-btn');
  btn.disabled = timerRemaining === 0 && !timerRunning;
  btn.textContent = timerRunning ? 'Pause' : (timerRemaining < timerTotal && timerRemaining > 0 ? 'Resume' : 'Start');
  const resetBtn = document.getElementById('tmr-reset');
  const isDirty = timerRemaining !== timerTotal || timerRunning;
  resetBtn.style.display = isDirty ? 'block' : 'none';
}

function timerAdj(delta) {
  if (timerRunning) return;
  timerRemaining = Math.max(0, Math.min(300, timerRemaining + delta));
  timerTotal = timerRemaining;
  timerUpdateDisplay();
}

function timerToggle() {
  if (timerRunning) {
    _timerWorker.postMessage('stop');
    timerRunning = false;
    timerEndTime = null;
    _swCancelTimer();
  } else {
    if (timerRemaining === 0) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    timerEndTime = Date.now() + timerRemaining * 1000;
    timerRunning = true;
    _timerWorker.postMessage('start');
    _swScheduleTimer(timerRemaining);
  }
  timerUpdateDisplay();
}

function timerReset() {
  _timerWorker.postMessage('stop'); timerRunning = false; timerRemaining = timerTotal;
  timerEndTime = null;
  _swCancelTimer();
  document.getElementById('tmr-display').className = 'timer-time';
  document.getElementById('timer-alert').style.display = 'none';
  timerUpdateDisplay();
}

function timerOnDone() {
  timerEndTime = null;
  document.getElementById('tmr-display').className = 'timer-time done';
  document.getElementById('timer-alert').style.display = 'flex';
  if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach(offset => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = 880;
      gain.gain.setValueAtTime(0, ctx.currentTime + offset);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + offset + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + 0.25);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.3);
    });
  } catch(e) {}
}

function dismissTimerAlert() {
  document.getElementById('timer-alert').style.display = 'none';
  if (!timerRunning) {
    timerRemaining = timerTotal;
    timerEndTime = null;
    document.getElementById('tmr-display').className = 'timer-time';
  }
  timerUpdateDisplay();
}

// Ask the service worker to fire a notification after `seconds` — more resilient
// than a Web Worker timer on iOS Safari, which gets throttled in the background.
function _swScheduleTimer(seconds) {
  if (!navigator.serviceWorker) return;
  navigator.serviceWorker.ready.then(reg => {
    reg.active?.postMessage({ type: 'timer-start', delay: seconds * 1000 });
  });
}
function _swCancelTimer() {
  navigator.serviceWorker?.controller?.postMessage({ type: 'timer-cancel' });
}

// When the user returns to the app, recalculate remaining time from the stored
// end timestamp — corrects for any period the worker was throttled or paused.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !timerRunning || !timerEndTime) return;
  const remaining = Math.ceil((timerEndTime - Date.now()) / 1000);
  if (remaining <= 0) {
    _timerWorker.postMessage('stop');
    timerRunning = false;
    timerRemaining = 0;
    timerUpdateDisplay();
    timerOnDone();
  } else {
    timerRemaining = remaining;
    timerUpdateDisplay();
  }
});

// ─── SESSION LOGGING ──────────────────────────────────────────────────────────

async function logSet(exName, muscle, setIdx) {
  const safeId = exName.replace(/\s+/g, '-');
  const wEl = document.getElementById(`w-${safeId}-${setIdx}`);
  const rEl = document.getElementById(`r-${safeId}-${setIdx}`);
  const weight = parseFloat(wEl?.value);
  const reps   = rEl?.value ? parseInt(rEl.value) : parseInt(rEl?.placeholder);
  if (!weight || !reps) {
    if (!weight && wEl) { wEl.style.outline = '2px solid var(--red, #e05)'; setTimeout(() => wEl.style.outline = '', 1200); }
    return;
  }

  const { weight: weightPR, e1rm: e1rmPR } = isPR(exName, weight, reps);
  const pr = weightPR || e1rmPR;
  const id = uid();
  const entry = { id, date: today(), exercise: exName, muscle, weight, reps, pr, weightPR, e1rmPR };

  if (!sessionSets[exName]) sessionSets[exName] = [];
  sessionSets[exName][setIdx] = entry;
  delete editingSetPrefill[`${exName}-${setIdx}`];

  if (!workingWeights[exName]) workingWeights[exName] = { weight: null, suggestedWeight: null, dismissed: false };
  workingWeights[exName].weight = weight;
  workingWeights[exName].suggestedWeight = null;
  workingWeights[exName].dismissed = false;

  workouts.push({ ...entry, ts: Date.now() });
  checkProgressiveOverload(exName, weight, reps, muscle);
  renderLog();

  if (appSettings.autoStartTimer) {
    const dayExercises = todayDay?.exercises || [];
    const allDayDone = dayExercises.every(e => (sessionSets[e.name] || []).every(s => s !== null));
    if (!allDayDone) {
      const allSetsDone = sessionSets[exName]?.every(s => s !== null);
      const moreExercisesRemain = dayExercises.some(e => e.name !== exName && !sessionSets[e.name]?.every(s => s !== null));
      const betweenExercises = allSetsDone && moreExercisesRemain;

      let restSecs = appSettings.defaultRestSeconds;
      if (!betweenExercises) {
        const tmplEx = dayExercises.find(e => e.name === exName);
        if (tmplEx?.restSeconds) restSecs = tmplEx.restSeconds;
      }

      timerTotal = restSecs;
      timerRemaining = restSecs;
      if (timerRunning) {
        _timerWorker.postMessage('stop');
        _swCancelTimer();
      }
      timerRunning = true;
      timerEndTime = Date.now() + restSecs * 1000;
      _timerWorker.postMessage('start');
      _swScheduleTimer(restSecs);
      // A stale "rest over" banner from a previous timer may still be showing
      // if it wasn't dismissed before this next set was logged — clear it so
      // it doesn't sit on top of the freshly auto-started countdown.
      document.getElementById('timer-alert').style.display = 'none';
      document.getElementById('tmr-display').className = 'timer-time';
      timerUpdateDisplay();
    }
  }

  dbUpsert('workouts', { id, date: entry.date, exercise: exName, muscle, weight, reps, is_pr: pr, created_at: new Date().toISOString() });
}

async function clearSet(exName, setIdx) {
  const entry = sessionSets[exName]?.[setIdx];
  if (!entry) return;
  if (entry.id) {
    await dbDelete('workouts', entry.id);
    workouts = workouts.filter(w => w.id !== entry.id);
  }
  delete editingSetPrefill[`${exName}-${setIdx}`];
  sessionSets[exName][setIdx] = null;
  renderLog();
}

async function editSet(exName, setIdx) {
  const entry = sessionSets[exName]?.[setIdx];
  if (!entry) return;
  editingSetPrefill[`${exName}-${setIdx}`] = { weight: entry.weight, reps: entry.reps };
  if (entry.id) {
    await dbDelete('workouts', entry.id);
    workouts = workouts.filter(w => w.id !== entry.id);
  }
  sessionSets[exName][setIdx] = null;
  renderLog();
}

// ─── PROGRESSIVE OVERLOAD ────────────────────────────────────────────────────

function checkProgressiveOverload(exercise, weight, reps, muscle) {
  let repRangeStr = null;
  const dayEx = todayDay?.exercises.find(e => e.name.toLowerCase() === exercise.toLowerCase());
  if (dayEx) { repRangeStr = dayEx.reps; }
  else {
    for (const t of templates) {
      const ex = t.exercises.find(e => e.name.toLowerCase() === exercise.toLowerCase());
      if (ex) { repRangeStr = ex.reps; break; }
    }
  }
  if (!repRangeStr || repRangeStr === 'AMRAP') { dbSetKV('working_weights', workingWeights); return; }
  const [, max] = parseRepRange(repRangeStr);
  if (max === null || reps < max) { dbSetKV('working_weights', workingWeights); return; }

  if (isJointSensitive(exercise)) {
    // Only suggest if this exercise was logged at the same weight in the week 3 weeks ago.
    // If the weight was the same then and is the same now, 3 consecutive weeks have passed at this weight.
    const targetWeekSunday = getWeekSunday(daysAgo(21));
    const weekStart = localDateStr(targetWeekSunday);
    const weekEnd = localDateStr(new Date(new Date(targetWeekSunday).setDate(targetWeekSunday.getDate() + 6)));
    const readyToProgress = workouts.some(w =>
      w.exercise.toLowerCase() === exercise.toLowerCase() &&
      workoutDate(w) >= weekStart &&
      workoutDate(w) <= weekEnd &&
      w.weight >= weight &&
      w.reps >= max
    );
    if (!readyToProgress) { dbSetKV('working_weights', workingWeights); return; }
  }

  const baseInc = INCREMENT[muscle] || 5;
  const inc = isJointSensitive(exercise) ? baseInc / 2 : baseInc;
  const suggested = Math.round((weight + inc) * 4) / 4;
  if (!workingWeights[exercise]) workingWeights[exercise] = { weight, suggestedWeight: null, dismissed: false };
  if (workingWeights[exercise].suggestedWeight !== suggested) {
    workingWeights[exercise].suggestedWeight = suggested;
    workingWeights[exercise].dismissed = false;
  }
  dbSetKV('working_weights', workingWeights);
}

function acceptNudge(exName, newWeight) {
  if (!workingWeights[exName]) workingWeights[exName] = { weight: newWeight, suggestedWeight: null, dismissed: false };
  workingWeights[exName].weight = newWeight;
  workingWeights[exName].suggestedWeight = null;
  nudgeDismissed.add(exName);
  dbSetKV('working_weights', workingWeights);
  renderLog();
}

function dismissNudge(exName) { nudgeDismissed.add(exName); renderLog(); }

function toggleCardExpand(exName) {
  if (expandedCards.has(exName)) expandedCards.delete(exName);
  else expandedCards.add(exName);
  renderLog();
}

async function addSetToDay(exName) {
  const ex = todayDay?.exercises.find(e => e.name === exName);
  if (!ex) return;
  ex.sets++;
  if (!sessionSets[exName]) sessionSets[exName] = [];
  sessionSets[exName].push(null);
  expandedCards.add(exName); // ensure card is open so user sees the new row
  await saveDay();
  renderLog();
}

async function removeSetFromDay(exName) {
  const ex = todayDay?.exercises.find(e => e.name === exName);
  if (!ex || ex.sets <= 1) return;
  const sets = sessionSets[exName] || [];
  if (sets[sets.length - 1] !== null) return;
  sets.pop();
  sessionSets[exName] = sets;
  ex.sets--;
  await saveDay();
  renderLog();
}

async function removeSetAtIdx(exName, setIdx) {
  const ex = todayDay?.exercises.find(e => e.name === exName);
  if (!ex || ex.sets <= 1) return;
  const sets = sessionSets[exName] || [];
  if (sets[setIdx] !== null) return; // only remove unlogged slots
  sets.splice(setIdx, 1);
  sessionSets[exName] = sets;
  ex.sets--;
  await saveDay();
  renderLog();
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

function renderSettings() {
  const el = document.getElementById('settings-content');
  if (!el) return;
  const mins = (appSettings.defaultRestSeconds / 60).toFixed(1).replace(/\.0$/, '');
  el.innerHTML = `
    <p class="section-title" style="margin-top:0">Timer</p>
    <div class="entry" style="flex-direction:column;align-items:stretch;gap:12px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-weight:600;font-size:14px">Auto-start timer on log</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px">Starts rest timer automatically after each set</div>
        </div>
        <button onclick="toggleAutoStart()" class="${appSettings.autoStartTimer ? 'primary' : ''}" style="flex-shrink:0;min-width:60px">${appSettings.autoStartTimer ? 'On' : 'Off'}</button>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <label style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:0.06em;font-weight:600;flex-shrink:0">Default rest</label>
        <input type="number" id="settings-rest-mins" value="${mins}" min="0.5" max="10" step="0.5" style="width:80px"/>
        <span style="font-size:13px;color:var(--text2)">minutes</span>
        <button onclick="saveDefaultRest()" style="margin-left:auto">Save</button>
      </div>
    </div>
    <p class="section-title">Rest days</p>
    <div class="entry">
      <div class="day-chips">
        ${DAYS.map(d => `<span class="day-chip${appSettings.restDays.includes(d) ? ' selected' : ''}" onclick="toggleRestDay('${d}')">${d}</span>`).join('')}
      </div>
    </div>
    <p class="section-title">Account</p>
    <button onclick="resetConfig()" class="danger full-btn">Disconnect Supabase</button>`;
}

async function toggleAutoStart() {
  appSettings.autoStartTimer = !appSettings.autoStartTimer;
  await dbSetKV('settings', appSettings);
  renderSettings();
}

async function saveDefaultRest() {
  const mins = parseFloat(document.getElementById('settings-rest-mins')?.value);
  if (!mins || mins <= 0) return;
  appSettings.defaultRestSeconds = Math.round(mins * 60);
  timerTotal = appSettings.defaultRestSeconds;
  timerRemaining = timerTotal;
  await dbSetKV('settings', appSettings);
  timerUpdateDisplay();
  renderSettings();
}

async function toggleRestDay(day) {
  const idx = appSettings.restDays.indexOf(day);
  if (idx >= 0) appSettings.restDays.splice(idx, 1);
  else appSettings.restDays.push(day);
  await dbSetKV('settings', appSettings);
  renderSettings();
  renderLog();
}

// ─── RENDER ALL ───────────────────────────────────────────────────────────────

function renderAll() {
  timerUpdateDisplay();
  renderAddExForm();
  renderLog();
  renderExLists();
  renderVolume();
  renderTemplates();
  renderSettings();
}

// ─── WEEKLY CALENDAR (LOG TAB) ───────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function renderWeekGridLog() {
  const container = document.getElementById('week-grid-log');
  if (!container) return;
  const todayStr = today();
  const weekDates = getWeekDates();

  const nav = document.getElementById('week-nav');
  if (nav) {
    const awayFromToday = !!windowAnchor || !!viewingDate;
    nav.innerHTML = `
      <button class="ghost" onclick="weekNav(-1)" style="font-size:18px;padding:2px 10px">‹</button>
      <span onclick="viewToday()" style="font-size:11px;font-weight:600;cursor:pointer;color:${awayFromToday ? 'var(--info-text)' : 'var(--text3)'}">Today</span>
      <button class="ghost" onclick="weekNav(1)" style="font-size:18px;padding:2px 10px;visibility:${awayFromToday ? 'visible' : 'hidden'}">›</button>`;
  }


  container.innerHTML = weekDates.map(({ date, dow }) => {
    const isToday = date === todayStr;
    const isViewing = viewingDate ? date === viewingDate : isToday;
    const isPast = date < todayStr;
    const isFuture = date > todayStr;
    const tmpl = templates.find(t => t.days && t.days.includes(dow));
    const isRestDay = appSettings.restDays.includes(dow);
    const hasLogs = isPast && workouts.some(w => workoutDate(w) === date);

    const borderColor = isToday ? 'var(--info-border)' : isViewing ? 'var(--text2)' : 'var(--border)';
    let bg;
    if (isToday) bg = 'var(--info-bg)';
    else if (isViewing) bg = 'var(--bg3)';
    else if (isPast && hasLogs) bg = 'rgba(134,239,172,0.10)';
    else if (isPast && (isRestDay || !tmpl)) bg = 'rgba(96,165,250,0.10)';
    else if (isPast) bg = 'rgba(150,150,150,0.10)';
    else bg = 'transparent';
    const dowColor = isToday ? 'var(--info-text)' : (isPast ? 'var(--text2)' : 'var(--text3)');
    const nameColor = (tmpl && !isRestDay) ? (isToday ? 'var(--info-text)' : 'var(--text)') : 'var(--text3)';
    const name = isRestDay ? 'Rest' : (tmpl ? tmpl.name : (isFuture ? '—' : '—'));
    const onclick = isToday ? `onclick="viewToday()"` : `onclick="viewDay('${date}')"`;

    let exCount = null;
    if (!isRestDay) {
      if (isToday && todayDay) exCount = todayDay.exercises.length;
      else if (tmpl) {
        const loggedCount = hasLogs ? new Set(workouts.filter(w => workoutDate(w) === date).map(w => w.exercise)).size : 0;
        exCount = loggedCount || tmpl.exercises.length;
      }
    }

    const tileDate = parseDateStr(date);
    const tileDateLabel = `${MONTHS[tileDate.getMonth()]} ${tileDate.getDate()}`;
    return `<div ${onclick} style="border:1px solid ${borderColor};background:${bg};border-radius:var(--radius-sm);padding:6px 2px;text-align:center;cursor:pointer">
      <div style="font-size:9px;font-weight:600;text-transform:uppercase;color:${dowColor};margin-bottom:1px">${dow}</div>
      <div style="font-size:9px;font-weight:600;color:${dowColor};margin-bottom:2px">${tileDateLabel}</div>
      <div style="font-size:9px;color:${nameColor};line-height:1.2;min-height:18px">${name}</div>
      <div style="font-size:9px;color:var(--text3);min-height:13px">${exCount !== null ? exCount + ' ex' : ''}</div>
    </div>`;
  }).join('');
}

function viewDay(dateStr) {
  viewingDate = dateStr;
  // Keep windowAnchor in the same week so the grid doesn't jump; only update
  // if the date is in a different week than the current anchor.
  const clickedSunday  = localDateStr(getWeekSunday(dateStr));
  const currentSunday  = localDateStr(getWeekSunday(windowAnchor || today()));
  if (clickedSunday !== currentSunday) windowAnchor = dateStr;
  renderLog();
}

function viewToday() {
  viewingDate = null;
  windowAnchor = null;
  renderLog();
}

// ─── RENDER LOG ───────────────────────────────────────────────────────────────

function restDayCardHtml(showLogAnyway = false) {
  return `<div class="rest-day-card">
    <div class="rest-day-emoji">💤</div>
    <div class="rest-day-label">Rest</div>
    ${showLogAnyway ? `<button class="ghost rest-day-override" onclick="restDayOverride=true;renderLog()">Log anyway</button>` : ''}
  </div>`;
}

function renderLog() {
  renderWeekGridLog();

  const todayStr = today();
  const isViewingOther = !!(viewingDate && viewingDate !== todayStr);

  const todayUi = document.getElementById('log-today-ui');
  const addExCont = document.getElementById('add-ex-container');
  if (addExCont) addExCont.style.display = isViewingOther ? 'none' : '';

  if (isViewingOther) {
    renderDayView(viewingDate);
    return;
  }

  // ── Normal today view ──
  const dow = todayDow();
  const tmpl = templates.find(t => t.days && t.days.includes(dow));
  const hasDay = todayDay && todayDay.exercises.length > 0;
  const isRestDay = appSettings.restDays.includes(dow);
  const pureRest = isRestDay && !tmpl && !hasDay && !restDayOverride;
  const conflict  = isRestDay && !!tmpl;

  if (addExCont) addExCont.style.display = pureRest ? 'none' : '';

  document.getElementById('today-banner').innerHTML = '';

  const missed = getMissedDay();
  document.getElementById('missed-bar').innerHTML = missed
    ? `<div class="missed-bar">
        <span class="missed-bar-text">Looks like you missed <strong>${missed.dow} — ${missed.template.name}</strong></span>
        <button onclick="planMakeup('${missed.dow}')" style="font-size:12px;padding:5px 12px">Plan makeup ↗</button>
       </div>`
    : '';

  const titleEl = document.getElementById('log-section-title');
  const listEl  = document.getElementById('workout-list');

  if (pureRest) {
    if (todayUi) todayUi.style.display = 'none';
    titleEl.textContent = '';
    listEl.innerHTML = restDayCardHtml(true);
    return;
  }

  if (todayDay) {
    todayDay.exercises.forEach(ex => {
      if (!sessionSets[ex.name]) sessionSets[ex.name] = Array(ex.sets).fill(null);
      while (sessionSets[ex.name].length < ex.sets) sessionSets[ex.name].push(null);
    });
  }

  if (todayUi) todayUi.style.display = (!isViewingOther && hasDay) ? '' : 'none';
  titleEl.textContent = hasDay ? "Today's workout" : '';

  const conflictHtml = conflict
    ? `<div class="conflict-bar">This day is also marked as a rest day — template takes precedence.</div>`
    : '';

  const sortedExercises = hasDay ? [...todayDay.exercises].sort((a, b) => {
    const aDone = (sessionSets[a.name] || []).every(Boolean);
    const bDone = (sessionSets[b.name] || []).every(Boolean);
    return aDone === bDone ? 0 : aDone ? 1 : -1;
  }) : [];
  const nextEx = sortedExercises.find(ex => !(sessionSets[ex.name] || []).every(Boolean));
  listEl.innerHTML = conflictHtml + (hasDay ? sortedExercises.map(ex => renderExCard(ex, ex.name === nextEx?.name)).join('') : '');

}

// ─── PAST SET EDITING ────────────────────────────────────────────────────────

function startEditPastSet(id) {
  editingPastSetId = id;
  renderLog();
}

async function savePastSet(id) {
  const w = workouts.find(w => w.id === id);
  if (!w) return;
  const weight = parseFloat(document.getElementById(`past-w-${id}`)?.value);
  const reps   = parseInt(document.getElementById(`past-r-${id}`)?.value);
  if (!weight || !reps) return;
  w.weight = weight;
  w.reps = reps;
  editingPastSetId = null;
  dbUpsert('workouts', { id: w.id, date: w.date, exercise: w.exercise, muscle: w.muscle, weight, reps, is_pr: w.pr, created_at: new Date(w.ts).toISOString() });
  renderLog();
}

async function deletePastSet(id) {
  await dbDelete('workouts', id);
  workouts = workouts.filter(w => w.id !== id);
  if (editingPastSetId === id) editingPastSetId = null;
  renderLog();
}

// ─── RENDER DAY VIEW (past / future) ─────────────────────────────────────────

function renderDayView(dateStr) {
  const todayStr = today();
  const isPast = dateStr < todayStr;
  const dow = dateToDow(dateStr);
  const dateLabel = parseDateStr(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  document.getElementById('today-banner').innerHTML = '';

  document.getElementById('missed-bar').innerHTML = '';
  document.getElementById('log-section-title').textContent = isPast ? 'Logged sets' : `Scheduled — ${dow}`;

  const listEl = document.getElementById('workout-list');

  if (isPast) {
    const dayWorkouts = workouts.filter(w => workoutDate(w) === dateStr);
    if (!dayWorkouts.length) {
      listEl.innerHTML = `<div class="rest-banner">No sets logged on ${dateLabel}.</div>`;
      return;
    }
    const exOrder = [];
    const byEx = {};
    dayWorkouts.forEach(w => {
      if (!byEx[w.exercise]) { byEx[w.exercise] = []; exOrder.push(w.exercise); }
      byEx[w.exercise].push(w);
    });
    listEl.innerHTML = exOrder.map(exName => {
      const sets = byEx[exName];
      const muscle = sets[0]?.muscle || '';
      const setsHtml = sets.map((s, i) => {
        if (s.id === editingPastSetId) {
          return `<div class="set-row">
            <span class="set-label">${i + 1}</span>
            <div class="set-inputs">
              <div class="field"><label>Weight</label><input type="number" id="past-w-${s.id}" value="${s.weight}" step="0.5" min="0"/></div>
              <div class="field"><label>Reps</label><input type="number" id="past-r-${s.id}" value="${s.reps}" min="1"/></div>
            </div>
            <button class="primary set-log-btn" onclick="savePastSet(${ja(s.id)})">Save</button>
          </div>`;
        }
        return `<div class="set-row">
          <span class="set-label">${i + 1}</span>
          <div class="set-result">
            <span class="val">${s.weight} lbs × ${s.reps} reps${s.pr ? ' 🏆' : ''}</span>
            <span>· ${e1rm(s.weight, s.reps)} e1RM</span>
          </div>
          <button class="ghost icon-circle icon-edit" onclick="startEditPastSet(${ja(s.id)})" title="Edit">✎</button>
          <button class="ghost icon-circle icon-delete" onclick="deletePastSet(${ja(s.id)})" title="Delete">✕</button>
        </div>`;
      }).join('');
      return `<div class="workout-card all-done">
        <div class="card-header">
          <div class="card-header-info">
            <div class="card-ex-name">${exName}</div>
            <div class="card-ex-meta">${muscle} · ${sets.length} set${sets.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="set-rows">${setsHtml}</div>
      </div>`;
    }).join('');
  } else {
    const isRestDay = appSettings.restDays.includes(dow);
    const tmpl = templates.find(t => t.days && t.days.includes(dow));
    if (!tmpl) {
      document.getElementById('log-section-title').textContent = '';
      listEl.innerHTML = restDayCardHtml();
      return;
    }
    listEl.innerHTML = tmpl.exercises.map(ex => {
      const ww = workingWeights[ex.name];
      return `<div class="workout-card all-done">
        <div class="card-header">
          <div class="card-header-info">
            <div class="card-ex-name">${ex.name}${isJointSensitive(ex.name) ? '<span class="badge joint">joint</span>' : ''}</div>
            <div class="card-ex-meta">${ex.sets} sets · ${ex.reps} · <span class="badge muscle">${ex.muscle}</span>${ww?.weight ? ' · ' + ww.weight + ' lbs' : ''}</div>
          </div>
        </div>
      </div>`;
    }).join('');
  }
}

// ─── ADD EXERCISE FORM (stable — lives outside #workout-list) ────────────────

function toggleAddEx() {
  addExOpen = !addExOpen;
  renderAddExForm();
  if (addExOpen) document.getElementById('aed-name')?.focus();
}

function renderAddExForm() {
  const container = document.getElementById('add-ex-container');
  if (!container) return;
  if (!addExOpen) {
    container.innerHTML = `<button class="ghost" onclick="toggleAddEx()" style="width:100%;padding:10px;margin-top:4px;color:var(--text3);border:1px dashed var(--border);border-radius:var(--radius)">+ Add exercise</button>`;
    return;
  }
  const datalistHtml = sortedRegistry().map(e => `<option value="${e.name}">`).join('');
  container.innerHTML = `<div class="add-ex-to-day">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.07em">Add exercise to today</div>
      <button class="ghost" onclick="toggleAddEx()" style="font-size:12px;padding:2px 8px">✕</button>
    </div>
    <div class="add-ex-grid">
      <div class="fg">
        <label>Exercise</label>
        <input type="text" id="aed-name" placeholder="Exercise name" list="aed-datalist" oninput="onAddExNameInput()"/>
        <datalist id="aed-datalist">${datalistHtml}</datalist>
      </div>
      <div class="fg"><label>Sets</label><input type="number" id="aed-sets" placeholder="2" min="1"/></div>
      <div class="fg"><label>Reps</label><input type="text" id="aed-reps" placeholder="8-12"/></div>
      <div class="fg"><label>Muscle</label><span id="aed-muscle-display" style="font-size:14px;color:var(--text3);padding:9px 0;display:block">—</span></div>
      <div class="fg" style="align-self:flex-end"><label>&nbsp;</label><button class="ghost icon-circle icon-add" onclick="submitAddExToDay()" title="Add exercise">+</button></div>
    </div>
    <div id="aed-registry-prompt" style="display:none;margin-top:8px;padding:10px;background:var(--bg3);border-radius:var(--radius-sm);border:1px solid var(--border)">
      <div style="font-size:12px;color:#f59e0b;margin-bottom:8px">Not in registry — add it first:</div>
      <div style="display:flex;gap:6px;align-items:flex-end">
        <div class="fg" style="flex:1"><label>Muscle group</label><select id="aed-prompt-muscle">${muscleOptions('Chest')}</select></div>
        <button class="ghost icon-circle icon-add" onclick="addExToRegistryFromPrompt()" title="Add to registry">+</button>
      </div>
    </div>
  </div>`;
}

function onAddExNameInput() {
  const name = document.getElementById('aed-name')?.value.trim() || '';
  const muscle = lookupMuscle(name);
  const display = document.getElementById('aed-muscle-display');
  const prompt = document.getElementById('aed-registry-prompt');
  if (display) {
    display.textContent = muscle || (name ? '⚠ Not in registry' : '—');
    display.style.color = muscle ? 'var(--text)' : (name ? '#f59e0b' : 'var(--text3)');
  }
  if (prompt && name && !muscle) {
    // don't auto-show yet — wait for submit attempt
  }
  if (prompt && (!name || muscle)) prompt.style.display = 'none';
}

function submitAddExToDay() {
  const nameEl = document.getElementById('aed-name');
  const setsEl = document.getElementById('aed-sets');
  const repsEl = document.getElementById('aed-reps');
  if (!nameEl || !setsEl || !repsEl) return;
  const name = nameEl.value.trim();
  const sets = setsEl.value;
  const reps = repsEl.value.trim();
  if (!name || !sets || !reps) return alert('Select an exercise and fill in sets and reps.');
  const muscle = lookupMuscle(name);
  if (!muscle) {
    const prompt = document.getElementById('aed-registry-prompt');
    if (prompt) prompt.style.display = 'block';
    return;
  }
  addExOpen = false;
  renderAddExForm();
  addExToDay(name, +sets, reps, muscle);
}

async function addExToRegistryFromPrompt() {
  const nameEl = document.getElementById('aed-name');
  const muscleEl = document.getElementById('aed-prompt-muscle');
  if (!nameEl || !muscleEl) return;
  const name = nameEl.value.trim();
  const muscle = muscleEl.value;
  if (!name || !muscle) return;
  if (!exerciseRegistry.find(e => e.name.toLowerCase() === name.toLowerCase())) {
    exerciseRegistry.push({ name, muscle });
    await dbSetKV('exercises', exerciseRegistry);
    renderExerciseRegistry();
  }
  const display = document.getElementById('aed-muscle-display');
  if (display) { display.textContent = muscle; display.style.color = 'var(--text)'; }
  const prompt = document.getElementById('aed-registry-prompt');
  if (prompt) prompt.style.display = 'none';
  const dl = document.getElementById('aed-datalist');
  if (dl) dl.innerHTML = sortedRegistry().map(e => `<option value="${e.name}">`).join('');
}

// ─── RENDER EXERCISE CARD ────────────────────────────────────────────────────

function renderExCard(ex, isNext = false) {
  const logged    = sessionSets[ex.name] || Array(ex.sets).fill(null);
  const ww        = workingWeights[ex.name] || { weight: null, suggestedWeight: null, dismissed: false };
  const isSuggested = !!(ww.suggestedWeight && !ww.dismissed);
  const allDone   = logged.every(Boolean);
  const done      = logged.filter(Boolean);
  const fillWeight = (isSuggested && !nudgeDismissed.has(ex.name) && done.length === 0) ? ww.suggestedWeight : (ww.weight || '');
  const safeId    = ex.name.replace(/\s+/g, '-');
  const jointBadge = isJointSensitive(ex.name) ? '<span class="badge joint">joint</span>' : '';
  const isExpanded = expandedCards.has(ex.name) || (!allDone && isNext);

  const nudgeHtml = isSuggested && !nudgeDismissed.has(ex.name) && done.length === 0 ? `
    <div class="inline-nudge">
      <span>↑ <strong>${ww.suggestedWeight} lbs</strong> suggested</span>
      <button class="nudge-accept" onclick="acceptNudge(${ja(ex.name)}, ${ww.suggestedWeight})" title="Apply">✓</button>
      <button class="nudge-dismiss" onclick="dismissNudge(${ja(ex.name)})" title="Dismiss">✕</button>
    </div>` : '';

  if (!isExpanded) {
    const totalReps   = done.reduce((s, e) => s + e.reps, 0);
    const totalVolume = done.reduce((s, e) => s + e.weight * e.reps, 0);
    const hasWeightPR = done.some(e => e.weightPR);
    const hasE1rmPR   = done.some(e => e.e1rmPR);
    const prBadges    = (hasWeightPR ? ' 💪' : '') + (hasE1rmPR ? ' 🏆' : '') || (done.some(e => e.pr) ? ' 🏆' : '');
    return `<div class="workout-card all-done collapsed" onclick="toggleCardExpand(${ja(ex.name)})">
      <div class="card-header" style="padding-bottom:8px">
        <div class="card-header-info">
          <div class="card-ex-name">${ex.name}${jointBadge}<span class="badge muscle">${ex.muscle}</span>${prBadges}</div>
          <div class="card-ex-meta">${ex.sets} × ${ex.reps}${ww.weight ? ' @ ' + ww.weight + ' lbs' : ''}</div>
        </div>
        <button class="ghost icon-circle icon-add" onclick="event.stopPropagation();addSetToDay(${ja(ex.name)})" title="Add set">+</button>
      </div>
      <div class="set-summary">
        <span>${totalReps} reps</span><span class="summary-sep">·</span><span>${totalVolume.toLocaleString()} lbs moved</span>
      </div>
      ${nudgeHtml ? `<div onclick="event.stopPropagation()">${nudgeHtml}</div>` : ''}
    </div>`;
  }

  const setRowsHtml = logged.map((s, setIdx) => {
    if (s) {
      const prBadges = (s.weightPR ? ' 💪' : '') + (s.e1rmPR ? ' 🏆' : '') || (s.pr ? ' 🏆' : '');
      return `<div class="set-row">
        <button class="ghost icon-circle icon-delete" onclick="clearSet(${ja(ex.name)}, ${setIdx})" title="Clear set">✕</button>
        <span class="set-label">${setIdx + 1}</span>
        <div class="set-result">
          <span class="val">${s.weight} lbs × ${s.reps} reps${prBadges}</span>
          <span>· ${e1rm(s.weight, s.reps)} e1RM</span>
        </div>
        <button class="ghost icon-circle icon-edit" onclick="editSet(${ja(ex.name)}, ${setIdx})" title="Edit">✎</button>
      </div>`;
    } else {
      const prefill = editingSetPrefill[`${ex.name}-${setIdx}`];
      const rowWeight = prefill ? prefill.weight : fillWeight;
      const rowReps   = prefill ? prefill.reps : '';
      const leftBtn = logged.length > 1
        ? `<button class="ghost icon-circle icon-delete" onclick="removeSetAtIdx(${ja(ex.name)}, ${setIdx})" title="Remove set">✕</button>`
        : `<div class="icon-circle-spacer"></div>`;
      return `<div class="set-row">
        ${leftBtn}
        <span class="set-label">${setIdx + 1}</span>
        <div class="set-inputs">
          <div class="field"><label>Weight</label><input type="number" id="w-${safeId}-${setIdx}" value="${rowWeight}" step="0.5" min="0" placeholder="lbs"/></div>
          <div class="field"><label>Reps</label><input type="number" id="r-${safeId}-${setIdx}" value="${rowReps}" placeholder="${ex.reps}" min="1"/></div>
        </div>
        <button class="primary set-log-btn" onclick="logSet(${ja(ex.name)}, ${ja(ex.muscle)}, ${setIdx})">Log</button>
      </div>`;
    }
  }).join('');

  const headerClickAttr = allDone ? `onclick="toggleCardExpand(${ja(ex.name)})" style="cursor:pointer"` : '';

  return `<div class="workout-card${allDone ? ' all-done' : ''}">
    <div class="card-header" ${headerClickAttr}>
      <button class="ghost icon-circle icon-delete" onclick="event.stopPropagation();removeExFromDay(${ja(ex.name)})" title="Remove exercise" style="margin-right:6px">✕</button>
      <div class="card-header-info">
        <div class="card-ex-name">${ex.name}${jointBadge}</div>
      </div>
      <button class="ghost icon-circle icon-add" onclick="event.stopPropagation();addSetToDay(${ja(ex.name)})" title="Add set">+</button>
    </div>
    <div class="set-rows">${setRowsHtml}${nudgeHtml}</div>
  </div>`;
}

// ─── MAKEUP SESSION ───────────────────────────────────────────────────────────

function dayGap(a, b) {
  const ai = DAYS.indexOf(a), bi = DAYS.indexOf(b);
  if (ai === -1 || bi === -1) return 1;
  return ((bi - ai + 7) % 7) || 7;
}

async function planMakeup(missedDay) {
  const todayD = todayDow();
  const mT = templates.find(t => t.days && t.days.includes(missedDay));
  const tT = templates.find(t => t.days && t.days.includes(todayD));
  document.getElementById('makeup-title').textContent = `Makeup: missed ${missedDay}, training today (${todayD})`;
  document.getElementById('makeup-sub').textContent = mT ? `${mT.name} + ${tT ? tT.name : 'rest day'}` : '';
  document.getElementById('makeup-response').className = 'makeup-response loading';
  document.getElementById('makeup-response').textContent = 'Building your adjusted workout...';
  document.getElementById('makeup-apply-btn').style.display = 'none';
  document.getElementById('makeup-overlay').classList.add('show');
  pendingMakeupExercises = [];

  const mDesc = mT ? `${mT.name}: ${mT.exercises.map(e => `${e.name} (${e.sets}×${e.reps}, ${e.muscle})`).join(', ')}` : 'Rest day';
  const tDesc = tT ? `${tT.name}: ${tT.exercises.map(e => `${e.name} (${e.sets}×${e.reps}, ${e.muscle})`).join(', ')}` : 'Rest day';

  const prompt = `You are an expert strength coach. Athlete missed ${missedDay} and trains today (${todayD}), ${dayGap(missedDay, todayD)} day(s) later.

Program:
${templates.map(t => `${t.days.join('/')}: ${t.name} — ${t.exercises.map(e => e.name + ' (' + e.muscle + ', ' + e.sets + '×' + e.reps + ')').join(', ')}`).join('\n')}

Missed (${missedDay}): ${mDesc}
Today scheduled (${todayD}): ${tDesc}
${RECOVERY_NOTES}

Respond with two sections:

SECTION 1 — EXERCISES (machine-readable, output this exactly):
EXERCISES_JSON: [{"name":"Exercise Name","sets":2,"reps":"8-12","muscle":"Muscle"}]

SECTION 2 — EXPLANATION:
A brief numbered list explaining the rationale for each decision and flagging any muscles going untrained this week.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    const text = d.content?.find(b => b.type === 'text')?.text || '';

    const jsonMatch = text.match(/EXERCISES_JSON:\s*(\[[\s\S]*?\])/);
    if (jsonMatch) {
      try { pendingMakeupExercises = JSON.parse(jsonMatch[1]); } catch(e) { pendingMakeupExercises = []; }
    }

    const explanation = text.replace(/SECTION 1[\s\S]*?SECTION 2[^\n]*\n?/, '').trim();
    document.getElementById('makeup-response').className = 'makeup-response';
    document.getElementById('makeup-response').textContent = explanation || text;

    if (pendingMakeupExercises.length > 0) {
      document.getElementById('makeup-apply-btn').style.display = 'block';
    }
  } catch(e) {
    document.getElementById('makeup-response').className = 'makeup-response';
    document.getElementById('makeup-response').textContent = 'Could not reach AI coach.';
  }
}

async function applyMakeupDay() {
  if (!pendingMakeupExercises.length) return;
  if (!confirm('Replace today\'s workout with this makeup session? Logged sets are kept.')) return;
  todayDay.exercises = pendingMakeupExercises.map(e => ({ ...e }));
  todayDay.source = 'makeup';
  initSessionSets();
  await saveDay();
  closeMakeup();
  renderLog();
}

function closeMakeup() { document.getElementById('makeup-overlay').classList.remove('show'); }
function handleMakeupOverlayClick(e) { if (e.target === document.getElementById('makeup-overlay')) closeMakeup(); }

// ─── TEMPLATES ────────────────────────────────────────────────────────────────

async function saveTemplates() { await dbSetKV('templates', templates); }

function startEditTemplateName(id) { editingTemplateName = id; renderTemplates(); setTimeout(() => document.getElementById(`tmpl-name-input-${id}`)?.focus(), 0); }

async function saveTemplateName(id) {
  const input = document.getElementById(`tmpl-name-input-${id}`);
  const name = input?.value.trim();
  if (!name) return;
  const t = templates.find(t => t.id === id);
  if (!t) return;
  t.name = name;
  editingTemplateName = null;
  await saveTemplates();
  renderTemplates();
}

function onTemplateNameKey(e, id) { if (e.key === 'Enter') saveTemplateName(id); if (e.key === 'Escape') { editingTemplateName = null; renderTemplates(); } }

function toggleTemplateExpand(tmplId) {
  if (expandedTemplates.has(tmplId)) {
    expandedTemplates.delete(tmplId);
    if (templateAddExOpen === tmplId) templateAddExOpen = null;
  } else {
    expandedTemplates.add(tmplId);
  }
  renderTemplates();
}

function openTemplateAddEx(tmplId) {
  expandedTemplates.add(tmplId);
  templateAddExOpen = tmplId;
  renderTemplates();
  document.getElementById(`add-ex-name-${tmplId}`)?.focus();
  document.getElementById(`add-ex-name-${tmplId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function cancelTemplateAddEx() {
  templateAddExOpen = null;
  renderTemplates();
}

async function toggleTemplateDay(tmplId, day, el) {
  const t = templates.find(t => t.id === tmplId);
  if (!t) return;
  const isSelected = t.days && t.days.includes(day);
  if (!isSelected) {
    const conflict = templates.find(o => o.id !== tmplId && o.days && o.days.includes(day));
    if (conflict) {
      if (!confirm(`${day} is already assigned to "${conflict.name}". Reassign to "${t.name}"?`)) return;
      conflict.days = conflict.days.filter(d => d !== day);
    }
    t.days = [...(t.days || []), day];
  } else {
    t.days = (t.days || []).filter(d => d !== day);
  }
  await saveTemplates();
  renderTemplates();
  renderWeekGridLog();
}

async function saveTemplateWeight(exName, weightStr) {
  const val = parseFloat(weightStr);
  if (!val || val <= 0) return;
  if (!workingWeights[exName]) workingWeights[exName] = { weight: null, suggestedWeight: null, dismissed: false };
  workingWeights[exName].weight = val;
  await dbSetKV('working_weights', workingWeights);
  renderTemplates();
}

function startEditEx(tmplId, exIdx) {
  editingEx = (editingEx && editingEx.tmplId === tmplId && editingEx.exIdx === exIdx) ? null : { tmplId, exIdx };
  renderTemplates();
}
function cancelEditEx() { editingEx = null; renderTemplates(); }

async function saveEditEx(tmplId, exIdx) {
  const t = templates.find(t => t.id === tmplId); if (!t) return;
  const name = document.getElementById(`edit-name-${tmplId}-${exIdx}`).value.trim();
  const sets = parseInt(document.getElementById(`edit-sets-${tmplId}-${exIdx}`).value);
  const reps = document.getElementById(`edit-reps-${tmplId}-${exIdx}`).value.trim();
  if (!name || !sets || !reps) return alert('All fields are required.');
  const muscle = lookupMuscle(name) || t.exercises[exIdx].muscle;
  const restMins = parseFloat(document.getElementById(`edit-rest-${tmplId}-${exIdx}`)?.value);
  const restSeconds = restMins > 0 ? Math.round(restMins * 60) : undefined;
  t.exercises[exIdx] = { name, sets, reps, muscle, ...(restSeconds ? { restSeconds } : {}) };

  const weightVal = parseFloat(document.getElementById(`edit-weight-${tmplId}-${exIdx}`)?.value);
  if (weightVal > 0) {
    if (!workingWeights[name]) workingWeights[name] = { weight: null, suggestedWeight: null, dismissed: false };
    workingWeights[name].weight = weightVal;
    await dbSetKV('working_weights', workingWeights);
  }

  editingEx = null;
  await saveTemplates();
  renderTemplates();
}

function updateEditMuscle(tmplId, exIdx) {
  const nameEl = document.getElementById(`edit-name-${tmplId}-${exIdx}`);
  if (!nameEl) return;
  const t = templates.find(t => t.id === tmplId);
  const muscle = lookupMuscle(nameEl.value.trim()) || (t ? t.exercises[exIdx]?.muscle : '') || '';
  const display = document.getElementById(`edit-muscle-display-${tmplId}-${exIdx}`);
  if (display) display.textContent = muscle;
}

async function deleteTemplateEx(tmplId, exIdx) {
  const t = templates.find(t => t.id === tmplId); if (!t) return;
  if (t.exercises.length <= 1) { alert('A template needs at least one exercise.'); return; }
  if (!confirm(`Remove "${t.exercises[exIdx].name}" from ${t.name}?`)) return;
  t.exercises.splice(exIdx, 1);
  if (editingEx && editingEx.tmplId === tmplId && editingEx.exIdx === exIdx) editingEx = null;
  await saveTemplates();
  renderTemplates();
}

async function deleteTemplate(id) {
  if (!confirm('Delete this template?')) return;
  templates = templates.filter(t => t.id !== id);
  await saveTemplates();
  renderAll();
}

async function addExerciseToTemplate(tmplId) {
  const t = templates.find(t => t.id === tmplId); if (!t) return;
  const name = document.getElementById(`add-ex-name-${tmplId}`)?.value;
  const sets = parseInt(document.getElementById(`add-ex-sets-${tmplId}`)?.value);
  const reps = document.getElementById(`add-ex-reps-${tmplId}`)?.value.trim();
  if (!name || !sets || !reps) return alert('Select an exercise and fill in sets and reps.');
  const muscle = lookupMuscle(name);
  if (!muscle) return alert('Exercise not in registry.');
  t.exercises.push({ name, sets, reps, muscle });
  templateAddExOpen = null;
  await saveTemplates();
  renderTemplates();
}

function showNewTemplate() {
  document.getElementById('new-template-form').style.display = 'block';
  newTmplExercises = [];
  document.getElementById('tmpl-exercises').innerHTML = '';
  document.getElementById('tmpl-name').value = '';
  document.querySelectorAll('#new-template-form .day-chip').forEach(c => c.classList.remove('selected'));
}
function cancelTemplate() { document.getElementById('new-template-form').style.display = 'none'; }
function toggleDay(el) { el.classList.toggle('selected'); }

function onTmplExNameInput() {
  const name = document.getElementById('tmpl-ex-name')?.value.trim() || '';
  const muscle = lookupMuscle(name);
  const display = document.getElementById('tmpl-ex-muscle-display');
  if (display) {
    display.textContent = muscle || (name ? '⚠ Not in registry' : '—');
    display.style.color = muscle ? 'var(--text)' : (name ? '#f59e0b' : 'var(--text3)');
  }
}

function addTmplEx() {
  const name   = document.getElementById('tmpl-ex-name').value.trim();
  const sets   = document.getElementById('tmpl-ex-sets').value;
  const reps   = document.getElementById('tmpl-ex-reps').value.trim();
  if (!name || !sets || !reps) return;
  const muscle = lookupMuscle(name);
  if (!muscle) {
    alert('Exercise not in registry. Add it in the Exercises section first.');
    return;
  }
  newTmplExercises.push({ name, sets: +sets, reps, muscle });
  document.getElementById('tmpl-ex-name').value = '';
  document.getElementById('tmpl-ex-sets').value = '';
  document.getElementById('tmpl-ex-reps').value = '';
  const display = document.getElementById('tmpl-ex-muscle-display');
  if (display) { display.textContent = '—'; display.style.color = 'var(--text3)'; }
  document.getElementById('tmpl-exercises').innerHTML = newTmplExercises.map((ex, i) =>
    `<div class="template-ex"><span class="ex-num">${i+1}</span><div class="ex-info"><div class="ex-name-row">${ex.name}</div><div class="ex-detail">${ex.sets}×${ex.reps} · ${ex.muscle}</div></div></div>`
  ).join('');
}

async function saveTemplate() {
  const name = document.getElementById('tmpl-name').value.trim();
  if (!name) return alert('Give the template a name.');
  if (!newTmplExercises.length) return alert('Add at least one exercise.');
  const days = [...document.querySelectorAll('#new-template-form .day-chip.selected')].map(c => c.textContent);
  templates.push({ id: uid(), name, days, exercises: newTmplExercises });
  await saveTemplates();
  cancelTemplate();
  renderAll();
}

// ─── RENDER TEMPLATES ─────────────────────────────────────────────────────────

function renderTemplates() {
  renderExerciseRegistry();

  document.getElementById('template-list').innerHTML = templates.map(t => {
    const dayLabel = t.days && t.days.length ? t.days.join(' · ') : 'No days';
    const isExpanded = expandedTemplates.has(t.id);
    const chevron = isExpanded ? '▼' : '▶';
    const totalSets = t.exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0);
    const muscles = [...new Set(t.exercises.map(ex => ex.muscle).filter(Boolean))].join(', ');

    let bodyHtml = '';
    if (isExpanded) {
      const dayChipsHtml = DAYS.map(d => {
        const selected = t.days && t.days.includes(d);
        return `<span class="day-chip${selected ? ' selected' : ''}" onclick="toggleTemplateDay('${t.id}','${d}',this)">${d}</span>`;
      }).join('');

      const exRows = t.exercises.map((ex, i) => {
        const ww = workingWeights[ex.name];
        const wHtml = ww?.weight != null
          ? `${ww.weight} lbs`
          : `<span style="color:var(--text3);font-style:italic">No Starting Weight Set</span>`;

        const isEditing = editingEx && editingEx.tmplId === t.id && editingEx.exIdx === i;
        const viewRow = `<div class="template-ex">
          <span class="ex-num">${i+1}</span>
          <div class="ex-info">
            <div class="ex-name-row">${ex.name}${isJointSensitive(ex.name) ? '<span class="badge joint">joint</span>' : ''}</div>
            <div class="ex-detail">${ex.sets} sets · ${ex.reps} reps · <span class="badge muscle">${ex.muscle}</span></div>
            <div class="ex-weight-row">${wHtml}</div>
          </div>
          <div class="ex-actions">
            <button class="ghost icon-circle${isEditing ? '' : ' icon-edit'}" onclick="startEditEx('${t.id}',${i})" title="${isEditing ? 'Cancel' : 'Edit'}">${isEditing ? '✕' : '✎'}</button>
            <button class="ghost icon-circle icon-delete" onclick="deleteTemplateEx('${t.id}',${i})" title="Delete">✕</button>
          </div>
        </div>`;

        const currentWeight = workingWeights[ex.name]?.weight || '';
        const exSelectHtml = [...exerciseRegistry].sort((a,b)=>a.name.localeCompare(b.name)).map(e=>`<option value="${e.name}"${e.name===ex.name?' selected':''}>${e.name}</option>`).join('');
        const editRow = isEditing ? `<div class="template-ex-edit">
          <div class="edit-grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr);margin-bottom:6px">
            <div class="fg"><label>Exercise</label><select id="edit-name-${t.id}-${i}" onchange="updateEditMuscle('${t.id}',${i})">${exSelectHtml}</select></div>
            <div class="fg"><label>Muscle</label><span id="edit-muscle-display-${t.id}-${i}" style="font-size:13px;padding:9px 0;display:block;color:var(--text2)">${lookupMuscle(ex.name) || ex.muscle}</span></div>
          </div>
          <div class="edit-grid">
            <div class="fg"><label>Sets</label><input type="number" id="edit-sets-${t.id}-${i}" value="${ex.sets}" min="1"/></div>
            <div class="fg"><label>Reps</label><input type="text" id="edit-reps-${t.id}-${i}" value="${ex.reps}"/></div>
            <div class="fg"><label>Weight (lbs)</label><input type="number" id="edit-weight-${t.id}-${i}" value="${currentWeight}" step="0.5" min="0" placeholder="—"/></div>
            <div class="fg"><label>Rest (min)</label><input type="number" id="edit-rest-${t.id}-${i}" value="${ex.restSeconds ? (ex.restSeconds/60).toFixed(1).replace(/\.0$/,'') : ''}" step="0.5" min="0.5" placeholder="default"/></div>
          </div>
          <div class="edit-actions">
            <button class="primary" onclick="saveEditEx('${t.id}',${i})">Save</button>
            <button onclick="cancelEditEx()">Cancel</button>
          </div>
        </div>` : '';

        return isEditing ? editRow : viewRow;
      }).join('');

      const addExSelectHtml = [...exerciseRegistry].sort((a,b)=>a.name.localeCompare(b.name)).map(e=>`<option value="${e.name}">${e.name}</option>`).join('');
      bodyHtml = `
        <div style="padding:10px 14px;border-top:1px solid var(--border);background:var(--bg3)">
          <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Assigned days</div>
          <div class="day-chips" style="margin-bottom:0">${dayChipsHtml}</div>
        </div>
        <div>${exRows}</div>
        ${templateAddExOpen === t.id ? `
        <div style="padding:10px 14px;border-top:1px solid var(--border);background:var(--bg3)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em">Add exercise</div>
            <button class="ghost" onclick="cancelTemplateAddEx()" style="font-size:12px;padding:2px 8px">✕</button>
          </div>
          <div class="tmpl-add-ex-grid">
            <div class="fg"><label>Exercise</label><select id="add-ex-name-${t.id}"><option value="">— select —</option>${addExSelectHtml}</select></div>
            <div class="fg"><label>Sets</label><input type="number" id="add-ex-sets-${t.id}" min="1" placeholder="2"/></div>
            <div class="fg"><label>Reps</label><input type="text" id="add-ex-reps-${t.id}" placeholder="8-12"/></div>
          </div>
          <button class="primary" onclick="addExerciseToTemplate('${t.id}')" style="width:100%;margin-top:8px">Add exercise</button>
        </div>` : ''}`;
    }

    const isEditingName = editingTemplateName === t.id;
    const titleHtml = isEditingName
      ? `<input id="tmpl-name-input-${t.id}" value="${t.name}" onblur="saveTemplateName('${t.id}')" onkeydown="onTemplateNameKey(event,'${t.id}')" style="font-size:15px;font-weight:600;background:var(--bg3);border:1px solid var(--info-border);border-radius:var(--radius-sm);padding:3px 8px;color:var(--text);width:100%" onclick="event.stopPropagation()"/>`
      : `${chevron} ${t.name}`;

    return `<div class="template-card">
      <div class="template-header" onclick="${isEditingName ? '' : `toggleTemplateExpand('${t.id}')`}" style="cursor:${isEditingName ? 'default' : 'pointer'}">
        <div class="template-header-main">
          <div class="template-title">${titleHtml}</div>
          <div class="template-subtitle">${t.exercises.length} exercises · ${totalSets} sets · ${muscles || 'No exercises'}</div>
        </div>
        <span class="template-day-pill">${dayLabel}</span>
        <button class="ghost icon-circle icon-add" onclick="event.stopPropagation();openTemplateAddEx('${t.id}')" title="Add exercise" style="margin-left:4px">+</button>
        <button class="ghost${isEditingName ? '' : ' icon-edit'}" onclick="event.stopPropagation();${isEditingName ? `saveTemplateName('${t.id}')` : `startEditTemplateName('${t.id}')`}" style="font-size:14px;padding:5px 8px;margin-left:4px" title="${isEditingName ? 'Save' : 'Edit name'}">${isEditingName ? '✓' : '✎'}</button>
        <button class="ghost icon-circle icon-delete" onclick="event.stopPropagation();deleteTemplate('${t.id}')" title="Delete template" style="margin-left:4px">✕</button>
      </div>
      ${bodyHtml}
    </div>`;
  }).join('');
}

// ─── RENDER VOLUME ────────────────────────────────────────────────────────────

function setVolumeMode(mode) {
  volumeMode = mode;
  renderVolume();
}

function renderVolume() {
  document.getElementById('vol-pill-rolling')?.classList.toggle('active', volumeMode === 'rolling');
  document.getElementById('vol-pill-week')?.classList.toggle('active', volumeMode === 'week');

  let ws;
  if (volumeMode === 'week') {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    ws = localDateStr(d);
  } else {
    ws = daysAgo(6);
  }
  const tw = workouts.filter(w => workoutDate(w) >= ws);
  const bm = {};
  tw.forEach(w => {
    bm[w.muscle] = (bm[w.muscle] || 0) + 1;
    const reg = lookupRegistryEntry(w.exercise);
    if (reg?.secondaryMuscle) bm[reg.secondaryMuscle] = (bm[reg.secondaryMuscle] || 0) + 0.5;
  });
  const total = Object.values(bm).reduce((a, b) => a + b, 0);
  const modeSub = volumeMode === 'week' ? 'this week' : 'last 7 days';
  document.getElementById('volume-stats').innerHTML = `
    <div class="stat-card"><div class="lbl">Total sets</div><div class="val">${total}</div><div class="sub">${modeSub}</div></div>
    <div class="stat-card"><div class="lbl">Exercises</div><div class="val">${new Set(tw.map(w => w.exercise)).size}</div><div class="sub">unique</div></div>
    <div class="stat-card"><div class="lbl">PRs</div><div class="val">${tw.filter(w => w.pr).length}</div><div class="sub">${modeSub}</div></div>`;
  const maxS = Math.max(...Object.values(bm), 20);
  document.getElementById('volume-bars').innerHTML = Object.keys(MUSCLE_COLORS).map(m => {
    const cnt = bm[m] || 0; const pct = Math.round(cnt / maxS * 100);
    const display = cnt % 1 === 0 ? cnt : cnt.toFixed(1);
    const status = cnt === 0 ? '' : cnt < 10 ? ' (low)' : cnt <= 20 ? ' ✓' : ' (high)';
    return `<div class="vol-bar"><span class="vol-label">${m}</span><div class="vol-track"><div class="vol-fill" style="width:${pct}%;background:${MUSCLE_COLORS[m]}"></div></div><span class="vol-count">${display}${status}</span></div>`;
  }).join('');
}

// ─── EXPORT FOR CLAUDE ────────────────────────────────────────────────────────

function buildExportMarkdown() {
  const now = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const lines = [];

  lines.push(`# Gains — Training Export`);
  lines.push(`_${now}_\n`);

  // Split
  lines.push(`## Current Split\n`);
  templates.forEach(t => {
    lines.push(`### ${t.name} (${t.days.join(', ')})`);
    lines.push(`| Exercise | Sets | Reps | Working Weight |`);
    lines.push(`|----------|------|------|----------------|`);
    t.exercises.forEach(ex => {
      const ww = workingWeights[ex.name];
      lines.push(`| ${ex.name} | ${ex.sets} | ${ex.reps} | ${ww?.weight ? ww.weight + ' lbs' : '—'} |`);
    });
    lines.push('');
  });

  // Volume last 4 weeks
  const cutoff = daysAgo(27);
  const recent = workouts.filter(w => workoutDate(w) >= cutoff);
  const bm = {};
  recent.forEach(w => {
    bm[w.muscle] = (bm[w.muscle] || 0) + 1;
    const reg = lookupRegistryEntry(w.exercise);
    if (reg?.secondaryMuscle) bm[reg.secondaryMuscle] = (bm[reg.secondaryMuscle] || 0) + 0.5;
  });
  lines.push(`## Volume — Last 4 Weeks\n`);
  lines.push(`| Muscle | Total Sets | Weekly Avg | Status |`);
  lines.push(`|--------|-----------|------------|--------|`);
  Object.keys(MUSCLE_COLORS).forEach(m => {
    const cnt = bm[m] || 0;
    const avg = (cnt / 4).toFixed(1);
    const status = cnt === 0 ? 'None' : +avg < 10 ? 'Low' : +avg <= 20 ? 'On target' : 'High';
    lines.push(`| ${m} | ${cnt} | ${avg}/wk | ${status} |`);
  });
  lines.push('');

  // Recent sessions
  lines.push(`## Recent Sessions (Last 4 Weeks)\n`);
  const byDate = {};
  recent.forEach(w => {
    const d = workoutDate(w);
    if (!byDate[d]) byDate[d] = {};
    if (!byDate[d][w.exercise]) byDate[d][w.exercise] = [];
    byDate[d][w.exercise].push(w);
  });
  Object.keys(byDate).sort().reverse().forEach(date => {
    const label = parseDateStr(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    lines.push(`### ${label}`);
    Object.entries(byDate[date]).forEach(([ex, sets]) => {
      const setStr = sets.map(s => `${s.weight} lbs × ${s.reps} reps${s.pr ? ' 🏆' : ''}`).join(', ');
      lines.push(`- **${ex}**: ${setStr}`);
    });
    lines.push('');
  });

  return lines.join('\n');
}

async function exportForClaude(mode) {
  const md = buildExportMarkdown();
  const statusEl = document.getElementById('export-status');

  if (mode === 'copy') {
    try {
      await navigator.clipboard.writeText(md);
      statusEl.textContent = 'Copied to clipboard.';
    } catch {
      statusEl.textContent = 'Copy failed — try Download instead.';
    }
  } else {
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gains-export-${today()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    statusEl.textContent = 'Downloaded.';
  }

  setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
}

// ─── RENDER PROGRESS ──────────────────────────────────────────────────────────

function renderExLists() {
  const names = [...new Set(workouts.map(w => w.exercise))];
  const sel = document.getElementById('progress-exercise');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Select an exercise</option>' + names.map(n =>
    `<option ${n === cur ? 'selected' : ''} value="${n}">${n}</option>`
  ).join('');
}

function renderProgress() {
  const ex = document.getElementById('progress-exercise').value;
  const prsEl = document.getElementById('progress-prs');
  if (!ex) {
    prsEl.innerHTML = '';
    if (progressChart) { progressChart.destroy(); progressChart = null; }
    return;
  }
  const sets = workouts.filter(w => w.exercise === ex).sort((a, b) => workoutDate(a).localeCompare(workoutDate(b)));
  if (!sets.length) { prsEl.innerHTML = '<div class="empty">No sets logged yet.</div>'; return; }
  const byDate = {};
  sets.forEach(s => { const key = workoutDate(s); const v = e1rm(s.weight, s.reps); if (!byDate[key] || v > byDate[key]) byDate[key] = v; });
  const labels = Object.keys(byDate).sort();
  if (progressChart) progressChart.destroy();
  progressChart = new Chart(document.getElementById('progressChart').getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'e1RM', data: labels.map(d => byDate[d]), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 2, pointBackgroundColor: '#3b82f6', pointRadius: 5, tension: 0.3, fill: true }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#666' } }, x: { grid: { display: false }, ticks: { color: '#666', maxRotation: 30 } } } }
  });
  const prs = sets.filter(s => s.pr);
  prsEl.innerHTML = prs.length ? '<p class="section-title">PRs</p>' + prs.map(s =>
    `<div class="entry"><div class="entry-main"><div class="entry-name">${workoutDate(s)}</div><div class="entry-detail">${s.weight} lbs × ${s.reps} reps · ${e1rm(s.weight, s.reps)} e1RM</div></div><span class="badge pr">PR</span></div>`
  ).join('') : '';
}

// ─── AI COACH ─────────────────────────────────────────────────────────────────

async function askCoach(type) {
  const el = document.getElementById('coach-text');
  el.className = 'coach-response loading'; el.textContent = 'Analyzing your training data...';
  const ws = daysAgo(6);
  const bm = {}; workouts.filter(w => workoutDate(w) >= ws).forEach(w => { bm[w.muscle] = (bm[w.muscle] || 0) + 1; });
  const allEx = [...new Set(workouts.map(w => w.exercise))];
  const plateaus = [];
  allEx.forEach(ex => {
    const s = workouts.filter(w => w.exercise === ex).sort((a, b) => workoutDate(a).localeCompare(workoutDate(b)));
    if (s.length >= 4) {
      const r = s.slice(-4);
      if (Math.abs(e1rm(r[3].weight, r[3].reps) - e1rm(r[0].weight, r[0].reps)) < 5) plateaus.push(ex);
    }
  });
  const wwSummary = Object.entries(workingWeights).filter(([, v]) => v.weight).map(([k, v]) =>
    `${k}: ${v.weight}lbs${v.suggestedWeight ? ` (→${v.suggestedWeight}lbs)` : ''}`
  ).join(', ');
  const summary = `Program:\n${templates.map(t => `${t.name} (${t.days.join(',')}): ${t.exercises.map(e => `${e.name} ${e.sets}×${e.reps}${isJointSensitive(e.name) ? '[joint]' : ''}`).join(', ')}`).join('\n')}\n\n${RECOVERY_NOTES}\n\nWorking weights: ${wwSummary}\nWeekly sets by muscle: ${JSON.stringify(bm)}\nPlateaus: ${plateaus.join(', ') || 'none'}\nPRs this week: ${[...new Set(workouts.filter(w => w.pr && workoutDate(w) >= ws).map(w => w.exercise))].join(', ') || 'none'}`;
  const prompts = {
    analyze: `You are an expert strength coach. Analyze concisely (3-5 sentences). Respect joint-sensitive constraints.\n\n${summary}`,
    plateau: `You are an expert strength coach. Identify plateaus and prescribe fixes. Do not flag joint-sensitive lifts at 6 reps as plateaus.\n\n${summary}`,
    volume:  `You are an expert strength coach. Analyze weekly sets per muscle vs 10-20 set hypertrophy target.\n\n${summary}`,
    next:    `You are an expert strength coach. Give 3 numbered specific recommendations for next 2-3 weeks.\n\n${summary}`
  };
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompts[type] }] })
    });
    const d = await r.json();
    el.className = 'coach-response';
    el.textContent = d.content?.find(b => b.type === 'text')?.text || 'No response.';
  } catch(e) {
    el.className = 'coach-response';
    el.textContent = 'Could not reach AI coach.';
  }
}

// ─── TAB & OVERLAY UTILS ──────────────────────────────────────────────────────

function closeOverlay(id) { document.getElementById(id).classList.remove('show'); }
function handleOverlayClick(id, e) { if (e.target === document.getElementById(id)) closeOverlay(id); }

function openDrawer() {
  document.getElementById('nav-drawer').classList.add('open');
  document.getElementById('drawer-backdrop').classList.add('show');
}

function closeDrawer() {
  document.getElementById('nav-drawer').classList.remove('open');
  document.getElementById('drawer-backdrop').classList.remove('show');
}

function switchTab(name, btn) {
  document.querySelectorAll('.nav-item').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
  const labels = { log: 'Log', templates: 'Templates', exercises: 'Exercises', progress: 'Progress', volume: 'Volume', coach: 'AI Coach', settings: 'Settings' };
  document.getElementById('header-title').textContent = labels[name] || name;
  closeDrawer();
  if (name === 'progress') { renderExLists(); renderProgress(); }
  if (name === 'volume') renderVolume();
  if (name === 'templates') renderTemplates();
  if (name === 'exercises') renderExerciseRegistry();
  if (name === 'settings') renderSettings();
  if (name === 'log') renderLog();
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────

const savedUrl = localStorage.getItem('sb_url');
const savedKey = localStorage.getItem('sb_key');
if (savedUrl && savedKey) {
  initSupabase(savedUrl, savedKey);
} else {
  document.getElementById('config-screen').style.display = 'flex';
}
