/**
 * Editorial lesson styling — a single, restrained look applied to every
 * lesson card so the picker reads like a journal's table of contents:
 * ivory cards, hairline rules, one indigo accent on hover. No rainbow.
 *
 * The per-lesson signature is kept for API compatibility with the pickers.
 * All classes are full literals so Tailwind's JIT keeps them.
 */

export interface LessonPalette {
  bg: string;
  border: string;
  hoverBorder: string;
  icon: string;
  iconHover: string;
  text: string;
}

const BASE_PALETTE: LessonPalette = {
  bg: 'bg-white',
  border: 'border-stone-200',
  hoverBorder: 'hover:border-indigo-300',
  icon: 'text-stone-400',
  iconHover: 'group-hover:text-indigo-500',
  text: 'group-hover:text-indigo-700',
};

export function paletteFor(_lessonName: string): LessonPalette {
  return BASE_PALETTE;
}

/** Completed palette for lessons where all steps are done — quietly muted. */
const COMPLETED_PALETTE: LessonPalette = {
  bg: 'bg-stone-50',
  border: 'border-stone-200',
  hoverBorder: 'hover:border-stone-300',
  icon: 'text-stone-300',
  iconHover: 'group-hover:text-stone-400',
  text: 'group-hover:text-stone-600',
};

export interface LessonProgress {
  practice: boolean;
  dictation: boolean;
  tricky: boolean;
  mistake_pick: boolean;
}

/** Returns how many of {practice, dictation, tricky, mistake_pick} have been completed. */
export function completionLevel(p: LessonProgress): number {
  return (p.practice ? 1 : 0) + (p.dictation ? 1 : 0) + (p.tricky ? 1 : 0) + (p.mistake_pick ? 1 : 0);
}

export function isFullyComplete(p: LessonProgress): boolean {
  return p.practice && p.dictation && p.tricky && p.mistake_pick;
}

/** Return the palette + opacity modifier based on completion. */
export function paletteWithProgress(
  lessonName: string,
  progress: LessonProgress,
): { palette: LessonPalette; opacityClass: string; isDone: boolean } {
  const base = paletteFor(lessonName);
  if (isFullyComplete(progress)) {
    return { palette: COMPLETED_PALETTE, opacityClass: 'opacity-60', isDone: true };
  }
  const level = completionLevel(progress);
  // 0/3 → full opacity, 1/3 → slight dim, 2/3 → more dim
  const opacities = ['', 'opacity-80', 'opacity-70'];
  return { palette: base, opacityClass: opacities[level] ?? '', isDone: false };
}

/**
 * Convert a raw lesson number into a human-friendly label.
 *   P3_20260601 → "P3 · Jun 1"
 *   260701      → "Jul 1"
 *   xinqi260610 → "xinqi · Jun 10"
 */
export function friendlyLessonLabel(raw: string): string {
  // Pattern: P3_YYYYMMDD
  let m = raw.match(/^(P\d+)_(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]} · ${monthName(+m[3])} ${+m[4]}`;

  // Pattern: YYMMDD (6 digits)
  m = raw.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (m) return `${monthName(+m[2])} ${+m[3]}`;

  // Pattern: nameYYMMDD
  m = raw.match(/^([a-zA-Z]+)(\d{2})(\d{2})(\d{2})$/);
  if (m) return `${m[1]} · ${monthName(+m[3])} ${+m[4]}`;

  // Fallback: return as-is if too long, or wrap
  return raw.length > 15 ? raw.slice(0, 14) + '…' : raw;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function monthName(m: number): string { return MONTHS[m - 1] ?? String(m); }

