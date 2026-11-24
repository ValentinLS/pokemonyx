"""Genera js/pokedex.js de Pokemonyx con datos de PokeAPI (nombres en español,
tipos, estadísticas base, evoluciones, ataques y objetos).
Uso: python -I gen_pokedex.py CACHE_DIR SALIDA.js"""
import json, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

CACHE, OUT = sys.argv[1], sys.argv[2]
os.makedirs(CACHE, exist_ok=True)
API = 'https://pokeapi.co/api/v2/'

def get(path):
    if path.startswith(API):
        path = path[len(API):]
    fn = os.path.join(CACHE, path.strip('/').replace('/', '_') + '.json')
    if os.path.exists(fn):
        with open(fn, encoding='utf-8') as f:
            return json.load(f)
    url = API + path
    last = None
    for i in range(5):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Pokemonyx-juego-familiar/1.0'})
            with urllib.request.urlopen(req, timeout=40) as r:
                data = json.load(r)
            with open(fn, 'w', encoding='utf-8') as f:
                json.dump(data, f)
            return data
        except Exception as e:  # noqa
            last = e
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(f'No se pudo leer {url}: {last}')

def es(names, fallback):
    for n in names:
        if n['language']['name'] == 'es':
            return n.get('name') or n.get('genus') or fallback
    return fallback

def sid(url):
    return int(url.rstrip('/').split('/')[-1])

# ---------------- Especies que entran en el juego ----------------
STARTERS = [1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501,
            650, 653, 656, 722, 725, 728, 810, 813, 816]
SPECIAL = [25, 133]
WILD = [16, 19, 10, 43, 39, 52, 54, 58, 63, 74, 129, 147,
        163, 161, 179, 183, 175, 194, 228, 231, 209, 246,
        263, 280, 285, 296, 304, 309, 278, 328, 333, 371,
        396, 399, 403, 418, 417, 443, 447, 420, 459, 406,
        506, 504, 509, 519, 522, 524, 527, 529, 540, 610, 607,
        661, 659, 664, 667, 669, 672, 674, 677, 679, 704, 702,
        731, 734, 736, 739, 744, 749, 753, 778, 777, 751, 742,
        819, 821, 831, 835, 827, 829, 837, 840, 885, 850]
LEADERS = [74, 95, 120, 54, 121, 16, 17, 92, 93, 94, 218, 322, 324, 81, 100, 310,
           420, 387, 407, 459, 215, 460, 544, 557, 542, 611, 621, 612, 619, 701, 448,
           303, 122, 700, 51, 423, 750, 299, 525, 745, 118, 846, 834, 330, 844, 884]
ROCKET = [23, 109, 52, 202]
# Equipos de los 52 gimnasios y Pokémon de Paldea (añadidos en la versión 2)
GYMS = [114, 69, 116, 442, 37, 236, 562, 868, 688, 213, 874, 872, 875, 131, 559, 686, 434, 843, 453, 877,
        859, 143, 574, 856, 588, 597, 599, 878, 361, 757, 349, 568, 425, 781, 769, 436, 214, 917, 919, 216,
        548, 928, 438, 940, 938, 200, 976, 960, 775, 206, 353, 971, 203, 955, 613, 974, 624, 935, 88, 965,
        926, 766, 56, 942, 932, 921, 969]
PALDEA = [906, 909, 912, 915, 924, 944, 946, 951, 953, 957, 963, 996]
SEEDS = sorted(set(STARTERS + SPECIAL + WILD + LEADERS + ROCKET + GYMS + PALDEA))

STONES = ['fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone',
          'sun-stone', 'shiny-stone', 'dusk-stone', 'dawn-stone', 'ice-stone']
ITEMS = STONES + ['potion', 'super-potion', 'hyper-potion', 'revive', 'rare-candy',
                  'oran-berry', 'sitrus-berry']
MOVES = {
    'normal': ['tackle', 'quick-attack', 'headbutt', 'body-slam', 'hyper-voice'],
    'fire': ['ember', 'flame-wheel', 'fire-fang', 'flamethrower', 'fire-blast'],
    'water': ['water-gun', 'bubble-beam', 'water-pulse', 'surf', 'hydro-pump'],
    'grass': ['vine-whip', 'razor-leaf', 'magical-leaf', 'energy-ball', 'solar-beam'],
    'electric': ['thunder-shock', 'spark', 'thunder-punch', 'thunderbolt', 'thunder'],
    'ice': ['powder-snow', 'ice-shard', 'ice-fang', 'ice-beam', 'blizzard'],
    'fighting': ['rock-smash', 'karate-chop', 'brick-break', 'aura-sphere', 'close-combat'],
    'poison': ['acid', 'poison-fang', 'sludge', 'sludge-bomb', 'gunk-shot'],
    'ground': ['mud-shot', 'bulldoze', 'dig', 'earth-power', 'earthquake'],
    'flying': ['gust', 'wing-attack', 'aerial-ace', 'air-slash', 'hurricane'],
    'psychic': ['confusion', 'psybeam', 'extrasensory', 'zen-headbutt', 'psychic'],
    'bug': ['bug-bite', 'struggle-bug', 'x-scissor', 'bug-buzz', 'megahorn'],
    'rock': ['rock-throw', 'rock-tomb', 'ancient-power', 'rock-slide', 'stone-edge'],
    'ghost': ['astonish', 'shadow-sneak', 'hex', 'shadow-claw', 'shadow-ball'],
    'dragon': ['twister', 'dragon-breath', 'dragon-claw', 'dragon-pulse', 'outrage'],
    'dark': ['bite', 'snarl', 'night-slash', 'crunch', 'dark-pulse'],
    'steel': ['metal-claw', 'steel-wing', 'iron-head', 'flash-cannon', 'iron-tail'],
    'fairy': ['fairy-wind', 'disarming-voice', 'draining-kiss', 'dazzling-gleam', 'moonblast'],
}
TYPES = list(MOVES.keys())

def pmap(fn, items, workers=6):
    with ThreadPoolExecutor(workers) as ex:
        return list(ex.map(fn, items))

notas = []

# 1) Cadenas evolutivas de las semillas
species_seed = pmap(lambda i: get(f'pokemon-species/{i}/'), SEEDS)
chain_urls = sorted({s['evolution_chain']['url'] for s in species_seed})
chains = pmap(get, chain_urls)

evo = {}      # id -> lista de evoluciones
prev = {}     # id -> id anterior
stage = {}    # id -> 0, 1, 2
chain_of = {}
all_ids = set()

def parse_detail(details, depth):
    item = level = None
    friend = False
    tod = ''
    trade = False
    for d in details:
        trig = d['trigger']['name']
        if trig == 'use-item' and d.get('item') and d['item']['name'] in STONES:
            item = d['item']['name']
        elif d.get('min_level'):
            level = level or d['min_level']
        elif d.get('min_happiness') or d.get('min_affection') or (
                trig == 'level-up' and (d.get('known_move_type') or d.get('time_of_day'))):
            friend = True
            tod = tod or d.get('time_of_day') or ''
        elif trig == 'trade':
            trade = True
    if item:
        return {'item': item}
    if level:
        return {'lv': level}
    if friend:
        r = {'amistad': 1}
        if tod:
            r['hora'] = tod
        return r
    fb = 40 if trade else (30 if depth == 0 else 45)
    return {'lv': fb, 'aprox': 1}

def walk(node, depth, cid, parent=None):
    i = sid(node['species']['url'])
    all_ids.add(i)
    stage[i] = depth
    chain_of[i] = cid
    if parent:
        prev[i] = parent
    evo[i] = []
    for nxt in node['evolves_to']:
        j = sid(nxt['species']['url'])
        rule = parse_detail(nxt['evolution_details'], depth)
        rule['to'] = j
        if rule.get('aprox'):
            notas.append(f'{i}->{j} sin nivel oficial: nivel {rule["lv"]}')
        evo[i].append(rule)
        walk(nxt, depth + 1, cid, i)

for c in chains:
    walk(c['chain'], 0, c['id'])

ids = sorted(all_ids)
species = {s['id']: s for s in pmap(lambda i: get(f'pokemon-species/{i}/'), ids)}
pokemon = {i: p for i, p in zip(ids, pmap(lambda i: get(f'pokemon/{i}/'), ids))}

STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']
dex = {}
for i in ids:
    s, p = species[i], pokemon[i]
    stats = {x['stat']['name']: x['base_stat'] for x in p['stats']}
    entry = {
        'n': es(s['names'], s['name'].title()),
        'g': next((g['genus'] for g in s['genera'] if g['language']['name'] == 'es'), ''),
        't': [t['type']['name'] for t in sorted(p['types'], key=lambda t: t['slot'])],
        's': [stats[k] for k in STAT_ORDER],
        'st': stage[i],
        'c': chain_of[i],
    }
    if evo[i]:
        entry['e'] = evo[i]
    if i in prev:
        entry['p'] = prev[i]
    if s.get('is_baby'):
        entry['bebe'] = 1
    if s.get('is_legendary') or s.get('is_mythical'):
        entry['leyenda'] = 1
    dex[i] = entry

# 2) Ataques, tipos y objetos en español
move_names = [m for lst in MOVES.values() for m in lst]
moves_raw = dict(zip(move_names, pmap(lambda m: get(f'move/{m}/'), move_names)))
moves = {}
for t, lst in MOVES.items():
    for tier, m in enumerate(lst):
        r = moves_raw[m]
        moves[m] = {
            'n': es(r['names'], m), 't': r['type']['name'], 'p': r['power'] or 40,
            'a': r['accuracy'] or 100, 'c': r['damage_class']['name'], 'pr': r['priority'], 'tier': tier,
        }
        if r['type']['name'] != t:
            notas.append(f'ataque {m} es de tipo {r["type"]["name"]}, no {t}')

types_raw = dict(zip(TYPES, pmap(lambda t: get(f'type/{t}/'), TYPES)))
type_names = {t: es(r['names'], t) for t, r in types_raw.items()}
items_raw = dict(zip(ITEMS, pmap(lambda it: get(f'item/{it}/'), ITEMS)))
item_names = {k: es(r['names'], k) for k, r in items_raw.items()}

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('/* Pokemonyx · Pokédex generada con datos de PokeAPI (pokeapi.co). No editar a mano:\n'
            '   se rehace con gen_pokedex.py. Nombres, tipos, estadísticas base y evoluciones oficiales. */\n')
    f.write('window.PK = window.PK || {};\n')
    f.write('PK.DEX = ' + json.dumps({str(k): v for k, v in dex.items()}, ensure_ascii=False, separators=(',', ':')) + ';\n')
    f.write('PK.MOVES = ' + json.dumps(moves, ensure_ascii=False, separators=(',', ':')) + ';\n')
    f.write('PK.TYPE_NAMES = ' + json.dumps(type_names, ensure_ascii=False, separators=(',', ':')) + ';\n')
    f.write('PK.ITEM_NAMES = ' + json.dumps(item_names, ensure_ascii=False, separators=(',', ':')) + ';\n')

print(f'Especies: {len(dex)} · cadenas: {len(chains)} · ataques: {len(moves)} · objetos: {len(item_names)}')
print('Tipos:', type_names)
print('Objetos:', item_names)
print('Notas:', *notas, sep='\n  ')
