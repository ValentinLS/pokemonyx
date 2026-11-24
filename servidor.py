"""Pokemonyx · servidor de casa.

Sirve el juego en la wifi de casa y guarda la partida en datos/estado.json, para que la
tablet y el PC vean lo mismo. Cada día guarda una copia en datos/copias (las 30 últimas).

Uso:  python servidor.py [--puerto 8791] [--local] [--sin-navegador] [--datos CARPETA]
      --local          solo este PC (no se ve desde la tablet)
      --sin-navegador  no abre el navegador al arrancar
      --datos          otra carpeta para la partida (para pruebas)
"""
import argparse
import json
import os
import shutil
import socket
import sys
import threading
import time
import webbrowser
from datetime import date
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

BASE = os.path.dirname(os.path.abspath(__file__))
DATOS = os.path.join(BASE, 'datos')
ESTADO = os.path.join(DATOS, 'estado.json')
COPIAS = os.path.join(DATOS, 'copias')
MAX_BYTES = 5 * 1024 * 1024
LOCK = threading.Lock()
BLOQUEADO = ('/datos', '/servidor.py', '/pokemonyx.bat', '/.')


def leer():
    try:
        with open(ESTADO, encoding='utf-8') as f:
            doc = json.load(f)
        return doc if isinstance(doc, dict) else {'rev': 0, 'estado': None}
    except FileNotFoundError:
        return {'rev': 0, 'estado': None}
    except (json.JSONDecodeError, UnicodeDecodeError):
        roto = os.path.join(DATOS, f'estado-roto-{int(time.time())}.json')
        os.replace(ESTADO, roto)
        print(f'  ! El archivo de la partida estaba dañado. Lo he apartado en {roto}')
        return {'rev': 0, 'estado': None}


def copia_diaria():
    """Antes del primer guardado de cada día, copia la partida tal como estaba."""
    if not os.path.exists(ESTADO):
        return
    os.makedirs(COPIAS, exist_ok=True)
    destino = os.path.join(COPIAS, f'estado-{date.today().isoformat()}.json')
    if not os.path.exists(destino):
        shutil.copyfile(ESTADO, destino)
    viejas = sorted(f for f in os.listdir(COPIAS) if f.startswith('estado-') and f.endswith('.json'))
    for f in viejas[:-30]:
        os.remove(os.path.join(COPIAS, f))


def escribir(doc):
    os.makedirs(DATOS, exist_ok=True)
    copia_diaria()
    tmp = ESTADO + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False)
    os.replace(tmp, ESTADO)


def ips_de_casa():
    vistas = set()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('10.255.255.255', 1))  # no envía nada: solo elige la tarjeta de red
        vistas.add(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        vistas.update(socket.gethostbyname_ex(socket.gethostname())[2])
    except OSError:
        pass

    def privada(ip):
        p = ip.split('.')
        return ip.startswith('192.168.') or ip.startswith('10.') or (p[0] == '172' and 16 <= int(p[1]) <= 31)
    return sorted(ip for ip in vistas if privada(ip))


class Manejador(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=BASE, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):  # sin ruido en la ventana
        pass

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _bloqueado(self, ruta):
        return any(ruta.lower().startswith(b) for b in BLOQUEADO)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == '/api/estado':
            with LOCK:
                doc = leer()
            q = parse_qs(u.query)
            if 'rev' in q and q['rev'][0] == str(doc.get('rev', 0)):
                self.send_response(204)
                self.end_headers()
                return
            return self._json(200, doc)
        if u.path == '/api/info':
            puerto = self.server.server_address[1]
            urls = [f'http://localhost:{puerto}/']
            if not getattr(self.server, 'solo_local', False):
                urls += [f'http://{ip}:{puerto}/' for ip in ips_de_casa()]
            return self._json(200, {'urls': urls, 'puerto': puerto})
        if self._bloqueado(u.path):
            return self.send_error(404)
        return super().do_GET()

    def do_HEAD(self):
        if self._bloqueado(urlparse(self.path).path):
            return self.send_error(404)
        return super().do_HEAD()

    def do_PUT(self):
        if urlparse(self.path).path != '/api/estado':
            return self.send_error(404)
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > MAX_BYTES:
            return self._json(413, {'error': 'tamaño no válido'})
        try:
            cuerpo = json.loads(self.rfile.read(n).decode('utf-8'))
            estado = cuerpo['estado']
            rev = int(cuerpo.get('rev', 0))
            if not isinstance(estado, dict) or not isinstance(estado.get('children'), list):
                raise ValueError('estado')
        except Exception:
            return self._json(400, {'error': 'datos no válidos'})
        with LOCK:
            doc = leer()
            if doc.get('estado') is not None and rev != doc.get('rev', 0):
                return self._json(409, doc)  # otro dispositivo guardó antes: que cargue lo último
            nuevo = {'rev': doc.get('rev', 0) + 1, 'estado': estado, 'guardado': time.strftime('%Y-%m-%d %H:%M:%S')}
            escribir(nuevo)
        return self._json(200, {'rev': nuevo['rev']})


def main():
    ap = argparse.ArgumentParser(description='Servidor de casa de Pokemonyx')
    ap.add_argument('--puerto', type=int, default=8791)
    ap.add_argument('--local', action='store_true', help='solo este PC')
    ap.add_argument('--sin-navegador', action='store_true')
    ap.add_argument('--datos', help='carpeta de la partida (por defecto, datos/)')
    a = ap.parse_args()
    global DATOS, ESTADO, COPIAS
    if a.datos:
        DATOS = os.path.abspath(a.datos)
        ESTADO = os.path.join(DATOS, 'estado.json')
        COPIAS = os.path.join(DATOS, 'copias')
    os.makedirs(DATOS, exist_ok=True)
    host = '127.0.0.1' if a.local else '0.0.0.0'
    try:
        srv = ThreadingHTTPServer((host, a.puerto), Manejador)
    except OSError:
        print(f'Pokemonyx ya está en marcha en el puerto {a.puerto} (o el puerto está ocupado).')
        if not a.sin_navegador:
            webbrowser.open(f'http://localhost:{a.puerto}/')
        return 0
    srv.solo_local = a.local
    print('=' * 60)
    print('  POKEMONYX está en marcha. Deja esta ventana abierta mientras jugáis.')
    print(f'  En este PC:  http://localhost:{a.puerto}/')
    if not a.local:
        for ip in ips_de_casa():
            print(f'  En la tablet (misma wifi):  http://{ip}:{a.puerto}/')
    print(f'  Partida guardada en: {ESTADO}')
    print('  Para cerrar: cierra esta ventana o pulsa Ctrl+C.')
    print('=' * 60)
    if not a.sin_navegador:
        threading.Timer(0.8, lambda: webbrowser.open(f'http://localhost:{a.puerto}/')).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == '__main__':
    sys.exit(main())
