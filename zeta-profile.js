(()=>{'use strict';

const K='__ZETA_PROFILE__';
const CACHE='__ZETA_PROFILE_CACHE_V1__';
const BRIDGE='__zeta_profile_context_bridge__';
const READ='https://zreading.pages.dev/run.js';

try{window[K]?.destroy?.()}catch{}
document.getElementById(BRIDGE)?.remove();

let running=null;

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const clean=s=>String(s||'')
  .replace(/\u00a0/g,' ')
  .replace(/[ \t]+\n/g,'\n')
  .replace(/\n{3,}/g,'\n\n')
  .trim();

function roomId(){
  return location.pathname
    .match(/\/rooms\/([^/?#]+)/)?.[1]||'';
}

function plotId(rid=roomId()){
  try{
    const m=JSON.parse(
      localStorage.getItem(
        'ZETAKIT_READING_ROOM_CONTEXT_V1'
      )||'{}'
    );

    return m?.[rid]?.plotId||'';

  }catch{
    return'';
  }
}

function cacheAll(){
  try{
    const v=JSON.parse(
      localStorage.getItem(CACHE)||'{}'
    );

    return v&&typeof v==='object'?v:{};

  }catch{
    return{};
  }
}

function putCache(data){
  if(!data?.roomId)return;

  const a=cacheAll();

  a[data.roomId]=data;

  localStorage.setItem(
    CACHE,
    JSON.stringify(a)
  );
}

function peek(rid=roomId()){
  return cacheAll()?.[rid]||null;
}

function visible(e){
  if(!e||!e.isConnected)return false;

  const r=e.getBoundingClientRect();
  const s=getComputedStyle(e);

  return(
    r.width>0&&
    r.height>0&&
    s.display!=='none'&&
    s.visibility!=='hidden'
  );
}

function parseCharacter(text){
  let t=clean(text);

  t=t
    .replace(/\n*더보기\s*$/,'')
    .trim();

  const lines=t
    .split('\n')
    .map(x=>x.trim())
    .filter(Boolean);

  if(lines.length<2)return null;

  return{
    name:lines[0],
    description:clean(
      t.slice(
        t.indexOf(lines[0])+
        lines[0].length
      )
    )
  };
}

function scanCharacter(){
  const portal=
    document.getElementById(
      'portal-container'
    );

  if(!portal)return null;

  let best=null;

  const nodes=[
    ...portal.children,
    ...portal.querySelectorAll(
      '[role="dialog"]'
    )
  ];

  for(const el of nodes){

    if(!visible(el))continue;

    const text=clean(
      el.innerText||
      el.textContent
    );

    if(text.length<80)continue;

    /*
     * 이건 user profile 목록 모달이므로 제외
     */
    if(
      /추천 대화 프로필|내 대화 프로필|대화 프로필 추가/
        .test(text)
    ){
      continue;
    }

    const p=parseCharacter(text);

    if(
      p?.description&&
      (
        !best||
        p.description.length>
        best.description.length
      )
    ){
      best=p;
    }
  }

  return best;
}

function scanUser(){
  if(
    !/\/my-plot-chat-profile\/[^/]+\/[^/]+\/edit/
      .test(location.pathname)
  ){
    return null;
  }

  const n=
    document.querySelector(
      'input[name="name"]'
    );

  const d=
    document.querySelector(
      'textarea[name="description"]'
    );

  const name=clean(n?.value);
  const description=clean(d?.value);

  if(!name&&!description)return null;

  return{
    name,
    description
  };
}

function loadReading(){
  return new Promise((ok,no)=>{

    document
      .querySelectorAll(
        'script[data-zeta-profile-reader]'
      )
      .forEach(s=>s.remove());

    const s=
      document.createElement('script');

    s.dataset.zetaProfileReader='1';
    s.src=
      READ+
      '?t='+
      Date.now();

    s.onload=()=>ok(s);

    s.onerror=()=>{
      s.remove();
      no(Error('Reading 로드 실패'));
    };

    (
      document.head||
      document.documentElement
    ).appendChild(s);
  });
}

async function collect(){

  const rid=roomId();

  if(!rid)
    throw Error(
      'Zeta 대화방에서 실행해주세요.'
    );

  const originalPath=
    location.pathname;

  let character=null;
  let user=null;

  /*
   * Reading 기존 실행본 정리 후
   * 새로 순회시킨다.
   */
  try{
    window.__ZETAKIT_READING_STOP__?.();
  }catch{}

  await loadReading();

  const started=Date.now();
  const timeout=25000;

  while(
    Date.now()-started<
    timeout
  ){

    /*
     * char modal은 여러 번 렌더링될 수 있어서
     * 더 긴 버전을 계속 채택
     */
    const c=scanCharacter();

    if(
      c&&
      (
        !character||
        c.description.length>
        character.description.length
      )
    ){
      character=c;
    }


    /*
     * user edit page
     */
    const u=scanUser();

    if(
      u?.name||
      u?.description
    ){
      user=u;
    }


    /*
     * 둘 다 확보했고
     * Reading이 원래 방까지 돌아왔으면 완료
     */
    if(
      character?.description&&
      user?.description&&
      location.pathname===originalPath
    ){
      break;
    }

    await sleep(80);
  }


  /*
   * 데이터는 잡혔는데 Reading이 아직
   * 방으로 복귀 중인 경우 잠깐 더 기다림
   */
  if(
    character?.description&&
    user?.description&&
    location.pathname!==originalPath
  ){

    const end=
      Date.now()+5000;

    while(
      Date.now()<end&&
      location.pathname!==originalPath
    ){
      await sleep(100);
    }
  }


  try{
    window.__ZETAKIT_READING_STOP__?.();
  }catch{}


  if(
    !character?.description||
    !user?.description
  ){
    throw Error(
      `프로필 추출 실패 · char ${
        character?'OK':'X'
      } / user ${
        user?'OK':'X'
      }`
    );
  }


  const data={
    roomId:rid,
    plotId:plotId(rid),

    character:{
      name:character.name||'',
      description:
        character.description||''
    },

    user:{
      name:user.name||'',
      description:
        user.description||''
    },

    updatedAt:Date.now()
  };


  putCache(data);

  return data;
}

async function get(options={}){
  const rid=roomId();

  if(!rid)
    throw Error(
      '대화방을 찾지 못했습니다.'
    );

  /*
   * 동시에 phone/feed가 불러도
   * Reading을 두 번 실행하지 않음
   */
  if(running)
    return running;

  if(
    !options.force
  ){
    const cached=peek(rid);

    if(cached)
      return cached;
  }

  running=
    collect()
      .catch(e=>{

        /*
         * 새 추출 실패 시 이전 캐시가 있다면
         * 분석 자체가 죽지 않도록 fallback
         */
        const cached=peek(rid);

        if(cached){
          console.warn(
            '[ZETA Profile] refresh failed, using cache',
            e
          );

          return{
            ...cached,
            stale:true
          };
        }

        throw e;
      })
      .finally(()=>{
        running=null;
      });

  return running;
}

function format(data=peek()){

  if(!data)return'';

  return[
    '[PROFILE CONTEXT - NOT DIALOGUE]',
    '',
    '[CHARACTER PROFILE]',
    data.character?.name||'',
    data.character?.description||'',
    '',
    '[USER PROFILE]',
    data.user?.name||'',
    data.user?.description||'',
    '',
    'Use these profiles only as background context.',
    'Do not treat this block as dialogue.',
    '[/PROFILE CONTEXT]'
  ]
  .join('\n')
  .trim();
}


/*
 * 기존 phone/feed가 대화 DOM을 읽는 방식이어도
 * 같이 잡히도록 화면 밖에 context를 하나 둔다.
 */
function mount(data=peek()){

  document
    .getElementById(BRIDGE)
    ?.remove();

  if(!data)return null;

  const host=
    document.createElement('div');

  host.id=BRIDGE;
  host.dataset.zetaProfileContext='1';

  /*
   * display:none / visibility:hidden을 쓰면
   * 일부 대화 추출기가 제외하므로
   * 화면 밖으로만 보낸다.
   */
  Object.assign(
    host.style,
    {
      position:'absolute',
      left:'-100000px',
      top:'0',
      width:'480px',
      minHeight:'1px',
      pointerEvents:'none',
      zIndex:'-1'
    }
  );

  /*
   * Zeta와 기존 분석도구 양쪽에서
   * 일반 chat 텍스트처럼 발견될 가능성을 높임.
   */
  host.className=
    'self-start bg-gray-sub1';

  const chat=
    document.createElement('div');

  chat.className='chat';
  chat.textContent=format(data);

  host.appendChild(chat);

  (
    document.getElementById('contents')||
    document.body
  ).appendChild(host);

  return host;
}

function unmount(){
  document
    .getElementById(BRIDGE)
    ?.remove();
}


/*
 * launcher에서 이 함수 하나만 호출하면 됨.
 *
 * 최신 profile 읽기
 * → shared global 저장
 * → 분석도구용 context mount
 */
async function prepare(options={}){

  const data=
    await get({
      force:
        options.force!==false
    });

  window.__ZETA_PROFILE_CONTEXT__=
    data;

  mount(data);

  return data;
}


/*
 * 확인용
 */
async function test(){

  const p=
    await prepare({
      force:true
    });

  console.log(
    '[ZETA PROFILE]',
    p
  );

  alert(
    '프로필 읽기 완료\n\n'+
    `CHAR: ${
      p.character?.name||'-'
    }\n`+
    `USER: ${
      p.user?.name||'-'
    }`
  );

  return p;
}


function destroy(){

  unmount();

  document
    .querySelectorAll(
      'script[data-zeta-profile-reader]'
    )
    .forEach(s=>s.remove());

  try{
    delete window.__ZETA_PROFILE_CONTEXT__;
  }catch{}

  try{
    delete window[K];
  }catch{
    window[K]=null;
  }
}


window[K]={
  get,
  peek,
  prepare,
  mount,
  unmount,
  format,
  test,
  destroy,
  version:'1.0'
};

console.log(
  '[ZETA Profile] v1.0 ready'
);

})();
