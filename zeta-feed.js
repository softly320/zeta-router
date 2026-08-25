// ==UserScript==
// @name         제타피드 원형아이콘
// @namespace    zeta-local
// @version      1.0.2
// @description  제타 페이지에 작은 원형 💬 버튼을 표시하고, 누르면 제타피드를 엽니다.
// @match        https://zeta-ai.io/ko/*
// @include      https://zeta-ai.io/ko/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  var SCRIPT_URL = 'https://zetafeed.pages.dev/zetafeed.js';
  var API_KEY = '__ZETAFEED_V1__';
  var STATE_KEY = '__ZETAFEED_BUBBLE_LAUNCHER__';
  var BUTTON_ID = 'zetafeed-bubble-launcher';
  var STYLE_ID = 'zetafeed-bubble-launcher-style';
  var POSITION_KEY = '__ZETAFEED_BUBBLE_POSITION__';
  var LOADER_SELECTOR = 'script[data-zetafeed-loader]';
  var APP_IDS = ['zetafeed-v1-app', 'zetafeed-v1-style'];

  var loading = false;
  var ignoreNextClick = false;

  if (window[STATE_KEY]) return;
  window[STATE_KEY] = true;

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#' + BUTTON_ID + ' {',
      '  position: fixed;',
      '  right: 12px;',
      '  bottom: calc(92px + env(safe-area-inset-bottom, 0px));',
      '  width: 32px;',
      '  height: 32px;',
      '  min-width: 32px;',
      '  min-height: 32px;',
      '  padding: 0;',
      '  margin: 0;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  appearance: none;',
      '  -webkit-appearance: none;',
      '  outline: none;',
      '  border: 2px solid rgba(255, 255, 255, 0.92);',
      '  border-radius: 9999px;',
      '  overflow: hidden;',
      '  background:',
      '    radial-gradient(circle at 30% 22%, rgba(255,255,255,0.32), rgba(255,255,255,0) 34%),',
      '    linear-gradient(145deg, #243140 0%, #151b24 48%, #0f141b 100%);',
      '  background-clip: padding-box;',
      '  box-shadow:',
      '    0 0 0 1px rgba(70, 145, 210, 0.24),',
      '    0 4px 12px rgba(0, 0, 0, 0.24);',
      '  cursor: grab;',
      '  z-index: 2147483646;',
      '  -webkit-tap-highlight-color: transparent;',
      '  user-select: none;',
      '  -webkit-user-select: none;',
      '  touch-action: none;',
      '}',
      '#' + BUTTON_ID + '[data-dragging="1"] {',
      '  cursor: grabbing;',
      '  transform: scale(1.04);',
      '}',
      '#' + BUTTON_ID + ':active {',
      '  transform: scale(0.94);',
      '}',
      '#' + BUTTON_ID + '[data-dragging="1"]:active {',
      '  transform: scale(1.04);',
      '}',
      '#' + BUTTON_ID + '[data-loading="1"] {',
      '  opacity: 0.76;',
      '}',
      '#' + BUTTON_ID + ' .zetafeed-bubble-icon {',
      '  display: block;',
      '  color: #ffffff;',
      '  font-size: 15px;',
      '  line-height: 1;',
      '  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.34);',
      '  pointer-events: none;',
      '  transform: translateY(-0.25px);',
      '}',
      '#' + BUTTON_ID + '[data-loading="1"] .zetafeed-bubble-icon {',
      '  display: none;',
      '}',
      '#' + BUTTON_ID + ' .zetafeed-bubble-loading {',
      '  display: none;',
      '  color: #ffffff;',
      '  font-family: Arial, sans-serif;',
      '  font-size: 13px;',
      '  line-height: 1;',
      '  pointer-events: none;',
      '}',
      '#' + BUTTON_ID + '[data-loading="1"] .zetafeed-bubble-loading {',
      '  display: block;',
      '}'
    ].join('\n');

    (document.head || document.documentElement).appendChild(style);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function savePosition(left, top) {
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify({ left: left, top: top }));
    } catch (error) {}
  }

  function readSavedPosition() {
    try {
      var raw = localStorage.getItem(POSITION_KEY);
      if (!raw) return null;
      var position = JSON.parse(raw);
      if (typeof position.left !== 'number' || typeof position.top !== 'number') return null;
      return position;
    } catch (error) {
      return null;
    }
  }

  function placeButton(button, left, top) {
    var padding = 6;
    var maxLeft = Math.max(padding, window.innerWidth - button.offsetWidth - padding);
    var maxTop = Math.max(padding, window.innerHeight - button.offsetHeight - padding);
    var safeLeft = clamp(left, padding, maxLeft);
    var safeTop = clamp(top, padding, maxTop);

    button.style.left = safeLeft + 'px';
    button.style.top = safeTop + 'px';
    button.style.right = 'auto';
    button.style.bottom = 'auto';

    return { left: safeLeft, top: safeTop };
  }

  function restorePosition(button) {
    var position = readSavedPosition();
    if (!position) return;
    requestAnimationFrame(function () {
      var fixed = placeButton(button, position.left, position.top);
      savePosition(fixed.left, fixed.top);
    });
  }

  function keepButtonInsideViewport() {
    var button = document.getElementById(BUTTON_ID);
    if (!button) return;
    var rect = button.getBoundingClientRect();
    var fixed = placeButton(button, rect.left, rect.top);
    savePosition(fixed.left, fixed.top);
  }

  function enableDragging(button) {
    var pointerId = null;
    var startPointerX = 0;
    var startPointerY = 0;
    var startLeft = 0;
    var startTop = 0;
    var moved = false;
    var dragThreshold = 5;

    button.addEventListener('pointerdown', function (event) {
      if (loading) return;
      pointerId = event.pointerId;
      moved = false;

      var rect = button.getBoundingClientRect();
      startPointerX = event.clientX;
      startPointerY = event.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      button.dataset.dragging = '1';

      try {
        button.setPointerCapture(pointerId);
      } catch (error) {}

      event.preventDefault();
    });

    button.addEventListener('pointermove', function (event) {
      if (pointerId === null || event.pointerId !== pointerId) return;

      var deltaX = event.clientX - startPointerX;
      var deltaY = event.clientY - startPointerY;
      if (!moved && Math.hypot(deltaX, deltaY) >= dragThreshold) moved = true;
      if (!moved) return;

      placeButton(button, startLeft + deltaX, startTop + deltaY);
      event.preventDefault();
    });

    function finishDrag(event) {
      if (pointerId === null) return;
      if (event && event.pointerId !== pointerId) return;

      try {
        button.releasePointerCapture(pointerId);
      } catch (error) {}

      button.dataset.dragging = '0';

      if (moved) {
        var rect = button.getBoundingClientRect();
        var fixed = placeButton(button, rect.left, rect.top);
        savePosition(fixed.left, fixed.top);
        ignoreNextClick = true;
        setTimeout(function () {
          ignoreNextClick = false;
        }, 250);
      }

      pointerId = null;
      moved = false;
    }

    button.addEventListener('pointerup', finishDrag);
    button.addEventListener('pointercancel', finishDrag);
  }

  function setButtonLoading(value) {
    var button = document.getElementById(BUTTON_ID);
    if (!button) return;
    button.dataset.loading = value ? '1' : '0';
    button.setAttribute('aria-label', value ? '제타피드 불러오는 중' : '제타피드 열기');
  }

  function ensureButton() {
    addStyle();
    if (document.getElementById(BUTTON_ID)) return;

    var button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.title = '제타피드';
    button.dataset.dragging = '0';
    button.dataset.loading = '0';
    button.setAttribute('aria-label', '제타피드 열기');
    button.innerHTML = '<span class="zetafeed-bubble-icon">💬</span><span class="zetafeed-bubble-loading">⋯</span>';

    button.addEventListener('click', function (event) {
      if (ignoreNextClick) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      openZetaFeed();
    });

    enableDragging(button);
    (document.body || document.documentElement).appendChild(button);
    restorePosition(button);
  }

  function clearLoaderScripts() {
    document.querySelectorAll(LOADER_SELECTOR).forEach(function (script) {
      script.remove();
    });
  }

  function openExistingZetaFeed() {
    if (!window[API_KEY]) return false;
    try {
      if (window[API_KEY].open) window[API_KEY].open();
    } catch (error) {}
    return true;
  }

  function openZetaFeed() {
    if (loading) return;
    if (openExistingZetaFeed()) return;

    loading = true;
    setButtonLoading(true);
    clearLoaderScripts();

    var script = document.createElement('script');
    script.setAttribute('data-zetafeed-loader', '1');
    script.src = SCRIPT_URL + (SCRIPT_URL.includes('?') ? '&' : '?') + 'cb=' + Date.now();

    script.onload = function () {
      loading = false;
      setButtonLoading(false);
      openExistingZetaFeed();
    };

    script.onerror = function () {
      loading = false;
      setButtonLoading(false);
      alert('제타피드 최신 스크립트를 불러오지 못했습니다.');
    };

    (document.head || document.documentElement).appendChild(script);
  }

  function scheduleSync() {
    setTimeout(ensureButton, 180);
  }

  var originalPushState = history.pushState;
  var originalReplaceState = history.replaceState;

  history.pushState = function () {
    var result = originalPushState.apply(this, arguments);
    scheduleSync();
    return result;
  };

  history.replaceState = function () {
    var result = originalReplaceState.apply(this, arguments);
    scheduleSync();
    return result;
  };

  window.addEventListener('popstate', scheduleSync);
  window.addEventListener('hashchange', scheduleSync);
  window.addEventListener('resize', keepButtonInsideViewport);
  window.addEventListener('orientationchange', function () {
    setTimeout(keepButtonInsideViewport, 250);
  });

  var observer = new MutationObserver(scheduleSync);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  setInterval(ensureButton, 1000);
  ensureButton();
})();
