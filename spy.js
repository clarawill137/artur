// ✦ А.Р.Т.У.Р. — шпионское: Крот (двойная жизнь в Гидре, эпоха Щ.И.Т.а), Шифровки (по эпохе: машина 40-х,
// одноразовый блокнот, шифр-диск, стеганография; канал, перехват, раскрыли ли), Агентура (информаторы: доверие,
// цена, что знают, риск засветки; запрос — ответ его голосом, кубик решает, правда ли). Модель знает, кто что
// прочитал, что сказал информатор (и врёт ли он) и насколько трещит легенда.

import * as C from './core.js';

const esc = (v) => C.esc(v);   // лениво: core.js импортирует нас раньше, чем успевает определиться
const d20 = () => 1 + Math.floor(Math.random() * 20);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function S() {
    const m = C.M();
    if (!m.spy || typeof m.spy !== 'object') m.spy = {};
    const s = m.spy;
    if (!s.mole || typeof s.mole !== 'object') s.mole = { rumlow: 20, log: [], caches: [], signs: null };
    if (!Array.isArray(s.mole.log)) s.mole.log = [];
    if (!Array.isArray(s.mole.caches)) s.mole.caches = [];
    if (!Array.isArray(s.mole.signs)) s.mole.signs = [['красная нитка на перилах', 'встреча через час'], ['две ложки сахара в кофе', 'меня проверяют — не подходи'], ['звонок без слов', 'тайник пуст'], ['цветок на подоконнике', 'опасность, всё отменяется']].map(([k, v]) => ({ id: C.uid(), k, v }));
    if (!Array.isArray(s.ciphers)) s.ciphers = [];
    if (!Array.isArray(s.agents)) s.agents = [];
    return s;
}
const day = () => { try { return C.A?.worldState?.()?.timestamp?.story_date || ''; } catch { return ''; } };
const me = () => { try { return C.A?.canonName?.(SillyTavern.getContext().name1) || SillyTavern.getContext().name1 || 'Хеди'; } catch { return 'Хеди'; } };

// ───────────── Крот ─────────────

/** Ходы двойной жизни: кубик против подозрения. */
export const MOLE_ACTS = [
    ['leak', 'Передать данные Щ.И.Т.у', 'данные ушли в Щ.И.Т.'],
    ['test', 'Проверка лояльности', 'Пирс проверяет её'],
    ['drop', 'Заложить тайник', 'тайник заложен'],
    ['pick', 'Забрать из тайника', 'тайник забран'],
    ['cover', 'Укрепить легенду', 'легенда'],
];
export function moleAct(id, place = '') {
    const s = S();
    const h = C.M().hydra;
    const mo = s.mole;
    const r = d20();
    const mod = Math.round((Number(h.legend) - 50) / 10) + Math.round((Number(h.pierce) - 50) / 15) - Math.round(Number(mo.rumlow) / 20);
    const tot = r + mod;
    let t = '';
    const ok = tot >= 11, great = r === 20 || tot >= 18, bad = r === 1 || tot <= 5;
    if (id === 'leak') {
        if (great) t = 'Данные ушли чисто — никто ничего не заметил.';
        else if (ok) { t = 'Данные ушли. Рамлоу на секунду задержал взгляд на её экране.'; mo.rumlow = C.clamp(mo.rumlow + 5); }
        else { t = bad ? 'Сорвалось: в логах остался след. Рамлоу что-то знает.' : 'Не вышло передать — пришлось закрыть окно.'; mo.rumlow = C.clamp(mo.rumlow + (bad ? 25 : 12)); h.legend = C.clamp(h.legend - (bad ? 10 : 4)); }
    } else if (id === 'test') {
        if (ok) { t = great ? 'Прошла проверку блестяще — Пирс доволен, как отец.' : 'Прошла проверку. Пирс кивает — пока.'; h.pierce = C.clamp(h.pierce + (great ? 12 : 6)); mo.rumlow = C.clamp(mo.rumlow - 3); }
        else { t = bad ? 'Провалила проверку: Пирс улыбается слишком долго.' : 'Проверка прошла натянуто — Пирс запомнил.'; h.legend = C.clamp(h.legend - (bad ? 15 : 6)); mo.rumlow = C.clamp(mo.rumlow + (bad ? 15 : 5)); }
    } else if (id === 'drop' || id === 'pick') {
        const seen = !ok;
        if (id === 'drop') mo.caches.unshift({ id: C.uid(), place: C.cut(place || 'тайник', 60), st: seen ? 'засвечен' : 'заложен', day: day() });
        else { const c = mo.caches.find(x => x.st === 'заложен'); if (c) c.st = seen ? 'вскрыт' : 'забран'; }
        t = seen ? `${id === 'drop' ? 'Заложила' : 'Забрала'}, но рядом крутился человек Рамлоу.` : `${id === 'drop' ? 'Тайник заложен' : 'Тайник забран'} — чисто.`;
        if (seen) mo.rumlow = C.clamp(mo.rumlow + 10);
    } else if (id === 'cover') {
        if (ok) { h.legend = C.clamp(h.legend + (great ? 12 : 6)); t = 'Легенда крепче: пара правильных слов при нужных людях.'; }
        else { t = 'Перестаралась — слишком правильная дочь Пирса выглядит подозрительно.'; mo.rumlow = C.clamp(mo.rumlow + 5); }
    }
    mo.log.unshift({ id: C.uid(), t, r, mod, day: day() });
    mo.log = mo.log.slice(0, 20);
    C.save();
    return { t, r, mod };
}

// ───────────── шифровки ─────────────

const RU = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
const shiftCh = (ch, k) => { const up = ch.toUpperCase(); const i = RU.indexOf(up); if (i < 0) return ch; return RU[(i + k + RU.length * 10) % RU.length]; };
export const METHODS = {
    machine: { name: 'Шифромашина', era: ['ssr'], strength: 12, enc: (t, key) => [...t].map((ch, i) => shiftCh(ch, (key.charCodeAt(i % key.length) || 7) % 33 + i % 5)).join('') },
    disk: { name: 'Шифр-диск', era: ['ssr', 'mad', 'shield', 'run', 'aim'], strength: 6, enc: (t, key) => [...t].map(ch => shiftCh(ch, (key.length * 3) % 33 || 3)).join('') },
    pad: { name: 'Одноразовый блокнот', era: ['shield', 'run', 'mad', 'aim'], strength: 30, enc: (t) => { const d = [...t.replace(/\s+/g, '')].map(() => Math.floor(Math.random() * 10)).join(''); return (d.match(/.{1,5}/g) || []).join(' '); } },
    steg: { name: 'В фотографии', era: ['aim', 'run'], strength: 16, enc: () => '▦▦▦ (текст спрятан в пикселях фото)' },
};
export const CHANNELS = {
    drop: ['Мёртвый ящик', 4], card: ['Открытка', 7], paper: ['Объявление в газете', 6], radio: ['Числовая станция', 5], hand: ['Из рук в руки', 9],
};
const methodsFor = (e) => Object.entries(METHODS).filter(([, x]) => x.era.includes(e.id));
export function cipherSend({ to, text, method, channel, key = 'ясень' }) {
    const e = C.era();
    const M = METHODS[method] || methodsFor(e)[0]?.[1] || METHODS.disk;
    const ch = CHANNELS[channel] || CHANNELS.drop;
    const body = String(text || '').trim();
    if (!to || !body) return null;
    const ct = M.enc(body.toUpperCase(), key || 'ясень');
    // перехват: кубик против надёжности канала; прочитали: кубик против стойкости шифра
    const ri = d20(), caught = ri <= ch[1];
    const rc = d20(), cracked = caught && method !== 'pad' && rc + 8 >= M.strength + 10;
    const x = { id: C.uid(), to: C.cut(to, 50), text: C.cut(body, 600), ct: C.cut(ct, 600), method: Object.keys(METHODS).find(k => METHODS[k] === M), channel: Object.keys(CHANNELS).find(k => CHANNELS[k] === ch), day: day(), caught, cracked, ri, rc, fresh: true };
    S().ciphers.unshift(x);
    S().ciphers = S().ciphers.slice(0, 30);
    C.save();
    return x;
}

// ───────────── агентура ─────────────

const AG_SYS = `Ты — информатор в ролевой истории God Complex (AU по Marvel). Отвечаешь на запрос Хеди своим голосом и манерой, 2–4 фразы, коротко, как говорят на улице.
Правда это или нет, решено заранее (поле «надёжность»): «правда» — честно и полезно; «полуправда» — часть верна, часть домысел; «ложь» — правдоподобная, но ложная наводка (ты врёшь или тебя самого обманули). Не придумывай новых крупных персонажей и не раскрывай тайн, которых в истории ещё не было.
Только JSON: {"answer":"его слова","cost":"сколько взял — коротко"}`;
export async function agentAsk(id, q) {
    const s = S();
    const a = s.agents.find(x => x.id === id);
    if (!a || !String(q || '').trim()) return null;
    const r = d20();
    const tot = r + Math.round((Number(a.trust) - 50) / 10) - Math.round(Number(a.risk) / 25);
    const rel = tot >= 13 ? 'правда' : tot >= 7 ? 'полуправда' : 'ложь';
    let answer = '', cost = '';
    try {
        const msgs = [{ role: 'system', content: AG_SYS }, { role: 'user', content: `Информатор: ${a.name}${a.cover ? ` (${a.cover})` : ''}; знает про: ${a.area || 'улицу'}. Запрос: ${q}. Надёжность: ${rel}.` }];
        const j = C.A?.askFillJson ? await C.A.askFillJson(msgs, 900, { what: 'агентура' }, { who: [a.name] }) : C.A?.extractJson?.(await C.A.askModel(msgs, 600));
        answer = C.cut(String(j?.answer || ''), 500); cost = C.cut(String(j?.cost || ''), 80);
    } catch (e) { console.warn('[АРТУР] агентура', e); }
    if (!answer) answer = rel === 'ложь' ? 'Ничего не слышал. Честно.' : 'Говорят, там что-то затевается. Больше — за отдельную плату.';
    a.risk = C.clamp(Number(a.risk) + 8 + Math.floor(Math.random() * 6));
    a.log = [{ id: C.uid(), q: C.cut(q, 200), answer, rel, cost, r, day: day(), fresh: true }, ...(a.log || [])].slice(0, 12);
    if (a.risk >= 85 && a.st !== 'burned') { a.st = 'burned'; a.burnedDay = day(); }
    C.save();
    return a.log[0];
}
const FIND_SYS = `Ты разбираешь ролевую историю God Complex (AU по Marvel). Найди информаторов и связных Хеди и Баки — людей, которые сливают им сведения (за деньги, из долга, по дружбе). Только тех, кто есть в истории.
Только JSON: {"agents":[{"name":"","cover":"кто он для мира","area":"что знает: порт, полиция, Гидра, рынок…","trust":60,"price":"чем берёт"}]}`;
export async function agentsFind() {
    const s = S();
    const msgs = [{ role: 'system', content: FIND_SYS }, { role: 'user', content: `Уже есть: ${s.agents.map(a => a.name).join(', ') || 'никого'}.` }];
    const j = C.A?.askFillJson ? await C.A.askFillJson(msgs, 1600, { what: 'агентура из истории' }, {}) : null;
    let n = 0;
    for (const g of (Array.isArray(j?.agents) ? j.agents : []).slice(0, 8)) { if (agentAdd(g)) n++; }
    return n;
}
export function agentAdd(g = {}) {
    const name = C.cut(String(g.name || '').trim(), 50);
    if (!name || S().agents.some(a => a.name.toLowerCase() === name.toLowerCase())) return null;
    const a = { id: C.uid(), name, cover: C.cut(String(g.cover || ''), 80), area: C.cut(String(g.area || ''), 120), trust: C.clamp(g.trust ?? 55), price: C.cut(String(g.price || ''), 60), risk: 10, st: 'ok', log: [] };
    S().agents.push(a);
    C.save();
    return a;
}

// ───────────── модели ─────────────

export function notes(e) {
    const s = C.M().spy;
    if (!s) return [];
    const out = [];
    if (e.hydra && s.mole) {
        const h = C.M().hydra;
        const last = s.mole.log[0];
        if (Number(s.mole.rumlow) >= 40 || last?.fresh !== false) out.push(`[Крот (Гидра): легенда «дочь Пирса» ${h.legend}%, доверие Пирса ${h.pierce}%, Рамлоу подозревает ${s.mole.rumlow >= 70 ? 'всерьёз' : s.mole.rumlow >= 40 ? 'что-то' : 'едва'}.${last ? ` Последнее: ${last.t}` : ''} Играй это взглядами и паузами; цифры не называй.]`);
        if (last) last.fresh = false;
    }
    for (const x of (s.ciphers || []).filter(c => c.fresh).slice(0, 2)) {
        out.push(`[Шифровка: ${me()} → ${x.to} (${METHODS[x.method]?.name.toLowerCase()}, ${CHANNELS[x.channel]?.[0].toLowerCase()}): «${C.cut(x.text, 160)}». ${x.caught ? (x.cracked ? 'Её ПЕРЕХВАТИЛИ И ПРОЧИТАЛИ — враг знает содержание.' : 'Её перехватили, но не прочитали.') : 'Дошла чисто.'} Кто что прочитал — держи в голове.]`);
        x.fresh = false;
    }
    for (const a of (s.agents || [])) {
        const l = a.log?.[0];
        if (l?.fresh) { out.push(`[Агентура: ${a.name} сказал на запрос «${C.cut(l.q, 90)}»: ${C.cut(l.answer, 220)}. На деле это ${l.rel === 'правда' ? 'правда' : l.rel === 'полуправда' ? 'полуправда' : 'ЛОЖЬ'} — персонажи этого не знают; последствия — по правде.]`); l.fresh = false; }
        if (a.st === 'burned' && !a.burnNoted) { out.push(`[Агентура: ${a.name} засветился — за ним теперь следят; он может исчезнуть или сдать.]`); a.burnNoted = true; }
    }
    if (out.length) C.save();
    return out;
}

// ───────────── экраны ─────────────

export function moleHtml(h) {
    const s = S();
    const mo = s.mole;
    const flip = !!s.flip;
    return `${h.sec('Крот', `Рамлоу ${C.clamp(mo.rumlow)}%`)}
    <div class="ar-panel">
        <div class="ar-meter"><span>Подозрение Рамлоу</span><b>${C.clamp(mo.rumlow)}%</b><i style="width:${C.clamp(mo.rumlow)}%"></i></div>
        <div class="ar-row wrap">${MOLE_ACTS.map(([id, l]) => h.btn('spMole', esc(l), `data-v="${id}"`, 'sm')).join('')}</div>
        <div class="ar-row wrap">${h.btn('spFlip', flip ? '⇄ Обратно в Щ.И.Т.' : '⇄ Перевернуть: Гидра', '', 'sm ghost')}</div>
    </div>
    ${mo.log.length ? `<div class="ar-log">${mo.log.slice(0, 6).map(l => `<div class="ar-lg"><span>${esc(l.day || '')} · d20 ${l.r}${l.mod >= 0 ? '+' : ''}${l.mod}</span><p>${esc(l.t)}</p></div>`).join('')}</div>` : ''}
    ${h.sec('Тайники', h.btn('spCache', h.ic('plus'), '', 'ico sm'))}
    ${mo.caches.length ? `<div class="ar-log">${mo.caches.slice(0, 6).map(c => `<div class="ar-lg"><span>${esc(c.day || '')} · ${esc(c.st)}</span><p>${esc(c.place)}</p></div>`).join('')}</div>` : h.empty('Тайников нет.')}
    ${h.sec('Условные знаки', h.btn('spSign', h.ic('plus'), '', 'ico sm'))}
    <div class="ar-log">${mo.signs.map(g => `<div class="ar-lg"><span>${esc(g.k)}</span><p>${esc(g.v)}</p><button class="ar-ico" data-aact="spSignDel" data-id="${esc(g.id)}">${h.ic('x')}</button></div>`).join('')}</div>`;
}
const ui = { method: '', channel: 'drop', to: '', text: '', key: 'ясень', open: '' };
export function cipherHtml(e, h) {
    const s = S();
    const ms = methodsFor(e);
    if (!ui.method || !ms.some(([k]) => k === ui.method)) ui.method = ms[0]?.[0] || 'disk';
    return `${h.head('Шифровки')}
    <div class="ar-panel">
        <label class="ar-form one">Кому<input data-spf="to" value="${esc(ui.to)}" placeholder="Наташа"></label>
        <label class="ar-form one">Текст<textarea data-spf="text" rows="3" placeholder="Встреча отменяется. Пирс знает про склад.">${esc(ui.text)}</textarea></label>
        <div class="ar-row wrap">${ms.map(([k, x]) => `<button class="ar-chip${ui.method === k ? ' on' : ''}" data-aact="spMethod" data-v="${k}">${esc(x.name)}</button>`).join('')}</div>
        <div class="ar-row wrap">${Object.entries(CHANNELS).map(([k, c]) => `<button class="ar-chip${ui.channel === k ? ' on' : ''}" data-aact="spChannel" data-v="${k}">${esc(c[0])}</button>`).join('')}</div>
        ${ui.method !== 'pad' && ui.method !== 'steg' ? `<label class="ar-form one">Ключ<input data-spf="key" value="${esc(ui.key)}"></label>` : ''}
        ${h.btn('spSend', `${h.ic('lock')} Зашифровать и отправить`, '', 'wide')}
    </div>
    ${s.ciphers.length ? s.ciphers.slice(0, 10).map(x => `<div class="ar-cipher${x.caught ? (x.cracked ? ' bad' : ' warn') : ''}" data-aact="spOpen" data-id="${esc(x.id)}">
        <div class="ar-cipher-h"><b>→ ${esc(x.to)}</b><span>${esc(METHODS[x.method]?.name || '')} · ${esc(CHANNELS[x.channel]?.[0] || '')} · ${esc(x.day || '')}</span></div>
        <code>${esc(x.ct)}</code>
        <small>${x.caught ? (x.cracked ? '🔓 перехвачена и прочитана' : '✋ перехвачена, не прочитана') : '✓ дошла чисто'}</small>
        ${ui.open === x.id ? `<p class="ar-cipher-t">${esc(x.text)}</p>` : ''}
    </div>`).join('') : h.empty('Шифровок пока нет.')}
    <p class="ar-mute small">Перехват — кубик против канала; прочитали ли — против стойкости шифра. Одноразовый блокнот не вскрыть, если ключ цел.</p>`;
}
export function agentsHtml(e, h) {
    const s = S();
    const open = s.agents.find(a => a.id === ui.open);
    if (open) {
        return `${h.head(open.name)}
        <div class="ar-panel">
            <p class="ar-mute small">${esc([open.cover, open.area && `знает: ${open.area}`, open.price && `берёт: ${open.price}`].filter(Boolean).join(' · '))}</p>
            <div class="ar-meter"><span>Доверие</span><b>${open.trust}%</b><i style="width:${open.trust}%"></i></div>
            <div class="ar-meter red"><span>Риск засветки</span><b>${open.risk}%</b><i style="width:${open.risk}%"></i></div>
            ${open.st === 'burned' ? '<p class="ar-warn">Засветился — за ним следят.</p>' : ''}
            <label class="ar-form one">Запрос<textarea data-spf="q" rows="2" placeholder="Кто покупал оружие в порту на этой неделе?"></textarea></label>
            ${h.btn('spAsk', `${h.ic('send')} Спросить`, `data-id="${esc(open.id)}"`, 'wide')}
        </div>
        ${(open.log || []).map(l => `<div class="ar-cipher"><div class="ar-cipher-h"><b>${esc(C.cut(l.q, 80))}</b><span>${esc(l.day || '')}${l.cost ? ` · ${esc(l.cost)}` : ''}</span></div><p class="ar-cipher-t">${esc(l.answer)}</p><small class="ar-rel" data-aact="spRel" data-id="${esc(l.id)}">${ui.rel === l.id ? `🎲 ${esc(l.rel)} (d20 ${l.r})` : 'тап — правда ли это'}</small></div>`).join('')}
        ${h.btn('spBack', 'Ко всем', '', 'ghost')}`;
    }
    return `${h.head('Агентура', h.btn('spAgent', h.ic('plus'), '', 'ico sm'))}
    ${s.agents.length ? s.agents.map(a => `<button class="ar-agent${a.st === 'burned' ? ' burned' : ''}" data-aact="spPick" data-id="${esc(a.id)}"><b>${esc(a.name)}</b><span>${esc([a.cover, a.area].filter(Boolean).join(' · '))}</span><small>доверие ${a.trust}% · риск ${a.risk}%${a.st === 'burned' ? ' · засветился' : ''}</small></button>`).join('') : h.empty('Сеть пуста.')}
    ${h.btn('spFind', `${h.ic('sparkles')} Найти связных в истории`, '', 'wide')}
    <p class="ar-mute small">Каждый запрос — риск засветки. Кубик решает, правду ли он сказал; модель знает, а персонажи — нет.</p>`;
}

/** Кнопки шпионского. true — обработано. */
export async function act(name, el, { after, form, withBusy }) {
    const v = el.dataset.v, id = el.dataset.id;
    const box = el.closest('#ar-app') || document;
    const val = (k) => box.querySelector(`[data-spf="${k}"]`)?.value || '';
    const s = S();
    switch (name) {
        case 'spMole': { const r = moleAct(v, v === 'drop' ? val('cache') : ''); C.toast('info', esc(r.t)); after(); return true; }
        case 'spFlip': s.flip = !s.flip; after(); return true;
        case 'spCache': form('Тайник', [{ k: 'place', label: 'Где', type: 'text' }], (vals) => { if (!vals.place?.trim()) return; const r = moleAct('drop', vals.place); C.toast('info', esc(r.t)); after(); }); return true;
        case 'spSign': form('Условный знак', [{ k: 'k', label: 'Знак', type: 'text' }, { k: 'v', label: 'Значит', type: 'text' }], (vals) => { if (!vals.k?.trim()) return; s.mole.signs.push({ id: C.uid(), k: C.cut(vals.k, 60), v: C.cut(vals.v || '', 80) }); after(); }); return true;
        case 'spSignDel': s.mole.signs = s.mole.signs.filter(g => g.id !== id); after(); return true;
        case 'spMethod': ui.method = v; ui.to = val('to'); ui.text = val('text'); after(); return true;
        case 'spChannel': ui.channel = v; ui.to = val('to'); ui.text = val('text'); after(); return true;
        case 'spSend': { const x = cipherSend({ to: val('to'), text: val('text'), method: ui.method, channel: ui.channel, key: val('key') || ui.key }); if (!x) { C.toast('info', 'Кому и что — обязательно'); return true; } ui.to = ''; ui.text = ''; C.toast(x.caught ? 'warning' : 'success', x.caught ? (x.cracked ? 'Перехватили и прочитали' : 'Перехватили, но не прочитали') : 'Дошла чисто'); after(); return true; }
        case 'spOpen': ui.open = ui.open === id ? '' : id; after(); return true;
        case 'spPick': ui.open = id; after(); return true;
        case 'spBack': ui.open = ''; after(); return true;
        case 'spRel': ui.rel = ui.rel === id ? '' : id; after(); return true;
        case 'spAgent': form('Информатор', [{ k: 'name', label: 'Кто', type: 'text' }, { k: 'cover', label: 'Кто он для мира', type: 'text' }, { k: 'area', label: 'Что знает', type: 'text' }, { k: 'price', label: 'Чем берёт', type: 'text' }], (vals) => { if (agentAdd(vals)) after(); }); return true;
        case 'spAsk': { const q = val('q'); if (!q.trim()) { C.toast('info', 'О чём спросить?'); return true; } await withBusy(el, () => agentAsk(id, q)); after(); return true; }
        case 'spFind': { const n = await withBusy(el, () => agentsFind()); C.toast(n ? 'success' : 'info', n ? `Связных найдено: ${n}` : 'Новых не нашлось'); after(); return true; }
        default: return false;
    }
}
export const _ui = ui;
