// ✦ А.Р.Т.У.Р. — Скиталец: мостик корабля Хеди в эпохе «Скиталец» (Скачка с Локи). Запасы считаются днями
// (кислород, еда, вода — на пять лет на двоих, топливо — прыжками) и тают по дням истории; системы и пробоины;
// звёздная карта с прыжками (кубик: чисто, снос, урон, сбой варпа); бортжурнал; Локи на борту.
// «Мнемозина» (2017) — режим ужаса: аварийный красный, датчик движения с писком, задраенные отсеки, доверие экипажей.

import * as C from './core.js';

const esc = (v) => C.esc(v);
const d20 = () => 1 + Math.floor(Math.random() * 20);
const DAY = 864e5;
export const SYS = [['hull', 'Корпус'], ['engine', 'Двигатели'], ['warp', 'Варп'], ['life', 'Жизнеобеспечение'], ['shields', 'Щиты'], ['comp', 'Системы']];
export const ST = ['норма', 'повреждено', 'пробоина', 'отказ'];
export const WORLDS = ['Сакаар', 'Ксандр', 'Ноуэр', 'Пояс Кри', 'Туманность Кейл', 'Станция «Беспризорье»', 'Мёртвая звезда Ориона', 'Мнемозина', 'Безымянный сектор'];
const COMP = ['Отсек А · жилой', 'Отсек Б · трюм', 'Отсек В · лаба', 'Шлюз', 'Машинное'];

export function Sh() {
    const m = C.M();
    if (!m.ship || typeof m.ship !== 'object') m.ship = {};
    const s = m.ship;
    if (!s.left || typeof s.left !== 'object') s.left = { o2: 1900, food: 1825, water: 1825, fuel: 40 };
    if (!s.sys || typeof s.sys !== 'object') s.sys = Object.fromEntries(SYS.map(([k]) => [k, 0]));
    if (!Array.isArray(s.jumps)) s.jumps = [];
    if (!Array.isArray(s.log)) s.log = [];
    if (!Array.isArray(s.crew)) s.crew = ['Хеди', 'Локи'];
    if (!s.at) s.at = 'Скиталец · дрейф';
    if (!s.horror || typeof s.horror !== 'object') s.horror = { on: false, sealed: [], trust: 60, blips: [] };
    return s;
}
function storyT() { try { const d = C.A?.parseDate?.(C.A.worldState()?.timestamp?.story_date); return d && !isNaN(d) ? d.getTime() : null; } catch { return null; } }
const dayStr = () => { try { return C.A?.worldState?.()?.timestamp?.story_date || ''; } catch { return ''; } };
/** Расход по дням истории: на двоих — день за день, больше людей — быстрее. */
export function tick() {
    const s = Sh();
    const t = storyT();
    if (t == null) return 0;
    if (!s.t) { s.t = t; C.save(); return 0; }
    const days = Math.round((t - s.t) / DAY);   // round: переход на летнее время не съедает день
    if (days <= 0) return 0;
    const k = Math.max(1, s.crew.length) / 2;
    const leak = s.sys.life >= 2 ? 3 : 1;
    s.left.o2 = Math.max(0, s.left.o2 - days * k * leak);
    s.left.food = Math.max(0, s.left.food - days * k);
    s.left.water = Math.max(0, s.left.water - days * k * (s.sys.life >= 1 ? 1.5 : 1));
    s.t = t;
    C.save();
    return days;
}
const log = (t) => { const s = Sh(); s.log.unshift({ t, day: dayStr() }); s.log = s.log.slice(0, 30); };
/** Прыжок: кубик решает, как прошёл. */
export function jump(to) {
    const s = Sh();
    if (s.left.fuel <= 0) return { t: 'Топлива на прыжок нет.' };
    const r = d20() - (s.sys.warp >= 1 ? 4 : 0) - (s.sys.engine >= 1 ? 2 : 0);
    s.left.fuel -= 1;
    let t;
    if (r >= 12) { t = `Прыжок к «${to}» — чисто.`; s.at = to; }
    else if (r >= 7) { t = `Прыжок к «${to}» — снесло: вышли на окраине системы, ещё сутки хода.`; s.at = to; }
    else if (r >= 3) { const k = SYS[Math.floor(Math.random() * SYS.length)]; s.sys[k[0]] = Math.min(3, (s.sys[k[0]] || 0) + 1); t = `Прыжок к «${to}» с уроном: ${k[1].toLowerCase()} — ${ST[s.sys[k[0]]]}.`; s.at = to; }
    else { s.at = 'Безымянный сектор'; t = 'Сбой варпа: выбросило в неизвестный сектор. Звёзды чужие.'; s.sys.warp = Math.min(3, (s.sys.warp || 0) + 1); }
    s.jumps.unshift({ to: s.at, day: dayStr(), r });
    log(t);
    C.save();
    return { t, r };
}
export function repair(k) {
    const s = Sh();
    const r = d20() + (C.era().id === 'ship' ? 2 : 0);
    if (!s.sys[k]) return { t: 'Тут и так норма.' };
    const name = SYS.find(x => x[0] === k)?.[1] || k;
    let t;
    if (r >= 10) { s.sys[k] -= 1; t = `${name}: починили — теперь «${ST[s.sys[k]]}».`; }
    else t = `${name}: не вышло — запчастей не хватило.`;
    log(t); C.save();
    return { t, r };
}
/** Датчик движения: метки и расстояние; ближе 10 м — пищит. */
export function scan() {
    const s = Sh();
    const n = Math.random() < 0.25 ? 0 : 1 + Math.floor(Math.random() * 3);
    s.horror.blips = Array.from({ length: n }, () => ({ a: Math.random() * Math.PI * 2, d: 3 + Math.floor(Math.random() * 28) }));
    C.save();
    const near = Math.min(...s.horror.blips.map(b => b.d), 99);
    return near;
}
function beep(near) {
    try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const n = near < 10 ? 5 : near < 20 ? 3 : 1;
        for (let i = 0; i < n; i++) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 1180; g.gain.value = 0.06; o.connect(g); g.connect(ac.destination); const t0 = ac.currentTime + i * (near < 10 ? 0.18 : 0.4); o.start(t0); o.stop(t0 + 0.08); }
        setTimeout(() => ac.close(), 2500);
    } catch { /* без звука */ }
}

export function notes(e) {
    if (e.id !== 'ship') return [];
    const s = C.M().ship;
    if (!s) return [];
    const out = [];
    const low = Object.entries({ кислород: s.left.o2, еда: s.left.food, вода: s.left.water }).filter(([, d]) => d < 180).map(([k, d]) => `${k} — на ${Math.round(d)} дн`);
    const bad = SYS.filter(([k]) => (s.sys[k] || 0) >= 1).map(([k, l]) => `${l.toLowerCase()}: ${ST[s.sys[k]]}`);
    if (low.length || bad.length) out.push(`[Скиталец: ${[low.length && `запасы на исходе (${low.join(', ')})`, bad.length && `повреждения — ${bad.join(', ')}`].filter(Boolean).join('; ')}. Это фон их быта на корабле.]`);
    if (s.horror?.on) {
        const near = Math.min(...(s.horror.blips || []).map(b => b.d), 99);
        out.push(`[«Мнемозина»: аварийный красный свет, датчик движения ${near < 99 ? `пищит — метка в ${near} м` : 'молчит — и это хуже'}; задраено: ${(s.horror.sealed || []).join(', ') || 'ничего'}; доверие между экипажами ${s.horror.trust >= 60 ? 'держится' : s.horror.trust >= 35 ? 'трещит' : 'на нуле'}. Ужас — тишиной и звуком, не кровью; не показывай, что это, раньше времени.]`);
    }
    return out;
}

// ───────────── экран ─────────────

function mapSvg(s) {
    const pts = WORLDS.map((w, i) => { const a = (i / WORLDS.length) * Math.PI * 2 + 0.4; const r = 32 + (i * 37) % 48; return [w, 150 + Math.cos(a) * r * 1.6, 82 + Math.sin(a) * r]; });
    const here = pts.find(p => p[0] === s.at) || [s.at, 150, 82];
    return `<svg class="ar-starmap" viewBox="0 0 300 164">${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 73) % 300}" cy="${(i * 41) % 164}" r="${i % 5 === 0 ? 1 : 0.5}" class="st"/>`).join('')}
        ${s.jumps.slice(0, 6).map((j, i, a) => { const p = pts.find(x => x[0] === j.to); const q = pts.find(x => x[0] === a[i + 1]?.to); return p && q ? `<line x1="${q[1].toFixed(0)}" y1="${q[2].toFixed(0)}" x2="${p[1].toFixed(0)}" y2="${p[2].toFixed(0)}" class="jp"/>` : ''; }).join('')}
        ${pts.map(([w, x, y]) => `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="3" class="wd${w === s.at ? ' on' : ''}"/><text x="${(x + 5).toFixed(0)}" y="${(y + 3).toFixed(0)}" class="wn">${esc(w)}</text>`).join('')}
        <circle cx="${here[1].toFixed(0)}" cy="${here[2].toFixed(0)}" r="7" class="me"/></svg>`;
}
function trackerSvg(s) {
    const bl = s.horror.blips || [];
    return `<svg class="ar-motion" viewBox="0 0 120 70"><path d="M60 66 L8 14 A70 70 0 0 1 112 14 Z" class="fan"/>${[20, 40, 60].map(r => `<path d="M${60 - r * 0.74} ${66 - r * 0.74} A${r} ${r} 0 0 1 ${60 + r * 0.74} ${66 - r * 0.74}" class="arc"/>`).join('')}
        ${bl.map(b => { const r = Math.min(60, b.d * 2); const a = -Math.PI / 2 + (b.a % 1.6) - 0.8; return `<circle cx="${(60 + Math.cos(a) * r).toFixed(1)}" cy="${(66 + Math.sin(a) * r).toFixed(1)}" r="2.6" class="blip"/>`; }).join('')}</svg>`;
}
export function bridgeHtml(e, h) {
    const s = Sh();
    tick();
    const yrs = (d) => (d >= 365 ? `≈ ${(d / 365).toFixed(1)} г` : `${Math.round(d)} дн`);
    const hr = s.horror;
    return `${h.head(hr.on ? '«Мнемозина» · тревога' : 'Мостик', h.btn('shHorror', hr.on ? 'выкл' : '☠', '', 'sm ghost'))}
    ${mapSvg(s)}
    <p class="ar-mute small">Сейчас: ${esc(s.at)} · экипаж: ${esc(s.crew.join(', '))}</p>
    <div class="ar-panel">${[['o2', 'Кислород'], ['food', 'Еда'], ['water', 'Вода']].map(([k, l]) => `<div class="ar-meter${s.left[k] < 180 ? ' red' : ''}"><span>${l}</span><b>${yrs(s.left[k])}</b><i style="width:${Math.min(100, s.left[k] / 19)}%"></i></div>`).join('')}
        <div class="ar-meter${s.left.fuel < 5 ? ' red' : ''}"><span>Топливо</span><b>${s.left.fuel} прыжков</b><i style="width:${Math.min(100, s.left.fuel * 2.5)}%"></i></div></div>
    ${h.sec('Системы')}
    <div class="ar-row wrap">${SYS.map(([k, l]) => `<button class="ar-chip${(s.sys[k] || 0) >= 1 ? ' bad' : ''}" data-aact="shFix" data-v="${k}">${esc(l)}: ${ST[s.sys[k] || 0]}</button>`).join('')}</div>
    ${h.sec('Прыжок')}
    <div class="ar-row wrap">${WORLDS.filter(w => w !== s.at).map(w => `<button class="ar-chip" data-aact="shJump" data-v="${esc(w)}">${esc(w)}</button>`).join('')}</div>
    ${hr.on ? `${h.sec('Датчик движения')}${trackerSvg(s)}<div class="ar-row wrap">${h.btn('shScan', '📡 Скан', '', 'sm')}${h.btn('shTrust', 'доверие −', 'data-v="-10"', 'sm ghost')}${h.btn('shTrust', 'доверие +', 'data-v="10"', 'sm ghost')}</div>
        <div class="ar-meter${hr.trust < 35 ? ' red' : ''}"><span>Доверие экипажей</span><b>${hr.trust}%</b><i style="width:${hr.trust}%"></i></div>
        ${h.sec('Отсеки')}<div class="ar-row wrap">${COMP.map(c => `<button class="ar-chip${hr.sealed.includes(c) ? ' bad' : ''}" data-aact="shSeal" data-v="${esc(c)}">${hr.sealed.includes(c) ? '🔒 ' : ''}${esc(c)}</button>`).join('')}</div>` : ''}
    ${h.sec('Бортжурнал')}
    <div class="ar-log">${s.log.slice(0, 8).map(l => `<div class="ar-lg"><span>${esc(l.day || '')}</span><p>${esc(l.t)}</p></div>`).join('') || h.empty('Записей нет.')}</div>`;
}
export async function act(name, el, { after }) {
    const s = Sh();
    const v = el.dataset.v;
    switch (name) {
        case 'shJump': { const r = jump(v); C.toast('info', esc(r.t)); after(); return true; }
        case 'shFix': { const r = repair(v); C.toast('info', esc(r.t)); after(); return true; }
        case 'shHorror': s.horror.on = !s.horror.on; if (s.horror.on) log('Аварийный режим: красный свет, датчики движения.'); after(); return true;
        case 'shScan': { const near = scan(); beep(near); C.toast(near < 10 ? 'warning' : 'info', near >= 99 ? 'Тихо. Слишком тихо.' : `Метка: ${near} м`); after(); return true; }
        case 'shTrust': s.horror.trust = C.clamp(s.horror.trust + Number(v || 0)); after(); return true;
        case 'shSeal': s.horror.sealed = s.horror.sealed.includes(v) ? s.horror.sealed.filter(x => x !== v) : [...s.horror.sealed, v]; log(`${s.horror.sealed.includes(v) ? 'Задраили' : 'Открыли'}: ${v}.`); after(); return true;
        default: return false;
    }
}
