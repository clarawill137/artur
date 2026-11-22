// ✦ А.Р.Т.У.Р. — доступ к лорбукам таверны (с кэшем) и памяти сцен STMemoryBooks.

const str = (v) => (typeof v === 'string' ? v.trim() : '');

export const isMemory = (e) => !!e?.stmemorybooks || /^\s*\d{1,4}\s*[-–—.:]\s*\S/.test(e?.comment || '');

let wiMod = null;
export async function wi() {
    if (wiMod !== null) return wiMod;
    try { wiMod = await import('/scripts/world-info.js'); } catch { wiMod = false; }
    return wiMod;
}

const cache = new Map();
export async function loadBook(name) {
    const hit = cache.get(name);
    if (hit && Date.now() - hit.t < 5 * 60e3) return hit.data;
    const c = SillyTavern.getContext();
    let data = null;
    try { data = typeof c.loadWorldInfo === 'function' ? await c.loadWorldInfo(name) : await (await wi())?.loadWorldInfo?.(name); } catch { /* */ }
    cache.set(name, { t: Date.now(), data });
    return data;
}

export async function bookNames() {
    const m = await wi();
    return [...(m?.world_names || [])];
}

/**
 * Записи книги, которые видно из этого чата: ядро «Священный таймлайн» отрезает книги чужих эпох, будущее по дате
 * и чужие секреты — то же, что видит модель. Без ядра или вне мира — все.
 */
async function eraView(book, list) {
    const v = globalThis.SacredTimeline?.visible;
    if (typeof v !== 'function') return list;
    try { return await v(list, book); } catch { return list; }
}

/** Все записи всех лорбуков (видные из этой эпохи). memories: false — без памяти сцен, 'only' — только память. */
export async function entries(memories = false) {
    const out = [];
    for (const b of await bookNames()) {
        const data = await loadBook(b);
        for (const e of await eraView(b, Object.values(data?.entries || {}))) {
            if (!e || e.disable || !str(e.content)) continue;
            const mem = isMemory(e);
            if (memories === 'only' ? !mem : memories === false && mem) continue;
            out.push({ book: b, e, mem });
        }
    }
    return out;
}

/** Память сцен (STMB), новые первыми. */
export async function memories() {
    const list = await entries('only');
    const num = (x) => Number(x.e.STMB_end ?? x.e.STMB_start ?? (String(x.e.comment || '').match(/^\s*(\d{1,4})/)?.[1]) ?? x.e.uid ?? 0);
    return list.sort((a, b) => num(b) - num(a));
}

/**
 * Карточка человека для этого чата: та, которой он представлен в чате (ядро: people[имя].card), иначе карточка
 * его облика на дату чата (Реестр), иначе первая по имени. У одного человека бывает по карточке на эпоху.
 */
export async function cardFor(name, match) {
    const chars = SillyTavern.getContext().characters || [];
    const ST = globalThis.SacredTimeline;
    try {
        const cx = ST?.context?.();
        const p = cx?.people || {};
        const k = Object.keys(p).find(n => p[n]?.card && match(n));
        const here = k && chars.find(x => x?.avatar === p[k].card);
        if (here) return here;
        if (cx?.era && typeof ST.sliceAt === 'function') {
            const r = await ST.sliceAt(name, cx.date || cx.era.from);
            const reg = r?.slice ? await ST.registry?.() : null;
            const g = Object.values(reg?.entries || {}).map(e => e?.gc).find(x => x?.type === 'identity' && x.id === r.identity);
            const av = (g?.slices || []).find(x => x.id === r.slice)?.card;
            const mine = av && chars.find(x => x?.avatar === av);
            if (mine) return mine;
        }
    } catch { /* без ядра */ }
    return chars.find(x => x?.name && match(x.name)) || null;
}
