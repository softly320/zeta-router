(()=>{'use strict';

const ID='zeta-roleplay-formatter-v10';
const POS_KEY='zetaFormatterPosition';
const MODE_KEY='zetaFormatterRemoveNarrator';

document.querySelectorAll('[id^="zeta-roleplay-formatter-"]').forEach(e=>e.remove());

let removeNarrator=localStorage.getItem(MODE_KEY)==='1';
let busy=false;

const visible=e=>{
  if(!e)return false;
  const r=e.getBoundingClientRect(),s=getComputedStyle(e);
  return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';
};

function toast(msg,type='normal'){
  document.getElementById(ID+'-toast')?.remove();

  const t=document.createElement('div');
  t.id=ID+'-toast';
  t.textContent=msg;

  Object.assign(t.style,{
    position:'fixed',
    zIndex:'2147483647',
    padding:'6px 9px',
    borderRadius:'8px',
    background:
      type==='error'
        ?'rgba(127,29,29,.97)'
        :type==='ok'
          ?'rgba(20,83,45,.97)'
          :'rgba(24,24,27,.97)',
    border:'1px solid rgba(255,255,255,.08)',
    color:'#fff',
    font:'11px system-ui,sans-serif',
    boxShadow:'0 4px 16px rgba(0,0,0,.28)',
    pointerEvents:'none',
    opacity:'0',
    transform:'translateY(3px)',
    transition:'opacity .12s ease,transform .12s ease'
  });

  document.body.appendChild(t);

  const b=wrap.getBoundingClientRect();

  t.style.left=
    Math.min(
      innerWidth-t.offsetWidth-5,
      Math.max(
        5,
        b.left+b.width/2-t.offsetWidth/2
      )
    )+'px';

  t.style.top=
    Math.max(
      5,
      b.top-t.offsetHeight-6
    )+'px';

  requestAnimationFrame(()=>{
    t.style.opacity='1';
    t.style.transform='translateY(0)';
  });

  setTimeout(()=>{
    t.style.opacity='0';
    t.style.transform='translateY(3px)';
    setTimeout(()=>t.remove(),150);
  },1300);
}


/* *지문* *지문* → *지문 지문*
   \*지문\* 도 일반 별표로 정리 */
function cleanItalics(text){

  text=String(text??'')
    .replace(/\\\*/g,'*')
    .replace(
      /[\u00A0\u200B\u200C\u200D\u2060\uFEFF]/g,
      ' '
    );

  let old;

  do{
    old=text;

    text=text.replace(
      /\*[ \t\r\n]+\*/g,
      ' '
    );

  }while(text!==old);

  return text
    .replace(/[ \t\r\n]+/g,' ')
    .trim();
}


/* @이름: / @: 블록 정리 */
function formatText(input){

  const lines=
    String(input??'')
      .replace(/\r\n?/g,'\n')
      .split('\n');

  let characterName=null;
  let mode='none';

  const parts=[];

  for(const raw of lines){

    const line=raw.trim();

    if(!line)continue;


    /* narrator */
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


    /* character */
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
        ?' '+content
        :''
    )
  );
}


/* React textarea 값 변경 */
function setReactValue(el,value){

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


/* 새 UI: 활성화된 마지막 Edit message */
function getEditButton(){

  const all=[
    ...document.querySelectorAll(
      'button[aria-label="Edit message"]:not(:disabled)'
    )
  ];


  return (
    all.filter(visible).at(-1)||
    all.at(-1)||
    null
  );
}


/* 새 UI textarea */
function getEditor(){

  const all=[
    ...document.querySelectorAll(
      'textarea[name="message"]'
    )
  ]
  .filter(
    e=>!e.closest('#'+ID)
  );


  return (
    all.filter(visible).at(-1)||
    null
  );
}


/* 새 UI 저장 버튼 */
function getSaveButton(){

  const all=[
    ...document.querySelectorAll(
      'button[aria-label="Save edit"]:not(:disabled)'
    )
  ];


  return (
    all.filter(visible).at(-1)||
    all.at(-1)||
    null
  );
}


function waitFor(fn,timeout=5000){

  return new Promise(
    (resolve,reject)=>{

      const end=
        Date.now()+timeout;


      const tick=()=>{

        let value=null;


        try{
          value=fn();
        }catch(_){}


        if(value){

          resolve(value);

          return;
        }


        if(
          Date.now()>end
        ){

          reject(
            new Error(
              '편집 UI를 찾지 못했습니다.'
            )
          );

          return;
        }


        setTimeout(
          tick,
          60
        );
      };


      tick();
    }
  );
}


/* 실행 */
async function run(){

  if(busy)return;


  const edit=
    getEditButton();


  if(!edit){

    toast(
      '활성화된 수정 버튼을 찾지 못했습니다.',
      'error'
    );

    return;
  }


  busy=true;

  runBtn.style.opacity='.45';
  runBtn.style.pointerEvents='none';

  toggleBtn.style.pointerEvents='none';


  try{

    edit.click();


    const textarea=
      await waitFor(
        getEditor
      );


    const formatted=
      formatText(
        textarea.value
      );


    setReactValue(
      textarea,
      formatted
    );


    const save=
      await waitFor(
        getSaveButton
      );


    save.click();


    toast(
      removeNarrator
        ?'나레이터 삭제 + 저장 완료'
        :'전체 합치기 + 저장 완료',
      'ok'
    );


  }catch(error){

    console.error(
      '[ZETA narrator]',
      error
    );


    toast(
      error?.message||
      '변환 실패',
      'error'
    );


  }finally{

    busy=false;

    runBtn.style.opacity='1';
    runBtn.style.pointerEvents='auto';

    toggleBtn.style.pointerEvents='auto';
  }
}


/* UI */
const wrap=
  document.createElement(
    'div'
  );

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


function updateToggle(){

  if(removeNarrator){

    toggleLabel.textContent='N×';

    toggleBtn.title=
      '나레이터 삭제 ON';


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


    Object.assign(
      toggleBtn.style,
      {
        background:'transparent',

        color:
          'rgba(255,255,255,.48)',

        boxShadow:'none'
      }
    );
  }
}


updateToggle();


toggleBtn.addEventListener(
  'click',
  event=>{

    event.stopPropagation();


    removeNarrator=
      !removeNarrator;


    localStorage.setItem(
      MODE_KEY,
      removeNarrator
        ?'1'
        :'0'
    );


    updateToggle();


    toast(
      removeNarrator
        ?'나레이터 삭제 ON'
        :'나레이터 삭제 OFF',

      removeNarrator
        ?'ok'
        :'normal'
    );
  }
);


wrap.append(
  runBtn,
  toggleBtn
);


/* 위치 복원 */
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

    wrap.style.left=
      Math.max(
        4,
        Math.min(
          innerWidth-72,
          pos.x
        )
      )+'px';


    wrap.style.top=
      Math.max(
        4,
        Math.min(
          innerHeight-36,
          pos.y
        )
      )+'px';

  }else{

    wrap.style.right='12px';
    wrap.style.bottom='12px';
  }

}catch(_){

  wrap.style.right='12px';
  wrap.style.bottom='12px';
}


document.body.appendChild(
  wrap
);


/* 드래그 */
let dragging=false;
let moved=false;
let pid=null;

let startX=0;
let startY=0;

let originX=0;
let originY=0;


function dragStart(event){

  if(busy)return;


  dragging=true;
  moved=false;

  pid=event.pointerId;


  const rect=
    wrap.getBoundingClientRect();


  startX=event.clientX;
  startY=event.clientY;

  originX=rect.left;
  originY=rect.top;


  wrap.style.left=
    rect.left+'px';

  wrap.style.top=
    rect.top+'px';

  wrap.style.right='auto';
  wrap.style.bottom='auto';


  runBtn.style.cursor=
    'grabbing';


  try{

    runBtn.setPointerCapture(
      pid
    );

  }catch(_){}


  event.preventDefault();
  event.stopPropagation();
}


function dragMove(event){

  if(
    !dragging||
    event.pointerId!==pid
  ){
    return;
  }


  const dx=
    event.clientX-startX;


  const dy=
    event.clientY-startY;


  if(
    !moved&&
    Math.hypot(
      dx,
      dy
    )>=5
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

        originX+
        dx
      )
    );


  const y=
    Math.max(
      4,
      Math.min(
        innerHeight-
        wrap.offsetHeight-
        4,

        originY+
        dy
      )
    );


  wrap.style.left=
    x+'px';


  wrap.style.top=
    y+'px';


  event.preventDefault();
  event.stopPropagation();
}


function dragEnd(event){

  if(
    !dragging||
    (
      event.pointerId!=null&&
      event.pointerId!==pid
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


  const rect=
    wrap.getBoundingClientRect();


  try{

    localStorage.setItem(

      POS_KEY,

      JSON.stringify({
        x:rect.left,
        y:rect.top
      })
    );

  }catch(_){}


  const shouldRun=
    !moved;


  moved=false;
  pid=null;


  if(shouldRun){

    run();
  }


  if(event){

    event.preventDefault();
    event.stopPropagation();
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


/* 화면 회전/크기 변경 */
window.addEventListener(
  'resize',
  ()=>{

    const rect=
      wrap.getBoundingClientRect();


    const x=
      Math.max(
        4,
        Math.min(
          innerWidth-
          wrap.offsetWidth-
          4,
          rect.left
        )
      );


    const y=
      Math.max(
        4,
        Math.min(
          innerHeight-
          wrap.offsetHeight-
          4,
          rect.top
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
    ?'나레이터 삭제 ON'
    :'나레이터 삭제 OFF',
  'ok'
);

})();
