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
   ZETA PROFILE ROOM BOOTSTRAP v1.0
   처음 들어간 방도 room → plot 자동 연결
========================================= */

(()=>{'use strict';

const W=window;
const D=document;

const P=W.__ZETA_PROFILE__;

if(!P){
  console.warn(
    '[ZETA Profile Room Bootstrap] profile module 없음'
  );
  return;
}

if(P.__roomBootstrapInstalled){
  return;
}

P.__roomBootstrapInstalled=true;


const ROOM_KEY=
  'ZETAKIT_READING_ROOM_CONTEXT_V1';

const PLOT_KEY=
  'ZETAKIT_READING_PLOT_CACHE_V1';

const READING_HOST=
  'zk-reading-host';

const READING_RUN=
  'https://zreading.pages.dev/run.js';


const sleep=ms=>
  new Promise(
    r=>setTimeout(r,ms)
  );


function readJson(
  key,
  fallback={}
){

  try{

    const raw=
      localStorage.getItem(
        key
      );

    if(raw==null)
      return fallback;


    const value=
      JSON.parse(raw);


    return(
      value&&
      typeof value==='object'
        ?value
        :fallback
    );

  }catch(_){

    return fallback;
  }
}


function writeJson(
  key,
  value
){

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


/* =========================================
   현재 roomId
========================================= */

function currentRoomId(){

  const match=
    String(
      location.pathname||
      ''
    )
      .match(
        /\/rooms\/([^/?#]+)/i
      );


  if(!match)
    return '';


  try{

    return decodeURIComponent(
      match[1]
    );

  }catch(_){

    return match[1];
  }
}


/* =========================================
   저장된 plotId 확인

   Reading 최신 캐시
   + 예전 Memory/Persona 캐시까지 전부 확인
========================================= */

function savedPlotId(
  rid
){

  rid=
    String(
      rid||
      ''
    );


  if(!rid)
    return '';


  const roomMap=
    readJson(
      ROOM_KEY
    );


  const direct=
    String(
      roomMap
        ?.[rid]
        ?.plotId||
      ''
    );


  if(direct)
    return direct;


  try{

    return String(

      localStorage.getItem(
        'ZETAKIT_MEMORY_PROFILE_PLOTID_'+
        rid
      )||

      localStorage.getItem(
        'zeta-persona-editor-plotid-'+
        rid
      )||

      ''

    );

  }catch(_){

    return '';
  }
}


/* =========================================
   plotId 저장

   Reading이 쓰는 형식과 동일하게 맞춤
========================================= */

function rememberPlot(
  rid,
  pid
){

  rid=
    String(
      rid||
      ''
    );

  pid=
    String(
      pid||
      ''
    );


  if(
    !rid||
    !pid
  )
    return false;


  const map=
    readJson(
      ROOM_KEY
    );


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
      'ZETAKIT_MEMORY_PROFILE_PLOTID_'+
      rid,
      pid
    );

  }catch(_){}


  return true;
}


/* =========================================
   현재 Zeta 화면 DOM에서도 plotId 탐색

   새 방 페이지에는 보통 캐릭터/plot 프로필 링크가
   이미 렌더되어 있으므로 API보다 먼저 이걸 사용.
========================================= */

function plotIdFromPage(){

  const selectors=[

    '[data-sentry-component="ChatRoomHeader"] a[href*="/plots/"]',

    '[data-sentry-source-file*="ChatRoomHeader"] a[href*="/plots/"]',

    'nav a[href*="/plots/"]',

    'header a[href*="/plots/"]',

    'a[href*="/plots/"][href*="/profile"]'

  ];


  for(
    const selector of
    selectors
  ){

    let links=[];


    try{

      links=[
        ...D.querySelectorAll(
          selector
        )
      ];

    }catch(_){}


    for(
      const link of
      links
    ){

      const href=
        String(
          link.getAttribute(
            'href'
          )||
          link.href||
          ''
        );


      const match=
        href.match(
          /\/plots\/([^/?#]+)/i
        );


      if(match?.[1]){

        try{

          return decodeURIComponent(
            match[1]
          );

        }catch(_){

          return match[1];
        }
      }
    }
  }


  return '';
}


/* =========================================
   plot 상세 캐시 존재 여부
========================================= */

function hasPlotPayload(
  pid
){

  if(!pid)
    return false;


  const map=
    readJson(
      PLOT_KEY
    );


  return !!(
    map
      ?.[pid]
      ?.payload
  );
}


/* =========================================
   조건 기다리기
========================================= */

async function waitFor(
  fn,
  timeout=9000
){

  const started=
    Date.now();


  while(
    Date.now()-
      started<
    timeout
  ){

    try{

      const value=
        fn();

      if(value)
        return value;

    }catch(_){}


    await sleep(120);
  }


  return null;
}


/* =========================================
   Reading 준비
========================================= */

function readingShadow(){

  return D
    .getElementById(
      READING_HOST
    )
    ?.shadowRoot||
    null;
}


async function ensureReading(){

  /*
   * 이미 Reading이 살아 있으면 그대로 사용.
   */
  let shadow=
    await waitFor(
      ()=>readingShadow(),
      800
    );


  if(shadow)
    return shadow;


  /*
   * Reading이 아직 없으면 run.js를 한 번 로드.
   */
  D.querySelectorAll(
    'script[data-zeta-profile-room-reading]'
  )
    .forEach(
      s=>s.remove()
    );


  await new Promise(
    (resolve,reject)=>{

      const script=
        D.createElement(
          'script'
        );


      script.dataset
        .zetaProfileRoomReading=
        '1';


      script.src=
        READING_RUN+
        '?cb='+
        Date.now();


      script.onload=
        ()=>resolve();


      script.onerror=
        ()=>{

          script.remove();

          reject(
            Error(
              '[PROFILE:Reading] Reading을 불러오지 못했습니다.'
            )
          );
        };


      (
        D.head||
        D.documentElement
      )
        .appendChild(
          script
        );
    }
  );


  shadow=
    await waitFor(
      ()=>readingShadow(),
      7000
    );


  if(!shadow){

    throw Error(
      '[PROFILE:Reading] Reading 초기화를 완료하지 못했습니다.'
    );
  }


  return shadow;
}


/* =========================================
   핵심
   현재 방의 room → plot → plot payload를 자동 확보
========================================= */

async function ensureRoomContext(){

  const rid=
    currentRoomId();


  if(!rid){

    throw Error(
      '[PROFILE:room] 현재 Zeta 대화방을 찾지 못했습니다.'
    );
  }


  /*
   * 1. 이미 저장된 plotId 확인.
   */
  let pid=
    savedPlotId(
      rid
    );


  /*
   * 2. 새 방이면 현재 페이지의 plot 링크에서
   *    바로 알아낼 수 있는지 먼저 확인.
   */
  if(!pid){

    pid=
      plotIdFromPage();


    if(pid){

      rememberPlot(
        rid,
        pid
      );
    }
  }


  /*
   * plotId + plot 상세 캐시까지 이미 있으면 끝.
   */
  if(
    pid&&
    hasPlotPayload(pid)
  ){

    return{
      roomId:rid,
      plotId:pid,
      source:'cache'
    };
  }


  /*
   * 3. 부족하면 Reading에게 현재 방을
   *    실제로 확인시킨다.
   */
  const shadow=
    await ensureReading();


  const refresh=
    shadow.querySelector(
      '[data-refresh]'
    );


  if(!refresh){

    throw Error(
      '[PROFILE:Reading] 현재 방 확인 기능을 찾지 못했습니다.'
    );
  }


  try{

    refresh.click();

  }catch(e){

    throw Error(
      '[PROFILE:Reading] 현재 방 확인 실행 실패 · '+
      (
        e?.message||
        e
      )
    );
  }


  /*
   * 4. Reading이 room → plotId를 저장하고
   *    plot 상세까지 불러올 때까지 기다린다.
   */
  const ready=
    await waitFor(
      ()=>{

        let nextPid=
          savedPlotId(
            rid
          );


        /*
         * Reading보다 DOM에서 먼저 찾은 경우도 저장.
         */
        if(!nextPid){

          nextPid=
            plotIdFromPage();


          if(nextPid){

            rememberPlot(
              rid,
              nextPid
            );
          }
        }


        if(
          !nextPid||
          !hasPlotPayload(
            nextPid
          )
        ){

          return null;
        }


        return nextPid;

      },
      10000
    );


  if(!ready){

    throw Error(
      '[PROFILE:plot] 이 방의 Plot 정보를 자동으로 가져오지 못했습니다.'
    );
  }


  return{
    roomId:rid,
    plotId:ready,
    source:'resolved'
  };
}


/* =========================================
   기존 zeta-profile API 앞에
   room bootstrap을 자동 삽입
========================================= */

const originalGet=
  typeof P.get==='function'
    ?P.get.bind(P)
    :null;


const originalPrepare=
  typeof P.prepare==='function'
    ?P.prepare.bind(P)
    :null;


if(!originalGet){

  throw Error(
    '[ZETA Profile Room Bootstrap] get() 없음'
  );
}


if(!originalPrepare){

  throw Error(
    '[ZETA Profile Room Bootstrap] prepare() 없음'
  );
}


P.get=
  async function(
    options={}
  ){

    await ensureRoomContext();

    return originalGet(
      options
    );
  };


P.prepare=
  async function(){

    await ensureRoomContext();

    return originalPrepare();
  };


P.ensureRoom=
  ensureRoomContext;


P.version=
  '2.4';


console.log(
  '[ZETA Profile] Room Bootstrap 설치 완료 · v2.4'
);

})();
