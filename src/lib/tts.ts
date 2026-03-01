/**
 * Browser TTS utility — picks the most human-sounding English voice available.
 *
 * Priority order:
 *  1. Google US English   (Chrome desktop — neural quality)
 *  2. Microsoft Aria / Jenny / Guy Online Natural  (Edge — neural)
 *  3. Any "Online (Natural)" en-US voice
 *  4. Any en-US voice
 *  5. Any English voice
 *  6. Browser default
 */

// Preferred voice name patterns, ordered best → fallback
const VOICE_PATTERNS: RegExp[] = [
  /google us english/i,
  /microsoft.*aria.*natural/i,
  /microsoft.*jenny.*natural/i,
  /microsoft.*guy.*natural/i,
  /natural.*en.*(us|gb)/i,
  /online.*en.*(us|gb)/i,
  /microsoft.*en.*(us|gb)/i,
];

let cachedVoice: SpeechSynthesisVoice | null | undefined = undefined;

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const pattern of VOICE_PATTERNS) {
    const v = voices.find((v) => pattern.test(v.name));
    if (v) return v;
  }
  // Fallback: any en-US, then any English
  return (
    voices.find((v) => v.lang === 'en-US') ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  );
}

function getBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  if (cachedVoice !== undefined) return cachedVoice;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoice = pickVoice(voices);
    return cachedVoice;
  }

  // Voices not ready yet — register a one-time listener and return null for now
  window.speechSynthesis.addEventListener(
    'voiceschanged',
    () => { cachedVoice = pickVoice(window.speechSynthesis.getVoices()); },
    { once: true },
  );
  return null;
}

/**
 * Create a SpeechSynthesisUtterance pre-configured with the best available
 * English voice, the given rate, and sensible pitch.
 */
export function makeUtterance(text: string, rate = 0.9): SpeechSynthesisUtterance {
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'en-US';
  utt.rate = rate;
  utt.pitch = 1.0;
  const voice = getBestVoice();
  if (voice) utt.voice = voice;
  return utt;
}
