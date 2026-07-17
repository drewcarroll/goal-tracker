/**
 * A short, bright two-note chime (A5 -> E6) played when a goal is swiped to
 * "done" on Home. Synthesized via Web Audio rather than an audio file — no
 * asset to host, no licensing question, instant to load. Always called from
 * inside a user gesture handler (swipe/tap), so it satisfies browser
 * autoplay policies.
 */
export function playDing(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes = [880, 1318.51];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.09;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
    setTimeout(() => void ctx.close(), 600);
  } catch {
    // Web Audio unsupported or blocked — marking the goal still works either way.
  }
}
