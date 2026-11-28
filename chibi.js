// ✦ Шарик на экране (0.7). Её слова 28.11: «Насчёт чиби-питомца тоже прикол. Можно сделать милого Шарика с разными
// эмоциями. Чисто визуал». И про 1943: «Фриц-Секач подходит».
// Маленький Шарик живёт по краю экрана над полем ввода: ездит, сидит, засыпает, его можно перетащить — отпустишь,
// упадёт и встанет (движок состояний — по мотивам Chibi Mafia Boss, код и рисунок свои, SVG). Своих механик нет:
// настроение он берёт у Арта (заряд, обида, грязь, скрип, «периметр нарушен») и у сцены Life (тон, ночь по Horae,
// Хеди ранена, близость — отворачивается). Тап — пискнет, долгий тап — откроет Шарика в Арте. В 1940-х Шарика ещё нет —
// вместо него бегает Фриц-Секач, овчарка коммандос из Дома. Модель ничего этого не видит.

let C = null, P = null, getApi = () => null, openArt = () => {};
let host = null, timer = null, emo = '', mode = '', x = null, busy = false, hidden = false, poked = 0, walkTo = null, lastWalk = 0;

export function initChibi(o) {
    C = o.C; P = o.P; getApi = o.getApi || getApi; openArt = o.openArt || openArt;
    if (timer) return;
    timer = setInterval(tick, 4000);
    // открыт комп Арта или хаб Life — Шарик прячется, чтобы не висеть поверх (дёшево, раз в 0,8 с)
    setInterval(() => { if (host && host.style.display !== 'none' && covered()) host.style.display = 'none'; else if (host && host.style.display === 'none' && on() && !covered()) tick(); }, 800);
    document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (!hidden) tick(); });
    setTimeout(tick, 1500);
}

const on = () => { try { return C.cfg().chibi !== false && C.cfg().on !== false && !C.asleep(); } catch { return false; } };
const covered = () => !!document.querySelector('#ar-app.on') || [...document.querySelectorAll('#lf-app')].some(e => e.offsetParent !== null || e.getClientRects().length > 0);

// ───────────── что он чувствует ─────────────

/** Эмоция: из Арта и сцены Life. Порядок — от важного к фону. */
export function feel() {
    const api = getApi();
    const k = (() => { try { return C.clock(); } catch { return {}; } })();
    const dog = Number.isFinite(k.year) && k.year < 1960;
    let s = null, mood = null;
    try { s = P.S(); mood = C.sharikMood(s); } catch { /* */ }
    let scene = null;
    try { scene = api?.senses?.mood?.() || null; } catch { /* */ }
    const me = (() => { try { return api?.ctx?.()?.name1 || 'Хеди'; } catch { return 'Хеди'; } })();
    let hurt = 0;
    try { hurt = Number(api?.senses?.hurt?.(me)?.lvl) || 0; } catch { /* */ }
    const h = Number.isFinite(k.hour) ? k.hour : null;
    const night = h !== null && (h >= 23 || h < 6);
    const tone = scene?.manual || scene?.auto || '';
    const pick = (e, why) => ({ e, why, dog });
    if (mood?.mood === 'напуган') return pick('perimeter', 'периметр нарушен');
    if (hurt >= 2) return pick('scared', `${me} ранена`);
    if (mood?.mood === 'сел') return pick('off', 'сел заряд');
    if (night) return pick('sleep', 'ночь — спит на зарядке');
    if (scene?.intimOn) return pick('shy', 'у них близость — отвернулся');
    if (mood?.mood === 'обижен') return pick('offended', 'обиделся');
    if (mood?.mood === 'вялый') return pick('tired', 'почти сел, ищет розетку');
    if (tone === 'danger' || tone === 'fight') return pick('alarm', tone === 'fight' ? 'ссора — тревожится' : 'опасно');
    if (tone === 'drama' || tone === 'tension') return pick('worry', 'тяжёлая сцена');
    if (mood?.mood === 'чумазый') return pick('dirty', 'чумазый');
    if (mood?.mood === 'скрипит') return pick('squeak', 'скрипит');
    if (tone === 'tender' || tone === 'comfort') return pick('love', 'нежность');
    if (tone === 'passion' || tone === 'rough') return pick('shy', 'жарко — смущён');
    if (tone === 'fun' || tone === 'play') return pick('happy', 'весело');
    if (mood?.mood === 'скучает') return pick('bored', 'скучает');
    if (h !== null && h >= 6 && h < 10 && (Number(s?.love) || 0) >= 50) return pick('coffee', 'утро — несёт кофе');
    if (mood?.mood === 'счастлив') return pick(Math.random() < 0.3 ? 'proud' : 'happy', 'счастлив');
    return pick(Math.random() < 0.5 ? 'curious' : 'neutral', 'просто живёт');
}

// ───────────── рисунок ─────────────

const CY = '#7fe6ff';
const eyes = {
    neutral: `<circle cx="28" cy="30.5" r="2.4" fill="${CY}"/><circle cx="36" cy="30.5" r="2.4" fill="${CY}"/><path d="M30 35.2 H34" stroke="${CY}" stroke-width="1.4" stroke-linecap="round"/>`,
    curious: `<circle cx="28" cy="30.5" r="2.2" fill="${CY}"/><circle cx="36.3" cy="30" r="3.2" fill="${CY}"/><circle cx="32" cy="35.4" r="1.2" fill="none" stroke="${CY}" stroke-width="1.1"/>`,
    happy: `<path d="M25.6 31.6 Q28 28 30.4 31.6 M33.6 31.6 Q36 28 38.4 31.6" fill="none" stroke="${CY}" stroke-width="1.8" stroke-linecap="round"/><path d="M29 34.4 Q32 37.2 35 34.4" fill="none" stroke="${CY}" stroke-width="1.4" stroke-linecap="round"/>`,
    offended: `<path d="M25.8 29.4 L30 31.2 M38.2 29.4 L34 31.2" stroke="${CY}" stroke-width="1.8" stroke-linecap="round"/><path d="M29.4 35.6 H34.6" stroke="${CY}" stroke-width="1.4" stroke-linecap="round"/>`,
    bored: `<path d="M25.8 31 H30.2 M33.8 31 H38.2" stroke="${CY}" stroke-width="1.8" stroke-linecap="round"/><circle cx="28" cy="32.2" r="1" fill="${CY}"/><circle cx="36" cy="32.2" r="1" fill="${CY}"/><path d="M30 35.6 H34" stroke="${CY}" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>`,
    scared: `<circle cx="28" cy="30.4" r="3.4" fill="none" stroke="${CY}" stroke-width="1.3"/><circle cx="36" cy="30.4" r="3.4" fill="none" stroke="${CY}" stroke-width="1.3"/><circle cx="28" cy="30.4" r="1" fill="${CY}"/><circle cx="36" cy="30.4" r="1" fill="${CY}"/><path d="M29 36 l1.5 -1 l1.5 1 l1.5 -1 l1.5 1" fill="none" stroke="${CY}" stroke-width="1.1"/>`,
    worry: `<path d="M25.8 27.6 L29.6 28.8 M38.2 27.6 L34.4 28.8" stroke="${CY}" stroke-width="1.2" stroke-linecap="round"/><circle cx="28" cy="31" r="1.6" fill="${CY}"/><circle cx="36" cy="31" r="1.6" fill="${CY}"/><path d="M29.4 35.8 Q32 34.2 34.6 35.8" fill="none" stroke="${CY}" stroke-width="1.3" stroke-linecap="round"/>`,
    sleep: `<path d="M25.8 31 Q28 33 30.2 31 M33.8 31 Q36 33 38.2 31" fill="none" stroke="${CY}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`,
    tired: `<path d="M25.8 30.4 H30.2 M33.8 30.4 H38.2" stroke="${CY}" stroke-width="1.6" stroke-linecap="round"/><rect x="29" y="33.6" width="6" height="3" rx=".8" fill="none" stroke="#ffb74d" stroke-width=".9"/><rect x="29.6" y="34.2" width="1.4" height="1.8" fill="#ffb74d"/>`,
    love: `<path d="M28 33 l-2.6 -2.6 a1.5 1.5 0 0 1 2.6 -1.6 a1.5 1.5 0 0 1 2.6 1.6 Z M36 33 l-2.6 -2.6 a1.5 1.5 0 0 1 2.6 -1.6 a1.5 1.5 0 0 1 2.6 1.6 Z" fill="#ff8fc7"/><path d="M30 35.4 Q32 36.8 34 35.4" fill="none" stroke="#ff8fc7" stroke-width="1.2" stroke-linecap="round"/>`,
    perimeter: `<path d="M32 26.2 V32.4" stroke="#ff5a5a" stroke-width="2.4" stroke-linecap="round"/><circle cx="32" cy="35.6" r="1.4" fill="#ff5a5a"/>`,
    off: '',
};
eyes.proud = eyes.happy;
eyes.coffee = eyes.happy;
eyes.dirty = eyes.neutral;
eyes.squeak = `<circle cx="28" cy="30.5" r="2.4" fill="${CY}"/><path d="M33.8 30.6 H38.2" stroke="${CY}" stroke-width="1.8" stroke-linecap="round"/><path d="M30 35.2 H34" stroke="${CY}" stroke-width="1.4" stroke-linecap="round"/>`;
eyes.alarm = eyes.worry;
eyes.shy = `<path d="M25.8 31.2 Q28 29.6 30.2 31.2 M33.8 31.2 Q36 29.6 38.2 31.2" fill="none" stroke="${CY}" stroke-width="1.5" stroke-linecap="round"/>`;

const ACC = {
    santa: '<path d="M19 16.5 L33 3.5 L45 15.5 Z" fill="#d8353b"/><rect x="17" y="14.2" width="30" height="4.2" rx="2.1" fill="#f4f1ec"/><circle cx="33" cy="3.6" r="2.6" fill="#f4f1ec"/>',
    bow: '<path d="M40 14.5 l-6 -4 v8 Z M40 14.5 l6 -4 v8 Z" fill="#ff8fc7"/><circle cx="40" cy="14.5" r="1.8" fill="#e86aa8"/>',
    scarf: '<path d="M14.5 41.5 Q32 47 49.5 41.5 L49 45.6 Q32 51 15 45.6 Z" fill="#e2b33c"/><path d="M42 45 l2.4 7 l3 -1.4 l-1.8 -6.6 Z" fill="#e2b33c"/><path d="M17 43.4 Q32 48.4 47 43.4" fill="none" stroke="#2b2b2b" stroke-width=".8" stroke-dasharray="2 2"/>',
    lamp: '<path d="M14 19 Q32 9 50 19" fill="none" stroke="#3a3f4a" stroke-width="2.4"/><circle cx="32" cy="12.6" r="2.8" fill="#ffe082" stroke="#3a3f4a" stroke-width="1"/><path d="M34.5 12 L60 3 L60 22 Z" fill="rgba(255, 236, 160, .22)"/>',
    sticker: '<rect x="45" y="27" width="7" height="5" rx="1" fill="#f4f1ec" transform="rotate(14 48 29)"/><path d="M46.4 28 l4 3 M50.4 28 l-4 3" stroke="#d8353b" stroke-width=".9" transform="rotate(14 48 29)"/>',
};

const LED = { perimeter: '#ff5a5a', alarm: '#ffc107', worry: '#ffc107', scared: '#ff5a5a', love: '#ff8fc7', sleep: '#3b6b7a', off: '#222', tired: '#ffb74d' };

function robotSvg(e, acc) {
    const led = LED[e] || '#68f0a0';
    const screen = e === 'perimeter' ? '#3a0b10' : e === 'off' ? '#050608' : '#0b1724';
    const armsUp = e === 'shy';
    const arms = armsUp
        ? '<rect x="18.4" y="22" width="13" height="16" rx="5.5" fill="#cfd8e3" stroke="#9fb4c8" stroke-width="1"/><rect x="32.6" y="22" width="13" height="16" rx="5.5" fill="#cfd8e3" stroke="#9fb4c8" stroke-width="1"/>'
        : '<rect x="8.5" y="31" width="6" height="11" rx="3" fill="#cfd8e3" stroke="#9fb4c8" stroke-width="1" transform="rotate(18 11.5 36)"/><rect x="49.5" y="31" width="6" height="11" rx="3" fill="#cfd8e3" stroke="#9fb4c8" stroke-width="1" transform="rotate(-18 52.5 36)"/>';
    const spots = e === 'dirty' ? '<circle cx="23" cy="42" r="2.2" fill="#7b5a3c" opacity=".75"/><circle cx="43" cy="39" r="1.6" fill="#7b5a3c" opacity=".7"/><circle cx="38" cy="46" r="1.2" fill="#3a2f2a" opacity=".6"/>' : '';
    const cheeks = e === 'shy' || e === 'love' ? '<ellipse cx="21" cy="38" rx="2.6" ry="1.4" fill="#ff8fc7" opacity=".55"/><ellipse cx="43" cy="38" rx="2.6" ry="1.4" fill="#ff8fc7" opacity=".55"/>' : '';
    const sparks = e === 'squeak' ? '<g class="ar-ch-spark"><path d="M8 50 l3 -2 l-1 3 l3 -2" fill="none" stroke="#ffd54f" stroke-width="1.1"/><path d="M53 49 l3 -2 l-1 3 l3 -2" fill="none" stroke="#ffd54f" stroke-width="1.1"/></g>' : '';
    const cup = e === 'coffee' ? '<g transform="translate(0 -2)"><rect x="26.5" y="6" width="9" height="8" rx="1.6" fill="#f4f1ec" stroke="#8a6a4a" stroke-width=".8"/><path d="M35.5 8 q3 0 3 2.4 t-3 2.4" fill="none" stroke="#8a6a4a" stroke-width=".9"/><path class="ar-ch-steam" d="M29 4 q-1 -2 0 -4 M32.5 4 q-1 -2 0 -4" fill="none" stroke="rgba(255,255,255,.6)" stroke-width=".8"/></g>' : '';
    const cable = e === 'sleep' ? '<path d="M50 44 Q58 50 61 60" fill="none" stroke="#2a2f38" stroke-width="1.6"/><rect x="59" y="58" width="4" height="4" rx="1" fill="#2a2f38"/>' : '';
    return `<svg viewBox="0 0 64 64" class="ar-ch-svg" aria-hidden="true">
        <defs><radialGradient id="arChG" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#f6f9fc"/><stop offset=".7" stop-color="#cdd7e2"/><stop offset="1" stop-color="#a9b8c8"/></radialGradient></defs>
        <ellipse cx="32" cy="61.2" rx="17" ry="2.4" fill="rgba(0,0,0,.28)"/>
        ${cable}
        <g class="ar-ch-tracks"><rect x="12" y="48" width="40" height="11" rx="5.5" fill="#363b46"/><circle cx="18.5" cy="53.5" r="3" fill="#5a6271"/><circle cx="32" cy="53.5" r="3" fill="#5a6271"/><circle cx="45.5" cy="53.5" r="3" fill="#5a6271"/></g>
        ${sparks}
        <g class="ar-ch-torso">
            ${armsUp ? '' : arms}
            <circle cx="32" cy="32" r="19" fill="url(#arChG)" stroke="#9fb4c8" stroke-width="1.2"/>
            ${spots}
            <circle cx="24" cy="15.6" r="1.9" fill="${led}" class="ar-ch-led"/><circle cx="40" cy="15.6" r="1.9" fill="${led}" class="ar-ch-led b"/>
            <rect x="20" y="22" width="24" height="17" rx="6" fill="${screen}"/>
            <g class="ar-ch-face">${eyes[e] ?? eyes.neutral}</g>
            ${cheeks}
            ${armsUp ? arms : ''}
            ${ACC[acc] || ''}
            ${cup}
        </g>
    </svg>`;
}

/** Фриц-Секач: овчарка коммандос. Эмоций меньше — собака честнее робота. */
function dogSvg(e) {
    const mood = ['sleep', 'tired', 'off', 'bored'].includes(e) ? 'sleep'
        : ['scared', 'worry', 'perimeter', 'alarm'].includes(e) ? 'alert'
            : ['offended', 'dirty', 'squeak', 'shy'].includes(e) ? 'sad' : 'happy';
    const ears = mood === 'sad'
        ? '<path d="M21 20 L13 13 L24 14 Z M43 20 L51 13 L40 14 Z" fill="#3b2a1e"/>'
        : '<path d="M21 19 L17 3 L28 13 Z M43 19 L47 3 L36 13 Z" fill="#3b2a1e"/><path d="M21.5 15.5 L19.5 7.5 L25.5 13 Z M42.5 15.5 L44.5 7.5 L38.5 13 Z" fill="#7a5638"/>';
    const eyesDog = mood === 'sleep'
        ? '<path d="M24.5 24 Q26.5 26 28.5 24 M35.5 24 Q37.5 26 39.5 24" fill="none" stroke="#1d140e" stroke-width="1.4" stroke-linecap="round"/>'
        : `<circle cx="26.5" cy="23.6" r="${mood === 'alert' ? 2.4 : 1.9}" fill="#1d140e"/><circle cx="37.5" cy="23.6" r="${mood === 'alert' ? 2.4 : 1.9}" fill="#1d140e"/><circle cx="27.1" cy="23" r=".6" fill="#fff"/><circle cx="38.1" cy="23" r=".6" fill="#fff"/>`;
    const tongue = mood === 'happy' ? '<path d="M30.4 34.2 Q32 39 33.6 34.2 Z" fill="#ef7f8f"/>' : '';
    const hearts = e === 'love' ? '<path class="ar-ch-heart" d="M50 12 l-2.4 -2.4 a1.4 1.4 0 0 1 2.4 -1.5 a1.4 1.4 0 0 1 2.4 1.5 Z" fill="#ff8fc7"/>' : '';
    return `<svg viewBox="0 0 64 64" class="ar-ch-svg dog" aria-hidden="true">
        <ellipse cx="32" cy="61.2" rx="17" ry="2.4" fill="rgba(0,0,0,.28)"/>
        <path class="ar-ch-tail" d="M45 50 Q56 46 55 36" fill="none" stroke="#a8743f" stroke-width="4.2" stroke-linecap="round"/>
        <ellipse cx="32" cy="48" rx="15" ry="11.5" fill="#c8924f"/>
        <ellipse cx="34" cy="43.5" rx="11" ry="6" fill="#3b2a1e" opacity=".9"/>
        <ellipse cx="25" cy="58" rx="4.2" ry="2.6" fill="#d9a865"/><ellipse cx="39" cy="58" rx="4.2" ry="2.6" fill="#d9a865"/>
        ${ears}
        <circle cx="32" cy="25" r="12.5" fill="#c8924f"/>
        <path d="M23 27 Q32 21 41 27 Q41 35 32 36.5 Q23 35 23 27 Z" fill="#3b2a1e" opacity=".55"/>
        <ellipse cx="32" cy="31" rx="6.2" ry="4.6" fill="#e2b27a"/>
        <ellipse cx="32" cy="28.6" rx="2.2" ry="1.6" fill="#1d140e"/>
        <path d="M32 30.2 V32.2 M32 32.2 Q30 33.6 28.6 32.6 M32 32.2 Q34 33.6 35.4 32.6" fill="none" stroke="#1d140e" stroke-width=".9" stroke-linecap="round"/>
        ${tongue}
        ${eyesDog}
        ${hearts}
    </svg>`;
}

// ───────────── на экране ─────────────

const SAY = {
    neutral: ['бип', 'би-бип?', '…бип'], curious: ['би-и-ип?', 'бип?'], happy: ['♪ бип-бип', 'бип!'], proud: ['бип-бип-бип!'],
    offended: ['…', 'хмф. бип.'], bored: ['би…п', 'бип. бип. бип.'], scared: ['БИП!', 'и-и-ип!'], worry: ['бип?..', 'би-ип…'],
    alarm: ['бип! бип!'], sleep: ['хр-р… бип'], tired: ['би…', 'розетка…'], love: ['♥ бип', 'би-и-ип ♥'], dirty: ['бип (липко)'],
    squeak: ['скри-и-ип'], shy: ['…бип', '(отвернулся)'], coffee: ['кофе! бип!'], perimeter: ['ПЕРИМЕТР!', 'БИП-БИП-БИП'], off: ['…'],
};
const DOG_SAY = { happy: ['Гав!', 'вуф'], sleep: ['хр-р…'], alert: ['Р-р-гав!'], sad: ['у-у…'] };
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function mount() {
    if (host && document.body.contains(host)) return host;
    host = document.createElement('div');
    host.id = 'ar-chibi';
    host.innerHTML = '<div class="ar-ch-bubble"></div><div class="ar-ch-sprite"></div>';
    document.body.append(host);
    try { const sx = Number(C.cfg().chibiX); if (Number.isFinite(sx)) x = sx; } catch { /* */ }
    bindDrag(host);
    return host;
}

function baseBottom() {
    const f = document.getElementById('form_sheld') || document.getElementById('send_form');
    const h = f ? Math.max(0, window.innerHeight - f.getBoundingClientRect().top) : 70;
    return Math.min(window.innerHeight - 90, h + 6);
}
const maxX = () => Math.max(10, window.innerWidth - 66);
function place() {
    if (!host) return;
    if (!Number.isFinite(x)) x = 12;
    x = Math.max(4, Math.min(maxX(), x));
    host.style.left = `${x}px`;
    if (!busy) host.style.bottom = `${baseBottom()}px`;
}

function draw(f) {
    const acc = (() => { try { return P.S().acc || 'none'; } catch { return 'none'; } })();
    const svg = f.dog ? dogSvg(f.e) : robotSvg(f.e, acc);
    const sprite = host.querySelector('.ar-ch-sprite');
    if (sprite.dataset.sig !== `${f.dog}|${f.e}|${acc}`) { sprite.innerHTML = svg; sprite.dataset.sig = `${f.dog}|${f.e}|${acc}`; }
    host.dataset.emo = f.e;
    host.classList.toggle('dog', !!f.dog);
    host.title = f.dog ? `Фриц-Секач — ${f.why}` : `Шарик — ${f.why}`;
}

function say(t, ms = 1600) {
    const b = host?.querySelector('.ar-ch-bubble');
    if (!b) return;
    b.textContent = t;
    b.classList.add('on');
    clearTimeout(b._t);
    b._t = setTimeout(() => b.classList.remove('on'), ms);
}

function tick() {
    if (!on() || !document.body || covered()) { if (host) host.style.display = 'none'; return; }
    if (hidden) return;
    mount();
    host.style.display = '';
    if (busy) return;
    const f = feel();
    if (Date.now() - poked < 5000) f.e = f.dog ? f.e : (f.e === 'off' || f.e === 'sleep' ? f.e : 'happy');
    emo = f.e;
    draw(f);
    // ходить — когда не спит, не выключен и не прячется
    const still = ['sleep', 'off', 'tired', 'shy', 'offended'].includes(emo);
    const now = Date.now();
    if (!still && now - lastWalk > 12000 + Math.random() * 14000) {
        lastWalk = now;
        walkTo = 10 + Math.random() * (maxX() - 10);
        setMode(emo === 'scared' || emo === 'perimeter' ? 'run' : 'walk');
        const dist = Math.abs(walkTo - (x ?? 12));
        host.style.transition = `left ${Math.max(0.6, dist / (mode === 'run' ? 220 : 70))}s linear`;
        host.classList.toggle('flip', walkTo < (x ?? 12));
        x = walkTo;
        place();
        clearTimeout(host._w);
        host._w = setTimeout(() => { host.style.transition = ''; setMode(Math.random() < 0.35 ? 'sit' : 'idle'); }, Math.max(600, dist / (mode === 'run' ? 220 : 70) * 1000));
    } else if (!mode || still) {
        setMode(emo === 'sleep' || emo === 'off' ? 'sleep' : 'idle');
        place();
    } else place();
}

function setMode(m) {
    mode = m;
    if (host) host.dataset.mode = m;
}

function bindDrag(el) {
    let sx = 0, sy = 0, ox = 0, moved = false, press = null, down = false;
    const up = (ev) => {
        if (!down) return;
        down = false;
        clearTimeout(press);
        if (moved) {
            setMode('fall');
            el.style.transition = 'bottom .35s cubic-bezier(.5, 0, .9, .6)';
            busy = false;
            place();
            try { C.cfg().chibiX = Math.round(x); C.saveCfg(); } catch { /* */ }
            setTimeout(() => { el.style.transition = ''; setMode('idle'); say(f0().dog ? 'вуф!' : 'бип!'); }, 420);
        } else if (press !== 'long') {
            poked = Date.now();
            const f = f0();
            say(f.dog ? pick(DOG_SAY[['sleep', 'tired', 'off', 'bored'].includes(emo) ? 'sleep' : 'happy']) : pick(SAY[emo] || SAY.neutral));
            el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop');
            draw({ ...f, e: f.dog ? f.e : (['off', 'sleep'].includes(f.e) ? f.e : 'happy') });
        }
        ev?.stopPropagation?.();
    };
    el.addEventListener('pointerdown', (ev) => {
        down = true; moved = false; sx = ev.clientX; sy = ev.clientY; ox = Number.isFinite(x) ? x : 12;
        press = setTimeout(() => { if (!moved && down) { press = 'long'; down = false; openArt('sharik'); } }, 600);
        try { el.setPointerCapture(ev.pointerId); } catch { /* */ }
        ev.stopPropagation();
    });
    el.addEventListener('pointermove', (ev) => {
        if (!down) return;
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!moved && Math.hypot(dx, dy) < 6) return;
        if (!moved) { moved = true; clearTimeout(press); busy = true; el.style.transition = ''; setMode('drag'); }
        x = Math.max(4, Math.min(maxX(), ox + dx));
        el.style.left = `${x}px`;
        el.style.bottom = `${Math.max(8, baseBottom() - dy)}px`;
        ev.preventDefault();
    });
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('click', (ev) => ev.stopPropagation(), true);
}
const f0 = () => { try { return feel(); } catch { return { e: 'neutral', dog: false, why: '' }; } };
window.addEventListener('resize', () => place());

/** Рисунок без экрана — для галереи и проверки. */
export const chibiSvg = (e, acc = 'none', dog = false) => (dog ? dogSvg(e) : robotSvg(e, acc));
