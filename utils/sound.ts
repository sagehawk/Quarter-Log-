export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    
    // Ensure context is running
    if (ctx.state === 'suspended') {
      ctx.resume().catch(console.error);
    }
    
    const now = ctx.currentTime;

    // Helper to create a louder, sharper tone
    const playTone = (freq: number, startTime: number, duration: number, volume: number = 1.0) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square'; // 'square' wave is harsher and louder than 'sine'
      osc.frequency.setValueAtTime(freq, startTime);

      // Attack and release
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Play a sequence: High-Low-High (Alarm style)
    // Much louder (volume 1.0) and higher pitch
    const noteDuration = 0.2;
    const gap = 0.1;
    
    // First burst
    playTone(880, now, noteDuration); // A5
    playTone(1760, now + noteDuration, noteDuration); // A6
    
    // Second burst
    playTone(880, now + (noteDuration * 2) + gap, noteDuration);
    playTone(1760, now + (noteDuration * 3) + gap, noteDuration);
    
    // Third burst (for good measure)
    playTone(880, now + (noteDuration * 4) + (gap * 2), noteDuration);
    playTone(1760, now + (noteDuration * 5) + (gap * 2), noteDuration);

  } catch (e) {
    console.error("Audio play failed", e);
  }
};