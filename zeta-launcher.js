(()=>{
'use strict';

const KEY='__ZETA_TOOLBOX_LAUNCHER__';
const ROUTER_KEY='__ZETA_OR_ROUTER_BOOKMARKLET_V1__';
const MEM_PATCH='__ZETA_RP_MEMORY_INJECTOR_V2__';
const MEM_STORE='__ZETA_RP_MEMORY_V1__';
const MEM_MARK='[continuity notes]';
const MEM_EVT='__zeta_rp_memory_change__';
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
  custom:'__zeta_toolbox_custom_modal__',
  memory:'__zeta_toolbox_memory_modal__',
  style:'__zeta_toolbox_style__'
};

const POS_KEY='__ZETA_TOOLBOX_POSITION__';
const CUSTOM_KEY='__ZETA_TOOLBOX_CUSTOM_TOOLS_V1__';

if(window[KEY]?.show&&document.getElementById(IDS.button)){
  window[KEY].show();
  window[KEY].ensureRouter?.();
  return;
}

try{window[KEY]?.destroy?.();}catch(_){}
try{delete window[KEY];}catch(_){window[KEY]=null;}

Object.values(IDS).forEach(
  id=>document.getElementById(id)?.remove()
);

async function runRaw(url){
  const r=await fetch(
    url+(url.includes('?')?'&':'?')+'cb='+Date.now(),
    {cache:'no-store'}
  );

  if(!r.ok)throw new Error('HTTP '+r.status);

  (0,eval)(await r.text());
}

function loadScript(url){
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');

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
      reject(new Error('스크립트 로드 실패'));
    };

    (document.head||document.documentElement)
      .appendChild(s);
  });
}


/* RP MEMORY */

function chatKey(){
  return location.origin+location.pathname;
}

function readMemAll(){
  try{
    const v=JSON.parse(
      localStorage.getItem(MEM_STORE)||'{}'
    );

    return (
      v&&
      typeof v==='object'&&
      !Array.isArray(v)
    )?v:{};

  }catch(_){
    return {};
  }
}

function normalizeMem(v={}){
  return {
    text:String(v.text||''),

    interval:
      [3,5,10].includes(Number(v.interval))
        ?Number(v.interval)
        :0,

    turn:
      Number.isFinite(Number(v.turn))
        ?Math.max(0,Number(v.turn))
        :0,

    armed:!!v.armed,

    lastSig:String(v.lastSig||''),

    updatedAt:Number(v.updatedAt)||0
  };
}

function readMem(){
  return normalizeMem(
    readMemAll()[chatKey()]
  );
}

function writeMem(v){
  const all=readMemAll();

  all[chatKey()]={
    ...normalizeMem(v),
    updatedAt:Date.now()
  };

  localStorage.setItem(
    MEM_STORE,
    JSON.stringify(all)
  );

  notifyMem();
}

function patchMem(partial){
  const v={
    ...readMem(),
    ...partial
  };

  writeMem(v);

  return v;
}

function notifyMem(){
  try{
    window.dispatchEvent(
      new Event(MEM_EVT)
    );
  }catch(_){}
}

function memoryBlock(text){
  text=String(text||'').trim();

  if(!text)return '';

  return `${MEM_MARK}
Use only for continuity. Never mention, quote, summarize, or imitate these notes.
${text}
[/continuity notes]`;
}

function contentText(content){
  if(typeof content==='string'){
    return content;
  }

  if(Array.isArray(content)){
    return content
      .map(
        x=>
          typeof x?.text==='string'
            ?x.text
            :''
      )
      .join('\n');
  }

  return '';
}

function hashText(s){
  let h=2166136261;

  for(let i=0;i<s.length;i++){
    h^=s.charCodeAt(i);
    h=Math.imul(h,16777619);
  }

  return (h>>>0).toString(36);
}

function userSig(messages){
  if(
    !Array.isArray(messages)||
    !messages.length
  ){
    return '';
  }

  const last=
    messages[messages.length-1];

  if(last?.role!=='user'){
    return '';
  }

  return (
    messages.length+
    ':'+
    hashText(
      contentText(last.content)
    )
  );
}

function containsMemory(messages){
  return messages.some(
    m=>
      contentText(m?.content)
        .includes(MEM_MARK)
  );
}

function decideMemory(messages){
  const v=readMem();
  const text=v.text.trim();

  if(!text){
    return {
      inject:false,
      text:'',
      v
    };
  }

  let changed=false;
  let autoDue=false;

  const sig=
    userSig(messages);

  if(
    v.interval>0&&
    sig&&
    sig!==v.lastSig
  ){
    v.lastSig=sig;
    v.turn+=1;
    changed=true;

    if(v.turn>=v.interval){
      autoDue=true;
      v.turn=0;
    }
  }

  const oneShot=
    v.armed;

  if(oneShot){
    v.armed=false;
    changed=true;
  }

  if(changed){
    writeMem(v);
  }

  return {
    inject:
      oneShot||
      autoDue,

    text,
    v
  };
}

function injectMessages(messages,text){
  if(
    !text||
    containsMemory(messages)
  ){
    return messages;
  }

  const block=
    memoryBlock(text);

  if(!block){
    return messages;
  }

  const out=
    messages.slice();

  let at=0;
  let lastSystem=-1;

  while(
    at<out.length&&
    ['system','developer']
      .includes(out[at]?.role)
  ){
    if(
      typeof out[at]?.content===
      'string'
    ){
      lastSystem=at;
    }

    at++;
  }

  if(lastSystem>=0){
    out[lastSystem]={
      ...out[lastSystem],

      content:
        out[lastSystem].content+
        '\n\n'+
        block
    };
  }else{
    out.splice(
      at,
      0,
      {
        role:'system',
        content:block
      }
    );
  }

  return out;
}

function injectDeep(value,depth=0){
  if(
    !value||
    typeof value!=='object'||
    depth>5
  ){
    return {
      value,
      changed:false,
      handled:false
    };
  }

  if(
    !Array.isArray(value)&&
    Array.isArray(value.messages)
  ){
    if(
      containsMemory(
        value.messages
      )
    ){
      return {
        value,
        changed:false,
        handled:true
      };
    }

    const d=
      decideMemory(
        value.messages
      );

    if(!d.inject){
      return {
        value,
        changed:false,
        handled:true
      };
    }

    return {
      value:{
        ...value,

        messages:
          injectMessages(
            value.messages,
            d.text
          )
      },

      changed:true,
      handled:true
    };
  }

  if(Array.isArray(value)){
    for(
      let i=0;
      i<value.length;
      i++
    ){
      const r=
        injectDeep(
          value[i],
          depth+1
        );

      if(r.handled){
        if(!r.changed){
          return {
            value,
            changed:false,
            handled:true
          };
        }

        const out=
          value.slice();

        out[i]=r.value;

        return {
          value:out,
          changed:true,
          handled:true
        };
      }
    }

    return {
      value,
      changed:false,
      handled:false
    };
  }

  for(
    const [k,item]
    of Object.entries(value)
  ){
    if(
      item&&
      typeof item==='object'
    ){
      const r=
        injectDeep(
          item,
          depth+1
        );

      if(r.handled){
        if(!r.changed){
          return {
            value,
            changed:false,
            handled:true
          };
        }

        return {
          value:{
            ...value,
            [k]:r.value
          },

          changed:true,
          handled:true
        };
      }
    }
  }

  return {
    value,
    changed:false,
    handled:false
  };
}

function installMemoryInjector(){
  if(window[MEM_PATCH]){
    return;
  }

  const baseFetch=
    window.fetch;

  const X=
    XMLHttpRequest.prototype;

  const baseSend=
    X.send;

  const stringify=
    JSON.stringify.bind(JSON);

  function transformBody(body){
    if(
      typeof body!=='string'
    ){
      return body;
    }

    const t=
      body.trim();

    if(
      !t||
      (
        t[0]!=='{'&&
        t[0]!=='['
      )
    ){
      return body;
    }

    try{
      const parsed=
        JSON.parse(body);

      const r=
        injectDeep(parsed);

      return r.changed
        ?stringify(r.value)
        :body;

    }catch(_){
      return body;
    }
  }

  window.fetch=
    function(input,init){
      try{
        if(
          init&&
          typeof init.body==='string'
        ){
          const body=
            transformBody(
              init.body
            );

          if(body!==init.body){
            init={
              ...init,
              body
            };
          }
        }
      }catch(e){
        console.warn(
          '[ZETA MEMORY] fetch',
          e
        );
      }

      return baseFetch.call(
        this,
        input,
        init
      );
    };

  X.send=
    function(body){
      try{
        body=
          transformBody(body);
      }catch(e){
        console.warn(
          '[ZETA MEMORY] xhr',
          e
        );
      }

      return baseSend.call(
        this,
        body
      );
    };

  window[MEM_PATCH]={
    version:'2.0'
  };

  console.log(
    '[ZETA MEMORY] injector ON v2'
  );
}

installMemoryInjector();


/* ROUTER + TOOLS */

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

    return !!window[
      ROUTER_KEY
    ];

  }catch(e){
    console.error(
      '[ZETA Toolbox] router',
      e
    );

    updateRouterState();

    alert(
      'Provider Router 로드 실패\n'+
      (e?.message||e)
    );

    return false;
  }
}

async function openKit(){
  try{
    await ensureRouter();
    await loadScript(URLS.kit);
  }catch(e){
    alert(
      '키트 로드 실패\n'+
      (e?.message||e)
    );
  }
}

async function openFeed(){
  try{
    await runRaw(URLS.feed);
  }catch(e){
    alert(
      '피드 로드 실패\n'+
      (e?.message||e)
    );
  }
}

async function applyTheme(){
  try{
    await runRaw(URLS.theme);
  }catch(e){
    alert(
      '테마 로드 실패\n'+
      (e?.message||e)
    );
  }
}

async function openNarrator(){
  try{
    await runRaw(
      URLS.narrator
    );
  }catch(e){
    alert(
      '나레삭제 로드 실패\n'+
      (e?.message||e)
    );
  }
}

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
    }catch(e){
      console.error(e);
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


/* CUSTOM */

function readCustom(){
  try{
    const v=
      JSON.parse(
        localStorage.getItem(
          CUSTOM_KEY
        )||
        '[]'
      );

    return Array.isArray(v)
      ?v
      :[];

  }catch(_){
    return [];
  }
}

function writeCustom(v){
  localStorage.setItem(
    CUSTOM_KEY,
    JSON.stringify(v)
  );
}

function normCode(v){
  return String(v||'')
    .trim()
    .replace(
      /^javascript\s*:/i,
      ''
    )
    .trim();
}

function runCustom(tool){
  const code=
    normCode(tool?.code);

  if(!code){
    return alert(
      '실행할 코드가 없습니다.'
    );
  }

  try{
    (0,eval)(code);
  }catch(e){
    console.error(e);

    alert(
      '사용자 도구 실행 실패\n'+
      (e?.message||e)
    );
  }
}

function esc(v){
  return String(v??'')
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


/* STYLE */

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
bottom:calc(90px + env(safe-area-inset-bottom,0px));
width:44px;
height:44px;
padding:0;
display:flex;
align-items:center;
justify-content:center;
z-index:2147483644;
border:1px solid #ffffff33;
border-radius:999px;
background:linear-gradient(145deg,#30333d,#15171c);
color:#fff;
font:800 15px/1 system-ui;
box-shadow:0 6px 22px #0005;
touch-action:none;
user-select:none
}

#${IDS.button} .dot{
position:absolute;
top:3px;
right:3px;
width:8px;
height:8px;
border-radius:50%;
background:#ef4444;
border:1.5px solid #15171c
}

#${IDS.button}[data-router="on"] .dot{
background:#22c55e;
box-shadow:0 0 7px #22c55eaa
}

#${IDS.menu}{
position:fixed;
z-index:2147483645;
display:none;
width:min(286px,calc(100vw - 20px));
box-sizing:border-box;
padding:10px;
border:1px solid #ffffff1f;
border-radius:20px;
background:#16181efa;
color:#fff;
box-shadow:0 14px 42px #0007;
font-family:system-ui
}

#${IDS.menu}[data-open="1"]{
display:block
}

#${IDS.menu} .head{
display:flex;
justify-content:space-between;
align-items:center;
padding:0 3px 8px;
margin-bottom:9px;
color:#ffffff88;
font-size:10px;
border-bottom:1px solid #ffffff14
}

#${IDS.menu} .state{
color:#ef4444;
font-weight:700
}

#${IDS.menu} .state[data-on="1"]{
color:#4ade80
}

#${IDS.menu} .scroll{
max-height:min(48vh,390px);
overflow-y:auto;
padding:1px
}

#${IDS.menu} .grid{
display:grid;
grid-template-columns:repeat(2,minmax(0,1fr));
gap:10px
}

#${IDS.menu} .item{
height:84px;
border:1px solid #ffffff1a;
border-radius:16px;
background:#ffffff0c;
color:#fff;
display:flex;
flex-direction:column;
align-items:center;
justify-content:center;
gap:8px;
font:650 12px system-ui
}

#${IDS.menu} .item:active{
transform:scale(.965);
background:#ffffff26
}

#${IDS.menu} .icon{
font-size:21px;
pointer-events:none
}

#${IDS.menu} .label{
max-width:100%;
overflow:hidden;
text-overflow:ellipsis;
white-space:nowrap;
pointer-events:none
}

#${IDS.add}{
position:fixed;
z-index:2147483646;
display:none;
align-items:center;
justify-content:center;
width:46px;
height:46px;
padding:0;
border:1px solid #93c5fd59;
border-radius:50%;
background:#1d212a;
color:#93c5fd;
font:300 28px/1 system-ui;
box-shadow:0 8px 26px #0007
}

#${IDS.add}[data-open="1"]{
display:flex
}

#${IDS.custom},
#${IDS.memory}{
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

#${IDS.custom}[data-open="1"],
#${IDS.memory}[data-open="1"]{
display:flex
}

.card{
width:min(440px,100%);
max-height:86vh;
overflow:auto;
box-sizing:border-box;
padding:16px;
border:1px solid #ffffff21;
border-radius:20px;
background:#191b21;
color:#fff;
box-shadow:0 18px 60px #0007
}

.title{
display:flex;
align-items:center;
justify-content:space-between;
margin-bottom:13px;
font:750 15px system-ui
}

.close{
width:34px;
height:34px;
border:0;
border-radius:10px;
background:#ffffff12;
color:#fff;
font-size:18px
}

label{
display:block;
margin:0 0 6px 2px;
color:#ffffff99;
font-size:11px
}

input,
textarea{
box-sizing:border-box;
width:100%;
border:1px solid #ffffff1c;
border-radius:12px;
background:#ffffff0e;
color:#fff;
padding:10px 11px;
outline:none
}

textarea{
resize:vertical
}

.row{
display:grid;
grid-template-columns:80px 1fr;
gap:10px;
margin-bottom:10px
}

.actions{
display:flex;
gap:8px;
margin-top:10px
}

.btn{
min-height:40px;
border:0;
border-radius:12px;
background:#ffffff12;
color:#fff;
font:700 11px system-ui;
padding:0 12px
}

.primary{
background:#6d88cf
}

.danger{
color:#fca5a5
}

.list{
display:flex;
flex-direction:column;
gap:7px;
margin-top:12px
}

.entry{
display:grid;
grid-template-columns:34px minmax(0,1fr) auto auto;
gap:7px;
align-items:center;
padding:8px;
border:1px solid #ffffff14;
border-radius:12px;
background:#ffffff09
}

.ename{
overflow:hidden;
text-overflow:ellipsis;
white-space:nowrap;
font-size:12px
}

.mini{
height:30px;
border:0;
border-radius:9px;
background:#ffffff12;
color:#fff;
font-size:10px
}

#${IDS.custom} textarea{
min-height:150px;
font:11px/1.45 ui-monospace,monospace
}

#${IDS.memory} .memtext{
min-height:230px;
font:12px/1.55 ui-monospace,monospace
}

#${IDS.memory} .intervals{
display:grid;
grid-template-columns:repeat(4,1fr);
gap:7px;
margin-top:6px
}

#${IDS.memory} .ival{
height:36px;
border:1px solid #ffffff18;
border-radius:10px;
background:#ffffff0a;
color:#ffffffaa;
font:700 11px system-ui
}

#${IDS.memory} .ival[data-on="1"]{
background:#6d88cf;
color:#fff;
border-color:#8ca4e3
}

#${IDS.memory} .oneshot{
width:100%;
margin-top:10px;
background:#485f9b
}

#${IDS.memory} .oneshot[data-armed="1"]{
background:#875f32
}

#${IDS.memory} .status{
margin-top:10px;
padding:9px 10px;
border-radius:10px;
background:#ffffff09;
color:#ffffff99;
font-size:10px;
line-height:1.4
}

#${IDS.memory} .note{
margin-top:9px;
color:#ffffff61;
font-size:10px;
line-height:1.45
}
`;

(
  document.head||
  document.documentElement
).appendChild(style);


/* DOM */

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
  '<span class="dot"></span>';


const menu=
  document.createElement(
    'div'
  );

menu.id=
  IDS.menu;

menu.dataset.open=
  '0';

menu.innerHTML=
  '<div class="head">'+
  '<span>ZETA TOOLS</span>'+
  '<span class="state">ROUTER</span>'+
  '</div>'+
  '<div class="scroll">'+
  '<div class="grid"></div>'+
  '</div>';


const add=
  document.createElement(
    'button'
  );

add.id=
  IDS.add;

add.type=
  'button';

add.dataset.open=
  '0';

add.textContent=
  '＋';


const custom=
  document.createElement(
    'div'
  );

custom.id=
  IDS.custom;

custom.dataset.open=
  '0';

custom.innerHTML=`
<div class="card">

<div class="title">
<span>사용자 도구</span>
<button class="close" type="button">×</button>
</div>

<div class="row">

<div>
<label>아이콘</label>
<input class="cicon" maxlength="12" placeholder="🧩">
</div>

<div>
<label>이름</label>
<input class="cname" maxlength="40" placeholder="내 도구">
</div>

</div>

<label>JavaScript / 북마클릿</label>

<textarea class="ccode" spellcheck="false"></textarea>

<div class="actions">
<button class="btn reset" type="button">초기화</button>
<button class="btn primary save" type="button">추가</button>
</div>

<div class="list"></div>

</div>
`;


const memory=
  document.createElement(
    'div'
  );

memory.id=
  IDS.memory;

memory.dataset.open=
  '0';

memory.innerHTML=`
<div class="card">

<div class="title">
<span>📌 RP MEMORY</span>
<button class="close" type="button">×</button>
</div>

<label>
이 채팅방에 기억시킬 내용
</label>

<textarea
class="memtext"
spellcheck="false"
placeholder="현재 장소: 집 거실&#10;둘은 싸운 직후&#10;ㅇㅇ는 사건의 진실을 모름"
></textarea>

<label style="margin-top:11px">
자동주입 주기
</label>

<div class="intervals">

<button
class="ival"
data-i="0"
type="button">
OFF
</button>

<button
class="ival"
data-i="3"
type="button">
3턴
</button>

<button
class="ival"
data-i="5"
type="button">
5턴
</button>

<button
class="ival"
data-i="10"
type="button">
10턴
</button>

</div>

<button
class="btn oneshot"
type="button">
다음 답변에 1회 주입
</button>

<div class="status"></div>

<div class="actions">
<button
class="btn danger clear"
type="button">
메모 비우기
</button>
</div>

<div class="note">
메모는 화면 채팅에는 표시되지 않습니다.
자동주입 OFF여도 1회 주입은 사용할 수 있습니다.
메모 입력은 자동 저장됩니다.
</div>

</div>
`;


(
  document.body||
  document.documentElement
).append(
  button,
  menu,
  add,
  custom,
  memory
);


const grid=
  menu.querySelector(
    '.grid'
  );

const state=
  menu.querySelector(
    '.state'
  );


/* MEMORY UI */

const memText=
  memory.querySelector(
    '.memtext'
  );

const memStatus=
  memory.querySelector(
    '.status'
  );

const oneShotBtn=
  memory.querySelector(
    '.oneshot'
  );

let memTimer=
  null;

function statusText(
  v=readMem()
){
  if(v.armed){
    if(v.interval>0){
      const left=
        Math.max(
          1,
          v.interval-v.turn
        );

      return (
        '다음 답변: 1회 주입 대기 · '+
        '자동주입은 '+
        left+
        '턴 후'
      );
    }

    return '다음 답변: 1회 주입 대기';
  }

  if(v.interval>0){
    return (
      '자동주입 ON · '+
      '다음 자동주입까지 '+
      Math.max(
        1,
        v.interval-v.turn
      )+
      '턴'
    );
  }

  return '자동주입 OFF';
}

function refreshMemoryUI(){
  const v=
    readMem();

  if(
    document.activeElement!==
    memText
  ){
    memText.value=
      v.text;
  }

  memory
    .querySelectorAll(
      '.ival'
    )
    .forEach(
      b=>
        b.dataset.on=
          Number(b.dataset.i)===
          v.interval
            ?'1'
            :'0'
    );

  oneShotBtn.dataset.armed=
    v.armed
      ?'1'
      :'0';

  oneShotBtn.textContent=
    v.armed
      ?'1회 주입 취소'
      :'다음 답변에 1회 주입';

  memStatus.textContent=
    statusText(v);
}

function openMemory(){
  const v=
    readMem();

  memText.value=
    v.text;

  memory.dataset.open=
    '1';

  refreshMemoryUI();
}

function closeMemory(){
  memory.dataset.open=
    '0';
}

memText.addEventListener(
  'input',
  ()=>{
    clearTimeout(
      memTimer
    );

    memTimer=
      setTimeout(
        ()=>{
          patchMem({
            text:
              memText.value
          });
        },
        300
      );
  }
);

memory
  .querySelectorAll(
    '.ival'
  )
  .forEach(
    btn=>{
      btn.addEventListener(
        'click',
        ()=>{
          patchMem({
            interval:
              Number(
                btn.dataset.i
              ),

            turn:0,
            lastSig:''
          });
        }
      );
    }
  );

oneShotBtn.addEventListener(
  'click',
  ()=>{
    const v=
      readMem();

    const text=
      memText.value.trim();

    if(
      !text&&
      !v.armed
    ){
      return alert(
        '먼저 RP 메모를 입력해주세요.'
      );
    }

    patchMem({
      text:
        memText.value,

      armed:
        !v.armed
    });
  }
);

memory
  .querySelector(
    '.clear'
  )
  .addEventListener(
    'click',
    ()=>{
      if(
        memText.value.trim()&&
        !confirm(
          '이 채팅방의 RP 메모를 비울까요?'
        )
      ){
        return;
      }

      memText.value='';

      patchMem({
        text:'',
        armed:false,
        turn:0,
        lastSig:''
      });
    }
  );

memory
  .querySelector(
    '.close'
  )
  .addEventListener(
    'click',
    closeMemory
  );

memory.addEventListener(
  'pointerdown',
  e=>{
    if(e.target===memory){
      closeMemory();
    }
  }
);

window.addEventListener(
  MEM_EVT,
  refreshMemoryUI
);


/* CUSTOM UI */

const cicon=
  custom.querySelector(
    '.cicon'
  );

const cname=
  custom.querySelector(
    '.cname'
  );

const ccode=
  custom.querySelector(
    '.ccode'
  );

const csave=
  custom.querySelector(
    '.save'
  );

const clist=
  custom.querySelector(
    '.list'
  );

let editing=
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

function tile(x){
  const attr=
    x.customId
      ?`data-custom-id="${esc(x.customId)}"`
      :`data-action="${esc(x.action)}"`;

  return (
    '<button class="item" type="button" '+
    attr+
    '>'+
    '<span class="icon">'+
    esc(x.icon)+
    '</span>'+
    '<span class="label">'+
    esc(x.name)+
    '</span>'+
    '</button>'
  );
}

function renderGrid(){
  grid.innerHTML=
    BUILTINS
      .map(tile)
      .join('')
    +
    readCustom()
      .map(
        t=>
          tile({
            customId:t.id,
            icon:t.icon||'🧩',
            name:t.name||'도구'
          })
      )
      .join('');
}

function resetCustom(){
  editing=null;

  cicon.value='';
  cname.value='';
  ccode.value='';

  csave.textContent=
    '추가';
}

function renderCustomList(){
  const tools=
    readCustom();

  clist.innerHTML=
    tools.length

      ?tools.map(
        t=>`
<div class="entry">

<div>
${esc(t.icon||'🧩')}
</div>

<div class="ename">
${esc(t.name||'도구')}
</div>

<button
class="mini"
data-edit="${esc(t.id)}"
type="button">
수정
</button>

<button
class="mini danger"
data-del="${esc(t.id)}"
type="button">
삭제
</button>

</div>
`
      ).join('')

      :'<div style="padding:10px;text-align:center;color:#ffffff66;font-size:11px">추가한 도구 없음</div>';
}

function openCustom(){
  resetCustom();
  renderCustomList();

  custom.dataset.open=
    '1';
}

function closeCustom(){
  custom.dataset.open=
    '0';
}

csave.addEventListener(
  'click',
  ()=>{
    const icon=
      cicon.value.trim()||
      '🧩';

    const name=
      cname.value.trim();

    const code=
      normCode(
        ccode.value
      );

    if(!name){
      return alert(
        '도구 이름을 입력해주세요.'
      );
    }

    if(!code){
      return alert(
        'JavaScript 코드를 입력해주세요.'
      );
    }

    const tools=
      readCustom();

    if(editing){
      const i=
        tools.findIndex(
          t=>t.id===editing
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
      tools.unshift({
        id:
          'u_'+
          Date.now().toString(36)+
          '_'+
          Math.random()
            .toString(36)
            .slice(2,7),

        icon,
        name,
        code
      });
    }

    writeCustom(tools);

    renderGrid();
    renderCustomList();
    resetCustom();
  }
);

custom
  .querySelector(
    '.reset'
  )
  .addEventListener(
    'click',
    resetCustom
  );

custom
  .querySelector(
    '.close'
  )
  .addEventListener(
    'click',
    closeCustom
  );

custom.addEventListener(
  'pointerdown',
  e=>{
    if(e.target===custom){
      closeCustom();
    }
  }
);

clist.addEventListener(
  'click',
  e=>{
    const eb=
      e.target.closest(
        '[data-edit]'
      );

    const db=
      e.target.closest(
        '[data-del]'
      );

    if(eb){
      const t=
        readCustom()
          .find(
            x=>
              x.id===
              eb.dataset.edit
          );

      if(!t)return;

      editing=t.id;

      cicon.value=
        t.icon||'';

      cname.value=
        t.name||'';

      ccode.value=
        t.code||'';

      csave.textContent=
        '저장';
    }

    if(db){
      const tools=
        readCustom();

      const t=
        tools.find(
          x=>
            x.id===
            db.dataset.del
        );

      if(
        !t||
        !confirm(
          `“${t.name}” 도구를 삭제할까요?`
        )
      ){
        return;
      }

      writeCustom(
        tools.filter(
          x=>x.id!==t.id
        )
      );

      if(editing===t.id){
        resetCustom();
      }

      renderGrid();
      renderCustomList();
    }
  }
);

add.addEventListener(
  'click',
  ()=>{
    closeMenu();
    openCustom();
  }
);


/* MENU */

function updateRouterState(){
  const on=
    !!window[ROUTER_KEY];

  button.dataset.router=
    on
      ?'on'
      :'off';

  state.dataset.on=
    on
      ?'1'
      :'0';

  state.textContent=
    on
      ?'ROUTER ON'
      :'ROUTER …';
}

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
    Math.max(
      pad,
      Math.min(
        innerWidth-width-pad,
        b.left+
        b.width/2-
        width/2
      )
    );

  const total=
    height+
    gap+
    addSize;

  const top=
    b.top-total-10>=pad

      ?b.top-total-10

      :Math.max(
        pad,
        Math.min(
          innerHeight-
          total-
          pad,

          b.top-
          total/2
        )
      );

  menu.style.left=
    left+'px';

  menu.style.top=
    top+'px';

  add.style.left=
    (
      left+
      width/2-
      addSize/2
    )+
    'px';

  add.style.top=
    (
      top+
      height+
      gap
    )+
    'px';
}

function openMenu(){
  renderGrid();

  menu.dataset.open='1';
  add.dataset.open='1';

  requestAnimationFrame(
    positionMenu
  );

  updateRouterState();
}

function closeMenu(){
  menu.dataset.open='0';
  add.dataset.open='0';
}

function show(){
  button.style.display='flex';
  openMenu();
}

menu.addEventListener(
  'click',
  e=>{
    const c=
      e.target.closest(
        '[data-custom-id]'
      );

    if(c){
      const t=
        readCustom()
          .find(
            x=>
              x.id===
              c.dataset.customId
          );

      closeMenu();

      if(t){
        runCustom(t);
      }

      return;
    }

    const item=
      e.target.closest(
        '[data-action]'
      );

    if(!item)return;

    closeMenu();

    ({
      kit:openKit,
      feed:openFeed,
      theme:applyTheme,
      phone:openPhone,
      narrator:openNarrator,
      memory:openMemory
    })[
      item.dataset.action
    ]?.();
  }
);


/* DRAG */

let pid=null;
let moved=false;

let sx=0;
let sy=0;
let sl=0;
let st=0;

button.addEventListener(
  'pointerdown',
  e=>{
    pid=e.pointerId;
    moved=false;

    const r=
      button.getBoundingClientRect();

    sx=e.clientX;
    sy=e.clientY;

    sl=r.left;
    st=r.top;

    try{
      button.setPointerCapture(
        pid
      );
    }catch(_){}

    e.preventDefault();
  }
);

button.addEventListener(
  'pointermove',
  e=>{
    if(
      pid===null||
      e.pointerId!==pid
    ){
      return;
    }

    const dx=
      e.clientX-sx;

    const dy=
      e.clientY-sy;

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

          sl+dx
        )
      );

    const y=
      Math.max(
        5,
        Math.min(
          innerHeight-
          button.offsetHeight-
          5,

          st+dy
        )
      );

    Object.assign(
      button.style,
      {
        left:x+'px',
        top:y+'px',
        right:'auto',
        bottom:'auto'
      }
    );

    e.preventDefault();
  }
);

function dragEnd(e){
  if(
    pid===null||
    (
      e&&
      e.pointerId!==pid
    )
  ){
    return;
  }

  try{
    button.releasePointerCapture(
      pid
    );
  }catch(_){}

  if(moved){
    const r=
      button.getBoundingClientRect();

    localStorage.setItem(
      POS_KEY,
      JSON.stringify({
        x:r.left,
        y:r.top
      })
    );

  }else{
    openMenu();
  }

  pid=null;
  moved=false;
}

button.addEventListener(
  'pointerup',
  dragEnd
);

button.addEventListener(
  'pointercancel',
  dragEnd
);

try{
  const p=
    JSON.parse(
      localStorage.getItem(
        POS_KEY
      )||
      'null'
    );

  if(
    p&&
    Number.isFinite(p.x)&&
    Number.isFinite(p.y)
  ){
    Object.assign(
      button.style,
      {
        left:
          Math.max(
            5,
            Math.min(
              innerWidth-49,
              p.x
            )
          )+
          'px',

        top:
          Math.max(
            5,
            Math.min(
              innerHeight-49,
              p.y
            )
          )+
          'px',

        right:'auto',
        bottom:'auto'
      }
    );
  }
}catch(_){}

function outside(e){
  if(
    menu.dataset.open!==
    '1'
  ){
    return;
  }

  if(
    menu.contains(e.target)||
    button.contains(e.target)||
    add.contains(e.target)
  ){
    return;
  }

  closeMenu();
}

document.addEventListener(
  'pointerdown',
  outside,
  true
);

function resize(){
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
  resize
);


/* API */

function destroy(){
  document.removeEventListener(
    'pointerdown',
    outside,
    true
  );

  window.removeEventListener(
    'resize',
    resize
  );

  window.removeEventListener(
    MEM_EVT,
    refreshMemoryUI
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

window[KEY]={
  show,
  open:openMenu,
  close:closeMenu,
  destroy,
  ensureRouter,

  memory:{
    open:openMemory,
    read:readMem,
    arm:()=>patchMem({
      armed:true
    })
  },

  actions:{
    kit:openKit,
    feed:openFeed,
    theme:applyTheme,
    phone:openPhone,
    narrator:openNarrator,
    memory:openMemory
  },

  custom:{
    open:openCustom,
    read:readCustom
  }
};

renderGrid();
refreshMemoryUI();
updateRouterState();
ensureRouter();

console.log(
  '[ZETA Toolbox] READY + RP MEMORY v2'
);

})();
