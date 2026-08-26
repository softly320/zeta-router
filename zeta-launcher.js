(()=>{
'use strict';

const KEY='__ZETA_TOOLBOX_V3__';
const LEGACY_KEYS=['__ZETA_TOOLBOX_V1__','__ZETA_TOOLBOX_V2__'];
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

const BUTTON_ID='__zeta_toolbox_button__';
const MENU_ID='__zeta_toolbox_menu__';
const STYLE_ID='__zeta_toolbox_style__';
const MODAL_ID='__zeta_toolbox_custom_modal__';
const POS_KEY='__ZETA_TOOLBOX_POSITION__';
const CUSTOM_KEY='__ZETA_TOOLBOX_CUSTOM_TOOLS_V1__';

/* 이미 실행 중이면 절대 OFF하지 않음 */
if(window[KEY]){
  const api=window[KEY];
  const btn=document.getElementById(BUTTON_ID);
  const menu=document.getElementById(MENU_ID);

  if(btn&&menu){
    btn.style.display='flex';

    try{
      api.open?.();
    }catch(_){}

    try{
      api.ensureRouter?.();
    }catch(_){}

    return;
  }

  /*
   * 상태 키만 남고 버튼이 사라진 경우
   * 낡은 상태 제거 후 아래에서 재생성
   */
  try{
    api.destroy?.();
  }catch(_){}

  try{
    delete window[KEY];
  }catch(_){
    window[KEY]=null;
  }
}


/* 구버전 V1/V2 흔적 정리 */
for(const k of LEGACY_KEYS){
  try{
    delete window[k];
  }catch(_){}
}

for(const id of [
  BUTTON_ID,
  MENU_ID,
  STYLE_ID,
  MODAL_ID
]){
  document.getElementById(id)?.remove();
}


function loadScript(url,onload,onerror){

  const s=document.createElement('script');

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
    document.head||
    document.documentElement
  ).appendChild(s);
}


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


function openKit(){
  ensureRouter(
    ()=>loadScript(URLS.kit)
  );
}


function openFeed(){
  loadScript(URLS.feed);
}


function applyTheme(){
  loadScript(URLS.theme);
}


function openNarrator(){
  loadScript(URLS.narrator);
}


function openPhone(){

  try{
    window.__INPOCKET__?.destroy?.();
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
    URLS.phone+
    '?cb='+
    Date.now();

  s.onload=()=>{
    try{
      window.__INPOCKET__?.open?.();
    }catch(_){}
  };

  s.onerror=()=>{
    alert(
      'inPocket 스크립트를 불러오지 못했습니다.'
    );
  };

  (
    document.head||
    document.documentElement
  ).appendChild(s);
}


function readCustomTools(){

  try{

    const v=
      JSON.parse(
        localStorage.getItem(
          CUSTOM_KEY
        )||'[]'
      );

    return Array.isArray(v)
      ? v
      : [];

  }catch(_){

    return [];
  }
}


function writeCustomTools(list){

  localStorage.setItem(
    CUSTOM_KEY,
    JSON.stringify(list)
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
      '실행할 JavaScript가 비어 있습니다.'
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
        error?.message||
        error
      )
    );
  }
}


function escapeHTML(v){

  return String(v??'')
    .replace(
      /[&<>"']/g,
      ch=>({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[ch])
    );
}


/* =========================================================
   CSS
   ========================================================= */

const style=
  document.createElement('style');

style.id=
  STYLE_ID;

style.textContent=`

#${BUTTON_ID}{
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

  z-index:2147483646;

  border:
    1px solid
    rgba(255,255,255,.20);

  border-radius:9999px;

  background:
    linear-gradient(
      145deg,
      rgba(45,48,58,.96),
      rgba(20,22,28,.96)
    );

  color:#fff;

  font:
    800 15px/1
    system-ui,
    -apple-system,
    sans-serif;

  box-shadow:
    0 6px 22px
    rgba(0,0,0,.30),

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


#${BUTTON_ID}:active{

  transform:
    scale(.94);
}


#${BUTTON_ID}[data-dragging="1"]{

  cursor:grabbing;

  transform:
    scale(1.04);
}


#${BUTTON_ID}
.zeta-toolbox-dot{

  position:absolute;

  top:3px;
  right:3px;

  width:8px;
  height:8px;

  border-radius:999px;

  background:#ef4444;

  border:
    1.5px solid
    rgba(20,22,28,.95);

  box-shadow:
    0 0 5px
    rgba(239,68,68,.45);
}


#${BUTTON_ID}[data-router="on"]
.zeta-toolbox-dot{

  background:#22c55e;

  box-shadow:
    0 0 7px
    rgba(34,197,94,.65);
}


/* =========================================================
   메뉴
   ========================================================= */

#${MENU_ID}{

  position:fixed;

  z-index:2147483647;

  width:
    min(
      296px,
      calc(100vw - 20px)
    );

  padding:10px;

  display:none;

  box-sizing:border-box;

  border:
    1px solid
    rgba(255,255,255,.13);

  border-radius:20px;

  background:
    rgba(22,24,30,.97);

  color:#fff;

  box-shadow:
    0 14px 42px
    rgba(0,0,0,.42);

  backdrop-filter:
    blur(18px);

  -webkit-backdrop-filter:
    blur(18px);

  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}


#${MENU_ID}[data-open="1"]{

  display:block;
}


#${MENU_ID}
.zeta-toolbox-head{

  display:flex;

  align-items:center;

  justify-content:
    space-between;

  padding:
    3px 4px 9px;

  margin-bottom:8px;

  color:
    rgba(255,255,255,.58);

  font-size:10px;

  border-bottom:
    1px solid
    rgba(255,255,255,.08);
}


#${MENU_ID}
.zeta-router-state{

  color:#ef4444;

  font-weight:700;
}


#${MENU_ID}
.zeta-router-state[data-on="1"]{

  color:#4ade80;
}


/*
 * 카드가 많아지면
 * 이 영역만 스크롤
 */
#${MENU_ID}
.zeta-toolbox-scroll{

  max-height:
    min(
      52vh,
      430px
    );

  overflow-y:auto;

  overflow-x:hidden;

  padding:
    1px 2px 5px;

  -webkit-overflow-scrolling:
    touch;

  overscroll-behavior:
    contain;

  scrollbar-width:
    thin;
}


#${MENU_ID}
.zeta-toolbox-grid{

  display:grid;

  grid-template-columns:
    repeat(
      2,
      minmax(0,1fr)
    );

  gap:10px;
}


#${MENU_ID}
.zeta-toolbox-item{

  width:100%;

  min-width:0;

  height:88px;

  display:flex;

  flex-direction:column;

  align-items:center;

  justify-content:center;

  gap:8px;

  padding:
    8px 6px;

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

  transition:
    background .12s ease,
    transform .08s ease,
    border-color .12s ease;
}


#${MENU_ID}
.zeta-toolbox-item:active{

  background:
    rgba(255,255,255,.15);

  border-color:
    rgba(255,255,255,.20);

  transform:
    scale(.965);
}


#${MENU_ID}
.zeta-toolbox-icon{

  display:flex;

  align-items:center;

  justify-content:center;

  min-height:25px;

  font-size:22px;

  line-height:1;

  pointer-events:none;

  max-width:100%;

  overflow:hidden;
}


#${MENU_ID}
.zeta-toolbox-label{

  max-width:100%;

  overflow:hidden;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;

  font-size:12px;

  line-height:1.1;

  pointer-events:none;
}


/* =========================================================
   + 버튼은 카드 영역에서 완전히 분리
   ========================================================= */

#${MENU_ID}
.zeta-toolbox-footer{

  display:flex;

  justify-content:center;

  align-items:center;

  padding:
    10px 2px 0;

  margin-top:6px;

  border-top:
    1px solid
    rgba(255,255,255,.08);
}


#${MENU_ID}
.zeta-toolbox-add{

  width:44px;
  height:44px;

  border:
    1px solid
    rgba(147,197,253,.24);

  border-radius:999px;

  background:
    rgba(96,165,250,.10);

  color:#bfdbfe;

  font:
    400 28px/1
    system-ui;

  display:flex;

  align-items:center;

  justify-content:center;

  padding:0;

  cursor:pointer;

  touch-action:
    manipulation;

  -webkit-tap-highlight-color:
    transparent;

  box-shadow:
    inset 0 0 0 1px
    rgba(255,255,255,.02);
}


#${MENU_ID}
.zeta-toolbox-add:active{

  transform:
    scale(.93);

  background:
    rgba(96,165,250,.20);
}


/* =========================================================
   사용자 도구 설정창
   ========================================================= */

#${MODAL_ID}{

  position:fixed;

  inset:0;

  z-index:2147483647;

  display:none;

  align-items:center;

  justify-content:center;

  padding:16px;

  background:
    rgba(0,0,0,.54);

  backdrop-filter:
    blur(6px);

  -webkit-backdrop-filter:
    blur(6px);

  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}


#${MODAL_ID}[data-open="1"]{

  display:flex;
}


#${MODAL_ID}
.ztm-card{

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

  -webkit-overflow-scrolling:
    touch;
}


#${MODAL_ID}
.ztm-title{

  display:flex;

  align-items:center;

  justify-content:
    space-between;

  margin-bottom:14px;

  font:
    750 15px/1.2
    system-ui;
}


#${MODAL_ID}
.ztm-close{

  width:34px;
  height:34px;

  border:0;

  border-radius:10px;

  background:
    rgba(255,255,255,.07);

  color:#fff;

  font-size:18px;
}


#${MODAL_ID}
.ztm-row{

  display:grid;

  grid-template-columns:
    78px 1fr;

  gap:10px;

  margin-bottom:10px;
}


#${MODAL_ID}
label{

  display:block;

  margin:
    0 0 6px 2px;

  color:
    rgba(255,255,255,.62);

  font-size:11px;
}


#${MODAL_ID}
input,

#${MODAL_ID}
textarea{

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

  font:
    13px/1.45
    system-ui;

  padding:
    10px 11px;
}


#${MODAL_ID}
textarea{

  min-height:150px;

  resize:vertical;

  font-family:
    ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;

  font-size:11px;
}


#${MODAL_ID}
input:focus,

#${MODAL_ID}
textarea:focus{

  border-color:
    rgba(147,197,253,.7);

  box-shadow:
    0 0 0 2px
    rgba(59,130,246,.13);
}


#${MODAL_ID}
.ztm-actions{

  display:flex;

  gap:8px;

  margin-top:12px;
}


#${MODAL_ID}
.ztm-btn{

  flex:1;

  height:40px;

  border:0;

  border-radius:12px;

  font:
    700 12px/1
    system-ui;
}


#${MODAL_ID}
.ztm-save{

  background:#6d88cf;

  color:#fff;
}


#${MODAL_ID}
.ztm-cancel{

  background:
    rgba(255,255,255,.07);

  color:
    rgba(255,255,255,.82);
}


#${MODAL_ID}
.ztm-divider{

  height:1px;

  margin:
    17px 0 12px;

  background:
    rgba(255,255,255,.09);
}


#${MODAL_ID}
.ztm-subtitle{

  margin-bottom:8px;

  color:
    rgba(255,255,255,.62);

  font-size:11px;
}


#${MODAL_ID}
.ztm-list{

  display:flex;

  flex-direction:column;

  gap:7px;
}


#${MODAL_ID}
.ztm-entry{

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


#${MODAL_ID}
.ztm-entry-icon{

  text-align:center;

  font-size:18px;

  overflow:hidden;
}


#${MODAL_ID}
.ztm-entry-name{

  overflow:hidden;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;

  font-size:12px;
}


#${MODAL_ID}
.ztm-mini{

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


#${MODAL_ID}
.ztm-delete{

  color:#fca5a5;
}


#${MODAL_ID}
.ztm-empty{

  padding:
    14px 4px;

  text-align:center;

  color:
    rgba(255,255,255,.38);

  font-size:11px;
}


#${MODAL_ID}
.ztm-note{

  margin-top:8px;

  color:
    rgba(255,255,255,.38);

  font-size:10px;

  line-height:1.4;
}
`;

(
  document.head||
  document.documentElement
).appendChild(style);


/* =========================================================
   기본 UI
   ========================================================= */

const button=
  document.createElement(
    'button'
  );

button.id=
  BUTTON_ID;

button.type=
  'button';

button.innerHTML=
  '<span>Z</span>'+
  '<span class="zeta-toolbox-dot"></span>';


const menu=
  document.createElement(
    'div'
  );

menu.id=
  MENU_ID;

menu.dataset.open=
  '0';

menu.innerHTML=`

<div class="zeta-toolbox-head">

  <span>
    ZETA TOOLS
  </span>

  <span class="zeta-router-state">
    ROUTER
  </span>

</div>


<div class="zeta-toolbox-scroll">

  <div class="zeta-toolbox-grid"></div>

</div>


<div class="zeta-toolbox-footer">

  <button
    type="button"
    class="zeta-toolbox-add"
    aria-label="도구 추가"
    title="도구 추가"
  >
    ＋
  </button>

</div>

`;


const modal=
  document.createElement(
    'div'
  );

modal.id=
  MODAL_ID;

modal.dataset.open=
  '0';

modal.innerHTML=`

<div class="ztm-card">

  <div class="ztm-title">

    <span>
      사용자 도구
    </span>

    <button
      type="button"
      class="ztm-close"
      aria-label="닫기"
    >
      ×
    </button>

  </div>


  <div class="ztm-row">

    <div>

      <label>
        아이콘
      </label>

      <input
        class="ztm-icon"
        type="text"
        maxlength="12"
        placeholder="🧩"
      >

    </div>


    <div>

      <label>
        이름
      </label>

      <input
        class="ztm-name"
        type="text"
        maxlength="40"
        placeholder="내 도구"
      >

    </div>

  </div>


  <label>
    JavaScript / 북마클릿 코드
  </label>


  <textarea
    class="ztm-code"
    spellcheck="false"
    placeholder="javascript:(()=>{ ... })()
또는
(()=>{ ... })()"
  ></textarea>


  <div class="ztm-actions">

    <button
      type="button"
      class="ztm-btn ztm-cancel"
    >
      초기화
    </button>


    <button
      type="button"
      class="ztm-btn ztm-save"
    >
      추가
    </button>

  </div>


  <div class="ztm-note">

    저장한 코드는 이 브라우저의 localStorage에 보관됩니다.
    신뢰하는 코드만 실행하세요.

  </div>


  <div class="ztm-divider"></div>


  <div class="ztm-subtitle">
    추가한 도구
  </div>


  <div class="ztm-list"></div>

</div>

`;


(
  document.body||
  document.documentElement
).append(
  button,
  menu,
  modal
);


const grid=
  menu.querySelector(
    '.zeta-toolbox-grid'
  );

const addButton=
  menu.querySelector(
    '.zeta-toolbox-add'
  );

const iconInput=
  modal.querySelector(
    '.ztm-icon'
  );

const nameInput=
  modal.querySelector(
    '.ztm-name'
  );

const codeInput=
  modal.querySelector(
    '.ztm-code'
  );

const saveBtn=
  modal.querySelector(
    '.ztm-save'
  );

const listBox=
  modal.querySelector(
    '.ztm-list'
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
  }
];


function tileHTML({
  action,
  icon,
  name,
  customId
}){

  const attr=
    customId
      ? `data-custom-id="${escapeHTML(customId)}"`
      : `data-action="${escapeHTML(action)}"`;


  return `

<button
  type="button"
  class="zeta-toolbox-item"
  ${attr}
>

  <span class="zeta-toolbox-icon">
    ${escapeHTML(icon)}
  </span>

  <span class="zeta-toolbox-label">
    ${escapeHTML(name)}
  </span>

</button>

`;
}


function renderGrid(){

  const custom=
    readCustomTools();


  grid.innerHTML=

    BUILTINS
      .map(tileHTML)
      .join('')

    +

    custom
      .map(
        t=>
          tileHTML({
            customId:t.id,
            icon:t.icon||'🧩',
            name:t.name||'도구'
          })
      )
      .join('');
}


function resetForm(){

  editingId=
    null;

  iconInput.value='';
  nameInput.value='';
  codeInput.value='';

  saveBtn.textContent=
    '추가';
}


function renderCustomList(){

  const tools=
    readCustomTools();


  if(!tools.length){

    listBox.innerHTML=

      '<div class="ztm-empty">'+
      '아직 추가한 도구가 없습니다.'+
      '</div>';

    return;
  }


  listBox.innerHTML=

    tools
      .map(
        t=>`

<div
  class="ztm-entry"
  data-id="${escapeHTML(t.id)}"
>

  <div class="ztm-entry-icon">
    ${escapeHTML(t.icon||'🧩')}
  </div>

  <div class="ztm-entry-name">
    ${escapeHTML(t.name||'도구')}
  </div>

  <button
    type="button"
    class="ztm-mini"
    data-edit="${escapeHTML(t.id)}"
  >
    수정
  </button>

  <button
    type="button"
    class="ztm-mini ztm-delete"
    data-delete="${escapeHTML(t.id)}"
  >
    삭제
  </button>

</div>

`
      )
      .join('');
}


function openCustomManager(){

  resetForm();

  renderCustomList();

  modal.dataset.open=
    '1';

  setTimeout(
    ()=>nameInput.focus(),
    0
  );
}


function closeCustomManager(){

  modal.dataset.open=
    '0';
}


/* + 버튼 */
addButton.addEventListener(
  'click',

  ()=>{

    closeMenu();

    openCustomManager();
  }
);


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

      nameInput.focus();

      return;
    }


    if(!code){

      alert(
        'JavaScript 코드를 입력해주세요.'
      );

      codeInput.focus();

      return;
    }


    const tools=
      readCustomTools();


    if(editingId){

      const i=
        tools.findIndex(
          t=>t.id===editingId
        );


      if(i>=0){

        tools[i]={
          ...tools[i],
          icon,
          name,
          code
        };
      }

    }else{

      /*
       * 새 사용자 도구는
       * 사용자 도구 중 맨 앞에 들어감
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

    renderCustomList();

    resetForm();
  }
);


modal
  .querySelector(
    '.ztm-cancel'
  )
  .addEventListener(
    'click',
    resetForm
  );


modal
  .querySelector(
    '.ztm-close'
  )
  .addEventListener(
    'click',
    closeCustomManager
  );


modal.addEventListener(
  'pointerdown',

  e=>{

    if(e.target===modal){

      closeCustomManager();
    }
  }
);


listBox.addEventListener(
  'click',

  e=>{

    const edit=
      e.target.closest(
        '[data-edit]'
      );


    const del=
      e.target.closest(
        '[data-delete]'
      );


    if(edit){

      const t=
        readCustomTools()
          .find(
            x=>
              x.id===
              edit.dataset.edit
          );


      if(!t)return;


      editingId=
        t.id;


      iconInput.value=
        t.icon||'';


      nameInput.value=
        t.name||'';


      codeInput.value=
        t.code||'';


      saveBtn.textContent=
        '저장';


      codeInput.scrollIntoView({
        behavior:'smooth',
        block:'center'
      });


      return;
    }


    if(del){

      const id=
        del.dataset.delete;


      const tools=
        readCustomTools();


      const t=
        tools.find(
          x=>x.id===id
        );


      if(!t)return;


      if(
        !confirm(
          `“${t.name}” 도구를 삭제할까요?`
        )
      ){
        return;
      }


      writeCustomTools(

        tools.filter(
          x=>x.id!==id
        )
      );


      if(editingId===id){

        resetForm();
      }


      renderGrid();

      renderCustomList();
    }
  }
);


/* =========================================================
   Router 표시
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


  const state=
    menu.querySelector(
      '.zeta-router-state'
    );


  if(state){

    state.dataset.on=
      on
        ? '1'
        : '0';


    state.textContent=
      on
        ? 'ROUTER ON'
        : 'ROUTER …';
  }
}


/* =========================================================
   메뉴 위치
   ========================================================= */

function positionMenu(){

  const b=
    button
      .getBoundingClientRect();


  const width=
    menu.offsetWidth||
    296;


  const height=
    menu.offsetHeight||
    430;


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


  const above=

    b.top-
    height-
    10;


  const below=

    b.bottom+
    10;


  let top;


  if(
    above>=pad
  ){

    top=
      above;

  }

  else if(

    below+
    height<=
    innerHeight-
    pad

  ){

    top=
      below;

  }

  else{

    top=
      Math.max(

        pad,

        Math.min(

          innerHeight-
          height-
          pad,

          b.top-
          height/2
        )
      );
  }


  menu.style.left=
    left+
    'px';


  menu.style.top=
    top+
    'px';
}


function openMenu(){

  renderGrid();

  menu.dataset.open=
    '1';


  requestAnimationFrame(
    positionMenu
  );


  updateRouterState();
}


function closeMenu(){

  menu.dataset.open=
    '0';
}


function toggleMenu(){

  menu.dataset.open===
  '1'

    ? closeMenu()

    : openMenu();
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
            t=>
              t.id===
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


    const action=
      item.dataset.action;


    closeMenu();


    if(action==='kit'){

      openKit();
    }

    else if(
      action==='feed'
    ){

      openFeed();
    }

    else if(
      action==='theme'
    ){

      applyTheme();
    }

    else if(
      action==='phone'
    ){

      openPhone();
    }

    else if(
      action==='narrator'
    ){

      openNarrator();
    }
  }
);


/* =========================================================
   Z 버튼 드래그
   ========================================================= */

let pointerId=
  null;

let moved=
  false;

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

      moved=
        true;


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
    pointerId===
    null
  ){
    return;
  }


  if(
    event&&
    event.pointerId!==
    pointerId
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

    const r=
      button
        .getBoundingClientRect();


    try{

      localStorage.setItem(

        POS_KEY,

        JSON.stringify({
          x:r.left,
          y:r.top
        })
      );

    }catch(_){}

  }else{

    toggleMenu();
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
   버튼 위치 복원
   ========================================================= */

try{

  const saved=

    JSON.parse(

      localStorage.getItem(
        POS_KEY
      )||

      'null'
    );


  if(

    saved&&

    Number.isFinite(
      saved.x
    )&&

    Number.isFinite(
      saved.y
    )

  ){

    button.style.left=

      Math.max(

        5,

        Math.min(

          innerWidth-
          49,

          saved.x
        )
      )+

      'px';


    button.style.top=

      Math.max(

        5,

        Math.min(

          innerHeight-
          49,

          saved.y
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

document.addEventListener(
  'pointerdown',

  event=>{

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
      )

    ){
      return;
    }


    closeMenu();
  },

  true
);


/* =========================================================
   화면 크기 변경
   ========================================================= */

window.addEventListener(
  'resize',

  ()=>{

    const r=
      button
        .getBoundingClientRect();


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


    if(
      menu.dataset.open===
      '1'
    ){

      positionMenu();
    }
  }
);


/* =========================================================
   미래 버전 교체용 destroy
   ========================================================= */

function destroy(){

  document
    .getElementById(
      BUTTON_ID
    )
    ?.remove();


  document
    .getElementById(
      MENU_ID
    )
    ?.remove();


  document
    .getElementById(
      MODAL_ID
    )
    ?.remove();


  document
    .getElementById(
      STYLE_ID
    )
    ?.remove();


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

  open:
    openMenu,

  close:
    closeMenu,

  toggle:
    toggleMenu,

  ensureRouter,

  destroy,

  custom:{

    open:
      openCustomManager,

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
  '[ZETA Toolbox] READY v3'
);

})();
