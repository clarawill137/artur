// ✦ А.Р.Т.У.Р. — интерфейс: голографический комп Хеди (и бумажная картотека СНР в сороковых).
// Свой <dialog> поверх всего (и поверх хаба Life). Все кнопки — data-aact, поля — data-aset.

import * as C from './core.js';
import * as D from './data.js';
import * as DS from './dossier.js';
import * as H from './history.js';
import * as HM from './home.js';
import * as HD from './homedata.js';
import * as P from './pet.js';
import * as GR from './grid.js';

const esc = C.esc;
const ui = { app: null, id: null, modal: null, dice: null, typed: new Set(), scroll: {}, busy: new Set(), filter: '' };

// ───────────── значки ─────────────

const OWN = {
    dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.2"/><circle cx="16" cy="16" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="16" cy="8" r="1.2"/><circle cx="8" cy="16" r="1.2"/>',
    radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 19 5"/><circle cx="12" cy="12" r="1"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    eye2: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    drawer: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 12h18"/><path d="M10 8h4M10 16h4"/>',
    minus: '<path d="M5 12h14"/>',
    thermo: '<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0Z"/>',
    stamp: '<path d="M5 22h14"/><path d="M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z"/><path d="M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-6 0c0 2 1 2 1 3.5V13"/>',
};
export function ic(name, cls = '') {
    if (OWN[name]) return `<svg class="ar-i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${OWN[name]}</svg>`;
    try { const s = C.A?.icon?.(name, cls); if (s) return s.replace('class="lf-i', 'class="ar-i lf-i'); } catch { /* */ }
    return '';
}
const EYE = `<svg class="ar-eye" viewBox="0 0 64 64" aria-hidden="true"><circle class="e1" cx="32" cy="32" r="29"/><circle class="e2" cx="32" cy="32" r="22"/><circle class="e3" cx="32" cy="32" r="15"/><circle class="e4" cx="32" cy="32" r="6.5"/><path class="e5" d="M32 3v6M32 55v6M3 32h6M55 32h6"/></svg>`;
const SEAL = `<svg class="ar-seal" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29"/><circle cx="32" cy="32" r="23"/><text x="32" y="37" text-anchor="middle">S.S.R.</text></svg>`;
// ───────────── мелкие куски ─────────────

const sec = (t, right = '') => `<div class="ar-sec"><span>${esc(t)}</span>${right ? `<em>${right}</em>` : ''}</div>`;
const btn = (act, label, extra = '', cls = '') => `<button class="ar-btn ${cls}" data-aact="${act}" ${extra}>${label}</button>`;
const bar = (v, cls = '') => `<div class="ar-bar ${cls}"><i style="width:${C.clamp(v)}%"></i></div>`;
const chip = (t, cls = '') => `<span class="ar-chip ${cls}">${esc(t)}</span>`;
const empty = (t, more = '') => `<div class="ar-empty">${esc(t)}${more}</div>`;
const busy = (k) => ui.busy.has(k);
const plural = (n, a, b, c) => { const x = Math.abs(n) % 100, y = x % 10; return x > 10 && x < 20 ? c : y > 1 && y < 5 ? b : y === 1 ? a : c; };
// без act — спаны: карточка сама кнопка, кнопка в кнопке ломает разметку
const stageDots = (p, act = '') => `<div class="ar-steps">${D.STAGES.map((s, i) => {
    const cls = i < p.stage ? 'done' : i === p.stage ? 'cur' : '';
    return act ? `<button class="${cls}" data-aact="${act}" data-id="${esc(p.id)}" data-v="${i}"><b></b><span>${esc(s)}</span></button>` : `<span class="${cls}"><b></b><span>${esc(s)}</span></span>`;
}).join('')}</div>`;
const seg = (act, cur, list, extra = '') => `<div class="ar-seg">${list.map(([v, l]) => `<button class="${String(v) === String(cur) ? 'on' : ''}" data-aact="${act}" data-v="${esc(v)}" ${extra}>${esc(l)}</button>`).join('')}</div>`;
const pips = (n, act, id) => `<span class="ar-pips">${[1, 2, 3, 4, 5].map(i => `<button class="${i <= n ? 'on' : ''}" data-aact="${act}" data-id="${esc(id)}" data-v="${i}" aria-label="${i}"></button>`).join('')}</span>`;
const imgBox = (src, act, id, label) => src
    ? `<button class="ar-img" data-aact="zoom" data-src="${esc(src)}"><img src="${esc(src)}" alt="" loading="lazy"></button>`
    : `<button class="ar-img ph" data-aact="${act}" data-id="${esc(id)}">${busy(`${act}:${id}`) ? '<span class="ar-spin"></span>' : ic('camera')}<span>${esc(label)}</span></button>`;
const avatarOf = (name, person) => {
    let src = person?.img || '';
    if (!src) { try { src = C.A?.avatarUrl?.(name, true) || ''; } catch { /* */ } }
    const l = esc(String(name || '?').trim().charAt(0).toUpperCase());
    return `<span class="ar-ava">${src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<i>${l}</i></span>`;
};

const HIST_LABEL = { ops: 'операции', lab: 'проекты', med: 'медблок', bases: 'объекты', files: 'документы' };
const histRow = (kind) => `<div class="ar-row">${btn('hist', busy(`hist:${kind}`) ? '<span class="ar-spin"></span> Арт читает историю…' : `${ic('sparkles')} ${C.era().artur ? 'Арт' : 'Архив'}: ${HIST_LABEL[kind]} из истории`, `data-v="${kind}"`, 'ghost wide hist')}</div>`;

// ───────────── окно ─────────────

function host() {
    let dlg = document.getElementById('ar-dialog');
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.id = 'ar-dialog';
    dlg.innerHTML = `<div id="ar-app" class="ar"><div class="ar-fx"></div><header class="ar-top"></header><main class="ar-body"></main><div class="ar-modal"></div></div>`;
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); if (ui.modal) closeModal(); else if (ui.app) go(null); else close(); });
    document.body.append(dlg);
    return dlg;
}

export function isOpen() { return !!document.getElementById('ar-dialog')?.open; }

export function open(app = null, id = null) {
    if (!C.hasChat()) { C.toast('info', 'Сначала открой чат'); return; }
    C.loadZ().then(() => { if (isOpen()) render(); });
    const dlg = host();
    ui.app = app; ui.id = id; ui.modal = null;
    try { C.sharikTick(); C.save(); } catch { /* */ }
    render();
    if (!dlg.open) { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); }
    const el = dlg.querySelector('#ar-app');
    el.classList.remove('on');
    if (C.cfg().fx) { el.classList.add('boot'); setTimeout(() => el.classList.remove('boot'), 1100); }
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
    maybeAuto();
}

export function close() {
    const dlg = document.getElementById('ar-dialog');
    if (!dlg) return;
    dlg.querySelector('#ar-app')?.classList.remove('on');
    setTimeout(() => { if (dlg.open) dlg.close(); }, 220);
}

function go(app, id = null) {
    const b = document.querySelector('#ar-app .ar-body');
    if (b) ui.scroll[`${C.era().id}:${ui.app}:${ui.id}`] = b.scrollTop;
    ui.app = app; ui.id = id;
    render(true);
}

let rt = 0;
export function renderSoon() { clearTimeout(rt); rt = setTimeout(() => { if (isOpen()) render(); }, 120); }

export function render(fresh = false) {
    const app = document.getElementById('ar-app');
    if (!app) return;
    const e = C.era();
    app.className = `ar skin-${e.skin}${app.classList.contains('on') ? ' on' : ''}${app.classList.contains('boot') ? ' boot' : ''}${C.cfg().fx ? '' : ' nofx'}${ui.app === 'hydra' ? ' red' : ''}`;
    app.dataset.era = e.id;
    app.querySelector('.ar-top').innerHTML = topHtml(e);
    const body = app.querySelector('.ar-body');
    const key = `${e.id}:${ui.app}:${ui.id}`;
    if (ui.lastEra && ui.lastEra !== e.id) fresh = true;
    ui.lastEra = e.id;
    const keep = fresh ? (ui.scroll[key] || 0) : body.scrollTop;
    let html = '';
    try { html = screen(e); } catch (err) { console.error('[АРТУР]', err); html = empty(`Сбой экрана: ${err?.message || err}`); }
    body.innerHTML = `<div class="ar-screen${fresh ? ' in' : ''}">${html}</div>`;
    body.scrollTop = keep;
    typeIn(body);
    paintModal();
}

function topHtml(e) {
    const k = C.clock();
    const when = [k.date, k.time].filter(Boolean).join(' · ') || 'время не задано';
    const paper = e.skin === 'paper';
    return `
    <button class="ar-logo" data-aact="home" aria-label="Рабочий стол">${paper ? SEAL : EYE}</button>
    <div class="ar-where">
        <b>${esc(paper ? e.title : `А.Р.Т.У.Р. · ${e.title}`)}</b>
        <span>${esc(when)}${k.loc ? ` · ${esc(C.cut(k.loc, 46))}` : ''}</span>
    </div>
    <button class="ar-x" data-aact="close" aria-label="Закрыть">${ic('x')}</button>`;
}

function screen(e) {
    if (e.id === 'none') return noneHtml(e);
    const apps = C.appsOf(e).map(a => a.id);
    if (ui.app && !apps.includes(ui.app) && ui.app !== 'artur') ui.app = null;
    switch (ui.app) {
        case 'lab': return ui.id ? projectHtml(e) : labHtml(e);
        case 'ops': return ui.id ? opHtml(e) : opsHtml(e);
        case 'dossier': return ui.id ? personHtml(e) : dossierHtml(e);
        case 'radar': return radarHtml(e);
        case 'med': return medHtml(e);
        case 'bases': return ui.id ? baseHtml(e) : basesHtml(e);
        case 'files': return filesHtml(e);
        case 'sharik': return sharikHtml(e);
        case 'home': return ui.id === 'grid' ? gridHtml(e) : homeHtml(e);
        case 'hydra': return hydraHtml(e);
        case 'artur': return arturHtml(e);
        default: return deskHtml(e);
    }
}

function head(title, right = '') {
    const back = ui.id ? `data-aact="go" data-app="${esc(ui.app)}"` : 'data-aact="home"';
    return `<div class="ar-apphead"><button class="ar-back" ${back}>${ic('left')}</button><h2>${esc(title)}</h2><div class="ar-apphead-r">${right}</div></div>`;
}
const appLabel = (id, e = C.era()) => D.ERA_APPS[e.id]?.[id] || D.APPS[id]?.[1] || id;

// ───────────── рабочий стол ─────────────

function deskHtml(e) {
    const m = C.M();
    const paper = e.skin === 'paper';
    let top = '';
    if (e.artur) {
        const r = C.remarkOf(e);
        const t = r?.text || '';
        const k = C.clock();
        const stale = r?.day !== (k.day || k.mes);
        top = `<div class="ar-hello">
            <div class="ar-hello-eye">${EYE}</div>
            <div class="ar-hello-t">${busy('remark') ? '<span class="ar-dots">Арт думает</span>' : t ? `<p class="ar-type" data-full="${esc(t)}">${ui.typed.has(t) ? esc(t) : ''}</p>` : `<p class="ar-mute">${stale ? 'Арт ещё не здоровался сегодня.' : ''}</p>`}
            <div class="ar-row">${btn('remark', `${ic('refresh')} ${t ? 'Ещё' : 'Поздороваться'}`, '', 'sm ghost')}${t ? btn('say', `${ic('message')} Пусть скажет в сцене`, '', 'sm ghost') : ''}</div></div>
        </div>`;
    } else if (paper) {
        top = `<div class="ar-memo">
            <div class="ar-stamp">Совершенно секретно</div>
            <p>Картотека Стратегического научного резерва. Сводки, личные дела, операции.</p>
            <p class="ar-mute">А.Р.Т.У.Р. — спящий режим: костюм лежит в ячейке в Нью-Йорке, на войну его не берут.</p>
        </div>`;
    }
    const pend = m.shots.length ? `${sec('Ждёт следующего ответа', String(m.shots.length))}<div class="ar-list">${m.shots.map(s => `<div class="ar-shot"><span>${esc(C.cut(s.text.replace(/^\[|\]$/g, ''), 150))}</span><button class="ar-ico" data-aact="disarm" data-id="${s.at}" aria-label="Убрать">${ic('x')}</button></div>`).join('')}</div>` : '';
    const stats = statTiles(e);
    const apps = C.appsOf(e);
    const fd = C.feedOf(e).slice(0, 5);
    return `${top}
    ${stats.length ? `<div class="ar-stats">${stats.join('')}</div>` : ''}
    ${pend}
    <div class="ar-apps">${apps.map(a => `<button class="ar-tile${a.id === 'hydra' ? ' red' : ''}" data-aact="go" data-app="${a.id}">
        <span class="ar-tile-ic">${ic(a.ic)}</span><span class="ar-tile-t">${esc(a.id === 'hydra' && !ui.hydraSeen ? 'Резервное копирование' : a.label)}</span><span class="ar-tile-s">${esc(tileSub(a.id, e))}</span></button>`).join('')}</div>
    ${fd.length ? `${sec(e.artur ? 'Журнал Арта' : 'Журнал', `<button class="ar-link" data-aact="go" data-app="artur">всё</button>`)}<div class="ar-feed">${fd.map(feedRow).join('')}</div>` : ''}`;
}

const feedRow = (f) => `<div class="ar-fd ${esc(f.kind)}"><span>${esc(f.at || '')}</span><p>${esc(f.text)}</p></div>`;

function statTiles(e) {
    const m = C.M();
    const out = [];
    const tile = (label, val, sub, app, cls = '') => out.push(`<button class="ar-stat ${cls}" data-aact="go" data-app="${app}"><span>${esc(label)}</span><b>${esc(val)}</b><em>${esc(sub)}</em></button>`);
    if (e.stones) { const v = Number(m.med.stones) || 0; tile('Камни', `${v}%`, C.stonesWord(v), 'med', v >= 70 ? 'bad' : v >= 45 ? 'warn' : ''); }
    const pg = C.pregLine();
    if (pg) tile(pg.baby ? 'Малыш' : 'Зёрнышко', pg.baby ? '♡' : `${pg.week} нед`, pg.baby ? pg.text : `${pg.tri} триместр`, 'med');
    const appIds = C.appsOf(e).map(a => a.id);
    if (appIds.includes('radar')) { const n = C.signals().filter(s => !s.seen).length; tile(appLabel('radar', e), String(n), n ? plural(n, 'новый', 'новых', 'новых') : 'тихо', 'radar', C.signals().some(s => !s.seen && s.lvl >= 3) ? 'bad' : ''); }
    if (appIds.includes('ops')) { const live = C.ops().filter(o => o.status === 'live'); tile(appLabel('ops', e), String(live.length), live.length ? C.cut(live[0].name, 18) : 'не идёт', 'ops', live.length ? 'warn' : ''); }
    if (e.id === 'shield') tile('Легенда', `${m.hydra.legend}%`, Number(m.hydra.legend) < 50 ? 'трещит' : 'держится', 'hydra', Number(m.hydra.legend) < 50 ? 'bad' : '');
    if (appIds.includes('sharik')) { const s = m.sharik; tile('Шарик', `${C.clamp(s.charge)}%`, C.sharikMood(s).mood, 'sharik', s.charge < 15 ? 'bad' : ''); }
    if (out.length < 4 && appIds.includes('lab')) { const n = C.projects().filter(p => p.stage < 4).length; tile(appLabel('lab', e), String(n), plural(n, 'проект', 'проекта', 'проектов'), 'lab'); }
    return out.slice(0, 4);
}

function tileSub(id, e) {
    const m = C.M();
    switch (id) {
        case 'lab': { const n = C.projects().length; return n ? `${n} ${plural(n, 'проект', 'проекта', 'проектов')}` : 'пусто'; }
        case 'ops': { const l = C.ops().find(o => o.status === 'live'); if (l) return `идёт: ${C.cut(l.name, 20)}`; const n = C.ops().filter(o => o.status === 'plan').length; return n ? `${n} в плане` : 'пусто'; }
        case 'dossier': { const n = C.dossierList().length; return `${n} ${plural(n, 'дело', 'дела', 'дел')}`; }
        case 'radar': { const n = C.signals().filter(s => !s.seen).length; return n ? `${n} ${plural(n, 'новый', 'новых', 'новых')}` : 'тихо'; }
        case 'med': return e.stones ? `Камни: ${C.stonesWord()}` : `${C.inEra(m.patients).filter(p => p.state !== 'ok').length || 'нет'} в лазарете`;
        case 'bases': { const h = C.baseHere(); if (h) return `здесь: ${h.name}`; const a = C.bases().filter(b => b.status !== 'ok').length; return a ? `тревога: ${a}` : 'в норме'; }
        case 'files': { const n = C.files().filter(f => f.lock).length; return n ? `${n} под замком` : `${C.files().length} папок`; }
        case 'sharik': return `${C.clamp(m.sharik.charge)}% · ${C.sharikMood().mood}`;
        case 'home': { const st = HM.alarm(); return st === 'breach' ? 'ПЕРИМЕТР НАРУШЕН' : st === 'alert' ? 'охрана: внимание' : `${(HD.MODES.find(x => x[0] === HM.H().mode) || [])[1]?.toLowerCase()} · периметр чист`; }
        case 'hydra': return ui.hydraSeen ? `легенда ${m.hydra.legend}%` : 'идёт…';
        case 'artur': return e.artur ? 'голос, лента, настройки' : 'настройки';
        default: return '';
    }
}

function noneHtml(e) {
    return `<div class="ar-none"><div class="ar-noise"></div><h2>Нет сигнала</h2><p>По дате истории сейчас ${esc(C.clock().year || '—')} год: ни картотеки СНР, ни Арта ещё нет.</p>
    ${btn('go', `${ic('settings')} Эпохи и настройки`, 'data-app="artur"')}</div>`;
}

// ───────────── лаборатория ─────────────

function labHtml(e) {
    const list = C.projects();
    const act = list.filter(p => p.stage < 4), done = list.filter(p => p.stage >= 4);
    const card = (p) => `<button class="ar-card${p.fresh ? ' fresh' : ''}" data-aact="go" data-app="lab" data-id="${esc(p.id)}">
        <div class="ar-card-h"><b>${esc(p.name)}</b>${chip(D.fieldName(p.field))}</div>
        ${stageDots(p)}${p.stage < 4 ? bar(p.pct) : ''}
        <div class="ar-card-s">${(p.team || []).length ? esc(p.team.join(', ')) : 'одна'}${p.log[0] ? ` · ${esc(C.cut(p.log[0].t, 60))}` : ''}</div></button>`;
    return `${head(appLabel('lab', e), btn('newProject', ic('plus'), '', 'ico'))}
    ${histRow('lab')}
    ${act.length ? `<div class="ar-list">${act.map(card).join('')}</div>` : empty('Проектов нет.', `<br>${btn('newProject', `${ic('plus')} Завести проект`)}`)}
    ${done.length ? `${sec('Готово', String(done.length))}<div class="ar-list">${done.map(card).join('')}</div>` : ''}`;
}

function projectHtml(e) {
    const p = C.projectById(ui.id);
    if (!p) return `${head('Проект')}${empty('Проект не найден.')}`;
    const pend = C.shots().find(s => s.kind === 'lab' && s.key === p.id);
    return `${head(p.name, btn('editProject', ic('pencil'), `data-id="${esc(p.id)}"`, 'ico'))}
    ${p.fresh ? `<div class="ar-fresh">${p.src === 'hist' ? 'Арт вытащил этот проект из истории.' : 'Летописец завёл этот проект сам.'} ${btn('keep', `${ic('check')} Оставить`, `data-kind="project" data-id="${esc(p.id)}"`, 'sm')} ${btn('delProject', `${ic('x')} Не надо`, `data-id="${esc(p.id)}"`, 'sm ghost')}</div>` : ''}
    ${imgBox(p.img, 'drawProject', p.id, e.skin === 'paper' ? 'Чертёж на кальке' : 'Голограмма-чертёж')}
    <div class="ar-row wrap">${chip(D.fieldName(p.field))}${(p.team || []).map(t => chip(t, 'who')).join('')}</div>
    ${stageDots(p, 'setStage')}
    ${p.stage < 4 ? `<div class="ar-prog">${btn('pct', ic('minus'), `data-id="${esc(p.id)}" data-v="-10"`, 'ico sm')}${bar(p.pct, 'big')}<b>${p.pct}%</b>${btn('pct', ic('plus'), `data-id="${esc(p.id)}" data-v="10"`, 'ico sm')}</div>` : ''}
    ${p.bans ? `<div class="ar-ban">${ic('lock')}<span>${esc(p.bans)}</span></div>` : ''}
    ${p.note ? `<p class="ar-note">${esc(p.note)}</p>` : ''}
    ${pend ? `<div class="ar-shot"><span>Исход ждёт сцены: ${esc(C.cut(pend.text.replace(/^\[|\]$/g, ''), 140))}</span><button class="ar-ico" data-aact="disarm" data-id="${pend.at}">${ic('x')}</button></div>` : ''}
    <div class="ar-row">${p.stage < 4 ? btn('dice', `${ic('dice')} Опыт`, `data-id="${esc(p.id)}"`, 'primary') : ''}${btn('addLog', `${ic('notes')} Запись`, `data-kind="project" data-id="${esc(p.id)}"`, 'ghost')}${btn('histOne', busy(`one:${p.id}`) ? '<span class="ar-spin"></span>' : ic('sparkles'), `data-kind="project" data-id="${esc(p.id)}" title="Дополнить из истории"`, 'ico ghost')}</div>
    ${sec('Журнал', String(p.log.length))}
    <div class="ar-log">${p.log.map(l => `<div class="ar-lg ${esc(l.kind)}"><span>${esc(l.at || '')}</span><p>${esc(l.t)}</p></div>`).join('') || empty('Пусто.')}</div>
    <div class="ar-row end">${btn('delProject', `${ic('trash')} Удалить проект`, `data-id="${esc(p.id)}"`, 'ghost danger sm')}</div>`;
}

// ───────────── кубик ─────────────

function diceHtml() {
    const d = ui.dice;
    const p = C.projectById(d.pid);
    if (!p) return '';
    const raw = d.mods.filter(x => x.on).reduce((a, x) => a + x.v, 0) + d.own;
    const sum = Math.max(-C.MOD_CAP, Math.min(C.MOD_CAP, raw));
    const r = d.result;
    return `<div class="ar-mh"><b>${ic('dice')} Опыт · ${esc(p.name)}</b><button class="ar-ico" data-aact="closeModal">${ic('x')}</button></div>
    <div class="ar-mods">${d.mods.map((x, i) => `<button class="ar-mod${x.on ? ' on' : ''}" data-aact="mod" data-v="${i}"><span>${esc(x.label)}</span><b>${x.v > 0 ? '+' : ''}${x.v}</b></button>`).join('')}</div>
    <div class="ar-row center">${btn('modAdd', '−1', 'data-v="-1"', 'sm ghost')}<span class="ar-mute">своя поправка: ${d.own > 0 ? '+' : ''}${d.own}</span>${btn('modAdd', '+1', 'data-v="1"', 'sm ghost')}</div>
    <div class="ar-die${d.rolling ? ' rolling' : ''}${r ? ` out-${r.out}` : ''}"><span class="ar-die-n">${d.rolling ? d.flash : r ? r.roll : 'd20'}</span><em>${r ? `${r.roll} ${r.modSum >= 0 ? '+' : '−'} ${Math.abs(r.modSum)} = ${r.sum}` : `поправки ${sum >= 0 ? '+' : ''}${sum}${raw !== sum ? ` (из ${raw > 0 ? '+' : ''}${raw}, потолок ±${C.MOD_CAP})` : ''}`}</em></div>
    ${r ? `<div class="ar-out out-${r.out}"><b>${esc(r.name)}</b><p>${esc(r.flavor)}</p><span>${r.delta > 0 ? '+' : ''}${r.delta}% к стадии</span></div>
    <div class="ar-row">${btn('expScene', `${ic('send')} В сцену`, '', 'primary')}${btn('expQuiet', 'За кадром', '', 'ghost')}${btn('roll', `${ic('refresh')}`, '', 'ico ghost')}</div>
    <p class="ar-mute small">«В сцену» — модель покажет это в следующем ответе. «За кадром» — только прогресс и журнал.</p>`
        : `<div class="ar-row">${btn('roll', `${ic('dice')} Бросить`, '', 'primary wide')}</div>`}`;
}

function startRoll() {
    const d = ui.dice;
    const p = C.projectById(d.pid);
    if (!p || d.rolling) return;
    const mods = [...d.mods];
    if (d.own) mods.push({ key: 'own', label: 'своя поправка', v: d.own, on: true });
    const res = C.rollExp(p, mods);
    d.result = null;
    d.rolling = true;
    let n = 0;
    const fx = C.cfg().fx;
    const tick = () => {
        d.flash = 1 + Math.floor(Math.random() * 20);
        paintModal();
        if (++n < (fx ? 12 : 1)) setTimeout(tick, 45 + n * 8);
        else { d.rolling = false; d.result = res; paintModal(); }
    };
    tick();
}

// ───────────── операции ─────────────

const stCls = (s) => ({ plan: '', live: 'warn', hold: 'mute', done: 'ok', fail: 'bad' }[s] || '');
function opsHtml(e) {
    const list = C.ops();
    const live = list.filter(o => ['live', 'plan', 'hold'].includes(o.status)), done = list.filter(o => ['done', 'fail'].includes(o.status));
    const card = (o) => `<button class="ar-card${o.fresh ? ' fresh' : ''}" data-aact="go" data-app="ops" data-id="${esc(o.id)}">
        <div class="ar-card-h"><b>${esc(o.name)}</b>${chip(C.statusName(o.status), stCls(o.status))}</div>
        ${o.goal ? `<p>${esc(C.cut(o.goal, 120))}</p>` : ''}
        <div class="ar-card-s">${esc([o.where, o.when].filter(Boolean).join(' · ') || '—')}${o.team?.length ? ` · ${esc(o.team.join(', '))}` : ''} · риск ${'●'.repeat(o.risk || 0)}${'○'.repeat(5 - (o.risk || 0))}</div></button>`;
    return `${head(appLabel('ops', e), btn('newOp', ic('plus'), '', 'ico'))}
    ${histRow('ops')}
    ${live.length ? `<div class="ar-list">${live.map(card).join('')}</div>` : empty('Активных операций нет.', `<br>${btn('newOp', `${ic('plus')} Новая операция`)}`)}
    ${done.length ? `${sec('Архив операций', String(done.length))}<div class="ar-list">${done.map(card).join('')}</div>` : ''}`;
}

function opHtml(e) {
    const o = C.opById(ui.id);
    if (!o) return `${head('Операция')}${empty('Операция не найдена.')}`;
    const id = esc(o.id);
    return `${head(o.name, btn('editOp', ic('pencil'), `data-id="${id}"`, 'ico'))}
    ${o.fresh ? `<div class="ar-fresh">${o.src === 'hist' ? 'Арт вытащил операцию из истории.' : 'Летописец завёл операцию сам.'} ${btn('keep', `${ic('check')} Оставить`, `data-kind="op" data-id="${id}"`, 'sm')} ${btn('delOp', `${ic('x')} Не надо`, `data-id="${id}"`, 'sm ghost')}</div>` : ''}
    ${seg('opStatus', o.status, D.STATUS_OPS, `data-id="${id}"`)}
    <div class="ar-row">${btn('histOne', busy(`one:${o.id}`) ? '<span class="ar-spin"></span> Арт читает историю…' : `${ic('sparkles')} Дополнить из истории`, `data-kind="op" data-id="${id}"`, 'ghost wide hist')}</div>
    <div class="ar-kv">
        <div><span>Цель</span><p>${esc(o.goal || '—')}</p></div>
        <div><span>Где · когда</span><p>${esc([o.where, o.when].filter(Boolean).join(' · ') || '—')}</p></div>
        <div><span>Состав</span><p>${esc((o.team || []).join(', ') || '—')}</p></div>
        <div><span>Риск</span><p>${pips(o.risk || 0, 'opRisk', o.id)}</p></div>
    </div>
    ${sec('Брифинг', btn('brief', busy(`brief:${o.id}`) ? '<span class="ar-spin"></span>' : `${ic('sparkles')} ${o.brief ? 'Заново' : 'Составить'}`, `data-id="${id}"`, 'sm ghost'))}
    ${o.brief ? `<div class="ar-doc">${esc(o.brief).replace(/\n/g, '<br>')}</div><div class="ar-row">${btn('briefScene', `${ic('send')} Вывести в сцену`, `data-id="${id}"`, 'sm ghost')}</div>` : empty(C.era().artur ? 'Арт соберёт брифинг из лора, журнала и состава.' : 'Штаб составит брифинг из сводок и журнала.')}
    ${['done', 'fail'].includes(o.status) ? `${sec('Отчёт', btn('report', busy(`report:${o.id}`) ? '<span class="ar-spin"></span>' : `${ic('sparkles')} ${o.report ? 'Заново' : 'Написать'}`, `data-id="${id}"`, 'sm ghost'))}${o.report ? `<div class="ar-doc">${esc(o.report).replace(/\n/g, '<br>')}</div>` : ''}` : ''}
    ${sec('Журнал', btn('addLog', ic('plus'), `data-kind="op" data-id="${id}"`, 'ico sm'))}
    <div class="ar-log">${o.log.map(l => `<div class="ar-lg ${esc(l.kind)}"><span>${esc(l.at || '')}</span><p>${esc(l.t)}</p></div>`).join('') || empty('Пусто.')}</div>
    <div class="ar-row end">${btn('delOp', `${ic('trash')} Удалить`, `data-id="${id}"`, 'ghost danger sm')}</div>`;
}

// ───────────── досье: картотека и личное дело ─────────────

const EMBLEM = `<svg class="ds-emb" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18"/><circle cx="20" cy="20" r="13.5"/><path d="M20 9.5l2.6 7.2h7.5l-6.1 4.5 2.4 7.3-6.4-4.6-6.4 4.6 2.4-7.3-6.1-4.5h7.5z"/></svg>`;
const blank = (v, long = false) => (v ? esc(v) : `<i class="ds-blank${long ? ' long' : ''}"></i>`);
const paperOn = (e) => e.skin === 'paper' || !!(C.cfg().filePaper || {})[e.id];
const photoOf = (name, person, d) => { let src = d?.photo || person?.img || ''; if (!src) { try { src = C.A?.avatarUrl?.(name, true) || ''; } catch { /* */ } } return src; };
const stampHtml = (d, cls = '') => { const st = DS.statusOf(d.status); return st[2] ? `<div class="ds-stamp ${cls}">${esc(st[2])}</div>` : ''; };
const groupOfList = (x) => (x.main ? 'main' : x.circle ? 'circle' : 'other');

function dossierHtml(e) {
    DS.seedRoster(e);
    const list = C.dossierList();
    const f = C.norm(ui.filter);
    const groups = { main: 'Главные', circle: (D.ERA_GROUP[e.id] ? DS.agency(e).short : 'Круг'), other: 'Прочие' };
    const counts = {};
    for (const x of list) counts[groupOfList(x)] = (counts[groupOfList(x)] || 0) + 1;
    const g = ui.dgroup && counts[ui.dgroup] ? ui.dgroup : '';
    const shown = list.filter(x => (!g || groupOfList(x) === g) && (!f || C.norm(`${x.name} ${x.person?.role || ''} ${DS.rec(x.name, false)?.code || ''}`).includes(f)));
    const paper = paperOn(e);
    return `${head(appLabel('dossier', e), btn('newPerson', ic('plus'), '', 'ico'))}
    <div class="ar-row">${btn('findPeople', busy('people') ? '<span class="ar-spin"></span> Архивист листает лорбуки…' : `${ic('search')} Найти людей в лоре`, '', 'ghost wide hist')}</div>
    <input class="ar-search" data-aset="filter" placeholder="Имя, роль или позывной" value="${esc(ui.filter)}">
    ${Object.keys(counts).length > 1 ? `<div class="ar-seg">${[['', `Все · ${list.length}`], ...Object.entries(groups).filter(([k]) => counts[k]).map(([k, l]) => [k, `${l} · ${counts[k]}`])].map(([k, l]) => `<button class="${k === g ? 'on' : ''}" data-aact="dsGroup" data-v="${k}">${esc(l)}</button>`).join('')}</div>` : ''}
    <div class="ar-grid">${shown.map(x => {
        const d = DS.rec(x.name, false) || DS.blankRec();
        const src = photoOf(x.name, x.person, d);
        const st = DS.statusOf(d.status);
        return `<button class="ar-dcard${paper ? ' paper' : ''}${st[2] ? ' stamped' : ''}" data-aact="go" data-app="dossier" data-id="${esc(x.name)}">
            <span class="ds-no">№ ${esc(DS.fileNo(x.name, e))}</span>
            <span class="ds-pic">${src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<i>${esc(String(x.name).trim().charAt(0).toUpperCase())}</i>${st[2] ? `<em class="ds-mini">${esc(st[2])}</em>` : ''}</span>
            <span class="ds-code">${esc(d.code || '—')}</span>
            <b>${esc(d.fullname || x.name)}</b>
            <small>${esc(d.post || x.person?.role || (x.main ? 'главный герой' : ''))}</small>${x.group && !x.circle ? `<small class="ds-grp">${esc(x.group)}</small>` : ''}
            <span class="ds-threat">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= (d.threat || 1) ? 'on' : ''}"></i>`).join('')}</span>
        </button>`;
    }).join('') || empty('Никого. Люди берутся из вкладки «Люди» в Life, главные — из группы.')}</div>`;
}

function personHtml(e) {
    const name = ui.id;
    const x = C.dossierList().find(y => y.name === name) || { name };
    const p = x.person;
    const d = DS.rec(name);
    const ag = DS.agency(e);
    const paper = paperOn(e);
    const src = photoOf(name, p, d);
    const st = DS.statusOf(d.status);
    const nid = `data-id="${esc(name)}"`;
    const row = (k, l, long) => `<div class="ds-row"><span>${esc(l)}</span><u>${blank(d[k], long)}</u></div>`;
    const stack = (k, l) => `<div class="ds-st"><span>${esc(l)}</span><u>${blank(d[k])}</u></div>`;
    const block = (k, l) => `<div class="ds-block"><span>${esc(l)}</span><p>${d[k] ? esc(d[k]) : '<i class="ds-blank long"></i><i class="ds-blank"></i>'}</p></div>`;
    const empties = DS.FIELD_KEYS.filter(k => k !== 'status' && !d[k]).length;
    const au = DS.authorsOf(e);
    const cur = au.find(a => a[0] === ui.author) || au[0];
    return `${head(name, `${e.skin === 'paper' ? '' : btn('dsPaper', ic(paper ? 'sparkles' : 'file'), `title="${paper ? 'Голограмма' : 'Бумага'}"`, 'ico')}${btn('dsEdit', ic('pencil'), nid, 'ico')}`)}
    <article class="ar-dossier ${paper ? 'paper' : 'holo'}">
        <header class="ds-head">
            <div class="ds-agency">${EMBLEM}<div><b>${esc(ag.short)}</b><span>${esc(ag.long)}</span></div><em class="ds-no">№ ${esc(DS.fileNo(name, e))}</em></div>
            <div class="ds-meta">${row('dob', 'Дата рожд.')}<div class="ds-row"><span>Статус</span><u>${esc(st[1])}</u></div>${row('clear', 'Допуск')}</div>
        </header>
        <div class="ds-name"><span>${esc(ag.who)}</span><u>${esc(d.fullname || name)}</u></div>
        ${row('address', 'Последний адрес')}
        <div class="ds-mid">
            <div class="ds-fields">${stack('citizen', 'Гражданство')}${stack('birthplace', 'Место рождения')}${stack('langs', 'Языки')}${stack('marks', 'Особые приметы')}</div>
            <div class="ds-photo">
                <label class="ds-pic">${src ? `<img src="${esc(src)}" alt="" onerror="this.remove()">` : ''}<i>${esc(String(name).charAt(0).toUpperCase())}</i><input type="file" accept="image/*" data-aset="dsPhoto" data-who="${esc(name)}" hidden></label>
                <div class="ds-code">${d.code ? `«${esc(d.code)}»` : '<i class="ds-blank"></i>'}</div>
            </div>
        </div>
        <div class="ds-four">${stack('height', 'Рост')}${stack('weight', 'Вес')}${stack('hair', 'Волосы')}${stack('eyes', 'Глаза')}</div>
        ${row('family', 'Семья', true)}${row('edu', 'Образование', true)}${row('service', 'Служба', true)}${row('post', 'Назначение', true)}
        ${block('skills', 'Квалификация')}${block('powers', 'Способности')}${block('weak', 'Уязвимости')}${block('ties', 'Связи')}
        ${stampHtml(d)}
        <footer class="ds-foot"><span>${d.filled ? `заполнено ${esc(d.filled)}` : 'не заполнено'}</span><span>${esc(ag.short)} · ${esc(e.name)}</span></footer>
    </article>
    <div class="ar-row wrap">${btn('dsFill', busy(`fill:${name}`) ? '<span class="ar-spin"></span> Архив роется в лоре' : `${ic('book')} ${empties > 4 ? 'Заполнить из лора' : 'Дополнить из лора'}`, nid, empties > 4 ? 'primary' : 'ghost')}${empties <= 4 ? btn('dsRefill', `${ic('refresh')} Заново`, nid, 'ghost sm') : ''}${btn('dsScene', ic('zap'), `${nid} title="Дело на стол — в следующем ответе"`, 'ico ghost')}</div>
    <p class="ar-mute small">Фото — тапни по снимку. Заполняет архивист по карточке, лорбукам и «Людям» на дату истории; заполненное руками не трогает.</p>

    ${sec(e.artur ? 'Арт следит' : 'Пометки')}
    <div class="ar-panel">
        <div class="ar-kv"><div><span>Угроза</span><p>${pips(d.threat || 1, 'dsThreat', name)}</p></div><div><span>Статус</span><p>${esc(st[1])}</p></div></div>
        <label class="ar-form one">Лояльность · ${C.clamp(d.loyalty)}<input type="range" min="0" max="100" step="5" data-aset="dossier.loyalty" data-who="${esc(name)}" value="${C.clamp(d.loyalty)}"></label>
        <label class="ar-form one">Стресс · ${C.clamp(d.stress)}<input type="range" min="0" max="100" step="5" data-aset="dossier.stress" data-who="${esc(name)}" value="${C.clamp(d.stress)}"></label>
        <label class="ar-form one">${e.artur ? 'Пометка Арта' : 'Пометка'}<textarea rows="2" data-aset="dossier.note" data-who="${esc(name)}" placeholder="что важно помнить">${esc(d.note)}</textarea></label>
    </div>

    ${sec('Оценки', String(d.assess.length))}
    ${au.length > 1 ? `<div class="ar-seg">${au.map(a => `<button class="${a[0] === cur[0] ? 'on' : ''}" data-aact="dsAuthor" data-v="${a[0]}">${esc(a[1])}</button>`).join('')}</div>` : ''}
    <div class="ar-row">${btn('dsAssess', busy(`assess:${name}`) ? `<span class="ar-spin"></span> ${esc(cur[1])} пишет` : `${ic('feather')} Оценка: ${esc(cur[1])}`, nid, 'primary wide')}</div>
    <div class="ar-list">${d.assess.map((a, i) => memoHtml(name, a, i === 0, paper)).join('') || empty(`${cur[1]} ещё не писал о ${name}.`)}</div>

    ${sec('Записи в деле', btn('dsLogAdd', ic('plus'), nid, 'ico sm'))}
    <div class="ar-log">${d.log.map(l => `<div class="ar-lg ${l.src === 'chron' ? 'chron' : ''}"><span>${esc(l.at || '')}${l.src === 'chron' ? ' · Летописец' : ''}</span><p>${esc(l.t)}</p><button class="ar-ico" data-aact="dsLogDel" data-id="${esc(name)}" data-v="${esc(l.id)}">${ic('x')}</button></div>`).join('') || empty('Пусто. Летописец сам заносит поступки, ранения и срывы.')}</div>

    ${p ? `${sec('Из «Людей» Life')}${p.bio ? `<p class="ar-note">${esc(C.cut(p.bio, 600))}</p>` : ''}${p.voice ? `<p class="ar-note mute">Манера: ${esc(C.cut(p.voice, 240))}</p>` : ''}${p.secret ? `<div class="ar-secret" data-aact="reveal"><span>Секрет</span><p>${esc(p.secret)}</p></div>` : ''}` : ''}
    ${x.own ? `<div class="ar-row end">${btn('delPerson', `${ic('trash')} Убрать дело`, nid, 'ghost danger sm')}</div>` : ''}`;
}

function memoHtml(name, a, open, paper) {
    const sect = (t, v) => (v ? `<h4>${esc(t)}</h4><p>${esc(v)}</p>` : '');
    const body = `${sect('История субъекта', a.history)}${sect('Обзор личности', a.overview)}
        ${a.observations?.length ? `<h4>Поведенческие наблюдения</h4><ul>${a.observations.map(o => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
        ${sect('Выводы', a.impressions)}${sect('Заключение', a.conclusion)}
        ${a.verdict?.length ? `<div class="ds-verdict">${a.verdict.map(v => `<div><span>${esc(v[0])}:</span> <b>${esc(v[1])}</b></div>`).join('')}</div>` : ''}`;
    return `<details class="ar-memo2${paper ? ' paper' : ''}" ${open ? 'open' : ''}>
        <summary><span class="ds-cls">Секретно · оценка</span><b>${esc(a.name)}</b><em>${esc(a.role || '')}${a.at ? ` · ${esc(a.at)}` : ''}</em></summary>
        <div class="ds-memo-b">${EMBLEM}<div class="ds-memo-h"><div><span>Субъект:</span> ${esc(name)}</div><div><span>Составил:</span> ${esc(a.name)}</div></div>${body}</div>
        <div class="ar-row end">${btn('dsAssessScene', `${ic('zap')} В сцену`, `data-id="${esc(name)}" data-v="${esc(a.id)}"`, 'sm ghost')}${btn('dsAssessDel', ic('trash'), `data-id="${esc(name)}" data-v="${esc(a.id)}"`, 'ico sm ghost danger')}</div>
    </details>`;
}

function dossierForm(name) {
    const d = DS.rec(name);
    const fields = DS.FIELDS.map(([k, l]) => (k === 'status'
        ? { k, label: l, type: 'select', value: d.status, opts: DS.STATUS.map(s => [s[0], s[1]]) }
        : { k, label: l, value: d[k] || '', type: ['skills', 'service', 'powers', 'weak', 'ties', 'family'].includes(k) ? 'area' : 'text', rows: 2 }));
    fields.push({ k: 'aliases', label: 'Другие имена (для поиска в лоре)', value: d.aliases || '', ph: 'Зимний Солдат, Джеймс Бьюкенен' });
    form(`Дело: ${name}`, fields, (v) => { for (const [k, val] of Object.entries(v)) d[k] = String(val).trim(); });
}

// ───────────── радар ─────────────

function radarHtml(e) {
    const list = C.signals();
    const blips = list.slice(0, 14).map((s, i) => {
        let h = 0; for (const ch of s.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        const a = (h % 360) * Math.PI / 180, r = 18 + (h >> 8) % 70;
        return `<i class="lv${s.lvl}${s.seen ? ' seen' : ''}" style="left:${50 + Math.cos(a) * r / 2}%;top:${50 + Math.sin(a) * r / 2}%;animation-delay:${(i * 0.37) % 3}s"></i>`;
    }).join('');
    const paper = e.skin === 'paper';
    const past = e.id === 'aim' ? pastHtml() : '';
    return `${head(appLabel('radar', e), btn('newSignal', ic('plus'), '', 'ico'))}
    ${paper ? '' : `<div class="ar-radar"><div class="ar-sweep"></div>${blips}</div>`}
    <div class="ar-row">${btn('scan', busy('scan') ? '<span class="ar-spin"></span> Сканирую' : `${ic('radar')} ${paper ? 'Сводка дня' : 'Сканировать'}`, '', 'primary')}${list.some(s => !s.seen) ? btn('seenAll', `${ic('check')} Всё прочитано`, '', 'ghost') : ''}</div>
    <div class="ar-list">${list.map(s => `<div class="ar-sig lv${s.lvl}${s.seen ? ' seen' : ''}">
        <div class="ar-sig-h">${chip(C.kindName(s.kind), s.kind)}<b>${esc(s.title)}</b></div>
        ${s.text ? `<p>${esc(s.text)}</p>` : ''}
        <div class="ar-sig-f"><span>${esc([s.where, s.at].filter(Boolean).join(' · '))}</span>
        <span>${btn('sigScene', ic('zap'), `data-id="${esc(s.id)}" title="Пусть всплывёт в следующем ответе"`, 'ico sm')}${btn('sigSeen', ic('check'), `data-id="${esc(s.id)}"`, 'ico sm')}${btn('sigDel', ic('x'), `data-id="${esc(s.id)}"`, 'ico sm')}</span></div></div>`).join('') || empty(paper ? 'Телетайп молчит.' : 'Радар чист.')}</div>
    ${past}`;
}

function pastHtml() {
    const act = C.pastActive();
    const ST = [['sleep', 'спит'], ['stir', 'шевелится'], ['active', 'в игре'], ['done', 'закрыто']];
    return `${sec('Прошлое нагоняет', act ? `сейчас: ${esc(act.name)}` : 'тихо')}
    <p class="ar-mute small">Линии из лорбука вводятся по одной: пока одна шевелится, кубик молчит.</p>
    <div class="ar-row">${btn('rollPast', `${ic('dice')} Кто вылезет`, act ? 'disabled' : '', 'ghost')}</div>
    <div class="ar-list">${D.PAST.map(p => {
        const st = C.pastState(p.id);
        return `<div class="ar-past st-${st}"><div class="ar-sig-h"><b>${esc(p.name)}</b><span class="ar-mute">${esc(p.who)}</span></div>
        ${st !== 'sleep' ? `<p>${esc(p.hint)}</p>` : ''}
        <div class="ar-sig-f">${seg('pastSt', st, ST, `data-id="${p.id}"`)}${['stir', 'active'].includes(st) ? btn('pastScene', ic('zap'), `data-id="${p.id}" title="Знак в следующем ответе"`, 'ico sm') : ''}</div></div>`;
    }).join('')}</div>`;
}

// ───────────── медблок ─────────────

function medHtml(e) {
    const m = C.M();
    const pg = C.pregLine();
    const pats = C.inEra(m.patients);
    const v = C.clamp(m.med.stones);
    return `${head(appLabel('med', e), btn('newPatient', ic('plus'), '', 'ico'))}
    ${histRow('med')}
    <div class="ar-panel">
        <div class="ar-card-h"><b>Хеди</b>${m.med.tremor ? chip('тремор', 'bad') : ''}</div>
        ${e.stones ? `<div class="ar-gauge ${v >= 70 ? 'bad' : v >= 45 ? 'warn' : ''}"><svg viewBox="0 0 120 66"><path class="g0" d="M10 60a50 50 0 0 1 100 0"/><path class="g1" d="M10 60a50 50 0 0 1 100 0" style="stroke-dasharray:${(v / 100) * 157} 157"/></svg><b>${v}%</b><span>нестабильность Камней · ${esc(C.stonesWord(v))}</span></div>
        <label class="ar-form one">Нестабильность<input type="range" min="0" max="100" step="5" data-aset="med.stones" value="${v}"></label>
        <div class="ar-row">${btn('tremor', m.med.tremor ? `${ic('check')} Руки успокоились` : 'Дрожат руки', '', 'sm ghost')}</div>` : ''}
        ${pg ? `<div class="ar-kv"><div><span>${pg.baby ? 'Малыш' : 'Беременность'}</span><p>${esc(pg.text)}${pg.left != null && !pg.baby ? ` · до ПДР ${pg.left} дн` : ''}</p></div></div><div class="ar-row">${btn('openZ', `${ic('baby')} Открыть Зёрнышко`, '', 'sm ghost')}</div>` : ''}
    </div>
    ${['aim', 'run', 'ship'].includes(e.id) ? `${sec('Протез Баки')}<div class="ar-panel"><label class="ar-form one">Целостность · ${C.clamp(m.med.arm?.pct ?? 100)}%<input type="range" min="0" max="100" step="5" data-aset="med.arm.pct" value="${C.clamp(m.med.arm?.pct ?? 100)}"></label><label class="ar-form one">Заметка<input data-aset="med.arm.note" value="${esc(m.med.arm?.note || '')}" placeholder="последнее обслуживание, сбои"></label></div>` : ''}
    ${sec(e.id === 'ssr' ? 'Лазарет' : 'Пациенты', String(pats.length))}
    <div class="ar-list">${pats.map(p => `<div class="ar-pat st-${esc(p.state)}"><div class="ar-card-h"><b>${esc(p.name)}</b>${seg('patSt', p.state, [['hurt', 'ранен'], ['heal', 'лечится'], ['ok', 'здоров']], `data-id="${esc(p.id)}"`)}</div><p>${esc(p.note)}</p><div class="ar-sig-f"><span>${esc(p.at || '')}</span>${btn('patDel', ic('x'), `data-id="${esc(p.id)}"`, 'ico sm')}</div></div>`).join('') || empty('Все целы.')}</div>
    ${sec(e.id === 'aim' ? 'Заметки доктора Баретт' : 'Заметки', btn('addMedNote', ic('plus'), '', 'ico sm'))}
    <div class="ar-log">${(m.med.notes || []).filter(n => (n.era || 'aim') === e.id).map((n, i) => `<div class="ar-lg"><span>${esc(n.at || '')}</span><p>${esc(n.t)}</p><button class="ar-ico" data-aact="delMedNote" data-id="${esc(n.id)}">${ic('x')}</button></div>`).join('') || empty('Пусто.')}</div>`;
}

// ───────────── базы ─────────────

const baseCls = (s) => ({ ok: 'ok', alert: 'warn', lock: 'mute', breach: 'bad' }[s] || '');
function basesHtml(e) {
    const list = C.bases();
    const here = C.baseHere();
    return `${head(appLabel('bases', e), btn('newBase', ic('plus'), '', 'ico'))}
    ${histRow('bases')}
    <div class="ar-list">${list.map(b => `<button class="ar-card base" data-aact="go" data-app="bases" data-id="${esc(b.id)}">
        ${b.img ? `<span class="ar-cam" style="background-image:url('${esc(b.img)}')"></span>` : '<span class="ar-cam ph"></span>'}
        <div class="ar-card-h"><b>${esc(b.name)}</b>${here?.id === b.id ? chip('вы здесь', 'here') : ''}${chip((D.STATUS_BASE.find(s => s[0] === b.status) || D.STATUS_BASE[0])[1], baseCls(b.status))}</div>
        <div class="ar-card-s">${esc(b.kind || '')}${b.who ? ` · ${esc(b.who)}` : ''}</div></button>`).join('') || empty('Объектов нет.')}</div>`;
}

function baseHtml(e) {
    const b = C.bases().find(x => x.id === ui.id);
    if (!b) return `${head('Объект')}${empty('Объект не найден.')}`;
    const id = esc(b.id);
    return `${head(b.name, btn('editBase', ic('pencil'), `data-id="${id}"`, 'ico'))}
    ${imgBox(b.img, 'drawBase', b.id, e.skin === 'paper' ? 'Разведфото' : 'Камера')}
    ${b.img ? `<div class="ar-row">${btn('drawBase', busy(`drawBase:${b.id}`) ? '<span class="ar-spin"></span>' : `${ic('refresh')} Новый кадр`, `data-id="${id}"`, 'sm ghost')}</div>` : ''}
    ${seg('baseSt', b.status, D.STATUS_BASE, `data-id="${id}"`)}
    <div class="ar-kv"><div><span>Что это</span><p>${esc(b.kind || '—')}</p></div><div><span>Кто там</span><p>${esc(b.who || '—')}</p></div></div>
    ${b.note ? `<p class="ar-note">${esc(b.note)}</p>` : ''}
    ${b.extra?.tracker !== undefined ? `<div class="ar-kv"><div><span>Вакандский трекер Земо</span><p>${esc(b.extra.tracker)}</p></div></div>` : ''}
    <div class="ar-row end">${btn('delBase', `${ic('trash')} Убрать`, `data-id="${id}"`, 'ghost danger sm')}</div>`;
}

// ───────────── протоколы и архив ─────────────

function filesHtml(e) {
    const list = C.files();
    const group = (kind, title) => {
        const l = list.filter(f => (f.kind || 'archive') === kind);
        if (!l.length) return '';
        return `${sec(title, String(l.length))}<div class="ar-list">${l.map(f => `<button class="ar-file${f.lock ? ' lock' : ''}" data-aact="file" data-id="${esc(f.id)}">
            <span class="ar-file-ic">${ic(f.lock ? 'lock' : 'unlock')}</span><span class="ar-file-t"><b>${esc(f.name)}</b><em>${esc(C.cut(f.text || '', 90)) || (f.lock ? 'доступ закрыт' : 'пусто')}</em></span></button>`).join('')}</div>`;
    };
    return `${head(appLabel('files', e), btn('newFile', ic('plus'), '', 'ico'))}
    ${histRow('files')}
    <p class="ar-mute small">Запертое открывается само, когда в посте звучат ключевые слова папки, или руками.</p>
    ${group('protocol', 'Протоколы')}${group('archive', e.skin === 'paper' ? 'Секретные дела' : 'Архив')}
    ${list.length ? '' : empty('Пусто.')}`;
}

function fileModal(f) {
    return `<div class="ar-mh"><b>${ic(f.lock ? 'lock' : 'folder')} ${esc(f.name)}</b><button class="ar-ico" data-aact="closeModal">${ic('x')}</button></div>
    <div class="ar-doc${f.lock ? ' locked' : ''}">${esc(f.text || 'Пусто.').replace(/\n/g, '<br>')}</div>
    ${f.lock ? `<p class="ar-mute small">Откроется сама по словам: ${esc((f.keys || []).join(', ') || '—')}</p>` : f.opened ? `<p class="ar-mute small">Открыта ${esc(f.opened)}</p>` : ''}
    <div class="ar-row">${btn('fileLock', f.lock ? `${ic('unlock')} Открыть доступ` : `${ic('lock')} Запереть`, `data-id="${esc(f.id)}"`, f.lock ? 'primary' : 'ghost')}${btn('editFile', `${ic('pencil')} Править`, `data-id="${esc(f.id)}"`, 'ghost')}${btn('delFile', ic('trash'), `data-id="${esc(f.id)}"`, 'ico ghost danger')}</div>`;
}

// ───────────── Шарик ─────────────

function sharikSvg(s) {
    const acc = s.acc || 'none';
    const dirt = (Number(s.dirt) || 0) >= 50, wear = (Number(s.wear) || 0) >= 60;
    return `<svg class="ar-sharik" viewBox="0 -24 120 134" aria-hidden="true">
<g class="sh-head"><rect x="30" y="8" width="26" height="20" rx="9"/><rect x="64" y="8" width="26" height="20" rx="9"/><circle class="sh-eye" cx="43" cy="18" r="5"/><circle class="sh-eye" cx="77" cy="18" r="5"/><path d="M56 18h8M60 28v12"/>
${acc === 'santa' ? '<g class="acc santa"><path d="M42 9 L60 -16 L78 9 Z"/><rect x="40" y="5" width="40" height="6" rx="3"/><circle cx="60" cy="-17" r="4"/></g>' : ''}
${acc === 'lamp' ? '<g class="acc lamp"><path class="beam" d="M60 3 L36 -20 L84 -20 Z"/><rect x="55" y="1" width="10" height="6" rx="2"/></g>' : ''}</g>
${acc === 'scarf' ? '<g class="acc scarf"><rect x="40" y="36" width="40" height="7" rx="3"/><path d="M68 42 l3 15 l7 -2 l-3 -13 z"/></g>' : ''}
<rect class="sh-body" x="34" y="40" width="52" height="38" rx="5"/><path d="M42 52h36M42 60h20"/><circle class="sh-led" cx="74" cy="66" r="3"/>
${acc === 'bow' ? '<g class="acc bow"><path d="M86 44 l10 -7 v14 z M86 44 l-10 -7 v14 z"/><circle cx="86" cy="44" r="2.6"/></g>' : ''}
${acc === 'sticker' ? '<g class="acc sticker"><rect x="40" y="64" width="24" height="9" rx="2" transform="rotate(-6 52 68)"/><path d="M43 68h17" transform="rotate(-6 52 68)"/></g>' : ''}
${wear ? '<g class="wear"><rect x="74" y="44" width="14" height="5" rx="1" transform="rotate(35 81 46)"/><rect x="74" y="44" width="14" height="5" rx="1" transform="rotate(-35 81 46)"/></g>' : ''}
<g class="sh-tread"><rect x="22" y="78" width="30" height="20" rx="9"/><rect x="68" y="78" width="30" height="20" rx="9"/><circle cx="30" cy="88" r="3"/><circle cx="44" cy="88" r="3"/><circle cx="76" cy="88" r="3"/><circle cx="90" cy="88" r="3"/></g>
${dirt ? '<g class="dirt"><circle cx="46" cy="72" r="3"/><circle cx="58" cy="70" r="2"/><circle cx="82" cy="58" r="2.5"/><circle cx="30" cy="94" r="2.5"/><circle cx="88" cy="95" r="2"/></g>' : ''}</svg>`;
}
const sceneTog = () => `<button class="ar-scenetog${HM.sceneOn() ? ' on' : ''}" data-aact="homeScene" title="Действия уходят в следующий ответ">${ic('send')}<span>${HM.sceneOn() ? 'в сцену' : 'тихо'}</span></button>`;
const stars = (n) => `<span class="ar-stars">${'★'.repeat(n)}${'☆'.repeat(Math.max(0, 5 - n))}</span>`;

function sharikHtml(e) {
    const s = P.S();
    const md = C.sharikMood(s);
    const care = HD.SHARIK_CARE.map(([id, l, i]) => btn('pCare', `${ic(i)} ${esc(l)}`, `data-v="${id}"`, `sm ${id === 'scold' ? 'ghost danger' : 'ghost'}`)).join('');
    return `${head('Шарик', sceneTog())}
    <div class="ar-shbox mood-${esc(md.mood)}${s.charge < 15 ? ' low' : ''}">${sharikSvg(s)}<b>${esc(md.mood)}</b><span>${esc(md.how)}</span></div>
    <div class="ar-kv four">
        <div><span>Заряд · ${C.clamp(s.charge)}%</span>${bar(s.charge, s.charge < 15 ? 'bad' : '')}</div>
        <div><span>Довольство · ${C.clamp(s.love)}%</span>${bar(s.love)}</div>
        <div><span>Чистота · ${100 - C.clamp(s.dirt)}%</span>${bar(100 - C.clamp(s.dirt), s.dirt >= 75 ? 'bad' : '')}</div>
        <div><span>Исправность · ${100 - C.clamp(s.wear)}%</span>${bar(100 - C.clamp(s.wear), s.wear >= 75 ? 'bad' : '')}</div>
    </div>
    ${sec('Уход')}<div class="ar-row wrap">${care}</div>
    ${sec('Поручения', 'как Дубина у Тони')}
    <div class="ar-jobs">${HD.SHARIK_JOBS.map(j => { const lv = P.level(j[0]); return `<button class="ar-job" data-aact="pJob" data-v="${j[0]}"><span class="ar-tile-ic">${ic(j[2])}</span><b>${esc(j[1])}</b>${stars(lv.lvl)}</button>`; }).join('')}</div>
    <div class="ar-row wrap">${btn('pAntic', `${ic('sparkles')} Что он творит?`, '', 'ghost')}${btn('pWith', s.with ? 'Оставить на базе' : 'Взять с собой', `data-v="${s.with ? '0' : '1'}"`, 'ghost')}</div>
    <p class="ar-mute small">${s.with ? 'Шарик с Хеди: модель иногда даёт ему мелькнуть в сцене.' : 'Шарик остался — в сценах его нет.'} Уровень поручения растёт с удачными попытками: меньше пролитого кофе.</p>
    ${sec('Аксессуар')}${seg('pAcc', s.acc || 'none', HD.SHARIK_ACC)}
    ${sec('Что было', String(s.log.length))}<div class="ar-log">${s.log.map(l => `<div class="ar-lg ${esc(l.kind)}"><span>${esc(l.at || '')}</span><p>${esc(l.t)}</p></div>`).join('') || empty('Пока ничего.')}</div>`;
}

// ───────────── дом ─────────────

const SHIELD = (st) => `<svg class="ar-shield st-${st}" viewBox="0 0 48 56" aria-hidden="true"><path d="M24 3 L44 10 V27 C44 40 35 49 24 53 C13 49 4 40 4 27 V10 Z"/>${st === 'ok' ? '<path d="M15 28 l7 7 l12 -14"/>' : st === 'alert' ? '<path d="M24 16 v15 M24 38 v2"/>' : '<path d="M16 20 l16 16 M32 20 l-16 16"/>'}</svg>`;

function homeHtml(e) {
    const h = HM.H();
    const st = HM.alarm();
    const here = HM.atHome();
    const pg = C.pregLine();
    const preg = pg && !pg.baby;
    const mg = HM.caffeine();
    const cup = h.coffee.cup;
    const lau = HM.laundry();
    const vio = HM.violets();
    const cat = HM.cat();
    const evs = h.events.slice(0, 4);
    const LST = { idle: 'пусто', wash: 'стирает', wet: 'готово, мокрое', drying: 'сушит', dry: 'сухое, ждёт' };
    return `${head('Дом', sceneTog())}
    <p class="ar-mute small">${esc(HD.HOME_TITLE)} · над лавкой Марко · ${here ? 'вы дома' : 'вы не дома'}</p>
    ${seg('hMode', h.mode, HD.MODES)}
    <div class="ar-toggles">${tog2('hDnd', 'Не беспокоить — Арт молчит, разве что пожар', h.dnd)}</div>

    ${sec('Охрана · Форт-Нокс', st === 'ok' ? 'всё зелёное' : st === 'alert' ? 'внимание' : 'НАРУШЕНИЕ')}
    <div class="ar-panel ar-sec-panel st-${st}">
        <div class="ar-guard">${SHIELD(st)}<div><b>${st === 'ok' ? 'Периметр чист' : st === 'alert' ? 'Есть подозрительное' : 'Периметр нарушен'}</b><span>${esc(HD.MODE_NOTE[h.mode])}</span></div></div>
        <div class="ar-zones">${HD.ZONES.map(z => `<button class="ar-zone st-${h.zones[z[0]]}" data-aact="hZone" data-v="${z[0]}" title="${esc(z[2])}"><i></i><b>${esc(z[1])}</b><span>${esc(z[2])}</span></button>`).join('')}</div>
        <div class="ar-row">${btn('hCheck', `${ic('dice')} Проверить периметр`, '', 'primary wide')}${st !== 'ok' ? btn('hClear', `${ic('check')} Отбой`, '', 'ghost') : ''}</div>
        <div class="ar-gridline lv-${GR.G().level}"><span>Защитный контур: <b>«${esc(GR.levelOf(GR.G().level)[1])}»</b></span>${btn('go', `${ic('shield')} Открыть контур`, 'data-app="home" data-id="grid"', st === 'breach' ? 'primary sm' : 'ghost sm')}</div>
        ${evs.length ? `<div class="ar-list">${evs.map(ev => `<div class="ar-ev k-${ev.kind}"><span>${esc(ev.at)} · d20 ${ev.roll}${ev.zone ? ` · ${esc(HM.zoneName(ev.zone))}` : ''}</span><p>${esc(ev.text)}</p><span class="ar-evb">${ev.kind === 'breach' || ev.kind === 'odd' ? btn('gOpen', ic('shield'), `data-v="${esc(ev.zone)}" title="Контур по этой зоне"`, 'ico sm') : ''}${btn('hEvScene', ic('zap'), `data-id="${esc(ev.id)}" title="В следующий ответ"`, 'ico sm')}</span></div>`).join('')}</div>` : ''}
    </div>

    ${sec('Кухня')}
    <div class="ar-panel">
        <div class="ar-card-h"><b>${ic('coffee')} Кофемашина</b>${preg ? `<span class="ar-mute small">кофеин ${mg}/${HD.CAFFEINE_MAX} мг</span>` : ''}</div>
        ${preg ? bar(Math.min(100, mg / HD.CAFFEINE_MAX * 100), mg >= HD.CAFFEINE_MAX ? 'bad' : 'thin') : ''}
        <div class="ar-drinks">${HD.DRINKS.map(d => `<button class="ar-drink${ui.refused === d[0] ? ' refused' : ''}" data-aact="hBrew" data-v="${d[0]}"><b>${esc(d[1])}</b>${d[2] > 10 ? `<em>${d[2]} мг</em>` : ''}</button>`).join('')}</div>
        ${ui.refused ? `<div class="ar-ban">${ic('lock')}<span>${esc(ui.refusedText || '')}</span></div><div class="ar-row">${btn('hBrewForce', `${ic('zap')} Приказ директора`, `data-v="${esc(ui.refused)}"`, 'ghost danger sm')}${btn('hBrewCancel', 'Ладно, декаф', '', 'ghost sm')}</div>` : ''}
        ${cup ? `<div class="ar-cup">${ic('coffee')}<span>На стойке: <b>${esc(cup.name)}</b>${cup.at ? ` · ${esc(cup.at)}` : ''}</span></div><div class="ar-row wrap">${btn('pJob', `${ic('bot')} Шарик, неси`, 'data-v="coffee"', 'sm ghost')}${btn('hArm', `${ic('wrench')} Лапа, подай`, `data-id="a1" data-v="coffee"`, 'sm ghost')}${btn('hCupTaken', 'Забрали', '', 'sm ghost')}</div>` : ''}
    </div>
    <div class="ar-panel">
        <div class="ar-card-h"><b>${ic('box')} Холодильник</b></div><p class="ar-mute small">на дверце — снимок макового зёрнышка, список покупок и магнит из Мадрипура</p>
        <div class="ar-chips">${h.fridge.map((x, i) => `<button class="ar-fr" data-aact="hOut" data-v="${i}" title="Кончилось">${esc(x)}</button>`).join('') || '<span class="ar-mute small">пусто</span>'}</div>
        <div class="ar-row"><input class="ar-in" id="ar-fridge-in" placeholder="положить в холодильник"><button class="ar-btn ico sm" data-aact="hAdd">${ic('plus')}</button></div>
        ${h.shop.length ? `<span class="ar-mute small">Список покупок (тап — купили):</span><div class="ar-chips">${h.shop.map((x, i) => `<button class="ar-fr shop" data-aact="hGot" data-v="${i}">${esc(x)}</button>`).join('')}</div>` : ''}
        <div class="ar-row">${btn('hOven', h.oven.on ? `${ic('flame')} Духовка ${h.oven.t}° — выкл` : `${ic('flame')} Духовка 180°`, '', h.oven.on ? 'sm primary' : 'sm ghost')}${h.oven.on ? `${btn('hOvenT', '−', 'data-v="-10"', 'ico sm ghost')}${btn('hOvenT', '+', 'data-v="10"', 'ico sm ghost')}` : ''}<span class="ar-mute small">не микроволновка</span></div>
    </div>

    ${sec('Климат')}
    <div class="ar-panel">
        ${seg('hClim', h.climate.mode, HD.CLIMATE_MODES)}
        <div class="ar-clim">${h.climate.zones.map(z => `<div class="ar-cz"><span>${esc(z.name)}</span><div>${btn('hTemp', '−', `data-id="${z.id}" data-v="-1"`, 'ico sm ghost')}<b>${z.t}°</b>${btn('hTemp', '+', `data-id="${z.id}" data-v="1"`, 'ico sm ghost')}</div></div>`).join('')}</div>
        <div class="ar-toggles">${tog2('hFloor', 'Тёплый пол в ванной и спальне', h.climate.floor)}</div>
    </div>
    ${sec('Свет')}${seg('hLight', h.light, HD.LIGHTS.map(l => [l[0], l[1]]))}
    ${sec('Музыка')}${seg('hMusic', h.music, HD.MUSIC)}

    ${sec('Быт')}
    <div class="ar-grid2">
        <div class="ar-panel mini"><div class="ar-card-h"><b>${ic('shirt')} Стирка</b></div><p class="ar-mute small">${esc(LST[lau.st])}${HM.laundryLeft() ? ` · ${esc(HM.laundryLeft())}` : ''}</p>
            ${lau.st === 'idle' ? `<select class="ar-in" id="ar-lau">${HD.LAUNDRY.map(l => `<option value="${l[0]}">${esc(l[1])} · ${l[2]} мин</option>`).join('')}</select>${btn('hWash', 'Запустить', '', 'sm ghost wide')}`
            : lau.st === 'wet' ? btn('hDry', 'В сушилку', '', 'sm ghost wide') : lau.st === 'dry' ? btn('hArm', 'Лапы, сложите', 'data-id="a1" data-v="fold"', 'sm ghost wide') : ''}</div>
        <div class="ar-panel mini"><div class="ar-card-h"><b>${ic('sun')} Фиалки</b></div><p class="ar-mute small">${esc(vio.st)}${vio.days != null ? ` · ${vio.days} дн` : ''}</p>
            ${btn('hWater', 'Полить', '', 'sm ghost wide')}${btn('pJob', 'Шарик, полей', 'data-v="water"', 'sm ghost wide')}</div>
        <div class="ar-panel mini"><div class="ar-card-h"><b>${ic('paw')} ${esc(cat.name)}</b></div><p class="ar-mute small">${cat.fed ? 'накормлена' : 'голодная, требует'}${cat.spot ? ` · ${esc(cat.spot)}` : ''}</p>
            ${btn('hFeed', 'Покормить', '', 'sm ghost wide')}${btn('hFind', 'Где она?', '', 'sm ghost wide')}</div>
        <div class="ar-panel mini"><div class="ar-card-h"><b>${ic('sparkles')} Дроны</b></div><p class="ar-mute small">уборка; протокол лояльности к еде ВКЛ</p>
            ${btn('hDrones', 'Запустить уборку', '', 'sm ghost wide')}</div>
    </div>

    ${sec('Лапы-манипуляторы')}
    ${h.arms.map(a => `<div class="ar-panel arm"><div class="ar-card-h"><b>${ic('wrench')} ${esc(a.name)}</b><span class="ar-mute small">${esc(a.place)} · ${stars(a.skill)}</span><button class="ar-ico" data-aact="hArmName" data-id="${a.id}">${ic('pencil')}</button></div>
        <div class="ar-chips">${HD.ARM_TASKS.map(t => `<button class="ar-fr task" data-aact="hArm" data-id="${a.id}" data-v="${t[0]}">${esc(t[1])}</button>`).join('')}</div></div>`).join('')}

    ${sec('Журнал дома', String(h.log.length))}
    <div class="ar-log">${h.log.slice(0, 25).map(l => `<div class="ar-lg ${esc(l.kind)}"><span>${esc(l.at || '')}</span><p>${esc(l.t)}</p></div>`).join('') || empty('Тихо.')}</div>`;
}

// ───────────── защитный контур ─────────────

const GZ = {
    net: '<g class="gz-draw"><path d="M150 40 V12"/><path d="M142 18 a12 12 0 0 1 16 0 M137 12 a19 19 0 0 1 26 0"/></g><rect class="gz-hit" x="128" y="2" width="44" height="38"/>',
    roof: '<rect class="gz-fill" x="66" y="40" width="208" height="20"/><text x="232" y="54">крыша</text>',
    windows: '<rect class="gz-hit" x="128" y="64" width="138" height="152"/>' + [0, 1, 2].flatMap(r => [0, 1, 2].map(c => `<rect class="gz-fill" x="${140 + c * 42}" y="${72 + r * 51}" width="22" height="30" rx="2"/>`)).join(''),
    door: '<rect class="gz-hit" x="98" y="166" width="38" height="54"/><rect class="gz-fill" x="110" y="182" width="16" height="34"/><text x="113" y="178">дверь</text>',
    stairs: '<rect class="gz-fill" x="70" y="60" width="40" height="220"/>' + [0, 1, 2, 3, 4, 5, 6].map(i => `<path class="gz-line" d="M74 ${268 - i * 30} l32 -18"/>`).join('') + '<text x="74" y="74">подъезд</text>',
    shop: '<rect class="gz-fill" x="110" y="220" width="160" height="60"/><path class="gz-line" d="M110 232 h160"/>' + [0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path class="gz-awn" d="M${110 + i * 20} 220 v12"/>`).join('') + '<text x="150" y="262">лавка Марко</text>',
    fire: '<rect class="gz-hit" x="268" y="62" width="40" height="164"/><path class="gz-line" d="M272 80 h30 M272 133 h30 M272 186 h30 M302 80 l-30 53 M272 133 l30 53 M302 186 l-20 34"/><text x="276" y="74">пож. л.</text>',
    street: '<rect class="gz-fill" x="0" y="282" width="360" height="12"/><text x="6" y="279">улица</text>',
};
function buildingSvg(h, g) {
    const sel = ui.gZone || g.zone || '';
    const armedIn = (z) => HD.DEVICES.some(d => g.armed[d.id] && d.tier <= g.level && (d.zones.includes(z) || d.zones.includes('all')));
    return `<svg class="ar-bld lv-${g.level}" viewBox="0 0 360 296" aria-hidden="true">
        <rect class="bld" x="110" y="60" width="160" height="160"/><path class="bld-fl" d="M110 113 h160 M110 166 h160"/>
        ${['roof', 'windows', 'stairs', 'shop', 'fire', 'door', 'net', 'street'].map(z => `<g class="gz st-${h.zones[z] || 'ok'}${sel === z ? ' sel' : ''}${armedIn(z) ? ' armed' : ''}" data-aact="gZone" data-v="${z}">${GZ[z]}</g>`).join('')}
    </svg>`;
}

function gridHtml(e) {
    const h = HM.H();
    const g = GR.G();
    const L = GR.levelOf(g.level);
    const zone = ui.gZone || g.zone || Object.entries(h.zones).find(([, v]) => v === 'breach')?.[0] || '';
    const devs = GR.devicesFor(zone);
    const breach = HD.ZONES.filter(z => h.zones[z[0]] !== 'ok');
    const lastEv = h.events.find(ev => ev.kind !== 'clean');
    const r = g.last;
    return `${head('Защитный контур')}
    ${breach.length ? `<div class="ar-alarm${breach.some(z => h.zones[z[0]] === 'breach') ? ' bad' : ''}">${SHIELD(breach.some(z => h.zones[z[0]] === 'breach') ? 'breach' : 'alert')}<div><b>${breach.map(z => esc(z[1])).join(', ')}</b><span>${lastEv ? esc(lastEv.text) : 'тревога выставлена вручную'}</span></div></div>` : '<p class="ar-mute small">Вторжений нет. Контур можно взвести заранее — модель будет знать, что квартира ощетинилась.</p>'}
    ${buildingSvg(h, g)}
    <div class="ar-chips">${HD.ZONES.map(z => `<button class="ar-fr zone st-${h.zones[z[0]]}${zone === z[0] ? ' on' : ''}" data-aact="gZone" data-v="${z[0]}">${esc(z[1])}</button>`).join('')}</div>

    ${sec('Нарушитель')}
    <input class="ar-in wide" data-aset="gIntruder" placeholder="кто лезет: двое в тактике, «Красная Заря», неизвестный…" value="${esc(g.intruder)}">
    ${seg('gCls', g.cls, HD.INTRUDERS.map(x => [x[0], x[1]]))}

    ${sec('Уровень контура', esc(L[2]))}
    <div class="ar-levels">${HD.GRID_LEVELS.map(l => `<button class="ar-lvl c-${l[3]}${l[0] === g.level ? ' on' : ''}" data-aact="gLevel" data-v="${l[0]}"><b>${l[0]}</b><span>${esc(l[1])}</span></button>`).join('')}</div>
    ${g.confirm ? `<div class="ar-ban">${ic('lock')}<span>Арт: «Протокол „Каракурт“. Вы уверены? Под нами Марко, а в спальне — ваша кошка». Нажми «Каракурт» ещё раз.</span></div>` : ''}

    ${sec('Кто дома (свой-чужой)')}
    <div class="ar-chips">${HD.GRID_WHO.map(([k, l]) => `<button class="ar-fr who${g.who[k] ? ' on' : ''}" data-aact="gWho" data-v="${k}">${esc(l)}</button>`).join('')}</div>

    ${sec(zone ? `Устройства · ${HM.zoneName(zone)}` : 'Все устройства', `${devs.filter(d => g.armed[d.id] && d.tier <= g.level).length} взведено`)}
    <div class="ar-devs">${devs.map(d => {
        const bl = GR.blocked(d), wn = GR.warnOf(d);
        const can = d.tier <= g.level;
        const on = can && g.armed[d.id];
        const am = d.ammo == null ? '∞' : `${g.ammo[d.id] ?? d.ammo}/${d.ammo}`;
        return `<button class="ar-dev t${d.tier}${on ? ' on' : ''}${can ? '' : ' locked'}${bl ? ' blk' : ''}" data-aact="gDev" data-v="${d.id}">
            <i class="sw"></i><b>${esc(d.name)}</b><em class="tier">${'▮'.repeat(d.tier)}</em><em class="am">${esc(am)}</em>
            ${bl || wn || !can ? `<small>${esc(bl || (!can ? `нужен уровень ${d.tier}` : wn))}</small>` : ''}</button>`;
    }).join('')}</div>

    <div class="ar-row">${btn('gFire', `${ic('zap')} Применить${zone ? ` · ${esc(HM.zoneName(zone))}` : ''}`, '', 'primary wide fire')}</div>
    <div class="ar-row wrap">${btn('gStand', 'Снять контур', '', 'ghost sm')}${btn('gReload', `${ic('refresh')} Перезарядить`, '', 'ghost sm')}</div>
    <div class="ar-row wrap">${HD.GRID_ACTIONS.map(a => btn('gAct', esc(a[1]), `data-v="${a[0]}" title="${esc(a[2])}"`, 'ghost sm')).join('')}</div>

    ${r ? `${sec('Последнее срабатывание', esc(r.at))}<div class="ar-out out-${r.out === 'down' || r.out === 'back' ? 'win' : r.out === 'held' ? 'part' : 'boom'}"><b>${esc(r.oname)}</b><p>${esc(r.zn)} · «${esc(r.lname)}» · ${esc(r.devices.join(', '))}</p><p>«${esc(r.line)}»</p><span>d20 ${r.roll} + ${r.bonus} ${r.mod >= 0 ? '+' : '−'} ${Math.abs(r.mod)} (${esc(r.cls.toLowerCase())}) = ${r.sum}</span>${r.mishap ? `<p class="ar-mute small">${esc(r.mishap)}</p>` : ''}${r.police ? '<p class="ar-mute small">Соседи звонят в NYPD.</p>' : ''}</div>` : ''}
    <div class="ar-kv"><div><span>Ущерб</span><p>$${g.dmg.toLocaleString('ru-RU')}${g.dmg ? ' · счёт уйдёт Пеппер' : ''}</p></div><div><span>Шум · лавка Марко</span><p>${g.noise} · ${g.marco ? `задета ×${g.marco}` : 'цела'}</p></div></div>
    ${sec('Журнал контура', String(g.log.length))}
    <div class="ar-log">${g.log.map(l => `<div class="ar-lg ${esc(l.kind)}"><span>${esc(l.at)}</span><p>${esc(l.t)}</p></div>`).join('') || empty('Тихо.')}</div>`;
}

const tog2 = (act, label, on) => `<button class="ar-tog${on ? ' on' : ''}" data-aact="${act}"><i></i><span>${esc(label)}</span></button>`;

// ───────────── Гидра (скрытый слой, Щ.И.Т. 2014) ─────────────

function hydraHtml(e) {
    ui.hydraSeen = true;
    const h = C.M().hydra;
    return `${head('Гидра · скрытый слой')}
    <p class="ar-mute small">Под видом резервного копирования. Если в комнату вошёл кто-то лишний — закрой окно.</p>
    <div class="ar-panel">
        <label class="ar-form one">Легенда «дочь Пирса» · ${C.clamp(h.legend)}%<input type="range" min="0" max="100" step="5" data-aset="hydra.legend" value="${C.clamp(h.legend)}"></label>
        <label class="ar-form one">Доверие Пирса · ${C.clamp(h.pierce)}%<input type="range" min="0" max="100" step="5" data-aset="hydra.pierce" value="${C.clamp(h.pierce)}"></label>
    </div>
    ${sec('Заметки', btn('addHydra', ic('plus'), '', 'ico sm'))}
    <div class="ar-log">${(h.notes || []).map(n => `<div class="ar-lg"><span>${esc(n.at || '')}</span><p>${esc(n.t)}</p><button class="ar-ico" data-aact="delHydra" data-id="${esc(n.id)}">${ic('x')}</button></div>`).join('') || empty('Чисто.')}</div>`;
}

// ───────────── сам Арт: голос, лента, настройки ─────────────

function arturHtml(e) {
    const c = C.cfg();
    const m = C.M();
    const ideas = m.ideas.filter(x => (x.era || 'aim') === e.id && !x.used);
    return `${head(e.artur ? 'А.Р.Т.У.Р.' : 'Настройки')}
    ${e.artur ? `${sec('Когда Арт влезает сам')}${seg('cfgInit', c.init, Object.entries(D.INIT).map(([k, v]) => [k, v[1]]))}
    ${sec('Когда модель слышит его голос')}${seg('cfgPresent', c.present, [['auto', 'на базе и по имени'], ['always', 'всегда'], ['off', 'никогда']])}
    ${ideas.length ? `${sec('Задумки Арта', String(ideas.length))}<div class="ar-list">${ideas.map(x => `<div class="ar-shot"><span>${esc(x.text)}</span><span>${btn('ideaGo', ic('zap'), `data-id="${esc(x.id)}"`, 'ico sm')}${btn('ideaDel', ic('x'), `data-id="${esc(x.id)}"`, 'ico sm')}</span></div>`).join('')}</div>` : ''}
    ${sec('Голос')}<textarea class="ar-ta" rows="6" data-aset="cfg.voice">${esc(C.voice())}</textarea>
    <div class="ar-row end">${btn('resetVoice', 'Как было', '', 'sm ghost')}</div>` : ''}
    ${sec(`Лор эпохи «${e.name}» для модели`)}<textarea class="ar-ta" rows="5" data-aset="cfg.lore">${esc(C.eraLore(e))}</textarea>
    <div class="ar-row end">${btn('resetLore', 'Как было', '', 'sm ghost')}</div>
    ${sec('Эпоха')}${seg('cfgEra', c.eraMode, [['auto', 'по дате Horae'], ...C.eras().map(x => [x.id, x.name])])}
    <details class="ar-det"><summary>Границы эпох</summary><div class="ar-form">${C.eras().map(x => `<label>${esc(x.name)}<input type="date" data-aset="cfg.eraStart" data-era="${x.id}" value="${esc(x.start)}"></label>`).join('')}</div></details>
    ${sec('Разное')}
    <div class="ar-toggles">
        ${tog('autoRemark', 'Арт здоровается раз в игровой день', c.autoRemark)}
        ${tog('autoScan', 'Радар сам раз в игровой день', c.autoScan)}
        ${tog('chron', 'Летописец следит за лабой и операциями', c.chron)}
        ${tog('stones', `Камни в Хеди в эпохе «${e.name}»`, e.stones)}
        ${tog('fx', 'Анимации', c.fx)}
    </div>
    <label class="ar-form one">Шарик садится на % в игровой час<input type="number" min="0" max="20" data-aset="cfg.sharikDrain" value="${esc(c.sharikDrain)}"></label>
    ${sec('Лента', String(C.feedOf(e).length))}<div class="ar-feed">${C.feedOf(e).map(feedRow).join('') || empty('Пусто.')}</div>
    ${C.feedOf(e).length ? `<div class="ar-row end">${btn('clearFeed', 'Очистить ленту', '', 'sm ghost danger')}</div>` : ''}`;
}
const tog = (k, label, on) => `<button class="ar-tog${on ? ' on' : ''}" data-aact="tog" data-v="${k}"><i></i><span>${esc(label)}</span></button>`;

// ───────────── модалки и формы ─────────────

function paintModal(force = false) {
    const box = document.querySelector('#ar-app .ar-modal');
    if (!box) return;
    if (!ui.modal) { box.classList.remove('on'); box.innerHTML = ''; ui.painted = null; return; }
    // форму с набранным текстом не перерисовываю на каждый чих — только когда меняю её сама
    if (!force && ui.modal.kind === 'form' && ui.painted === ui.modal && box.querySelector('[data-fk]')) return;
    ui.painted = ui.modal;
    let html = '';
    if (ui.modal.kind === 'dice') html = diceHtml();
    else if (ui.modal.kind === 'file') { const f = C.files().find(x => x.id === ui.modal.id); html = f ? fileModal(f) : ''; }
    else if (ui.modal.kind === 'zoom') html = `<button class="ar-zoom" data-aact="closeModal"><img src="${esc(ui.modal.src)}" alt=""></button>`;
    else if (ui.modal.kind === 'form') html = formHtml(ui.modal);
    box.innerHTML = `<div class="ar-sheet ${esc(ui.modal.kind)}">${html}</div>`;
    box.classList.add('on');
}
function closeModal() { ui.modal = null; ui.dice = null; paintModal(); }

function form(title, fields, onSave, ai = '') { ui.modal = { kind: 'form', title, fields, onSave, ai }; paintModal(); setTimeout(() => document.querySelector('#ar-app .ar-sheet input, #ar-app .ar-sheet textarea')?.focus(), 60); }
function formHtml(f) {
    return `<div class="ar-mh"><b>${esc(f.title)}</b><button class="ar-ico" data-aact="closeModal">${ic('x')}</button></div>
    <div class="ar-form">${f.fields.map(x => {
        const v = x.value ?? '';
        const n = `data-fk="${esc(x.k)}"`;
        let inp;
        if (x.type === 'area') inp = `<textarea ${n} rows="${x.rows || 3}" placeholder="${esc(x.ph || '')}">${esc(v)}</textarea>`;
        else if (x.type === 'select') inp = `<select ${n}>${x.opts.map(([ov, ol]) => `<option value="${esc(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select>`;
        else inp = `<input ${n} type="${x.type || 'text'}" value="${esc(v)}" placeholder="${esc(x.ph || '')}">`;
        return `<label>${esc(x.label)}${inp}</label>`;
    }).join('')}</div>
    <div class="ar-row">${f.ai ? btn('formAI', ic('sparkles'), 'title="Заполнить из истории по названию"', 'ico ghost') : ''}${btn('formSave', `${ic('check')} Сохранить`, '', 'primary wide')}</div>
    ${f.ai ? '<p class="ar-mute small">✦ — впиши название, и Арт подтянет остальное из истории.</p>' : ''}`;
}
function formVals() {
    const out = {};
    document.querySelectorAll('#ar-app .ar-sheet [data-fk]').forEach(el => { out[el.dataset.fk] = el.value; });
    return out;
}
const listOf = (s) => String(s || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
const people = () => [...new Set([...C.cast(), ...C.lifePeople().map(x => x.name)])];

function projectForm(p) {
    const isNew = !p;
    form(isNew ? 'Новый проект' : 'Проект', [
        { k: 'name', label: 'Название', value: p?.name || '', ph: 'Модель распада энергии Камней' },
        { k: 'field', label: 'Область', type: 'select', value: p?.field || 'other', opts: D.FIELDS },
        { k: 'team', label: 'Кто работает (через запятую)', value: (p?.team || []).join(', '), ph: people().slice(0, 4).join(', ') },
        { k: 'note', label: 'Суть', type: 'area', value: p?.note || '', ph: 'что делаем и зачем' },
        { k: 'bans', label: 'Запреты и условия', type: 'area', rows: 2, value: p?.bans || '', ph: 'Баретт: никаких перегрузок до 12 недели' },
    ], (v) => {
        const rec = { name: v.name.trim() || 'Без названия', field: v.field, team: listOf(v.team), note: v.note.trim(), bans: v.bans.trim() };
        if (isNew) { const np = C.addProject(rec); ui.id = np.id; ui.app = 'lab'; } else { Object.assign(p, rec); C.save(); }
    }, 'project');
}
function opForm(o) {
    const isNew = !o;
    form(isNew ? 'Новая операция' : 'Операция', [
        { k: 'name', label: 'Название', value: o?.name || '', ph: 'Амстердам' },
        { k: 'goal', label: 'Цель', type: 'area', rows: 2, value: o?.goal || '' },
        { k: 'where', label: 'Где', value: o?.where || '' },
        { k: 'when', label: 'Когда', value: o?.when || '', ph: '28.12, утро' },
        { k: 'team', label: 'Состав (через запятую)', value: (o?.team || []).join(', ') },
    ], (v) => {
        const rec = { name: v.name.trim() || 'Без названия', goal: v.goal.trim(), where: v.where.trim(), when: v.when.trim(), team: listOf(v.team) };
        if (isNew) { const no = C.addOp(rec); ui.id = no.id; ui.app = 'ops'; } else { Object.assign(o, rec); C.save(); }
    }, 'op');
}
function baseForm(b) {
    const isNew = !b;
    form(isNew ? 'Новый объект' : 'Объект', [
        { k: 'name', label: 'Название', value: b?.name || '' },
        { k: 'kind', label: 'Что это', value: b?.kind || '', ph: 'убежище, склад, лаборатория' },
        { k: 'who', label: 'Кто там', value: b?.who || '' },
        { k: 'keys', label: 'По каким словам места понять, что сцена здесь', value: (b?.keys || []).join(', ') },
        { k: 'note', label: 'Описание', type: 'area', value: b?.note || '' },
    ], (v) => {
        const rec = { name: v.name.trim() || 'Объект', kind: v.kind.trim(), who: v.who.trim(), keys: listOf(v.keys), note: v.note.trim() };
        if (isNew) { const nb = { id: C.uid(), status: 'ok', img: '', ...rec }; C.bases().push(nb); ui.id = nb.id; ui.app = 'bases'; } else Object.assign(b, rec);
        C.save();
    });
}
function fileForm(f) {
    const isNew = !f;
    form(isNew ? 'Новая папка' : 'Папка', [
        { k: 'name', label: 'Название', value: f?.name || '' },
        { k: 'kind', label: 'Тип', type: 'select', value: f?.kind || 'archive', opts: [['archive', 'Архив'], ['protocol', 'Протокол']] },
        { k: 'lock', label: 'Доступ', type: 'select', value: f?.lock ? '1' : '', opts: [['', 'Открыта'], ['1', 'Под замком']] },
        { k: 'keys', label: 'Ключевые слова (откроется сама)', value: (f?.keys || []).join(', ') },
        { k: 'text', label: 'Содержимое', type: 'area', rows: 6, value: f?.text || '' },
    ], (v) => {
        const rec = { name: v.name.trim() || 'Папка', kind: v.kind, lock: !!v.lock, keys: listOf(v.keys), text: v.text.trim() };
        if (isNew) C.files().push({ id: C.uid(), ...rec }); else Object.assign(f, rec);
        C.save();
    });
}

// ───────────── набор текста ─────────────

function typeIn(root) {
    const el = root.querySelector('.ar-type[data-full]');
    if (!el) return;
    const full = el.dataset.full;
    if (ui.typed.has(full) || !C.cfg().fx) { el.textContent = full; ui.typed.add(full); return; }
    ui.typed.add(full);
    let i = 0;
    const step = () => {
        if (!el.isConnected) return;
        i = Math.min(full.length, i + 2);
        el.textContent = full.slice(0, i);
        if (i < full.length) setTimeout(step, 16);
    };
    step();
}

// ───────────── авто (приветствие и радар раз в игровой день) ─────────────

async function maybeAuto() {
    const c = C.cfg();
    const e = C.era();
    const k = C.clock();
    const m = C.M();
    const day = k.day || k.mes;
    if (c.autoRemark && e.artur && C.remarkOf(e)?.day !== day && !busy('remark')) run('remark', () => C.remark());
    if (c.autoScan && e.id !== 'none' && m.scan?.[e.id] !== day && !busy('scan')) run('scan', () => C.scan());
}

async function run(key, fn, ok) {
    if (busy(key)) return;
    ui.busy.add(key);
    renderSoon();
    try { const r = await fn(); if (ok) ok(r); } catch (err) { C.toast('warning', esc(String(err?.message || err))); } finally { ui.busy.delete(key); renderSoon(); }
}

// ───────────── строчка в «Сцене» Life ─────────────

export function sceneHtml() {
    const c = C.cfg();
    if (!c.on) return '';
    const e = C.era();
    if (e.id === 'none') return '';
    const chips = [`<button class="lf-chip" data-aact="open">${ic(e.skin === 'paper' ? 'folder' : 'brain')} ${esc(e.artur ? 'А.Р.Т.У.Р.' : 'Картотека')}</button>`];
    for (const o of C.ops().filter(x => x.status === 'live')) chips.push(`<button class="lf-chip warn" data-aact="open" data-app="ops" data-id="${esc(o.id)}">${ic('target')} ${esc(C.cut(o.name, 22))}</button>`);
    const n = C.shots().length;
    if (n) chips.push(`<button class="lf-chip" data-aact="open">${ic('zap')} ждёт ответа: ${n}</button>`);
    return `<div class="lf-chips wrap">${chips.join('')}</div>`;
}

// ───────────── клики ─────────────

export async function onClick(ev) {
    const el = ev.target.closest('[data-aact]');
    if (!el) {
        if (ui.modal && ev.target.classList?.contains('ar-modal')) closeModal();
        return;
    }
    const inApp = !!el.closest('#ar-app');
    const act = el.dataset.aact;
    if (!inApp && act !== 'open') return;
    ev.preventDefault();
    ev.stopPropagation();
    const id = el.dataset.id;
    const v = el.dataset.v;
    const m = C.M();
    const after = () => { C.save(); try { C.A?.updatePrompt?.(); } catch { /* */ } render(); };
    switch (act) {
        case 'open': open(el.dataset.app || null, id || null); return;
        case 'close': close(); return;
        case 'home': go(null); return;
        case 'go': go(el.dataset.app || null, id || null); return;
        case 'closeModal': closeModal(); return;
        case 'zoom': ui.modal = { kind: 'zoom', src: el.dataset.src }; paintModal(); return;
        case 'formAI': {
            const f = ui.modal;
            if (!f?.ai) return;
            const vals = formVals();
            for (const x of f.fields) if (vals[x.k] !== undefined) x.value = vals[x.k];
            if (busy('formAI')) return;
            ui.busy.add('formAI');
            el.innerHTML = '<span class="ar-spin"></span>';
            try {
                const res = await H.formFill(f.ai, vals);
                let n = 0;
                for (const x of f.fields) if (res[x.k] && (!String(vals[x.k] || '').trim() || (x.k === 'field' && vals[x.k] === 'other'))) { x.value = res[x.k]; n++; }
                C.toast('info', n ? `Подтянул полей: ${n}` : 'В истории про это ничего нового');
            } catch (err) { C.toast('warning', esc(String(err?.message || err))); }
            ui.busy.delete('formAI');
            paintModal(true);
            return;
        }
        case 'hist': {
            const fn = { ops: H.extractOps, lab: H.extractLab, med: H.extractMed, bases: H.extractBases, files: H.extractFiles }[v];
            if (!fn) return;
            run(`hist:${v}`, () => fn(), (r) => {
                const msg = typeof r === 'number' ? (r ? `Обновлено записей: ${r}` : 'Нового в истории нет') : (r.added || r.updated ? `Новых: ${r.added} · обновлено: ${r.updated}` : 'Нового в истории нет');
                C.toast('info', msg);
            });
            return;
        }
        case 'histOne': {
            const kind = el.dataset.kind;
            const obj = kind === 'op' ? C.opById(id) : C.projectById(id);
            if (!obj) return;
            run(`one:${id}`, () => (kind === 'op' ? H.fillOp(obj) : H.fillProject(obj)), (n) => C.toast('info', n ? `Дополнено: ${n}` : 'Нового в истории нет'));
            return;
        }
        case 'findPeople': run('people', () => DS.findPeople(), (n) => C.toast('info', n ? `Новых дел: ${n}` : 'Все, кто есть в лоре, уже в картотеке')); return;
        case 'formSave': { const f = ui.modal; if (!f?.onSave) return; f.onSave(formVals()); closeModal(); after(); return; }

        // рабочий стол
        case 'remark': run('remark', () => C.remark(true)); return;
        case 'say': { const t = C.remarkOf()?.text; if (!t) return; C.arm('init', `[АРТУР сам, в этом ответе, скажет Хеди примерно это (своими словами, коротко, в сцене): «${t}»]`); C.toast('success', 'Арт скажет это в следующем ответе'); render(); return; }
        case 'disarm': C.disarm(Number(id)); render(); return;

        // лаборатория
        case 'newProject': projectForm(null); return;
        case 'editProject': projectForm(C.projectById(id)); return;
        case 'delProject': { if (!confirm('Удалить проект вместе с журналом?')) return; m.projects = m.projects.filter(p => p.id !== id); ui.id = null; after(); return; }
        case 'setStage': { const p = C.projectById(id); if (!p) return; p.stage = Number(v); p.pct = p.stage >= 4 ? 100 : 0; C.labLog(p, `Стадия вручную: ${D.STAGES[p.stage]}`, 'stage'); after(); return; }
        case 'pct': { const p = C.projectById(id); if (!p) return; C.bump(p, Number(v)); after(); return; }
        case 'drawProject': { const p = C.projectById(id); if (!p) return; run(`drawProject:${id}`, () => C.drawBlueprint(p)); return; }
        case 'dice': { const p = C.projectById(id); if (!p) return; ui.dice = { pid: id, mods: C.modsFor(p), own: 0, result: null, rolling: false }; ui.modal = { kind: 'dice' }; paintModal(); return; }
        case 'mod': { const d = ui.dice; if (!d) return; d.mods[Number(v)].on = !d.mods[Number(v)].on; d.result = null; paintModal(); return; }
        case 'modAdd': { const d = ui.dice; if (!d) return; d.own = Math.max(-6, Math.min(6, d.own + Number(v))); d.result = null; paintModal(); return; }
        case 'roll': startRoll(); return;
        case 'expScene': case 'expQuiet': { const r = ui.dice?.result; if (!r) return; C.applyExp(r, act === 'expScene'); closeModal(); C.toast('success', act === 'expScene' ? 'Исход уйдёт модели в следующем ответе' : 'Записано в журнал'); after(); return; }
        case 'addLog': {
            const tgt = el.dataset.kind === 'op' ? C.opById(id) : C.projectById(id);
            if (!tgt) return;
            form('Запись в журнал', [{ k: 't', label: 'Что произошло', type: 'area', rows: 3 }], (vals) => { if (!vals.t.trim()) return; if (el.dataset.kind === 'op') C.opLog(tgt, vals.t.trim()); else C.labLog(tgt, vals.t.trim()); });
            return;
        }
        case 'keep': { const tgt = el.dataset.kind === 'op' ? C.opById(id) : C.projectById(id); if (tgt) delete tgt.fresh; after(); return; }

        // операции
        case 'newOp': opForm(null); return;
        case 'editOp': opForm(C.opById(id)); return;
        case 'delOp': { if (!confirm('Удалить операцию?')) return; m.ops = m.ops.filter(o => o.id !== id); ui.id = null; after(); return; }
        case 'opStatus': { const o = C.opById(id); if (!o || o.status === v) return; o.status = v; C.opLog(o, `Статус: ${C.statusName(v)}`, 'status'); after(); return; }
        case 'opRisk': { const o = C.opById(id); if (!o) return; o.risk = Number(v); after(); return; }
        case 'brief': { const o = C.opById(id); if (o) run(`brief:${id}`, () => C.brief(o)); return; }
        case 'report': { const o = C.opById(id); if (o) run(`report:${id}`, () => C.report(o)); return; }
        case 'briefScene': { const o = C.opById(id); if (!o?.brief) return; C.arm('brief', `[Брифинг операции «${o.name}» в этом ответе: ${C.era().artur ? 'Арт выводит голограмму и докладывает' : 'в штабе раскладывают карты и докладывают'} — коротко, по сути, своими словами. Суть: ${C.cut(o.brief.replace(/\s+/g, ' '), 700)}]`, { key: o.id }); C.toast('success', 'Брифинг будет в следующем ответе'); render(); return; }

        // досье
        case 'newPerson': form('Новое дело', [{ k: 'name', label: 'Имя' }, { k: 'post', label: 'Назначение' }], (vals) => { const n = vals.name.trim(); if (!n) return; const d = DS.rec(n); d.post = vals.post.trim(); ui.app = 'dossier'; ui.id = n; }); return;
        case 'delPerson': { const ed = m.dossier[C.era().id] || {}; delete ed[id]; ui.id = null; after(); return; }
        case 'dsGroup': ui.dgroup = v; render(); return;
        case 'dsPaper': { const c = C.cfg(); c.filePaper = c.filePaper || {}; const eid = C.era().id; c.filePaper[eid] = !c.filePaper[eid]; C.saveCfg(); render(); return; }
        case 'dsEdit': dossierForm(id); return;
        case 'dsFill': case 'dsRefill': {
            if (act === 'dsRefill' && !confirm('Перезаполнить всё дело из лора? Правки руками перетрутся.')) return;
            const x = C.dossierList().find(y => y.name === id);
            run(`fill:${id}`, () => DS.fill(id, x?.person, act === 'dsRefill'), (r) => C.toast('info', r.n ? `Заполнено полей: ${r.n} (источников: ${r.found})` : 'Новых данных в лоре нет'));
            return;
        }
        case 'dsAuthor': ui.author = v; render(); return;
        case 'dsAssess': {
            const x = C.dossierList().find(y => y.name === id);
            const au = DS.authorsOf().find(a => a[0] === ui.author) || DS.authorsOf()[0];
            run(`assess:${id}`, () => DS.assess(id, x?.person, au[0]), () => C.toast('info', `${C.esc(au[1])}: оценка в деле`));
            return;
        }
        case 'dsAssessDel': { if (!confirm('Удалить оценку?')) return; const d = DS.rec(id); d.assess = d.assess.filter(a => a.id !== v); after(); return; }
        case 'dsAssessScene': { const a = DS.rec(id).assess.find(x => x.id === v); if (!a) return; DS.assessScene(id, a); C.toast('success', 'Оценка всплывёт в следующем ответе'); render(); return; }
        case 'dsScene': DS.fileScene(id); C.toast('success', 'Дело окажется на столе в следующем ответе'); render(); return;
        case 'dsThreat': { const d = DS.rec(id); d.threat = Number(v); after(); return; }
        case 'dsLogAdd': form(`Запись в дело: ${id}`, [{ k: 't', label: 'Что произошло', type: 'area', rows: 3 }], (vals) => { if (vals.t.trim()) DS.addLog(id, vals.t.trim()); }); return;
        case 'dsLogDel': { const d = DS.rec(id); d.log = d.log.filter(l => l.id !== v); after(); return; }
        case 'reveal': el.classList.toggle('on'); return;

        // радар
        case 'scan': run('scan', () => C.scan(), (n) => C.toast('info', `Новых сигналов: ${n}`)); return;
        case 'seenAll': C.signals().forEach(s => { s.seen = true; }); after(); return;
        case 'sigSeen': { const s = m.radar.find(x => x.id === id); if (s) s.seen = !s.seen; after(); return; }
        case 'sigDel': m.radar = m.radar.filter(x => x.id !== id); after(); return;
        case 'sigScene': { const s = m.radar.find(x => x.id === id); if (!s) return; s.seen = true; C.arm('signal', `[${C.era().artur ? 'Радар А.И.М.' : 'Разведка'}: в этом ответе органично всплывает — ${s.title}${s.text ? `: ${s.text}` : ''}. Через звонок, сообщение, новость, доклад${C.era().artur ? ' Арта' : ''} или слух; героев за них не решай.]`, { key: s.id }); C.toast('success', 'Всплывёт в следующем ответе'); after(); return; }
        case 'newSignal': form('Новый сигнал', [
            { k: 'title', label: 'Что', ph: 'Всплеск энергии над Вундагором' },
            { k: 'kind', label: 'Тип', type: 'select', value: 'intel', opts: D.THREAT_KINDS },
            { k: 'lvl', label: 'Уровень', type: 'select', value: '1', opts: [['1', 'фон'], ['2', 'внимание'], ['3', 'тревога']] },
            { k: 'where', label: 'Где' },
            { k: 'text', label: 'Подробности', type: 'area' },
        ], (vals) => { if (!vals.title.trim()) return; C.addSignal({ title: vals.title.trim(), kind: vals.kind, lvl: Number(vals.lvl) || 1, where: vals.where.trim(), text: vals.text.trim() }); }); return;
        case 'rollPast': { const p = C.rollPast(); C.toast(p ? 'warning' : 'info', p ? `Шевельнулось: ${p.name}` : 'Кубик молчит: одна линия уже идёт'); after(); return; }
        case 'pastSt': { m.past[id] = { ...(m.past[id] || {}), state: v, at: C.clock().date }; after(); return; }
        case 'pastScene': { const p = D.PAST.find(x => x.id === id); if (!p) return; C.arm('past', `[Прошлое нагоняет — ${p.name} (${p.who}): ${p.hint} В этом ответе — только знак, органично и логично задним числом; за Хеди не решать, всю линию не вываливать.]`, { key: p.id }); C.toast('success', 'Знак будет в следующем ответе'); render(); return; }

        // медблок
        case 'tremor': m.med.tremor = !m.med.tremor; after(); return;
        case 'openZ': close(); setTimeout(() => { try { SillyTavern.getContext().executeSlashCommandsWithOptions?.('/zr'); } catch { /* */ } }, 260); return;
        case 'newPatient': form('Пациент', [{ k: 'name', label: 'Кто' }, { k: 'note', label: 'Что с ним', type: 'area', rows: 2 }], (vals) => { if (!vals.name.trim()) return; m.patients.unshift({ id: C.uid(), era: C.era().id, name: vals.name.trim(), state: 'hurt', note: vals.note.trim(), at: C.clock().date, src: 'me' }); }); return;
        case 'patSt': { const p = m.patients.find(x => x.id === id); if (p) p.state = v; after(); return; }
        case 'patDel': m.patients = m.patients.filter(x => x.id !== id); after(); return;
        case 'addMedNote': form('Заметка', [{ k: 't', label: 'Текст', type: 'area', rows: 3 }], (vals) => { if (!vals.t.trim()) return; m.med.notes = m.med.notes || []; m.med.notes.unshift({ id: C.uid(), era: C.era().id, t: vals.t.trim(), at: C.clock().date }); }); return;
        case 'delMedNote': m.med.notes = (m.med.notes || []).filter(n => n.id !== id); after(); return;

        // базы
        case 'newBase': baseForm(null); return;
        case 'editBase': baseForm(C.bases().find(b => b.id === id)); return;
        case 'delBase': { if (!confirm('Убрать объект?')) return; const l = C.bases(); const i = l.findIndex(b => b.id === id); if (i >= 0) l.splice(i, 1); ui.id = null; after(); return; }
        case 'baseSt': { const b = C.bases().find(x => x.id === id); if (b) b.status = v; after(); return; }
        case 'drawBase': { const b = C.bases().find(x => x.id === id); if (b) run(`drawBase:${id}`, () => C.drawBase(b)); return; }

        // файлы
        case 'file': ui.modal = { kind: 'file', id }; paintModal(); return;
        case 'fileLock': { const f = C.files().find(x => x.id === id); if (!f) return; f.lock = !f.lock; if (!f.lock) f.opened = C.clock().date; C.save(); paintModal(); render(); return; }
        case 'newFile': fileForm(null); return;
        case 'editFile': fileForm(C.files().find(x => x.id === id)); return;
        case 'delFile': { if (!confirm('Удалить папку?')) return; const l = C.files(); const i = l.findIndex(f => f.id === id); if (i >= 0) l.splice(i, 1); closeModal(); after(); return; }

        // Шарик
        case 'pCare': { const t = P.care(v); C.toast('info', esc(t)); after(); return; }
        case 'pJob': { const r = P.job(v); if (r) C.toast(r.res === 'ok' ? 'success' : r.res === 'refuse' ? 'warning' : 'info', esc(r.text)); after(); return; }
        case 'pAntic': C.toast('info', esc(P.antic())); after(); return;
        case 'pWith': P.setWith(v === '1'); after(); return;
        case 'pAcc': P.setAcc(v); after(); return;
        case 'gZone': ui.gZone = ui.gZone === v ? '' : v; GR.G().zone = ui.gZone; C.save(); render(); return;
        case 'gOpen': ui.gZone = v; GR.G().zone = v; C.save(); go('home', 'grid'); return;
        case 'gCls': GR.G().cls = v; C.save(); render(); return;
        case 'gLevel': { const r = GR.setLevel(Number(v)); if (r === 'confirm') C.toast('warning', 'Арт: «Протокол „Каракурт“. Нажмите ещё раз, если вы серьёзно».'); after(); return; }
        case 'gWho': GR.setWho(v); after(); return;
        case 'gDev': { if (!GR.toggleDev(v)) C.toast('info', 'Сначала подними уровень контура'); after(); return; }
        case 'gFire': {
            const r = GR.fire(ui.gZone);
            if (r.none) { C.toast('warning', r.zone ? `Нечем: в зоне «${esc(HM.zoneName(r.zone))}» ничего не взведено` : 'Контур не взведён'); return; }
            C.toast(r.out === 'through' ? 'warning' : 'success', `${esc(r.oname)}. Уйдёт в следующий ответ.`);
            after(); return;
        }
        case 'gStand': GR.stand(); after(); return;
        case 'gReload': GR.reload(); C.toast('info', 'Перезаряжено'); after(); return;
        case 'gAct': { const t = GR.action(v); C.toast('success', esc(t)); after(); return; }
        case 'homeScene': C.cfg().homeScene = !HM.sceneOn(); C.saveCfg(); render(); return;
        case 'hMode': HM.setMode(v); after(); return;
        case 'hDnd': HM.setDnd(!HM.H().dnd); after(); return;
        case 'hZone': HM.cycleZone(v); after(); return;
        case 'hCheck': { const ev = HM.checkPerimeter(); C.toast(ev.kind === 'breach' ? 'warning' : 'info', esc(ev.text)); after(); return; }
        case 'hClear': HM.allClear(); after(); return;
        case 'hEvScene': { const ev = HM.H().events.find(x => x.id === id); if (ev) { HM.eventScene(ev); C.toast('success', 'Арт доложит в следующем ответе'); } render(); return; }
        case 'hBrew': case 'hBrewForce': { const r = HM.brew(v, act === 'hBrewForce'); if (r.refused) { ui.refused = v; ui.refusedText = r.text; } else { ui.refused = null; C.toast('info', esc(r.text)); } after(); return; }
        case 'hBrewCancel': ui.refused = null; render(); return;
        case 'hCupTaken': HM.cupTaken(); after(); return;
        case 'hOut': HM.fridgeOut(Number(v)); after(); return;
        case 'hGot': HM.shopGot(Number(v)); after(); return;
        case 'hAdd': { const inp = document.getElementById('ar-fridge-in'); HM.fridgeAdd(inp?.value); after(); return; }
        case 'hOven': HM.oven(!HM.H().oven.on, HM.H().oven.on ? null : 180); after(); return;
        case 'hOvenT': HM.oven(true, HM.H().oven.t + Number(v)); after(); return;
        case 'hClim': HM.setClimateMode(v); after(); return;
        case 'hTemp': HM.setTemp(id, Number(v)); after(); return;
        case 'hFloor': HM.toggleFloor(); after(); return;
        case 'hLight': HM.setLight(v); after(); return;
        case 'hMusic': HM.setMusic(v); after(); return;
        case 'hWash': HM.laundryStart(document.getElementById('ar-lau')?.value || 'daily'); after(); return;
        case 'hDry': HM.laundryDry(); after(); return;
        case 'hWater': HM.water(); C.toast('info', 'Фиалки политы'); after(); return;
        case 'hFeed': HM.feedCat(); C.toast('info', `${esc(HM.H().cat.name)} накормлена и делает вид, что впервые за неделю`); after(); return;
        case 'hFind': C.toast('info', `${esc(HM.H().cat.name)}: ${esc(HM.findCat())}`); after(); return;
        case 'hDrones': C.toast('info', esc(HM.drones())); after(); return;
        case 'hArm': { const r = HM.armTask(id, v); if (r) C.toast(r.res === 'fail' ? 'warning' : 'info', esc(r.text)); after(); return; }
        case 'hArmName': { const a = HM.H().arms.find(x => x.id === id); if (!a) return; form('Лапа', [{ k: 'name', label: 'Имя', value: a.name }, { k: 'place', label: 'Где висит', value: a.place }], (vals) => { HM.renameArm(id, vals.name); if (vals.place.trim()) a.place = vals.place.trim(); }); return; }

        // Гидра
        case 'addHydra': form('Заметка', [{ k: 't', label: 'Текст', type: 'area', rows: 3 }], (vals) => { if (!vals.t.trim()) return; m.hydra.notes.unshift({ id: C.uid(), t: vals.t.trim(), at: C.clock().date }); }); return;
        case 'delHydra': m.hydra.notes = m.hydra.notes.filter(n => n.id !== id); after(); return;

        // настройки
        case 'cfgInit': C.cfg().init = v; C.saveCfg(); render(); return;
        case 'cfgPresent': C.cfg().present = v; C.saveCfg(); after(); return;
        case 'cfgEra': C.cfg().eraMode = v; C.saveCfg(); ui.app = 'artur'; after(); return;
        case 'tog': {
            const c = C.cfg();
            if (v === 'stones') { const e = C.era(); c.stones[e.id] = !e.stones; } else c[v] = !c[v];
            C.saveCfg(); after(); return;
        }
        case 'resetVoice': C.cfg().voice = ''; C.saveCfg(); after(); return;
        case 'resetLore': delete C.cfg().lore[C.era().id]; C.saveCfg(); after(); return;
        case 'clearFeed': { if (!confirm('Очистить ленту этой эпохи?')) return; const eid = C.era().id; m.feed = m.feed.filter(f => (f.era || 'aim') !== eid); after(); return; }
        case 'ideaGo': { const x = m.ideas.find(i => i.id === id); if (!x) return; x.used = true; C.arm('init', `[АРТУР сам, в этом ответе: ${x.text}. Одна-две реплики его голосом, по делу.]`); C.toast('success', 'Арт сделает это в следующем ответе'); after(); return; }
        case 'ideaDel': m.ideas = m.ideas.filter(i => i.id !== id); after(); return;
        default: return;
    }
}

// ───────────── поля ─────────────

export function onInput(ev) {
    const el = ev.target.closest?.('#ar-app [data-aset]');
    if (!el) return;
    const k = el.dataset.aset;
    if (k === 'filter') {
        ui.filter = el.value;
        const pos = el.selectionStart;
        render();
        const n = document.querySelector('#ar-app .ar-search');
        if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch { /* */ } }
        return;
    }
    if (el.type === 'range') {
        const lab = el.closest('label');
        const t = lab?.firstChild;
        if (t?.nodeType === 3) t.textContent = t.textContent.replace(/\d+(?=%?\s*$)/, el.value);
    }
}

export function onChange(ev) {
    const el = ev.target.closest?.('#ar-app [data-aset]');
    if (!el) return;
    const k = el.dataset.aset;
    const v = el.value;
    const m = C.M();
    const c = C.cfg();
    if (k === 'dsPhoto') {
        const file = el.files?.[0];
        const who = el.dataset.who;
        if (!file || !C.A?.uploadImage) return;
        run(`photo:${who}`, async () => { const path = await C.A.uploadImage(await C.A.fileToJpeg(file, 1000), 'artur_file'); DS.rec(who).photo = path; C.save(); });
        return;
    }
    if (k === 'gIntruder') { GR.G().intruder = String(v).trim(); C.save(); return; }
    if (k.startsWith('dossier.')) { const d = DS.rec(el.dataset.who); const f = k.slice(8); d[f] = ['stress', 'loyalty'].includes(f) ? C.clamp(v) : v; C.save(); return; }
    switch (k) {
        case 'med.stones': m.med.stones = C.clamp(v); break;
        case 'med.arm.pct': m.med.arm = { ...(m.med.arm || {}), pct: C.clamp(v) }; break;
        case 'med.arm.note': m.med.arm = { ...(m.med.arm || {}), note: v }; break;
        case 'hydra.legend': m.hydra.legend = C.clamp(v); break;
        case 'hydra.pierce': m.hydra.pierce = C.clamp(v); break;
        case 'cfg.voice': c.voice = v.trim() === D.VOICE.trim() ? '' : v; C.saveCfg(); break;
        case 'cfg.lore': { const e = C.era(); if (v.trim() === (D.LORE[e.id] || '').trim()) delete c.lore[e.id]; else c.lore[e.id] = v; C.saveCfg(); break; }
        case 'cfg.eraStart': { const id = el.dataset.era; const base = D.eraById(id)?.start; if (!v || v === base) delete c.eraStart[id]; else c.eraStart[id] = v; C.saveCfg(); break; }
        case 'cfg.sharikDrain': c.sharikDrain = Math.max(0, Math.min(20, Number(v) || 0)); C.saveCfg(); break;
        default: return;
    }
    C.save();
    try { C.A?.updatePrompt?.(); } catch { /* */ }
    if (!k.startsWith('cfg.voice') && !k.startsWith('cfg.lore') && k !== 'med.arm.note') renderSoon();
}
