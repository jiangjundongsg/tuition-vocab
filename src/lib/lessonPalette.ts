/**
 * Stable, soft pastel palette assigned per lesson name.
 * Used by the student-facing lesson pickers so the grid feels
 * like a colorful library shelf without being noisy.
 *
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

const PALETTES: LessonPalette[] = [
  {
    bg: 'bg-orange-50/60',
    border: 'border-orange-100',
    hoverBorder: 'hover:border-orange-200',
    icon: 'text-orange-300',
    iconHover: 'group-hover:text-orange-500',
    text: 'group-hover:text-orange-700',
  },
  {
    bg: 'bg-amber-50/60',
    border: 'border-amber-100',
    hoverBorder: 'hover:border-amber-200',
    icon: 'text-amber-300',
    iconHover: 'group-hover:text-amber-500',
    text: 'group-hover:text-amber-700',
  },
  {
    bg: 'bg-emerald-50/60',
    border: 'border-emerald-100',
    hoverBorder: 'hover:border-emerald-200',
    icon: 'text-emerald-300',
    iconHover: 'group-hover:text-emerald-500',
    text: 'group-hover:text-emerald-700',
  },
  {
    bg: 'bg-sky-50/60',
    border: 'border-sky-100',
    hoverBorder: 'hover:border-sky-200',
    icon: 'text-sky-300',
    iconHover: 'group-hover:text-sky-500',
    text: 'group-hover:text-sky-700',
  },
  {
    bg: 'bg-violet-50/60',
    border: 'border-violet-100',
    hoverBorder: 'hover:border-violet-200',
    icon: 'text-violet-300',
    iconHover: 'group-hover:text-violet-500',
    text: 'group-hover:text-violet-700',
  },
  {
    bg: 'bg-rose-50/60',
    border: 'border-rose-100',
    hoverBorder: 'hover:border-rose-200',
    icon: 'text-rose-300',
    iconHover: 'group-hover:text-rose-500',
    text: 'group-hover:text-rose-700',
  },
];

export function paletteFor(lessonName: string): LessonPalette {
  let hash = 0;
  for (let i = 0; i < lessonName.length; i++) {
    hash = (hash * 31 + lessonName.charCodeAt(i)) | 0;
  }
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

/** Completed (grey) palette for lessons where all 3 steps are done. */
const COMPLETED_PALETTE: LessonPalette = {
  bg: 'bg-slate-100/60',
  border: 'border-slate-200',
  hoverBorder: 'hover:border-slate-300',
  icon: 'text-slate-300',
  iconHover: 'group-hover:text-slate-400',
  text: 'group-hover:text-slate-600',
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

