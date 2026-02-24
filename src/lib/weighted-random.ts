export interface WeightedItem {
  id: number;
  wrong_count: number;
  [key: string]: unknown;
}

/**
 * Select a random item with probability proportional to wrong_count.
 * Higher wrong_count = more likely to be selected.
 */
export function weightedRandom<T extends WeightedItem>(items: T[]): T | null {
  if (items.length === 0) return null;

  const totalWeight = items.reduce((sum, item) => sum + item.wrong_count, 0);
  let randomPoint = Math.random() * totalWeight;

  for (const item of items) {
    randomPoint -= item.wrong_count;
    if (randomPoint <= 0) {
      return item;
    }
  }

  // Fallback: return last item (handles floating point edge cases)
  return items[items.length - 1];
}
