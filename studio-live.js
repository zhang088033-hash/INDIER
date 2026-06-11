/* ===== INDIER Studio Live V4 — 4-Module Hardware Console ===== */
(function(){
  'use strict';
  var SKINS = {
    lofi: {
      color: '#46e6e0', glow: 'rgba(70,230,224,.35)',
      bpm: 90, label: 'Looper', theme: 'Lo-Fi',
      waveFn: function(i,t,total,vibe,mood,energy){
        var h = 20 + 30*Math.sin(i*.3+t*.8) + 10*Math.sin(i*.7+t*1.3) + energy*.25*Math.sin(i*1.2+t*2);
        return h * (.5 + .5*vibe/100);
      }
    },
    synthwave: {
      color: '#ff6b2b', glow: 'rgba(255,107,43,.35)',
      bpm: 90, label: 'TRACK 01', theme: 'SYNTHWAVE',
      waveFn: function(i,t,total,vibe,mood,energy){
        var h = 15 + 25*Math.sin(i*.5+t*1.2) + 15*Math.cos(i*1.1-t*.7) + energy*.3*Math.sin(i*2+t*3);
        return h * (.4 + .6*vibe/100);
      }
    },
    hiphop: {
      color: '#ffd700', glow: 'rgba(255,215,0,.35)',
      bpm: 90, label: 'Now Playing', theme: 'HIP-HOP',
      waveFn: function(i,t,total,vibe,mood,energy){
        var h = 10 + 20*Math.abs(Math.sin(i*.4+t*.6)) + 15*Math.sin(i*1.5+t*1.8) + energy*.35*Math.sin(i*2.5+t*2.5);
        return h * (.3 + .7*vibe/100);
      }
    }
  };
  var currentSkin = 'lofi';
  var knobValues = { vibe:50, mood:50, energy:50, tempo:50, style:50, tone:50, fine1:50, fine2:50 };
  var faderValues = { mix:50, bass:60, mid:45, high:55 };
  var isJamming = false;
  var audioCtx = null;
  var oscillators = [];
  var phase = 0;
  var progressPhase = 0;
  var activeKeys = { retry:false, release:false, loop:false };
  var scrTheme = document.getElementById('scrTheme');
  var scrLabel = document.getElementById('scrLabel');
  var scrBpm   = document.getElementById('scrBpm');
  var scrWave  = document.getElementById('scrWave');
  var scrFill  = document.getElementById('scrFill');
  var scrTime  = document.getElementById('scrTime');
  var btnJam   = document.getElementById('btnJam');
  var BAR_COUNT = 24;
  var bars = [];
  function initBars(){
    if(!scrWave) return;
    scrWave.innerHTML = '';
    bars = [];
    for(var i=0;i<BAR_COUNT;i++){
      var b = document.createElement('div');
      b.className = 'bar';
      b.style.height = '10%';
      scrWave.appendChild(b);
      bars.push(b);
    }
  }
  initBars();
  function applySkin(name){
    var s = SKINS[name];
    if(!s) return;
    currentSkin = name;
    document.documentElement.style.setProperty('--skin-color', s.color);
    document.documentElement.style.setProperty('--skin-glow', s.glow);
    if(scrTheme){ scrTheme.textContent = s.theme; scrTheme.style.color = s.color; scrTheme.style.textShadow = '0 0 20px '+s.glow; }
    if(scrLabel) scrLabel.textContent = s.label;
    document.querySelectorAll('.skin-btn').forEach(function(b){
      b.classList.toggle('active', b.dataset.skin===name);
    });
    document.querySelectorAll('.scr-icons .si').forEach(function(si){
      if(si.classList.contains('on')){ si.style.color = s.color; si.style.textShadow = '0 0 6px '+s.glow; }
    });
    if(scrFill) scrFill.style.background = s.color;
    if(btnJam && isJamming){
      btnJam.style.borderColor = s.color;
      btnJam.style.boxShadow = '0 0 20px '+s.glow;
    }
    Object.keys(faderValues).forEach(function(key){ updateFaderLed(key); });
  }
  document.querySelectorAll('.skin-btn').forEach(function(b){
    b.addEventListener('click', function(){ applySkin(b.dataset.skin); });
  });
  function setupKnob(el, key){
    if(!el) return;
    var outer = el.querySelector('.knob-outer');
    var inner = el.querySelector('.knob-inner');
    if(!outer || !inner) return;
    var val = knobValues[key] || 50;
    var minA = -135, maxA = 135;
    var dragging = false, lastY = 0;
    function setAngle(a){
      a = Math.max(minA, Math.min(maxA, a));
      val = Math.round(((a - minA)/(maxA - minA))*100);
      knobValues[key] = val;
      el.dataset.value = val;
      inner.style.transform = 'rotate('+a+'deg)';
      updateBpm();
    }
    setAngle(minA + (val/100)*(maxA-minA));
    outer.addEventListener('pointerdown', function(e){
      dragging = true; lastY = e.clientY; outer.setPointerCapture(e.pointerId); e.preventDefault();
    });
    document.addEventListener('pointermove', function(e){
      if(!dragging) return;
      var dy = lastY - e.clientY;
      var curAngle = minA + (val/100)*(maxA-minA);
      setAngle(curAngle + dy * 1.5);
      lastY = e.clientY;
    });
    document.addEventListener('pointerup', function(){ dragging = false; });
    outer.addEventListener('wheel', function(e){
      e.preventDefault();
      var curAngle = minA + (val/100)*(maxA-minA);
      setAngle(curAngle + (e.deltaY > 0 ? -6 : 6));
    }, {passive:false});
  }
  function setupMiniKnob(el, key){
    if(!el) return;
    var outer = el.querySelector('.mini-knob-outer');
    var inner = el.querySelector('.mini-knob-inner');
    if(!outer || !inner) return;
    var val = knobValues[key] || 50;
    var minA = -135, maxA = 135;
    var dragging = false, lastY = 0;
    function setAngle(a){
      a = Math.max(minA, Math.min(maxA, a));
      val = Math.round(((a - minA)/(maxA - minA))*100);
      knobValues[key] = val;
      el.dataset.value = val;
      inner.style.transform = 'rotate('+a+'deg)';
    }
    setAngle(minA + (val/100)*(maxA-minA));
    outer.addEventListener('pointerdown', function(e){
      dragging = true; lastY = e.clientY; outer.setPointerCapture(e.pointerId); e.preventDefault();
    });
    document.addEventListener('pointermove', function(e){
      if(!dragging) return;
      var dy = lastY - e.clientY;
      var curAngle = minA + (val/100)*(maxA-minA);
      setAngle(curAngle + dy * 1.5);
      lastY = e.clientY;
    });
    document.addEventListener('pointerup', function(){ dragging = false; });
    outer.addEventListener('wheel', function(e){
      e.preventDefault();
      setAngle(minA + (val/100)*(maxA-minA) + (e.deltaY > 0 ? -6 : 6));
    }, {passive:false});
  }
  setupKnob(document.getElementById('knobVibe'), 'vibe');
  setupKnob(document.getElementById('knobMood'), 'mood');
  setupKnob(document.getElementById('knobEnergy'), 'energy');
  setupKnob(document.getElementById('knobTempo'), 'tempo');
  setupMiniKnob(document.getElementById('knobStyle'), 'style');
  setupMiniKnob(document.getElementById('knobTone'), 'tone');
  setupMiniKnob(document.getElementById('knobFine1'), 'fine1');
  setupMiniKnob(document.getElementById('knobFine2'), 'fine2');
  function updateFaderLed(key){
    var led = document.getElementById('faderLed' + key.charAt(0).toUpperCase() + key.slice(1));
    if(!led) return;
    var val = faderValues[key];
    led.style.height = val + '%';
  }
  function setupFader(unitEl, key){
    if(!unitEl) return;
    var track = unitEl.querySelector('.fader-track');
    var cap = unitEl.querySelector('.fader-cap');
    if(!track || !cap) return;
    var val = faderValues[key] || 50;
    var dragging = false;
    function setVal(v){
      v = Math.max(0, Math.min(100, v));
      faderValues[key] = v;
      unitEl.dataset.value = v;
      var trackH = track.clientHeight;
      var capH = 14;
      var top = trackH * (1 - v/100) - capH/2;
      top = Math.max(0, Math.min(trackH - capH, top));
      cap.style.top = top + 'px';
      updateFaderLed(key);
    }
    setTimeout(function(){ setVal(val); }, 50);
    cap.addEventListener('pointerdown', function(e){
      dragging = true; cap.setPointerCapture(e.pointerId); e.preventDefault();
    });
    document.addEventListener('pointermove', function(e){
      if(!dragging) return;
      var rect = track.getBoundingClientRect();
      var y = e.clientY - rect.top;
      var v = Math.round((1 - y / rect.height) * 100);
      setVal(v);
    });
    document.addEventListener('pointerup', function(){ dragging = false; });
    track.addEventListener('click', function(e){
      if(e.target === cap) return;
      var rect = track.getBoundingClientRect();
      var y = e.clientY - rect.top;
      var v = Math.round((1 - y / rect.height) * 100);
      setVal(v);
    });
  }
  setupFader(document.getElementById('faderMix'), 'mix');
  setupFader(document.getElementById('faderBass'), 'bass');
  setupFader(document.getElementById('faderMid'), 'mid');
  setupFader(document.getElementById('faderHigh'), 'high');
  document.querySelectorAll('.pad-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      btn.classList.toggle('active');
      if(btn.classList.contains('active')){
        btn.parentElement.querySelectorAll('.pad-btn').forEach(function(s){
          if(s !== btn) s.classList.remove('active');
        });
      }
    });
  });
  if(btnJam){
    btnJam.addEventListener('click', function(){
      if(isJamming){ stopSynth(); } else { startSynth(); }
    });
  }
  ['Retry','Release','Loop'].forEach(function(name){
    var btn = document.getElementById('btn' + name);
    if(!btn) return;
    var key = name.toLowerCase();
    btn.addEventListener('click', function(){
      activeKeys[key] = !activeKeys[key];
      btn.classList.toggle('active', activeKeys[key]);
    });
  });
  function updateBpm(){
    var base = SKINS[currentSkin].bpm;
    var bpm = Math.round(base + (knobValues.tempo - 50)*1.2);
    bpm = Math.max(60, Math.min(180, bpm));
    if(scrBpm) scrBpm.textContent = 'BPM '+bpm;
  }
  function animateWave(){
    var skin = SKINS[currentSkin];
    var bpm = Math.round(skin.bpm + (knobValues.tempo - 50)*1.2);
    bpm = Math.max(60, Math.min(180, bpm));
    var speed = bpm / 120;
    phase += 0.02 * speed;
    var vibe = knobValues.vibe, mood = knobValues.mood, energy = knobValues.energy;
    for(var i=0;i<bars.length;i++){
      var h = skin.waveFn(i, phase, BAR_COUNT, vibe, mood, energy);
      h = Math.max(5, Math.min(95, h));
      bars[i].style.height = h+'%';
      bars[i].classList.toggle('glow', h > 65);
    }
    if(isJamming){
      progressPhase += 0.0005 * speed;
      if(progressPhase > 1) progressPhase = 0;
      if(scrFill) scrFill.style.width = (progressPhase*100)+'%';
      if(scrTime){
        var elapsed = Math.floor(progressPhase * 225);
        scrTime.textContent = String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(elapsed%60).padStart(2,'0');
      }
    }
    requestAnimationFrame(animateWave);
  }
  animateWave();
  function getAudioCtx(){
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  function startSynth(){
    var ctx = getAudioCtx();
    if(ctx.state === 'suspended') ctx.resume();
    stopSynth();
    var skin = SKINS[currentSkin];
    var baseFreq = 110 + knobValues.vibe * 2.5;
    var detune = (knobValues.mood - 50) * 4;
    var vol = 0.06 + knobValues.energy * 0.0012;
    var osc1 = ctx.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.value = baseFreq; osc1.detune.value = detune;
    var osc2 = ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = baseFreq * 0.5;
    var lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 2 + (knobValues.tempo / 50);
    var lfoGain = ctx.createGain(); lfoGain.gain.value = 0.3;
    var filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 400 + knobValues.mood * 10 + knobValues.energy * 5; filter.Q.value = 2 + (knobValues.mood / 25);
    var gain = ctx.createGain(); gain.gain.value = vol;
    osc1.connect(filter); osc2.connect(filter);
    filter.connect(gain); lfo.connect(lfoGain); lfoGain.connect(gain.gain); gain.connect(ctx.destination);
    osc1.start(); osc2.start(); lfo.start();
    oscillators = [osc1, osc2, lfo, lfoGain, filter, gain];
    var demoEl = document.getElementById('demoAudio');
    if(demoEl && demoEl.src){ demoEl.currentTime = 0; demoEl.play().catch(function(){}); }
    isJamming = true;
    progressPhase = 0;
    if(btnJam) btnJam.classList.add('active');
  }
  function stopSynth(){
    oscillators.forEach(function(n){ try{n.stop();}catch(e){} try{n.disconnect();}catch(e){} });
    oscillators = [];
    var demoEl = document.getElementById('demoAudio');
    if(demoEl) demoEl.pause();
    isJamming = false;
    if(btnJam) btnJam.classList.remove('active');
  }
  var heroBtn = document.getElementById('playHero');
  if(heroBtn){
    heroBtn.addEventListener('click', function(){
      var demoEl = document.getElementById('demoAudio');
      if(demoEl){ demoEl.paused ? demoEl.play().catch(function(){}) : demoEl.pause(); }
    });
  }
  [document.getElementById('siWave'), document.getElementById('siFx'), document.getElementById('siFile'), document.getElementById('siSys')].forEach(function(ic){
    if(!ic) return;
    ic.addEventListener('click', function(){
      document.querySelectorAll('.scr-icons .si').forEach(function(s){ s.classList.remove('on'); s.style.color = ''; s.style.textShadow = ''; });
      ic.classList.add('on');
      var skin = SKINS[currentSkin];
      ic.style.color = skin.color; ic.style.textShadow = '0 0 6px '+skin.glow;
    });
  });
  applySkin('lofi');
  updateBpm();
})();