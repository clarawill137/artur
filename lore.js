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

/** Все записи всех лорбуков. memories: false — без памяти сцен, 'only' — только память. */
export async function entries(memories = false) {
    const out = [];
    for (const b of await bookNames()) {
        const data = await loadBook(b);
        for (const e of Object.values(data?.entries || {})) {
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
