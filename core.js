// ✦ А.Р.Т.У.Р. — ядро: состояние, эпоха, лаборатория с кубиком, операции, радар, медблок, базы, файлы, Шарик,
// инициатива Арта, заметка модели и поле Летописца (через LifeBridge).

import * as D from './data.js';

export let A = null;
export function setApi(a) { A = a; }

const ctx = () => SillyTavern.getContext();
export const MODULE = 'artur';

// ───────────── мелочи ─────────────

export const uid = () => Math.random().toString(36).slice(2, 10);
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export const norm = (v) => String(v ?? '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"“”„'`]/g, '').replace(/\s+/g, ' ').trim();
export const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, Math.round(Number(v) || 0)));
export const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const cut = (t, n) => { t = String(t ?? ''); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dmy = (t) => { if (t == null) return ''; const d = new Date(t); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; };

export function plain(mes) {
    return String(mes || '')
        .replace(/<(horae\w*|details|think|thinking|summary|style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ').replace(/```[\s\S]*?```/g, ' ').replace(/[*_~`#|]/g, '').replace(/[ \t]+/g, ' ').trim();
}

/** Пока комп открыт, тосты таверны прячутся под ним (верхний слой) — показываю свои внутри окна. */
export function toast(kind, msg, title = '✦ А.Р.Т.У.Р.', opts = {}) {
    const app = document.getElementById('ar-dialog')?.open && document.getElementById('ar-app');
    if (app) {
        const el = document.createElement('div');
        el.className = `ar-toast ${kind}`;
        el.innerHTML = String(msg);
        app.append(el);
        requestAnimationFrame(() => el.classList.add('on'));
        setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 300); }, opts.timeOut || 3200);
        return;
    }
    try { window.toastr?.[kind]?.(msg, title, { timeOut: 4500, ...opts }); } catch { /* */ }
}

// ───────────── настройки (общие) и данные чата ─────────────

const DEF = {
    on: true,
    chron: true,          // поле в Летописце
    autoRemark: true,     // приветствие Арта раз в игровой день
    autoScan: false,      // сводка радара раз в игровой день
    init: 'rare',         // как часто Арт влезает сам
    present: 'auto',      // auto | always | off — когда модель получает его голос
    eraMode: 'auto',      // auto | id эпохи
    eraStart: {},         // правки границ эпох
    stones: {},           // в каких эпохах в Хеди энергия Камней (поверх data.js)
    lore: {},             // правки лора эпох
    voice: '',            // правка голоса Арта
    sharikDrain: 3,       // % заряда в игровой час
    fx: true,             // анимации
    filePaper: { shield: true }, // личные дела на бумаге (в СНР — всегда)
};

export function cfg() {
    const ext = ctx().extensionSettings;
    if (!ext[MODULE] || typeof ext[MODULE] !== 'object') ext[MODULE] = {};
    const s = ext[MODULE];
    for (const [k, v] of Object.entries(DEF)) if (s[k] === undefined) s[k] = JSON.parse(JSON.stringify(v));
    return s;
}
export const saveCfg = () => { try { ctx().saveSettingsDebounced(); } catch { /* */ } };

export function M() {
    const md = ctx().chatMetadata;
    if (!md) return blank();
    if (!md.artur || typeof md.artur !== 'object') md.artur = blank();
    const m = md.artur;
    const b = blank();
    for (const [k, v] of Object.entries(b)) if (m[k] === undefined || (Array.isArray(v) && !Array.isArray(m[k]))) m[k] = v;
    for (const k of ['dossier', 'bases', 'files', 'past', 'remark', 'scan', 'hydra']) if (!m[k] || typeof m[k] !== 'object' || Array.isArray(m[k])) m[k] = b[k];
    if (!m.med || typeof m.med !== 'object') m.med = b.med;
    if (!m.sharik || typeof m.sharik !== 'object') m.sharik = b.sharik;
    return m;
}
function blank() {
    return {
        projects: [], ops: [], radar: [], patients: [], feed: [], ideas: [], shots: [],
        dossier: {}, bases: {}, files: {}, past: {}, remark: {}, scan: {},
        med: { stones: 35, tremor: false, notes: [], arm: { pct: 100, note: '' } },
        sharik: { charge: 80, love: 60, t: null, mes: null, with: true, log: [] },
        hydra: { legend: 80, pierce: 60, notes: [] },
    };
}
export const save = () => { try { ctx().saveMetadataDebounced?.(); } catch { /* */ } };
export const hasChat = () => { try { return A?.hasChat ? A.hasChat() : !!ctx().chatMetadata; } catch { return false; } };

// ───────────── время истории и эпоха ─────────────

export function clock() {
    let st = {};
    try { st = A?.worldState?.() || {}; } catch { /* */ }
    const date = String(st.timestamp?.story_date || '');
    const time = String(st.timestamp?.story_time || '');
    let d = null;
    try { d = A?.parseDate?.(date) || null; } catch { /* */ }
    if (d && isNaN(d)) d = null;
    const tm = time.match(/(\d{1,2})[:.](\d{2})/);
    const hour = tm ? +tm[1] : null;
    if (d) d.setHours(tm ? +tm[1] : 12, tm ? +tm[2] : 0, 0, 0);
    let mes = 0;
    try { mes = A?.lastAiIndex?.() ?? 0; } catch { /* */ }
    return {
        t: d ? d.getTime() : null, d, day: d ? iso(d) : '', year: d ? d.getFullYear() : null, hour, mes,
        date, time, loc: String(st.scene?.location || ''), cast: arr(st.scene?.characters_present).map(String),
    };
}

export function eras() {
    const c = cfg();
    return D.ERAS.map(e => ({ ...e, start: c.eraStart[e.id] || e.start, stones: c.stones[e.id] ?? !!e.stones }))
        .sort((a, b) => a.start.localeCompare(b.start));
}
export function era() {
    const c = cfg();
    const list = eras();
    if (c.eraMode && c.eraMode !== 'auto') return list.find(e => e.id === c.eraMode) || list[list.length - 1];
    const k = clock();
    if (!k.d) return list.find(e => e.id === 'aim') || list[list.length - 1];
    let cur = null;
    for (const e of list) if (e.start <= k.day) cur = e;
    return cur || { ...D.eraById('none'), id: 'none' };
}
export const eraLore = (e = era()) => cfg().lore[e.id] ?? D.LORE[e.id] ?? '';
export const voice = () => cfg().voice || D.VOICE;
export const appsOf = (e = era()) => Object.entries(D.ERA_APPS[e.id] || {}).map(([id, label]) => ({ id, label, ic: D.APPS[id]?.[0] || 'puzzle' }));
export const inEra = (list, e = era()) => list.filter(x => (x.era || 'aim') === e.id);

function recent(n = 3, max = 700) {
    const chat = ctx().chat || [];
    const out = [];
    for (let i = chat.length - 1; i >= 0 && out.length < n; i--) {
        const m = chat[i];
        if (!m || m.is_system || m.extra?.type === 'comment') continue;
        out.unshift(`${m.name}: ${cut(plain(m.mes), max)}`);
    }
    return out;
}
function events(n = 8) {
    try { return (A?.horaeEvents?.() || []).slice(-n).map(e => `${e.timestamp?.story_date || ''} ${e.event?.summary || ''}`.trim()).filter(Boolean); } catch { return []; }
}
export const userName = () => { try { return A?.canonName?.(ctx().name1) || ctx().name1 || 'Хеди'; } catch { return 'Хеди'; } };

// ───────────── Зёрнышко (если стоит) ─────────────

let Z = null;
export async function loadZ() {
    if (Z !== null) return Z;
    try { Z = await import('../zernyshko/engine.js'); } catch { Z = false; }
    return Z;
}
export function pregLine() {
    if (!Z) return null;
    try {
        const k = Z.kids().find(x => x.stage === 'preg');
        if (k) {
            const tm = Z.term(k);
            if (!tm || tm.before) return null;
            return { week: tm.ow, day: tm.od, tri: tm.tri, left: tm.left, due: tm.due, text: `${tm.ow} нед ${tm.od} дн · ${tm.tri} трим.` };
        }
        const b = [...Z.kids()].reverse().find(x => x.stage === 'baby');
        if (b) { const ag = Z.age?.(b); return { baby: true, text: `малыш · ${ag?.label || ''}`.trim() }; }
    } catch { /* */ }
    return null;
}

// ───────────── лента Арта ─────────────

export const feedOf = (e = era()) => inEra(M().feed, e);
export function feed(text, kind = 'artur', extra = {}) {
    const m = M();
    const k = clock();
    m.feed.unshift({ id: uid(), era: era().id, text: cut(text, 300), kind, at: k.date ? `${k.date}${k.time ? ` · ${k.time}` : ''}` : '', mes: k.mes, ...extra });
    m.feed = m.feed.slice(0, 60);
    save();
}

// ───────────── разовые заметки модели (на один ответ) ─────────────

export function arm(kind, text, extra = {}) {
    const m = M();
    m.shots = m.shots.filter(s => s.kind !== kind || s.key !== extra.key);
    m.shots.push({ kind, text, after: clock().mes, at: Date.now(), ...extra });
    save();
    try { A?.updatePrompt?.(); } catch { /* */ }
}
export const shots = () => M().shots;
export function disarm(id) { const m = M(); m.shots = m.shots.filter(s => s.at !== id); save(); try { A?.updatePrompt?.(); } catch { /* */ } }
/** Пришёл новый ответ модели — разовые заметки отработали. */
export function spendShots(i) {
    const m = M();
    const before = m.shots.length;
    m.shots = m.shots.filter(s => !(Number(i) > (s.after ?? -1)));
    if (m.shots.length !== before) save();
}

// ───────────── лаборатория ─────────────

export const projects = () => inEra(M().projects);
export const projectById = (id) => M().projects.find(p => p.id === id) || null;

export function addProject(rec) {
    const p = { id: uid(), era: era().id, name: 'Новый проект', field: 'other', stage: 0, pct: 0, team: [], note: '', bans: '', img: '', log: [], src: 'me', created: clock().date, ...rec };
    M().projects.unshift(p);
    labLog(p, `Проект заведён: ${p.name}`, 'sys');
    save();
    return p;
}
export function labLog(p, t, kind = 'note', extra = {}) {
    const k = clock();
    p.log.unshift({ t: cut(t, 220), kind, at: k.date || '', mes: k.mes, ...extra });
    p.log = p.log.slice(0, 40);
}
export function bump(p, delta, why = '') {
    let pct = (Number(p.pct) || 0) + delta;
    let moved = 0;
    while (pct >= 100 && p.stage < D.STAGES.length - 1) { pct -= 100; p.stage++; moved++; }
    while (pct < 0 && p.stage > 0 && delta < -15) { pct += 100; p.stage--; moved--; }
    p.pct = p.stage >= D.STAGES.length - 1 ? 100 : clamp(pct);
    if (moved > 0) { labLog(p, `Стадия: ${D.STAGES[p.stage]}`, 'stage'); feed(`Проект «${p.name}» перешёл в стадию «${D.STAGES[p.stage]}».${why ? ` ${why}` : ''}`, 'sys'); }
    if (moved < 0) labLog(p, `Откат на стадию «${D.STAGES[p.stage]}»`, 'stage');
}

/** Поправки к кубику: что сейчас мешает и помогает. on — включено по умолчанию. */
export function modsFor(p) {
    const e = era();
    const k = clock();
    const m = M();
    const team = (p.team || []).map(norm);
    const out = [];
    const add = (key, label, v, on = true) => out.push({ key, label, v, on });
    const gear = D.LAB_GEAR[e.id] ?? 0;
    if (gear) add('gear', gear > 0 ? 'оборудование базы' : 'лаба на коленке', gear);
    const sm = D.STAGE_MOD[p.stage] ?? 0;
    if (sm) add('stage', `стадия «${D.STAGES[p.stage]}»`, sm);
    if (k.hour != null && (k.hour >= 1 && k.hour < 6)) add('night', 'глубокая ночь, недосып', -2);
    if (e.stones) {
        const s = Number(m.med.stones) || 0;
        if (s >= 70) add('stones', 'Камни шалят', -4);
        else if (s >= 45) add('stones', 'Камни неспокойны', -2);
        if (m.med.tremor) add('tremor', 'дрожат руки', -2);
    }
    const pg = pregLine();
    if (pg && !pg.baby) add('preg', 'осторожность (беременность)', -1);
    if (team.some(n => n.includes('айрис'))) add('iris', 'Айрис помогает', 2);
    if (team.some(n => n.includes('оберин'))) add('oberin', 'Оберин лезет (+3, но рискованно)', 3);
    const helpers = team.filter(n => !n.includes('айрис') && !n.includes('оберин') && !n.includes('шарик')).length;
    if (helpers) add('help', helpers > 1 ? 'помощники' : 'помощник', Math.min(2, helpers));
    if (team.some(n => n.includes('шарик'))) add('sharik', 'Шарик «помогает»', -1, false);
    add('focus', 'полная сосредоточенность', 2, false);
    add('rush', 'спешка', -2, false);
    return out;
}

/** Поправки в сумме не больше ±6 — кубик должен решать. */
export const MOD_CAP = 6;
export function rollExp(p, mods) {
    const e = era();
    const roll = 1 + Math.floor(Math.random() * 20);
    const on = mods.filter(x => x.on);
    const modSum = Math.max(-MOD_CAP, Math.min(MOD_CAP, on.reduce((a, x) => a + x.v, 0)));
    const sum = roll + modSum;
    const risky = D.RISKY.includes(p.field) || on.some(x => x.key === 'oberin');
    let out = D.OUTCOMES.find(o => sum >= o.min) || D.OUTCOMES[D.OUTCOMES.length - 1];
    if (roll === 20) out = D.OUTCOMES[0];
    if (roll === 1) out = risky ? D.OUTCOMES[D.OUTCOMES.length - 1] : D.OUTCOMES.find(o => o.id === 'fail');
    if (out.id === 'boom' && !risky) out = D.OUTCOMES.find(o => o.id === 'fail');
    if (on.some(x => x.key === 'oberin') && roll <= 4 && out.id !== 'boom') out = D.OUTCOMES[D.OUTCOMES.length - 1];
    const fl = (e.id === 'ssr' && D.FLAVOR_40S[out.id]) || D.FLAVOR[out.id] || [''];
    return { pid: p.id, pname: p.name, stage: p.stage, roll, mods: on.map(x => ({ label: x.label, v: x.v })), modSum, sum, out: out.id, name: out.name, delta: out.delta, flavor: rnd(fl) };
}

/** Принять исход: прогресс сдвигается сразу; scene — модель покажет это в следующем ответе. */
export function applyExp(r, scene) {
    const p = projectById(r.pid);
    if (!p) return;
    bump(p, r.delta);
    labLog(p, `Опыт: ${r.name.toLowerCase()} — ${r.flavor} (d20 ${r.roll} → ${r.sum})`, r.out, { roll: r.roll, sum: r.sum });
    if (r.out === 'boom') { M().med.stones = clamp((Number(M().med.stones) || 0) + (era().stones ? 6 : 0)); feed(`Сектор лаборатории: «${r.flavor}». Я же говорил.`, 'warn'); }
    if (r.out === 'break') feed(`Проект «${p.name}»: ${r.flavor}. Я записал это три раза, на всякий случай.`);
    if (scene) {
        arm('lab', `[Лаборатория: в этом ответе опыт по проекту «${p.name}» (${D.STAGES[r.stage].toLowerCase()}) заканчивается так — ${r.name.toLowerCase()}: ${r.flavor}. Покажи это в сцене действиями, звуком и реакцией людей${era().artur ? ' (АРТУР может сухо прокомментировать)' : ''}. Исход уже решён, не меняй его. Цифр и кубиков не называй.]`, { key: p.id });
    }
    save();
}

// ───────────── операции ─────────────

export const ops = () => inEra(M().ops);
export const opById = (id) => M().ops.find(o => o.id === id) || null;
export function addOp(rec) {
    const o = { id: uid(), era: era().id, name: 'Новая операция', status: 'plan', goal: '', where: '', when: '', team: [], risk: 3, brief: '', report: '', log: [], src: 'me', created: clock().date, ...rec };
    M().ops.unshift(o);
    opLog(o, 'Операция заведена', 'sys');
    save();
    return o;
}
export function opLog(o, t, kind = 'note') {
    const k = clock();
    o.log.unshift({ t: cut(t, 220), kind, at: [k.date, k.time].filter(Boolean).join(' · '), mes: k.mes });
    o.log = o.log.slice(0, 50);
}
export const statusName = (id) => (D.STATUS_OPS.find(s => s[0] === id) || D.STATUS_OPS[0])[1];

// ───────────── досье ─────────────

export function lifePeople() {
    try { return (A?.settings?.().people?.list || []).filter(x => x && x.name); } catch { return []; }
}
export function cast() {
    const out = [];
    try { for (const n of [ctx().name1, ...(A?.groupMembers?.() || [])]) if (n && !out.some(x => A.sameName?.(x, n) || x === n)) out.push(n); } catch { /* */ }
    return out;
}
export function dossierList() {
    const e = era();
    const re = D.ERA_GROUP[e.id];
    const ppl = lifePeople().filter(x => !re || re.test(`${x.group || ''} ${x.role || ''}`));
    const out = cast().map(n => ({ name: n, main: true, person: lifePeople().find(x => norm(x.name) === norm(n)) }));
    for (const x of ppl) if (!out.some(o => norm(o.name) === norm(x.name))) out.push({ name: x.name, person: x, circle: !!re });
    for (const [n, d] of Object.entries(M().dossier[e.id] || {})) if (!out.some(o => norm(o.name) === norm(n))) out.push({ name: n, own: true, group: d?.group || '', circle: !!re && re.test(`${d?.group || ''} ${d?.post || ''}`) });
    return out;
}
export function dossierOf(name, create = false) {
    const m = M();
    const e = era().id;
    if (!m.dossier[e]) m.dossier[e] = {};
    const key = Object.keys(m.dossier[e]).find(k => norm(k) === norm(name)) || name;
    if (!m.dossier[e][key] && create) m.dossier[e][key] = { status: 'active', stress: 30, note: '' };
    return m.dossier[e][key] || null;
}

// ───────────── радар и «прошлое нагоняет» ─────────────

export const signals = () => inEra(M().radar);
export function addSignal(rec) {
    const k = clock();
    const s = { id: uid(), era: era().id, kind: 'intel', title: '', text: '', where: '', lvl: 1, at: k.date || '', mes: k.mes, seen: false, src: 'me', ...rec };
    M().radar.unshift(s);
    M().radar = M().radar.slice(0, 80);
    save();
    return s;
}
export const kindName = (id) => (D.THREAT_KINDS.find(x => x[0] === id) || D.THREAT_KINDS[1])[1];

export function pastState(id) { return M().past[id]?.state || 'sleep'; }
export function pastActive() { return D.PAST.find(p => ['stir', 'active'].includes(pastState(p.id))) || null; }
export function rollPast() {
    if (pastActive()) return null;
    const pool = D.PAST.filter(p => pastState(p.id) === 'sleep');
    if (!pool.length) return null;
    const p = rnd(pool);
    M().past[p.id] = { state: 'stir', at: clock().date };
    addSignal({ kind: 'past', title: `${p.name}: первый знак`, text: p.hint, lvl: 2, src: 'past', past: p.id });
    feed(`Шевельнулось старое: ${p.name}. Пока только знак. Я бы не делал вид, что ничего не было.`, 'warn');
    save();
    return p;
}

// ───────────── медблок ─────────────

export function stonesWord(v = M().med.stones) {
    v = Number(v) || 0;
    if (v >= 85) return 'на грани выброса';
    if (v >= 70) return 'нестабильно';
    if (v >= 45) return 'рябит';
    if (v >= 20) return 'спокойно';
    return 'тихо';
}

// ───────────── базы и файлы (стартовые — по эпохе) ─────────────

export function bases(e = era()) {
    const m = M();
    if (!m.bases[e.id]) {
        m.bases[e.id] = (D.BASES[e.id] || []).map(b => ({ id: uid(), status: 'ok', who: '', img: '', ...JSON.parse(JSON.stringify(b)) }));
        save();
    }
    return m.bases[e.id];
}
export function baseHere(loc = clock().loc) {
    const l = norm(loc);
    if (!l) return null;
    return bases().find(b => (b.keys || []).some(k => k && l.includes(norm(k))) || l.includes(norm(b.name))) || null;
}
export function files(e = era()) {
    const m = M();
    if (!m.files[e.id]) {
        m.files[e.id] = (D.FILES[e.id] || []).map(f => ({ id: uid(), ...JSON.parse(JSON.stringify(f)) }));
        save();
    }
    return m.files[e.id];
}
/** Пост задел ключи запертой папки — Арт её открывает. */
export function scanFiles(text) {
    const t = norm(text);
    const out = [];
    for (const f of files()) {
        if (!f.lock) continue;
        if ((f.keys || []).some(k => k && norm(k).length >= 3 && t.includes(norm(k)))) {
            f.lock = false;
            f.opened = clock().date;
            out.push(f.name);
            const q = /^«.*»$/.test(f.name) ? f.name : `«${f.name}»`;
            feed(era().artur ? `Открыл папку ${q}: сюжет до неё дошёл. Читать будете или опять потом?` : `Из сейфа поднята папка ${q}.`, 'sys');
        }
    }
    if (out.length) save();
    return out;
}

// ───────────── Шарик ─────────────

export function sharikTick() {
    const s = M().sharik;
    const k = clock();
    let h = 0;
    if (s.t != null && k.t != null) h = (k.t - s.t) / 3.6e6;
    else if (s.mes != null) h = (k.mes - s.mes) * 0.25;
    h = Math.max(0, Math.min(72, h));
    if (h > 0) {
        s.charge = clamp(s.charge - h * (Number(cfg().sharikDrain) || 3));
        s.love = clamp(s.love - h * 1.5);
    }
    s.t = k.t; s.mes = k.mes;
    return s;
}
export function sharikMood(s = M().sharik) {
    const c = Number(s.charge) || 0;
    const row = D.SHARIK_MOODS.find(r => c >= r[0]) || D.SHARIK_MOODS[D.SHARIK_MOODS.length - 1];
    let mood = row[1], how = row[2];
    if (c > 15 && (Number(s.love) || 0) < 25) { mood = 'обижен'; how = 'отвернулся к стене и демонстративно мигает'; }
    else if (c > 40 && (Number(s.love) || 0) > 80) { mood = 'счастлив'; how = 'кружится на месте и бипает мелодию'; }
    return { mood, how };
}
export function sharikDo(act) {
    const s = sharikTick();
    const lines = {
        charge: ['Шарик на зарядке. Счастливо мигает.', 'Подключён. Бипнул так, будто ему подарили щенка.'],
        pet: ['Шарика погладили. Он теперь будет ездить за вами весь день.', 'Шарик довольно жужжит и тычется в ладонь.'],
        take: ['Шарик едет с вами. Я бы на вашем месте следил за ступеньками.'],
        leave: ['Шарик остался. Смотрит вслед «глазами». Мне неловко за вас.'],
    };
    if (act === 'charge') s.charge = 100;
    if (act === 'pet') s.love = clamp((Number(s.love) || 0) + 25);
    if (act === 'take') s.with = true;
    if (act === 'leave') s.with = false;
    const t = rnd(lines[act] || ['Шарик бипнул.']);
    s.log.unshift({ t, at: clock().date });
    s.log = s.log.slice(0, 20);
    save();
    return t;
}

// ───────────── присутствие Арта в сцене ─────────────

export function present() {
    const e = era();
    const c = cfg();
    if (!e.artur || c.present === 'off') return false;
    if (c.present === 'always') return true;
    if (D.ALWAYS_ON.includes(e.id)) return true;
    const k = clock();
    if (baseHere(k.loc) || D.HOME_RE.test(k.loc)) return true;
    return recent(2, 2000).some(t => D.ARTUR_RE.test(t));
}

// ───────────── инициатива Арта ─────────────

let liveInit = '';
export const clearLive = () => { liveInit = ''; };
function maybeInit(type) {
    if (!type || ['quiet', 'impersonate', 'continue'].includes(type)) return;
    if (!present()) { liveInit = ''; return; }
    const chance = D.INIT[cfg().init]?.[0] || 0;
    if (shots().some(s => s.kind === 'init')) return;
    if (Math.random() >= chance) { liveInit = ''; return; }
    const m = M();
    const e = era();
    const idea = m.ideas.find(x => (x.era || 'aim') === e.id && !x.used);
    let text;
    if (idea) { text = idea.text; idea.used = true; }
    else text = rnd([...(D.INIT_IDEAS[e.id] || []), ...D.INIT_IDEAS.any]);
    liveInit = text;
    feed(`Влез сам: ${text}`, 'init');
}

// ───────────── заметка модели ─────────────

export function promptNote(type) {
    const c = cfg();
    if (!c.on || !hasChat()) return '';
    const e = era();
    if (e.id === 'none') return '';
    try { maybeInit(type); } catch (err) { console.warn('[АРТУР] инициатива', err); }
    const m = M();
    const parts = [];
    const pres = present();
    if (pres) {
        const st = [];
        const live = ops().filter(o => o.status === 'live');
        if (live.length) st.push(`идёт операция ${live.map(o => `«${o.name}»${o.goal ? ` (${cut(o.goal, 80)})` : ''}`).join(', ')}`);
        const hb = baseHere();
        if (hb && hb.status !== 'ok') st.push(`${hb.name}: ${(D.STATUS_BASE.find(s => s[0] === hb.status) || [])[1]?.toLowerCase()}`);
        if (e.stones && (Number(m.med.stones) || 0) >= 70) st.push(`энергия Камней в Хеди ${stonesWord()}`);
        const sh = m.sharik;
        if (sh.with && (Number(sh.charge) || 0) < 15) st.push('Шарик почти сел и жалобно пищит');
        if (e.id === 'shield' && (Number(m.hydra.legend) || 0) < 50) st.push(`легенда «дочь Пирса» трещит (держится на ${m.hydra.legend}%)`);
        parts.push(`[А.Р.Т.У.Р. рядом — ${e.title}. ${voice()}${st.length ? `\nСейчас у Арта: ${st.join('; ')}.` : ''}\nЕсли Арт говорит — коротко, его голосом, без лекций; за Хеди не решает.]`);
        if (m.sharik.with && Math.random() < 0.25) parts.push(`[Шарик рядом: ${sharikMood().how}. Можно мелькнуть одной деталью.]`);
    } else if (e.id === 'ssr') {
        const live = ops().filter(o => o.status === 'live');
        if (live.length) parts.push(`[СНР: идёт операция ${live.map(o => `«${o.name}»`).join(', ')}.]`);
    }
    for (const s of m.shots) parts.push(s.text);
    if (liveInit) parts.push(`[АРТУР сам, в этом ответе: ${liveInit}. Одна-две реплики его голосом, по делу, не перетягивая сцену. Если сцена интимная — молчит, разве что пожар.]`);
    return parts.join('\n');
}

// ───────────── Летописец ─────────────

const CHRON_RULE = `

art — что в этом посте было по части лаборатории, операций и компьютера Хеди (строка «АРТУР» во входе). Только то, что правда есть в посте; ничего не было — {}.
{"lab":[{"id":"","note":"что сделали, 4–12 слов"}],"newlab":"","ops":[{"id":"","status":"","note":""}],"newop":{"name":"","goal":"","where":""},"stones":0,"tremor":false,"hurt":[{"who":"","what":""}],"sharik":"","dossier":[{"who":"","what":""}],"remark":"","idea":""}
lab — по каким проектам из списка работали в посте (id из списка). newlab — название нового проекта, если начали что-то новое, иначе "". ops — у каких операций из списка сменился статус (plan|live|hold|done|fail) или что произошло, note 4–12 слов. newop — новая операция, если её задумали или поручили, иначе пустые строки. stones — как изменилась нестабильность энергии Камней в Хеди, от -10 до 10 (выброс силы, перегрузка — плюс; покой, сон — минус), 0 — не видно или Камней нет. tremor — после перегрузки дрожат руки. hurt — кто ранен и чем, коротко. sharik — что было с Шариком (зарядили, гладили, путался под ногами), иначе "". dossier — что из поста стоит записать кому-то в личное дело (поступок, ранение, срыв, нарушение, заслуга, новый факт биографии), who — имя, what — 6–16 слов сухим канцеляритом; обычно пусто. remark — реплика АРТУРа себе в журнал про этот пост, 6–18 слов, его голосом: сухо, с сарказмом, по-дружески ворчит; не о чем — "". idea — что АРТУР мог бы сделать САМ в ближайших сценах, 8–20 слов, иначе "".`;

export function chronHook() {
    const c = cfg();
    if (!c.on || !c.chron || !hasChat()) return null;
    const e = era();
    if (e.id === 'none') return null;
    const pl = projects().filter(p => p.stage < D.STAGES.length - 1).slice(0, 8).map(p => `${p.id} — ${p.name} (${D.STAGES[p.stage]})`);
    const ol = ops().filter(o => !['done', 'fail'].includes(o.status)).slice(0, 6).map(o => `${o.id} — ${o.name} (${statusName(o.status).toLowerCase()})`);
    const line = `АРТУР (эпоха: ${e.name}${e.artur ? '' : ', АРТУРа рядом нет — remark и idea пустые'}${e.stones ? '' : ', Камней в Хеди нет — stones 0'}): проекты лаборатории — ${pl.join('; ') || 'нет'}. Операции — ${ol.join('; ') || 'нет'}.${M().sharik.with && e.artur ? ' Шарик с Хеди.' : ''}`;
    return { key: '"art": {}', rule: CHRON_RULE, input: line, tokens: 260 };
}

export function afterPost(i, j) {
    const c = cfg();
    if (!c.on) return [];
    const a = j?.art;
    const out = [];
    if (!a || typeof a !== 'object') return out;
    const e = era();
    const m = M();
    for (const x of arr(a.lab)) {
        const p = projectById(str(x?.id));
        if (!p) continue;
        bump(p, 5);
        labLog(p, str(x.note) || 'работа в лаборатории', 'work', { mes: i });
    }
    const nl = str(a.newlab);
    if (nl && !projects().some(p => norm(p.name) === norm(nl))) { addProject({ name: cut(nl, 80), src: 'chron', fresh: true }); out.push(`Новый проект: ${nl}`); }
    for (const x of arr(a.ops)) {
        const o = opById(str(x?.id));
        if (!o) continue;
        const st = str(x.status);
        if (st && D.STATUS_OPS.some(s => s[0] === st) && st !== o.status) { o.status = st; opLog(o, `Статус: ${statusName(st)}`, 'status'); out.push(`«${o.name}»: ${statusName(st).toLowerCase()}`); }
        if (str(x.note)) opLog(o, str(x.note));
    }
    const no = a.newop && typeof a.newop === 'object' ? a.newop : null;
    if (no && str(no.name) && !ops().some(o => norm(o.name) === norm(no.name))) { addOp({ name: cut(str(no.name), 80), goal: str(no.goal), where: str(no.where), src: 'chron', fresh: true }); out.push(`Новая операция: ${str(no.name)}`); }
    if (e.stones) {
        const ds = Math.max(-10, Math.min(10, Number(a.stones) || 0));
        if (ds) m.med.stones = clamp((Number(m.med.stones) || 0) + ds);
        if (a.tremor === true) m.med.tremor = true;
        if (ds < 0 && a.tremor !== true) m.med.tremor = false;
    }
    for (const h of arr(a.hurt)) {
        if (!str(h?.who) || !str(h?.what)) continue;
        m.patients.unshift({ id: uid(), era: e.id, name: str(h.who), state: 'hurt', note: cut(str(h.what), 160), at: clock().date, src: 'chron' });
        out.push(`Медблок: ${str(h.who)} — ${cut(str(h.what), 40)}`);
    }
    m.patients = m.patients.slice(0, 40);
    const sh = str(a.sharik);
    if (sh) {
        const s = sharikTick();
        if (/заряд|розетк|подключ/i.test(sh)) s.charge = 100;
        if (/глад|обнял|похвал|ласк/i.test(sh)) s.love = clamp((Number(s.love) || 0) + 20);
        s.log.unshift({ t: cut(sh, 120), at: clock().date, mes: i });
        s.log = s.log.slice(0, 20);
    }
    if (e.artur && str(a.remark)) feed(str(a.remark), 'artur', { mes: i });
    if (e.artur && str(a.idea)) { m.ideas.unshift({ id: uid(), era: e.id, text: cut(str(a.idea), 200), at: clock().date }); m.ideas = m.ideas.slice(0, 20); }
    save();
    return out;
}

// ───────────── запросы к модели (профиль Летописца) ─────────────

export async function ask(system, user, tokens = 600) {
    if (!A?.askModel) throw new Error('Нужен Life: Арт говорит через его Летописца.');
    const out = await A.askModel([{ role: 'system', content: system }, { role: 'user', content: user }], tokens);
    return out;
}
export const jsonOf = (t) => { try { return A?.extractJson?.(t) || JSON.parse(String(t).replace(/```(?:json)?/g, '').trim()); } catch { return null; } };

function situation() {
    const k = clock();
    const e = era();
    const m = M();
    const lines = [
        `Эпоха: ${e.name} (${e.title}). Сейчас: ${[k.date, k.time].filter(Boolean).join(', ') || 'дата неизвестна'}${k.loc ? `, место: ${k.loc}` : ''}.`,
        eraLore(e),
    ];
    const pg = pregLine();
    if (pg) lines.push(`Хеди: ${pg.baby ? pg.text : `беременна, ${pg.text}`}.`);
    if (e.stones) lines.push(`Энергия Камней в Хеди: ${stonesWord()}${m.med.tremor ? ', дрожат руки' : ''}.`);
    const pl = projects().slice(0, 5).map(p => `${p.name} (${D.STAGES[p.stage]}, ${p.pct}%)`);
    if (pl.length) lines.push(`Лаборатория: ${pl.join('; ')}.`);
    const ol = ops().filter(o => !['done', 'fail'].includes(o.status)).slice(0, 4).map(o => `${o.name} (${statusName(o.status)})`);
    if (ol.length) lines.push(`Операции: ${ol.join('; ')}.`);
    const ev = events(6);
    if (ev.length) lines.push(`Недавние события: ${ev.join(' | ')}`);
    return lines.filter(Boolean).join('\n');
}

/** Приветствие на рабочем столе — раз в игровой день или по кнопке, своё у каждой эпохи. */
export const remarkOf = (e = era()) => { const r = M().remark; return r && typeof r[e.id] === 'object' ? r[e.id] : null; };
export async function remark(force = false) {
    const e = era();
    const m = M();
    const k = clock();
    if (!e.artur) return '';
    const day = k.day || k.mes;
    const cur = remarkOf(e);
    if (!force && cur?.day === day && cur.text) return cur.text;
    const sys = `Ты — А.Р.Т.У.Р., ИИ Хеди Барлоу.\n${voice()}\nНапиши, как ты встречаешь Хеди, когда она открывает компьютер: 1–3 коротких предложения по-русски, на «вы» с «мэм» по настроению, по делу и с характером — что важно прямо сейчас (сон, еда, врач, операция, лаборатория, кто её искал). Без кавычек, без приветствия «Здравствуйте», без списков.`;
    const usr = `${situation()}\n\nПоследнее в истории:\n${recent(2, 500).join('\n')}`;
    const t = str(await ask(sys, usr, 220)).replace(/^["«]|["»]$/g, '');
    if (m.remark.text !== undefined) m.remark = {};
    m.remark[e.id] = { day, text: cut(t, 400) };
    save();
    return m.remark[e.id].text;
}

/** Сводка радара на игровой день. */
export async function scan() {
    const e = era();
    const m = M();
    const k = clock();
    const have = signals().slice(0, 12).map(s => s.title).join('; ');
    const sys = `Ты — ${e.artur ? 'А.Р.Т.У.Р., ИИ Хеди Барлоу, ведёшь разведсводку' : 'аналитик разведки СНР, составляешь сводку'}.\nСоставь 2–4 сигнала за этот игровой день: всплески энергии, перехваты, движения противника, аномалии. Опирайся на эпоху, лор и недавние события, держи канон и хронологию, ничего не решай за героев, новых суперзлодеев с потолка не выдумывай. Тон — сухая сводка${e.artur ? ' с редкой ремаркой Арта' : ''}.\nОтвет — только JSON: {"signals":[{"kind":"energy|intel|enemy|anomaly","title":"3–7 слов","text":"15–40 слов","where":"место","lvl":1}]} (lvl 1 — фон, 2 — внимание, 3 — тревога).`;
    const usr = `${situation()}\nУже на радаре (не повторяй): ${have || 'ничего'}`;
    const j = jsonOf(await ask(sys, usr, 700));
    const list = arr(j?.signals).filter(x => str(x?.title));
    if (!list.length) throw new Error('Радар вернул пустую сводку');
    const kinds = D.THREAT_KINDS.map(x => x[0]);
    for (const x of list.slice(0, 4)) addSignal({ kind: kinds.includes(str(x.kind)) ? str(x.kind) : 'intel', title: cut(str(x.title), 80), text: cut(str(x.text), 300), where: cut(str(x.where), 60), lvl: Math.max(1, Math.min(3, Number(x.lvl) || 1)), src: 'scan' });
    m.scan[e.id] = k.day || k.mes;
    save();
    return list.length;
}

export async function brief(o) {
    const e = era();
    const team = (o.team || []).join(', ');
    const sys = `Ты — ${e.artur ? 'А.Р.Т.У.Р., ИИ Хеди Барлоу' : 'штабной офицер СНР'}. Составь брифинг операции по-русски: цель, что известно, риски, состав и роли, запасной план. 90–160 слов, сухо и по делу${e.artur ? ', в конце одна ремарка Арта в его характере' : ''}. Держи лор, за героев не решай. Без markdown-заголовков, можно короткие абзацы.\n${e.artur ? voice() : ''}`;
    const usr = `${situation()}\n\nОперация: ${o.name}\nЦель: ${o.goal || '—'}\nГде и когда: ${[o.where, o.when].filter(Boolean).join(', ') || '—'}\nСостав: ${team || '—'}\nРиск: ${o.risk}/5\nЖурнал: ${o.log.slice(0, 8).map(l => l.t).join(' | ')}`;
    o.brief = cut(str(await ask(sys, usr, 600)), 2000);
    save();
    return o.brief;
}

export async function report(o) {
    const e = era();
    const sys = `Ты — ${e.artur ? 'А.Р.Т.У.Р., ИИ Хеди Барлоу' : 'штабной офицер СНР'}. Напиши отчёт по итогам операции по-русски: что было, итог, потери и раненые, что узнали, хвосты. 80–150 слов, сухо${e.artur ? ', в конце ремарка Арта' : ''}. Только то, что видно из журнала и событий, ничего не додумывай.`;
    const usr = `${situation()}\n\nОперация: ${o.name} — ${statusName(o.status)}\nЦель: ${o.goal || '—'}\nЖурнал: ${o.log.map(l => `${l.at} ${l.t}`).join(' | ')}\n\nПоследнее в истории:\n${recent(3, 500).join('\n')}`;
    o.report = cut(str(await ask(sys, usr, 550)), 2000);
    save();
    return o.report;
}

// ───────────── картинки ─────────────

export async function drawBlueprint(p) {
    if (!A?.drawPicture) throw new Error('Рисую через Life → Гардероб, а их нет');
    const e = era();
    const prompt = e.id === 'ssr'
        ? `1940s engineering drawing on yellowed drafting paper: ${p.name}. ${p.note || ''} Pencil and ink linework, exploded view, measurement lines, coffee stain, paper texture, no readable text.`
        : `Holographic blueprint of ${p.name}. ${p.note || ''} Glowing cyan and blue wireframe schematic floating over a dark navy lab console, exploded view, fine technical linework, scan lines, sci-fi interface, no readable text, no people.`;
    p.img = await A.drawPicture(prompt, { aspect: '16:9', max: 1400, prefix: 'artur_lab' });
    save();
    return p.img;
}
export async function drawBase(b) {
    if (!A?.drawPicture) throw new Error('Рисую через Life → Гардероб, а их нет');
    const e = era();
    const prompt = e.id === 'ssr'
        ? `1940s black-and-white reconnaissance photograph of ${b.name} (${b.kind}). ${b.note || ''} Film grain, wartime, no text.`
        : `Security camera still: ${b.name} (${b.kind}). ${b.note || ''} Wide angle, slight fisheye, cool teal tint, quiet, cinematic, no people, no text, no timestamp.`;
    b.img = await A.drawPicture(prompt, { aspect: '16:9', max: 1400, prefix: 'artur_base' });
    save();
    return b.img;
}

export function afterAiPost(i) {
    const m = (ctx().chat || [])[i];
    if (!m || m.is_user || m.is_system) return [];
    spendShots(i);
    return scanFiles(plain(m.mes)).map(n => `Открыта папка: ${n}`);
}
