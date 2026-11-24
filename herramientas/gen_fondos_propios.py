#!/usr/bin/env python3
"""Pokemonyx · añade al juego los escenarios pintados (herramientas/paisajes.html).

Lee herramientas/escenarios.json, comprueba qué img/escenarios/ID.jpg existen y escribe
js/fondos-propios.js, que los suma a PK.FONDOS (la lista del escenario del día).

Uso:  python -I herramientas/gen_fondos_propios.py
"""
import json
import os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TERRENOS = {'campo', 'nieve', 'ciudad', 'playa', 'desierto'}
HORAS = {'dia', 'manana', 'atardecer', 'noche'}


def main():
    with open(os.path.join(RAIZ, 'herramientas', 'escenarios.json'), encoding='utf-8') as f:
        escenas = json.load(f)
    filas, faltan = [], []
    for e in escenas:
        if not os.path.isfile(os.path.join(RAIZ, 'img', 'escenarios', e['id'] + '.jpg')):
            faltan.append(e['id'])
            continue
        if e['t'] not in TERRENOS or e['hora'] not in HORAS:
            raise SystemExit(f"Terreno u hora no válidos en {e['id']}")
        filas.append('    f(%s, %s, %s, %s, %s),' % tuple(json.dumps(v, ensure_ascii=False) for v in (e['id'], e['region'], e['place'], e['t'], e['hora'])))
    js = ('/* Pokemonyx · escenarios pintados por Jarvis con herramientas/paisajes.html (ilustraciones hechas con código,\n'
          '   no fotos). Archivo generado por herramientas/gen_fondos_propios.py: no editar a mano. */\n'
          '(function () {\n'
          "  'use strict';\n"
          "  // hora: luz con la que está pintado (el juego no le pone encima la noche ni el atardecer)\n"
          "  const f = (id, region, place, t, hora) => ({ src: 'img/escenarios/' + id + '.jpg', region, place, t, z: 1, y: 50, hora, propio: true });\n"
          '  PK.FONDOS.push(\n' + '\n'.join(filas).rstrip(',') + '\n  );\n'
          '})();\n')
    with open(os.path.join(RAIZ, 'js', 'fondos-propios.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(js)
    print(f'{len(filas)} escenarios propios en js/fondos-propios.js')
    if faltan:
        print('Sin imagen todavía:', ', '.join(faltan))


if __name__ == '__main__':
    main()
