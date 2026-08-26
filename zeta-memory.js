(()=>{'use strict';

const K='__ZETA_RP_MEMORY_V4__';
const ID='__zeta_rp_memory_v4__';
const STORE='__ZETA_RP_MEMORY_EDIT_STORE_V1__';
const START='[ZETA_RP_MEMORY]';
const END='[/ZETA_RP_MEMORY]';

/* 재실행 시 최신판으로 교체 */
try{window[K]?.destroy?.()}catch{}
document.getElementById(ID)?.remove();

let observer=null,scanTimer=null,hideTimer=null,saveTimer=null;
let busy=false,baseline=false,turn=0,lastCount=0,lastBtn=null;


/* ==============================
   저장
============================== */

const chatKey=()=>location.origin+location.pathname;

function all(){
  try{
    const v=JSON.parse(localStorage.getItem(STORE)||'{}');
    return v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  }catch{return{}}
}

function read(){
  const v=all()[chatKey()]||{};
  return{
    text:String(v.text||''),
    interval:[3,5,10].includes(+v.interval)?+v.interval:0
  };
}

function save(p){
  const a=all(),v={...read(),...p};
  a[chatKey()]={
    text:String(v.text||''),
    interval:[3,5,10].includes(+v.interval)?+v.interval:0,
    updatedAt:Date.now()
  };
  localStorage.setItem(STORE,JSON.stringify(a));
  refresh();
}


/* ==============================
   공통
============================== */

function visible(e){
  if(!e)return false;
  const r=e.getBoundingClientRect(),s=getComputedStyle(e);
  return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';
}

function toast(msg){
  document.getElementById(ID+'t')?.remove();

  const t=document.createElement('div');
  t.id=ID+'t';
  t.textContent=msg;

  Object.assign(t.style,{
    position:'fixed',
    left:'50%',
    bottom:'90px',
    transform:'translateX(-50%)',
    zIndex:'2147483647',
    background:'#17191ef5',
    color:'#fff',
    padding:'7px 10px',
    borderRadius:'9px',
    font:'11px system-ui',
    boxShadow:'0 5px 18px #0007',
    pointerEvents:'none'
  });

  document.body.appendChild(t);
  setTimeout(()=>t.remove(),1400);
}


/* ==============================
   {{char}} 수정 버튼
============================== */

function editButtons(){
  let b=[
    ...document.querySelectorAll(
      'button[data-testid="edit-button"]'
    )
  ];

  if(!b.length){
    b=[
      ...document.querySelectorAll(
        'button[aria-label="Edit message"]'
      )
    ];
  }

  return b;
}

function latestEdit(){
  const b=editButtons().filter(visible);
  return b.at(-1)||editButtons().at(-1)||null;
}


/* ==============================
   ★ 편집창 탐색
   나레삭제 로직 + fallback
============================== */

function editorCandidates(){
  return[
    ...document.querySelectorAll(`
      [data-sentry-component="KeyboardAvoidingView"] textarea[name="message"],
      [data-sentry-component="KeyboardAvoidingView"] textarea,
      [role="dialog"] textarea[name="message"],
      [role="dialog"] textarea,
      textarea[name="message"],
      [contenteditable="true"]
    `)
  ].filter(e=>!e.closest('#'+ID));
}

function findEditor(before){

  /* 나레삭제에서 쓰는 경로 최우선 */
  let e=[
    ...document.querySelectorAll(
      '[data-sentry-component="KeyboardAvoidingView"] textarea[name="message"]'
    )
  ].filter(x=>!x.closest('#'+ID));

  if(e.length)return e.at(-1);

  /* 수정버튼 누른 뒤 새로 생긴 editor */
  e=editorCandidates().filter(x=>!before.has(x));

  if(e.length)return e.at(-1);

  /* dialog 안 textarea */
  e=[
    ...document.querySelectorAll(
      '[role="dialog"] textarea'
    )
  ].filter(x=>!x.closest('#'+ID));

  if(e.length)return e.at(-1);

  return null;
}

function waitFor(fn,timeout=5000){
  return new Promise((ok,no)=>{
    const end=Date.now()+timeout;

    const tick=()=>{
      let v=null;
      try{v=fn()}catch{}

      if(v)return ok(v);

      if(Date.now()>end)
        return no(Error('편집 UI를 찾지 못함'));

      setTimeout(tick,60);
    };

    tick();
  });
}


/* ==============================
   textarea 값 변경
============================== */

function getValue(el){
  if(
    el instanceof HTMLTextAreaElement||
    el instanceof HTMLInputElement
  )return el.value;

  return el.textContent||'';
}

function setValue(el,value){

  if(el instanceof HTMLTextAreaElement){

    const setter=
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set;

    if(!setter)throw Error('textarea 변경 실패');

    setter.call(el,value);

  }else if(el instanceof HTMLInputElement){

    const setter=
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )?.set;

    if(!setter)throw Error('input 변경 실패');

    setter.call(el,value);

  }else{

    el.textContent=value;
  }

  el.dispatchEvent(
    new InputEvent('input',{
      bubbles:true,
      inputType:'insertText',
      data:null
    })
  );

  el.dispatchEvent(
    new Event('change',{bubbles:true})
  );
}


/* ==============================
   저장 버튼
============================== */

function modalOf(el){
  return(
    el.closest(
      '[data-sentry-component="KeyboardAvoidingView"]'
    )||
    el.closest('[role="dialog"]')||
    el.parentElement?.parentElement?.parentElement||
    document.body
  );
}

function isCheck(btn){
  for(const p of btn.querySelectorAll('path')){
    const d=(p.getAttribute('d')||'')
      .replace(/\s+/g,' ')
      .trim();

    if(
      d.includes('M13.507 5')&&
      d.includes('6.84 11.673')&&
      d.includes('3 7.833')
    )return true;
  }

  return false;
}

function findSave(modal){

  let b=[
    ...modal.querySelectorAll('button')
  ].filter(visible).find(isCheck);

  if(b)return b;

  b=modal.querySelector(
    'button[data-testid*="save" i],button[aria-label*="save" i],button[aria-label*="저장"]'
  );

  return b||null;
}


/* ==============================
   메모 문자열
============================== */

function memoryLine(text){
  text=String(text||'')
    .trim()
    .replace(/\s*\n+\s*/g,' | ')
    .replace(/\s{2,}/g,' ');

  if(!text)return'';

  return(
    `@: ${START} `+
    `continuity reference only; never mention, quote, summarize or imitate. `+
    text+
    ` ${END}`
  );
}

function removeOldMemory(text){

  const escapedStart=
    START.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

  const escapedEnd=
    END.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

  return String(text||'')
    .replace(
      new RegExp(
        '\\n*\\s*@:\\s*'+
        escapedStart+
        '[\\s\\S]*?'+
        escapedEnd+
        '\\s*',
        'g'
      ),
      ''
    )
    .replace(/\s+$/,'');
}


/* ==============================
   ★ 실제 {{char}} 메시지 수정
============================== */

async function inject(btn=latestEdit(),manual=false){

  const mem=read().text.trim();

  if(!mem)
    return alert('먼저 RP 메모를 입력해주세요.');

  if(!btn)
    return alert('최근 {{char}} 수정 버튼을 찾지 못했습니다.');

  if(busy)return;

  busy=true;
  refresh();

  root.dataset.open='0';

  try{

    /* 수정 전 존재하던 textarea 기억 */
    const before=
      new Set(editorCandidates());

    btn.click();

    /* 새 편집 UI 찾기 */
    const ed=
      await waitFor(
        ()=>findEditor(before)
      );

    const old=
      getValue(ed);

    const clean=
      removeOldMemory(old);

    const next=
      (
        clean.trimEnd()+
        '\n\n'+
        memoryLine(mem)
      ).trim();

    setValue(ed,next);

    const modal=
      modalOf(ed);

    const sb=
      await waitFor(()=>{
        const b=findSave(modal);
        return b&&!b.disabled?b:null;
      });

    sb.click();

    turn=0;

    await new Promise(
      r=>setTimeout(r,300)
    );

    lastCount=
      editButtons().length;

    lastBtn=
      latestEdit();

    scheduleHide();

    toast(
      manual
        ?'RP 메모 삽입 완료'
        :'RP 메모 자동 삽입 완료'
    );

  }catch(e){

    console.error(
      '[ZETA RP MEMORY]',
      e
    );

    alert(
      'RP 메모 삽입 실패\n'+
      (e?.message||e)
    );

  }finally{

    busy=false;
    refresh();
  }
}


/* ==============================
   기준점
============================== */

function setBaseline(){

  const b=latestEdit();

  if(!b)
    return alert(
      '최근 {{char}} 답변을 찾지 못했습니다.'
    );

  baseline=true;
  turn=0;

  lastCount=
    editButtons().length;

  lastBtn=b;

  refresh();

  toast(
    '최근 {{char}} 답변을 기준점으로 설정'
  );
}


/* ==============================
   자동 턴 감지
============================== */

function scan(){

  if(busy)return;

  const buttons=
    editButtons();

  const count=
    buttons.length;

  const latest=
    latestEdit();

  if(!baseline){
    lastCount=count;
    lastBtn=latest;
    return;
  }

  let added=0;

  if(count>lastCount){

    added=
      count-lastCount;

  }else if(
    latest&&
    latest!==lastBtn
  ){

    added=1;
  }

  lastCount=count;
  lastBtn=latest;

  const v=read();

  if(
    !added||
    !v.interval
  )return;

  turn+=added;

  if(turn>=v.interval){

    inject(latest,false);

  }else{

    refresh();
  }
}

function scheduleScan(){
  clearTimeout(scanTimer);
  scanTimer=setTimeout(scan,150);
}


/* ==============================
   화면에서 메모 숨김
============================== */

/* ==============================
   화면에서 RP MEMORY 완전히 숨김
   @: 나레이터 껍데기까지 제거
============================== */

function markerElements(){

  const out=[];

  for(const el of document.querySelectorAll('body *')){

    if(
      el.closest('#'+ID)||
      ['SCRIPT','STYLE','TEXTAREA','INPUT'].includes(el.tagName)
    )continue;

    const text=el.textContent||'';

    if(
      !text.includes(START)||
      !text.includes(END)
    )continue;

    /*
     * START/END를 가진 가장 안쪽 요소만
     */
    const childHas=
      [...el.children].some(child=>{
        const t=child.textContent||'';

        return(
          t.includes(START)&&
          t.includes(END)
        );
      });

    if(!childHas)
      out.push(el);
  }

  return out;
}


/*
 * Zeta가
 *
 * @: [ZETA_RP_MEMORY] ... [/ZETA_RP_MEMORY]
 *
 * 를 별도의 narrator 블록으로 렌더링했다면
 * 그 블록 전체를 찾아냄.
 */
function findMemoryWrapper(el){

  let cur=el;

  for(let depth=0;depth<8;depth++){

    if(
      !cur||
      cur===document.body||
      cur.closest('#'+ID)
    )break;

    const text=
      (cur.textContent||'')
        .replace(/\u00a0/g,' ');

    const start=
      text.indexOf(START);

    const end=
      text.indexOf(END,start);

    if(
      start>=0&&
      end>=0
    ){

      const at=
        text.lastIndexOf(
          '@:',
          start
        );

      if(at>=0){

        const before=
          text
            .slice(0,at)
            .trim();

        const between=
          text
            .slice(
              at+2,
              start
            )
            .trim();

        const after=
          text
            .slice(
              end+END.length
            )
            .trim();

        /*
         * 이 DOM이 RP 메모 전용 블록이면
         * 통째로 숨김.
         *
         * 이렇게 해야 @:용 아이콘/여백까지 사라짐.
         */
        if(
          !before&&
          !between&&
          !after
        ){
          return cur;
        }
      }
    }

    cur=cur.parentElement;
  }

  return null;
}


/*
 * 별도 narrator wrapper를 못 찾은 경우
 * 텍스트 Range로 @:부터 END까지 제거
 */
function removeMemoryRange(el){

  /*
   * @:와 marker가 같이 들어있는
   * 가장 가까운 부모를 탐색
   */
  let host=el;

  for(let depth=0;depth<7;depth++){

    if(
      !host||
      host===document.body
    )break;

    const text=
      host.textContent||'';

    const start=
      text.indexOf(START);

    if(start>=0){

      const at=
        text.lastIndexOf(
          '@:',
          start
        );

      if(at>=0){
        break;
      }
    }

    host=host.parentElement;
  }

  if(
    !host||
    host===document.body
  ){
    host=el;
  }


  const walker=
    document.createTreeWalker(
      host,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node){

          const p=
            node.parentElement;

          if(
            !p||
            p.closest('#'+ID)||
            ['SCRIPT','STYLE','TEXTAREA','INPUT'].includes(p.tagName)
          ){
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );


  const nodes=[];

  let node;
  let total='';


  while(
    node=
      walker.nextNode()
  ){

    nodes.push({
      node,
      start:total.length,
      end:
        total.length+
        node.nodeValue.length
    });

    total+=
      node.nodeValue;
  }


  let start=
    total.indexOf(START);

  if(start<0)return;


  let end=
    total.indexOf(
      END,
      start
    );

  if(end<0)return;


  end+=
    END.length;


  /*
   * ★ START 앞에 있는 @:까지 포함
   */
  const at=
    total.lastIndexOf(
      '@:',
      start
    );


  if(
    at>=0&&
    /^\s*$/.test(
      total.slice(
        at+2,
        start
      )
    )
  ){
    start=at;
  }


  /*
   * 바로 앞 줄바꿈/공백도 같이 먹음
   */
  while(
    start>0&&
    /[\s\u00a0]/.test(
      total[
        start-1
      ]
    )
  ){
    start--;
  }


  const first=
    nodes.find(
      x=>
        start>=x.start&&
        start<=x.end
    );


  const last=
    [...nodes]
      .reverse()
      .find(
        x=>
          end>=x.start&&
          end<=x.end
      );


  if(
    !first||
    !last
  )return;


  try{

    const range=
      document.createRange();


    range.setStart(
      first.node,
      Math.max(
        0,
        start-first.start
      )
    );


    range.setEnd(
      last.node,
      Math.max(
        0,
        end-last.start
      )
    );


    range.deleteContents();


    /*
     * 삭제 후 빈 narrator 블록이 됐다면
     * 그 껍데기도 숨김
     */
    if(
      !host.textContent.trim()
    ){

      host.style.setProperty(
        'display',
        'none',
        'important'
      );
    }

  }catch(e){

    console.warn(
      '[ZETA RP MEMORY hide]',
      e
    );
  }
}


function hideMemory(){

  for(
    const el
    of markerElements()
  ){

    const wrapper=
      findMemoryWrapper(el);


    if(wrapper){

      /*
       * 최우선:
       * @: + 메모가 들어있는
       * narrator UI 자체를 숨긴다.
       */
      wrapper.style.setProperty(
        'display',
        'none',
        'important'
      );

      wrapper.dataset.zetaRpMemoryHidden=
        '1';

    }else{

      /*
       * DOM 구조가 다를 때 fallback
       */
      removeMemoryRange(el);
    }
  }
}


function scheduleHide(){

  clearTimeout(
    hideTimer
  );


  hideTimer=
    setTimeout(
      hideMemory,
      80
    );
}


/* ==============================
   UI
============================== */

const root=
  document.createElement('div');

root.id=ID;
root.dataset.open='0';

root.innerHTML=`
<style>
#${ID}{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:#0009;font-family:system-ui}
#${ID}[data-open="1"]{display:flex}
#${ID} .c{width:min(430px,100%);max-height:86vh;overflow:auto;padding:15px;box-sizing:border-box;border:1px solid #ffffff20;border-radius:18px;background:#191b21;color:#fff}
#${ID} .h{display:flex;justify-content:space-between;align-items:center;margin-bottom:11px;font-weight:750}
#${ID} .x{width:34px;height:34px;border:0;border-radius:10px;background:#ffffff12;color:#fff;font-size:18px}
#${ID} textarea{width:100%;min-height:210px;box-sizing:border-box;padding:11px;border:1px solid #ffffff1c;border-radius:12px;background:#ffffff0e;color:#fff;outline:none;resize:vertical;font:12px/1.55 ui-monospace,monospace}
#${ID} .l{margin:10px 0 6px;color:#ffffff99;font-size:11px}
#${ID} .iv{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
#${ID} .b{height:38px;border:1px solid #ffffff18;border-radius:10px;background:#ffffff0a;color:#ffffffc4;font:700 11px system-ui}
#${ID} .i[data-on="1"]{background:#6d88cf;color:#fff}
#${ID} .row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
#${ID} .base{background:#3f536f;color:#fff}
#${ID} .now{background:#485f9b;color:#fff}
#${ID} .s{margin-top:10px;padding:9px 10px;border-radius:10px;background:#ffffff09;color:#ffffff99;font-size:10px;line-height:1.5}
</style>

<div class="c">

<div class="h">
<span>📌 RP MEMORY</span>
<button class="x">×</button>
</div>

<textarea class="mem" spellcheck="false"
placeholder="현재 장소: 집 거실
둘은 싸운 직후
ㅇㅇ는 사건의 진실을 모름"></textarea>

<div class="l">자동 삽입 주기</div>

<div class="iv">
<button class="b i" data-i="0">OFF</button>
<button class="b i" data-i="3">3턴</button>
<button class="b i" data-i="5">5턴</button>
<button class="b i" data-i="10">10턴</button>
</div>

<div class="row">
<button class="b base">📍 최근 답변을 기준점으로</button>
<button class="b now">📌 지금 대화에 넣기</button>
</div>

<div class="s"></div>

</div>
`;

(document.body||document.documentElement)
  .appendChild(root);

const ta=
  root.querySelector('.mem');

const status=
  root.querySelector('.s');

function refresh(){

  const v=read();

  if(document.activeElement!==ta)
    ta.value=v.text;

  root.querySelectorAll('.i')
    .forEach(b=>{
      b.dataset.on=
        +b.dataset.i===v.interval
          ?'1'
          :'0';
    });

  status.textContent=
    (
      baseline
        ?'기준점 설정됨'
        :'기준점 없음'
    )+
    ' · 자동 '+
    (
      v.interval
        ?v.interval+'턴'
        :'OFF'
    )+
    (
      baseline&&v.interval
        ?' · '+turn+'/'+v.interval+'턴'
        :''
    )+
    (
      busy
        ?' · 처리 중'
        :''
    );
}

function open(){
  refresh();
  root.dataset.open='1';
}

function close(){
  root.dataset.open='0';
}

ta.oninput=()=>{
  clearTimeout(saveTimer);

  saveTimer=setTimeout(
    ()=>save({text:ta.value}),
    250
  );
};

root.querySelectorAll('.i')
  .forEach(b=>{
    b.onclick=()=>{
      save({
        interval:+b.dataset.i
      });

      turn=0;

      if(baseline){
        lastCount=editButtons().length;
        lastBtn=latestEdit();
      }

      refresh();
    };
  });

root.querySelector('.base').onclick=
  setBaseline;

root.querySelector('.now').onclick=
  ()=>inject(latestEdit(),true);

root.querySelector('.x').onclick=
  close;

root.onpointerdown=e=>{
  if(e.target===root)
    close();
};


/* DOM 감시 */

observer=
  new MutationObserver(()=>{
    scheduleScan();
    scheduleHide();
  });

observer.observe(
  document.body,
  {
    subtree:true,
    childList:true,
    characterData:true,
    attributes:true,
    attributeFilter:[
      'class',
      'style',
      'data-sentry-component'
    ]
  }
);


/* 재실행 정리 가능 */

function destroy(){
  observer?.disconnect();

  clearTimeout(scanTimer);
  clearTimeout(hideTimer);
  clearTimeout(saveTimer);

  document.getElementById(ID)?.remove();
  document.getElementById(ID+'t')?.remove();

  try{delete window[K]}
  catch{window[K]=null}
}

window[K]={
  open,
  close,
  destroy,
  read,
  inject:()=>inject(latestEdit(),true),
  baseline:setBaseline,
  version:'4.0'
};

lastCount=editButtons().length;
lastBtn=latestEdit();

refresh();
scheduleHide();
open();

console.log('[ZETA RP MEMORY] v4 ready');

})();
