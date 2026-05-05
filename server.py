#!/usr/bin/env python3
"""Lokal utvecklingsserver för Körhäftet.
Hanterar statiska filer + POST /save-song för att spara JSON-filer direkt till disk.
"""

import json
import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/save-song':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                filename = data.get('filename')
                content = data.get('content')

                if not filename or '/' in filename or '\\' in filename or not filename.endswith('.json'):
                    self._respond(400, 'Ogiltigt filnamn')
                    return

                path = os.path.join('songs', filename)
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(content, f, ensure_ascii=False, indent=2)

                self._respond(200, 'OK')
            except Exception as e:
                self._respond(500, str(e))
        elif self.path in ['/archive-song', '/unarchive-song']:
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                filename = data.get('filename')

                if not filename or '/' in filename or '\\' in filename or not filename.endswith('.json'):
                    self._respond(400, 'Ogiltigt filnamn')
                    return

                active_path = os.path.join('songs', filename)
                archive_dir = os.path.join('songs', 'archive')
                archive_path = os.path.join(archive_dir, filename)
                active_index_path = os.path.join('songs', 'index.json')
                archive_index_path = os.path.join(archive_dir, 'index.json')

                os.makedirs(archive_dir, exist_ok=True)

                def update_index(idx_path, item, add=True):
                    items = []
                    if os.path.exists(idx_path):
                        with open(idx_path, 'r', encoding='utf-8') as f:
                            items = json.load(f)
                    if add and item not in items:
                        items.append(item)
                        items.sort()
                    elif not add and item in items:
                        items.remove(item)
                    with open(idx_path, 'w', encoding='utf-8') as f:
                        json.dump(items, f, ensure_ascii=False, indent=2)

                if self.path == '/archive-song':
                    if not os.path.exists(active_path):
                        self._respond(404, 'Filen hittades inte i aktiva låtar')
                        return
                    os.rename(active_path, archive_path)
                    update_index(active_index_path, filename, add=False)
                    update_index(archive_index_path, filename, add=True)
                else: # unarchive
                    if not os.path.exists(archive_path):
                        self._respond(404, 'Filen hittades inte i arkivet')
                        return
                    os.rename(archive_path, active_path)
                    update_index(archive_index_path, filename, add=False)
                    update_index(active_index_path, filename, add=True)

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
