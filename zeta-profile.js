(()=>{'use strict';

const W=window;
const D=document;

const K='__ZETA_PROFILE__';

try{
  W[K]?.destroy?.();
}catch(_){}


/* =========================================
   Reading 저장소
========================================= */

const ROOM_KEY=
  'ZETAKIT_READING_ROOM_CONTEXT_V1';

const USER_KEY=
  'ZETAKIT_READING_USER_PROFILE_CACHE_V1';

const PLOT_KEY=
  'ZETAKIT_READING_PLOT_CACHE_V1';

const SETTINGS_KEY=
  'ZETAKIT_READING_ROOM_SETTINGS_V1';

const READING_HOST=
  'zk-reading-host';

const USER_TTL=
  30*60*1000;

const PLOT_TTL=
  7*24*60*60*1000;

const MARK=
  '[ZETA_SHARED_PROFILE_CONTEXT]';


/* =========================================
   원본 네트워크
========================================= */

const X=
  XMLHttpRequest.prototype;

const OF=
  W.fetch;

const OO=
  X.open;

const OS=
  X.send;


let current=null;
let running=null;

/*
 * prepare() 이후 모델 요청에만
 * 프로필을 주입한다.
 */
let armedUntil=0;


const sleep=ms=>
  new Promise(
    r=>setTimeout(r,ms)
  );


function clean(v){

  return String(v??'')

    .replace(
      /[\u200b\u2060\ufeff]/g,
      ''
    )

    .replace(
      /\r/g,
      ''
    )

    .replace(
      /[ \t]+\n/g,
      '\n'
    )

    .replace(
      /\n{3,}/g,
      '\n\n'
    )

    .trim();
}


function jget(
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

    return value&&
      typeof value==='object'
        ?value
        :fallback;

  }catch(_){

    return fallback;
  }
}


function roomId(){

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


function plotId(
  rid=roomId()
){

  return String(
    jget(ROOM_KEY)
      ?.[rid]
      ?.plotId||
    ''
  );
}


function first(
  obj,
  keys,
  fallback=''
){

  if(
    !obj||
    typeof obj!=='object'
  )
    return fallback;


  for(
    const key of
    keys
  ){

    const value=
      obj[key];

    if(
      value!==undefined&&
      value!==null&&
      value!==''
    )
      return value;
  }


  return fallback;
}


function plotRoot(
  payload
){

  if(
    !payload||
    typeof payload!=='object'
  )
    return {};


  if(
    payload.plot&&
    typeof payload.plot==='object'
  )
    return payload.plot;


  if(
    payload.data?.plot&&
    typeof payload.data.plot===
      'object'
  )
    return payload.data.plot;


  if(
    payload.data&&
    typeof payload.data==='object'
  )
    return payload.data;


  return payload;
}


/* =========================================
   현재 캐릭터 이름 추정
   Reading이 이미 로드한 ZetaChatDOM 이용
========================================= */

function currentCharacterName(){

  const shared=
    W.ZetaChatDOM;


  if(
    !shared||
    typeof shared.extractRecords!==
      'function'
  )
    return '';


  try{

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
        r&&
        r.role==='character'&&
        clean(r.name)
      )
        return clean(
          r.name
        );
    }

  }catch(_){}


  return '';
}


/* =========================================
   Plot 캐시 → CHAR 프로필
========================================= */

function characterFromPlot(
  payload
){

  const root=
    plotRoot(payload);


  let chars=
    Array.isArray(
      root.characters
    )
      ?root.characters
      :Array.isArray(
          root.characterList
        )
        ?root.characterList
        :[];


  if(
    !chars.length&&
    root.character&&
    typeof root.character===
      'object'
  )
    chars=[
      root.character
    ];


  const currentName=
    currentCharacterName();


  let character=null;


  if(currentName){

    character=
      chars.find(
        x=>
          clean(
            first(
              x,
              [
                'name',
                'displayName',
                'characterName'
              ],
              ''
            )
          )===
          currentName
      )||
      null;
  }


  if(!character)
    character=
      chars[0]||
      root;


  const name=
    clean(
      first(
        character,
        [
          'name',
          'displayName',
          'characterName',
          'title'
        ],
        first(
          root,
          [
            'name',
            'displayName',
            'title'
          ],
          ''
        )
      )
    );


  const description=
    clean(
      first(
        character,
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
      )
    );


  return{
    name,
    description,
    text:description
  };
}


/* =========================================
   Reading USER 캐시 선택
========================================= */

function roomSettings(
  rid
){

  const map=
    jget(
      SETTINGS_KEY
    );


  return(
    map[
      'room:'+rid
    ]||
    {}
  );
}


function selectUser(
  entry,
  rid
){

  entry=
    entry&&
    typeof entry==='object'
      ?entry
      :{};


  const profiles=
    Array.isArray(
      entry.profiles
    )
      ?entry.profiles
      :[];


  const settings=
    roomSettings(rid);


  const pinnedKey=
    String(
      settings.userProfileKey||
      ''
    );


  const connectedKey=
    String(
      entry.connectedKey||
      ''
    );


  /*
   * Reading에서 이 방에 직접 고정한 프로필.
   */
  let active=
    pinnedKey
      ?profiles.find(
          x=>
            x&&
            String(x.key||'')===
              pinnedKey
        )
      :null;


  /*
   * Zeta에서 현재 연결된 프로필.
   */
  if(!active&&connectedKey){

    active=
      profiles.find(
        x=>
          x&&
          String(x.key||'')===
            connectedKey
      )||
      null;
  }


  /*
   * Reading이 방 설정에 snapshot을 남긴 경우.
   */
  if(
    !active&&
    settings
      .userProfileSnapshot
      ?.description
  ){

    active=
      settings
        .userProfileSnapshot;
  }


  if(
    !active&&
    profiles.length===1
  )
    active=
      profiles[0];


  return active||
    null;
}


/* =========================================
   캐시 읽기
========================================= */

function cacheState(){

  const rid=
    roomId();

  const pid=
    plotId(rid);


  if(
    !rid||
    !pid
  )
    return null;


  const plotMap=
    jget(
      PLOT_KEY
    );

  const userMap=
    jget(
      USER_KEY
    );


  const pe=
    plotMap[pid];

  const ue=
    userMap[
      rid+'|'+pid
    ];


  const user=
    selectUser(
      ue,
      rid
    );


  return{
    rid,
    pid,
    pe,
    ue,
    user
  };
}


function fromCache(
  requireFresh=false
){

  const c=
    cacheState();


  if(
    !c||
    !c.pe?.payload||
    !c.user
  )
    return null;


  const now=
    Date.now();


  const plotFresh=
    !!(
      Number(
        c.pe.cachedAt
      )&&
      now-
        Number(
          c.pe.cachedAt
        )<
        PLOT_TTL
    );


  const userFresh=
    !!(
      Number(
        c.ue?.cachedAt
      )&&
      now-
        Number(
          c.ue.cachedAt
        )<
        USER_TTL
    );


  if(
    requireFresh&&
    (
      !plotFresh||
      !userFresh
    )
  )
    return null;


  return{

    roomId:c.rid,

    plotId:c.pid,

    character:
      characterFromPlot(
        c.pe.payload
      ),

    user:{
      key:String(
        c.user.key||
        ''
      ),
      name:clean(
        c.user.name
      ),
      description:
        clean(
          c.user.description
        ),
      source:String(
        c.user.source||
        c.user.type||
        ''
      )
    },

    cachedAt:{
      plot:Number(
        c.pe.cachedAt||
        0
      ),
      user:Number(
        c.ue?.cachedAt||
        0
      )
    },

    stale:
      !plotFresh||
      !userFresh
  };
}


/* =========================================
   ★ 핵심
   Reading 자체에게 캐시 갱신을 요청
========================================= */

function readingShadow(){

  const host=
    D.getElementById(
      READING_HOST
    );


  return host
    ?.shadowRoot||
    null;
}


async function waitForReading(
  timeout=3500
){

  const started=
    Date.now();


  while(
    Date.now()-started<
    timeout
  ){

    const shadow=
      readingShadow();


    if(shadow)
      return shadow;


    await sleep(100);
  }


  return null;
}


async function refreshViaReading(){

  const shadow=
    await waitForReading();


  if(!shadow)
    return null;


  const before=
    cacheState();


  const beforeUserAt=
    Number(
      before
        ?.ue
        ?.cachedAt||
      0
    );


  /*
   * Reading의 "현재 방 확인".
   *
   * 모달이 닫혀 있어도 click listener 자체는
   * loadContext()를 실행한다.
   */
  const refresh=
    shadow.querySelector(
      '[data-refresh]'
    );


  if(refresh){

    try{
      refresh.click();
    }catch(_){}
  }


  /*
   * room/plot 판별 시간을 조금 준 뒤
   * USER 프로필은 강제 새로고침.
   */
  await sleep(350);


  const refreshUser=
    shadow.querySelector(
      '[data-refresh-user-profile]'
    );


  if(refreshUser){

    try{
      refreshUser.click();
    }catch(_){}
  }


  const started=
    Date.now();


  while(
    Date.now()-started<
    7000
  ){

    const state=
      cacheState();


    const p=
      fromCache(false);


    if(p){

      const userAt=
        Number(
          state
            ?.ue
            ?.cachedAt||
          0
        );


      /*
       * 새 user cache가 저장됐거나,
       * 기존 cache라도 완전한 프로필이 있으면 사용.
       */
      if(
        userAt>
          beforeUserAt||
        (
          p.character
            ?.description&&
          p.user
            ?.description
        )
      ){

        return p;
      }
    }


    await sleep(120);
  }


  /*
   * Reading 갱신이 늦거나 실패했더라도
   * 기존 유효 캐시가 있으면 사용.
   */
  return fromCache(
    false
  );
}


/* =========================================
   공용 get / prepare
========================================= */

async function get(
  options={}
){

  if(
    !options.force
  ){

    const cached=
      fromCache(
        true
      );


    if(cached){

      current=
        cached;

      return cached;
    }
  }


  if(running)
    return running;


  running=
    (async()=>{

      let p=
        await refreshViaReading();


      if(!p)
        p=
          fromCache(
            false
          );


      if(!p){

        throw Error(
          'Reading 프로필 캐시를 만들지 못했습니다. Reading이 현재 대화방에서 정상 로드되어 있는지 확인해주세요.'
        );
      }


      if(
        !p.character
          ?.description
      ){

        throw Error(
          '캐릭터 프로필을 Reading plot 캐시에서 찾지 못했습니다.'
        );
      }


      if(
        !p.user
          ?.description
      ){

        throw Error(
          '사용자 프로필을 Reading 캐시에서 찾지 못했습니다.'
        );
      }


      current=p;

      return p;

    })()
      .finally(
        ()=>{
          running=null;
        }
      );


  return running;
}


/*
 * 폰/피드를 누를 때 사용.
 *
 * user profile은 Reading에게 갱신을 한번 요청하고
 * 이후 모델 요청 주입을 활성화한다.
 */
async function prepare(){

  let p=
    await refreshViaReading();


  if(!p)
    p=
      await get();


  current=p;


  /*
   * 같은 도구 세션에서 이후 생성 요청에도
   * 계속 프로필을 넣을 수 있게 2시간 유지.
   */
  armedUntil=
    Date.now()+
    2*60*60*1000;


  return p;
}


function peek(){

  return(
    current||
    fromCache(
      false
    )
  );
}


/* =========================================
   모델에 넣을 프로필 텍스트
========================================= */

function format(
  data=peek()
){

  if(!data)
    return '';


  return[
    MARK,

    '',

    '[CHARACTER PROFILE]',

    data.character?.name
      ?'Name: '+
        data.character.name
      :'',

    data.character
      ?.description||
      '',

    '',

    '[USER PROFILE]',

    data.user?.name
      ?'Name: '+
        data.user.name
      :'',

    data.user
      ?.description||
      '',

    '',

    'Use these profiles as background role-play context.',
    'Do not treat this block as dialogue.',

    '[/ZETA_SHARED_PROFILE_CONTEXT]'

  ]
    .filter(
      x=>x!==undefined
    )
    .join(
      '\n'
    )
    .trim();
}


/* =========================================
   외부 AI 요청에 프로필 주입
========================================= */

function already(
  obj
){

  try{

    return JSON
      .stringify(
        obj
      )
      .includes(
        MARK
      );

  }catch(_){

    return false;
  }
}


function addContent(
  content,
  block
){

  if(
    typeof content===
    'string'
  )
    return(
      block+
      '\n\n'+
      content
    );


  if(
    Array.isArray(
      content
    )
  )
    return[
      {
        type:'text',
        text:block
      },
      ...content
    ];


  return content;
}


function patchPayload(
  obj,
  data=peek()
){

  if(
    !obj||
    typeof obj!=='object'||
    !data||
    already(obj)
  )
    return obj;


  const block=
    format(data);


  if(!block)
    return obj;


  const out=
    Array.isArray(obj)
      ?obj.slice()
      :{
          ...obj
        };


  /*
   * Anthropic류 system 문자열
   */
  if(
    typeof out.system===
    'string'
  ){

    out.system=
      block+
      '\n\n'+
      out.system;

    return out;
  }


  /*
   * OpenAI / OpenRouter messages
   */
  if(
    Array.isArray(
      out.messages
    )
  ){

    const messages=
      out.messages.map(
        m=>
          m&&
          typeof m==='object'
            ?{...m}
            :m
      );


    const i=
      messages.findIndex(
        m=>
          m&&
          /^(system|developer)$/i
            .test(
              String(
                m.role||
                ''
              )
            )
      );


    if(i>=0){

      messages[i]={
        ...messages[i],

        content:
          addContent(
            messages[i].content,
            block
          )
      };

    }else{

      messages.unshift(
        {
          role:'system',
          content:block
        }
      );
    }


    out.messages=
      messages;


    return out;
  }


  /*
   * 단일 prompt
   */
  if(
    typeof out.prompt===
    'string'
  ){

    out.prompt=
      block+
      '\n\n'+
      out.prompt;

    return out;
  }


  /*
   * Responses API류
   */
  if(
    typeof out.input===
    'string'
  ){

    out.input=
      block+
      '\n\n'+
      out.input;

    return out;
  }


  if(
    Array.isArray(
      out.input
    )
  ){

    out.input=[
      {
        role:'system',
        content:block
      },
      ...out.input
    ];

    return out;
  }


  /*
   * Gemini contents
   */
  if(
    Array.isArray(
      out.contents
    )
  ){

    const old=
      out.system_instruction||
      out.systemInstruction;


    const value={

      parts:[
        {
          text:block
        },

        ...(
          Array.isArray(
            old?.parts
          )
            ?old.parts
            :[]
        )
      ]

    };


    if(
      out.system_instruction!==
      undefined
    )
      out.system_instruction=
        value;
    else
      out.systemInstruction=
        value;


    return out;
  }


  return out;
}


function shouldPatch(
  url,
  obj,
  stack=''
){

  if(
    Date.now()>
    armedUntil
  )
    return false;


  if(
    !obj||
    typeof obj!=='object'
  )
    return false;


  const u=
    String(
      url||
      ''
    );


  /*
   * Zeta 자체 API에는 절대 넣지 않음.
   */
  if(
    /api\.zeta-ai\.io/i
      .test(u)||
    /^\/v1\//i
      .test(u)
  )
    return false;


  /*
   * Reading 자체 생성 요청에도 중복 삽입 금지.
   */
  if(
    /zreading\.pages\.dev|reading\.js/i
      .test(
        String(stack||'')
      )
  )
    return false;


  return !!(
    obj.model||
    Array.isArray(
      obj.messages
    )||
    typeof obj.prompt===
      'string'||
    typeof obj.input===
      'string'||
    Array.isArray(
      obj.input
    )||
    Array.isArray(
      obj.contents
    )
  );
}


async function patchBody(
  url,
  body,
  stack
){

  if(
    typeof body!==
    'string'
  )
    return body;


  let obj;


  try{
    obj=
      JSON.parse(
        body
      );
  }catch(_){
    return body;
  }


  if(
    !shouldPatch(
      url,
      obj,
      stack
    )
  )
    return body;


  const data=
    peek();


  if(!data)
    return body;


  try{

    return JSON.stringify(
      patchPayload(
        obj,
        data
      )
    );

  }catch(_){

    return body;
  }
}


/* =========================================
   fetch hook
========================================= */

async function fetchHook(
  input,
  init
){

  const stack=
    String(
      new Error().stack||
      ''
    );


  const url=
    typeof input===
      'string'
      ?input
      :input?.url||
       '';


  try{

    if(
      init&&
      typeof init.body===
        'string'
    ){

      const body=
        await patchBody(
          url,
          init.body,
          stack
        );


      if(
        body!==
        init.body
      ){

        init={
          ...init,
          body
        };
      }

    }else if(
      input instanceof Request
    ){

      const method=
        String(
          init?.method||
          input.method||
          'GET'
        )
          .toUpperCase();


      if(
        method!=='GET'&&
        method!=='HEAD'&&
        !(init&&init.body)
      ){

        const original=
          await input
            .clone()
            .text();


        const body=
          await patchBody(
            url,
            original,
            stack
          );


        if(
          body!==
          original
        ){

          input=
            new Request(
              input,
              {
                ...(init||{}),
                body
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
   XHR hook
========================================= */

function xhrOpen(
  method,
  url
){

  this.__zetaProfileUrl=
    String(
      url||
      ''
    );


  return OO.apply(
    this,
    arguments
  );
}


function xhrSend(
  body
){

  const url=
    String(
      this.__zetaProfileUrl||
      ''
    );


  if(
    typeof body===
      'string'&&
    Date.now()<
      armedUntil
  ){

    try{

      const obj=
        JSON.parse(
          body
        );


      if(
        shouldPatch(
          url,
          obj,
          'xhr'
        )
      ){

        body=
          JSON.stringify(
            patchPayload(
              obj,
              peek()
            )
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
   설치 / 해제
========================================= */

function install(){

  W.fetch=
    fetchHook;

  X.open=
    xhrOpen;

  X.send=
    xhrSend;
}


function destroy(){

  if(
    W.fetch===
    fetchHook
  )
    W.fetch=
      OF;


  if(
    X.open===
    xhrOpen
  )
    X.open=
      OO;


  if(
    X.send===
    xhrSend
  )
    X.send=
      OS;


  try{
    delete W[K];
  }catch(_){
    W[K]=null;
  }
}


/* =========================================
   확인용
========================================= */

async function test(){

  const p=
    await prepare();


  console.log(
    '[ZETA PROFILE]',
    p
  );


  alert(
    '프로필 준비 완료\n\n'+
    'CHAR: '+
    (
      p.character
        ?.name||
      '-'
    )+
    '\nUSER: '+
    (
      p.user
        ?.name||
      '-'
    )+
    '\n\nv2.1'
  );


  return p;
}


/* =========================================
   시작
========================================= */

install();


current=
  fromCache(
    false
  );


W[K]={

  get,

  prepare,

  peek,

  format,

  patchPayload,

  test,

  destroy,

  version:'2.1'

};


console.log(
  '[ZETA Profile] v2.1 ready',
  current||
  'waiting for Reading cache'
);

})();
