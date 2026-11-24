/* Pokemonyx · imágenes oficiales: fondos de los escenarios, estadios y dibujos de los personajes.
   Se cargan de las webs oficiales de cada juego (Let's Go, Espada y Escudo, Diamante Brillante,
   Leyendas Z-A, Escarlata y Púrpura y Pokémon Masters EX). Las de img/ son las que pasó Valen. */
(function () {
  'use strict';
  const LG = 'https://pokemonletsgo.pokemon.com/assets/img/';
  const SW = 'https://swordshield.pokemon.com/assets/img/';
  const BD = 'https://diamondpearl.pokemon.com/';
  const ZA = 'https://legends.pokemon.com/images/pages/story-map/';
  const SV = 'https://scarletviolet.pokemon.com/_images/';
  const MA = 'https://cdn.pokemonmasters-game.com/stylesheets/images/';

  // z: zoom para ocultar textos de la parte de abajo · y: punto vertical que se ve (%) · t: tipo de terreno
  const f = (src, region, place, t = 'campo', z = 1, y = 40) => ({ src, region, place, t, z, y });
  PK.FONDOS = [
    // ----- Kanto (Pokémon: Let's Go) -----
    f(LG + 'es-es/p07_02@2x.jpg', 'kanto', 'Pueblo Paleta', 'campo', 1.35, 0),
    f(LG + 'es-es/8_09_kanto_5_01@2x.jpg', 'kanto', 'Kanto', 'ciudad', 1.35, 0),
    f(LG + 'es-es/8_09_kanto_5_02@2x.jpg', 'kanto', 'Kanto', 'ciudad', 1.35, 0),
    f(LG + 'es-es/9_06_kanto_p09_01@2x.jpg', 'kanto', 'Kanto', 'ciudad', 1.35, 0),
    f(LG + 'es-es/9_06_kanto_p09_02@2x.jpg', 'kanto', 'Kanto', 'ciudad', 1.35, 0),
    f(LG + 'es-es/9_06_kanto_p09_03@2x.jpg', 'kanto', 'Kanto', 'campo', 1.35, 0),
    f(LG + 'es-es/9_06_kanto_p09_04@2x.jpg', 'kanto', 'Ruta de Kanto', 'campo', 1.35, 0),
    f(LG + 'kanto-region/p02_01@2x.jpg', 'kanto', 'Meseta Añil', 'campo', 1, 40),
    f(LG + 'es-es/10_17_kantop01_01_a@2x.jpg', 'kanto', 'Kanto', 'ciudad', 1.35, 0),
    f(LG + 'es-es/10_17_kantop01_01_b@2x.jpg', 'kanto', 'Kanto', 'ciudad', 1.35, 0),
    f(LG + 'kanto-region/10_17_kantop01_02@2x.jpg', 'kanto', 'Kanto', 'campo', 1, 40),
    f(LG + 'es-es/10_17_kantop02_02@2x.jpg', 'kanto', 'Bosque Verde', 'campo', 1.35, 0),
    f(LG + 'kanto-region/10_17_kantop02_03@2x.jpg', 'kanto', 'Bosque Verde', 'campo', 1, 40),
    f(LG + 'kanto-region/10_17_kantop02_04@2x.jpg', 'kanto', 'Bosque Verde', 'campo', 1, 40),
    f(LG + 'es-es/10_17_kantop03_02@2x.jpg', 'kanto', 'Kanto', 'campo', 1.35, 0),
    f(LG + 'es-es/9_06_story_p03_02@2x.jpg', 'kanto', 'Ruta de Kanto', 'campo', 1.35, 0),
    f(LG + 'es-es/9_06_story_p03_04@2x.jpg', 'kanto', 'Ruta de Kanto', 'campo', 1.35, 0),
    f(LG + 'story/9_19_story_p09_03@2x.jpg', 'kanto', 'Hierba alta de Kanto', 'campo', 1, 40),
    f(LG + 'home/story-bg.jpg', 'kanto', 'Cielo de Kanto', 'campo', 1, 60),
    f(LG + 'home/header-bg.jpg', 'kanto', 'Praderas de Kanto', 'campo', 1, 60),
    f('img/calle-victoria.webp', 'kanto', 'Calle Victoria', 'campo', 1, 40),
    // ----- Galar (Pokémon Espada y Escudo) -----
    ...['6_05_wildarea_1', '6_05_wildarea_2', '6_11_wildarea_1', '6_05_wildarea_3', '6_05_wildarea_4', '6_11_wildarea_3', 'es-es/6_11_wildarea_4', '6_05_wildarea_5']
      .map(n => f(SW + 'screenshots/' + n + '_2x.jpg', 'galar', 'Área Silvestre', 'campo', n.includes('es-es') ? 1.2 : 1, n.includes('es-es') ? 0 : 45)),
    f(SW + 'screenshots/es-es/11_6_p06_03_2x.jpg', 'galar', 'Galar', 'ciudad', 1.2, 0),
    ...['6_02_p03_01', '6_02_p03_02', '6_02_p03_05'].map(n => f(SW + 'screenshots/' + n + '_2x.jpg', 'galar', 'Isla de la Armadura', 'playa')),
    ...['9_29_p03_01', '9_29_p03_02', '9_29_p03_03', '9_29_p03_04'].map(n => f(SW + 'screenshots/' + n + '_2x.jpg', 'galar', 'Nieves de la Corona', 'nieve')),
    f(SW + 'screenshots/9_04_camp_11_2x.jpg', 'galar', 'Campamento Pokémon', 'campo'),
    f(SW + 'screenshots/9_04_camp_15_2x.jpg', 'galar', 'Campamento Pokémon', 'campo'),
    f(SW + 'screenshots/es-es/9_04_camp_17_2x.jpg', 'galar', 'Campamento Pokémon', 'campo', 1.2, 0),
    f(SW + 'articles/header-wildarea_2x.jpg', 'galar', 'Área Silvestre', 'campo', 1, 50),
    f('img/isla-armadura.webp', 'galar', 'Isla de la Armadura', 'playa', 1, 50),
    f('img/estadio-galar.webp', 'galar', 'Estadio de Galar', 'ciudad', 1, 40),
    // ----- Sinnoh (Pokémon Diamante Brillante y Perla Reluciente) -----
    f(BD + 'assets/story/story_header_loop.jpg', 'sinnoh', 'Sinnoh', 'campo'),
    f(BD + 'assets/story/story_loop.jpg', 'sinnoh', 'Sinnoh', 'campo'),
    // ----- Kalos (Leyendas Pokémon: Z-A) -----
    f(ZA + 'map-story-header-xxl-2x.jpg', 'kalos', 'Ciudad Luminalia', 'ciudad', 1, 50),
    f(ZA + 'map-story-img-1-2x.jpg', 'kalos', 'Ciudad Luminalia', 'ciudad'),
    f(ZA + 'map-story-img-2-2x.jpg', 'kalos', 'Ciudad Luminalia', 'ciudad'),
    f(ZA + 'map-story-img-3-2x.jpg', 'kalos', 'Ciudad Luminalia', 'ciudad'),
    f(ZA + 'map-story-img-4-2x.jpg', 'kalos', 'Ciudad Luminalia', 'ciudad'),
    // ----- Paldea (Pokémon Escarlata y Púrpura) -----
    f(SV + 'overview/starfall-street/gallery/starfall-gallery-4.jpg', 'paldea', 'Base del Team Star', 'desierto'),
    f(SV + 'overview/starfall-street/gallery/starfall-gallery-5.jpg', 'paldea', 'Base del Team Star', 'desierto'),
    f(SV + 'overview/starfall-street/gallery/starfall-gallery-6.jpg', 'paldea', 'Paldea', 'campo'),
    f(SV + 'home/world-evolved-background-large-up.jpg', 'paldea', 'Paldea', 'campo', 1, 50),
    f('img/casa-paldea.webp', 'paldea', 'Casa en Paldea', 'campo', 1, 40),
  ];

  // Fondos de los combates del campeonato (estadios y gimnasios).
  PK.ESTADIOS = {
    general: 'img/estadio.png',
    kanto: [LG + 'es-es/8_09_story_2_01@2x.jpg', LG + 'es-es/8_09_story_2_05@2x.jpg', LG + 'es-es/8_09_story_3_01@2x.jpg'],
  };

  // Dibujos oficiales de los personajes. n: nombre en español (como en las webs oficiales).
  const c = (n, src, region, from) => ({ n, src, region, from });
  PK.CHARS = {
    // Pokémon Masters EX (cada uno sale con su Pokémon compañero)
    brock: c('Brock', MA + '495cb7355fffb09d1b7f7d0ec59abee7bba86404bbdb6b6907b8d48a158097b0.png', 'kanto', 'Pokémon Masters EX'),
    misty: c('Misty', MA + '36a26f4c86fc50b8266a20b6624475661ca411816371ec73afeadb6e992474ea.png', 'kanto', 'Pokémon Masters EX'),
    nanci: c('Nanci', MA + '02ea798248bdbf317c5cbe70783dcf641cfdb6bb74ce9af01e3935426463eccb.png', 'teselia', 'Pokémon Masters EX'),
    rojo: c('Rojo', MA + 'adcd0b4dab40527572676e3108c028ae2eaf225133267d0ddf1b0b040a3775a1.png', 'kanto', 'Pokémon Masters EX'),
    azul: c('Azul', MA + 'c80e8603092f02e7cf7314223db5a28f576049f99a7eb461814932cbba3c77a9.png', 'kanto', 'Pokémon Masters EX'),
    cintia: c('Cintia', MA + 'b229329a29958b2712c1167ecfffa90dd8e4e6b6680648a8636844b1a70bdd63.png', 'sinnoh', 'Pokémon Masters EX'),
    iris: c('Iris', MA + 'bf45f0f3ede2fd8a2d9511484672f35b76c669587644adf9c2dae03b258369d0.png', 'teselia', 'Pokémon Masters EX'),
    debora: c('Débora', MA + 'c3e042f29dc61959a0aeb5f3ae9c257dc1d3718d4e0facd5537133b46a4886bf.png', 'johto', 'Pokémon Masters EX'),
    bruno: c('Bruno', MA + '4c96f38ef1f098dc674d26c54a2c0bdc620e0637ec1f5232ac01105f01d35b95.png', 'hoenn', 'Pokémon Masters EX'),
    candela: c('Candela', MA + '89b15321c24f2d89bbd91cfb56cff638d8704a966fda8caffb38aeb4e4658153.png', 'hoenn', 'Pokémon Masters EX'),
    israel: c('Israel', MA + '0a9b9b17f590a332b6cf8c610bb2867927fc450347577db17b51a2f1485a11ad.png', 'sinnoh', 'Pokémon Masters EX'),
    corelia: c('Corelia', MA + '09f93c57149999af429036112ca5b9e0d15686e6f6fed3cf0ad6b8b1ee5bb5c4.png', 'kalos', 'Pokémon Masters EX'),
    zarala: c('Zarala', MA + '4603aea8f9eecf514b3df9a45e81ccb1706aa37834f3b0856c9b989a28e66626.png', 'alola', 'Pokémon Masters EX'),
    espinal: c('Espinal', MA + 'ae2e9d4134018863ca3e20b08ff9d4ec346cd112339926ed7936520e532f8934.png', 'hoenn', 'Pokémon Masters EX'),
    paolo: c('Paolo', MA + '553b4a4acf6155badd25e3cc5b48a5858e6a1a24542abca17055c98c812ce583.png', 'kanto', 'Pokémon Masters EX'),
    // Pokémon: Let's Go
    oak: c('Profesor Oak', LG + 'kanto-region/pallet-town-char-professional-oak.png', 'kanto', "Pokémon: Let's Go"),
    surge: c('Teniente Surge', LG + 'kanto-region/vermillion-city-char-surge.png', 'kanto', "Pokémon: Let's Go"),
    erika: c('Erika', LG + 'kanto-region/celadon-city-char-erika.png', 'kanto', "Pokémon: Let's Go"),
    rival_lg: c('Rival amistoso', LG + 'kanto-region/pallet-town-char-friendly-rival.png', 'kanto', "Pokémon: Let's Go"),
    chico_lg: c('Chico de Kanto', LG + 'story/male-character.png', 'kanto', "Pokémon: Let's Go"),
    chica_lg: c('Chica de Kanto', LG + 'story/female-character.png', 'kanto', "Pokémon: Let's Go"),
    // Pokémon Espada y Escudo
    ...Object.fromEntries([['percy', 'milo'], ['cathy', 'nessa'], ['naboru', 'kabu'], ['judith', 'bea'], ['alistair', 'allister'], ['sally', 'opal'], ['morris', 'gordie'], ['mel', 'melony'], ['nerio', 'piers'], ['roy', 'raihan'], ['lionel', 'leon'], ['paul', 'hop'], ['roxy', 'marnie'], ['berto', 'bede'], ['sonia', 'sonia'], ['rose', 'rose'], ['olivia', 'oleana']]
      .map(([id, file]) => [id, c({ percy: 'Percy', cathy: 'Cathy', naboru: 'Naboru', judith: 'Judith', alistair: 'Alistair', sally: 'Sally', morris: 'Morris', mel: 'Mel', nerio: 'Nerio', roy: 'Roy', lionel: 'Lionel', paul: 'Paul', roxy: 'Roxy', berto: 'Berto', sonia: 'Sonia', rose: 'Presidente Rose', olivia: 'Olivia' }[id], SW + 'articles/people_' + file + '_2x.png', 'galar', 'Pokémon Espada y Escudo')])),
    // Pokémon Escarlata y Púrpura
    ...Object.fromEntries([['araceli', 'katy'], ['brais', 'brassius'], ['enigma', 'iono'], ['fuco', 'kofu'], ['laureano', 'larry'], ['lima', 'ryme'], ['tuli', 'tulip'], ['grusha', 'grusha'], ['mencia', 'nemona'], ['sagita', 'geeta'], ['noa', 'penny'], ['damian', 'arven'], ['anan', 'giacomo'], ['melo', 'mela'], ['henzo', 'atticus'], ['gus', 'ortega'], ['erin', 'eri']]
      .map(([id, file]) => [id, c({ araceli: 'Araceli', brais: 'Brais', enigma: 'e-Nigma', fuco: 'Fuco', laureano: 'Laureano', lima: 'Lima', tuli: 'Tuli', grusha: 'Grusha', mencia: 'Mencía', sagita: 'Ságita', noa: 'Noa', damian: 'Damián', anan: 'Anán', melo: 'Melo', henzo: 'Henzo', gus: 'Gus', erin: 'Erin' }[id], `${SV}character/${file}/character-${file}-2x.png`, 'paldea', 'Pokémon Escarlata y Púrpura')])),
  };
  PK.char = id => PK.CHARS[id] || null;

  // Team Rocket (capturas oficiales de Let's Go) y la enfermera (Chansey).
  PK.ROCKET = { jessie: LG + 'es-es/8_09_kanto_8_01@2x.jpg', james: LG + 'es-es/8_09_kanto_8_02@2x.jpg', meowth: 52 };
})();
