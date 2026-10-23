function snd(freq,type,dur,vol){
  if(muted) return;
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type=type||'sine'; o.frequency.value=freq;
    g.gain.setValueAtTime(vol||0.1, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+(dur||0.1));
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+(dur||0.1));
  }catch(e){}
}
