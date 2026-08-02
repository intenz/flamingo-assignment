/**
 * R3: deliberately flaky external notify — do not "fix" this helper.
 * Sleeps ~1s; throws on roughly one call in five.
 * Tests may inject `random` / `sleep` to avoid wall-clock flake.
 */

export type NotifyDeps = {
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  failRate?: number;
  delayMs?: number;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function notify(
  message: string,
  deps: NotifyDeps = {},
): Promise<void> {
  const sleep = deps.sleep ?? defaultSleep;
  const random = deps.random ?? Math.random;
  const failRate = deps.failRate ?? 0.2;
  const delayMs = deps.delayMs ?? 1000;

  await sleep(delayMs);

  if (random() < failRate) {
    throw new Error(`notify failed: ${message}`);
  }
}
