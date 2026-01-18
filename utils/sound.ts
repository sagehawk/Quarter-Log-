export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    
    // Ensure context is running (sometimes required if created outside user gesture)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(console.error);
    }
    
    const now = ctx.currentTime;

    // Helper to create a bell-like tone
    const playChimeTone = (freq: number, startTime: number, volume: number = 0.3) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Envelope: Soft attack, long smooth decay
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.03); 
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.0);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 2.0);
    };

    // Play a gentle major interval (Perfect 5th ish)
    // A4 (440Hz) followed by E5 (659.25Hz)
    // Creates a "Ding-Dong" or "Hi-There" effect
    playChimeTone(440, now, 0.25);
    playChimeTone(659.25, now + 0.15, 0.25);

  } catch (e) {
    console.error("Audio play failed", e);
  }
};