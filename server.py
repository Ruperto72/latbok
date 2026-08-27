#!/usr/bin/env python3
"""Lokal utvecklingsserver för Låtbok.
Hanterar statiska filer + POST /save-song för att spara JSON-filer direkt till disk,
POST /set-song-haften för att uppdatera vilka häften en låt ingår i,
POST /save-haft för att skapa/byta namn på ett häfte och spara dess låtordning,
POST /delete-song för att radera en låt och städa bort den ur alla häften och
POST /delete-haft för att radera ett häfte (låtfilerna rörs inte).
"""

import json
import os
import re
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

HAFTEN_DIR = os.path.join('songs', 'haften')
POOL_INDEX = os.path.join('songs', 'index.json')
ID_RE = re.compile(r'[a-z0-9_-]+')
# Måste spegla RESERVED_HAFT_IDS i haften.js: __alla är pseudo-häftet, och
# "index" skulle peka ut songs/haften/index.json — själva häftesregistret.
RESERVED_HAFT_IDS = {'__alla', 'index'}

index_lock = threading.Lock()


def _read_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def _write_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _valid_song_filename(name):
    return bool(name) and not any(c in name for c in '/\\:') and name.endswith('.json')


def _valid_haft_id(hid):
    return isinstance(hid, str) and bool(ID_RE.fullmatch(hid)) and hid not in RESERVED_HAFT_IDS


def _iter_haften():
    """Yieldar (post, sökväg, låtlista) för varje häfte med giltigt id i registret."""
    for h in _read_json(os.path.join(HAFTEN_DIR, 'index.json'), []):
        if not _valid_haft_id(h.get('id')):
            continue
        path = os.path.join(HAFTEN_DIR, h['id'] + '.json')
        yield h, path, _read_json(path, [])


class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/save-song':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                filename = data.get('filename')
                content = data.get('content')

                if not filename or '/' in filename or '\\' in filename or ':' in filename or not filename.endswith('.json'):
                    self._respond(400, 'Ogiltigt filnamn')
                    return

                if content is None:
                    self._respond(400, 'Saknar innehåll (content)')
                    return

                path = os.path.join('songs', filename)
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(content, f, ensure_ascii=False, indent=2)

                if filename not in ('index.json', 'template.json'):
                    with index_lock:
                        pool = _read_json(POOL_INDEX, [])
                        if filename not in pool:
                            pool.append(filename)
                            pool.sort()
                            _write_json(POOL_INDEX, pool)

                self._respond(200, 'OK')
            except Exception as e:
                self._respond(500, str(e))
        elif self.path == '/set-song-haften':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                filename = data.get('filename')
                valda = data.get('haften')

                if not _valid_song_filename(filename):
                    self._respond(400, 'Ogiltigt filnamn')
                    return
                if not isinstance(valda, list):
                    self._respond(400, 'haften måste vara en lista')
                    return

                with index_lock:
                    # Bygg klart alla ändringar innan något skrivs, så ett fel
                    # mitt i inte lämnar häftesfilerna halvuppdaterade.
                    att_skriva = []
                    for h, path, lista in _iter_haften():
                        hid = h['id']
                        namn = h.get('namn')
                        if not isinstance(namn, str) or namn == '':
                            continue
                        if hid in valda and filename not in lista:
                            lista = lista + [filename]
                        elif hid not in valda and filename in lista:
                            lista = [f for f in lista if f != filename]
                        else:
                            continue
                        att_skriva.append((path, lista))

                    for path, lista in att_skriva:
                        _write_json(path, lista)

                self._respond(200, 'OK')
            except Exception as e:
                self._respond(500, str(e))
        elif self.path == '/save-haft':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                hid = data.get('id')
                namn = data.get('namn')
                filenames = data.get('filenames')

                if not _valid_haft_id(hid):
                    self._respond(400, 'Ogiltigt häftes-id')
                    return
                if not isinstance(namn, str) or namn.strip() == '':
                    self._respond(400, 'Häftet måste ha ett namn')
                    return
                if filenames is None:
                    filenames = []
                if not isinstance(filenames, list) or not all(_valid_song_filename(f) for f in filenames):
                    self._respond(400, 'filenames måste vara en lista med låtfilnamn')
                    return
                if len(set(filenames)) != len(filenames):
                    self._respond(400, 'filenames innehåller dubbletter')
                    return

                with index_lock:
                    pool = _read_json(POOL_INDEX, [])
                    saknade = [f for f in filenames if f not in pool]
                    if saknade:
                        self._respond(400, f'Okända låtar: {", ".join(saknade)}')
                        return

                    os.makedirs(HAFTEN_DIR, exist_ok=True)
                    _write_json(os.path.join(HAFTEN_DIR, hid + '.json'), filenames)

                    index_path = os.path.join(HAFTEN_DIR, 'index.json')
                    index = _read_json(index_path, [])
                    for h in index:
                        if h.get('id') == hid:
                            h['namn'] = namn.strip()
                            break
                    else:
                        index.append({'id': hid, 'namn': namn.strip()})
                    _write_json(index_path, index)

                self._respond(200, 'OK')
            except Exception as e:
                self._respond(500, str(e))
        elif self.path == '/delete-song':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                filename = data.get('filename')

                if not _valid_song_filename(filename):
                    self._respond(400, 'Ogiltigt filnamn')
                    return

                with index_lock:
                    pool = _read_json(POOL_INDEX, [])
                    # Kravet att låten finns i poolen spärrar samtidigt
                    # index.json och template.json från att raderas.
                    if filename not in pool:
                        self._respond(404, f'Okänd låt: {filename}')
                        return

                    # Bygg klart alla ändringar innan något skrivs, och skriv
                    # referenserna före filen — ett avbrott ska lämna en
                    # föräldralös fil, inte ett häfte som pekar på något som
                    # saknas.
                    att_skriva = [(POOL_INDEX, [f for f in pool if f != filename])]

                    for _h, path, lista in _iter_haften():
                        if filename in lista:
                            att_skriva.append((path, [f for f in lista if f != filename]))

                    for path, lista in att_skriva:
                        _write_json(path, lista)

                    song_path = os.path.join('songs', filename)
                    if os.path.exists(song_path):
                        os.remove(song_path)

                self._respond(200, 'OK')
            except Exception as e:
                self._respond(500, str(e))
        elif self.path == '/delete-haft':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                hid = data.get('id')

                if not _valid_haft_id(hid):
                    self._respond(400, 'Ogiltigt häftes-id')
                    return

                with index_lock:
                    index_path = os.path.join(HAFTEN_DIR, 'index.json')
                    index = _read_json(index_path, [])
                    if not any(h.get('id') == hid for h in index):
                        self._respond(404, f'Okänt häfte: {hid}')
                        return

                    _write_json(index_path, [h for h in index if h.get('id') != hid])

                    # Låtfilerna rörs inte — bara urvalet försvinner.
                    haft_path = os.path.join(HAFTEN_DIR, hid + '.json')
                    if os.path.exists(haft_path):
                        os.remove(haft_path)

                self._respond(200, 'OK')
            except Exception as e:
                self._respond(500, str(e))
        else:
            self._respond(404, 'Not found')

    def _respond(self, code, message):
        body = message.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # Tysta GET-loggar för statiska filer, visa bara POST
        if self.command == 'POST':
            super().log_message(fmt, *args)

if __name__ == '__main__':
    port = 8005
    print(f'Låtbok-server startar på http://localhost:{port}')
    ThreadingHTTPServer(('', port), Handler).serve_forever()
