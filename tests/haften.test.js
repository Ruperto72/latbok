import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_SONGS_ID,
  parseHaftenIndex, resolveHaftId,
  haftenForSong, withSongInHaften,
} from '../haften.js';

describe('parseHaftenIndex', () => {
  it('behåller giltiga poster', () => {
    const raw = [{ id: 'demestkoren', namn: 'Demestkören' }];
    assert.deepEqual(parseHaftenIndex(raw), [{ id: 'demestkoren', namn: 'Demestkören' }]);
  });

  it('ger tom lista för icke-array', () => {
    assert.deepEqual(parseHaftenIndex(null), []);
    assert.deepEqual(parseHaftenIndex({}), []);
    assert.deepEqual(parseHaftenIndex('x'), []);
  });

  it('ignorerar poster med ogiltigt id', () => {
    const raw = [
      { id: 'Stora Kören', namn: 'Stora kören' },
      { id: 'kammarkören', namn: 'Kammarkören' },
      { namn: 'Utan id' },
      { id: 'ok', namn: 'OK' },
    ];
    assert.deepEqual(parseHaftenIndex(raw), [{ id: 'ok', namn: 'OK' }]);
  });

  it('ignorerar poster med tomt eller saknat namn', () => {
    const raw = [{ id: 'a', namn: '' }, { id: 'b' }, { id: 'c', namn: 'C' }];
    assert.deepEqual(parseHaftenIndex(raw), [{ id: 'c', namn: 'C' }]);
  });

  it('ignorerar det reserverade id:t __alla', () => {
    const raw = [{ id: ALL_SONGS_ID, namn: 'Fusk' }, { id: 'ok', namn: 'OK' }];
    assert.deepEqual(parseHaftenIndex(raw), [{ id: 'ok', namn: 'OK' }]);
  });

  it('kastar bort extra fält', () => {
    const raw = [{ id: 'a', namn: 'A', hemligt: true }];
    assert.deepEqual(parseHaftenIndex(raw), [{ id: 'a', namn: 'A' }]);
  });
});

describe('resolveHaftId', () => {
  const haften = [{ id: 'a', namn: 'A' }, { id: 'b', namn: 'B' }];

  it('låter url-id vinna över sparat id', () => {
    assert.equal(resolveHaftId(haften, 'b', 'a'), 'b');
  });

  it('faller tillbaka på sparat id när url-id är okänt', () => {
    assert.equal(resolveHaftId(haften, 'finns-inte', 'b'), 'b');
  });

  it('faller tillbaka på sparat id när url-id saknas', () => {
    assert.equal(resolveHaftId(haften, null, 'b'), 'b');
  });

  it('faller tillbaka på första häftet när båda är okända', () => {
    assert.equal(resolveHaftId(haften, 'x', 'y'), 'a');
    assert.equal(resolveHaftId(haften, null, null), 'a');
  });

  it('ger null när det inte finns några häften', () => {
    assert.equal(resolveHaftId([], 'a', 'b'), null);
  });

  it('accepterar __alla när det finns i listan', () => {
    const medAlla = [...haften, { id: ALL_SONGS_ID, namn: 'Alla låtar' }];
    assert.equal(resolveHaftId(medAlla, ALL_SONGS_ID, null), ALL_SONGS_ID);
    assert.equal(resolveHaftId(medAlla, null, ALL_SONGS_ID), ALL_SONGS_ID);
  });
});

describe('haftenForSong', () => {
  const lists = { a: ['x.json', 'y.json'], b: ['y.json'], c: [] };

  it('ger häftena som innehåller låten', () => {
    assert.deepEqual(haftenForSong(lists, 'y.json'), ['a', 'b']);
    assert.deepEqual(haftenForSong(lists, 'x.json'), ['a']);
  });

  it('ger tom lista för en låt utan häfte', () => {
    assert.deepEqual(haftenForSong(lists, 'z.json'), []);
  });
});

describe('withSongInHaften', () => {
  it('lägger till sist och bevarar ordningen', () => {
    const lists = { a: ['x.json', 'y.json'] };
    assert.deepEqual(withSongInHaften(lists, 'z.json', ['a']), { a: ['x.json', 'y.json', 'z.json'] });
  });

  it('tar bort ur häften som inte är valda', () => {
    const lists = { a: ['x.json', 'y.json'], b: ['y.json'] };
    assert.deepEqual(withSongInHaften(lists, 'y.json', ['a']), { a: ['x.json', 'y.json'], b: [] });
  });

  it('lämnar listan orörd när inget ändras', () => {
    const lists = { a: ['x.json'], b: [] };
    assert.deepEqual(withSongInHaften(lists, 'x.json', ['a']), { a: ['x.json'], b: [] });
  });

  it('duplicerar inte en låt som redan finns', () => {
    const lists = { a: ['x.json'] };
    assert.deepEqual(withSongInHaften(lists, 'x.json', ['a']), { a: ['x.json'] });
  });

  it('muterar inte indata', () => {
    const lists = { a: ['x.json'] };
    withSongInHaften(lists, 'y.json', ['a']);
    assert.deepEqual(lists, { a: ['x.json'] });
  });
});
