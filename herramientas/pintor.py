#!/usr/bin/env python3
"""Pokemonyx · pintor de escenarios.

Pinta paisajes en SVG solo con código (sin fotos ni imágenes de otros). Dos estilos:

- cartoon (por defecto, en cartoon.py): vectorial plano de videojuego, con sombreado de dos tonos,
  nubes esponjosas, cerezos, islas flotantes, faroles, setas, luciérnagas… y objetos sueltos
  para los escondites (CARPETA/objetos/*.svg) con una galería (CARPETA/galeria.html).
- realista: cielo con nubes de volumen, montañas con textura y niebla, bosques, agua con reflejos,
  según el bioma y la hora del día. Después herramientas/render.html los pasa a JPG.

Uso:  python -I pintor.py CARPETA_SALIDA [--estilo cartoon|realista] [--sin-objetos] [id ...]
      python -I pintor.py img/escenarios/dias --dias [región ...]
        escenarios del día del juego: 7 por cada semana de gimnasio de cada región (364 en total),
        cada uno con 3 rarezas escondidas; escribe también js/dias.js (con región sola, no lo toca).
"""
import json
import math
import os
import random
import sys

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


TIMES = {
    'dia': dict(sky=('#2a63b6', '#5c9be0', '#c8e4fb'), light='#fff3da', haze='#d2e7fa', sun=(0.80, 0.15, 64, '#fffbe6'),
                dark=0.0, cloud=(1.0, 1.0, 1.02), water='#2f73b3'),
    'manana': dict(sky=('#3a6db5', '#94bce8', '#ffe0bd'), light='#ffe8c6', haze='#efe2d6', sun=(0.20, 0.34, 76, '#fff1cc'),
                   dark=0.04, cloud=(1.0, 0.94, 0.88), water='#4a7fb5'),
    'atardecer': dict(sky=('#24245c', '#a8528a', '#ffad60'), light='#ffc285', haze='#e9a07e', sun=(0.66, 0.53, 92, '#ffdca2'),
                      dark=0.16, cloud=(1.0, 0.70, 0.60), water='#5a4a86'),
    'noche': dict(sky=('#03071a', '#0e1b42', '#264079'), light='#9db6ff', haze='#2f4578', moon=(0.78, 0.16, 40, '#f5f2e0'),
                  dark=0.55, cloud=(0.32, 0.40, 0.58), water='#17284f'),
}
NIGHT = '#0a1430'


# ======================= Formas =======================
def ridge(rng, base, amp, rough=0.55, levels=8, x0=-80, x1=W + 80):
    n = 2 ** levels
    ys = [0.0] * (n + 1)
    ys[0], ys[n] = rng.uniform(-1, 1), rng.uniform(-1, 1)
    step, scale = n, 1.0
    while step > 1:
        half = step // 2
        for i in range(half, n, step):
            ys[i] = (ys[i - half] + ys[i + half]) / 2 + rng.uniform(-1, 1) * scale
        step, scale = half, scale * rough
    mn, mx = min(ys), max(ys)
    return [(x0 + (x1 - x0) * i / n, base - (ys[i] - mn) / (mx - mn + 1e-9) * amp) for i in range(n + 1)]


def hills(rng, base, amp, k=3, x0=-80, x1=W + 80, n=140):
    ph = [rng.uniform(0, 6.28) for _ in range(k)]
    fr = [rng.uniform(0.7, 1.4) * (i + 1) for i in range(k)]
    return [(x0 + (x1 - x0) * i / n,
             base - sum(math.sin((x0 + (x1 - x0) * i / n) / W * math.pi * fr[j] + ph[j]) / (j + 1) for j in range(k)) * amp)
            for i in range(n + 1)]


def area(pts, bottom=H + 40):
    d = 'M' + ' L'.join(f'{x:.0f},{y:.0f}' for x, y in pts)
    return d + f' L{pts[-1][0]:.0f},{bottom} L{pts[0][0]:.0f},{bottom} Z'


def y_at(pts, x):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if x0 <= x <= x1:
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0 + 1e-9)
    return pts[-1][1]


# ======================= Escena =======================
class Scene:
    def __init__(self, time, seed):
        self.time, self.T = time, TIMES[time]
        self.rng = random.Random(seed)
        self.defs, self.layers, self.n = [], [], 0
        self.reflect = []
        sx = (self.T.get('sun') or self.T.get('moon'))[0]
        self.az = 315 if sx > 0.5 else 225
        self.gcache = {}

    def uid(self, p):
        self.n += 1
        return f'{p}{self.n}'

    def add(self, s):
        self.layers.append(s)

    def d(self, s):
        self.defs.append(s)

    def c(self, base, depth=0.0, lit=0.12):
        col = mix(base, self.T['haze'], clamp(depth, 0, 1) * 0.78)
        col = mix(col, self.T['light'], lit)
        if self.T['dark']:
            col = mix(col, NIGHT, self.T['dark'] * (1 - clamp(depth, 0, 1) * 0.3))
        return col

    def lgrad(self, stops, x1=0, y1=0, x2=0, y2=1, units=None):
        g = self.uid('g')
        u = f' gradientUnits="{units}"' if units else ''
        s = ''.join(f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in stops)
        self.d(f'<linearGradient id="{g}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"{u}>{s}</linearGradient>')
        return g

    def rgrad(self, stops, cx=0.5, cy=0.5, r=0.5, fx=None, fy=None):
        g = self.uid('r')
        f = f' fx="{fx}" fy="{fy}"' if fx is not None else ''
        s = ''.join(f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in stops)
        self.d(f'<radialGradient id="{g}" cx="{cx}" cy="{cy}" r="{r}"{f}>{s}</radialGradient>')
        return g

    def svg(self):
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
                f'<defs>{"".join(self.defs)}</defs>{"".join(self.layers)}</svg>')

    # ----- Cielo -----
    def sky(self, stars=True):
        a, b, c = self.T['sky']
        g = self.lgrad([(0, a, 1), (0.58, b, 1), (1, c, 1)])
        self.add(f'<rect width="{W}" height="{H}" fill="url(#{g})"/>')
        r = self.rng
        if self.time == 'noche' and stars:
            st = ''.join(f'<circle cx="{r.uniform(0, W):.0f}" cy="{r.uniform(0, H * 0.62):.0f}" r="{r.uniform(0.6, 2.0):.1f}" fill="#fff" opacity="{r.uniform(0.3, 1):.2f}"/>' for _ in range(260))
            self.add(f'<g>{st}</g>')
        body = self.T.get('sun') or self.T.get('moon')
        fx, fy, rad, col = body
        x, y = fx * W, fy * H
        glow = self.rgrad([(0, col, 0.9), (0.08, col, 0.55), (0.35, self.T['light'], 0.18), (1, self.T['light'], 0)])
        self.add(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rad * 9}" fill="url(#{glow})"/>')
        self.add(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rad}" fill="{col}"/>')
        if self.time == 'noche':
            self.add(''.join(f'<circle cx="{x + dx}" cy="{y + dy}" r="{rr}" fill="#d9d3b8" opacity=".55"/>' for dx, dy, rr in ((-10, -6, 7), (12, 10, 5), (4, -16, 3))))
        self.sunxy = (x, y)

    def clouds(self, cover=0.5, top=0.0, bottom=0.62, scale=1.0, opacity=0.96):
        f, m = self.uid('cl'), self.uid('cm')
        cr, cg, cb = self.T['cloud']
        t = 0.62 - cover * 0.22
        bx, by = 0.0015 / scale, 0.0052 / scale
        self.d(f'<filter id="{f}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">'
               f'<feTurbulence type="fractalNoise" baseFrequency="{bx:.5f} {by:.5f}" numOctaves="6" seed="{self.rng.randint(1, 9999)}" result="n"/>'
               f'<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  5 0 0 0 {-5 * t:.3f}" result="a"/>'
               f'<feDiffuseLighting in="n" surfaceScale="8" diffuseConstant="1.2" lighting-color="#ffffff" result="l"><feDistantLight azimuth="{self.az}" elevation="32"/></feDiffuseLighting>'
               f'<feColorMatrix in="l" type="matrix" values="{cr * 0.9:.2f} 0 0 0 {0.12 * cr:.2f}  0 {cg * 0.9:.2f} 0 0 {0.12 * cg:.2f}  0 0 {cb * 0.9:.2f} 0 {0.14 * cb:.2f}  0 0 0 1 0" result="lt"/>'
               f'<feComposite in="lt" in2="a" operator="in"/></filter>')
        g = self.lgrad([(0, '#fff', 1), (0.7, '#fff', 0.8), (1, '#fff', 0)])
        self.d(f'<mask id="{m}"><rect x="0" y="{top * H:.0f}" width="{W}" height="{(bottom - top) * H:.0f}" fill="url(#{g})"/></mask>')
        self.add(f'<rect x="0" y="{top * H:.0f}" width="{W}" height="{(bottom - top) * H:.0f}" filter="url(#{f})" mask="url(#{m})" opacity="{opacity}"/>')

    # ----- Texturas -----
    def rock(self, depth, freq=(0.0032, 0.009), scale=9, seed=None):
        f = self.uid('rk')
        k1 = 1.2 - depth * 0.5
        self.d(f'<filter id="{f}" color-interpolation-filters="sRGB">'
               f'<feTurbulence type="fractalNoise" baseFrequency="{freq[0]} {freq[1]}" numOctaves="5" seed="{seed or self.rng.randint(1, 9999)}" result="n"/>'
               f'<feDiffuseLighting in="n" surfaceScale="{scale}" diffuseConstant="1.3" lighting-color="#ffffff" result="l"><feDistantLight azimuth="{self.az}" elevation="40"/></feDiffuseLighting>'
               f'<feComposite in="SourceGraphic" in2="l" operator="arithmetic" k1="{k1:.2f}" k2="{depth * 0.45:.2f}" k3="0" k4="0" result="s"/>'
               f'<feComposite in="s" in2="SourceAlpha" operator="in"/></filter>')
        return f'filter="url(#{f})"'

    def speckle(self, dark='#1e3a12', freq=(0.025, 0.07), amount=0.55):
        f = self.uid('sp')
        r, g, b = (v / 255 for v in rgb(dark))
        self.d(f'<filter id="{f}" color-interpolation-filters="sRGB">'
               f'<feTurbulence type="fractalNoise" baseFrequency="{freq[0]} {freq[1]}" numOctaves="3" seed="{self.rng.randint(1, 9999)}" result="n"/>'
               f'<feColorMatrix in="n" type="matrix" values="0 0 0 0 {r:.2f}  0 0 0 0 {g:.2f}  0 0 0 0 {b:.2f}  0 0 0 {2.2:.1f} {-1.0 - (0.5 - amount):.2f}" result="s"/>'
               f'<feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>'
               f'<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="s2"/></feMerge></filter>')
        return f'filter="url(#{f})"'

    def fog(self, y0, y1, depth=0.5, strength=0.55):
        g = self.lgrad([(0, self.T['haze'], 0), (0.65, self.T['haze'], strength * (0.6 + depth * 0.4)), (1, self.T['haze'], strength * 0.8)])
        self.add(f'<rect x="0" y="{y0:.0f}" width="{W}" height="{y1 - y0:.0f}" fill="url(#{g})"/>')

    # ----- Montañas y colinas -----
    def mountains(self, base, amp, depth, color='#6f7f99', snow=0.0, rough=0.55, levels=8, fog=0.5, reflect=True):
        pts = ridge(self.rng, base, amp, rough, levels)
        top = min(y for _, y in pts)
        rc = self.c(color, depth)
        dark = mix(rc, NIGHT, 0.18)
        if snow > 0:
            sc = self.c('#f4f8ff', depth * 0.85, lit=0.25)
            sl = clamp((amp * snow) / (base - top + 1e-9), 0.05, 0.9)
            g = self.lgrad([(0, sc, 1), (round(sl, 3), sc, 1), (round(min(sl + 0.1, 0.98), 3), rc, 1), (1, dark, 1)], 0, top, 0, base, 'userSpaceOnUse')
        else:
            g = self.lgrad([(0, mix(rc, self.T['light'], 0.18), 1), (1, dark, 1)], 0, top, 0, base, 'userSpaceOnUse')
        d = area(pts)
        self.add(f'<path d="{d}" fill="url(#{g})" {self.rock(depth)}/>')
        if reflect:
            self.reflect.append((d, rc))
        if fog:
            self.fog(base - amp * 0.35, base + 60, depth, fog)
        return pts

    def hill(self, base, amp, depth, color='#5b9a3c', k=3, tex=True, reflect=True, top_light=0.18):
        pts = hills(self.rng, base, amp, k)
        hc = self.c(color, depth)
        top = min(y for _, y in pts)
        g = self.lgrad([(0, mix(hc, self.T['light'], top_light), 1), (1, mix(hc, NIGHT, 0.25), 1)], 0, top, 0, base + amp + 120, 'userSpaceOnUse')
        d = area(pts)
        filt = self.speckle(mix(hc, '#0b1a06', 0.6), amount=0.5) if tex else ''
        self.add(f'<path d="{d}" fill="url(#{g})" {filt}/>')
        if reflect:
            self.reflect.append((d, hc))
        return pts

    # ----- Árboles -----
    def tree_grad(self, col):
        if col not in self.gcache:
            self.gcache[col] = self.rgrad([(0, mix(col, self.T['light'], 0.35), 1), (0.6, col, 1), (1, mix(col, NIGHT, 0.35), 1)], 0.4, 0.35, 0.65)
        return self.gcache[col]

    def conifer(self, x, y, h, col, snow=False):
        w = h * 0.36
        r = self.rng
        pts = [(x, y - h)]
        for k in range(1, 5):
            yy = y - h + h * k / 4.4
            pts += [(x + w * k / 4 + r.uniform(-2, 2), yy), (x + w * k / 4 * 0.55, yy - h * 0.04)]
        pts += [(x + w * 0.12, y - h * 0.06), (x + w * 0.12, y), (x - w * 0.12, y), (x - w * 0.12, y - h * 0.06)]
        for k in range(4, 0, -1):
            yy = y - h + h * k / 4.4
            pts += [(x - w * k / 4 * 0.55, yy - h * 0.04), (x - w * k / 4 + r.uniform(-2, 2), yy)]
        d = 'M' + ' L'.join(f'{a:.1f},{b:.1f}' for a, b in pts) + 'Z'
        dark = mix(col, NIGHT, 0.3)
        s = f'<path d="{d}" fill="{dark}"/><path d="M{x:.1f},{y - h:.1f} L{x + w:.1f},{y - h * 0.12:.1f} L{x:.1f},{y - h * 0.12:.1f}Z" fill="{col}" opacity=".85"/>'
        if snow:
            s += ''.join(f'<path d="M{x - w * k / 4 * 0.7:.1f},{y - h + h * k / 4.4 - h * 0.03:.1f} Q{x:.1f},{y - h + h * k / 4.4 - h * 0.12:.1f} {x + w * k / 4 * 0.7:.1f},{y - h + h * k / 4.4 - h * 0.03:.1f}" stroke="#f2f6ff" stroke-width="{max(1.5, h * 0.035):.1f}" fill="none" stroke-linecap="round" opacity=".9"/>' for k in range(1, 4))
        return s

    def round_tree(self, x, y, h, col):
        r = self.rng
        g = self.tree_grad(col)
        trunk = mix('#5a3d26', NIGHT, self.T['dark'] * 0.8)
        s = f'<rect x="{x - h * 0.04:.1f}" y="{y - h * 0.38:.1f}" width="{h * 0.08:.1f}" height="{h * 0.38:.1f}" fill="{trunk}"/>'
        for _ in range(4):
            cx, cy, rr = x + r.uniform(-h * 0.22, h * 0.22), y - h * r.uniform(0.55, 0.78), h * r.uniform(0.2, 0.3)
            s += f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{rr:.1f}" fill="url(#{g})"/>'
        return s

    def palm(self, x, y, h, lean=1):
        trunk = self.c('#8a6a45', 0, 0.1)
        leaf = self.c('#3f9b4a', 0, 0.12)
        tx, ty = x + lean * h * 0.18, y - h
        s = f'<path d="M{x:.0f},{y:.0f} Q{x + lean * h * 0.02:.0f},{y - h * 0.55:.0f} {tx:.0f},{ty:.0f}" stroke="{trunk}" stroke-width="{h * 0.05:.1f}" fill="none" stroke-linecap="round"/>'
        for a in (-160, -125, -95, -60, -25, 10, 200):
            rad = math.radians(a)
            ex, ey = tx + math.cos(rad) * h * 0.45, ty + math.sin(rad) * h * 0.22 + h * 0.12
            mx, my = tx + math.cos(rad) * h * 0.25, ty + math.sin(rad) * h * 0.25 - h * 0.05
            s += f'<path d="M{tx:.0f},{ty:.0f} Q{mx:.0f},{my:.0f} {ex:.0f},{ey:.0f} Q{mx + 6:.0f},{my + 14:.0f} {tx:.0f},{ty:.0f}Z" fill="{leaf}"/>'
        return s

    def forest(self, pts, depth, kind='conifer', palette=('#2f5d3a', '#3b6e43', '#294f33'), hmin=40, hmax=90, density=1.0, snow=False, jitter=14):
        r = self.rng
        out = []
        x = -40
        while x < W + 40:
            h = r.uniform(hmin, hmax)
            y = y_at(pts, x) + r.uniform(0, jitter)
            col = self.c(r.choice(palette), depth, 0.08)
            out.append(self.conifer(x, y + h * 0.1, h, col, snow) if kind == 'conifer' else self.round_tree(x, y + h * 0.12, h, col))
            x += r.uniform(0.22, 0.55) * h / density
        self.add(f'<g>{"".join(out)}</g>')

    # ----- Agua -----
    def water(self, top, bottom=H + 10, color=None, glitter=True, reflect_opacity=0.38):
        col = self.c(color or self.T['water'], 0.1, 0.05)
        horizon = self.T['sky'][2]
        g = self.lgrad([(0, mix(horizon, col, 0.35), 1), (0.25, col, 1), (1, mix(col, NIGHT, 0.35), 1)], 0, top, 0, bottom, 'userSpaceOnUse')
        self.add(f'<rect x="0" y="{top:.0f}" width="{W}" height="{bottom - top:.0f}" fill="url(#{g})"/>')
        if self.reflect:
            cp, rf = self.uid('wc'), self.uid('rp')
            self.d(f'<clipPath id="{cp}"><rect x="0" y="{top:.0f}" width="{W}" height="{bottom - top:.0f}"/></clipPath>')
            self.d(f'<filter id="{rf}" x="-5%" y="0" width="110%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.002 0.09" numOctaves="2" seed="{self.rng.randint(1, 999)}" result="n"/>'
                   f'<feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="1.6"/></filter>')
            refl = ''.join(f'<path d="{d}" fill="{c}"/>' for d, c in self.reflect)
            self.add(f'<g clip-path="url(#{cp})" opacity="{reflect_opacity}" filter="url(#{rf})"><g transform="translate(0 {2 * top:.0f}) scale(1 -1)">{refl}</g></g>')
            self.reflect = []
        r = self.rng
        lines = ''.join(f'<rect x="{r.uniform(-50, W):.0f}" y="{r.uniform(top + 4, bottom):.0f}" width="{r.uniform(30, 180):.0f}" height="{r.uniform(1.2, 3):.1f}" rx="1" fill="#fff" opacity="{r.uniform(0.05, 0.22):.2f}"/>' for _ in range(160))
        self.add(f'<g>{lines}</g>')
        if glitter:
            sx = self.sunxy[0]
            gg = self.rgrad([(0, self.T['light'], 0.75), (1, self.T['light'], 0)])
            self.add(f'<ellipse cx="{sx:.0f}" cy="{top + (bottom - top) * 0.32:.0f}" rx="{90 + (bottom - top) * 0.15:.0f}" ry="{(bottom - top) * 0.45:.0f}" fill="url(#{gg})" opacity=".5"/>')
            sparks = ''.join(f'<rect x="{sx + r.gauss(0, 60):.0f}" y="{r.uniform(top + 3, top + (bottom - top) * 0.8):.0f}" width="{r.uniform(8, 50):.0f}" height="2" fill="#fff" opacity="{r.uniform(0.3, 0.8):.2f}"/>' for _ in range(70))
            self.add(f'<g>{sparks}</g>')

    # ----- Suelo del primer plano -----
    def meadow(self, base, amp, color='#5ca83f', blades=650, flowers=('#ff6fa3', '#ffd23f', '#ffffff', '#b48cff'), flower_n=110, path=None):
        pts = self.hill(base, amp, 0, color, k=2, reflect=False, top_light=0.25)
        r = self.rng
        if path:
            px, w0 = path
            top_y = y_at(pts, px) + 6
            pc = self.c('#c9a36a', 0, 0.12)
            g = self.lgrad([(0, mix(pc, self.T['haze'], 0.35), 1), (1, mix(pc, '#6b4f2c', 0.35), 1)], 0, top_y, 0, H, 'userSpaceOnUse')
            self.add(f'<path d="M{px - 8:.0f},{top_y:.0f} C{px - 40:.0f},{top_y + 120:.0f} {px + w0 * 0.2:.0f},{H - 200:.0f} {px - w0 * 0.55:.0f},{H + 10} L{px + w0 * 0.55:.0f},{H + 10} C{px + w0 * 0.5:.0f},{H - 200:.0f} {px + 50:.0f},{top_y + 120:.0f} {px + 8:.0f},{top_y:.0f} Z" fill="url(#{g})" {self.speckle("#5a4024", (0.04, 0.12), 0.45)}/>')
        greens = [self.c(c, 0, 0.1) for c in (mix(color, '#1d4a12', 0.35), mix(color, '#9ad46a', 0.25), color, mix(color, '#2f6b20', 0.2))]
        bl = []
        for _ in range(blades):
            x = r.uniform(-20, W + 20)
            ytop = y_at(pts, x)
            y = ytop + (H - ytop) * (r.random() ** 1.6) + 8
            near = (y - ytop) / max(1, H - ytop)
            h = (14 + near * 70) * r.uniform(0.6, 1.3)
            lean = r.uniform(-0.45, 0.45) * h
            bl.append(f'<path d="M{x:.0f},{y:.0f} q{lean * 0.3:.0f},{-h * 0.55:.0f} {lean:.0f},{-h:.0f}" stroke="{r.choice(greens)}" stroke-width="{1.4 + near * 3.6:.1f}" fill="none" stroke-linecap="round"/>')
        self.add(f'<g>{"".join(bl)}</g>')
        if flower_n:
            fl = []
            for _ in range(flower_n):
                x = r.uniform(0, W)
                ytop = y_at(pts, x)
                y = ytop + (H - ytop) * (r.random() ** 1.3) + 10
                near = (y - ytop) / max(1, H - ytop)
                rr = 2.2 + near * 7
                c = self.c(r.choice(flowers), 0, 0.05)
                fl.append(f'<g transform="translate({x:.0f} {y:.0f})">' + ''.join(f'<circle cx="{math.cos(a) * rr:.1f}" cy="{math.sin(a) * rr * 0.7:.1f}" r="{rr * 0.75:.1f}" fill="{c}"/>' for a in (0, 1.26, 2.51, 3.77, 5.03)) + f'<circle r="{rr * 0.55:.1f}" fill="#ffcf33"/></g>')
            self.add(f'<g>{"".join(fl)}</g>')
        return pts

    def sand(self, base, amp, color='#f0d79e', foam=None):
        pts = self.hill(base, amp, 0, color, k=2, tex=True, reflect=False, top_light=0.3)
        if foam:
            d = 'M' + ' L'.join(f'{x:.0f},{y + 4:.0f}' for x, y in pts)
            self.add(f'<path d="{d}" stroke="#ffffff" stroke-width="7" fill="none" opacity=".75" stroke-linecap="round"/>')
        return pts

    def rocks(self, pts, n=6, smin=30, smax=90, color='#8a8a92'):
        r = self.rng
        out = []
        for _ in range(n):
            x = r.uniform(40, W - 40)
            y = y_at(pts, x) + r.uniform(20, 160)
            s = r.uniform(smin, smax)
            c = self.c(color, 0, 0.1)
            g = self.lgrad([(0, mix(c, '#ffffff', 0.25), 1), (1, mix(c, NIGHT, 0.4), 1)], 0, 0, 0.8, 1)
            p = [(x - s, y), (x - s * 0.7, y - s * 0.55), (x - s * 0.1, y - s * 0.8), (x + s * 0.6, y - s * 0.5), (x + s, y)]
            out.append(f'<path d="M' + ' L'.join(f'{a:.0f},{b:.0f}' for a, b in p) + f'Z" fill="url(#{g})"/>')
        self.add(f'<g {self.rock(0, (0.02, 0.04), 4)}>{"".join(out)}</g>')

    # ----- Construcciones -----
    def pagoda(self, x, y, s, depth=0.3, tiers=5):
        wood = self.c('#9c2f24', depth)
        roof = self.c('#2c3138', depth)
        trim = self.c('#e6c069', depth)
        out = ''
        yy = y
        for i in range(tiers):
            w = s * (1 - i * 0.13)
            h = s * 0.3
            out += f'<rect x="{x - w * 0.36:.0f}" y="{yy - h:.0f}" width="{w * 0.72:.0f}" height="{h:.0f}" fill="{wood}"/>'
            out += f'<path d="M{x - w * 0.62:.0f},{yy - h:.0f} Q{x:.0f},{yy - h - s * 0.12:.0f} {x + w * 0.62:.0f},{yy - h:.0f} L{x + w * 0.5:.0f},{yy - h - s * 0.1:.0f} Q{x:.0f},{yy - h - s * 0.2:.0f} {x - w * 0.5:.0f},{yy - h - s * 0.1:.0f} Z" fill="{roof}"/>'
            out += f'<rect x="{x - w * 0.36:.0f}" y="{yy - h:.0f}" width="{w * 0.72:.0f}" height="{s * 0.025:.0f}" fill="{trim}"/>'
            yy -= h + s * 0.08
        out += f'<rect x="{x - s * 0.015:.0f}" y="{yy - s * 0.35:.0f}" width="{s * 0.03:.0f}" height="{s * 0.4:.0f}" fill="{trim}"/>'
        self.add(f'<g>{out}</g>')

    def torii(self, x, y, s):
        red = self.c('#c9302c', 0, 0.08)
        blk = self.c('#2a2626', 0, 0.05)
        out = f'<rect x="{x - s * 0.42:.0f}" y="{y - s:.0f}" width="{s * 0.08:.0f}" height="{s:.0f}" fill="{red}"/><rect x="{x + s * 0.34:.0f}" y="{y - s:.0f}" width="{s * 0.08:.0f}" height="{s:.0f}" fill="{red}"/>'
        out += f'<rect x="{x - s * 0.5:.0f}" y="{y - s * 0.78:.0f}" width="{s:.0f}" height="{s * 0.07:.0f}" fill="{red}"/>'
        out += f'<path d="M{x - s * 0.66:.0f},{y - s * 0.98:.0f} Q{x:.0f},{y - s * 0.9:.0f} {x + s * 0.66:.0f},{y - s * 0.98:.0f} L{x + s * 0.6:.0f},{y - s * 0.88:.0f} Q{x:.0f},{y - s * 0.82:.0f} {x - s * 0.6:.0f},{y - s * 0.88:.0f}Z" fill="{blk}"/>'
        out += f'<rect x="{x - s * 0.58:.0f}" y="{y - s * 0.9:.0f}" width="{s * 1.16:.0f}" height="{s * 0.05:.0f}" fill="{red}"/>'
        self.add(f'<g>{out}</g>')

    def house(self, x, y, s, wall='#f1e6d0', roof='#c0533a', depth=0.2):
        wc, rc = self.c(wall, depth), self.c(roof, depth)
        side = mix(wc, NIGHT, 0.22)
        lit = self.time in ('noche', 'atardecer')
        win = '#ffd27a' if lit else self.c('#8fc4e8', depth)
        out = f'<rect x="{x:.0f}" y="{y - s * 0.6:.0f}" width="{s:.0f}" height="{s * 0.6:.0f}" fill="{wc}"/>'
        out += f'<path d="M{x + s:.0f},{y - s * 0.6:.0f} L{x + s * 1.35:.0f},{y - s * 0.7:.0f} L{x + s * 1.35:.0f},{y - s * 0.08:.0f} L{x + s:.0f},{y:.0f}Z" fill="{side}"/>'
        out += f'<path d="M{x - s * 0.08:.0f},{y - s * 0.58:.0f} L{x + s * 0.5:.0f},{y - s * 1.05:.0f} L{x + s * 1.12:.0f},{y - s * 0.6:.0f}Z" fill="{rc}"/>'
        out += f'<path d="M{x + s * 0.5:.0f},{y - s * 1.05:.0f} L{x + s * 0.85:.0f},{y - s * 1.15:.0f} L{x + s * 1.45:.0f},{y - s * 0.7:.0f} L{x + s * 1.12:.0f},{y - s * 0.6:.0f}Z" fill="{mix(rc, NIGHT, 0.25)}"/>'
        out += f'<rect x="{x + s * 0.4:.0f}" y="{y - s * 0.3:.0f}" width="{s * 0.2:.0f}" height="{s * 0.3:.0f}" fill="{self.c("#6b4426", depth)}"/>'
        out += ''.join(f'<rect x="{x + s * xx:.0f}" y="{y - s * 0.48:.0f}" width="{s * 0.16:.0f}" height="{s * 0.14:.0f}" fill="{win}"/>' for xx in (0.12, 0.72))
        self.add(f'<g>{out}</g>')

    def skyline(self, base, depth=0.4, n=26, hmin=120, hmax=420, x0=0, x1=W):
        r = self.rng
        lit = self.time in ('noche', 'atardecer')
        out = []
        x = x0
        while x < x1:
            w = r.uniform(50, 120)
            h = r.uniform(hmin, hmax)
            c = self.c(r.choice(['#5d6b86', '#6f7c98', '#4f5c78', '#7b88a3']), depth)
            g = self.lgrad([(0, mix(c, self.T['light'], 0.2), 1), (1, mix(c, NIGHT, 0.2), 1)], 0, 0, 1, 0)
            out.append(f'<rect x="{x:.0f}" y="{base - h:.0f}" width="{w:.0f}" height="{h + 4:.0f}" fill="url(#{g})"/>')
            for yy in range(int(base - h + 12), int(base - 8), 18):
                for xx in range(int(x + 8), int(x + w - 10), 14):
                    if lit and r.random() < 0.45:
                        out.append(f'<rect x="{xx}" y="{yy}" width="7" height="9" fill="#ffd98a" opacity="{r.uniform(0.6, 1):.2f}"/>')
                    elif not lit and r.random() < 0.5:
                        out.append(f'<rect x="{xx}" y="{yy}" width="7" height="9" fill="{mix(c, "#cfe3ff", 0.4)}" opacity=".7"/>')
            x += w + r.uniform(2, 14)
        self.add(f'<g>{"".join(out)}</g>')
        self.fog(base - 160, base + 10, depth, 0.45)

    def bridge(self, y, x1, x2, h=260):
        col = self.c('#c4453a', 0.25)
        deck = self.c('#7a7f8f', 0.25)
        cable = self.c('#e8e2d0', 0.25)
        t1, t2 = x1 + (x2 - x1) * 0.25, x1 + (x2 - x1) * 0.75
        out = f'<rect x="{t1 - 14:.0f}" y="{y - h:.0f}" width="28" height="{h + 40:.0f}" fill="{col}"/><rect x="{t2 - 14:.0f}" y="{y - h:.0f}" width="28" height="{h + 40:.0f}" fill="{col}"/>'
        out += f'<path d="M{x1:.0f},{y - 30:.0f} Q{(x1 + t1) / 2:.0f},{y - 40:.0f} {t1:.0f},{y - h:.0f} Q{(t1 + t2) / 2:.0f},{y - 40:.0f} {t2:.0f},{y - h:.0f} Q{(t2 + x2) / 2:.0f},{y - 40:.0f} {x2:.0f},{y - 30:.0f}" stroke="{cable}" stroke-width="4" fill="none"/>'
        for i in range(1, 40):
            xx = t1 + (t2 - t1) * i / 40
            tt = (xx - t1) / (t2 - t1)
            cy = (1 - tt) ** 2 * (y - h) + 2 * (1 - tt) * tt * (y - 40) + tt ** 2 * (y - h)
            out += f'<line x1="{xx:.0f}" y1="{cy:.0f}" x2="{xx:.0f}" y2="{y:.0f}" stroke="{cable}" stroke-width="1.5" opacity=".8"/>'
        out += f'<rect x="{x1:.0f}" y="{y:.0f}" width="{x2 - x1:.0f}" height="16" fill="{deck}"/>'
        if self.time in ('noche', 'atardecer'):
            out += ''.join(f'<circle cx="{x1 + (x2 - x1) * i / 30:.0f}" cy="{y - 2:.0f}" r="3" fill="#ffe7a0"/>' for i in range(31))
        self.add(f'<g>{out}</g>')

    def lighthouse(self, x, y, s):
        out = ''
        for i in range(6):
            w0, w1 = s * (0.22 - i * 0.016), s * (0.22 - (i + 1) * 0.016)
            y0, y1 = y - s * i / 6 * 0.9, y - s * (i + 1) / 6 * 0.9
            c = self.c('#d63c3c' if i % 2 else '#f3f1ea', 0.05)
            out += f'<path d="M{x - w0:.0f},{y0:.0f} L{x - w1:.0f},{y1:.0f} L{x + w1:.0f},{y1:.0f} L{x + w0:.0f},{y0:.0f}Z" fill="{c}"/>'
        out += f'<rect x="{x - s * 0.12:.0f}" y="{y - s * 1.05:.0f}" width="{s * 0.24:.0f}" height="{s * 0.15:.0f}" fill="#ffe59a"/><path d="M{x - s * 0.16:.0f},{y - s * 1.05:.0f} L{x:.0f},{y - s * 1.2:.0f} L{x + s * 0.16:.0f},{y - s * 1.05:.0f}Z" fill="{self.c("#3a3a44", 0.05)}"/>'
        if self.time in ('noche', 'atardecer'):
            g = self.rgrad([(0, '#fff3b0', 0.9), (1, '#fff3b0', 0)])
            out += f'<path d="M{x:.0f},{y - s * 0.98:.0f} L{x - s * 2.6:.0f},{y - s * 1.3:.0f} L{x - s * 2.6:.0f},{y - s * 0.7:.0f}Z" fill="#fff3b0" opacity=".25"/><circle cx="{x:.0f}" cy="{y - s * 0.98:.0f}" r="{s * 0.35:.0f}" fill="url(#{g})"/>'
        self.add(f'<g>{out}</g>')

    def windmill(self, x, y, s, depth=0.3):
        c = self.c('#efe9dc', depth)
        rf = self.c('#8a5a3c', depth)
        bl = self.c('#d8d2c4', depth)
        out = f'<path d="M{x - s * 0.18:.0f},{y:.0f} L{x - s * 0.1:.0f},{y - s * 0.8:.0f} L{x + s * 0.1:.0f},{y - s * 0.8:.0f} L{x + s * 0.18:.0f},{y:.0f}Z" fill="{c}"/>'
        out += f'<path d="M{x - s * 0.14:.0f},{y - s * 0.8:.0f} L{x:.0f},{y - s * 1.0:.0f} L{x + s * 0.14:.0f},{y - s * 0.8:.0f}Z" fill="{rf}"/>'
        a0 = self.rng.uniform(0, 90)
        for k in range(4):
            a = math.radians(a0 + k * 90)
            out += f'<path d="M{x:.0f},{y - s * 0.86:.0f} L{x + math.cos(a) * s * 0.62 - math.sin(a) * s * 0.06:.0f},{y - s * 0.86 + math.sin(a) * s * 0.62 + math.cos(a) * s * 0.06:.0f} L{x + math.cos(a) * s * 0.62 + math.sin(a) * s * 0.06:.0f},{y - s * 0.86 + math.sin(a) * s * 0.62 - math.cos(a) * s * 0.06:.0f}Z" fill="{bl}"/>'
        self.add(f'<g>{out}</g>')

    def chateau(self, x, y, s, depth=0.35):
        wall = self.c('#e9e0cf', depth)
        roof = self.c('#4b6aa8', depth)
        out = f'<rect x="{x - s * 0.6:.0f}" y="{y - s * 0.45:.0f}" width="{s * 1.2:.0f}" height="{s * 0.45:.0f}" fill="{wall}"/>'
        for tx in (-0.62, -0.2, 0.2, 0.62):
            out += f'<rect x="{x + s * tx - s * 0.08:.0f}" y="{y - s * 0.7:.0f}" width="{s * 0.16:.0f}" height="{s * 0.7:.0f}" fill="{wall}"/><path d="M{x + s * tx - s * 0.11:.0f},{y - s * 0.7:.0f} L{x + s * tx:.0f},{y - s * 0.98:.0f} L{x + s * tx + s * 0.11:.0f},{y - s * 0.7:.0f}Z" fill="{roof}"/>'
        out += f'<path d="M{x - s * 0.45:.0f},{y - s * 0.45:.0f} L{x:.0f},{y - s * 0.72:.0f} L{x + s * 0.45:.0f},{y - s * 0.45:.0f}Z" fill="{roof}"/>'
        out += ''.join(f'<rect x="{x + s * xx:.0f}" y="{y - s * 0.32:.0f}" width="{s * 0.06:.0f}" height="{s * 0.1:.0f}" fill="{self.c("#6b85b8", depth)}"/>' for xx in (-0.45, -0.3, -0.15, 0.09, 0.24, 0.39))
        self.add(f'<g>{out}</g>')

    def volcano(self, x, base, w, h, depth=0.35, smoke=True):
        r = self.rng
        pts = [(x - w, base), (x - w * 0.5, base - h * 0.55), (x - w * 0.16, base - h), (x + w * 0.16, base - h), (x + w * 0.5, base - h * 0.5), (x + w, base)]
        d = 'M' + ' L'.join(f'{a:.0f},{b:.0f}' for a, b in pts) + 'Z'
        rc = self.c('#6b4b3e', depth)
        g = self.lgrad([(0, mix(rc, self.T['light'], 0.2), 1), (1, mix(rc, NIGHT, 0.3), 1)], 0, base - h, 0, base, 'userSpaceOnUse')
        self.add(f'<path d="{d}" fill="url(#{g})" {self.rock(depth, (0.006, 0.02), 7)}/>')
        lava = '#ff7a2e'
        self.add(f'<path d="M{x - w * 0.16:.0f},{base - h:.0f} L{x + w * 0.16:.0f},{base - h:.0f} L{x + w * 0.08:.0f},{base - h + 18:.0f} L{x - w * 0.1:.0f},{base - h + 14:.0f}Z" fill="{lava}" opacity=".9"/>')
        for _ in range(3):
            xx = x + r.uniform(-w * 0.12, w * 0.12)
            self.add(f'<path d="M{xx:.0f},{base - h + 10:.0f} q{r.uniform(-30, 30):.0f},{h * 0.3:.0f} {r.uniform(-60, 60):.0f},{h * r.uniform(0.4, 0.7):.0f}" stroke="{lava}" stroke-width="{r.uniform(3, 7):.0f}" fill="none" opacity=".55" stroke-linecap="round"/>')
        if smoke:
            f = self.uid('sm')
            sc = self.c('#b9b1ab', depth * 0.6, 0.2)
            self.d(f'<filter id="{f}" x="-50%" y="-50%" width="200%" height="200%"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="{r.randint(1, 999)}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="70" xChannelSelector="R" yChannelSelector="G" result="dd"/><feGaussianBlur in="dd" stdDeviation="8"/></filter>')
            blobs = ''.join(f'<circle cx="{x + i * 26 + r.uniform(-20, 20):.0f}" cy="{base - h - 40 - i * 55:.0f}" r="{40 + i * 14:.0f}" fill="{sc}" opacity="{0.85 - i * 0.08:.2f}"/>' for i in range(7))
            self.add(f'<g filter="url(#{f})">{blobs}</g>')
        self.reflect.append((d, rc))

    def waterfall(self, x, top, bottom, w):
        f = self.uid('wf')
        self.d(f'<filter id="{f}" x="-20%" y="0" width="140%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.08 0.004" numOctaves="2" seed="{self.rng.randint(1, 999)}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="18" xChannelSelector="R" yChannelSelector="G"/></filter>')
        g = self.lgrad([(0, '#e9f6ff', 0.95), (0.5, '#ffffff', 0.9), (1, '#cfe9fb', 0.95)], 0, 0, 1, 0)
        stripes = ''.join(f'<rect x="{x - w / 2 + i * w / 12:.0f}" y="{top:.0f}" width="{w / 18:.0f}" height="{bottom - top:.0f}" fill="#ffffff" opacity="{self.rng.uniform(0.2, 0.6):.2f}"/>' for i in range(12))
        self.add(f'<g filter="url(#{f})"><rect x="{x - w / 2:.0f}" y="{top:.0f}" width="{w:.0f}" height="{bottom - top:.0f}" fill="url(#{g})"/>{stripes}</g>')
        mist = self.rgrad([(0, '#ffffff', 0.8), (1, '#ffffff', 0)])
        self.add(f'<ellipse cx="{x:.0f}" cy="{bottom:.0f}" rx="{w * 2.2:.0f}" ry="{w * 0.8:.0f}" fill="url(#{mist})"/>')

    def hut(self, x, y, s):
        wall = self.c('#c9a06a', 0.1)
        roof = self.c('#b58a4a', 0.1)
        out = f'<rect x="{x - s * 0.4:.0f}" y="{y - s * 0.45:.0f}" width="{s * 0.8:.0f}" height="{s * 0.45:.0f}" fill="{wall}"/>'
        out += f'<path d="M{x - s * 0.62:.0f},{y - s * 0.4:.0f} L{x:.0f},{y - s * 0.95:.0f} L{x + s * 0.62:.0f},{y - s * 0.4:.0f}Z" fill="{roof}"/>'
        out += ''.join(f'<line x1="{x - s * 0.6 + i * s * 0.12:.0f}" y1="{y - s * 0.42:.0f}" x2="{x:.0f}" y2="{y - s * 0.93:.0f}" stroke="{mix(roof, NIGHT, 0.3)}" stroke-width="2" opacity=".6"/>' for i in range(11))
        out += f'<rect x="{x - s * 0.1:.0f}" y="{y - s * 0.28:.0f}" width="{s * 0.2:.0f}" height="{s * 0.28:.0f}" fill="{self.c("#5a3b22", 0.1)}"/>'
        self.add(f'<g>{out}</g>')

    def cactus(self, x, y, s):
        c = self.c('#4f8a45', 0, 0.1)
        out = f'<rect x="{x - s * 0.08:.0f}" y="{y - s:.0f}" width="{s * 0.16:.0f}" height="{s:.0f}" rx="{s * 0.08:.0f}" fill="{c}"/>'
        out += f'<path d="M{x - s * 0.08:.0f},{y - s * 0.5:.0f} h-{s * 0.18:.0f} v-{s * 0.3:.0f}" stroke="{c}" stroke-width="{s * 0.12:.0f}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
        out += f'<path d="M{x + s * 0.08:.0f},{y - s * 0.62:.0f} h{s * 0.16:.0f} v-{s * 0.22:.0f}" stroke="{c}" stroke-width="{s * 0.11:.0f}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
        self.add(f'<g>{out}</g>')

    def mesas(self, base, depth, color='#c0643a', n=5):
        r = self.rng
        x = -100
        out = []
        while x < W + 100:
            w = r.uniform(180, 420)
            h = r.uniform(140, 330) * (1.2 - depth * 0.5)
            c = self.c(color, depth)
            stops = []
            for k in range(7):
                o = k / 7
                stops += [(round(o, 3), mix(c, '#ffd9a8' if k % 2 else NIGHT, 0.18 if k % 2 else 0.12), 1), (round(o + 1 / 7 - 0.01, 3), mix(c, '#ffd9a8' if k % 2 else NIGHT, 0.18 if k % 2 else 0.12), 1)]
            g = self.lgrad(stops, 0, base - h, 0, base, 'userSpaceOnUse')
            p = f'M{x:.0f},{base + 10:.0f} L{x + w * 0.12:.0f},{base - h:.0f} L{x + w * 0.88:.0f},{base - h:.0f} L{x + w:.0f},{base + 10:.0f}Z'
            out.append(f'<path d="{p}" fill="url(#{g})"/>')
            x += w * r.uniform(0.7, 1.1)
        self.add(f'<g {self.rock(depth, (0.004, 0.03), 6)}>{"".join(out)}</g>')
        self.fog(base - 80, base + 20, depth, 0.4)

    def fireflies(self, n=40):
        r = self.rng
        g = self.rgrad([(0, '#f8ff9a', 1), (0.3, '#d9ff6a', 0.6), (1, '#d9ff6a', 0)])
        self.add('<g>' + ''.join(f'<circle cx="{r.uniform(0, W):.0f}" cy="{r.uniform(H * 0.45, H):.0f}" r="{r.uniform(6, 16):.0f}" fill="url(#{g})"/>' for _ in range(n)) + '</g>')

    def leaves(self, n=40, colors=('#e8743b', '#d9452e', '#f2b33d')):
        r = self.rng
        self.add('<g>' + ''.join(f'<ellipse cx="{r.uniform(0, W):.0f}" cy="{r.uniform(0, H):.0f}" rx="{r.uniform(5, 11):.0f}" ry="{r.uniform(3, 6):.0f}" fill="{r.choice(colors)}" transform="rotate({r.uniform(0, 180):.0f} 0 0)" opacity=".9"/>' for _ in range(n)) + '</g>')

    def snowfall(self, n=180):
        r = self.rng
        self.add('<g>' + ''.join(f'<circle cx="{r.uniform(0, W):.0f}" cy="{r.uniform(0, H):.0f}" r="{r.uniform(1.5, 4.5):.1f}" fill="#fff" opacity="{r.uniform(0.5, 0.95):.2f}"/>' for _ in range(n)) + '</g>')

    def finish(self, vignette=0.42, grain=0.06):
        x, y = self.sunxy
        g = self.rgrad([(0, self.T['light'], 0.42 if self.time != 'noche' else 0.15), (1, self.T['light'], 0)])
        self.add(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="900" fill="url(#{g})" style="mix-blend-mode:screen"/>')
        v = self.rgrad([(0.55, '#000', 0), (1, '#000', vignette)], 0.5, 0.5, 0.75)
        self.add(f'<rect width="{W}" height="{H}" fill="url(#{v})"/>')
        f = self.uid('gr')
        self.d(f'<filter id="{f}"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="{self.rng.randint(1, 999)}"/><feColorMatrix type="saturate" values="0"/></filter>')
        self.add(f'<rect width="{W}" height="{H}" filter="url(#{f})" opacity="{grain}" style="mix-blend-mode:overlay"/>')


# ======================= Paisajes =======================
def p_otono(s, pagoda=True, torii=False):
    s.sky(); s.clouds(0.45)
    s.mountains(560, 260, 0.85, '#7d7f9c', snow=0.12)
    s.mountains(640, 200, 0.6, '#6b6a80')
    h = s.hill(700, 40, 0.42, '#8a6a3a')
    s.forest(h, 0.42, 'round', ('#d9692e', '#c9452c', '#e7a33a', '#b8572a'), 40, 80, 1.4)
    if pagoda:
        s.pagoda(W * 0.72, y_at(h, W * 0.72) + 10, 120, 0.42)
    h2 = s.hill(820, 50, 0.2, '#8f6b36')
    s.forest(h2, 0.2, 'round', ('#e0702f', '#cf4a2d', '#efb03f', '#a8452a'), 70, 140, 1.2)
    pts = s.meadow(900, 30, '#9c8a3e', blades=520, flowers=('#ff9f40', '#ffd23f', '#e94b3c'), flower_n=50, path=(W * 0.62, 260))
    if torii:
        s.torii(W * 0.62, y_at(pts, W * 0.62) + 120, 230)
    s.leaves(36); s.finish()


def p_bosque(s, snow=False):
    s.sky(); s.clouds(0.4)
    s.mountains(600, 300, 0.85, '#7a87a3', snow=0.25 if snow else 0.1)
    h = s.hill(690, 30, 0.55, '#3e6b45' if not snow else '#e8eef8', tex=not snow)
    s.forest(h, 0.55, 'conifer', ('#2e5c3a', '#264d33', '#35683f'), 50, 100, 1.6, snow)
    h2 = s.hill(790, 40, 0.3, '#35603b' if not snow else '#eef3fb', tex=not snow)
    s.forest(h2, 0.3, 'conifer', ('#22452c', '#2c5535', '#1d3c26'), 90, 170, 1.4, snow)
    if snow:
        s.sand(900, 25, '#f3f7ff')
        s.snowfall(220)
    else:
        s.meadow(900, 30, '#4f9a3a', blades=600, flower_n=70, path=(W * 0.6, 240))
    if s.time == 'noche':
        s.fireflies(45 if not snow else 0)
    s.finish()


def p_lago(s, snow=False, pagoda=False):
    s.sky(); s.clouds(0.42)
    s.mountains(560, 330, 0.75, '#6d7b99', snow=0.3 if snow else 0.18)
    s.mountains(600, 200, 0.5, '#5d6b80', snow=0.15 if snow else 0)
    h = s.hill(640, 22, 0.4, '#e9eef8' if snow else '#3f6b45', tex=not snow)
    s.forest(h, 0.4, 'conifer', ('#2e5c3a', '#264d33'), 30, 62, 1.8, snow)
    if pagoda:
        s.pagoda(W * 0.3, y_at(h, W * 0.3) + 6, 80, 0.45)
    s.water(650, 900, '#9cc6e6' if snow else None)
    if snow:
        s.sand(900, 22, '#f3f7ff')
        s.snowfall(140)
    else:
        pts = s.meadow(930, 22, '#5aa83f', blades=420, flower_n=60)
        s.rocks(pts, 5, 30, 70)
    s.finish()


def p_pradera(s, molinos=False, chateau=False, flores=110, casas=False):
    s.sky(); s.clouds(0.5)
    s.mountains(600, 180, 0.8, '#7d8aa5', snow=0.08)
    h = s.hill(680, 45, 0.5, '#6aa84a')
    s.forest(h, 0.5, 'round', ('#3f7d3a', '#4f8f45', '#356b33'), 30, 60, 0.55)
    if molinos:
        for xx in (0.2, 0.34, 0.8):
            s.windmill(W * xx, y_at(h, W * xx) + 6, 140, 0.45)
    if chateau:
        s.chateau(W * 0.7, y_at(h, W * 0.7) + 8, 220, 0.45)
    h2 = s.hill(790, 40, 0.25, '#62a845')
    if casas:
        s.house(W * 0.66, y_at(h2, W * 0.66) + 18, 100, '#f1e6d0', '#c0533a', 0.25)
        s.house(W * 0.78, y_at(h2, W * 0.78) + 22, 86, '#efe3c8', '#3d6fb5', 0.25)
    s.forest(h2, 0.25, 'round', ('#3a7a35', '#4b8c40'), 70, 120, 0.35)
    s.meadow(900, 26, '#5aae3f', blades=650, flower_n=flores, path=(W * 0.58, 250))
    if s.time == 'noche':
        s.fireflies(40)
    s.finish()


def p_playa(s, volcan=False, palmeras=True, cabanas=False, faro=False, turquesa=False):
    s.sky(); s.clouds(0.38)
    if volcan:
        s.volcano(W * 0.72, 620, 380, 300, 0.55)
    s.mountains(615, 90, 0.7, '#6b8f7a', fog=0.3)
    s.water(620, 1100, '#1fb6c9' if turquesa else '#2f86c4')
    pts = s.sand(860, 30, '#f2dba2', foam=True)
    if palmeras:
        for xx, lean in ((0.86, -1), (0.95, -1), (0.08, 1)):
            s.add(s.palm(W * xx, y_at(pts, W * xx) + 140, 360, lean))
    if cabanas:
        s.hut(W * 0.7, y_at(pts, W * 0.7) + 110, 170)
    if faro:
        s.lighthouse(W * 0.9, y_at(pts, W * 0.9) + 40, 300)
    s.rocks(pts, 4, 25, 60, '#9a8f86')
    s.finish(0.35)


def p_selva(s, cascada=True):
    s.sky(); s.clouds(0.45)
    s.mountains(560, 300, 0.7, '#4f7a5d', fog=0.65)
    if cascada:
        s.waterfall(W * 0.5, 330, 700, 110)
    h = s.hill(700, 30, 0.45, '#2f6b3a')
    s.forest(h, 0.45, 'round', ('#2f7d3a', '#3c8f45', '#25652f'), 60, 120, 1.7)
    s.water(720, 860, '#2f8a8f', glitter=False, reflect_opacity=0.3)
    h2 = s.hill(860, 30, 0.2, '#2f6b33')
    s.forest(h2, 0.2, 'round', ('#2a7a33', '#36913f', '#1f5e2a'), 110, 200, 1.2)
    for xx, lean in ((0.05, 1), (0.93, -1)):
        s.add(s.palm(W * xx, H + 40, 520, lean))
    s.meadow(960, 18, '#3e8f37', blades=500, flowers=('#ff4f7a', '#ffb3c9', '#ffd23f'), flower_n=60)
    s.finish(0.45)


def p_ciudad(s, puente=True):
    s.sky(); s.clouds(0.35, bottom=0.5)
    s.skyline(660, 0.45, hmin=160, hmax=480)
    s.water(660, 1100, '#2c4f86')
    if puente:
        s.bridge(700, -80, W * 0.75, 300)
    pts = s.sand(930, 18, '#8d8f9b')
    s.add(f'<rect x="0" y="{y_at(pts, W / 2) - 6:.0f}" width="{W}" height="10" fill="{s.c("#5b5f6b", 0)}"/>')
    s.finish(0.4)


def p_desierto(s, canyon=True):
    s.sky(); s.clouds(0.3, bottom=0.45)
    if canyon:
        s.mesas(640, 0.7, '#c46a3c')
        s.mesas(760, 0.35, '#b85a30')
    else:
        s.mountains(620, 150, 0.7, '#c99a6a', fog=0.4)
    pts = s.sand(860, 40, '#e3b67a')
    for xx in (0.62, 0.78, 0.9):
        s.cactus(W * xx, y_at(pts, W * xx) + 160, 160)
    s.rocks(pts, 6, 30, 90, '#b98563')
    s.finish(0.45)


def p_volcan(s):
    s.sky(); s.clouds(0.4)
    s.volcano(W * 0.55, 700, 520, 420, 0.4)
    h = s.hill(760, 40, 0.3, '#4c6b3e')
    s.forest(h, 0.3, 'round', ('#3a6b35', '#4a7d40'), 50, 100, 0.8)
    s.meadow(920, 26, '#5c9a3c', blades=520, flowers=('#ff4f7a', '#ffffff', '#ffd23f'), flower_n=50)
    s.finish(0.45)


# Escenarios: id, nombre, región, terreno de los escondites, hora, semilla y cómo se pinta.
ESCENARIOS = [
    ('johto-otono', 'Bosque otoñal de Johto', 'johto', 'campo', 'dia', 11, lambda s: p_otono(s, True, False)),
    ('johto-atardecer', 'Ruta otoñal al atardecer', 'johto', 'campo', 'atardecer', 12, lambda s: p_otono(s, True, False)),
    ('johto-santuario', 'Santuario de Johto', 'johto', 'campo', 'manana', 13, lambda s: p_otono(s, False, True)),
    ('johto-lago', 'Lago de Johto', 'johto', 'campo', 'manana', 14, lambda s: p_lago(s, False, True)),
    ('johto-noche', 'Bosque de Johto de noche', 'johto', 'campo', 'noche', 15, lambda s: p_bosque(s)),
    ('hoenn-volcan', 'Islas volcánicas de Hoenn', 'hoenn', 'playa', 'dia', 21, lambda s: p_playa(s, True)),
    ('hoenn-playa', 'Playa de Hoenn', 'hoenn', 'playa', 'manana', 22, lambda s: p_playa(s, False, True, False, False)),
    ('hoenn-selva', 'Selva de Hoenn', 'hoenn', 'campo', 'dia', 23, lambda s: p_selva(s)),
    ('hoenn-atardecer', 'Mar de Hoenn al atardecer', 'hoenn', 'playa', 'atardecer', 24, lambda s: p_playa(s, True)),
    ('hoenn-faro', 'Faro de la costa de Hoenn', 'hoenn', 'playa', 'dia', 25, lambda s: p_playa(s, False, False, False, True)),
    ('teselia-ciudad', 'Ciudad de Teselia al anochecer', 'teselia', 'ciudad', 'atardecer', 31, lambda s: p_ciudad(s)),
    ('teselia-noche', 'Bahía de Teselia de noche', 'teselia', 'ciudad', 'noche', 32, lambda s: p_ciudad(s)),
    ('teselia-desierto', 'Desierto de Teselia', 'teselia', 'desierto', 'dia', 33, lambda s: p_desierto(s, True)),
    ('teselia-molinos', 'Praderas de Teselia', 'teselia', 'campo', 'dia', 34, lambda s: p_pradera(s, True)),
    ('alola-playa', 'Playa de Alola', 'alola', 'playa', 'dia', 41, lambda s: p_playa(s, False, True, True, False, True)),
    ('alola-volcan', 'Volcán de Alola', 'alola', 'campo', 'atardecer', 42, lambda s: p_volcan(s)),
    ('alola-cascada', 'Cascada de la selva de Alola', 'alola', 'campo', 'manana', 43, lambda s: p_selva(s, True)),
    ('alola-atardecer', 'Isla de Alola al atardecer', 'alola', 'playa', 'atardecer', 44, lambda s: p_playa(s, False, True, True, False, True)),
    ('sinnoh-nieve', 'Montañas nevadas de Sinnoh', 'sinnoh', 'nieve', 'dia', 51, lambda s: p_bosque(s, True)),
    ('sinnoh-lago', 'Lago helado de Sinnoh', 'sinnoh', 'nieve', 'manana', 52, lambda s: p_lago(s, True)),
    ('sinnoh-noche', 'Bosque nevado de noche', 'sinnoh', 'nieve', 'noche', 53, lambda s: p_bosque(s, True)),
    ('sinnoh-monte', 'Monte de Sinnoh al atardecer', 'sinnoh', 'campo', 'atardecer', 54, lambda s: p_lago(s, False)),
    ('kalos-jardines', 'Jardines de Kalos', 'kalos', 'campo', 'dia', 61, lambda s: p_pradera(s, False, True, 260)),
    ('kalos-flores', 'Campos de flores de Kalos', 'kalos', 'campo', 'atardecer', 62, lambda s: p_pradera(s, False, True, 300)),
    ('paldea-canon', 'Cañón de Paldea', 'paldea', 'desierto', 'atardecer', 71, lambda s: p_desierto(s, True)),
    ('paldea-colinas', 'Colinas de Paldea', 'paldea', 'campo', 'dia', 72, lambda s: p_pradera(s, True, False, 120, True)),
    ('kanto-pradera', 'Pradera de Kanto', 'kanto', 'campo', 'dia', 81, lambda s: p_pradera(s, False, False, 160, True)),
    ('kanto-bosque', 'Bosque de Kanto', 'kanto', 'campo', 'dia', 82, lambda s: p_bosque(s)),
    ('kanto-lago', 'Lago de Kanto al amanecer', 'kanto', 'campo', 'manana', 83, lambda s: p_lago(s)),
    ('kanto-noche', 'Pradera de Kanto de noche', 'kanto', 'campo', 'noche', 84, lambda s: p_pradera(s, False, False, 80)),
    ('galar-niebla', 'Colinas de Galar con niebla', 'galar', 'campo', 'manana', 91, lambda s: p_pradera(s, False, False, 60, True)),
    ('galar-molinos', 'Campos de Galar', 'galar', 'campo', 'atardecer', 92, lambda s: p_pradera(s, True, False, 90)),
]


def cartoon_module():
    """Carga herramientas/cartoon.py (con -I no se añade la carpeta del script al path)."""
    import importlib.util
    ruta = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cartoon.py')
    spec = importlib.util.spec_from_file_location('cartoon', ruta)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    estilo = 'cartoon'
    if '--estilo' in args:
        i = args.index('--estilo')
        estilo = args[i + 1]
        del args[i:i + 2]
    sin_objetos = '--sin-objetos' in args
    dias = '--dias' in args
    args = [a for a in args if a not in ('--sin-objetos', '--dias')]
    out = args[0]
    solo = set(args[1:])
    if dias:
        raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cartoon_module().main_dias(out, os.path.join(raiz, 'js', 'dias.js'), os.path.join(raiz, 'js', 'data.js'), solo)
        return
    if estilo == 'cartoon':
        cartoon_module().main(out, solo, objetos=not sin_objetos)
        return
    if estilo != 'realista':
        sys.exit(f'Estilo desconocido: {estilo} (usa cartoon o realista)')
    os.makedirs(out, exist_ok=True)
    manifest = []
    for sid, name, region, terreno, time, seed, paint in ESCENARIOS:
        manifest.append({'id': sid, 'place': name, 'region': region, 't': terreno})
        if solo and sid not in solo:
            continue
        s = Scene(time, seed)
        paint(s)
        with open(os.path.join(out, sid + '.svg'), 'w', encoding='utf-8') as f:
            f.write(s.svg())
        print(f'{sid}: {len(s.svg()) // 1024} KB')
    with open(os.path.join(out, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
