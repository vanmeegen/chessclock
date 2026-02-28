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
  const moveCounter = document.getElementById('move-counter');
  const wheelMinutes = document.getElementById('wheel-minutes');
  const wheelIncrement = document.getElementById('wheel-increment');
  const btnStart = document.getElementById('btn-start');
  const btnMute = document.getElementById('btn-mute');
  const presetChips = document.querySelectorAll('.preset-chip');

  // ---- State ----
  let timeTopMs = 0;
  let timeBotMs = 0;
  let activePlayer = null; // 'top' | 'bottom' | null
  let running = false;
  let intervalId = null;
  let lastTick = 0;
  let initialMs = 0;
  let incrementMs = 0;
  let halfMoves = 0;
  let muted = false;

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
    if (!muted) beep(800, 50);
  }

  function timeUpSound() {
    if (!muted) beep(300, 600);
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

    var moveNum = Math.floor(halfMoves / 2) + 1;
    moveCounter.textContent = 'Move ' + moveNum;
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
      halfMoves = 1;
      startTicking();
      clickSound();
      render();
      return;
    }

    if (!running) return; // paused – ignore player taps

    // Switch turns: only the active player can tap to end their turn
    if (activePlayer === tappedSide) {
      if (incrementMs > 0) {
        if (tappedSide === 'top') timeTopMs += incrementMs;
        else timeBotMs += incrementMs;
      }
      activePlayer = tappedSide === 'top' ? 'bottom' : 'top';
      halfMoves++;
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
    halfMoves = 0;
    setupScreen.classList.add('active');
    gameScreen.classList.remove('active');
  });

  // ---- Mute Toggle ----
  btnMute.addEventListener('click', function () {
    muted = !muted;
    btnMute.classList.toggle('muted', muted);
  });

  // ---- Wheel Picker ----
  var ITEM_H = 40;
  var VISIBLE_ITEMS = 1;
  var PAD_COUNT = 0;

  var minuteValues = [];
  for (var i = 1; i <= 120; i++) minuteValues.push(i);

  var incrementValues = [];
  for (var i = 0; i <= 60; i++) incrementValues.push(i);

  function populateWheel(wheel, values, formatFn) {
    wheel.innerHTML = '';
    for (var i = 0; i < PAD_COUNT; i++) {
      var spacer = document.createElement('div');
      spacer.className = 'wheel-item wheel-spacer';
      wheel.appendChild(spacer);
    }
    values.forEach(function (val) {
      var item = document.createElement('div');
      item.className = 'wheel-item';
      item.textContent = formatFn(val);
      wheel.appendChild(item);
    });
    for (var i = 0; i < PAD_COUNT; i++) {
      var spacer = document.createElement('div');
      spacer.className = 'wheel-item wheel-spacer';
      wheel.appendChild(spacer);
    }
  }

  function getWheelIndex(wheel) {
    var idx = Math.round(wheel.scrollTop / ITEM_H);
    return Math.max(0, idx);
  }

  function scrollWheelTo(wheel, index, smooth) {
    wheel.scrollTo({
      top: index * ITEM_H,
      behavior: smooth ? 'smooth' : 'instant'
    });
  }

  populateWheel(wheelMinutes, minuteValues, function (v) { return String(v); });
  populateWheel(wheelIncrement, incrementValues, function (v) { return String(v); });

  // Set default: 5 minutes, 0 increment
  setTimeout(function () {
    scrollWheelTo(wheelMinutes, 4, false);  // index 4 = value 5
    scrollWheelTo(wheelIncrement, 0, false);
  }, 0);

  // Preset chips scroll the minutes wheel to the corresponding position
  presetChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var mins = parseInt(chip.getAttribute('data-minutes'), 10);
      scrollWheelTo(wheelMinutes, mins - 1, true);  // index = value - 1
    });
  });

  // Start button reads wheel values and begins the game
  btnStart.addEventListener('click', function () {
    var mIdx = Math.min(getWheelIndex(wheelMinutes), minuteValues.length - 1);
    var incIdx = Math.min(getWheelIndex(wheelIncrement), incrementValues.length - 1);
    var totalMs = minuteValues[mIdx] * 60 * 1000;
    if (totalMs <= 0) return;

    initialMs = totalMs;
    incrementMs = incrementValues[incIdx] * 1000;
    timeTopMs = initialMs;
    timeBotMs = initialMs;
    activePlayer = null;
    running = false;
    halfMoves = 0;

    render();
    setupScreen.classList.remove('active');
    gameScreen.classList.add('active');

    requestWakeLock();
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

  // ---- PWA Install Prompt ----
  var deferredPrompt = null;
  var btnInstall = document.getElementById('btn-install');

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    btnInstall.hidden = false;
  });

  btnInstall.addEventListener('click', function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function () {
      deferredPrompt = null;
      btnInstall.hidden = true;
    });
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    btnInstall.hidden = true;
  });

  // ---- PWA Auto-Update ----
  var updateToast = document.getElementById('update-toast');
  var btnUpdate = document.getElementById('btn-update');

  function showUpdateToast() {
    updateToast.hidden = false;
  }

  btnUpdate.addEventListener('click', function () {
    window.location.reload();
  });

  // Listen for messages from the service worker
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'SW_UPDATED') {
        showUpdateToast();
      }
    });
  }

  // ---- PWA Service Worker Registration ----
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        // Check for updates periodically (every 60 seconds)
        setInterval(function () {
          reg.update();
        }, 60 * 1000);

        // Detect when a new service worker is waiting or installing
        reg.addEventListener('updatefound', function () {
          var newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', function () {
              if (newWorker.state === 'activated') {
                showUpdateToast();
              }
            });
          }
        });
      });
    });

    // If the controller changes (new SW took over), offer reload
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      showUpdateToast();
    });
  }
})();
