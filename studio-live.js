// 官网 studio 板块：转旋钮 → 屏幕参数实时变 + 本地 Web Audio 出声（纯客户端）
(function(){
  const vibes=["Raw Bedroom","Lo-Fi Tape","Analog Warm","Clean Studio","Cinematic"];
  const el=id=>document.getElementById(id);
  const k={vibe:el("kVibe"),energy:el("kEnergy"),mood:el("kMood"),pulse:el("kPulse")};
  if(!k.vibe) return;
  const bpm=v=>Math.round(70+v/100*90);
  function refresh(){
    el("pVibe").textContent = vibes[Math.min(4,Math.floor(k.vibe.value/100*5))];
    el("pMood").textContent = k.mood.value+"%";
    el("pPulse").textContent = bpm(k.pulse.value)+" BPM";
  }
  Object.values(k).forEach(r=>r&&r.addEventListener("input",refresh));
  refresh();

  // Web Audio 本地预览
  let actx=null,on=false,timer=null,step=0,nt=0;
  const PENT=[0,3,5,7,10];
  function ctx(){ if(!actx) actx=new (window.AudioContext||window.webkitAudioContext)(); return actx; }
  function kick(t){const o=actx.createOscillator(),g=actx.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(45,t+0.12);g.gain.setValueAtTime(0.9,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.18);o.connect(g);g.connect(actx.destination);o.start(t);o.stop(t+0.2);}
  function hat(t,v){const o=actx.createOscillator(),g=actx.createGain(),f=actx.createBiquadFilter();o.type="square";o.frequency.value=8000;f.type="highpass";f.frequency.value=6000;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.04);o.connect(f);f.connect(g);g.connect(actx.destination);o.start(t);o.stop(t+0.05);}
  function bass(t,s,e){const o=actx.createOscillator(),g=actx.createGain(),f=actx.createBiquadFilter();o.type="triangle";o.frequency.value=55*Math.pow(2,s/12);f.type="lowpass";f.frequency.value=300+(+k.vibe.value+ +k.mood.value)/200*5000;g.gain.setValueAtTime(e,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.35);o.connect(f);f.connect(g);g.connect(actx.destination);o.start(t);o.stop(t+0.4);}
  function sched(){
    const spb=60/bpm(k.pulse.value)/2, dens=k.energy.value/100;
    while(nt<actx.currentTime+0.15){
      const s=step%8;
      if(s===0||s===4) kick(nt);
      if(s%2===1 && Math.random()<0.4+dens*0.5) hat(nt,0.05+dens*0.1);
      if(k.energy.value>30 && s%2===0) bass(nt,PENT[Math.floor(Math.random()*PENT.length)]-12,0.2+dens*0.4);
      nt+=spb; step++;
    }
    timer=setTimeout(sched,40);
  }
  const btn=el("playStudio");
  btn.addEventListener("click",()=>{
    ctx(); if(actx.state==="suspended")actx.resume();
    if(on){ on=false;clearTimeout(timer);btn.textContent="▶ 试玩：转旋钮听声音"; }
    else { on=true;step=0;nt=actx.currentTime+0.05;sched();btn.textContent="⏸ 停止试玩（转旋钮听变化）"; }
  });
})();
