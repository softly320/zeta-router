(()=>{
'use strict';

const ID='zeta-roleplay-formatter-v9-2';
const POS_KEY='zetaFormatterPosition';
const MODE_KEY='zetaFormatterRemoveNarrator';

document
  .querySelectorAll(
    '[id^="zeta-roleplay-formatter-"]'
  )
  .forEach(e=>e.remove());

let removeNarrator=
  localStorage.getItem(MODE_KEY)==='1';

let editObserver=null;
let saveObserver=null;
let processed=null;

const visible=e=>{
  if(!e)return false;

  const r=
    e.getBoundingClientRect();

  const s=
    getComputedStyle(e);

  return (
    r.width>0&&
    r.height>0&&
    s.display!=='none'&&
    s.visibility!=='hidden'
  );
};

function toast(
  msg,
  type='normal'
){

  document
    .getElementById(
      ID+'-toast'
    )
    ?.remove();

  const t=
    document.createElement('div');

  t.id=
    ID+'-toast';

  t.textContent=
    msg;

  Object.assign(
    t.style,
    {
      position:'fixed',
      zIndex:'2147483647',
      padding:'6px 9px',
      borderRadius:'8px',

      background:
        type==='error'
          ? 'rgba(127,29,29,.97)'
          : type==='ok'
            ? 'rgba(20,83,45,.97)'
            : 'rgba(24,24,27,.97)',

      border:
        '1px solid rgba(255,255,255,.08)',

      color:'#fff',

      font:
        '11px system-ui,sans-serif',

      boxShadow:
        '0 4px 16px rgba(0,0,0,.28)',

      backdropFilter:
        'blur(8px)',

      pointerEvents:'none',
      opacity:'0',

      transform:
        'translateY(3px)',

      transition:
        'opacity .12s ease,transform .12s ease'
    }
  );

  document.body.appendChild(t);

  const b=
    wrap.getBoundingClientRect();

  t.style.left=
    Math.min(
      innerWidth-
      t.offsetWidth-
      5,

      Math.max(
        5,
        b.left+
        b.width/2-
        t.offsetWidth/2
      )
    )+'px';

  t.style.top=
    Math.max(
      5,
      b.top-
      t.offsetHeight-
      6
    )+'px';

  requestAnimationFrame(
    ()=>{
      t.style.opacity='1';
      t.style.transform=
        'translateY(0)';
    }
  );

  setTimeout(
    ()=>{
      t.style.opacity='0';

      t.style.transform=
        'translateY(3px)';

      setTimeout(
        ()=>t.remove(),
        150
      );
    },
    1300
  );
}

function cleanItalics(text){

  text=
    text.replace(
      /\\\*\s\*\\\*/g,
      ' '
    );

  let old;

  do{

    old=text;

    text=
      text.replace(
        /\\\*([^\*]+?)\\\*\s\*\\\*([^\*]+?)\\\*/g,
        (_,a,b)=>
          `*${a.trim()} ${b.trim()}*`
      );

  }while(text!==old);

  return text
    .replace(/\s+/g,' ')
    .trim();
}

function formatText(input){

  const lines=
    input
      .replace(/\r\n?/g,'\n')
      .split('\n');

  let characterName=null;
  let mode='none';

  const parts=[];

  for(const raw of lines){

    const line=
      raw.trim();

    if(!line)continue;

    const narrator=
      line.match(
        /^@\s*:\s*(.*)$/
      );

    if(narrator){

      mode='narrator';

      if(
        !removeNarrator&&
        narrator[1].trim()
      ){
        parts.push(
          narrator[1].trim()
        );
      }

      continue;
    }

    const character=
      line.match(
        /^@\s*([^:\n]+?)\s*:\s*(.*)$/
      );

    if(character){

      mode='character';

      const name=
        character[1].trim();

      const text=
        character[2].trim();

      if(
        !characterName&&
        name
      ){
        characterName=name;
      }

      if(text){
        parts.push(text);
      }

      continue;
    }

    if(mode==='narrator'){

      if(!removeNarrator){
        parts.push(line);
      }

    }else{

      parts.push(line);
    }
  }

  if(!characterName){
    throw new Error(
      '캐릭터명(@이름:)을 찾지 못했습니다.'
    );
  }

  const content=
    cleanItalics(
      parts.join(' ')
    );

  return (
    `@${characterName}:`+
    (
      content
        ? ' '+content
        : ''
    )
  );
}

function setReactValue(
  el,
  value
){

  const setter=
    Object
      .getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )
      ?.set;

  if(!setter){
    throw new Error(
      'textarea 값을 변경할 수 없습니다.'
    );
  }

  setter.call(
    el,
    value
  );

  el.dispatchEvent(
    new InputEvent(
      'input',
      {
        bubbles:true,
        inputType:'insertText',
        data:null
      }
    )
  );

  el.dispatchEvent(
    new Event(
      'change',
      {
        bubbles:true
      }
    )
  );
}

function stop(){

  editObserver?.disconnect();
  saveObserver?.disconnect();

  editObserver=null;
  saveObserver=null;
}

function finish(){

  stop();

  runBtn.dataset.busy='0';

  runBtn.style.opacity='1';
  runBtn.style.pointerEvents='auto';

  toggleBtn.style.pointerEvents='auto';

  processed=null;
}

function findEditor(){

  const editors=[
    ...document.querySelectorAll(
      '[data-sentry-component="KeyboardAvoidingView"] textarea[name="message"]'
    )
  ].filter(visible);

  return (
    editors.at(-1)||
    null
  );
}

function getModal(textarea){

  return (
    textarea.closest(
      '[data-sentry-component="KeyboardAvoidingView"]'
    )||
    textarea
      .parentElement
      ?.parentElement
      ?.parentElement||
    document.body
  );
}

function isCheckButton(btn){

  for(
    const p of
    btn.querySelectorAll('path')
  ){

    const d=
      (
        p.getAttribute('d')||
        ''
      )
      .replace(/\s+/g,' ')
      .trim();

    if(
      d.includes('M13.507 5')&&
      d.includes('6.84 11.673')&&
      d.includes('3 7.833')
    ){
      return true;
    }
  }

  return false;
}

function findSaveButton(modal){

  return [
    ...modal.querySelectorAll(
      'button'
    )
  ]
  .filter(visible)
  .find(isCheckButton)||
  null;
}

function saveWhenReady(
  textarea
){

  const modal=
    getModal(textarea);

  const attempt=()=>{

    const save=
      findSaveButton(modal);

    if(
      save&&
      !save.disabled
    ){

      saveObserver?.disconnect();
      saveObserver=null;

      save.click();

      finish();

      toast(
        removeNarrator
          ? '나레이터 삭제 + 저장 완료'
          : '전체 합치기 + 저장 완료',
        'ok'
      );

      return true;
    }

    return false;
  };

  if(attempt())return;

  saveObserver?.disconnect();

  saveObserver=
    new MutationObserver(
      attempt
    );

  saveObserver.observe(
    modal,
    {
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:[
        'disabled',
        'class'
      ]
    }
  );

  requestAnimationFrame(
    attempt
  );
}

function processEditor(){

  const textarea=
    findEditor();

  if(
    !textarea||
    textarea===processed
  ){
    return false;
  }

  try{

    const formatted=
      formatText(
        textarea.value
      );

    processed=
      textarea;

    setReactValue(
      textarea,
      formatted
    );

    editObserver?.disconnect();
    editObserver=null;

    saveWhenReady(
      textarea
    );

    return true;

  }catch(e){

    finish();

    toast(
      e.message||
      '변환 실패',
      'error'
    );

    return true;
  }
}

function getEditButton(){

  let buttons=[
    ...document.querySelectorAll(
      'button[data-testid="edit-button"]'
    )
  ].filter(visible);

  if(!buttons.length){

    buttons=[
      ...document.querySelectorAll(
        'button[aria-label="Edit message"]'
      )
    ].filter(visible);
  }

  return (
    buttons.at(-1)||
    null
  );
}

function run(){

  if(
    runBtn.dataset.busy==='1'
  ){
    return;
  }

  processed=null;

  runBtn.dataset.busy='1';

  runBtn.style.opacity='.45';
  runBtn.style.pointerEvents='none';

  toggleBtn.style.pointerEvents='none';

  const edit=
    getEditButton();

  if(!edit){

    finish();

    toast(
      '수정 버튼을 찾지 못했습니다.',
      'error'
    );

    return;
  }

  editObserver=
    new MutationObserver(
      processEditor
    );

  editObserver.observe(
    document.body,
    {
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:[
        'class',
        'style',
        'data-sentry-component'
      ]
    }
  );

  edit.click();

  queueMicrotask(
    processEditor
  );

  requestAnimationFrame(
    processEditor
  );
}

function updateToggle(){

  if(removeNarrator){

    toggleLabel.textContent='N×';

    toggleBtn.title=
      '나레이터 삭제 ON';

    toggleBtn.setAttribute(
      'aria-label',
      '나레이터 삭제 ON'
    );

    Object.assign(
      toggleBtn.style,
      {
        background:
          'linear-gradient(135deg,#ef4444,#dc2626)',
        color:'#fff',
        boxShadow:
          'inset 0 0 0 1px rgba(255,255,255,.10),0 0 10px rgba(239,68,68,.28)'
      }
    );

  }else{

    toggleLabel.textContent='N';

    toggleBtn.title=
      '나레이터 삭제 OFF';

    toggleBtn.setAttribute(
      'aria-label',
      '나레이터 삭제 OFF'
    );

    Object.assign(
      toggleBtn.style,
      {
        background:'transparent',
        color:'rgba(255,255,255,.48)',
        boxShadow:'none'
      }
    );
  }
}

const wrap=
  document.createElement('div');

wrap.id=ID;

Object.assign(
  wrap.style,
  {
    position:'fixed',
    display:'flex',
    alignItems:'center',
    height:'32px',

    border:
      '1px solid rgba(255,255,255,.10)',

    borderRadius:'999px',

    background:
      'rgba(25,25,29,.88)',

    backdropFilter:
      'blur(10px)',

    WebkitBackdropFilter:
      'blur(10px)',

    boxShadow:
      '0 4px 14px rgba(0,0,0,.22)',

    overflow:'hidden',

    zIndex:'2147483647',

    touchAction:'none',

    userSelect:'none',
    WebkitUserSelect:'none'
  }
);

const runBtn=
  document.createElement(
    'button'
  );

runBtn.type='button';

runBtn.title=
  '탭: 실행 / 드래그: 이동';

runBtn.setAttribute(
  'aria-label',
  'Zeta RP 정리 실행'
);

runBtn.innerHTML=
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">'+
  '<path d="M12 2l1.2 4.2L17.5 7.5l-4.3 1.3L12 13l-1.2-4.2-4.3-1.3 4.3-1.3L12 2Z" fill="currentColor"/>'+
  '<path d="M18 13.5l.65 1.85L20.5 16l-1.85.65L18 18.5l-.65-1.85L15.5 16l1.85-.65L18 13.5Z" fill="currentColor"/>'+
  '</svg>';

Object.assign(
  runBtn.style,
  {
    width:'34px',
    height:'32px',

    border:'0',

    borderRight:
      '1px solid rgba(255,255,255,.08)',

    background:'transparent',

    color:
      'rgba(255,255,255,.9)',

    display:'flex',
    alignItems:'center',
    justifyContent:'center',

    cursor:'grab',

    padding:'0',

    touchAction:'none',

    WebkitTapHighlightColor:
      'transparent'
  }
);

const toggleBtn=
  document.createElement(
    'button'
  );

toggleBtn.type='button';

Object.assign(
  toggleBtn.style,
  {
    width:'34px',
    height:'32px',

    border:'0',

    display:'flex',
    alignItems:'center',
    justifyContent:'center',

    cursor:'pointer',

    padding:'0',

    touchAction:'manipulation',

    transition:
      'background .15s ease,color .15s ease,box-shadow .15s ease'
  }
);

const toggleLabel=
  document.createElement(
    'span'
  );

Object.assign(
  toggleLabel.style,
  {
    font:
      '700 10px/1 system-ui,sans-serif',

    letterSpacing:'-.2px',

    pointerEvents:'none'
  }
);

toggleBtn.appendChild(
  toggleLabel
);

updateToggle();

toggleBtn.addEventListener(
  'click',
  e=>{

    e.stopPropagation();

    removeNarrator=
      !removeNarrator;

    localStorage.setItem(
      MODE_KEY,
      removeNarrator?'1':'0'
    );

    updateToggle();

    toast(
      removeNarrator
        ? '나레이터 삭제 ON'
        : '나레이터 삭제 OFF',

      removeNarrator
        ? 'ok'
        : 'normal'
    );
  }
);

wrap.append(
  runBtn,
  toggleBtn
);

let saved=null;

try{
  saved=
    JSON.parse(
      localStorage.getItem(
        POS_KEY
      )||'null'
    );
}catch(_){}

if(
  saved&&
  Number.isFinite(saved.x)&&
  Number.isFinite(saved.y)
){

  wrap.style.left=
    Math.max(
      4,
      Math.min(
        innerWidth-72,
        saved.x
      )
    )+'px';

  wrap.style.top=
    Math.max(
      4,
      Math.min(
        innerHeight-36,
        saved.y
      )
    )+'px';

}else{

  wrap.style.right='12px';
  wrap.style.bottom='12px';
}

document.body.appendChild(
  wrap
);


/*
 * 모바일 웨일에서도 드래그가 끊기지 않게
 * document 전체에서 이동/종료 이벤트를 추적
 */

let dragging=false;
let moved=false;
let pid=null;

let startX=0;
let startY=0;

let originX=0;
let originY=0;

function dragStart(e){

  if(
    runBtn.dataset.busy==='1'
  ){
    return;
  }

  dragging=true;
  moved=false;

  pid=e.pointerId;

  const r=
    wrap.getBoundingClientRect();

  startX=e.clientX;
  startY=e.clientY;

  originX=r.left;
  originY=r.top;

  wrap.style.left=
    r.left+'px';

  wrap.style.top=
    r.top+'px';

  wrap.style.right='auto';
  wrap.style.bottom='auto';

  runBtn.style.cursor=
    'grabbing';

  try{
    runBtn.setPointerCapture(
      pid
    );
  }catch(_){}

  e.preventDefault();
  e.stopPropagation();
}

function dragMove(e){

  if(
    !dragging||
    e.pointerId!==pid
  ){
    return;
  }

  const dx=
    e.clientX-startX;

  const dy=
    e.clientY-startY;

  if(
    !moved&&
    Math.hypot(dx,dy)>=5
  ){
    moved=true;
  }

  if(!moved)return;

  const x=
    Math.max(
      4,
      Math.min(
        innerWidth-
        wrap.offsetWidth-
        4,
        originX+dx
      )
    );

  const y=
    Math.max(
      4,
      Math.min(
        innerHeight-
        wrap.offsetHeight-
        4,
        originY+dy
      )
    );

  wrap.style.left=
    x+'px';

  wrap.style.top=
    y+'px';

  e.preventDefault();
  e.stopPropagation();
}

function dragEnd(e){

  if(
    !dragging||
    (
      e.pointerId!=null&&
      e.pointerId!==pid
    )
  ){
    return;
  }

  dragging=false;

  runBtn.style.cursor='grab';

  try{
    runBtn.releasePointerCapture(
      pid
    );
  }catch(_){}

  const r=
    wrap.getBoundingClientRect();

  localStorage.setItem(
    POS_KEY,
    JSON.stringify({
      x:r.left,
      y:r.top
    })
  );

  const shouldRun=
    !moved;

  moved=false;
  pid=null;

  if(shouldRun){
    run();
  }

  if(e){
    e.preventDefault();
    e.stopPropagation();
  }
}

runBtn.addEventListener(
  'pointerdown',
  dragStart,
  {
    passive:false
  }
);

document.addEventListener(
  'pointermove',
  dragMove,
  {
    capture:true,
    passive:false
  }
);

document.addEventListener(
  'pointerup',
  dragEnd,
  {
    capture:true,
    passive:false
  }
);

document.addEventListener(
  'pointercancel',
  dragEnd,
  {
    capture:true,
    passive:false
  }
);

window.addEventListener(
  'resize',
  ()=>{

    const r=
      wrap.getBoundingClientRect();

    const x=
      Math.max(
        4,
        Math.min(
          innerWidth-
          wrap.offsetWidth-
          4,
          r.left
        )
      );

    const y=
      Math.max(
        4,
        Math.min(
          innerHeight-
          wrap.offsetHeight-
          4,
          r.top
        )
      );

    wrap.style.left=
      x+'px';

    wrap.style.top=
      y+'px';

    wrap.style.right='auto';
    wrap.style.bottom='auto';

    try{
      localStorage.setItem(
        POS_KEY,
        JSON.stringify({
          x,
          y
        })
      );
    }catch(_){}
  }
);

toast(
  removeNarrator
    ? '나레이터 삭제 ON'
    : '나레이터 삭제 OFF',
  'ok'
);

})();
