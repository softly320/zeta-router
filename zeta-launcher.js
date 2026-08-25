(() => {
    'use strict';

    const KEY = '__ZETA_TOOLBOX_V1__';
    const ROUTER_KEY = '__ZETA_OR_ROUTER_BOOKMARKLET_V1__';

    const BASE =
        'https://cdn.jsdelivr.net/gh/softly320/zeta-router@main/';

    const URLS = {
        router: BASE + 'zeta-router.js',
        feed: BASE + 'zeta-feed.js',
        theme: BASE + 'zeta-theme.js',
        narrator: BASE + 'zeta-narrator.js',

        kit: 'https://zetakit.pages.dev/run.js',
        phone: 'https://inpocket.pages.dev/inpocket.js'
    };

    const BUTTON_ID = '__zeta_toolbox_button__';
    const MENU_ID = '__zeta_toolbox_menu__';
    const STYLE_ID = '__zeta_toolbox_style__';

    const POS_KEY = '__ZETA_TOOLBOX_POSITION__';

    /*
     * 이미 설치된 경우
     * 새로 만들지 않고 메뉴만 열고 닫기
     */
    if (window[KEY]) {
        try {
            window[KEY].toggle();
        } catch (_) {}
        return;
    }


    /* =========================================================
       공용 외부 JS 로더
       ========================================================= */

    function loadScript(url, onload, onerror) {

        const s = document.createElement('script');

        s.src =
            url +
            (url.includes('?') ? '&' : '?') +
            't=' +
            Date.now();

        s.onload = () => {
            s.remove();

            if (typeof onload === 'function') {
                onload();
            }
        };

        s.onerror = () => {
            s.remove();

            if (typeof onerror === 'function') {
                onerror();
            } else {
                alert('스크립트 로드 실패:\n' + url);
            }
        };

        (
            document.head ||
            document.documentElement
        ).appendChild(s);
    }


    /* =========================================================
       Provider Router
       기본적으로 항상 ON
       ========================================================= */

    function ensureRouter(done) {

        if (window[ROUTER_KEY]) {

            updateRouterState();

            if (done) done();

            return;
        }

        loadScript(
            URLS.router,

            () => {
                console.log(
                    '[ZETA Toolbox] Provider Router ON'
                );

                updateRouterState();

                if (done) done();
            },

            () => {
                alert(
                    'Provider Router를 불러오지 못했습니다.'
                );

                updateRouterState();

                if (done) done();
            }
        );
    }


    /* =========================================================
       KIT
       ========================================================= */

    function openKit() {

        ensureRouter(() => {

            loadScript(
                URLS.kit,
                () => {
                    console.log(
                        '[ZETA Toolbox] ZetaKit 실행'
                    );
                }
            );

        });
    }


    /* =========================================================
       FEED
       ========================================================= */

    function openFeed() {

        loadScript(
            URLS.feed,

            () => {
                console.log(
                    '[ZETA Toolbox] Feed 실행'
                );
            }
        );
    }


    /* =========================================================
       THEME
       ========================================================= */

    function applyTheme() {

        loadScript(
            URLS.theme,

            () => {
                console.log(
                    '[ZETA Toolbox] Theme 적용'
                );
            }
        );
    }


    /* =========================================================
       PHONE / inPocket
       기존 북마클릿 동작 보존
       ========================================================= */

    function openPhone() {

        try {
            window.__INPOCKET__?.destroy?.();
        } catch (_) {}


        document
            .querySelectorAll(
                'script[data-zeta-toolbox-inpocket]'
            )
            .forEach(s => s.remove());


        const s =
            document.createElement('script');

        s.dataset.zetaToolboxInpocket = '1';

        s.src =
            URLS.phone +
            '?cb=' +
            Date.now();


        s.onload = () => {

            try {
                window.__INPOCKET__?.open?.();
            } catch (_) {}

        };


        s.onerror = () => {

            alert(
                'inPocket 스크립트를 불러오지 못했습니다.'
            );
        };


        (
            document.head ||
            document.documentElement
        ).appendChild(s);
    }


    /* =========================================================
       NARRATOR FORMATTER
       ========================================================= */

    function openNarrator() {

        loadScript(
            URLS.narrator,

            () => {
                console.log(
                    '[ZETA Toolbox] 나레삭제 실행'
                );
            }
        );
    }


    /* =========================================================
       STYLE
       ========================================================= */

    function addStyle() {

        if (
            document.getElementById(STYLE_ID)
        ) {
            return;
        }


        const style =
            document.createElement('style');

        style.id = STYLE_ID;


        style.textContent = `

#${BUTTON_ID} {
    position: fixed;

    right: 14px;
    bottom: calc(
        90px + env(safe-area-inset-bottom, 0px)
    );

    width: 44px;
    height: 44px;

    padding: 0;
    margin: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    z-index: 2147483646;

    border:
        1px solid rgba(255,255,255,.20);

    border-radius: 9999px;

    background:
        linear-gradient(
            145deg,
            rgba(45,48,58,.96),
            rgba(20,22,28,.96)
        );

    color: #fff;

    font:
        800 15px/1
        system-ui,
        -apple-system,
        sans-serif;

    box-shadow:
        0 6px 22px rgba(0,0,0,.30),
        inset 0 1px 0 rgba(255,255,255,.08);

    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);

    cursor: grab;

    user-select: none;
    -webkit-user-select: none;

    touch-action: none;
    -webkit-tap-highlight-color: transparent;
}


#${BUTTON_ID}:active {
    transform: scale(.94);
}


#${BUTTON_ID}[data-dragging="1"] {
    cursor: grabbing;
    transform: scale(1.04);
}


#${BUTTON_ID} .zeta-toolbox-dot {

    position: absolute;

    top: 3px;
    right: 3px;

    width: 8px;
    height: 8px;

    border-radius: 999px;

    background: #ef4444;

    border:
        1.5px solid rgba(20,22,28,.95);

    box-shadow:
        0 0 5px rgba(239,68,68,.45);
}


#${BUTTON_ID}[data-router="on"]
.zeta-toolbox-dot {

    background: #22c55e;

    box-shadow:
        0 0 7px rgba(34,197,94,.65);
}


#${MENU_ID} {

    position: fixed;

    z-index: 2147483647;

    width: 154px;

    padding: 7px;

    display: none;

    border:
        1px solid rgba(255,255,255,.13);

    border-radius: 15px;

    background:
        rgba(22,24,30,.95);

    color: #fff;

    box-shadow:
        0 10px 32px rgba(0,0,0,.36);

    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);

    font-family:
        system-ui,
        -apple-system,
        sans-serif;
}


#${MENU_ID}[data-open="1"] {
    display: block;
}


#${MENU_ID}
.zeta-toolbox-head {

    display: flex;
    align-items: center;
    justify-content: space-between;

    padding:
        4px 7px 7px;

    margin-bottom: 3px;

    color:
        rgba(255,255,255,.55);

    font-size: 10px;

    border-bottom:
        1px solid rgba(255,255,255,.08);
}


#${MENU_ID}
.zeta-router-state {

    color: #ef4444;
}


#${MENU_ID}
.zeta-router-state[data-on="1"] {

    color: #4ade80;
}


#${MENU_ID}
.zeta-toolbox-item {

    width: 100%;
    height: 38px;

    display: flex;
    align-items: center;

    gap: 9px;

    padding:
        0 10px;

    border: 0;
    border-radius: 10px;

    background: transparent;

    color:
        rgba(255,255,255,.92);

    text-align: left;

    font:
        600 13px/1
        system-ui,
        -apple-system,
        sans-serif;

    cursor: pointer;

    -webkit-tap-highlight-color:
        transparent;
}


#${MENU_ID}
.zeta-toolbox-item:active {

    background:
        rgba(255,255,255,.10);
}


#${MENU_ID}
.zeta-toolbox-icon {

    width: 20px;

    display: inline-flex;

    justify-content: center;

    font-size: 15px;

    pointer-events: none;
}


#${MENU_ID}
.zeta-toolbox-label {

    pointer-events: none;
}

`;

        (
            document.head ||
            document.documentElement
        ).appendChild(style);
    }


    /* =========================================================
       UI
       ========================================================= */

    addStyle();


    const button =
        document.createElement('button');

    button.id = BUTTON_ID;
    button.type = 'button';

    button.innerHTML =
        '<span>Z</span>' +
        '<span class="zeta-toolbox-dot"></span>';


    const menu =
        document.createElement('div');

    menu.id = MENU_ID;
    menu.dataset.open = '0';


    menu.innerHTML = `

<div class="zeta-toolbox-head">

    <span>ZETA TOOLS</span>

    <span class="zeta-router-state">
        ROUTER
    </span>

</div>

<button
    class="zeta-toolbox-item"
    data-action="kit"
>
    <span class="zeta-toolbox-icon">⚙</span>
    <span class="zeta-toolbox-label">키트</span>
</button>

<button
    class="zeta-toolbox-item"
    data-action="feed"
>
    <span class="zeta-toolbox-icon">💬</span>
    <span class="zeta-toolbox-label">피드</span>
</button>

<button
    class="zeta-toolbox-item"
    data-action="theme"
>
    <span class="zeta-toolbox-icon">✦</span>
    <span class="zeta-toolbox-label">테마</span>
</button>

<button
    class="zeta-toolbox-item"
    data-action="phone"
>
    <span class="zeta-toolbox-icon">☎</span>
    <span class="zeta-toolbox-label">폰</span>
</button>

<button
    class="zeta-toolbox-item"
    data-action="narrator"
>
    <span class="zeta-toolbox-icon">N×</span>
    <span class="zeta-toolbox-label">나레삭제</span>
</button>

`;


    (
        document.body ||
        document.documentElement
    ).append(
        button,
        menu
    );


    /* =========================================================
       Router 표시
       ========================================================= */

    function updateRouterState() {

        const on =
            !!window[ROUTER_KEY];

        button.dataset.router =
            on ? 'on' : 'off';


        const state =
            menu.querySelector(
                '.zeta-router-state'
            );

        if (state) {

            state.dataset.on =
                on ? '1' : '0';

            state.textContent =
                on
                    ? 'ROUTER ON'
                    : 'ROUTER …';
        }
    }


    /* =========================================================
       Menu 위치
       ========================================================= */

    function positionMenu() {

        const b =
            button.getBoundingClientRect();

        const width =
            menu.offsetWidth || 154;

        const height =
            menu.offsetHeight || 240;


        let left =
            b.right - width;

        let top =
            b.top - height - 8;


        if (left < 6) {
            left = 6;
        }


        if (
            left + width >
            innerWidth - 6
        ) {
            left =
                innerWidth -
                width -
                6;
        }


        if (top < 6) {

            top =
                Math.min(
                    innerHeight -
                    height -
                    6,

                    b.bottom + 8
                );
        }


        menu.style.left =
            left + 'px';

        menu.style.top =
            top + 'px';
    }


    function openMenu() {

        menu.dataset.open = '1';

        requestAnimationFrame(
            positionMenu
        );

        updateRouterState();
    }


    function closeMenu() {

        menu.dataset.open = '0';
    }


    function toggleMenu() {

        if (
            menu.dataset.open === '1'
        ) {
            closeMenu();
        } else {
            openMenu();
        }
    }


    /* =========================================================
       메뉴 버튼 실행
       ========================================================= */

    menu.addEventListener(
        'click',

        event => {

            const item =
                event.target.closest(
                    '[data-action]'
                );

            if (!item) return;


            const action =
                item.dataset.action;


            closeMenu();


            if (action === 'kit') {
                openKit();
            }

            else if (action === 'feed') {
                openFeed();
            }

            else if (action === 'theme') {
                applyTheme();
            }

            else if (action === 'phone') {
                openPhone();
            }

            else if (
                action === 'narrator'
            ) {
                openNarrator();
            }
        }
    );


    /* =========================================================
       Drag
       ========================================================= */

    let pointerId = null;

    let moved = false;

    let startX = 0;
    let startY = 0;

    let startLeft = 0;
    let startTop = 0;


    button.addEventListener(
        'pointerdown',

        event => {

            pointerId =
                event.pointerId;

            moved = false;

            const rect =
                button.getBoundingClientRect();

            startX =
                event.clientX;

            startY =
                event.clientY;

            startLeft =
                rect.left;

            startTop =
                rect.top;


            button.dataset.dragging =
                '1';


            try {
                button.setPointerCapture(
                    pointerId
                );
            } catch (_) {}


            event.preventDefault();
        }
    );


    button.addEventListener(
        'pointermove',

        event => {

            if (
                pointerId === null ||
                event.pointerId !==
                pointerId
            ) {
                return;
            }


            const dx =
                event.clientX -
                startX;

            const dy =
                event.clientY -
                startY;


            if (
                !moved &&
                Math.hypot(dx, dy) > 5
            ) {
                moved = true;
                closeMenu();
            }


            if (!moved) return;


            const maxX =
                innerWidth -
                button.offsetWidth -
                5;

            const maxY =
                innerHeight -
                button.offsetHeight -
                5;


            const x =
                Math.max(
                    5,
                    Math.min(
                        maxX,
                        startLeft + dx
                    )
                );


            const y =
                Math.max(
                    5,
                    Math.min(
                        maxY,
                        startTop + dy
                    )
                );


            button.style.left =
                x + 'px';

            button.style.top =
                y + 'px';

            button.style.right =
                'auto';

            button.style.bottom =
                'auto';


            event.preventDefault();
        }
    );


    function finishDrag(event) {

        if (
            pointerId === null
        ) {
            return;
        }


        if (
            event &&
            event.pointerId !==
            pointerId
        ) {
            return;
        }


        try {
            button.releasePointerCapture(
                pointerId
            );
        } catch (_) {}


        button.dataset.dragging =
            '0';


        if (moved) {

            const rect =
                button.getBoundingClientRect();

            try {

                localStorage.setItem(
                    POS_KEY,

                    JSON.stringify({
                        x: rect.left,
                        y: rect.top
                    })
                );

            } catch (_) {}

        } else {

            toggleMenu();
        }


        pointerId = null;
        moved = false;
    }


    button.addEventListener(
        'pointerup',
        finishDrag
    );


    button.addEventListener(
        'pointercancel',
        finishDrag
    );


    /* =========================================================
       저장 위치 복원
       ========================================================= */

    try {

        const saved =
            JSON.parse(
                localStorage.getItem(
                    POS_KEY
                ) || 'null'
            );


        if (
            saved &&
            Number.isFinite(saved.x) &&
            Number.isFinite(saved.y)
        ) {

            button.style.left =
                Math.max(
                    5,
                    Math.min(
                        innerWidth - 49,
                        saved.x
                    )
                ) + 'px';


            button.style.top =
                Math.max(
                    5,
                    Math.min(
                        innerHeight - 49,
                        saved.y
                    )
                ) + 'px';


            button.style.right =
                'auto';

            button.style.bottom =
                'auto';
        }

    } catch (_) {}


    /* =========================================================
       바깥 누르면 메뉴 접기
       ========================================================= */

    document.addEventListener(
        'pointerdown',

        event => {

            if (
                menu.dataset.open !== '1'
            ) {
                return;
            }


            if (
                menu.contains(event.target) ||
                button.contains(event.target)
            ) {
                return;
            }


            closeMenu();
        },

        true
    );


    /* =========================================================
       화면 회전 / 사이즈 변경
       ========================================================= */

    window.addEventListener(
        'resize',

        () => {

            const r =
                button.getBoundingClientRect();


            const x =
                Math.max(
                    5,

                    Math.min(
                        innerWidth -
                            button.offsetWidth -
                            5,

                        r.left
                    )
                );


            const y =
                Math.max(
                    5,

                    Math.min(
                        innerHeight -
                            button.offsetHeight -
                            5,

                        r.top
                    )
                );


            button.style.left =
                x + 'px';

            button.style.top =
                y + 'px';

            button.style.right =
                'auto';

            button.style.bottom =
                'auto';


            if (
                menu.dataset.open === '1'
            ) {
                positionMenu();
            }
        }
    );


    /* =========================================================
       API
       ========================================================= */

    window[KEY] = {

        toggle:
            toggleMenu,

        open:
            openMenu,

        close:
            closeMenu,

        ensureRouter:
            ensureRouter,

        actions: {
            kit: openKit,
            feed: openFeed,
            theme: applyTheme,
            phone: openPhone,
            narrator: openNarrator
        }
    };


    /*
     * Launcher 생성 즉시
     * Provider Router ON
     */
    ensureRouter();


    updateRouterState();


    console.log(
        '[ZETA Toolbox] READY'
    );

})();
