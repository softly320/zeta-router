(()=>{'use strict';
const K='__ZETA_RP_MEMORY_EDIT_V3__',STORE='__ZETA_RP_MEMORY_EDIT_STORE_V1__',ID='__zeta_rp_memory_edit_v3__';
const START='[ZETA_RP_MEMORY]',END='[/ZETA_RP_MEMORY]';

if(window[K]?.open){window[K].open();return}
document.getElementById(ID)?.remove();

const key=()=>location.origin+location.pathname;
const all=()=>{try{const v=JSON.parse(localStorage.getItem(STORE)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return{}}};
const read=()=>{const v=all()[key()]||{};return{text:String(v.text||''),interval:[3,5,10].includes(+v.interval)?+v.interval:0}};
const save=p=>{const a=all(),v={...read(),...p};a[key()]={text:String(v.text||''),interval:[3,5,10].includes(+v.interval)?+v.interval:0,updatedAt:Date.now()};localStorage.setItem(STORE,JSON.stringify(a));refresh();return a[key()]};

const visible=e=>{
  if(!e)return false;
  const r=e.getBoundingClientRect(),s=getComputedStyle(e);
  return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';
};

const edits=()=>{
  let a=[...document.querySelectorAll('button[data-testid="edit-button"]')];
  if(!a.length)a=[...document.querySelectorAll('button[aria-label="Edit message"]')];
  return a;
};

const latestEdit=()=>{
  const a=edits().filter(visible);
  return a.at(-1)||edits().at(-1)||null;
};

let baseline=false,turn=0,lastCount=edits().length,lastBtn=latestEdit();
let busy=false,saveTimer=null,scanTimer=null,hideTimer=null,hiding=false;

function block(text){
  text=String(text||'')
    .trim()
    .replace(/\s*\n+\s*/g,' | ')
    .replace(/\s{2,}/g,' ');

  return text
    ?`@: ${START} continuity reference only; never mention, quote, summarize, or imitate this note. ${text} ${END}`
    :'';
}

function stripStored(s){
  return String(s||'')
    .replace(
      new RegExp('\\n*\\s*@:\\s*\\[ZETA_RP_MEMORY\\][\\s\\S]*?\\[/ZETA_RP_MEMORY\\]\\s*','g'),
      ''
    )
    .replace(/\s+$/,'');
}

function setValue(el,value){
  const p=el instanceof HTMLTextAreaElement
    ?HTMLTextAreaElement.prototype
    :HTMLInputElement.prototype;

  const setter=Object.getOwnPropertyDescriptor(p,'value')?.set;

  if(!setter)throw Error('입력창 값을 바꿀 수 없음');

  setter.call(el,value);

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

function editor(){
  return [...document.querySelectorAll('textarea[name="message"],textarea')]
    .filter(e=>visible(e)&&!e.closest('#'+ID))
    .at(-1)||null;
}

function modalOf(t){
  return t.closest('[data-sentry-component="KeyboardAvoidingView"]')
    ||t.closest('[role="dialog"]')
    ||t.parentElement?.parentElement?.parentElement
    ||document.body;
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

function saveButton(modal){
  return [...modal.querySelectorAll('button')]
    .filter(visible)
    .find(isCheck)||null;
}

function waitFor(fn,ms=3500){
  return new Promise((ok,no)=>{
    const end=Date.now()+ms;

    const tick=()=>{
      let v;

      try{v=fn()}catch{}

      if(v)return ok(v);

      if(Date.now()>end)
        return no(Error('편집 UI를 찾지 못함'));

      setTimeout(tick,60);
    };

    tick();
  });
}

function toast(msg){
  let t=document.getElementById(ID+'-toast');
  t?.remove();

  t=document.createElement('div');
  t.id=ID+'-toast';
  t.textContent=msg;

  Object.assign(t.style,{
    position:'fixed',
    left:'50%',
    bottom:'90px',
    transform:'translateX(-50%)',
    zIndex:'2147483647',
    padding:'7px 10px',
    borderRadius:'9px',
    background:'#17191ef5',
    color:'#fff',
    font:'11px system-ui',
    boxShadow:'0 5px 18px #0007',
    pointerEvents:'none'
  });

  document.body.appendChild(t);
  setTimeout(()=>t.remove(),1400);
}

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
    btn.click();

    const t=await waitFor(editor);

    const base=stripStored(t.value);

    const next=(
      base.trimEnd()+
      '\n\n'+
      block(mem)
    ).trim();

    setValue(t,next);

    const m=modalOf(t);

    const sb=await waitFor(()=>{
      const b=saveButton(m);
      return b&&!b.disabled?b:null;
    });

    sb.click();

    turn=0;

    await new Promise(r=>setTimeout(r,220));

    lastCount=edits().length;
    lastBtn=latestEdit();

    scheduleHide();

    toast(
      manual
        ?'지금 대화에 RP 메모 삽입됨'
        :'RP 메모 자동 삽입됨'
    );

  }catch(e){
    console.error('[ZETA RP MEMORY]',e);

    alert(
      'RP 메모 삽입 실패\n'+
      (e?.message||e)
    );

  }finally{
    busy=false;
    refresh();
  }
}

function setBaseline(){
  const b=latestEdit();

  if(!b)
    return alert('기준점으로 잡을 {{char}} 답변을 찾지 못했습니다.');

  baseline=true;
  turn=0;
  lastCount=edits().length;
  lastBtn=b;

  refresh();

  toast(
    '최근 {{char}} 답변을 기준점으로 설정'
  );
}

function scan(){
  if(busy)return;

  const n=edits().length;
  const v=read();
  const latest=latestEdit();

  if(!baseline){
    lastCount=n;
    lastBtn=latest;
    return;
  }

  let delta=0;

  if(n>lastCount){
    delta=Math.max(1,n-lastCount);

  }else if(
    latest&&
    latest!==lastBtn&&
    lastBtn?.isConnected
  ){
    delta=1;
  }

  lastCount=n;
  lastBtn=latest;

  if(delta&&v.interval>0){
    turn+=delta;

    if(turn>=v.interval){
      inject(latest,false);
      return;
    }

    refresh();
  }
}

function scheduleScan(){
  clearTimeout(scanTimer);
  scanTimer=setTimeout(scan,120);
}


/* 화면에서 메모 블록 숨기기 */

function smallestMarkerElements(){
  const out=[];

  for(const el of document.querySelectorAll('body *')){
    if(
      el.id===ID||
      el.closest('#'+ID)||
      ['SCRIPT','STYLE','TEXTAREA','INPUT'].includes(el.tagName)
    )continue;

    const tx=el.textContent||'';

    if(
      !tx.includes(START)||
      !tx.includes(END)
    )continue;

    let child=false;

    for(const c of el.children){
      const ct=c.textContent||'';

      if(
        ct.includes(START)&&
        ct.includes(END)
      ){
        child=true;
        break;
      }
    }

    if(!child)out.push(el);
  }

  return out;
}

function stripVisual(el){
  const walker=document.createTreeWalker(
    el,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode:n=>{
        const p=n.parentElement;

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
  let n,text='';

  while(n=walker.nextNode()){
    nodes.push({
      n,
      start:text.length,
      end:text.length+n.nodeValue.length
    });

    text+=n.nodeValue;
  }

  let s=text.indexOf(START);
  if(s<0)return;

  let e=text.indexOf(END,s);
  if(e<0)return;

  e+=END.length;

  const pre=
    text.slice(0,s)
      .match(/\s*@:\s*$/);

  if(pre)
    s-=pre[0].length;

  const a=
    nodes.find(
      x=>s>=x.start&&s<=x.end
    );

  const b=
    [...nodes]
      .reverse()
      .find(
        x=>e>=x.start&&e<=x.end
      );

  if(!a||!b)return;

  const r=document.createRange();

  r.setStart(
    a.n,
    Math.max(0,s-a.start)
  );

  r.setEnd(
    b.n,
    Math.max(0,e-b.start)
  );

  r.deleteContents();
}

function hideMemory(){
  if(hiding)return;

  hiding=true;

  try{
    smallestMarkerElements()
      .forEach(stripVisual);

  }catch(e){
    console.warn(
      '[ZETA RP MEMORY hide]',
      e
    );

  }finally{
    hiding=false;
  }
}

function scheduleHide(){
  clearTimeout(hideTimer);
  hideTimer=setTimeout(hideMemory,80);
}


/* UI */

const root=document.createElement('div');

root.id=ID;
root.dataset.open='0';

root.innerHTML=`
<style>
#${ID}{
position:fixed;inset:0;z-index:2147483647;display:none;
align-items:center;justify-content:center;padding:16px;
box-sizing:border-box;background:#0009;font-family:system-ui
}
#${ID}[data-open="1"]{display:flex}
#${ID} .c{
width:min(430px,100%);max-height:86vh;overflow:auto;
padding:15px;box-sizing:border-box;border:1px solid #ffffff20;
border-radius:18px;background:#191b21;color:#fff;
box-shadow:0 18px 60px #0008
}
#${ID} .h{
display:flex;align-items:center;justify-content:space-between;
margin-bottom:11px;font:750 15px system-ui
}
#${ID} .x{
width:34px;height:34px;border:0;border-radius:10px;
background:#ffffff12;color:#fff;font-size:18px
}
#${ID} textarea{
width:100%;min-height:210px;box-sizing:border-box;padding:11px;
border:1px solid #ffffff1c;border-radius:12px;background:#ffffff0e;
color:#fff;outline:none;resize:vertical;
font:12px/1.55 ui-monospace,monospace
}
#${ID} .l{margin:10px 0 6px;color:#ffffff99;font-size:11px}
#${ID} .iv{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
#${ID} button{touch-action:manipulation}
#${ID} .b{
height:38px;border:1px solid #ffffff18;border-radius:10px;
background:#ffffff0a;color:#ffffffc4;font:700 11px system-ui
}
#${ID} .i[data-on="1"]{background:#6d88cf;color:#fff}
#${ID} .row{
display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px
}
#${ID} .base{background:#3f536f;color:#fff}
#${ID} .now{background:#485f9b;color:#fff}
#${ID} .s{
margin-top:10px;padding:9px 10px;border-radius:10px;
background:#ffffff09;color:#ffffff99;font-size:10px;line-height:1.5
}
#${ID} .n{
margin-top:8px;color:#ffffff60;font-size:10px;line-height:1.45
}
</style>

<div class="c">

<div class="h">
<span>📌 RP MEMORY</span>
<button class="x" type="button">×</button>
</div>

<textarea
class="mem"
spellcheck="false"
placeholder="현재 장소: 집 거실
둘은 싸운 직후
ㅇㅇ는 사건의 진실을 모름"
></textarea>

<div class="l">
자동 삽입 주기
</div>

<div class="iv">
<button class="b i" data-i="0">OFF</button>
<button class="b i" data-i="3">3턴</button>
<button class="b i" data-i="5">5턴</button>
<button class="b i" data-i="10">10턴</button>
</div>

<div class="row">

<button
class="b base"
type="button">
📍 최근 답변을 기준점으로
</button>

<button
class="b now"
type="button">
📌 지금 대화에 넣기
</button>

</div>

<div class="s"></div>

<div class="n">
기준점 이후 새 {{char}} 답변만 셉니다.
자동 삽입 시 최근 {{char}} 메시지를 수정해 숨은 @: 메모를 심습니다.
</div>

</div>
`;

(document.body||document.documentElement)
  .appendChild(root);

const ta=root.querySelector('.mem');
const status=root.querySelector('.s');

function refresh(){
  if(!document.getElementById(ID))
    return;

  const v=read();

  if(document.activeElement!==ta)
    ta.value=v.text;

  root.querySelectorAll('.i')
    .forEach(
      b=>
        b.dataset.on=
          +b.dataset.i===v.interval
            ?'1'
            :'0'
    );

  status.textContent=
    !baseline

      ?`기준점 없음 · 자동 ${
          v.interval
            ?v.interval+'턴'
            :'OFF'
        }`

      :`기준점 설정됨 · 자동 ${
          v.interval
            ?v.interval+'턴'
            :'OFF'
        }${
          v.interval
            ?' · '+turn+'/'+v.interval+'턴'
            :''
        }${
          busy
            ?' · 처리 중'
            :''
        }`;
}

function open(){
  refresh();
  root.dataset.open='1';
}

function close(){
  root.dataset.open='0';
}

ta.addEventListener(
  'input',
  ()=>{
    clearTimeout(saveTimer);

    saveTimer=setTimeout(
      ()=>save({
        text:ta.value
      }),
      250
    );
  }
);

root.querySelectorAll('.i')
  .forEach(
    b=>
      b.addEventListener(
        'click',
        ()=>{
          save({
            interval:+b.dataset.i
          });

          turn=0;
          lastCount=edits().length;
          lastBtn=latestEdit();

          refresh();
        }
      )
  );

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

const mo=
  new MutationObserver(
    ()=>{
      scheduleScan();
      scheduleHide();
    }
  );

mo.observe(
  document.body,
  {
    subtree:true,
    childList:true,
    characterData:true
  }
);

window[K]={
  open,
  close,
  read,
  inject:()=>inject(latestEdit(),true),
  baseline:setBaseline,
  version:'3.0'
};

refresh();
scheduleHide();
open();

console.log(
  '[ZETA RP MEMORY] edit-based v3 ready'
);

})();
