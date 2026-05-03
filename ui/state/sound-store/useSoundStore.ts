import { useState } from 'react';
import { playUiTone, type UiTone } from '../../services/sound-service/soundService';

export function useSoundStore() {
  const [soundEnabled, setSoundEnabled] = useState(true);

  function playTone(tone: UiTone) {
    playUiTone(tone, soundEnabled);
  }

  return {
    soundEnabled,
    setSoundEnabled,
    playTone
  };
}
