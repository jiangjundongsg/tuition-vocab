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
