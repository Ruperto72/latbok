#!/usr/bin/env python3
"""Lokal utvecklingsserver för Körhäftet.
Hanterar statiska filer + POST /save-song för att spara JSON-filer direkt till disk.
"""

import json
import os
import re
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

HAFTEN_DIR = os.path.join('songs', 'haften')
POOL_INDEX = os.path.join('songs', 'index.json')
ID_RE = re.compile(r'^[a-z0-9_-]+$')

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
                    for h in _read_json(os.path.join(HAFTEN_DIR, 'index.json'), []):
                        hid = h.get('id')
                        if not hid or not ID_RE.match(hid):
                            continue
                        path = os.path.join(HAFTEN_DIR, hid + '.json')
                        lista = _read_json(path, [])
                        if hid in valda and filename not in lista:
                            lista.append(filename)
                        elif hid not in valda and filename in lista:
                            lista = [f for f in lista if f != filename]
                        else:
                            continue
                        _write_json(path, lista)

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
    print(f'Körhäftet-server startar på http://localhost:{port}')
    ThreadingHTTPServer(('', port), Handler).serve_forever()
