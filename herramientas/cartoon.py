#!/usr/bin/env python3
"""Pokemonyx · pintor cartoon (estilo vectorial plano de videojuego).

Paisajes y objetos en SVG solo con código, con el estilo de las ilustraciones de fondos para juegos:
colores planos con sombreado de dos tonos (cara de luz y cara de sombra), nubes esponjosas,
montañas facetadas, árboles de copa redonda, cerezos, agua con brillos, margaritas, setas,
faroles, luciérnagas… Sin texturas de ruido ni grano.

Uso (normalmente a través de pintor.py):
    python -I pintor.py CARPETA --estilo cartoon [id ...]
    python -I pintor.py CARPETA --estilo cartoon --objetos

Genera CARPETA/ID.svg, CARPETA/manifest.json, CARPETA/objetos/NOMBRE.svg y CARPETA/galeria.html.
"""
import json
import math
import os
import random

W, H = 1920, 1080


# ======================= Colores =======================
def clamp(v, a, b):
    return max(a, min(b, v))


def rgb(c):
    c = c.lstrip('#')
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def hexc(t):
    return '#%02x%02x%02x' % tuple(int(clamp(round(v), 0, 255)) for v in t)


def mix(a, b, t):
    A, B = rgb(a), rgb(b)
    return hexc([A[i] + (B[i] - A[i]) * t for i in range(3)])


# Ambientes: cielo (arriba, medio, horizonte), sol o luna (x, y, radio, color), bruma, luz, sombra (tinte frío),
# tinte general (armoniza todo), nubes (color y sombra) y oscuridad.
MOODS = {
    'dia': dict(sky=('#3aa8ee', '#7fd0f8', '#dff5ff'), sun=(0.5, 0.44, 95, '#fff4cf'), haze='#cfeefc', light='#fffbe8',
                shadow='#1d4f7a', tint='#ffffff', tint_amt=0.0, cloud='#ffffff', cloud_sh='#cfe3f7', dark=0.0, water='#3fb2e6'),
    'manana': dict(sky=('#5ab4f0', '#a8dcf6', '#fff0d9'), sun=(0.24, 0.36, 80, '#fff1c9'), haze='#e8f1f6', light='#fff4dc',
                   shadow='#2b4f86', tint='#ffe8cc', tint_amt=0.06, cloud='#ffffff', cloud_sh='#dcd8ee', dark=0.0, water='#4fb6e0'),
    'rosa': dict(sky=('#8e4fc9', '#ff6fa8', '#ffb06a'), sun=(0.5, 0.5, 110, '#ffe2b5'), haze='#ff9cb8', light='#ffd9a8',
                 shadow='#4a1f6b', tint='#ff5fa2', tint_amt=0.22, cloud='#ff8cc0', cloud_sh='#c44f9c', dark=0.0, water='#ff8f8a'),
    'atardecer': dict(sky=('#3d3a8c', '#e0679a', '#ffc178'), sun=(0.7, 0.55, 90, '#ffe3a8'), haze='#f2a3a0', light='#ffd5a0',
                      shadow='#3a2466', tint='#ff8a5c', tint_amt=0.14, cloud='#ffd1c4', cloud_sh='#c77aa8', dark=0.08, water='#c77aa6'),
    'pastel': dict(sky=('#f19ad2', '#f8c1e1', '#ffe1c2'), sun=(0.24, 0.2, 60, '#fff1d6'), haze='#fbd3e4', light='#fff3e0',
                   shadow='#8a4d8f', tint='#ffb3d9', tint_amt=0.12, cloud='#fff1cf', cloud_sh='#f4c7a6', dark=0.0, water='#bfe6f7'),
    'crepusculo': dict(sky=('#5b72d9', '#a493e6', '#f3b4d6'), sun=(0.72, 0.28, 58, '#f6e6ff'), haze='#c8b7f0', light='#ffe1f0',
                       shadow='#2c2a7a', tint='#8f7cf0', tint_amt=0.16, cloud='#d8c8ff', cloud_sh='#9a86da', dark=0.05, water='#7a9cf0'),
    'noche': dict(sky=('#070b2e', '#16257a', '#2f56b8'), moon=(0.5, 0.42, 120, '#bfe8ff'), haze='#2a4aa6', light='#7fd4ff',
                  shadow='#050826', tint='#2f4fc8', tint_amt=0.35, cloud='#3a56b0', cloud_sh='#1d2c75', dark=0.42, water='#2b4fb0'),
    'pantano': dict(sky=('#0f4a3c', '#2f8a5e', '#b6d86a'), sun=(0.5, 0.25, 70, '#f2ffb0'), haze='#7fb86a', light='#eaff9a',
                    shadow='#0a2e2a', tint='#7ab84a', tint_amt=0.18, cloud='#9fd08a', cloud_sh='#4f8f5a', dark=0.12, water='#7fb84a'),
    'magico': dict(sky=('#10303a', '#2e7a74', '#a6e2c8'), sun=(0.5, 0.42, 90, '#e8fff0'), haze='#5fb8a4', light='#fff0b0',
                   shadow='#0a1f2a', tint='#3fa08c', tint_amt=0.2, cloud='#9fe0cc', cloud_sh='#4f9a8a', dark=0.18, water='#4fa89a'),
    'hielo': dict(sky=('#5d4fd8', '#7fb0f0', '#c4ecff'), sun=(0.5, 0.28, 60, '#ffffff'), haze='#a9d6ff', light='#ffffff',
                  shadow='#25288f', tint='#7fbfff', tint_amt=0.12, cloud='#ece8ff', cloud_sh='#b6aef0', dark=0.0, water='#36c0e6'),
    'lava': dict(sky=('#2a060e', '#9a1418', '#ff5a1f'), sun=(0.5, 0.3, 60, '#ffb347'), haze='#d8401f', light='#ffcf5a',
                 shadow='#22040c', tint='#ff3a1a', tint_amt=0.22, cloud='#9a2a2a', cloud_sh='#5a1020', dark=0.08, water='#ff9a1a'),
    'ocaso': dict(sky=('#5a3a9a', '#ff7a3a', '#ffc94a'), sun=(0.68, 0.57, 105, '#fff3c0'), haze='#ffaa66', light='#ffe3a0',
                  shadow='#4a2050', tint='#ff8a4a', tint_amt=0.16, cloud='#b06ab8', cloud_sh='#6e3a8a', dark=0.03, water='#ff7a3a'),
    'tarde': dict(sky=('#e4f0a0', '#f2f6c4', '#fffff0'), sun=(0.74, 0.18, 70, '#ffffff'), haze='#eef3c0', light='#fffbe0',
                  shadow='#4a5a1a', tint='#d8e070', tint_amt=0.08, cloud='#ffffff', cloud_sh='#e6eab0', dark=0.0, water='#8fd0c8'),
    'alien': dict(sky=('#0a1460', '#1f3fb0', '#3a8ad8'), moon=(0.3, 0.2, 130, '#9fd8f0'), haze='#3a8ab0', light='#9ff8ff',
                  shadow='#061040', tint='#2a6ad0', tint_amt=0.18, cloud='#3a6ad0', cloud_sh='#1a3a90', dark=0.12, water='#4ad0a0'),
    'aurora': dict(sky=('#030822', '#0a1a58', '#15307a'), moon=(0.62, 0.16, 36, '#e6fbff'), haze='#1a3a8a', light='#5ff0ff',
                   shadow='#020820', tint='#1a3ab0', tint_amt=0.3, cloud='#2a4ab0', cloud_sh='#10206a', dark=0.38, water='#1a3a9a'),
    'canon': dict(sky=('#2a7ae8', '#6ab0f0', '#dcefff'), sun=(0.62, 0.12, 60, '#ffffff'), haze='#c8def5', light='#fff6e0',
                  shadow='#5a2a3a', tint='#ffb070', tint_amt=0.05, cloud='#eef5ff', cloud_sh='#b8cde8', dark=0.0, water='#9fd8f0'),
    'fantasia': dict(sky=('#2a9ae8', '#7fd0f8', '#eef9ff'), sun=(0.5, 0.36, 70, '#fffde8'), haze='#bfeacc', light='#fffbe0',
                     shadow='#1a3a5a', tint='#ffffff', tint_amt=0.0, cloud='#ffffff', cloud_sh='#cfe0f7', dark=0.0, water='#4fb6e0'),
}
DARK_MOODS = {'noche', 'aurora', 'alien'}


def curve(pts, closed=False, t=1.0):
    """Curva suave (Catmull-Rom) que pasa por los puntos."""
    if len(pts) < 3:
        return 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    P = ([pts[-1]] + pts + [pts[0], pts[1]]) if closed else ([pts[0]] + pts + [pts[-1]])
    d = f'M{P[1][0]:.1f},{P[1][1]:.1f}'
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) * t / 6, p1[1] + (p2[1] - p0[1]) * t / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) * t / 6, p2[1] - (p3[1] - p1[1]) * t / 6)
        d += f' C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}'
    return d + ('Z' if closed else '')


def poly(pts):
    return 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + 'Z'


def y_at(pts, x):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if x0 <= x <= x1:
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0 + 1e-9)
    return pts[-1][1] if x > pts[-1][0] else pts[0][1]


def star4(x, y, r):
    k = r * 0.22
    return f'M{x:.1f},{y - r:.1f} Q{x + k:.1f},{y - k:.1f} {x + r:.1f},{y:.1f} Q{x + k:.1f},{y + k:.1f} {x:.1f},{y + r:.1f} Q{x - k:.1f},{y + k:.1f} {x - r:.1f},{y:.1f} Q{x - k:.1f},{y - k:.1f} {x:.1f},{y - r:.1f}Z'


# ======================= Escena =======================
class Cartoon:
    def __init__(self, mood, seed, w=W, h=H):
        self.mood, self.M = mood, MOODS[mood]
        self.rng = random.Random(seed)
        self.w, self.h = w, h
        self.defs, self.layers, self.n = [], [], 0
        body = self.M.get('sun') or self.M.get('moon')
        self.sunx = body[0] * w
        self.L = 1 if body[0] >= 0.5 else -1   # lado iluminado: hacia el sol
        if 0.4 < body[0] < 0.6:
            self.L = 1 if seed % 2 else -1
        # Rarezas escondidas: candidatos (siempre los mismos para la misma semilla) y los elegidos
        self.hrng = random.Random(seed * 31 + 7)
        self.krng = random.Random(seed * 17 + 3)
        self.cands, self.pick, self.found, self.glints = [], {}, [], []
        self.covers = []   # escondites: elementos del dibujo que pueden tapar algo (van también en la capa)
        self.mirror = False

    # ----- utilidades -----
    def uid(self, p):
        self.n += 1
        return f'{p}{self.n}'

    def add(self, s):
        self.layers.append(s)

    def d(self, s):
        self.defs.append(s)

    def c(self, base, depth=0.0):
        """Color del ambiente: tinte general + bruma por profundidad + oscuridad de noche."""
        M = self.M
        col = mix(base, M['tint'], M['tint_amt'])
        col = mix(col, M['haze'], clamp(depth, 0, 1) * 0.72)
        if M['dark']:
            col = mix(col, M['shadow'], M['dark'] * (1 - clamp(depth, 0, 1) * 0.35))
        return col

    def sh(self, col, k=0.32):
        return mix(col, self.M['shadow'], k)

    def hi(self, col, k=0.3):
        return mix(col, self.M['light'], k)

    def lgrad(self, stops, x1=0, y1=0, x2=0, y2=1, units=None):
        g = self.uid('g')
        u = f' gradientUnits="{units}"' if units else ''
        s = ''.join(f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in stops)
        self.d(f'<linearGradient id="{g}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"{u}>{s}</linearGradient>')
        return g

    def rgrad(self, stops, cx=0.5, cy=0.5, r=0.5):
        g = self.uid('r')
        s = ''.join(f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in stops)
        self.d(f'<radialGradient id="{g}" cx="{cx}" cy="{cy}" r="{r}">{s}</radialGradient>')
        return g

    def clip(self, d):
        cid = self.uid('cp')
        self.d(f'<clipPath id="{cid}"><path d="{d}"/></clipPath>')
        return cid

    def glow(self, x, y, r, col, a=0.8):
        g = self.rgrad([(0, col, a), (0.35, col, a * 0.45), (1, col, 0)])
        return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="url(#{g})"/>'

    def svg(self):
        body = ''.join(self.layers) + ''.join(getattr(self, 'glints', []))
        if self.mirror:
            body = f'<g transform="translate({self.w} 0) scale(-1 1)">{body}</g>'
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}">'
                f'<defs>{"".join(self.defs)}</defs>{body}</svg>')

    # ----- Rarezas: cosas que no encajan, escondidas en la escena -----
    def hide_zone(self, x0, x1, y0, y1, n=3, smin=48, smax=80, sink=0.0):
        """Rarezas medio hundidas en el agua o en la hierba de una zona. Las que flotaban en el aire ya no se usan:
        el resto se asoma por detrás de los escondites del dibujo (ver cover)."""
        if not sink:
            return
        for _ in range(n):
            x, y = self.hrng.uniform(x0, x1), self.hrng.uniform(y0, y1)
            s, rot = self.hrng.uniform(smin, smax), self.hrng.uniform(-28, 28)
            self._odd_at(x, y, s, rot, sink, None)

    def _odd_at(self, x, y, s, rot, sink, oi):
        """Hueco para una rareza; se pinta aquí (en este orden de capas) si fue elegido. oi: escondite que la tapa."""
        # Cuanto más lejos (más arriba), algo más pequeña y teñida de bruma.
        far = 1 - clamp(y / self.h, 0, 1)
        s *= 0.75 + 0.25 * (1 - far)
        idx = len(self.cands)
        self.cands.append((x, y, s, sink, oi))
        kind = self.pick.get(idx)
        if not kind:
            return
        # El objeto queda oculto del todo (24/11, lo pidió Valen): solo se ve un destello donde está.
        # Se pinta al final, encima de todo, para que no lo tape el escondite.
        gx, gy, gs = x + s * 0.1, y - s * (0.05 if sink else 0.7), max(16.0, s * 0.3)
        self.glints.append(self.glow(gx, gy, gs * 1.4, '#ffd23f', 0.6)
                           + f'<path d="{star4(gx, gy, gs)}" fill="#fff6c8" stroke="#f2b51b" stroke-width="{gs * 0.08:.1f}" stroke-linejoin="round" opacity=".95"/>'
                           + f'<path d="{star4(gx + gs * 0.95, gy + gs * 0.55, gs * 0.4)}" fill="#ffffff" opacity=".85"/>')
        cx = (self.w - x) if self.mirror else x
        cy = y - s * (0.5 - sink * 0.5)
        self.found.append([kind, round(cx / self.w * 100, 1), round(cy / self.h * 100, 1), round(max(s * 0.8, 70) / self.w * 100, 1), oi])

    # ----- Escondites: elementos del dibujo que pueden tapar algo (el juego pone encima una capa con ellos) -----
    def cover(self, kind, svg, box, anchor, front=False, peek=None):
        """Registra un escondite y lo pinta. box: zona que se toca; anchor: (x, y, alto) de lo que se esconde
        detrás (o delante si front: agua, lava, cráteres, la puerta de la tienda). Las rarezas se asoman por detrás."""
        oi = len(self.covers)
        if svg:   # las rarezas se asoman por detrás de lo dibujado (también de la tienda)
            self.peeks(oi, peek or box)
            self.add(svg)
        else:     # agua, lava o cráter: medio hundidas
            self.peeks(oi, peek or box, sink=0.42)
        ax, ay, asz = anchor
        self.covers.append({'k': kind, 'svg': '' if front else svg, 'box': box, 'a': (ax, ay, min(asz, 280)), 'f': front})
        return oi

    def peeks(self, oi, box, sink=0.0, n=3):
        """Huecos para rarezas junto a un escondite: asomando por arriba o por un lado (o medio hundidas)."""
        x0, y0, x1, y1 = box
        w, h = max(1.0, x1 - x0), max(1.0, y1 - y0)
        if min(w, h) < 60:   # demasiado pequeño para tapar nada
            return
        for _ in range(n):
            s = clamp(min(w, h) * self.hrng.uniform(0.32, 0.46), 34, 92)
            side = self.hrng.random()
            if sink:
                x, y = self.hrng.uniform(x0 + w * 0.2, x1 - w * 0.2), self.hrng.uniform(y0 + h * 0.3, y1 - h * 0.15)
            elif side < 0.6:
                x, y = self.hrng.uniform(x0 + w * 0.3, x1 - w * 0.3), y0 + s * self.hrng.uniform(0.5, 0.62)
            else:
                x = x0 + max(s * 0.15, w * 0.1) if side < 0.8 else x1 - max(s * 0.15, w * 0.1)
                y = y0 + h * self.hrng.uniform(0.5, 0.8)
            self._odd_at(x, y, s, self.hrng.uniform(-22, 22), sink, oi)

    def trunk_peeks(self, x, y0, y1, w, n=2):
        """Rarezas que se asoman por un lado de un tronco alto (se pinta después y las tapa a medias)."""
        for _ in range(n):
            s = clamp(w * self.hrng.uniform(0.9, 1.3), 40, 84)
            side = -1 if self.hrng.random() < 0.5 else 1
            self._odd_at(x + side * w * 0.45, self.hrng.uniform(y0, y1), s, self.hrng.uniform(-15, 15), 0.0, None)

    def capa_svg(self):
        """La capa: solo los escondites, en el mismo sitio. El juego la usa de máscara sobre el propio dibujo."""
        body = ''.join(c['svg'] for c in self.covers if c['svg'])
        if self.mirror:
            body = f'<g transform="translate({self.w} 0) scale(-1 1)">{body}</g>'
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}">'
                f'<defs>{"".join(self.defs)}</defs>{body}</svg>')

    def covers_data(self, skip=()):
        """Escondites para el juego (en %): [tipo, caja x0 y0 x1 y1, ancla x y alto, delante]."""
        out = []
        for i, c in enumerate(self.covers):
            if i in skip:
                continue
            x0, y0, x1, y1 = c['box']
            ax, ay, asz = c['a']
            if self.mirror:
                x0, x1, ax = self.w - x1, self.w - x0, self.w - ax
            px, py = (lambda v: round(v / self.w * 100, 1)), (lambda v: round(v / self.h * 100, 1))
            if not (3 < px(ax) < 97) or asz < 36:
                continue
            out.append([c['k'], px(x0), py(y0), px(x1), py(y1), px(ax), py(ay), px(asz), 1 if c['f'] else 0])
        return out

    # Atajos: cada elemento del dibujo que sirve de escondite.
    def c_bush(self, x, y, w, col, depth=0.0, flowers=None):
        return self.cover('arbusto', self.bush(x, y, w, col, depth, flowers), (x - w * 0.55, y - w * 0.52, x + w * 0.55, y), (x, y - w * 0.08, w * 0.62))

    def c_tree(self, x, y, h, col, depth=0.0, trunk_col='#7b4a2c'):
        cy, rx, ry = y - h * 0.66, h * 0.36, h * 0.3
        return self.cover('arbol', self.tree(x, y, h, col, depth, trunk_col), (x - rx * 1.3, cy - ry * 1.25, x + rx * 1.3, y),
                          (x, cy + ry * 0.35, ry * 1.9), peek=(x - rx * 1.2, cy - ry * 1.2, x + rx * 1.2, cy + ry))

    def c_conifer(self, x, y, h, col, depth=0.0, snow=False):
        w = h * 0.36
        return self.cover('arbol', self.conifer(x, y, h, col, depth, snow), (x - w, y - h, x + w, y), (x, y - h * 0.3, h * 0.42),
                          peek=(x - w * 0.8, y - h * 0.75, x + w * 0.8, y - h * 0.1))

    def c_cherry(self, x, y, h, depth=0.0, petals=30, col='#f7a6c8'):
        return self.cover('cerezo', self.cherry(x, y, h, depth, petals, col), (x - h * 0.66, y - h * 1.02, x + h * 0.64, y),
                          (x + h * 0.02, y - h * 0.68, h * 0.36), peek=(x - h * 0.62, y - h * 1.0, x + h * 0.6, y - h * 0.5))

    def c_rock(self, x, y, s, col='#8f93a8', moss=False, depth=0.0, kind='roca'):
        return self.cover(kind, rock(self, x, y, s, col, moss, depth), (x - s * 0.75, y - s * 1.02, x + s * 0.75, y), (x, y - s * 0.2, s * 1.05))

    def c_mushroom(self, x, y, s, col='#e8453c', depth=0.0):
        return self.cover('seta', mushroom(self, x, y, s, col, depth), (x - s * 0.5, y - s * 1.1, x + s * 0.5, y), (x, y - s * 0.55, s * 0.78))

    def c_ice(self, x, y, w, h, col='#7fd0f0', depth=0.0, neon=None, kind='hielo'):
        return self.cover(kind, ice_block(self, x, y, w, h, col, depth, neon), (x - w / 2, y - h, x + w / 2, y), (x, y - h * 0.55, min(w, h) * 0.75))

    def c_mound(self, x, y, w, h, depth=0.0):
        svg = leafy_tree(self, x - w * 0.12, y - h * 0.95, h * 0.5) + mound(self, x, y, w, h, depth) + leafy_tree(self, x + w * 0.42, y - h * 0.05, h * 0.42)
        return self.cover('roca', svg, (x - w / 2, y - h, x + w / 2, y), (x + w * 0.18, y - h * 0.55, h * 0.6))

    def c_mtree(self, x, y, h, cap='#3f6ae0', stripes=True, depth=0.0):
        cy, w = y - h * 0.62, h * 0.42
        return self.cover('seta', mushroom_tree(self, x, y, h, cap, stripes, depth), (x - w, cy - h * 0.38, x + w, y),
                          (x + w * 0.3, cy - h * 0.02, h * 0.45), peek=(x - w, cy - h * 0.38, x + w, cy + h * 0.04))

    def c_tent(self, x, y, s, col='#f2b544'):
        # Lo escondido sale por la puerta de la tienda (por delante).
        return self.cover('tienda', tent(self, x, y, s, col), (x - s * 0.7, y - s, x + s * 0.7, y), (x - s * 0.11, y + 2, s * 0.45), front=True,
                          peek=(x - s * 0.7, y - s, x + s * 0.7, y - s * 0.3))

    def c_campfire(self, x, y, s):
        return self.cover('hoguera', campfire(self, x, y, s), (x - s * 0.6, y - s * 1.2, x + s * 0.6, y + s * 0.1), (x, y - s * 0.15, s * 1.3))

    def c_island(self, x, y, w, depth=0.0, falls=True):
        return self.cover('isla', floating_island(self, x, y, w, depth, falls), (x - w * 0.54, y - w * 0.1, x + w * 0.54, y + w * 0.6),
                          (x + w * 0.1, y + w * 0.08, w * 0.3), peek=(x - w * 0.45, y - w * 0.1, x + w * 0.45, y + w * 0.25))

    def c_arches(self, x, y, s, n=3, col='#c9b2d6'):
        return self.cover('ruinas', arches(self, x, y, s, n, col), (x, y - s, x + s * (0.62 * (n - 1) + 0.6), y), (x + s * 0.06, y - s * 0.05, s * 0.5))

    def c_spire(self, x, base, w, h, col, depth=0.0):
        svg = self.peak(x, base, w, h, col, depth, ret=True)[2]
        return self.cover('roca', svg, (x - w * 0.6, base - h, x + w * 0.6, min(base, self.h)), (x + w * 0.1, min(base, self.h) - h * 0.3, min(w * 1.1, 260)))

    def tall_grass(self, x, y, s, col='#3f9a3a', depth=0.0):
        """Hierba alta y espesa, como la de los juegos de Pokémon."""
        r = self.rng
        c0 = self.c(col, depth)
        out = f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{s * 0.66:.1f}" ry="{s * 0.06:.1f}" fill="{self.sh(c0, 0.6)}" opacity=".3"/>'
        n = 14
        for i in range(n):
            t = (i + 0.5) / n
            bx = x - s * 0.6 + t * s * 1.2
            hh = s * r.uniform(0.62, 1.0) * (0.7 + 0.3 * math.sin(math.pi * t))
            lean = r.uniform(-0.18, 0.18) * s
            w = s * 0.1
            colr = self.sh(c0, 0.28) if i % 3 == 0 else (self.hi(c0, 0.14) if i % 3 == 1 else c0)
            out += (f'<path d="M{bx - w:.1f},{y:.1f} Q{bx + lean * 0.4 - w * 0.5:.1f},{y - hh * 0.55:.1f} {bx + lean:.1f},{y - hh:.1f} '
                    f'Q{bx + lean * 0.4 + w * 0.5:.1f},{y - hh * 0.55:.1f} {bx + w:.1f},{y:.1f}Z" fill="{colr}"/>')
        return out

    def c_grass(self, x, y, s, col='#3f9a3a', depth=0.0):
        return self.cover('hierba', self.tall_grass(x, y, s, col, depth), (x - s * 0.66, y - s * 0.95, x + s * 0.66, y), (x, y + s * 0.02, s * 0.85))

    def c_water_at(self, spots, kind='agua', size=150):
        """Escondites en el agua (o lava, o cráteres): lo escondido sale salpicando por delante."""
        for ax, ay in spots:
            self.cover(kind, '', (ax - size * 0.8, ay - size * 0.45, ax + size * 0.8, ay + size * 0.25), (ax, ay + size * 0.1, size), front=True)

    # ======================= Cielo =======================
    def sky(self, stars=0, body=True):
        a, b, c = self.M['sky']
        g = self.lgrad([(0, a, 1), (0.55, b, 1), (1, c, 1)])
        self.add(f'<rect width="{W}" height="{H}" fill="url(#{g})"/>')
        r = self.rng
        if not stars and self.mood in DARK_MOODS:
            stars = 140
        if stars:
            st = ''.join(f'<circle cx="{r.uniform(0, W):.0f}" cy="{r.uniform(0, H * 0.55):.0f}" r="{r.uniform(0.8, 2.4):.1f}" fill="#fff" opacity="{r.uniform(0.35, 1):.2f}"/>' for _ in range(stars))
            st += ''.join(f'<path d="{star4(r.uniform(0, W), r.uniform(0, H * 0.45), r.uniform(5, 10))}" fill="#fff" opacity=".85"/>' for _ in range(stars // 25))
            self.add(f'<g>{st}</g>')
        body = self.M.get('sun') or self.M.get('moon')
        fx, fy, rad, col = body
        x, y = fx * W, fy * H
        self.sunxy = (x, y)
        if not body:
            return
        self.add(self.glow(x, y, rad * 4.5, mix(col, self.M['light'], 0.4), 0.55))
        self.add(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rad * 1.25:.0f}" fill="{col}" opacity=".35"/>')
        self.add(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rad}" fill="{col}"/>')

    def birds(self, n=6, x0=0.2, x1=0.8, y0=0.12, y1=0.35, col='#3a3f6a'):
        r = self.rng
        out = []
        for _ in range(n):
            x, y, s = r.uniform(x0, x1) * W, r.uniform(y0, y1) * H, r.uniform(7, 16)
            out.append(f'<path d="M{x - s:.0f},{y - s * 0.3:.0f} Q{x - s * 0.45:.0f},{y - s * 0.7:.0f} {x:.0f},{y:.0f} Q{x + s * 0.45:.0f},{y - s * 0.7:.0f} {x + s:.0f},{y - s * 0.3:.0f}" '
                       f'stroke="{self.c(col)}" stroke-width="{s * 0.22:.1f}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
        self.add(f'<g opacity=".8">{"".join(out)}</g>')

    # ======================= Nubes =======================
    def cloud(self, cx, cy, w, h, depth=0.2, col=None, shade=None, flat=True):
        """Nube esponjosa: tono de sombra, tono base desplazado hacia la luz y brillos. Base plana o redondeada."""
        r = self.rng
        base = self.c(col or self.M['cloud'], depth * 0.4)
        dark = self.c(shade or self.M['cloud_sh'], depth * 0.4)
        light = mix(base, '#ffffff', 0.55)
        n = max(3, int(w / (h * 0.55)))
        circ = []
        for i in range(n):
            t = (i + 0.5) / n
            bump = math.sin(math.pi * t) ** 0.8
            rad = h * (0.32 + 0.5 * bump) * r.uniform(0.82, 1.15)
            circ.append((cx - w / 2 + t * w + r.uniform(-0.1, 0.1) * w / n, cy - rad * 0.55, rad))
        for _ in range(max(1, n // 3)):
            t = r.uniform(0.3, 0.7)
            rad = h * r.uniform(0.45, 0.62)
            circ.append((cx - w / 2 + t * w, cy - h * 0.55 - rad * 0.35, rad))
        if not flat:
            for i in range(n + 1):
                t = i / n
                circ.append((cx - w * 0.45 + t * w * 0.9, cy - h * 0.12, h * r.uniform(0.26, 0.34) * (0.6 + 0.4 * math.sin(math.pi * t))))
        L = self.L
        s1 = ''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rr:.1f}"/>' for x, y, rr in circ)
        s2 = ''.join(f'<circle cx="{x + L * rr * 0.1:.1f}" cy="{y - rr * 0.16:.1f}" r="{rr * 0.86:.1f}"/>' for x, y, rr in circ)
        top = sorted(circ, key=lambda c: c[1] - c[2])[:max(2, len(circ) // 2)]
        s3 = ''.join(f'<circle cx="{x + L * rr * 0.22:.1f}" cy="{y - rr * 0.3:.1f}" r="{rr * 0.6:.1f}"/>' for x, y, rr in top)
        g = f'<g fill="{dark}">{s1}</g><g fill="{base}">{s2}</g><g fill="{light}" opacity=".38">{s3}</g>'
        if flat:
            cid = self.clip(f'M{cx - w:.0f},{cy - h * 4:.0f} H{cx + w:.0f} V{cy:.0f} H{cx - w:.0f}Z')
            g = f'<g clip-path="url(#{cid})">{g}</g>'
        # Las nubes también son escondites (para los Pokémon que vuelan).
        self.cover('nube', g, (cx - w / 2 - h * 0.25, cy - h * 1.1, cx + w / 2 + h * 0.25, cy + (0 if flat else h * 0.15)), (cx, cy - h * 0.32, h * 0.8))

    def streak(self, x, y, w, h, op=0.6, col=None):
        col = self.c(col or self.M['cloud'], 0.2)
        g = self.lgrad([(0, col, 0), (0.25, col, op), (0.75, col, op), (1, col, 0)], 0, 0, 1, 0)
        self.add(f'<rect x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}" rx="{h / 2:.0f}" fill="url(#{g})"/>')

    def clouds(self, n=5, y0=0.08, y1=0.38, smin=180, smax=420, depth=0.25, streaks=3):
        r = self.rng
        for _ in range(streaks):
            self.streak(r.uniform(-200, W - 300), r.uniform(y0, y1) * H, r.uniform(500, 1100), r.uniform(14, 34), r.uniform(0.35, 0.7))
        for i in range(n):
            w = r.uniform(smin, smax)
            x = (i + r.uniform(0.1, 0.9)) / n * W
            self.cloud(x, r.uniform(y0, y1) * H + w * 0.2, w, w * r.uniform(0.32, 0.42), depth)

    # ======================= Montañas =======================
    def peak(self, x, base, w, h, col, depth, snow=0.0, ret=False):
        r = self.rng
        L = self.L
        px = x + r.uniform(-0.06, 0.06) * w
        right = [(px, base - h), (x + w * r.uniform(0.22, 0.34), base - h * r.uniform(0.66, 0.78)),
                 (x + w * r.uniform(0.5, 0.62), base - h * r.uniform(0.34, 0.46)), (x + w, base + 4)]
        left = [(px, base - h), (x - w * r.uniform(0.22, 0.34), base - h * r.uniform(0.62, 0.74)),
                (x - w * r.uniform(0.5, 0.62), base - h * r.uniform(0.3, 0.42)), (x - w, base + 4)]
        outline = left[::-1] + right[1:]
        if not ret and h > 100:
            # Rarezas que se asoman por detrás de la cresta (la montaña se pinta después y tapa su parte de abajo).
            for _ in range(2):
                side = right if self.hrng.random() < 0.5 else left
                t = self.hrng.uniform(0.15, 0.6)
                (ax, ay), (bx, by) = side[0], side[1] if t < 0.5 else side[2]
                qx, qy = ax + (bx - ax) * t * 1.6, ay + (by - ay) * t * 1.6
                sz = clamp(h * self.hrng.uniform(0.16, 0.22), 40, 84)
                self._odd_at(qx, qy + sz * 0.42, sz, self.hrng.uniform(-18, 18), 0.0, None)
        cm = (px + L * w * 0.06, base - h * 0.5)
        cf = (px + L * w * 0.16, base + 4)
        lit = (right if L > 0 else left) + [cf, cm]
        c0 = self.c(col, depth)
        dark, light = self.sh(c0, 0.3), self.hi(c0, 0.22)
        out = f'<path d="{poly(outline)}" fill="{dark}"/><path d="{poly(lit)}" fill="{light}"/>'
        if snow > 0:
            ycut = base - h * (1 - snow)

            def cut(side):
                pts = [side[0]]
                for (x0, y0), (x1, y1) in zip(side, side[1:]):
                    if y1 < ycut:
                        pts.append((x1, y1))
                    else:
                        t = (ycut - y0) / (y1 - y0 + 1e-9)
                        pts.append((x0 + (x1 - x0) * t, ycut))
                        break
                return pts
            rc, lc = cut(right), cut(left)
            xa, xb = rc[-1][0], lc[-1][0]
            teeth = []
            k = 6
            for i in range(1, k):
                xx = xa + (xb - xa) * i / k
                teeth.append((xx, ycut + (h * snow * r.uniform(0.12, 0.35) if i % 2 else -h * snow * r.uniform(0.0, 0.15))))
            cap = rc + teeth + lc[::-1][:-1]
            snow_d, snow_l = self.c('#c8d6f2', depth * 0.8), self.c('#ffffff', depth * 0.6)
            cid = self.clip(poly(lit))
            out += f'<path d="{poly(cap)}" fill="{snow_d}"/><path d="{poly(cap)}" fill="{snow_l}" clip-path="url(#{cid})"/>'
        if ret:
            return poly(outline), dark, f'<g>{out}</g>'
        self.add(f'<g>{out}</g>')
        return poly(outline), dark

    def mountains(self, base, n, hmin, hmax, depth, col, snow=0.0, x0=-150, x1=W + 150, fog=0.6):
        r = self.rng
        peaks = []
        for i in range(n):
            x = x0 + (x1 - x0) * (i + r.uniform(0.2, 0.8)) / n
            h = r.uniform(hmin, hmax)
            peaks.append((x, h, h * r.uniform(0.85, 1.25)))
        refl = []
        for x, h, w in sorted(peaks, key=lambda p: -p[1]):
            refl.append(self.peak(x, base, w, h, col, depth, snow))
        if fog:
            hz = self.M['haze']
            g = self.lgrad([(0, hz, 0), (1, hz, fog)], 0, base - hmin * 0.6, 0, base + 20, 'userSpaceOnUse')
            self.add(f'<rect x="0" y="{base - hmin * 0.6:.0f}" width="{W}" height="{hmin * 0.6 + 40:.0f}" fill="url(#{g})"/>')
        return refl

    # ======================= Colinas y suelo =======================
    def hill_pts(self, base, amp, k=3, x0=-60, x1=W + 60, n=60):
        r = self.rng
        ph = [r.uniform(0, 6.28) for _ in range(k)]
        fr = [r.uniform(0.6, 1.3) * (i + 1) for i in range(k)]
        return [(x0 + (x1 - x0) * i / n, base - sum(math.sin((x0 + (x1 - x0) * i / n) / W * math.pi * fr[j] + ph[j]) / (j + 1) for j in range(k)) * amp)
                for i in range(n + 1)]

    def hill(self, base, amp, depth, col, k=3, rim=True, pts=None, bottom=H + 40):
        pts = pts or self.hill_pts(base, amp, k)
        c0 = self.c(col, depth)
        top = min(y for _, y in pts)
        g = self.lgrad([(0, self.hi(c0, 0.18), 1), (0.5, c0, 1), (1, self.sh(c0, 0.28), 1)], 0, top, 0, max(y for _, y in pts) + 220, 'userSpaceOnUse')
        d = curve(pts) + f' L{pts[-1][0]:.0f},{bottom} L{pts[0][0]:.0f},{bottom}Z'
        self.add(f'<path d="{d}" fill="url(#{g})"/>')
        if rim:
            self.add(f'<path d="{curve([(x, y + 3) for x, y in pts])}" stroke="{self.hi(c0, 0.45)}" stroke-width="{max(3, 9 * (1 - depth)):.1f}" fill="none" opacity=".55" stroke-linecap="round"/>')
        return pts

    def dirt_path(self, pts, x_far, x_near, w_far=40, w_near=520, col='#d9a066'):
        """Camino de tierra que se abre hacia el primer plano."""
        c0 = self.c(col)
        yf = y_at(pts, x_far) + 6
        mx = (x_far + x_near) / 2 + self.rng.uniform(-160, 160)
        left = [(x_far - w_far / 2, yf), (mx - (w_far + w_near) / 4, (yf + H) / 2), (x_near - w_near / 2, H + 20)]
        right = [(x_near + w_near / 2, H + 20), (mx + (w_far + w_near) / 4, (yf + H) / 2), (x_far + w_far / 2, yf)]
        d = curve(left) + ' L' + curve(right)[1:] + 'Z'
        g = self.lgrad([(0, self.hi(c0, 0.2), 1), (1, self.sh(c0, 0.18), 1)], 0, yf, 0, H, 'userSpaceOnUse')
        self.add(f'<path d="{d}" fill="url(#{g})"/>')
        self.add(f'<path d="{curve(left)}" stroke="{self.sh(c0, 0.3)}" stroke-width="5" fill="none" opacity=".45"/>')
        r = self.rng
        st = ''
        for _ in range(14):
            t = r.uniform(0.15, 1)
            y = yf + (H - yf) * t
            x = x_far + (x_near - x_far) * t + r.uniform(-0.3, 0.3) * (w_far + (w_near - w_far) * t)
            s = 4 + 16 * t
            st += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{s:.0f}" ry="{s * 0.45:.0f}" fill="{self.sh(c0, 0.2)}" opacity=".5"/>'
        self.add(f'<g>{st}</g>')

    # ======================= Vegetación =======================
    def blob_cluster(self, cx, cy, rx, ry, col, n=7, light=True):
        """Copa o arbusto: círculos en tono de sombra, tono base hacia la luz y brillos arriba."""
        r = self.rng
        L = self.L
        circ = [(cx, cy, min(rx, ry) * 0.75)]
        for _ in range(n):
            a = r.uniform(0, 2 * math.pi)
            d = r.uniform(0.35, 0.75)
            circ.append((cx + math.cos(a) * rx * d, cy + math.sin(a) * ry * d * 0.85, min(rx, ry) * r.uniform(0.38, 0.58)))
        dark, light_c = self.sh(col, 0.38), self.hi(col, 0.32)
        s = f'<g fill="{dark}">' + ''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rr:.1f}"/>' for x, y, rr in circ) + '</g>'
        s += f'<g fill="{col}">' + ''.join(f'<circle cx="{x + L * rr * 0.12:.1f}" cy="{y - rr * 0.18:.1f}" r="{rr * 0.8:.1f}"/>' for x, y, rr in circ) + '</g>'
        if light:
            top = sorted(circ, key=lambda c: (c[1] - c[2]) - L * c[0] * 0.15)[:max(2, len(circ) // 2)]
            s += f'<g fill="{light_c}" opacity=".55">' + ''.join(f'<circle cx="{x + L * rr * 0.24:.1f}" cy="{y - rr * 0.3:.1f}" r="{rr * 0.52:.1f}"/>' for x, y, rr in top) + '</g>'
        return s

    def trunk(self, x, y, h, wb, wt, col, bend=0.0):
        L = self.L
        c0 = col
        tx = x + bend * h
        d = (f'M{x - wb / 2:.1f},{y:.1f} Q{x - wt / 2 + bend * h * 0.3:.1f},{y - h * 0.5:.1f} {tx - wt / 2:.1f},{y - h:.1f} '
             f'L{tx + wt / 2:.1f},{y - h:.1f} Q{x + wt / 2 + bend * h * 0.3:.1f},{y - h * 0.5:.1f} {x + wb / 2:.1f},{y:.1f}Z')
        side = (f'M{x + L * wb * 0.05:.1f},{y:.1f} Q{x + L * wt * 0.1 + bend * h * 0.3:.1f},{y - h * 0.5:.1f} {tx + L * wt * 0.1:.1f},{y - h:.1f} '
                f'L{tx + L * wt / 2:.1f},{y - h:.1f} Q{x + L * wt / 2 + bend * h * 0.3:.1f},{y - h * 0.5:.1f} {x + L * wb / 2:.1f},{y:.1f}Z')
        return f'<path d="{d}" fill="{self.sh(c0, 0.3)}"/><path d="{side}" fill="{self.hi(c0, 0.15)}"/>'

    def tree(self, x, y, h, col, depth=0.0, trunk_col='#7b4a2c'):
        c0 = self.c(col, depth)
        tc = self.c(trunk_col, depth)
        s = self.trunk(x, y, h * 0.55, h * 0.1, h * 0.06, tc, self.rng.uniform(-0.06, 0.06))
        s += self.blob_cluster(x, y - h * 0.66, h * 0.36, h * 0.3, c0, 7, depth < 0.7)
        return s

    def conifer(self, x, y, h, col, depth=0.0, snow=False):
        L = self.L
        c0 = self.c(col, depth)
        dark, light = self.sh(c0, 0.32), self.hi(c0, 0.2)
        s = f'<rect x="{x - h * 0.035:.1f}" y="{y - h * 0.18:.1f}" width="{h * 0.07:.1f}" height="{h * 0.2:.1f}" fill="{self.c("#5e3a22", depth)}"/>'
        for k in range(3):
            top = y - h + h * k * 0.22
            bot = y - h * 0.12 - h * (2 - k) * 0.16
            w = h * (0.2 + k * 0.08)
            s += f'<path d="M{x:.1f},{top:.1f} L{x + w:.1f},{bot:.1f} Q{x:.1f},{bot + h * 0.05:.1f} {x - w:.1f},{bot:.1f}Z" fill="{dark}"/>'
            s += f'<path d="M{x:.1f},{top:.1f} L{x + L * w:.1f},{bot:.1f} Q{x + L * w * 0.4:.1f},{bot + h * 0.03:.1f} {x + L * w * 0.08:.1f},{bot + h * 0.02:.1f}Z" fill="{light}"/>'
            if snow:
                s += f'<path d="M{x:.1f},{top:.1f} L{x + w * 0.45:.1f},{top + (bot - top) * 0.45:.1f} Q{x:.1f},{top + (bot - top) * 0.6:.1f} {x - w * 0.45:.1f},{top + (bot - top) * 0.45:.1f}Z" fill="{self.c("#f4f8ff", depth)}"/>'
        return s

    def cherry(self, x, y, h, depth=0.0, petals=30, col='#f7a6c8'):
        """Cerezo: tronco con ramas y varias copas rosas."""
        r = self.rng
        L = self.L
        tc = self.c('#8a4a36', depth)
        c0 = self.c(col, depth)
        s = self.trunk(x, y, h * 0.5, h * 0.16, h * 0.08, tc, r.uniform(-0.12, 0.12))
        tops = []
        for k, (dx, dy) in enumerate(((-0.32, -0.62), (0.3, -0.66), (0.02, -0.82))):
            bx, by = x + dx * h, y + dy * h
            s += f'<path d="M{x:.1f},{y - h * 0.42:.1f} Q{x + dx * h * 0.3:.1f},{y - h * 0.58:.1f} {bx:.1f},{by + h * 0.05:.1f}" stroke="{self.sh(tc, 0.2)}" stroke-width="{h * 0.045:.1f}" fill="none" stroke-linecap="round"/>'
            tops.append((bx, by))
        for bx, by in sorted(tops, key=lambda t: t[1]):
            s += self.blob_cluster(bx, by, h * 0.3, h * 0.2, c0, 8)
        for _ in range(petals):
            px, py = x + r.uniform(-0.8, 0.8) * h, y - h * r.uniform(-0.1, 0.9)
            s += f'<ellipse cx="{px:.0f}" cy="{py:.0f}" rx="{h * 0.012:.1f}" ry="{h * 0.007:.1f}" fill="{self.hi(c0, 0.3)}" transform="rotate({r.uniform(0, 180):.0f} {px:.0f} {py:.0f})"/>'
        return s

    def bush(self, x, y, w, col, depth=0.0, flowers=None):
        r = self.rng
        c0 = self.c(col, depth)
        cid = self.clip(f'M{x - w:.0f},{y - w * 2:.0f} H{x + w:.0f} V{y:.0f} H{x - w:.0f}Z')
        s = f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{w * 0.55:.1f}" ry="{w * 0.08:.1f}" fill="{self.sh(c0, 0.6)}" opacity=".35"/>'
        s += f'<g clip-path="url(#{cid})">{self.blob_cluster(x, y - w * 0.22, w * 0.5, w * 0.3, c0, 6)}</g>'
        if flowers:
            for _ in range(5):
                fx, fy = x + r.uniform(-0.38, 0.38) * w, y - w * r.uniform(0.15, 0.45)
                s += f'<circle cx="{fx:.1f}" cy="{fy:.1f}" r="{w * 0.035:.1f}" fill="{self.c(flowers, depth)}"/>'
        return s

    def twisted(self, x, y, h, col='#c9772f', depth=0.0):
        """Árbol retorcido de pantano con raíces y musgo colgando."""
        r = self.rng
        L = self.L
        c0 = self.c(col, depth)
        w = h * 0.05
        ph = r.uniform(0, 6.28)
        pts = [(x + math.sin(t * 4 + ph) * w * 1.1, y - h * t) for t in (0, 0.2, 0.4, 0.6, 0.8, 1.0)]
        left = [(px - w * (1.4 - i * 0.18), py) for i, (px, py) in enumerate(pts)]
        right = [(px + w * (1.4 - i * 0.18), py) for i, (px, py) in enumerate(pts)]
        d = curve(left) + ' L' + curve(right[::-1])[1:] + 'Z'
        lit = [(px + L * w * 0.1, py) for px, py in pts]
        lit2 = [(px + L * w * (1.4 - i * 0.18), py) for i, (px, py) in enumerate(pts)]
        dl = curve(lit) + ' L' + curve(lit2[::-1])[1:] + 'Z'
        s = f'<path d="{d}" fill="{self.sh(c0, 0.35)}"/><path d="{dl}" fill="{self.hi(c0, 0.15)}"/>'
        for k in (-1, 1):
            s += f'<path d="M{x + k * w:.1f},{y - h * 0.08:.1f} Q{x + k * w * 3:.1f},{y - h * 0.02:.1f} {x + k * w * 4.5:.1f},{y + h * 0.02:.1f}" stroke="{self.sh(c0, 0.3)}" stroke-width="{w * 0.7:.1f}" fill="none" stroke-linecap="round"/>'
        tx, ty = pts[-1]
        for k in (-1, 1):
            ex, ey = tx + k * h * 0.35, ty - h * 0.05
            s += f'<path d="M{tx:.1f},{ty + h * 0.05:.1f} Q{tx + k * h * 0.15:.1f},{ty - h * 0.15:.1f} {ex:.1f},{ey:.1f}" stroke="{self.sh(c0, 0.25)}" stroke-width="{w * 0.55:.1f}" fill="none" stroke-linecap="round"/>'
            for j in range(3):
                mx = tx + k * h * (0.1 + j * 0.1)
                my = ty - h * 0.06 + j * h * 0.01
                s += f'<path d="M{mx:.1f},{my:.1f} q{r.uniform(-6, 6):.0f},{h * 0.12:.0f} {r.uniform(-4, 4):.0f},{h * r.uniform(0.18, 0.32):.0f}" stroke="{self.c("#6f8f2a", depth)}" stroke-width="{w * 0.18:.1f}" fill="none" stroke-linecap="round" opacity=".85"/>'
        return s

    def tuft(self, x, y, s, col, depth=0.0):
        """Mata de hierba de hojas puntiagudas."""
        r = self.rng
        c0 = self.c(col, depth)
        out = ''
        for i in range(r.randint(3, 6)):
            a = r.uniform(-0.7, 0.7)
            hh = s * r.uniform(0.6, 1.0)
            tx, ty = x + math.sin(a) * hh, y - math.cos(a) * hh
            w = s * 0.09
            colr = self.sh(c0, 0.25) if i % 2 else self.hi(c0, 0.12)
            out += f'<path d="M{x - w:.1f},{y:.1f} Q{x + math.sin(a) * hh * 0.4 - w:.1f},{y - hh * 0.5:.1f} {tx:.1f},{ty:.1f} Q{x + math.sin(a) * hh * 0.4 + w:.1f},{y - hh * 0.5:.1f} {x + w:.1f},{y:.1f}Z" fill="{colr}"/>'
        return out

    def daisy(self, x, y, s, petal='#ffffff', center='#ffc22e', depth=0.0):
        r = self.rng
        pc = self.c(petal, depth)
        out = f'<path d="M{x:.1f},{y + s * 1.6:.1f} Q{x + s * 0.2:.1f},{y + s * 0.8:.1f} {x:.1f},{y:.1f}" stroke="{self.c("#3f8f3a", depth)}" stroke-width="{s * 0.16:.1f}" fill="none"/>'
        a0 = r.uniform(0, 30)
        for k in range(10):
            a = math.radians(a0 + k * 36)
            px, py = x + math.cos(a) * s * 0.55, y + math.sin(a) * s * 0.36
            out += f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{s * 0.42:.1f}" ry="{s * 0.13:.1f}" fill="{pc if k % 3 else self.sh(pc, 0.12)}" transform="rotate({math.degrees(a):.0f} {px:.1f} {py:.1f})"/>'
        out += f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{s * 0.2:.1f}" ry="{s * 0.15:.1f}" fill="{self.c(center, depth)}"/>'
        return out

    def big_leaf(self, x, y, s, angle, col):
        c0 = self.c(col)
        d = f'M0,0 Q{s * 0.35:.1f},{-s * 0.25:.1f} 0,{-s:.1f} Q{-s * 0.35:.1f},{-s * 0.25:.1f} 0,0Z'
        return (f'<g transform="translate({x:.0f} {y:.0f}) rotate({angle:.0f})"><path d="{d}" fill="{self.sh(c0, 0.2)}"/>'
                f'<path d="M0,0 Q{self.L * s * 0.3:.1f},{-s * 0.25:.1f} 0,{-s:.1f}Z" fill="{self.hi(c0, 0.12)}"/>'
                f'<path d="M0,0 L0,{-s * 0.95:.1f}" stroke="{self.sh(c0, 0.4)}" stroke-width="{s * 0.025:.1f}"/></g>')

    def frame_plants(self, col='#1f5a2e', side='both', size=1.0):
        """Plantas grandes en las esquinas del primer plano (enmarcan la escena)."""
        r = self.rng
        out = ''
        sides = (-1, 1) if side == 'both' else ((-1,) if side == 'left' else (1,))
        for k in sides:
            bx = 0 if k < 0 else W
            for i in range(7):
                out += self.big_leaf(bx - k * r.uniform(0, 160), H + 30, r.uniform(180, 330) * size, k * r.uniform(8, 70), col)
        self.add(f'<g>{out}</g>')

    def meadow_details(self, pts, tufts=40, daisies=18, flowers=('#ffd84a',), col='#2f8a3a', x0=0, x1=W):
        r = self.rng
        out = ''
        for _ in range(tufts):
            x = r.uniform(x0, x1)
            yt = y_at(pts, x)
            t = r.random() ** 1.4
            y = yt + (H - yt) * t + 10
            out += self.tuft(x, y, 14 + 70 * t, col)
        for _ in range(daisies):
            x = r.uniform(x0, x1)
            yt = y_at(pts, x)
            t = r.uniform(0.25, 1) ** 1.2
            out += self.daisy(x, yt + (H - yt) * t, 6 + 26 * t)
        for _ in range(daisies * 2):
            x = r.uniform(x0, x1)
            yt = y_at(pts, x)
            t = r.random()
            out += f'<circle cx="{x:.0f}" cy="{yt + (H - yt) * t + 6:.0f}" r="{2 + 6 * t:.1f}" fill="{self.c(r.choice(flowers))}"/>'
        self.add(f'<g>{out}</g>')

    # ======================= Agua =======================
    def water(self, top, bottom, col=None, refl=None, sparkle=True):
        c0 = self.c(col or self.M['water'])
        horizon = self.M['sky'][2]
        g = self.lgrad([(0, mix(horizon, c0, 0.45), 1), (0.3, c0, 1), (1, self.sh(c0, 0.3), 1)], 0, top, 0, bottom, 'userSpaceOnUse')
        self.add(f'<rect x="0" y="{top:.0f}" width="{W}" height="{bottom - top:.0f}" fill="url(#{g})"/>')
        if refl:
            cid = self.clip(f'M0,{top:.0f} H{W} V{bottom:.0f} H0Z')
            rp = ''.join(f'<path d="{d}" fill="{col_}"/>' for d, col_ in refl)
            self.add(f'<g clip-path="url(#{cid})" opacity=".28"><g transform="translate(0 {2 * top:.0f}) scale(1 -1)">{rp}</g></g>')
        self.ripples(top, bottom, c0)
        if sparkle:
            self.sparkles(18, (self.sunx - 300, self.sunx + 300), (top + 10, bottom - 20), '#ffffff')

    def ripples(self, top, bottom, c0, n=34):
        r = self.rng
        out = ''
        for _ in range(n):
            t = r.random()
            y = top + 6 + (bottom - top - 12) * t
            w = 30 + 220 * t * r.uniform(0.4, 1)
            x = r.uniform(-50, W)
            out += f'<rect x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{2 + 5 * t:.1f}" rx="3" fill="{self.hi(c0, 0.55)}" opacity="{r.uniform(0.25, 0.6):.2f}"/>'
        self.add(f'<g>{out}</g>')

    def pond(self, cx, cy, rx, ry, col=None, shore='#d9b36a', lilies=0, refl=True):
        """Estanque con orilla, brillos y nenúfares."""
        r = self.rng
        pts = [(cx + math.cos(a) * rx * r.uniform(0.92, 1.06), cy + math.sin(a) * ry * r.uniform(0.9, 1.08)) for a in [i * math.pi / 7 for i in range(14)]]
        sp = [(cx + (x - cx) * 1.06, cy + (y - cy) * 1.14 + 4) for x, y in pts]
        sc = self.c(shore)
        self.add(f'<path d="{curve(sp, True)}" fill="{sc}"/>')
        c0 = self.c(col or self.M['water'])
        d = curve(pts, True)
        g = self.lgrad([(0, self.sh(c0, 0.25), 1), (0.35, c0, 1), (1, self.hi(c0, 0.25), 1)], 0, cy - ry, 0, cy + ry, 'userSpaceOnUse')
        self.add(f'<path d="{d}" fill="url(#{g})"/>')
        cid = self.clip(d)
        inner = f'<path d="{curve([(x, y + ry * 0.08) for x, y in pts], True)}" fill="none" stroke="{self.sh(c0, 0.35)}" stroke-width="{ry * 0.12:.1f}" opacity=".5"/>'
        if refl:
            inner += f'<ellipse cx="{self.sunx:.0f}" cy="{cy:.0f}" rx="{rx * 0.25:.0f}" ry="{ry * 0.6:.0f}" fill="{self.hi(c0, 0.7)}" opacity=".35"/>'
        for _ in range(14):
            yy = cy + r.uniform(-0.6, 0.8) * ry
            ww = rx * r.uniform(0.08, 0.3)
            inner += f'<rect x="{cx + r.uniform(-0.8, 0.6) * rx:.0f}" y="{yy:.0f}" width="{ww:.0f}" height="{max(2, ry * 0.03):.1f}" rx="2" fill="{self.hi(c0, 0.6)}" opacity=".6"/>'
        self.add(f'<g clip-path="url(#{cid})">{inner}</g>')
        if lilies:
            out = ''
            for _ in range(lilies):
                a, dd = r.uniform(0, 2 * math.pi), r.uniform(0.1, 0.8)
                lx, ly = cx + math.cos(a) * rx * dd, cy + math.sin(a) * ry * dd * 0.8
                out += lily(self, lx, ly, (12 + 26 * ((ly - (cy - ry)) / (2 * ry))) * rx / 400, r.random() < 0.3)
            self.add(f'<g>{out}</g>')
        self.sparkles(8, (cx - rx * 0.8, cx + rx * 0.8), (cy - ry * 0.6, cy + ry * 0.6), '#ffffff')

    # ======================= Partículas (luz, luciérnagas, pétalos) =======================
    def sparkles(self, n, xr, yr, col='#ffffff', smin=4, smax=12):
        r = self.rng
        self.add('<g>' + ''.join(f'<path d="{star4(r.uniform(*xr), r.uniform(*yr), r.uniform(smin, smax))}" fill="{col}" opacity="{r.uniform(0.5, 0.95):.2f}"/>' for _ in range(n)) + '</g>')

    def fireflies(self, n=50, y0=0.35, y1=1.0, col='#7ff6ff'):
        r = self.rng
        g = self.rgrad([(0, '#ffffff', 1), (0.2, col, 0.9), (0.55, col, 0.25), (1, col, 0)])
        self.add('<g>' + ''.join(f'<circle cx="{r.uniform(0, W):.0f}" cy="{r.uniform(y0, y1) * H:.0f}" r="{r.uniform(4, 14):.0f}" fill="url(#{g})"/>' for _ in range(n)) + '</g>')

    def petals(self, n=40, col='#ffc1dc'):
        r = self.rng
        out = ''
        for _ in range(n):
            x, y, s = r.uniform(0, W), r.uniform(0, H), r.uniform(5, 12)
            out += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{s:.1f}" ry="{s * 0.55:.1f}" fill="{self.c(col)}" transform="rotate({r.uniform(0, 180):.0f} {x:.0f} {y:.0f})" opacity=".9"/>'
        self.add(f'<g>{out}</g>')

    def rays(self, x, n=5, col=None, op=0.18):
        """Rayos de luz que entran desde arriba."""
        r = self.rng
        col = col or self.M['light']
        out = ''
        for _ in range(n):
            x0 = x + r.uniform(-300, 300)
            w0, w1 = r.uniform(30, 90), r.uniform(160, 320)
            dx = r.uniform(-260, 120)
            g = self.lgrad([(0, col, op), (1, col, 0)])
            out += f'<path d="M{x0 - w0:.0f},-10 L{x0 + w0:.0f},-10 L{x0 + dx + w1:.0f},{H * 0.95:.0f} L{x0 + dx - w1:.0f},{H * 0.95:.0f}Z" fill="url(#{g})"/>'
        self.add(f'<g style="mix-blend-mode:screen">{out}</g>')

    def finish(self, vignette=0.28, glow=0.25):
        x, y = self.sunxy
        if glow:
            self.add(f'<g style="mix-blend-mode:screen">{self.glow(x, y, 1100, self.M["light"], glow)}</g>')
        if vignette:
            v = self.rgrad([(0.6, self.M['shadow'], 0), (1, self.M['shadow'], vignette)], 0.5, 0.5, 0.78)
            self.add(f'<rect width="{W}" height="{H}" fill="url(#{v})"/>')


# ======================= Objetos (también sirven de escondites) =======================
# Cada objeto se dibuja con el suelo en (x, y) y una altura s. Devuelve SVG.
def rock(sc, x, y, s, col='#8f93a8', moss=False, depth=0.0):
    r = sc.rng
    L = sc.L
    c0 = sc.c(col, depth)
    w = s * r.uniform(1.1, 1.5)
    pts = [(x - w * 0.5, y), (x - w * 0.48, y - s * 0.45), (x - w * 0.22, y - s * 0.92), (x + w * 0.12, y - s), (x + w * 0.42, y - s * 0.62), (x + w * 0.52, y)]
    d = curve(pts + [(x, y + s * 0.04)], True, 0.6)
    out = f'<ellipse cx="{x:.1f}" cy="{y + s * 0.02:.1f}" rx="{w * 0.6:.1f}" ry="{s * 0.1:.1f}" fill="{sc.sh(c0, 0.6)}" opacity=".35"/>'
    out += f'<path d="{d}" fill="{sc.sh(c0, 0.32)}"/>'
    if L > 0:
        facet = [(x - w * 0.05, y - s * 0.55), (x + w * 0.12, y - s * 0.97), (x + w * 0.4, y - s * 0.62), (x + w * 0.44, y - s * 0.12), (x + w * 0.1, y - s * 0.2)]
    else:
        facet = [(x + w * 0.05, y - s * 0.55), (x - w * 0.2, y - s * 0.9), (x - w * 0.46, y - s * 0.45), (x - w * 0.42, y - s * 0.12), (x - w * 0.1, y - s * 0.2)]
    top = [(x - w * 0.22, y - s * 0.9), (x + w * 0.12, y - s * 0.98), (x + w * 0.38, y - s * 0.64), (x + w * 0.02, y - s * 0.56)]
    cid = sc.clip(d)
    inner = f'<path d="{curve(facet, True, 0.5)}" fill="{c0}"/><path d="{curve(top, True, 0.5)}" fill="{sc.hi(c0, 0.3)}"/>'
    if moss:
        mc = sc.c('#7fbf3a', depth)
        mp = [(x - w * 0.6, y - s * 0.62), (x - w * 0.2, y - s * 1.1), (x + w * 0.3, y - s * 1.05), (x + w * 0.6, y - s * 0.55), (x + w * 0.2, y - s * 0.68), (x - w * 0.15, y - s * 0.6)]
        inner += f'<path d="{curve(mp, True)}" fill="{sc.sh(mc, 0.15)}"/><path d="{curve([(px, py - s * 0.05) for px, py in mp], True)}" fill="{mc}" opacity=".85"/>'
    out += f'<g clip-path="url(#{cid})">{inner}</g>'
    out += f'<path d="M{x - w * 0.18:.1f},{y - s * 0.8:.1f} L{x + w * 0.05:.1f},{y - s * 0.88:.1f}" stroke="{sc.hi(c0, 0.6)}" stroke-width="{s * 0.05:.1f}" stroke-linecap="round" opacity=".7"/>'
    return out


def mushroom(sc, x, y, s, col='#e8453c', depth=0.0):
    L = sc.L
    c0 = sc.c(col, depth)
    stem = sc.c('#f4ead6', depth)
    out = f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{s * 0.4:.1f}" ry="{s * 0.07:.1f}" fill="{sc.sh(c0, 0.7)}" opacity=".35"/>'
    out += f'<path d="M{x - s * 0.13:.1f},{y:.1f} Q{x - s * 0.16:.1f},{y - s * 0.35:.1f} {x - s * 0.1:.1f},{y - s * 0.6:.1f} L{x + s * 0.1:.1f},{y - s * 0.6:.1f} Q{x + s * 0.16:.1f},{y - s * 0.35:.1f} {x + s * 0.13:.1f},{y:.1f}Z" fill="{sc.sh(stem, 0.15)}"/>'
    out += f'<path d="M{x + L * s * 0.02:.1f},{y:.1f} Q{x + L * s * 0.0:.1f},{y - s * 0.35:.1f} {x + L * s * 0.02:.1f},{y - s * 0.6:.1f} L{x + L * s * 0.1:.1f},{y - s * 0.6:.1f} Q{x + L * s * 0.16:.1f},{y - s * 0.35:.1f} {x + L * s * 0.13:.1f},{y:.1f}Z" fill="{sc.hi(stem, 0.2)}"/>'
    out += f'<ellipse cx="{x:.1f}" cy="{y - s * 0.6:.1f}" rx="{s * 0.42:.1f}" ry="{s * 0.08:.1f}" fill="{sc.sh(stem, 0.35)}"/>'
    cap = f'M{x - s * 0.5:.1f},{y - s * 0.58:.1f} Q{x - s * 0.48:.1f},{y - s * 1.08:.1f} {x:.1f},{y - s * 1.1:.1f} Q{x + s * 0.48:.1f},{y - s * 1.08:.1f} {x + s * 0.5:.1f},{y - s * 0.58:.1f} Q{x:.1f},{y - s * 0.5:.1f} {x - s * 0.5:.1f},{y - s * 0.58:.1f}Z'
    cid = sc.clip(cap)
    out += f'<path d="{cap}" fill="{sc.sh(c0, 0.25)}"/>'
    out += f'<g clip-path="url(#{cid})"><ellipse cx="{x + L * s * 0.12:.1f}" cy="{y - s * 0.9:.1f}" rx="{s * 0.45:.1f}" ry="{s * 0.36:.1f}" fill="{c0}"/>'
    out += f'<ellipse cx="{x + L * s * 0.2:.1f}" cy="{y - s * 1.0:.1f}" rx="{s * 0.16:.1f}" ry="{s * 0.06:.1f}" fill="{sc.hi(c0, 0.55)}"/>'
    for dx, dy, rr in ((-0.25, -0.78, 0.07), (0.05, -0.92, 0.09), (0.3, -0.75, 0.06), (-0.05, -0.68, 0.05)):
        out += f'<ellipse cx="{x + dx * s:.1f}" cy="{y + dy * s:.1f}" rx="{rr * s:.1f}" ry="{rr * s * 0.75:.1f}" fill="{sc.c("#fff6ea", depth)}"/>'
    return out + '</g>'


def lantern(sc, x, y, s, hang=True):
    """Farol colgante con resplandor (y en la parte de arriba si cuelga)."""
    gold, dark = sc.c('#c98f2e'), sc.c('#5a3b1a')
    light = '#ffe69a'
    top = y
    out = sc.glow(x, top + s * 0.62, s * 1.5, light, 0.7)
    if hang:
        out += f'<path d="M{x:.1f},{top - s * 1.5:.1f} L{x:.1f},{top:.1f}" stroke="{dark}" stroke-width="{s * 0.04:.1f}"/>'
    out += f'<path d="M{x - s * 0.18:.1f},{top + s * 0.18:.1f} Q{x:.1f},{top - s * 0.06:.1f} {x + s * 0.18:.1f},{top + s * 0.18:.1f}Z" fill="{gold}"/>'
    out += f'<path d="M{x - s * 0.32:.1f},{top + s * 0.24:.1f} L{x + s * 0.32:.1f},{top + s * 0.24:.1f} L{x + s * 0.25:.1f},{top + s * 0.16:.1f} L{x - s * 0.25:.1f},{top + s * 0.16:.1f}Z" fill="{sc.sh(gold, 0.25)}"/>'
    out += f'<path d="M{x - s * 0.28:.1f},{top + s * 0.24:.1f} L{x - s * 0.24:.1f},{top + s * 0.96:.1f} L{x + s * 0.24:.1f},{top + s * 0.96:.1f} L{x + s * 0.28:.1f},{top + s * 0.24:.1f}Z" fill="{light}"/>'
    out += f'<path d="M{x - s * 0.06:.1f},{top + s * 0.28:.1f} L{x - s * 0.06:.1f},{top + s * 0.92:.1f} M{x + s * 0.08:.1f},{top + s * 0.28:.1f} L{x + s * 0.08:.1f},{top + s * 0.92:.1f}" stroke="{gold}" stroke-width="{s * 0.04:.1f}"/>'
    out += f'<path d="M{x - s * 0.28:.1f},{top + s * 0.24:.1f} L{x - s * 0.24:.1f},{top + s * 0.96:.1f} M{x + s * 0.28:.1f},{top + s * 0.24:.1f} L{x + s * 0.24:.1f},{top + s * 0.96:.1f}" stroke="{gold}" stroke-width="{s * 0.06:.1f}"/>'
    out += f'<path d="M{x - s * 0.32:.1f},{top + s * 0.96:.1f} L{x + s * 0.32:.1f},{top + s * 0.96:.1f} L{x + s * 0.2:.1f},{top + s * 1.1:.1f} L{x - s * 0.2:.1f},{top + s * 1.1:.1f}Z" fill="{sc.sh(gold, 0.3)}"/>'
    out += f'<circle cx="{x:.1f}" cy="{top + s * 1.17:.1f}" r="{s * 0.05:.1f}" fill="{gold}"/>'
    return out


def lily(sc, x, y, s, flower=False):
    c0 = sc.c('#4f9a3a')
    a = sc.rng.uniform(0, 360)
    out = (f'<g transform="translate({x:.1f} {y:.1f}) scale(1 0.45) rotate({a:.0f})">'
           f'<path d="M0,0 L{s:.1f},{-s * 0.18:.1f} A{s:.1f},{s:.1f} 0 1 0 {s:.1f},{s * 0.18:.1f}Z" fill="{sc.sh(c0, 0.25)}"/>'
           f'<path d="M0,0 L{s * 0.8:.1f},{-s * 0.14:.1f} A{s * 0.8:.1f},{s * 0.8:.1f} 0 1 0 {s * 0.8:.1f},{s * 0.14:.1f}Z" fill="{c0}" transform="translate({-s * 0.08:.1f} {-s * 0.1:.1f})"/></g>')
    if flower:
        pc = sc.c('#ff9cc8')
        for k in range(6):
            ang = k * 60
            out += f'<ellipse cx="{x:.1f}" cy="{y - s * 0.25:.1f}" rx="{s * 0.14:.1f}" ry="{s * 0.36:.1f}" fill="{pc if k % 2 else sc.hi(pc, 0.3)}" transform="rotate({ang} {x:.1f} {y - s * 0.12:.1f})"/>'
        out += f'<circle cx="{x:.1f}" cy="{y - s * 0.14:.1f}" r="{s * 0.1:.1f}" fill="{sc.c("#ffd23f")}"/>'
    return out


def log(sc, x, y, s, depth=0.0):
    c0 = sc.c('#9a5f36', depth)
    w = s * 2.2
    out = f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{w * 0.55:.1f}" ry="{s * 0.1:.1f}" fill="{sc.sh(c0, 0.6)}" opacity=".35"/>'
    out += f'<rect x="{x - w / 2:.1f}" y="{y - s * 0.7:.1f}" width="{w:.1f}" height="{s * 0.7:.1f}" rx="{s * 0.3:.1f}" fill="{sc.sh(c0, 0.25)}"/>'
    out += f'<rect x="{x - w / 2:.1f}" y="{y - s * 0.7:.1f}" width="{w:.1f}" height="{s * 0.3:.1f}" rx="{s * 0.15:.1f}" fill="{sc.hi(c0, 0.15)}"/>'
    ex = x + sc.L * w / 2
    out += f'<ellipse cx="{ex:.1f}" cy="{y - s * 0.35:.1f}" rx="{s * 0.2:.1f}" ry="{s * 0.36:.1f}" fill="{sc.c("#e6b47a", depth)}"/>'
    out += f'<ellipse cx="{ex:.1f}" cy="{y - s * 0.35:.1f}" rx="{s * 0.1:.1f}" ry="{s * 0.2:.1f}" fill="none" stroke="{sc.c("#b98451", depth)}" stroke-width="{s * 0.035:.1f}"/>'
    out += sc.tuft(x - w * 0.3, y, s * 0.55, '#3f9a3a', depth)
    return out


def stump(sc, x, y, s, depth=0.0):
    c0 = sc.c('#8d5634', depth)
    out = f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{s * 0.7:.1f}" ry="{s * 0.1:.1f}" fill="{sc.sh(c0, 0.6)}" opacity=".35"/>'
    out += f'<path d="M{x - s * 0.62:.1f},{y:.1f} Q{x - s * 0.42:.1f},{y - s * 0.1:.1f} {x - s * 0.42:.1f},{y - s * 0.7:.1f} L{x + s * 0.42:.1f},{y - s * 0.7:.1f} Q{x + s * 0.42:.1f},{y - s * 0.1:.1f} {x + s * 0.62:.1f},{y:.1f}Z" fill="{sc.sh(c0, 0.25)}"/>'
    out += f'<path d="M{x + sc.L * s * 0.05:.1f},{y:.1f} L{x + sc.L * s * 0.05:.1f},{y - s * 0.7:.1f} L{x + sc.L * s * 0.42:.1f},{y - s * 0.7:.1f} Q{x + sc.L * s * 0.42:.1f},{y - s * 0.1:.1f} {x + sc.L * s * 0.62:.1f},{y:.1f}Z" fill="{sc.hi(c0, 0.12)}"/>'
    out += f'<ellipse cx="{x:.1f}" cy="{y - s * 0.7:.1f}" rx="{s * 0.42:.1f}" ry="{s * 0.15:.1f}" fill="{sc.c("#e8b97f", depth)}"/>'
    out += f'<ellipse cx="{x:.1f}" cy="{y - s * 0.7:.1f}" rx="{s * 0.25:.1f}" ry="{s * 0.08:.1f}" fill="none" stroke="{sc.c("#b98451", depth)}" stroke-width="{s * 0.03:.1f}"/>'
    return out + mushroom(sc, x + sc.L * s * 0.55, y + s * 0.02, s * 0.35, '#f08a3c', depth)


def tent(sc, x, y, s, col='#f2b544'):
    L = sc.L
    c0 = sc.c(col)
    out = f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{s * 0.75:.1f}" ry="{s * 0.08:.1f}" fill="{sc.sh(c0, 0.7)}" opacity=".35"/>'
    out += f'<path d="M{x - s * 0.7:.1f},{y:.1f} Q{x - s * 0.45:.1f},{y - s * 0.9:.1f} {x:.1f},{y - s:.1f} Q{x + s * 0.45:.1f},{y - s * 0.9:.1f} {x + s * 0.7:.1f},{y:.1f}Z" fill="{sc.sh(c0, 0.28)}"/>'
    out += f'<path d="M{x:.1f},{y - s:.1f} Q{x + L * s * 0.45:.1f},{y - s * 0.9:.1f} {x + L * s * 0.7:.1f},{y:.1f} L{x + L * s * 0.08:.1f},{y:.1f}Z" fill="{sc.hi(c0, 0.2)}"/>'
    out += f'<path d="M{x - s * 0.04:.1f},{y - s * 0.95:.1f} Q{x - s * 0.16:.1f},{y - s * 0.4:.1f} {x - s * 0.3:.1f},{y:.1f} L{x + s * 0.08:.1f},{y:.1f}Z" fill="{sc.sh(c0, 0.75)}"/>'
    out += f'<path d="M{x:.1f},{y - s:.1f} L{x:.1f},{y - s * 1.12:.1f}" stroke="{sc.sh(c0, 0.5)}" stroke-width="{s * 0.03:.1f}"/>'
    return out


def campfire(sc, x, y, s):
    out = sc.glow(x, y - s * 0.4, s * 2.4, '#ffb14a', 0.55)
    wood = sc.c('#7a3f8f')
    for a in (-22, 22, 0):
        out += f'<rect x="{x - s * 0.55:.1f}" y="{y - s * 0.12:.1f}" width="{s * 1.1:.1f}" height="{s * 0.16:.1f}" rx="{s * 0.08:.1f}" fill="{wood if a else sc.sh(wood, 0.25)}" transform="rotate({a} {x:.1f} {y - s * 0.04:.1f})"/>'
    out += f'<path d="M{x - s * 0.34:.1f},{y - s * 0.1:.1f} Q{x - s * 0.42:.1f},{y - s * 0.6:.1f} {x - s * 0.05:.1f},{y - s * 1.2:.1f} Q{x + s * 0.05:.1f},{y - s * 0.8:.1f} {x + s * 0.2:.1f},{y - s * 0.75:.1f} Q{x + s * 0.4:.1f},{y - s * 0.45:.1f} {x + s * 0.34:.1f},{y - s * 0.1:.1f}Z" fill="#ff8a2a"/>'
    out += f'<path d="M{x - s * 0.18:.1f},{y - s * 0.1:.1f} Q{x - s * 0.22:.1f},{y - s * 0.45:.1f} {x:.1f},{y - s * 0.8:.1f} Q{x + s * 0.24:.1f},{y - s * 0.4:.1f} {x + s * 0.18:.1f},{y - s * 0.1:.1f}Z" fill="#ffc94a"/>'
    out += f'<path d="M{x - s * 0.08:.1f},{y - s * 0.12:.1f} Q{x - s * 0.08:.1f},{y - s * 0.32:.1f} {x:.1f},{y - s * 0.46:.1f} Q{x + s * 0.1:.1f},{y - s * 0.3:.1f} {x + s * 0.08:.1f},{y - s * 0.12:.1f}Z" fill="#fff3b8"/>'
    return out


def floating_island(sc, x, y, w, depth=0.0, falls=True):
    """Isla flotante: hierba arriba, roca facetada abajo y cascada."""
    r = sc.rng
    L = sc.L
    g0, rk = sc.c('#7cc23f', depth), sc.c('#d0743a', depth)
    hh = w * r.uniform(0.55, 0.8)
    under = [(x - w / 2, y), (x - w * 0.3, y + hh * 0.45), (x - w * 0.05, y + hh), (x + w * 0.2, y + hh * 0.5), (x + w / 2, y)]
    out = f'<path d="{poly(under)}" fill="{sc.sh(rk, 0.3)}"/>'
    lit = [(x - w * 0.05, y + hh), (x + L * w * 0.2, y + hh * 0.5), (x + L * w / 2, y), (x, y)]
    out += f'<path d="{poly(lit)}" fill="{rk}"/>'
    out += f'<path d="M{x + L * w * 0.32:.1f},{y + hh * 0.05:.1f} L{x + L * w * 0.12:.1f},{y + hh * 0.42:.1f}" stroke="{sc.hi(rk, 0.35)}" stroke-width="{w * 0.025:.1f}" stroke-linecap="round"/>'
    top = [(x - w * 0.54, y + w * 0.02), (x - w * 0.4, y - w * 0.08), (x, y - w * 0.1), (x + w * 0.4, y - w * 0.08), (x + w * 0.54, y + w * 0.02), (x + w * 0.2, y + w * 0.08), (x - w * 0.2, y + w * 0.08)]
    out += f'<path d="{curve(top, True)}" fill="{sc.sh(g0, 0.2)}"/>'
    out += f'<path d="{curve([(px, py - w * 0.025) for px, py in top[:5]] + [(x, y + w * 0.02)], True)}" fill="{g0}"/>'
    for k in range(4):
        dx = r.uniform(-0.45, 0.45) * w
        out += f'<path d="M{x + dx:.1f},{y + w * 0.05:.1f} q{w * 0.02:.1f},{w * 0.06:.1f} 0,{w * r.uniform(0.06, 0.14):.1f}" stroke="{sc.sh(g0, 0.15)}" stroke-width="{w * 0.03:.1f}" stroke-linecap="round"/>'
    if falls:
        fx = x + r.uniform(-0.25, 0.25) * w
        fw = w * 0.07
        g = sc.lgrad([(0, '#ffffff', 0.95), (0.7, '#cdeefc', 0.8), (1, '#cdeefc', 0)])
        out += f'<rect x="{fx - fw / 2:.1f}" y="{y:.1f}" width="{fw:.1f}" height="{w * 1.6:.1f}" fill="url(#{g})"/>'
        out += f'<rect x="{fx - fw * 0.15:.1f}" y="{y:.1f}" width="{fw * 0.18:.1f}" height="{w * 1.2:.1f}" fill="#ffffff" opacity=".7"/>'
        out += f'<path d="M{fx - fw:.1f},{y + w * 0.03:.1f} Q{fx:.1f},{y - w * 0.02:.1f} {fx + fw:.1f},{y + w * 0.03:.1f}" stroke="#ffffff" stroke-width="{w * 0.025:.1f}" fill="none" stroke-linecap="round"/>'
    return out


def arches(sc, x, y, s, n=3, col='#c9b2d6'):
    c0 = sc.c(col)
    out = ''
    for i in range(n):
        ax = x + i * s * 0.62
        hh = s * (1 - i * 0.12)
        out += (f'<path d="M{ax:.1f},{y:.1f} L{ax:.1f},{y - hh * 0.75:.1f} Q{ax + s * 0.3:.1f},{y - hh * 1.05:.1f} {ax + s * 0.6:.1f},{y - hh * 0.75:.1f} L{ax + s * 0.6:.1f},{y:.1f} '
                f'L{ax + s * 0.48:.1f},{y:.1f} L{ax + s * 0.48:.1f},{y - hh * 0.62:.1f} Q{ax + s * 0.3:.1f},{y - hh * 0.82:.1f} {ax + s * 0.12:.1f},{y - hh * 0.62:.1f} L{ax + s * 0.12:.1f},{y:.1f}Z" fill="{sc.sh(c0, 0.18)}"/>')
        out += f'<rect x="{ax:.1f}" y="{y - hh * 0.75:.1f}" width="{s * 0.06:.1f}" height="{hh * 0.75:.1f}" fill="{sc.hi(c0, 0.3)}"/>'
    out += f'<rect x="{x - s * 0.05:.1f}" y="{y - s * 0.86:.1f}" width="{s * (0.62 * (n - 1) + 0.7):.1f}" height="{s * 0.1:.1f}" fill="{c0}"/>'
    return out


def grass_spot(sc, x, y, s, col='#4fb04a'):
    out = sc.tuft(x - s * 0.3, y, s * 0.8, col) + sc.tuft(x + s * 0.3, y, s * 0.85, col) + sc.tuft(x, y + s * 0.02, s, col)
    return out


def flowers_spot(sc, x, y, s):
    out = sc.tuft(x, y, s * 0.6, '#3f9a3a')
    for dx, dy, k in ((-0.32, -0.35, 0.34), (0.0, -0.55, 0.4), (0.32, -0.32, 0.34), (-0.12, -0.15, 0.3), (0.2, -0.1, 0.28)):
        out += sc.daisy(x + dx * s, y + dy * s, s * k * 0.6)
    return out


# Catálogo de objetos que se exportan sueltos (100x100, suelo en y=92) para usarlos como escondites.
OBJETOS = {
    'arbusto': ('dia', lambda sc: sc.bush(50, 92, 88, '#3f9e4a')),
    'arbusto-flores': ('dia', lambda sc: sc.bush(50, 92, 88, '#3a9446', flowers='#ff7fb6')),
    'cerezo': ('dia', lambda sc: sc.cherry(50, 96, 72, petals=6)),
    'arbol': ('dia', lambda sc: sc.tree(50, 94, 88, '#4caa45')),
    'abeto': ('dia', lambda sc: sc.conifer(50, 94, 88, '#2f7d4a')),
    'abeto-nieve': ('dia', lambda sc: sc.conifer(50, 94, 88, '#2f6d55', snow=True)),
    'hierba': ('dia', lambda sc: grass_spot(sc, 50, 92, 56)),
    'flores': ('dia', lambda sc: flowers_spot(sc, 50, 92, 70)),
    'roca': ('dia', lambda sc: rock(sc, 50, 90, 52)),
    'roca-musgo': ('dia', lambda sc: rock(sc, 50, 90, 52, '#7f8aa0', True)),
    'seta': ('dia', lambda sc: mushroom(sc, 50, 92, 72)),
    'tronco': ('dia', lambda sc: log(sc, 50, 86, 34)),
    'tocon': ('dia', lambda sc: stump(sc, 46, 90, 56)),
    'nenufar': ('dia', lambda sc: lily(sc, 50, 66, 40, True)),
    'farol': ('magico', lambda sc: lantern(sc, 50, 14, 58, hang=True)),
    'hoguera': ('crepusculo', lambda sc: campfire(sc, 50, 88, 48)),
    'tienda': ('crepusculo', lambda sc: tent(sc, 50, 90, 70)),
}


# ======================= Paisajes =======================
# Los elementos que pueden tapar algo se pintan con s.c_* (o son nubes): son los escondites del juego y van en la capa.
def p_valle(s):
    """Valle con montañas, sol, colinas y lago (referencias 2 y 8)."""
    s.sky(); s.clouds(5, 0.05, 0.3, 200, 420); s.birds(7, 0.3, 0.8, 0.12, 0.3)
    s.mountains(600, 6, 260, 430, 0.62, '#5aa9c8', snow=0.26)
    s.mountains(660, 9, 120, 220, 0.42, '#4ea39a', fog=0.4)
    h = s.hill(700, 22, 0.3, '#58b85a')
    for x in [s.rng.uniform(0, W) for _ in range(16)]:
        s.c_tree(x, y_at(h, x) + 8, s.rng.uniform(60, 110), '#2f8f4a', 0.35)
    s.pond(W * 0.5, 800, 560, 95, refl=True)
    s.c_water_at([(W * 0.4, 790), (W * 0.62, 805)], size=130)
    s.hide_zone(W * 0.55, W * 0.72, H * 0.7, H * 0.78, 2, sink=0.4)
    for ix, iw in ((W * 0.45, 90), (W * 0.55, 60)):
        s.add(f'<ellipse cx="{ix:.0f}" cy="{812:.0f}" rx="{iw:.0f}" ry="{iw * 0.3:.0f}" fill="{s.c("#d9b36a")}"/>'
              f'<ellipse cx="{ix:.0f}" cy="{804:.0f}" rx="{iw * 0.8:.0f}" ry="{iw * 0.24:.0f}" fill="{s.c("#6cc24a")}"/>')
        s.c_bush(ix + iw * 0.1, 806, iw * 0.7, '#3f9a3f')
    for x, y, w in ((W * 0.7, 845, 150), (W * 0.84, 790, 130), (W * 0.32, 770, 120)):   # arbustos de la orilla
        s.c_bush(x, y, w, '#3a9446')
    pts = s.hill(860, 30, 0.0, '#5cc24a', k=2)
    for x, y, sz in ((W * 0.6, 930, 120), (W * 0.76, 990, 160), (W * 0.9, 900, 130)):
        s.c_grass(x, y, sz, '#3f9a3a')
    s.hide_zone(W * 0.55, W * 0.95, H * 0.84, H * 0.92, 2, sink=0.2)
    s.meadow_details(pts, 36, 22, ('#ffd84a', '#ffffff'))
    s.add(f'<g>{"".join(s.daisy(x, y, sz) for x, y, sz in ((380, 1040, 30), (430, 1010, 24), (1380, 1030, 28), (1440, 1050, 34)))}</g>')
    s.finish(0.2)


def p_atardecer_rosa(s):
    """Atardecer rosa con montañas, estanque y margaritas (referencia 1)."""
    s.sky(); s.clouds(6, 0.02, 0.35, 220, 460, 0.1, 2)
    s.mountains(640, 7, 240, 420, 0.25, '#e0569c', fog=0.35)
    h = s.hill(700, 26, 0.3, '#8fcf4a')
    s.hide_zone(W * 0.55, W * 0.92, H * 0.6, H * 0.66, 2, sink=0.3)
    for x in (260, 420, 1010, 1100, 1200, 1500):
        s.c_bush(x, y_at(h, x) + 10, s.rng.uniform(70, 140), '#145a3a', 0.15)
    s.water(760, 900, '#ff8f7a', sparkle=True)
    s.c_water_at([(W * 0.42, 830), (W * 0.6, 840), (W * 0.76, 825)], size=120)
    s.hide_zone(W * 0.55, W * 0.92, H * 0.74, H * 0.8, 2, sink=0.4)
    pts = s.hill(880, 26, 0.0, '#5fb03c', k=2)
    for x, y, sz in ((W * 0.62, 960, 130), (W * 0.78, 1000, 150)):
        s.c_grass(x, y, sz, '#2f7a3a')
    s.meadow_details(pts, 30, 10, ('#fff6a8',))
    s.add('<g>' + ''.join(s.daisy(x, y, sz) for x, y, sz in ((60, 1050, 34), (140, 1040, 30), (230, 1060, 26), (540, 1050, 32), (600, 1030, 24))) + '</g>')
    s.frame_plants('#2d5a2a', 'right', 0.8)
    s.fireflies(18, 0.4, 0.9, '#fff3a0')
    s.finish(0.25)


def p_acantilado(s):
    """Acantilado con camino, rocas y nubes grandes sobre un valle (referencia 3)."""
    s.sky(); s.birds(4)
    for x, y, w in ((640, 240, 300), (1480, 280, 360), (1020, 430, 280), (1180, 640, 440), (1780, 610, 400)):
        s.cloud(x, y, w, w * 0.55, 0.15, flat=False)
    s.mountains(720, 10, 60, 140, 0.7, '#6aa0c0', fog=0.5, x0=900)
    s.add(f'<rect x="900" y="720" width="{W}" height="400" fill="{s.c("#7fbf6a", 0.6)}"/>')
    s.add('<g>' + ''.join(s.tree(x, 760 + s.rng.uniform(-10, 10), s.rng.uniform(30, 50), '#3f9a4a', 0.6) for x in range(960, 1960, 70)) + '</g>')
    for x, y, w in ((1300, 940, 520), (1800, 900, 480)):
        s.cloud(x, y, w, w * 0.4, 0.3, flat=False)
    c0 = s.c('#5a6a8c')
    s.add(f'<path d="M940,600 L1130,690 L1150,820 L1060,{H + 40} L800,{H + 40}Z" fill="{s.sh(c0, 0.25)}"/>')
    s.add(f'<path d="M1040,640 L1130,690 L1150,820 L1060,{H + 40} L980,{H + 40} L1010,760Z" fill="{s.hi(c0, 0.12)}"/>')
    top = [(-60, 560), (200, 520), (500, 545), (800, 600), (1000, 640), (1090, 680)]
    g0 = s.c('#6cc048')
    g = s.lgrad([(0, s.hi(g0, 0.2), 1), (1, s.sh(g0, 0.3), 1)], 0, 520, 0, H, 'userSpaceOnUse')
    s.add(f'<path d="{curve(top)} L1000,820 L860,{H + 40} L-60,{H + 40}Z" fill="url(#{g})"/>')
    s.add(f'<path d="{curve([(x, y + 3) for x, y in top])}" stroke="{s.hi(g0, 0.45)}" stroke-width="9" fill="none" opacity=".55" stroke-linecap="round"/>')
    s.dirt_path(top, 940, 300, 30, 300, '#d8b07a')
    for x, y, sz, moss in ((330, 700, 70, False), (420, 690, 50, False), (760, 690, 60, False), (120, 760, 90, True)):
        s.c_rock(x, y, sz, moss=moss)
    s.c_tree(90, 560, 300, '#3f9a3f'); s.c_tree(230, 550, 230, '#4aa845')
    s.c_grass(640, 650, 90, '#4aa845')
    s.add('<g>' + ''.join(s.daisy(x, y, 9) for x, y in ((520, 660), (600, 690), (650, 670), (860, 680))) + '</g>')
    s.c_rock(60, H + 20, 260, '#56607e')
    s.finish(0.22)


def p_islas(s):
    """Islas flotantes con cascadas, cerezo y ruinas (referencia 4)."""
    s.sky(); s.clouds(4, 0.08, 0.3, 240, 420, 0.1, 3)
    for x, y, w in ((200, 1060, 700), (900, 1100, 800), (1600, 1060, 700)):
        s.cloud(x, y, w, w * 0.45, 0.05)
    for x, y, w in ((260, 600, 260), (620, 640, 180), (900, 720, 90), (380, 900, 70)):
        s.c_island(x, y, w, 0.25 if w < 200 else 0.1)
    s.c_island(1500, 690, 760)
    s.c_arches(1380, 640, 170)
    s.c_cherry(1560, 600, 380, petals=40, col='#f59ccd')
    s.birds(9, 0.1, 0.9, 0.1, 0.8, '#ffffff')
    s.petals(30)
    s.finish(0.15)


def p_campamento(s):
    """Campamento al anochecer con tienda, hoguera y árboles lilas (referencia 5)."""
    s.sky(); s.clouds(4, 0.05, 0.3, 260, 520, 0.2, 4)
    s.add(f'<g opacity=".6">{s.glow(1100, 500, 140, "#ffffff", 0.4)}{s.glow(420, 260, 90, "#ffffff", 0.3)}</g>')
    s.mountains(700, 5, 200, 380, 0.55, '#8f7fe0', fog=0.5)
    h = s.hill(700, 40, 0.3, '#5a8ff0', rim=True)
    for x in (80, 260, 560, 720, 1500, 1700):
        s.c_bush(x, y_at(h, x) + 14, s.rng.uniform(80, 160), '#3f6fe0', 0.35)
    pts = s.hill(820, 50, 0.0, '#6fa0ff', k=2)
    s.c_tent(1350, y_at(pts, 1350) + 40, 300, '#f6b65a')
    s.c_campfire(1130, y_at(pts, 1130) + 110, 90)
    s.c_tree(260, 980, 700, '#d58ad8', trunk_col='#4a2a7a')
    for x, y, sz in ((90, H + 20, 260), (700, H + 10, 200), (1600, 990, 150), (1750, H + 10, 240)):
        s.c_grass(x, y, sz, '#7a8ff0')
    s.fireflies(14, 0.5, 0.95, '#ffd8a0')
    s.finish(0.25)


def p_cerezos(s):
    """Cerezos junto a un estanque con nenúfares y montañas (referencias 6 y 7)."""
    s.sky(); s.clouds(4, 0.06, 0.3, 180, 360, 0.2, 2); s.birds(3, 0.3, 0.6, 0.2, 0.3)
    s.mountains(600, 6, 250, 420, 0.55, '#8f8fc0', snow=0.2)
    h = s.hill(650, 16, 0.4, '#7fc85a')
    for x in (150, 380, 700, 1200, 1700):
        s.c_bush(x, y_at(h, x) + 8, s.rng.uniform(60, 110), '#4a9a4a', 0.4)
    s.water(670, H + 10, '#43b8e8')
    s.c_water_at([(W * 0.45, 960), (W * 0.62, 1000), (W * 0.36, 700)], size=140)
    s.hide_zone(W * 0.5, W * 0.95, H * 0.66, H * 0.72, 2, sink=0.4)
    s.add(f'<path d="M-40,760 Q300,700 760,740 L780,790 Q300,800 -40,860Z" fill="{s.c("#6fbf4a")}"/><path d="M-40,780 Q300,730 760,760 L780,790 Q300,800 -40,860Z" fill="{s.c("#c98a4a")}" opacity=".6"/>')
    bank = [(900, 840), (1050, 770), (1300, 750), (1600, 760), (1980, 740)]
    g0 = s.c('#6fbf4a')
    s.add(f'<path d="{curve(bank)} L1980,860 Q1500,900 1100,880 Q960,870 900,840Z" fill="{s.c("#c98a4a")}"/>')
    s.add(f'<path d="{curve(bank)} L1980,830 Q1500,860 1100,850 Q960,845 900,840Z" fill="{g0}"/>')
    s.add(f'<path d="{curve([(x, y + 3) for x, y in bank])}" stroke="{s.hi(g0, 0.45)}" stroke-width="7" fill="none" opacity=".6"/>')
    s.c_cherry(1320, 800, 720, petals=60)
    s.hide_zone(W * 0.55, W * 0.95, H * 0.82, H * 0.9, 2, sink=0.45)
    s.c_bush(140, 760, 140, '#3f9a3f'); s.c_bush(1700, 800, 180, '#3f9a3f'); s.c_bush(1020, 820, 110, '#3f9a3f')
    out = ''
    for _ in range(22):
        out += lily(s, s.rng.uniform(100, W - 100), s.rng.uniform(860, 1060), s.rng.uniform(16, 38), s.rng.random() < 0.25)
    s.add(f'<g>{out}</g>')
    s.petals(50)
    s.finish(0.2)


def p_bosque_claro(s):
    """Claro del bosque con camino, arbustos y flores amarillas (referencia 9)."""
    s.sky(); s.clouds(5, 0.18, 0.42, 260, 460, 0.15, 2)
    h = s.hill(640, 14, 0.5, '#8fcf6a')
    for x in (520, 640, 900, 1140, 1300):
        s.c_tree(x, y_at(h, x) + 6, s.rng.uniform(140, 220), '#5aa84a', 0.5)
    pts = s.hill(700, 16, 0.0, '#5fb83c', k=2)
    s.dirt_path(pts, 980, 380, 60, 260, '#d98a5a')
    for x, y, sz in ((1220, 860, 130), (1060, 760, 90), (1560, 800, 110)):
        s.c_grass(x, y, sz, '#3f9a3a')
    for x, y, hh, col in ((140, 980, 980, '#7fa23a'), (1650, 900, 860, '#8fae3a'), (1900, 1000, 940, '#6f9a3a'), (430, 880, 620, '#88a83a')):
        s.c_tree(x, y, hh, col, trunk_col='#a8508a')
    s.c_bush(150, H + 10, 340, '#2f7a4a'); s.c_bush(1450, 1000, 300, '#2f7a4a'); s.c_bush(1800, H + 20, 260, '#2f7a4a')
    s.meadow_details(pts, 24, 0, ('#ffd84a', '#ffe36a'))
    s.finish(0.2)


def p_pantano(s):
    """Pantano verde con árboles retorcidos y rocas con musgo (referencia 10)."""
    s.sky()
    for x in (200, 600, 1000, 1400, 1800):
        s.add(f'<rect x="{x + s.rng.uniform(-60, 60):.0f}" y="0" width="{s.rng.uniform(40, 90):.0f}" height="{H}" fill="{s.c("#1f6a5a", 0.6)}" opacity=".7"/>')
    s.rays(W * 0.5, 4, '#eaff9a', 0.14)
    for x, hh in ((150, 1100), (480, 980), (780, 1150), (1150, 1000), (1500, 1200)):
        s.trunk_peeks(x, 720 - hh * 0.6, 720 - hh * 0.15, hh * 0.12)
        s.add(s.twisted(x, 720, hh, '#d08a3a', 0.25))
    s.water(700, H + 10, '#6fae3a', sparkle=False)
    s.c_water_at([(W * 0.42, 860), (W * 0.58, 930), (W * 0.72, 880)], size=140)
    s.hide_zone(W * 0.55, W * 0.92, H * 0.7, H * 0.85, 2, sink=0.4)
    out = ''
    for _ in range(30):
        x = s.rng.uniform(0, W)
        out += s.tuft(x, s.rng.uniform(700, 760), s.rng.uniform(40, 120), '#8fd04a', 0.2)
    s.add(f'<g>{out}</g>')
    for x, y, sz in ((W * 0.62, 790, 120), (W * 0.82, 820, 140)):
        s.c_grass(x, y, sz, '#8fd04a', 0.2)
    s.c_rock(120, 1050, 200, '#7a8a5a', True); s.c_rock(420, 1080, 140, '#7a8a5a', True); s.c_rock(1750, 1040, 220, '#7a8a5a', True)
    s.add('<g>' + ''.join(s.tuft(x, H + 20, sz, '#6fbf3a') for x, sz in ((300, 220), (1600, 260), (950, 160))) + '</g>')
    s.add(s.twisted(-40, H + 40, 1300, '#8a4a2a'))
    s.fireflies(30, 0.2, 0.8, '#f4ff8a')
    s.finish(0.3, 0.15)


def p_bosque_noche(s):
    """Bosque azul de noche con luciérnagas (referencia 11)."""
    s.sky(stars=60, body=False)
    s.add(s.glow(W * 0.5, H * 0.42, 620, '#7fd4ff', 0.7))
    for x, hh, d, wb in ((240, 1300, 0.7, 70), (560, 1250, 0.6, 60), (820, 1250, 0.75, 40), (1180, 1250, 0.7, 50), (1420, 1300, 0.6, 70), (1700, 1300, 0.7, 60)):
        s.trunk_peeks(x, H - hh * 0.7, H - hh * 0.38, max(wb, 50))
        s.add(s.trunk(x, H, hh, wb, wb * 0.5, s.c('#1d2a7a', d), s.rng.uniform(-0.04, 0.04)))
    s.add('<g>' + ''.join(s.blob_cluster(x, y, rx, rx * 0.6, s.c('#10195a', 0.3), 7, False) for x, y, rx in ((150, 40, 420), (700, -40, 380), (1250, -30, 420), (1800, 60, 460))) + '</g>')
    h = s.hill(780, 40, 0.3, '#2a4fb0')
    for x in (100, 500, 1150, 1400, 1800):
        s.c_bush(x, y_at(h, x) + 20, s.rng.uniform(120, 240), '#1f3a9a', 0.3)
    pts = s.hill(900, 30, 0.0, '#2346a8', k=2)
    s.dirt_path(pts, 980, 900, 80, 700, '#4a74d8')
    for x, y, sz in ((W * 0.66, 960, 150), (W * 0.82, 1010, 180)):
        s.c_grass(x, y, sz, '#1f3a9a')
    s.hide_zone(W * 0.55, W * 0.9, H * 0.84, H * 0.9, 2, sink=0.25)
    for x, hh in ((70, 1400), (1850, 1500)):
        s.add(s.trunk(x, H + 20, hh, 300, 180, s.c('#0d1450'), 0.05 if x < W / 2 else -0.05))
        s.add(f'<path d="M{x:.0f},{300:.0f} Q{W / 2:.0f},{120 if x < W / 2 else 220} {W / 2 + (300 if x < W / 2 else -300):.0f},{-20}" stroke="{s.c("#0d1450")}" stroke-width="38" fill="none" stroke-linecap="round"/>')
    s.frame_plants('#16226a', 'both', 1.1)
    s.fireflies(70, 0.2, 1.0, '#5ff4ff')
    s.finish(0.4, 0.2)


def p_bosque_magico(s):
    """Bosque mágico con faroles, setas, flores y camino de piedras (referencia 12)."""
    s.sky()
    s.add(s.glow(W * 0.5, H * 0.45, 600, '#c8ffe8', 0.6))
    for x, hh, d in ((420, 1200, 0.7), (760, 1100, 0.75), (1200, 1150, 0.75), (1550, 1250, 0.7)):
        s.trunk_peeks(x, 760 - hh * 0.5, 760 - hh * 0.12, hh * 0.1)
        s.add(s.twisted(x, 760, hh * 0.8, '#3f6a6a', d))
    pts = s.hill(760, 20, 0.2, '#7fae3a')
    for x, bend, hh in ((120, 0.08, 1300), (1800, -0.08, 1300)):
        s.add(s.trunk(x, H + 20, hh, 300, 160, s.c('#4f4a3a'), bend))
    s.add('<g>' + ''.join(lantern(s, x, y, sz) for x, y, sz in ((380, 120, 150), (820, 300, 90), (1180, 220, 110), (1560, 150, 140), (1060, 380, 60))) + '</g>')
    s.dirt_path(pts, 960, 900, 60, 560, '#c9c2a0')
    st = ''
    for _ in range(30):
        t = s.rng.uniform(0.1, 1)
        y = 780 + (H - 780) * t
        x = 960 + s.rng.uniform(-1, 1) * (40 + 260 * t)
        st += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{10 + 50 * t:.0f}" ry="{5 + 22 * t:.0f}" fill="{s.c("#e8e2c0")}" stroke="{s.c("#8a8a6a")}" stroke-width="{1 + 3 * t:.1f}"/>'
    s.add(f'<g>{st}</g>')
    s.c_grass(1250, 900, 120, '#3f8a4a')
    for x, y, w, fl in ((200, 960, 360, '#ff6fd0'), (560, 860, 220, '#b07aff'), (1400, 870, 240, '#ff8a5a'), (1760, 940, 380, '#ffd84a')):
        s.c_bush(x, y, w, '#3f8a4a', 0.0, fl)
    s.c_mushroom(230, 1040, 160); s.c_mushroom(380, 1010, 80); s.c_mushroom(1660, 1000, 140); s.c_mushroom(1540, 1040, 70, '#ff7a4a')
    s.add('<g>' + ''.join(s.daisy(x, y, sz, '#7ac8ff', '#ffe36a') for x, y, sz in ((90, 1010, 50), (1880, 1040, 46))) + '</g>')
    s.frame_plants('#2a6a5a', 'both', 0.7)
    s.fireflies(40, 0.1, 0.9, '#fff6b0')
    s.finish(0.35, 0.15)

# ======================= Rarezas (estilo de iconos: contorno grueso, color plano y brillo) =======================
ODD_NAMES = {
    'pokeball': 'una Poké Ball', 'superball': 'una Super Ball', 'ultraball': 'una Ultra Ball', 'masterball': 'una Master Ball', 'lujoball': 'una Lujo Ball',
    'medalla-roca': 'la Medalla Roca', 'medalla-cascada': 'la Medalla Cascada', 'medalla-arcoiris': 'la Medalla Arcoíris',
    'medalla-alma': 'la Medalla Alma', 'medalla-volcan': 'la Medalla Volcán',
    'patito': 'un patito de goma', 'paraguas': 'un paraguas', 'helado': 'un helado', 'calcetin': 'un calcetín', 'pizza': 'una porción de pizza',
    'globo': 'un globo', 'corona': 'una corona', 'tetera': 'una tetera', 'zanahoria': 'una zanahoria', 'bota': 'una bota',
    'despertador': 'un despertador', 'pez': 'un pez', 'muneco': 'un muñeco de nieve', 'osito': 'un osito de peluche',
}
# Lo que sí encaja en cada bioma y no cuenta como rareza.
ODD_EXCLUDE = {'hielo': {'muneco'}, 'aurora': {'muneco'}, 'costa': {'pez'}}


def odd(sc, kind, x, y, s, depth=0.16):
    """Rareza con el estilo de los iconos de Poké Balls y medallas. Suelo en (x, y), alto s.
    depth la tiñe con la bruma y la luz de la escena para camuflarla."""
    R = s / 2
    cx, cy = x, y - R
    ol = mix(mix('#1d2036', sc.M['shadow'], 0.35), sc.M['haze'], depth * 0.5)
    sw = s * 0.06

    def col(c):
        return sc.c(c, depth)

    def P(d, fill, w=1.0):
        return f'<path d="{d}" fill="{fill}" stroke="{ol}" stroke-width="{sw * w:.1f}" stroke-linejoin="round" stroke-linecap="round"/>'

    def C(px, py, r, fill, w=1.0):
        return f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{r:.1f}" fill="{fill}" stroke="{ol}" stroke-width="{sw * w:.1f}"/>'

    def E(px, py, rx, ry, fill, w=1.0):
        return f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" fill="{fill}" stroke="{ol}" stroke-width="{sw * w:.1f}"/>'

    def glint(gx, gy, gr):
        return (f'<ellipse cx="{gx:.1f}" cy="{gy:.1f}" rx="{gr:.1f}" ry="{gr * 0.5:.1f}" fill="#fff" opacity=".85" transform="rotate(-35 {gx:.1f} {gy:.1f})"/>'
                f'<circle cx="{gx + gr * 1.2:.1f}" cy="{gy - gr * 0.5:.1f}" r="{gr * 0.25:.1f}" fill="#fff" opacity=".85"/>')

    def ball(top, extra=''):
        r = R * 0.92
        out = C(cx, cy, r, col('#f2f2f4'))
        out += P(f'M{cx - r:.1f},{cy:.1f} A{r:.1f},{r:.1f} 0 0 1 {cx + r:.1f},{cy:.1f}Z', col(top))
        out += extra
        out += f'<path d="M{cx - r:.1f},{cy:.1f} H{cx + r:.1f}" stroke="{ol}" stroke-width="{sw * 1.4:.1f}"/>'
        out += C(cx, cy, r * 0.3, col('#f2f2f4'), 1.2) + C(cx, cy, r * 0.14, col('#ffffff'), 0.7)
        return out + glint(cx - r * 0.45, cy - r * 0.55, r * 0.2)

    r = R * 0.92
    if kind == 'pokeball':
        return ball('#e3352d')
    if kind == 'superball':
        w = ''.join(P(poly([(cx + k * r * 0.78, cy - r * 0.55), (cx + k * r * 0.3, cy - r * 0.92), (cx + k * r * 0.36, cy - r * 0.42)]), col('#e8453c'), 0.7) for k in (-1, 1))
        return ball('#2f86d8', w)
    if kind == 'ultraball':
        arch = (f'M{cx - r * 0.6:.1f},{cy:.1f} L{cx - r * 0.6:.1f},{cy - r * 0.45:.1f} Q{cx:.1f},{cy - r * 1.02:.1f} {cx + r * 0.6:.1f},{cy - r * 0.45:.1f} '
                f'L{cx + r * 0.6:.1f},{cy:.1f} L{cx + r * 0.32:.1f},{cy:.1f} L{cx + r * 0.32:.1f},{cy - r * 0.36:.1f} Q{cx:.1f},{cy - r * 0.68:.1f} {cx - r * 0.32:.1f},{cy - r * 0.36:.1f} L{cx - r * 0.32:.1f},{cy:.1f}Z')
        return ball('#f6c21a', P(arch, col('#2a2a30'), 0.6))
    if kind == 'masterball':
        return ball('#7b3fa8', C(cx - r * 0.45, cy - r * 0.55, r * 0.22, col('#e86aa8'), 0.7) + C(cx + r * 0.45, cy - r * 0.55, r * 0.22, col('#e86aa8'), 0.7))
    if kind == 'lujoball':
        return ball('#2b2b30', f'<path d="M{cx - r * 0.86:.1f},{cy - r * 0.28:.1f} Q{cx:.1f},{cy - r * 0.55:.1f} {cx + r * 0.86:.1f},{cy - r * 0.28:.1f}" stroke="{col("#e3352d")}" stroke-width="{r * 0.14:.1f}" fill="none"/>')
    if kind == 'medalla-roca':
        pts = [(cx + math.cos(math.radians(22.5 + k * 45)) * r, cy + math.sin(math.radians(22.5 + k * 45)) * r) for k in range(8)]
        inn = [(cx + (px - cx) * 0.55, cy + (py - cy) * 0.55) for px, py in pts]
        out = P(poly(pts), col('#a9adb8')) + P(poly(inn), col('#dde0e6'), 0.7)
        out += ''.join(f'<path d="M{a[0]:.1f},{a[1]:.1f} L{b[0]:.1f},{b[1]:.1f}" stroke="{ol}" stroke-width="{sw * 0.5:.1f}"/>' for a, b in zip(pts, inn))
        return out + glint(cx - r * 0.3, cy - r * 0.35, r * 0.16)
    if kind == 'medalla-cascada':
        d = (f'M{cx:.1f},{cy - r:.1f} C{cx + r * 0.25:.1f},{cy - r * 0.5:.1f} {cx + r * 0.78:.1f},{cy - r * 0.05:.1f} {cx + r * 0.72:.1f},{cy + r * 0.35:.1f} '
             f'A{r * 0.74:.1f},{r * 0.74:.1f} 0 0 1 {cx - r * 0.72:.1f},{cy + r * 0.35:.1f} C{cx - r * 0.78:.1f},{cy - r * 0.05:.1f} {cx - r * 0.25:.1f},{cy - r * 0.5:.1f} {cx:.1f},{cy - r:.1f}Z')
        return P(d, col('#4fb8f0')) + glint(cx - r * 0.28, cy + r * 0.1, r * 0.17)
    if kind == 'medalla-arcoiris':
        cols = ['#e8453c', '#ff9a2a', '#f6d21a', '#5fc24a', '#3fa0e8', '#7b5fe0', '#e86ab8']
        out = ''.join(C(cx + math.cos(k * 2 * math.pi / 7) * r * 0.55, cy + math.sin(k * 2 * math.pi / 7) * r * 0.55, r * 0.38, col(cc), 0.7) for k, cc in enumerate(cols))
        return out + C(cx, cy, r * 0.32, col('#f4f4f4')) + glint(cx - r * 0.1, cy - r * 0.12, r * 0.1)
    if kind == 'medalla-alma':
        d = (f'M{cx:.1f},{cy + r * 0.9:.1f} C{cx - r * 1.15:.1f},{cy + r * 0.05:.1f} {cx - r * 0.9:.1f},{cy - r * 1.0:.1f} {cx:.1f},{cy - r * 0.42:.1f} '
             f'C{cx + r * 0.9:.1f},{cy - r * 1.0:.1f} {cx + r * 1.15:.1f},{cy + r * 0.05:.1f} {cx:.1f},{cy + r * 0.9:.1f}Z')
        return P(d, col('#ff6fd0')) + glint(cx - r * 0.45, cy - r * 0.35, r * 0.17)
    if kind == 'medalla-volcan':
        d = (f'M{cx - r * 0.7:.1f},{cy + r * 0.85:.1f} Q{cx - r * 1.0:.1f},{cy - r * 0.1:.1f} {cx - r * 0.55:.1f},{cy - r * 0.75:.1f} Q{cx - r * 0.38:.1f},{cy - r * 0.25:.1f} {cx - r * 0.15:.1f},{cy - r * 0.35:.1f} '
             f'Q{cx:.1f},{cy - r * 1.05:.1f} {cx + r * 0.2:.1f},{cy - r * 0.38:.1f} Q{cx + r * 0.42:.1f},{cy - r * 0.2:.1f} {cx + r * 0.6:.1f},{cy - r * 0.78:.1f} '
             f'Q{cx + r * 1.0:.1f},{cy - r * 0.1:.1f} {cx + r * 0.7:.1f},{cy + r * 0.85:.1f}Z')
        gem = poly([(cx, cy - r * 0.15), (cx + r * 0.25, cy + r * 0.25), (cx, cy + r * 0.6), (cx - r * 0.25, cy + r * 0.25)])
        return P(d, col('#e8453c')) + P(gem, col('#ffd0d0'), 0.6) + glint(cx - r * 0.45, cy + r * 0.1, r * 0.13)
    if kind == 'patito':
        out = E(cx - r * 0.05, cy + r * 0.4, r * 0.85, r * 0.48, col('#ffd23f'))
        out += C(cx + r * 0.32, cy - r * 0.3, r * 0.4, col('#ffd23f'))
        out += P(poly([(cx + r * 0.66, cy - r * 0.32), (cx + r * 1.0, cy - r * 0.2), (cx + r * 0.66, cy - r * 0.08)]), col('#ff8a2a'), 0.7)
        out += f'<circle cx="{cx + r * 0.42:.1f}" cy="{cy - r * 0.4:.1f}" r="{r * 0.07:.1f}" fill="{ol}"/>'
        out += f'<path d="M{cx - r * 0.45:.1f},{cy + r * 0.3:.1f} Q{cx - r * 0.1:.1f},{cy + r * 0.55:.1f} {cx + r * 0.25:.1f},{cy + r * 0.25:.1f}" stroke="{ol}" stroke-width="{sw * 0.6:.1f}" fill="none"/>'
        return out + glint(cx + r * 0.15, cy - r * 0.5, r * 0.1)
    if kind == 'paraguas':
        d = (f'M{cx - r:.1f},{cy - r * 0.1:.1f} Q{cx - r * 0.95:.1f},{cy - r * 0.95:.1f} {cx:.1f},{cy - r * 0.95:.1f} Q{cx + r * 0.95:.1f},{cy - r * 0.95:.1f} {cx + r:.1f},{cy - r * 0.1:.1f} '
             + ''.join(f'Q{cx + r * (0.75 - k * 0.5):.1f},{cy - r * 0.32:.1f} {cx + r * (0.5 - k * 0.5):.1f},{cy - r * 0.1:.1f} ' for k in range(4)) + 'Z')
        out = f'<path d="M{cx:.1f},{cy - r * 0.1:.1f} V{cy + r * 0.75:.1f} q0,{r * 0.25:.1f} {-r * 0.25:.1f},{r * 0.2:.1f}" stroke="{ol}" stroke-width="{sw * 1.3:.1f}" fill="none" stroke-linecap="round"/>'
        return out + P(d, col('#e84a8a')) + glint(cx - r * 0.45, cy - r * 0.55, r * 0.13)
    if kind == 'helado':
        out = P(poly([(cx - r * 0.45, cy), (cx + r * 0.45, cy), (cx, cy + r * 0.98)]), col('#e0a35a'))
        out += f'<path d="M{cx - r * 0.25:.1f},{cy + r * 0.1:.1f} L{cx + r * 0.15:.1f},{cy + r * 0.6:.1f} M{cx + r * 0.25:.1f},{cy + r * 0.1:.1f} L{cx - r * 0.15:.1f},{cy + r * 0.6:.1f}" stroke="{ol}" stroke-width="{sw * 0.45:.1f}"/>'
        out += C(cx - r * 0.22, cy - r * 0.2, r * 0.34, col('#ff9cc8')) + C(cx + r * 0.22, cy - r * 0.2, r * 0.34, col('#8a5a3a')) + C(cx, cy - r * 0.58, r * 0.32, col('#fff2d0'))
        return out + C(cx + r * 0.05, cy - r * 0.92, r * 0.1, col('#e3352d'), 0.6) + glint(cx - r * 0.12, cy - r * 0.68, r * 0.08)
    if kind == 'calcetin':
        d = (f'M{cx - r * 0.3:.1f},{cy - r * 0.95:.1f} H{cx + r * 0.3:.1f} V{cy + r * 0.25:.1f} Q{cx + r * 0.3:.1f},{cy + r * 0.92:.1f} {cx - r * 0.3:.1f},{cy + r * 0.88:.1f} '
             f'H{cx - r * 0.7:.1f} Q{cx - r * 0.98:.1f},{cy + r * 0.6:.1f} {cx - r * 0.62:.1f},{cy + r * 0.38:.1f} Q{cx - r * 0.3:.1f},{cy + r * 0.25:.1f} {cx - r * 0.3:.1f},{cy:.1f}Z')
        out = P(d, col('#f4f4f4'))
        out += ''.join(f'<rect x="{cx - r * 0.3:.1f}" y="{cy - r * yy:.1f}" width="{r * 0.6:.1f}" height="{r * 0.14:.1f}" fill="{col("#e3352d")}"/>' for yy in (0.8, 0.5))
        return out + P(f'M{cx - r * 0.3:.1f},{cy - r * 0.95:.1f} H{cx + r * 0.3:.1f}', 'none', 1.2)
    if kind == 'pizza':
        out = P(poly([(cx - r * 0.82, cy - r * 0.55), (cx + r * 0.82, cy - r * 0.55), (cx, cy + r * 0.98)]), col('#ffd35a'))
        out += P(f'M{cx - r * 0.9:.1f},{cy - r * 0.55:.1f} Q{cx:.1f},{cy - r * 0.95:.1f} {cx + r * 0.9:.1f},{cy - r * 0.55:.1f} Q{cx:.1f},{cy - r * 0.68:.1f} {cx - r * 0.9:.1f},{cy - r * 0.55:.1f}Z', col('#d98a3a'))
        return out + ''.join(C(cx + dx * r, cy + dy * r, r * 0.13, col('#d8402a'), 0.6) for dx, dy in ((-0.3, -0.25), (0.25, -0.3), (0.0, 0.2), (-0.05, 0.55)))
    if kind == 'globo':
        out = f'<path d="M{cx:.1f},{cy + r * 0.48:.1f} q{-r * 0.2:.1f},{r * 0.2:.1f} 0,{r * 0.3:.1f} q{r * 0.2:.1f},{r * 0.15:.1f} 0,{r * 0.3:.1f}" stroke="{ol}" stroke-width="{sw * 0.6:.1f}" fill="none"/>'
        out += P(poly([(cx, cy + r * 0.42), (cx - r * 0.12, cy + r * 0.56), (cx + r * 0.12, cy + r * 0.56)]), col('#ff4a5a'), 0.6)
        return out + E(cx, cy - r * 0.25, r * 0.6, r * 0.7, col('#ff4a5a')) + glint(cx - r * 0.25, cy - r * 0.55, r * 0.15)
    if kind == 'corona':
        d = (f'M{cx - r * 0.85:.1f},{cy + r * 0.55:.1f} L{cx - r * 0.85:.1f},{cy - r * 0.45:.1f} L{cx - r * 0.45:.1f},{cy - r * 0.02:.1f} L{cx:.1f},{cy - r * 0.72:.1f} '
             f'L{cx + r * 0.45:.1f},{cy - r * 0.02:.1f} L{cx + r * 0.85:.1f},{cy - r * 0.45:.1f} L{cx + r * 0.85:.1f},{cy + r * 0.55:.1f}Z')
        out = P(d, col('#f6c21a')) + P(f'M{cx - r * 0.85:.1f},{cy + r * 0.25:.1f} H{cx + r * 0.85:.1f}', 'none', 0.7)
        return out + C(cx, cy + r * 0.05, r * 0.12, col('#e3352d'), 0.5) + C(cx - r * 0.5, cy + r * 0.38, r * 0.1, col('#3fa0e8'), 0.5) + C(cx + r * 0.5, cy + r * 0.38, r * 0.1, col('#3fa0e8'), 0.5)
    if kind == 'tetera':
        out = f'<path d="M{cx - r * 0.6:.1f},{cy - r * 0.05:.1f} q{-r * 0.45:.1f},{r * 0.05:.1f} {-r * 0.3:.1f},{r * 0.45:.1f} q{r * 0.1:.1f},{r * 0.15:.1f} {r * 0.3:.1f},{r * 0.15:.1f}" stroke="{ol}" stroke-width="{sw * 1.2:.1f}" fill="none"/>'
        out += P(f'M{cx + r * 0.5:.1f},{cy + r * 0.1:.1f} L{cx + r * 0.98:.1f},{cy - r * 0.35:.1f} L{cx + r * 0.9:.1f},{cy - r * 0.2:.1f} L{cx + r * 0.6:.1f},{cy + r * 0.45:.1f}Z', col('#7ac8e8'), 0.7)
        out += E(cx, cy + r * 0.2, r * 0.66, r * 0.58, col('#7ac8e8'))
        out += P(f'M{cx - r * 0.38:.1f},{cy - r * 0.3:.1f} Q{cx:.1f},{cy - r * 0.62:.1f} {cx + r * 0.38:.1f},{cy - r * 0.3:.1f}Z', col('#5aa8d0'), 0.7)
        return out + C(cx, cy - r * 0.56, r * 0.1, col('#f6c21a'), 0.5) + glint(cx - r * 0.3, cy, r * 0.12)
    if kind == 'zanahoria':
        out = ''.join(P(f'M{cx + r * 0.25:.1f},{cy - r * 0.45:.1f} q{r * dx:.1f},{-r * 0.5:.1f} {r * dx * 1.6:.1f},{-r * 0.5:.1f} q{-r * 0.05:.1f},{r * 0.3:.1f} {-r * dx * 1.6:.1f},{r * 0.5:.1f}Z', col('#4fbf4a'), 0.6) for dx in (-0.3, 0.1, 0.4))
        out += P(f'M{cx - r * 0.1:.1f},{cy - r * 0.5:.1f} Q{cx + r * 0.55:.1f},{cy - r * 0.62:.1f} {cx + r * 0.5:.1f},{cy - r * 0.2:.1f} L{cx - r * 0.75:.1f},{cy + r * 0.9:.1f}Z', col('#ff8a2a'))
        return out + f'<path d="M{cx:.1f},{cy - r * 0.1:.1f} l{r * 0.2:.1f},{r * 0.05:.1f} M{cx - r * 0.25:.1f},{cy + r * 0.25:.1f} l{r * 0.18:.1f},{r * 0.05:.1f}" stroke="{ol}" stroke-width="{sw * 0.5:.1f}"/>'
    if kind == 'bota':
        d = (f'M{cx - r * 0.4:.1f},{cy - r * 0.95:.1f} H{cx + r * 0.2:.1f} V{cy + r * 0.3:.1f} H{cx + r * 0.75:.1f} Q{cx + r * 0.98:.1f},{cy + r * 0.85:.1f} {cx + r * 0.6:.1f},{cy + r * 0.95:.1f} '
             f'H{cx - r * 0.4:.1f}Z')
        out = P(d, col('#8a5a3a')) + P(f'M{cx - r * 0.4:.1f},{cy + r * 0.8:.1f} H{cx + r * 0.9:.1f}', 'none', 0.8)
        return out + P(f'M{cx - r * 0.4:.1f},{cy - r * 0.7:.1f} H{cx + r * 0.2:.1f}', 'none', 0.6) + glint(cx - r * 0.18, cy - r * 0.45, r * 0.1)
    if kind == 'despertador':
        out = C(cx - r * 0.5, cy - r * 0.65, r * 0.25, col('#f6c21a'), 0.7) + C(cx + r * 0.5, cy - r * 0.65, r * 0.25, col('#f6c21a'), 0.7)
        out += f'<path d="M{cx - r * 0.45:.1f},{cy + r * 0.65:.1f} l{-r * 0.2:.1f},{r * 0.3:.1f} M{cx + r * 0.45:.1f},{cy + r * 0.65:.1f} l{r * 0.2:.1f},{r * 0.3:.1f}" stroke="{ol}" stroke-width="{sw:.1f}" stroke-linecap="round"/>'
        out += C(cx, cy + r * 0.05, r * 0.72, col('#e8453c')) + C(cx, cy + r * 0.05, r * 0.52, col('#ffffff'), 0.6)
        return out + f'<path d="M{cx:.1f},{cy + r * 0.05:.1f} V{cy - r * 0.3:.1f} M{cx:.1f},{cy + r * 0.05:.1f} L{cx + r * 0.25:.1f},{cy + r * 0.2:.1f}" stroke="{ol}" stroke-width="{sw * 0.7:.1f}" stroke-linecap="round"/>'
    if kind == 'pez':
        out = P(poly([(cx - r * 0.55, cy), (cx - r * 0.98, cy - r * 0.38), (cx - r * 0.9, cy + r * 0.4)]), col('#ff9a3a'))
        out += P(f'M{cx - r * 0.65:.1f},{cy:.1f} Q{cx - r * 0.1:.1f},{cy - r * 0.62:.1f} {cx + r * 0.72:.1f},{cy - r * 0.05:.1f} Q{cx - r * 0.1:.1f},{cy + r * 0.55:.1f} {cx - r * 0.65:.1f},{cy:.1f}Z', col('#ff9a3a'))
        out += f'<circle cx="{cx + r * 0.35:.1f}" cy="{cy - r * 0.1:.1f}" r="{r * 0.09:.1f}" fill="{ol}"/>'
        return out + f'<path d="M{cx - r * 0.1:.1f},{cy - r * 0.3:.1f} q{r * 0.1:.1f},{r * 0.3:.1f} 0,{r * 0.55:.1f}" stroke="{ol}" stroke-width="{sw * 0.5:.1f}" fill="none"/>'
    if kind == 'muneco':
        out = C(cx, cy + r * 0.45, r * 0.52, col('#f6f8ff')) + C(cx, cy - r * 0.25, r * 0.36, col('#f6f8ff'))
        out += P(f'M{cx - r * 0.3:.1f},{cy - r * 0.55:.1f} H{cx + r * 0.3:.1f} M{cx - r * 0.18:.1f},{cy - r * 0.55:.1f} V{cy - r * 0.92:.1f} H{cx + r * 0.18:.1f} V{cy - r * 0.55:.1f}', col('#2a2a30'))
        out += P(poly([(cx, cy - r * 0.25), (cx + r * 0.32, cy - r * 0.18), (cx, cy - r * 0.12)]), col('#ff8a2a'), 0.5)
        out += f'<path d="M{cx - r * 0.32:.1f},{cy + r * 0.05:.1f} H{cx + r * 0.32:.1f}" stroke="{col("#e3352d")}" stroke-width="{r * 0.14:.1f}" stroke-linecap="round"/>'
        return out + ''.join(f'<circle cx="{cx + dx * r:.1f}" cy="{cy - r * 0.33:.1f}" r="{r * 0.05:.1f}" fill="{ol}"/>' for dx in (-0.13, 0.13))
    if kind == 'osito':
        out = C(cx - r * 0.55, cy - r * 0.55, r * 0.24, col('#b07a4a')) + C(cx + r * 0.55, cy - r * 0.55, r * 0.24, col('#b07a4a'))
        out += C(cx, cy, r * 0.72, col('#b07a4a')) + E(cx, cy + r * 0.25, r * 0.32, r * 0.24, col('#e8c898'), 0.7)
        out += f'<ellipse cx="{cx:.1f}" cy="{cy + r * 0.15:.1f}" rx="{r * 0.1:.1f}" ry="{r * 0.07:.1f}" fill="{ol}"/>'
        return out + ''.join(f'<circle cx="{cx + dx * r:.1f}" cy="{cy - r * 0.15:.1f}" r="{r * 0.07:.1f}" fill="{ol}"/>' for dx in (-0.25, 0.25))
    return ball('#e3352d')


# ======================= Elementos de los biomas nuevos =======================
def ice_block(sc, x, y, w, h, col='#7fd0f0', depth=0.0, neon=None):
    """Bloque de hielo o roca facetado: cara frontal en sombra, cara lateral y cara de arriba iluminadas."""
    L = sc.L
    c0 = sc.c(col, depth)
    front = [(x - w / 2, y), (x - w / 2, y - h * 0.72), (x + w * 0.12, y - h * 0.8), (x + w / 2, y - h * 0.62), (x + w / 2, y)]
    top = [(x - w / 2, y - h * 0.72), (x - w * 0.22, y - h), (x + w * 0.4, y - h * 0.93), (x + w / 2, y - h * 0.62), (x + w * 0.12, y - h * 0.8)]
    side = ([(x + w * 0.12, y - h * 0.8), (x + w / 2, y - h * 0.62), (x + w / 2, y), (x + w * 0.18, y)] if L > 0
            else [(x - w / 2, y - h * 0.72), (x + w * 0.12, y - h * 0.8), (x - w * 0.05, y), (x - w / 2, y)])
    out = f'<path d="{poly(front)}" fill="{sc.sh(c0, 0.3)}"/><path d="{poly(side)}" fill="{c0}"/><path d="{poly(top)}" fill="{sc.hi(c0, 0.45)}"/>'
    out += f'<path d="M{x - w * 0.42:.1f},{y - h * 0.74:.1f} L{x - w * 0.2:.1f},{y - h * 0.95:.1f}" stroke="#ffffff" stroke-width="{max(2, w * 0.02):.1f}" stroke-linecap="round" opacity=".75"/>'
    if neon:
        out += f'<path d="{poly(front[:1] + top + front[-1:])}" fill="none" stroke="{neon}" stroke-width="{max(2, w * 0.012):.1f}" opacity=".9" stroke-linejoin="round"/>'
    return out


def planet(sc, x, y, r, col):
    c0 = sc.c(col)
    out = sc.glow(x, y, r * 1.5, sc.hi(c0, 0.4), 0.35)
    out += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.0f}" fill="{c0}"/>'
    cid = sc.clip(f'M{x - r:.0f},{y:.0f} A{r:.0f},{r:.0f} 0 1 0 {x + r:.0f},{y:.0f} A{r:.0f},{r:.0f} 0 1 0 {x - r:.0f},{y:.0f}Z')
    sw = ''.join(f'<path d="M{x - r:.0f},{y + r * k:.0f} q{r * 0.5:.0f},{-r * 0.3:.0f} {r:.0f},0 t{r:.0f},0" stroke="{sc.hi(c0, 0.35)}" stroke-width="{r * 0.09:.1f}" fill="none" opacity=".7"/>' for k in (-0.5, -0.15, 0.2, 0.55))
    out += f'<g clip-path="url(#{cid})">{sw}<circle cx="{x + sc.L * -r * 0.35:.0f}" cy="{y + r * 0.2:.0f}" r="{r:.0f}" fill="{sc.sh(c0, 0.45)}" opacity=".45"/></g>'
    return out


def mound(sc, x, y, w, h, depth=0.0):
    """Montículo de roca con vetas onduladas y musgo amarillo arriba (referencia 19)."""
    L = sc.L
    rc, mc = sc.c('#9a9aa0', depth), sc.c('#e8c42a', depth)
    d = f'M{x - w / 2:.1f},{y:.1f} C{x - w / 2:.1f},{y - h * 0.7:.1f} {x - w * 0.22:.1f},{y - h:.1f} {x:.1f},{y - h:.1f} C{x + w * 0.22:.1f},{y - h:.1f} {x + w / 2:.1f},{y - h * 0.7:.1f} {x + w / 2:.1f},{y:.1f}Z'
    cid = sc.clip(d)
    out = f'<path d="{d}" fill="{sc.sh(rc, 0.15)}"/>'
    inner = f'<rect x="{x if L > 0 else x - w:.1f}" y="{y - h:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{sc.hi(rc, 0.15)}" opacity=".6"/>'
    for k in range(7):
        yy = y - h * (0.12 + k * 0.11)
        inner += f'<path d="M{x - w / 2:.1f},{yy:.1f} q{w / 8:.1f},{-h * 0.035:.1f} {w / 4:.1f},0 t{w / 4:.1f},0 t{w / 4:.1f},0 t{w / 4:.1f},0" stroke="{sc.sh(rc, 0.3)}" stroke-width="{max(2, w * 0.012):.1f}" fill="none" opacity=".6"/>'
    cap = [(x - w * 0.36, y - h * 0.62), (x - w * 0.18, y - h * 0.98), (x + w * 0.2, y - h * 1.0), (x + w * 0.38, y - h * 0.6), (x + w * 0.25, y - h * 0.48), (x + w * 0.1, y - h * 0.62), (x - w * 0.05, y - h * 0.44), (x - w * 0.22, y - h * 0.6)]
    inner += f'<path d="{curve(cap, True)}" fill="{sc.sh(mc, 0.15)}"/><path d="{curve([(px, py - h * 0.03) for px, py in cap], True)}" fill="{mc}"/>'
    out += f'<g clip-path="url(#{cid})">{inner}</g>'
    for k in (-1, 1):
        out += sc.tuft(x + k * w * 0.42, y + 4, h * 0.22, '#d8b82a', depth)
    return out


def leafy_tree(sc, x, y, h, col='#d8c42a', depth=0.0):
    """Arbolito de ramas torcidas con hojas en pico (referencia 19)."""
    r = sc.rng
    c0 = sc.c(col, depth)
    tc = sc.c('#7a3a1a', depth)
    out = f'<path d="M{x:.1f},{y:.1f} q{h * 0.12:.1f},{-h * 0.3:.1f} {-h * 0.04:.1f},{-h * 0.55:.1f} t{h * 0.06:.1f},{-h * 0.3:.1f}" stroke="{tc}" stroke-width="{h * 0.06:.1f}" fill="none" stroke-linecap="round"/>'
    for k in range(9):
        a = r.uniform(-1.2, 1.2)
        lx, ly = x + math.sin(a) * h * 0.3, y - h * (0.45 + 0.5 * r.random())
        lh = h * r.uniform(0.18, 0.26)
        leaf = f'M{lx:.1f},{ly:.1f} q{lh * 0.45:.1f},{-lh * 0.5:.1f} 0,{-lh:.1f} q{-lh * 0.45:.1f},{lh * 0.5:.1f} 0,{lh:.1f}Z'
        out += f'<path d="{leaf}" fill="{sc.sh(c0, 0.2) if k % 3 == 0 else c0}" transform="rotate({math.degrees(a) * 0.6:.0f} {lx:.1f} {ly:.1f})"/>'
    return out


def mushroom_tree(sc, x, y, h, cap='#3f6ae0', stripes=True, depth=0.0):
    """Seta gigante con forma de árbol (referencia 26)."""
    L = sc.L
    c0, tc = sc.c(cap, depth), sc.c('#8a4a2a', depth)
    out = sc.trunk(x, y, h * 0.6, h * 0.16, h * 0.09, tc, sc.rng.uniform(-0.1, 0.1))
    cy = y - h * 0.62
    w = h * 0.42
    d = f'M{x - w:.1f},{cy:.1f} C{x - w:.1f},{cy - h * 0.5:.1f} {x + w:.1f},{cy - h * 0.5:.1f} {x + w:.1f},{cy:.1f} Q{x:.1f},{cy + h * 0.08:.1f} {x - w:.1f},{cy:.1f}Z'
    cid = sc.clip(d)
    inner = f'<rect x="{x - w:.1f}" y="{cy - h * 0.5:.1f}" width="{2 * w:.1f}" height="{h * 0.6:.1f}" fill="{sc.sh(c0, 0.25)}"/>'
    inner += f'<ellipse cx="{x + L * w * 0.25:.1f}" cy="{cy - h * 0.25:.1f}" rx="{w * 0.85:.1f}" ry="{h * 0.3:.1f}" fill="{c0}"/>'
    if stripes:
        inner += ''.join(f'<path d="M{x - w:.1f},{cy - h * k:.1f} Q{x:.1f},{cy - h * (k + 0.12):.1f} {x + w:.1f},{cy - h * k:.1f}" stroke="{sc.sh(c0, 0.35)}" stroke-width="{h * 0.012:.1f}" fill="none" opacity=".6"/>' for k in (0.08, 0.18, 0.28))
    inner += f'<ellipse cx="{x + L * w * 0.35:.1f}" cy="{cy - h * 0.33:.1f}" rx="{w * 0.25:.1f}" ry="{h * 0.06:.1f}" fill="{sc.hi(c0, 0.6)}" opacity=".7"/>'
    out += f'<path d="{d}" fill="{c0}"/><g clip-path="url(#{cid})">{inner}</g>'
    for k in range(4):
        dx = sc.rng.uniform(-0.8, 0.8) * w
        out += f'<path d="M{x + dx:.1f},{cy:.1f} q{h * 0.01:.1f},{h * 0.05:.1f} 0,{h * sc.rng.uniform(0.05, 0.12):.1f}" stroke="{sc.sh(c0, 0.1)}" stroke-width="{h * 0.025:.1f}" stroke-linecap="round"/>'
    return out


def lava_river(sc, y0, y1):
    top = [(-60, y0 + 30), (500, y0 - 10), (1000, y0 + 40), (1500, y0), (1980, y0 + 30)]
    d = curve(top) + f' L1980,{y1} L-60,{y1}Z'
    g = sc.lgrad([(0, '#fff07a', 1), (0.25, '#ffc23a', 1), (1, '#ff6a1a', 1)], 0, y0, 0, y1, 'userSpaceOnUse')
    out = f'<path d="{d}" fill="url(#{g})"/>'
    r = sc.rng
    for _ in range(26):
        yy = r.uniform(y0 + 30, y1 - 10)
        xx = r.uniform(-40, W)
        ww = r.uniform(60, 260)
        out += f'<path d="M{xx:.0f},{yy:.0f} q{ww / 2:.0f},{r.uniform(-14, 14):.0f} {ww:.0f},0" stroke="{r.choice(("#fff7b0", "#ff8a1a", "#ffd23f"))}" stroke-width="{r.uniform(3, 8):.0f}" fill="none" stroke-linecap="round" opacity=".8"/>'
    return out


def lava_fall(sc, x, y1, w):
    g = sc.lgrad([(0, '#ffde5a', 0.2), (0.3, '#ffb02a', 1), (1, '#ff6a1a', 1)])
    return f'{sc.glow(x, y1, w * 4, "#ff8a2a", 0.5)}<rect x="{x - w / 2:.0f}" y="-10" width="{w:.0f}" height="{y1 + 10:.0f}" fill="url(#{g})"/>'


def embers(sc, n=60, col='#ffb03a'):
    r = sc.rng
    return ''.join(f'<circle cx="{r.uniform(0, W):.0f}" cy="{r.uniform(0, H):.0f}" r="{r.uniform(1.5, 4.5):.1f}" fill="{col}" opacity="{r.uniform(0.4, 0.95):.2f}"/>' for _ in range(n))


def aurora_bands(sc):
    f = sc.uid('au')
    sc.d(f'<filter id="{f}" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="36"/></filter>')
    r = sc.rng
    out = ''
    for col, y, w, op in (('#2fff9a', 300, 120, 0.75), ('#6a5aff', 220, 90, 0.55), ('#2fd8ff', 380, 70, 0.5), ('#9a7aff', 160, 60, 0.35)):
        pts = [(x, y + math.sin(x / 300 + r.uniform(0, 6)) * 90 - x * 0.05) for x in range(-200, W + 400, 200)]
        out += f'<path d="{curve(pts)}" stroke="{col}" stroke-width="{w}" fill="none" opacity="{op}" filter="url(#{f})"/>'
        for k in range(8):
            xx = r.uniform(0, W)
            out += f'<rect x="{xx:.0f}" y="{y - 200:.0f}" width="{r.uniform(10, 40):.0f}" height="260" fill="{col}" opacity="{op * 0.35:.2f}" filter="url(#{f})"/>'
    return f'<g style="mix-blend-mode:screen">{out}</g>'


# ======================= Paisajes de los biomas nuevos =======================
def p_hielo(s):
    """Mar helado con arco de hielo y témpanos (referencia 16)."""
    s.sky()
    for x, y, w in ((260, 250, 300), (1380, 330, 440), (980, 170, 200)):
        s.cloud(x, y, w, w * 0.6, 0.1, flat=False)
    s.mountains(650, 7, 140, 320, 0.55, '#8fb6f0', snow=0.55, fog=0.45)
    s.water(650, H + 10)
    s.c_water_at([(600, 760), (1060, 760), (1040, 960)], size=130)
    x0, x1 = W * 0.16, W * 0.46
    s.c_ice(x0, 800, 160, 430, '#86d8f4', 0.1); s.c_ice(x1, 770, 180, 380, '#86d8f4', 0.1)
    s.c_ice((x0 + x1) / 2, 430, x1 - x0 + 280, 150, '#9ee4fa', 0.05)
    s.hide_zone(W * 0.55, W * 0.92, H * 0.6, H * 0.72, 3, sink=0.4)
    s.c_ice(W * 0.8, 1010, 760, 340, '#3f6ae0'); s.c_ice(W * 0.07, 1080, 300, 320, '#4a62d8')
    s.add('<g>' + ''.join(f'<circle cx="{s.rng.uniform(0, W):.0f}" cy="{s.rng.uniform(0, H):.0f}" r="{s.rng.uniform(2, 5):.1f}" fill="#fff" opacity=".85"/>' for _ in range(90)) + '</g>')
    s.finish(0.25)


def p_lava(s):
    """Cueva de lava con rocas afiladas y cascadas de lava (referencia 17)."""
    s.sky(body=False)
    s.mountains(640, 9, 200, 440, 0.45, '#6a1428', fog=0.5)
    s.add(lava_fall(s, W * 0.58, 760, 14) + lava_fall(s, W * 0.66, 700, 9))
    s.add(lava_river(s, 760, H + 20))
    s.c_water_at([(1000, 860), (1150, 1010), (820, 1030)], kind='lava', size=130)
    s.c_ice(W * 0.36, 960, 300, 110, '#5a1a2a', kind='roca'); s.c_ice(W * 0.72, 900, 220, 90, '#5a1a2a', kind='roca')
    s.hide_zone(W * 0.55, W * 0.92, H * 0.7, H * 0.8, 2, sink=0.35)
    for x, h, w in ((W * 0.08, 900, 260), (W * 0.2, 700, 200), (W * 0.93, 1000, 300)):
        s.c_spire(x, H + 60, w, h, '#4a0f1e', 0.05)
    s.add('<g>' + ''.join(f'<path d="M{x:.0f},{y:.0f} l{s.rng.uniform(-40, 40):.0f},{s.rng.uniform(40, 90):.0f} l{s.rng.uniform(-30, 30):.0f},{s.rng.uniform(30, 70):.0f}" stroke="#ffb03a" stroke-width="5" fill="none" stroke-linecap="round"/>' for x, y in ((140, 420), (230, 560), (1790, 360), (1840, 520))) + '</g>')
    s.add(f'<g>{embers(s, 80)}</g>')
    s.finish(0.35, 0.15)


def p_costa(s):
    """Costa rocosa sobre el mar con el sol en el horizonte (referencia 18)."""
    s.sky()
    s.clouds(6, 0.04, 0.42, 240, 520, 0.15, 3)
    s.water(620, 830)
    s.c_water_at([(W * 0.5, 720), (W * 0.66, 760), (W * 0.76, 700)], size=120)
    for x, w in ((W * 0.55, 60), (W * 0.62, 40), (W * 0.84, 90)):
        s.c_rock(x, 640, w, '#9a5a5a', depth=0.4)
    s.hide_zone(W * 0.52, W * 0.88, H * 0.6, H * 0.7, 3, sink=0.4)
    for x, y, sz in ((W * 0.9, 860, 240), (W * 0.97, 760, 300)):
        s.c_rock(x, y, sz, '#a8645a')
    ground = [(-60, 820), (400, 800), (900, 840), (1400, 820), (1980, 850)]
    s.hill(0, 0, 0.0, '#9a6a5a', pts=ground)
    out = ''
    for _ in range(9):
        x = s.rng.uniform(100, W - 100)
        y = s.rng.uniform(860, 1040)
        w = s.rng.uniform(120, 300)
        out += f'<path d="M{x:.0f},{y:.0f} l{w:.0f},{-w * 0.08:.0f} l{-w * 0.15:.0f},{w * 0.1:.0f}Z" fill="{s.c("#6fae3a")}" opacity=".9"/>'
    s.add(f'<g>{out}</g>')
    s.hide_zone(W * 0.55, W * 0.95, H * 0.78, H * 0.86, 2, sink=0.25)
    s.c_rock(W * 0.7, 920, 120, '#9a6a5a')
    for x, y, sz in ((40, 760, 420), (260, 980, 300), (80, H + 40, 360)):
        s.c_rock(x, y, sz, '#8a4a4a')
    s.birds(7, 0.35, 0.5, 0.3, 0.45, '#ffffff')
    s.finish(0.28)


def p_monticulos(s):
    """Praderas con montículos de roca y arbolitos amarillos (referencia 19)."""
    s.sky()
    s.clouds(3, 0.1, 0.3, 200, 320, 0.4, 2)
    s.hill(760, 30, 0.5, '#b8c860', rim=False)
    for x, y, w, h in ((W * 0.3, 840, 400, 470), (W * 0.84, 820, 230, 260)):
        s.c_mound(x, y, w, h)
    for x, y, w in ((W * 0.12, 880, 90), (W * 0.5, 880, 70), (W * 0.68, 850, 60)):
        s.c_ice(x, y, w, w * 0.6, '#a0a0a8', kind='roca')
    pts = s.hill(880, 22, 0.0, '#7a9a2a', k=2)
    for x, y, sz in ((W * 0.5, 870, 110), (W * 0.6, 940, 120), (W * 0.76, 990, 150)):
        s.c_grass(x, y, sz, '#9ab83a')
    s.c_bush(W * 0.66, 900, 160, '#8aa82a'); s.c_bush(W * 0.9, 960, 190, '#8aa82a')
    s.meadow_details(pts, 30, 12, ('#fff6c0',), '#9ab83a')
    s.finish(0.15)


def p_alien(s):
    """Planeta extraño con lunas grandes, cráteres y agujas de roca (referencia 27)."""
    s.sky()
    s.add(planet(s, W * 0.34, H * 0.22, 170, '#6aa8d8') + planet(s, W * 0.62, H * 0.2, 90, '#4a90c8'))
    s.mountains(640, 10, 110, 260, 0.6, '#3fb0b0', fog=0.5)
    s.hill(650, 12, 0.1, '#5fd04a')
    craters = ((W * 0.45, 760, 140), (W * 0.66, 820, 180), (W * 0.82, 740, 110), (W * 0.3, 900, 200), (W * 0.58, 980, 160))
    out = ''
    for x, y, rx in craters:
        c0 = s.c('#5fd04a')
        out += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rx:.0f}" ry="{rx * 0.28:.0f}" fill="{s.hi(c0, 0.3)}"/><ellipse cx="{x:.0f}" cy="{y + rx * 0.03:.0f}" rx="{rx * 0.85:.0f}" ry="{rx * 0.22:.0f}" fill="{s.sh(c0, 0.25)}"/>'
    s.add(f'<g>{out}</g>')
    for x, y, rx in craters:
        s.c_water_at([(x, y)], kind='crater', size=max(90, rx * 0.8))
    s.hide_zone(W * 0.55, W * 0.92, H * 0.66, H * 0.8, 3, sink=0.3)
    for x, base, w, h in ((W * 0.2, 760, 70, 180), (W * 0.74, 720, 60, 150), (W * 0.06, H + 40, 220, 760), (W * 0.95, H + 40, 240, 700), (W * 0.87, H + 40, 140, 380)):
        s.c_spire(x, base, w, h, '#2f9a4a', 0.05 if base > H else 0.25)
    for x, y, sz in ((W * 0.55, 700, 90), (W * 0.68, 690, 110), (W * 0.8, 880, 130)):   # rocas y hierba del otro planeta
        s.c_rock(x, y, sz, '#3f8a7a', depth=0.1)
    for x, y, sz in ((W * 0.62, 900, 120), (W * 0.74, 980, 150)):
        s.c_grass(x, y, sz, '#3fc8a0')
    s.finish(0.35, 0.18)


def p_aurora(s):
    """Noche polar con aurora y arco de roca helada (referencia 28)."""
    s.sky()
    s.add(aurora_bands(s))
    s.mountains(660, 8, 120, 280, 0.5, '#2a4ab0', snow=0.3, fog=0.3)
    s.water(660, H + 10, sparkle=False)
    s.c_water_at([(W * 0.55, 760), (W * 0.72, 930), (W * 0.36, 720)], size=130)
    neon = '#5ff0ff'
    s.c_ice(W * 0.45, 860, 220, 320, '#1f4ad0', 0.05, neon); s.c_ice(W * 0.8, 880, 260, 300, '#1f4ad0', 0.05, neon)
    s.c_ice(W * 0.62, 600, W * 0.5, 170, '#2a5ae0', 0.05, neon)
    s.hide_zone(W * 0.55, W * 0.92, H * 0.66, H * 0.76, 3, sink=0.35)
    s.c_spire(W * 0.08, H + 40, 320, 520, '#10287a', 0.02)
    s.add(f'<path d="M{W * 0.08 - 320:.0f},{H + 40} L{W * 0.08:.0f},{H + 40 - 520} L{W * 0.08 + 320:.0f},{H + 40}" stroke="{neon}" stroke-width="4" fill="none" opacity=".8"/>')
    s.fireflies(20, 0.1, 0.6, '#9ff8ff')
    s.finish(0.4, 0.15)


def p_canon(s):
    """Cañón naranja con montañas blancas, pinos dorados y río (referencia 29)."""
    s.sky()
    s.add(f'<g opacity=".5">{s.glow(W * 0.3, H * 0.4, 160, "#ffffff", 0.5)}{s.glow(W * 0.85, H * 0.35, 120, "#ffffff", 0.5)}</g>')
    s.mountains(560, 6, 300, 480, 0.3, '#d8dde6', fog=0.2)
    for x, y, h in ((W * 0.1, 520, 300), (W * 0.15, 560, 380), (W * 0.2, 540, 260), (W * 0.82, 600, 260), (W * 0.88, 560, 320)):
        s.c_conifer(x, y, h, '#c99a2a', 0.1)
    c0 = s.c('#c8502a')
    for pts, toppts in (([(-60, 480), (500, 470), (900, 560), (980, 640), (-60, 640)], [(-60, 480), (500, 470), (900, 560), (500, 520), (-60, 520)]),
                        ([(1100, 620), (1500, 560), (1980, 580), (1980, 660), (1100, 660)], [(1100, 620), (1500, 560), (1980, 580), (1980, 600), (1400, 600)])):
        s.add(f'<path d="{poly(pts)}" fill="{s.sh(c0, 0.2)}"/><path d="{poly(toppts)}" fill="{s.hi(c0, 0.25)}"/>')
    s.add(f'<rect x="-10" y="640" width="{W + 20}" height="60" fill="{s.c("#9fd8f0")}"/>')
    s.sparkles(20, (0, W), (650, 690), '#ffffff', 3, 7)
    s.c_water_at([(W * 0.52, 668), (W * 0.68, 672)], size=90)
    g = s.lgrad([(0, s.c('#f0a050'), 1), (1, s.c('#e07a2a'), 1)], 0, 690, 0, H, 'userSpaceOnUse')
    s.add(f'<rect x="-10" y="690" width="{W + 20}" height="{H - 680}" fill="url(#{g})"/>')
    s.add('<g>' + ''.join(f'<path d="M{s.rng.uniform(0, W):.0f},{s.rng.uniform(720, 1060):.0f} h{s.rng.uniform(60, 200):.0f}" stroke="{s.c("#c8642a")}" stroke-width="5" stroke-linecap="round" opacity=".6"/>' for _ in range(14)) + '</g>')
    for x, y, sz in ((W * 0.56, 880, 110), (W * 0.7, 940, 140)):
        s.c_grass(x, y, sz, '#c8902a')
    s.c_rock(W * 0.62, 790, 80, '#b8542a')
    s.c_rock(W * 0.08, H + 20, 160, '#b8542a'); s.c_rock(W * 0.66, H + 30, 120, '#b8542a'); s.c_rock(W * 0.74, H + 30, 90, '#b8542a')
    s.finish(0.2)


def p_fantasia(s):
    """Bosque de setas gigantes de colores (referencia 26)."""
    s.sky()
    for x, y, w in ((W * 0.5, 600, 460), (W * 0.62, 560, 380)):
        s.cloud(x, y, w, w * 0.6, 0.1, flat=False)
    h = s.hill(700, 16, 0.4, '#7fd05a')
    for x in (300, 520, 1300, 1450, 1650):
        s.c_tree(x, y_at(h, x) + 6, s.rng.uniform(160, 260), '#3faa4a', 0.45)
    pts = s.hill(760, 14, 0.0, '#5fc23a', k=2)
    s.dirt_path(pts, W * 0.52, W * 0.42, 50, 360, '#e0a050')
    s.c_grass(W * 0.62, 860, 120, '#3f9a3a')
    s.c_mtree(W * 0.12, H + 20, 1000, '#3f6ae0'); s.c_mtree(W * 0.8, 980, 820, '#ffa31a', False)
    s.c_mtree(W * 0.68, 900, 360, '#ffcf3a', False)
    s.c_bush(W * 0.3, 900, 240, '#2f9a4a'); s.c_bush(W * 0.95, H + 20, 300, '#2f9a4a')
    s.frame_plants('#2f8a3a', 'both', 0.8)
    s.fireflies(16, 0.3, 0.9, '#fff6b0')
    s.finish(0.2)

# id, nombre, ambiente, terreno de los escondites, semilla y cómo se pinta.
ESCENARIOS = [
    ('valle-lago', 'Valle del lago', 'dia', 'campo', 101, p_valle),
    ('atardecer-rosa', 'Estanque al atardecer', 'rosa', 'campo', 102, p_atardecer_rosa),
    ('acantilado', 'Acantilado de las nubes', 'dia', 'campo', 103, p_acantilado),
    ('islas-flotantes', 'Islas flotantes', 'pastel', 'campo', 104, p_islas),
    ('campamento', 'Campamento al anochecer', 'crepusculo', 'campo', 105, p_campamento),
    ('cerezos', 'Estanque de los cerezos', 'manana', 'campo', 106, p_cerezos),
    ('bosque-claro', 'Claro del bosque', 'dia', 'campo', 107, p_bosque_claro),
    ('pantano', 'Pantano verde', 'pantano', 'campo', 108, p_pantano),
    ('bosque-noche', 'Bosque de noche', 'noche', 'campo', 109, p_bosque_noche),
    ('bosque-magico', 'Bosque de los faroles', 'magico', 'campo', 110, p_bosque_magico),
    ('hielo', 'Mar helado', 'hielo', 'nieve', 111, p_hielo),
    ('lava', 'Cueva de lava', 'lava', 'desierto', 112, p_lava),
    ('costa', 'Costa al atardecer', 'ocaso', 'playa', 113, p_costa),
    ('monticulos', 'Colinas de los montículos', 'tarde', 'campo', 114, p_monticulos),
    ('alien', 'Planeta extraño', 'alien', 'campo', 115, p_alien),
    ('aurora', 'Aurora polar', 'aurora', 'nieve', 116, p_aurora),
    ('canon', 'Cañón de los pinos dorados', 'canon', 'desierto', 117, p_canon),
    ('fantasia', 'Bosque de setas gigantes', 'fantasia', 'campo', 118, p_fantasia),
]

# ======================= Escenarios del día por región =======================
# bioma: (cómo se pinta, ambientes posibles, terreno de los escondites)
BIOMAS = {
    'valle': (p_valle, ('dia', 'manana', 'atardecer'), 'campo'),
    'atardecer_rosa': (p_atardecer_rosa, ('rosa', 'atardecer'), 'campo'),
    'acantilado': (p_acantilado, ('dia', 'manana', 'atardecer'), 'campo'),
    'islas': (p_islas, ('pastel', 'dia', 'crepusculo'), 'campo'),
    'campamento': (p_campamento, ('crepusculo', 'noche'), 'campo'),
    'cerezos': (p_cerezos, ('manana', 'dia'), 'campo'),
    'bosque_claro': (p_bosque_claro, ('dia', 'manana', 'atardecer'), 'campo'),
    'pantano': (p_pantano, ('pantano',), 'campo'),
    'bosque_noche': (p_bosque_noche, ('noche',), 'campo'),
    'bosque_magico': (p_bosque_magico, ('magico', 'noche'), 'campo'),
    'hielo': (p_hielo, ('hielo', 'dia'), 'nieve'),
    'lava': (p_lava, ('lava',), 'desierto'),
    'costa': (p_costa, ('ocaso', 'dia', 'manana'), 'playa'),
    'monticulos': (p_monticulos, ('tarde', 'dia', 'manana'), 'campo'),
    'alien': (p_alien, ('alien',), 'campo'),
    'aurora': (p_aurora, ('aurora',), 'nieve'),
    'canon': (p_canon, ('canon', 'atardecer', 'manana'), 'desierto'),
    'fantasia': (p_fantasia, ('fantasia', 'manana'), 'campo'),
}
# Biomas de cada región y cómo se llama el sitio.
REGIONES = {
    'kanto': [('valle', 'Valle de Kanto'), ('bosque_claro', 'Bosque Verde'), ('acantilado', 'Acantilados de Kanto'), ('campamento', 'Campamento de Kanto'), ('bosque_noche', 'Bosque Verde de noche')],
    'johto': [('cerezos', 'Estanque de los cerezos'), ('atardecer_rosa', 'Lago de la Furia'), ('monticulos', 'Colinas de Johto'), ('bosque_magico', 'Encinar de Johto'), ('valle', 'Valle de Johto')],
    'hoenn': [('costa', 'Costa de Hoenn'), ('lava', 'Monte Cenizo'), ('pantano', 'Pantano de Hoenn'), ('islas', 'Pilar Celeste'), ('valle', 'Valle de Hoenn')],
    'sinnoh': [('hielo', 'Lago helado de Sinnoh'), ('aurora', 'Monte Corona de noche'), ('canon', 'Cañón de Sinnoh'), ('bosque_noche', 'Bosque Vetusto'), ('valle', 'Valle de Sinnoh')],
    'teselia': [('canon', 'Cañón de Teselia'), ('monticulos', 'Desierto de Teselia'), ('campamento', 'Campamento de Teselia'), ('costa', 'Bahía de Teselia'), ('acantilado', 'Acantilados de Teselia')],
    'kalos': [('atardecer_rosa', 'Ruta de las flores de Kalos'), ('cerezos', 'Jardines de Kalos'), ('islas', 'Islas del cielo de Kalos'), ('bosque_magico', 'Bosque de Kalos'), ('valle', 'Valle de Kalos')],
    'alola': [('costa', 'Playa de Alola'), ('lava', 'Volcán de Alola'), ('alien', 'Ultraespacio'), ('islas', 'Islas de Alola'), ('pantano', 'Selva de Alola')],
    'galar': [('fantasia', 'Bosque Lumirinto'), ('bosque_magico', 'Bosque de Galar'), ('acantilado', 'Área Silvestre'), ('monticulos', 'Colinas de Galar'), ('bosque_claro', 'Prado de Galar'), ('campamento', 'Acampada de Galar')],
    'paldea': [('canon', 'Cañón de Paldea'), ('alien', 'Zona Cero'), ('hielo', 'Monte Glaseado'), ('valle', 'Valle de Paldea'), ('aurora', 'Cumbre de Paldea'), ('costa', 'Costa de Paldea')],
}


def hora_of(mood):
    if mood in DARK_MOODS:
        return 'noche'
    if mood in ('atardecer', 'rosa', 'ocaso', 'crepusculo', 'lava', 'pantano', 'magico'):
        return 'atardecer'
    return 'manana' if mood == 'manana' else 'dia'


def choose_odd(s, rnd, n=3):
    """Elige n rarezas visibles: fuera de la zona del entrenador, separadas y una como mucho por escondite.
    Primero las que se asoman por detrás de un elemento del dibujo; luego las medio hundidas en agua o hierba."""
    valid = []
    for i, (x, y, sz, sink, oi) in enumerate(s.cands):
        fx = (W - x) if s.mirror else x
        px, py = fx / W * 100, (y - sz * (0.5 - sink * 0.5)) / H * 100
        # Franja ancha: en pantallas estrechas el juego recorta los lados y solo cuenta las rarezas que se ven.
        if not (20 < px < 80 and 16 < py < 86):
            continue
        # El entrenador y su Pokémon tapan la parte de abajo a la izquierda (más ancha en pantallas estrechas).
        if px < 66 and py > 52:
            continue
        valid.append((i, px, py, oi))
    rnd.shuffle(valid)
    valid.sort(key=lambda t: t[3] is None)
    pick, used = [], set()
    for i, px, py, oi in valid:
        if oi is not None and oi in used:
            continue
        if all((px - a) ** 2 + ((py - b) * 0.5625) ** 2 > 9.5 ** 2 for _, a, b, _ in pick):
            pick.append((i, px, py, oi))
            if oi is not None:
                used.add(oi)
        if len(pick) == n:
            break
    return [t[0] for t in pick]


def paint_day(region, v):
    """Pinta el escenario v de una región con sus rarezas. Devuelve (svg, capa, datos)."""
    rnd = random.Random(f'{region}:{v}')
    biomas = REGIONES[region]
    bioma, place = biomas[(v + v // 7) % len(biomas)]
    paint, moods, terreno = BIOMAS[bioma]
    mood = rnd.choice(moods)
    seed = rnd.randint(1, 10 ** 6)
    mirror = rnd.random() < 0.5
    pool = [k for k in ODD_NAMES if k not in ODD_EXCLUDE.get(bioma, set())]

    def run(pick):
        s = Cartoon(mood, seed)
        s.mirror, s.pick = mirror, pick
        paint(s)
        return s
    idx = choose_odd(run({}), rnd)
    kinds = rnd.sample(pool, len(idx))
    s = run(dict(zip(idx, kinds)))
    hosts = {f[4] for f in s.found if f[4] is not None}   # escondites con rareza: no se usan para esconder Pokémon
    has_capa = any(c['svg'] for c in s.covers)
    info = {'p': place, 't': terreno, 'h': hora_of(mood), 'b': bioma, 'o': [f[:4] for f in s.found],
            'e': s.covers_data(hosts), 'c': 1 if has_capa else 0}
    return s.svg(), (s.capa_svg() if has_capa else None), info


def main_dias(out, js_path, data_js, solo=()):
    """Genera los escenarios del día: 7 por cada semana de gimnasio de la región (ciclo de 52 semanas)."""
    import re
    with open(data_js, encoding='utf-8') as f:
        regs = re.findall(r"g\('[a-z_]+', '[a-z]+', '([a-z]+)'", f.read())
    counts = {r: regs.count(r) for r in REGIONES}
    os.makedirs(out, exist_ok=True)
    dias, total = {}, 0
    for region, n in counts.items():
        if solo and region not in solo:
            continue
        dias[region] = []
        for v in range(max(1, n) * 7):
            svg, capa, info = paint_day(region, v)
            with open(os.path.join(out, f'{region}-{v:03d}.svg'), 'w', encoding='utf-8') as f:
                f.write(svg)
            capa_path = os.path.join(out, f'{region}-{v:03d}-capa.svg')
            if capa:
                with open(capa_path, 'w', encoding='utf-8') as f:
                    f.write(capa)
            elif os.path.exists(capa_path):
                os.remove(capa_path)
            dias[region].append(info)
            total += 1
        print(f'{region}: {len(dias[region])} escenarios')
    if not solo:
        src = os.path.relpath(out, os.path.dirname(os.path.dirname(os.path.abspath(js_path)))).replace(os.sep, '/')
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write('/* Pokemonyx · escenarios del día pintados con herramientas/pintor.py --dias (no se edita a mano).\n'
                    '   Por región, 7 escenarios por cada semana de gimnasio. o: rarezas [tipo, x %, y %, radio % del ancho].\n'
                    '   e: escondites del dibujo [tipo, caja x0 y0 x1 y1, ancla x y alto, delante] (x y alto en % del ancho,\n'
                    '   y en % del alto). c: 1 si hay capa (ID-capa.svg, los escondites solos, que el juego pone encima). */\n')
            f.write(f'PK.DIAS_SRC = {json.dumps(src)};\n')
            f.write(f'PK.RAREZAS = {json.dumps(ODD_NAMES, ensure_ascii=False)};\n')
            f.write('PK.DIAS = ' + json.dumps(dias, ensure_ascii=False, separators=(',', ':')) + ';\n')
    galeria_dias(out, dias)
    print(f'total: {total}')


def galeria_dias(out, dias):
    figs = ''
    for region, lista in dias.items():
        figs += f'<h2>{region} · {len(lista)}</h2><div class="g">'
        for v, d in enumerate(lista):
            marks = ''.join(f'<circle cx="{x * 19.2:.0f}" cy="{y * 10.8:.0f}" r="{r * 19.2:.0f}"/>' for _, x, y, r in d['o'])
            marks += ''.join(f'<rect class="esc" x="{e[1] * 19.2:.0f}" y="{e[2] * 10.8:.0f}" width="{(e[3] - e[1]) * 19.2:.0f}" height="{(e[4] - e[2]) * 10.8:.0f}"/>' for e in d.get('e', []))
            figs += (f'<figure><div class="w"><img loading="lazy" src="{region}-{v:03d}.svg" alt="">'
                     f'<svg viewBox="0 0 1920 1080">{marks}</svg></div><figcaption>{v:03d} · {d["p"]} · {d["b"]} · {d["h"]} · '
                     f'{", ".join(o[0] for o in d["o"])}</figcaption></figure>')
        figs += '</div>'
    html = f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Escenarios del día</title><style>
body{{margin:0;background:#15161c;color:#eee;font:13px system-ui,sans-serif}} h2{{margin:16px 12px 8px}} label{{margin:12px;display:inline-block}}
.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr));gap:10px;padding:0 12px}}
figure{{margin:0;background:#22242d;border-radius:8px;overflow:hidden}} .w{{position:relative}} img{{display:block;width:100%}}
.w svg{{position:absolute;inset:0;width:100%;height:100%;display:none}} .w circle{{fill:none;stroke:#ff2d6f;stroke-width:8}}
.w rect.esc{{fill:none;stroke:#3fd8ff;stroke-width:5;stroke-dasharray:14 8}}
body.ver .w svg{{display:block}} figcaption{{padding:5px 8px}}
</style></head><body><label><input type="checkbox" onchange="document.body.classList.toggle('ver',this.checked)"> Marcar las rarezas (rosa) y los escondites (azul)</label>{figs}</body></html>'''
    with open(os.path.join(out, 'galeria.html'), 'w', encoding='utf-8') as f:
        f.write(html)


def galeria(out, ids, objetos):
    figs = ''.join(f'<figure><img src="{i}.svg" alt=""><figcaption>{i}</figcaption></figure>' for i in ids)
    objs = ''.join(f'<figure class="o"><img src="objetos/{o}.svg" alt=""><figcaption>{o}</figcaption></figure>' for o in objetos)
    html = f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pintor cartoon</title><style>
body{{margin:0;background:#15161c;color:#eee;font:14px system-ui,sans-serif}} h2{{margin:16px}}
.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(460px,100%),1fr));gap:12px;padding:0 12px 12px}}
.og{{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;padding:0 12px 24px}}
figure{{margin:0;background:#22242d;border-radius:8px;overflow:hidden}} img{{display:block;width:100%}}
.o img{{aspect-ratio:1;background:linear-gradient(#bfe6c0,#7cc27a)}} figcaption{{padding:6px 10px}}
</style></head><body><h2>Escenarios</h2><div class="g">{figs}</div><h2>Objetos y escondites</h2><div class="og">{objs}</div></body></html>'''
    with open(os.path.join(out, 'galeria.html'), 'w', encoding='utf-8') as f:
        f.write(html)


def main(out, solo=(), objetos=True):
    os.makedirs(out, exist_ok=True)
    manifest = []
    for sid, name, mood, terreno, seed, paint in ESCENARIOS:
        manifest.append({'id': sid, 'place': name, 't': terreno, 'estilo': 'cartoon', 'hora': mood})
        if solo and sid not in solo:
            continue
        s = Cartoon(mood, seed)
        paint(s)
        svg = s.svg()
        with open(os.path.join(out, sid + '.svg'), 'w', encoding='utf-8') as f:
            f.write(svg)
        print(f'{sid}: {len(svg) // 1024} KB')
    with open(os.path.join(out, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    names = list(OBJETOS)
    if objetos:
        od = os.path.join(out, 'objetos')
        os.makedirs(od, exist_ok=True)
        for name, (mood, paint) in OBJETOS.items():
            sc = Cartoon(mood, 7, 100, 100)
            sc.L = 1
            sc.add(paint(sc) or '')
            with open(os.path.join(od, name + '.svg'), 'w', encoding='utf-8') as f:
                f.write(sc.svg())
        for kind in ODD_NAMES:
            sc = Cartoon('dia', 7, 100, 100)
            sc.add(odd(sc, kind, 50, 92, 84))
            with open(os.path.join(od, 'rareza-' + kind + '.svg'), 'w', encoding='utf-8') as f:
                f.write(sc.svg())
        names += ['rareza-' + k for k in ODD_NAMES]
        print(f'objetos: {len(OBJETOS)} y {len(ODD_NAMES)} rarezas')
    galeria(out, [e[0] for e in ESCENARIOS], names)
