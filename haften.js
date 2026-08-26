// ─── Låtbok — häften (låturval per kör) ───

export const ALL_SONGS_ID = '__alla';

const ID_RE = /^[a-z0-9_-]+$/;

export function parseHaftenIndex(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(h =>
      h && typeof h.id === 'string' && ID_RE.test(h.id) && h.id !== ALL_SONGS_ID &&
      typeof h.namn === 'string' && h.namn !== ''
    )
    .map(h => ({ id: h.id, namn: h.namn }));
}

export function resolveHaftId(haften, urlId, savedId) {
  const finns = id => haften.some(h => h.id === id);
  if (urlId && finns(urlId)) return urlId;
  if (savedId && finns(savedId)) return savedId;
  return haften.length > 0 ? haften[0].id : null;
}

export function haftenForSong(haftLists, filename) {
  return Object.keys(haftLists).filter(id => haftLists[id].includes(filename));
}

export function withSongInHaften(haftLists, filename, valdaIds) {
  const out = {};
  for (const [id, lista] of Object.entries(haftLists)) {
    const skaIngå = valdaIds.includes(id);
    const ingårRedan = lista.includes(filename);
    if (skaIngå && !ingårRedan) out[id] = [...lista, filename];
    else if (!skaIngå && ingårRedan) out[id] = lista.filter(f => f !== filename);
    else out[id] = [...lista];
  }
  return out;
}

// Gör ett häftes-id av ett fritt namn: "Demestkören 2" → "demestkoren-2".
export function slugifyHaftId(namn) {
  const slug = String(namn ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // ta bort diakriter: å/ä → a, ö → o
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'haft';
}

// Lägger till -2, -3 … tills id:t är ledigt. ALL_SONGS_ID är alltid upptaget.
export function uniqueHaftId(base, taken) {
  const upptagna = new Set([...taken, ALL_SONGS_ID]);
  if (!upptagna.has(base)) return base;
  let n = 2;
  while (upptagna.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// Flyttar ett element i en lista. Ogiltiga index ger en oförändrad kopia.
export function moveInList(list, from, to) {
  const out = [...list];
  if (from < 0 || from >= out.length || to < 0 || to >= out.length || from === to) return out;
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}
