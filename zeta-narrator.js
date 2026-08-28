(()=>{'use strict';

const K='__ZETA_NARRATOR_TOOL__',ID='__zeta_narrator_v11__';
const POS='zetaFormatterPosition',MODE='zetaFormatterRemoveNarrator';

try{window[K]?.destroy?.()}catch{}
document.querySelectorAll('[id^="zeta-roleplay-formatter-"],#__zeta_narrator_v11__').forEach(e=>e.remove());

const ac=new AbortController(),sig=ac.signal;
let removeNarrator=localStorage.getItem(MODE)==='1',busy=false;

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const vis=e=>{if(!e)return false;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};

function waitFor(fn,ms=5000){
  return new Promise((ok,no)=>{
    const end=Date.now()+ms;
    const tick=()=>{
      let v=null;
      try{v=fn()}catch{}
      if(v)return ok(v);
      if(Date.now()>end)return no(Error('편집 UI를 찾지 못했습니다.'));
      setTimeout(tick,60);
    };
    tick();
  });
}

function cleanItalics(text){
  text=String(text??'')
    .replace(/\\\*/g,'*')
    .replace(/[\u00A0\u200B\u200C\u200D\u2060\uFEFF]/g,' ');

  let old;
  do{
    old=text;
    text=text.replace(/\*[ \t\r\n]+\*/g,' ');
  }while(text!==old);

  return text.replace(/[ \t\r\n]+/g,' ').trim();
}

/* 구형 @이름:/@: 형식도 지원하고,
   새 UI에서 캐릭터명이 없어도 그냥 처리 */
function formatText(input){
  const src=String(input??'').replace(/\r\n?/g,'\n');
  const lines=src.split('\n');

  let charName=null,mode='plain',tagged=false;
  const out=[];

  for(const raw of lines){
    const line=raw.trim();
    if(!line)continue;

    const narrator=line.match(/^@\s*:\s*(.*)$/);
    if(narrator){
      tagged=true;
      mode='narrator';

      if(!removeNarrator&&narrator[1].trim())
        out.push(narrator[1].trim());

      continue;
    }

    const character=line.match(/^@\s*([^:\n]+?)\s*:\s*(.*)$/);
    if(character){
      tagged=true;
      mode='character';

      if(!charName)charName=character[1].trim();
      if(character[2].trim())out.push(character[2].trim());

      continue;
    }

    if(mode==='narrator'){
      if(!removeNarrator)out.push(line);
    }else{
      out.push(line);
    }
  }

  /* 마커 자체가 없는 새 형식이면
     캐릭터명 찾으려고 에러내지 않고 지문 합치기만 */
  if(!tagged)return cleanItalics(src);

  const content=cleanItalics(out.join(' '));

  /* @캐릭터:가 실제로 있었을 때만 다시 붙임 */
  if(charName)
    return `@${charName}:${content?' '+content:''}`;

  return content;
}

function setReactValue(el,value){
  const proto=Object.getPrototypeOf(el);
  const setter=
    Object.getOwnPropertyDescriptor(proto,'value')?.set||
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')?.set;

  if(!setter)throw Error('textarea 값을 변경할 수 없습니다.');

  setter.call(el,value);

  el.dispatchEvent(new InputEvent('input',{
    bubbles:true,
    inputType:'insertText',
    data:null
  }));

  el.dispatchEvent(new Event('change',{bubbles:true}));
}

/* 최근 활성 Edit message */
function getEdit(){
  return [...document.querySelectorAll(
    'button[aria-label="Edit message"]:not(:disabled)'
  )].filter(vis).at(-1)||null;
}

function allEditors(){
  return [...document.querySelectorAll('textarea[name="message"]')]
    .filter(e=>!e.closest('#'+ID));
}

function allSaves(){
  return [...document.querySelectorAll(
    'button[aria-label="Save edit"]:not(:disabled)'
  )].filter(vis);
}

/* Save edit 버튼과 같은 컨테이너의 textarea 탐색 */
function editorNearSave(save){
  let p=save?.parentElement;

  for(let i=0;i<12&&p&&p!==document.body;i++,p=p.parentElement){
    const found=[...p.querySelectorAll('textarea[name="message"]')]
      .filter(e=>!e.closest('#'+ID)&&vis(e));

    if(found.length)return found.at(-1);
  }

  return null;
}

/* 핵심:
   Edit 누르기 전에는 없었던 textarea를 가장 먼저 선택 */
function findEditor(before){
  const current=allEditors();

  const newlyCreated=current
    .filter(e=>!before.has(e)&&vis(e))
    .at(-1);

  if(newlyCreated)return newlyCreated;

  /* React가 기존 노드를 재사용했다면 Save edit 기준으로 찾음 */
  const saves=allSaves();

  for(let i=saves.length-1;i>=0;i--){
    const e=editorNearSave(saves[i]);
    if(e)return e;
  }

  return null;
}

/* 현재 수정창과 같은 영역의 Save edit 우선 */
function findSave(editor){
  let p=editor?.parentElement;

  for(let i=0;i<12&&p&&p!==document.body;i++,p=p.parentElement){
    const b=[...p.querySelectorAll(
      'button[aria-label="Save edit"]:not(:disabled)'
    )].filter(vis);

    if(b.length)return b.at(-1);
  }

  return allSaves().at(-1)||null;
}

function toast(msg,bad=false){
  document.getElementById(ID+'-toast')?.remove();

  const t=document.createElement('div');
  t.id=ID+'-toast';
  t.textContent=msg;

  Object.assign(t.style,{
    position:'fixed',
    left:'50%',
    bottom:'80px',
    transform:'translateX(-50%)',
    zIndex:'2147483647',
    padding:'7px 10px',
    borderRadius:'9px',
    background:bad?'#7f1d1df5':'#18181bf5',
    color:'#fff',
    font:'11px system-ui',
    boxShadow:'0 5px 18px #0007',
    pointerEvents:'none'
  });

  document.body.appendChild(t);
  setTimeout(()=>t.remove(),1500);
}

async function run(){
  if(busy)return;

  const edit=getEdit();

  if(!edit){
    toast('활성화된 수정 버튼을 찾지 못했습니다.',true);
    return;
  }

  busy=true;
  runBtn.style.opacity='.4';

  try{
    /* ★ 현재 존재하는 일반 채팅 textarea 기억 */
    const before=new Set(allEditors());

    edit.click();

    /* ★ 수정 클릭 뒤 생성된 진짜 편집창 찾기 */
    const editor=await waitFor(()=>findEditor(before));

    /* React가 value를 채우는 한 박자 대기 */
    await sleep(100);

    const original=editor.value;

    console.log('[ZETA narrator] editor found:',editor);
    console.log('[ZETA narrator] original:',original);

    const formatted=formatText(original);

    console.log('[ZETA narrator] formatted:',formatted);

    setReactValue(editor,formatted);

    /* input 후 Save edit 활성화 기다림 */
    const save=await waitFor(()=>findSave(editor));

    console.log('[ZETA narrator] save found:',save);

    await sleep(80);
    save.click();

    toast(removeNarrator?'나레이터 삭제 완료':'지문 정리 완료');

  }catch(e){
    console.error('[ZETA narrator]',e);
    toast(e?.message||'변환 실패',true);

  }finally{
    busy=false;
    runBtn.style.opacity='1';
  }
}


/* ---------- UI ---------- */

const wrap=document.createElement('div');
wrap.id=ID;

Object.assign(wrap.style,{
  position:'fixed',
  display:'flex',
  height:'32px',
  zIndex:'2147483647',
  border:'1px solid rgba(255,255,255,.10)',
  borderRadius:'999px',
  background:'rgba(25,25,29,.9)',
  backdropFilter:'blur(10px)',
  boxShadow:'0 4px 14px #0005',
  overflow:'hidden',
  touchAction:'none',
  userSelect:'none'
});

const runBtn=document.createElement('button');
runBtn.type='button';
runBtn.innerHTML='✦';

Object.assign(runBtn.style,{
  width:'34px',
  height:'32px',
  padding:'0',
  border:'0',
  borderRight:'1px solid rgba(255,255,255,.08)',
  background:'transparent',
  color:'#fff',
  font:'16px system-ui',
  touchAction:'none'
});

const toggle=document.createElement('button');
toggle.type='button';

Object.assign(toggle.style,{
  width:'34px',
  height:'32px',
  padding:'0',
  border:'0',
  font:'700 10px system-ui',
  touchAction:'manipulation'
});

function paint(){
  toggle.textContent=removeNarrator?'N×':'N';
  toggle.style.background=removeNarrator?'#dc2626':'transparent';
  toggle.style.color=removeNarrator?'#fff':'#ffffff88';
  toggle.title=removeNarrator?'나레이터 삭제 ON':'나레이터 삭제 OFF';
}

paint();

toggle.onclick=e=>{
  e.stopPropagation();
  removeNarrator=!removeNarrator;
  localStorage.setItem(MODE,removeNarrator?'1':'0');
  paint();
  toast(removeNarrator?'나레이터 삭제 ON':'나레이터 삭제 OFF');
};

wrap.append(runBtn,toggle);
document.body.appendChild(wrap);


/* 위치 복원 */
try{
  const p=JSON.parse(localStorage.getItem(POS)||'null');

  if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)){
    wrap.style.left=Math.max(4,Math.min(innerWidth-72,p.x))+'px';
    wrap.style.top=Math.max(4,Math.min(innerHeight-36,p.y))+'px';
  }else{
    wrap.style.right='12px';
    wrap.style.bottom='12px';
  }
}catch{
  wrap.style.right='12px';
  wrap.style.bottom='12px';
}


/* 드래그 + 탭 실행 */
let drag=false,moved=false,pid=null,sx=0,sy=0,ox=0,oy=0;

runBtn.addEventListener('pointerdown',e=>{
  if(busy)return;

  const r=wrap.getBoundingClientRect();

  drag=true;
  moved=false;
  pid=e.pointerId;
  sx=e.clientX;
  sy=e.clientY;
  ox=r.left;
  oy=r.top;

  wrap.style.left=r.left+'px';
  wrap.style.top=r.top+'px';
  wrap.style.right='auto';
  wrap.style.bottom='auto';

  try{runBtn.setPointerCapture(pid)}catch{}
  e.preventDefault();
},{signal:sig,passive:false});

document.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==pid)return;

  const dx=e.clientX-sx,dy=e.clientY-sy;

  if(Math.hypot(dx,dy)>=5)moved=true;
  if(!moved)return;

  const x=Math.max(4,Math.min(innerWidth-wrap.offsetWidth-4,ox+dx));
  const y=Math.max(4,Math.min(innerHeight-wrap.offsetHeight-4,oy+dy));

  wrap.style.left=x+'px';
  wrap.style.top=y+'px';

  e.preventDefault();
},{signal:sig,capture:true,passive:false});

document.addEventListener('pointerup',e=>{
  if(!drag||e.pointerId!==pid)return;

  drag=false;

  try{runBtn.releasePointerCapture(pid)}catch{}

  const r=wrap.getBoundingClientRect();

  localStorage.setItem(POS,JSON.stringify({
    x:r.left,
    y:r.top
  }));

  const tap=!moved;
  moved=false;
  pid=null;

  if(tap)run();

  e.preventDefault();
},{signal:sig,capture:true,passive:false});


function destroy(){
  ac.abort();
  wrap.remove();
  document.getElementById(ID+'-toast')?.remove();

  try{delete window[K]}
  catch{window[K]=null}
}

window[K]={
  run,
  destroy,
  version:'11.0'
};

toast('나레삭제 v11 준비됨');

/* ===== 나레삭제 UI : DARK + VIVID ===== */
(()=>{
  const S='__zeta_narrator_pretty__';
  document.getElementById(S)?.remove();

  const st=document.createElement('style');
  st.id=S;

  st.textContent=`
#__zeta_narrator_v11__{
  height:38px !important;
  border-radius:19px !important;

  border:1px solid rgba(255,255,255,.10) !important;

  background:
    linear-gradient(
      180deg,
      rgba(24,27,34,.97),
      rgba(13,15,20,.97)
    ) !important;

  box-shadow:
    0 7px 22px rgba(0,0,0,.38),
    inset 0 1px 0 rgba(255,255,255,.045) !important;

  backdrop-filter:blur(14px) saturate(140%) !important;
  -webkit-backdrop-filter:blur(14px) saturate(140%) !important;

  overflow:hidden !important;
}


/* 공통 버튼 */
#__zeta_narrator_v11__ > button{
  position:relative !important;

  width:40px !important;
  min-width:40px !important;
  height:38px !important;

  padding:0 !important;
  margin:0 !important;

  border:0 !important;
  border-radius:0 !important;

  display:flex !important;
  align-items:center !important;
  justify-content:center !important;

  transition:
    background .15s ease,
    color .15s ease,
    box-shadow .15s ease,
    transform .1s ease !important;

  -webkit-tap-highlight-color:transparent !important;
}


/* ✦ 실행 */
#__zeta_narrator_v11__ > button:first-child{
  background:
    rgba(94,231,255,.035) !important;

  border-right:
    1px solid rgba(255,255,255,.07) !important;

  color:#5EE7FF !important;

  font-size:17px !important;
  font-weight:600 !important;

  text-shadow:
    0 0 9px rgba(94,231,255,.55) !important;
}


/* 실행 버튼 눌림 */
#__zeta_narrator_v11__ > button:first-child:active{
  background:
    rgba(94,231,255,.15) !important;

  box-shadow:
    inset 0 0 14px rgba(94,231,255,.10) !important;

  transform:scale(.93) !important;
}


/* N 기본 */
#__zeta_narrator_v11__ > button:last-child{
  background:
    rgba(255,255,255,.025) !important;

  color:#8B93A7 !important;

  font:
    800 10px/1 system-ui,sans-serif !important;

  letter-spacing:-.2px !important;

  text-shadow:none !important;
}


/* N OFF 눌림 */
#__zeta_narrator_v11__ > button:last-child:active{
  background:
    rgba(255,255,255,.08) !important;

  transform:scale(.93) !important;
}


/* N× 활성 상태
   inline style로 #dc2626이 들어오므로
   style 속성을 이용해 잡음 */
#__zeta_narrator_v11__ > button:last-child[style*="dc2626"]{
  background:
    linear-gradient(
      135deg,
      #FF3D6E,
      #F0005E
    ) !important;

  color:#fff !important;

  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.14),
    0 0 14px rgba(255,61,110,.38) !important;

  text-shadow:
    0 1px 2px rgba(0,0,0,.24) !important;
}


/* 활성 N× 눌림 */
#__zeta_narrator_v11__ > button:last-child[style*="dc2626"]:active{
  background:
    linear-gradient(
      135deg,
      #FF567F,
      #FF146D
    ) !important;

  transform:scale(.93) !important;
}
`;

  (document.head||document.documentElement)
    .appendChild(st);
})();

      
})();
