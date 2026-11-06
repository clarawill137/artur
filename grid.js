// ✦ А.Р.Т.У.Р. — защитный контур квартиры: уровни от «спит» до «Каракурта», устройства по зонам,
// свой-чужой («кто дома»), заряды, кубик на исход, сопутствующий ущерб, доклад Арта в следующий ответ.

import * as C from './core.js';
import * as HD from './homedata.js';
import * as HM from './home.js';

const d20 = () => 1 + Math.floor(Math.random() * 20);

export function G() {
    const h = HM.H();
    if (!h.grid || typeof h.grid !== 'object') h.grid = {};
    const g = h.grid;
    const def = {
        level: 0, armed: {}, ammo: {}, confirm: false, intruder: '', cls: 'pro', zone: '',
        who: { hedy: true, bucky: true, cat: true, sharik: true, guests: false },
        dmg: 0, noise: 0, marco: 0, last: null, log: [],
    };
    for (const [k, v] of Object.entries(def)) if (g[k] === undefined || g[k] === null) g[k] = v;
    for (const d of HD.DEVICES) if (d.ammo != null && g.ammo[d.id] == null) g.ammo[d.id] = d.ammo;
    return g;
}

export const levelOf = (n) => HD.GRID_LEVELS[n] || HD.GRID_LEVELS[0];
export const devicesFor = (zone) => HD.DEVICES.filter(d => !zone || d.zones.includes('all') || d.zones.includes(zone));
const pregnant = () => { const p = C.pregLine(); return !!p && !p.baby; };
const stamp = () => { const k = C.clock(); return [k.date, k.time].filter(Boolean).join(' · '); };
function push(t, kind = 'grid') { const g = G(); g.log.unshift({ t: C.cut(t, 320), kind, at: stamp() }); g.log = g.log.slice(0, 30); }

/** Почему устройство сейчас нельзя применить (или ''). */
export function blocked(d) {
    const g = G();
    if (d.gas && g.who.hedy && pregnant()) return 'директор дома и беременна — газ заблокирован';
    if (d.ammo != null && (g.ammo[d.id] ?? 0) <= 0) return 'пусто, нужна перезарядка';
    return '';
}
/** О чём Арт предупредит (но не запретит). */
export function warnOf(d) {
    const g = G();
    const w = [];
    if (d.gas && g.who.cat) w.push('Альпин тоже уснёт');
    if (d.gas && g.who.guests) w.push('гости уснут');
    if (d.emp && g.who.sharik) w.push('Шарик не экранирован');
    if (d.marco) w.push('под нами лавка Марко');
    if (d.tier >= 4 && g.who.guests) w.push('в доме гости');
    return w.join(' · ');
}

export function setLevel(n) {
    const g = G();
    n = Math.max(0, Math.min(5, Number(n) || 0));
    if (n === 5 && !g.confirm) { g.confirm = true; C.save(); return 'confirm'; }
    g.confirm = false;
    g.level = n;
    g.armed = {};
    for (const d of HD.DEVICES) if (d.tier >= 1 && d.tier <= n) g.armed[d.id] = true;
    const L = levelOf(n);
    push(`Уровень контура: «${L[1]}» — ${L[2]}`, 'level');
    HM.log(`Защитный контур: «${L[1]}»`, n >= 4 ? 'bad' : 'mode');
    if (n === 5) { const h = HM.H(); h.mode = 'siege'; h.light = 'red'; C.feed('Протокол «Каракурт» взведён. Квартира кусается. Марко я предупредил — в смысле, нет.', 'warn'); }
    if (n >= 1) HM.note('grid-level', `Арт взводит защитный контур на уровень «${L[1]}» — ${L[2]}`);
    C.save();
    return 'ok';
}
export function toggleDev(id) {
    const g = G();
    const d = HD.DEVICES.find(x => x.id === id);
    if (!d || d.tier > g.level) return false;
    g.armed[id] = !g.armed[id];
    C.save();
    return true;
}
export function setWho(k) { const g = G(); g.who[k] = !g.who[k]; C.save(); }

export function stand() {
    const g = G();
    g.level = 0; g.armed = {}; g.confirm = false;
    const h = HM.H();
    if (h.mode === 'siege') h.mode = 'home';
    if (h.light === 'red') h.light = 'warm';
    push('Контур снят. Все системы в ожидании.', 'level');
    HM.log('Защитный контур снят', 'mode');
    C.save();
}
export function reload() {
    const g = G();
    for (const d of HD.DEVICES) if (d.ammo != null) g.ammo[d.id] = d.ammo;
    push('Перезаряжено: картриджи пены, сети, газ, конденсаторы ЭМИ и ЛАЗЕРГАНА. Курьер А.И.М. и лапы справились за полчаса.', 'reload');
    C.save();
}

/** Применить контур по зоне. Возвращает результат или { none }. */
export function fire(zone) {
    const g = G();
    const lvl = g.level;
    zone = zone || g.zone || Object.entries(HM.H().zones).find(([, v]) => v === 'breach')?.[0] || 'door';
    let list = (lvl === 5 ? HD.DEVICES : devicesFor(zone)).filter(d => d.tier >= 1 && d.tier <= Math.max(lvl, 1) && g.armed[d.id] && !blocked(d));
    if (lvl === 0) list = [];
    if (!list.length) return { none: true, zone };
    for (const d of list) if (d.ammo != null) g.ammo[d.id] = Math.max(0, (g.ammo[d.id] ?? d.ammo) - 1);
    const power = list.reduce((a, d) => a + d.tier, 0);
    const bonus = Math.min(10, Math.round(power / 2)) + (lvl >= 4 ? 2 : 0) + (lvl === 5 ? 3 : 0);
    const cls = HD.INTRUDERS.find(x => x[0] === g.cls) || HD.INTRUDERS[1];
    const r = d20();
    const sum = r + bonus + cls[2];
    let out = HD.GRID_OUT.find(o => sum >= o[0]);
    if (r === 20) out = HD.GRID_OUT[0];
    if (r === 1 && out[1] === 'down') out = HD.GRID_OUT[2];
    // накладки по своим
    let mishap = '';
    if (r === 1 || (r <= 3 && lvl >= 2)) {
        const used = new Set(list.map(d => d.id));
        if (g.who.cat && (used.has('foam') || used.has('gas'))) mishap = HD.GRID_MISHAP.cat;
        else if (g.who.sharik && used.has('nets')) mishap = HD.GRID_MISHAP.sharik;
        else if (g.who.bucky && used.has('foam')) mishap = HD.GRID_MISHAP.bucky;
        else mishap = HD.GRID_MISHAP.none;
    }
    // ЭМИ и Шарик
    let sharikOff = false;
    if (list.some(d => d.emp) && g.who.sharik) { const s = C.M().sharik; s.charge = 0; sharikOff = true; }
    // ущерб и шум
    const dmg = list.reduce((a, d) => a + (d.dmg || 0), 0);
    const noise = list.reduce((a, d) => a + (d.noise || 0), 0);
    g.dmg += dmg; g.noise += noise;
    const marco = list.some(d => d.marco);
    if (marco) g.marco++;
    const police = noise >= 10 && Math.random() < 0.5;
    // зона
    const h = HM.H();
    if (lvl === 5) { for (const z of HD.ZONES) if (h.zones[z[0]] === 'breach') h.zones[z[0]] = out[1] === 'through' ? 'breach' : 'alert'; }
    else h.zones[zone] = out[1] === 'through' ? 'breach' : 'alert';
    const line = C.rnd(HD.GRID_LINES[lvl] || HD.GRID_LINES[1]);
    const L = levelOf(lvl);
    const zn = lvl === 5 ? 'вся квартира' : HM.zoneName(zone);
    const scenes = list.map(d => (lvl >= 4 && d.scene4) ? d.scene4 : d.scene);
    const res = { id: C.uid(), at: stamp(), zone, zn, level: lvl, lname: L[1], devices: list.map(d => d.name), roll: r, bonus, mod: cls[2], sum, out: out[1], oname: out[2], otext: out[3], mishap, sharikOff, dmg, noise, police, marco, line, intruder: g.intruder, cls: cls[1] };
    g.last = res;
    push(`${zn}: «${L[1]}» — ${list.map(d => d.name).join(', ')}. d20 ${r} + ${bonus} ${cls[2] >= 0 ? '+' : '−'} ${Math.abs(cls[2])} = ${sum} → ${out[2]}.${mishap ? ` ${mishap}` : ''}`, out[1]);
    HM.log(`Контур сработал (${zn}): ${out[2].toLowerCase()}`, out[1] === 'through' ? 'bad' : 'warn');
    C.feed(`${line} ${out[2]}.`, 'warn');
    const extra = [
        mishap && `накладка: ${mishap}`,
        sharikOff && 'ЭМИ заодно вырубил Шарика — он стоит посреди коридора с погасшими «глазами»',
        marco && 'ЛАЗЕРГАН задел перекрытие — в лавке Марко внизу посыпалась штукатурка',
        police && 'соседи уже звонят в полицию Нью-Йорка',
    ].filter(Boolean);
    C.arm('grid', `[Защитный контур квартиры над лавкой Марко, в этом ответе. Нарушитель: ${g.intruder || 'неизвестный'} (${cls[1].toLowerCase()}), зона: ${zn}. Уровень «${L[1]}». Срабатывает: ${scenes.join('; ')}. Арт через динамики: «${line}» Исход уже решён — ${out[3]}.${extra.length ? ` Ещё: ${extra.join('; ')}.` : ''} Покажи это кинематографично — звук, свет, металл, реакция людей; квартира защищена как Форт-Нокс. Что герои делают дальше — не решай за них.]`, { key: 'fire' });
    C.save();
    return res;
}

export function action(id) {
    const a = HD.GRID_ACTIONS.find(x => x[0] === id);
    if (!a) return '';
    push(`${a[1]}: ${a[2]}`, 'action');
    HM.log(`Контур: ${a[1]}`, 'mode');
    if (id === 'net') HM.H().zones.net = 'ok';
    C.arm('grid-act', `[Защитный контур, в этом ответе: ${a[2]}.]`, { key: id });
    C.save();
    return a[2];
}
