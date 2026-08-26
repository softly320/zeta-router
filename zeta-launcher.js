(()=>{'use strict';
const K='__ZETA_TOOLBOX_LAUNCHER__',RK='__ZETA_OR_ROUTER_BOOKMARKLET_V1__',RAW='https://raw.githubusercontent.com/softly320/zeta-router/main/';
const U={router:RAW+'zeta-router.js',feed:RAW+'zeta-feed.js',theme:RAW+'zeta-theme.js',narrator:RAW+'zeta-narrator.js',kit:'https://zetakit.pages.dev/run.js',phone:'https://inpocket.pages.dev/inpocket.js'};
const I={b:'__zt_b__',m:'__zt_m__',a:'__zt_a__',x:'__zt_x__',s:'__zt_s__'},PK='__ZETA_TOOLBOX_POSITION__',CK='__ZETA_TOOLBOX_CUSTOM_TOOLS_V1__';

if(window[K]?.show&&document.getElementById(I.b)){window[K].show();window[K].ensureRouter?.();return}
try{window[K]?.destroy?.()}catch{}
try{delete window[K]}catch{window[K]=null}
Object.values(I).forEach(id=>document.getElementById(id)?.remove());

async function raw(url){
  const r=await fetch(url+'?cb='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  (0,eval)(await r.text());
}

function script(url){
  return new Promise((ok,no)=>{
    const s=document.createElement('script');
    s.src=url+(url.includes('?')?'&':'?')+'cb='+Date.now();
    s.onload=()=>{s.remove();ok()};
    s.onerror=()=>{s.remove();no(Error('로드 실패'))};
    (document.head||document.documentElement).appendChild(s);
  });
}

async function ensureRouter(){
  if(window[RK]){routerState();return true}
  try{
    await raw(U.router);
    routerState();
    return !!window[RK];
  }catch(e){
    routerState();
    alert('Provider Router 로드 실패\n'+(e?.message||e));
    return false;
  }
}

async function kit(){
  try{await ensureRouter();await script(U.kit)}
  catch(e){alert('키트 로드 실패\n'+(e?.message||e))}
}
async function feed(){
  try{await raw(U.feed)}
  catch(e){alert('피드 로드 실패\n'+(e?.message||e))}
}
async function theme(){
  try{await raw(U.theme)}
  catch(e){alert('테마 로드 실패\n'+(e?.message||e))}
}
async function narrator(){
  try{await raw(U.narrator)}
  catch(e){alert('나레삭제 로드 실패\n'+(e?.message||e))}
}

function phone(){
  try{window.__INPOCKET__?.destroy?.()}catch{}
  document.querySelectorAll('script[data-zt-phone]').forEach(s=>s.remove());

  const s=document.createElement('script');
  s.dataset.ztPhone='1';
  s.src=U.phone+'?cb='+Date.now();

  s.onload=()=>{
    try{window.__INPOCKET__?.open?.()}
    catch(e){console.error(e)}
  };

  s.onerror=()=>alert('inPocket 로드 실패');

  (document.head||document.documentElement).appendChild(s);
}

const rc=()=>{
  try{
    const v=JSON.parse(localStorage.getItem(CK)||'[]');
    return Array.isArray(v)?v:[];
  }catch{return[]}
};

const wc=v=>localStorage.setItem(CK,JSON.stringify(v));

const norm=v=>String(v||'')
  .trim()
  .replace(/^javascript\s*:/i,'')
  .trim();

const esc=v=>String(v??'').replace(
  /[&<>"']/g,
  c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c])
);

function runCustom(t){
  const c=norm(t?.code);
  if(!c)return alert('실행할 코드가 없습니다.');

  try{(0,eval)(c)}
  catch(e){
    alert('사용자 도구 실행 실패\n'+(e?.message||e));
  }
}

const st=document.createElement('style');
st.id=I.s;
st.textContent=`
#${I.b}{position:fixed;right:14px;bottom:calc(90px + env(safe-area-inset-bottom,0px));width:44px;height:44px;padding:0;display:flex;align-items:center;justify-content:center;z-index:2147483644;border:1px solid #ffffff33;border-radius:50%;background:linear-gradient(145deg,#30333d,#15171c);color:#fff;font:800 15px system-ui;box-shadow:0 6px 22px #0005;touch-action:none;user-select:none}
#${I.b} .d{position:absolute;top:3px;right:3px;width:8px;height:8px;border-radius:50%;background:#ef4444;border:1.5px solid #15171c}
#${I.b}[data-r="1"] .d{background:#22c55e;box-shadow:0 0 7px #22c55eaa}

#${I.m}{position:fixed;z-index:2147483645;display:none;width:min(286px,calc(100vw - 20px));box-sizing:border-box;padding:10px;border:1px solid #ffffff1f;border-radius:20px;background:#16181efa;color:#fff;box-shadow:0 14px 42px #0007;font-family:system-ui}
#${I.m}[data-o="1"]{display:block}
.h{display:flex;justify-content:space-between;padding:0 3px 8px;margin-bottom:9px;color:#ffffff88;font-size:10px;border-bottom:1px solid #ffffff14}
.r{color:#ef4444;font-weight:700}
.r[data-on="1"]{color:#4ade80}
.sc{max-height:min(48vh,390px);overflow-y:auto;padding:1px}
.g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.it{height:84px;border:1px solid #ffffff1a;border-radius:16px;background:#ffffff0c;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font:650 12px system-ui}
.it:active{transform:scale(.965);background:#ffffff26}
.ic{font-size:21px;pointer-events:none}
.lb{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none}

#${I.a}{position:fixed;z-index:2147483646;display:none;align-items:center;justify-content:center;width:46px;height:46px;padding:0;border:1px solid #93c5fd59;border-radius:50%;background:#1d212a;color:#93c5fd;font:300 28px system-ui;box-shadow:0 8px 26px #0007}
#${I.a}[data-o="1"]{display:flex}

#${I.x}{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:#0009;font-family:system-ui}
#${I.x}[data-o="1"]{display:flex}
.c{width:min(440px,100%);max-height:86vh;overflow:auto;box-sizing:border-box;padding:16px;border:1px solid #ffffff21;border-radius:20px;background:#191b21;color:#fff;box-shadow:0 18px 60px #0007}
.t{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;font:750 15px system-ui}
.cl{width:34px;height:34px;border:0;border-radius:10px;background:#ffffff12;color:#fff;font-size:18px}
.row{display:grid;grid-template-columns:80px 1fr;gap:10px;margin-bottom:10px}
label{display:block;margin:0 0 6px 2px;color:#ffffff99;font-size:11px}
input,textarea{width:100%;box-sizing:border-box;border:1px solid #ffffff1c;border-radius:12px;background:#ffffff0e;color:#fff;padding:10px 11px;outline:none}
textarea{min-height:150px;resize:vertical;font:11px/1.45 ui-monospace,monospace}
.act{display:flex;gap:8px;margin-top:10px}
.btn{flex:1;height:40px;border:0;border-radius:12px;background:#ffffff12;color:#fff;font:700 11px system-ui}
.save{background:#6d88cf}
.list{display:flex;flex-direction:column;gap:7px;margin-top:14px}
.e{display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;gap:7px;align-items:center;padding:8px;border:1px solid #ffffff14;border-radius:12px;background:#ffffff09}
.en{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
.mini{height:30px;border:0;border-radius:9px;background:#ffffff12;color:#fff;font-size:10px}
.del{color:#fca5a5}
`;

(document.head||document.documentElement).appendChild(st);

const b=document.createElement('button');
b.id=I.b;
b.type='button';
b.innerHTML='<span>Z</span><span class="d"></span>';

const m=document.createElement('div');
m.id=I.m;
m.dataset.o='0';
m.innerHTML=
  '<div class="h"><span>ZETA TOOLS</span><span class="r">ROUTER</span></div>'+
  '<div class="sc"><div class="g"></div></div>';

const a=document.createElement('button');
a.id=I.a;
a.type='button';
a.dataset.o='0';
a.textContent='＋';

const x=document.createElement('div');
x.id=I.x;
x.dataset.o='0';
x.innerHTML=`
<div class="c">

<div class="t">
<span>사용자 도구</span>
<button class="cl" type="button">×</button>
</div>

<div class="row">
<div>
<label>아이콘</label>
<input class="ci" maxlength="12" placeholder="🧩">
</div>

<div>
<label>이름</label>
<input class="cn" maxlength="40" placeholder="내 도구">
</div>
</div>

<label>JavaScript / 북마클릿</label>
<textarea class="cc" spellcheck="false"></textarea>

<div class="act">
<button class="btn reset" type="button">초기화</button>
<button class="btn save" type="button">추가</button>
</div>

<div class="list"></div>

</div>
`;

(document.body||document.documentElement).append(b,m,a,x);

const g=m.querySelector('.g');
const rs=m.querySelector('.r');
const ci=x.querySelector('.ci');
const cn=x.querySelector('.cn');
const cc=x.querySelector('.cc');
const save=x.querySelector('.save');
const list=x.querySelector('.list');

let edit=null;

const built=[
  ['kit','⚙️','키트'],
  ['feed','💬','피드'],
  ['theme','✦','테마'],
  ['phone','☎️','폰'],
  ['narrator','N×','나레삭제']
];

function tile(act,icon,name,id){
  return `<button class="it" type="button" ${
    id
      ?`data-c="${esc(id)}"`
      :`data-a="${esc(act)}"`
  }>
  <span class="ic">${esc(icon)}</span>
  <span class="lb">${esc(name)}</span>
  </button>`;
}

function render(){
  g.innerHTML=
    built.map(v=>tile(...v)).join('')+
    rc().map(t=>
      tile(
        '',
        t.icon||'🧩',
        t.name||'도구',
        t.id
      )
    ).join('');
}

function reset(){
  edit=null;
  ci.value='';
  cn.value='';
  cc.value='';
  save.textContent='추가';
}

function renderList(){
  const v=rc();

  list.innerHTML=v.length
    ?v.map(t=>`
<div class="e">
<div>${esc(t.icon||'🧩')}</div>
<div class="en">${esc(t.name||'도구')}</div>
<button class="mini" data-e="${esc(t.id)}">수정</button>
<button class="mini del" data-d="${esc(t.id)}">삭제</button>
</div>
`).join('')
    :'<div style="text-align:center;color:#ffffff66;font-size:11px">추가한 도구 없음</div>';
}

function openCustom(){
  reset();
  renderList();
  x.dataset.o='1';
}

function closeCustom(){
  x.dataset.o='0';
}

save.onclick=()=>{
  const icon=ci.value.trim()||'🧩';
  const name=cn.value.trim();
  const code=norm(cc.value);

  if(!name)return alert('도구 이름을 입력해주세요.');
  if(!code)return alert('JavaScript 코드를 입력해주세요.');

  const v=rc();

  if(edit){
    const i=v.findIndex(t=>t.id===edit);

    if(i>=0){
      v[i]={
        ...v[i],
        icon,
        name,
        code
      };
    }

  }else{
    v.unshift({
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

  wc(v);
  render();
  renderList();
  reset();
};

x.querySelector('.reset').onclick=reset;
x.querySelector('.cl').onclick=closeCustom;

x.onpointerdown=e=>{
  if(e.target===x)closeCustom();
};

list.onclick=e=>{
  const eb=e.target.closest('[data-e]');
  const db=e.target.closest('[data-d]');

  if(eb){
    const t=rc().find(v=>v.id===eb.dataset.e);
    if(!t)return;

    edit=t.id;
    ci.value=t.icon||'';
    cn.value=t.name||'';
    cc.value=t.code||'';
    save.textContent='저장';
  }

  else if(db){
    const v=rc();
    const t=v.find(v=>v.id===db.dataset.d);

    if(
      !t||
      !confirm(`“${t.name}” 도구를 삭제할까요?`)
    )return;

    wc(
      v.filter(v=>v.id!==t.id)
    );

    if(edit===t.id)reset();

    render();
    renderList();
  }
};

a.onclick=()=>{
  closeMenu();
  openCustom();
};

function routerState(){
  const on=!!window[RK];

  b.dataset.r=on?'1':'0';
  rs.dataset.on=on?'1':'0';
  rs.textContent=on?'ROUTER ON':'ROUTER …';
}

function posMenu(){
  const r=b.getBoundingClientRect();

  const w=m.offsetWidth||286;
  const h=m.offsetHeight||390;

  const as=46;
  const gap=10;
  const p=8;

  const l=Math.max(
    p,
    Math.min(
      innerWidth-w-p,
      r.left+r.width/2-w/2
    )
  );

  const total=h+gap+as;

  const t=
    r.top-total-10>=p
      ?r.top-total-10
      :Math.max(
          p,
          Math.min(
            innerHeight-total-p,
            r.top-total/2
          )
        );

  m.style.left=l+'px';
  m.style.top=t+'px';

  a.style.left=
    (
      l+
      w/2-
      as/2
    )+
    'px';

  a.style.top=
    (
      t+
      h+
      gap
    )+
    'px';
}

function openMenu(){
  render();

  m.dataset.o='1';
  a.dataset.o='1';

  requestAnimationFrame(
    posMenu
  );

  routerState();
}

function closeMenu(){
  m.dataset.o='0';
  a.dataset.o='0';
}

function show(){
  b.style.display='flex';
  openMenu();
}

m.onclick=e=>{
  const c=e.target.closest('[data-c]');

  if(c){
    const t=rc().find(v=>v.id===c.dataset.c);

    closeMenu();

    if(t)runCustom(t);

    return;
  }

  const it=e.target.closest('[data-a]');
  if(!it)return;

  closeMenu();

  ({
    kit,
    feed,
    theme,
    phone,
    narrator
  })[it.dataset.a]?.();
};


/* Z 버튼 드래그 */

let pid=null;
let moved=false;
let sx=0;
let sy=0;
let sl=0;
let stp=0;

b.onpointerdown=e=>{
  pid=e.pointerId;
  moved=false;

  const r=b.getBoundingClientRect();

  sx=e.clientX;
  sy=e.clientY;
  sl=r.left;
  stp=r.top;

  try{
    b.setPointerCapture(pid);
  }catch{}

  e.preventDefault();
};

b.onpointermove=e=>{
  if(
    pid===null||
    e.pointerId!==pid
  )return;

  const dx=e.clientX-sx;
  const dy=e.clientY-sy;

  if(
    !moved&&
    Math.hypot(dx,dy)>5
  ){
    moved=true;
    closeMenu();
  }

  if(!moved)return;

  const xx=Math.max(
    5,
    Math.min(
      innerWidth-
      b.offsetWidth-
      5,
      sl+dx
    )
  );

  const yy=Math.max(
    5,
    Math.min(
      innerHeight-
      b.offsetHeight-
      5,
      stp+dy
    )
  );

  Object.assign(
    b.style,
    {
      left:xx+'px',
      top:yy+'px',
      right:'auto',
      bottom:'auto'
    }
  );

  e.preventDefault();
};

function end(e){
  if(
    pid===null||
    (
      e&&
      e.pointerId!==pid
    )
  )return;

  try{
    b.releasePointerCapture(pid);
  }catch{}

  if(moved){
    const r=b.getBoundingClientRect();

    localStorage.setItem(
      PK,
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

b.onpointerup=end;
b.onpointercancel=end;

try{
  const p=JSON.parse(
    localStorage.getItem(PK)||'null'
  );

  if(
    p&&
    Number.isFinite(p.x)&&
    Number.isFinite(p.y)
  ){
    Object.assign(
      b.style,
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

}catch{}

function outside(e){
  if(
    m.dataset.o!=='1'||
    m.contains(e.target)||
    b.contains(e.target)||
    a.contains(e.target)
  )return;

  closeMenu();
}

document.addEventListener(
  'pointerdown',
  outside,
  true
);

const resize=()=>{
  if(m.dataset.o==='1'){
    requestAnimationFrame(
      posMenu
    );
  }
};

window.addEventListener(
  'resize',
  resize
);

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

  Object.values(I).forEach(
    id=>
      document
        .getElementById(id)
        ?.remove()
  );

  try{
    delete window[K];
  }catch{
    window[K]=null;
  }
}

window[K]={
  show,
  open:openMenu,
  close:closeMenu,
  destroy,
  ensureRouter,

  actions:{
    kit,
    feed,
    theme,
    phone,
    narrator
  },

  custom:{
    open:openCustom,
    read:rc
  }
};

render();
routerState();
ensureRouter();

console.log(
  '[ZETA Toolbox] READY compact'
);

})();
