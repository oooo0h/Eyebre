/* Touch gestures for the image reader, including older Android WebViews. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.EyebreReadingGestures=factory();})(this,function(){
  function install(surface,options){
    var pan=null,pinch=null,momentum=0,frame=0,queued=null,mouse=false,velocity={x:0,y:0};
    var request=options.requestFrame||requestAnimationFrame,cancel=options.cancelFrame||cancelAnimationFrame;
    var now=options.now||function(){return Date.now();};
    function prevent(event){if(event.cancelable!==false)event.preventDefault();}
    function point(touch){var rect=surface.getBoundingClientRect();return{x:touch.clientX-rect.left,y:touch.clientY-rect.top};}
    function pair(touches){var a=point(touches[0]),b=point(touches[1]);return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.sqrt(Math.pow(a.x-b.x,2)+Math.pow(a.y-b.y,2))};}
    function stop(){if(momentum)cancel(momentum);momentum=0;velocity.x=velocity.y=0;}
    function apply(value,anchor,focal){var result=options.setZoom(value);options.restoreAnchor(anchor,focal);return result;}
    function zoomTo(value,focal){stop();focal=focal||{x:surface.clientWidth/2,y:surface.clientHeight/2};var result=apply(value,options.captureAnchor(focal),focal);if(options.onSettled)options.onSettled();return result;}
    function flush(){frame=0;if(queued){var move=queued;queued=null;apply(move.zoom,move.anchor,move.focal);}}
    function beginPan(touch){var p=point(touch);pan={x:p.x,y:p.y,time:now()};velocity.x=velocity.y=0;}
    function beginPinch(touches){var p=pair(touches);pinch={distance:Math.max(1,p.distance),zoom:options.getZoom(),anchor:options.captureAnchor(p)};pan=null;}
    function movePan(touch){
      if(!pan){beginPan(touch);return;}
      var p=point(touch),time=now(),dt=Math.max(8,time-pan.time),dx=pan.x-p.x,dy=pan.y-p.y;
      surface.scrollLeft+=dx;surface.scrollTop+=dy;
      velocity.x=.55*velocity.x+.45*dx/dt;velocity.y=.55*velocity.y+.45*dy/dt;pan={x:p.x,y:p.y,time:time};
    }
    function coast(){
      var last=now();
      function step(){var time=now(),dt=Math.min(32,Math.max(1,time-last));last=time;
        var oldX=surface.scrollLeft,oldY=surface.scrollTop;surface.scrollLeft+=velocity.x*dt;surface.scrollTop+=velocity.y*dt;
        var decay=Math.pow(.94,dt/16);velocity.x*=decay;velocity.y*=decay;
        if(surface.scrollLeft===oldX)velocity.x=0;if(surface.scrollTop===oldY)velocity.y=0;
        if(Math.abs(velocity.x)+Math.abs(velocity.y)>.025)momentum=request(step);else momentum=0;
      }
      momentum=request(step);
    }
    surface.addEventListener('touchstart',function(event){prevent(event);stop();if(event.touches.length>=2)beginPinch(event.touches);else if(event.touches.length===1)beginPan(event.touches[0]);},{passive:false});
    surface.addEventListener('touchmove',function(event){
      prevent(event);
      if(event.touches.length>=2){if(!pinch)beginPinch(event.touches);var p=pair(event.touches);queued={zoom:pinch.zoom*p.distance/pinch.distance,anchor:pinch.anchor,focal:p};if(!frame)frame=request(flush);}
      else if(event.touches.length===1){if(pinch){if(frame){cancel(frame);flush();}pinch=null;beginPan(event.touches[0]);}else movePan(event.touches[0]);}
    },{passive:false});
    function end(event){
      if(frame){cancel(frame);flush();}
      if(event.touches.length>=2){beginPinch(event.touches);return;}
      if(event.touches.length===1){pinch=null;beginPan(event.touches[0]);return;}
      var canCoast=pan&&now()-pan.time<100;pan=pinch=null;if(options.onSettled)options.onSettled();if(canCoast)coast();
    }
    surface.addEventListener('touchend',end,{passive:false});
    surface.addEventListener('touchcancel',function(){stop();if(frame){cancel(frame);flush();}pan=pinch=null;if(options.onSettled)options.onSettled();},{passive:false});
    surface.addEventListener('mousedown',function(event){if(event.button!==0||event.target.tagName==='BUTTON')return;prevent(event);stop();mouse=true;beginPan(event);surface.classList.add('is-dragging');});
    var target=options.eventTarget||window;
    target.addEventListener('mousemove',function(event){if(mouse){prevent(event);movePan(event);}});
    target.addEventListener('mouseup',function(){if(mouse){mouse=false;pan=null;surface.classList.remove('is-dragging');if(options.onSettled)options.onSettled();}});
    surface.addEventListener('wheel',stop,{passive:true});
    return{zoomTo:zoomTo,stop:stop};
  }
  return install;
});
