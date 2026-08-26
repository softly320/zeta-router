(()=>{
'use strict';

const KEY='__ZETA_TOOLBOX_LAUNCHER__';
const ROUTER_KEY='__ZETA_OR_ROUTER_BOOKMARKLET_V1__';
const BASE='https://cdn.jsdelivr.net/gh/softly320/zeta-router@main/';

const URLS={
  router:BASE+'zeta-router.js',
  feed:BASE+'zeta-feed.js',
  theme:BASE+'zeta-theme.js',
  narrator:BASE+'zeta-narrator.js',
  kit:'https://zetakit.pages.dev/run.js',
  phone:'https://inpocket.pages.dev/inpocket.js'
};

const IDS={
  button:'__zeta_toolbox_button__',
  menu:'__zeta_toolbox_menu__',
  add:'__zeta_toolbox_add_button__',
  modal:'__zeta_toolbox_custom_modal__',
  style:'__zeta_toolbox_style__'
};

const POS_KEY='__ZETA_TOOLBOX_POSITION__';
const CUSTOM_KEY='__ZETA_TOOLBOX_CUSTOM_TOOLS_V1__';


/* =========================================================
   재실행

   이미 존재하면 절대로 OFF/삭제하지 않는다.
   기존 Z 버튼 + 메뉴만 다시 보여준다.
   ========================================================= */

if(
  window[KEY]?.show &&
  document.getElementById(IDS.button)
){
  window[KEY].show();
  window[KEY].ensureRouter?.();
  return;
}


/*
 * 전역 키만 남고 DOM이 사라진 비정상 상태
 * 이 경우에만 새로 생성
 */
try{
  delete window[KEY];
}catch(_){
  window[KEY]=null;
}


Object.values(IDS).forEach(id=>{
  document.getElementById(id)?.remove();
});


/* =========================================================
   외부 JS 로더
   ========================================================= */

function loadScript(
  url,
  onload,
  onerror
){

  const s=
    document.createElement('script');

  s.src=
    url+
    (url.includes('?')?'&':'?')+
    't='+
    Date.now();


  s.onload=()=>{

    s.remove();

    onload?.();
  };


  s.onerror=()=>{

    s.remove();

    if(onerror){

      onerror();

    }else{

      alert(
        '스크립트 로드 실패:\n'+
        url
      );
    }
  };


  (
    document.head ||
    document.documentElement
  ).appendChild(s);
}


/* =========================================================
   Provider Router
   ========================================================= */

function ensureRouter(done){

  if(window[ROUTER_KEY]){

    updateRouterState();

    done?.();

    return;
  }


  loadScript(

    URLS.router,

    ()=>{

      updateRouterState();

      done?.();
    },

    ()=>{

      alert(
        'Provider Router를 불러오지 못했습니다.'
      );

      updateRouterState();

      done?.();
    }
  );
}


/* =========================================================
   기본 기능
   ========================================================= */

function openKit(){

  ensureRouter(
    ()=>loadScript(URLS.kit)
  );
}


function openFeed(){

  loadScript(
    URLS.feed
  );
}


function applyTheme(){

  loadScript(
    URLS.theme
  );
}


async function openNarrator(){

  try{

    const url=
      'https://raw.githubusercontent.com/softly320/zeta-router/main/zeta-narrator.js?cb='+
      Date.now();


    const response=
      await fetch(
        url,
        {
          cache:'no-store'
        }
      );


    if(!response.ok){

      throw new Error(
        'HTTP '+
        response.status
      );
    }


    const code=
      await response.text();


    (0,eval)(code);


  }catch(error){

    console.error(
      '[ZETA Toolbox] narrator load error',
      error
    );


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
   사용자 도구
   ========================================================= */

function readCustomTools(){

  try{

    const data=
      JSON.parse(
        localStorage.getItem(
          CUSTOM_KEY
        ) || '[]'
      );


    return Array.isArray(data)
      ? data
      : [];

  }catch(_){

    return [];
  }
}


function writeCustomTools(data){

  localStorage.setItem(
    CUSTOM_KEY,
    JSON.stringify(data)
  );
}


function normalizeUserCode(code){

  return String(code||'')
    .trim()
    .replace(
      /^javascript\s*:/i,
      ''
    )
    .trim();
}


function runCustomTool(tool){

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
      '[ZETA Toolbox] custom tool error',
      error
    );


    alert(
      '사용자 도구 실행 실패:\n'+
      (
        error?.message ||
        error
      )
    );
  }
}


function esc(value){

  return String(value??'')
    .replace(
      /[&<>"']/g,
      c=>({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[c])
    );
}


/* =========================================================
   STYLE
   ========================================================= */

const style=
  document.createElement('style');


style.id=
  IDS.style;


style.textContent=`

/* =========================
   메인 Z 버튼
   ========================= */

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

  z-index:2147483645;

  border:
    1px solid
    rgba(255,255,255,.20);

  border-radius:9999px;

  background:
    linear-gradient(
      145deg,
      rgba(45,48,58,.97),
      rgba(20,22,28,.97)
    );

  color:#fff;

  font:
    800 15px/1
    system-ui,
    -apple-system,
    sans-serif;

  box-shadow:
    0 6px 22px
    rgba(0,0,0,.32),

    inset 0 1px 0
    rgba(255,255,255,.08);

  backdrop-filter:
    blur(12px);

  -webkit-backdrop-filter:
    blur(12px);

  cursor:grab;

  user-select:none;
  -webkit-user-select:none;

  touch-action:none;

  -webkit-tap-highlight-color:
    transparent;
}


#${IDS.button}:active{

  transform:
    scale(.94);
}


#${IDS.button}[data-dragging="1"]{

  cursor:grabbing;

  transform:
    scale(1.04);
}


/* Router 점 */

#${IDS.button} .zt-dot{

  position:absolute;

  top:3px;
  right:3px;

  width:8px;
  height:8px;

  border-radius:50%;

  background:#ef4444;

  border:
    1.5px solid
    rgba(20,22,28,.95);
}


#${IDS.button}[data-router="on"]
.zt-dot{

  background:#22c55e;

  box-shadow:
    0 0 7px
    rgba(34,197,94,.65);
}


/* =========================
   도구 메뉴
   ========================= */

#${IDS.menu}{

  position:fixed;

  z-index:2147483646;

  width:
    min(
      286px,
      calc(100vw - 20px)
    );

  box-sizing:border-box;

  display:none;

  padding:10px;

  border:
    1px solid
    rgba(255,255,255,.12);

  border-radius:20px;

  background:
    rgba(22,24,30,.97);

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


#${IDS.menu} .zt-head{

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


#${IDS.menu} .zt-state{

  color:#ef4444;

  font-weight:700;
}


#${IDS.menu}
.zt-state[data-on="1"]{

  color:#4ade80;
}


/*
 * 도구가 많아지면
 * 카드 부분만 스크롤
 */

#${IDS.menu} .zt-scroll{

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

  scrollbar-width:
    thin;
}


#${IDS.menu} .zt-grid{

  display:grid;

  grid-template-columns:
    repeat(
      2,
      minmax(0,1fr)
    );

  gap:10px;
}


/* 카드 */

#${IDS.menu} .zt-item{

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


#${IDS.menu} .zt-item:active{

  background:
    rgba(255,255,255,.15);

  border-color:
    rgba(255,255,255,.20);

  transform:
    scale(.965);
}


#${IDS.menu} .zt-icon{

  display:flex;

  align-items:center;

  justify-content:center;

  min-height:24px;

  max-width:100%;

  overflow:hidden;

  font-size:21px;

  line-height:1;

  pointer-events:none;
}


#${IDS.menu} .zt-label{

  max-width:100%;

  overflow:hidden;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;

  pointer-events:none;

  font-size:12px;
}


/* =========================
   ★ 도구 추가 버튼

   메뉴 내부가 아니다.
   별도의 fixed DOM이다.
   ========================= */

#${IDS.add}{

  position:fixed;

  z-index:2147483647;

  width:46px;
  height:46px;

  display:none;

  align-items:center;
  justify-content:center;

  padding:0;

  border:
    1px solid
    rgba(147,197,253,.34);

  border-radius:50%;

  background:
    rgba(28,32,42,.98);

  color:#93c5fd;

  font:
    300 28px/1
    system-ui;

  box-shadow:
    0 8px 26px
    rgba(0,0,0,.42);

  backdrop-filter:
    blur(14px);

  -webkit-backdrop-filter:
    blur(14px);

  cursor:pointer;

  touch-action:
    manipulation;

  -webkit-tap-highlight-color:
    transparent;
}


#${IDS.add}[data-open="1"]{

  display:flex;
}


#${IDS.add}:active{

  transform:
    scale(.92);

  background:
    rgba(55,65,81,.98);
}


/* =========================
   사용자 도구 관리창
   ========================= */

#${IDS.modal}{

  position:fixed;

  inset:0;

  z-index:2147483647;

  display:none;

  align-items:center;

  justify-content:center;

  box-sizing:border-box;

  padding:16px;

  background:
    rgba(0,0,0,.55);

  backdrop-filter:
    blur(6px);

  -webkit-backdrop-filter:
    blur(6px);

  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}


#${IDS.modal}[data-open="1"]{

  display:flex;
}


#${IDS.modal} .zm-card{

  box-sizing:border-box;

  width:
    min(
      440px,
      100%
    );

  max-height:
    min(
      84vh,
      720px
    );

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


#${IDS.modal} .zm-title{

  display:flex;

  align-items:center;

  justify-content:
    space-between;

  margin-bottom:14px;

  font:
    750 15px/1.2
    system-ui;
}


#${IDS.modal} .zm-close{

  width:34px;
  height:34px;

  border:0;

  border-radius:10px;

  background:
    rgba(255,255,255,.07);

  color:#fff;

  font-size:18px;
}


#${IDS.modal} .zm-row{

  display:grid;

  grid-template-columns:
    80px 1fr;

  gap:10px;

  margin-bottom:10px;
}


#${IDS.modal} label{

  display:block;

  margin:
    0 0 6px 2px;

  color:
    rgba(255,255,255,.62);

  font-size:11px;
}


#${IDS.modal} input,

#${IDS.modal} textarea{

  box-sizing:border-box;

  width:100%;

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

  font:
    13px/1.45
    system-ui;
}


#${IDS.modal} textarea{

  min-height:150px;

  resize:vertical;

  font-family:
    ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;

  font-size:11px;
}


#${IDS.modal} .zm-actions{

  display:flex;

  gap:8px;

  margin-top:12px;
}


#${IDS.modal} .zm-btn{

  flex:1;

  height:40px;

  border:0;

  border-radius:12px;

  font:
    700 12px/1
    system-ui;
}


#${IDS.modal} .zm-save{

  background:#6d88cf;

  color:#fff;
}


#${IDS.modal} .zm-cancel{

  background:
    rgba(255,255,255,.07);

  color:
    rgba(255,255,255,.82);
}


#${IDS.modal} .zm-divider{

  height:1px;

  margin:
    17px 0 12px;

  background:
    rgba(255,255,255,.09);
}


#${IDS.modal} .zm-sub{

  margin-bottom:8px;

  color:
    rgba(255,255,255,.62);

  font-size:11px;
}


#${IDS.modal} .zm-list{

  display:flex;

  flex-direction:column;

  gap:7px;
}


#${IDS.modal} .zm-entry{

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


#${IDS.modal} .zm-eicon{

  text-align:center;

  font-size:18px;
}


#${IDS.modal} .zm-ename{

  overflow:hidden;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;

  font-size:12px;
}


#${IDS.modal} .zm-mini{

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


#${IDS.modal} .zm-delete{

  color:#fca5a5;
}


#${IDS.modal} .zm-empty{

  padding:14px 4px;

  text-align:center;

  color:
    rgba(255,255,255,.38);

  font-size:11px;
}

`;


(
  document.head ||
  document.documentElement
).appendChild(style);


/* =========================================================
   DOM 생성
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
    <b style="opacity:.45">
      4.0
    </b>
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
 * ★ 별도 + 버튼
 * menu 안에 append하지 않는다.
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


const modal=
  document.createElement(
    'div'
  );


modal.id=
  IDS.modal;


modal.dataset.open=
  '0';


modal.innerHTML=`

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


/*
 * 네 개가 서로 형제 DOM
 *
 * button
 * menu
 * addButton
 * modal
 */
(
  document.body ||
  document.documentElement
).append(
  button,
  menu,
  addButton,
  modal
);


/* =========================================================
   DOM refs
   ========================================================= */

const grid=
  menu.querySelector(
    '.zt-grid'
  );


const state=
  menu.querySelector(
    '.zt-state'
  );


const iconInput=
  modal.querySelector(
    '.zm-icon'
  );


const nameInput=
  modal.querySelector(
    '.zm-name'
  );


const codeInput=
  modal.querySelector(
    '.zm-code'
  );


const saveBtn=
  modal.querySelector(
    '.zm-save'
  );


const listBox=
  modal.querySelector(
    '.zm-list'
  );


let editingId=
  null;


/* =========================================================
   기본 도구

   여기에 +가 없다.
   ========================================================= */

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


/* =========================================================
   카드 렌더
   ========================================================= */

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


/* =========================================================
   사용자 도구 관리
   ========================================================= */

function resetForm(){

  editingId=
    null;

  iconInput.value='';
  nameInput.value='';
  codeInput.value='';

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
    class="zm-mini"
    data-edit="${esc(tool.id)}"
  >
    수정
  </button>

  <button
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

  modal.dataset.open=
    '1';


  setTimeout(
    ()=>nameInput.focus(),
    0
  );
}


function closeManager(){

  modal.dataset.open=
    '0';
}


/* =========================================================
   저장
   ========================================================= */

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

      /*
       * 새 도구는
       * 사용자 도구 중 앞쪽
       */
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


/* =========================================================
   관리창 이벤트
   ========================================================= */

modal
  .querySelector(
    '.zm-close'
  )
  .addEventListener(
    'click',
    closeManager
  );


modal
  .querySelector(
    '.zm-cancel'
  )
  .addEventListener(
    'click',
    resetForm
  );


modal.addEventListener(
  'pointerdown',
  event=>{

    if(
      event.target===
      modal
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


      if(!tool)return;


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


      const tool=
        tools.find(
          item=>
            item.id===id
        );


      if(
        !tool ||
        !confirm(
          `“${tool.name}” 도구를 삭제할까요?`
        )
      ){
        return;
      }


      writeCustomTools(

        tools.filter(
          item=>
            item.id!==id
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


/* =========================================================
   별도 + 버튼
   ========================================================= */

addButton.addEventListener(
  'click',
  ()=>{

    closeMenu();

    openManager();
  }
);


/* =========================================================
   Router 상태
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


/* =========================================================
   메뉴 위치

   메뉴와 +는 서로 별개다.
   ========================================================= */

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


  const ADD_SIZE=
    46;


  const GAP=
    10;


  const PAD=
    8;


  const totalHeight=

    height+
    GAP+
    ADD_SIZE;


  let left=

    b.left+

    b.width/2-

    width/2;


  left=
    Math.max(

      PAD,

      Math.min(

        innerWidth-
        width-
        PAD,

        left
      )
    );


  let top;


  if(
    b.top-
    totalHeight-
    10>=
    PAD
  ){

    top=

      b.top-
      totalHeight-
      10;

  }else{

    top=

      Math.max(

        PAD,

        Math.min(

          innerHeight-
          totalHeight-
          PAD,

          b.top-
          totalHeight/2
        )
      );
  }


  menu.style.left=
    left+
    'px';


  menu.style.top=
    top+
    'px';


  /*
   * 별도 + 버튼:
   * 메뉴 아래 중앙
   */
  addButton.style.left=

    (
      left+
      width/2-
      ADD_SIZE/2
    )+

    'px';


  addButton.style.top=

    (
      top+
      height+
      GAP
    )+

    'px';
}


/* =========================================================
   메뉴
   ========================================================= */

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


/*
 * 재실행용
 */
function show(){

  button.style.display=
    'flex';


  openMenu();
}


/* =========================================================
   카드 실행
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


    if(!item)return;


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
        openNarrator
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
      pointerId===null ||
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
      !moved &&
      Math.hypot(
        dx,
        dy
      )>5
    ){

      moved=true;

      closeMenu();
    }


    if(!moved)return;


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


function finishDrag(event){

  if(
    pointerId===null ||
    (
      event &&
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
      ) ||
      'null'
    );


  if(
    pos &&
    Number.isFinite(pos.x) &&
    Number.isFinite(pos.y)
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
   바깥 클릭
   ========================================================= */

function outsidePointer(event){

  if(
    menu.dataset.open!==
    '1'
  ){
    return;
  }


  if(
    menu.contains(
      event.target
    ) ||

    button.contains(
      event.target
    ) ||

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

   직접 호출할 때만 UI 제거.
   재실행에서는 사용하지 않는다.
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

  ensureRouter,

  destroy,

  custom:{

    open:
      openManager,

    read:
      readCustomTools
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
      openNarrator
  }
};


renderGrid();

ensureRouter();

updateRouterState();


console.log(
  '[ZETA Toolbox] READY 4.0'
);

})();
