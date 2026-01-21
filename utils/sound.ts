// Plays a silent sound for a specific duration to keep the browser thread active
// This is critical for mobile browsers which kill JS timers immediately upon screen lock.
export const keepAwake = (durationSec: number) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    
    // CRITICAL: Resume if suspended, otherwise the oscillator won't actually run/keep awake
    if (ctx.state === 'suspended') {
      ctx.resume().catch(console.error);
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, ctx.currentTime); // Low freq
    gain.gain.setValueAtTime(0.001, ctx.currentTime); // Near silent but technically audible to OS

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  } catch (e) {
    console.error("Keep awake failed", e);
  }
};