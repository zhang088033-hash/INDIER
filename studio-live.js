// INDIER Studio Live — 虚拟硬件控制台：旋钮+推子+按键+动态波形+DIY图案+Web Audio
(function(){
  "use strict";

  const el = id => document.getElementById(id);
  const clamp = (v,lo,hi) => Math.max(lo, Math.min(hi, v));

  /* ───── 全局状态 ───── */
  const state = { vibe:40, energy:55, mood:72, pulse:50 };

  const vibes = ["Raw Bedroom","Lo-Fi Tape","Analog Warm","Clean Studio","Cinematic"];
  const palettes = [
    { from:"#ff6b2b", to:"#ff4fc3", glow:"rgba(255,107,43,.3)" },
    { from:"#46e6e0", to:"#7b68ee", glow:"rgba(70,230,224,.3)" },
    { from:"#d6a94a", to:"#ff6b2b", glow:"rgba(214,169,74,.3)" },
    { from:"#00ff88", to:"#46e6e0", glow:"rgba(0,255,136,.3)" },
    { from:"#7b68ee", to:"#ff4fc3", glow:"rgba(123,104,238,.3)" },
  ];

  function bpm(){ return Math.round(70 + state.pulse / 100 * 90); }
  function getPalette(){ return palettes[Math.min(4, Math.floor(state.vibe / 100 * 5))]; }

  const pVibe  = el("pVibe");
  const pMood  = el("pMood");
  const pPulse = el("pPulse");
  const screenTitle = el("screenTitle");

  function refreshParams(){
    if(pVibe)  pVibe.textContent  = vibes[Math.min(4, Math.floor(state.vibe / 100 * 5))];
    if(pMood)  pMood.textContent  = state.mood + "%";
    if(pPulse) pPulse.textContent = bpm() + " BPM";
    if(screenTitle) screenTitle.textContent = vibes[Math.min(4, Math.floor(state.vibe / 100 * 5))];
  }

  /* ═══════════════════════════════
     VIRTUAL KNOB — 旋转旋钮
     ═══════════════════════════════ */
  function createKnob(containerId, paramKey, opts = {}){
    const container = el(containerId);
    if(!container) return;

    const body = container.querySelector(".knob-body");
    const indicator = container.querySelector(".knob-indicator");
    const arcSvg = container.querySelector(".knob-arc");
    if(!body || !indicator) return;

    let value = state[paramKey];
    let dragging = false;
    let startY, startVal;

    // 旋钮角度范围：-135° ~ +135°（270° sweep）
    const MIN_ANGLE = -135, MAX_ANGLE = 135;
    function valToAngle(v){ return MIN_ANGLE + (v / 100) * (MAX_ANGLE - MIN_ANGLE); }

    function render(){
      const angle = valToAngle(value);
      indicator.style.transform = `rotate(${angle}deg)`;
      // Arc progress
      if(arcSvg){
        const r = 30, cx = 36, cy = 36;
        const startRad = (MIN_ANGLE - 90) * Math.PI / 180;
        const endRad = (angle - 90) * Math.PI / 180;
        const largeArc = (angle - MIN_ANGLE) > 180 ? 1 : 0;
        const sx = cx + r * Math.cos(startRad), sy = cy + r * Math.sin(startRad);
        const ex = cx + r * Math.cos(endRad), ey = cy + r * Math.sin(endRad);
        const p = arcSvg.querySelector("path");
        if(p) p.setAttribute("d", `M${sx},${sy} A${r},${r} 0 ${largeArc} 1 ${ex},${ey}`);
      }
      // Active glow
      const pal = getPalette();
      if(value > 60){
        body.style.boxShadow = `0 0 ${12 + value/5}px ${pal.glow}, inset 0 1px 0 rgba(255,255,255,.1)`;
      } else {
        body.style.boxShadow = "0 4px 16px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.1)";
      }
      indicator.style.background = pal.from;
    }

    function update(val){
      value = clamp(val, 0, 100);
      state[paramKey] = value;
      refreshParams();
      render();
    }

    // Pointer interaction — vertical drag turns knob
    body.addEventListener("pointerdown", (e) => {
      dragging = true;
      startY = e.clientY;
      startVal = value;
      body.style.cursor = "grabbing";
      body.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    body.addEventListener("pointermove", (e) => {
      if(!dragging) return;
      const dy = startY - e.clientY; // up = increase
      const sensitivity = opts.sensitivity || 0.8;
      update(startVal + dy * sensitivity);
    });
    body.addEventListener("pointerup", () => { dragging = false; body.style.cursor = "grab"; });
    body.addEventListener("pointercancel", () => { dragging = false; body.style.cursor = "grab"; });

    // Scroll wheel
    body.addEventListener("wheel", (e) => {
      e.preventDefault();
      update(value + (e.deltaY < 0 ? 2 : -2));
    }, {passive:false});

    render();
    return { update, render };
  }

  /* ═══════════════════════════════
     VIRTUAL FADER — 垂直推子
     ═══════════════════════════════ */
  function createFader(containerId, paramKey){
    const container = el(containerId);
    if(!container) return;

    const track = container.querySelector(".fader-track");
    const thumb = container.querySelector(".fader-thumb");
    const leds  = container.querySelectorAll(".fader-led");
    if(!track || !thumb) return;

    let value = state[paramKey];
    let dragging = false;

    function render(){
      // Thumb position (bottom = 0, top = 100)
      const trackH = track.clientHeight;
      const thumbH = 14;
      const maxTop = trackH - thumbH;
      const top = maxTop - (value / 100) * maxTop;
      thumb.style.top = top + "px";

      // LEDs
      const pal = getPalette();
      leds.forEach((led, i) => {
        const threshold = (leds.length - i) / leds.length * 100;
        if(value >= threshold){
          led.style.background = pal.from;
          led.style.boxShadow = `0 0 6px ${pal.glow}`;
        } else {
          led.style.background = "rgba(255,255,255,.08)";
          led.style.boxShadow = "none";
        }
      });

      // Thumb glow
      if(value > 60){
        thumb.style.boxShadow = `0 0 10px ${pal.glow}, 0 2px 6px rgba(0,0,0,.4)`;
      } else {
        thumb.style.boxShadow = "0 2px 6px rgba(0,0,0,.4)";
      }
    }

    function update(val){
      value = clamp(val, 0, 100);
      state[paramKey] = value;
      refreshParams();
      render();
    }

    function handlePointer(e){
      const rect = track.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const pct = 1 - (y / rect.height);
      update(clamp(pct, 0, 1) * 100);
    }

    thumb.addEventListener("pointerdown", (e) => {
      dragging = true;
      thumb.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    track.addEventListener("pointerdown", (e) => {
      dragging = true;
      handlePointer(e);
      e.preventDefault();
    });
    document.addEventListener("pointermove", (e) => { if(dragging) handlePointer(e); });
    document.addEventListener("pointerup", () => { dragging = false; });

    // Scroll
    track.addEventListener("wheel", (e) => {
      e.preventDefault();
      update(value + (e.deltaY < 0 ? 3 : -3));
    }, {passive:false});

    render();
    return { update, render };
  }

  /* ═══════════════════════════════
     DYNAMIC WAVEFORM — 24 bars
     ═══════════════════════════════ */
  const waveEl = document.querySelector(".waveform");
  const BAR_COUNT = 24;
  const bars = [];

  if(waveEl){
    waveEl.innerHTML = "";
    for(let i = 0; i < BAR_COUNT; i++){
      const b = document.createElement("i");
      b.style.cssText = "display:block;flex:1;min-height:4px;border-radius:999px;will-change:height;";
      waveEl.appendChild(b);
      bars.push(b);
    }
  }

  let phase = 0;
  let diyMode = false;
  let diyPattern = null;
  let diyActivePreset = -1;

  const presets = [
    { name:"Heartbeat", data:[.2,.4,.9,.6,.2,.15,.2,.4,.9,.6,.2,.15,.2,.4,.9,.6,.2,.15,.2,.4,.9,.6,.2,.15] },
    { name:"Sawtooth", data:[.1,.2,.3,.4,.5,.6,.7,.8,.9,1,.9,.8,.7,.6,.5,.4,.3,.2,.1,.2,.3,.4,.5,.6] },
    { name:"Pulse",    data:[1,0,1,0,.8,0,.6,0,.8,0,1,0,1,0,.8,0,.6,0,.8,0,1,0,1,0] },
    { name:"Mountain", data:[.1,.2,.35,.55,.8,.95,.85,.6,.4,.25,.15,.1,.1,.15,.25,.4,.6,.85,.95,.8,.55,.35,.2,.1] },
    { name:"Breath",   data:[.3,.45,.6,.75,.9,1,.9,.75,.6,.45,.3,.15,.3,.45,.6,.75,.9,1,.9,.75,.6,.45,.3,.15] },
    { name:"Random",   data:null },
  ];

  function initDiyPattern(presetData){
    diyPattern = new Float32Array(BAR_COUNT);
    if(presetData){
      for(let i = 0; i < BAR_COUNT; i++){
        const si = (i / BAR_COUNT) * presetData.length;
        const lo = Math.floor(si), hi = Math.min(presetData.length-1, lo+1), f = si-lo;
        diyPattern[i] = presetData[lo]*(1-f) + presetData[hi]*f;
      }
    } else if(presets[5].data === null){
      for(let i=0;i<BAR_COUNT;i++) diyPattern[i] = Math.random();
    } else {
      for(let i=0;i<BAR_COUNT;i++) diyPattern[i] = 0.5;
    }
  }

  // DIY panel
  const studioScreen = document.querySelector(".studio-screen");
  let diyPanel = null, presetBtns = [];

  function buildDiyPanel(){
    if(diyPanel) return;
    diyPanel = document.createElement("div");
    diyPanel.className = "diy-panel";

    const toggleRow = document.createElement("div");
    toggleRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;";
    const toggleLabel = document.createElement("span");
    toggleLabel.className = "diy-label";
    toggleLabel.textContent = "DIY PATTERN";
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "diy-toggle";
    toggleBtn.textContent = "OFF";
    toggleBtn.id = "diyToggle";
    toggleBtn.addEventListener("click", () => {
      diyMode = !diyMode;
      toggleBtn.textContent = diyMode ? "ON" : "OFF";
      toggleBtn.classList.toggle("active", diyMode);
      if(diyMode && !diyPattern) initDiyPattern();
    });
    toggleRow.appendChild(toggleLabel);
    toggleRow.appendChild(toggleBtn);
    diyPanel.appendChild(toggleRow);

    const presetRow = document.createElement("div");
    presetRow.className = "diy-presets";
    presets.forEach((p, idx) => {
      const btn = document.createElement("button");
      btn.className = "diy-preset-btn";
      btn.textContent = p.name;
      btn.addEventListener("click", () => {
        diyMode = true;
        const tb = el("diyToggle");
        if(tb){ tb.textContent = "ON"; tb.classList.add("active"); }
        diyActivePreset = idx;
        if(p.data === null){
          initDiyPattern();
          for(let i=0;i<BAR_COUNT;i++) diyPattern[i] = Math.random();
        } else {
          initDiyPattern(p.data);
        }
        highlightPreset(idx);
      });
      presetBtns.push(btn);
      presetRow.appendChild(btn);
    });
    diyPanel.appendChild(presetRow);

    const hint = document.createElement("div");
    hint.style.cssText = "font-size:10px;color:var(--muted);opacity:.5;margin-top:4px;";
    hint.textContent = "Drag on waveform to draw your pattern";
    diyPanel.appendChild(hint);

    studioScreen.appendChild(diyPanel);
  }

  function highlightPreset(idx){
    presetBtns.forEach((b, i) => b.classList.toggle("selected", i === idx));
  }

  // Draw on waveform
  let drawing = false;
  if(waveEl){
    waveEl.style.cursor = "crosshair";
    const drawAt = (e) => {
      if(!diyMode || !diyPattern) return;
      const rect = waveEl.getBoundingClientRect();
      const x = clamp((e.clientX - rect.left) / rect.width, 0, 0.999);
      const y = clamp(1 - (e.clientY - rect.top) / rect.height, 0.05, 1);
      const idx = Math.floor(x * BAR_COUNT);
      diyPattern[idx] = y;
      if(idx > 0) diyPattern[idx-1] = diyPattern[idx-1]*.4 + y*.6;
      if(idx < BAR_COUNT-1) diyPattern[idx+1] = diyPattern[idx+1]*.4 + y*.6;
      diyActivePreset = -1;
      highlightPreset(-1);
    };
    waveEl.addEventListener("pointerdown", (e) => { drawing = true; drawAt(e); waveEl.setPointerCapture(e.pointerId); });
    waveEl.addEventListener("pointermove", (e) => { if(drawing) drawAt(e); });
    waveEl.addEventListener("pointerup", () => { drawing = false; });
    waveEl.addEventListener("pointercancel", () => { drawing = false; });
  }

  // Animation loop
  function animateWaveform(){
    const energy = state.energy / 100;
    const mood = state.mood / 100;
    const vibeIdx = Math.min(4, Math.floor(state.vibe / 100 * 5));

    phase += (1/60) * bpm() / 60 * Math.PI * 2 * 0.5;
    const pal = getPalette();

    for(let i = 0; i < BAR_COUNT; i++){
      const norm = i / (BAR_COUNT - 1);
      let h;

      if(diyMode && diyPattern){
        const base = diyPattern[i];
        const beat = Math.sin(phase + i * 0.3) * 0.15 * energy;
        const mw = Math.sin(phase * 1.7 + i * 0.5) * 0.06 * mood;
        h = clamp(base + beat + mw, 0.04, 1);
      } else {
        const w1 = Math.sin(phase + norm * Math.PI * 2) * 0.3;
        const w2 = Math.sin(phase * 2 + norm * Math.PI * 4) * 0.15 * energy;
        const w3 = Math.cos(phase * 0.7 + norm * Math.PI * 3) * 0.12 * mood;
        const bp = Math.pow(Math.abs(Math.sin(phase)), 4) * 0.2 * energy;
        const ns = (Math.random() - 0.5) * 0.08 * energy;
        let sm = 0;
        switch(vibeIdx){
          case 0: sm = ((phase*3+norm*10)%2-1)*0.15*energy; break;
          case 1: sm = Math.sin(phase*0.5+norm*Math.PI*6)*0.08; break;
          case 2: sm = Math.sin(phase*0.3+norm*Math.PI*1.5)*0.18; break;
          case 3: sm = Math.round(Math.sin(phase+norm*Math.PI*4)*2)/2*0.12; break;
          case 4: sm = Math.sin(phase*0.2+norm*Math.PI)*0.25; break;
        }
        h = clamp(0.35 + w1 + w2 + w3 + bp + ns + sm, 0.04, 1);
      }

      const px = Math.max(4, h * 230);
      bars[i].style.height = px + "px";
      bars[i].style.background = `linear-gradient(180deg, ${pal.from}, ${pal.to})`;
      bars[i].style.boxShadow = h > 0.7 ? `0 0 ${8+h*14}px ${pal.glow}` : "none";
    }
    requestAnimationFrame(animateWaveform);
  }

  /* ═══════════════════════════════
     JAM BUTTON
     ═══════════════════════════════ */
  const jamBtn = el("playStudio");

  /* ═══════════════════════════════
     WEB AUDIO — synth
     ═══════════════════════════════ */
  let actx = null, audioOn = false, timer = null, step = 0, nt = 0;
  const PENT = [0,3,5,7,10];

  function ctx(){ if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)(); return actx; }

  function kick(t){
    const o=actx.createOscillator(),g=actx.createGain();
    o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(45,t+.12);
    g.gain.setValueAtTime(.9,t);g.gain.exponentialRampToValueAtTime(.001,t+.18);
    o.connect(g);g.connect(actx.destination);o.start(t);o.stop(t+.2);
  }
  function hat(t,v){
    const o=actx.createOscillator(),g=actx.createGain(),f=actx.createBiquadFilter();
    o.type="square";o.frequency.value=8000;f.type="highpass";f.frequency.value=6000;
    g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.04);
    o.connect(f);f.connect(g);g.connect(actx.destination);o.start(t);o.stop(t+.05);
  }
  function bass(t,s,e){
    const o=actx.createOscillator(),g=actx.createGain(),f=actx.createBiquadFilter();
    o.type="triangle";o.frequency.value=55*Math.pow(2,s/12);
    f.type="lowpass";f.frequency.value=300+(state.vibe+state.mood)/200*5000;
    g.gain.setValueAtTime(e,t);g.gain.exponentialRampToValueAtTime(.001,t+.35);
    o.connect(f);f.connect(g);g.connect(actx.destination);o.start(t);o.stop(t+.4);
  }

  function sched(){
    const spb = 60/bpm()/2, dens = state.energy/100;
    while(nt < actx.currentTime+.15){
      const s = step%8;
      if(s===0||s===4) kick(nt);
      if(s%2===1 && Math.random()<.4+dens*.5) hat(nt,.05+dens*.1);
      if(state.energy>30 && s%2===0) bass(nt,PENT[Math.floor(Math.random()*PENT.length)]-12,.2+dens*.4);
      nt+=spb; step++;
    }
    timer = setTimeout(sched, 40);
  }

  if(jamBtn){
    jamBtn.addEventListener("click", () => {
      ctx(); if(actx.state==="suspended") actx.resume();
      if(audioOn){
        audioOn=false; clearTimeout(timer);
        jamBtn.classList.remove("jamming");
        jamBtn.querySelector(".jam-text").textContent = "JAM";
      } else {
        audioOn=true; step=0; nt=actx.currentTime+.05; sched();
        jamBtn.classList.add("jamming");
        jamBtn.querySelector(".jam-text").textContent = "STOP";
      }
    });
  }

  /* ═══════════════════════════════
     INIT
     ═══════════════════════════════ */
  createKnob("knobVibe",   "vibe",   { sensitivity: 0.8 });
  createKnob("knobMood",   "mood",   { sensitivity: 0.8 });
  createKnob("knobPulse",  "pulse",  { sensitivity: 0.6 });
  createFader("faderEnergy","energy");
  buildDiyPanel();
  refreshParams();
  requestAnimationFrame(animateWaveform);

  // Also handle the hero play button for demo audio
  const demoAudio = el("demoAudio");
  const playHero = el("playHero");
  if(playHero && demoAudio){
    playHero.addEventListener("click", async () => {
      try {
        if(demoAudio.paused) await demoAudio.play();
        else demoAudio.pause();
      } catch{ demoAudio.controls = true; }
    });
  }

})();
