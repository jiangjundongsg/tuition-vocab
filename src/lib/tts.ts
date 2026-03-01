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

const VOICE_PATTERNS: RegExp[] = [
  /google us english/i,
  /microsoft.*aria.*natural/i,
  /microsoft.*jenny.*natural/i,
  /microsoft.*guy.*natural/i,
  /natural.*en.*(us|gb)/i,
  /online.*en.*(us|gb)/i,
  /microsoft.*en.*(us|gb)/i,
];

// Cache the voice NAME rather than the object — Chrome invalidates voice objects
// after speechSynthesis.cancel(), causing the voice to revert to the system default.
let cachedVoiceName: string | null | undefined = undefined; // undefined = not yet resolved

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const pattern of VOICE_PATTERNS) {
    const v = voices.find((v) => pattern.test(v.name));
    if (v) return v;
  }
  return (
    voices.find((v) => v.lang === 'en-US') ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  );
}

function getBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();

  if (voices.length > 0) {
    // Resolve name on first successful load
    if (cachedVoiceName === undefined) {
      cachedVoiceName = pickVoice(voices)?.name ?? null;
    }
    // Re-find the object each call — stale objects cause wrong voice after cancel()
    if (!cachedVoiceName) return null;
    return voices.find((v) => v.name === cachedVoiceName) ?? null;
  }

  // Voices not ready yet (async Chrome first load)
  if (cachedVoiceName === undefined) {
    window.speechSynthesis.addEventListener(
      'voiceschanged',
      () => {
        const v = pickVoice(window.speechSynthesis.getVoices());
        cachedVoiceName = v?.name ?? null;
      },
      { once: true },
    );
  }
  return null;
}

// ── Highlight schedule ────────────────────────────────────────────────────────

/**
 * Estimate syllable count for a single word.
 * Uses vowel-group counting with a silent-trailing-e correction.
 */
function syllableCount(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length === 0) return 0;
  if (w.length <= 2) return 1;
  const groups = w.match(/[aeiouy]+/g);
  let n = groups ? groups.length : 1;
  // Silent trailing 'e' (e.g. "make", "voice") — only when the char before it is a consonant
  if (w.endsWith('e') && w.length > 2 && !/[aeiouy]e$/.test(w)) n = Math.max(1, n - 1);
  return Math.max(1, n);
}

/**
 * Build a highlight schedule from pre-tokenised word tokens.
 * Returns {charStart, delay} pairs — delay is ms from when speech begins (onstart).
 *
 * Uses syllable duration rather than character length so that short words like
 * "the" and long words like "extraordinary" are timed proportionally.
 *
 * Calibration: 220 ms/syllable at rate=1.0 ≈ 150 WPM average.
 * Punctuation after a word adds an extra pause (period → +250 ms, comma → +120 ms).
 */
export function computeHighlightSchedule(
  tokens: Array<{ text: string; isWord: boolean; start: number }>,
  rate: number,
): Array<{ charStart: number; delay: number }> {
  const msPerSyllable = 220 / rate;
  let elapsed = 0;
  const schedule: Array<{ charStart: number; delay: number }> = [];

  for (const tok of tokens) {
    if (!tok.isWord) continue;
    schedule.push({ charStart: tok.start, delay: Math.round(elapsed) });
    elapsed += syllableCount(tok.text) * msPerSyllable;
    // Punctuation pauses
    if (/[.!?]$/.test(tok.text))   elapsed += 250 / rate;
    else if (/[,;:]$/.test(tok.text)) elapsed += 120 / rate;
  }

  return schedule;
}

/** Create a SpeechSynthesisUtterance with the best available English voice. */
export function makeUtterance(text: string, rate = 0.9): SpeechSynthesisUtterance {
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'en-US';
  utt.rate = rate;
  utt.pitch = 1.0;
  const voice = getBestVoice();
  if (voice) utt.voice = voice;
  return utt;
}

/**
 * Cancel any current speech then speak `utt` after a delay long enough for
 * Chrome to fully reset its engine — without this, onboundary events stop
 * firing on the second (and subsequent) plays, and the voice may revert.
 */
export function cancelAndSpeak(utt: SpeechSynthesisUtterance): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  setTimeout(() => {
    // Re-assign the voice inside the timeout so Chrome receives a fresh object
    const voice = getBestVoice();
    if (voice) utt.voice = voice;
    window.speechSynthesis.resume(); // un-pause if Chrome left it paused
    window.speechSynthesis.speak(utt);
  }, 150);
}
