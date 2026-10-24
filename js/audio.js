'use strict';
EZ.unlockAudio = function() {
  try {
    if (!EZ.audio) EZ.audio = new(window.AudioContext || window.webkitAudioContext)();
    if (EZ.audio.state === 'suspended') EZ.audio.resume().catch(() => {});
  } catch {}
};
EZ.sound = function(freq = 150, duration = .08) {
  if (EZ.state.muted || !EZ.audio) return;
  const c = EZ.audio,
    o = c.createOscillator(),
    g = c.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(freq, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(40, c.currentTime + duration);
  g.gain.setValueAtTime(.035, c.currentTime);
  g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + duration);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + duration);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
};
