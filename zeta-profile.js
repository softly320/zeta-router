(()=>{'use strict';

const W=window,D=document,K='__ZETA_PROFILE__';

const ROOM='ZETAKIT_READING_ROOM_CONTEXT_V1';
const PLOT='ZETAKIT_READING_PLOT_CACHE_V1';
const USER_FALLBACK='__ZETA_PROFILE_USER_PAGE_CACHE_V1__';

const MARK='[ZETA_SHARED_PROFILE_CONTEXT]';
const IFRAME_ID='__zeta_profile_user_iframe__';

try{W[K]?.destroy?.()}catch(_){}
D.getElementById(IFRAME_ID)?.remove();

const X=XMLHttpRequest.prototype;
const OF=W.fetch;
const OO=X.open;
const OS=X.send;

let current=null;
let running=null;
let armedUntil=0;

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function clean(v){
  return String(v??'')
    .replace(/[\u200b\u2060\ufeff]/g,'')
    .replace(/\r/g,'')
    .replace(/[ \t]+\n/g,'\n')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
}

function jget(key,fallback={}){
  try{
    const raw=localStorage.getItem(key);
    if(raw==null)return fallback;
    const v=JSON.parse(raw);
    return v&&typeof v==='object'?v:fallback;
  }catch(_){
    return fallback;
  }
}

function jset(key,value){
  try{
    localStorage.setItem(key,JSON.stringify(value));
    return true;
  }catch(_){
    return false;
  }
}

function roomId(){
  const m=String(location.pathname||'')
    .match(/\/rooms\/([^/?#]+)/i);

  if(!m)return'';

  try{return decodeURIComponent(m[1])}
  catch(_){return m[1]}
}

function plotId(rid=roomId()){
  return String(
    jget(ROOM)?.[rid]?.plotId||''
  );
}

function first(obj,keys,fallback=''){
  if(!obj||typeof obj!=='object')return fallback;

  for(const key of keys){
    const v=obj[key];
    if(v!==undefined&&v!==null&&v!=='')
      return v;
  }

  return fallback;
}

function plotRoot(payload){
  if(!payload||typeof payload!=='object')
    return {};

  if(payload.plot&&typeof payload.plot==='object')
    return payload.plot;

  if(payload.data?.plot&&typeof payload.data.plot==='object')
    return payload.data.plot;

  if(payload.data&&typeof payload.data==='object')
    return payload.data;

  return payload;
}


/* =========================================
   현재 대화 캐릭터 이름
========================================= */

function currentCharacterName(){
  try{
    const shared=W.ZetaChatDOM;

    if(!shared?.extractRecords)
      return '';

    const records=shared.extractRecords({
      root:D,
      includeStatus:false
    })||[];

    for(let i=records.length-1;i>=0;i--){
      const r=records[i];

      if(
        r?.role==='character'&&
        clean(r.name)
      ){
        return clean(r.name);
      }
    }
  }catch(_){}

  return '';
}


/* =========================================
   CHAR
========================================= */

function characterFromPlot(payload){
  const root=plotRoot(payload);

  let chars=
    Array.isArray(root.characters)
      ?root.characters
      :Array.isArray(root.characterList)
        ?root.characterList
        :[];

  if(
    !chars.length&&
    root.character&&
    typeof root.character==='object'
  ){
    chars=[root.character];
  }

  const wanted=currentCharacterName();

  let ch=null;

  if(wanted){
    ch=chars.find(x=>
      clean(first(
        x,
        ['name','displayName','characterName'],
        ''
      ))===wanted
    )||null;
  }

  if(!ch)
    ch=chars[0]||root;

  const name=clean(first(
    ch,
    [
      'name',
      'displayName',
      'characterName',
      'title'
    ],
    first(
      root,
      ['name','displayName','title'],
      ''
    )
  ));

  const description=clean(first(
    ch,
    [
      'description',
      'longDescription',
      'summary',
      'prompt'
    ],
    first(
      root,
      [
        'longDescription',
        'description',
        'summary',
        'prompt'
      ],
      ''
    )
  ));

  return{
    name,
    description,
    text:description
  };
}

function readCharacter(){
  const rid=roomId();
  const pid=plotId(rid);

  if(!rid)
    throw Error('[PROFILE:room] 현재 Zeta 대화방을 찾지 못했습니다.');

  if(!pid)
    throw Error('[PROFILE:plot] 현재 방의 plotId가 없습니다.');

  const entry=jget(PLOT)?.[pid];

  if(!entry?.payload)
    throw Error('[PROFILE:plot] Reading plot 캐시가 없습니다.');

  const character=characterFromPlot(entry.payload);

  if(!character.description)
    throw Error('[PROFILE:char] 캐릭터 설명을 plot 캐시에서 찾지 못했습니다.');

  return{
    roomId:rid,
    plotId:pid,
    character,
    plotCachedAt:Number(entry.cachedAt||0)
  };
}


/* =========================================
   USER 프로필
   현재 대화 프로필 편집 페이지를
   보이지 않는 iframe에서 직접 읽음
========================================= */

function userCacheKey(rid,pid){
  return rid+'|'+pid;
}

function readUserFallback(rid,pid){
  const x=jget(USER_FALLBACK)?.[
    userCacheKey(rid,pid)
  ];

  if(
    !x||
    !clean(x.description)
  )
    return null;

  return{
    name:clean(x.name),
    description:clean(x.description),
    source:'profile-page-cache',
    cachedAt:Number(x.cachedAt||0)
  };
}

function saveUserFallback(rid,pid,user){
  const map=jget(USER_FALLBACK);

  map[userCacheKey(rid,pid)]={
    name:clean(user.name),
    description:clean(user.description),
    cachedAt:Date.now()
  };

  jset(USER_FALLBACK,map);
}

async function readUserFromPage(rid,pid){
  D.getElementById(IFRAME_ID)?.remove();

  const frame=D.createElement('iframe');

  frame.id=IFRAME_ID;
  frame.setAttribute('aria-hidden','true');

  Object.assign(frame.style,{
    position:'fixed',
    left:'-10000px',
    top:'-10000px',
    width:'2px',
    height:'2px',
    opacity:'0',
    border:'0',
    pointerEvents:'none'
  });

  const url=
    location.origin+
    '/ko/my-plot-chat-profile/'+
    encodeURIComponent(pid)+'/'+
    encodeURIComponent(rid)+
    '/edit?zetaProfileReader='+Date.now();

  frame.src=url;

  (D.body||D.documentElement)
    .appendChild(frame);

  const started=Date.now();
  let lastPath='';

  try{
    while(Date.now()-started<12000){
      await sleep(120);

      let doc;

      try{
        doc=frame.contentDocument;
        lastPath=
          frame.contentWindow?.location?.pathname||
          '';
      }catch(_){
        continue;
      }

      if(!doc)
        continue;

      const nameInput=
        doc.querySelector(
          'input[name="name"]'
        );

      const descriptionInput=
        doc.querySelector(
          'textarea[name="description"]'
        );

      const name=
        clean(nameInput?.value);

      const description=
        clean(descriptionInput?.value);

      if(description){
        const user={
          name,
          description,
          source:'profile-page'
        };

        saveUserFallback(
          rid,
          pid,
          user
        );

        return user;
      }
    }

    throw Error(
      '[PROFILE:user] 대화 프로필 편집 페이지에서 name/description을 읽지 못했습니다.'+
      (lastPath
        ?'\n현재 iframe 경로: '+lastPath
        :'')
    );

  }finally{
    try{frame.remove()}catch(_){}
  }
}


/* =========================================
   공용 프로필
========================================= */

async function collect(options={}){
  const base=readCharacter();

  let user=null;

  if(!options.force){
    user=readUserFallback(
      base.roomId,
      base.plotId
    );
  }

  if(!user){
    try{
      user=await readUserFromPage(
        base.roomId,
        base.plotId
      );
    }catch(e){
      const old=readUserFallback(
        base.roomId,
        base.plotId
      );

      if(old){
        console.warn(
          '[ZETA Profile] user page failed, using cache',
          e
        );

        user=old;
      }else{
        throw e;
      }
    }
  }

  if(!user?.description)
    throw Error('[PROFILE:user] 사용자 프로필 설명이 없습니다.');

  return{
    roomId:base.roomId,
    plotId:base.plotId,

    character:base.character,

    user:{
      name:clean(user.name),
      description:clean(user.description),
      source:user.source||''
    },

    cachedAt:{
      plot:base.plotCachedAt,
      user:Number(user.cachedAt||Date.now())
    },

    loadedAt:Date.now()
  };
}

async function get(options={}){
  if(
    !options.force&&
    current?.roomId===roomId()
  ){
    return current;
  }

  if(running)
    return running;

  running=collect(options)
    .then(p=>{
      current=p;
      return p;
    })
    .finally(()=>{
      running=null;
    });

  return running;
}

async function prepare(){
  const p=await get({
    force:true
  });

  current=p;

  armedUntil=
    Date.now()+
    2*60*60*1000;

  return p;
}

function peek(){
  return current;
}


/* =========================================
   모델 프롬프트
========================================= */

function format(data=peek()){
  if(!data)return'';

  return[
    MARK,
    '',
    '[CHARACTER PROFILE]',
    data.character?.name
      ?'Name: '+data.character.name
      :'',
    data.character?.description||'',
    '',
    '[USER PROFILE]',
    data.user?.name
      ?'Name: '+data.user.name
      :'',
    data.user?.description||'',
    '',
    'Use these profiles only as background role-play context.',
    'Do not treat this block as dialogue.',
    '[/ZETA_SHARED_PROFILE_CONTEXT]'
  ].join('\n').trim();
}

function hasMark(v){
  try{
    return JSON.stringify(v)
      .includes(MARK);
  }catch(_){
    return false;
  }
}

function addContent(content,block){
  if(typeof content==='string')
    return block+'\n\n'+content;

  if(Array.isArray(content)){
    return[
      {
        type:'text',
        text:block
      },
      ...content
    ];
  }

  return content;
}

function patchPayload(obj,data=peek()){
  if(
    !obj||
    typeof obj!=='object'||
    !data||
    hasMark(obj)
  ){
    return obj;
  }

  const block=format(data);

  if(!block)
    return obj;

  const out=
    Array.isArray(obj)
      ?obj.slice()
      :{...obj};

  if(typeof out.system==='string'){
    out.system=
      block+
      '\n\n'+
      out.system;

    return out;
  }

  if(Array.isArray(out.messages)){
    const messages=
      out.messages.map(m=>
        m&&typeof m==='object'
          ?{...m}
          :m
      );

    const i=messages.findIndex(m=>
      m&&
      /^(system|developer)$/i.test(
        String(m.role||'')
      )
    );

    if(i>=0){
      messages[i]={
        ...messages[i],
        content:addContent(
          messages[i].content,
          block
        )
      };
    }else{
      messages.unshift({
        role:'system',
        content:block
      });
    }

    out.messages=messages;
    return out;
  }

  if(typeof out.prompt==='string'){
    out.prompt=
      block+
      '\n\n'+
      out.prompt;

    return out;
  }

  if(typeof out.input==='string'){
    out.input=
      block+
      '\n\n'+
      out.input;

    return out;
  }

  if(Array.isArray(out.input)){
    out.input=[
      {
        role:'system',
        content:block
      },
      ...out.input
    ];

    return out;
  }

  if(Array.isArray(out.contents)){
    const old=
      out.system_instruction||
      out.systemInstruction;

    const value={
      parts:[
        {text:block},
        ...(Array.isArray(old?.parts)
          ?old.parts
          :[])
      ]
    };

    if(out.system_instruction!==undefined)
      out.system_instruction=value;
    else
      out.systemInstruction=value;

    return out;
  }

  return out;
}

function shouldPatch(url,obj,stack=''){
  if(Date.now()>armedUntil)
    return false;

  if(
    !obj||
    typeof obj!=='object'
  )
    return false;

  const u=String(url||'');

  if(
    /api\.zeta-ai\.io/i.test(u)||
    /^\/v1\//i.test(u)
  )
    return false;

  if(
    /zreading\.pages\.dev|reading\.js/i.test(
      String(stack||'')
    )
  )
    return false;

  return !!(
    obj.model||
    Array.isArray(obj.messages)||
    typeof obj.prompt==='string'||
    typeof obj.input==='string'||
    Array.isArray(obj.input)||
    Array.isArray(obj.contents)
  );
}


/* =========================================
   fetch
========================================= */

async function fetchHook(input,init){
  const stack=
    String(new Error().stack||'');

  const url=
    typeof input==='string'
      ?input
      :input?.url||'';

  try{
    if(
      init&&
      typeof init.body==='string'
    ){
      let obj=null;

      try{
        obj=JSON.parse(init.body);
      }catch(_){}

      if(
        shouldPatch(
          url,
          obj,
          stack
        )
      ){
        init={
          ...init,
          body:JSON.stringify(
            patchPayload(obj)
          )
        };
      }

    }else if(input instanceof Request){
      const method=
        String(
          init?.method||
          input.method||
          'GET'
        ).toUpperCase();

      if(
        method!=='GET'&&
        method!=='HEAD'&&
        !(init&&init.body)
      ){
        const text=
          await input.clone().text();

        let obj=null;

        try{
          obj=JSON.parse(text);
        }catch(_){}

        if(
          shouldPatch(
            url,
            obj,
            stack
          )
        ){
          input=new Request(
            input,
            {
              ...(init||{}),
              body:JSON.stringify(
                patchPayload(obj)
              )
            }
          );
        }
      }
    }

  }catch(e){
    console.warn(
      '[ZETA Profile fetch]',
      e
    );
  }

  return OF.call(
    this,
    input,
    init
  );
}


/* =========================================
   XHR
========================================= */

function xhrOpen(method,url){
  this.__zetaProfileUrl=
    String(url||'');

  return OO.apply(
    this,
    arguments
  );
}

function xhrSend(body){
  if(
    typeof body==='string'&&
    Date.now()<armedUntil
  ){
    try{
      const obj=JSON.parse(body);

      if(
        shouldPatch(
          this.__zetaProfileUrl,
          obj,
          'xhr'
        )
      ){
        body=JSON.stringify(
          patchPayload(obj)
        );
      }
    }catch(_){}
  }

  return OS.call(
    this,
    body
  );
}


/* =========================================
   lifecycle
========================================= */

function destroy(){
  D.getElementById(
    IFRAME_ID
  )?.remove();

  if(W.fetch===fetchHook)
    W.fetch=OF;

  if(X.open===xhrOpen)
    X.open=OO;

  if(X.send===xhrSend)
    X.send=OS;

  try{
    delete W[K];
  }catch(_){
    W[K]=null;
  }
}

async function test(){
  const p=await prepare();

  console.log(
    '[ZETA PROFILE]',
    p
  );

  alert(
    '프로필 준비 완료\n\n'+
    'CHAR: '+
    (p.character?.name||'-')+
    '\nUSER: '+
    (p.user?.name||'-')+
    '\n\nv2.3'
  );

  return p;
}


W.fetch=fetchHook;
X.open=xhrOpen;
X.send=xhrSend;

W[K]={
  get,
  prepare,
  peek,
  format,
  patchPayload,
  test,
  destroy,
  version:'2.3'
};

console.log(
  '[ZETA Profile] v2.3 ready'
);

})();

/* =========================================
   ZETA PROFILE BRIDGE v1.0
   Feed / inPocket 실제 AI 요청에 직접 주입
========================================= */

(()=>{'use strict';

const W=window;
const P=W.__ZETA_PROFILE__;

if(!P){
  console.warn('[ZETA Profile Bridge] profile module 없음');
  return;
}

if(W.__ZETA_PROFILE_BRIDGE__?.destroy){
  try{
    W.__ZETA_PROFILE_BRIDGE__.destroy();
  }catch(_){}
}

const X=XMLHttpRequest.prototype;

const PREV_FETCH=W.fetch;
const PREV_SEND=X.send;

const MARK='[ZETA_SHARED_PROFILE_CONTEXT]';

let lastInjection=null;
let lastToastAt=0;


/* 현재 방 */
function roomId(){
  const m=String(location.pathname||'')
    .match(/\/rooms\/([^/?#]+)/i);

  if(!m)return'';

  try{
    return decodeURIComponent(m[1]);
  }catch(_){
    return m[1];
  }
}


/* 현재 프로필 */
function profile(){
  try{
    const p=P.peek?.();

    if(!p)return null;

    const rid=roomId();

    if(
      rid&&
      p.roomId&&
      String(p.roomId)!==String(rid)
    ){
      return null;
    }

    if(
      !p.character?.description||
      !p.user?.description
    ){
      return null;
    }

    return p;

  }catch(_){
    return null;
  }
}


/* Feed / Phone 판별 */
function detectKind(obj){
  let text='';

  try{
    text=JSON.stringify(obj);
  }catch(_){
    return '';
  }

  if(
    /도구 이름:\s*제타피드/.test(text)||
    /역할극 세계관 속 여론과 소식 매체/.test(text)
  ){
    return 'feed';
  }

  if(
    /롤플레잉 캐릭터의 스마트폰 속 사적 기록/.test(text)||
    /휴대폰 주인/.test(text)&&
    /생성 대상:/.test(text)
  ){
    return 'phone';
  }

  return '';
}


/* 실제 모델에 넣는 공용 프로필 */
function profileBlock(kind,p){

  const cn=
    String(
      p.character?.name||
      ''
    ).trim();

  const cd=
    String(
      p.character?.description||
      p.character?.text||
      ''
    ).trim();

  const un=
    String(
      p.user?.name||
      ''
    ).trim();

  const ud=
    String(
      p.user?.description||
      ''
    ).trim();


  if(kind==='feed'){

    return `
${MARK}

[캐릭터 고정 프로필]
이름: ${cn||'(이름 없음)'}
${cd}

[현재 사용자 고정 프로필]
이름: ${un||'(이름 없음)'}
${ud}

[프로필 적용 규칙]
- 현재 대화는 지금 벌어지는 사건과 시간 흐름의 최우선 자료다.
- 캐릭터와 사용자의 신분, 직업, 성격, 관계, 생활환경, 세계관은 위 프로필을 적극적으로 사용해 보정한다.
- 대화에 직업이나 관계가 반복 설명되지 않았다는 이유로 임의의 일반인 설정으로 바꾸지 않는다.
- 사용자 프로필은 캐릭터와 사용자의 관계 및 호칭, 사회적 위치, 환경을 이해하는 데 사용한다.
- 단, 프로필의 비공개 정보는 현재 장면에서 외부인이 알 수 있는 근거가 없는 한 뉴스나 게시판에서 공개 사실처럼 폭로하지 않는다.
- 즉 "무슨 일이 지금 벌어졌는가"는 최근 대화에서, "이 사람들이 누구이며 어떤 세계에 사는가"는 프로필에서 판단한다.

[/ZETA_SHARED_PROFILE_CONTEXT]
`.trim();

  }


  return `
${MARK}

[휴대폰 주인 캐릭터 프로필]
이름: ${cn||'(이름 없음)'}
${cd}

[현재 상대 사용자 프로필]
이름: ${un||'(이름 없음)'}
${ud}

[프로필 적용 규칙]
- 최근 대화는 현재 사건과 감정 변화의 최우선 자료다.
- 캐릭터의 직업, 성격, 인간관계, 생활환경, 평소 관심사와 취향은 캐릭터 프로필을 적극적으로 반영한다.
- 사용자와 캐릭터의 관계, 사용자의 신분과 환경은 사용자 프로필을 적극적으로 반영한다.
- 최근 대화에 프로필 내용이 매번 다시 언급되지 않아도 이미 알고 있는 기본 설정으로 취급한다.
- 프로필과 최근 대화가 충돌하면 최근 대화에서 명시적으로 갱신된 사실을 우선한다.
- 휴대폰의 연락처, 단톡방, 검색어, 메모, 일정, 쇼핑, 음악 등이 캐릭터의 실제 생활권과 어울리게 구성되도록 프로필을 사용한다.

[/ZETA_SHARED_PROFILE_CONTEXT]
`.trim();
}


/* 객체 안에서 조건에 맞는 문자열 하나만 변경 */
function mutateFirst(value,predicate,transform){

  if(!value||typeof value!=='object')
    return false;


  if(Array.isArray(value)){

    for(let i=0;i<value.length;i++){

      if(
        typeof value[i]==='string'&&
        predicate(value[i])
      ){
        value[i]=transform(value[i]);
        return true;
      }

      if(
        value[i]&&
        typeof value[i]==='object'&&
        mutateFirst(
          value[i],
          predicate,
          transform
        )
      ){
        return true;
      }
    }

    return false;
  }


  for(const key of Object.keys(value)){

    const child=value[key];

    if(
      typeof child==='string'&&
      predicate(child)
    ){
      value[key]=transform(child);
      return true;
    }

    if(
      child&&
      typeof child==='object'&&
      mutateFirst(
        child,
        predicate,
        transform
      )
    ){
      return true;
    }
  }


  return false;
}


/* Feed 기존 지시문의 "대화만" 제약을 수정 */
function rewriteFeed(text,block){

  let s=String(text||'');


  s=s.replace(
    '이 요청은 버튼을 누른 현재 시점에 다시 수집한 대화만 사용합니다.',
    '이 요청은 버튼을 누른 현재 시점에 다시 수집한 대화를 현재 사건의 주재료로 사용하며, 함께 제공된 캐릭터·사용자 프로필을 고정 배경 설정으로 사용합니다.'
  );


  s=s.replace(
    '우선순위는 가장 최신 대화 구간 > 현재 흐름과 연결되는 선택적 이전 구간 > 연결 로어북입니다.',
    '우선순위는 가장 최신 대화 구간(현재 사건) > 캐릭터·사용자 프로필(신분·관계·직업·성격·생활환경) > 현재 흐름과 연결되는 선택적 이전 구간 > 연결 로어북입니다.'
  );


  return(
    block+
    '\n\n'+
    s
  );
}


/* Phone 기존 지시문 보강 */
function rewritePhone(text,block){

  let s=String(text||'');


  s=s.replace(
    '캐릭터 프로필은 말투·성격·직업·관계·생활환경을 보정하는 데 사용하고',
    '캐릭터·사용자 프로필은 말투·성격·직업·관계·생활환경을 보정하는 데 사용하고'
  );


  s=s.replace(
    '우선순위는 최근 대화 > 캐릭터 프로필 > 연결 로어북입니다.',
    '우선순위는 최근 대화(현재 사건) > 캐릭터·사용자 프로필(고정 배경·관계·직업·생활환경) > 연결 로어북입니다.'
  );


  return(
    block+
    '\n\n'+
    s
  );
}


/* 실제 JSON 수정 */
function patchObject(obj){

  if(
    !obj||
    typeof obj!=='object'
  ){
    return{
      obj,
      kind:''
    };
  }


  try{

    if(
      JSON.stringify(obj)
        .includes(MARK)
    ){
      return{
        obj,
        kind:''
      };
    }

  }catch(_){}


  const kind=
    detectKind(obj);

  if(!kind){

    return{
      obj,
      kind:''
    };
  }


  const p=
    profile();

  if(!p){

    return{
      obj,
      kind:''
    };
  }


  const block=
    profileBlock(
      kind,
      p
    );


  /*
   * 먼저 system 성격의 문장을 찾는다.
   * Gemini처럼 system+user가 합쳐진 문자열도 여기 걸린다.
   */
  let changed=false;


  if(kind==='feed'){

    changed=
      mutateFirst(
        obj,
        text=>
          /역할극 세계관 속 여론과 소식 매체/.test(text),
        text=>
          rewriteFeed(
            text,
            block
          )
      );


    /*
     * 혹시 system 문구가 바뀐 Feed 버전이면
     * user prompt의 "제타피드" 위치에 삽입.
     */
    if(!changed){

      changed=
        mutateFirst(
          obj,
          text=>
            /도구 이름:\s*제타피드/.test(text),
          text=>
            block+
            '\n\n'+
            text
        );
    }

  }else{

    changed=
      mutateFirst(
        obj,
        text=>
          /롤플레잉 캐릭터의 스마트폰 속 사적 기록/.test(text),
        text=>
          rewritePhone(
            text,
            block
          )
      );


    if(!changed){

      changed=
        mutateFirst(
          obj,
          text=>
            /생성 대상:/.test(text)&&
            /최근 대화:/.test(text),
          text=>
            block+
            '\n\n'+
            text
        );
    }
  }


  return{
    obj,
    kind:
      changed
        ?kind
        :''
  };
}


/* 확인 토스트 */
function toast(kind,p){

  const now=Date.now();

  if(
    now-lastToastAt<
    600
  )
    return;

  lastToastAt=now;


  const old=
    D.getElementById(
      '__zeta_profile_bridge_toast__'
    );

  old?.remove();


  const el=
    D.createElement(
      'div'
    );

  el.id=
    '__zeta_profile_bridge_toast__';


  const label=
    kind==='feed'
      ?'피드'
      :'폰';


  el.textContent=
    `${label} AI 요청에 프로필 주입됨 · ${
      p.character?.name||
      'CHAR'
    } / ${
      p.user?.name||
      'USER'
    }`;


  Object.assign(
    el.style,
    {
      position:'fixed',
      left:'50%',
      bottom:'82px',
      transform:'translateX(-50%)',
      zIndex:'2147483647',
      padding:'8px 11px',
      borderRadius:'10px',
      background:'#17191ff2',
      color:'#fff',
      border:'1px solid #ffffff22',
      boxShadow:'0 6px 24px #0007',
      font:'11px/1.35 system-ui',
      maxWidth:'calc(100vw - 24px)',
      whiteSpace:'nowrap',
      overflow:'hidden',
      textOverflow:'ellipsis',
      pointerEvents:'none'
    }
  );


  D.body.appendChild(el);


  setTimeout(
    ()=>el.remove(),
    2200
  );
}


/* 기록 */
function record(kind){

  const p=
    profile();

  if(!p)
    return;


  lastInjection={
    kind,
    at:Date.now(),
    roomId:p.roomId,
    character:
      p.character?.name||
      '',
    user:
      p.user?.name||
      ''
  };


  toast(
    kind,
    p
  );


  console.log(
    '[ZETA Profile Bridge]',
    kind,
    '프로필 주입 완료',
    {
      character:
        p.character?.name||
        '',
      user:
        p.user?.name||
        ''
    }
  );
}


/* JSON body */
function patchBody(body){

  if(
    typeof body!=='string'
  ){
    return{
      body,
      kind:''
    };
  }


  let obj;

  try{
    obj=JSON.parse(body);
  }catch(_){

    return{
      body,
      kind:''
    };
  }


  const result=
    patchObject(obj);


  if(!result.kind){

    return{
      body,
      kind:''
    };
  }


  try{

    return{
      body:
        JSON.stringify(
          result.obj
        ),
      kind:
        result.kind
    };

  }catch(_){

    return{
      body,
      kind:''
    };
  }
}


/* =========================================
   fetch
========================================= */

async function bridgeFetch(
  input,
  init
){

  try{

    if(
      init&&
      typeof init.body===
      'string'
    ){

      const result=
        patchBody(
          init.body
        );


      if(
        result.kind
      ){

        init={
          ...init,
          body:
            result.body
        };


        record(
          result.kind
        );
      }
    }

  }catch(e){

    console.warn(
      '[ZETA Profile Bridge fetch]',
      e
    );
  }


  return PREV_FETCH.call(
    this,
    input,
    init
  );
}


/* =========================================
   XHR
   Feed의 fetch 충돌 fallback도 처리
========================================= */

function bridgeSend(body){

  try{

    if(
      typeof body===
      'string'
    ){

      const result=
        patchBody(body);


      if(
        result.kind
      ){

        body=
          result.body;


        record(
          result.kind
        );
      }
    }

  }catch(e){

    console.warn(
      '[ZETA Profile Bridge XHR]',
      e
    );
  }


  return PREV_SEND.call(
    this,
    body
  );
}


/* 설치 */
W.fetch=
  bridgeFetch;

X.send=
  bridgeSend;


/* 기존 profile destroy도 bridge까지 같이 제거 */
const oldDestroy=
  typeof P.destroy==='function'
    ?P.destroy.bind(P)
    :null;


P.destroy=function(){

  if(
    W.fetch===
    bridgeFetch
  ){
    W.fetch=
      PREV_FETCH;
  }


  if(
    X.send===
    bridgeSend
  ){
    X.send=
      PREV_SEND;
  }


  try{
    delete W.__ZETA_PROFILE_BRIDGE__;
  }catch(_){
    W.__ZETA_PROFILE_BRIDGE__=null;
  }


  return oldDestroy?.();
};


/* 확인 API */
P.lastInjection=
  ()=>lastInjection;


W.__ZETA_PROFILE_BRIDGE__={

  destroy(){

    if(
      W.fetch===
      bridgeFetch
    ){
      W.fetch=
        PREV_FETCH;
    }


    if(
      X.send===
      bridgeSend
    ){
      X.send=
        PREV_SEND;
    }


    D.getElementById(
      '__zeta_profile_bridge_toast__'
    )?.remove();


    try{
      delete W.__ZETA_PROFILE_BRIDGE__;
    }catch(_){
      W.__ZETA_PROFILE_BRIDGE__=null;
    }
  },

  last:
    ()=>lastInjection,

  version:'1.0'
};


console.log(
  '[ZETA Profile Bridge] v1.0 ready'
);

})();

/* =========================================
   ZETA PROFILE UNIVERSAL ROOM v2.5
   새 방에서도 room → plot 자동 해결
   Reading API 인증에 의존하지 않음
========================================= */

(()=>{'use strict';

const W=window;
const D=document;
const P=W.__ZETA_PROFILE__;

if(!P){
  console.warn('[ZETA Profile Universal Room] profile module 없음');
  return;
}

if(P.__universalRoomInstalled){
  return;
}

P.__universalRoomInstalled=true;

const ROOM_KEY=
  'ZETAKIT_READING_ROOM_CONTEXT_V1';

const PLOT_KEY=
  'ZETAKIT_READING_PLOT_CACHE_V1';

const FRAME_ID=
  '__zeta_profile_plot_reader__';

const baseGet=
  typeof P.get==='function'
    ?P.get.bind(P)
    :null;

const basePrepare=
  typeof P.prepare==='function'
    ?P.prepare.bind(P)
    :null;

if(!baseGet||!basePrepare){
  console.warn(
    '[ZETA Profile Universal Room] 기존 get/prepare 없음'
  );
  return;
}

const sleep=ms=>
  new Promise(r=>setTimeout(r,ms));


function clean(v){
  return String(v??'')
    .replace(/[\u200b\u2060\ufeff]/g,'')
    .replace(/\r/g,'')
    .replace(/[ \t]+\n/g,'\n')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
}


function readJson(key,fallback={}){
  try{
    const raw=
      localStorage.getItem(key);

    if(raw==null)
      return fallback;

    const v=JSON.parse(raw);

    return(
      v&&typeof v==='object'
        ?v
        :fallback
    );

  }catch(_){
    return fallback;
  }
}


function writeJson(key,value){
  try{
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return true;

  }catch(_){
    return false;
  }
}


function currentRoomId(){
  const m=
    String(location.pathname||'')
      .match(
        /\/rooms\/([^/?#]+)/i
      );

  if(!m)
    return '';

  try{
    return decodeURIComponent(m[1]);
  }catch(_){
    return m[1];
  }
}


function decodeSafe(v){
  try{
    return decodeURIComponent(
      String(v||'')
    );
  }catch(_){
    return String(v||'');
  }
}


/* =========================================
   기존 room → plot 캐시
========================================= */

function cachedPlotId(rid){

  rid=String(rid||'');

  if(!rid)
    return '';

  const map=
    readJson(ROOM_KEY);

  const direct=
    String(
      map?.[rid]?.plotId||
      ''
    );

  if(direct)
    return direct;

  try{
    return String(
      localStorage.getItem(
        'ZETAKIT_MEMORY_PROFILE_PLOTID_'+rid
      )||
      localStorage.getItem(
        'zeta-persona-editor-plotid-'+rid
      )||
      ''
    );
  }catch(_){
    return '';
  }
}


function rememberPlot(rid,pid){

  rid=String(rid||'');
  pid=String(pid||'');

  if(!rid||!pid)
    return false;

  const map=
    readJson(ROOM_KEY);

  map[rid]={
    ...(
      map[rid]&&
      typeof map[rid]==='object'
        ?map[rid]
        :{}
    ),
    plotId:pid
  };

  writeJson(
    ROOM_KEY,
    map
  );

  try{
    localStorage.setItem(
      'ZETAKIT_MEMORY_PROFILE_PLOTID_'+rid,
      pid
    );
  }catch(_){}

  return true;
}


/* =========================================
   문자열 안에서 room에 해당하는 plotId 탐색
========================================= */

function variants(text){

  const raw=
    String(text||'');

  const list=[raw];

  try{
    list.push(
      raw
        .replace(/\\u002f/gi,'/')
        .replace(/\\\//g,'/')
        .replace(/\\"/g,'"')
    );
  }catch(_){}

  if(/%2f|%22|%3a/i.test(raw)){
    try{
      list.push(
        decodeURIComponent(raw)
      );
    }catch(_){}
  }

  return[
    ...new Set(list)
  ];
}


function extractPlotFromText(text,rid){

  const candidates=[];

  const add=(pid,score)=>{
    pid=decodeSafe(pid).trim();

    if(
      !pid||
      pid===rid||
      pid.length<4
    )
      return;

    candidates.push({
      pid,
      score
    });
  };


  for(const source of variants(text)){

    /*
     * 가장 신뢰도 높음:
     * plot + room이 URL에 같이 있는 경우
     */
    let re=
      /\/plots\/([^/?#"'\\]+)\/rooms\/([^/?#"'\\]+)/gi;

    let m;

    while((m=re.exec(source))){

      if(
        decodeSafe(m[2])===
        rid
      ){
        add(
          m[1],
          100
        );
      }
    }


    /*
     * 사용자 프로필 편집 URL
     * /my-plot-chat-profile/{plot}/{room}/...
     */
    re=
      /\/my-plot-chat-profile\/([^/?#"'\\]+)\/([^/?#"'\\]+)/gi;

    while((m=re.exec(source))){

      if(
        decodeSafe(m[2])===
        rid
      ){
        add(
          m[1],
          100
        );
      }
    }


    /*
     * roomId 주변에 plotId JSON이 있는 경우.
     * Next/RSC 데이터 대응.
     */
    let start=0;

    while(true){

      const pos=
        source.indexOf(
          rid,
          start
        );

      if(pos<0)
        break;

      const from=
        Math.max(
          0,
          pos-5000
        );

      const to=
        Math.min(
          source.length,
          pos+5000
        );

      const nearby=
        source.slice(
          from,
          to
        );


      const patterns=[

        /["']plotId["']\s*:\s*["']([^"'\\]+)["']/i,

        /\\"plotId\\"\s*:\s*\\"([^"\\]+)\\"/i,

        /["']plot_id["']\s*:\s*["']([^"'\\]+)["']/i

      ];


      for(const pattern of patterns){

        const hit=
          nearby.match(pattern);

        if(hit?.[1]){
          add(
            hit[1],
            85
          );
        }
      }


      start=
        pos+
        Math.max(
          1,
          rid.length
        );
    }


    /*
     * 현재 캐릭터 profile 링크.
     * room 연결 단서가 없으므로 우선순위는 낮음.
     */
    re=
      /\/plots\/([^/?#"'\\]+)\/profile(?:[/?#"'\\]|$)/gi;

    while((m=re.exec(source))){
      add(
        m[1],
        45
      );
    }


    /*
     * plotId가 문서 전체에서 한 종류만 발견될 경우
     */
    const ids=[];

    re=
      /["']plotId["']\s*:\s*["']([^"'\\]+)["']/gi;

    while((m=re.exec(source))){
      const value=
        decodeSafe(m[1]);

      if(
        value&&
        !ids.includes(value)
      ){
        ids.push(value);
      }
    }

    if(ids.length===1){
      add(
        ids[0],
        60
      );
    }
  }


  candidates.sort(
    (a,b)=>
      b.score-a.score
  );


  return(
    candidates[0]?.pid||
    ''
  );
}


/* =========================================
   Performance API
========================================= */

function plotFromPerformance(rid){

  try{

    const entries=
      performance
        .getEntriesByType(
          'resource'
        )
        .slice(-500);


    for(
      let i=entries.length-1;
      i>=0;
      i--
    ){

      const pid=
        extractPlotFromText(
          entries[i]?.name||'',
          rid
        );

      if(pid)
        return pid;
    }

  }catch(_){}

  return '';
}


/* =========================================
   현재 DOM
========================================= */

function plotFromDocument(rid){

  try{

    const links=[
      ...D.querySelectorAll(
        'a[href]'
      )
    ];


    for(const a of links){

      const href=
        String(
          a.getAttribute('href')||
          a.href||
          ''
        );

      const pid=
        extractPlotFromText(
          href,
          rid
        );

      if(pid)
        return pid;
    }

  }catch(_){}


  /*
   * Next/RSC inline data 포함
   */
  try{

    const scripts=[
      ...D.querySelectorAll(
        'script'
      )
    ];


    for(const script of scripts){

      const text=
        String(
          script.textContent||
          ''
        );


      if(
        !text||
        text.length>
          5000000
      )
        continue;


      if(
        !text.includes(rid)&&
        !/plotId|\/plots\//i
          .test(text)
      )
        continue;


      const pid=
        extractPlotFromText(
          text,
          rid
        );


      if(pid)
        return pid;
    }

  }catch(_){}


  return '';
}


/* =========================================
   현재 room 페이지 HTML
   Zeta API가 아니라 웹페이지 자체를 GET
   로그인 쿠키 사용
========================================= */

async function plotFromCurrentPageHtml(rid){

  try{

    const response=
      await fetch(
        location.href,
        {
          method:'GET',
          credentials:'include',
          cache:'no-store'
        }
      );


    if(!response.ok)
      return '';


    const html=
      await response.text();


    return extractPlotFromText(
      html,
      rid
    );

  }catch(_){

    return '';
  }
}


/* =========================================
   plotId 최종 해결
========================================= */

async function resolvePlotId(){

  const rid=
    currentRoomId();


  if(!rid){

    throw Error(
      '[PROFILE:room] 현재 Zeta 대화방이 아닙니다.'
    );
  }


  let pid=
    cachedPlotId(
      rid
    );


  if(!pid){

    pid=
      plotFromPerformance(
        rid
      );
  }


  if(!pid){

    pid=
      plotFromDocument(
        rid
      );
  }


  if(!pid){

    pid=
      await plotFromCurrentPageHtml(
        rid
      );
  }


  if(!pid){

    throw Error(
      '[PROFILE:plot] 현재 방의 Plot ID를 페이지에서 찾지 못했습니다.'
    );
  }


  rememberPlot(
    rid,
    pid
  );


  return{
    roomId:rid,
    plotId:pid
  };
}


/* =========================================
   현재 캐릭터 이름
========================================= */

function currentCharacterName(){

  try{

    const shared=
      W.ZetaChatDOM;


    if(
      shared&&
      typeof shared.extractRecords===
        'function'
    ){

      const records=
        shared.extractRecords({
          root:D,
          includeStatus:false
        })||[];


      for(
        let i=records.length-1;
        i>=0;
        i--
      ){

        const r=
          records[i];


        if(
          r?.role==='character'&&
          clean(r.name)
        ){
          return clean(
            r.name
          );
        }
      }
    }

  }catch(_){}


  return '';
}


/* =========================================
   JSON에서 캐릭터 프로필 후보 추출
========================================= */

function pickProfileFromObject(
  value,
  wantedName=''
){

  const found=[];
  const seen=
    new WeakSet();


  const normalize=s=>
    clean(s)
      .toLowerCase()
      .replace(/\s+/g,'');


  const wanted=
    normalize(
      wantedName
    );


  function walk(
    obj,
    depth=0
  ){

    if(
      depth>14||
      !obj||
      typeof obj!=='object'
    )
      return;


    if(seen.has(obj))
      return;

    seen.add(obj);


    if(Array.isArray(obj)){

      obj
        .slice(0,120)
        .forEach(
          x=>walk(
            x,
            depth+1
          )
        );

      return;
    }


    const name=
      clean(
        obj.name||
        obj.displayName||
        obj.characterName||
        ''
      );


    const descriptions=[

      obj.description,

      obj.longDescription,

      obj.summary,

      obj.prompt,

      obj.introduction,

      obj.persona,

      obj.profileDescription

    ]
      .map(clean)
      .filter(
        x=>x.length>=20
      );


    for(const body of descriptions){

      let score=
        Math.min(
          50,
          Math.floor(
            body.length/100
          )
        );


      if(
        wanted&&
        normalize(name)===
          wanted
      ){
        score+=200;
      }


      if(name)
        score+=20;


      found.push({
        name,
        body,
        score
      });
    }


    Object
      .values(obj)
      .slice(0,180)
      .forEach(
        child=>{

          if(
            child&&
            typeof child==='object'
          ){
            walk(
              child,
              depth+1
            );
          }
        }
      );
  }


  walk(value);


  found.sort(
    (a,b)=>
      b.score-a.score||
      b.body.length-a.body.length
  );


  return(
    found[0]||
    null
  );
}


/* =========================================
   Document → char profile
========================================= */

function profileFromDocument(
  doc,
  wantedName=''
){

  if(!doc)
    return null;


  /*
   * JSON 데이터 우선
   */
  try{

    const scripts=[
      ...doc.querySelectorAll(
        'script#__NEXT_DATA__,script[type="application/json"]'
      )
    ]
      .slice(0,30);


    const found=[];


    for(const script of scripts){

      const raw=
        String(
          script.textContent||
          ''
        ).trim();


      if(
        !raw||
        raw.length>
          5000000
      )
        continue;


      try{

        const candidate=
          pickProfileFromObject(
            JSON.parse(raw),
            wantedName
          );


        if(candidate)
          found.push(candidate);

      }catch(_){}
    }


    found.sort(
      (a,b)=>
        b.score-a.score||
        b.body.length-a.body.length
    );


    if(found[0]){
      return{
        name:
          clean(
            found[0].name||
            wantedName
          ),
        description:
          clean(
            found[0].body
          )
      };
    }

  }catch(_){}


  /*
   * 실제 profile UI
   */
  const selectors=[

    '[data-sentry-component*="CharacterProfile" i]',

    '[data-sentry-component*="CharacterInfo" i]',

    '[data-sentry-component*="CharacterDetail" i]',

    '[data-sentry-source-file*="CharacterProfile" i]',

    '[data-sentry-source-file*="CharacterInfo" i]',

    '[class*="character-profile" i]',

    '[class*="profile-description" i]',

    '[class*="character-description" i]',

    '[class*="character-info" i]',

    '[class*="introduction" i]'

  ];


  const pieces=[];


  for(const selector of selectors){

    try{

      doc
        .querySelectorAll(selector)
        .forEach(el=>{

          if(
            el.closest?.(
              '[data-sentry-component*="ChatBubble" i],[data-message-id]'
            )
          )
            return;


          const text=
            clean(
              el.innerText||
              el.textContent||
              ''
            );


          if(
            text.length>=20&&
            text.length<=12000&&
            !pieces.includes(text)
          ){
            pieces.push(text);
          }
        });

    }catch(_){}
  }


  if(pieces.length){

    pieces.sort(
      (a,b)=>
        b.length-a.length
    );


    return{
      name:wantedName,
      description:
        pieces[0]
          .slice(0,8000)
    };
  }


  /*
   * meta description은 최후 fallback
   */
  try{

    const meta=
      clean(
        doc
          .querySelector(
            'meta[property="og:description"],meta[name="description"],meta[name="twitter:description"]'
          )
          ?.getAttribute(
            'content'
          )||
        ''
      );


    if(
      meta.length>=40&&
      !/^(zeta|제타)\b/i
        .test(meta)
    ){
      return{
        name:wantedName,
        description:
          meta.slice(
            0,
            8000
          )
      };
    }

  }catch(_){}


  return null;
}


/* =========================================
   현재 페이지에 char profile이 있나
========================================= */

function currentPageProfile(){

  return profileFromDocument(
    D,
    currentCharacterName()
  );
}


/* =========================================
   plot profile 페이지 후보
========================================= */

function profileUrls(pid){

  const urls=[];


  const add=value=>{

    try{

      const url=
        new URL(
          value,
          location.origin
        );


      if(
        url.origin!==
        location.origin
      )
        return;


      const href=
        url.href;


      if(!urls.includes(href))
        urls.push(href);

    }catch(_){}
  };


  try{

    D
      .querySelectorAll(
        'a[href*="/plots/"]'
      )
      .forEach(a=>{

        const href=
          a.getAttribute('href')||
          '';


        if(
          href.includes(pid)&&
          /profile/i.test(href)
        ){
          add(href);
        }
      });

  }catch(_){}


  add(
    `/ko/plots/${encodeURIComponent(pid)}/profile`
  );

  add(
    `/ko/plots/${encodeURIComponent(pid)}`
  );


  return urls;
}


/* =========================================
   같은 origin profile 페이지 GET
========================================= */

async function fetchProfilePage(
  url,
  wantedName
){

  try{

    const response=
      await fetch(
        url,
        {
          method:'GET',
          credentials:'include',
          cache:'no-store'
        }
      );


    if(!response.ok)
      return null;


    const html=
      await response.text();


    const doc=
      new DOMParser()
        .parseFromString(
          html,
          'text/html'
        );


    const profile=
      profileFromDocument(
        doc,
        wantedName
      );


    if(profile?.description)
      return profile;

  }catch(_){}


  return null;
}


/* =========================================
   hidden iframe fallback
========================================= */

async function iframeProfilePage(
  url,
  wantedName
){

  D
    .getElementById(
      FRAME_ID
    )
    ?.remove();


  const frame=
    D.createElement(
      'iframe'
    );


  frame.id=
    FRAME_ID;


  frame.setAttribute(
    'aria-hidden',
    'true'
  );


  Object.assign(
    frame.style,
    {
      position:'fixed',
      left:'-10000px',
      top:'-10000px',
      width:'2px',
      height:'2px',
      opacity:'0',
      border:'0',
      pointerEvents:'none'
    }
  );


  frame.src=
    url+
    (
      url.includes('?')
        ?'&'
        :'?'
    )+
    'zetaProfileReader='+
    Date.now();


  (
    D.body||
    D.documentElement
  )
    .appendChild(frame);


  const started=
    Date.now();


  try{

    while(
      Date.now()-started<
      7000
    ){

      await sleep(180);


      let doc=null;


      try{
        doc=
          frame.contentDocument;
      }catch(_){}


      if(!doc)
        continue;


      const profile=
        profileFromDocument(
          doc,
          wantedName
        );


      if(
        profile
          ?.description
      ){
        return profile;
      }
    }

  }finally{

    try{
      frame.remove();
    }catch(_){}
  }


  return null;
}


/* =========================================
   CHAR 프로필 확보
========================================= */

async function resolveCharacterProfile(
  pid
){

  const wanted=
    currentCharacterName();


  /*
   * 기존 Reading plot cache가 있으면 제일 정확함.
   */
  const existing=
    readJson(PLOT_KEY)
      ?.[pid]
      ?.payload;


  if(existing){

    const candidate=
      pickProfileFromObject(
        existing,
        wanted
      );


    if(candidate?.body){

      return{
        name:
          candidate.name||
          wanted,
        description:
          candidate.body
      };
    }
  }


  /*
   * 현재 chat page 자체
   */
  let profile=
    currentPageProfile();


  if(
    profile
      ?.description
  ){
    return profile;
  }


  /*
   * plot profile 페이지
   */
  const urls=
    profileUrls(pid);


  for(const url of urls){

    profile=
      await fetchProfilePage(
        url,
        wanted
      );


    if(
      profile
        ?.description
    ){
      return profile;
    }
  }


  /*
   * CSR 때문에 GET HTML에 데이터가 없는 경우 iframe
   */
  for(const url of urls){

    profile=
      await iframeProfilePage(
        url,
        wanted
      );


    if(
      profile
        ?.description
    ){
      return profile;
    }
  }


  throw Error(
    '[PROFILE:char] 이 방의 캐릭터 프로필을 찾지 못했습니다.'
  );
}


/* =========================================
   Reading 형식의 plot cache를 만들어
   기존 zeta-profile.js v2.3이 그대로 사용하게 함
========================================= */

function writeSyntheticPlotCache(
  pid,
  profile
){

  const map=
    readJson(PLOT_KEY);


  if(
    map
      ?.[pid]
      ?.payload
  ){
    return;
  }


  map[pid]={

    payload:{

      name:
        profile.name||
        '현재 Plot',

      characters:[
        {
          name:
            profile.name||
            currentCharacterName()||
            '캐릭터',

          description:
            profile.description
        }
      ],

      __zetaProfileSynthetic:
        true

    },

    cachedAt:
      Date.now()

  };


  writeJson(
    PLOT_KEY,
    map
  );
}


/* =========================================
   room 초기화
========================================= */

let resolving=null;


async function ensureUniversalRoom(){

  if(resolving)
    return resolving;


  resolving=
    (async()=>{

      const ctx=
        await resolvePlotId();


      const plotMap=
        readJson(PLOT_KEY);


      if(
        !plotMap
          ?.[ctx.plotId]
          ?.payload
      ){

        const character=
          await resolveCharacterProfile(
            ctx.plotId
          );


        if(
          !character
            ?.description
        ){

          throw Error(
            '[PROFILE:char] 캐릭터 프로필 내용이 없습니다.'
          );
        }


        writeSyntheticPlotCache(
          ctx.plotId,
          character
        );
      }


      return ctx;

    })()
      .finally(
        ()=>{
          resolving=null;
        }
      );


  return resolving;
}


/* =========================================
   기존 v2.3 앞에 universal resolver 연결
========================================= */

P.get=
  async function(
    options={}
  ){

    await ensureUniversalRoom();

    return baseGet(
      options
    );
  };


P.prepare=
  async function(){

    await ensureUniversalRoom();

    return basePrepare();
  };


P.ensureRoom=
  ensureUniversalRoom;


P.version=
  '2.5';


console.log(
  '[ZETA Profile] Universal Room v2.5 ready'
);

})();
