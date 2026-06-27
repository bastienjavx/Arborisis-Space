/**
 * Exécute une liste de tâches asynchrones avec une limite de concurrence.
 * Utile pour les sweeps DB : on parallélise sans saturer le pool de connexions.
 */
export async function withConcurrencyLimit<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: (R | undefined)[] = new Array(items.length);
  const executing: Promise<void>[] = [];
  let index = 0;

  async function next(): Promise<void> {
    const i = index++;
    if (i >= items.length) return;
    const item = items[i];
    if (item === undefined) return;
    try {
      results[i] = (await fn(item)) as R | undefined;
    } catch (error) {
      results[i] = undefined;
      throw error;
    }
    await next();
  }

  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    executing.push(next());
  }

  await Promise.all(executing);
  return results as R[];
}
