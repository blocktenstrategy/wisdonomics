
(function(){
"use strict";
// ---------- state ----------
const CFG=(()=>{try{return JSON.parse(document.getElementById("wde-init").textContent)}catch(e){return{}}})();
const STEP_KEY="wde.step."+(CFG.userId||"me");
const ST=Object.assign({submittedAt:null,releasedAt:null,report:null},CFG.status||{});
const isAdmin=!!CFG.admin;
const canSeeResults=()=>isAdmin||!!ST.releasedAt;
function blank(){return{client:{name:"",brand:"",platforms:{}},simba:{},competitors:[{},{},{}],edge:{},beliefs:[{},{},{}],certs:[{}],awards:[{}],testimonials:[{}],interviews:[{},{}],offer:{effort:5},framework:null,committed:false,startedAt:0,finishedAt:0,updatedAt:0}}
let S=blank(), step=0;

function ls(fn){try{return fn()}catch(e){return null}}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function getP(o,p){return p.split(".").reduce((a,k)=>a==null?undefined:a[k],o)}
function setP(o,p,v){const ks=p.split(".");let a=o;for(let i=0;i<ks.length-1;i++){if(a[ks[i]]==null)a[ks[i]]={};a=a[ks[i]]}a[ks[ks.length-1]]=v}
function has(v){return typeof v==="string"?v.trim().length>0:v!=null&&v!==false}
function slug(s){return (s||"client").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,32)||"client"}

// ---------- field builders ----------
function inp(path,ph,type){const v=getP(S,path)??"";return `<input type="${type||"text"}" id="f-${path}" data-path="${path}" value="${esc(v)}" placeholder="${esc(ph||"")}">`}
function ta(path,ph,rows){const v=getP(S,path)??"";return `<textarea id="f-${path}" data-path="${path}" rows="${rows||3}" placeholder="${esc(ph||"")}">${esc(v)}</textarea>`}
function q(n,label,hint,control,forPath){return `<div class="q"><div class="qn">${n}</div><div style="min-width:0">${forPath?`<label for="f-${forPath}">${label}</label>`:`<span class="lbl">${label}</span>`}${hint?`<div class="hint">${hint}</div>`:""}${control}</div></div>`}
function sub(label,control){return `<div class="sub"><span class="mini">${label}</span>${control}</div>`}

// repeater configs
const REP={
  competitors:{label:"Competitor",max:5,fields:[["name","Name or channel","text","e.g. Humphrey Yang"],["url","Link","text","YouTube, website or social profile"]],wide:[]},
  beliefs:{label:"Belief",fields:[["text","Belief or idea","ta","e.g. You don't need more content. You need more trust."]],wide:["text"]},
  certs:{label:"Certification",fields:[["name","Certification or credential","text","e.g. CFP®, Licensed Real Estate Broker"],["issuer","Issued by","text"],["year","Year","text","2021"]],wide:["name"]},
  awards:{label:"Award",fields:[["name","Award, press feature or recognition","text","e.g. Featured in Rappler, Top 40 Under 40"],["by","From","text"],["year","Year","text"]],wide:["name"]},
  testimonials:{label:"Testimonial",fields:[["quote","What they said","ta","Paste it word for word"],["who","Name and role","text","Maria, clinic owner"],["result","The result, with a number","text","Doubled bookings in 60 days"],["permission","OK to name them publicly","check"]],wide:["quote"]},
  interviews:{label:"Person",fields:[["name","Name","text"],["company","Company","text"],["email","Email","text","name@company.com"]],wide:["email"]}
};
function repeater(key){
  const c=REP[key], rows=S[key]||[];
  const items=rows.map((r,i)=>{
    const fs=c.fields.map(([k,lab,t,ph])=>{
      const p=`${key}.${i}.${k}`, w=c.wide.includes(k)?" wide":"";
      if(t==="check")return `<label class="check${w}"><input type="checkbox" id="f-${p}" data-path="${p}" ${r[k]?"checked":""}> ${lab}</label>`;
      if(t==="select")return `<div class="sub${w}"><label class="mini" for="f-${p}">${lab}</label><select id="f-${p}" data-path="${p}">${ph.map(o=>`<option ${r[k]===o?"selected":""}>${o}</option>`).join("")}</select></div>`;
      return `<div class="sub${w}"><label class="mini" for="f-${p}">${lab}</label>${t==="ta"?ta(p,ph,2):inp(p,ph)}</div>`;
    }).join("");
    return `<div class="item"><div class="item-head"><span>${c.label} ${i+1}</span>${rows.length>1?`<button type="button" class="btn ghost" data-del="${key}.${i}" aria-label="Remove ${c.label} ${i+1}">Remove</button>`:""}</div><div class="item-grid">${fs}</div></div>`;
  }).join("");
  return `<div class="items">${items}</div>${c.max&&rows.length>=c.max?"":`<button type="button" class="btn add" data-add="${key}">${ICON.plus} Add ${c.label.toLowerCase()}</button>`}`;
}
const ICON={
  plus:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.75" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  spark:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/></svg>`,
  copy:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>`
};

// ---------- pages ----------
const STEPS=[
 {id:"welcome",t:"Before you start",k:"Get ready",min:2,render:renderWelcome},
 {id:"simba",t:"The Simba profile",k:"Customer",min:15,render:()=>`
  <div class="page-head"><span class="eyebrow">Page 1 of 3 · Customer · 15 min</span><h2>The Simba profile</h2>
  <p>The customer is the hero. You're the guide. In The Lion King everyone wanted to be Simba; the brand that earns trust is Rafiki, the wise guide who helps the hero win.</p>
  <div class="callout"><b>Test:</b> a stranger should be able to say who this is <em>not</em> for. If the problem carries shame, go first: say what it cost you before you say what it's costing them.</div></div>
  <div class="block"><div class="block-title"><h3>About the brand</h3><small>For the report</small></div>
   <div class="duo">${sub("Your name",inp("client.name","Dana Cruz"))}${sub("Brand or business",inp("client.brand","Cruz Ops Co."))}</div><div class="sub" style="margin-top:14px"><span class="mini" id="plat-lbl">Main long-form platforms</span><div class="chips" role="group" aria-labelledby="plat-lbl">${["YouTube","Blog","Podcast","Newsletter"].map(o=>`<label class="chip"><input type="checkbox" id="f-client.platforms.${o}" data-path="client.platforms.${o}" ${S.client.platforms&&S.client.platforms[o]?"checked":""}><span>${o}</span></label>`).join("")}</div></div></div>
  <div class="block"><div class="block-title"><h3>Your one customer</h3><small>Fast and specific</small></div>
   ${q("01","The person","A first name. A real client or a composite. If you have two customers, pick one for now.",inp("simba.person","e.g. Marco"),"simba.person")}
   ${q("02","The situation","One sentence: who they are, and when they show up.",ta("simba.situation","Founder of a 10–30 person service firm who just hired their first operations manager",2),"simba.situation")}
   ${q("03","The problem","The specific problem they feel every day.",ta("simba.problem","",2),"simba.problem")}
   ${q("04","The cost","What it costs them at work, at home, and in money.",ta("simba.cost","",3),"simba.cost")}
   ${q("05","Their words","Three things they'd Google at night, or say to a friend. Use real quotes where you can.",ta("simba.words","“Why does everything still come back to me?”",3),"simba.words")}
   ${q("06","The belief that keeps them stuck","What they believe that stops them from getting the result.",ta("simba.belief","“If I document everything, it'll run itself.”",2),"simba.belief")}
   ${q("07","The old way","What they try first and why it fails. This is your villain: a habit or an idea, not a person.",ta("simba.oldway","Buying tools and writing procedures",2),"simba.oldway")}
   ${q("08","The fear","What they're afraid to tell anyone, including you.",ta("simba.fear","“Maybe I'm the problem.”",2),"simba.fear")}
   ${q("09","Simba wins","A scene of what life looks like after. Describe one ordinary Tuesday.",ta("simba.tuesday","",4),"simba.tuesday")}
   ${q("10","Who this is not for","Two lines.",ta("simba.notfor","Solo operators. Companies with more than 100 people.",2),"simba.notfor")}
  </div>`},
 {id:"edge",t:"Edge",k:"Edge",min:15,render:()=>`
  <div class="page-head"><span class="eyebrow">Page 2 of 3 · Edge · 15 min</span><h2>What gives you the edge?</h2>
  <p>Your edge is two things: what makes you different from everyone else your Simba could follow, and the proof that you can deliver. Start with what sets you apart, then list what a stranger could check.</p>
  <div class="callout"><b>Aim for Spiderman:</b> the Stranger is unknown, the Politician is certified but nobody hands over money, and Spiderman is known <em>and</em> loved for saving the day. Proof moves you along that line.</div></div>
  <div class="block"><div class="block-title"><h3>Your unique selling point</h3><small>What only you can say</small></div>
   ${q("01","What sets you apart?","What you've lived through, the mix of roles you've held, or the way you work that no competitor can truthfully claim.",ta("edge.apart","",4),"edge.apart")}
   ${q("02","What beliefs and ideas would you die on a hill for?","The opinions you'd defend even when people in your industry disagree. One per field.",repeater("beliefs"))}
   ${q("03","Who else is your Simba following?","3 to 5 creators, channels or businesses your customer watches or compares you to. A name and a link is enough. We'll do the research.",repeater("competitors"))}</div>
  <div class="block"><div class="block-title"><h3>Certifications</h3><small>Optional</small></div>${repeater("certs")}</div>
  <div class="block"><div class="block-title"><h3>Awards and press</h3><small>Optional</small></div>${repeater("awards")}</div>
  <div class="block"><div class="block-title"><h3>Testimonials</h3><small>Word for word, with a result</small></div>${repeater("testimonials")}</div>
  <div class="block"><div class="block-title"><h3>People we can interview</h3><small>For case studies</small></div><p class="hint" style="margin-top:-6px">Clients who got a result and would talk about it on camera. Their stories become proof inside your videos.</p>${repeater("interviews")}</div>`},
 {id:"offer",t:"Offer",k:"Offer",min:10,render:()=>`
  <div class="page-head"><span class="eyebrow">Page 3 of 3 · Offer · 10 min</span><h2>The offer</h2>
  <p>Built on Alex Hormozi's value equation. Push the top of the fraction up and the bottom down until the offer is so good your Simba would feel foolish saying no.</p></div>
  <div class="equation" aria-live="polite" id="eq"></div>
  <div class="block"><div class="block-title"><h3>Name it</h3><small>Optional</small></div>
   <div class="duo">${sub("Offer name",inp("offer.name","e.g. The Handoff Sprint"))}${sub("Price or price range",inp("offer.price","e.g. ₱45,000"))}</div></div>
  <div class="block"><div class="block-title"><h3>Four questions</h3><small>Value equation</small></div>
   ${q("01","The dream outcome","What does the client get at the end? Describe the result they actually want, in their words, as concretely as you can.",ta("offer.outcome","The founder takes a two-week holiday and the business runs without a single call to them.",3),"offer.outcome")}
   ${q("02","The quick win","What's the first result they'll get that proves this works? Make it small, visible and fast.",`<div class="duo">${sub("The win",ta("offer.quickwin","Their first decision handed off for good",2))}${sub("How soon",inp("offer.quickwinTime","Within 7 days"))}</div>`)}
   ${q("03","The time delay","How long until they reach the dream outcome?",`<div class="duo">${sub("Number",inp("offer.delayNum","8","number"))}${sub("Unit",`<select id="f-offer.delayUnit" data-path="offer.delayUnit">${["days","weeks","months"].map(u=>`<option ${(S.offer.delayUnit||"weeks")===u?"selected":""}>${u}</option>`).join("")}</select>`)}</div>`)}
   ${q("04","Effort on the client's end","From 1 to 10, how much work does the client have to put in?",`<div class="range-wrap"><div class="effort-read"><b id="effortVal">${S.offer.effort??5}</b><span id="effortTxt">${effortText(S.offer.effort??5)}</span></div><input type="range" min="1" max="10" step="1" id="f-offer.effort" data-path="offer.effort" value="${S.offer.effort??5}" aria-label="Client effort from 1 to 10"><div class="range-ends"><span>1 · Done for them</span><span>10 · All on them</span></div></div>`)}
  </div>`},
 {id:"gen",t:"Submit",k:"Your CEO framework",min:2,render:renderGenerate}
];
function effortText(n){n=+n;return n<=2?"Done for them. Almost nothing to do.":n<=4?"Done with them. Light lifting.":n<=6?"Shared work. Real effort, guided.":n<=8?"Heavy lifting on their side.":"Do-it-yourself. All on them."}

function renderEq(){
  const el=document.getElementById("eq"); if(!el)return;
  const o=S.offer, t=(v,ph)=>has(v)?`<div class="v">${esc(v)}</div>`:`<div class="v empty">${ph}</div>`;
  const delay=has(o.delayNum)?`${o.delayNum} ${o.delayUnit||"weeks"}`:"";
  const qw=has(o.quickwin)?o.quickwin+(has(o.quickwinTime)?` (${o.quickwinTime})`:""):"";
  el.innerHTML=`<div class="eq-grid"><div style="min-width:0">
    <div class="eq-row"><div class="eq-term up"><div class="k"><span>Dream outcome</span><span>↑</span></div>${t(o.outcome,"Question 1")}</div><div class="eq-term up"><div class="k"><span>Likelihood · quick win</span><span>↑</span></div>${t(qw,"Question 2")}</div></div>
    <div class="eq-line" role="presentation"></div>
    <div class="eq-row"><div class="eq-term down"><div class="k"><span>Time delay</span><span>↓</span></div>${t(delay,"Question 3")}</div><div class="eq-term down"><div class="k"><span>Effort & sacrifice</span><span>↓</span></div><div class="v">${o.effort??5} / 10</div></div></div>
  </div><div class="eq-side">=<b>Value</b></div></div>
  <p class="eq-note">Maximise the top line. Shrink the bottom line. The quick win is what makes the dream outcome believable.</p>`;
}

// ---------- completeness ----------
function progress(i){
  const sm=S.simba,id=STEPS[i].id;
  if(id==="welcome")return[S.committed?1:0,1];
  if(id==="simba"){const ch=[S.client.name,sm.person,sm.situation,sm.problem,sm.cost,sm.words,sm.belief,sm.oldway,sm.fear,sm.tuesday,sm.notfor];return[ch.filter(has).length,ch.length]}
  if(id==="edge"){const ch=[S.edge.apart,S.beliefs.some(r=>has(r.text)),S.competitors.filter(r=>has(r.name)).length>=3,S.testimonials.some(r=>has(r.quote)),S.interviews.some(r=>has(r.name))];return[ch.filter(has).length,5]}
  if(id==="offer"){const o=S.offer,ch=[o.outcome,o.quickwin,o.delayNum,o.effortSet];return[ch.filter(has).length,4]}
  return[S.framework?1:0,1];
}
const PAGES=()=>STEPS.map((s,i)=>i).filter(i=>!["welcome","gen"].includes(STEPS[i].id));
function renderRail(){
  let pg=0;
  document.getElementById("rail").innerHTML=STEPS.map((s,i)=>{const[a,b]=progress(i);const done=a===b;const isPage=!["welcome","gen"].includes(s.id);if(isPage)pg++;
    const n=s.id==="welcome"?"✓":s.id==="gen"?"✦":pg;
    const p=s.id==="welcome"?(S.committed?"Ready":"2 min"):s.id==="gen"?(ST.releasedAt?"Results ready":ST.submittedAt?"In review":"2 min"):`${a}/${b} answered · ${s.min} min`;
    return `<button type="button" class="step-btn${done?" done":""}" data-step="${i}" ${i===step?'aria-current="step"':""}><span class="n">${n}</span><span class="t">${s.t}</span><span class="p">${p}</span></button>`}).join("")+`<p class="rail-note">Your answers save as you go, in case something interrupts you. Aim to finish in one sitting.</p>`;
}
function renderMain(){
  const m=document.getElementById("main");
  m.innerHTML=`<form id="form" autocomplete="off" novalidate>${STEPS[step].render()}</form>
   <div class="pager">${step>0?`<button type="button" class="btn" data-step="${step-1}">← ${STEPS[step-1].t}</button>`:"<span></span>"}${step<STEPS.length-1?`<button type="button" class="btn primary" data-step="${step+1}">${STEPS[step+1].id==="gen"?"Build the CEO framework":STEPS[step+1].t} →</button>`:""}</div>`;
  m.querySelector(".pager").hidden=STEPS[step].id==="welcome";
  if(STEPS[step].id==="offer")renderEq();
  renderFramework();
}
function go(i){const dir=i>=step?"enter-fwd":"enter-back";step=i;ls(()=>sessionStorage.setItem(STEP_KEY,i));renderRail();renderMain();const mm=document.getElementById("main");mm.classList.remove("enter-fwd","enter-back");void mm.offsetWidth;mm.classList.add(dir);window.scrollTo({top:0,behavior:"instant"in window?"instant":"auto"})}

// ---------- persistence (saved to the app's database) ----------
let saveTimer=null,saving=false,dirty=false,retryTimer=null;
function setStatus(t,ok){const s=document.getElementById("status");s.textContent=t;s.classList.toggle("ok",!!ok)}
function scheduleSave(){dirty=true;clearTimeout(saveTimer);setStatus("Unsaved changes");saveTimer=setTimeout(flush,900)}
async function flush(){
  if(saving||!dirty)return;
  dirty=false;saving=true;S.updatedAt=Date.now();setStatus("Saving…");
  try{
    const r=await fetch(CFG.intakeUrl,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(S)});
    if(r.status===401){setStatus("Your session ended. Sign in again to keep saving.");saving=false;return}
    if(!r.ok)throw new Error(String(r.status));
    retryTimer=null;setStatus("Saved "+new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}),true);
  }catch(e){dirty=true;setStatus("Couldn't save. Retrying…");clearTimeout(retryTimer);retryTimer=setTimeout(flush,5000)}
  saving=false;if(dirty&&!retryTimer)flush();
}
async function saveNow(){clearTimeout(saveTimer);clearTimeout(retryTimer);retryTimer=null;dirty=true;while(saving)await new Promise(r=>setTimeout(r,100));await flush()}
function normalize(d){const b=blank();const o=Object.assign(b,d||{});["client","simba","offer","edge"].forEach(k=>o[k]=Object.assign(blank()[k],o[k]||{}));["competitors","beliefs","certs","awards","testimonials","interviews"].forEach(k=>{if(!Array.isArray(o[k])||!o[k].length)o[k]=[{}]});return o}

// ---------- events ----------
document.addEventListener("input",e=>{
  const p=e.target.dataset&&e.target.dataset.path;if(!p)return;
  let v=e.target.type==="checkbox"?e.target.checked:e.target.value;
  if(p==="offer.effort"){v=+v;S.offer.effortSet=true;document.getElementById("effortVal").textContent=v;document.getElementById("effortTxt").textContent=effortText(v)}
  setP(S,p,v);
  if(p==="committed"){const sb=document.getElementById("startBtn");if(sb)sb.disabled=!v}
  if(STEPS[step].id==="offer")renderEq();
  renderRail();scheduleSave();
});
document.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.id==="startBtn"){if(!S.startedAt){S.startedAt=Date.now();scheduleSave()}tick();go(1);return}
  if(b.dataset.step!=null){flush();go(+b.dataset.step);return}
  if(b.dataset.add){S[b.dataset.add].push({});renderMain();renderRail();scheduleSave();const items=document.querySelectorAll(`[data-path^="${b.dataset.add}.${S[b.dataset.add].length-1}."]`);if(items[0])items[0].focus();return}
  if(b.dataset.del){const[k,i]=b.dataset.del.split(".");S[k].splice(+i,1);renderMain();renderRail();scheduleSave();return}
});
document.addEventListener("submit",e=>e.preventDefault());

// ---------- timer ----------
function tick(){
  const el=document.getElementById("timer");if(!el)return;
  if(!S.startedAt){el.hidden=true;return}
  const m=Math.max(0,Math.floor(((S.finishedAt||Date.now())-S.startedAt)/60000));
  el.hidden=false;el.classList.toggle("over",m>45&&!S.finishedAt);el.classList.toggle("fin",!!S.finishedAt);
  el.textContent=S.finishedAt?`Finished in ${m} min`:`${m} of 45 min`;
}
setInterval(tick,20000);

// ---------- welcome ----------
function renderWelcome(){
  const plan=STEPS.filter(s=>s.id!=="welcome").map((s,i)=>`<li><span class="pn">${s.id==="gen"?"✦":i+1}</span><span class="pt"><b>${s.t}</b>${s.k!==s.t?`<small>${s.k}</small>`:""}</span><span class="pm">${s.min} min</span></li>`).join("");
  const gather=[["g1","Two or three client testimonials, word for word","Screenshots, messages or reviews you can copy from"],["g2","Names and emails of 2 to 3 happy clients","People we could interview for case studies"],["g3","3 to 5 competitors your customer follows","Names and links are enough"],["g4","Your offer details","What you sell, the price, and how long it takes"],["g5","Certificates and awards, if you have them","Optional"]]
    .map(([k,a,b])=>`<label class="gather-item"><input type="checkbox" id="f-ready.${k}" data-path="ready.${k}" ${S.ready&&S.ready[k]?"checked":""}><span><b>${a}</b><small>${b}</small></span></label>`).join("");
  return `<div class="page-head"><span class="eyebrow">Before you start · 2 min</span><h2>45 minutes to your CEO framework</h2>
  <p>Three short pages, then you submit. Block Ten reviews your answers and builds your CEO framework: where your brand earns trust and where it leaks.</p></div>
  <div class="ceo-cards">
   <div class="ceo-card"><i>C</i><b>Customer</b><span>Who exactly are we building trust with? Your customer is the hero, Simba. You're Rafiki, the guide.</span></div>
   <div class="ceo-card"><i>E</i><b>Edge</b><span>What sets you apart, and the proof that you deliver.</span></div>
   <div class="ceo-card"><i>O</i><b>Offer</b><span>What does the trust turn into? The next step that feels obvious.</span></div>
  </div>
  <div class="block"><div class="block-title"><h3>The plan</h3><small>45 minutes</small></div><ol class="plan">${plan}</ol></div>
  <div class="block"><div class="block-title"><h3>Have these open first</h3><small>Saves you hunting mid-way</small></div><div class="gather">${gather}</div></div>
  <div class="block"><div class="block-title"><h3>Two things we need from you</h3><small>Be honest</small></div>
   <div class="promises">
    <div class="promise"><b>Give us everything</b><span>Names, numbers and your customers' own words beat polished sentences. A messy, specific answer is worth more than a neat, vague one. If you're unsure, write it anyway.</span></div>
    <div class="promise"><b>Finish in one sitting</b><span>Block 45 minutes, close other tabs, and go start to finish. Momentum gives better answers than coming back later.</span></div>
   </div>
   <label class="commit"><input type="checkbox" id="f-committed" data-path="committed" ${S.committed?"checked":""}><span>I've blocked 45 minutes and I'll give it my best answers.</span></label>
   <div class="start-row"><button type="button" class="btn primary big" id="startBtn" ${S.committed?"":"disabled"}>Start the Simba profile →</button><span class="hint" style="margin:0">The timer starts when you click.</span></div>
  </div>`;
}

// ---------- generate ----------
function renderGenerate(){
  const tiles=PAGES().map(i=>{const[a,b]=progress(i);return `<div class="ready-tile"><div class="k">${STEPS[i].t}</div><div class="v">${a}/${b}</div><div class="bar"><i style="width:${Math.round(a/b*100)}%"></i></div></div>`}).join("");
  const d=t=>new Date(t).toLocaleDateString([], {month:"long",day:"numeric"});
  const adminTools=isAdmin?`<div class="gen-actions" style="margin-top:14px"><button type="button" class="btn" id="briefBtn">${ICON.copy} Copy answers as a brief</button><span class="gen-msg" id="genMsg"></span></div><div class="brief-out" id="briefOut" hidden><textarea id="briefText" readonly aria-label="Brief text"></textarea></div>`:"";
  const dl=ST.report&&canSeeResults()?`<a class="btn primary big" href="${esc(CFG.reportUrl)}"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg> Download your report (PDF)</a>`:"";
  if(ST.releasedAt||(isAdmin&&(S.framework||ST.report))){
    return `<div class="page-head"><span class="eyebrow">${ST.releasedAt?"Results ready · "+esc(d(ST.releasedAt)):"Admin preview · not sent yet"}</span><h2>Your CEO framework</h2>
    <p>${ST.releasedAt?"Here's what we found: who you build trust with, what gives you the edge, and what that trust turns into.":"This is what the client will see once you send their results."}</p></div>
    ${dl?`<div class="gen-actions">${dl}</div>`:""}${S.framework?"":`<p class="hint" style="margin-top:16px">${isAdmin?"No interactive results yet. Add the framework from Claude Code to show the full results page here.":""}</p>`}${adminTools}`;
  }
  if(ST.submittedAt){
    return `<div class="page-head"><span class="eyebrow">Submitted · ${esc(d(ST.submittedAt))}</span><h2>We're building your framework</h2>
    <p>Block Ten is reviewing your answers and building your CEO framework. We'll email you as soon as your results are ready. You can still add to your answers until then. We'll use the latest version.</p></div>
    <div class="ready">${tiles}</div>${adminTools}`;
  }
  return `<div class="page-head"><span class="eyebrow">Last step · 2 min</span><h2>Submit your answers</h2>
  <p>Block Ten reviews your answers against the Brand Conversion Engine's trust signals, scores Customer, Edge and Offer, finds your biggest trust leak, and builds your results page and report. We'll email you when it's ready.</p></div>
  <div class="ready">${tiles}</div>
  <div class="gen-actions"><button type="button" class="btn primary big" id="submitBtn">Submit for review →</button><span class="gen-msg" id="submitMsg"></span></div>
  <p class="hint" style="margin-top:14px">Short on detail anywhere? Add it now. Specific answers make a sharper framework.</p>${adminTools}`;
}
async function submitIntake(){
  const btn=document.getElementById("submitBtn"),msg=document.getElementById("submitMsg");
  const filled=PAGES().reduce((n,i)=>n+progress(i)[0],0);
  if(filled<6){msg.className="gen-msg err";msg.textContent="Fill in a few more answers first. We can only build from what's on the page.";return}
  btn.disabled=true;msg.className="gen-msg";msg.textContent="Submitting…";
  try{
    await saveNow();
    const r=await fetch(CFG.submitUrl,{method:"POST"});const j=await r.json().catch(()=>({}));
    if(r.status===401)throw new Error("Your session ended. Sign in again, then submit.");
    if(!r.ok)throw new Error(j.error||"Couldn't submit. Try again in a moment.");
    ST.submittedAt=j.submittedAt;if(!S.finishedAt){S.finishedAt=Date.now();scheduleSave()}tick();renderRail();renderMain();window.scrollTo({top:0,behavior:"smooth"});
  }catch(err){msg.className="gen-msg err";msg.textContent=err.message;btn.disabled=false}
}
function tally(sig,key){const max=sig.length*2,pts=sig.reduce((n,s)=>n+(+s[key]||0),0),gates=sig.filter(s=>s.gate).map(s=>+s[key]||0);const pct=max?Math.round(pts/max*100):0;
  const gmin=gates.length?Math.min(...gates):2;const v=gmin===0||pct<55?"Weak":pct>=80&&gmin===2?"Strong":"Workable";return{pts,max,pct,v}}
// ---------- results page ----------
const IC={
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
 child:'<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8"/><path d="M9 9.5h.01M15 9.5h.01"/>',
 calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
 book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>',
 wall:'<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9.3h18M3 14.7h18M9 4v5.3M15 9.3v5.4M9 14.7V20"/>',
 hand:'<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L3 16.2a1.6 1.6 0 0 1 2.4-2.1L8 16.5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 alert:'<path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 x:'<path d="M6 6l12 12M18 6 6 18"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.3-2.5 3.9M12 17h.01"/>',
 ban:'<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 3-5.5 6.5-5.5s6.5 1.9 6.5 5.5"/><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.8c2 .7 3.5 2.4 3.5 5.2"/>',
 quote:'<path d="M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6"/>',
 flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
 spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
 layers:'<path d="M12 3 2 8l10 5 10-5z"/><path d="M2 13l10 5 10-5"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
 arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
 down:'<path d="M12 5v14M6 13l6 6 6-6"/>',
 scar:'<path d="M4 20 20 4M7 9l2 2M11 5l2 2M11 13l2 2M15 9l2 2"/>',
 star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
 chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/>',
 trend:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
 file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 12v6M9 15l3 3 3-3"/>'
};
const ic=(n,st)=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true"${st?` style="${st}"`:""}>${IC[n]||IC.spark}</svg>`;
const tbc=(on,t)=>on?`<span class="tbc">${t||"To confirm"}</span>`:"";
const vClass=v=>v==="Strong"?"good":v==="Workable"?"warn":"bad";
const vIcon=v=>v==="Strong"?"check":v==="Workable"?"help":"alert";
const arr=a=>Array.isArray(a)?a:[];
function ringSVG(size,r,w,pct,ghost){return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true"><g transform="rotate(-90 ${size/2} ${size/2})"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="${w}"/>${ghost!=null?`<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#BF7BCB" stroke-opacity=".3" stroke-width="${w}" stroke-linecap="round" pathLength="100" stroke-dasharray="${ghost} 100"/>`:""}<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#BF7BCB" stroke-width="${w}" stroke-linecap="round" pathLength="100" stroke-dasharray="${Math.max(.01,pct)} 100"/></g></svg>`}
function secH(icon,title,note,screenOnly){return `<div class="sec-h"><div class="ic">${ic(icon)}</div><h3>${esc(title)}</h3>${note?`<small${screenOnly?" data-pdf-skip":""}>${esc(note)}</small>`:""}</div>`}
function scoreRows(sig,key){return arr(sig).map(s=>{const v=+s[key]||0;return `<div class="sc-row" tabindex="0" data-tip="${esc(s.id+" · "+s.name)}" data-ev="${esc(s.evidence||"")}" aria-label="${esc(`${s.id} ${s.name}: ${v} of 2. ${s.evidence||""}`)}"><span class="id">${esc(s.id)}</span><span class="nm">${esc(s.name)}${s.gate?'<b class="gate">G</b>':""}</span><span class="track2"><i class="${v>=1?"on":""}"></i><i class="${v>=2?"on":""}"></i></span><span class="v">${v}</span></div>`}).join("")}

function renderResults(F){
  const cf=F.customer||{},ef=F.edge||{},of=F.offer||{},ov=F.overview||{};
  const c=tally(arr(cf.signals),"score"),e=tally(arr(ef.signals),"score"),o=tally(arr(of.signals),"draft"),os=tally(arr(of.signals),"sharp");
  const allMax=c.max+e.max+o.max,overall=allMax?Math.round((c.pts+e.pts+o.pts)/allMax*100):0,overallS=allMax?Math.round((c.pts+e.pts+os.pts)/allMax*100):0;
  const name=S.client.name||"Your brand",date=new Date(F.generatedAt||Date.now()).toLocaleDateString([], {day:"numeric",month:"short",year:"numeric"});
  const offerPill=os.v!==o.v?`${o.v} → ${os.v}`:o.v;
  const pk=(href,letter,title,q,p,v,line,fix)=>`<a class="pk" href="#${href}"><div class="pk-top"><div class="mini-ring">${ringSVG(64,27,6,p)}<div class="ctr">${p}</div></div><div><h3>${title}</h3><div class="pq">${q}</div></div></div><span class="pill ${vClass(v.split(" → ").pop())}">${ic(vIcon(v.split(" → ").pop()))}${esc(v)}</span><p class="line">${esc(line||"")}</p>${fix?`<div class="fix">${ic("target")}${esc(fix)}</div>`:""}</a>`;
  const gapsAll=arr(F.gaps),top=new Set(arr(ov.top).map(Number));
  const groups=[["Customer",cf.signals,"score",c],["Edge",ef.signals,"score",e],["Offer (as written)",of.signals,"draft",o]];
  const hi=(t,h)=>{t=esc(t||"");h=esc(h||"");return h&&t.includes(h)?t.replace(h,`<em>${h}</em>`):t};
  const trustPos=Math.max(4,Math.min(96,+(ef.trust&&ef.trust.position)||({Stranger:12,Politician:50,Spiderman:90}[ef.trust&&ef.trust.profile]||20)));
  return `
  <div class="topbar"><div class="rbrand"><img src="${document.querySelector(".brand img")?.src||""}" alt="" width="28" height="28"><span>${esc(name)}</span></div>
   <nav class="nav" aria-label="Results sections"><a href="#r-overview" class="on">Overview</a><a href="#r-customer">Customer</a><a href="#r-edge">Edge</a><a href="#r-offer">Offer</a><a href="#r-next">Next steps</a></nav>
   <button type="button" class="btn primary sm" id="pdfBtn">${ic("file","width:16px;height:16px")}<span>PDF</span></button></div>
  <div class="pdf-status" id="pdfStatus" hidden></div>

  <section id="r-overview">
   <div class="hero" data-pdf>
    <div><span class="eyebrow">Your CEO Framework · ${esc(date)}</span><h1>${esc(name)}</h1><div class="psub">${esc(S.client.brand||"")}</div>
     ${ov.positioning?`<p class="position">"${esc(ov.positioning)}"<small>Your positioning line</small></p>`:""}</div>
    <div class="overall" aria-label="Overall trust score ${overall} out of 100"><span class="eyebrow">Trust score</span>
     <div class="ring">${ringSVG(180,78,14,overall,overallS>overall?overallS:null)}<div class="ctr"><b>${overall}</b></div></div>
     <p>${esc(ov.overall||"")}</p>${overallS>overall?`<span class="delta">${ic("trend","width:14px;height:14px")}${overallS} with the sharpened offer</span>`:""}</div>
   </div>
   ${ov.leak?`<div class="rleak" data-pdf><div class="ic">${ic("alert")}</div><div><b>Your trust leak</b><p>${esc(ov.leak)}${ov.fix?` <em>${esc(ov.fix)}</em>`:""}</p></div></div>`:""}
   <div class="rpillars" data-pdf>
    ${pk("r-customer","C","Customer","Who are we building trust with?",c.pct,c.v,cf.oneLine,c.v==="Strong"?"":"To reach Strong: "+(cf.toStrong||""))}
    ${pk("r-edge","E","Edge","Why you, and nobody else?",e.pct,e.v,ef.oneLine,e.v==="Strong"?"":"To reach Strong: "+(ef.toStrong||""))}
    ${pk("r-offer","O","Offer","What does the trust turn into?",o.pct,offerPill,of.oneLine,os.pct>o.pct?`Sharpened below: ${os.pct}, ${os.v}`:(of.toStrong?"To reach Strong: "+of.toStrong:""))}
   </div>
   <div class="sec" data-pdf>${secH("layers",`All ${groups.reduce((n,g)=>n+arr(g[1]).length,0)} trust signals`,"Hover a row for the evidence",true)}
    <div class="glasscard"><div class="legend"><span><i class="sw" style="background:var(--orchid)"></i>Points earned (0 to 2 each)</span><span><b class="gate">G</b>Gate: must score 2 for a Strong verdict</span></div>
     ${groups.map(([g,sig,key,t])=>`<div class="sc-group"><h4><span>${g}</span><b>${t.pct}</b></h4>${scoreRows(sig,key)}</div>`).join("")}
     <div class="axis" aria-hidden="true"><div></div><div></div><div><span>0</span><span>1</span><span>2</span></div><div></div></div>
     <details class="evidence" data-pdf-skip><summary>Show every score as a table</summary><div class="tw" style="margin-top:12px"><table><thead><tr><th>Signal</th><th>Score</th><th>Evidence</th></tr></thead><tbody>${groups.map(([g,sig,key])=>arr(sig).map(s=>`<tr><td class="k">${esc(s.id)} · ${esc(s.name)}${s.gate?" (gate)":""}</td><td>${+s[key]||0} / 2</td><td>${esc(s.evidence||"")}</td></tr>`).join("")).join("")}</tbody></table></div></details>
    </div></div>
  </section>

  <section id="r-customer" class="chapter">
   <div class="ch-head" data-pdf data-pdf-break><div class="ch-letter">C</div><div><span class="eyebrow">Customer · ${c.pct} · ${c.v}</span><h2>Who exactly are we building trust with?</h2><p>${esc(cf.headline||"")}</p></div></div>
   ${arr(cf.profile).length?`<div class="sec" data-pdf>${secH("user","Meet them: the Simba profile")}<div class="facts">${arr(cf.profile).map(p=>`<div class="fact"><div class="ic">${ic(p.icon)}</div><div><b>${esc(p.label)}</b><span>${esc(p.value)}${tbc(p.confirm)}</span></div></div>`).join("")}</div></div>`:""}
   ${cf.monday&&cf.monday.scene?`<div class="sec" data-pdf>${secH("clock","Their Monday morning",'The "compelling enough?" test')}<div class="scene"><p>${esc(cf.monday.scene)}</p><small>A composite scene built from your answers.${tbc(cf.monday.confirm)}</small></div></div>`:""}
   ${arr(cf.crowd).length?`<div class="sec" data-pdf>${secH("users","Is this a starving crowd?",`${arr(cf.crowd).filter(x=>x.status==="pass"||x.status==="likely").length} of ${arr(cf.crowd).length} pass`)}<div class="crowd">${arr(cf.crowd).map(x=>{const k=x.status==="pass"||x.status==="likely"?"good":x.status==="fail"?"bad":"warn";return `<div class="ct"><span class="pill ${k}">${ic(k==="good"?"check":k==="bad"?"x":"help")}${esc((x.status||"unknown").replace(/^./,m=>m.toUpperCase()))}</span><h5>${esc(x.test)}</h5><p>${esc(x.note||"")}</p></div>`}).join("")}</div></div>`:""}
   ${arr(cf.words).length?`<div class="sec" data-pdf>${secH("chat","In their words","Use these in hooks and titles")}<div class="tw"><table><thead><tr><th>What they say</th><th>What they mean</th><th>What they never say out loud</th></tr></thead><tbody>${arr(cf.words).map(w=>`<tr><td class="k">"${esc(w.says)}"</td><td>${esc(w.means||"")}</td><td>${esc(w.unsaid||"")}${w.unsaid?tbc(w.confirm):""}</td></tr>`).join("")}</tbody></table></div></div>`:""}
   <div class="sec grid2" data-pdf>
    ${cf.wants?`<div>${secH("layers","What they want")}<div class="iceberg"><div class="ice-top"><b>On the surface</b><div class="rchips">${arr(cf.wants.surface).map(x=>`<span class="rchip">${esc(x)}</span>`).join("")}</div></div><div class="ice-water"><span>Underneath</span></div><div class="ice-low"><b>What they really want</b><div class="rchips">${arr(cf.wants.underneath).map(x=>`<span class="rchip">${esc(x)}</span>`).join("")}</div></div></div>${cf.wants.from&&cf.wants.to?`<div class="identity"><span class="from">${esc(cf.wants.from)}</span>${ic("arrow")}<span class="to">${esc(cf.wants.to)}</span></div>`:""}</div>`:""}
    ${arr(cf.notFor).length?`<div>${secH("ban","Who this is not for")}<div class="rcard"><ul class="rlist no">${arr(cf.notFor).map(x=>`<li>${ic("x")}${esc(x)}</li>`).join("")}</ul></div></div>`:""}
   </div>
   ${arr(cf.oldWay).length?`<div class="sec" data-pdf>${secH("flag","The old way, and why it fails","Your villains")}<div class="tw"><table><thead><tr><th>What they try first</th><th>Why it fails</th></tr></thead><tbody>${arr(cf.oldWay).map(x=>`<tr><td><span class="x">${ic("x")}${esc(x.tried)}</span></td><td>${esc(x.fails)}</td></tr>`).join("")}</tbody></table></div></div>`:""}
  </section>

  <section id="r-edge" class="chapter">
   <div class="ch-head" data-pdf data-pdf-break><div class="ch-letter">E</div><div><span class="eyebrow">Edge · ${e.pct} · ${e.v}</span><h2>Why you, and nobody else?</h2><p>${esc(ef.headline||"")}</p></div></div>
   ${ef.statement?`<div class="sec" data-pdf><div class="glasscard"><span class="eyebrow" style="display:block;margin-bottom:14px">Your Edge statement</span><p class="statement">"${hi(ef.statement,ef.highlight)}"</p></div></div>`:""}
   ${ef.story?`<div class="sec" data-pdf>${secH("compass","Your guide story","They're the hero. You're the guide.")}<div class="timeline">
     <div class="tl"><div class="dot">${ic("scar")}</div><h5>The scar</h5><p>${esc(ef.story.scar||"")}</p></div>
     <div class="tl${ef.story.turn?"":" missing"}"><div class="dot">${ic(ef.story.turn?"compass":"help")}</div><h5>The turn${ef.story.turn?"":' <span class="tbc">Missing</span>'}</h5><p>${esc(ef.story.turn||"The moment it changed for you is your strongest story. Tell us in the questions below.")}</p></div>
     <div class="tl"><div class="dot">${ic("star")}</div><h5>Now</h5><p>${esc(ef.story.now||"")}</p></div></div></div>`:""}
   ${arr(ef.combo).length?`<div class="sec" data-pdf>${secH("target","Your unfair combination")}<div class="tw"><table><thead><tr><th>Lane</th><th>Who usually owns it</th><th>What you bring that they can't</th></tr></thead><tbody>${arr(ef.combo).map(x=>`<tr><td class="k">${esc(x.lane)}</td><td>${esc(x.owner)}</td><td>${esc(x.edge)}</td></tr>`).join("")}</tbody></table></div></div>`:""}
   ${arr(ef.hills).length?`<div class="sec" data-pdf>${secH("flag","Hills you'd die on","Contrarian truths")}<div class="truths">${arr(ef.hills).map(h=>`<div class="truth">${ic("quote")}<p>${esc(h)}</p></div>`).join("")}</div></div>`:""}
   ${ef.trust?`<div class="sec" data-pdf>${secH("trend","Your trust profile")}<div class="glasscard spectrum"><div class="sp-track"><div class="sp-mark" style="left:${trustPos}%"><span>You today</span></div><div class="sp-goal"></div></div><div class="sp-labels"><div>Stranger<small>Unknown. More doubts than assurances.</small></div><div>Politician<small>Respected, certified, nobody hands over money.</small></div><div>Spiderman<small>Known and loved for saving the day.</small></div></div><p class="sp-note">${esc(ef.trust.note||"")}</p></div></div>`:""}
  </section>

  <section id="r-offer" class="chapter">
   <div class="ch-head" data-pdf data-pdf-break><div class="ch-letter">O</div><div><span class="eyebrow">Offer · ${o.pct}${os.pct>o.pct?` → ${os.pct}`:""} · ${esc(offerPill)}</span><h2>What does the trust turn into?</h2><p>${esc(of.headline||"")}</p></div></div>
   ${of.offer?`<div class="sec" data-pdf><div class="rpromise"><span class="eyebrow">The sharpened offer</span><div class="nm">${esc(of.offer.name||"")}</div><p class="tag">${esc(of.offer.subtitle||"")}</p><p class="big">${esc(of.offer.promise||"")}</p>${of.offer.notPromised?`<p class="not">${ic("ban")}Not promised: ${esc(of.offer.notPromised)}</p>`:""}</div></div>`:""}
   <div class="sec" data-pdf>${secH("trend","From draft to sharpened",`${arr(of.signals).length} offer signals`)}<div class="glasscard"><div class="legend"><span><i class="sw" style="background:var(--s-draft);border-radius:50%"></i>Draft</span><span><i class="sw" style="background:var(--s-sharp);border-radius:50%"></i>Sharpened</span></div>
    ${arr(of.signals).map(s=>{const d=+s.draft||0,sh=+s.sharp||0,L=v=>v/2*100,lo=Math.min(d,sh),hiv=Math.max(d,sh);return `<div class="dumb-row" tabindex="0" data-tip="${esc(s.id+" · "+s.name)}" data-ev="${esc(s.evidence||"")}" aria-label="${esc(`${s.id} ${s.name}: draft ${d}, sharpened ${sh}`)}"><span class="id">${esc(s.id)}</span><span class="nm">${esc(s.name)}</span><div class="dumb"><span class="ln"></span><span class="tick" style="left:50%"></span>${hiv>lo?`<span class="gain" style="left:${L(lo)}%;width:${L(hiv)-L(lo)}%"></span>`:""}${d!==sh?`<span class="pt d" style="left:${L(d)}%"></span>`:""}<span class="pt s" style="left:${L(sh)}%"></span></div><span class="v">${d===sh?`<b>${sh}</b>`:`${d} → <b>${sh}</b>`}</span></div>`}).join("")}
    <div class="dumb-axis" aria-hidden="true"><div></div><div></div><div><span>0</span><span>1</span><span>2</span></div><div></div></div>
    <div class="totals"><div class="tot d"><b>${o.pct}</b><span>Draft · ${o.v}</span></div>${ic("arrow")}<div class="tot s"><b>${os.pct}</b><span>Sharpened · ${os.v}</span></div></div></div></div>
   ${arr(of.levers).length?`<div class="sec" data-pdf>${secH("calc","The value equation","Push the top up, the bottom down")}<div class="levers">${arr(of.levers).map(l=>`<div class="lever ${l.dir==="down"?"dn":"up"}"><div class="lh"><span class="arr">${ic(l.dir==="down"?"down":"up","width:14px;height:14px")}</span>${esc(l.lever)}</div><div class="row d"><span>Draft</span><span>${esc(l.draft||"")}</span></div><div class="row s"><span>Sharpened</span><span>${esc(l.sharp||"")}</span></div></div>`).join("")}</div></div>`:""}
   ${arr(of.phases).length?`<div class="sec" data-pdf>${secH("clock","How it runs")}<div class="weeks" style="grid-template-columns:repeat(${Math.min(4,arr(of.phases).length)},minmax(0,1fr))">${arr(of.phases).map((p,i)=>`<div class="wk"><span class="letter">${i+1}</span><span class="wn">${esc(p.label||"")}</span><h5>${esc(p.title||"")}</h5><p>${esc(p.focus||"")}</p>${p.win?`<q>${esc(p.win)}</q>`:""}</div>`).join("")}</div></div>`:""}
   ${arr(of.ladder).length?`<div class="sec" data-pdf>${secH("layers","The offer ladder","One ask per step")}<div class="ladder">${arr(of.ladder).map(l=>`<div class="lstep"><span class="lvl">${esc(l.level||"")}</span><h5>${esc(l.name||"")}</h5><p>${esc(l.desc||"")}</p><span class="price">${esc(l.price||"To set")}</span>${l.ask?`<span class="ask">${ic("chat","width:14px;height:14px")}${esc(l.ask)}</span>`:""}</div>`).join("")}</div></div>`:""}
   ${arr(of.names).length?`<div class="sec" data-pdf>${secH("star","Name shortlist")}<div class="names">${arr(of.names).map((n,i)=>`<div class="nm-card${i===0?" rec":""}"><span class="use">${esc(n.use||"")}</span><h5>${esc(n.name||"")}</h5><p>${esc(n.why||"")}</p></div>`).join("")}</div></div>`:""}
  </section>

  <section id="r-next" class="chapter">
   <div class="ch-head" data-pdf data-pdf-break><div class="ch-letter arrow">${ic("arrow","width:34px;height:34px")}</div><div><span class="eyebrow">Next steps</span><h2>What would make this Strong</h2><p>Answer these and your scores move.${top.size?" The highlighted questions matter most.":""}</p></div></div>
   ${gapsAll.length?`<div class="sec" data-pdf><ol class="gaps">${gapsAll.map((g,i)=>`<li class="${top.has(i)?"top":""}"><span class="gn">${i+1}</span><div><b>${esc(g.title||g.signal)}</b><p>${esc(g.question)}</p><span class="gsig">${esc(g.signal)}</span></div></li>`).join("")}</ol></div>`:""}
   <div class="cta" data-pdf><div><span class="eyebrow">Coming from Block Ten</span><h3>Your full Brand & Content Strategy Report</h3><p>We take this framework and add verified competitor research, your content pillars and a 13-week long-form roadmap.</p><div class="rchips" style="margin-top:14px"><span class="rchip">Competitor research</span><span class="rchip">Content pillars</span><span class="rchip">13-week roadmap</span></div></div></div>
  </section>`;
}
let navSpy=null;
function renderFramework(){
  const r=document.getElementById("results");if(!r)return;
  const f=S.framework;
  if(STEPS[step].id!=="gen"||!f||!canSeeResults()){r.hidden=true;r.innerHTML="";return}
  if(f.v!==2){r.hidden=false;r.innerHTML=`<div class="callout">This framework was saved in an older format. Ask Block Ten to refresh it.</div>`;return}
  r.hidden=false;r.innerHTML=renderResults(f);
  const links=[...r.querySelectorAll(".nav a")],secs=links.map(a=>r.querySelector(a.getAttribute("href")));
  navSpy=()=>{let cur=0;secs.forEach((s,i)=>{if(s&&s.getBoundingClientRect().top<140)cur=i});links.forEach((a,i)=>a.classList.toggle("on",i===cur))};navSpy();
  links.forEach(a=>a.addEventListener("click",ev=>{ev.preventDefault();const t=r.querySelector(a.getAttribute("href"));if(t)t.scrollIntoView({behavior:"smooth",block:"start"})}));
  const pb=document.getElementById("pdfBtn");if(pb){if(isAdmin)pb.addEventListener("click",exportPdf);else pb.remove()}
}
window.addEventListener("scroll",()=>{if(navSpy)navSpy()},{passive:true});
// evidence tooltip
(function(){const tip=document.createElement("div");tip.className="rtip";tip.hidden=true;document.body.appendChild(tip);
  function show(el,x,y){tip.innerHTML=`<b>${el.dataset.tip}</b>${el.dataset.ev}`;tip.hidden=false;const w=tip.offsetWidth,h=tip.offsetHeight;tip.style.left=Math.max(12,Math.min(window.innerWidth-w-12,x+14))+"px";tip.style.top=Math.max(12,y-h-14)+"px"}
  document.addEventListener("pointermove",e=>{const el=e.target.closest&&e.target.closest("#results [data-tip]");if(el)show(el,e.clientX,e.clientY);else tip.hidden=true});
  document.addEventListener("focusin",e=>{const el=e.target.closest&&e.target.closest("#results [data-tip]");if(el){const b=el.getBoundingClientRect();show(el,b.left+b.width/2,b.top)}});
  document.addEventListener("focusout",()=>{tip.hidden=true});})();

// ---------- PDF export: each block is rendered on its own and packed onto A4 pages; blocks never split unless taller than a page, and then only between rows ----------
const LIBS=["https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js","https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"];
function loadScript(src){return new Promise((res,rej)=>{const ex=document.querySelector(`script[src="${src}"]`);if(ex&&ex.dataset.loaded)return res();const s=ex||document.createElement("script");s.src=src;s.onload=()=>{s.dataset.loaded="1";res()};s.onerror=()=>rej(new Error("load"));if(!ex)document.head.appendChild(s)})}
const CUTS="tr,li,.fact,.ct,.wk,.lstep,.lever,.truth,.nm-card,.sc-row,.sc-group,.pk,.tl,.dumb-row,.rchips,.levers>div,.facts>div,.legend,.totals,p,h4";
function inlineSvg(doc){const win=doc.defaultView;doc.querySelectorAll("#results svg").forEach(svg=>{const b=svg.getBoundingClientRect();if(b.width){svg.setAttribute("width",b.width);svg.setAttribute("height",b.height)}
  [svg,...svg.querySelectorAll("*")].forEach(n=>{const cs=win.getComputedStyle(n);["stroke","fill","stroke-width","stroke-linecap","stroke-linejoin","stroke-opacity","opacity"].forEach(p=>{if(!n.hasAttribute(p)){const v=cs.getPropertyValue(p);if(v)n.setAttribute(p,v)}})})})}
async function exportPdf(){
  const btn=document.getElementById("pdfBtn"),st=document.getElementById("pdfStatus");
  const say=(t,err)=>{st.hidden=false;st.textContent=t;st.classList.toggle("err",!!err)};
  btn.disabled=true;say("Preparing your PDF…");
  try{
    for(const u of LIBS)await loadScript(u);
    const {jsPDF}=window.jspdf;const pdf=new jsPDF({unit:"mm",format:"a4",orientation:"portrait",compress:true});
    const W=210,H=297,M=14,TOP=22,BOT=282,CW=W-2*M,CH=BOT-TOP,GAP=5;
    const bg=()=>{pdf.setFillColor(0,0,0);pdf.rect(0,0,W,H,"F")};bg();
    let y=TOP;const newPage=()=>{pdf.addPage();bg();y=TOP};
    const blocks=[...document.querySelectorAll("#results [data-pdf]")].filter(b=>b.offsetHeight);
    for(let i=0;i<blocks.length;i++){
      say(`Building page sections ${i+1} of ${blocks.length}…`);
      const el=blocks[i];el.dataset.pdfId=String(i);let cuts=[],cssW=0;
      const canvas=await window.html2canvas(el,{scale:2,backgroundColor:"#000000",windowWidth:1100,logging:false,useCORS:true,
        onclone:doc=>{doc.documentElement.classList.add("pdf-mode");inlineSvg(doc);const c=doc.querySelector(`[data-pdf-id="${i}"]`);if(!c)return;const t=c.getBoundingClientRect().top;cssW=c.getBoundingClientRect().width;
          cuts=[...c.querySelectorAll(CUTS)].map(n=>n.getBoundingClientRect().bottom-t).filter(v=>v>8).sort((a,b)=>a-b)}});
      const pxPerMm=canvas.width/CW,hMm=canvas.height/pxPerMm,k=cssW?canvas.width/cssW:2,cutPx=[...new Set(cuts.map(v=>Math.round(v*k)))];
      if(el.hasAttribute("data-pdf-break")&&y>TOP)newPage();
      if(hMm<=BOT-y){pdf.addImage(canvas.toDataURL("image/jpeg",.92),"JPEG",M,y,CW,hMm);y+=hMm+GAP;
        if(el.classList.contains("ch-head")&&BOT-y<60)newPage();continue}
      if(hMm<=CH){newPage();pdf.addImage(canvas.toDataURL("image/jpeg",.92),"JPEG",M,y,CW,hMm);y+=hMm+GAP;continue}
      if(BOT-y<CH*.4)newPage();
      let start=0;
      while(start<canvas.height-2){
        const avail=Math.floor((BOT-y)*pxPerMm);let end=Math.min(canvas.height,start+avail);
        if(end<canvas.height){const ok=cutPx.filter(v=>v>start+60&&v<=end);if(ok.length)end=ok[ok.length-1]}
        const part=document.createElement("canvas");part.width=canvas.width;part.height=end-start;part.getContext("2d").drawImage(canvas,0,start,canvas.width,end-start,0,0,canvas.width,end-start);
        const pm=(end-start)/pxPerMm;pdf.addImage(part.toDataURL("image/jpeg",.92),"JPEG",M,y,CW,pm);y+=pm+GAP;start=end;
        if(start<canvas.height-2)newPage();
      }
    }
    const n=pdf.getNumberOfPages(),logo=document.querySelector(".brand img"),name=(S.client.name||"Your brand").toUpperCase();
    for(let p=1;p<=n;p++){pdf.setPage(p);
      if(logo){try{pdf.addImage(logo,"PNG",M,8.5,6,6)}catch(e){}}
      pdf.setFont("helvetica","bold");pdf.setFontSize(7.5);pdf.setTextColor(255,255,255);pdf.text("BLOCK TEN STRATEGY",M+8,12.6);
      pdf.setTextColor(191,123,203);pdf.text(`CEO FRAMEWORK · ${name}`,W-M,12.6,{align:"right"});
      pdf.setDrawColor(60,50,64);pdf.setLineWidth(.2);pdf.line(M,17,W-M,17);
      pdf.setFont("helvetica","normal");pdf.setFontSize(7.5);pdf.setTextColor(140,132,146);pdf.text("blocktenstrategy.com",M,290);pdf.text(`${p} / ${n}`,W-M,290,{align:"right"});
    }
    const blob=pdf.output("blob"),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`CEO-Framework-${slug(S.client.name)}.pdf`;document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);say("Downloaded.");
  }catch(err){
    say(err&&err.message==="load"?"Couldn't load the PDF tools. Check your connection and try again.":"The PDF couldn't be built. Try again in a moment.",true);
  }finally{btn.disabled=false;document.querySelectorAll("#results [data-pdf-id]").forEach(b=>b.removeAttribute("data-pdf-id"))}
}

function briefText(){
  const s=S.simba,o=S.offer,L=[];const line=(k,v)=>{if(has(v))L.push(`- ${k}: ${String(v).trim()}`)};
  L.push(`# Brief: ${S.client.name||"Client"}`,`Brand: ${S.client.brand||"-"} · Platforms: ${Object.keys(S.client.platforms||{}).filter(k=>S.client.platforms[k]).join(", ")||S.client.platform||"-"}`,"","## Customer (Simba profile)");
  line("Person",s.person);line("Situation",s.situation);line("Problem",s.problem);line("Cost",s.cost);
  line("Their words",s.words);line("Belief keeping them stuck",s.belief);line("Old way",s.oldway);line("Fear",s.fear);line("Simba wins (a Tuesday)",s.tuesday);line("Not for",s.notfor);
  L.push("","## Edge");line("What sets me apart",S.edge.apart);S.beliefs.filter(r=>has(r.text)).forEach(r=>line("Hill I'd die on",r.text));S.competitors.filter(r=>has(r.name)).forEach(r=>line("Competitor",r.name+(has(r.url)?` (${r.url})`:"")));S.certs.filter(r=>has(r.name)).forEach(r=>L.push(`- Certification: ${r.name}${has(r.issuer)?`, ${r.issuer}`:""}${has(r.year)?` (${r.year})`:""}`));
  S.awards.filter(r=>has(r.name)).forEach(r=>L.push(`- Award/press: ${r.name}${has(r.by)?`, ${r.by}`:""}${has(r.year)?` (${r.year})`:""}`));
  S.testimonials.filter(r=>has(r.quote)).forEach(r=>L.push(`- Testimonial: "${r.quote.trim()}" (${r.who||"unnamed"}${has(r.result)?`; result: ${r.result}`:""}; ${r.permission?"OK to name":"do not name yet"})`));
  S.interviews.filter(r=>has(r.name)).forEach(r=>L.push(`- Interview: ${r.name}${has(r.company)?`, ${r.company}`:""}${has(r.email)?` | ${r.email}`:""}`));
  L.push("","## Offer (value equation)");line("Name",o.name);line("Price",o.price);line("Dream outcome",o.outcome);line("Quick win",has(o.quickwin)?o.quickwin+(has(o.quickwinTime)?` (${o.quickwinTime})`:""):"");line("Time delay",has(o.delayNum)?`${o.delayNum} ${o.delayUnit||"weeks"}`:"");L.push(`- Client effort: ${o.effort??5}/10`);
  return L.join("\n");
}
document.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.id==="submitBtn")submitIntake();
  if(b.id==="briefBtn"){const t=briefText(),box=document.getElementById("briefOut"),ta=document.getElementById("briefText"),msg=document.getElementById("genMsg");ta.value=t;box.hidden=false;
    const fallback=()=>{ta.focus();ta.select();msg.className="gen-msg";msg.textContent="Selected. Press Cmd+C or Ctrl+C to copy."};
    try{navigator.clipboard.writeText(t).then(()=>{msg.className="gen-msg";msg.textContent="Brief copied."},fallback)}catch(err){fallback()}}
});


// ---------- background node network, with scroll parallax ----------
(function(){
  const c=document.getElementById("net");if(!c||!c.getContext)return;const x=c.getContext("2d");
  const still=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const RATE=.05, EXTRA=.35, EASE=.08; // drifts at 5% of scroll speed and eases toward its target each frame, so it glides instead of stepping
  let H=window.innerHeight;
  function draw(){
    const dpr=Math.min(window.devicePixelRatio||1,2),w=window.innerWidth;H=window.innerHeight;const h=Math.round(H*(1+EXTRA));
    c.style.height=h+"px";c.width=w*dpr;c.height=h*dpr;x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
    let seed=7;const r=()=>(seed=(seed*16807)%2147483647)/2147483647;
    const pts=[];const n=Math.round(Math.min(110,w*h/22000));
    for(let i=0;i<n;i++){const px=w*(.35+.65*Math.pow(r(),.7)),py=h*r();pts.push([px,py,r()])}
    x.lineWidth=1;
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const dx=pts[i][0]-pts[j][0],dy=pts[i][1]-pts[j][1],d=Math.hypot(dx,dy);if(d<170){x.strokeStyle=`rgba(191,123,203,${.16*(1-d/170)})`;x.beginPath();x.moveTo(pts[i][0],pts[i][1]);x.lineTo(pts[j][0],pts[j][1]);x.stroke()}}
    pts.forEach(p=>{x.fillStyle=p[2]>.6?"rgba(191,123,203,.45)":"rgba(255,255,255,.14)";x.beginPath();x.arc(p[0],p[1],2.5+p[2]*2.5,0,Math.PI*2);x.fill()});
    place();
  }
  let cur=0,running=false;
  function target(){const max=H*EXTRA,t=(window.scrollY||0)*RATE;return -(max*Math.tanh(t/max))} // soft limit: slows into the edge instead of stopping hard
  function frame(){
    const tg=target();cur+=(tg-cur)*EASE;
    if(Math.abs(tg-cur)<.05){cur=tg;running=false}else requestAnimationFrame(frame);
    c.style.transform=`translate3d(0,${cur.toFixed(2)}px,0)`;
  }
  function place(){if(still)return;if(!running){running=true;requestAnimationFrame(frame)}}
  window.addEventListener("scroll",place,{passive:true});
  draw();let t;window.addEventListener("resize",()=>{clearTimeout(t);t=setTimeout(draw,150)});
})();

// ---------- boot ----------
(function boot(){
  step=CFG.forceStep?Math.max(0,STEPS.findIndex(x=>x.id===CFG.forceStep)):Math.min(+(ls(()=>sessionStorage.getItem(STEP_KEY))||0)||0,STEPS.length-1);
  const has0=CFG.intake&&Object.keys(CFG.intake).length>0;
  S=normalize(CFG.intake||{});
  if(!S.committed&&!CFG.forceStep)step=0;
  renderRail();renderMain();tick();
  setStatus(has0?"Saved":"Not saved yet",has0);
  window.addEventListener("pagehide",()=>{if(dirty){try{fetch(CFG.intakeUrl,{method:"PUT",keepalive:true,headers:{"Content-Type":"application/json"},body:JSON.stringify(S)})}catch(e){}}});
})();
})();
