(()=>{
'use strict';

const KEY='__ZETA_RP_MEMORY_STANDALONE__';
const STORE='__ZETA_RP_MEMORY_STANDALONE_V1__';
const OLD_STORE='__ZETA_RP_MEMORY_V1__';
const MARK='[ZETA_CONTINUITY_NOTES]';
const ID='__zeta_rp_memory_standalone__';

if(window[KEY]?.open){
  window[KEY].open();
  return;
}

document.getElementById(ID)?.remove();

const chatKey=()=>
  location.origin+location.pathname;

const readAll=()=>{
  try{
    const v=JSON.parse(
      localStorage.getItem(STORE)||'{}'
    );

    return (
      v&&
      typeof v==='object'&&
      !Array.isArray(v)
    )?v:{};

  }catch{
    return {};
  }
};

const norm=(v={})=>({
  text:String(v.text||''),

  interval:
    [3,5,10].includes(+v.interval)
      ?+v.interval
      :0,

  count:
    Math.max(
      0,
      +v.count||0
    ),

  armed:
    !!v.armed,

  lastSig:
    String(v.lastSig||'')
});

const read=()=>
  norm(
    readAll()[chatKey()]
  );

const write=v=>{
  const all=readAll();

  all[chatKey()]={
    ...norm(v),
    updatedAt:Date.now()
  };

  localStorage.setItem(
    STORE,
    JSON.stringify(all)
  );

  refresh();
};

const patch=p=>
  write({
    ...read(),
    ...p
  });


/* ==========================================
   기존 내장 RP 메모가 있으면
   텍스트만 새 저장소로 이관하고 자동주입 OFF
   ========================================== */

(function migrate(){

  try{

    const oldAll=
      JSON.parse(
        localStorage.getItem(
          OLD_STORE
        )||'{}'
      );

    const old=
      oldAll?.[chatKey()];

    const now=
      read();


    if(
      !now.text&&
      old?.text
    ){

      const all=
        readAll();

      all[chatKey()]={
        ...now,
        text:String(old.text),
        updatedAt:Date.now()
      };

      localStorage.setItem(
        STORE,
        JSON.stringify(all)
      );
    }


    /*
     * 구형 런처 메모 주입기가
     * 동시에 발동하지 않도록 비활성화
     */
    if(old){

      oldAll[chatKey()]={
        ...old,
        enabled:false,
        interval:0,
        armed:false,
        turn:0
      };

      localStorage.setItem(
        OLD_STORE,
        JSON.stringify(oldAll)
      );
    }

  }catch(_){}

})();


/* ==========================================
   메시지 도우미
   ========================================== */

const textOf=content=>

  typeof content==='string'

    ?content

    :Array.isArray(content)

      ?content
        .map(
          x=>
            typeof x?.text==='string'
              ?x.text
              :''
        )
        .join('\n')

      :'';


function hash(text){

  let h=
    2166136261;

  for(
    let i=0;
    i<text.length;
    i++
  ){

    h^=
      text.charCodeAt(i);

    h=
      Math.imul(
        h,
        16777619
      );
  }

  return (
    h>>>0
  ).toString(36);
}


function messageSignature(messages){

  if(
    !Array.isArray(messages)||
    !messages.length
  ){
    return '';
  }

  const last=
    messages[
      messages.length-1
    ];

  if(
    last?.role!=='user'
  ){
    return '';
  }

  return (
    messages.length+
    ':'+
    hash(
      textOf(
        last.content
      )
    )
  );
}


function containsMemory(messages){

  return (
    Array.isArray(messages)&&

    messages.some(
      m=>
        textOf(
          m?.content
        ).includes(MARK)
    )
  );
}


function memoryBlock(text){

  text=
    String(text||'')
      .trim();

  if(!text){
    return '';
  }

  return (
`${MARK}
Reference only for continuity. Never mention, quote, summarize, or imitate these notes.
${text}
[/ZETA_CONTINUITY_NOTES]`
  );
}


/* ==========================================
   이번 요청에 주입할지 결정
   ========================================== */

function decide(messages){

  const v=
    read();

  const text=
    v.text.trim();

  if(!text){

    return {
      inject:false,
      text:''
    };
  }


  const sig=
    messageSignature(
      messages
    );


  /*
   * 1회 주입은 턴 카운터와 무관하게
   * 무조건 다음 실제 요청에 발동
   */
  let inject=
    !!v.armed;

  let changed=
    false;


  if(v.armed){

    v.armed=
      false;

    changed=
      true;
  }


  /*
   * 자동 주입 카운트
   *
   * 같은 사용자 메시지를 여러 요청에서
   * 처리해도 1턴으로만 계산
   */
  if(
    v.interval>0&&
    sig&&
    sig!==v.lastSig
  ){

    v.lastSig=
      sig;

    v.count+=
      1;

    changed=
      true;


    if(
      v.count>=
      v.interval
    ){

      inject=
        true;

      v.count=
        0;
    }
  }


  if(changed){

    write(v);
  }


  return {
    inject,
    text
  };
}


/* ==========================================
   messages에 실제 메모 삽입
   ========================================== */

function injectMessages(messages){

  if(
    containsMemory(
      messages
    )
  ){

    return messages;
  }


  const d=
    decide(
      messages
    );


  if(!d.inject){

    return messages;
  }


  const out=
    messages.slice();


  let at=
    0;


  while(
    at<out.length&&
    [
      'system',
      'developer'
    ].includes(
      out[at]?.role
    )
  ){

    at++;
  }


  out.splice(
    at,
    0,
    {
      role:'system',
      content:
        memoryBlock(
          d.text
        )
    }
  );


  console.log(
    '[ZETA MEMORY] injected'
  );


  return out;
}


/* ==========================================
   payload 안쪽 messages 탐색
   ========================================== */

function injectDeep(
  value,
  depth=0
){

  if(
    !value||
    typeof value!=='object'||
    depth>6
  ){

    return {
      value,
      changed:false,
      found:false
    };
  }


  if(
    !Array.isArray(value)&&
    Array.isArray(
      value.messages
    )
  ){

    const next=
      injectMessages(
        value.messages
      );


    return (
      next===
      value.messages
    )

      ?{
          value,
          changed:false,
          found:true
        }

      :{
          value:{
            ...value,
            messages:next
          },

          changed:true,
          found:true
        };
  }


  if(
    Array.isArray(value)
  ){

    for(
      let i=0;
      i<value.length;
      i++
    ){

      const r=
        injectDeep(
          value[i],
          depth+1
        );


      if(r.found){

        if(!r.changed){

          return {
            value,
            changed:false,
            found:true
          };
        }


        const out=
          value.slice();


        out[i]=
          r.value;


        return {
          value:out,
          changed:true,
          found:true
        };
      }
    }


    return {
      value,
      changed:false,
      found:false
    };
  }


  for(
    const [
      key,
      item
    ]
    of Object.entries(value)
  ){

    if(
      item&&
      typeof item==='object'
    ){

      const r=
        injectDeep(
          item,
          depth+1
        );


      if(r.found){

        if(!r.changed){

          return {
            value,
            changed:false,
            found:true
          };
        }


        return {
          value:{
            ...value,
            [key]:r.value
          },

          changed:true,
          found:true
        };
      }
    }
  }


  return {
    value,
    changed:false,
    found:false
  };
}


/* ==========================================
   JSON body 변환
   ========================================== */

function transformString(body){

  if(
    typeof body!=='string'
  ){
    return body;
  }


  const trimmed=
    body.trim();


  if(
    !trimmed||
    ![
      '{',
      '['
    ].includes(
      trimmed[0]
    )
  ){

    return body;
  }


  try{

    const parsed=
      JSON.parse(body);


    const r=
      injectDeep(parsed);


    return r.changed

      ?JSON.stringify(
          r.value
        )

      :body;


  }catch(_){

    return body;
  }
}


/* ==========================================
   요청 가로채기

   fetch(init.body)
   fetch(Request)
   XMLHttpRequest
   ========================================== */

function installInjector(){

  const baseFetch=
    window.fetch;


  const baseSend=
    XMLHttpRequest
      .prototype
      .send;


  window.fetch=
    async function(
      input,
      init
    ){

      try{

        /*
         * 일반 fetch(url,{body})
         */
        if(
          init&&
          typeof init.body==='string'
        ){

          const body=
            transformString(
              init.body
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

        }


        /*
         * fetch(new Request(...))
         */
        else if(
          input instanceof Request&&
          !init?.body
        ){

          const contentType=
            input.headers.get(
              'content-type'
            )||'';


          if(
            contentType.includes(
              'application/json'
            )
          ){

            const original=
              await input
                .clone()
                .text();


            const body=
              transformString(
                original
              );


            if(
              body!==
              original
            ){

              input=
                new Request(
                  input,
                  {
                    body
                  }
                );
            }
          }
        }

      }catch(error){

        console.warn(
          '[ZETA MEMORY] fetch inject failed',
          error
        );
      }


      return baseFetch.call(
        this,
        input,
        init
      );
    };


  XMLHttpRequest
    .prototype
    .send=
      function(body){

        try{

          body=
            transformString(
              body
            );

        }catch(error){

          console.warn(
            '[ZETA MEMORY] xhr inject failed',
            error
          );
        }


        return baseSend.call(
          this,
          body
        );
      };
}


installInjector();


/* ==========================================
   UI
   ========================================== */

const root=
  document.createElement(
    'div'
  );


root.id=
  ID;


root.innerHTML=`

<style>

#${ID}{
position:fixed;
inset:0;
z-index:2147483647;
display:none;
align-items:center;
justify-content:center;
padding:16px;
box-sizing:border-box;
background:#0009;
font-family:system-ui
}

#${ID}[data-open="1"]{
display:flex
}

#${ID} .card{
width:min(430px,100%);
max-height:86vh;
overflow:auto;
padding:16px;
box-sizing:border-box;
border:1px solid #ffffff20;
border-radius:20px;
background:#191b21;
color:#fff;
box-shadow:0 18px 60px #0008
}

#${ID} .head{
display:flex;
align-items:center;
justify-content:space-between;
margin-bottom:12px;
font:750 15px system-ui
}

#${ID} .close{
width:34px;
height:34px;
border:0;
border-radius:10px;
background:#ffffff12;
color:#fff;
font-size:18px
}

#${ID} textarea{
width:100%;
min-height:230px;
box-sizing:border-box;
padding:11px;
border:1px solid #ffffff1c;
border-radius:12px;
background:#ffffff0e;
color:#fff;
outline:none;
resize:vertical;
font:12px/1.55 ui-monospace,monospace
}

#${ID} .label{
margin:11px 0 6px;
color:#ffffff99;
font-size:11px
}

#${ID} .intervals{
display:grid;
grid-template-columns:repeat(4,1fr);
gap:7px
}

#${ID} .iv,
#${ID} .btn{
height:38px;
border:1px solid #ffffff18;
border-radius:10px;
background:#ffffff0a;
color:#ffffffb8;
font:700 11px system-ui
}

#${ID} .iv[data-on="1"]{
background:#6d88cf;
color:#fff;
border-color:#8ca4e3
}

#${ID} .oneshot{
width:100%;
margin-top:10px;
background:#485f9b;
color:#fff
}

#${ID} .oneshot[data-armed="1"]{
background:#875f32
}

#${ID} .status{
margin-top:10px;
padding:9px 10px;
border-radius:10px;
background:#ffffff09;
color:#ffffff99;
font-size:10px;
line-height:1.4
}

#${ID} .foot{
display:flex;
gap:8px;
margin-top:10px
}

#${ID} .clear{
flex:1;
color:#fca5a5
}

#${ID} .note{
margin-top:9px;
color:#ffffff61;
font-size:10px;
line-height:1.45
}

</style>


<div class="card">

<div class="head">

<span>
📌 RP MEMORY
</span>

<button
class="close"
type="button">
×
</button>

</div>


<textarea
class="mem"
spellcheck="false"
placeholder="현재 장소: 집 거실
둘은 싸운 직후
ㅇㅇ는 사건의 진실을 모름"
></textarea>


<div class="label">
자동주입 주기
</div>


<div class="intervals">

<button
class="iv"
data-i="0"
type="button">
OFF
</button>

<button
class="iv"
data-i="3"
type="button">
3턴
</button>

<button
class="iv"
data-i="5"
type="button">
5턴
</button>

<button
class="iv"
data-i="10"
type="button">
10턴
</button>

</div>


<button
class="btn oneshot"
type="button">
다음 답변에 1회 주입
</button>


<div class="status"></div>


<div class="foot">

<button
class="btn clear"
type="button">
메모 비우기
</button>

</div>


<div class="note">
화면 채팅에는 표시되지 않음.
OFF여도 1회 주입 가능.
입력 내용은 자동 저장됨.
</div>

</div>
`;


(
  document.body||
  document.documentElement
).appendChild(root);


const textarea=
  root.querySelector(
    '.mem'
  );


const status=
  root.querySelector(
    '.status'
  );


const oneShot=
  root.querySelector(
    '.oneshot'
  );


let saveTimer=
  null;


function statusText(v){

  if(v.armed){

    if(v.interval>0){

      return (
        '다음 답변 1회 주입 대기 · '+
        '자동주입 '+
        Math.max(
          1,
          v.interval-
          v.count
        )+
        '턴 후'
      );
    }


    return (
      '다음 답변 1회 주입 대기'
    );
  }


  if(v.interval>0){

    return (
      '자동주입 ON · '+
      '다음 주입까지 '+
      Math.max(
        1,
        v.interval-
        v.count
      )+
      '턴'
    );
  }


  return (
    '자동주입 OFF'
  );
}


function refresh(){

  if(
    !document.getElementById(
      ID
    )
  ){
    return;
  }


  const v=
    read();


  if(
    document.activeElement!==
    textarea
  ){

    textarea.value=
      v.text;
  }


  root
    .querySelectorAll(
      '.iv'
    )
    .forEach(
      button=>{

        button.dataset.on=

          +button.dataset.i===
          v.interval

            ?'1'
            :'0';
      }
    );


  oneShot.dataset.armed=

    v.armed
      ?'1'
      :'0';


  oneShot.textContent=

    v.armed

      ?'1회 주입 취소'

      :'다음 답변에 1회 주입';


  status.textContent=
    statusText(v);
}


function open(){

  refresh();

  root.dataset.open=
    '1';
}


function close(){

  root.dataset.open=
    '0';
}


textarea.addEventListener(
  'input',
  ()=>{

    clearTimeout(
      saveTimer
    );


    saveTimer=
      setTimeout(
        ()=>{

          patch({
            text:
              textarea.value
          });

        },
        250
      );
  }
);


root
  .querySelectorAll(
    '.iv'
  )
  .forEach(
    button=>{

      button.addEventListener(
        'click',
        ()=>{

          patch({

            interval:
              +button.dataset.i,

            count:0,

            lastSig:''
          });
        }
      );
    }
  );


oneShot.addEventListener(
  'click',
  ()=>{

    const v=
      read();


    const text=
      textarea.value.trim();


    if(
      !text&&
      !v.armed
    ){

      return alert(
        '먼저 RP 메모를 입력해주세요.'
      );
    }


    patch({

      text:
        textarea.value,

      armed:
        !v.armed
    });
  }
);


root
  .querySelector(
    '.clear'
  )
  .addEventListener(
    'click',
    ()=>{

      if(
        textarea.value.trim()&&
        !confirm(
          '이 채팅방 RP 메모를 비울까요?'
        )
      ){

        return;
      }


      textarea.value=
        '';


      patch({
        text:'',
        armed:false,
        count:0,
        lastSig:''
      });
    }
  );


root
  .querySelector(
    '.close'
  )
  .addEventListener(
    'click',
    close
  );


root.addEventListener(
  'pointerdown',
  event=>{

    if(
      event.target===
      root
    ){

      close();
    }
  }
);


window[KEY]={
  open,
  close,
  read,
  patch,
  version:'1.0'
};


refresh();

open();


console.log(
  '[ZETA RP MEMORY] standalone ready'
);

})();
