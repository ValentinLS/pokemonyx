#!/usr/bin/env python3
"""Pokemonyx · servidor de apoyo del pintor (solo en este PC, solo mientras se pintan escenarios).

Sirve la carpeta del juego en http://127.0.0.1:8799/ para ver los escenarios pintados
(herramientas/render.html) y recibe los JPG que genera esa página:
POST /guardar?nombre=ID.jpg  ->  img/escenarios/ID.jpg

Solo escucha en 127.0.0.1 y solo acepta JPG con nombre sencillo enviados desde su propia página.
Uso:  python -I guardar_render.py [PUERTO]
"""
import functools
import http.server
import os
import re
import sys
import urllib.parse

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(RAIZ, 'img', 'escenarios')
NOMBRE = re.compile(r'^[a-z0-9][a-z0-9-]{0,60}\.jpg$')
MAXIMO = 12 * 1024 * 1024


class Manejador(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        if url.path != '/guardar':
            return self.send_error(404)
        origen = self.headers.get('Origin')
        puerto = self.server.server_address[1]
        if origen not in (None, f'http://127.0.0.1:{puerto}', f'http://localhost:{puerto}'):
            return self.send_error(403, 'origen no permitido')
        nombre = urllib.parse.parse_qs(url.query).get('nombre', [''])[0]
        if not NOMBRE.match(nombre):
            return self.send_error(400, 'nombre no valido')
        largo = int(self.headers.get('Content-Length') or 0)
        if not 0 < largo <= MAXIMO:
            return self.send_error(413, 'tamano no valido')
        datos = self.rfile.read(largo)
        if not datos.startswith(b'\xff\xd8\xff'):
            return self.send_error(400, 'no es un JPG')
        destino = PRUEBAS if (PRUEBAS and nombre.startswith('prueba-')) else DESTINO
        os.makedirs(destino, exist_ok=True)
        temporal = os.path.join(destino, nombre + '.tmp')
        with open(temporal, 'wb') as f:
            f.write(datos)
        os.replace(temporal, os.path.join(destino, nombre))
        texto = f'{nombre}: {largo // 1024} KB'.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(texto)))
        self.end_headers()
        self.wfile.write(texto)

    def log_message(self, fmt, *args):
        sys.stderr.write('[pintor] ' + (fmt % args) + '\n')


PRUEBAS = None


def main():
    global PRUEBAS
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8799
    # Carpeta opcional para las pruebas (prueba-*.jpg), fuera del juego
    PRUEBAS = sys.argv[2] if len(sys.argv) > 2 else None
    servidor = http.server.ThreadingHTTPServer(('127.0.0.1', puerto), functools.partial(Manejador, directory=RAIZ))
    print(f'Pintor en http://127.0.0.1:{puerto}/herramientas/render.html', flush=True)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
