(()=>{'use strict';

const K='__ZETA_TOOLBOX_LAUNCHER__';
const RK='__ZETA_OR_ROUTER_BOOKMARKLET_V1__';
const PK='__ZETA_PROFILE__';

const RAW='https://raw.githubusercontent.com/softly320/zeta-router/main/';
const CUSTOM='__ZETA_TOOLBOX_CUSTOM_TOOLS_V1__';
const POS='__ZETA_TOOLBOX_POS_V2__';

const BID='__zt_b__';
const MID='__zt_m__';
const AID='__zt_a__';
const XID='__zt_x__';
const SID='__zt_s__';
const TID='__zt_t__';


try{
  window[K]?.destroy?.();
}catch(_){}

[
  BID,
  MID,
  AID,
  XID,
  SID,
  TID,
  '__zeta_toolbox_button__',
  '__zeta_toolbox_menu__',
  '__zeta_toolbox_add_button__',
  '__zeta_toolbox_custom_modal__',
  '__zeta_toolbox_style__'
].forEach(id=>
  document.getElementById(id)?.remove()
);

try{
  delete window[K];
}catch(_){
  window[K]=null;
}


const ac=new AbortController();
const sig=ac.signal;

let opened=false;
let refreshing=false;

let drag=false;
let moved=false;
let pid=null;

let sx=0;
let sy=0;
let ox=0;
let oy=0;

const sleep=ms=>
  new Promise(r=>setTimeout(r,ms));


function notify(msg,bad=false){

  document
    .getElementById(TID)
    ?.remove();

  const t=
    document.createElement('div');

  t.id=TID;
  t.textContent=msg;

  Object.assign(
    t.style,
    {
      position:'fixed',
      left:'50%',
      bottom:'78px',
      transform:'translateX(-50%)',
      zIndex:'2147483647',
      maxWidth:'calc(100vw - 24px)',
      padding:'7px 10px',
      borderRadius:'9px',
      background:
        bad
          ?'#7f1d1df5'
          :'#18181bf5',
      color:'#fff',
      font:'11px/1.35 system-ui',
      boxShadow:'0 5px 20px #0008',
      whiteSpace:'nowrap',
      overflow:'hidden',
      textOverflow:'ellipsis',
      pointerEvents:'none'
    }
  );

  document.body.appendChild(t);

  setTimeout(
    ()=>t.remove(),
    bad?2200:1500
  );
}


async function raw(file){

  const u=
    RAW+
    file+
    '?cb='+
    Date.now()+
    '_'+
    Math.random()
      .toString(36)
      .slice(2);

  const r=
    await fetch(
      u,
      {
        cache:'no-store'
      }
    );

  if(!r.ok)
    throw Error(
      `${file} HTTP ${r.status}`
    );

  return r.text();
}


async function evalRaw(file){

  const c=
    await raw(file);

  (0,eval)(c);

  return c;
}


/* =========================================
   공용 프로필 준비
========================================= */

async function prepareProfile(){

  /*
   * Router가 없다면 먼저 준비.
   * Router 로드 실패가 프로필 캐시 사용까지
   * 무조건 막지는 않으므로 false여도 계속 진행.
   */
  await ensureRouter();


  /*
   * 프로필 모듈이 아직 없을 때만
   * 최신 zeta-profile.js를 불러온다.
   *
   * 이미 설치된 프로필 모듈은 그대로 유지해서
   * fetch/XHR 감시 상태와 잡아둔 인증 정보를 보존한다.
   */
  if(!window[PK]?.prepare){

    notify(
      '프로필 모듈 불러오는 중…'
    );

    const code=
      await raw(
        'zeta-profile.js'
      );

    (0,eval)(code);
  }


  if(!window[PK]?.prepare){

    throw Error(
      'zeta-profile.js API를 찾지 못했습니다.'
    );
  }


  notify(
    '프로필 읽는 중…'
  );


  const p=
    await window[PK]
      .prepare();


  notify(
    `프로필 준비됨 · ${
      p?.character?.name||
      'CHAR'
    } / ${
      p?.user?.name||
      'USER'
    }`
  );


  return p;
}


/* =========================================
   Repo 도구
========================================= */

const REPO={

  feed:{
    file:'zeta-feed.js',
    re:[
      /ZETA.*FEED/i,
      /FEED.*ZETA/i
    ],
    ids:[
      'zeta-feed',
      'zeta_feed'
    ]
  },

  theme:{
    file:'zeta-theme.js',
    re:[
      /ZETA.*THEME/i,
      /THEME.*ZETA/i
    ],
    ids:[
      'zeta-theme',
      'zeta_theme'
    ]
  },

  narrator:{
    file:'zeta-narrator.js',
    re:[
      /ZETA.*NARRATOR/i,
      /NARRATOR.*ZETA/i,
      /ZETA.*FORMATTER/i,
      /FORMATTER.*ZETA/i
    ],
    ids:[
      'zeta-narrator',
      'zeta_narrator',
      'zeta-roleplay-formatter',
      'zetaformatter'
    ]
  }

};


function isToolActive(name){

  const c=REPO[name];

  if(!c)
    return false;


  for(
    const k of
    Object.getOwnPropertyNames(
      window
    )
  ){

    if(
      k===K||
      k===RK||
      k===PK
    )
      continue;

    try{

      if(
        window[k]&&
        c.re.some(
          r=>r.test(k)
        )
      )
        return true;

    }catch(_){}
  }


  for(
    const el of
    document.querySelectorAll(
      '[id]'
    )
  ){

    const id=
      String(
        el.id||''
      )
      .toLowerCase();

    if(
      c.ids.some(
        w=>id.includes(w)
      )
    )
      return true;
  }


  return false;
}


function purgeTool(name){

  const c=
    REPO[name];

  if(!c)
    return;


  for(
    const k of
    Object.getOwnPropertyNames(
      window
    )
  ){

    if(
      k===K||
      k===RK||
      k===PK||
      !c.re.some(
        r=>r.test(k)
      )
    )
      continue;


    try{
      window[k]
        ?.destroy?.();
    }
    catch(e){

      console.warn(
        '[ZETA destroy]',
        k,
        e
      );
    }


    try{
      delete window[k];
    }
    catch(_){

      try{
        window[k]=null;
      }catch(__){}
    }
  }


  for(
    const el of
    [
      ...document
        .querySelectorAll(
          '[id]'
        )
    ]
  ){

    if(
      [
        BID,
        MID,
        AID,
        XID,
        SID,
        TID
      ].includes(
        el.id
      )
    )
      continue;


    const id=
      String(
        el.id||''
      )
      .toLowerCase();


    if(
      c.ids.some(
        w=>id.includes(w)
      )
    ){

      try{
        el.remove();
      }catch(_){}
    }
  }
}


async function loadTool(
  name,
  opt={}
){

  const c=
    REPO[name];


  if(!c)
    throw Error(
      '알 수 없는 도구: '+
      name
    );


  if(!opt.keepMenu)
    hide();


  if(!opt.quiet)
    notify(
      `${name} 최신판 불러오는 중…`
    );


  try{

    /*
     * 새 파일을 먼저 받아둠.
     * 다운로드 실패 시 현재 도구는 안 죽임.
     */
    const code=
      await raw(
        c.file
      );


    purgeTool(name);

    await sleep(20);


    (0,eval)(code);


    if(!opt.quiet)
      notify(
        `${name} 최신판 실행됨`
      );


    return true;

  }catch(e){

    console.error(
      '[ZETA Toolbox]',
      c.file,
      e
    );


    if(!opt.quiet){

      notify(
        `${name} 로드 실패`,
        true
      );

      alert(
        `${name} 로드 실패\n`+
        (e?.message||e)
      );
    }


    return false;
  }
}


/* =========================================
   Router
========================================= */

async function ensureRouter(){

  if(window[RK])
    return true;


  try{

    await evalRaw(
      'zeta-router.js'
    );

    return !!window[RK];

  }catch(e){

    console.error(
      '[ZETA Router]',
      e
    );

    notify(
      'Router 로드 실패',
      true
    );

    return false;
  }
}


async function refreshRouter(){

  const old=
    window[RK];


  if(!old){

    await ensureRouter();

    return;
  }


  /*
   * 아직 destroy 지원 안 하는 router는
   * 중첩 패치 방지를 위해 유지.
   */
  if(
    typeof old.destroy!==
    'function'
  ){

    console.log(
      '[ZETA Toolbox] router 유지: destroy() 미지원'
    );

    return;
  }


  try{

    const code=
      await raw(
        'zeta-router.js'
      );


    old.destroy();


    try{
      delete window[RK];
    }
    catch(_){
      window[RK]=null;
    }


    (0,eval)(code);

  }catch(e){

    console.error(
      '[ZETA router refresh]',
      e
    );
  }
}


/* =========================================
   키트
========================================= */

function kit(){

  hide();


  document
    .querySelectorAll(
      'script[data-zeta-toolbox-kit]'
    )
    .forEach(
      s=>s.remove()
    );


  const s=
    document.createElement(
      'script'
    );


  s.dataset.zetaToolboxKit='1';

  s.src=
    'https://zetakit.pages.dev/run.js?cb='+
    Date.now();


  s.onerror=()=>{

    s.remove();

    notify(
      '키트 로드 실패',
      true
    );
  };


  (
    document.head||
    document.documentElement
  )
    .appendChild(s);
}


/* =========================================
   피드
========================================= */

async function feed(){

  hide();


  /*
   * 프로필 먼저 확보.
   */
  await prepareProfile();


  /*
   * 그 다음 기존 zeta-feed.js 그대로 실행.
   */
  return loadTool(
    'feed',
    {
      keepMenu:true
    }
  );
}


/* =========================================
   폰 / inPocket
========================================= */

async function phone(){

  hide();


  /*
   * 프로필 먼저 확보.
   */
  await prepareProfile();


  /*
   * 아래는 기존 inPocket 로딩 방식 그대로.
   */
  try{
    window
      .__INPOCKET__
      ?.destroy?.();
  }catch(_){}


  try{
    delete window
      .__INPOCKET__;
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


  s.dataset.zetaToolboxInpocket='1';

  s.src=
    'https://inpocket.pages.dev/inpocket.js?cb='+
    Date.now();


  s.onload=()=>{

    try{

      window
        .__INPOCKET__
        ?.open?.();

    }catch(e){

      console.error(
        '[ZETA phone]',
        e
      );
    }
  };


  s.onerror=()=>{

    s.remove();

    notify(
      '폰 로드 실패',
      true
    );
  };


  (
    document.head||
    document.documentElement
  )
    .appendChild(s);
}


/* =========================================
   사용자 도구
========================================= */

function getCustom(){

  try{

    const v=
      JSON.parse(
        localStorage
          .getItem(
            CUSTOM
          )||
        '[]'
      );


    return Array.isArray(v)
      ?v
      :[];

  }catch(_){

    return[];
  }
}


const putCustom=v=>
  localStorage.setItem(
    CUSTOM,
    JSON.stringify(v)
  );


const cleanCode=c=>
  String(c||'')
    .trim()
    .replace(
      /^\s*javascript\s*:\s*/i,
      ''
    );


function runCustom(x){

  hide();


  try{

    const c=
      cleanCode(
        x.code
      );


    if(!c)
      throw Error(
        '코드가 비어 있습니다.'
      );


    (0,eval)(c);

  }catch(e){

    console.error(
      '[ZETA custom]',
      e
    );


    alert(
      `${x.name||'사용자 도구'} 실행 실패\n`+
      (e?.message||e)
    );
  }
}


/* =========================================
   스타일
========================================= */

const style=
  document.createElement(
    'style'
  );


style.id=SID;


style.textContent=`

#${BID}{
  position:fixed;
  width:42px;
  height:42px;
  z-index:2147483645;
  border:1px solid #ffffff29;
  border-radius:50%;
  background:#17191fee;
  color:#fff;
  box-shadow:0 6px 22px #0006;
  backdrop-filter:blur(12px);
  font:800 15px/1 system-ui;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:0;
  touch-action:none;
  user-select:none;
  -webkit-tap-highlight-color:transparent
}

#${MID}{
  position:fixed;
  width:244px;
  max-height:min(390px,66vh);
  z-index:2147483644;
  display:none;
  flex-direction:column;
  box-sizing:border-box;
  padding:9px;
  border:1px solid #ffffff1f;
  border-radius:16px;
  background:#16181ef7;
  box-shadow:0 14px 42px #0008;
  backdrop-filter:blur(16px);
  color:#fff;
  font-family:system-ui
}

#${MID}[data-open="1"]{
  display:flex
}

#${MID} .h{
  height:30px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  flex:none;
  padding:0 2px 7px 4px
}

#${MID} .ttl{
  font:750 11px/1 system-ui;
  color:#ffffffb8
}

#${MID} .ref{
  width:30px;
  height:28px;
  border:0;
  border-radius:9px;
  background:#ffffff10;
  color:#ffffffd0;
  font:18px/1 system-ui;
  padding:0
}

#${MID} .ref:disabled{
  opacity:.4
}

#${MID} .g{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:7px;
  min-height:0;
  overflow-y:auto;
  padding:1px
}

#${MID} .tool{
  position:relative;
  min-height:55px;
  border:1px solid #ffffff14;
  border-radius:12px;
  background:#ffffff0e;
  color:#fff;
  padding:7px 6px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:4px
}

#${MID} .tool:active{
  background:#ffffff1c
}

#${MID} .ico{
  font-size:17px;
  line-height:1
}

#${MID} .nm{
  max-width:100%;
  font:700 10px/1.15 system-ui;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap
}

#${MID} .del{
  position:absolute;
  top:3px;
  right:3px;
  width:18px;
  height:18px;
  border:0;
  border-radius:50%;
  padding:0;
  background:#0004;
  color:#ffffff8c;
  font:12px/18px system-ui
}

#${AID}{
  position:fixed;
  width:34px;
  height:34px;
  z-index:2147483645;
  display:none;
  border:1px solid #ffffff21;
  border-radius:50%;
  background:#1f222af7;
  color:#fff;
  box-shadow:0 5px 18px #0005;
  font:300 22px/1 system-ui;
  padding:0
}

#${AID}[data-open="1"]{
  display:flex;
  align-items:center;
  justify-content:center
}

#${XID}{
  position:fixed;
  inset:0;
  z-index:2147483647;
  display:none;
  align-items:center;
  justify-content:center;
  padding:16px;
  box-sizing:border-box;
  background:#0009;
  font-family:system-ui
}

#${XID}[data-open="1"]{
  display:flex
}

#${XID} .box{
  width:min(430px,100%);
  max-height:88vh;
  overflow:auto;
  padding:14px;
  box-sizing:border-box;
  border:1px solid #ffffff20;
  border-radius:17px;
  background:#191b21;
  color:#fff
}

#${XID} .mh{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:10px;
  font:750 14px system-ui
}

#${XID} .close{
  width:32px;
  height:32px;
  border:0;
  border-radius:9px;
  background:#ffffff14;
  color:#fff;
  font-size:17px
}

#${XID} label{
  display:block;
  margin:8px 0 4px;
  font-size:10px;
  color:#ffffff94
}

#${XID} input,
#${XID} textarea{
  width:100%;
  box-sizing:border-box;
  border:1px solid #ffffff1f;
  border-radius:10px;
  background:#ffffff0f;
  color:#fff;
  outline:none;
  padding:9px;
  font:12px/1.45 system-ui
}

#${XID} textarea{
  min-height:190px;
  resize:vertical;
  font-family:ui-monospace,monospace
}

#${XID} .save{
  width:100%;
  height:39px;
  margin-top:11px;
  border:0;
  border-radius:10px;
  background:#536eae;
  color:#fff;
  font:750 12px system-ui
}

`;


(
  document.head||
  document.documentElement
)
  .appendChild(
    style
  );


/* =========================================
   기본 DOM
========================================= */

const button=
  document.createElement(
    'button'
  );

button.id=BID;
button.type='button';
button.textContent='Z';
button.title='ZETA Toolbox';


const menu=
  document.createElement(
    'div'
  );

menu.id=MID;
menu.dataset.open='0';

menu.innerHTML=`

<div class="h">
  <div class="ttl">
    ZETA TOOLBOX
  </div>

  <button
    class="ref"
    type="button"
    title="런처 + 현재 실행 중 도구 최신화"
  >
    ↻
  </button>
</div>

<div class="g"></div>

`;


const add=
  document.createElement(
    'button'
  );

add.id=AID;
add.type='button';
add.textContent='+';
add.title='사용자 도구 추가';
add.dataset.open='0';


const modal=
  document.createElement(
    'div'
  );

modal.id=XID;
modal.dataset.open='0';

modal.innerHTML=`

<div class="box">

  <div class="mh">

    <span>
      사용자 도구 추가
    </span>

    <button
      class="close"
      type="button"
    >
      ×
    </button>

  </div>


  <label>
    아이콘 / 이모지
  </label>

  <input
    class="emoji"
    maxlength="8"
    placeholder="🧩"
  >


  <label>
    이름
  </label>

  <input
    class="cname"
    maxlength="30"
    placeholder="도구 이름"
  >


  <label>
    JavaScript / 북마클릿 코드
  </label>

  <textarea
    class="code"
    spellcheck="false"
    placeholder="javascript: ..."
  ></textarea>


  <button
    class="save"
    type="button"
  >
    추가
  </button>

</div>

`;


document.body.append(
  button,
  menu,
  add,
  modal
);


const grid=
  menu.querySelector(
    '.g'
  );

const refreshBtn=
  menu.querySelector(
    '.ref'
  );


/* =========================================
   기본 도구
========================================= */

const built=[

  [
    '⚙️',
    '키트',
    kit
  ],

  [
    '💬',
    '피드',
    feed
  ],

  [
    '✦',
    '테마',
    ()=>loadTool(
      'theme'
    )
  ],

  [
    '☎️',
    '폰',
    phone
  ],

  [
    'N×',
    '나레삭제',
    ()=>loadTool(
      'narrator'
    )
  ]

];


function card(
  icon,
  name,
  fn,
  index=null
){

  const b=
    document.createElement(
      'button'
    );

  b.type='button';
  b.className='tool';

  b.innerHTML=
    '<span class="ico"></span>'+
    '<span class="nm"></span>';


  b.querySelector(
    '.ico'
  )
    .textContent=
      icon||
      '🧩';


  b.querySelector(
    '.nm'
  )
    .textContent=
      name||
      '사용자 도구';


  if(index!==null){

    const d=
      document.createElement(
        'button'
      );

    d.type='button';
    d.className='del';
    d.textContent='×';


    d.onclick=e=>{

      e.stopPropagation();


      const a=
        getCustom();


      if(
        confirm(
          `"${a[index]?.name||'사용자 도구'}"를 삭제할까요?`
        )
      ){

        a.splice(
          index,
          1
        );

        putCustom(a);

        render();
      }
    };


    b.appendChild(d);
  }


  b.onclick=e=>{

    if(
      e.target.closest(
        '.del'
      )
    )
      return;


    Promise.resolve(
      fn()
    )
      .catch(
        err=>{

          console.error(
            err
          );

          alert(
            '도구 실행 실패\n'+
            (err?.message||err)
          );
        }
      );
  };


  return b;
}


function render(){

  grid.replaceChildren();


  built.forEach(
    x=>
      grid.appendChild(
        card(...x)
      )
  );


  getCustom()
    .forEach(
      (x,i)=>
        grid.appendChild(
          card(
            x.icon||
              '🧩',
            x.name||
              '사용자 도구',
            ()=>runCustom(x),
            i
          )
        )
    );
}


/* =========================================
   메뉴 위치
========================================= */

function place(){

  const b=
    button.getBoundingClientRect();

  const mw=244;


  let left=
    Math.max(
      6,
      Math.min(
        innerWidth-mw-6,
        b.right-mw
      )
    );


  if(
    b.right-mw<
    6
  ){

    left=
      Math.max(
        6,
        Math.min(
          innerWidth-mw-6,
          b.left
        )
      );
  }


  const mh=
    menu.offsetHeight||
    250;


  let top=
    b.top-
    mh-
    8;


  if(top<6)
    top=
      b.bottom+
      8;


  top=
    Math.max(
      6,
      Math.min(
        innerHeight-
          mh-
          48,
        top
      )
    );


  menu.style.left=
    left+
    'px';

  menu.style.top=
    top+
    'px';


  const r=
    menu.getBoundingClientRect();


  add.style.left=
    Math.max(
      6,
      Math.min(
        innerWidth-40,
        r.left+
          r.width/2-
          17
      )
    )+
    'px';


  add.style.top=
    Math.min(
      innerHeight-40,
      r.bottom+7
    )+
    'px';
}


function show(){

  render();

  opened=true;

  menu.dataset.open='1';

  add.dataset.open='1';

  requestAnimationFrame(
    place
  );
}


function hide(){

  opened=false;

  menu.dataset.open='0';

  add.dataset.open='0';
}


/* =========================================
   Z 버튼 드래그
========================================= */

button.addEventListener(
  'pointerdown',
  e=>{

    const r=
      button.getBoundingClientRect();


    drag=true;
    moved=false;
    pid=e.pointerId;


    sx=e.clientX;
    sy=e.clientY;


    ox=r.left;
    oy=r.top;


    button.style.left=
      r.left+
      'px';

    button.style.top=
      r.top+
      'px';

    button.style.right=
      'auto';

    button.style.bottom=
      'auto';


    try{
      button.setPointerCapture(
        pid
      );
    }catch(_){}


    e.preventDefault();

  },
  {
    signal:sig,
    passive:false
  }
);


document.addEventListener(
  'pointermove',
  e=>{

    if(
      !drag||
      e.pointerId!==pid
    )
      return;


    const dx=
      e.clientX-
      sx;

    const dy=
      e.clientY-
      sy;


    if(
      Math.hypot(
        dx,
        dy
      )>
      5
    )
      moved=true;


    if(!moved)
      return;


    button.style.left=
      Math.max(
        5,
        Math.min(
          innerWidth-
            button.offsetWidth-
            5,
          ox+dx
        )
      )+
      'px';


    button.style.top=
      Math.max(
        5,
        Math.min(
          innerHeight-
            button.offsetHeight-
            5,
          oy+dy
        )
      )+
      'px';


    if(opened)
      hide();


    e.preventDefault();

  },
  {
    signal:sig,
    capture:true,
    passive:false
  }
);


document.addEventListener(
  'pointerup',
  e=>{

    if(
      !drag||
      e.pointerId!==pid
    )
      return;


    drag=false;


    try{
      button.releasePointerCapture(
        pid
      );
    }catch(_){}


    const r=
      button.getBoundingClientRect();


    try{

      localStorage.setItem(
        POS,
        JSON.stringify(
          {
            x:r.left,
            y:r.top
          }
        )
      );

    }catch(_){}


    const tap=
      !moved;


    moved=false;
    pid=null;


    if(tap)
      opened
        ?hide()
        :show();


    e.preventDefault();

  },
  {
    signal:sig,
    capture:true,
    passive:false
  }
);


/* =========================================
   저장 위치 복원
========================================= */

try{

  const p=
    JSON.parse(
      localStorage
        .getItem(
          POS
        )||
      'null'
    );


  if(
    p&&
    Number.isFinite(
      p.x
    )&&
    Number.isFinite(
      p.y
    )
  ){

    button.style.left=
      Math.max(
        5,
        Math.min(
          innerWidth-47,
          p.x
        )
      )+
      'px';


    button.style.top=
      Math.max(
        5,
        Math.min(
          innerHeight-47,
          p.y
        )
      )+
      'px';

  }else{

    button.style.right=
      '12px';

    button.style.bottom=
      '70px';
  }

}catch(_){

  button.style.right=
    '12px';

  button.style.bottom=
    '70px';
}


/* =========================================
   화면 회전 / resize
========================================= */

window.addEventListener(
  'resize',
  ()=>{

    const r=
      button.getBoundingClientRect();


    button.style.left=
      Math.max(
        5,
        Math.min(
          innerWidth-
            button.offsetWidth-
            5,
          r.left
        )
      )+
      'px';


    button.style.top=
      Math.max(
        5,
        Math.min(
          innerHeight-
            button.offsetHeight-
            5,
          r.top
        )
      )+
      'px';


    button.style.right=
      'auto';

    button.style.bottom=
      'auto';


    if(opened)
      place();

  },
  {
    signal:sig
  }
);


/* =========================================
   사용자 도구 추가
========================================= */

add.onclick=()=>{

  hide();


  modal
    .querySelector(
      '.emoji'
    )
    .value='';


  modal
    .querySelector(
      '.cname'
    )
    .value='';


  modal
    .querySelector(
      '.code'
    )
    .value='';


  modal.dataset.open='1';
};


modal
  .querySelector(
    '.close'
  )
  .onclick=
    ()=>
      modal.dataset.open='0';


modal.addEventListener(
  'pointerdown',
  e=>{

    if(e.target===modal)
      modal.dataset.open='0';

  },
  {
    signal:sig
  }
);


modal
  .querySelector(
    '.save'
  )
  .onclick=()=>{

    const icon=
      modal
        .querySelector(
          '.emoji'
        )
        .value
        .trim()||
      '🧩';


    const name=
      modal
        .querySelector(
          '.cname'
        )
        .value
        .trim();


    const code=
      modal
        .querySelector(
          '.code'
        )
        .value
        .trim();


    if(!name)
      return alert(
        '도구 이름을 입력해주세요.'
      );


    if(!code)
      return alert(
        'JavaScript 코드를 입력해주세요.'
      );


    const a=
      getCustom();


    a.unshift(
      {
        icon,
        name,
        code,
        createdAt:
          Date.now()
      }
    );


    putCustom(a);


    modal.dataset.open='0';


    notify(
      `${name} 추가됨`
    );
  };


/* =========================================
   전체 최신화
========================================= */

async function refreshAll(){

  if(refreshing)
    return;


  refreshing=true;

  refreshBtn.disabled=true;


  /*
   * ↻ 누르기 직전에 실제로 실행 중인
   * repo 도구만 기억.
   */
  const active=
    Object.keys(
      REPO
    )
      .filter(
        isToolActive
      );


  notify(
    active.length
      ?`최신화 중 · ${
          active.join(
            ', '
          )
        }`
      :'런처 최신화 중…'
  );


  try{

    /*
     * 1. 최신 launcher를 먼저 다운로드.
     * 다운로드 실패하면 현재 런처 유지.
     */
    const launcherCode=
      await raw(
        'zeta-launcher.js'
      );


    /*
     * 2. router는 destroy 지원 버전일 때만 교체.
     */
    await refreshRouter();


    /*
     * 3. 현재 실행 중이던 repo 도구 제거.
     */
    active.forEach(
      purgeTool
    );


    /*
     * 4. 현재 launcher 제거.
     *
     * zeta-profile.js는 공용 네트워크 컨텍스트 모듈이라
     * 여기서 일부러 제거하지 않는다.
     */
    destroy();


    /*
     * 5. 최신 launcher 설치.
     */
    (0,eval)(
      launcherCode
    );


    const next=
      window[K];


    if(!next?.loadTool)
      throw Error(
        '새 런처 API를 찾지 못했습니다.'
      );


    /*
     * 6. ↻ 전에 켜져 있던 repo 도구만 재실행.
     */
    for(
      const name of
      active
    ){

      await next.loadTool(
        name,
        {
          quiet:true,
          keepMenu:true
        }
      );
    }


    /*
     * 7. 완료 알림.
     */
    next.notify(
      active.length
        ?`최신화 완료 · ${
            active.join(
              ', '
            )
          }`
        :'런처 최신화 완료'
    );

  }catch(e){

    console.error(
      '[ZETA refresh]',
      e
    );


    try{

      window[K]
        ?.notify?.(
          '최신화 실패',
          true
        );

    }catch(_){}


    alert(
      'ZETA Toolbox 최신화 실패\n'+
      (e?.message||e)
    );
  }
}


refreshBtn.onclick=
  refreshAll;


/* =========================================
   destroy / API
========================================= */

function destroy(){

  try{
    ac.abort();
  }catch(_){}


  [
    BID,
    MID,
    AID,
    XID,
    SID,
    TID
  ]
    .forEach(
      id=>
        document
          .getElementById(id)
          ?.remove()
    );


  if(
    window[K]===
    api
  ){

    try{
      delete window[K];
    }
    catch(_){
      window[K]=null;
    }
  }
}


const api={

  show,

  hide,

  destroy,

  ensureRouter,

  prepareProfile,

  refresh:
    refreshAll,

  loadTool,

  notify,

  version:'6.1'

};


window[K]=api;


/*
 * Router 먼저 설치.
 * 그 다음 profile 모듈도 백그라운드로 미리 설치해둔다.
 *
 * prepare()는 호출하지 않으므로
 * 런처를 켰다는 이유만으로 프로필 API를 읽지는 않는다.
 * 대신 fetch/XHR 감시는 일찍 시작할 수 있다.
 */
ensureRouter()
  .finally(
    ()=>{

      if(
        window[PK]
          ?.prepare
      )
        return;


      raw(
        'zeta-profile.js'
      )
        .then(
          code=>
            (0,eval)(code)
        )
        .catch(
          e=>
            console.warn(
              '[ZETA Profile preload]',
              e
            )
        );
    }
  );


render();


console.log(
  '[ZETA Toolbox] launcher v6.1 ready'
);

})();
