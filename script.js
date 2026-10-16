/* =========================================================
   script.js
   1. Referencias a elementos y configuración
   2. Cambio de pantallas
   3. Apertura del sobre
   4. Botón «No» que esquiva
   5. Botón «Sí» y celebración
   6. Lluvia de corazones
   ========================================================= */

(function () {
  'use strict';

  /* ---------- 1. Referencias y configuración ---------- */
  const $ = (id) => document.getElementById(id);

  const screens = {
    envelope: $('screen-envelope'),
    letter: $('screen-letter'),
    celebration: $('screen-celebration')
  };

  const envelope = $('envelope');
  const letterTitle = $('letter-title');
  const btnYes = $('btn-yes');
  const btnNo = $('btn-no');
  const noSlot = $('no-slot');
  const answers = $('answers');
  const noMessage = $('no-message');
  const heartsLayer = $('hearts');

  // Preferencias del dispositivo
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmallScreen = window.matchMedia('(max-width: 600px)').matches;

  // Límites para no saturar el celular
  const CONFIG = {
    maxHearts: reduceMotion ? 12 : (isSmallScreen ? 26 : 50),
    spawnEveryMs: reduceMotion ? 900 : (isSmallScreen ? 420 : 280),
    minDuration: reduceMotion ? 8 : 4,   // segundos que tarda un corazón en cruzar la pantalla
    maxDuration: reduceMotion ? 12 : 9,
    dodgeCooldownMs: 350,                // tiempo mínimo entre esquivadas
    dodgeMessages: [
      'Ese botón se escapó 🙈',
      'Jaja, probá con el otro ❤️',
      'Esa opción no está disponible 😜',
      'Mmm, pensalo otra vez 🥺',
      'El corazón dice que sí ❤️'
    ]
  };

  /* ---------- 2. Cambio de pantallas ---------- */
  function showScreen(name) {
    Object.values(screens).forEach((screen) => screen.classList.remove('active'));
    screens[name].classList.add('active');
  }

  /* ---------- 3. Apertura del sobre ---------- */
  let envelopeOpened = false;

  function openEnvelope() {
    if (envelopeOpened) return;          // evita abrirlo dos veces
    envelopeOpened = true;
    envelope.classList.add('open');
    envelope.setAttribute('aria-expanded', 'true');

    // Espera a que termine la animación de la solapa y la hoja, y muestra la carta
    setTimeout(() => {
      showScreen('letter');
      letterTitle.focus({ preventScroll: true }); // ayuda a lectores de pantalla
    }, reduceMotion ? 300 : 1400);
  }

  // "click" funciona con mouse, toque y teclado
  envelope.addEventListener('click', openEnvelope);

  /* ---------- 4. Botón «No» que esquiva ---------- */
  let noIsFree = false;   // true cuando el botón ya salió del flujo normal
  let lastDodgeTime = 0;
  let messageIndex = 0;

  // Saca el botón «No» del flujo sin que el «Sí» se mueva
  function freeNoButton() {
    const areaRect = answers.getBoundingClientRect();
    const noRect = btnNo.getBoundingClientRect();

    // El hueco conserva el tamaño para que el «Sí» no cambie de lugar
    noSlot.style.width = noRect.width + 'px';
    noSlot.style.height = noRect.height + 'px';

    // Posición inicial exacta, relativa a la zona de botones
    btnNo.style.left = (noRect.left - areaRect.left) + 'px';
    btnNo.style.top = (noRect.top - areaRect.top) + 'px';
    btnNo.classList.add('free');
    noIsFree = true;
  }

  // Elige una nueva posición dentro de la zona, lejos del «Sí»
  function dodge() {
    const now = Date.now();
    if (now - lastDodgeTime < CONFIG.dodgeCooldownMs) return;
    lastDodgeTime = now;

    if (!noIsFree) freeNoButton();

    const area = answers.getBoundingClientRect();
    const no = btnNo.getBoundingClientRect();
    const yes = btnYes.getBoundingClientRect();

    // Rectángulo del «Sí» relativo a la zona de botones
    const yesBox = {
      left: yes.left - area.left,
      top: yes.top - area.top,
      right: yes.right - area.left,
      bottom: yes.bottom - area.top
    };

    const pad = 8;
    const maxLeft = area.width - no.width - pad;
    const maxTop = area.height - no.height - pad;
    const gap = 12; // separación mínima con el «Sí»

    let newLeft = null;
    let newTop = null;

    // Prueba posiciones al azar hasta encontrar una que no tape el «Sí»
    for (let i = 0; i < 40; i++) {
      const x = pad + Math.random() * Math.max(0, maxLeft - pad);
      const y = pad + Math.random() * Math.max(0, maxTop - pad);
      const overlaps =
        !(x + no.width + gap < yesBox.left ||
          x - gap > yesBox.right ||
          y + no.height + gap < yesBox.top ||
          y - gap > yesBox.bottom);

      if (!overlaps) {
        newLeft = x;
        newTop = y;
        break;
      }
    }

    // Si no encontró espacio libre, se queda donde está para no tapar el «Sí»
    if (newLeft !== null) {
      btnNo.style.left = newLeft + 'px';
      btnNo.style.top = newTop + 'px';
    }

    showNoMessage();
  }

  // Mantiene el botón dentro de la zona si cambia el tamaño de la pantalla
  function clampNoButton() {
    if (!noIsFree) return;
    const area = answers.getBoundingClientRect();
    const no = btnNo.getBoundingClientRect();
    const maxLeft = Math.max(0, area.width - no.width);
    const maxTop = Math.max(0, area.height - no.height);
    const left = parseFloat(btnNo.style.left) || 0;
    const top = parseFloat(btnNo.style.top) || 0;
    btnNo.style.left = Math.min(Math.max(0, left), maxLeft) + 'px';
    btnNo.style.top = Math.min(Math.max(0, top), maxTop) + 'px';
  }

  function showNoMessage() {
    const messages = CONFIG.dodgeMessages;
    noMessage.textContent = messages[messageIndex % messages.length];
    messageIndex++;
  }

  // Computadora: esquiva cuando el cursor entra al botón
  btnNo.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') dodge();
  });

  // Celular y mouse: esquiva al presionar. preventDefault evita que el toque cuente como clic
  btnNo.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    dodge();
  });

  // Teclado (Enter o Espacio): clic sin puntero, también esquiva.
  // Nunca acepta la respuesta: el «No» no hace nada más.
  btnNo.addEventListener('click', (event) => {
    if (event.detail === 0) dodge();
  });

  window.addEventListener('resize', clampNoButton);

  /* ---------- 5. Botón «Sí» y celebración ---------- */
  let celebrated = false;

  function celebrate() {
    if (celebrated) return;
    celebrated = true;
    showScreen('celebration');
    startHearts();
  }

  btnYes.addEventListener('click', celebrate);

  /* ---------- 6. Lluvia de corazones ---------- */
  const HEART_COLORS = ['#e63950', '#ff5c7c', '#ff8fab', '#f4a6b7', '#ffb3c6', '#d6336c', '#c9184a'];
  let activeHearts = 0;
  let heartTimer = null;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // Crea un corazón que cae o sube, y lo elimina al terminar
  function createHeart(isInitialBurst) {
    if (activeHearts >= CONFIG.maxHearts) return;

    const heart = document.createElement('span');
    heart.className = 'heart' + (Math.random() < 0.25 ? ' rise' : '');
    heart.textContent = '❤';

    const size = rand(14, isSmallScreen ? 36 : 52);
    const duration = rand(CONFIG.minDuration, CONFIG.maxDuration);
    const delay = isInitialBurst ? rand(0, 1.8) : 0;

    heart.style.fontSize = size + 'px';
    heart.style.color = pick(HEART_COLORS);
    heart.style.left = rand(-3, 100).toFixed(1) + '%';
    heart.style.opacity = rand(0.55, 1).toFixed(2);
    heart.style.setProperty('--drift', rand(-60, 60).toFixed(0) + 'px');
    heart.style.setProperty('--rot', rand(-160, 160).toFixed(0) + 'deg');
    heart.style.animationDuration = duration + 's';
    heart.style.animationDelay = delay + 's';

    heartsLayer.appendChild(heart);
    activeHearts++;

    // Quita el corazón del DOM cuando ya terminó su recorrido
    setTimeout(() => {
      heart.remove();
      activeHearts--;
    }, (duration + delay) * 1000 + 200);
  }

  function startHearts() {
    // Ráfaga inicial para que la pantalla se llene de corazones de inmediato
    const burst = Math.min(18, CONFIG.maxHearts);
    for (let i = 0; i < burst; i++) createHeart(true);

    // Lluvia continua y controlada
    heartTimer = setInterval(() => createHeart(false), CONFIG.spawnEveryMs);
  }

  // Pausa la lluvia si la persona cambia de pestaña, para ahorrar recursos
  document.addEventListener('visibilitychange', () => {
    if (!heartTimer) return;
    if (document.hidden) {
      clearInterval(heartTimer);
      heartTimer = null;
    } else {
      heartTimer = setInterval(() => createHeart(false), CONFIG.spawnEveryMs);
    }
  });

  // Inicio: el sobre ya está visible por defecto (clase "active" en el HTML)
  envelope.setAttribute('aria-expanded', 'false');
})();
