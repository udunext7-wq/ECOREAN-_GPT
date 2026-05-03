export type UiTone = 'click' | 'confirm' | 'warning';

let audioContext: AudioContext | null = null;

function getAudioContext() {
  audioContext ??= new AudioContext();
  return audioContext;
}

export function playUiTone(tone: UiTone, enabled: boolean) {
  if (!enabled) return;

  const context = getAudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  const frequency = tone === 'confirm' ? 880 : tone === 'warning' ? 180 : 520;
  const endTime = now + (tone === 'warning' ? 0.11 : 0.07);

  oscillator.type = tone === 'warning' ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(frequency, now);
  if (tone === 'confirm') {
    oscillator.frequency.exponentialRampToValueAtTime(1174, endTime);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(tone === 'warning' ? 0.045 : 0.032, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(endTime);
}
