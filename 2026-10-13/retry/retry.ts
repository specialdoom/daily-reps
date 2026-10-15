export async function retry<T>(
  fn: () => Promise<T>,
  { retries, baseMs }: { retries: number; baseMs: number },
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
      const delay = baseMs * 2 ** attempt; // 100, 200, 400...
      attempt++;
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }
}
