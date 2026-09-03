(() => {
    'use strict';

    const K = '__ZETA_OR_ROUTER_BOOKMARKLET_V1__';
    const W = window;
    const X = XMLHttpRequest.prototype;

    if (W[K]) return;


    const OF = W.fetch;
    const OO = X.open;
    const OS = X.send;
    const OJ = JSON.stringify;

    let count = 0;


    /*
     * ==========================================================
     * 모델 판별
     * ==========================================================
     */

    function getRule(model) {

        const m = String(model || '').toLowerCase();


        /*
         * DeepSeek V4 Flash 0731
         * → CoreWeave ONLY
         */
        if (
            m === 'deepseek/deepseek-v4-flash-0731' ||
            m === 'deepseek/deepseek-v4-flash-20260731' ||
            (
                m.includes('deepseek') &&
                m.includes('v4') &&
                m.includes('flash') &&
                (
                    m.includes('0731') ||
                    m.includes('20260731')
                )
            )
        ) {
            return {
                model: 'deepseek/deepseek-v4-flash-0731',
                provider: 'coreweave',
                flex: false,
                label: 'DEEPSEEK → COREWEAVE'
            };
        }


        /*
         * Gemma 4 31B
         * → Friendli ONLY
         */
        if (
            m === 'google/gemma-4-31b-it' ||
            m === 'gemma-4-31b-it' ||
            (
                m.includes('gemma') &&
                m.includes('4') &&
                m.includes('31b') &&
                (
                    m.includes('-it') ||
                    m.includes('instruct')
                )
            )
        ) {
            return {
                model: 'google/gemma-4-31b-it',
                provider: 'friendli',
                flex: false,
                label: 'GEMMA → FRIENDLI'
            };
        }


        /*
         * Gemini 3.7 Flash
         * → Google Vertex ONLY
         * → Flex
         */
        if (
            m === 'google/gemini-3.7-flash' ||
            (
                m.includes('gemini') &&
                m.includes('3.7') &&
                m.includes('flash')
            )
        ) {
            return {
                model: 'google/gemini-3.7-flash',
                provider: 'google-vertex',
                flex: true,
                label: 'GEMINI → VERTEX FLEX'
            };
        }


        return null;
    }


    /*
     * ==========================================================
     * 상태 표시
     * ==========================================================
     */

    function badge(text) {

        count++;

        let d =
            document.getElementById('__zeta_or_router_badge__');

        if (!d) {

            d = document.createElement('div');

            d.id = '__zeta_or_router_badge__';

            Object.assign(d.style, {
                position: 'fixed',
                top: '12px',
                right: '12px',
                zIndex: '2147483647',

                background: '#111',
                color: '#fff',

                padding: '9px 13px',
                borderRadius: '8px',

                font: '12px sans-serif',
                fontWeight: '600',

                boxShadow: '0 2px 10px #0005',

                pointerEvents: 'none',
                whiteSpace: 'nowrap'
            });

            document.documentElement.appendChild(d);
        }

        d.textContent =
            `${text} ✓  #${count}`;

        d.style.display = 'block';

        clearTimeout(d.__timer);

        d.__timer = setTimeout(() => {
            d.style.display = 'none';
        }, 3000);
    }


    /*
     * ==========================================================
     * 요청 객체 수정
     * ==========================================================
     */

    function patchObject(obj) {

        if (
            !obj ||
            typeof obj !== 'object' ||
            Array.isArray(obj)
        ) {
            return {
                value: obj,
                changed: false
            };
        }


        const rule = getRule(obj.model);

        if (!rule) {
            return {
                value: obj,
                changed: false
            };
        }


        const p = obj.provider || {};


        const already =
            obj.model === rule.model &&

            Array.isArray(p.only) &&
            p.only.length === 1 &&
            String(p.only[0]).toLowerCase() === rule.provider &&

            Array.isArray(p.order) &&
            p.order.length === 1 &&
            String(p.order[0]).toLowerCase() === rule.provider &&

            p.allow_fallbacks === false &&

            (
                rule.flex
                    ? obj.service_tier === 'flex'
                    : obj.service_tier === undefined
            );


        if (already) {
            return {
                value: obj,
                changed: false
            };
        }


        const patched = {
            ...obj,

            model: rule.model,

            provider: {
                only: [rule.provider],
                order: [rule.provider],
                allow_fallbacks: false
            }
        };


        if (rule.flex) {

            patched.service_tier = 'flex';

        } else {

            delete patched.service_tier;
        }


        badge(rule.label);


        console.log(
            `[ZETA Router] ${rule.label}`,
            patched
        );


        return {
            value: patched,
            changed: true
        };
    }


    /*
     * ==========================================================
     * 문자열 Body 수정
     * ==========================================================
     */

    function patchText(body) {

        if (typeof body !== 'string') {
            return body;
        }

        try {

            const obj = JSON.parse(body);

            const r = patchObject(obj);

            if (!r.changed) {
                return body;
            }

            return OJ.call(JSON, r.value);

        } catch {

            return body;
        }
    }


    
    /*
     * ==========================================================
     * fetch
     * ==========================================================
     */

    W.fetch = async function(input, init) {

        try {

            if (
                init &&
                typeof init.body === 'string'
            ) {

                const body =
                    patchText(init.body);

                if (body !== init.body) {

                    init = {
                        ...init,
                        body
                    };
                }


                return OF.call(
                    this,
                    input,
                    init
                );
            }


            if (input instanceof Request) {

                const method =
                    String(
                        init?.method ||
                        input.method ||
                        'GET'
                    ).toUpperCase();


                if (
                    method !== 'GET' &&
                    method !== 'HEAD' &&
                    !(init && init.body)
                ) {

                    const original =
                        await input.clone().text();

                    const body =
                        patchText(original);


                    if (body !== original) {

                        const request =
                            new Request(
                                input,
                                {
                                    ...(init || {}),
                                    body
                                }
                            );


                        return OF.call(
                            this,
                            request
                        );
                    }
                }
            }

        } catch (e) {

            console.warn(
                '[ZETA Router] fetch error',
                e
            );
        }


        return OF.call(
            this,
            input,
            init
        );
    };


    /*
     * ==========================================================
     * XMLHttpRequest
     * ==========================================================
     */

    X.open = function(method, url) {

        this.__zetaRouterUrl =
            String(url || '');

        return OO.apply(
            this,
            arguments
        );
    };


    X.send = function(body) {

        if (typeof body === 'string') {

            body =
                patchText(body);
        }

        return OS.call(
            this,
            body
        );
    };


    /*
     * 원본 저장
     */
    W[K] = {
        fetch: OF,
        open: OO,
        send: OS,
        stringify: OJ
    };


    badge('ZETA ROUTER ON');


    console.log(
        '[ZETA Router] ON\n' +
        'DeepSeek → CoreWeave\n' +
        'Gemma → Friendli\n' +
        'Gemini → Google Vertex / Flex'
    );

})();
