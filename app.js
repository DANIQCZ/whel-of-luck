(function(){
  const canvas = document.getElementById('wheel');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth; // after CSS applied
  function resizeCanvas(){
    const size = canvas.clientWidth; // square
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    draw();
  }
  new ResizeObserver(resizeCanvas).observe(canvas);

  const textarea = document.getElementById('entries');
  const entryCountEl = document.getElementById('entryCount');
  const btnShuffle = document.getElementById('btnShuffle');
  const btnSort = document.getElementById('btnSort');
  const btnClear = document.getElementById('btnClear');
  const btnSpin = document.getElementById('btnSpin');
  const resultsEl = document.getElementById('results');
  const btnClearResults = document.getElementById('btnClearResults');
  const guaranteedInput = document.getElementById('guaranteed');
  const autoAddCb = document.getElementById('autoAdd');
  const soundToggle = document.getElementById('soundToggle');
  const tick = document.getElementById('tickSound');
  const overlay = document.querySelector('.overlay-hint');

  let items = [
    'CS','CS','CS','Rakashu','KAJINKA','NEPORAZITELNY','CS','NIKOLKA','CS','Rakashu','SKULL'
  ];
  textarea.value = items.join('\n');
  updateCount();

  let rotation = 0; // radians, positive is clockwise
  let spinning = false;
  let lastTickIndex = -1; // for click sound

  const colors = ['#facc15','#1d4ed8','#ef4444','#10b981','#f59e0b','#3b82f6','#ef4444','#10b981'];

  function getItems(){
    const arr = textarea.value
      .split(/\r?\n/)
      .map(s=>s.trim())
      .filter(Boolean);
    items = arr.length ? arr : ['—'];
    updateCount();
    return items;
  }

  function updateCount(){
    entryCountEl.textContent = String(textarea.value.split(/\r?\n/).filter(s=>s.trim()).length);
  }

  textarea.addEventListener('input', ()=>{ getItems(); draw(); });
  btnShuffle.addEventListener('click', ()=>{ const arr = getItems(); shuffle(arr); textarea.value = arr.join('\n'); updateCount(); draw();});
  btnSort.addEventListener('click', ()=>{ const arr = getItems().slice().sort((a,b)=>a.localeCompare(b,'cs')); textarea.value = arr.join('\n'); updateCount(); draw();});
  btnClear.addEventListener('click', ()=>{ textarea.value=''; updateCount(); draw();});
  btnClearResults.addEventListener('click', ()=>{ resultsEl.innerHTML=''; });

  canvas.addEventListener('click', onSpin);
  btnSpin.addEventListener('click', onSpin);
  document.addEventListener('keydown', (e)=>{ if(e.ctrlKey && e.key==='Enter'){ onSpin(); }});

  function onSpin(){
    if(spinning) return;
    const arr = getItems();
    if(arr.length === 0 || (arr.length===1 && arr[0]==='—')) return;

    // Resolve guaranteed winner
    let ensure = guaranteedInput.value.trim();
    let targetIndex = null;
    if(ensure){
      const i = indexOfName(arr, ensure);
      if(i === -1 && autoAddCb.checked){
        arr.push(ensure);
        textarea.value = arr.join('\n');
        updateCount();
        targetIndex = arr.length - 1;
      } else if(i !== -1){
        targetIndex = i;
      }
    }

    // If none forced, choose random uniformly
    if(targetIndex === null){
      targetIndex = Math.floor(Math.random()*arr.length);
    }

    const total = arr.length;
    const seg = (Math.PI*2)/total;
    const centerAngleOfIndex = (idx)=> idx*seg + seg/2;

    // Pointer is at 0 rad (to the right). We want centerAngle + finalRotation ≡ 0 (mod 2π)
    const revolutions = 4 + Math.floor(Math.random()*3); // 4-6 turns
    // Add a small random offset within the target segment so it feels natural
    const jitter = (Math.random()-0.5)*(seg*0.6);
    const targetAngle = revolutions*2*Math.PI - (centerAngleOfIndex(targetIndex) + jitter);

    animateTo(targetAngle, 5200 + Math.random()*800, () => {
      spinning = false;
      rotation = normalizeRadians(targetAngle);
      const winIdx = pickIndexAtPointer(arr, rotation);
      pushResult(arr[winIdx]);
    });
  }

  function pushResult(value){
    const li = document.createElement('li');
    li.textContent = value;
    resultsEl.prepend(li);
  }

  function indexOfName(arr, name){
    const needle = name.trim().toLocaleLowerCase('cs');
    for(let i=0;i<arr.length;i++){
      if(arr[i].trim().toLocaleLowerCase('cs') === needle) return i;
    }
    return -1;
  }

  function pickIndexAtPointer(arr, rot){
    const total = arr.length;
    const seg = (Math.PI*2)/total;
    // Map rotation to [0, 2π)
    const a = normalizeRadians(-rot); // inverse since we rotated the wheel
    let idx = Math.floor(a/seg);
    idx = clamp(idx, 0, total-1);
    return idx;
  }

  function normalizeRadians(a){
    a = a % (2*Math.PI);
    if(a < 0) a += 2*Math.PI;
    return a;
  }

  function animateTo(target, duration, done){
    spinning = true; overlay.style.opacity = 0; lastTickIndex = -1;
    const start = performance.now();
    const from = rotation;
    const delta = shortestForwardDelta(from, target);

    function frame(now){
      const t = clamp((now-start)/duration, 0, 1);
      const eased = easeOutCubic(t);
      rotation = from + delta*eased;
      draw();
      playTickIfNeeded();
      if(t < 1){ requestAnimationFrame(frame); } else { done && done(); }
    }
    requestAnimationFrame(frame);
  }

  function shortestForwardDelta(from, to){
    // Always spin forward (increasing angle)
    if(to < from) return (to + 2*Math.PI*8) - from; // ensure forward by adding full turns
    return to - from;
  }

  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

  function playTickIfNeeded(){
    if(!soundToggle.checked) return;
    const arr = getItems();
    const total = arr.length || 1;
    const seg = (Math.PI*2)/total;
    const idx = pickIndexAtPointer(arr, rotation);
    if(idx !== lastTickIndex){
      if(tick){ try { tick.currentTime = 0; tick.play(); } catch(_){} }
      lastTickIndex = idx;
    }
  }

  function draw(){
    const size = canvas.clientWidth;
    const w = size; const h = size;
    ctx.clearRect(0,0,w,h);
    const cx = w/2, cy = h/2; const r = Math.min(w,h)/2 - 8; // padding for ring

    const arr = getItems();
    const total = arr.length || 1;
    const seg = (Math.PI*2)/total;

    // wheel
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(rotation);

    // ring
    ctx.beginPath();
    ctx.arc(0,0,r+6,0,Math.PI*2);
    ctx.fillStyle = '#e5e7eb';
    ctx.fill();

    for(let i=0;i<total;i++){
      const start = i*seg;
      const end = start + seg;
      // slice
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.arc(0,0,r,start,end);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      // text
      const mid = start + seg/2;
      ctx.save();
      ctx.rotate(mid);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const text = String(arr[i]);
      const maxWidth = r*0.9;
      const fontSize = Math.max(12, Math.min(26, (seg*r)*0.35));
      ctx.fillStyle = (i % 2 === 0) ? '#111827' : '#ffffff';
      ctx.font = `700 ${fontSize}px system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif`;
      ctx.translate(12,0);
      wrapFillText(ctx, text, 0, 0, maxWidth, fontSize*1.05);
      ctx.restore();
    }

    // hub
    ctx.beginPath(); ctx.arc(0,0,28,0,Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fillStyle = '#e5e7eb'; ctx.fill();

    ctx.restore();

    // pointer shadow accent is handled with CSS triangle
  }

  function wrapFillText(context, text, x, y, maxWidth, lineHeight){
    const words = text.split(/\s+/);
    let line = '';
    let yy = y;
    for(let n=0; n<words.length; n++){
      const testLine = line + (line? ' ':'') + words[n];
      const metrics = context.measureText(testLine);
      if(metrics.width > maxWidth && n>0){
        context.fillText(line, x, yy);
        line = words[n];
        yy += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, x, yy);
  }

  // initial draw
  draw();
})();
