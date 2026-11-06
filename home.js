// ✦ А.Р.Т.У.Р. — умный дом квартиры над лавкой Марко: охрана «Форт-Нокс», кухня и кофемашина,
// климат, свет, стирка, фиалки, Альпин, дроны-уборщики, музыка и лапы-манипуляторы.

import * as C from './core.js';
import * as HD from './homedata.js';

const rnd = C.rnd;
const d20 = () => 1 + Math.floor(Math.random() * 20);

export const hasHome = (e = C.era()) => e.id === 'aim';

export function H() {
    const m = C.M();
    if (!m.home || typeof m.home !== 'object') m.home = {};
    const h = m.home;
    const def = {
        mode: 'home', dnd: false, light: 'warm', music: 'off',
        zones: Object.fromEntries(HD.ZONES.map(z => [z[0], 'ok'])), events: [],
        climate: { mode: 'auto', floor: true, zones: HD.CLIMATE.map(z => ({ ...z })) },
        coffee: { cup: null, day: '', mg: 0 },
        fridge: [...HD.FRIDGE], shop: [...HD.SHOP_LIST],
        oven: { on: false, t: 180, what: '' },
        laundry: { st: 'idle', prog: 'daily', end: null, endMes: null },
        violets: { day: '', auto: false },
        cat: { name: 'Альпин', day: '', am: false, pm: false, auto: false, spot: '' },
        arms: HD.ARMS.map(a => ({ ...a, xp: 0 })),
        log: [],
    };
    for (const [k, v] of Object.entries(def)) if (h[k] === undefined || h[k] === null) h[k] = v;
    for (const z of HD.ZONES) if (!h.zones[z[0]]) h.zones[z[0]] = 'ok';
    return h;
}

const stamp = () => { const k = C.clock(); return [k.date, k.time].filter(Boolean).join(' · '); };
export function log(t, kind = 'home') {
    const h = H();
    h.log.unshift({ t: C.cut(t, 260), kind, at: stamp(), mes: C.clock().mes });
    h.log = h.log.slice(0, 50);
}
export const sceneOn = () => C.cfg().homeScene !== false;
function scene(key, text) {
    if (!sceneOn()) return;
    C.armList('home', text, '[Квартира, в этом ответе — мельком, одной-двумя деталями, не перетягивая сцену: ', '.]', 5);
}

/** Сцена в квартире? По месту из Horae. */
export function atHome(loc = C.clock().loc) {
    if (!loc) return false;
    if (HD.HOME_RE.test(loc)) return true;
    return HD.ROOM_RE.test(loc) && !HD.NOT_HOME_RE.test(loc);
}

// ───────────── режимы ─────────────

export function setMode(id) {
    const h = H();
    if (h.mode === id) return;
    h.mode = id;
    if (id === 'siege') { h.light = 'red'; C.feed('Осада. Ставни опущены, дверь заперта, А.И.М. и сержант Барнс в курсе. Чай поставить?', 'warn'); }
    log(`Режим: ${(HD.MODES.find(x => x[0] === id) || [])[1]}`, 'mode');
    scene(`mode`, `Арт переводит квартиру в ${HD.MODE_NOTE[id]}`);
    C.save();
}
export function setDnd(on) {
    const h = H();
    h.dnd = !!on;
    log(on ? 'Не беспокоить: Арт молчит, разве что пожар' : 'Не беспокоить выключено', 'mode');
    C.save();
}

// ───────────── охрана ─────────────

export const alarm = () => { const z = H().zones; return Object.values(z).includes('breach') ? 'breach' : Object.values(z).includes('alert') ? 'alert' : 'ok'; };
export const zoneName = (id) => (HD.ZONES.find(z => z[0] === id) || [id, id])[1];

export function checkPerimeter() {
    const h = H();
    const r = d20();
    let kind, zone = '', text;
    const shift = h.mode === 'away' ? 2 : h.mode === 'night' ? 1 : 0;
    if (r === 1) kind = 'breach';
    else if (r <= 3 + shift) kind = 'odd';
    else if (r <= 10 + shift) kind = 'funny';
    else kind = 'clean';
    if (kind === 'clean') text = rnd(HD.PERIM.clean);
    else { const x = rnd(HD.PERIM[kind]); zone = x[0]; text = x[1]; }
    if (kind === 'breach') { h.zones[zone] = 'breach'; if (h.mode === 'siege' || h.mode === 'night') h.light = 'red'; C.feed(`Нарушение периметра: ${zoneName(zone)}. ${text}`, 'warn'); }
    if (kind === 'odd' && h.zones[zone] === 'ok') h.zones[zone] = 'alert';
    const ev = { id: C.uid(), kind, zone, text, roll: r, at: stamp() };
    if (kind !== 'clean') { h.events.unshift(ev); h.events = h.events.slice(0, 20); }
    log(`Проверка периметра (d20 ${r}): ${text}`, kind === 'breach' ? 'bad' : kind === 'odd' ? 'warn' : 'home');
    C.save();
    return ev;
}
export function eventScene(ev) {
    const sev = ev.kind === 'breach' ? 'НАРУШЕНИЕ ПЕРИМЕТРА' : ev.kind === 'odd' ? 'подозрительное у периметра' : 'ложная тревога';
    C.arm('perimeter', `[Охрана квартиры, в этом ответе: ${sev}${ev.zone ? ` — ${zoneName(ev.zone)}` : ''}. Арт докладывает своим голосом: «${ev.text}» Квартира защищена как Форт-Нокс: бронестекло, ставни, биометрия, датчики — просто так не войти. Что делать — решают герои, не модель.]`, { key: ev.id });
}
export function cycleZone(id) {
    const h = H();
    const order = ['ok', 'alert', 'breach'];
    h.zones[id] = order[(order.indexOf(h.zones[id]) + 1) % order.length];
    log(`${zoneName(id)}: ${(HD.ZONE_ST.find(s => s[0] === h.zones[id]) || [])[1]} (вручную)`, 'mode');
    C.save();
}
export function allClear() {
    const h = H();
    for (const z of HD.ZONES) h.zones[z[0]] = 'ok';
    if (h.light === 'red') h.light = 'warm';
    if (h.mode === 'siege') h.mode = 'home';
    log('Отбой тревоги. Все зоны зелёные.', 'mode');
    C.feed('Отбой. Все восемь зон зелёные. Я выдохну, если вы не против, — образно.', 'sys');
    C.save();
}

// ───────────── кухня ─────────────

const pregnant = () => { const p = C.pregLine(); return !!p && !p.baby; };
export function caffeine() {
    const h = H();
    const d = C.clock().day || 'x';
    if (h.coffee.day !== d) { h.coffee.day = d; h.coffee.mg = 0; }
    return h.coffee.mg;
}
const REFUSE = [
    'Отказано. Доктор Васкез: двести миллиграммов в день, вы уже на {mg}. Могу предложить декаф и сочувствие.',
    'Нет. Я помню, как вы называете декаф, и всё равно нет. {mg} из двухсот.',
    'Кофемашина заблокирована мной лично. Жалобы — сержанту Барнсу, он их коллекционирует.',
];
export function brew(id, force = false) {
    const h = H();
    const d = HD.DRINKS.find(x => x[0] === id);
    if (!d) return { ok: false, text: 'Нет такого напитка' };
    const mg = caffeine();
    if (d[4] === 'hedy' && pregnant() && d[2] > 10 && mg + d[2] > HD.CAFFEINE_MAX && !force) {
        return { ok: false, refused: true, text: rnd(REFUSE).replace('{mg}', String(mg)) };
    }
    if (d[4] === 'hedy') h.coffee.mg = mg + d[2];
    h.coffee.cup = { id, name: d[1], what: d[3], who: d[4], at: C.clock().time || '', mes: C.clock().mes };
    if (force) C.feed(`Приказ директора: ${d[1].toLowerCase()}. Записал в журнал. Покажу его доктору Васкез.`, 'warn');
    log(`Кофемашина: ${d[1]}${force ? ' (приказ директора)' : ''}${d[4] === 'hedy' && d[2] ? ` · кофеин сегодня ${h.coffee.mg} мг` : ''}`, 'kitchen');
    scene(`coffee`, `кофемашина сама готовит ${d[3]}${force ? ' — Арт ворчит, но подчиняется приказу директора' : ''}`);
    C.save();
    return { ok: true, text: `${d[1]} готов${d[1].endsWith('а') ? 'а' : ''}.` };
}
export function cupTaken() { H().coffee.cup = null; }

export function fridgeOut(i) { const h = H(); const it = h.fridge.splice(i, 1)[0]; if (it) { h.shop.push(it); log(`Кончилось: ${it} → в список покупок`, 'kitchen'); } C.save(); }
export function shopGot(i) { const h = H(); const it = h.shop.splice(i, 1)[0]; if (it && !h.fridge.includes(it)) h.fridge.push(it); C.save(); }
export function fridgeAdd(t) { const h = H(); t = String(t || '').trim(); if (t) h.fridge.push(t); C.save(); }
export function oven(on, t) {
    const h = H();
    h.oven.on = !!on;
    if (t) h.oven.t = Math.max(50, Math.min(250, Math.round(t)));
    log(on ? `Духовка: ${h.oven.t}°${h.oven.what ? `, внутри ${h.oven.what}` : ''}` : 'Духовка выключена', 'kitchen');
    if (on) scene('oven', `духовка разогревается до ${h.oven.t}°${h.oven.what ? ` — ${h.oven.what}` : ''} (не микроволновка)`);
    C.save();
}

// ───────────── климат, свет, музыка ─────────────

export function setTemp(id, delta) { const z = H().climate.zones.find(x => x.id === id); if (!z) return; z.t = Math.max(14, Math.min(30, z.t + delta)); C.save(); }
export function setClimateMode(v) { H().climate.mode = v; log(`Климат: ${(HD.CLIMATE_MODES.find(x => x[0] === v) || [])[1]}`, 'climate'); C.save(); }
export function toggleFloor() { const c = H().climate; c.floor = !c.floor; C.save(); }
export function setLight(v) {
    const h = H();
    h.light = v;
    const l = HD.LIGHTS.find(x => x[0] === v);
    log(`Свет: ${l?.[1]}`, 'light');
    scene('light', `свет в квартире меняется: ${l?.[2]}`);
    C.save();
}
export function setMusic(v) {
    const h = H();
    h.music = v;
    const mu = HD.MUSIC.find(x => x[0] === v);
    log(v === 'off' ? 'Музыка выключена' : `Играет: ${mu?.[1]}`, 'music');
    if (v !== 'off') scene('music', `Арт включает музыку: ${mu?.[1]}`);
    C.save();
}

// ───────────── быт ─────────────

export function laundry() {
    const l = H().laundry;
    const k = C.clock();
    const due = (l.end != null && k.t != null && k.t >= l.end) || (l.endMes != null && k.mes >= l.endMes);
    if (l.st === 'wash' && due) { l.st = 'wet'; log('Стирка закончилась. Мокрое ждёт.', 'chores'); C.save(); }
    if (l.st === 'drying' && due) { l.st = 'dry'; log('Сушка закончилась.', 'chores'); C.save(); }
    return l;
}
function timer(l, min) { const k = C.clock(); l.end = k.t != null ? k.t + min * 60e3 : null; l.endMes = k.mes + (min > 60 ? 3 : 2); }
export function laundryStart(prog) {
    const l = H().laundry;
    const p = HD.LAUNDRY.find(x => x[0] === prog) || HD.LAUNDRY[0];
    l.prog = p[0]; l.st = 'wash'; timer(l, p[2]);
    log(`Стирка: ${p[3]}, ${p[2]} мин`, 'chores');
    scene('laundry', `в ванной тихо гудит стиральная машина — ${p[3]}`);
    C.save();
}
export function laundryDry() { const l = H().laundry; l.st = 'drying'; timer(l, 60); log('Сушилка запущена, 60 мин', 'chores'); C.save(); }
export function laundryDone(by = '') { const l = H().laundry; l.st = 'idle'; l.end = null; l.endMes = null; log(`Бельё сложено${by ? ` (${by})` : ''}`, 'chores'); C.save(); }
export function laundryLeft() {
    const l = laundry();
    if (!['wash', 'drying'].includes(l.st)) return '';
    const k = C.clock();
    if (l.end != null && k.t != null) return `ещё ${Math.max(1, Math.round((l.end - k.t) / 60e3))} мин`;
    return 'ещё пару постов';
}

const dayDiff = (a, b) => { if (!a || !b) return null; const x = new Date(a), y = new Date(b); if (isNaN(x) || isNaN(y)) return null; return Math.round((y - x) / 864e5); };
export function violets() {
    const v = H().violets;
    const k = C.clock();
    let days = dayDiff(v.day, k.day);
    if (v.auto && (days == null || days >= 3)) { v.day = k.day; days = 0; }
    const st = days == null ? 'не знаю, когда поливали' : days <= 2 ? 'свежие' : days <= 5 ? 'подсыхают' : 'вянут';
    return { days, st };
}
export function water(by = 'Хеди') {
    const v = H().violets;
    v.day = C.clock().day;
    log(`Фиалки политы (${by})`, 'chores');
    C.save();
}

export function cat() {
    const c = H().cat;
    const k = C.clock();
    if (c.day !== k.day) { c.day = k.day; c.am = false; c.pm = false; }
    const pm = k.hour != null && k.hour >= 15;
    if (c.auto) { if (pm) c.pm = true; else c.am = true; }
    return { ...c, pmNow: pm, fed: pm ? c.pm : c.am };
}
export function feedCat(by = 'Хеди') {
    const c = H().cat;
    const k = C.clock();
    cat();
    if (k.hour != null && k.hour >= 15) c.pm = true; else c.am = true;
    log(`${c.name} накормлена (${by})`, 'chores');
    C.save();
}
export function findCat() {
    const c = H().cat;
    c.spot = rnd(HD.CAT_SPOTS);
    log(`${c.name}: ${c.spot}`, 'chores');
    scene('cat', `${c.name} (белая кошка) обнаруживается ${c.spot}`);
    C.save();
    return c.spot;
}
export function drones() {
    const x = rnd(HD.DRONES);
    log(`Дроны: ${x[1]}`, 'chores');
    if (x[0] === 'cat') H().cat.spot = 'воюет с дронами';
    scene('drones', `дроны-уборщики Арта прошли квартиру — ${x[1].toLowerCase()}`);
    C.save();
    return x[1];
}

// ───────────── лапы ─────────────

export function armTask(armId, taskId) {
    const h = H();
    const a = h.arms.find(x => x.id === armId);
    const t = HD.ARM_TASKS.find(x => x[0] === taskId);
    if (!a || !t) return null;
    const r = d20();
    const sum = r + (a.skill || 1) * 2;
    const res = r === 20 || sum >= 14 ? 'ok' : r === 1 || sum < 8 ? 'fail' : 'comic';
    const text = `${a.name} ${rnd(res === 'ok' ? t[2] : res === 'comic' ? t[3] : t[4])}`;
    if (res === 'ok') { a.xp = (a.xp || 0) + 1; if (a.xp >= a.skill * 4 && a.skill < 5) { a.skill++; a.xp = 0; C.feed(`${a.name} научилась новому. Теперь почти не роняет. Почти.`, 'sys'); } }
    if (taskId === 'coffee') cupTaken();
    if (taskId === 'fold' && res !== 'fail' && ['dry', 'wet'].includes(h.laundry.st)) laundryDone(a.name);
    log(`Лапа «${a.name}»: ${text}`, res === 'fail' ? 'bad' : 'arms');
    scene(`arm:${a.id}`, `манипулятор Арта «${a.name}» (${a.place}) ${text.slice(a.name.length + 1)}`);
    C.save();
    return { res, text, roll: r };
}
export function renameArm(id, name) { const a = H().arms.find(x => x.id === id); if (a && name.trim()) { a.name = name.trim().slice(0, 24); C.save(); } }

// ───────────── что уходит модели ─────────────

export function promptLine() {
    const e = C.era();
    if (!C.cfg().on || !hasHome(e) || !atHome()) return '';
    const h = H();
    const p = [];
    if (h.mode !== 'home') p.push(HD.MODE_NOTE[h.mode]);
    if (h.dnd) p.push('режим «не беспокоить» — Арт молчит, разве что пожар');
    const st = alarm();
    if (st !== 'ok') p.push(`охрана: ${st === 'breach' ? 'НАРУШЕНИЕ' : 'внимание'} — ${HD.ZONES.filter(z => h.zones[z[0]] !== 'ok').map(z => z[1]).join(', ')}`);
    const l = HD.LIGHTS.find(x => x[0] === h.light);
    if (l && h.light !== 'warm') p.push(l[2]);
    const lau = laundry();
    if (lau.st === 'wash') p.push('гудит стиральная машина');
    if (lau.st === 'wet') p.push('стирка закончилась, мокрое бельё ждёт');
    if (h.coffee.cup && C.clock().mes - (h.coffee.cup.mes ?? 0) <= 2) p.push(`на кухне ждёт ${h.coffee.cup.what}`);
    if (h.music !== 'off') p.push(`играет ${(HD.MUSIC.find(x => x[0] === h.music) || [])[1]}`);
    if (h.oven.on) p.push(`духовка на ${h.oven.t}°`);
    if (!p.length) return '';
    return `[Квартира над лавкой Марко (умный дом, Арт): ${p.join('; ')}.]`;
}

/** Летописец заметил что-то про дом. */
export function chronHome(text) {
    const t = String(text || '').trim();
    if (!t || !hasHome()) return [];
    log(t, 'chron');
    const n = C.norm(t);
    if (/корм/.test(n) && /альпин|кош/.test(n)) feedCat('по истории');
    if (/полил|полива/.test(n) && /фиалк/.test(n)) water('по истории');
    if (/стирк|стиральн/.test(n) && /запуст|постав|закину/.test(n) && H().laundry.st === 'idle') laundryStart('daily');
    C.save();
    return [];
}
