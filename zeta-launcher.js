(()=>{
'use strict';

const KEY='__ZETA_TOOLBOX_LAUNCHER__';
const ROUTER_KEY='__ZETA_OR_ROUTER_BOOKMARKLET_V1__';
const MEMORY_INJECTOR_KEY='__ZETA_RP_MEMORY_INJECTOR__';
const MEMORY_STORE_KEY='__ZETA_RP_MEMORY_V1__';
const MEMORY_MARK='[ZETA RP MEMORY]';
const RAW='https://raw.githubusercontent.com/softly320/zeta-router/main/';

const URLS={
  router:RAW+'zeta-router.js',
  feed:RAW+'zeta-feed.js',
  theme:RAW+'zeta-theme.js',
  narrator:RAW+'zeta-narrator.js',
  kit:'https://zetakit.pages.dev/run.js',
  phone:'https://inpocket.pages.dev/inpocket.js'
};

const IDS={
  button:'__zeta_toolbox_button__',
  menu:'__zeta_toolbox_menu__',
  add:'__zeta_toolbox_add_button__',
  customModal:'__zeta_toolbox_custom_modal__',
  memoryModal:'__zeta_toolbox_memory_modal__',
  style:'__zeta_toolbox_style__'
};

const POS_KEY='__ZETA_TOOLBOX_POSITION__';
const CUSTOM_KEY='__ZETA_TOOLBOX_CUSTOM_TOOLS_V1__';


/* =========================================================
   이미 실행 중이면 OFF하지 않고 다시 열기
   ========================================================= */

if(
  window[KEY]?.show &&
  document.getElementById(IDS.button)
){
  window[KEY].show();
  window[KEY].ensureRouter?.();
  return;
}


try{
  window[KEY]?.destroy?.();
}catch(_){}

try{
  delete window[KEY];
}catch(_){
  window[KEY]=null;
}

Object.values(IDS).forEach(
  id=>
    document
      .getElementById(id)
      ?.remove()
);


/* =========================================================
   RAW / SCRIPT 로더
   ========================================================= */

async function runRaw(url){

  const r=
    await fetch(
      url+
      (url.includes('?')?'&':'?')+
      'cb='+
      Date.now(),
      {
        cache:'no-store'
      }
    );

  if(!r.ok){

    throw new Error(
      'HTTP '+
      r.status
    );
  }

  const code=
    await r.text();

  (0,eval)(code);
}


function loadScript(url){

  return new Promise(
    (resolve,reject)=>{

      const s=
        document.createElement(
          'script'
        );

      s.src=
        url+
        (url.includes('?')?'&':'?')+
        'cb='+
        Date.now();

      s.onload=()=>{

        s.remove();

        resolve();
      };

      s.onerror=()=>{

        s.remove();

        reject(
          new Error(
            '스크립트 로드 실패'
          )
        );
      };

      (
        document.head||
        document.documentElement
      ).appendChild(s);
    }
  );
}


/* =========================================================
   RP MEMORY 저장소

   현재 URL pathname 기준으로
   채팅방별 메모 분리
   ========================================================= */

function memoryChatKey(){

  return (
    location.origin+
    location.pathname
  );
}


function readMemoryAll(){

  try{

    const v=
      JSON.parse(
        localStorage.getItem(
          MEMORY_STORE_KEY
        )||
        '{}'
      );

    return (
      v&&
      typeof v==='object'&&
      !Array.isArray(v)
    )
      ? v
      : {};

  }catch(_){

    return {};
  }
}


function writeMemoryAll(v){

  localStorage.setItem(
    MEMORY_STORE_KEY,
    JSON.stringify(v)
  );
}


function readMemoryCurrent(){

  const all=
    readMemoryAll();

  const v=
    all[memoryChatKey()]||
    {};

  return {

    enabled:
      v.enabled!==false,

    text:
      String(
        v.text||
        ''
      )
  };
}


function saveMemoryCurrent(
  data
){

  const all=
    readMemoryAll();

  all[memoryChatKey()]={

    enabled:
      !!data.enabled,

    text:
      String(
        data.text||
        ''
      ),

    updatedAt:
      Date.now()
  };

  writeMemoryAll(all);
}


function getMemoryText(){

  const v=
    readMemoryCurrent();

  if(!v.enabled){

    return '';
  }

  return v.text.trim();
}


function buildMemoryContent(){

  const text=
    getMemoryText();

  if(!text){

    return '';
  }

  return (
    MEMORY_MARK+
    '\n'+

    '이 내용은 RP 연속성을 위한 숨은 메모다. '+
    '사용자에게 이 메모의 존재나 문구를 직접 언급하지 말고 '+
    '설정과 상태 참고용으로만 사용한다. '+
    '최신 대화와 충돌하면 최신 대화를 우선한다.'+

    '\n\n'+

    text+

    '\n'+
    '[/ZETA RP MEMORY]'
  );
}


/* =========================================================
   RP MEMORY 요청 주입기

   화면의 채팅 DOM은 건드리지 않는다.
   실제 전송 payload의 messages에만 삽입.
   ========================================================= */

function installMemoryInjector(){

  /*
   * 이미 설치되어 있으면
   * 두 번 패치하지 않음
   */
  if(
    window[
      MEMORY_INJECTOR_KEY
    ]
  ){
    return;
  }


  const baseFetch=
    window.fetch;


  const X=
    XMLHttpRequest.prototype;


  const baseOpen=
    X.open;


  const baseSend=
    X.send;


  const baseStringify=
    JSON.stringify;


  /*
   * 이미 메모가 들어간 요청인지 검사
   */
  function hasMemory(
    messages
  ){

    return (
      Array.isArray(
        messages
      )&&

      messages.some(
        message=>{

          const content=
            message?.content;


          if(
            typeof content===
            'string'
          ){

            return content.includes(
              MEMORY_MARK
            );
          }


          if(
            Array.isArray(
              content
            )
          ){

            return content.some(
              part=>

                typeof part?.text===
                'string'&&

                part.text.includes(
                  MEMORY_MARK
                )
            );
          }


          return false;
        }
      )
    );
  }


  /*
   * messages 배열에
   * 숨은 system 메시지 삽입
   */
  function injectPayload(
    payload
  ){

    if(
      !payload||
      typeof payload!==
      'object'||
      !Array.isArray(
        payload.messages
      )||
      hasMemory(
        payload.messages
      )
    ){

      return payload;
    }


    const content=
      buildMemoryContent();


    if(!content){

      return payload;
    }


    const copy={
      ...payload
    };


    const messages=
      payload.messages.slice();


    /*
     * 기존 system / developer 메시지가 있으면
     * 그 뒤에 RP MEMORY 삽입
     */
    let at=0;


    while(
      at<
      messages.length&&

      [
        'system',
        'developer'
      ].includes(
        messages[at]?.role
      )
    ){

      at++;
    }


    messages.splice(
      at,
      0,
      {
        role:'system',
        content
      }
    );


    copy.messages=
      messages;


    return copy;
  }


  /*
   * 요청 구조가 한 단계 안쪽에 있어도
   * messages를 찾아서 처리
   */
  function transformObject(
    value,
    depth=0
  ){

    if(
      !value||
      typeof value!==
      'object'||
      depth>4
    ){

      return value;
    }


    if(
      Array.isArray(
        value
      )
    ){

      let changed=false;


      const arr=
        value.map(
          item=>{

            const next=
              transformObject(
                item,
                depth+1
              );


            if(
              next!==
              item
            ){

              changed=true;
            }


            return next;
          }
        );


      return changed
        ? arr
        : value;
    }


    if(
      Array.isArray(
        value.messages
      )
    ){

      return injectPayload(
        value
      );
    }


    let out=
      value;


    for(
      const [
        key,
        item
      ] of
      Object.entries(value)
    ){

      if(
        item&&
        typeof item===
        'object'
      ){

        const next=
          transformObject(
            item,
            depth+1
          );


        if(
          next!==
          item
        ){

          if(
            out===
            value
          ){

            out={
              ...value
            };
          }


          out[key]=
            next;
        }
      }
    }


    return out;
  }


  /*
   * JSON 문자열 body 변환
   */
  function transformBody(
    body
  ){

    if(
      typeof body!==
      'string'
    ){

      return body;
    }


    const trimmed=
      body.trim();


    if(
      !trimmed||
      !(
        trimmed.startsWith(
          '{'
        )||
        trimmed.startsWith(
          '['
        )
      )
    ){

      return body;
    }


    try{

      const parsed=
        JSON.parse(
          body
        );


      const next=
        transformObject(
          parsed
        );


      if(
        next===
        parsed
      ){

        return body;
      }


      return baseStringify.call(
        JSON,
        next
      );


    }catch(_){

      return body;
    }
  }


  /*
   * fetch
   */
  window.fetch=
    function(
      input,
      init
    ){

      try{

        if(
          init&&
          typeof init.body===
          'string'
        ){

          const body=
            transformBody(
              init.body
            );


          if(
            body!==
            init.body
          ){

            init={
              ...init,
              body
            };
          }
        }

      }catch(error){

        console.warn(
          '[ZETA MEMORY] fetch inject failed',
          error
        );
      }


      return baseFetch.call(
        this,
        input,
        init
      );
    };


  /*
   * XHR open
   *
   * 기존 Router 패치와 연결 유지
   */
  X.open=
    function(
      ...args
    ){

      return baseOpen.apply(
        this,
        args
      );
    };


  /*
   * XHR send
   */
  X.send=
    function(
      body
    ){

      try{

        body=
          transformBody(
            body
          );

      }catch(error){

        console.warn(
          '[ZETA MEMORY] xhr inject failed',
          error
        );
      }


      return baseSend.call(
        this,
        body
      );
    };


  /*
   * JSON.stringify
   *
   * Zeta가 body를 만들 때부터
   * messages를 잡을 수 있게 함
   */
  JSON.stringify=
    function(
      value,
      ...rest
    ){

      try{

        value=
          transformObject(
            value
          );

      }catch(error){

        console.warn(
          '[ZETA MEMORY] stringify inject failed',
          error
        );
      }


      return baseStringify.call(
        JSON,
        value,
        ...rest
      );
    };


  window[
    MEMORY_INJECTOR_KEY
  ]={

    version:'1.0',

    getMemoryText,

    buildMemoryContent,

    transformObject
  };


  console.log(
    '[ZETA MEMORY] injector ON'
  );
}


installMemoryInjector();


/* =========================================================
   Router / 기본 도구
   ========================================================= */

async function ensureRouter(){

  if(
    window[
      ROUTER_KEY
    ]
  ){

    updateRouterState();

    return true;
  }


  try{

    await runRaw(
      URLS.router
    );


    updateRouterState();


    return !!window[
      ROUTER_KEY
    ];


  }catch(error){

    console.error(
      '[ZETA Toolbox] router',
      error
    );


    updateRouterState();


    alert(
      'Provider Router 로드 실패\n'+
      (
        error?.message||
        error
      )
    );


    return false;
  }
}


async function openKit(){

  try{

    await ensureRouter();

    await loadScript(
      URLS.kit
    );

  }catch(error){

    alert(
      '키트 로드 실패\n'+
      (
        error?.message||
        error
      )
    );
  }
}


async function openFeed(){

  try{

    await runRaw(
      URLS.feed
    );

  }catch(error){

    alert(
      '피드 로드 실패\n'+
      (
        error?.message||
        error
      )
    );
  }
}


async function applyTheme(){

  try{

    await runRaw(
      URLS.theme
    );

  }catch(error){

    alert(
      '테마 로드 실패\n'+
      (
        error?.message||
        error
      )
    );
  }
}


async function openNarrator(){

  try{

    await runRaw(
      URLS.narrator
    );

  }catch(error){

    alert(
      '나레삭제 로드 실패\n'+
      (
        error?.message||
        error
      )
    );
  }
}


/* =========================================================
   PHONE
   ========================================================= */

function openPhone(){

  try{

    window.__INPOCKET__
      ?.destroy
      ?.();

  }catch(_){}


  document
    .querySelectorAll(
      'script[data-zeta-toolbox-inpocket]'
    )
    .forEach(
      s=>s.remove()
    );


  const s=
    document.createElement(
      'script'
    );


  s.dataset.zetaToolboxInpocket=
    '1';


  s.src=
    URLS.phone+
    '?cb='+
    Date.now();


  s.onload=()=>{

    try{

      window.__INPOCKET__
        ?.open
        ?.();

    }catch(error){

      console.error(
        '[ZETA Toolbox] phone open',
        error
      );
    }
  };


  s.onerror=()=>{

    s.remove();


    alert(
      'inPocket 스크립트를 불러오지 못했습니다.'
    );
  };


  (
    document.head||
    document.documentElement
  ).appendChild(s);
}


/* =========================================================
   사용자 도구
   ========================================================= */

function readCustomTools(){

  try{

    const v=
      JSON.parse(
        localStorage.getItem(
          CUSTOM_KEY
        )||
        '[]'
      );


    return Array.isArray(v)
      ? v
      : [];

  }catch(_){

    return [];
  }
}


function writeCustomTools(
  v
){

  localStorage.setItem(
    CUSTOM_KEY,
    JSON.stringify(v)
  );
}


function normalizeUserCode(
  code
){

  return String(
    code||
    ''
  )
    .trim()
    .replace(
      /^javascript\s*:/i,
      ''
    )
    .trim();
}


function runCustomTool(
  tool
){

  const code=
    normalizeUserCode(
      tool?.code
    );


  if(!code){

    alert(
      '실행할 코드가 없습니다.'
    );

    return;
  }


  try{

    (0,eval)(code);

  }catch(error){

    console.error(
      '[ZETA Toolbox] custom',
      error
    );


    alert(
      '사용자 도구 실행 실패\n'+
      (
        error?.message||
        error
      )
    );
  }
}


function esc(
  value
){

  return String(
    value??
    ''
  )
    .replace(
      /[&<>"']/g,
      char=>({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[char])
    );
}


/* =========================================================
   스타일
   ========================================================= */

const style=
  document.createElement(
    'style'
  );


style.id=
  IDS.style;


style.textContent=`

#${IDS.button}{

  position:fixed;

  right:14px;

  bottom:
    calc(
      90px +
      env(
        safe-area-inset-bottom,
        0px
      )
    );

  width:44px;
  height:44px;

  padding:0;
  margin:0;

  display:flex;

  align-items:center;
  justify-content:center;

  z-index:2147483644;

  border:
    1px solid
    rgba(255,255,255,.2);

  border-radius:
    999px;

  background:
    linear-gradient(
      145deg,
      #30333d,
      #15171c
    );

  color:#fff;

  font:
    800 15px/1
    system-ui,
    -apple-system,
    sans-serif;

  box-shadow:
    0 6px 22px
    rgba(0,0,0,.32);

  cursor:grab;

  user-select:none;
  -webkit-user-select:none;

  touch-action:none;

  -webkit-tap-highlight-color:
    transparent;
}


#${IDS.button}[data-dragging="1"]{

  cursor:grabbing;
}


#${IDS.button}
.zt-dot{

  position:absolute;

  top:3px;
  right:3px;

  width:8px;
  height:8px;

  border-radius:50%;

  background:#ef4444;

  border:
    1.5px solid
    #15171c;
}


#${IDS.button}[data-router="on"]
.zt-dot{

  background:#22c55e;

  box-shadow:
    0 0 7px
    rgba(34,197,94,.65);
}


/* =========================================================
   Toolbox 메뉴
   ========================================================= */

#${IDS.menu}{

  position:fixed;

  z-index:2147483645;

  display:none;

  width:
    min(
      286px,
      calc(100vw - 20px)
    );

  box-sizing:border-box;

  padding:10px;

  border:
    1px solid
    rgba(255,255,255,.12);

  border-radius:20px;

  background:
    rgba(22,24,30,.98);

  color:#fff;

  box-shadow:
    0 14px 42px
    rgba(0,0,0,.44);

  backdrop-filter:
    blur(18px);

  -webkit-backdrop-filter:
    blur(18px);

  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}


#${IDS.menu}[data-open="1"]{

  display:block;
}


#${IDS.menu}
.zt-head{

  display:flex;

  align-items:center;

  justify-content:
    space-between;

  height:25px;

  padding:
    0 3px 8px;

  margin-bottom:9px;

  color:
    rgba(255,255,255,.55);

  font-size:10px;

  border-bottom:
    1px solid
    rgba(255,255,255,.08);
}


#${IDS.menu}
.zt-state{

  color:#ef4444;

  font-weight:700;
}


#${IDS.menu}
.zt-state[data-on="1"]{

  color:#4ade80;
}


#${IDS.menu}
.zt-scroll{

  max-height:
    min(
      48vh,
      390px
    );

  overflow-y:auto;
  overflow-x:hidden;

  padding:1px;

  -webkit-overflow-scrolling:
    touch;

  overscroll-behavior:
    contain;
}


#${IDS.menu}
.zt-grid{

  display:grid;

  grid-template-columns:
    repeat(
      2,
      minmax(0,1fr)
    );

  gap:10px;
}


#${IDS.menu}
.zt-item{

  width:100%;
  min-width:0;

  height:84px;

  box-sizing:border-box;

  display:flex;

  flex-direction:column;

  align-items:center;
  justify-content:center;

  gap:8px;

  padding:8px;

  border:
    1px solid
    rgba(255,255,255,.10);

  border-radius:16px;

  background:
    rgba(255,255,255,.048);

  color:
    rgba(255,255,255,.95);

  text-align:center;

  font:
    650 12px/1.1
    system-ui,
    -apple-system,
    sans-serif;

  cursor:pointer;

  touch-action:
    manipulation;

  -webkit-tap-highlight-color:
    transparent;
}


#${IDS.menu}
.zt-item:active{

  transform:
    scale(.965);

  background:
    rgba(255,255,255,.15);
}


#${IDS.menu}
.zt-icon{

  min-height:24px;

  display:flex;

  align-items:center;
  justify-content:center;

  font-size:21px;

  line-height:1;

  pointer-events:none;
}


#${IDS.menu}
.zt-label{

  max-width:100%;

  overflow:hidden;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;

  pointer-events:none;

  font-size:12px;
}


/* =========================================================
   별도 + 버튼
   ========================================================= */

#${IDS.add}{

  position:fixed;

  z-index:2147483646;

  display:none;

  align-items:center;
  justify-content:center;

  width:46px;
  height:46px;

  padding:0;

  border:
    1px solid
    rgba(147,197,253,.35);

  border-radius:50%;

  background:#1d212a;

  color:#93c5fd;

  font:
    300 28px/1
    system-ui;

  box-shadow:
    0 8px 26px
    rgba(0,0,0,.42);

  cursor:pointer;

  touch-action:
    manipulation;

  -webkit-tap-highlight-color:
    transparent;
}


#${IDS.add}[data-open="1"]{

  display:flex;
}


/* =========================================================
   공통 모달
   ========================================================= */

#${IDS.customModal},
#${IDS.memoryModal}{

  position:fixed;

  inset:0;

  z-index:2147483647;

  display:none;

  align-items:center;

  justify-content:center;

  box-sizing:border-box;

  padding:16px;

  background:
    rgba(0,0,0,.58);

  backdrop-filter:
    blur(6px);

  -webkit-backdrop-filter:
    blur(6px);

  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}


#${IDS.customModal}[data-open="1"],
#${IDS.memoryModal}[data-open="1"]{

  display:flex;
}


#${IDS.customModal}
.zm-card,

#${IDS.memoryModal}
.zm-card{

  width:
    min(
      440px,
      100%
    );

  max-height:86vh;

  box-sizing:border-box;

  overflow:auto;

  padding:16px;

  border:
    1px solid
    rgba(255,255,255,.13);

  border-radius:20px;

  background:#191b21;

  color:#fff;

  box-shadow:
    0 18px 60px
    rgba(0,0,0,.46);
}


#${IDS.customModal}
.zm-title,

#${IDS.memoryModal}
.zm-title{

  display:flex;

  align-items:center;

  justify-content:
    space-between;

  margin-bottom:14px;

  font:
    750 15px/1.2
    system-ui;
}


#${IDS.customModal}
.zm-close,

#${IDS.memoryModal}
.zm-close{

  width:34px;
  height:34px;

  border:0;

  border-radius:10px;

  background:
    rgba(255,255,255,.07);

  color:#fff;

  font-size:18px;
}


#${IDS.customModal}
.zm-row{

  display:grid;

  grid-template-columns:
    80px 1fr;

  gap:10px;

  margin-bottom:10px;
}


#${IDS.customModal}
label,

#${IDS.memoryModal}
label{

  display:block;

  margin:
    0 0 6px 2px;

  color:
    rgba(255,255,255,.62);

  font-size:11px;
}


#${IDS.customModal}
input,

#${IDS.customModal}
textarea,

#${IDS.memoryModal}
textarea{

  width:100%;

  box-sizing:border-box;

  border:
    1px solid
    rgba(255,255,255,.11);

  border-radius:12px;

  background:
    rgba(255,255,255,.055);

  color:#fff;

  outline:none;

  padding:
    10px 11px;
}


#${IDS.customModal}
textarea{

  min-height:150px;

  resize:vertical;

  font:
    11px/1.45
    ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
}


#${IDS.customModal}
.zm-actions{

  display:flex;

  gap:8px;

  margin-top:12px;
}


#${IDS.customModal}
.zm-btn,

#${IDS.memoryModal}
.zm-btn{

  height:40px;

  border:0;

  border-radius:12px;

  background:
    rgba(255,255,255,.07);

  color:#fff;

  font:
    700 11px/1
    system-ui;
}


#${IDS.customModal}
.zm-actions
.zm-btn{

  flex:1;
}


#${IDS.customModal}
.zm-save,

#${IDS.memoryModal}
.zm-save{

  background:#6d88cf;

  color:#fff;
}


#${IDS.customModal}
.zm-divider{

  height:1px;

  margin:
    17px 0 12px;

  background:
    rgba(255,255,255,.09);
}


#${IDS.customModal}
.zm-sub{

  margin-bottom:8px;

  color:
    rgba(255,255,255,.62);

  font-size:11px;
}


#${IDS.customModal}
.zm-list{

  display:flex;

  flex-direction:column;

  gap:7px;
}


#${IDS.customModal}
.zm-entry{

  display:grid;

  grid-template-columns:
    34px
    minmax(0,1fr)
    auto
    auto;

  gap:7px;

  align-items:center;

  padding:8px;

  border:
    1px solid
    rgba(255,255,255,.08);

  border-radius:12px;

  background:
    rgba(255,255,255,.035);
}


#${IDS.customModal}
.zm-eicon{

  text-align:center;

  font-size:18px;
}


#${IDS.customModal}
.zm-ename{

  overflow:hidden;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;

  font-size:12px;
}


#${IDS.customModal}
.zm-mini{

  height:30px;

  padding:
    0 9px;

  border:0;

  border-radius:9px;

  background:
    rgba(255,255,255,.07);

  color:#fff;

  font:
    650 10px/1
    system-ui;
}


#${IDS.customModal}
.zm-delete{

  color:#fca5a5;
}


#${IDS.customModal}
.zm-empty{

  padding:
    14px 4px;

  text-align:center;

  color:
    rgba(255,255,255,.38);

  font-size:11px;
}


/* =========================================================
   RP MEMORY 모달
   ========================================================= */

#${IDS.memoryModal}
.mm-sub{

  margin:
    -5px 0 9px;

  color:
    rgba(255,255,255,.42);

  font-size:10px;

  line-height:1.4;

  word-break:
    break-all;
}


#${IDS.memoryModal}
.mm-text{

  min-height:240px;

  resize:vertical;

  font:
    12px/1.55
    ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
}


#${IDS.memoryModal}
.mm-switchrow{

  display:flex;

  align-items:center;

  justify-content:
    space-between;

  gap:10px;

  margin-top:10px;

  padding:
    10px 11px;

  border:
    1px solid
    rgba(255,255,255,.08);

  border-radius:12px;

  background:
    rgba(255,255,255,.035);
}


#${IDS.memoryModal}
.mm-switch{

  display:flex;

  align-items:center;

  gap:8px;

  margin:0;

  color:
    rgba(255,255,255,.82);

  font-size:12px;
}


#${IDS.memoryModal}
.mm-switch
input{

  width:18px;
  height:18px;
}


#${IDS.memoryModal}
.mm-status{

  font-size:10px;

  color:#4ade80;
}


#${IDS.memoryModal}
.mm-status[data-on="0"]{

  color:#f87171;
}


#${IDS.memoryModal}
.mm-actions{

  display:grid;

  grid-template-columns:
    1fr 1fr 1fr;

  gap:8px;

  margin-top:10px;
}


#${IDS.memoryModal}
.mm-clear{

  color:#fca5a5;
}


#${IDS.memoryModal}
.mm-preview{

  display:none;

  margin-top:12px;

  padding:11px;

  border:
    1px solid
    rgba(255,255,255,.08);

  border-radius:12px;

  background:#111318;

  white-space:
    pre-wrap;

  word-break:
    break-word;

  color:
    rgba(255,255,255,.78);

  font:
    11px/1.5
    ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
}


#${IDS.memoryModal}
.mm-preview[data-open="1"]{

  display:block;
}


#${IDS.memoryModal}
.mm-note{

  margin-top:10px;

  color:
    rgba(255,255,255,.38);

  font-size:10px;

  line-height:1.45;
}
`;


(
  document.head||
  document.documentElement
).appendChild(style);


/* =========================================================
   DOM
   ========================================================= */

const button=
  document.createElement(
    'button'
  );


button.id=
  IDS.button;


button.type=
  'button';


button.innerHTML=
  '<span>Z</span>'+
  '<span class="zt-dot"></span>';


const menu=
  document.createElement(
    'div'
  );


menu.id=
  IDS.menu;


menu.dataset.open=
  '0';


menu.innerHTML=`

<div class="zt-head">

  <span>
    ZETA TOOLS
  </span>

  <span class="zt-state">
    ROUTER
  </span>

</div>

<div class="zt-scroll">

  <div class="zt-grid"></div>

</div>
`;


/*
 * +는 메뉴와 별도 DOM
 */
const addButton=
  document.createElement(
    'button'
  );


addButton.id=
  IDS.add;


addButton.type=
  'button';


addButton.dataset.open=
  '0';


addButton.textContent=
  '＋';


addButton.title=
  '도구 추가';


/* =========================================================
   사용자 도구 모달
   ========================================================= */

const customModal=
  document.createElement(
    'div'
  );


customModal.id=
  IDS.customModal;


customModal.dataset.open=
  '0';


customModal.innerHTML=`

<div class="zm-card">

  <div class="zm-title">

    <span>
      사용자 도구
    </span>

    <button
      type="button"
      class="zm-close"
    >
      ×
    </button>

  </div>


  <div class="zm-row">

    <div>

      <label>
        아이콘
      </label>

      <input
        class="zm-icon"
        maxlength="12"
        placeholder="🧩"
      >

    </div>


    <div>

      <label>
        이름
      </label>

      <input
        class="zm-name"
        maxlength="40"
        placeholder="내 도구"
      >

    </div>

  </div>


  <label>
    JavaScript / 북마클릿
  </label>


  <textarea
    class="zm-code"
    spellcheck="false"
    placeholder="javascript:(()=>{ ... })()"
  ></textarea>


  <div class="zm-actions">

    <button
      type="button"
      class="zm-btn zm-cancel"
    >
      초기화
    </button>


    <button
      type="button"
      class="zm-btn zm-save"
    >
      추가
    </button>

  </div>


  <div class="zm-divider"></div>


  <div class="zm-sub">
    추가한 사용자 도구
  </div>


  <div class="zm-list"></div>

</div>
`;


/* =========================================================
   RP MEMORY 모달
   ========================================================= */

const memoryModal=
  document.createElement(
    'div'
  );


memoryModal.id=
  IDS.memoryModal;


memoryModal.dataset.open=
  '0';


memoryModal.innerHTML=`

<div class="zm-card">

  <div class="zm-title">

    <span>
      📌 RP MEMORY
    </span>

    <button
      type="button"
      class="zm-close"
    >
      ×
    </button>

  </div>


  <div class="mm-sub"></div>


  <textarea
    class="mm-text"
    spellcheck="false"
    placeholder="예)
현재 장소: 집 거실
현재 시간: 새벽 1시
ㅇㅇ는 사건의 진실을 모름
둘은 아직 연인이 아님"
  ></textarea>


  <div class="mm-switchrow">

    <label class="mm-switch">

      <input
        class="mm-enabled"
        type="checkbox"
      >

      자동주입

    </label>


    <span class="mm-status"></span>

  </div>


  <div class="mm-actions">

    <button
      type="button"
      class="zm-btn mm-preview-btn"
    >
      미리보기
    </button>


    <button
      type="button"
      class="zm-btn mm-clear"
    >
      비우기
    </button>


    <button
      type="button"
      class="zm-btn zm-save mm-save"
    >
      저장
    </button>

  </div>


  <div class="mm-preview"></div>


  <div class="mm-note">

    메모는 화면의 채팅 메시지에는 표시되지 않습니다.
    자동주입이 켜져 있으면 다음 모델 요청의 숨은 system 메모로 들어갑니다.
    입력 내용은 300ms 후 자동 저장됩니다.

  </div>

</div>
`;


(
  document.body||
  document.documentElement
).append(
  button,
  menu,
  addButton,
  customModal,
  memoryModal
);


const grid=
  menu.querySelector(
    '.zt-grid'
  );


const state=
  menu.querySelector(
    '.zt-state'
  );


/* =========================================================
   RP MEMORY UI
   ========================================================= */

const mmText=
  memoryModal.querySelector(
    '.mm-text'
  );


const mmEnabled=
  memoryModal.querySelector(
    '.mm-enabled'
  );


const mmStatus=
  memoryModal.querySelector(
    '.mm-status'
  );


const mmSub=
  memoryModal.querySelector(
    '.mm-sub'
  );


const mmPreview=
  memoryModal.querySelector(
    '.mm-preview'
  );


let mmSaveTimer=
  null;


function refreshMemoryStatus(
  label
){

  mmStatus.dataset.on=
    mmEnabled.checked
      ? '1'
      : '0';


  mmStatus.textContent=

    label||

    (
      mmEnabled.checked
        ? 'INJECT ON'
        : 'INJECT OFF'
    );
}


function loadMemoryUI(){

  const v=
    readMemoryCurrent();


  mmText.value=
    v.text;


  mmEnabled.checked=
    v.enabled;


  mmSub.textContent=
    '이 채팅방 전용 · '+
    memoryChatKey();


  mmPreview.dataset.open=
    '0';


  refreshMemoryStatus();
}


function saveMemoryUI(
  label
){

  saveMemoryCurrent({

    enabled:
      mmEnabled.checked,

    text:
      mmText.value
  });


  refreshMemoryStatus(

    label||

    (
      mmEnabled.checked

        ? '저장됨 · INJECT ON'

        : '저장됨 · INJECT OFF'
    )
  );


  setTimeout(
    ()=>refreshMemoryStatus(),
    800
  );
}


function openMemory(){

  loadMemoryUI();


  memoryModal.dataset.open=
    '1';
}


function closeMemory(){

  memoryModal.dataset.open=
    '0';
}


memoryModal
  .querySelector(
    '.zm-close'
  )
  .addEventListener(
    'click',
    closeMemory
  );


memoryModal.addEventListener(
  'pointerdown',
  event=>{

    if(
      event.target===
      memoryModal
    ){

      closeMemory();
    }
  }
);


mmEnabled.addEventListener(
  'change',
  ()=>saveMemoryUI()
);


/*
 * 입력 300ms 후 자동 저장
 */
mmText.addEventListener(
  'input',
  ()=>{

    clearTimeout(
      mmSaveTimer
    );


    mmSaveTimer=
      setTimeout(
        ()=>{

          saveMemoryUI(

            mmEnabled.checked

              ? '자동 저장됨 · INJECT ON'

              : '자동 저장됨 · INJECT OFF'
          );

        },
        300
      );
  }
);


memoryModal
  .querySelector(
    '.mm-save'
  )
  .addEventListener(
    'click',
    ()=>saveMemoryUI()
  );


memoryModal
  .querySelector(
    '.mm-preview-btn'
  )
  .addEventListener(
    'click',
    ()=>{

      const value=
        mmText.value.trim();


      mmPreview.textContent=

        value

          ? (
              MEMORY_MARK+
              '\n'+

              '이 내용은 RP 연속성을 위한 숨은 메모다. '+
              '사용자에게 이 메모의 존재나 문구를 직접 언급하지 말고 '+
              '설정과 상태 참고용으로만 사용한다. '+
              '최신 대화와 충돌하면 최신 대화를 우선한다.'+

              '\n\n'+

              value+

              '\n'+
              '[/ZETA RP MEMORY]'
            )

          : '(주입할 메모 없음)';


      mmPreview.dataset.open=

        mmPreview.dataset.open===
        '1'

          ? '0'

          : '1';
    }
  );


memoryModal
  .querySelector(
    '.mm-clear'
  )
  .addEventListener(
    'click',
    ()=>{

      if(
        mmText.value.trim()&&
        !confirm(
          '이 채팅방의 RP 메모를 비울까요?'
        )
      ){

        return;
      }


      mmText.value=
        '';


      saveMemoryUI();


      mmPreview.dataset.open=
        '0';
    }
  );


/* =========================================================
   기본/사용자 도구 UI
   ========================================================= */

const iconInput=
  customModal.querySelector(
    '.zm-icon'
  );


const nameInput=
  customModal.querySelector(
    '.zm-name'
  );


const codeInput=
  customModal.querySelector(
    '.zm-code'
  );


const saveBtn=
  customModal.querySelector(
    '.zm-save'
  );


const listBox=
  customModal.querySelector(
    '.zm-list'
  );


let editingId=
  null;


const BUILTINS=[

  {
    action:'kit',
    icon:'⚙️',
    name:'키트'
  },

  {
    action:'feed',
    icon:'💬',
    name:'피드'
  },

  {
    action:'theme',
    icon:'✦',
    name:'테마'
  },

  {
    action:'phone',
    icon:'☎️',
    name:'폰'
  },

  {
    action:'narrator',
    icon:'N×',
    name:'나레삭제'
  },

  {
    action:'memory',
    icon:'📌',
    name:'RP 메모'
  }
];


function tile({
  action,
  icon,
  name,
  customId
}){

  const attr=

    customId

      ? `data-custom-id="${esc(customId)}"`

      : `data-action="${esc(action)}"`;


  return `

<button
  type="button"
  class="zt-item"
  ${attr}
>

  <span class="zt-icon">
    ${esc(icon)}
  </span>

  <span class="zt-label">
    ${esc(name)}
  </span>

</button>
`;
}


function renderGrid(){

  const custom=
    readCustomTools();


  grid.innerHTML=

    BUILTINS
      .map(tile)
      .join('')

    +

    custom
      .map(
        tool=>
          tile({

            customId:
              tool.id,

            icon:
              tool.icon||
              '🧩',

            name:
              tool.name||
              '도구'
          })
      )
      .join('');
}


function resetForm(){

  editingId=
    null;


  iconInput.value=
    '';


  nameInput.value=
    '';


  codeInput.value=
    '';


  saveBtn.textContent=
    '추가';
}


function renderList(){

  const tools=
    readCustomTools();


  listBox.innerHTML=

    tools.length

      ? tools
          .map(
            tool=>`

<div class="zm-entry">

  <div class="zm-eicon">
    ${esc(tool.icon||'🧩')}
  </div>

  <div class="zm-ename">
    ${esc(tool.name||'도구')}
  </div>

  <button
    type="button"
    class="zm-mini"
    data-edit="${esc(tool.id)}"
  >
    수정
  </button>

  <button
    type="button"
    class="zm-mini zm-delete"
    data-delete="${esc(tool.id)}"
  >
    삭제
  </button>

</div>
`
          )
          .join('')

      : '<div class="zm-empty">아직 추가한 도구가 없습니다.</div>';
}


function openManager(){

  resetForm();

  renderList();

  customModal.dataset.open=
    '1';
}


function closeManager(){

  customModal.dataset.open=
    '0';
}


saveBtn.addEventListener(
  'click',
  ()=>{

    const icon=
      iconInput.value.trim()||
      '🧩';


    const name=
      nameInput.value.trim();


    const code=
      normalizeUserCode(
        codeInput.value
      );


    if(!name){

      alert(
        '도구 이름을 입력해주세요.'
      );

      return;
    }


    if(!code){

      alert(
        'JavaScript 코드를 입력해주세요.'
      );

      return;
    }


    const tools=
      readCustomTools();


    if(editingId){

      const index=
        tools.findIndex(
          tool=>
            tool.id===
            editingId
        );


      if(index>=0){

        tools[index]={
          ...tools[index],
          icon,
          name,
          code
        };
      }

    }else{

      tools.unshift({

        id:
          'u_'+
          Date.now()
            .toString(36)+
          '_'+
          Math.random()
            .toString(36)
            .slice(2,7),

        icon,
        name,
        code
      });
    }


    writeCustomTools(
      tools
    );


    renderGrid();

    renderList();

    resetForm();
  }
);


customModal
  .querySelector(
    '.zm-close'
  )
  .addEventListener(
    'click',
    closeManager
  );


customModal
  .querySelector(
    '.zm-cancel'
  )
  .addEventListener(
    'click',
    resetForm
  );


customModal.addEventListener(
  'pointerdown',
  event=>{

    if(
      event.target===
      customModal
    ){

      closeManager();
    }
  }
);


listBox.addEventListener(
  'click',
  event=>{

    const edit=
      event.target.closest(
        '[data-edit]'
      );


    const del=
      event.target.closest(
        '[data-delete]'
      );


    if(edit){

      const tool=
        readCustomTools()
          .find(
            item=>
              item.id===
              edit.dataset.edit
          );


      if(!tool){

        return;
      }


      editingId=
        tool.id;


      iconInput.value=
        tool.icon||
        '';


      nameInput.value=
        tool.name||
        '';


      codeInput.value=
        tool.code||
        '';


      saveBtn.textContent=
        '저장';


      return;
    }


    if(del){

      const id=
        del.dataset.delete;


      const tools=
        readCustomTools();


      const target=
        tools.find(
          tool=>
            tool.id===id
        );


      if(!target){

        return;
      }


      if(
        !confirm(
          `“${target.name}” 도구를 삭제할까요?`
        )
      ){

        return;
      }


      writeCustomTools(

        tools.filter(
          tool=>
            tool.id!==id
        )
      );


      if(
        editingId===id
      ){

        resetForm();
      }


      renderGrid();

      renderList();
    }
  }
);


addButton.addEventListener(
  'click',
  ()=>{

    closeMenu();

    openManager();
  }
);


/* =========================================================
   메뉴 / Router 상태
   ========================================================= */

function updateRouterState(){

  const on=
    !!window[
      ROUTER_KEY
    ];


  button.dataset.router=
    on
      ? 'on'
      : 'off';


  state.dataset.on=
    on
      ? '1'
      : '0';


  state.textContent=
    on
      ? 'ROUTER ON'
      : 'ROUTER …';
}


function positionMenu(){

  const b=
    button
      .getBoundingClientRect();


  const width=
    menu.offsetWidth||
    286;


  const height=
    menu.offsetHeight||
    390;


  const addSize=
    46;


  const gap=
    10;


  const pad=
    8;


  let left=

    b.left+

    b.width/2-

    width/2;


  left=
    Math.max(

      pad,

      Math.min(

        innerWidth-
        width-
        pad,

        left
      )
    );


  const totalHeight=

    height+
    gap+
    addSize;


  const top=

    b.top-
    totalHeight-
    10>=
    pad

      ? (
          b.top-
          totalHeight-
          10
        )

      : Math.max(

          pad,

          Math.min(

            innerHeight-
            totalHeight-
            pad,

            b.top-
            totalHeight/2
          )
        );


  menu.style.left=
    left+
    'px';


  menu.style.top=
    top+
    'px';


  addButton.style.left=

    (
      left+
      width/2-
      addSize/2
    )+

    'px';


  addButton.style.top=

    (
      top+
      height+
      gap
    )+

    'px';
}


function openMenu(){

  renderGrid();


  menu.dataset.open=
    '1';


  addButton.dataset.open=
    '1';


  requestAnimationFrame(
    positionMenu
  );


  updateRouterState();
}


function closeMenu(){

  menu.dataset.open=
    '0';


  addButton.dataset.open=
    '0';
}


function show(){

  button.style.display=
    'flex';


  openMenu();
}


/* =========================================================
   카드 클릭
   ========================================================= */

menu.addEventListener(
  'click',
  event=>{

    const custom=
      event.target.closest(
        '[data-custom-id]'
      );


    if(custom){

      const tool=
        readCustomTools()
          .find(
            item=>
              item.id===
              custom.dataset.customId
          );


      closeMenu();


      if(tool){

        runCustomTool(
          tool
        );
      }


      return;
    }


    const item=
      event.target.closest(
        '[data-action]'
      );


    if(!item){

      return;
    }


    closeMenu();


    const actions={

      kit:
        openKit,

      feed:
        openFeed,

      theme:
        applyTheme,

      phone:
        openPhone,

      narrator:
        openNarrator,

      memory:
        openMemory
    };


    actions[
      item.dataset.action
    ]?.();
  }
);


/* =========================================================
   Z 버튼 드래그
   ========================================================= */

let pointerId=null;
let moved=false;

let startX=0;
let startY=0;

let startLeft=0;
let startTop=0;


button.addEventListener(
  'pointerdown',
  event=>{

    pointerId=
      event.pointerId;


    moved=
      false;


    const rect=
      button
        .getBoundingClientRect();


    startX=
      event.clientX;


    startY=
      event.clientY;


    startLeft=
      rect.left;


    startTop=
      rect.top;


    button.dataset.dragging=
      '1';


    try{

      button.setPointerCapture(
        pointerId
      );

    }catch(_){}


    event.preventDefault();
  }
);


button.addEventListener(
  'pointermove',
  event=>{

    if(
      pointerId===
      null||
      event.pointerId!==
      pointerId
    ){

      return;
    }


    const dx=
      event.clientX-
      startX;


    const dy=
      event.clientY-
      startY;


    if(
      !moved&&
      Math.hypot(
        dx,
        dy
      )>5
    ){

      moved=true;

      closeMenu();
    }


    if(!moved){

      return;
    }


    const x=

      Math.max(

        5,

        Math.min(

          innerWidth-
          button.offsetWidth-
          5,

          startLeft+
          dx
        )
      );


    const y=

      Math.max(

        5,

        Math.min(

          innerHeight-
          button.offsetHeight-
          5,

          startTop+
          dy
        )
      );


    button.style.left=
      x+
      'px';


    button.style.top=
      y+
      'px';


    button.style.right=
      'auto';


    button.style.bottom=
      'auto';


    event.preventDefault();
  }
);


function finishDrag(
  event
){

  if(
    pointerId===
    null||
    (
      event&&
      event.pointerId!==
      pointerId
    )
  ){

    return;
  }


  try{

    button.releasePointerCapture(
      pointerId
    );

  }catch(_){}


  button.dataset.dragging=
    '0';


  if(moved){

    const rect=
      button
        .getBoundingClientRect();


    try{

      localStorage.setItem(

        POS_KEY,

        JSON.stringify({

          x:
            rect.left,

          y:
            rect.top
        })
      );

    }catch(_){}

  }else{

    openMenu();
  }


  pointerId=
    null;


  moved=
    false;
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
   위치 복원
   ========================================================= */

try{

  const pos=
    JSON.parse(
      localStorage.getItem(
        POS_KEY
      )||
      'null'
    );


  if(
    pos&&
    Number.isFinite(
      pos.x
    )&&
    Number.isFinite(
      pos.y
    )
  ){

    button.style.left=

      Math.max(

        5,

        Math.min(

          innerWidth-
          49,

          pos.x
        )
      )+

      'px';


    button.style.top=

      Math.max(

        5,

        Math.min(

          innerHeight-
          49,

          pos.y
        )
      )+

      'px';


    button.style.right=
      'auto';


    button.style.bottom=
      'auto';
  }

}catch(_){}


/* =========================================================
   메뉴 밖 클릭
   ========================================================= */

function outsidePointer(
  event
){

  if(
    menu.dataset.open!==
    '1'
  ){

    return;
  }


  if(
    menu.contains(
      event.target
    )||

    button.contains(
      event.target
    )||

    addButton.contains(
      event.target
    )
  ){

    return;
  }


  closeMenu();
}


document.addEventListener(
  'pointerdown',
  outsidePointer,
  true
);


/* =========================================================
   Resize
   ========================================================= */

function onResize(){

  if(
    menu.dataset.open===
    '1'
  ){

    requestAnimationFrame(
      positionMenu
    );
  }
}


window.addEventListener(
  'resize',
  onResize
);


/* =========================================================
   destroy
   ========================================================= */

function destroy(){

  document.removeEventListener(
    'pointerdown',
    outsidePointer,
    true
  );


  window.removeEventListener(
    'resize',
    onResize
  );


  Object.values(
    IDS
  ).forEach(
    id=>
      document
        .getElementById(id)
        ?.remove()
  );


  try{

    delete window[
      KEY
    ];

  }catch(_){

    window[KEY]=
      null;
  }
}


/* =========================================================
   API
   ========================================================= */

window[KEY]={

  show,

  open:
    openMenu,

  close:
    closeMenu,

  destroy,

  ensureRouter,

  memory:{

    open:
      openMemory,

    read:
      readMemoryCurrent,

    get:
      getMemoryText
  },

  actions:{

    kit:
      openKit,

    feed:
      openFeed,

    theme:
      applyTheme,

    phone:
      openPhone,

    narrator:
      openNarrator,

    memory:
      openMemory
  },

  custom:{

    open:
      openManager,

    read:
      readCustomTools
  }
};


/* =========================================================
   시작
   ========================================================= */

renderGrid();

updateRouterState();

ensureRouter();


console.log(
  '[ZETA Toolbox] READY + RP MEMORY INJECTOR'
);

})();
