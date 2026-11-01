// Returns a new array with the item at `from` moved to `to` (indexes are clamped).
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const result = [...items];
  if (from < 0 || from >= result.length) return result;
  const target = Math.max(0, Math.min(to, result.length - 1));
  const [item] = result.splice(from, 1);
  result.splice(target, 0, item);
  return result;
}

// Moves the item with `id` to the index of `overId` (the drag-and-drop case).
export function moveById<T extends { id: string }>(items: readonly T[], id: string, overId: string): T[] {
  const from = items.findIndex((item) => item.id === id);
  const to = items.findIndex((item) => item.id === overId);
  if (from === -1 || to === -1) return [...items];
  return moveItem(items, from, to);
}
