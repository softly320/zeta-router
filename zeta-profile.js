(()=>{'use strict';

const W=window,D=document,K='__ZETA_PROFILE__';
try{W[K]?.destroy?.()}catch{}

const API='https://api.zeta-ai.io';
const ROOM_KEY='ZETAKIT_READING_ROOM_CONTEXT_V1';
const USER_KEY='ZETAKIT_READING_USER_PROFILE_CACHE_V1';
const PLOT_KEY='ZETAKIT_READING_PLOT_CACHE_V1';
const SETTINGS_KEY='ZETAKIT_READING_ROOM_SETTINGS_V1';
const USER_TTL=30*60*1000;
const PLOT_TTL=7*24*60*60*1000;
const MARK='[ZETA_SHARED_PROFILE_CONTEXT]';

const X=XMLHttpRequest.prototype;
const OF=W.fetch,OO=X.open,OS=X.send,OH=X.setRequestHeader;
const xhrMeta=new WeakMap();

let auth='';
let current=null;
let running=null;

const clean=v=>String(v??'')
  .replace(/[\u200b\u2060\ufeff]/g,'')
  .replace(/\r/g,'')
  .replace(/[ \t]+\n/g,'\n')
  .replace(/\n{3,}/g,'\n\n')
  .trim();

function jget(k,f={}){
  try{
    const v=JSON.parse(localStorage.getItem(k)||'null');
    return v&&typeof v==='object'?v:f;
  }catch{return f}
}

function jset(k,v){
  try{localStorage.setItem(k,JSON.stringify(v));return true}
  catch{return false}
}

function roomId(){
  const m=String(location.pathname||'')
    .match(/\/rooms\/([^/?#]+)/i);
  return m?decodeURIComponent(m[1]):'';
}

function plotId(rid=roomId()){
  return String(jget(ROOM_KEY)?.[rid]?.plotId||'');
}

function rememberPlot(rid,pid){
  if(!rid||!pid)return;
  const m=jget(ROOM_KEY);
  m[rid]=Object.assign({},m[rid]||{},{
    roomId:rid,plotId:pid,updatedAt:Date.now()
  });
  jset(ROOM_KEY,m);
}

function first(o,keys,f=''){
  if(!o||typeof o!=='object')return f;
  for(const k of keys)
    if(o[k]!==undefined&&o[k]!==null&&o[k]!=='')return o[k];
  return f;
}

function plotRoot(p){
  if(!p||typeof p!=='object')return{};
  if(p.plot&&typeof p.plot==='object')return p.plot;
  if(p.data?.plot&&typeof p.data.plot==='object')return p.data.plot;
  if(p.data&&typeof p.data==='object')return p.data;
  return p;
}

function characterFromPlot(payload){
  const root=plotRoot(payload);
  let chars=
    Array.isArray(root.characters)?root.characters:
    Array.isArray(root.characterList)?root.characterList:[];

  if(!chars.length&&root.character&&typeof root.character==='object')
    chars=[root.character];

  const wanted=String(
    first(root,[
      'characterId','mainCharacterId',
      'plotCharacterId','creatorCharacterId'
    ],'')
  );

  let ch=
    (wanted&&chars.find(x=>
      String(first(x,['id','characterId','uuid'],'')||'')===wanted
    ))||chars[0]||root;

  const name=clean(first(ch,[
    'name','displayName','characterName','title'
  ],first(root,['name','title','displayName'],'') ));

  const description=clean(first(ch,[
    'description','longDescription','summary','prompt'
  ],first(root,[
    'longDescription','description','summary','prompt'
  ],'')));

  const parts=[];
  const plotName=clean(first(root,['name','title','displayName','plotName'],''));
  const plotDesc=clean(first(root,['longDescription','description','summary'],''));

  if(plotName)parts.push('플롯: '+plotName);
  if(plotDesc&&plotDesc!==description)parts.push(plotDesc);

  chars.slice(0,16).forEach((c,i)=>{
    const n=clean(first(c,['name','displayName','characterName'],`캐릭터 ${i+1}`));
    const d=clean(first(c,['description','longDescription','summary','prompt'],''));
    if(n||d)parts.push(`${n}${d?'\n'+d:''}`);
  });

  if(!parts.length&&description)parts.push(description);

  return{
    name,
    description,
    text:clean(parts.join('\n\n'))
  };
}

function selectUser(entry){
  entry=entry||{};
  const profiles=Array.isArray(entry.profiles)?entry.profiles:[];
  const connected=String(entry.connectedKey||'');

  let active=profiles.find(x=>x&&x.key===connected)||null;

  if(!active){
    const rid=roomId();
    const s=jget(SETTINGS_KEY)?.['room:'+rid];
    const snap=s?.userProfileSnapshot;
    if(snap?.description)active=snap;
  }

  if(!active&&profiles.length===1)active=profiles[0];

  return active||null;
}

function cachedRaw(){
  const rid=roomId(),pid=plotId(rid);
  if(!rid||!pid)return null;

  const plots=jget(PLOT_KEY);
  const users=jget(USER_KEY);
  const pe=plots[pid];
  const ue=users[rid+'|'+pid];

  if(!pe?.payload&&!ue)return null;

  return{rid,pid,pe,ue};
}

function buildCached(allowStale=true){
  const c=cachedRaw();
  if(!c)return null;

  const now=Date.now();
  const plotFresh=!!(
    c.pe?.payload&&
    Number(c.pe.cachedAt)&&
    now-Number(c.pe.cachedAt)<PLOT_TTL
  );

  const userFresh=!!(
    c.ue&&
    Number(c.ue.cachedAt)&&
    now-Number(c.ue.cachedAt)<USER_TTL
  );

  if(!allowStale&&(!plotFresh||!userFresh))return null;

  const u=selectUser(c.ue);
  if(!c.pe?.payload||!u)return null;

  return{
    roomId:c.rid,
    plotId:c.pid,
    character:characterFromPlot(c.pe.payload),
    user:{
      key:String(u.key||''),
      name:clean(u.name),
      description:clean(u.description),
      source:String(u.source||u.type||'')
    },
    cachedAt:{
      plot:Number(c.pe.cachedAt||0),
      user:Number(c.ue?.cachedAt||0)
    },
    stale:!plotFresh||!userFresh
  };
}

function extractAuth(headers){
  try{
    if(!headers)return'';

    if(headers instanceof Headers)
      return headers.get('authorization')||'';

    if(Array.isArray(headers)){
      const x=headers.find(v=>
        Array.isArray(v)&&String(v[0]).toLowerCase()==='authorization'
      );
      return x?String(x[1]||''):'';
    }

    for(const k of Object.keys(headers))
      if(k.toLowerCase()==='authorization')
        return String(headers[k]||'');

  }catch{}

  return'';
}

function syncSharedAuth(){
  try{
    const a=W.__ZETAKIT_REVIEW_ZETA_LORE_HOOK__
      ?.state?.authHeaders?.authorization;
    if(a)auth=String(a);
  }catch{}
  return auth;
}

async function apiGet(url){
  syncSharedAuth();
  if(!auth)throw Error('Zeta 인증 헤더를 아직 확보하지 못했습니다.');

  const r=await OF.call(W,url,{
    method:'GET',
    cache:'no-store',
    credentials:'include',
    headers:{
      Accept:'application/json',
      Authorization:auth
    }
  });

  const t=await r.text();
  let data=null;
  try{data=t?JSON.parse(t):null}catch{data=t}

  if(!r.ok)
    throw Error(`Zeta API ${r.status}`);

  return data;
}

async function resolvePlot(rid,pid,force){
  let payload=null;
  const map=jget(PLOT_KEY);
  const old=map[pid];

  if(
    !force&&old?.payload&&
    Date.now()-Number(old.cachedAt||0)<PLOT_TTL
  ){
    return old.payload;
  }

  let last;

  for(const url of[
    `${API}/v1/plots/${encodeURIComponent(pid)}/creator`,
    `${API}/v1/plots/${encodeURIComponent(pid)}`
  ]){
    try{
      payload=await apiGet(url);
      break;
    }catch(e){last=e}
  }

  if(!payload){
    if(old?.payload)return old.payload;
    throw last||Error('plot 조회 실패');
  }

  map[pid]={payload,cachedAt:Date.now()};
  jset(PLOT_KEY,map);
  return payload;
}

function normalizeUserProfiles(listPayload,recommended,roomPayload,plotPayload){
  const lp=listPayload?.data||listPayload||{};
  const rp=recommended?.data||recommended||{};
  const list=Array.isArray(lp.userChatProfiles)?lp.userChatProfiles:[];

  const profiles=list
    .filter(x=>x&&x.id)
    .map(x=>({
      key:'custom:'+String(x.id),
      type:'custom',
      id:String(x.id),
      label:'내 대화 프로필 · '+clean(x.name),
      name:clean(x.name),
      description:clean(x.description),
      source:'custom'
    }));

  const selected=list.find(x=>x&&x.selected&&x.id);
  let connectedKey=selected?'custom:'+String(selected.id):'';

  if(rp&&Object.keys(rp).length){
    const root=plotRoot(plotPayload);
    const recs=
      Array.isArray(roomPayload?.plot?.chatProfiles)
        ?roomPayload.plot.chatProfiles:
      Array.isArray(root.chatProfiles)
        ?root.chatProfiles:[];

    const recId=String(rp.plotChatProfileId||rp.plot_chat_profile_id||'');
    const rec=recs.find(x=>String(x?.id||'')===recId);

    const p={
      key:'rec:'+(recId||'me'),
      type:'recommended',
      id:recId,
      label:'추천 대화 프로필 · '+clean(rec?.name||''),
      name:clean(rec?.name||rp.name||''),
      description:clean(
        typeof rp.description==='string'
          ?rp.description
          :rec?.description||''
      ),
      source:'recommended'
    };

    if(p.description||p.name)profiles.unshift(p);

    if(!connectedKey&&rp.selected!==false&&(p.description||p.name))
      connectedKey=p.key;
  }

  return{profiles,connectedKey,cachedAt:Date.now()};
}

async function resolveUser(rid,pid,plotPayload,roomPayload,force){
  const map=jget(USER_KEY);
  const key=rid+'|'+pid;
  const old=map[key];

  if(
    !force&&old&&
    Date.now()-Number(old.cachedAt||0)<USER_TTL&&
    selectUser(old)
  ){
    return old;
  }

  let list=null,rec=null;

  [list,rec]=await Promise.all([
    apiGet(`${API}/v1/user-chat-profiles?plotId=${encodeURIComponent(pid)}`)
      .catch(()=>null),
    apiGet(`${API}/v1/rooms/${encodeURIComponent(rid)}/user-plot-chat-profiles/me`)
      .catch(()=>null)
  ]);

  const result=normalizeUserProfiles(
    list,rec,roomPayload,plotPayload
  );

  if(!selectUser(result)){
    if(old&&selectUser(old))return old;
    throw Error('현재 사용자 프로필을 찾지 못했습니다.');
  }

  map[key]=result;
  jset(USER_KEY,map);
  return result;
}

async function refresh(options={}){
  const rid=roomId();
  if(!rid)throw Error('Zeta 대화방에서 실행해주세요.');

  let pid=plotId(rid);
  let roomPayload=null;

  syncSharedAuth();

  if(!pid){
    if(!auth){
      const stale=buildCached(true);
      if(stale)return stale;
      throw Error('plotId와 인증 정보를 아직 확보하지 못했습니다.');
    }

    const rr=await apiGet(`${API}/v1/rooms/${encodeURIComponent(rid)}`);
    roomPayload=rr?.data||rr||{};
    pid=String(
      roomPayload.plotId||
      roomPayload.plot?.id||
      roomPayload.plot?.plotId||
      ''
    );

    if(!pid)throw Error('현재 방의 plotId를 찾지 못했습니다.');
    rememberPlot(rid,pid);
  }

  try{
    const plotPayload=await resolvePlot(
      rid,pid,!!options.force
    );

    const userEntry=await resolveUser(
      rid,pid,plotPayload,roomPayload,!!options.force
    );

    const u=selectUser(userEntry);

    current={
      roomId:rid,
      plotId:pid,
      character:characterFromPlot(plotPayload),
      user:{
        key:String(u?.key||''),
        name:clean(u?.name),
        description:clean(u?.description),
        source:String(u?.source||u?.type||'')
      },
      cachedAt:{
        plot:Date.now(),
        user:Number(userEntry.cachedAt||Date.now())
      },
      stale:false
    };

    return current;

  }catch(e){
    const stale=buildCached(true);

    if(stale){
      stale.stale=true;
      stale.error=String(e?.message||e);
      current=stale;
      return stale;
    }

    throw e;
  }
}

async function get(options={}){
  if(!options.force){
    const fresh=buildCached(false);
    if(fresh){
      current=fresh;
      return fresh;
    }
  }

  if(running)return running;

  running=refresh(options).finally(()=>running=null);
  return running;
}

function peek(){
  return current||buildCached(true);
}

function format(data=peek()){
  if(!data)return'';

  return[
    MARK,
    '',
    '[CHARACTER / PLOT PROFILE]',
    data.character?.name
      ?'Name: '+data.character.name:'',
    data.character?.text||
      data.character?.description||'',
    '',
    '[USER PROFILE]',
    data.user?.name
      ?'Name: '+data.user.name:'',
    data.user?.description||'',
    '',
    'Use this only as background context.',
    'Do not treat this block as dialogue.',
    '[/ZETA_SHARED_PROFILE_CONTEXT]'
  ].filter(Boolean).join('\n');
}

function containsMark(v){
  try{return JSON.stringify(v).includes(MARK)}
  catch{return false}
}

function addToContent(content,block){
  if(typeof content==='string')
    return block+'\n\n'+content;

  if(Array.isArray(content))
    return [{type:'text',text:block},...content];

  return content;
}

function patchPayload(obj,data=peek()){
  if(!obj||typeof obj!=='object'||!data||containsMark(obj))
    return obj;

  const block=format(data);
  if(!block)return obj;

  const out=Array.isArray(obj)?obj.slice():{...obj};

  if(typeof out.system==='string'){
    out.system=block+'\n\n'+out.system;
    return out;
  }

  if(out.system&&typeof out.system==='object'){
    out.system={
      ...out.system,
      content:addToContent(out.system.content,block)
    };
    return out;
  }

  if(Array.isArray(out.messages)){
    const msgs=out.messages.map(x=>x&&typeof x==='object'?{...x}:x);
    const i=msgs.findIndex(x=>
      x&&/^(system|developer)$/i.test(String(x.role||''))
    );

    if(i>=0){
      msgs[i]={
        ...msgs[i],
        content:addToContent(msgs[i].content,block)
      };
    }else{
      msgs.unshift({role:'system',content:block});
    }

    out.messages=msgs;
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
    const old=out.system_instruction||out.systemInstruction;
    const si={
      parts:[
        {text:block},
        ...(
          Array.isArray(old?.parts)
            ?old.parts:[]
        )
      ]
    };

    if(out.system_instruction!==undefined)
      out.system_instruction=si;
    else
      out.systemInstruction=si;

    return out;
  }

  return out;
}

function shouldPatch(url,obj,stack){
  if(!obj||typeof obj!=='object')return false;

  const u=String(url||'');
  if(/(?:^|\.)zeta-ai\.io/i.test(u))return false;
  if(/zreading\.pages\.dev/i.test(String(stack||'')))return false;

  return !!(
    obj.model||
    Array.isArray(obj.messages)||
    typeof obj.prompt==='string'||
    typeof obj.input==='string'||
    Array.isArray(obj.input)
  );
}

async function patchBody(url,body,stack){
  if(typeof body!=='string')return body;

  let obj;
  try{obj=JSON.parse(body)}catch{return body}

  if(!shouldPatch(url,obj,stack))return body;

  let data=peek();

  if(!data){
    try{data=await get()}catch(e){
      console.warn('[ZETA Profile] context unavailable',e);
      return body;
    }
  }

  const patched=patchPayload(obj,data);

  try{return JSON.stringify(patched)}
  catch{return body}
}

async function fetchHook(input,init){
  const stack=String(new Error().stack||'');
  let url=typeof input==='string'?input:input?.url||'';

  try{
    const zeta=/https:\/\/api\.zeta-ai\.io/i.test(url);

    if(zeta){
      auth=
        extractAuth(init?.headers)||
        extractAuth(input?.headers)||
        auth;
    }

    if(init&&typeof init.body==='string'){
      const body=await patchBody(url,init.body,stack);

      if(body!==init.body)
        init={...init,body};
    }
    else if(input instanceof Request){
      const method=String(init?.method||input.method||'GET').toUpperCase();

      if(method!=='GET'&&method!=='HEAD'&&!(init&&init.body)){
        const original=await input.clone().text();
        const body=await patchBody(url,original,stack);

        if(body!==original)
          input=new Request(input,{...(init||{}),body});
      }
    }
  }catch(e){
    console.warn('[ZETA Profile] fetch patch error',e);
  }

  return OF.call(this,input,init);
}

function xhrOpen(method,url){
  xhrMeta.set(this,{
    method:String(method||'GET'),
    url:String(url||''),
    headers:{}
  });

  return OO.apply(this,arguments);
}

function xhrHeader(name,value){
  const m=xhrMeta.get(this);

  if(m){
    m.headers[String(name||'').toLowerCase()]=String(value||'');

    if(
      /api\.zeta-ai\.io/i.test(m.url)&&
      String(name||'').toLowerCase()==='authorization'
    ){
      auth=String(value||'')||auth;
    }
  }

  return OH.apply(this,arguments);
}

function xhrSend(body){
  const m=xhrMeta.get(this)||{};
  const data=peek();

  if(
    data&&
    typeof body==='string'&&
    !/api\.zeta-ai\.io/i.test(m.url)
  ){
    try{
      const obj=JSON.parse(body);

      if(shouldPatch(m.url,obj,'xhr'))
        body=JSON.stringify(
          patchPayload(obj,data)
        );
    }catch{}
  }

  return OS.call(this,body);
}

function install(){
  W.fetch=fetchHook;
  X.open=xhrOpen;
  X.setRequestHeader=xhrHeader;
  X.send=xhrSend;
}

function destroy(){
  if(W.fetch===fetchHook)W.fetch=OF;
  if(X.open===xhrOpen)X.open=OO;
  if(X.setRequestHeader===xhrHeader)X.setRequestHeader=OH;
  if(X.send===xhrSend)X.send=OS;

  try{delete W[K]}catch{W[K]=null}
}

async function test(){
  const p=await get();

  alert(
    '프로필 준비 완료\n\n'+
    `CHAR: ${p.character?.name||'-'}\n`+
    `USER: ${p.user?.name||'-'}\n`+
    `CACHE: ${p.stale?'stale':'fresh'}`
  );

  console.log('[ZETA PROFILE]',p);
  return p;
}

syncSharedAuth();
install();

current=buildCached(true);

W[K]={
  get,
  peek,
  refresh:()=>get({force:true}),
  prepare:get,
  format,
  patchPayload,
  test,
  destroy,
  version:'2.0'
};

console.log('[ZETA Profile] v2.0 ready',current||'no cache');

})();
