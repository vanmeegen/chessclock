(function () {
  'use strict';

  // ---- DOM refs ----
  const setupScreen = document.getElementById('setup-screen');
  const gameScreen = document.getElementById('game-screen');
  const timerTop = document.getElementById('timer-top');
  const timerBottom = document.getElementById('timer-bottom');
  const playerTop = document.getElementById('player-top');
  const playerBottom = document.getElementById('player-bottom');
  const btnPause = document.getElementById('btn-pause');
  const btnReset = document.getElementById('btn-reset');
  const timeButtons = document.querySelectorAll('.time-btn');

  // ---- State ----
  let timeTopMs = 0;
  let timeBotMs = 0;
  let activePlayer = null; // 'top' | 'bottom' | null
  let running = false;
  let intervalId = null;
  let lastTick = 0;
  let initialMs = 0;

  // ---- Audio feedback ----
  function beep(frequency, duration) {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch (e) {
      // Audio not available – silent fallback
    }
  }

  function clickSound() {
    beep(800, 50);
  }

  function timeUpSound() {
    beep(300, 600);
  }

  // ---- Helpers ----
  function formatTime(ms) {
    if (ms <= 0) return '0:00';
    var totalSeconds = Math.ceil(ms / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }

  function render() {
    timerTop.textContent = formatTime(timeTopMs);
    timerBottom.textContent = formatTime(timeBotMs);

    playerTop.classList.toggle('active-turn', activePlayer === 'top' && running);
    playerBottom.classList.toggle('active-turn', activePlayer === 'bottom' && running);

    playerTop.classList.toggle('time-up', timeTopMs <= 0);
    playerBottom.classList.toggle('time-up', timeBotMs <= 0);

    btnPause.innerHTML = running ? '&#10074;&#10074;' : '&#9654;';
  }

  // ---- Game loop ----
  function tick() {
    var now = performance.now();
    var delta = now - lastTick;
    lastTick = now;

    if (!running || !activePlayer) return;

    if (activePlayer === 'top') {
      timeTopMs = Math.max(0, timeTopMs - delta);
      if (timeTopMs <= 0) {
        timeTopMs = 0;
        endGame();
        timeUpSound();
      }
    } else {
      timeBotMs = Math.max(0, timeBotMs - delta);
      if (timeBotMs <= 0) {
        timeBotMs = 0;
        endGame();
        timeUpSound();
      }
    }
    render();
  }

  function startTicking() {
    if (intervalId) return;
    lastTick = performance.now();
    intervalId = setInterval(tick, 50);
  }

  function stopTicking() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function endGame() {
    running = false;
    stopTicking();
    render();
  }

  // ---- Player tap handlers ----
  function onPlayerTap(tappedSide) {
    // If game is over, ignore taps on player areas
    if (timeTopMs <= 0 || timeBotMs <= 0) return;

    if (!running && activePlayer === null) {
      // First tap: start the game – tapped player ends their turn
      activePlayer = tappedSide === 'top' ? 'bottom' : 'top';
      running = true;
      startTicking();
      clickSound();
      render();
      return;
    }

    if (!running) return; // paused – ignore player taps

    // Switch turns: only the active player can tap to end their turn
    if (activePlayer === tappedSide) {
      activePlayer = tappedSide === 'top' ? 'bottom' : 'top';
      lastTick = performance.now();
      clickSound();
      render();
    }
  }

  // ---- Event listeners ----
  playerTop.addEventListener('click', function () {
    onPlayerTap('top');
  });

  playerBottom.addEventListener('click', function () {
    onPlayerTap('bottom');
  });

  btnPause.addEventListener('click', function (e) {
    e.stopPropagation();
    if (timeTopMs <= 0 || timeBotMs <= 0) return;
    if (activePlayer === null) return; // game not started

    running = !running;
    if (running) {
      startTicking();
    } else {
      stopTicking();
    }
    render();
  });

  btnReset.addEventListener('click', function (e) {
    e.stopPropagation();
    stopTicking();
    running = false;
    activePlayer = null;
    setupScreen.classList.add('active');
    gameScreen.classList.remove('active');
  });

  // ---- Setup screen ----
  timeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var minutes = parseInt(btn.getAttribute('data-minutes'), 10);
      initialMs = minutes * 60 * 1000;
      timeTopMs = initialMs;
      timeBotMs = initialMs;
      activePlayer = null;
      running = false;

      render();
      setupScreen.classList.remove('active');
      gameScreen.classList.add('active');

      // Attempt to keep screen awake
      requestWakeLock();
    });
  });

  // ---- Wake Lock (keep screen on during game) ----
  var wakeLock = null;

  function requestWakeLock() {
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(function (lock) {
        wakeLock = lock;
        wakeLock.addEventListener('release', function () {
          wakeLock = null;
        });
      }).catch(function () {
        // Wake Lock not available
      });
    }
  }

  // Re-acquire wake lock when page becomes visible again
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && gameScreen.classList.contains('active')) {
      requestWakeLock();
    }
  });

  // ---- PWA Service Worker Registration ----
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js');
    });
  }
})();
