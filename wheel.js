(function(){
  'use strict';

  const canvas = document.getElementById('wheel');
  const ctx = canvas.getContext('2d');
  const spinBtn = document.getElementById('spinBtn');
  const entriesText = document.getElementById('entries');
  const forcedInput = document.getElementById('forced');
  const clearForcedBtn = document.getElementById('clearForced');
  const shuffleBtn = document.getElementById('shuffle');
  const sortBtn = document.getElementById('sort');
  const resultsEl = document.getElementById('results');

  const radius = canvas.width/2;
  const center = { x: canvas.width/2, y: canvas.height/2 };
  const defaultNames = ['CS','CS','CS','Rakashu','KAJINKA','NEPORAZITELNY','CS','NIKOLKA','CS','Rakashu','SKULL'];

  // State
  let segments = [];
  let currentAngle = -Math.PI/2; // so the red pointer to the right points at angle 0
  let isSpinning = false;
  let spinStartTs = 0;
  let spinDurationMs = 4500;
  let startAngle = 0;
  let targetAngle = 0;

  function parseEntries(){
    const lines = entriesText.value.split(/\n+/).map(s=>s.trim()).filter(Boolean);
    return lines.length ? lines : defaultNames.slice();
  }

  function buildSegments(){
    const names = parseEntries();
    const colors = ['#e11d48','#2563eb','#f59e0b','#10b981','#1d4ed8','#dc2626','#f97316','#059669'];
    segments = names.map((label, i) => ({ label, color: colors[i % colors.length] }));
  }

  function drawWheel(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    const wedge = (Math.PI * 2) / Math.max(1, segments.length);
    // Outer ring shadow
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(currentAngle);

    for(let i=0;i<segments.length;i++){
      const start = i * wedge;
      const end = start + wedge;

      // slice
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.arc(0,0,radius-12,start,end);
      ctx.closePath();
      ctx.fillStyle = segments[i].color;
      ctx.fill();

      // label
      ctx.save();
      ctx.fillStyle = i % 2 ? '#ffffff' : '#111827';
      ctx.font = 'bold 32px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const angle = start + wedge/2;
      const labelRadius = radius*0.62;
      ctx.rotate(angle);
      ctx.translate(labelRadius,0);
      ctx.rotate(Math.PI/2);
      const text = segments[i].label;
      fitText(ctx, text, radius*0.9 - labelRadius, 32);
      ctx.restore();
    }

    // hub
    ctx.beginPath();
    ctx.arc(0,0,60,0,Math.PI*2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,.25)';
    ctx.shadowBlur = 16;
    ctx.fill();

    // overlay text
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 6;
    ctx.font = 'bold 48px system-ui';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.rotate(-currentAngle); // neutral for text overlay, but we want static text on wheel
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.restore();

    ctx.restore();

    drawPointer();
  }

  function drawPointer(){
    // Draw red pointer at the right side
    const pointerX = center.x + radius - 6;
    const pointerY = center.y;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pointerX, pointerY);
    ctx.lineTo(pointerX + 26, pointerY - 16);
    ctx.lineTo(pointerX + 26, pointerY + 16);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = 'rgba(0,0,0,.25)';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();
  }

  function fitText(ctx, text, maxWidth, baseSize){
    let size = baseSize;
    ctx.font = `bold ${size}px system-ui`;
    while (size > 12 && ctx.measureText(text).width > maxWidth){
      size -= 1;
      ctx.font = `bold ${size}px system-ui`;
    }
    ctx.fillText(text, 0, 0);
  }

  function nameToIndex(name){
    const idx = segments.findIndex(s => s.label.toLowerCase() === name.toLowerCase());
    return idx;
  }

  function computeTargetAngle(forcedName){
    const wedge = (Math.PI * 2) / segments.length;
    let targetIndex;
    if (forcedName){
      const idx = nameToIndex(forcedName);
      if (idx !== -1) targetIndex = idx; // exact match
      else {
        // If not found, still pick from all
        targetIndex = Math.floor(Math.random()*segments.length);
      }
    } else {
      targetIndex = Math.floor(Math.random()*segments.length);
    }

    // Center of target slice relative to wheel frame is at angle = start + wedge/2
    const sliceCenterAngle = targetIndex * wedge + wedge/2;

    // We want that slice center to land at the right pointer (angle 0 in screen coordinates)
    // Wheel rotation adds to currentAngle; pointer fixed at 0 rad (to the right)
    // So targetAngle should rotate wheel so that (currentAngle + totalRotation + sliceCenterAngle) % (2π) = 0
    // => totalRotation = -currentAngle - sliceCenterAngle (mod 2π) + multiple of 2π for extra spins
    const extraSpins = 4 + Math.floor(Math.random()*2); // 4-5 extra spins
    const totalRotation = -wrapAngle(currentAngle + sliceCenterAngle) + extraSpins * Math.PI * 2;
    return { targetIndex, absoluteTargetAngle: currentAngle + totalRotation };
  }

  function wrapAngle(a){
    const tau = Math.PI*2;
    return ((a % tau) + tau) % tau;
  }

  function spin(){
    if (isSpinning || segments.length === 0) return;
    isSpinning = true;
    const forcedName = (forcedInput.value || '').trim();
    const { targetIndex, absoluteTargetAngle } = computeTargetAngle(forcedName);

    startAngle = currentAngle;
    targetAngle = absoluteTargetAngle;
    spinStartTs = performance.now();

    animate(() => onSpinEnd(targetIndex));
  }

  function animate(onDone){
    function frame(ts){
      const t = Math.min(1, (ts - spinStartTs) / spinDurationMs);
      const eased = easeOutCubic(t);
      currentAngle = lerp(startAngle, targetAngle, eased);
      drawWheel();
      if (t < 1) requestAnimationFrame(frame); else { isSpinning = false; onDone(); }
    }
    requestAnimationFrame(frame);
  }

  function onSpinEnd(index){
    // Record result
    const li = document.createElement('li');
    li.textContent = segments[index]?.label ?? '?';
    resultsEl.prepend(li);
  }

  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
  function lerp(a,b,t){ return a + (b-a)*t; }

  // UI
  spinBtn.addEventListener('click', spin);
  document.addEventListener('keydown', (e)=>{
    if (e.ctrlKey && e.key === 'Enter') spin();
  });
  shuffleBtn.addEventListener('click', ()=>{
    const names = parseEntries();
    for(let i=names.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [names[i],names[j]] = [names[j],names[i]];
    }
    entriesText.value = names.join('\n');
    buildSegments();
    drawWheel();
  });
  sortBtn.addEventListener('click', ()=>{
    const names = parseEntries().sort((a,b)=>a.localeCompare(b,'cs'));
    entriesText.value = names.join('\n');
    buildSegments();
    drawWheel();
  });
  clearForcedBtn.addEventListener('click', ()=>{ forcedInput.value=''; });
  entriesText.addEventListener('input', ()=>{ buildSegments(); drawWheel(); });

  // Init
  entriesText.value = defaultNames.join('\n');
  buildSegments();
  drawWheel();
})();
