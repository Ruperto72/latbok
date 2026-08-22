// ─── Körhäftet — häften (låturval per kör) ───

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
