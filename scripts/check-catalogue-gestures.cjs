/* Gesture regression checks without a browser dependency. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const sandbox={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/catalogue-gestures.js'),'utf8'),sandbox);
const install=sandbox.module.exports;
function fixture(){
 const events={},globalEvents={},frames=new Map();let id=0,time=0,zoom=1;
 const surface={clientWidth:400,clientHeight:700,scrollLeft:0,scrollTop:600,classList:{add(){},remove(){}},getBoundingClientRect(){return{left:0,top:40};},addEventListener(name,fn){events[name]=fn;}};
 const options={eventTarget:{addEventListener(name,fn){globalEvents[name]=fn;}},now:()=>time,requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:n=>frames.delete(n),getZoom:()=>zoom,setZoom:value=>(zoom=Math.max(.75,Math.min(6,value))),captureAnchor:p=>({x:(surface.scrollLeft+p.x)/zoom,y:(surface.scrollTop+p.y)/zoom}),restoreAnchor:(a,p)=>{surface.scrollLeft=a.x*zoom-p.x;surface.scrollTop=a.y*zoom-p.y;}};
 const gestures=install(surface,options);
 function touch(name,points){time+=16;let prevented=false;events[name]({touches:points.map(([x,y])=>({clientX:x,clientY:y})),cancelable:true,preventDefault(){prevented=true;}});return prevented;}
 function flush(){const queued=[...frames.values()];frames.clear();queued.forEach(fn=>fn());}
 return{surface,gestures,touch,flush,zoom:()=>zoom,events,globalEvents};
}
{
 const f=fixture();assert(f.touch('touchstart',[[100,240],[200,240]]));f.touch('touchmove',[[50,240],[250,240]]);f.flush();
 assert.equal(f.zoom(),2);assert.equal(f.surface.scrollLeft,150);assert.equal(f.surface.scrollTop,1400);
 f.touch('touchend',[[250,240]]);const before=f.surface.scrollLeft;f.touch('touchmove',[[190,240]]);assert.equal(f.surface.scrollLeft,before+60,'One-finger pan continues after pinch');
 f.touch('touchmove',[[220,240]]);assert.equal(f.surface.scrollLeft,before+30,'Pan reverses horizontally');
 f.touch('touchcancel',[]);
}
{
 const f=fixture();f.gestures.zoomTo(100,{x:200,y:300});assert.equal(f.zoom(),6);f.gestures.zoomTo(.1,{x:200,y:300});assert.equal(f.zoom(),.75);
}
{
 const f=fixture();f.gestures.zoomTo(2,{x:200,y:300});const before=f.surface.scrollLeft;
 f.events.mousedown({button:0,target:{tagName:'IMG'},clientX:300,clientY:300,cancelable:true,preventDefault(){}});
 f.globalEvents.mousemove({clientX:150,clientY:300,cancelable:true,preventDefault(){}});
 assert.equal(f.surface.scrollLeft,before+150);f.globalEvents.mouseup();
}
console.log('PASS: anchored pinch, post-pinch horizontal pan in both directions, zoom limits, mouse drag');
