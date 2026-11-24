/* Pokemonyx · catálogo del juego: imágenes, tipos, regiones, líderes, entrenadores, tienda y premios.
   Los datos de cada Pokémon (nombre, tipos, estadísticas y evoluciones) están en pokedex.js. */
(function () {
  'use strict';

  // ---------- Imágenes y sonidos oficiales (se cargan de internet) ----------
  const RAW = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
  PK.URL = {
    art: id => `${RAW}/pokemon/other/official-artwork/${id}.png`,
    front: id => `${RAW}/pokemon/other/showdown/${id}.gif`,
    back: id => `${RAW}/pokemon/other/showdown/back/${id}.gif`,
    mini: id => `${RAW}/pokemon/${id}.png`,
    item: name => `${RAW}/items/${name}.png`,
    badge: n => `${RAW}/badges/${n}.png`,
    trainer: name => `https://play.pokemonshowdown.com/sprites/trainers/${name}.png`,
    cry: id => `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`,
  };

  // ---------- Tipos ----------
  PK.TYPES = {
    normal: { c: '#A8A77A', e: '⭐' }, fire: { c: '#EE8130', e: '🔥' }, water: { c: '#6390F0', e: '💧' },
    electric: { c: '#F7D02C', e: '⚡' }, grass: { c: '#7AC74C', e: '🍃' }, ice: { c: '#96D9D6', e: '❄️' },
    fighting: { c: '#C22E28', e: '👊' }, poison: { c: '#A33EA1', e: '☠️' }, ground: { c: '#E2BF65', e: '⛰️' },
    flying: { c: '#A98FF3', e: '🪶' }, psychic: { c: '#F95587', e: '🔮' }, bug: { c: '#A6B91A', e: '🐛' },
    rock: { c: '#B6A136', e: '🪨' }, ghost: { c: '#735797', e: '👻' }, dragon: { c: '#6F35FC', e: '🐉' },
    dark: { c: '#705746', e: '🌙' }, steel: { c: '#B7B7CE', e: '⚙️' }, fairy: { c: '#D685AD', e: '✨' },
  };
  PK.typeName = t => (PK.TYPE_NAMES && PK.TYPE_NAMES[t]) || t;

  // Tabla oficial de eficacias (6.ª generación en adelante).
  const RAWCHART = {
    normal: { half: ['rock', 'steel'], zero: ['ghost'] },
    fire: { dbl: ['grass', 'ice', 'bug', 'steel'], half: ['fire', 'water', 'rock', 'dragon'] },
    water: { dbl: ['fire', 'ground', 'rock'], half: ['water', 'grass', 'dragon'] },
    electric: { dbl: ['water', 'flying'], half: ['electric', 'grass', 'dragon'], zero: ['ground'] },
    grass: { dbl: ['water', 'ground', 'rock'], half: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'] },
    ice: { dbl: ['grass', 'ground', 'flying', 'dragon'], half: ['fire', 'water', 'ice', 'steel'] },
    fighting: { dbl: ['normal', 'ice', 'rock', 'dark', 'steel'], half: ['poison', 'flying', 'psychic', 'bug', 'fairy'], zero: ['ghost'] },
    poison: { dbl: ['grass', 'fairy'], half: ['poison', 'ground', 'rock', 'ghost'], zero: ['steel'] },
    ground: { dbl: ['fire', 'electric', 'poison', 'rock', 'steel'], half: ['grass', 'bug'], zero: ['flying'] },
    flying: { dbl: ['grass', 'fighting', 'bug'], half: ['electric', 'rock', 'steel'] },
    psychic: { dbl: ['fighting', 'poison'], half: ['psychic', 'steel'], zero: ['dark'] },
    bug: { dbl: ['grass', 'psychic', 'dark'], half: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'] },
    rock: { dbl: ['fire', 'ice', 'flying', 'bug'], half: ['fighting', 'ground', 'steel'] },
    ghost: { dbl: ['psychic', 'ghost'], half: ['dark'], zero: ['normal'] },
    dragon: { dbl: ['dragon'], half: ['steel'], zero: ['fairy'] },
    dark: { dbl: ['psychic', 'ghost'], half: ['fighting', 'dark', 'fairy'] },
    steel: { dbl: ['ice', 'rock', 'fairy'], half: ['fire', 'water', 'electric', 'steel'] },
    fairy: { dbl: ['fighting', 'dragon', 'dark'], half: ['fire', 'poison', 'steel'] },
  };
  PK.CHART = {};
  for (const [a, r] of Object.entries(RAWCHART)) {
    PK.CHART[a] = {};
    (r.dbl || []).forEach(d => PK.CHART[a][d] = 2);
    (r.half || []).forEach(d => PK.CHART[a][d] = 0.5);
    (r.zero || []).forEach(d => PK.CHART[a][d] = 0);
  }
  PK.eff = (atk, defTypes) => defTypes.reduce((m, d) => m * (PK.CHART[atk][d] ?? 1), 1);

  // Ataques que aprende cada tipo, por nivel (el orden de pokedex.js: tier 0 a 4).
  PK.TIER_LEVELS = [1, 9, 18, 30, 42];
  PK.MOVES_BY_TYPE = {};
  for (const [id, m] of Object.entries(PK.MOVES || {})) (PK.MOVES_BY_TYPE[m.t] ??= []).push(id);
  for (const t of Object.keys(PK.MOVES_BY_TYPE)) PK.MOVES_BY_TYPE[t].sort((a, b) => PK.MOVES[a].tier - PK.MOVES[b].tier);

  // Evoluciones que solo existen en formas regionales (no salen en el juego).
  PK.EVO_BLOCK = new Set([862, 863, 864, 865, 866, 867, 980]);

  // ---------- Regiones (Pokémon salvajes de cada una) ----------
  PK.REGIONS = [
    { id: 'kanto', name: 'Kanto', wild: [16, 19, 10, 43, 39, 52, 54, 58, 63, 74, 129, 147] },
    { id: 'johto', name: 'Johto', wild: [163, 161, 179, 183, 175, 194, 228, 231, 209, 246] },
    { id: 'hoenn', name: 'Hoenn', wild: [263, 280, 285, 296, 304, 309, 278, 328, 333, 371] },
    { id: 'sinnoh', name: 'Sinnoh', wild: [396, 399, 403, 418, 417, 443, 447, 420, 459, 406] },
    { id: 'teselia', name: 'Teselia', wild: [506, 504, 509, 519, 522, 524, 527, 529, 540, 610, 607] },
    { id: 'kalos', name: 'Kalos', wild: [661, 659, 664, 667, 669, 672, 674, 677, 679, 704, 702] },
    { id: 'alola', name: 'Alola', wild: [731, 734, 736, 739, 744, 749, 753, 778, 777, 751, 742] },
    { id: 'galar', name: 'Galar', wild: [819, 821, 831, 835, 827, 829, 837, 840, 885, 850] },
    { id: 'paldea', name: 'Paldea', wild: [915, 921, 924, 926, 928, 932, 935, 938, 940, 942, 944, 946, 951, 953, 955, 957, 960, 963, 965, 969, 971, 974, 996] },
  ];
  PK.region = id => PK.REGIONS.find(r => r.id === id) || PK.REGIONS[0];
  PK.regionOfDex = id => id <= 151 ? 'kanto' : id <= 251 ? 'johto' : id <= 386 ? 'hoenn' : id <= 493 ? 'sinnoh' : id <= 649 ? 'teselia' : id <= 721 ? 'kalos' : id <= 809 ? 'alola' : id <= 905 ? 'galar' : 'paldea';

  // ---------- 52 gimnasios: un líder distinto cada semana del año (todos con dibujo oficial) ----------
  // badge: número de la medalla oficial en las imágenes de PokeAPI (si no hay, se dibuja una del color del tipo).
  const g = (id, type, region, medal, team, badge = null) => ({ id, char: id, type, region, medal, team, badge });
  PK.GYMS = [
    g('brock', 'rock', 'kanto', 'Medalla Roca', [74, 95], 1),
    g('misty', 'water', 'kanto', 'Medalla Cascada', [120, 54, 121], 2),
    g('surge', 'electric', 'kanto', 'Medalla Trueno', [100, 81, 26], 3),
    g('erika', 'grass', 'kanto', 'Medalla Arcoíris', [114, 70, 45], 4),
    g('rival_lg', 'normal', 'kanto', 'Medalla del Rival', [17, 133]),
    g('azul', 'flying', 'kanto', 'Medalla de Azul', [18, 65, 59]),
    g('rojo', 'fire', 'kanto', 'Medalla de Rojo', [25, 143, 6]),
    g('percy', 'grass', 'galar', 'Medalla Planta', [829, 830]),
    g('cathy', 'water', 'galar', 'Medalla Agua', [118, 846, 834]),
    g('naboru', 'fire', 'galar', 'Medalla Fuego', [38, 59, 851]),
    g('judith', 'fighting', 'galar', 'Medalla Lucha', [237, 675, 107]),
    g('alistair', 'ghost', 'galar', 'Medalla Fantasma', [562, 778, 94]),
    g('sally', 'fairy', 'galar', 'Medalla Hada', [303, 468, 869]),
    g('morris', 'rock', 'galar', 'Medalla Roca de Galar', [689, 874, 839]),
    g('mel', 'ice', 'galar', 'Medalla Hielo', [873, 875, 131]),
    g('nerio', 'dark', 'galar', 'Medalla Siniestra', [560, 687, 435]),
    g('roy', 'dragon', 'galar', 'Medalla Dragón de Galar', [330, 844, 884]),
    g('roxy', 'dark', 'galar', 'Medalla de Roxy', [510, 877, 861]),
    g('paul', 'normal', 'galar', 'Medalla de Paul', [832, 823, 812]),
    g('berto', 'fairy', 'galar', 'Medalla de Berto', [576, 858, 282]),
    g('sonia', 'electric', 'galar', 'Medalla de Sonia', [835, 836]),
    g('rose', 'steel', 'galar', 'Medalla de Rose', [598, 601, 879]),
    g('olivia', 'poison', 'galar', 'Medalla de Olivia', [478, 758, 350]),
    g('lionel', 'dragon', 'galar', 'Medalla del Campeón', [681, 887, 6]),
    g('candela', 'fire', 'hoenn', 'Medalla Calor', [218, 322, 324], 20),
    g('bruno', 'grass', 'hoenn', 'Medalla de Bruno', [253, 279, 286]),
    g('espinal', 'steel', 'hoenn', 'Medalla de Espinal', [437, 214]),
    g('israel', 'water', 'sinnoh', 'Medalla de Israel', [394, 397, 419]),
    g('cintia', 'dragon', 'sinnoh', 'Medalla de Campeona', [407, 442, 445]),
    g('debora', 'dragon', 'johto', 'Medalla Dragón', [148, 130, 230], 16),
    g('iris', 'dragon', 'teselia', 'Medalla Leyenda', [611, 621, 612], 40),
    g('nanci', 'grass', 'teselia', 'Medalla de Nanci', [507, 496]),
    g('corelia', 'fighting', 'kalos', 'Medalla de Corelia', [619, 701, 448]),
    g('zarala', 'ghost', 'alola', 'Medalla de Zarala', [778, 426, 770]),
    g('paolo', 'rock', 'alola', 'Medalla de Paolo', [744, 745]),
    g('araceli', 'bug', 'paldea', 'Medalla Bicho', [917, 216, 920]),
    g('brais', 'grass', 'paldea', 'Medalla Planta de Paldea', [548, 928, 185]),
    g('enigma', 'electric', 'paldea', 'Medalla Eléctrica', [941, 939, 429]),
    g('fuco', 'water', 'paldea', 'Medalla Agua de Paldea', [976, 961, 740]),
    g('laureano', 'normal', 'paldea', 'Medalla Normal', [775, 982, 398]),
    g('lima', 'ghost', 'paldea', 'Medalla Fantasma de Paldea', [354, 778, 972]),
    g('tuli', 'psychic', 'paldea', 'Medalla Psíquica', [981, 282, 956]),
    g('grusha', 'ice', 'paldea', 'Medalla Hielo de Paldea', [614, 975, 334]),
    g('anan', 'dark', 'paldea', 'Medalla de Anán', [624, 983]),
    g('melo', 'fire', 'paldea', 'Medalla de Melo', [324, 936]),
    g('henzo', 'poison', 'paldea', 'Medalla de Henzo', [435, 89, 966]),
    g('gus', 'fairy', 'paldea', 'Medalla de Gus', [184, 40, 927]),
    g('erin', 'fighting', 'paldea', 'Medalla de Erin', [454, 766, 979]),
    g('noa', 'normal', 'paldea', 'Medalla de Noa', [700, 197, 135]),
    g('damian', 'dark', 'paldea', 'Medalla de Damián', [943, 820, 934]),
    g('mencia', 'rock', 'paldea', 'Medalla de Mencía', [745, 706, 923]),
    g('sagita', 'psychic', 'paldea', 'Medalla de la Campeona', [956, 673, 983, 970]),
  ];
  PK.LEADERS = {};
  PK.GYMS.forEach(x => { x.name = (PK.CHARS[x.char] || {}).n || x.id; PK.LEADERS[x.id] = x; });

  // Aspirantes de las rondas previas del campeonato (también con dibujo oficial).
  PK.ASPIRANTES = ['chico_lg', 'chica_lg', 'nanci', 'bruno', 'israel', 'paolo', 'paul', 'roxy', 'berto', 'damian', 'noa', 'mencia', 'sonia', 'rival_lg'];

  // ---------- Entrenadores que pueden elegir los niños (dibujo oficial) ----------
  PK.AVATARS = ['chico_lg', 'chica_lg', 'nanci', 'rojo', 'azul', 'bruno', 'israel', 'paolo', 'paul', 'roxy', 'lionel', 'mencia', 'damian', 'noa', 'enigma', 'iris', 'corelia', 'sonia', 'misty', 'brock']
    .map(id => ({ id, name: PK.CHARS[id].n }));
  PK.avatar = id => PK.AVATARS.find(a => a.id === id) || { id, name: (PK.CHARS[id] || {}).n || 'Entrenador' };

  // ---------- Primer Pokémon ----------
  PK.STARTERS = [
    { region: 'kanto', ids: [1, 4, 7] }, { region: 'johto', ids: [152, 155, 158] }, { region: 'hoenn', ids: [252, 255, 258] },
    { region: 'sinnoh', ids: [387, 390, 393] }, { region: 'teselia', ids: [495, 498, 501] }, { region: 'kalos', ids: [650, 653, 656] },
    { region: 'alola', ids: [722, 725, 728] }, { region: 'galar', ids: [810, 813, 816] }, { region: 'paldea', ids: [906, 909, 912] }, { region: 'especial', ids: [25, 133] },
  ];

  // ---------- Tienda (se paga con energía ⚡) ----------
  PK.SHOP = [
    { id: 'poke-ball', cat: 'capturar', cost: 3, ball: 0, txt: 'Para atrapar Pokémon escondidos' },
    { id: 'great-ball', cat: 'capturar', cost: 6, ball: 0.15, txt: 'Atrapa mejor que la Poké Ball' },
    { id: 'ultra-ball', cat: 'capturar', cost: 10, ball: 0.3, txt: 'La que mejor atrapa' },
    { id: 'potion', cat: 'curar', cost: 4, heal: 20, txt: 'Cura 20 PS' },
    { id: 'super-potion', cat: 'curar', cost: 8, heal: 60, txt: 'Cura 60 PS' },
    { id: 'hyper-potion', cat: 'curar', cost: 14, heal: 200, txt: 'Cura 200 PS' },
    { id: 'revive', cat: 'curar', cost: 12, revive: true, txt: 'Reanima a un Pokémon debilitado' },
    { id: 'oran-berry', cat: 'bayas', cost: 2, food: true, amistad: 6, heal: 10, txt: '+6 de amistad y cura 10 PS' },
    { id: 'sitrus-berry', cat: 'bayas', cost: 4, food: true, amistad: 12, heal: 30, txt: '+12 de amistad y cura 30 PS' },
    { id: 'rare-candy', cat: 'evolucion', cost: 60, candy: true, txt: 'Sube 1 nivel (uno al día)' },
    // Objetos de combate: se equipan en un Pokémon y multiplican su ataque en el siguiente combate en el que lo use (se gastan al terminar).
    { id: 'choice-band', cat: 'combate', cost: 40, held: 'banda', txt: 'Ataque físico ×1,3 en el combate' },
    { id: 'choice-specs', cat: 'combate', cost: 40, held: 'gafas', txt: 'Ataque especial ×1,3 en el combate' },
    { id: 'life-orb', cat: 'combate', cost: 30, held: 'vidasfera', txt: 'Todos sus ataques ×1,15 en el combate' },
    ...['fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'sun-stone', 'shiny-stone', 'dusk-stone', 'dawn-stone', 'ice-stone']
      .map(id => ({ id, cat: 'evolucion', cost: 80, stone: true, txt: 'Hace evolucionar a algunos Pokémon' })),
  ];
  PK.item = id => PK.SHOP.find(i => i.id === id);
  const BALLS = { 'mystery-egg': 'Huevo misterioso', 'poke-ball': 'Poké Ball', 'great-ball': 'Super Ball', 'ultra-ball': 'Ultra Ball', 'choice-band': 'Banda Elección', 'choice-specs': 'Gafas Elección', 'life-orb': 'Vidasfera' };
  PK.itemName = id => (PK.ITEM_NAMES && PK.ITEM_NAMES[id]) || BALLS[id] || id;

  // Cuidados (energía ⚡). Los mimos son gratis.
  PK.CARE = { centro: 5, cepillar: 1, jugar: 2 };
  PK.COSTS = { entrenar: 5 };

  // ---------- Premios ----------
  PK.STREAK_REWARDS = [{ days: 3, points: 10 }, { days: 7, points: 25 }, { days: 14, points: 50 }, { days: 30, points: 100 }];
  PK.streakRewardFor = d => { const r = PK.STREAK_REWARDS.find(x => x.days === d); if (r) return r.points; return d > 30 && d % 30 === 0 ? 100 : 0; };
  // Ganar el campeonato o al Team Rocket tiene que notarse más que un día de tareas (revisión del 23/11/2026).
  PK.REWARDS = { rondaEnergia: 10, campeonEnergia: 60, campeonCaramelos: 1, rocketEnergia: 30, rocketRobo: 15 };
  // Nivel del rival del campeonato: sube con las medallas y se queda entre 6 por debajo y 3 por encima del equipo.
  PK.CHAMP_LEVEL = { base: 10, porMedalla: 4, debajo: 6, encima: 3 };
  // Metas para ahorrar: huevo misterioso (Pokémon raro) y premios de casa que ponen papá y mamá.
  PK.EGG = { cost: 300, pool: [147, 246, 371, 443, 610, 704, 885, 996, 133, 349, 280, 633, 714, 782] };
  PK.HOME_REWARD_IDEAS = [
    { title: '15 minutos de tablet', icon: '📱', cost: 100 },
    { title: 'Juego de mesa con papá o mamá', icon: '🎲', cost: 80 },
    { title: '15 minutos más antes de dormir', icon: '🌙', cost: 120 },
    { title: 'Elegir la peli del fin de semana', icon: '🎬', cost: 150 },
    { title: 'Elegir la cena', icon: '🍕', cost: 150 },
    { title: 'Un helado', icon: '🍦', cost: 200 },
  ];
  // Límites para que la energía salga sobre todo de las tareas (23/11/2026, revisión de la dinámica):
  // premios de papá y mamá por niño y día, un Caramelo Raro al día, días con tareas validadas para entrar
  // al campeonato (se cambia en Ajustes) y cofre semanal si se hace el 80 % de las tareas.
  PK.LIMITS = { premioDia: 50, expDia: 200, caramelosDia: 1, campeonatoDias: 4, cofre: 0.8 };
  PK.CHEST = { energia: 20, balls: 5 };

  PK.DIFFICULTY = {
    facil: { name: 'Fácil', ages: '7-8 años', lv: -2, dmg: 0.8 },
    normal: { name: 'Normal', ages: '9-10 años', lv: 0, dmg: 1 },
    dificil: { name: 'Difícil', ages: '11 años o más', lv: 1, dmg: 1.1 },
  };

  // Objetos que llevan los rivales del campeonato: multiplican su ataque (stat: phys = físico, spec = especial, all = todo).
  PK.RIVAL_ITEMS = {
    banda: { n: 'Banda Elección', i: '🎀', stat: 'phys', m: 1.3 },
    gafas: { n: 'Gafas Elección', i: '👓', stat: 'spec', m: 1.3 },
    vidasfera: { n: 'Vidasfera', i: '🔮', stat: 'all', m: 1.15 },
  };

  PK.ACHIEVEMENTS = {
    primera: { icon: '✅', name: 'Primer día validado', desc: 'Papá o mamá validaron tus tareas' },
    bonus: { icon: '🎁', name: '¡Sorpresa!', desc: 'Recibiste un premio extra' },
    racha3: { icon: '🔥', name: 'Racha de 3', desc: '3 días seguidos con todo hecho' },
    racha7: { icon: '🔥', name: 'Racha de 7', desc: 'Una semana entera con todo hecho' },
    racha14: { icon: '💪', name: 'Racha de 14', desc: 'Dos semanas seguidas' },
    racha30: { icon: '👑', name: 'Racha de 30', desc: '¡Un mes entero!' },
    cumple: { icon: '🎂', name: '¡Feliz cumpleaños!', desc: 'Celebraste tu cumple con tus Pokémon' },
    evolucion: { icon: '🌟', name: 'Primera evolución', desc: 'Uno de tus Pokémon evolucionó' },
    medalla1: { icon: '🏅', name: 'Primera medalla', desc: 'Ganaste un campeonato' },
    medallas4: { icon: '🎖️', name: '4 medallas', desc: 'Ganaste 4 campeonatos' },
    medallas8: { icon: '🏆', name: '8 medallas', desc: '¡Ya eres un gran entrenador!' },
    medallas26: { icon: '🌟', name: '26 medallas', desc: '¡Medio año de campeonatos!' },
    medallas52: { icon: '👑', name: '52 medallas', desc: '¡Todos los gimnasios del año!' },
    equipo3: { icon: '👥', name: 'Equipo de 3', desc: 'Tienes 3 Pokémon' },
    equipo6: { icon: '🎒', name: 'Equipo completo', desc: 'Tienes 6 Pokémon' },
    rocket: { icon: '🚀', name: 'Team Rocket vencido', desc: 'Superaste una misión del Team Rocket' },
    rescate: { icon: '🦸', name: 'Rescate', desc: 'Recuperaste un Pokémon del Team Rocket' },
    nivel20: { icon: '📈', name: 'Nivel 20', desc: 'Un Pokémon llegó al nivel 20' },
    nivel50: { icon: '🚀', name: 'Nivel 50', desc: 'Un Pokémon llegó al nivel 50' },
    energia500: { icon: '⚡', name: '500 de energía', desc: 'Has ganado 500 de energía en total' },
    captura1: { icon: '🔴', name: '¡Atrapado!', desc: 'Atrapaste tu primer Pokémon escondido' },
    capturas10: { icon: '🎯', name: 'Gran cazador', desc: 'Has atrapado 10 Pokémon' },
    explorador: { icon: '🧭', name: 'Explorador', desc: 'Has mirado en 50 escondites' },
    detective: { icon: '🔎', name: 'Detective', desc: 'Encontraste todas las rarezas de un escenario' },
  };

  // ---------- Tareas y premios de los padres (como en Planetitos) ----------
  PK.TASK_TEMPLATES = [
    { title: 'Hacer la cama', icon: '🛏️', points: 5 },
    { title: 'Lavarse los dientes', icon: '🪥', points: 5 },
    { title: 'Recoger la habitación', icon: '🧸', points: 10 },
    { title: 'Hacer los deberes', icon: '📚', points: 15 },
    { title: 'Leer 20 minutos', icon: '📖', points: 10 },
    { title: 'Poner o quitar la mesa', icon: '🍽️', points: 5 },
    { title: 'Preparar la mochila', icon: '🎒', points: 5 },
    { title: 'Ducharse', icon: '🚿', points: 5 },
    { title: 'Ropa sucia al cesto', icon: '🧺', points: 5 },
    { title: 'Practicar el instrumento', icon: '🎹', points: 10 },
  ];
  PK.TASK_ICONS = ['🛏️', '🪥', '🧸', '📚', '📖', '🍽️', '🎒', '🚿', '🧺', '🎹', '🐶', '🌱', '🧹', '👕', '🥦', '🏃', '✏️', '🧮', '🗑️', '🛁', '💧', '😴', '🧦', '⭐', '⚽', '🎨', '🙏', '🤝'];
  PK.BONUS_REASONS = ['Ha ayudado en casa 🏠', 'Muy buen comportamiento 😇', 'Ha cuidado de su hermano/a 🤝', 'Buenas notas 📚', 'Ha sido muy valiente 🦁', 'Ha comido de todo 🥦'];
  PK.CHILD_COLORS = ['#e3350d', '#2a75bb', '#3fb950', '#7b4cd9', '#ff8a1f', '#e8b100'];
  PK.DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
})();
