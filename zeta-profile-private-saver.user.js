// ==UserScript==
// @name         ZETA 프로필 비캐 저장기
// @namespace    https://zetdal-secret-saver.netlify.app/
// @version      1.5.1
// @description  현재 프로필에서 비공개 방을 원하는 개수만큼 만들고 같은 프로필로 돌아옵니다.
// @match        https://zeta-ai.io/*
// @match        https://*.zeta-ai.io/*
// @updateURL    https://zetdal-secret-saver.netlify.app/zeta-profile-private-saver.user.js
// @downloadURL  https://zetdal-secret-saver.netlify.app/zeta-profile-private-saver.user.js
// @run-at       document-idle
// @inject-into  content
// @connect      zetdal-secret-saver.netlify.app
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(() => {
  'use strict';

  const SAVER_KEY = '__ZETA_PROFILE_PRIVATE_AUTO_V5__';
  const LAUNCHER_ID = '__zeta_private_saver_launcher';
  const LAUNCHER_STYLE_ID = '__zeta_private_saver_launcher_style';
  const LAUNCHER_API_KEY = '__ZETA_PRIVATE_SAVER_LAUNCHER_V1__';
  const SCRIPT_VERSION = '1.5.1';
  const POSITION_KEY = '__ZETA_PRIVATE_SAVER_POSITION_V1__';
  const RUNTIME_EXECUTION_KEY =
    '__ZETA_PRIVATE_SAVER_RUNTIME_EXECUTION__';
  const RUNTIME_URL =
    'https://cdn.jsdelivr.net/gh/softly320/zeta-router@main/zeta-profile-private-saver.user.js';
  const CURRENT_SCRIPT = document.currentScript;
  const HAS_USERSCRIPT_API =
    typeof globalThis.GM_info !== 'undefined' ||
    typeof globalThis.GM !== 'undefined' ||
    typeof globalThis.GM_xmlhttpRequest === 'function';
  const IS_UNMARKED_BOOKMARKLET_RUNTIME =
    !CURRENT_SCRIPT &&
    !HAS_USERSCRIPT_API &&
    window[RUNTIME_EXECUTION_KEY] !== true;
  const IS_RUNTIME =
    window[RUNTIME_EXECUTION_KEY] === true ||
    CURRENT_SCRIPT?.dataset.zetaRuntime === '1' ||
    IS_UNMARKED_BOOKMARKLET_RUNTIME;
  const IS_BOOKMARKLET =
    (
      CURRENT_SCRIPT?.dataset.zetaRuntime === '1' &&
      CURRENT_SCRIPT?.dataset.zetaAutoUpdate !== '1'
    ) || IS_UNMARKED_BOOKMARKLET_RUNTIME;
  if (!IS_RUNTIME && window.top !== window.self) return;
  const ICON_DATA = "data:image/png;base64,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";
  const runSaver = () => {
  'use strict';

  const KEY = '__ZETA_PROFILE_PRIVATE_AUTO_V5__';
  const LEGACY_KEYS = [
    '__ZETA_PRIVATE_AUTO_V3__',
    '__ZETA_PROFILE_PRIVATE_AUTO_V4__',
  ];

  const previousState = window[KEY];
  if (previousState?.running) {
    previousState.stop('사용자가 중지했습니다.');
    return;
  }
  if (previousState) delete window[KEY];

  for (const legacyKey of LEGACY_KEYS) {
    if (window[legacyKey]?.running) {
      window[legacyKey].stop('새 버전으로 다시 시작합니다.');
    }
  }

  if (
    location.hostname !== 'zeta-ai.io' &&
    !location.hostname.endsWith('.zeta-ai.io')
  ) {
    alert('zeta-ai.io의 캐릭터 프로필에서 실행해주세요.');
    return;
  }

  const profileUrl = location.href;

  const raw = prompt('프로필에서 만들 비공개 방 수를 입력하세요.', '10');
  if (raw === null) return;

  const total = Number(raw);
  if (!Number.isInteger(total) || total < 1) {
    alert('1 이상의 정수를 입력해주세요.');
    return;
  }

  const state = {
    running: true,
    total,
    done: 0,
    step: '준비 중',
    profileUrl,
    stop: null,
  };
  window[KEY] = state;

  const clearState = () => {
    if (window[KEY] === state) delete window[KEY];
  };

  document.getElementById('__zeta_private_auto_panel')?.remove();

  const host = document.createElement('div');
  host.id = '__zeta_private_auto_panel';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      *, *::before, *::after { box-sizing: border-box; }
      .panel {
        position: fixed;
        z-index: 2147483647;
        right: 12px;
        bottom: 78px;
        width: min(204px, calc(100vw - 24px));
        padding: 11px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, .12);
        border-radius: 15px;
        background: rgba(25, 25, 31, .94);
        color: #f8f7ff;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, .06),
          0 12px 34px rgba(9, 7, 20, .34);
        -webkit-backdrop-filter: blur(18px) saturate(125%);
        backdrop-filter: blur(18px) saturate(125%);
        font-family: -apple-system, BlinkMacSystemFont, "Noto Sans KR", system-ui, sans-serif;
      }
      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .title {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 7px;
        font-size: 12px;
        font-weight: 780;
        letter-spacing: -.01em;
        white-space: nowrap;
      }
      .title::before {
        width: 3px;
        height: 16px;
        flex: 0 0 auto;
        border-radius: 3px;
        background: #9688f6;
        content: "";
      }
      .number {
        flex: 0 0 auto;
        color: #d9d4ff;
        font-size: 11px;
        font-weight: 760;
        font-variant-numeric: tabular-nums;
      }
      .progress {
        height: 3px;
        margin-top: 10px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255, 255, 255, .09);
      }
      .progress-fill {
        width: 100%;
        height: 100%;
        border-radius: inherit;
        background: #9688f6;
        transform: scaleX(0);
        transform-origin: left center;
        transition: transform .28s cubic-bezier(.22, 1, .36, 1);
      }
      .status {
        min-height: 31px;
        margin-top: 9px;
        color: #bab8c5;
        font-size: 11px;
        font-weight: 520;
        line-height: 1.45;
        word-break: keep-all;
      }
      .stop {
        width: 100%;
        min-height: 32px;
        margin-top: 8px;
        padding: 0 12px;
        border: 1px solid rgba(255, 255, 255, .08);
        border-radius: 9px;
        background: #30303a;
        color: #f7f6fb;
        font: inherit;
        font-size: 11px;
        font-weight: 720;
        cursor: pointer;
        transition: background-color .16s ease, transform .16s ease;
      }
      .stop:hover { background: #393943; }
      .stop:active { transform: scale(.98); }
      .stop:focus-visible { outline: 2px solid #9688f6; outline-offset: 2px; }
      .panel[data-state="done"] .stop { background: #6255b4; }
      .panel[data-state="done"] .status { color: #dedaf7; }
      @media (prefers-reduced-motion: reduce) {
        .progress-fill, .stop { transition: none; }
      }
      @media (prefers-reduced-transparency: reduce) {
        .panel {
          background: #19191f;
          -webkit-backdrop-filter: none;
          backdrop-filter: none;
        }
      }
    </style>
    <div class="panel" data-state="running">
      <div class="top">
        <div class="title">프로필 비캐 저장기</div>
        <div class="number">0 / ${total}</div>
      </div>
      <div class="progress" role="progressbar" aria-label="비공개 방 생성 진행률" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="0">
        <div class="progress-fill"></div>
      </div>
      <div class="status">준비 중</div>
      <button class="stop">중지</button>
    </div>
  `;

  const panel = shadow.querySelector('.panel');
  const number = shadow.querySelector('.number');
  const progress = shadow.querySelector('.progress');
  const progressFill = shadow.querySelector('.progress-fill');
  const status = shadow.querySelector('.status');
  const stopButton = shadow.querySelector('.stop');

  const paint = (text) => {
    state.step = text;
    number.textContent = `${state.done} / ${state.total}`;
    status.textContent = text;
    progress.setAttribute('aria-valuenow', String(state.done));
    progressFill.style.transform = `scaleX(${state.done / state.total})`;
  };

  const finish = (text) => {
    state.running = false;
    panel.dataset.state = text.startsWith('완료') ? 'done' : 'stopped';
    paint(text);
    stopButton.textContent = '닫기';
  };

  const abort = () => {
    if (!state.running) throw new Error('__STOP__');
  };

  state.stop = (message = '중지됨') => {
    if (!state.running) {
      host.remove();
      clearState();
      return;
    }
    finish(message);
  };

  stopButton.onclick = () => {
    if (state.running) state.stop('사용자가 중지했습니다.');
    else {
      host.remove();
      clearState();
    }
  };

  const sleep = (milliseconds) =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          abort();
          resolve();
        } catch (error) {
          reject(error);
        }
      }, milliseconds);
    });

  const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim();

  const visible = (element) => {
    if (!element || !element.isConnected) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    );
  };

  const waitFor = async (
    find,
    label,
    timeout = 20000,
    interval = 250,
  ) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      abort();
      let value = null;
      try {
        value = find();
      } catch (_) {}
      if (value) return value;
      await sleep(interval);
    }
    throw new Error(`${label} 대기 시간 초과`);
  };

  const click = async (element, label) => {
    abort();
    if (!element || !element.isConnected || element.disabled) {
      throw new Error(`${label} 버튼을 누를 수 없음`);
    }
    try {
      element.scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior: 'instant',
      });
    } catch (_) {
      element.scrollIntoView({ block: 'center', inline: 'center' });
    }
    await sleep(350);
    if (!element.isConnected || element.disabled || !visible(element)) {
      throw new Error(`${label} 버튼이 화면에서 변경됨`);
    }
    try {
      element.focus({ preventScroll: true });
    } catch (_) {
      element.focus();
    }
    const rect = element.getBoundingClientRect();
    const eventOptions = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      button: 0,
    };
    if (typeof PointerEvent === 'function') {
      element.dispatchEvent(
        new PointerEvent('pointerdown', {
          ...eventOptions,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
          buttons: 1,
        }),
      );
    }
    element.dispatchEvent(
      new MouseEvent('mousedown', { ...eventOptions, buttons: 1 }),
    );
    if (typeof PointerEvent === 'function') {
      element.dispatchEvent(
        new PointerEvent('pointerup', {
          ...eventOptions,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
          buttons: 0,
        }),
      );
    }
    element.dispatchEvent(
      new MouseEvent('mouseup', { ...eventOptions, buttons: 0 }),
    );
    element.click();
    await sleep(120);
  };

  const exactButton = (text, root = document) =>
    [...root.querySelectorAll('button')].find(
      (element) =>
        visible(element) &&
        !element.disabled &&
        normalize(element.innerText || element.textContent) === text,
    ) || null;

  const privateSnapshotButton = () => {
    const element = document.querySelector('#create-private-snapshot');
    return visible(element) && !element.disabled ? element : null;
  };

  const confirmButton = () => exactButton('전환');

  const compactPath = (path) =>
    (path.getAttribute('d') || '').replace(/[\s,]/g, '').toLowerCase();

  const hasBackArrowIcon = (button) =>
    [...button.querySelectorAll('svg path')].some((path) => {
      const data = compactPath(path);
      return (
        data.includes('m1519-7-77-7') ||
        data.includes('m1519l-7-77-7')
      );
    });

  const backButton = () => {
    const labeled = document.querySelector(
      'button[aria-label="Go back"], button[aria-label="뒤로가기"]',
    );
    if (visible(labeled) && !labeled.disabled) return labeled;

    const candidates = [...document.querySelectorAll('button')].filter(
      (button) =>
        visible(button) && !button.disabled && hasBackArrowIcon(button),
    );
    candidates.sort((left, right) => {
      const leftRect = left.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();
      return leftRect.top - rightRect.top || leftRect.left - rightRect.left;
    });
    return candidates[0] || null;
  };

  const hasVerticalDotsIcon = (button) =>
    [...button.querySelectorAll('svg path')].some((path) => {
      const data = compactPath(path);
      return (
        data.includes('m10.7512.5') &&
        data.includes('m10.7519.5') &&
        data.includes('m10.755.5')
      );
    });

  const profileMenuButton = () => {
    const candidates = [...document.querySelectorAll('button')].filter(
      (button) =>
        visible(button) &&
        !button.disabled &&
        !button.closest('[role="dialog"], [role="menu"]') &&
        hasVerticalDotsIcon(button),
    );

    candidates.sort((left, right) => {
      const leftRect = left.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();
      return leftRect.top - rightRect.top || rightRect.right - leftRect.right;
    });

    return candidates[0] || null;
  };

  const routeKey = () =>
    `${location.pathname}${location.search}${location.hash}`;

  const waitForNewRoom = async (
    profileRoute,
    index,
    attempt,
    timeout = 5000,
  ) => {
    const startedAt = Date.now();
    let shownSeconds = -1;
    let confirmRetries = 0;
    let nextConfirmRetryAt = startedAt + 1200;
    while (Date.now() - startedAt < timeout) {
      if (routeKey() !== profileRoute) return;
      if (
        Date.now() >= nextConfirmRetryAt &&
        confirmRetries < 2
      ) {
        const pendingConfirm = confirmButton();
        if (pendingConfirm) {
          confirmRetries += 1;
          paint(
            `${index}/${state.total} · 남아 있는 전환 버튼 다시 누르기 ${confirmRetries}/2`,
          );
          await click(pendingConfirm, '남아 있는 전환');
          nextConfirmRetryAt = Date.now() + 1200;
          continue;
        }
      }
      const remainingSeconds = Math.max(
        1,
        Math.ceil((timeout - (Date.now() - startedAt)) / 1000),
      );
      if (remainingSeconds !== shownSeconds) {
        shownSeconds = remainingSeconds;
        paint(
          `${index}/${state.total} · 새 비공개 방 확인 중 ${remainingSeconds}초` +
            (attempt > 1 ? ` (${attempt}/4차 시도)` : ''),
        );
      }
      await sleep(100);
    }
    throw new Error('새 비공개 방 이동 시간 초과');
  };

  const historyBack = (timeout = 45000) =>
    new Promise((resolve, reject) => {
      let finished = false;
      let timer = 0;
      let poller = 0;
      const beforeUrl = location.href;
      const beforeState = history.state;
      const complete = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        clearInterval(poller);
        removeEventListener('popstate', onPopState);
        resolve();
      };
      const onPopState = () => complete();
      addEventListener('popstate', onPopState, { once: true });
      history.back();
      poller = setInterval(() => {
        if (location.href !== beforeUrl || history.state !== beforeState) {
          complete();
        }
      }, 100);
      timer = setTimeout(() => {
        if (finished) return;
        clearInterval(poller);
        removeEventListener('popstate', onPopState);
        reject(new Error('저장한 프로필 복귀 시간 초과'));
      }, timeout);
    });

  const openProfileMenu = async (index) => {
    if (privateSnapshotButton()) return;

    paint(`${index}/${state.total} · 프로필 메뉴 열기`);
    const menuButton = await waitFor(
      profileMenuButton,
      '프로필의 점 3개 메뉴',
      30000,
    );
    await click(menuButton, '프로필의 점 3개 메뉴');
    await waitFor(
      privateSnapshotButton,
      '비공개로 전환 메뉴',
      20000,
    );
  };

  const convertAttempt = async (index, attempt) => {
    const profileRoute = routeKey();
    const anchorId = `${Date.now()}_${index}_${attempt}`;

    history.pushState(
      {
        ...(history.state && typeof history.state === 'object'
          ? history.state
          : {}),
        __zetaSavedProfile: anchorId,
      },
      '',
      profileUrl,
    );

    await openProfileMenu(index);

    paint(`${index}/${state.total} · 비공개로 전환 선택`);
    await click(
      await waitFor(
        privateSnapshotButton,
        '비공개로 전환 메뉴',
        20000,
      ),
      '비공개로 전환',
    );

    paint(`${index}/${state.total} · 전환 확인`);
    await click(
      await waitFor(confirmButton, '전환 확인창', 20000),
      '전환',
    );

    try {
      await waitForNewRoom(profileRoute, index, attempt);
    } catch (error) {
      if (routeKey() === profileRoute) {
        error.retryNewRoom = true;
        error.anchorId = anchorId;
      }
      throw error;
    }
    await sleep(700);

    paint(`${index}/${state.total} · 저장한 프로필로 복귀`);
    await historyBack();
    await waitFor(
      () =>
        location.href === profileUrl &&
        routeKey() === profileRoute &&
        profileMenuButton(),
      '저장한 프로필 복귀',
      45000,
    );

    if (history.state?.__zetaSavedProfile === anchorId) {
      await historyBack();
      await waitFor(
        () => location.href === profileUrl && profileMenuButton(),
        '저장한 프로필 원본 복귀',
        30000,
      );
    }
    await sleep(700);
  };

  const convertFromProfile = async (index) => {
    const maxAttempts = 4;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await convertAttempt(index, attempt);
        return;
      } catch (error) {
        if (!error?.retryNewRoom) throw error;

        if (history.state?.__zetaSavedProfile === error.anchorId) {
          await historyBack(15000);
          await waitFor(
            () => location.href === profileUrl && profileMenuButton(),
            '재시도 전 저장한 프로필 복귀',
            20000,
          );
        }

        if (attempt === maxAttempts) {
          throw new Error(
            '새 비공개 방으로 이동하지 않아 4회 시도 후 중단',
          );
        }

        paint(
          `${index}/${state.total} · 이동 재시도 (${attempt + 1}/${maxAttempts})`,
        );
      }
    }
  };

  (async () => {
    try {
      await waitFor(
        profileMenuButton,
        '캐릭터 프로필의 점 3개 메뉴',
        15000,
      );

      for (let index = 1; index <= state.total; index += 1) {
        await convertFromProfile(index);
        state.done = index;
        paint(`${state.done}/${state.total} · 완료`);
        await sleep(800);
      }

      finish(`완료 · ${state.done}개 비공개 방 생성`);
    } catch (error) {
      if (error?.message === '__STOP__') return;
      console.error('[ZETA 프로필 비캐 저장기]', error);
      finish(`중단 · ${error?.message || error}`);
    }
  })();
};
  const installedLauncher = window[LAUNCHER_API_KEY];
  if (installedLauncher?.ensure) {
    const isNewRuntime =
      IS_RUNTIME && installedLauncher.version !== SCRIPT_VERSION;
    if (!isNewRuntime) {
      installedLauncher.ensure();
      if (IS_BOOKMARKLET) setTimeout(() => installedLauncher.run?.(), 0);
      return;
    }
    installedLauncher.destroy?.();
    document.getElementById(LAUNCHER_ID)?.remove();
  }
  let launcherObserver = null;
  let launcherCleanup = null;
  let launcherTerminated = false;
  let pageShowListening = false;
  let domReadyListening = false;

  const installLauncherStyle = () => {
    if (document.getElementById(LAUNCHER_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = LAUNCHER_STYLE_ID;
    style.textContent = `
      #${LAUNCHER_ID} {
        all: initial;
        box-sizing: border-box;
        position: fixed;
        right: 12px;
        bottom: 28px;
        z-index: 2147483647;
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        margin: 0;
        padding: 0;
        overflow: hidden;
        appearance: none;
        -webkit-appearance: none;
        border: 1px solid rgba(40, 35, 55, .16);
        border-radius: 50%;
        background: #f4f3f6;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, .78),
          0 5px 16px rgba(31, 24, 51, .24);
        color: #141318;
        cursor: pointer;
        pointer-events: auto;
        isolation: isolate;
        -webkit-tap-highlight-color: transparent;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        transition: transform .14s ease, border-color .14s ease, box-shadow .14s ease;
      }
      #${LAUNCHER_ID}:hover { transform: translateY(-1px); }
      #${LAUNCHER_ID}:active { transform: scale(.96); }
      #${LAUNCHER_ID}[data-dragging="true"] {
        cursor: grabbing;
        transform: none;
        transition: none;
      }
      #${LAUNCHER_ID}:focus-visible {
        outline: 2px solid #9688f6;
        outline-offset: 3px;
      }
      #${LAUNCHER_ID}[data-running="true"] {
        border-color: #9688f6;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, .78),
          0 0 0 2px rgba(150, 136, 246, .26),
          0 5px 16px rgba(31, 24, 51, .24);
      }
      #${LAUNCHER_ID} > .zeta-private-saver-icon {
        box-sizing: border-box;
        position: absolute;
        top: 50%;
        left: 50%;
        display: block;
        width: 22px;
        height: 22px;
        max-width: none;
        max-height: none;
        margin: 0;
        padding: 0;
        border: 0;
        object-fit: contain;
        pointer-events: none;
        transform: translate(-50%, -50%);
        user-select: none;
        -webkit-user-select: none;
      }
      @media (prefers-reduced-motion: reduce) {
        #${LAUNCHER_ID} { transition: none; }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  const installLauncher = () => {
    if (launcherTerminated) return;
    installLauncherStyle();
    if (document.getElementById(LAUNCHER_ID) || !document.body) return;
    launcherCleanup?.();

    const host = document.createElement('button');
    host.id = LAUNCHER_ID;
    host.type = 'button';
    host.dataset.running = 'false';
    host.dataset.dragging = 'false';
    host.setAttribute('aria-label', '프로필 비캐 저장기 실행');
    host.setAttribute('aria-pressed', 'false');
    host.title = '프로필 비캐 저장기 실행';
    const icon = document.createElement('img');
    icon.className = 'zeta-private-saver-icon';
    icon.src = ICON_DATA;
    icon.alt = '';
    host.appendChild(icon);
    document.body.appendChild(host);
    const button = host;
    const buttonSize = 32;
    const viewportGap = 6;
    let statusTimer = 0;
    let drag = null;
    let suppressClick = false;
    let activationTimer = 0;
    let lastActivationAt = 0;
    const doubleClickWindow = 360;

    const clamp = (value, minimum, maximum) =>
      Math.min(Math.max(value, minimum), maximum);

    const readPosition = () => {
      try {
        const position = JSON.parse(localStorage.getItem(POSITION_KEY));
        if (
          Number.isFinite(position?.x) &&
          Number.isFinite(position?.y)
        ) {
          return position;
        }
      } catch (_) {}
      return null;
    };

    const applyPosition = (position = readPosition()) => {
      if (!position) return;
      const availableX = Math.max(
        0,
        innerWidth - buttonSize - viewportGap * 2,
      );
      const availableY = Math.max(
        0,
        innerHeight - buttonSize - viewportGap * 2,
      );
      host.style.right = 'auto';
      host.style.bottom = 'auto';
      host.style.left =
        viewportGap + clamp(position.x, 0, 1) * availableX + 'px';
      host.style.top =
        viewportGap + clamp(position.y, 0, 1) * availableY + 'px';
    };

    const savePosition = () => {
      const rect = host.getBoundingClientRect();
      const availableX = Math.max(
        0,
        innerWidth - buttonSize - viewportGap * 2,
      );
      const availableY = Math.max(
        0,
        innerHeight - buttonSize - viewportGap * 2,
      );
      const position = {
        x: availableX
          ? clamp((rect.left - viewportGap) / availableX, 0, 1)
          : 0,
        y: availableY
          ? clamp((rect.top - viewportGap) / availableY, 0, 1)
          : 0,
      };
      try {
        localStorage.setItem(POSITION_KEY, JSON.stringify(position));
      } catch (_) {}
    };

    const syncStatus = () => {
      const running = Boolean(window[SAVER_KEY]?.running);
      button.dataset.running = String(running);
      button.setAttribute('aria-pressed', String(running));
      button.title = running
        ? '프로필 비캐 저장기 실행 중 · 더블클릭하면 종료'
        : '프로필 비캐 저장기 실행 · 더블클릭하면 종료';

      clearTimeout(statusTimer);
      if (running) statusTimer = setTimeout(syncStatus, 500);
    };

    const beginDrag = (pointerId, clientX, clientY) => {
      const rect = host.getBoundingClientRect();
      drag = {
        pointerId,
        startX: clientX,
        startY: clientY,
        left: rect.left,
        top: rect.top,
        moved: false,
      };
      suppressClick = false;
      button.dataset.dragging = 'true';
      button.setAttribute('aria-grabbed', 'true');
    };

    const moveDrag = (pointerId, clientX, clientY, event) => {
      if (!drag || pointerId !== drag.pointerId) return;
      const deltaX = clientX - drag.startX;
      const deltaY = clientY - drag.startY;
      if (!drag.moved && Math.hypot(deltaX, deltaY) < 4) return;

      drag.moved = true;
      event.preventDefault();
      const maxLeft = Math.max(
        viewportGap,
        innerWidth - buttonSize - viewportGap,
      );
      const maxTop = Math.max(
        viewportGap,
        innerHeight - buttonSize - viewportGap,
      );
      host.style.right = 'auto';
      host.style.bottom = 'auto';
      host.style.left =
        clamp(drag.left + deltaX, viewportGap, maxLeft) + 'px';
      host.style.top =
        clamp(drag.top + deltaY, viewportGap, maxTop) + 'px';
    };

    const finishDrag = (pointerId, event) => {
      if (!drag || pointerId !== drag.pointerId) return;
      const moved = drag.moved;
      if (moved) {
        event.preventDefault();
        savePosition();
        suppressClick = true;
        setTimeout(() => {
          suppressClick = false;
        }, 0);
      }
      button.dataset.dragging = 'false';
      button.setAttribute('aria-grabbed', 'false');
      drag = null;
    };

    if ('PointerEvent' in window) {
      button.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        beginDrag(event.pointerId, event.clientX, event.clientY);
        try {
          button.setPointerCapture(event.pointerId);
        } catch (_) {}
      });
      button.addEventListener(
        'pointermove',
        (event) =>
          moveDrag(
            event.pointerId,
            event.clientX,
            event.clientY,
            event,
          ),
        { passive: false },
      );
      const endPointerDrag = (event) => {
        finishDrag(event.pointerId, event);
        try {
          button.releasePointerCapture(event.pointerId);
        } catch (_) {}
      };
      button.addEventListener('pointerup', endPointerDrag);
      button.addEventListener('pointercancel', endPointerDrag);
    } else {
      button.addEventListener(
        'touchstart',
        (event) => {
          const touch = event.changedTouches[0];
          if (!touch) return;
          beginDrag(
            'touch-' + touch.identifier,
            touch.clientX,
            touch.clientY,
          );
        },
        { passive: true },
      );
      button.addEventListener(
        'touchmove',
        (event) => {
          const touch = [...event.changedTouches].find(
            (item) => 'touch-' + item.identifier === drag?.pointerId,
          );
          if (!touch) return;
          moveDrag(
            'touch-' + touch.identifier,
            touch.clientX,
            touch.clientY,
            event,
          );
        },
        { passive: false },
      );
      const endTouchDrag = (event) => {
        const touch = [...event.changedTouches].find(
          (item) => 'touch-' + item.identifier === drag?.pointerId,
        );
        if (!touch) return;
        finishDrag('touch-' + touch.identifier, event);
      };
      button.addEventListener('touchend', endTouchDrag);
      button.addEventListener('touchcancel', endTouchDrag);
    }
    button.addEventListener('click', (event) => {
      if (suppressClick) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      const now = Date.now();
      if (now - lastActivationAt <= doubleClickWindow) {
        event.preventDefault();
        event.stopImmediatePropagation();
        clearTimeout(activationTimer);
        activationTimer = 0;
        lastActivationAt = 0;
        destroyLauncher();
        return;
      }
      lastActivationAt = now;
      clearTimeout(activationTimer);
      activationTimer = setTimeout(() => {
        activationTimer = 0;
        lastActivationAt = 0;
        runSaver();
        syncStatus();
      }, doubleClickWindow);
    });
    const handleResize = () => applyPosition();
    addEventListener('resize', handleResize);
    launcherCleanup = () => {
      clearTimeout(statusTimer);
      clearTimeout(activationTimer);
      removeEventListener('resize', handleResize);
    };
    applyPosition();
    syncStatus();
  };

  const startLauncherGuard = () => {
    if (
      launcherTerminated ||
      launcherObserver ||
      !document.documentElement
    ) return;
    launcherObserver = new MutationObserver(() => {
      if (
        !launcherTerminated &&
        (
          !document.getElementById(LAUNCHER_ID) ||
          !document.getElementById(LAUNCHER_STYLE_ID)
        )
      ) installLauncher();
    });
    launcherObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  };

  const ensureLauncher = () => {
    if (launcherTerminated) return;
    installLauncher();
    startLauncherGuard();
  };

  const handlePageShow = () => ensureLauncher();
  const handleDomReady = () => {
    domReadyListening = false;
    ensureLauncher();
  };

  const destroyLauncher = () => {
    launcherTerminated = true;
    const activeSaver = window[SAVER_KEY];
    if (activeSaver?.running) {
      activeSaver.stop('아이콘을 종료했습니다.');
    }
    launcherObserver?.disconnect();
    launcherObserver = null;
    launcherCleanup?.();
    launcherCleanup = null;
    if (pageShowListening) {
      removeEventListener('pageshow', handlePageShow);
      pageShowListening = false;
    }
    if (domReadyListening) {
      document.removeEventListener('DOMContentLoaded', handleDomReady);
      domReadyListening = false;
    }
    document.getElementById(LAUNCHER_ID)?.remove();
    document.getElementById(LAUNCHER_STYLE_ID)?.remove();
    document.getElementById('__zeta_private_auto_panel')?.remove();
    if (window[SAVER_KEY] === activeSaver) delete window[SAVER_KEY];
    if (window[LAUNCHER_API_KEY]?.version === SCRIPT_VERSION) {
      delete window[LAUNCHER_API_KEY];
    }
  };

  const boot = () => {
    launcherTerminated = false;
    window[LAUNCHER_API_KEY] = {
      version: SCRIPT_VERSION,
      ensure: ensureLauncher,
      run: runSaver,
      destroy: destroyLauncher,
    };
    if (document.readyState === 'loading') {
      domReadyListening = true;
      document.addEventListener('DOMContentLoaded', handleDomReady, {
        once: true,
      });
    } else {
      ensureLauncher();
    }
    if (!pageShowListening) {
      addEventListener('pageshow', handlePageShow);
      pageShowListening = true;
    }
  };

  if (IS_RUNTIME) {
    boot();
    if (IS_BOOKMARKLET) setTimeout(runSaver, 0);
    return;
  }

  const requestLatest = () =>
    new Promise((resolve, reject) => {
      const callbackApi =
        typeof globalThis.GM_xmlhttpRequest === 'function'
          ? globalThis.GM_xmlhttpRequest
          : null;
      const promiseApi =
        typeof globalThis.GM?.xmlHttpRequest === 'function'
          ? globalThis.GM.xmlHttpRequest.bind(globalThis.GM)
          : null;
      const requestApi = callbackApi || promiseApi;

      if (!requestApi) {
        fetch(RUNTIME_URL + '?v=' + Date.now(), {
          cache: 'no-store',
          credentials: 'omit',
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`최신 파일 응답 오류: ${response.status}`);
            }
            return response.text();
          })
          .then(resolve, reject);
        return;
      }

      let settled = false;
      const watchdog = setTimeout(
        () => fail(new Error('최신 파일 요청 시간 초과')),
        5000,
      );
      const pass = (response) => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        const status = Number(response?.status || 0);
        const source = response?.responseText || response?.response;
        if (
          typeof source === 'string' &&
          source &&
          (status === 0 || (status >= 200 && status < 300))
        ) {
          resolve(source);
          return;
        }
        reject(new Error(`최신 파일 응답 오류: ${status}`));
      };
      const fail = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        reject(error instanceof Error ? error : new Error('최신 파일 요청 실패'));
      };

      try {
        const result = requestApi({
          method: 'GET',
          url: RUNTIME_URL + '?v=' + Date.now(),
          timeout: 15000,
          nocache: true,
          onload: pass,
          onerror: fail,
          ontimeout: fail,
        });
        if (result && typeof result.then === 'function') {
          result.then(pass, fail);
        }
      } catch (error) {
        fail(error);
      }
    });

  const executeLatest = (latestSource) => {
    window[RUNTIME_EXECUTION_KEY] = true;
    try {
      Function(latestSource)();
    } finally {
      delete window[RUNTIME_EXECUTION_KEY];
    }
  };

  const loadWithScriptTag = () => {
    const runtime = document.createElement('script');
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(watchdog);
      runtime.remove();
    };
    const watchdog = setTimeout(finish, 5000);
    runtime.src = RUNTIME_URL + '?v=' + Date.now();
    runtime.dataset.zetaRuntime = '1';
    runtime.dataset.zetaAutoUpdate = '1';
    runtime.onload = finish;
    runtime.onerror = finish;
    (document.head || document.documentElement).appendChild(runtime);
  };

  // 폰의 일부 유저스크립트 앱이 GM 요청 콜백을 돌려주지 않아도
  // 내장본은 즉시 실행되고, 최신판 확인만 백그라운드에서 진행합니다.
  boot();
  requestLatest().then(executeLatest).catch(loadWithScriptTag);
})();
