(()=>{
'use strict';

const KEY='__ZETA_TOOLBOX_LAUNCHER__';
const ROUTER_KEY='__ZETA_OR_ROUTER_BOOKMARKLET_V1__';

const RAW_BASE=
  'https://raw.githubusercontent.com/softly320/zeta-router/main/';

const URLS={
  router:RAW_BASE+'zeta-router.js',
  feed:RAW_BASE+'zeta-feed.js',
  theme:RAW_BASE+'zeta-theme.js',
  narrator:RAW_BASE+'zeta-narrator.js',

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
   이미 실행 중이면 재로드하지 않고 다시 표시
   ========================================================= */

if(
  window[KEY]?.show &&
  document.getElementById(IDS.button)
){
  window[KEY].show();
  window[KEY].ensureRouter?.();
  return;
}


/* =========================================================
   깨진 이전 인스턴스 청소
   ========================================================= */

try{
  window[KEY]?.destroy?.();
}catch(_){}

try{
  delete window[KEY];
}catch(_){
  window[KEY]=null;
}

Object.values(IDS).forEach(id=>{
  document.getElementById(id)?.remove();
});


/* =========================================================
   GitHub RAW JS 실행
   ========================================================= */

async function runRaw(url){

  const response=
    await fetch(
      url+
      (url.includes('?')?'&':'?')+
      'cb='+
      Date.now(),
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
}


/* =========================================================
   일반 script loader
   ========================================================= */

function loadScript(url){

  return new Promise(
    (resolve,reject)=>{

      const s=
        document.createElement('script');

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
   Router
   ========================================================= */

async function ensureRouter(){

  if(window[ROUTER_KEY]){
    updateRouterState();
    return true;
  }

  try{

    await runRaw(
      URLS.router
    );

    updateRouterState();

    return !!window[ROUTER_KEY];

  }catch(error){

    console.error(
      '[ZETA Toolbox] Router load error',
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


/* =========================================================
   기본 도구
   ========================================================= */

async function openKit(){

  try{

    await ensureRouter();

    await loadScript(
      URLS.kit
    );

  }catch(error){

    console.error(
      '[ZETA Toolbox] kit error',
      error
    );

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

    console.error(
      '[ZETA Toolbox] feed error',
      error
    );

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

    console.error(
      '[ZETA Toolbox] theme error',
      error
    );

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

    console.error(
      '[ZETA Toolbox] narrator error',
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
   ★ 빠졌던 openPhone
   ========================================================= */

function openPhone(){

  try{
    window.__INPOCKET__?.destroy?.();
  }catch(_){}

  document
    .querySelectorAll(
      'script[data-zeta-toolbox-inpocket]'
    )
    .forEach(
      s=>s.remove()
    );

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
    }catch(error){

      console.error(
        '[ZETA Toolbox] inPocket open error',
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
   사용자 도구 데이터
   ========================================================= */

function readCustomTools(){

  try{

    const data=
      JSON.parse(
        localStorage.getItem(
          CUSTOM_KEY
        )||
        '[]'
      );

    return Array.isArray(data)
      ? data
      : [];

  }catch(_){

    return [];
  }
}


function writeCustomTools(data){

  try{

    localStorage.setItem(
      CUSTOM_KEY,
      JSON.stringify(data)
    );

  }catch(error){

    console.error(
      '[ZETA Toolbox] custom save error',
      error
    );
  }
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
      '[ZETA Toolbox] custom error',
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

#${IDS.button}{
  position:fixed;
  right:14px;
  bottom:calc(90px + env(safe-area-inset-bottom,0px));
  width:44px;
  height:44px;
  padding:0;
  margin:0;
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:2147483644;
  border:1px solid rgba(255,255,255,.20);
  border-radius:999px;
  background:linear-gradient(145deg,#30333d,#15171c);
  color:#fff;
  font:800 15px/1 system-ui,-apple-system,sans-serif;
  box-shadow:0 6px 22px rgba(0,0,0,.32);
  cursor:grab;
  user-select:none;
  -webkit-user-select:none;
  touch-action:none;
  -webkit-tap-highlight-color:transparent;
}

#${IDS.button}[data-dragging="1"]{
  cursor:grabbing;
}

#${IDS.button} .zt-dot{
  position:absolute;
  top:3px;
  right:3px;
  width:8px;
  height:8px;
  border-radius:50%;
  background:#ef4444;
  border:1.5px solid #15171c;
}

#${IDS.button}[data-router="on"] .zt-dot{
  background:#22c55e;
  box-shadow:0 0 7px rgba(34,197,94,.65);
}


#${IDS.menu}{
  position:fixed;
  z-index:2147483645;
  display:none;
  width:min(286px,calc(100vw - 20px));
  box-sizing:border-box;
  padding:10px;
  border:1px solid rgba(255,255,255,.12);
  border-radius:20px;
  background:rgba(22,24,30,.98);
  color:#fff;
  box-shadow:0 14px 42px rgba(0,0,0,.44);
  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
  font-family:system-ui,-apple-system,sans-serif;
}

#${IDS.menu}[data-open="1"]{
  display:block;
}

#${IDS.menu} .zt-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  height:25px;
  padding:0 3px 8px;
  margin-bottom:9px;
  color:rgba(255,255,255,.55);
  font-size:10px;
  border-bottom:1px solid rgba(255,255,255,.08);
}

#${IDS.menu} .zt-state{
  color:#ef4444;
  font-weight:700;
}

#${IDS.menu} .zt-state[data-on="1"]{
  color:#4ade80;
}

#${IDS.menu} .zt-scroll{
  max-height:min(48vh,390px);
  overflow-y:auto;
  overflow-x:hidden;
  padding:1px;
  -webkit-overflow-scrolling:touch;
  overscroll-behavior:contain;
}

#${IDS.menu} .zt-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:10px;
}

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
  border:1px solid rgba(255,255,255,.10);
  border-radius:16px;
  background:rgba(255,255,255,.048);
  color:rgba(255,255,255,.95);
  text-align:center;
  font:650 12px/1.1 system-ui,-apple-system,sans-serif;
  cursor:pointer;
  touch-action:manipulation;
  -webkit-tap-highlight-color:transparent;
}

#${IDS.menu} .zt-item:active{
  transform:scale(.965);
  background:rgba(255,255,255,.15);
}

#${IDS.menu} .zt-icon{
  min-height:24px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:21px;
  line-height:1;
  pointer-events:none;
}

#${IDS.menu} .zt-label{
  max-width:100%;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  pointer-events:none;
}


/*
 * ★ 메뉴 바깥 독립 + 버튼
 */
#${IDS.add}{
  position:fixed;
  z-index:2147483646;
  display:none;
  align-items:center;
  justify-content:center;
  width:46px;
  height:46px;
  padding:0;
  border:1px solid rgba(147,197,253,.35);
  border-radius:50%;
  background:#1d212a;
  color:#93c5fd;
  font:300 28px/1 system-ui;
  box-shadow:0 8px 26px rgba(0,0,0,.42);
  cursor:pointer;
  touch-action:manipulation;
  -webkit-tap-highlight-color:transparent;
}

#${IDS.add}[data-open="1"]{
  display:flex;
}


/* 사용자 도구 모달 */

#${IDS.modal}{
  position:fixed;
  inset:0;
  z-index:2147483647;
  display:none;
  align-items:center;
  justify-content:center;
  box-sizing:border-box;
  padding:16px;
  background:rgba(0,0,0,.58);
  backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);
  font-family:system-ui,-apple-system,sans-serif;
}

#${IDS.modal}[data-open="1"]{
  display:flex;
}

#${IDS.modal} .zm-card{
  width:min(440px,100%);
  max-height:84vh;
  box-sizing:border-box;
  overflow:auto;
  padding:16px;
  border:1px solid rgba(255,255,255,.13);
  border-radius:20px;
  background:#191b21;
  color:#fff;
  box-shadow:0 18px 60px rgba(0,0,0,.46);
}

#${IDS.modal} .zm-title{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:14px;
  font:750 15px/1.2 system-ui;
}

#${IDS.modal} .zm-close{
  width:34px;
  height:34px;
  border:0;
  border-radius:10px;
  background:rgba(255,255,255,.07);
  color:#fff;
  font-size:18px;
}

#${IDS.modal} .zm-row{
  display:grid;
  grid-template-columns:80px 1fr;
  gap:10px;
  margin-bottom:10px;
}

#${IDS.modal} label{
  display:block;
  margin:0 0 6px 2px;
  color:rgba(255,255,255,.62);
  font-size:11px;
}

#${IDS.modal} input,
#${IDS.modal} textarea{
  width:100%;
  box-sizing:border-box;
  border:1px solid rgba(255,255,255,.11);
  border-radius:12px;
  background:rgba(255,255,255,.055);
  color:#fff;
  outline:none;
  padding:10px 11px;
}

#${IDS.modal} textarea{
  min-height:150px;
  resize:vertical;
  font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;
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
  font:700 12px/1 system-ui;
}

#${IDS.modal} .zm-save{
  background:#6d88cf;
  color:#fff;
}

#${IDS.modal} .zm-cancel{
  background:rgba(255,255,255,.07);
  color:#fff;
}

#${IDS.modal} .zm-divider{
  height:1px;
  margin:17px 0 12px;
  background:rgba(255,255,255,.09);
}

#${IDS.modal} .zm-sub{
  margin-bottom:8px;
  color:rgba(255,255,255,.62);
  font-size:11px;
}

#${IDS.modal} .zm-list{
  display:flex;
  flex-direction:column;
  gap:7px;
}

#${IDS.modal} .zm-entry{
  display:grid;
  grid-template-columns:34px minmax(0,1fr) auto auto;
  gap:7px;
  align-items:center;
  padding:8px;
  border:1px solid rgba(255,255,255,.08);
  border-radius:12px;
  background:rgba(255,255,255,.035);
}

#${IDS.modal} .zm-eicon{
  text-align:center;
  font-size:18px;
}

#${IDS.modal} .zm-ename{
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  font-size:12px;
}

#${IDS.modal} .zm-mini{
  height:30px;
  padding:0 9px;
  border:0;
  border-radius:9px;
  background:rgba(255,255,255,.07);
  color:#fff;
  font:650 10px/1 system-ui;
}

#${IDS.modal} .zm-delete{
  color:#fca5a5;
}

#${IDS.modal} .zm-empty{
  padding:14px 4px;
  text-align:center;
  color:rgba(255,255,255,.38);
  font-size:11px;
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
  document.createElement('button');

button.id=IDS.button;
button.type='button';
button.innerHTML=
  '<span>Z</span>'+
  '<span class="zt-dot"></span>';


const menu=
  document.createElement('div');

menu.id=IDS.menu;
menu.dataset.open='0';

menu.innerHTML=`
<div class="zt-head">
  <span>ZETA TOOLS</span>
  <span class="zt-state">ROUTER</span>
</div>

<div class="zt-scroll">
  <div class="zt-grid"></div>
</div>
`;


/*
 * +는 menu 안에 넣지 않음
 */
const addButton=
  document.createElement('button');

addButton.id=IDS.add;
addButton.type='button';
addButton.dataset.open='0';
addButton.textContent='＋';
addButton.title='도구 추가';


const modal=
  document.createElement('div');

modal.id=IDS.modal;
modal.dataset.open='0';

modal.innerHTML=`
<div class="zm-card">

  <div class="zm-title">
    <span>사용자 도구</span>
    <button type="button" class="zm-close">×</button>
  </div>

  <div class="zm-row">

    <div>
      <label>아이콘</label>
      <input class="zm-icon" maxlength="12" placeholder="🧩">
    </div>

    <div>
      <label>이름</label>
      <input class="zm-name" maxlength="40" placeholder="내 도구">
    </div>

  </div>

  <label>JavaScript / 북마클릿</label>

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

(
  document.body||
  document.documentElement
).append(
  button,
  menu,
  addButton,
  modal
);


const grid=
  menu.querySelector('.zt-grid');

const state=
  menu.querySelector('.zt-state');

const iconInput=
  modal.querySelector('.zm-icon');

const nameInput=
  modal.querySelector('.zm-name');

const codeInput=
  modal.querySelector('.zm-code');

const saveBtn=
  modal.querySelector('.zm-save');

const listBox=
  modal.querySelector('.zm-list');

let editingId=null;


/* =========================================================
   기본 도구
   + 도구는 여기에 없음
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
            customId:tool.id,
            icon:tool.icon||'🧩',
            name:tool.name||'도구'
          })
      )
      .join('');
}


/* =========================================================
   사용자 도구 관리
   ========================================================= */

function resetForm(){

  editingId=null;

  iconInput.value='';
  nameInput.value='';
  codeInput.value='';

  saveBtn.textContent='추가';
}


function renderList(){

  const tools=
    readCustomTools();

  listBox.innerHTML=
    tools.length
      ? tools.map(
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
        ).join('')
      : '<div class="zm-empty">아직 추가한 도구가 없습니다.</div>';
}


function openManager(){

  resetForm();

  renderList();

  modal.dataset.open='1';
}


function closeManager(){

  modal.dataset.open='0';
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
            tool.id===editingId
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
          Date.now().toString(36)+
          '_'+
          Math.random().toString(36).slice(2,7),
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


modal
  .querySelector('.zm-close')
  .addEventListener(
    'click',
    closeManager
  );


modal
  .querySelector('.zm-cancel')
  .addEventListener(
    'click',
    resetForm
  );


modal.addEventListener(
  'pointerdown',
  event=>{

    if(event.target===modal){
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

      editingId=tool.id;

      iconInput.value=
        tool.icon||'';

      nameInput.value=
        tool.name||'';

      codeInput.value=
        tool.code||'';

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
          tool=>tool.id===id
        );

      if(
        !target||
        !confirm(
          `“${target.name}” 도구를 삭제할까요?`
        )
      ){
        return;
      }

      writeCustomTools(
        tools.filter(
          tool=>tool.id!==id
        )
      );

      if(editingId===id){
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
   Router 표시
   ========================================================= */

function updateRouterState(){

  const on=
    !!window[ROUTER_KEY];

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
   ========================================================= */

function positionMenu(){

  const b=
    button.getBoundingClientRect();

  const width=
    menu.offsetWidth||
    286;

  const height=
    menu.offsetHeight||
    390;

  const addSize=46;
  const gap=10;
  const pad=8;

  let left=
    b.left+
    b.width/2-
    width/2;

  left=
    Math.max(
      pad,
      Math.min(
        innerWidth-width-pad,
        left
      )
    );

  const totalHeight=
    height+
    gap+
    addSize;

  let top;

  if(
    b.top-totalHeight-10>=pad
  ){

    top=
      b.top-
      totalHeight-
      10;

  }else{

    top=
      Math.max(
        pad,
        Math.min(
          innerHeight-
          totalHeight-
          pad,
          b.top-
          totalHeight/2
        )
      );
  }

  menu.style.left=
    left+'px';

  menu.style.top=
    top+'px';

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


/* =========================================================
   메뉴 열기/닫기
   ========================================================= */

function openMenu(){

  renderGrid();

  menu.dataset.open='1';
  addButton.dataset.open='1';

  requestAnimationFrame(
    positionMenu
  );

  updateRouterState();
}


function closeMenu(){

  menu.dataset.open='0';
  addButton.dataset.open='0';
}


function show(){

  button.style.display='flex';

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
        runCustomTool(tool);
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
      kit:openKit,
      feed:openFeed,
      theme:applyTheme,
      phone:openPhone,
      narrator:openNarrator
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

    moved=false;

    const rect=
      button.getBoundingClientRect();

    startX=event.clientX;
    startY=event.clientY;

    startLeft=rect.left;
    startTop=rect.top;

    button.dataset.dragging='1';

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
      pointerId===null||
      event.pointerId!==pointerId
    ){
      return;
    }

    const dx=
      event.clientX-startX;

    const dy=
      event.clientY-startY;

    if(
      !moved&&
      Math.hypot(dx,dy)>5
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
      x+'px';

    button.style.top=
      y+'px';

    button.style.right='auto';
    button.style.bottom='auto';

    event.preventDefault();
  }
);


function finishDrag(event){

  if(
    pointerId===null||
    (
      event&&
      event.pointerId!==pointerId
    )
  ){
    return;
  }

  try{
    button.releasePointerCapture(
      pointerId
    );
  }catch(_){}

  button.dataset.dragging='0';

  if(moved){

    const rect=
      button.getBoundingClientRect();

    try{

      localStorage.setItem(
        POS_KEY,
        JSON.stringify({
          x:rect.left,
          y:rect.top
        })
      );

    }catch(_){}

  }else{

    openMenu();
  }

  pointerId=null;
  moved=false;
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
    Number.isFinite(pos.x)&&
    Number.isFinite(pos.y)
  ){

    button.style.left=
      Math.max(
        5,
        Math.min(
          innerWidth-49,
          pos.x
        )
      )+
      'px';

    button.style.top=
      Math.max(
        5,
        Math.min(
          innerHeight-49,
          pos.y
        )
      )+
      'px';

    button.style.right='auto';
    button.style.bottom='auto';
  }

}catch(_){}


/* =========================================================
   바깥 클릭
   ========================================================= */

function outsidePointer(event){

  if(
    menu.dataset.open!=='1'
  ){
    return;
  }

  if(
    menu.contains(event.target)||
    button.contains(event.target)||
    addButton.contains(event.target)
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
   resize
   ========================================================= */

function onResize(){

  if(
    menu.dataset.open==='1'
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

  Object.values(IDS)
    .forEach(
      id=>
        document
          .getElementById(id)
          ?.remove()
    );

  try{
    delete window[KEY];
  }catch(_){
    window[KEY]=null;
  }
}


/* =========================================================
   API
   ========================================================= */

window[KEY]={
  show,
  open:openMenu,
  close:closeMenu,
  destroy,
  ensureRouter,

  actions:{
    kit:openKit,
    feed:openFeed,
    theme:applyTheme,
    phone:openPhone,
    narrator:openNarrator
  },

  custom:{
    open:openManager,
    read:readCustomTools
  }
};


/* =========================================================
   시작
   ========================================================= */

renderGrid();
updateRouterState();
ensureRouter();

console.log(
  '[ZETA Toolbox] READY'
);

})();
