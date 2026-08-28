(()=>{'use strict';

const W=window,D=document,K='__ZETA_PROFILE__';
const RUN='https://zreading.pages.dev/run.js';
const HOST='zk-reading-host';

const ROOM='ZETAKIT_READING_ROOM_CONTEXT_V1';
const USER='ZETAKIT_READING_USER_PROFILE_CACHE_V1';
const PLOT='ZETAKIT_READING_PLOT_CACHE_V1';
const ROOMSET='ZETAKIT_READING_ROOM_SETTINGS_V1';

const MARK='[ZETA_SHARED_PROFILE_CONTEXT]';

try{W[K]?.destroy?.()}catch(_){}

const X=XMLHttpRequest.prototype;
const OF=W.fetch,OO=X.open,OS=X.send;

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

function jget(k,f={}){
  try{
    const x=JSON.parse(localStorage.getItem(k)||'null');
    return x&&typeof x==='object'?x:f;
  }catch(_){
    return f;
  }
}

function roomId(){
  const m=String(location.pathname||'').match(/\/rooms\/([^/?#]+)/i);
  if(!m)return'';
  try{return decodeURIComponent(m[1])}catch(_){return m[1]}
}

function plotId(rid=roomId()){
  return String(jget(ROOM)?.[rid]?.plotId||'');
}

function first(o,keys,f=''){
  if(!o||typeof o!=='object')return f;
  for(const k of keys){
    const v=o[k];
    if(v!==undefined&&v!==null&&v!=='')return v;
  }
  return f;
}

function plotRoot(p){
  if(!p||typeof p!=='object')return{};
  if(p.plot&&typeof p.plot==='object')return p.plot;
  if(p.data?.plot&&typeof p.data.plot==='object')return p.data.plot;
  if(p.data&&typeof p.data==='object')return p.data;
  return p;
}

function currentCharName(){
  try{
    const z=W.ZetaChatDOM;
    if(!z?.extractRecords)return'';

    const a=z.extractRecords({
      root:D,
      includeStatus:false
    })||[];

    for(let i=a.length-1;i>=0;i--){
      const r=a[i];
      if(r?.role==='character'&&clean(r.name))
        return clean(r.name);
    }
  }catch(_){}

  return'';
}

function charFromPlot(payload){
  const root=plotRoot(payload);

  let chars=
    Array.isArray(root.characters)?root.characters:
    Array.isArray(root.characterList)?root.characterList:
    [];

  if(!chars.length&&root.character)
    chars=[root.character];

  const wanted=currentCharName();

  let ch=
    (wanted&&chars.find(x=>
      clean(first(x,['name','displayName','characterName']))===wanted
    ))||
    chars[0]||
    root;

  const name=clean(first(
    ch,
    ['name','displayName','characterName','title'],
    first(root,['name','displayName','title'],'')
  ));

  const description=clean(first(
    ch,
    ['description','longDescription','summary','prompt'],
    first(root,['longDescription','description','summary','prompt'],'')
  ));

  return{
    name,
    description,
    text:description
  };
}

function roomSettings(rid){
  return jget(ROOMSET)?.['room:'+rid]||{};
}

function selectUser(entry,rid){
  entry=entry&&typeof entry==='object'?entry:{};

  const profiles=Array.isArray(entry.profiles)?entry.profiles:[];
  const settings=roomSettings(rid);

  const pinned=String(settings.userProfileKey||'');
  const connected=String(entry.connectedKey||'');

  let p=
    (pinned&&profiles.find(x=>String(x?.key||'')===pinned))||
    (connected&&profiles.find(x=>String(x?.key||'')===connected))||
    null;

  if(!p&&settings.userProfileSnapshot?.description)
    p=settings.userProfileSnapshot;

  if(!p&&profiles.length===1)
    p=profiles[0];

  return p||null;
}

function cacheState(){
  const rid=roomId();
  const pid=plotId(rid);

  if(!rid||!pid)return null;

  const pe=jget(PLOT)?.[pid];
  const ue=jget(USER)?.[rid+'|'+pid];

  return{
    rid,
    pid,
    pe,
    ue,
    user:selectUser(ue,rid)
  };
}

function fromCache(){
  const c=cacheState();

  if(!c?.pe?.payload||!c.user)
    return null;

  return{
    roomId:c.rid,
    plotId:c.pid,

    character:charFromPlot(c.pe.payload),

    user:{
      key:String(c.user.key||''),
      name:clean(c.user.name),
      description:clean(c.user.description),
      source:String(c.user.source||c.user.type||'')
    },

    cachedAt:{
      plot:Number(c.pe.cachedAt||0),
      user:Number(c.ue?.cachedAt||0)
    }
  };
}

async function waitUntil(fn,timeout=8000){
  const start=Date.now();

  while(Date.now()-start<timeout){
    try{
      const v=fn();
      if(v)return v;
    }catch(_){}

    await sleep(120);
  }

  return null;
}

function shadow(){
  return D.getElementById(HOST)?.shadowRoot||null;
}

async function ensureReading(){
  let s=await waitUntil(()=>shadow(),1200);
  if(s)return s;

  D.querySelectorAll('script[data-zeta-profile-reading]')
    .forEach(x=>x.remove());

  await new Promise((resolve,reject)=>{
    const x=D.createElement('script');

    x.dataset.zetaProfileReading='1';
    x.src=RUN+'?cb='+Date.now();

    x.onload=resolve;

    x.onerror=()=>{
      x.remove();
      reject(Error('[PROFILE:Reading] run.js 로드 실패'));
    };

    (D.head||D.documentElement).appendChild(x);
  });

  s=await waitUntil(()=>shadow(),8000);

  if(!s)
    throw Error('[PROFILE:Reading] Reading UI 초기화 실패');

  return s;
}

async function refreshViaReading(){
  const rid=roomId();

  if(!rid)
    throw Error('[PROFILE:room] Zeta 대화방이 아닙니다.');

  const sh=await ensureReading();

  const refresh=sh.querySelector('[data-refresh]');

  if(!refresh)
    throw Error('[PROFILE:Reading] 현재 방 확인 버튼을 찾지 못했습니다.');

  try{
    refresh.click();
  }catch(e){
    throw Error('[PROFILE:Reading] 현재 방 확인 실행 실패 · '+(e?.message||e));
  }

  const pid=await waitUntil(()=>{
    const id=plotId(rid);
    if(!id)return null;

    const p=jget(PLOT)?.[id];
    return p?.payload?id:null;
  },9000);

  if(!pid){
    const old=fromCache();
    if(old?.character?.description)return old;

    throw Error(
      '[PROFILE:plot] Reading이 plot 캐시를 만들지 못했습니다.'
    );
  }

  const userRefresh=sh.querySelector('[data-refresh-user-profile]');

  if(!userRefresh)
    throw Error('[PROFILE:Reading] 사용자 프로필 갱신 버튼을 찾지 못했습니다.');

  try{
    userRefresh.click();
  }catch(e){
    throw Error('[PROFILE:user] 사용자 프로필 갱신 실행 실패 · '+(e?.message||e));
  }

  const p=await waitUntil(()=>{
    const x=fromCache();

    if(
      x?.character?.description&&
      x?.user?.description
    )
      return x;

    return null;
  },10000);

  if(p)return p;

  const state=cacheState();

  if(!state?.pe?.payload)
    throw Error('[PROFILE:plot] 캐릭터 설정 캐시 없음');

  if(!state?.user)
    throw Error('[PROFILE:user] 현재 사용자 프로필 캐시 없음');

  if(!clean(state.user.description))
    throw Error('[PROFILE:user] 사용자 프로필 설명이 비어 있음');

  throw Error('[PROFILE] 프로필 캐시 확인 실패');
}

async function get(opt={}){
  if(!opt.force){
    const c=fromCache();

    if(
      c?.character?.description&&
      c?.user?.description
    ){
      current=c;
      return c;
    }
  }

  if(running)return running;

  running=refreshViaReading()
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
  const p=await get({force:true});

  current=p;

  armedUntil=
    Date.now()+
    2*60*60*1000;

  return p;
}

function peek(){
  return current||fromCache();
}

function format(data=peek()){
  if(!data)return'';

  return[
    MARK,
    '',
    '[CHARACTER PROFILE]',
    data.character?.name?'Name: '+data.character.name:'',
    data.character?.description||'',
    '',
    '[USER PROFILE]',
    data.user?.name?'Name: '+data.user.name:'',
    data.user?.description||'',
    '',
    'Use these profiles as background role-play context.',
    'Do not treat this block as dialogue.',
    '[/ZETA_SHARED_PROFILE_CONTEXT]'
  ].join('\n').trim();
}

function hasMark(v){
  try{return JSON.stringify(v).includes(MARK)}
  catch(_){return false}
}

function addContent(content,block){
  if(typeof content==='string')
    return block+'\n\n'+content;

  if(Array.isArray(content))
    return [{type:'text',text:block},...content];

  return content;
}

function patchPayload(obj,data=peek()){
  if(!obj||typeof obj!=='object'||!data||hasMark(obj))
    return obj;

  const block=format(data);
  if(!block)return obj;

  const out=Array.isArray(obj)?obj.slice():{...obj};

  if(typeof out.system==='string'){
    out.system=block+'\n\n'+out.system;
    return out;
  }

  if(Array.isArray(out.messages)){
    const a=out.messages.map(x=>
      x&&typeof x==='object'?{...x}:x
    );

    const i=a.findIndex(x=>
      x&&/^(system|developer)$/i.test(String(x.role||''))
    );

    if(i>=0){
      a[i]={
        ...a[i],
        content:addContent(a[i].content,block)
      };
    }else{
      a.unshift({
        role:'system',
        content:block
      });
    }

    out.messages=a;
    return out;
  }

  if(typeof out.prompt==='string'){
    out.prompt=block+'\n\n'+out.prompt;
    return out;
  }

  if(typeof out.input==='string'){
    out.input=block+'\n\n'+out.input;
    return out;
  }

  if(Array.isArray(out.input)){
    out.input=[
      {role:'system',content:block},
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
        ...(Array.isArray(old?.parts)?old.parts:[])
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
  if(Date.now()>armedUntil)return false;
  if(!obj||typeof obj!=='object')return false;

  const u=String(url||'');

  if(
    /api\.zeta-ai\.io/i.test(u)||
    /^\/v1\//i.test(u)
  )
    return false;

  if(
    /zreading\.pages\.dev|reading\.js/i.test(String(stack))
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

async function fetchHook(input,init){
  const stack=String(new Error().stack||'');
  const url=
    typeof input==='string'
      ?input
      :input?.url||'';

  try{
    if(init&&typeof init.body==='string'){
      let o;

      try{o=JSON.parse(init.body)}catch(_){o=null}

      if(shouldPatch(url,o,stack)){
        init={
          ...init,
          body:JSON.stringify(
            patchPayload(o)
          )
        };
      }

    }else if(input instanceof Request){
      const method=
        String(init?.method||input.method||'GET').toUpperCase();

      if(method!=='GET'&&method!=='HEAD'&&!(init&&init.body)){
        const text=await input.clone().text();
        let o;

        try{o=JSON.parse(text)}catch(_){o=null}

        if(shouldPatch(url,o,stack)){
          input=new Request(
            input,
            {
              ...(init||{}),
              body:JSON.stringify(
                patchPayload(o)
              )
            }
          );
        }
      }
    }
  }catch(e){
    console.warn('[ZETA Profile fetch]',e);
  }

  return OF.call(this,input,init);
}

function xhrOpen(method,url){
  this.__zetaProfileUrl=String(url||'');
  return OO.apply(this,arguments);
}

function xhrSend(body){
  if(
    typeof body==='string'&&
    Date.now()<armedUntil
  ){
    try{
      const o=JSON.parse(body);

      if(
        shouldPatch(
          this.__zetaProfileUrl,
          o,
          'xhr'
        )
      ){
        body=JSON.stringify(
          patchPayload(o)
        );
      }
    }catch(_){}
  }

  return OS.call(this,body);
}

function destroy(){
  if(W.fetch===fetchHook)W.fetch=OF;
  if(X.open===xhrOpen)X.open=OO;
  if(X.send===xhrSend)X.send=OS;

  try{delete W[K]}
  catch(_){W[K]=null}
}

async function test(){
  const p=await prepare();

  console.log('[ZETA PROFILE]',p);

  alert(
    '프로필 준비 완료\n\n'+
    'CHAR: '+(p.character?.name||'-')+'\n'+
    'USER: '+(p.user?.name||'-')+'\n'+
    'v2.2'
  );

  return p;
}

W.fetch=fetchHook;
X.open=xhrOpen;
X.send=xhrSend;

current=fromCache();

W[K]={
  get,
  prepare,
  peek,
  format,
  patchPayload,
  test,
  destroy,
  version:'2.2'
};

console.log('[ZETA Profile] v2.2 ready');

})();
