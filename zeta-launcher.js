(()=>{'use strict';

const K='__ZETA_TOOLBOX_LAUNCHER__';
const RK='__ZETA_OR_ROUTER_BOOKMARKLET_V1__';

const RAW='https://raw.githubusercontent.com/softly320/zeta-router/main/';
const CUSTOM='__ZETA_TOOLBOX_CUSTOM_TOOLS_V1__';
const POS='__ZETA_TOOLBOX_POS_V2__';

const BID='__zt_b__';
const MID='__zt_m__';
const AID='__zt_a__';
const XID='__zt_x__';
const SID='__zt_s__';
const TID='__zt_toast__';

/*
 * ★ 중요
 * 새 launcher 자체가 실행되면
 * 기존 launcher를 먼저 정리한다.
 *
 * 더 이상 if(window[K]) return 안 함.
 */
try{
  window[K]?.destroy?.();
}catch(_){}

[
  BID,MID,AID,XID,SID,TID,
  '__zeta_toolbox_button__',
  '__zeta_toolbox_menu__',
  '__zeta_toolbox_add_button__',
  '__zeta_toolbox_custom_modal__',
  '__zeta_toolbox_memory_modal__',
  '__zeta_toolbox_style__'
].forEach(id=>{
  try{document.getElementById(id)?.remove()}catch(_){}
});

try{delete window[K]}catch(_){window[K]=null}

const ac=new AbortController();
const sig=ac.signal;

let menuOpen=false;
let refreshing=false;


/* =========================================
   공통
========================================= */

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function toast(msg,bad=false){

  document.getElementById(TID)?.remove();

  const el=document.createElement('div');
  el.id=TID;
  el.textContent=msg;

  Object.assign(el.style,{
    position:'fixed',
    left:'50%',
    bottom:'78px',
    transform:'translateX(-50%)',
    zIndex:'2147483647',
    maxWidth:'calc(100vw - 30px)',
    padding:'7px 10px',
    borderRadius:'9px',
    background:bad?'#7f1d1df5':'#18181bf5',
    color:'#fff',
    font:'11px/1.35 system-ui,sans-serif',
    boxShadow:'0 5px 20px #0008',
    whiteSpace:'nowrap',
    overflow:'hidden',
    textOverflow:'ellipsis',
    pointerEvents:'none'
  });

  document.body.appendChild(el);

  setTimeout(
    ()=>el.remove(),
    bad?2300:1500
  );
}


async function raw(file){

  const url=
    RAW+
    file+
    '?cb='+
    Date.now()+
    Math.random().toString(36).slice(2);

  const r=await fetch(
    url,
    {cache:'no-store'}
  );

  if(!r.ok)
    throw Error(
      `${file} HTTP ${r.status}`
    );

  return await r.text();
}


async function evalRaw(file){

  const code=await raw(file);

  /*
   * indirect eval
   * 현재 페이지 전역에서 실행
   */
  (0,eval)(code);

  return code;
}


/* =========================================
   기존 도구 좀비 정리
========================================= */

const familyRE={
  feed:[
    /ZETA.*FEED/i,
    /FEED.*ZETA/i
  ],

  theme:[
    /ZETA.*THEME/i,
    /THEME.*ZETA/i
  ],

  narrator:[
    /ZETA.*NARRATOR/i,
    /NARRATOR.*ZETA/i,
    /ZETA.*FORMATTER/i,
    /FORMATTER.*ZETA/i
  ]
};


const domWords={
  feed:[
    'zeta-feed',
    'zeta_feed'
  ],

  theme:[
    'zeta-theme',
    'zeta_theme'
  ],

  narrator:[
    'zeta-narrator',
    'zeta_narrator',
    'zeta-roleplay-formatter',
    'zetaformatter'
  ]
};


function purgeFamily(name){

  const regexes=
    familyRE[name]||[];

  /*
   * window에 남은 구버전 객체 제거
   */
  for(
    const key
    of Object.getOwnPropertyNames(window)
  ){

    if(
      key===K||
      key===RK
    )continue;

    if(
      !regexes.some(r=>r.test(key))
    )continue;

    try{
      window[key]?.destroy?.();
    }catch(e){
      console.warn(
        '[ZETA Toolbox destroy]',
        key,
        e
      );
    }

    try{
      delete window[key];
    }catch(_){
      try{window[key]=null}catch(_){}
    }
  }


  /*
   * 예전 UI가 window key 없이
   * DOM만 남아 있는 경우도 정리
   */
  const words=
    domWords[name]||[];

  if(words.length){

    for(
      const el
      of [...document.querySelectorAll('[id]')]
    ){

      if(
        el===button||
        el===menu||
        el===add||
        el===modal
      )continue;

      const id=
        String(el.id||'')
          .toLowerCase();

      if(
        words.some(
          word=>
            id.includes(
              word.toLowerCase()
            )
        )
      ){
        try{el.remove()}catch(_){}
      }
    }
  }
}


/* =========================================
   repo 도구
   ★ 클릭할 때마다 무조건 최신 RAW
========================================= */

async function loadRepoTool(name,file){

  hide();

  toast(
    `${name} 최신판 불러오는 중…`
  );

  try{

    purgeFamily(name);

    /*
     * 구버전 UI가 애니메이션 등으로
     * 한 박자 뒤 정리되는 경우
     */
    await sleep(20);

    await evalRaw(file);

    toast(
      `${name} 최신판 실행됨`
    );

  }catch(e){

    console.error(
      '[ZETA Toolbox]',
      file,
      e
    );

    toast(
      `${name} 로드 실패`,
      true
    );

    alert(
      `${name} 로드 실패\n`+
      (e?.message||e)
    );
  }
}


/* =========================================
   Router
========================================= */

async function ensureRouter(){

  /*
   * 이미 동작 중이면 겹쳐 씌우지 않음
   */
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

    toast(
      'Router 로드 실패',
      true
    );

    return false;
  }
}


/*
 * router가 앞으로 destroy 지원 버전이 되면
 * ↻ 버튼에서 자동 최신화 가능.
 *
 * 현재 구형이면 중첩 patch를 막기 위해
 * 억지로 삭제하지 않는다.
 */
async function refreshRouter(){

  const old=window[RK];

  if(!old){

    await ensureRouter();

    return;
  }

  if(
    typeof old.destroy!=='function'
  ){

    console.log(
      '[ZETA Toolbox] router kept: destroy() 미지원 구버전'
    );

    return;
  }

  try{

    old.destroy();

    try{delete window[RK]}
    catch(_){window[RK]=null}

    await evalRaw(
      'zeta-router.js'
    );

  }catch(e){

    console.error(
      '[ZETA Toolbox router refresh]',
      e
    );
  }
}


/* =========================================
   외부 도구
========================================= */

function kit(){

  hide();

  /*
   * 이전 script 태그 제거
   */
  document
    .querySelectorAll(
      'script[data-zeta-toolbox-kit]'
    )
    .forEach(s=>s.remove());

  const s=
    document.createElement('script');

  s.dataset.zetaToolboxKit='1';

  s.src=
    'https://zetakit.pages.dev/run.js?cb='+
    Date.now();

  s.onerror=()=>{
    s.remove();

    toast(
      '키트 로드 실패',
      true
    );
  };

  (
    document.head||
    document.documentElement
  ).appendChild(s);
}


function phone(){

  hide();

  try{
    window.__INPOCKET__?.destroy?.();
  }catch(_){}

  try{
    delete window.__INPOCKET__;
  }catch(_){}

  document
    .querySelectorAll(
      'script[data-zeta-toolbox-inpocket]'
    )
    .forEach(s=>s.remove());

  const s=
    document.createElement('script');

  s.dataset.zetaToolboxInpocket='1';

  s.src=
    'https://inpocket.pages.dev/inpocket.js?cb='+
    Date.now();

  s.onload=()=>{

    try{
      window.__INPOCKET__?.open?.();
    }catch(e){

      console.error(
        '[ZETA phone]',
        e
      );
    }
  };

  s.onerror=()=>{

    s.remove();

    toast(
      '폰 로드 실패',
      true
    );
  };

  (
    document.head||
    document.documentElement
  ).appendChild(s);
}


/* =========================================
   사용자 도구
========================================= */

function getCustom(){

  try{

    const v=
      JSON.parse(
        localStorage.getItem(CUSTOM)||
        '[]'
      );

    return Array.isArray(v)
      ?v
      :[];

  }catch(_){

    return[];
  }
}


function putCustom(v){

  localStorage.setItem(
    CUSTOM,
    JSON.stringify(v)
  );
}


function normalizeCode(code){

  let c=
    String(code||'')
      .trim();

  c=c.replace(
    /^\s*javascript\s*:\s*/i,
    ''
  );

  return c;
}


function runCustom(tool){

  hide();

  try{

    const code=
      normalizeCode(
        tool.code
      );

    if(!code)
      throw Error(
        '코드가 비어 있습니다.'
      );

    (0,eval)(code);

  }catch(e){

    console.error(
      '[ZETA custom]',
      e
    );

    alert(
      `${tool.name||'사용자 도구'} 실행 실패\n`+
      (e?.message||e)
    );
  }
}


function deleteCustom(index){

  const a=getCustom();

  if(
    !confirm(
      `"${a[index]?.name||'사용자 도구'}"를 삭제할까요?`
    )
  )return;

  a.splice(index,1);

  putCustom(a);

  render();
}


/* =========================================
   STYLE
========================================= */

const style=
  document.createElement('style');

style.id=SID;

style.textContent=`
#${BID}{
position:fixed;
width:42px;height:42px;
z-index:2147483645;
border:1px solid rgba(255,255,255,.16);
border-radius:50%;
background:rgba(23,25,31,.92);
color:#fff;
box-shadow:0 6px 22px rgba(0,0,0,.36);
backdrop-filter:blur(12px);
-webkit-backdrop-filter:blur(12px);
font:800 15px/1 system-ui,sans-serif;
display:flex;
align-items:center;
justify-content:center;
padding:0;
touch-action:none;
user-select:none;
-webkit-user-select:none;
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
border:1px solid rgba(255,255,255,.12);
border-radius:16px;
background:rgba(22,24,30,.96);
box-shadow:0 14px 42px rgba(0,0,0,.48);
backdrop-filter:blur(16px);
-webkit-backdrop-filter:blur(16px);
color:#fff;
font-family:system-ui,sans-serif
}

#${MID}[data-open="1"]{
display:flex
}

#${MID} .zt-head{
display:flex;
height:30px;
align-items:center;
justify-content:space-between;
flex:0 0 auto;
padding:0 2px 7px 4px
}

#${MID} .zt-title{
font:750 11px/1 system-ui,sans-serif;
color:rgba(255,255,255,.72)
}

#${MID} .zt-refresh{
width:30px;height:28px;
border:0;border-radius:9px;
padding:0;
background:rgba(255,255,255,.07);
color:rgba(255,255,255,.8);
font:18px/1 system-ui;
display:flex;
align-items:center;
justify-content:center;
-webkit-tap-highlight-color:transparent
}

#${MID} .zt-refresh:disabled{
opacity:.4
}

#${MID} .zt-grid{
display:grid;
grid-template-columns:1fr 1fr;
gap:7px;
min-height:0;
overflow-y:auto;
overscroll-behavior:contain;
padding:1px
}

#${MID} .zt-tool{
position:relative;
min-height:55px;
border:1px solid rgba(255,255,255,.08);
border-radius:12px;
background:rgba(255,255,255,.055);
color:#fff;
padding:7px 6px;
display:flex;
flex-direction:column;
align-items:center;
justify-content:center;
gap:4px;
font-family:system-ui,sans-serif;
-webkit-tap-highlight-color:transparent
}

#${MID} .zt-tool:active{
background:rgba(255,255,255,.11)
}

#${MID} .zt-icon{
font-size:17px;
line-height:1
}

#${MID} .zt-name{
max-width:100%;
font:700 10px/1.15 system-ui,sans-serif;
overflow:hidden;
text-overflow:ellipsis;
white-space:nowrap
}

#${MID} .zt-del{
position:absolute;
top:3px;right:3px;
width:18px;height:18px;
border:0;border-radius:50%;
padding:0;
background:rgba(0,0,0,.25);
color:rgba(255,255,255,.55);
font:12px/18px system-ui
}

#${AID}{
position:fixed;
width:34px;height:34px;
z-index:2147483645;
display:none;
border:1px solid rgba(255,255,255,.13);
border-radius:50%;
background:rgba(31,34,42,.96);
color:#fff;
box-shadow:0 5px 18px rgba(0,0,0,.32);
font:300 22px/1 system-ui;
padding:0;
align-items:center;
justify-content:center;
-webkit-tap-highlight-color:transparent
}

#${AID}[data-open="1"]{
display:flex
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
background:rgba(0,0,0,.56);
font-family:system-ui,sans-serif
}

#${XID}[data-open="1"]{
display:flex
}

#${XID} .zt-box{
width:min(430px,100%);
max-height:88vh;
overflow:auto;
padding:14px;
box-sizing:border-box;
border:1px solid rgba(255,255,255,.13);
border-radius:17px;
background:#191b21;
color:#fff;
box-shadow:0 16px 55px rgba(0,0,0,.55)
}

#${XID} .zt-mh{
display:flex;
align-items:center;
justify-content:space-between;
margin-bottom:10px;
font:750 14px system-ui
}

#${XID} .zt-close{
width:32px;height:32px;
border:0;border-radius:9px;
background:rgba(255,255,255,.08);
color:#fff;
font-size:17px
}

#${XID} label{
display:block;
margin:8px 0 4px;
font-size:10px;
color:rgba(255,255,255,.58)
}

#${XID} input,
#${XID} textarea{
width:100%;
box-sizing:border-box;
border:1px solid rgba(255,255,255,.12);
border-radius:10px;
background:rgba(255,255,255,.06);
color:#fff;
outline:none;
padding:9px;
font:12px/1.45 system-ui
}

#${XID} textarea{
min-height:190px;
resize:vertical;
font-family:ui-monospace,SFMono-Regular,monospace
}

#${XID} .zt-save{
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
).appendChild(style);


/* =========================================
   DOM
========================================= */

const button=
  document.createElement('button');

button.id=BID;
button.type='button';
button.textContent='Z';
button.title='ZETA Toolbox';


const menu=
  document.createElement('div');

menu.id=MID;
menu.dataset.open='0';

menu.innerHTML=`
<div class="zt-head">
  <div class="zt-title">ZETA TOOLBOX</div>
  <button class="zt-refresh" type="button" title="도구 최신화">↻</button>
</div>
<div class="zt-grid"></div>
`;


const add=
  document.createElement('button');

add.id=AID;
add.type='button';
add.textContent='+';
add.title='사용자 도구 추가';
add.dataset.open='0';


const modal=
  document.createElement('div');

modal.id=XID;
modal.dataset.open='0';

modal.innerHTML=`
<div class="zt-box">
  <div class="zt-mh">
    <span>사용자 도구 추가</span>
    <button class="zt-close" type="button">×</button>
  </div>

  <label>아이콘 / 이모지</label>
  <input class="zt-emoji" maxlength="8" placeholder="🧩">

  <label>이름</label>
  <input class="zt-cname" maxlength="30" placeholder="도구 이름">

  <label>JavaScript / 북마클릿 코드</label>
  <textarea class="zt-code" spellcheck="false" placeholder="javascript: ..."></textarea>

  <button class="zt-save" type="button">추가</button>
</div>
`;


document.body.append(
  button,
  menu,
  add,
  modal
);


const grid=
  menu.querySelector('.zt-grid');

const refreshBtn=
  menu.querySelector('.zt-refresh');


/* =========================================
   메뉴 렌더
========================================= */

const built=[
  {
    icon:'⚙️',
    name:'키트',
    run:kit
  },
  {
    icon:'💬',
    name:'피드',
    run:()=>loadRepoTool(
      'feed',
      'zeta-feed.js'
    )
  },
  {
    icon:'✦',
    name:'테마',
    run:()=>loadRepoTool(
      'theme',
      'zeta-theme.js'
    )
  },
  {
    icon:'☎️',
    name:'폰',
    run:phone
  },
  {
    icon:'N×',
    name:'나레삭제',
    run:()=>loadRepoTool(
      'narrator',
      'zeta-narrator.js'
    )
  }
];


function card(icon,name,onClick,index=null){

  const b=
    document.createElement('button');

  b.type='button';
  b.className='zt-tool';

  const ic=
    document.createElement('span');

  ic.className='zt-icon';
  ic.textContent=icon||'🧩';

  const nm=
    document.createElement('span');

  nm.className='zt-name';
  nm.textContent=name||'사용자 도구';

  b.append(
    ic,
    nm
  );


  if(index!==null){

    const del=
      document.createElement('button');

    del.type='button';
    del.className='zt-del';
    del.textContent='×';
    del.title='삭제';

    del.onclick=e=>{
      e.stopPropagation();
      deleteCustom(index);
    };

    b.appendChild(del);
  }


  b.onclick=e=>{

    if(
      e.target.closest('.zt-del')
    )return;

    try{
      onClick();
    }catch(err){

      console.error(err);

      alert(
        '도구 실행 실패\n'+
        (err?.message||err)
      );
    }
  };


  return b;
}


function render(){

  grid.replaceChildren();

  for(const x of built){

    grid.appendChild(
      card(
        x.icon,
        x.name,
        x.run
      )
    );
  }


  /*
   * 최신 사용자 도구가
   * built-in 바로 뒤에 먼저 보임
   */
  const custom=
    getCustom();

  custom.forEach(
    (x,i)=>{
      grid.appendChild(
        card(
          x.icon||'🧩',
          x.name||'사용자 도구',
          ()=>runCustom(x),
          i
        )
      );
    }
  );
}


/* =========================================
   메뉴 위치
========================================= */

function placeMenu(){

  const b=
    button.getBoundingClientRect();

  const mw=244;

  let left=
    b.right-mw;

  if(left<6)
    left=b.left;

  left=
    Math.max(
      6,
      Math.min(
        innerWidth-mw-6,
        left
      )
    );


  /*
   * 일단 화면에 띄워 실제 높이 계산
   */
  const mh=
    menu.offsetHeight||
    250;

  let top=
    b.top-mh-8;

  if(top<6)
    top=b.bottom+8;

  top=
    Math.max(
      6,
      Math.min(
        innerHeight-mh-48,
        top
      )
    );


  menu.style.left=
    left+'px';

  menu.style.top=
    top+'px';


  const mr=
    menu.getBoundingClientRect();


  add.style.left=
    Math.max(
      6,
      Math.min(
        innerWidth-40,
        mr.left+
        mr.width/2-
        17
      )
    )+'px';


  add.style.top=
    Math.min(
      innerHeight-40,
      mr.bottom+7
    )+'px';
}


function show(){

  render();

  menuOpen=true;

  menu.dataset.open='1';
  add.dataset.open='1';

  /*
   * display 된 다음 실제 height로 위치 재계산
   */
  requestAnimationFrame(
    placeMenu
  );
}


function hide(){

  menuOpen=false;

  menu.dataset.open='0';
  add.dataset.open='0';
}


function toggleMenu(){

  menuOpen
    ?hide()
    :show();
}


/* =========================================
   사용자 도구 modal
========================================= */

function openAdd(){

  hide();

  modal.querySelector('.zt-emoji').value='';
  modal.querySelector('.zt-cname').value='';
  modal.querySelector('.zt-code').value='';

  modal.dataset.open='1';
}


function closeAdd(){

  modal.dataset.open='0';
}


add.onclick=
  openAdd;


modal.querySelector('.zt-close').onclick=
  closeAdd;


modal.addEventListener(
  'pointerdown',
  e=>{
    if(e.target===modal)
      closeAdd();
  },
  {signal:sig}
);


modal.querySelector('.zt-save').onclick=()=>{

  const icon=
    modal
      .querySelector('.zt-emoji')
      .value
      .trim()||
    '🧩';

  const name=
    modal
      .querySelector('.zt-cname')
      .value
      .trim();

  const code=
    modal
      .querySelector('.zt-code')
      .value
      .trim();


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


  const a=
    getCustom();

  /*
   * newest first
   */
  a.unshift({
    icon,
    name,
    code,
    createdAt:Date.now()
  });

  putCustom(a);

  closeAdd();

  toast(
    `${name} 추가됨`
  );
};


/* =========================================
   ↻ 전체 최신화
========================================= */

async function refreshAll(){

  if(refreshing)return;

  refreshing=true;
  refreshBtn.disabled=true;

  toast(
    '도구 최신화 중…'
  );

  try{

    /*
     * 실행 중인 안전한 UI 도구 먼저 정리
     */
    purgeFamily('feed');
    purgeFamily('theme');
    purgeFamily('narrator');


    /*
     * router는 destroy 지원 시에만
     * 안전하게 교체
     */
    await refreshRouter();


    /*
     * 새 launcher 소스를 먼저 받아온다.
     * fetch 실패했는데 현재 launcher까지
     * 날리는 상황 방지.
     */
    const code=
      await raw(
        'zeta-launcher.js'
      );


    /*
     * 이제 현재 런처 종료
     */
    destroy();


    /*
     * 최신 런처 설치
     */
    (0,eval)(code);


  }catch(e){

    refreshing=false;
    refreshBtn.disabled=false;

    console.error(
      '[ZETA Toolbox refresh]',
      e
    );

    toast(
      '최신화 실패',
      true
    );

    alert(
      'ZETA Toolbox 최신화 실패\n'+
      (e?.message||e)
    );
  }
}


refreshBtn.onclick=
  refreshAll;


/* =========================================
   Z 버튼 드래그
========================================= */

function restorePosition(){

  try{

    const p=
      JSON.parse(
        localStorage.getItem(POS)||
        'null'
      );

    if(
      p&&
      Number.isFinite(p.x)&&
      Number.isFinite(p.y)
    ){

      button.style.left=
        Math.max(
          5,
          Math.min(
            innerWidth-47,
            p.x
          )
        )+'px';

      button.style.top=
        Math.max(
          5,
          Math.min(
            innerHeight-47,
            p.y
          )
        )+'px';

      return;
    }

  }catch(_){}


  button.style.right='12px';
  button.style.bottom='70px';
}


restorePosition();


let dragging=false;
let moved=false;
let pointer=null;

let sx=0;
let sy=0;
let ox=0;
let oy=0;


button.addEventListener(
  'pointerdown',
  e=>{

    const r=
      button.getBoundingClientRect();

    dragging=true;
    moved=false;

    pointer=e.pointerId;

    sx=e.clientX;
    sy=e.clientY;

    ox=r.left;
    oy=r.top;

    button.style.left=
      r.left+'px';

    button.style.top=
      r.top+'px';

    button.style.right='auto';
    button.style.bottom='auto';

    try{
      button.setPointerCapture(
        pointer
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
      !dragging||
      e.pointerId!==pointer
    )return;

    const dx=
      e.clientX-sx;

    const dy=
      e.clientY-sy;

    if(
      Math.hypot(dx,dy)>5
    )moved=true;

    if(!moved)
      return;

    const x=
      Math.max(
        5,
        Math.min(
          innerWidth-
          button.offsetWidth-
          5,
          ox+dx
        )
      );

    const y=
      Math.max(
        5,
        Math.min(
          innerHeight-
          button.offsetHeight-
          5,
          oy+dy
        )
      );

    button.style.left=
      x+'px';

    button.style.top=
      y+'px';

    if(menuOpen)
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
      !dragging||
      e.pointerId!==pointer
    )return;

    dragging=false;

    try{
      button.releasePointerCapture(
        pointer
      );
    }catch(_){}

    const r=
      button.getBoundingClientRect();

    try{

      localStorage.setItem(
        POS,
        JSON.stringify({
          x:r.left,
          y:r.top
        })
      );

    }catch(_){}

    const tap=
      !moved;

    moved=false;
    pointer=null;

    if(tap)
      toggleMenu();

    e.preventDefault();
  },
  {
    signal:sig,
    capture:true,
    passive:false
  }
);


window.addEventListener(
  'resize',
  ()=>{

    const r=
      button.getBoundingClientRect();

    const x=
      Math.max(
        5,
        Math.min(
          innerWidth-
          button.offsetWidth-
          5,
          r.left
        )
      );

    const y=
      Math.max(
        5,
        Math.min(
          innerHeight-
          button.offsetHeight-
          5,
          r.top
        )
      );

    button.style.left=x+'px';
    button.style.top=y+'px';
    button.style.right='auto';
    button.style.bottom='auto';

    if(menuOpen)
      placeMenu();
  },
  {signal:sig}
);


/* =========================================
   정리
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
  ].forEach(id=>{

    try{
      document
        .getElementById(id)
        ?.remove();
    }catch(_){}
  });


  if(window[K]===api){

    try{
      delete window[K];
    }catch(_){
      window[K]=null;
    }
  }
}


const api={
  show,
  hide,
  toggle:toggleMenu,
  destroy,
  ensureRouter,
  refresh:refreshAll,

  /*
   * 디버깅/수동 최신화용
   */
  loadLatest(file){

    if(file==='zeta-feed.js')
      return loadRepoTool('feed',file);

    if(file==='zeta-theme.js')
      return loadRepoTool('theme',file);

    if(file==='zeta-narrator.js')
      return loadRepoTool('narrator',file);

    return evalRaw(file);
  },

  version:'5.0'
};


window[K]=api;


/* router가 없으면 자동 설치 */
ensureRouter();


render();

console.log(
  '[ZETA Toolbox] launcher v5.0 ready'
);

})();
