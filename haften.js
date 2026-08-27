// ─── Låtbok — häften (låturval per kör) ───

export const ALL_SONGS_ID = '__alla';

// Id:n som aldrig får bli ett häfte: __alla är pseudo-häftet "Alla låtar", och
// "index" skulle peka ut songs/haften/index.json — själva häftesregistret.
export const RESERVED_HAFT_IDS = [ALL_SONGS_ID, 'index'];

const ID_RE = /^[a-z0-9_-]+$/;

export function parseHaftenIndex(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(h =>
      h && typeof h.id === 'string' && ID_RE.test(h.id) && !RESERVED_HAFT_IDS.includes(h.id) &&
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

// Lägger till eller tar bort en enskild låt i ett häftes låtlista. Nya låtar
// hamnar sist — ordningen på resten är menyordningen och rörs aldrig.
export function toggleInHaft(filenames, filename, skaIngå) {
  const ingårRedan = filenames.includes(filename);
  if (skaIngå) return ingårRedan ? [...filenames] : [...filenames, filename];
  return ingårRedan ? filenames.filter(f => f !== filename) : [...filenames];
}

export function sameFileList(a, b) {
  return a.length === b.length && a.every((f, i) => f === b[i]);
}

export function matchesSongQuery(meta, query) {
  const q = String(query ?? '').trim().toLowerCase();
  if (q === '') return true;
  return [meta.title, meta.artist, meta.filename]
    .some(v => typeof v === 'string' && v.toLowerCase().includes(q));
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

// Lägger till -2, -3 … tills id:t är ledigt. De reserverade id:na är alltid upptagna.
export function uniqueHaftId(base, taken) {
  const upptagna = new Set([...taken, ...RESERVED_HAFT_IDS]);
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
