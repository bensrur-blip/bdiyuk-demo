/* "בדיוק זה" – גרסת הדגמה עצמאית.
   מחליף את window.claude במסד נתונים מקומי: הקטלוג והתמונות נטענים מ-data/seed.json,
   וכל מה שהבודק משנה נשמר רק בדפדפן שלו (localStorage). אין שיתוף בין מכשירים. */
(function(){
const LS="bdiyuk-demo-v1", ME="me";
let overlay={};
try{overlay=JSON.parse(localStorage.getItem(LS)||"{}")||{}}catch(e){overlay={}}
const STARTER={"lists/main/items":{
  d1:{pid:"s00",qty:2,at:1,by:ME,urgent:true,note:"הקרטון הכחול"},
  d2:{pid:"s02",qty:1,at:2,by:ME},
  d3:{pid:"s05",qty:1,at:3,by:ME},
  d4:{pid:"s13",qty:1,at:4,by:ME},
  d5:{pid:"s26",qty:1,at:5,by:ME}}};
if(!overlay.__init){overlay=Object.assign({__init:1},STARTER);save()}
function save(){try{localStorage.setItem(LS,JSON.stringify(overlay))}catch(e){console.warn("demo storage full",e)}}

let base={};
const ready=fetch("seed.json").then(r=>r.json()).then(j=>{base=j}).catch(()=>{base={}});

const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
function docsOf(path){
  const out=Object.assign({},base[path]||{});
  const ov=overlay[path]||{};
  for(const k in ov){if(ov[k]===null)delete out[k];else out[k]=ov[k]}
  return out;
}
function getDoc(path){const i=path.lastIndexOf("/");return docsOf(path.slice(0,i))[path.slice(i+1)]}
const listeners=new Set();
function notify(){for(const l of [...listeners])l.fire(true)}
function write(path,val){
  const i=path.lastIndexOf("/");const c=path.slice(0,i),id=path.slice(i+1);
  (overlay[c]=overlay[c]||{})[id]=val===undefined?null:clone(val);
  save();setTimeout(notify,0);
}
const snap=(id,d,pending)=>({id,exists:d!=null,data:()=>clone(d),ref:{id},metadata:{fromCache:false,hasPendingWrites:!!pending}});

function query(path,opts){
  opts=opts||{};
  const q={
    orderBy:(f,dir)=>query(path,Object.assign({},opts,{f,dir})),
    limit:n=>query(path,Object.assign({},opts,{n})),
    where:()=>q,
    doc:id=>docRef(path+"/"+id),
    get:async()=>{await ready;return build(null,false).s},
    onSnapshot:(next,err)=>{
      const l={prev:null,fire:pending=>{const r=build(l.prev,pending);l.prev=r.map;try{next(r.s)}catch(e){console.error(e)}}};
      ready.then(()=>{listeners.add(l);l.fire(false)});
      return ()=>listeners.delete(l);
    }
  };
  function build(prev,pending){
    const all=docsOf(path);let ids=Object.keys(all);
    if(opts.f){const f=opts.f,s=opts.dir==="desc"?-1:1;ids.sort((a,b)=>{const x=all[a][f],y=all[b][f];return (x>y?1:x<y?-1:0)*s})}
    if(opts.n)ids=ids.slice(0,opts.n);
    const map={};for(const id of ids)map[id]=JSON.stringify(all[id]);
    const docs=ids.map(id=>snap(id,all[id],pending));
    const ch=[];
    if(prev){for(const id of ids){if(!(id in prev))ch.push({type:"added",doc:snap(id,all[id],pending)});else if(prev[id]!==map[id])ch.push({type:"modified",doc:snap(id,all[id],pending)})}
      for(const id in prev)if(!(id in map))ch.push({type:"removed",doc:snap(id,JSON.parse(prev[id]),pending)})}
    else for(const id of ids)ch.push({type:"added",doc:snap(id,all[id],pending)});
    return {map,s:{docs,size:docs.length,empty:!docs.length,docChanges:()=>ch,metadata:{fromCache:false,hasPendingWrites:!!pending}}};
  }
  return q;
}
function docRef(path){
  const i=path.lastIndexOf("/");const id=path.slice(i+1);
  return {id,path,
    get:async()=>{await ready;return snap(id,getDoc(path))},
    set:async(d,o)=>{await ready;write(path,o&&o.merge?Object.assign({},getDoc(path)||{},d):d)},
    update:async d=>{await ready;write(path,Object.assign({},getDoc(path)||{},d))},
    delete:async()=>{await ready;write(path,undefined)},
    onSnapshot:(next)=>{let last;const l={fire:p=>{const v=JSON.stringify(getDoc(path)??null);if(v===last)return;last=v;try{next(snap(id,getDoc(path),p))}catch(e){console.error(e)}}};ready.then(()=>{listeners.add(l);l.fire(false)});return ()=>listeners.delete(l)}
  };
}
const db={collection:p=>query(p),doc:p=>docRef(p)};
const user={id:async()=>ME,isOwner:async()=>true,can:async()=>true,
  profiles:async ids=>Object.fromEntries(ids.map(i=>[i,{id:i,name:i===ME?"אני":"בן/בת הזוג"}]))};
window.claude={use:async n=>n==="db"?db:n==="user"?user:null};
window.__demoReset=()=>{try{localStorage.removeItem(LS)}catch(e){}location.reload()};
})();
