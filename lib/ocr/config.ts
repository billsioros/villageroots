const DEFAULT_TIMEOUT_MS = 180_000;

export function resolveOcrTimeoutMs(
  env: Record<string, string | undefined> = process.env,
): number {
  const parsed = Number(env.OPENROUTER_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}
