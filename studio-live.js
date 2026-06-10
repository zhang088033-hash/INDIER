/* ===== INDIER Studio Live — Virtual Hardware Console ===== */
(function(){
  'use strict';

  /* ---------- Skin Configs ---------- */
  const SKINS = {
    lofi: {
      color: '#46e6e0',
      glow:  'rgba(70,230,224,.35)',
      bpm: 90,
      label: 'Looper',
      theme: 'Lo-Fi',
      waveFn: function(i,t,total,vibe,mood,energy){
        var h = 20 + 30*Math.sin(i*.3+t*.8) + 10*Math.sin(i*.7+t*1.3) + energy*.25*Math.sin(i*1.2+t*2);
        return h * (.5 + .5*vibe/100);
      }
    },
    synthwave: {
      color: '#ff6b2b',
      glow:  'rgba(255,107,43,.35)',
      bpm: 90,
      label: 'TRACK 01',
      theme: 'SYNTHWAVE',
      waveFn: function(i,t,total,vibe,mood,energy){
        var h = 15 + 25*Math.sin(i*.5+t*1.2) + 15*Math.cos(i*1.1-t*.7) + energy*.3*Math.sin(i*2+t*3);
        return h * (.4 + .6*vibe/100);
      }
    },
    hiphop: {
      color: '#ffd700',
      glow:  'rgba(255,215,0,.35)',
      bpm: 90,
      label: 'Now Playing',
      theme: 'HIP-HOP',
      waveFn: function(i,t,total,vibe,mood,energy){
        var h = 10 + 20*Math.abs(Math.sin(i*.4+t*.6)) + 15*Math.sin(i*1.5+t*1.8) + energy*.35*Math.sin(i*2.5+t*2.5);
        return h * (.3 + .7*vibe/100);
      }
    }
  };

  /* ---------- State ---------- */
  var currentSkin = 'lofi';
  var knobValues = { vibe:50, mood:50, energy:50, tempo:50 };
  var isJamming = false;
  var audioCtx = null;
  var oscillators = [];
  var phase = 0;
  var animId = null;
  var progressPhase = 0;

  /* ---------- DOM ---------- */
  var scrTheme  = document.getElementById('scrTheme');
  var scrLabel  = document.getElementById('scrLabel');
  var scrBpm    = document.getElementById('scrBpm');
  var scrWave   = document.getElementById('scrWave');
  var scrFill   = document.getElementById('scrFill');
  var scrTime   = document.getElementById('scrTime');
  var btnJam    = document.getElementById('btnJam');
  var device    = document.getElementById('indierDevice');

  /* ---------- Init Waveform Bars ---------- */
  var BAR_COUNT = 24;
  var bars = [];
  function initBars(){
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

  /* ---------- Apply Skin ---------- */
  function applySkin(name){
    var s = SKINS[name];
    if(!s) return;
    currentSkin = name;
    document.documentElement.style.setProperty('--skin-color', s.color);
    document.documentElement.style.setProperty('--skin-glow', s.glow);
    scrTheme.textContent = s.theme;
    scrTheme.style.color = s.color;
    scrTheme.style.textShadow = '0 0 20px '+s.glow;
    scrLabel.textContent = s.label;

    /* Skin buttons */
    document.querySelectorAll('.skin-btn').forEach(function(b){
      b.classList.toggle('active', b.dataset.skin===name);
    });

    /* Screen icons */
    document.querySelectorAll('.scr-icons .si').forEach(function(si){
      if(si.classList.contains('on')){
        si.style.color = s.color;
        si.style.textShadow = '0 0 6px '+s.glow;
      }
    });

    /* Progress fill */
    scrFill.style.background = s.color;

    /* JAM active state */
    if(isJamming){
      btnJam.style.borderColor = s.color;
      btnJam.style.boxShadow = '0 0 20px '+s.glow;
      btnJam.querySelector('.jam-dot').style.background = s.color;
      btnJam.querySelector('.jam-dot').style.boxShadow = '0 0 10px '+s.glow;
    }
  }

  /* ---------- Skin Buttons ---------- */
  document.querySelectorAll('.skin-btn').forEach(function(b){
    b.addEventListener('click', function(){ applySkin(b.dataset.skin); });
  });

  /* ---------- Knob Rotation ---------- */
  function setupKnob(el, key){
    var outer = el.querySelector('.knob-outer');
    var inner = el.querySelector('.knob-inner');
    var val = knobValues[key];
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

    /* Init angle */
    setAngle(minA + (val/100)*(maxA-minA));

    /* Pointer drag */
    outer.addEventListener('pointerdown', function(e){
      dragging = true;
      lastY = e.clientY;
      outer.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    document.addEventListener('pointermove', function(e){
      if(!dragging) return;
      var dy = lastY - e.clientY;
      var curAngle = minA + (val/100)*(maxA-minA);
      var newAngle = curAngle + dy * 1.5;
      setAngle(newAngle);
      lastY = e.clientY;
    });
    document.addEventListener('pointerup', function(){
      dragging = false;
    });

    /* Scroll wheel */
    outer.addEventListener('wheel', function(e){
      e.preventDefault();
      var curAngle = minA + (val/100)*(maxA-minA);
      var delta = e.deltaY > 0 ? -6 : 6;
      setAngle(curAngle + delta);
    }, {passive:false});
  }

  setupKnob(document.getElementById('knobVibe'), 'vibe');
  setupKnob(document.getElementById('knobMood'), 'mood');
  setupKnob(document.getElementById('knobEnergy'), 'energy');
  setupKnob(document.getElementById('knobTempo'), 'tempo');

  /* ---------- BPM Update ---------- */
  function updateBpm(){
    var base = SKINS[currentSkin].bpm;
    var bpm = Math.round(base + (knobValues.tempo - 50)*1.2);
    bpm = Math.max(60, Math.min(180, bpm));
    scrBpm.textContent = 'BPM '+bpm;
  }

  /* ---------- Waveform Animation ---------- */
  function animateWave(){
    var skin = SKINS[currentSkin];
    var bpm = Math.round(skin.bpm + (knobValues.tempo - 50)*1.2);
    bpm = Math.max(60, Math.min(180, bpm));
    var speed = bpm / 120;
    phase += 0.02 * speed;

    var vibe   = knobValues.vibe;
    var mood   = knobValues.mood;
    var energy = knobValues.energy;

    for(var i=0;i<bars.length;i++){
      var h = skin.waveFn(i, phase, BAR_COUNT, vibe, mood, energy);
      h = Math.max(5, Math.min(95, h));
      bars[i].style.height = h+'%';
      if(h > 65){
        bars[i].classList.add('glow');
      } else {
        bars[i].classList.remove('glow');
      }
    }

    /* Progress bar */
    if(isJamming){
      progressPhase += 0.0005 * speed;
      if(progressPhase > 1) progressPhase = 0;
      scrFill.style.width = (progressPhase*100)+'%';
      var elapsed = Math.floor(progressPhase * 225);
      var mm = String(Math.floor(elapsed/60)).padStart(2,'0');
      var ss = String(elapsed%60).padStart(2,'0');
      scrTime.textContent = mm+':'+ss;
    }

    animId = requestAnimationFrame(animateWave);
  }
  animateWave();

  /* ---------- JAM Button — Web Audio Synth ---------- */
  function getAudioCtx(){
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function startSynth(){
    var ctx = getAudioCtx();
    if(ctx.state === 'suspended') ctx.resume();
    stopSynth();

    var skin = SKINS[currentSkin];
    var tempo = knobValues.tempo;
    var mood  = knobValues.mood;
    var vibe  = knobValues.vibe;
    var energy= knobValues.energy;

    /* Base frequency from vibe */
    var baseFreq = 110 + vibe * 2.5;

    /* Mood shifts timbre: 0=clean, 50=warm, 100=harsh */
    var detune = (mood - 50) * 4;

    /* Energy = volume */
    var vol = 0.06 + energy * 0.0012;

    /* Main oscillator */
    var osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = baseFreq;
    osc1.detune.value = detune;

    /* Sub oscillator */
    var osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = baseFreq * 0.5;

    /* LFO for tremolo */
    var lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 2 + (tempo / 50);
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.3;

    /* Filter */
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400 + mood * 10 + energy * 5;
    filter.Q.value = 2 + (mood / 25);

    /* Gain */
    var gain = ctx.createGain();
    gain.gain.value = vol;

    /* Routing */
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    lfo.start();

    oscillators = [osc1, osc2, lfo, lfoGain, filter, gain];

    /* Also play demo MP3 if available */
    var demoEl = document.getElementById('demoAudio');
    if(demoEl && demoEl.src){
      demoEl.currentTime = 0;
      demoEl.play().catch(function(){});
    }

    isJamming = true;
    progressPhase = 0;
    btnJam.classList.add('jamming');
    btnJam.style.borderColor = skin.color;
    btnJam.style.boxShadow = '0 0 20px '+skin.glow;
    btnJam.querySelector('.jam-dot').style.background = skin.color;
    btnJam.querySelector('.jam-dot').style.boxShadow = '0 0 10px '+skin.glow;
  }

  function stopSynth(){
    oscillators.forEach(function(node){
      try{ node.stop(); }catch(e){}
      try{ node.disconnect(); }catch(e){}
    });
    oscillators = [];

    var demoEl = document.getElementById('demoAudio');
    if(demoEl) demoEl.pause();

    isJamming = false;
    btnJam.classList.remove('jamming');
    btnJam.style.borderColor = '';
    btnJam.style.boxShadow = '';
    btnJam.querySelector('.jam-dot').style.background = '';
    btnJam.querySelector('.jam-dot').style.boxShadow = '';
  }

  btnJam.addEventListener('click', function(){
    if(isJamming){ stopSynth(); }
    else { startSynth(); }
  });

  /* Hero play button */
  var heroBtn = document.getElementById('playHero');
  if(heroBtn){
    heroBtn.addEventListener('click', function(){
      var demoEl = document.getElementById('demoAudio');
      if(demoEl){
        if(demoEl.paused){
          demoEl.play().catch(function(){});
        } else {
          demoEl.pause();
        }
      }
    });
  }

  /* ---------- Screen Icon Clicks ---------- */
  var iconWave = document.getElementById('siWave');
  var iconFx   = document.getElementById('siFx');
  var iconFile = document.getElementById('siFile');
  var iconSys  = document.getElementById('siSys');

  [iconWave, iconFx, iconFile, iconSys].forEach(function(ic){
    if(!ic) return;
    ic.addEventListener('click', function(){
      document.querySelectorAll('.scr-icons .si').forEach(function(s){
        s.classList.remove('on');
        s.style.color = '';
        s.style.textShadow = '';
      });
      ic.classList.add('on');
      var skin = SKINS[currentSkin];
      ic.style.color = skin.color;
      ic.style.textShadow = '0 0 6px '+skin.glow;
    });
  });

  /* ---------- Init ---------- */
  applySkin('lofi');
  updateBpm();

})();
