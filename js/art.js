/* Pokemonyx · dibujo: paisajes de las regiones (SVG propio, estilo dibujos animados) e imágenes oficiales */
(function () {
  'use strict';
  const O = '#1f2a44';            // contorno
  let uidN = 0;

  // ---------- Piezas de paisaje ----------
  const sky = (u, a, b) => `<defs><linearGradient id="${u}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="500" fill="url(#${u}k)"/>`;
  const sun = (x, y, r, c = '#ffe066') => `<circle cx="${x}" cy="${y}" r="${r * 1.55}" fill="${c}" opacity=".25"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="#f5b82e" stroke-width="3"/>`;
  const cloud = (x, y, s = 1, c = '#fff') => `<g class="cloud" transform="translate(${x} ${y}) scale(${s})"><path d="M0,30 C-4,14 14,4 28,10 C34,-6 64,-8 72,8 C88,2 104,14 100,30 Z" fill="${c}"/><path d="M6,30 L96,30" stroke="#dcebfa" stroke-width="4" stroke-linecap="round"/></g>`;
  const poly = (pts, fill, stroke = O, w = 3) => `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>`;
  const path = (d, fill, stroke = O, w = 3) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>`;
  const tree = (x, y, s = 1, c = '#4fb84a', d = '#2f8a3a') => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-6" y="-8" width="12" height="30" rx="3" fill="#8a5a36" stroke="${O}" stroke-width="3"/><circle cx="0" cy="-30" r="28" fill="${c}" stroke="${O}" stroke-width="3"/><circle cx="-18" cy="-14" r="16" fill="${c}" stroke="${O}" stroke-width="3"/><circle cx="18" cy="-14" r="16" fill="${c}" stroke="${O}" stroke-width="3"/><path d="M-20,-8 Q0,4 20,-8" fill="none" stroke="${d}" stroke-width="6" stroke-linecap="round" opacity=".55"/><circle cx="-8" cy="-40" r="6" fill="#fff" opacity=".35"/></g>`;
  const pine = (x, y, s = 1, c = '#2f7d5a', snow = false) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-5" y="-6" width="10" height="16" fill="#7a4e2d" stroke="${O}" stroke-width="2.5"/>${[[0, -78, 22], [0, -54, 30], [0, -28, 38]].map(([cx, cy, w]) => `<path d="M${cx},${cy - 28} L${cx + w},${cy + 8} L${cx - w},${cy + 8} Z" fill="${c}" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>${snow ? `<path d="M${cx},${cy - 28} L${cx + w * 0.45},${cy - 12} L${cx},${cy - 16} L${cx - w * 0.45},${cy - 12} Z" fill="#fff"/>` : ''}`).join('')}</g>`;
  const palm = (x, y, s = 1, flip = 1) => `<g transform="translate(${x} ${y}) scale(${s * flip} ${s})"><path d="M0,0 C6,-40 2,-80 18,-120" fill="none" stroke="${O}" stroke-width="15" stroke-linecap="round"/><path d="M0,0 C6,-40 2,-80 18,-120" fill="none" stroke="#a8743f" stroke-width="9" stroke-linecap="round"/>${[[-70, -100], [-40, -150], [40, -150], [72, -96], [8, -168]].map(([ex, ey]) => `<path d="M18,-120 Q${(18 + ex) / 2},${ey - 30} ${ex},${ey} Q${(18 + ex) / 2 + 6},${ey - 8} 18,-120 Z" fill="#3fbf5a" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>`).join('')}<circle cx="14" cy="-114" r="7" fill="#7a4e2d" stroke="${O}" stroke-width="2"/><circle cx="24" cy="-112" r="7" fill="#7a4e2d" stroke="${O}" stroke-width="2"/></g>`;
  const house = (x, y, w = 70, h = 46, wall = '#fff4dc', roof = '#e3350d') => `<g transform="translate(${x} ${y})"><rect x="0" y="${-h}" width="${w}" height="${h}" fill="${wall}" stroke="${O}" stroke-width="3"/><path d="M-10,${-h} L${w / 2},${-h - 34} L${w + 10},${-h} Z" fill="${roof}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/><rect x="${w / 2 - 9}" y="-24" width="18" height="24" fill="#8a5a36" stroke="${O}" stroke-width="2.5"/><rect x="8" y="${-h + 10}" width="16" height="14" fill="#9fd8ff" stroke="${O}" stroke-width="2.5"/><rect x="${w - 24}" y="${-h + 10}" width="16" height="14" fill="#9fd8ff" stroke="${O}" stroke-width="2.5"/></g>`;
  const building = (x, w, h, c, lit = '#ffe28a', base = 380) => {
    let win = '';
    for (let yy = base - h + 14; yy < base - 12; yy += 22) for (let xx = x + 10; xx < x + w - 12; xx += 18) win += `<rect x="${xx}" y="${yy}" width="9" height="12" fill="${(xx * 7 + yy * 3) % 5 < 3 ? lit : '#3b3f7a'}"/>`;
    return `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="${c}" stroke="${O}" stroke-width="3"/>${win}`;
  };
  const flowers = (pts, colors = ['#ff5d8f', '#ffd23f', '#fff']) => pts.map(([x, y], i) => `<g transform="translate(${x} ${y})"><circle r="5" fill="${colors[i % colors.length]}" stroke="${O}" stroke-width="1.5"/><circle r="2" fill="#ffb000"/></g>`).join('');
  const waves = (y, n = 7, c = '#fff') => Array.from({ length: n }, (_, i) => `<path d="M${40 + i * 110},${y + (i % 2) * 22} q12,-8 24,0 q12,8 24,0" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`).join('');
  const fall = (cls, items) => items.map(([x, d, ch, size]) => `<text class="${cls}" x="${x}" y="-20" font-size="${size || 18}">${ch}<animate attributeName="y" from="-20" to="520" dur="${d}s" repeatCount="indefinite"/></text>`).join('');

  // ---------- Paisajes por región ----------
  const SCENES = {
    kanto: u => sky(u, '#5cb8ff', '#d2f0ff') + sun(680, 86, 40) + cloud(90, 60, 1) + cloud(380, 40, .8) + cloud(560, 130, .6) +
      poly('0,300 90,214 170,280 260,190 360,292 450,214 540,282 640,200 740,270 800,236 800,330 0,330', '#94b6ea', '#3b5a8a') +
      path('M0,330 Q200,268 400,318 T800,300 L800,500 L0,500 Z', '#86d672') +
      house(130, 332, 74, 44, '#fff4dc', '#e3350d') + house(250, 326, 64, 40, '#fff4dc', '#2a75bb') + house(560, 318, 70, 42, '#fff4dc', '#ffcb05') +
      tree(60, 344, .9) + tree(700, 330, .8) + tree(470, 322, .7) +
      path('M0,402 Q250,352 520,396 T800,382 L800,500 L0,500 Z', '#5cbf4a') +
      `<path d="M330,500 Q380,446 450,420 T600,380" fill="none" stroke="${O}" stroke-width="44" stroke-linecap="round"/><path d="M330,500 Q380,446 450,420 T600,380" fill="none" stroke="#f4dba6" stroke-width="38" stroke-linecap="round"/>` +
      tree(40, 470, 1.1) + tree(760, 462, 1.05) + flowers([[160, 452], [190, 470], [620, 455], [660, 476], [240, 488], [700, 492]]),

    johto: u => sky(u, '#ff8f5a', '#ffe1a6') + sun(620, 196, 56, '#ffb347') + cloud(80, 70, .9, '#ffe9d6') + cloud(430, 50, .7, '#ffe9d6') +
      poly('0,310 120,220 230,300 330,214 460,306 560,236 680,300 800,226 800,340 0,340', '#b07bc7', '#5d3b73') +
      path('M0,340 Q200,300 420,330 T800,320 L800,500 L0,500 Z', '#d7a35d') +
      // pagoda (torre de campanas)
      `<g transform="translate(430 330)">${[0, 1, 2, 3].map(i => { const w = 92 - i * 16, y = -i * 46; return `<rect x="${-w / 2 + 8}" y="${y - 40}" width="${w - 16}" height="40" fill="#c0392b" stroke="${O}" stroke-width="3"/><path d="M${-w / 2 - 14},${y - 40} Q0,${y - 58} ${w / 2 + 14},${y - 40} L${w / 2 - 4},${y - 50} Q0,${y - 64} ${-w / 2 + 4},${y - 50} Z" fill="#3a2a3a" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>`; }).join('')}<rect x="-3" y="-236" width="6" height="40" fill="#ffcb05" stroke="${O}" stroke-width="2"/></g>` +
      tree(90, 360, 1, '#ff7a3a', '#c4541f') + tree(200, 372, .8, '#ffc23a', '#d48a16') + tree(640, 366, 1, '#e5533d', '#a8331f') + tree(740, 380, .85, '#ff9b3a', '#c4641f') +
      path('M0,420 Q300,380 560,418 T800,410 L800,500 L0,500 Z', '#c98d48') +
      `<path d="M260,500 L380,420 L470,420 L560,500 Z" fill="#e9c98d" stroke="${O}" stroke-width="3"/>` +
      tree(30, 486, 1.15, '#ff6a2e', '#b8481c') + tree(770, 480, 1.1, '#ffb52e', '#c47f12') +
      fall('leaf', [[120, 9, '🍁', 20], [340, 12, '🍂', 18], [560, 10, '🍁', 16], [700, 14, '🍂', 20]]),

    hoenn: u => sky(u, '#3fbfff', '#c4efff') + sun(110, 80, 38) + cloud(300, 50, .9) + cloud(610, 90, .7) +
      // volcán humeante
      `<g transform="translate(560 300)"><path d="M-170,30 L-50,-150 L40,-150 L170,30 Z" fill="#9c6b4e" stroke="${O}" stroke-width="3" stroke-linejoin="round"/><path d="M-50,-150 L-30,-120 L-10,-140 L10,-118 L40,-150 Z" fill="#ff6a2e" stroke="${O}" stroke-width="3"/>${[[0, -180, 26], [-20, -214, 20], [14, -244, 16]].map(([x, y, r]) => `<circle class="smoke" cx="${x}" cy="${y}" r="${r}" fill="#d8d0cc" opacity=".85"/>`).join('')}</g>` +
      `<rect x="0" y="322" width="800" height="180" fill="#1f8fd8"/><rect x="0" y="322" width="800" height="12" fill="#5fc4f5"/>` + waves(360, 8) + waves(410, 8) +
      path('M-20,360 Q60,300 200,330 Q250,350 260,380 L-20,400 Z', '#f5dfa0') + palm(60, 352, .75) + palm(170, 350, .6, -1) +
      path('M0,450 Q260,420 520,446 T800,440 L800,500 L0,500 Z', '#f8e2a6') +
      flowers([[500, 470], [540, 482], [80, 476]], ['#ff7aa8', '#fff']) + palm(760, 470, .95, -1),

    sinnoh: u => sky(u, '#8fcaff', '#effaff') + cloud(80, 60, .8) + cloud(600, 50, .9) +
      poly('120,330 400,96 680,330', '#8aa4c8', '#3b5a8a') + path('M400,96 L470,156 L440,150 L420,170 L398,152 L372,172 L350,150 L328,156 Z', '#fff', '#3b5a8a') +
      poly('-40,330 150,170 330,330', '#a8bedf', '#3b5a8a') + path('M150,170 L196,210 L170,206 L150,222 L128,206 L104,210 Z', '#fff', '#3b5a8a') +
      poly('470,330 660,180 860,330', '#a8bedf', '#3b5a8a') + path('M660,180 L704,216 L680,212 L660,228 L640,212 L616,216 Z', '#fff', '#3b5a8a') +
      path('M0,330 Q200,300 400,326 T800,318 L800,500 L0,500 Z', '#f2f7ff') +
      `<ellipse cx="560" cy="400" rx="160" ry="30" fill="#9fdcff" stroke="${O}" stroke-width="3"/><path d="M450,396 q20,-6 40,0 M560,404 q20,-6 40,0" stroke="#fff" stroke-width="3" fill="none"/>` +
      pine(60, 380, .9, '#2f7d5a', true) + pine(140, 396, .7, '#2f7d5a', true) + pine(300, 392, .8, '#28684b', true) + pine(740, 386, .85, '#2f7d5a', true) +
      path('M0,440 Q300,420 520,444 T800,436 L800,500 L0,500 Z', '#ffffff') +
      pine(30, 490, 1.1, '#28684b', true) + pine(780, 494, 1.05, '#28684b', true) +
      fall('snow', [[80, 10, '❄', 14], [220, 13, '❄', 10], [400, 11, '❄', 16], [520, 15, '❄', 11], [680, 12, '❄', 14], [760, 9, '❄', 10]]),

    teselia: u => sky(u, '#3a2d7a', '#ff9b6a') + `<circle cx="640" cy="230" r="46" fill="#ffd27a" opacity=".9"/>` + cloud(100, 70, .8, '#c7a3d8') + cloud(470, 50, .6, '#c7a3d8') +
      building(10, 70, 150, '#5b5f97') + building(90, 60, 210, '#6c6fb0') + building(160, 80, 170, '#4e5288') + building(250, 56, 250, '#7477bd') +
      `<rect x="370" y="80" width="64" height="300" fill="#8a8ed0" stroke="${O}" stroke-width="3"/><path d="M370,80 L402,30 L434,80 Z" fill="#b9bdf0" stroke="${O}" stroke-width="3"/><rect x="398" y="0" width="8" height="34" fill="#c8ccf7" stroke="${O}" stroke-width="2"/>` +
      building(450, 70, 190, '#5b5f97') + building(530, 90, 230, '#6c6fb0') + building(630, 70, 160, '#4e5288') + building(710, 90, 200, '#7477bd') +
      `<rect x="0" y="380" width="800" height="120" fill="#2c5c9e"/>` + waves(420, 8, '#9fc5ff') +
      // puente colgante
      `<g><rect x="150" y="250" width="22" height="160" fill="#c0392b" stroke="${O}" stroke-width="3"/><rect x="628" y="250" width="22" height="160" fill="#c0392b" stroke="${O}" stroke-width="3"/><path d="M-20,380 Q60,390 161,252 Q400,380 639,252 Q740,390 820,380" fill="none" stroke="${O}" stroke-width="5"/><path d="M-20,380 Q60,390 161,252 Q400,380 639,252 Q740,390 820,380" fill="none" stroke="#e0e4ff" stroke-width="2.5"/>${Array.from({ length: 19 }, (_, i) => { const x = 180 + i * 24; const t = (x - 161) / 478; const y = 252 + 4 * 128 * t * (1 - t); return `<line x1="${x}" y1="${y}" x2="${x}" y2="392" stroke="#e0e4ff" stroke-width="2"/>`; }).join('')}<rect x="-20" y="390" width="840" height="16" fill="#8a8ed0" stroke="${O}" stroke-width="3"/></g>` +
      path('M0,470 L800,470 L800,500 L0,500 Z', '#3d3f6b'),

    kalos: u => sky(u, '#ffc9e3', '#d4ecff') + cloud(90, 70, .8) + cloud(560, 50, .9) +
      // torre de celosía inspirada en París
      `<g transform="translate(400 380)"><path d="M-110,0 Q-60,-90 -26,-210 L-12,-330 L12,-330 L26,-210 Q60,-90 110,0 L70,0 Q30,-70 0,-80 Q-30,-70 -70,0 Z" fill="#8a7f9e" stroke="${O}" stroke-width="3" stroke-linejoin="round"/><rect x="-46" y="-120" width="92" height="12" fill="#6d6382" stroke="${O}" stroke-width="2.5"/><rect x="-30" y="-224" width="60" height="10" fill="#6d6382" stroke="${O}" stroke-width="2.5"/>${[-1, 1].map(s => `<path d="M${s * 20},-200 L${s * 60},-120 M${s * 12},-300 L${s * 24},-220 M${s * 50},-108 L${s * 90},-20" stroke="${O}" stroke-width="1.5" opacity=".5"/>`).join('')}<path d="M-4,-330 L0,-370 L4,-330 Z" fill="${O}"/></g>` +
      // castillo
      `<g transform="translate(110 350)"><rect x="-60" y="-70" width="120" height="70" fill="#f3e6d0" stroke="${O}" stroke-width="3"/>${[-60, 60].map(x => `<rect x="${x - 16}" y="-110" width="32" height="110" fill="#efdcc0" stroke="${O}" stroke-width="3"/><path d="M${x - 22},-110 L${x},-150 L${x + 22},-110 Z" fill="#4a6fb5" stroke="${O}" stroke-width="3"/>`).join('')}<rect x="-12" y="-30" width="24" height="30" fill="#8a5a36" stroke="${O}" stroke-width="2.5"/></g>` +
      path('M0,360 Q220,330 420,356 T800,350 L800,500 L0,500 Z', '#8fd47a') +
      tree(640, 372, .85, '#5fbf6a') + tree(720, 380, .75, '#5fbf6a') + tree(250, 380, .7, '#5fbf6a') +
      `<path d="M0,430 L800,430 L800,500 L0,500 Z" fill="#6ec05e" stroke="${O}" stroke-width="3"/><path d="M40,452 Q200,436 360,452 M440,452 Q600,436 760,452" stroke="#4f9a44" stroke-width="16" fill="none" stroke-linecap="round"/>` +
      flowers([[60, 470], [100, 482], [150, 468], [220, 486], [290, 470], [520, 476], [580, 488], [640, 470], [700, 484], [750, 468]], ['#ff6fa3', '#ffd23f', '#b48cff', '#fff']),

    alola: u => sky(u, '#1fc0ff', '#c2f6ff') + sun(650, 80, 44) + cloud(90, 70, .8) + cloud(380, 40, .7) +
      `<g transform="translate(560 316)"><path d="M-150,10 L-60,-110 L30,-110 L130,10 Z" fill="#6c9a4a" stroke="${O}" stroke-width="3" stroke-linejoin="round"/><path d="M-60,-110 L-40,-86 L-20,-104 L0,-84 L30,-110 Z" fill="#ff7a2e" stroke="${O}" stroke-width="3"/></g>` +
      `<rect x="0" y="320" width="800" height="180" fill="#20c4c6"/><rect x="0" y="320" width="800" height="14" fill="#8ff0e6"/>` + waves(352, 8) + waves(396, 8) +
      path('M0,430 Q240,400 480,428 T800,420 L800,500 L0,500 Z', '#ffe2a8') +
      palm(90, 440, 1) + palm(200, 452, .75, -1) + palm(720, 444, .95, -1) +
      flowers([[300, 470], [330, 482], [600, 474], [630, 486]], ['#ff4f7a', '#ffb3c9']) +
      `<g transform="translate(470 470) rotate(-14)"><ellipse rx="44" ry="11" fill="#ff8a1f" stroke="${O}" stroke-width="3"/><path d="M-40,0 L40,0" stroke="#fff" stroke-width="3"/></g>`,

    galar: u => sky(u, '#9cc3e6', '#eef5fb') + cloud(40, 50, 1.2, '#f7fbff') + cloud(330, 30, 1, '#f7fbff') + cloud(600, 70, 1.1, '#f7fbff') +
      path('M0,320 Q160,250 340,300 T800,280 L800,500 L0,500 Z', '#8cc965') +
      // castillo en la colina
      `<g transform="translate(120 300)"><rect x="-44" y="-56" width="88" height="56" fill="#cfc9bd" stroke="${O}" stroke-width="3"/>${[-44, 44].map(x => `<rect x="${x - 14}" y="-86" width="28" height="86" fill="#c2bbae" stroke="${O}" stroke-width="3"/><path d="M${x - 14},-86 h8 v-8 h6 v8 h6 v-8 h6 v8 h2" fill="none" stroke="${O}" stroke-width="3"/>`).join('')}</g>` +
      // estadio
      `<g transform="translate(460 360)"><ellipse cx="0" cy="0" rx="190" ry="60" fill="#e6e9f2" stroke="${O}" stroke-width="3"/><path d="M-190,0 L-190,-50 Q0,-110 190,-50 L190,0" fill="#d23c3c" stroke="${O}" stroke-width="3"/><path d="M-170,-46 Q0,-96 170,-46" fill="none" stroke="#fff" stroke-width="4"/><ellipse cx="0" cy="-48" rx="150" ry="34" fill="#6fbf55" stroke="${O}" stroke-width="3"/>${[-150, -60, 60, 150].map(x => `<rect x="${x - 3}" y="-150" width="6" height="90" fill="#8a8fa3" stroke="${O}" stroke-width="2"/><rect x="${x - 16}" y="-162" width="32" height="16" fill="#fff6b0" stroke="${O}" stroke-width="2.5"/>`).join('')}</g>` +
      path('M0,420 Q280,380 520,418 T800,408 L800,500 L0,500 Z', '#6db54b') +
      `<path d="M0,450 Q200,430 380,452 M420,446 Q620,426 800,448" stroke="#9a9a9a" stroke-width="6" fill="none" stroke-dasharray="14 6"/>` +
      ['#fff', '#fff', '#fff'].map((c, i) => `<g transform="translate(${180 + i * 70} ${470 - i * 8})"><ellipse rx="16" ry="11" fill="${c}" stroke="${O}" stroke-width="2.5"/><circle cx="-14" cy="-2" r="6" fill="#4a4a4a"/></g>`).join(''),

    // Gimnasio: grada, focos y campo de combate con el color del tipo del líder.
    gimnasio: (u, o = {}) => {
      const tc = (PK.TYPES[o.type] || PK.TYPES.normal).c;
      let crowd = '';
      for (let r = 0; r < 4; r++) for (let i = 0; i < 26; i++) crowd += `<circle cx="${10 + i * 31 + (r % 2) * 15}" cy="${120 + r * 26}" r="9" fill="${['#ff6b6b', '#ffd93d', '#6bcBff', '#c792ea', '#ffffff', '#7bd389'][(i * 7 + r * 3) % 6]}" opacity=".85"/>`;
      return sky(u, '#1e2340', '#3a4170') +
        `${[120, 400, 680].map(x => `<path d="M${x},0 L${x - 140},330 L${x + 140},330 Z" fill="#fff8c8" opacity=".08"/><circle cx="${x}" cy="20" r="16" fill="#fff8c8" stroke="${O}" stroke-width="3"/>`).join('')}` +
        `<rect x="0" y="100" width="800" height="120" fill="#2b3157"/>${crowd}<rect x="0" y="212" width="800" height="16" fill="${tc}" stroke="${O}" stroke-width="3"/>` +
        `<path d="M0,228 L800,228 L800,500 L0,500 Z" fill="#53596f"/>` +
        `<polygon points="70,500 730,500 640,270 160,270" fill="${tc}" stroke="${O}" stroke-width="4"/><polygon points="70,500 730,500 640,270 160,270" fill="#ffffff" opacity=".22"/>` +
        `<polygon points="110,486 690,486 616,284 184,284" fill="none" stroke="#fff" stroke-width="5"/><line x1="400" y1="284" x2="400" y2="486" stroke="#fff" stroke-width="5"/><ellipse cx="400" cy="372" rx="70" ry="34" fill="none" stroke="#fff" stroke-width="5"/>` +
        `<g transform="translate(400 372)"><circle r="20" fill="#fff" stroke="${O}" stroke-width="3"/><text y="7" text-anchor="middle" font-size="20">${(PK.TYPES[o.type] || PK.TYPES.normal).e}</text></g>`;
    },

    // Guarida del Team Rocket: de noche, con focos.
    rocket: u => sky(u, '#150f33', '#4b2a6e') +
      Array.from({ length: 26 }, (_, i) => `<circle cx="${(i * 97) % 800}" cy="${(i * 53) % 220}" r="${1 + (i % 3)}" fill="#fff" opacity="${0.4 + (i % 4) * 0.15}"/>`).join('') +
      `<circle cx="660" cy="86" r="40" fill="#fff6d0" stroke="#d6c58a" stroke-width="3"/><circle cx="648" cy="76" r="7" fill="#e8dcae"/><circle cx="672" cy="98" r="5" fill="#e8dcae"/>` +
      `<path d="M140,500 L330,60 L380,60 L220,500 Z" fill="#fff6a0" opacity=".13"/><path d="M600,500 L470,40 L520,40 L690,500 Z" fill="#fff6a0" opacity=".13"/>` +
      `<g fill="#2b2142" stroke="#0e0a1f" stroke-width="3"><path d="M0,330 L0,250 L120,210 L240,250 L240,330 Z"/><path d="M520,330 L520,240 L660,200 L800,240 L800,330 Z"/></g>` +
      `<rect x="0" y="330" width="800" height="170" fill="#2e2440"/>` +
      [[90, 380], [140, 400], [620, 390], [690, 410]].map(([x, y]) => `<rect x="${x}" y="${y}" width="56" height="44" fill="#6b4a2a" stroke="#0e0a1f" stroke-width="3"/><path d="M${x},${y} L${x + 56},${y + 44} M${x + 56},${y} L${x},${y + 44}" stroke="#3d2a18" stroke-width="3"/>`).join(''),
  };

  function scene(id, opts = {}) {
    const u = 'pk' + (++uidN);
    const f = SCENES[id] || SCENES.kanto;
    return `<svg class="scene-svg" viewBox="0 0 800 500" preserveAspectRatio="${opts.fit || 'xMidYMax slice'}" aria-hidden="true">${f(u, opts)}</svg>`;
  }

  // ---------- Imágenes oficiales ----------
  const name = id => PK.esc(PK.DEX[id] ? PK.DEX[id].n : '');
  // Los Pokémon del escenario, del equipo y del combate se cargan ya (no en diferido): se ven nada más entrar.
  const mon = (id, cls = '', extra = '') => `<img class="mon-img ${cls}" src="${PK.URL.art(id)}" alt="${name(id)}" draggable="false" loading="${/b-art|stage-art|tm-art|catch-mon/.test(cls) ? 'eager' : 'lazy'}" ${extra}>`;
  const anim = (id, back = false, cls = '') => `<img class="mon-anim ${cls}" src="${back ? PK.URL.back(id) : PK.URL.front(id)}" alt="${name(id)}" draggable="false" onerror="this.onerror=null;this.src='${PK.URL.art(id)}';this.classList.add('as-art')">`;
  // Entrenadores: dibujo oficial (Pokémon Masters EX y webs de los juegos).
  const trainer = (id, cls = '') => {
    const ch = PK.CHARS && PK.CHARS[id];
    if (!ch) return `<span class="trainer-art none ${cls}" aria-hidden="true">🧢</span>`;
    return `<img class="trainer-art ${cls}" src="${ch.src}" alt="${PK.esc(ch.n)}" draggable="false" referrerpolicy="no-referrer">`;
  };

  // Fondo con imagen oficial, clima del día y luz de la hora. Si no carga, queda el dibujo de la región.
  const photo = (fondo, opts = {}) => {
    const h = PK.date().getHours();
    // Un escenario ya pintado de noche no se oscurece otra vez
    const night = fondo.hora === 'noche' ? false : (opts.night ?? (h >= 20 || h < 7));
    const fb = SCENES[fondo.region] ? fondo.region : 'kanto';
    return `<div class="photo-scene w-${opts.weather || 'sol'} ${night ? 'is-night' : ''}" style="--y:${fondo.y ?? 40}%;--z:${fondo.z || 1}">
        <div class="ps-fallback">${scene(fb)}</div>
        <img class="ps-img" src="${fondo.src}" alt="" draggable="false" referrerpolicy="no-referrer" onerror="this.remove()">
        ${opts.capa && fondo.capa ? `<svg class="ps-mid" data-mid viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg>
        <div class="ps-capa" aria-hidden="true" style="background-image:url('${fondo.src}');-webkit-mask-image:url('${fondo.capa}');mask-image:url('${fondo.capa}')"></div>` : ''}
        <div class="ps-weather" aria-hidden="true">${weatherFx(opts.weather)}</div>
        <div class="ps-light" aria-hidden="true"></div>
      </div>`;
  };
  const weatherFx = w => {
    if (w === 'lluvia') return Array.from({ length: 40 }, (_, i) => `<i class="drop" style="left:${(i * 37) % 100}%;animation-delay:${(i * 0.13) % 1.2}s;animation-duration:${0.6 + (i % 5) * 0.08}s"></i>`).join('');
    if (w === 'nieve') return Array.from({ length: 34 }, (_, i) => `<i class="flake" style="left:${(i * 29) % 100}%;animation-delay:${(i * 0.37) % 6}s;animation-duration:${6 + (i % 5)}s">❄</i>`).join('');
    return '';
  };

  // Escondites del escenario (dibujo propio, contorno marcado).
  const SPOTS = {
    hierba: `<path d="M8,90 L18,40 L26,88 L34,30 L42,88 L50,22 L58,88 L66,30 L74,88 L82,40 L92,90 Z" fill="#4fbf52" stroke="${O}" stroke-width="5" stroke-linejoin="round"/><path d="M14,90 L50,60 L86,90 Z" fill="#3a9c43"/>`,
    arbusto: `<circle cx="32" cy="62" r="26" fill="#3f9e4a" stroke="${O}" stroke-width="5"/><circle cx="68" cy="62" r="26" fill="#3f9e4a" stroke="${O}" stroke-width="5"/><circle cx="50" cy="44" r="30" fill="#4cb557" stroke="${O}" stroke-width="5"/><path d="M14,86 L86,86" stroke="${O}" stroke-width="5" stroke-linecap="round"/><circle cx="40" cy="36" r="7" fill="#fff" opacity=".35"/>`,
    roca: `<path d="M10,88 L22,48 L46,30 L72,38 L90,70 L86,88 Z" fill="#a7a3b3" stroke="${O}" stroke-width="5" stroke-linejoin="round"/><path d="M46,30 L52,58 L22,48 M52,58 L90,70" fill="none" stroke="${O}" stroke-width="3" opacity=".5"/><path d="M30,46 L44,36" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".5"/>`,
    flores: `<path d="M12,88 Q50,58 88,88 Z" fill="#4fbf52" stroke="${O}" stroke-width="5"/>${[[28, 62, '#ff6fa3'], [50, 50, '#ffd23f'], [72, 62, '#b48cff'], [40, 72, '#fff'], [62, 72, '#ff8a1f']].map(([x, y, col]) => `<g transform="translate(${x} ${y})"><circle r="9" fill="${col}" stroke="${O}" stroke-width="3"/><circle r="3.5" fill="#ffb000"/></g>`).join('')}`,
    caja: `<rect x="16" y="34" width="68" height="54" rx="4" fill="#c98a4b" stroke="${O}" stroke-width="5"/><path d="M16,52 L84,52 M50,34 L50,88" stroke="${O}" stroke-width="4"/><path d="M22,40 L44,40" stroke="#fff" stroke-width="4" opacity=".4" stroke-linecap="round"/>`,
    maceta: `<path d="M26,58 L74,58 L68,90 L32,90 Z" fill="#d1643c" stroke="${O}" stroke-width="5" stroke-linejoin="round"/><circle cx="50" cy="38" r="24" fill="#4cb557" stroke="${O}" stroke-width="5"/><circle cx="34" cy="50" r="14" fill="#3f9e4a" stroke="${O}" stroke-width="5"/><circle cx="66" cy="50" r="14" fill="#3f9e4a" stroke="${O}" stroke-width="5"/>`,
    nieve: `<path d="M8,88 Q20,46 48,40 Q80,36 92,88 Z" fill="#f4f9ff" stroke="${O}" stroke-width="5"/><path d="M30,58 Q48,50 66,56" stroke="#bcd7f5" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    arena: `<path d="M6,88 Q30,40 54,52 Q78,40 94,88 Z" fill="#f0d08c" stroke="${O}" stroke-width="5"/><path d="M30,70 q8,-5 16,0 M56,66 q8,-5 16,0" stroke="#c9a35d" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  };
  const spot = kind => `<svg class="spot-svg" viewBox="0 0 100 100" aria-hidden="true">${SPOTS[kind] || SPOTS.arbusto}</svg>`;
  const item = (id, cls = '') => `<img class="item-img ${cls}" src="${PK.URL.item(id)}" alt="${PK.esc(PK.itemName(id))}" draggable="false" loading="lazy">`;
  const type = t => `<span class="tbadge" style="--tc:${(PK.TYPES[t] || PK.TYPES.normal).c}">${(PK.TYPES[t] || PK.TYPES.normal).e} ${PK.esc(PK.typeName(t))}</span>`;
  const types = id => `<span class="tbadges">${(PK.DEX[id] ? PK.DEX[id].t : []).map(type).join('')}</span>`;
  // Medalla: la oficial si existe; si no, una dibujada con el color del tipo.
  const medal = (leaderId, cls = '') => {
    const l = PK.LEADERS[leaderId]; if (!l) return '';
    if (l.badge) return `<img class="medal-img ${cls}" src="${PK.URL.badge(l.badge)}" alt="${PK.esc(l.medal)}" draggable="false">`;
    const t = PK.TYPES[l.type] || PK.TYPES.normal;
    return `<span class="medal-draw ${cls}" style="--tc:${t.c}" aria-label="${PK.esc(l.medal)}">${t.e}</span>`;
  };
  const bar = (v, max, cls = '') => {
    const pct = max ? PK.clamp(v / max * 100, 0, 100) : 0;
    const col = cls.includes('hp') ? (pct > 50 ? 'ok' : pct > 20 ? 'mid' : 'low') : '';
    return `<div class="bar ${cls} ${col}"><i style="width:${pct}%"></i></div>`;
  };

  PK.art = { scene, photo, spot, mon, anim, trainer, item, type, types, medal, bar };
})();
