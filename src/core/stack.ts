export function pushReversed<T>(stack: T[], items: readonly T[]): void {
  for (const item of items.toReversed()) stack.push(item);
}
