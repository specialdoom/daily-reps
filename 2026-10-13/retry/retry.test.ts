// TODO: this file is the bug. Fix the tests, not retry.ts (see ../README.md).
import { describe, it, expect, vi } from 'vitest';
import { retry } from './retry';

describe('retry', () => {
  it('succeeds after two failures with 100ms then 200ms backoff', async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('a'))
      .mockRejectedValueOnce(new Error('b'))
      .mockResolvedValue('ok');

    const p = retry(fn, { retries: 3, baseMs: 100 });

    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(200);

    await expect(p).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('gives up after the last retry', async () => {
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('nope'));

    const p = retry(fn, { retries: 2, baseMs: 100 });
    vi.advanceTimersByTime(10_000);

    await expect(p).rejects.toThrow('nope');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
