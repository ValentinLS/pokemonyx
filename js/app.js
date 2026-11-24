/* Pokemonyx · arranque */
(async function () {
  'use strict';
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loading"><div class="ld-ball"></div><p>Cargando Pokemonyx…</p></div>';
  await PK.store.load();
  // El primer toque desbloquea el audio (los navegadores no dejan sonar antes).
  const unlock = () => { PK.sound.unlock(); document.removeEventListener('pointerdown', unlock); };
  document.addEventListener('pointerdown', unlock);
  // Al volver a la pestaña: trae cambios del otro dispositivo y, si ha cambiado el día, vuelve a la portada.
  let lastDay = PK.dayKey();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (PK.dayKey() !== lastDay) { lastDay = PK.dayKey(); PK.kid.home(); return; }
    PK.store.sync(false);
  });
  // Cambios hechos en otro dispositivo (la tablet o el PC): se repinta la pantalla.
  PK.store.onChange(({ conflict }) => {
    if (conflict) PK.ui.toast('🔄 Se han cargado los cambios hechos en el otro dispositivo', 'warn');
    if (PK.parent.visible()) PK.parent.panel(); else PK.kid.refresh();
  });
  PK.kid.home();
})();
