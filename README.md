# Pokemonyx

Juego familiar para gamificar las tareas de casa con Pokémon. Cada niño elige su entrenador y su primer Pokémon. Con las tareas validadas por papá y mamá consigue **energía ⚡**, que gasta en entrenar, curar, cuidar y comprar para sus Pokémon. Sus Pokémon suben de nivel y evolucionan. Cada fin de semana hay **campeonato** contra un líder de gimnasio y, entre semana, aparece el **Team Rocket** con retos.

> **Uso privado en casa, publicado en GitHub Pages.** Pokémon y sus personajes son de Nintendo, Game Freak, Creatures y The Pokémon Company. La partida de cada niño no se sube: cada dispositivo guarda la suya en su navegador. Publicación decidida por Valen el 24/11/2026.

## Cómo se juega

1. **En el PC:** doble clic en `Pokemonyx.bat`. Se abre el juego en el navegador. Deja la ventana negra abierta mientras jugáis.
2. **La primera vez**, Windows preguntará si Python puede usar la red. Hay que permitirlo **solo en redes privadas**: es lo que deja entrar a la tablet.
3. **En la tablet**, conectada a la misma wifi, abre la dirección que aparece en la ventana negra (`http://192.168.…:8791/`). Conviene añadirla a la pantalla de inicio. También sale en *Papá y mamá → Ajustes*.
4. **Papá y mamá:** botón «Papá y mamá». Allí se crea la clave, se añade a cada niño con su dificultad y se ponen sus tareas.

La partida se guarda **en el PC**, en `datos/estado.json`, así que el PC y la tablet ven lo mismo. Cada día se hace una copia en `datos/copias/` y se guardan las 30 últimas.

Necesita internet: las imágenes, los gritos y la letra se cargan de PokeAPI, Pokémon Showdown y Google Fonts.

## Reglas

| Parte | Cómo funciona |
|---|---|
| Energía ⚡ | La dan las tareas al validarlas, los premios, las rachas, el cumpleaños, el campeonato y el Team Rocket. |
| Gastos | Entrenar ⚡5 · Centro Pokémon ⚡5 · cepillar ⚡1 · jugar ⚡2 · pociones ⚡4-14 · bayas ⚡2-4 · Caramelo Raro ⚡60 (uno al día) · piedras evolutivas ⚡80 · objetos de combate, uno de cada en la mochila. Los mimos son gratis (5 al día). |
| Niveles | Se gana experiencia en los combates, en las misiones del Team Rocket y con los premios en puntos de nivel. |
| Evolución | Como en los juegos: al nivel oficial, con piedra o con mucha amistad. Si hay varias opciones (Eevee), el niño elige. Las evoluciones por intercambio se hacen al nivel 40. |
| Escenario del día | Un escenario pintado (estilo vectorial de videojuego) de la región del gimnasio de la semana, distinto cada día del ciclo de 52 semanas (364): valles, bosques, cerezos, islas flotantes, hielo, lava, costa, cañón, aurora, setas gigantes… con su luz y su clima. Los **escondites** son elementos del propio dibujo (arbustos, árboles, hierba alta, rocas, nubes, agua, la hoguera, la tienda…), sin pegatinas: el juego elige cada día hasta 6 que se vean bien en esa pantalla y no tape el entrenador, los marca con destellos y, al tocarlos, el Pokémon se asoma desde detrás (en el agua, la lava o los cráteres sale por delante) o aparece un objeto. Los Pokémon pegan con el sitio (agua en el agua, voladores en las nubes, fuego en la hoguera…). Funciona con una **capa**: el pintor guarda aparte la silueta de esos elementos (`ID-capa.svg`) y el juego pone encima el mismo dibujo recortado con ella, así lo escondido queda detrás. Además hay **3 rarezas** asomando por detrás de los elementos del dibujo o medio hundidas en el agua o la hierba (cosas que no encajan: un patito, una Poké Ball, una medalla…); solo cuentan las que se ven en esa pantalla. Cada rareza da un objeto (las Poké Balls, Super Balls y Ultra Balls se las quedan), hay una pista al día y encontrar las tres da el logro Detective. Se pintan con `python -I herramientas/pintor.py img/escenarios/dias --dias`, que también escribe `js/dias.js`. Si falta, se usan los fondos oficiales de `js/fondos.js`. |
| Límites | Premios de papá y mamá: hasta 50 ⚡ y 200 EXP por niño y día. Así la energía sale sobre todo de las tareas. |
| Cofre semanal | Con el 80 % de las tareas de la semana aprobadas, el lunes hay un cofre: +20 ⚡, 5 Poké Balls, una Baya Zidra y a veces un Caramelo Raro. |
| Campeonato | Para entrar hacen falta 4 días con tareas validadas esa semana (se cambia en Ajustes). 52 gimnasios, uno por semana del año, todos con el dibujo oficial de su líder. Son 3 combates (2 aspirantes y el líder) en el estadio: cada ronda da ⚡10 y quien gana recibe la medalla, ⚡60, un Caramelo Raro y elige un Pokémon nuevo. El nivel de los rivales sube con las medallas (10 + 4 por medalla), pero se queda entre 6 niveles por debajo y 3 por encima del equipo: entrenar ayuda a ganar. Se ajusta en `PK.CHAMP_LEVEL` de `js/data.js`. |
| Metas | En la tienda, pestaña ⭐ Metas: el **huevo misterioso** (⚡300, sale un Pokémon raro que no tengan) y los **premios de casa** que ponen papá y mamá en «Premios» (15 min de tablet, elegir la peli…). Al canjear uno se descuenta la energía y aparece en el panel para darlo («Dado») o anularlo («Devolver ⚡»). |
| Combates | Cada Pokémon ataca una vez por turno: primero el tuyo y después el del rival. Se ven los ataques del rival con el daño aproximado, y se puede cambiar de Pokémon tocando la barra del equipo. |
| Team Rocket | Aparece un día al azar de lunes a viernes, desde las 15:00, con 3 retos: cálculo, memoria, lógica, rompecabezas, «¿Quién es ese Pokémon?», letras y tipos. Superar 2 da ⚡30 y experiencia. Si no, se llevan un Pokémon (nunca el activo ni el último que ha llegado), que se puede rescatar con otro reto desde el día siguiente. Si no hay otro, se llevan ⚡15. |
| Dificultad | Fácil (7-8 años), Normal (9-10) o Difícil (11+), para cada niño. Cambia el nivel de los rivales y los retos. |
| Descanso | Por la noche los Pokémon se curan. La amistad baja un poco cada día sin cuidarlos. |

Para probarlo en otra fecha, añade `?hoy=2026-12-05&hora=18` a la dirección. Si se olvida la clave, abre el juego con `?nuevaclave`.

## Archivos

| Archivo | Contenido |
|---|---|
| `Pokemonyx.bat` | Arranca el servidor de casa y abre el juego. |
| `servidor.py` | Servidor de casa: sirve el juego en la wifi y guarda la partida (`--local` para usarlo solo en el PC). |
| `js/pokedex.js` | 348 Pokémon con datos oficiales de PokeAPI: nombres, tipos, estadísticas y evoluciones, más 90 ataques. No se edita a mano: se rehace con `python herramientas/gen_pokedex.py CARPETA_CACHE js/pokedex.js` (para añadir Pokémon, se cambian sus listas). |
| `js/fondos.js` | Fondos, estadios y dibujos oficiales de los personajes (se cargan de las webs oficiales de los juegos y de Pokémon Masters EX). |
| `img/` | Imágenes de ejemplo que pasó Valen (estadio, Calle Victoria, Isla de la Armadura…). |
| `js/data.js` | Regiones, líderes, entrenadores, tienda, premios y logros. **Aquí se cambian los precios y los premios.** |
| `js/store.js` | Reglas y guardado compartido. |
| `js/battle.js` | Combates por turnos con la tabla oficial de tipos. |
| `js/missions.js` | Retos del Team Rocket. |
| `js/kid.js` · `js/parent.js` | Pantallas de los niños y panel de papá y mamá. |
| `js/art.js` | Paisajes de las regiones (dibujos propios) e imágenes oficiales. |
| `css/v2.css` | Estilo de la versión 2 (escenario interactivo, captura y combate). |
| `js/core.js` · `css/` | Base heredada de Planetitos: sonido, efectos, ventanas y estilo. |
