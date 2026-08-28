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
